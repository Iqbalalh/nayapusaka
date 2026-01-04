import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { selectUserByUsername } from "../services/user.services";
import { getPresignedUrl, isValidS3Key } from "../utils/storage/s3.storage";

interface LoginRequestBody {
  username: string;
  password: string;
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