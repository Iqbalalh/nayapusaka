/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import { Request, Response } from "express";

/**
 * Global Error Handler Middleware
 * Di Express, middleware error harus memiliki 4 parameter agar dikenali
 */
export const errorHandler = (
  err: any, 
  req: Request, 
  res: Response, 
): void => {
  // 1. Log error ke console (atau ke layanan logging seperti Winston/Sentry)
  console.error(`[Error] ${err.message}`);
  if (process.env.NODE_ENV === "development") {
    console.error(err.stack);
  }

  // 2. Tentukan status code (gunakan 500 jika tidak didefinisikan)
  const statusCode: number = err.statusCode || 500;

  // 3. Kirim response
  res.status(statusCode).json({
    status: "error",
    message: err.message || "Internal Server Error",
    // Tampilkan stack trace hanya saat development agar tidak bocor ke publik
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};