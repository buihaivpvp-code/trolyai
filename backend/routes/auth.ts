import { Router, Response } from "express";
import { Database } from "../services/db";
import { 
  hashPassword, 
  generateToken, 
  authenticateToken, 
  AuthenticatedRequest 
} from "../middleware/auth";
import { Logger } from "../middleware/logger";

const router = Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new teacher or school account
 * @access Public
 */
router.post("/register", (req, res, next) => {
  try {
    const { email, password, name, classCode = "4A", rememberMe } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Vui lòng nhập đầy đủ email, mật khẩu và họ tên." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Mật khẩu phải chứa ít nhất 6 ký tự." });
    }

    const users = Database.getUsers();
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    
    if (existing) {
      return res.status(400).json({ error: "Email này đã được sử dụng bởi giáo viên khác." });
    }

    const newUser = {
      id: "usr-" + Math.random().toString(36).substring(2, 9),
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      name: name.trim(),
      role: "teacher" as const, // Default role for registering users
      classCode: classCode.toUpperCase().trim(),
      hasCompletedOnboarding: false
    };

    users.push(newUser);
    Database.saveUsers(users);

    const tokenPayload = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      classCode: newUser.classCode
    };

    const expiryMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const token = generateToken(tokenPayload, expiryMs);
    Logger.info(`Registered new user account: ${newUser.email}`);

    const { passwordHash, ...userWithoutPassword } = newUser;

    res.status(201).json({
      message: "Đăng ký tài khoản thành công!",
      token,
      user: userWithoutPassword
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
router.post("/login", (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Vui lòng nhập email và mật khẩu." });
    }

    const users = Database.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user) {
      return res.status(401).json({ error: "Email hoặc mật khẩu không chính xác." });
    }

    const matched = hashPassword(password) === user.passwordHash;
    if (!matched) {
      return res.status(401).json({ error: "Email hoặc mật khẩu không chính xác." });
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      classCode: user.classCode
    };

    const expiryMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const token = generateToken(tokenPayload, expiryMs);
    Logger.info(`User logged in: ${user.email} with role ${user.role}`);

    const { passwordHash, ...userWithoutPassword } = user;

    res.json({
      message: "Đăng nhập thành công!",
      token,
      user: userWithoutPassword
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
