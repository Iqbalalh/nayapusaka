/**
 * Backfill: turn every INACTIVE anak asuh (children.isActive = false) into an
 * alumni record. Idempotent — skips children already present in `alumni`
 * (matched by NIK when available, else name + birthdate).
 *
 * Run: npm run seed:alumni
 */
import path from "path";
import { prisma } from "../utils/prisma/prisma";
import { selectLatestChildEducationLevel } from "../services/children.services";
import {
  downloadFromS3,
  uploadBufferToS3,
  isValidS3Key,
} from "../utils/storage/s3.storage";

const contentTypeFromExt = (key: string): string => {
  const ext = path.extname(key).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
};

const dedupKey = (name: string | null, nik: string | null, birthdate: Date | null): string => {
  const n = (nik ?? "").trim();
  if (n) return `nik:${n.toLowerCase()}`;
  const bd = birthdate ? new Date(birthdate).toISOString().slice(0, 10) : "";
  return `nb:${(name ?? "").trim().toLowerCase()}|${bd}`;
};

async function main() {
  console.log("== Backfill Alumni dari anak asuh tidak aktif ==");

  const inactive = await prisma.children.findMany({
    where: { isActive: false },
    orderBy: { id: "asc" },
  });
  console.log(`Anak asuh tidak aktif ditemukan: ${inactive.length}`);

  // Existing alumni indexed by source child id AND dedup key (older rows created
  // before the source link existed are matched by key).
  const existingAlumni = await prisma.alumni.findMany({
    select: { id: true, alumniName: true, nik: true, alumniBirthdate: true, educationLevel: true, sourceChildrenId: true },
  });
  const bySource = new Map<number, { id: number; educationLevel: string | null }>();
  const byKey = new Map<string, { id: number; educationLevel: string | null; sourceChildrenId: number | null }>();
  existingAlumni.forEach((a) => {
    if (a.sourceChildrenId != null) bySource.set(a.sourceChildrenId, { id: a.id, educationLevel: a.educationLevel });
    byKey.set(dedupKey(a.alumniName, a.nik, a.alumniBirthdate), {
      id: a.id,
      educationLevel: a.educationLevel,
      sourceChildrenId: a.sourceChildrenId,
    });
  });

  let created = 0;
  let skipped = 0;
  let eduPatched = 0;
  let linked = 0;
  let photoCopied = 0;
  let photoFailed = 0;

  for (const child of inactive) {
    const key = dedupKey(child.childrenName, child.nik, child.childrenBirthdate);

    // "Pendidikan terakhir": prefer latest child-assistance education, else column
    const latestEdu = await selectLatestChildEducationLevel(child.id);
    const effectiveEdu = latestEdu ?? child.educationLevel ?? null;

    // Already linked to this child → only patch education when missing
    const linkedAlumni = bySource.get(child.id);
    if (linkedAlumni) {
      if ((!linkedAlumni.educationLevel || !linkedAlumni.educationLevel.trim()) && effectiveEdu) {
        await prisma.alumni.update({ where: { id: linkedAlumni.id }, data: { educationLevel: effectiveEdu } });
        eduPatched++;
      } else {
        skipped++;
      }
      continue;
    }

    // Present by dedup key but not yet linked → link it + patch education
    const existing = byKey.get(key);
    if (existing) {
      const data: { sourceChildrenId?: number; educationLevel?: string } = {};
      if (existing.sourceChildrenId == null) { data.sourceChildrenId = child.id; linked++; }
      if ((!existing.educationLevel || !existing.educationLevel.trim()) && effectiveEdu) {
        data.educationLevel = effectiveEdu;
        eduPatched++;
      }
      if (Object.keys(data).length > 0) await prisma.alumni.update({ where: { id: existing.id }, data });
      else skipped++;
      bySource.set(child.id, { id: existing.id, educationLevel: effectiveEdu });
      continue;
    }

    const newAlumni = await prisma.alumni.create({
      data: {
        alumniName: child.childrenName,
        alumniGender: child.childrenGender ?? null,
        alumniBirthdate: child.childrenBirthdate ?? null,
        alumniAddress: child.childrenAddress ?? null,
        alumniPhone: child.childrenPhone ?? null,
        educationLevel: effectiveEdu,
        alumniJob: child.childrenJob ?? null,
        nik: child.nik ?? null,
        notes: child.notes ?? null,
        alumniPict: null,
        sourceChildrenId: child.id,
        createdBy: child.createdBy ?? 2,
      },
    });
    bySource.set(child.id, { id: newAlumni.id, educationLevel: effectiveEdu });
    byKey.set(key, { id: newAlumni.id, educationLevel: effectiveEdu, sourceChildrenId: child.id });
    created++;

    // Copy photo into the alumni S3 folder (own copy, not shared key)
    if (isValidS3Key(child.childrenPict)) {
      try {
        const buffer = await downloadFromS3(child.childrenPict);
        if (buffer) {
          const ext = path.extname(child.childrenPict!);
          const slug = (child.childrenName || "alumni").toLowerCase().replace(/\s+/g, "-");
          const rand = Math.random().toString(36).substring(2, 10);
          const newKey = `database/alumni/${newAlumni.id}-${slug}-${rand}${ext}`;
          await uploadBufferToS3(buffer, newKey, contentTypeFromExt(child.childrenPict!));
          await prisma.alumni.update({ where: { id: newAlumni.id }, data: { alumniPict: newKey } });
          photoCopied++;
        }
      } catch (e) {
        photoFailed++;
        console.warn(`  ! Gagal salin foto untuk child#${child.id} (${child.childrenName}):`, (e as Error).message);
      }
    }

    if (created % 25 === 0) console.log(`  ...${created} alumni dibuat`);
  }

  console.log("== Selesai ==");
  console.log(`Dibuat             : ${created}`);
  console.log(`Ditautkan ke anak  : ${linked}`);
  console.log(`Pendidikan di-patch: ${eduPatched}`);
  console.log(`Dilewati           : ${skipped} (sudah ada & lengkap)`);
  console.log(`Foto               : ${photoCopied} tersalin, ${photoFailed} gagal`);
}

main()
  .catch((e) => {
    console.error("BACKFILL FAIL:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
