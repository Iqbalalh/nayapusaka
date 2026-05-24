import { Staffs, Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all staff
 */
export const selectAllStaffWithRole = async () => {
  try {
    const staffs = await prisma.staffs.findMany({
      orderBy: { id: "asc" },
    });

    return staffs;
  } catch (error) {
    throw error;
  }
};

/**
 * Select staff by ID
 */
export const selectStaffByIdWithRole = async (id: number) => {
  try {
    const staff = await prisma.staffs.findUnique({
      where: { id },
    });

    if (!staff) return null;

    return staff;
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// INSERT QUERY
// ============================================================================

/**
 * Insert new staff
 */
export const insertStaff = async (
  data: Prisma.StaffsUncheckedCreateInput
) => {
  try {
    return await prisma.staffs.create({ data });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// UPDATE QUERY
// ============================================================================

/**
 * Update staff by ID
 */
export const updateStaffById = async (
  id: number,
  data: Prisma.StaffsUncheckedUpdateInput
) => {
  try {
    return await prisma.staffs.update({ where: { id }, data });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// DELETE QUERY
// ============================================================================

/**
 * Delete staff by ID
 */
export const deleteStaffById = async (id: number) => {
  try {
    return await prisma.staffs.delete({ where: { id } });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// ============================================================================
// OPTIMIZED PAGINATED QUERIES
// ============================================================================

const buildStaffWhereClause = (search?: string, filters?: Record<string, any>) => {
  const where: any = {};
  const andClauses: any[] = [];

  if (search?.trim()) {
    const s = search.trim();
    andClauses.push({
      OR: [
        { staffName: { contains: s, mode: "insensitive" } },
        { email: { contains: s, mode: "insensitive" } },
        { nik: { contains: s, mode: "insensitive" } },
        { position: { contains: s, mode: "insensitive" } },
      ],
    });
  }

  if (filters && typeof filters === "object") {
    if (Array.isArray(filters.gender) && filters.gender.length > 0) {
      where.gender = { in: filters.gender };
    }
    if (Array.isArray(filters.isActive) && filters.isActive.length === 1) {
      where.isActive = filters.isActive[0] === true || filters.isActive[0] === "true";
    }
  }

  if (andClauses.length > 0) where.AND = andClauses;
  return where;
};

export const selectStaffOptimized = async (
  page: number = 1,
  pageSize: number = 50,
  search: string = "",
  filters?: Record<string, any>
) => {
  const skip = (page - 1) * pageSize;
  const where = buildStaffWhereClause(search, filters);

  const [total, data] = await Promise.all([
    prisma.staffs.count({ where }),
    prisma.staffs.findMany({ where, skip, take: pageSize, orderBy: { id: "asc" } }),
  ]);

  return {
    data,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};
