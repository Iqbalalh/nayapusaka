import path from "path";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";
import { calculateAge, selectLatestChildEducationLevel } from "./children.services";
import { downloadFromS3, uploadBufferToS3, isValidS3Key } from "../utils/storage/s3.storage";

// ============================================================================
// TYPES
// ============================================================================
export type AlumniFilters = {
  educationLevel?: string;
  gender?: string;
};

const buildAlumniWhereClause = (
  search: string = "",
  filters?: AlumniFilters
): Prisma.AlumniWhereInput => {
  const where: Prisma.AlumniWhereInput = {};
  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { alumniName: { contains: s, mode: "insensitive" } },
      { nik: { contains: s, mode: "insensitive" } },
      { alumniPhone: { contains: s, mode: "insensitive" } },
    ];
  }
  if (filters?.educationLevel) where.educationLevel = filters.educationLevel;
  if (filters?.gender) where.alumniGender = filters.gender as any;
  return where;
};

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all alumni
 */
export const selectAllAlumni = async (args?: Prisma.AlumniFindManyArgs) => {
  try {
    const alumni = await prisma.alumni.findMany({
      ...args,
      orderBy: { id: "asc" },
    });
    return alumni.map((a) => ({ ...a, age: calculateAge(a.alumniBirthdate) }));
  } catch (error) {
    throw error;
  }
};

/**
 * Select alumni list (id and name only)
 */
export const selectAlumniList = async () => {
  try {
    return await prisma.alumni.findMany({
      select: { id: true, alumniName: true },
      orderBy: { id: "asc" },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Select alumni by ID
 */
export const selectAlumniById = async (id: number) => {
  try {
    const alumni = await prisma.alumni.findUnique({ where: { id } });
    if (!alumni) return null;
    return { ...alumni, age: calculateAge(alumni.alumniBirthdate) };
  } catch (error) {
    throw error;
  }
};

/**
 * Select alumni with pagination + search + filters (optimized for table display)
 */
export const selectAlumniOptimized = async (
  page: number = 1,
  pageSize: number = 50,
  search: string = "",
  filters?: AlumniFilters
) => {
  try {
    const skip = (page - 1) * pageSize;
    const where = buildAlumniWhereClause(search, filters);

    const total = await prisma.alumni.count({ where });

    const alumni = await prisma.alumni.findMany({
      where,
      orderBy: { id: "asc" },
      skip,
      take: pageSize,
    });

    const data = alumni.map((a) => ({ ...a, age: calculateAge(a.alumniBirthdate) }));

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Select all alumni matching filters (for Excel export, no paging)
 */
export const selectAlumniForExport = async (search: string = "", filters?: AlumniFilters) => {
  try {
    const where = buildAlumniWhereClause(search, filters);
    const alumni = await prisma.alumni.findMany({ where, orderBy: { id: "asc" } });
    return alumni.map((a) => ({ ...a, age: calculateAge(a.alumniBirthdate) }));
  } catch (error) {
    throw error;
  }
};

/**
 * Lightweight alumni stats for the insight panel
 */
export const selectAlumniStats = async (search: string = "", filters?: AlumniFilters) => {
  try {
    const where = buildAlumniWhereClause(search, filters);

    const [total, male, female, byLevelRaw] = await Promise.all([
      prisma.alumni.count({ where }),
      prisma.alumni.count({ where: { ...where, alumniGender: "M" } }),
      prisma.alumni.count({ where: { ...where, alumniGender: "F" } }),
      prisma.alumni.groupBy({
        by: ["educationLevel"],
        where,
        _count: { _all: true },
      }),
    ]);

    const byEducationLevel: Record<string, number> = {};
    byLevelRaw.forEach((row) => {
      const key = row.educationLevel?.trim() || "Tidak Diketahui";
      byEducationLevel[key] = (byEducationLevel[key] ?? 0) + row._count._all;
    });

    return { total, male, female, byEducationLevel };
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// INSERT / UPDATE / DELETE
// ============================================================================

export const insertAlumni = async (data: Prisma.AlumniCreateInput) => {
  try {
    return await prisma.alumni.create({ data });
  } catch (error) {
    throw error;
  }
};

export const updateAlumniById = async (id: number, data: Prisma.AlumniUpdateInput) => {
  try {
    return await prisma.alumni.update({ where: { id }, data });
  } catch (error) {
    throw error;
  }
};

export const deleteAlumniById = async (id: number) => {
  try {
    return await prisma.alumni.delete({ where: { id } });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// PROMOTE CHILDREN -> ALUMNI (shared, idempotent)
// ============================================================================

const contentTypeFromExt = (key: string): string => {
  const ext = path.extname(key).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
};

/**
 * Create an alumni record from a children record. Idempotent: if an alumni
 * already links to this child (source_children_id) it is returned unchanged.
 * Copies the child photo into the alumni S3 folder (own copy).
 *
 * Returns the alumni record, or null when the child does not exist.
 */
export const promoteChildrenToAlumni = async (childrenId: number, userId: number = 2) => {
  const child = await prisma.children.findUnique({ where: { id: childrenId } });
  if (!child) return null;

  // Already promoted? return the existing alumni (no duplicate)
  const existing = await prisma.alumni.findFirst({ where: { sourceChildrenId: childrenId } });
  if (existing) return existing;

  const latestEdu = await selectLatestChildEducationLevel(childrenId);

  const newAlumni = await prisma.alumni.create({
    data: {
      alumniName: child.childrenName,
      alumniGender: child.childrenGender ?? null,
      alumniBirthdate: child.childrenBirthdate ?? null,
      alumniAddress: child.childrenAddress ?? null,
      alumniPhone: child.childrenPhone ?? null,
      educationLevel: latestEdu ?? child.educationLevel ?? null,
      alumniJob: child.childrenJob ?? null,
      nik: child.nik ?? null,
      notes: child.notes ?? null,
      alumniPict: null,
      sourceChildrenId: childrenId,
      createdBy: userId,
    },
  });

  // Copy the child's photo into the alumni S3 folder (best-effort)
  if (isValidS3Key(child.childrenPict)) {
    try {
      const buffer = await downloadFromS3(child.childrenPict);
      if (buffer) {
        const ext = path.extname(child.childrenPict!);
        const slug = (child.childrenName || "alumni").toLowerCase().replace(/\s+/g, "-");
        const rand = Math.random().toString(36).substring(2, 10);
        const newKey = `database/alumni/${newAlumni.id}-${slug}-${rand}${ext}`;
        await uploadBufferToS3(buffer, newKey, contentTypeFromExt(child.childrenPict!));
        return await prisma.alumni.update({ where: { id: newAlumni.id }, data: { alumniPict: newKey } });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`Gagal salin foto alumni untuk child#${childrenId}:`, (e as Error).message);
    }
  }

  return newAlumni;
};

export const alumniExistsForChild = async (childrenId: number): Promise<boolean> => {
  const found = await prisma.alumni.findFirst({
    where: { sourceChildrenId: childrenId },
    select: { id: true },
  });
  return !!found;
};
