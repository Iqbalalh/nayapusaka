import { prisma } from "../utils/prisma/prisma";

// ============================================================================
// SELECT QUERIES
// ============================================================================

/**
 * Select all users with staff information
 */
export const selectAllUsers = async () => {
  try {
    const users = await prisma.users.findMany({
      include: {
        staffs: true,
      },
      orderBy: { userId: "asc" },
    });

    return users.map((user) => ({
      userId: user.userId,
      username: user.username,
      staffId: user.staffId,
      role: user.role,
      staffName: user.staffs?.staffName,
      staffPict: user.staffs?.staffPict,
      email: user.staffs?.email,
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Select user by username with staff information
 */
export const selectUserByUsername = async (username: string) => {
  try {
    const user = await prisma.users.findUnique({
      where: { username },
      include: {
        staffs: true,
      },
    });

    if (!user) return null;

    return {
      ...user,
      staffName: user.staffs?.staffName,
      staffPict: user.staffs?.staffPict,
      email: user.staffs?.email,
      tokenVersion: (user as any).tokenVersion ?? 0,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Select user by ID with staff information
 */
export const selectUserById = async (userId: number) => {
  try {
    const user = await prisma.users.findFirst({
      where: { userId },
      include: {
        staffs: true,
      },
    });

    if (!user) return null;

    return {
      ...user,
      staffName: user.staffs?.staffName,
      staffPict: user.staffs?.staffPict,
      email: user.staffs?.email,
      tokenVersion: (user as any).tokenVersion ?? 0,
    };
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// INSERT QUERIES
// ============================================================================

interface CreateUserData {
  username: string;
  password: string;
  staffId: number;
  role?: string;
}

/**
 * Insert a new user
 */
export const insertUser = async (data: CreateUserData) => {
  try {
    const user = await prisma.users.create({
      data: {
        username: data.username,
        password: data.password,
        staffId: data.staffId,
        role: data.role || "staff",
      },
      include: {
        staffs: true,
      },
    });

    return {
      userId: user.userId,
      username: user.username,
      staffId: user.staffId,
      role: user.role,
      staffName: user.staffs?.staffName,
      staffPict: user.staffs?.staffPict,
      email: user.staffs?.email,
    };
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// UPDATE QUERIES
// ============================================================================

interface UpdateUserData {
  username: string;
  password: string;
  staffId: number | null;
  role?: string;
}

/**
 * Update user username and password
 */
export const updateUserCredentials = async (
  userId: number,
  newUsername: string,
  newPassword: string
) => {
  try {
    // First find the user by userId to get the current username
    const currentUser = await prisma.users.findFirst({
      where: { userId },
    });

    if (!currentUser) return null;

    // Use $executeRaw to update with tokenVersion increment
    // This bypasses TypeScript issues until Prisma client is regenerated
    await prisma.$executeRaw`
      UPDATE users
      SET username = ${newUsername},
          password = ${newPassword},
          token_version = COALESCE(token_version, 0) + 1
      WHERE user_id = ${userId}
    `;

    // Fetch the updated user with relations
    const user = await prisma.users.findFirst({
      where: { userId },
      include: {
        staffs: true,
      },
    });

    if (!user) return null;

    return {
      ...user,
      staffName: user.staffs?.staffName,
      staffPict: user.staffs?.staffPict,
      email: user.staffs?.email,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Update user by userId
 * Increments tokenVersion if password is changed to invalidate existing sessions
 */
export const updateUser = async (userId: number, data: UpdateUserData) => {
  try {
    // First find the user by userId to get the current username
    const currentUser = await prisma.users.findFirst({
      where: { userId },
    });

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Check if password is being changed
    const isPasswordChanged = data.password !== currentUser.password;

    if (isPasswordChanged) {
      // Use raw SQL to increment tokenVersion when password changes
      await prisma.$executeRaw`
        UPDATE users
        SET username = ${data.username},
            password = ${data.password},
            staff_id = ${data.staffId},
            role = ${data.role},
            token_version = COALESCE(token_version, 0) + 1
        WHERE user_id = ${userId}
      `;
    } else {
      // Update without incrementing tokenVersion
      await prisma.$executeRaw`
        UPDATE users
        SET username = ${data.username},
            password = ${data.password},
            staff_id = ${data.staffId},
            role = ${data.role}
        WHERE user_id = ${userId}
      `;
    }

    // Fetch the updated user with relations
    const user = await prisma.users.findFirst({
      where: { userId },
      include: {
        staffs: true,
      },
    });

    if (!user) {
      throw new Error("Failed to fetch updated user");
    }

    return {
      userId: user.userId,
      username: user.username,
      staffId: user.staffId,
      role: user.role,
      staffName: user.staffs?.staffName,
      staffPict: user.staffs?.staffPict,
      email: user.staffs?.email,
    };
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// DELETE QUERIES
// ============================================================================

/**
 * Delete user by userId
 */
export const deleteUser = async (userId: number) => {
  try {
    // First find the user by userId to get the username
    const user = await prisma.users.findFirst({
      where: { userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    await prisma.users.delete({
      where: { username: user.username },
    });
    return true;
  } catch (error) {
    throw error;
  }
};
