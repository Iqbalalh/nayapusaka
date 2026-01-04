/* eslint-disable no-console */
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Definisikan struktur isi token Anda
interface UserPayload {
  id: number;
  username: string;
  roleId: number;
  // tambahkan field lain sesuai isi JWT Anda
}

// Augmentation: Memberitahu TS bahwa Request memiliki properti user
export interface AuthRequest extends Request {
  user?: UserPayload | string | jwt.JwtPayload;
}

export const verifyToken = (
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
): void | Response => {
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

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      console.error("JWT verification error:", err.message);
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    // Sekarang TS tahu req.user itu ada karena kita pakai AuthRequest
    req.user = decoded as UserPayload; 
    next();
  });
};