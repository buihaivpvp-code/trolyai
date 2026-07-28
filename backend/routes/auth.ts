import { Router, Response } from "express";
import { Database } from "../services/db.js";
import {
  generateToken,
  authenticateToken,
  AuthenticatedRequest
} from "../middleware/auth";
import { Logger } from "../middleware/logger";
import { getSupabaseClient, isSupabaseConfigured } from "../services/supabase";

const router = Router();

function buildLocalUserFromAuth(params: {
  existingUser?: any;
  authUserId: string;
  email: string;
  name?: string;
  classCode?: string;
}) {
  const { existingUser, authUserId, email, name, classCode } = params;

  return {
    id: existingUser?.id || authUserId,
    email: email.toLowerCase().trim(),
    passwordHash: existingUser?.passwordHash || "",
    name: (name || existingUser?.name || "Giáo viên").trim(),
    role: existingUser?.role || "teacher" as const,
    classCode: (classCode || existingUser?.classCode || "4A").toUpperCase().trim(),
    avatar: existingUser?.avatar,
    phone: existingUser?.phone,
    dob: existingUser?.dob,
    workplace: existingUser?.workplace,
    experience: existingUser?.experience,
    achievements: existingUser?.achievements,
    bio: existingUser?.bio,
    hasCompletedOnboarding: existingUser?.hasCompletedOnboarding ?? false
  };
}

function issueAppAuthResponse(user: any, rememberMe?: boolean) {
  const tokenPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    classCode: user.classCode
  };

  const expiryMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const token = generateToken(tokenPayload, expiryMs);
  const { passwordHash, ...userWithoutPassword } = user;

  return {
    token,
    user: userWithoutPassword
  };
}

/**
 * @route POST /api/auth/register
 * @desc Register a new teacher or school account
 * @access Public
 */
router.post("/register", async (req, res, next) => {
  try {
    const { email, password, name, classCode = "4A", rememberMe } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Vui lòng nhập đầy đủ email, mật khẩu và họ tên." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Mật khẩu phải chứa ít nhất 6 ký tự." });
    }

    if (!isSupabaseConfigured()) {
      return res.status(500).json({ error: "Supabase chưa được cấu hình trên máy chủ." });
    }

    const supabase = getSupabaseClient();
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();
    const cleanClassCode = classCode.toUpperCase().trim();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: cleanName,
          classCode: cleanClassCode
        }
      }
    });

    if (error) {
      Logger.error(`Supabase register failed for ${cleanEmail}: ${error.message}`);
      return res.status(400).json({ error: error.message || "Không thể đăng ký tài khoản." });
    }

    const authUserId = data.user?.id;
    if (!authUserId) {
      return res.status(500).json({ error: "Đăng ký thành công nhưng không nhận được thông tin người dùng từ Supabase." });
    }

    const users = Database.getUsers();
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);

    const localUser = buildLocalUserFromAuth({
      existingUser: existing,
      authUserId,
      email: cleanEmail,
      name: cleanName,
      classCode: cleanClassCode
    });

    if (existing) {
      const userIndex = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
      users[userIndex] = localUser;
    } else {
      users.push(localUser);
    }
    Database.saveUsers(users);

    const authResponse = issueAppAuthResponse(localUser, rememberMe);
    Logger.info(`Registered new Supabase-backed user account: ${localUser.email}`);

    res.status(201).json({
      message: "Đăng ký tài khoản thành công!",
      ...authResponse
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/auth/login
 * @desc Login with credentials to receive a session JWT-style token
 * @access Public
 */
router.post("/login", async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Vui lòng nhập email và mật khẩu." });
    }

    if (!isSupabaseConfigured()) {
      return res.status(500).json({ error: "Supabase chưa được cấu hình trên máy chủ." });
    }

    const supabase = getSupabaseClient();
    const cleanEmail = email.toLowerCase().trim();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (error || !data.user) {
      Logger.error(`Supabase login failed for ${cleanEmail}: ${error?.message || "Unknown error"}`);
      return res.status(401).json({ error: "Email hoặc mật khẩu không chính xác." });
    }

    const users = Database.getUsers();
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);

    const localUser = buildLocalUserFromAuth({
      existingUser: existing,
      authUserId: data.user.id,
      email: cleanEmail,
      name:
        typeof data.user.user_metadata?.name === "string"
          ? data.user.user_metadata.name
          : existing?.name,
      classCode:
        typeof data.user.user_metadata?.classCode === "string"
          ? data.user.user_metadata.classCode
          : existing?.classCode
    });

    if (existing) {
      const userIndex = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
      users[userIndex] = localUser;
    } else {
      users.push(localUser);
    }
    Database.saveUsers(users);

    const authResponse = issueAppAuthResponse(localUser, rememberMe);
    Logger.info(`User logged in via Supabase: ${localUser.email} with role ${localUser.role}`);

    res.json({
      message: "Đăng nhập thành công!",
      ...authResponse
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/auth/me
 * @desc Get currently authenticated user credentials
 * @access Private
 */
router.get("/me", authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Chưa xác thực." });
  }
  const users = Database.getUsers();
  const dbUser = users.find(u => u.id === req.user?.id);
  if (!dbUser) {
    return res.status(404).json({ error: "Không tìm thấy tài khoản người dùng." });
  }
  const { passwordHash, ...userWithoutPassword } = dbUser;
  res.json({ user: userWithoutPassword });
});

/**
 * @route PUT /api/auth/profile
 * @desc Update teacher profile info (avatar, phone, dob, workplace, experience, achievements, bio, name, classCode)
 * @access Private
 */
router.put("/profile", authenticateToken as any, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Chưa xác thực." });
    }

    const { name, classCode, avatar, phone, dob, workplace, experience, achievements, bio, email, hasCompletedOnboarding } = req.body;

    const users = Database.getUsers();
    const userIndex = users.findIndex(u => u.id === req.user?.id);

    if (userIndex === -1) {
      return res.status(404).json({ error: "Không tìm thấy người dùng." });
    }

    if (email !== undefined) {
      const cleanEmail = email.toLowerCase().trim();
      if (!cleanEmail) {
        return res.status(400).json({ error: "Email không được để trống." });
      }
      // Simple regex for basic email format verification
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ error: "Định dạng email không hợp lệ." });
      }
      
      const existingUser = users.find(u => u.email.toLowerCase() === cleanEmail && u.id !== req.user?.id);
      if (existingUser) {
        return res.status(400).json({ error: "Email này đã được sử dụng bởi một tài khoản khác." });
      }
    }

    const updatedUser = {
      ...users[userIndex],
      ...(name !== undefined && { name: name.trim() }),
      ...(classCode !== undefined && { classCode: classCode.toUpperCase().trim() }),
      ...(avatar !== undefined && { avatar: avatar.trim() }),
      ...(phone !== undefined && { phone: phone.trim() }),
      ...(dob !== undefined && { dob: dob.trim() }),
      ...(workplace !== undefined && { workplace: workplace.trim() }),
      ...(experience !== undefined && { experience: experience.trim() }),
      ...(achievements !== undefined && { achievements: achievements.trim() }),
      ...(bio !== undefined && { bio: bio.trim() }),
      ...(email !== undefined && { email: email.toLowerCase().trim() }),
      ...(hasCompletedOnboarding !== undefined && { hasCompletedOnboarding: Boolean(hasCompletedOnboarding) }),
    };

    users[userIndex] = updatedUser;
    Database.saveUsers(users);

    const tokenPayload = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      classCode: updatedUser.classCode
    };

    // Regenerate token to sync information
    const token = generateToken(tokenPayload);

    const { passwordHash, ...userWithoutPassword } = updatedUser;

    res.json({
      message: "Cập nhật thông tin thành công!",
      user: userWithoutPassword,
      token: token
    });
  } catch (err) {
    next(err);
  }
});

export default router;
