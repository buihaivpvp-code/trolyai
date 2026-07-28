import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const SECRET = process.env.JWT_SECRET || "eduai_secret_jwt_signature_key_2026";

// Extend Request interface locally for TypeScript compatibility
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    classCode: string;
  };
}

/**
 * Hash a password using SHA-256 with a unique salt
 */
export function hashPassword(password: string): string {
  return crypto.createHmac("sha256", "eduai_password_salt_2026").update(password).digest("hex");
}

/**
 * Generate a secure, tamper-proof stateful JWT-style token containing user information
 */
export function generateToken(payload: any, expiryMs = 24 * 60 * 60 * 1000): string {
  const expiresAt = Date.now() + expiryMs;
  const data = JSON.stringify({ payload, expiresAt });
  
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(SECRET, "eduai_token_salt", 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  // Format: IV.EncryptedPayload
  return `${iv.toString("hex")}.${encrypted}`;
}

/**
 * Decrypt and verify a token, returning the payload if valid and unexpired
 */
export function verifyToken(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    
    const key = crypto.scryptSync(SECRET, "eduai_token_salt", 32);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    const { payload, expiresAt } = JSON.parse(decrypted);
    if (Date.now() > expiresAt) {
      console.warn("Token expired");
      return null;
    }
    
    return payload;
  } catch (err) {
    console.error("Failed to verify token:", err);
    return null;
  }
}

/**
 * Authentication middleware to protect routes
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ error: "Yêu cầu mã xác thực Bearer token trong header Authorization." });
  }
  
  const userPayload = verifyToken(token);
  if (!userPayload) {
    return res.status(403).json({ error: "Mã xác thực không hợp lệ hoặc đã hết hạn." });
  }
  
  req.user = userPayload;
  next();
}

/**
 * Role-based authorization middleware
 */
export function authorizeRoles(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Chưa xác thực danh tính người dùng." });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Bạn không có quyền thực hiện thao tác này. Chỉ dành cho vai trò: ${allowedRoles.join(", ")}` 
      });
    }
    
    next();
  };
}
