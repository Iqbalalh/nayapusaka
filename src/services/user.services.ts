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

/**
 * Select user by ID with staff and role information
 */
export const selectUserById = async (userId: number) => {
  try {
    const user = await prisma.users.findFirst({
      where: { userId },
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

// ============================================================================
// UPDATE QUERIES
// ============================================================================

/**
 * Update user username and password
 */
export const updateUserCredentials = async (
  userId: number,
  newUsername: string,
  newPassword: string
) => {
  try {
    const updatedUser = await prisma.users.updateMany({
      where: { userId },
      data: {
        username: newUsername,
        password: newPassword,
      },
    });

    // Fetch the updated user with relations
    const user = await prisma.users.findFirst({
      where: { userId },
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
