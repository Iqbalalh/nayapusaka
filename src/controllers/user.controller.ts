import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import {
  selectAllUsers,
  selectUserById,
  selectUserByUsername,
  insertUser,
  updateUser,
  deleteUser,
} from "../services/user.services";

// ============================================================================
// GET ALL USERS
// ============================================================================
export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const users = await selectAllUsers();

    return res.json({
      message: "Users retrieved successfully",
      data: users,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET USER BY ID
// ============================================================================
export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const user = await selectUserById(Number(id));

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        data: null,
      });
    }

    return res.json({
      message: "User retrieved successfully",
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CREATE USER
// ============================================================================
interface CreateUserRequestBody {
  username: string;
  password: string;
  staff_id?: number;
  staffId?: number;
  role?: string;
}

export const createUser = async (
  req: Request<unknown, unknown, CreateUserRequestBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    // Support both snake_case and camelCase
    const staffId = req.body.staff_id || req.body.staffId;
    const { username, password, role } = req.body;

    if (!username || !password || !staffId) {
      return res.status(400).json({
        message: "Username, password, dan staf wajib diisi",
        data: null,
      });
    }

    const existingUser = await selectUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({
        message: "Username sudah ada sebelumnya!",
        data: null,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await insertUser({
      username,
      password: hashedPassword,
      staffId: staffId,
      role: role || "staff",
    });

    return res.status(201).json({
      message: "User created successfully",
      data: newUser,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// UPDATE USER
// ============================================================================
interface UpdateUserRequestBody {
  username?: string;
  password?: string;
  staff_id?: number;
  staffId?: number;
  role?: string;
}

export const updateUserCtrl = async (
  req: Request<{ id: string }, unknown, UpdateUserRequestBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    // Support both snake_case and camelCase
    const staffId = req.body.staff_id || req.body.staffId;
    const { username, password, role } = req.body;

    // Check if user exists
    const existingUser = await selectUserById(Number(id));
    if (!existingUser) {
      return res.status(404).json({
        message: "User not found",
        data: null,
      });
    }

    // Check if new username already exists (if username is being changed)
    if (username && username !== existingUser.username) {
      const userWithUsername = await selectUserByUsername(username);
      if (userWithUsername) {
        return res.status(400).json({
          message: "Username sudah ada sebelumnya!",
          data: null,
        });
      }
    }

    // Hash new password if provided
    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Update user
    const updatedUser = await updateUser(Number(id), {
      username: username || existingUser.username,
      password: hashedPassword || existingUser.password,
      staffId: staffId ?? existingUser.staffId,
      role: role || existingUser.role,
    });

    return res.json({
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// DELETE USER
// ============================================================================
export const deleteUserCtrl = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await selectUserById(Number(id));
    if (!existingUser) {
      return res.status(404).json({
        message: "User not found",
        data: null,
      });
    }

    // Delete user
    await deleteUser(Number(id));

    return res.json({
      message: "User deleted successfully",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};
