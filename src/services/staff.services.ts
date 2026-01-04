import { Staffs } from "../generated/prisma/client";
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
