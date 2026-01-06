import { Staffs, Prisma } from "../generated/prisma/client";
import { prisma } from "../utils/prisma/prisma";

type StaffWithRole = Staffs & {
  roles: { roleName: string } | null;
};

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all staff with role
 */
export const selectAllStaffWithRole = async () => {
  try {
    const staffs = await prisma.staffs.findMany({
      include: { roles: { select: { roleName: true } } },
      orderBy: { id: "asc" },
    });

    return staffs.map((staff: StaffWithRole) => ({
      ...staff,
      roleName: staff.roles?.roleName,
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Select staff by ID with role
 */
export const selectStaffByIdWithRole = async (id: number) => {
  try {
    const staff = await prisma.staffs.findUnique({
      where: { id },
      include: { roles: { select: { roleName: true } } },
    });

    if (!staff) return null;

    return { ...staff, roleName: staff.roles?.roleName };
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
