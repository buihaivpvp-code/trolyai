/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Mail, 
  Lock, 
  User, 
  School, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  GraduationCap, 
  ShieldCheck, 
  Calendar, 
  FileSpreadsheet
} from "lucide-react";
import { apiFetch } from "../utils/api";

interface AuthProps {
  onAuthSuccess: (user: any, token: string) => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [classCode, setClassCode] = useState("4A");
  const [rememberMe, setRememberMe] = useState(false);
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load saved credentials on mount
  React.useEffect(() => {
    const savedEmail = localStorage.getItem("remember_email") || "";
    const savedPassword = localStorage.getItem("remember_password") || "";
    const savedRemember = localStorage.getItem("remember_me") === "true";
    if (savedRemember) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body = mode === "login" 
      ? { email, password, rememberMe } 
      : { email, password, name, classCode, rememberMe };

    try {
      const response = await apiFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      let data: any = null;
      const contentType = response.headers.get("content-type") || "";

      const buildInvalidResponseError = (rawText: string) => {
        console.error("Auth invalid response:", rawText);

        const normalizedText = rawText.trim();
        const preview = normalizedText.slice(0, 120);
        const isHtmlLike =
          normalizedText.startsWith("<") ||
          /<!DOCTYPE/i.test(rawText) ||
          /<html/i.test(rawText) ||
          /trang/i.test(preview) ||
          /page/i.test(preview);

        return new Error(
          isHtmlLike
            ? "Máy chủ đang trả về trang web thay vì API đăng nhập. Vui lòng kiểm tra cấu hình VITE_API_BASE_URL, tên miền backend hoặc proxy /api."
            : `Máy chủ trả về dữ liệu không hợp lệ: ${preview || "Phản hồi rỗng"}`
        );
      };

      if (contentType.includes("application/json")) {
        const rawText = await response.text();

        try {
          data = rawText ? JSON.parse(rawText) : null;
        } catch {
          throw buildInvalidResponseError(rawText);
        }
      } else {
        const text = await response.text();
        throw buildInvalidResponseError(text);
      }

      if (!response.ok) {
        throw new Error(data?.error || data?.message || "Có lỗi xảy ra, vui lòng thử lại.");
      }

      if (mode === "register") {
        setSuccess("Đăng ký tài khoản thành công! Vui lòng đăng nhập để bắt đầu.");
        setPassword("");
        setMode("login");
        setLoading(false);
        return;
      }

      setSuccess(data.message || "Xác thực thành công!");

      // Save/remove saved credentials based on rememberMe option
      if (rememberMe) {
        localStorage.setItem("remember_email", email);
        localStorage.setItem("remember_password", password);
        localStorage.setItem("remember_me", "true");
      } else {
        localStorage.removeItem("remember_email");
        localStorage.removeItem("remember_password");
        localStorage.removeItem("remember_me");
      }
      
      // Delay slightly for smooth transition
      setTimeout(() => {
        onAuthSuccess(data.user, data.token);
      }, 800);

    } catch (err: any) {
      setError(err.message || "Không thể kết nối tới máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = () => {
    setEmail("giaovien@eduai.vn");
    setPassword("password123");
    setMode("login");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans select-none" id="auth-screen-container">
      {/* Background visual accents */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none translate-x-1/2 translate-y-1/2" />

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 bg-slate-950/40 backdrop-blur-md rounded-3xl border border-slate-800/80 shadow-2xl overflow-hidden relative z-10" id="auth-card-wrapper">
        
        {/* LEFT COLUMN: BRAND PROMOTION & STATISTICS */}
        <div className="lg:col-span-5 bg-gradient-to-br from-indigo-900/60 via-slate-900 to-slate-950 p-8 sm:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-850" id="auth-left-brand-panel">
          <div>
            <div className="flex items-center gap-2.5 mb-8">
              <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-black text-white tracking-tight block">EduAI 1.0</span>
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Trợ lý sư phạm toàn diện</span>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-snug tracking-tight mb-4">
              Giải pháp số <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">tối ưu sức lao động</span> cho Giáo viên Tiểu học
            </h2>

            <p className="text-xs text-slate-400 leading-relaxed mb-8">
              Tự động hóa giáo án bài giảng, đề kiểm tra chuẩn quy chế, sổ đầu bài thông minh và dự báo học lực bám sát Thông tư 27 của Bộ GD&ĐT.
            </p>

            {/* Feature lists */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-indigo-500/10 p-1.5 rounded-lg text-indigo-400 shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Bảo mật thông tin học sinh</h4>
                  <p className="text-[11px] text-slate-400">Dữ liệu được mã hóa chuẩn sư phạm, an toàn tuyệt đối.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-emerald-500/10 p-1.5 rounded-lg text-emerald-400 shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Đồng hành Thông tư 27</h4>
                  <p className="text-[11px] text-slate-400">Sử dụng ba mốc đánh giá: HTT, HT, CHT chuẩn mực.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-amber-500/10 p-1.5 rounded-lg text-amber-400 shrink-0 mt-0.5">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Phân tích học lực tự động</h4>
                  <p className="text-[11px] text-slate-400">Nhận diện sớm học sinh cần bổ trợ, đề xuất phương án.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-850 mt-8">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              © 2026 EduAI – Nền tảng số bồi dưỡng chuyên môn cho tương lai giáo dục Việt Nam.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: AUTHENTICATION FORM CARD */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center bg-slate-950/20" id="auth-right-form-panel">
          <div className="max-w-md w-full mx-auto">
            
            {/* Mode Switch Tab */}
            <div className="flex bg-slate-900 p-1 rounded-2xl mb-8 border border-slate-800" id="auth-mode-tabs">
              <button
                type="button"
                onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer border-none ${
                  mode === "login" 
                    ? "bg-indigo-600 text-white shadow-lg" 
                    : "text-slate-400 hover:text-slate-200 bg-transparent"
                }`}
              >
                Đăng Nhập
              </button>
              <button
                type="button"
                onClick={() => { setMode("register"); setError(null); setSuccess(null); }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer border-none ${
                  mode === "register" 
                    ? "bg-indigo-600 text-white shadow-lg" 
                    : "text-slate-400 hover:text-slate-200 bg-transparent"
                }`}
              >
                Đăng Ký Tài Khoản
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-bold text-white tracking-tight">
                {mode === "login" ? "Chào mừng Thầy Cô quay trở lại" : "Tạo tài khoản giáo viên mới"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {mode === "login" 
                  ? "Vui lòng nhập tài khoản để truy cập kho học liệu và danh sách lớp học." 
                  : "Đăng ký tài khoản lớp học để thiết lập học bạ & sổ sách năm học 2026."}
              </p>
            </div>

            {/* Error & Success States */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 mb-6 flex gap-3 items-start text-xs text-rose-300"
                id="auth-error-alert"
              >
                <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-rose-400" />
                <span className="leading-relaxed">{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 mb-6 flex gap-3 items-start text-xs text-emerald-300"
                id="auth-success-alert"
              >
                <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5 text-emerald-400" />
                <span className="leading-relaxed">{success}</span>
              </motion.div>
            )}

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-4" id="auth-main-form">
              {mode === "register" && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">Họ và Tên giáo viên:</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Nguyễn Thị Mai"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-xs pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white placeholder-slate-500"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Địa chỉ Email:
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="giao-vien@ten-truong.edu.vn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">Mật khẩu bảo mật:</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="Tối thiểu 6 ký tự"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 pb-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-slate-300 hover:text-white transition-colors" id="auth-remember-me-checkbox">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950 w-4.5 h-4.5 cursor-pointer accent-indigo-600"
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
              </div>

              {mode === "register" && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">Lớp học chủ nhiệm:</label>
                  <div className="relative">
                    <School className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: 4A, 4B, 5C"
                      value={classCode}
                      onChange={(e) => setClassCode(e.target.value)}
                      className="w-full text-xs pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white placeholder-slate-500 uppercase font-bold"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer border-none mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Đang xử lý thông tin...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === "login" ? "Đăng Nhập Ngay" : "Hoàn Tất Đăng Ký"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Assist Card */}
            {mode === "login" && (
              <div className="mt-8 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3" id="demo-account-helper">
                <div className="text-left">
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Tài khoản thử nghiệm
                  </span>
                  <p className="text-[11px] text-slate-300 font-medium">Email: giaovien@eduai.vn</p>
                  <p className="text-[11px] text-slate-400">Mật khẩu: password123</p>
                </div>
                <button
                  type="button"
                  onClick={fillDemoAccount}
                  className="px-3.5 py-1.5 bg-indigo-600/15 text-indigo-400 hover:bg-indigo-600/25 rounded-xl text-[10px] font-bold transition-all cursor-pointer border-none whitespace-nowrap self-stretch sm:self-center text-center"
                >
                  Điền nhanh
                </button>
              </div>
            )}
            
          </div>
        </div>

      </div>
    </div>
  );
}
