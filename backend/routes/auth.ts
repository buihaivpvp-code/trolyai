import { Router, Response } from "express";
import { Database } from "../services/db.ts";
import {
  generateToken,
  authenticateToken,
  AuthenticatedRequest
} from "../middleware/auth.ts";
import { Logger } from "../middleware/logger.ts";
import { getSupabaseClient, isSupabaseConfigured } from "../services/supabase.ts";
import { R2Storage } from "../services/r2Storage.ts";

const router = Router();

function sanitizeFolderName(name: string): string {
  if (!name) return "giaovien";
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .trim();
}

function buildLocalUserFromAuth(params: {
  existingUser?: any;
  authUserId: string;
  email: string;
  name?: string;
  classCode?: string;
  teacherCode?: string;
}) {
  const { existingUser, authUserId, email, name, classCode, teacherCode } = params;

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
    hasCompletedOnboarding: existingUser?.hasCompletedOnboarding ?? false,
    teacherCode: teacherCode || existingUser?.teacherCode || ""
  };
}

function issueAppAuthResponse(user: any, rememberMe?: boolean) {
  const tokenPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    classCode: user.classCode,
    teacherCode: user.teacherCode || ""
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
    let { email, password, name, classCode = "4A", rememberMe } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Vui lòng nhập họ tên giáo viên." });
    }

    if (!isSupabaseConfigured()) {
      return res.status(500).json({ error: "Supabase chưa được cấu hình trên máy chủ." });
    }

    const supabase = getSupabaseClient();
    
    // Auto-generate teacherCode (random 3-6 digit code)
    await Database.refreshCacheFromSupabase(true);
    const users = Database.getUsers();
    let teacherCode = "";
    let isUnique = false;
    while (!isUnique) {
      teacherCode = String(Math.floor(100 + Math.random() * 999900));
      isUnique = !users.some(u => u.teacherCode === teacherCode);
    }

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Vui lòng nhập địa chỉ email hợp lệ." });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Mật khẩu phải có ít nhất 6 ký tự." });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();
    const cleanClassCode = classCode.toUpperCase().trim();

    // Prevent duplicate registrations by checking if email already exists in database
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(400).json({ error: "Email này đã được đăng ký trên hệ thống." });
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: cleanName,
          classCode: cleanClassCode,
          teacherCode
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

    const localUser = buildLocalUserFromAuth({
      existingUser: existing,
      authUserId,
      email: cleanEmail,
      name: cleanName,
      classCode: cleanClassCode,
      teacherCode
    });

    if (existing) {
      const userIndex = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
      users[userIndex] = localUser;
    } else {
      users.push(localUser);
    }
    await Database.saveUsers(users);

    // Create R2 folder placeholder named after the teacher's random code
    if (R2Storage.isEnabled()) {
      const folderName = teacherCode;
      try {
        await R2Storage.uploadDocument({
          key: `${folderName}/.created`,
          body: Buffer.from("created"),
          contentType: "text/plain"
        });
        Logger.info(`Created R2 folder placeholder for teacher code: ${folderName}`);
      } catch (err) {
        Logger.warn(`Failed to create R2 folder placeholder for ${cleanEmail}:`, err);
      }
    }

    const authResponse = issueAppAuthResponse(localUser, rememberMe);
    Logger.info(`Registered new Supabase-backed user account with code ${teacherCode}: ${localUser.email}`);

    res.status(201).json({
      message: "Đăng ký tài khoản thành công!",
      teacherCode,
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

    if (!email) {
      return res.status(400).json({ error: "Vui lòng nhập Email hoặc Mã số truy cập." });
    }

    const inputClean = email.trim();
    const isCode = /^\d{3,6}$/.test(inputClean);

    // Check if user exists in database first, if not, direct them to register
    await Database.refreshCacheFromSupabase(true);
    const users = Database.getUsers();
    
    let existing = null;
    if (isCode) {
      existing = users.find((u) => u.teacherCode === inputClean);
    } else {
      existing = users.find((u) => u.email.toLowerCase() === inputClean.toLowerCase());
    }

    if (!existing) {
      return res.status(404).json({
        error: isCode
          ? "Mã số truy cập này không hợp lệ hoặc chưa được đăng ký."
          : "Tài khoản này chưa tồn tại trên hệ thống. Vui lòng chuyển sang tab Đăng ký để tạo tài khoản mới."
      });
    }

    let authUserId = existing.id;

    if (!isCode) {
      if (!password) {
        return res.status(400).json({ error: "Vui lòng nhập mật khẩu." });
      }

      if (!isSupabaseConfigured()) {
        return res.status(500).json({ error: "Supabase chưa được cấu hình trên máy chủ." });
      }

      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: existing.email,
        password
      });

      if (error || !data.user) {
        Logger.error(`Supabase login failed for ${existing.email}: ${error?.message || "Unknown error"}`);
        return res.status(401).json({ error: "Mật khẩu không chính xác. Vui lòng kiểm tra lại." });
      }
      authUserId = data.user.id;
    }

    const localUser = buildLocalUserFromAuth({
      existingUser: existing,
      authUserId,
      email: existing.email,
      name: existing.name,
      classCode: existing.classCode,
      teacherCode: existing.teacherCode
    });

    if (existing) {
      const userIndex = users.findIndex((u) => u.id === existing.id);
      users[userIndex] = localUser;
    } else {
      users.push(localUser);
    }
    await Database.saveUsers(users);

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
router.put("/profile", authenticateToken as any, async (req: AuthenticatedRequest, res: Response, next) => {
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
    await Database.saveUsers(users);

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
