import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { selectUserByUsername, selectUserById, updateUserCredentials } from "../services/user.services";
import { getPresignedUrl, isValidS3Key } from "../utils/storage/s3.storage";

interface LoginRequestBody {
  username: string;
  password: string;
}

interface ChangeCredentialsRequestBody {
  currentPassword: string;
  newUsername?: string;
  newPassword: string;
}

// ============================================================================
// LOGIN USER
// ============================================================================
export const loginUser = async (
  req: Request<unknown, unknown, LoginRequestBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { username, password } = req.body;

    const user = await selectUserByUsername(username);

    if (!user) {
      return res.status(401).json({
        message: "User not found",
        data: null,
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({
        message: "Invalid password",
        data: null,
      });
    }

    // Generate presigned URL for staff picture
    let staffPictUrl = null;
    if (user.staffPict && isValidS3Key(user.staffPict)) {
      staffPictUrl = await getPresignedUrl(user.staffPict);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.userId,
        username: user.username,
        role: user.roleName,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "365d" }
    );

    return res.json({
      message: "Login successful",
      user: {
        id: user.userId,
        username: user.username,
        staffName: user.staffName,
        email: user.email,
        roleName: user.roleName,
        staffPict: staffPictUrl,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// CHANGE USERNAME AND PASSWORD
// ============================================================================
export const changeCredentials = async (
  req: Request<unknown, unknown, ChangeCredentialsRequestBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.id; // Get user ID from JWT token
    const { currentPassword, newUsername, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        data: null,
      });
    }

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
        data: null,
      });
    }

    // Get current user
    const currentUser = await selectUserById(userId);
    if (!currentUser) {
      return res.status(404).json({
        message: "User not found",
        data: null,
      });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, currentUser.password);
    if (!validPassword) {
      return res.status(401).json({
        message: "Current password is incorrect",
        data: null,
      });
    }

    // Check if new username already exists (if username is being changed)
    if (newUsername && newUsername !== currentUser.username) {
      const existingUser = await selectUserByUsername(newUsername);
      if (existingUser) {
        return res.status(400).json({
          message: "Username already exists",
          data: null,
        });
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user credentials
    const updatedUser = await updateUserCredentials(
      userId,
      newUsername || currentUser.username,
      hashedPassword
    );

    if (!updatedUser) {
      return res.status(500).json({
        message: "Failed to update user",
        data: null,
      });
    }

    // Generate presigned URL for staff picture
    let staffPictUrl = null;
    if (updatedUser.staffPict && isValidS3Key(updatedUser.staffPict)) {
      staffPictUrl = await getPresignedUrl(updatedUser.staffPict);
    }

    // Generate new JWT token with updated username
    const token = jwt.sign(
      {
        id: updatedUser.userId,
        username: updatedUser.username,
        role: updatedUser.roleName,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "365d" }
    );

    return res.json({
      message: "Credentials updated successfully",
      user: {
        id: updatedUser.userId,
        username: updatedUser.username,
        staffName: updatedUser.staffName,
        email: updatedUser.email,
        roleName: updatedUser.roleName,
        staffPict: staffPictUrl,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
};