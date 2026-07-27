/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Student } from "./types";
import StudentManager from "./components/StudentManager";
import DocumentRepository from "./components/DocumentRepository";
import SlideGenerator from "./components/SlideGenerator";
import AITestCreator from "./components/AITestCreator";
import ClassroomGames from "./components/ClassroomGames";
import ClassJournal from "./components/ClassJournal";
import { Sparkles, Calendar, BookOpen, Layers, PhoneCall, LineChart, Star, Milestone, HelpCircle, Users, Library, Sliders, ClipboardCheck, Award, FileText, Key, Check, AlertCircle, Loader2, LogOut, User, Camera, Edit2, ShieldCheck, Briefcase, GraduationCap, Phone, Mail, FileSignature, Settings, Database, FolderKanban } from "lucide-react";
import { apiFetch } from "./utils/api";
import Auth from "./components/Auth";
import Onboarding from "./components/Onboarding";

type TabID = "manager" | "repository" | "slides" | "tests" | "classroom_games" | "journal";

const PRESET_AVATARS = [
  { name: "Cô giáo hiền dịu", url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80" },
  { name: "Thầy giáo trẻ trung", url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" },
  { name: "Cô giáo năng động", url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80" },
  { name: "Thầy giáo trung niên", url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80" },
  { name: "Cô giáo sáng tạo", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" }
];

const normalizeDateValue = (value?: string | null) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

const formatVietnameseDate = (value?: string | null) => {
  const normalized = normalizeDateValue(value);
  if (!normalized) return "Chưa cập nhật ngày sinh.";
  const [year, month, day] = normalized.split("-");
  if (!year || !month || !day) return "Chưa cập nhật ngày sinh.";
  return `${day}/${month}/${year}`;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabID>("manager");
  const [apiOnline, setApiOnline] = useState(true);

  // User Session States
  const [user, setUser] = useState<any | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Gemini Custom API States
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [customApiKey, setCustomApiKey] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
  const [fontScale, setFontScale] = useState("Vừa");
  const [thinkingMode, setThinkingMode] = useState("Cân bằng");

  // Teacher Profile Modal States
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isEditingTeacher, setIsEditingTeacher] = useState(false);
  const [teacherForm, setTeacherForm] = useState({
    name: "",
    classCode: "",
    avatar: "",
    phone: "",
    dob: "",
    workplace: "",
    experience: "",
    achievements: "",
    bio: "",
    email: ""
  });
  const [saveProfileStatus, setSaveProfileStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveProfileError, setSaveProfileError] = useState("");

  const syncAuthenticatedUser = async () => {
    const response = await apiFetch("/api/auth/me");

    if (!response.ok) {
      throw new Error("Không thể đồng bộ thông tin tài khoản.");
    }

    const data = await response.json();
    setUser(data.user);
    return data.user;
  };

  // Sync user info into edit form
  useEffect(() => {
    if (user) {
      setTeacherForm({
        name: user.name || "",
        classCode: user.classCode || "",
        avatar: user.avatar || "",
        phone: user.phone || "",
        dob: normalizeDateValue(user.dob),
        workplace: user.workplace || "",
        experience: user.experience || "",
        achievements: user.achievements || "",
        bio: user.bio || "",
        email: user.email || ""
      });
    }
  }, [user]);

  const handleSaveTeacherProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveProfileStatus("saving");
    setSaveProfileError("");

    try {
      const profilePayload = {
        ...teacherForm,
        dob: normalizeDateValue(teacherForm.dob)
      };

      const resp = await apiFetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(profilePayload)
      });

      if (resp.ok) {
        const data = await resp.json();

        if (data.token) {
          localStorage.setItem("auth_token", data.token);
        }

        const refreshedUser = await syncAuthenticatedUser();
        setTeacherForm({
          name: refreshedUser.name || "",
          classCode: refreshedUser.classCode || "",
          avatar: refreshedUser.avatar || "",
          phone: refreshedUser.phone || "",
          dob: normalizeDateValue(refreshedUser.dob),
          workplace: refreshedUser.workplace || "",
          experience: refreshedUser.experience || "",
          achievements: refreshedUser.achievements || "",
          bio: refreshedUser.bio || "",
          email: refreshedUser.email || ""
        });

        setSaveProfileStatus("success");
        setTimeout(() => {
          setIsEditingTeacher(false);
          setSaveProfileStatus("idle");
        }, 1200);
      } else {
        const errData = await resp.json();
        setSaveProfileStatus("error");
        setSaveProfileError(errData.error || "Không thể cập nhật thông tin giáo viên.");
      }
    } catch (err: any) {
      setSaveProfileStatus("error");
      setSaveProfileError(err.message || "Lỗi kết nối mạng.");
    }
  };

  // Avatar upload drag & drop states and handlers
  const [dragOver, setDragOver] = useState(false);

  const processAvatarFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setSaveProfileError("Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WEBP).");
      setSaveProfileStatus("error");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Use HTML Canvas to resize and compress the image to max 250x250px for high performance storage
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 250;
        const MAX_HEIGHT = 250;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.85);
          setTeacherForm((prev) => ({ ...prev, avatar: compressedBase64 }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAvatarFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAvatarFile(file);
    }
  };

  // Load key and verify session from localStorage on start
  useEffect(() => {
    // 1. Load custom API key
    const savedKey = localStorage.getItem("custom_gemini_api_key") || "";
    const savedTheme = localStorage.getItem("eduai_theme_mode") || "light";
    const savedFontScale = localStorage.getItem("eduai_font_scale") || "Vừa";
    const savedThinkingMode = localStorage.getItem("eduai_thinking_mode") || "Cân bằng";
    setCustomApiKey(savedKey);
    setHasCustomKey(!!savedKey.trim());
    setThemeMode(savedTheme === "dark" ? "dark" : "light");
    setFontScale(savedFontScale);
    setThinkingMode(savedThinkingMode);

    // 2. Fetch current user session
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setLoadingUser(false);
      return;
    }

    syncAuthenticatedUser()
      .catch((err) => {
        console.error("Lỗi tải thông tin phiên đăng nhập:", err);
        localStorage.removeItem("auth_token");
        setUser(null);
      })
      .finally(() => {
        setLoadingUser(false);
      });
  }, []);

  const handleSaveKey = () => {
    if (customApiKey.trim()) {
      localStorage.setItem("custom_gemini_api_key", customApiKey.trim());
      setHasCustomKey(true);
      setTestStatus("success");
      setTestMessage("Đã lưu khóa API cá nhân thành công! Hệ thống sẽ tự động áp dụng khóa này.");
    } else {
      localStorage.removeItem("custom_gemini_api_key");
      setHasCustomKey(false);
      setTestStatus("idle");
      setTestMessage("");
    }
    setTimeout(() => {
      setShowApiKeyModal(false);
      setTestStatus("idle");
    }, 1500);
  };

  const handleTestKey = async () => {
    if (!customApiKey.trim()) {
      setTestStatus("error");
      setTestMessage("Vui lòng nhập khóa API trước khi kiểm tra kết nối.");
      return;
    }

    setTestStatus("testing");
    setTestMessage("");

    try {
      const response = await apiFetch("/api/gemini/test-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-api-key": customApiKey.trim()
        }
      });
      
      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        
        if (text.trim().startsWith("<") || text.includes("<!DOCTYPE") || text.includes("Trang chủ")) {
          data = {
            success: false,
            error: "Hệ thống đang định tuyến API chưa đúng. Máy chủ hiện trả về trang HTML thay vì phản hồi API của ứng dụng. Thầy cô vui lòng kiểm tra cấu hình tên miền, proxy hoặc liên hệ quản trị viên."
          };
        } else {
          data = {
            success: false,
            error: `Máy chủ trả về định dạng không hợp lệ: ${text.slice(0, 100)}`
          };
        }
      }

      if (data.success) {
        setTestStatus("success");
        setTestMessage(data.message);
      } else {
        setTestStatus("error");
        setTestMessage(data.error || "Không thể xác thực khóa này.");
      }
    } catch (err: any) {
      setTestStatus("error");
      setTestMessage(err.message || "Lỗi mạng hoặc server không phản hồi.");
    }
  };

  const handleDeleteKey = () => {
    localStorage.removeItem("custom_gemini_api_key");
    setCustomApiKey("");
    setHasCustomKey(false);
    setTestStatus("idle");
    setTestMessage("");
  };

  const handleThemeChange = (mode: "light" | "dark") => {
    setThemeMode(mode);
    localStorage.setItem("eduai_theme_mode", mode);
  };

  const handleFontScaleChange = (scale: string) => {
    setFontScale(scale);
    localStorage.setItem("eduai_font_scale", scale);
  };

  const handleThinkingModeChange = (mode: string) => {
    setThinkingMode(mode);
    localStorage.setItem("eduai_thinking_mode", mode);
  };

  const handleAuthSuccess = (userData: any, token: string) => {
    localStorage.setItem("auth_token", token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    setUser(null);
  };

  // Check backend health during load (if authenticated)
  useEffect(() => {
    if (!user) return;
    apiFetch("/api/students")
      .then((res) => {
        if (res.ok) setApiOnline(true);
      })
      .catch(() => setApiOnline(false));
  }, [user]);

  // Loading Session Screen
  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans select-none" id="auth-loading-splash">
        <div className="text-center space-y-4">
          <div className="inline-block bg-indigo-600 p-4 rounded-2xl text-white shadow-xl shadow-indigo-600/30">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-slate-200">Đang đồng bộ phiên hoạt động...</h2>
          <p className="text-xs text-slate-400">Vui lòng chờ giây lát trong khi EduAI tải thông tin học bạ.</p>
        </div>
      </div>
    );
  }

  // Auth Guard
  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  // Onboarding Guard
  if (user.role === "teacher" && !user.hasCompletedOnboarding) {
    return (
      <Onboarding 
        user={user} 
        onOnboardingComplete={(updatedUser) => {
          setUser(updatedUser);
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans tracking-tight antialiased selection:bg-indigo-500 selection:text-white" id="eduai-app-root">
      
      {/* 1. TOP HEADER BRAND PANEL */}
      <header className="bg-slate-900 text-white shadow-md relative overflow-hidden shrink-0">
        {/* Subtle animated design backdrop */}
        <div className="absolute top-0 right-0 w-80 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
              Trợ lý AI cho giáo viên Tiểu học
            </h1>
            <p className="text-xs text-slate-350 max-w-2xl leading-relaxed mt-1">
              Giáo dục là không ngừng đổi mới
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* User credentials banner */}
            <button
              onClick={() => {
                setIsEditingTeacher(false);
                setShowTeacherModal(true);
              }}
              className="flex items-center gap-2.5 text-right mr-2 bg-slate-800/50 hover:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/40 transition-all cursor-pointer group focus:outline-none focus:ring-1 focus:ring-indigo-500"
              title="Xem và cập nhật hồ sơ cá nhân"
            >
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/30 group-hover:ring-indigo-500/60 transition-all shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-600/35 flex items-center justify-center text-white font-black text-xs ring-2 ring-indigo-500/30 group-hover:ring-indigo-500/60 transition-all shrink-0">
                  {user.name ? user.name.split(" ").pop()?.slice(0, 2).toUpperCase() : "GV"}
                </div>
              )}
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-white block group-hover:text-indigo-200 transition-colors">Thầy Cô: {user.name}</span>
                <span className="text-[10px] text-slate-350 font-semibold">Chủ nhiệm: Lớp {user.classCode}</span>
              </div>
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="bg-indigo-950/40 hover:bg-indigo-900/60 text-xs text-indigo-200 border border-indigo-800/40 rounded-xl px-3.5 py-2.5 flex items-center gap-2 transition-all cursor-pointer shadow-xs font-bold"
              title="Mở cài đặt tài khoản và hệ thống"
            >
              <Settings className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden md:inline">Cài đặt</span>
            </button>

            <button
              onClick={handleLogout}
              className="bg-rose-950/40 hover:bg-rose-900/60 text-xs text-rose-300 border border-rose-800/40 rounded-xl px-3.5 py-2.5 flex items-center gap-2 transition-all cursor-pointer shadow-xs font-bold"
              title="Đăng xuất tài khoản"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden md:inline">Đăng Xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. NAVIGATION TABS ROW */}
      <nav className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex scrollbar-none overflow-x-auto gap-1 py-2">
            
            {/* Tab 1: Danh Sách Lớp Học */}
            <button
              id="tab-btn-manager"
              onClick={() => setActiveTab("manager")}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === "manager"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Users className="w-4 h-4" />
              Danh Sách Lớp Học
            </button>

            {/* Tab 5: Kho tài liệu */}
            <button
              id="tab-btn-repository"
              onClick={() => setActiveTab("repository")}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === "repository"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Library className="w-4 h-4" />
              Kho Tài Liệu
            </button>

            {/* Tab 6: AI Tạo Slide bài giảng */}
            <button
              id="tab-btn-slides"
              onClick={() => setActiveTab("slides")}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === "slides"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              AI Tạo Slide Bài Giảng
            </button>

            {/* Tab 7: AI Tạo Đề Kiểm Tra */}
            <button
              id="tab-btn-tests"
              onClick={() => setActiveTab("tests")}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === "tests"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <ClipboardCheck className="w-4 h-4 text-indigo-500" />
              AI Tạo Đề Kiểm Tra
            </button>

            {/* Tab 8: Kiểm tra bài cũ */}
            <button
              id="tab-btn-games"
              onClick={() => setActiveTab("classroom_games")}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === "classroom_games"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Award className="w-4 h-4 text-rose-500" />
               Kiểm tra bài cũ
            </button>

            {/* Tab 9: Sổ đầu bài AI */}
            <button
              id="tab-btn-journal"
              onClick={() => setActiveTab("journal")}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === "journal"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-500" />
              Sổ Đầu Bài AI 📝
            </button>

          </div>
        </div>
      </nav>

      {/* 4. WORKSPACE MAIN CONTENT ELEMENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === "manager" && (
          <StudentManager 
            user={user}
          />
        )}

        {activeTab === "repository" && (
          <DocumentRepository user={user} />
        )}

        {activeTab === "slides" && (
          <SlideGenerator user={user} />
        )}

        {activeTab === "tests" && (
          <AITestCreator user={user} />
        )}

        {activeTab === "classroom_games" && (
          <ClassroomGames user={user} />
        )}

        {activeTab === "journal" && (
          <ClassJournal user={user} />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 mt-auto py-4" id="eduai-app-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-[11px] text-slate-400">
          <span>© 2026 EduAI 1.0 – AI Trợ Lý Nhà Giáo Việt Nam. Bảo lưu mọi quyền sư phạm. • Bảo mật thông tin dữ liệu trẻ em</span>
        </div>
      </footer>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="api-key-modal-overlay">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200" id="api-key-modal-content">
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm">Cài đặt API trí tuệ nhân tạo (Gemini AI)</h3>
              </div>
              <button
                onClick={() => { setShowApiKeyModal(false); setTestStatus("idle"); }}
                className="text-slate-400 hover:text-white text-xs cursor-pointer bg-transparent border-none"
              >
                ✕ Đóng
              </button>
            </div>

            <div className="p-6 space-y-4 text-left">
              <p className="text-xs text-slate-600 leading-relaxed">
                Hệ thống EduAI đang sử dụng dịch vụ Google Gemini AI để hỗ trợ giáo án, ra đề thi, soạn slide và nhận xét học sinh. Nếu thầy cô gặp tình trạng quá tải (hết lượt sử dụng miễn phí hằng ngày), thầy cô có thể tự thêm <strong>khóa API cá nhân</strong> để sử dụng không giới hạn.
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-850 space-y-1">
                <p className="font-bold">💡 Hướng dẫn lấy khóa API miễn phí:</p>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Truy cập trang <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-amber-900">Google AI Studio</a>.</li>
                  <li>Đăng nhập bằng tài khoản Gmail của thầy cô.</li>
                  <li>Nhấn vào nút <strong>"Get API key"</strong> màu xanh hoặc <strong>"Create API Key"</strong>.</li>
                  <li>Sao chép mã khóa (chuỗi ký tự dài bắt đầu bằng <code className="bg-amber-100 px-1 rounded font-mono">AIzaSy...</code>) và dán xuống khung dưới đây.</li>
                </ol>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Khóa API Gemini của thầy cô:</label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Nhập khóa API cá nhân (ví dụ: AIzaSy...)"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 font-mono"
                  />
                </div>
              </div>

              {testStatus !== "idle" && (
                <div className={`p-3 rounded-xl text-xs flex gap-2 items-start ${
                  testStatus === "testing" ? "bg-slate-50 text-slate-600 border border-slate-100" :
                  testStatus === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-100" :
                  "bg-rose-50 text-rose-800 border border-rose-100"
                }`}>
                  {testStatus === "testing" && <Loader2 className="w-4 h-4 animate-spin text-slate-500 shrink-0 mt-0.5" />}
                  {testStatus === "success" && <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                  {testStatus === "error" && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
                  <span className="leading-relaxed text-[11px]">{testMessage}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 gap-2">
                {hasCustomKey ? (
                  <button
                    onClick={handleDeleteKey}
                    className="px-3 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer bg-white"
                  >
                    Xóa Khóa Cá Nhân
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={handleTestKey}
                    disabled={testStatus === "testing"}
                    className="px-3.5 py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 border-none"
                  >
                    {testStatus === "testing" ? "Đang kiểm tra..." : "Kiểm tra kết nối"}
                  </button>
                    <button
                      onClick={handleSaveKey}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs border-none"
                    >
                      Lưu cấu hình
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in" id="modal-settings">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-100 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Thiết lập tài khoản & hệ thống</h3>
                  <p className="text-[11px] text-slate-400">Thông tin đang hiển thị theo đúng tài khoản hiện đăng nhập</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer bg-transparent border-none"
              >
                ✕ Đóng
              </button>
            </div>

            <div className="p-6 space-y-6 text-left max-h-[75vh] overflow-y-auto">
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-sm font-bold text-slate-900">Cài đặt chung</h4>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <h5 className="text-xs font-bold text-slate-800">Giao diện sáng / tối</h5>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleThemeChange("light")}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${themeMode === "light" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"}`}
                      >
                        Sáng
                      </button>
                      <button
                        onClick={() => handleThemeChange("dark")}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${themeMode === "dark" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"}`}
                      >
                        Tối
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">Thiết lập giao diện ưu tiên cho tài khoản hiện tại.</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <h5 className="text-xs font-bold text-slate-800">Cỡ chữ hiển thị</h5>
                    <div className="flex flex-wrap gap-2">
                      {["Nhỏ", "Vừa", "Lớn"].map((size) => (
                        <button
                          key={size}
                          onClick={() => handleFontScaleChange(size)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${fontScale === size ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-200"}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500">Cài đặt cỡ chữ để phù hợp thói quen sử dụng.</p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-sm font-bold text-slate-900">Cài đặt tài khoản</h4>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <h5 className="text-xs font-bold text-slate-800">Thông tin tài khoản</h5>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                        <span className="text-slate-500">Họ tên</span>
                        <span className="font-semibold text-slate-900 text-right">{user.name || "Chưa cập nhật"}</span>
                      </div>
                      <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                        <span className="text-slate-500">Email</span>
                        <span className="font-semibold text-slate-900 text-right">{user.email || "Chưa cập nhật"}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Vai trò</span>
                        <span className="font-semibold text-slate-900 text-right capitalize">{user.role === "admin" ? "Quản trị cấp cao" : "Giáo viên chủ nhiệm"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <h5 className="text-xs font-bold text-slate-800">Lớp quản lý và trạng thái tài khoản</h5>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                        <span className="text-slate-500">Email đăng nhập</span>
                        <span className="font-semibold text-slate-900 text-right">{user.email || "Chưa cập nhật"}</span>
                      </div>
                      <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                        <span className="text-slate-500">Lớp hiện quản lý</span>
                        <span className="font-semibold text-indigo-700 text-right">{user.classCode || "Chưa gán lớp"}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Trạng thái phiên</span>
                        <span className="font-semibold text-emerald-600 text-right">Đang hoạt động</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowSettingsModal(false);
                        setIsEditingTeacher(false);
                        setShowTeacherModal(true);
                      }}
                      className="mt-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200"
                    >
                      Xem hồ sơ tài khoản
                    </button>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-sm font-bold text-slate-900">Cấu hình riêng</h4>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-amber-600" />
                      <h5 className="text-xs font-bold text-slate-800">Kho API</h5>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                          <span className="text-slate-500">Nguồn API</span>
                          <span className="font-semibold text-slate-900 text-right">{hasCustomKey ? "Khóa API cá nhân" : "Khóa mặc định hệ thống"}</span>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                          <span className="text-slate-500">Trạng thái backend</span>
                          <span className={`font-semibold text-right ${apiOnline ? "text-emerald-600" : "text-rose-600"}`}>{apiOnline ? "Đang kết nối" : "Mất kết nối máy chủ"}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">Khóa cá nhân</span>
                          <span className={`font-semibold text-right ${hasCustomKey ? "text-emerald-600" : "text-slate-500"}`}>{hasCustomKey ? "Đã cấu hình" : "Chưa cấu hình"}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-[11px] text-slate-500 leading-relaxed">Quản lý khóa API Gemini AI và chuyển sang khóa riêng khi cần.</p>
                        <button
                          onClick={() => {
                            setShowSettingsModal(false);
                            setShowApiKeyModal(true);
                          }}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs border-none"
                        >
                          Mở phần cài đặt API
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-violet-600" />
                      <h5 className="text-xs font-bold text-slate-800">Cấu hình tư duy</h5>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Chọn kiểu tư duy mà trợ lý AI sẽ ưu tiên khi hỗ trợ giáo án, phân tích tài liệu và gợi ý học tập.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {["Nhanh", "Cân bằng", "Chuyên sâu"].map((mode) => (
                        <button
                          key={mode}
                          onClick={() => handleThinkingModeChange(mode)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${thinkingMode === mode ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-700 border-slate-200"}`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between gap-4 text-xs border-t border-slate-200 pt-3">
                      <span className="text-slate-500">Chế độ hiện tại</span>
                      <span className="font-semibold text-violet-700 text-right">{thinkingMode}</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-violet-600" />
                    <h4 className="text-sm font-bold text-slate-900">Thông tin hệ thống</h4>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Trạng thái khởi tạo tài khoản</span>
                    <span className="font-semibold text-slate-900 text-right">{user.hasCompletedOnboarding ? "Đã hoàn tất" : "Chưa hoàn tất"}</span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Hồ sơ giáo viên</span>
                    <span className="font-semibold text-slate-900 text-right">{user.workplace || "Chưa cập nhật nơi công tác"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Phiên đăng nhập</span>
                    <span className="font-semibold text-slate-900 text-right">Đang hoạt động</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* 5. TEACHER PROFILE MODAL */}
      {showTeacherModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in" id="modal-teacher-profile">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-100 overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
            
            {/* Left Sidebar Panel - Profile Preview */}
            <div className="bg-slate-900 text-white p-6 md:w-1/3 flex flex-col items-center justify-between relative overflow-hidden shrink-0">
              <div className="absolute top-0 left-0 w-full h-full bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="w-full text-center space-y-4 relative z-10">
                <span className="text-[10px] bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Giáo Viên Tiểu Học
                </span>
                
                {/* Large Avatar container */}
                <div className="relative group inline-block mx-auto">
                  {teacherForm.avatar ? (
                    <img
                      src={teacherForm.avatar}
                      alt={user.name}
                      className="w-28 h-28 rounded-full object-cover border-4 border-slate-800 shadow-md ring-4 ring-indigo-500/20"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center text-white text-3xl font-bold ring-4 ring-indigo-500/10 mx-auto">
                      {user.name ? user.name.split(" ").pop()?.slice(0, 2).toUpperCase() : "GV"}
                    </div>
                  )}
                  {isEditingTeacher && (
                    <span className="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full shadow-lg border border-slate-800 cursor-pointer">
                      <Camera className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-lg tracking-tight">{user.name}</h4>
                  <p className="text-xs text-slate-400 font-medium">Lớp chủ nhiệm: {user.classCode}</p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-2 text-left text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  {user.dob && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{formatVietnameseDate(user.dob)}</span>
                    </div>
                  )}
                  {user.workplace && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="leading-relaxed">{user.workplace}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action tabs inside Left side */}
              <div className="w-full pt-6 border-t border-slate-800/50 mt-6 relative z-10">
                {!isEditingTeacher ? (
                  <button
                    onClick={() => setIsEditingTeacher(true)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm border-none"
                    id="btn-edit-teacher-trigger"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Cập nhật thông tin</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingTeacher(false)}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border-none"
                  >
                    <span>Quay lại xem hồ sơ</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Panel - Information Display or Editor form */}
            <div className="p-6 md:w-2/3 flex flex-col justify-between overflow-y-auto max-h-full">
              <div>
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <span>{isEditingTeacher ? "Cập nhật hồ sơ sư phạm" : "Hồ sơ sư phạm của thầy cô"}</span>
                  </h3>
                  <button
                    onClick={() => {
                      setShowTeacherModal(false);
                      setIsEditingTeacher(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer bg-slate-50 hover:bg-slate-100 p-1.5 rounded-full border-none transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Info details / Form wrapper */}
                {!isEditingTeacher ? (
                  <div className="space-y-5 pt-4 text-left">
                    {/* Bio intro */}
                    <div>
                      <h5 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-1.5">Giới thiệu bản thân</h5>
                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 border border-slate-100 p-3 rounded-xl italic">
                        {user.bio || "Thầy cô chưa viết giới thiệu cá nhân. Nhấp vào nút 'Cập nhật thông tin' ở bên trái để bổ sung thông tin giới thiệu sinh động."}
                      </p>
                    </div>

                    {/* Work details block */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 space-y-1.5">
                        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Họ và tên</span>
                        </h5>
                        <p className="text-xs text-slate-800 font-medium leading-relaxed">
                          {user.name || "Chưa cập nhật họ tên."}
                        </p>
                      </div>

                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 space-y-1.5">
                        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Email liên hệ</span>
                        </h5>
                        <p className="text-xs text-slate-800 font-medium leading-relaxed break-all">
                          {user.email || "Chưa cập nhật email."}
                        </p>
                      </div>

                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 space-y-1.5">
                        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Lớp chủ nhiệm</span>
                        </h5>
                        <p className="text-xs text-slate-800 font-medium leading-relaxed">
                          {user.classCode || "Chưa cập nhật lớp chủ nhiệm."}
                        </p>
                      </div>

                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 space-y-1.5">
                        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Số điện thoại</span>
                        </h5>
                        <p className="text-xs text-slate-800 font-medium leading-relaxed">
                          {user.phone || "Chưa cập nhật số điện thoại."}
                        </p>
                      </div>

                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 space-y-1.5">
                        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Ngày sinh</span>
                        </h5>
                        <p className="text-xs text-slate-800 font-medium leading-relaxed">
                          {formatVietnameseDate(user.dob)}
                        </p>
                      </div>

                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 space-y-1.5">
                        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Nơi công tác</span>
                        </h5>
                        <p className="text-xs text-slate-800 font-medium leading-relaxed">
                          {user.workplace || "Chưa cập nhật nơi công tác."}
                        </p>
                      </div>

                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 space-y-1.5">
                        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Kinh nghiệm giảng dạy</span>
                        </h5>
                        <p className="text-xs text-slate-800 font-medium leading-relaxed">
                          {user.experience || "Chưa cập nhật kinh nghiệm sư phạm."}
                        </p>
                      </div>

                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 space-y-1.5">
                        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Thành tích nổi bật</span>
                        </h5>
                        <p className="text-xs text-slate-800 font-medium leading-relaxed">
                          {user.achievements || "Chưa cập nhật thành tích giảng dạy nổi bật."}
                        </p>
                      </div>
                    </div>

                    {/* Institutional Details */}
                    <div className="border-t border-slate-100 pt-4 space-y-2 text-xs text-slate-600">
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="font-medium text-slate-400">Trường quản lý:</span>
                        <span className="font-semibold text-slate-800">{user.workplace || "Chưa cập nhật nơi công tác"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="font-medium text-slate-400">Trạng thái công tác:</span>
                        <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">Đang hoạt động</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="font-medium text-slate-400">Hệ thống phân quyền:</span>
                        <span className="font-semibold text-slate-800 capitalize">{user.role === "admin" ? "Quản trị cấp cao" : "Giáo viên chủ nhiệm"}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSaveTeacherProfile} className="space-y-4 pt-4 text-left">
                    {/* Choose Avatar Preset & Custom Upload */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Presets */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700">Chọn nhanh ảnh đại diện mẫu:</label>
                        <div className="flex flex-wrap gap-2.5">
                          {PRESET_AVATARS.map((av, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setTeacherForm({ ...teacherForm, avatar: av.url })}
                              className={`w-10 h-10 rounded-full border-2 overflow-hidden transition-all relative cursor-pointer ${
                                teacherForm.avatar === av.url ? "border-indigo-600 ring-2 ring-indigo-500/20 scale-105" : "border-slate-200 hover:border-slate-400"
                              }`}
                              title={av.name}
                            >
                              <img src={av.url} alt={av.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Right: Custom Upload with Drag and Drop */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700">Tải ảnh lên từ máy tính hoặc điện thoại:</label>
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => document.getElementById("avatar-file-input")?.click()}
                          className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1 min-h-[64px] ${
                            dragOver 
                              ? "border-indigo-500 bg-indigo-50/50" 
                              : "border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="file"
                            id="avatar-file-input"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-xs">
                            <Camera className="w-4 h-4" />
                            <span>Nhấn để chọn hoặc kéo thả ảnh vào đây</span>
                          </div>
                          <span className="text-[10px] text-slate-400 leading-tight">Hỗ trợ JPG, PNG, WEBP (Hệ thống tự tối ưu)</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name input */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">Họ và tên thầy cô:</label>
                        <input
                          type="text"
                          required
                          value={teacherForm.name}
                          onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                          id="edit-teacher-name"
                        />
                      </div>

                      {/* Email input */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">Email liên hệ / đăng nhập:</label>
                        <input
                          type="email"
                          required
                          value={teacherForm.email}
                          onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                          id="edit-teacher-email"
                        />
                      </div>

                      {/* Class code input */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">Lớp chủ nhiệm giảng dạy:</label>
                        <input
                          type="text"
                          required
                          placeholder="Ví dụ: 4A, 2B..."
                          value={teacherForm.classCode}
                          onChange={(e) => setTeacherForm({ ...teacherForm, classCode: e.target.value.toUpperCase() })}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 font-bold"
                          id="edit-teacher-class-code"
                        />
                      </div>

                      {/* Phone input */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">Số điện thoại liên hệ:</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: 0912345678"
                          value={teacherForm.phone}
                          onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">Ngày sinh:</label>
                        <input
                          type="date"
                          value={teacherForm.dob}
                          onChange={(e) => setTeacherForm({ ...teacherForm, dob: e.target.value })}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">Nơi công tác:</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: Trường Tiểu học Nguyễn Du"
                          value={teacherForm.workplace}
                          onChange={(e) => setTeacherForm({ ...teacherForm, workplace: e.target.value })}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                        />
                      </div>

                      {/* Experience edit */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">Kinh nghiệm giảng dạy:</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: 10 năm công tác tại các trường Tiểu học..."
                          value={teacherForm.experience}
                          onChange={(e) => setTeacherForm({ ...teacherForm, experience: e.target.value })}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Custom Avatar URL */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">Hoặc đường dẫn ảnh chân dung (URL):</label>
                      <input
                        type="url"
                        placeholder="Có thể để trống hoặc dán liên kết ảnh https://..."
                        value={teacherForm.avatar}
                        onChange={(e) => setTeacherForm({ ...teacherForm, avatar: e.target.value })}
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 font-mono"
                      />
                    </div>

                    {/* Bio intro edit */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">Lời giới thiệu bản thân:</label>
                      <textarea
                        rows={2}
                        placeholder="Hãy chia sẻ ngắn gọn về bản thân, phương châm giáo dục yêu thích của thầy cô..."
                        value={teacherForm.bio}
                        onChange={(e) => setTeacherForm({ ...teacherForm, bio: e.target.value })}
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 leading-relaxed"
                      />
                    </div>

                    {/* Achievements edit */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">Thành tích giảng dạy nổi bật:</label>
                      <textarea
                        rows={2}
                        placeholder="Ví dụ: Đạt danh hiệu Giáo viên dạy giỏi cấp Tỉnh năm 2024; Chiến sĩ thi đua cấp cơ sở năm 2025; Bằng khen sáng kiến sư phạm sáng tạo."
                        value={teacherForm.achievements}
                        onChange={(e) => setTeacherForm({ ...teacherForm, achievements: e.target.value })}
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                      />
                    </div>

                    {saveProfileStatus === "error" && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex gap-2 items-center">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{saveProfileError}</span>
                      </div>
                    )}

                    {saveProfileStatus === "success" && (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs flex gap-2 items-center">
                        <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span>Đã lưu các thay đổi hồ sơ thành công!</span>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsEditingTeacher(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border-none"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        disabled={saveProfileStatus === "saving"}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50 border-none flex items-center gap-1.5"
                        id="btn-save-teacher-profile"
                      >
                        {saveProfileStatus === "saving" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Lưu thay đổi</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
