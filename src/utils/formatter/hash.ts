import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

/**
 * Interface untuk struktur data di dalam JWT Payload
 */
interface JwtPayload {
  id: number;
  username: string;
  roleId: number;
  // tambahkan field lain sesuai kebutuhan payload Anda
}

/**
 * Meng-extend interface Request Express agar mengenali req.user
 */
export interface AuthRequest extends Request {
  user?: string | jwt.JwtPayload | JwtPayload;
}

/**
 * Fungsi untuk hashing password
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Middleware untuk verifikasi JWT Token
 */
export const verifyToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    // 🔎 Check if header exists
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    // ✂️ Extract token from header
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token format is invalid" });
    }

    // 🔍 Verify token
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }

    const decoded = jwt.verify(token, secret);

    // ✅ Attach decoded data to request object
    req.user = decoded;

    next();
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Token expired" });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(401).json({ message: "Unauthorized", error: message });
  }
};
