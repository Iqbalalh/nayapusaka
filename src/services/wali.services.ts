import { Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all wali
 */
export const selectAllWali = async () => {
  try {
    return await prisma.wali.findMany({
      orderBy: { id: "asc" },
      include: {
        homes: {
          include: {
            regions: true,
            partners: { select: { isActive: true } },
          },
        },
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Select wali list (id and name only)
 */
export const selectWaliList = async () => {
  try {
    return await prisma.wali.findMany({
      select: { id: true, waliName: true },
      orderBy: { id: "asc" },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Select wali by ID with home data
 */
export const selectWaliById = async (id: number) => {
  try {
    return await prisma.wali.findUnique({
      where: { id },
      include: {
        homes: {
          include: {
            partners: true,
            employees: true,
            children: true,
            regions: true,
          },
        },
        employees: true,
      },
    });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// INSERT QUERY
// ============================================================================

/**
 * Insert new wali
 */
export const insertWali = async (data: Prisma.WaliCreateInput) => {
  try {
    return await prisma.wali.create({ data });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// UPDATE QUERY
// ============================================================================

/**
 * Update wali by ID
 */
export const updateWaliById = async (
  id: number,
  data: Prisma.WaliUpdateInput
) => {
  try {
    return await prisma.wali.update({ where: { id }, data });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// DELETE QUERY
// ============================================================================

/**
 * Delete wali by ID
 */
export const deleteWaliById = async (id: number) => {
  try {
    return await prisma.wali.delete({ where: { id } });
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// OPTIMIZED PAGINATED QUERIES
// ============================================================================

const buildWaliWhereClause = (search?: string, filters?: Record<string, any>) => {
  const where: any = {};
  if (search?.trim()) {
    const s = search.trim();
    where.OR = [
      { waliName: { contains: s, mode: "insensitive" } },
      { relation: { contains: s, mode: "insensitive" } },
      { nik: { contains: s, mode: "insensitive" } },
    ];
  }
  if (Array.isArray(filters?.regionId) && filters!.regionId.length > 0) {
    where.homes = { some: { regionId: { in: filters!.regionId.map(Number) } } };
  }
  return where;
};

export const selectWaliOptimized = async (
  page: number = 1,
  pageSize: number = 50,
  search: string = "",
  filters?: Record<string, any>
) => {
  const skip = (page - 1) * pageSize;
  const where = buildWaliWhereClause(search, filters);

  const [total, data] = await Promise.all([
    prisma.wali.count({ where }),
    prisma.wali.findMany({
      where,
      include: {
        homes: {
          include: {
            regions: true,
            partners: { select: { isActive: true } },
          },
        },
      },
      skip,
      take: pageSize,
      orderBy: { id: "asc" },
    }),
  ]);

  return {
    data,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

export const selectWaliSummary = async (search?: string, filters?: Record<string, any>) => {
  const total = await prisma.wali.count({ where: buildWaliWhereClause(search, filters) });
  return { total };
};
