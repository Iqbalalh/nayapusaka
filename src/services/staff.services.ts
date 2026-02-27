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
