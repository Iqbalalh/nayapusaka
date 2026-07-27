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

  // Map existing alumni by dedup key so re-runs can patch instead of duplicate
  const existingAlumni = await prisma.alumni.findMany({
    select: { id: true, alumniName: true, nik: true, alumniBirthdate: true, educationLevel: true },
  });
  const existingByKey = new Map<string, { id: number; educationLevel: string | null }>();
  existingAlumni.forEach((a) =>
    existingByKey.set(dedupKey(a.alumniName, a.nik, a.alumniBirthdate), {
      id: a.id,
      educationLevel: a.educationLevel,
    })
  );

  let created = 0;
  let skipped = 0;
  let eduPatched = 0;
  let photoCopied = 0;
  let photoFailed = 0;

  for (const child of inactive) {
    const key = dedupKey(child.childrenName, child.nik, child.childrenBirthdate);

    // "Pendidikan terakhir": prefer latest child-assistance education, else column
    const latestEdu = await selectLatestChildEducationLevel(child.id);
    const effectiveEdu = latestEdu ?? child.educationLevel ?? null;

    const existing = existingByKey.get(key);
    if (existing) {
      // Already present — patch education level if it's missing and we found one
      if ((!existing.educationLevel || !existing.educationLevel.trim()) && effectiveEdu) {
        await prisma.alumni.update({ where: { id: existing.id }, data: { educationLevel: effectiveEdu } });
        eduPatched++;
      } else {
        skipped++;
      }
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
        createdBy: child.createdBy ?? 2,
      },
    });
    existingByKey.set(key, { id: newAlumni.id, educationLevel: effectiveEdu });
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
  console.log(`Dibuat        : ${created}`);
  console.log(`Pendidikan di-patch: ${eduPatched}`);
  console.log(`Dilewati      : ${skipped} (sudah ada & lengkap)`);
  console.log(`Foto          : ${photoCopied} tersalin, ${photoFailed} gagal`);
}

main()
  .catch((e) => {
    console.error("BACKFILL FAIL:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
