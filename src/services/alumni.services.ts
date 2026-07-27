import { Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";
import { calculateAge } from "./children.services";

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
