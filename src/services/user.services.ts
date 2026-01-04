import { prisma } from "../utils/prisma/prisma";

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select user by username with staff and role information
 */
export const selectUserByUsername = async (username: string) => {
  try {
    const user = await prisma.users.findUnique({
      where: { username },
      include: {
        staffs: {
          include: { roles: { select: { roleName: true } } },
        },
      },
    });

    if (!user) return null;

    return {
      ...user,
      staffName: user.staffs?.staffName,
      staffPict: user.staffs?.staffPict,
      email: user.staffs?.email,
      roleName: user.staffs?.roles?.roleName,
    };
  } catch (error) {
    throw error;
  }
};
