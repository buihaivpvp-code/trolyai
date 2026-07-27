import { Request, Response, NextFunction } from "express";
import { Logger } from "./logger";

/**
 * Express error-handling middleware for full-stack API production robustness
 */
export function globalErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || "Đã xảy ra lỗi hệ thống nghiêm trọng trên máy chủ.";

  // Log full stack trace in backend for developers
  Logger.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);

  res.status(statusCode).json({
    success: false,
    error: message,
    // Avoid leaking stack traces in production
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
}
