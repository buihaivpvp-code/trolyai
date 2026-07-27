import { Request, Response, NextFunction } from "express";

/**
 * Production-grade console request and performance logger middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, originalUrl, ip } = req;
  const userAgent = req.headers["user-agent"] || "Unknown UA";

  // Capture original response finish to record exact duration
  res.on("finish", () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    // Select color accent based on response code
    let statusText = `\x1b[32m${statusCode}\x1b[0m`; // Green for 2xx
    if (statusCode >= 400 && statusCode < 500) {
      statusText = `\x1b[33m${statusCode}\x1b[0m`; // Yellow for 4xx
    } else if (statusCode >= 500) {
      statusText = `\x1b[31m${statusCode}\x1b[0m`; // Red for 5xx
    }

    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] ${ip} - "${method} ${originalUrl}" ${statusText} in ${duration}ms - ${userAgent}`
    );
  });

  next();
}

/**
 * Standard info and error log helpers to keep terminal output neat and standard
 */
export const Logger = {
  info(message: string, ...args: any[]) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] \x1b[36mINFO:\x1b[0m ${message}`, ...args);
  },
  warn(message: string, ...args: any[]) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] \x1b[33mWARN:\x1b[0m ${message}`, ...args);
  },
  error(message: string, error?: any, ...args: any[]) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] \x1b[31mERROR:\x1b[0m ${message}`, error || "", ...args);
  }
};
