/* eslint-disable no-console */
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { selectUserById } from "../services/user.services";

// Definisikan struktur isi token Anda
interface UserPayload {
  id: number;
  username: string;
  role: string;
  tokenVersion?: number;
  // tambahkan field lain sesuai isi JWT Anda
}

// Augmentation: Memberitahu TS bahwa Request memiliki properti user
export interface AuthRequest extends Request {
  user?: UserPayload | string | jwt.JwtPayload;
}

export const verifyToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(403).json({ message: "No token provided or invalid format" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(403).json({ message: "Token missing" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET is missing in .env");
    return res.status(500).json({ message: "Internal server error" });
  }

  try {
    const decoded = jwt.verify(token, secret) as UserPayload;
    
    // Check token version against database for session invalidation
    const user = await selectUserById(decoded.id);
    if (!user) {
      return res.status(403).json({ message: "User not found" });
    }
    
    // If tokenVersion doesn't match, the token has been invalidated
    const currentTokenVersion = user.tokenVersion ?? 0;
    const tokenVersion = decoded.tokenVersion ?? 0;
    
    if (tokenVersion !== currentTokenVersion) {
      return res.status(403).json({ message: "Session expired. Please login again." });
    }
    
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT verification error:", (err as Error).message);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

/**
 * Middleware to verify if the user is admin or superadmin
 */
export const verifyAdminOrAbove = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void | Response => {
  const user = req.user as UserPayload;

  if (!user || !["admin", "superadmin"].includes(user.role)) {
    return res.status(403).json({
      message: "Akses ditolak. Hanya admin yang diizinkan.",
    });
  }

  next();
};

/**
 * Middleware to verify if the user is a superadmin
 */
export const verifySuperadmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void | Response => {
  const user = req.user as UserPayload;

  if (!user || user.role !== "superadmin") {
    return res.status(403).json({
      message: "Access denied. Superadmin privileges required.",
    });
  }

  next();
};