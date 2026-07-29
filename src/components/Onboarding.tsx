/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { apiFetch } from "../utils/api";
import { 
  User, 
  Users, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Camera, 
  Trash2, 
  Plus, 
  Loader2, 
  Sparkles, 
  Smile, 
  School,
  Phone,
  Calendar,
  AlertCircle,
  Briefcase,
  GraduationCap,
  ShieldCheck
} from "lucide-react";

interface OnboardingProps {
  user: any;
  onOnboardingComplete: (updatedUser: any) => void;
}

const PRESET_AVATARS = [
  { name: "Cô giáo hiền dịu", url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80" },
  { name: "Thầy giáo trẻ trung", url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" },
  { name: "Cô giáo năng động", url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80" },
  { name: "Thầy giáo trung niên", url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80" },
  { name: "Cô giáo sáng tạo", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" }
];

const SAMPLE_STUDENTS = [
  { name: "Nguyễn Minh Khang", gender: "Nam" as const, dob: "2016-04-12", fatherName: "Nguyễn Minh Tuấn", fatherPhone: "0912345678", motherName: "Lê Thanh Hương", motherPhone: "0912345679" },
  { name: "Lê Mai Chi", gender: "Nữ" as const, dob: "2016-11-23", fatherName: "Lê Anh Tuấn", fatherPhone: "0987654320", motherName: "Trần Thị Mai", motherPhone: "0987654321" },
  { name: "Phạm Hoàng Nam", gender: "Nam" as const, dob: "2016-08-05", fatherName: "Phạm Hoàng Long", fatherPhone: "0905556677", motherName: "Nguyễn Thu Thủy", motherPhone: "0905556678" },
  { name: "Trần Ngọc Linh", gender: "Nữ" as const, dob: "2016-02-14", fatherName: "Trần Đức Hải", fatherPhone: "0977888998", motherName: "Vũ Thu Hà", motherPhone: "0977888999" },
  { name: "Đỗ Bảo Lâm", gender: "Nam" as const, dob: "2016-09-30", fatherName: "Đỗ Trung Kiên", fatherPhone: "0944112233", motherName: "Phạm Hồng Ngọc", motherPhone: "0944112234" }
];

export default function Onboarding({ user, onOnboardingComplete }: OnboardingProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Teacher Form States
  const [teacherName, setTeacherName] = useState(user?.name || "");
  const [teacherPhone, setTeacherPhone] = useState(user?.phone || "");
  const [teacherClassCode, setTeacherClassCode] = useState(user?.classCode || "4A");
  const [teacherExperience, setTeacherExperience] = useState(user?.experience || "");
  const [teacherAchievements, setTeacherAchievements] = useState(user?.achievements || "");
  const [teacherBio, setTeacherBio] = useState(user?.bio || "");
  const [teacherDob, setTeacherDob] = useState(user?.dob || "");
  const [teacherWorkplace, setTeacherWorkplace] = useState(user?.workplace || "");
  const [teacherAvatar, setTeacherAvatar] = useState(user?.avatar || PRESET_AVATARS[0].url);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const excelInputRef = useRef<HTMLInputElement | null>(null);

  // Step 2: Students List State
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [excelImportStatus, setExcelImportStatus] = useState<string | null>(null);
  
  // Student Input States
  const [studentName, setStudentName] = useState("");
  const [studentGender, setStudentGender] = useState<"Nam" | "Nữ">("Nam");
  const [studentDob, setStudentDob] = useState("2016-01-01");
  const [fatherName, setFatherName] = useState("");
  const [fatherPhone, setFatherPhone] = useState("");
  const [motherName, setMotherName] = useState("");
  const [motherPhone, setMotherPhone] = useState("");

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim()) {
      setErrorMessage("Vui lòng điền họ tên của thầy cô.");
      return;
    }
    if (!teacherClassCode.trim()) {
      setErrorMessage("Vui lòng nhập lớp chủ nhiệm của thầy cô.");
      return;
    }
    setErrorMessage(null);
    setStep(2);
  };

  const handlePrevStep = () => {
    setStep(1);
    setErrorMessage(null);
  };

  const processAvatarFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Vui lòng chọn tệp hình ảnh hợp lệ để làm ảnh đại diện.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
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
        } else if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          setErrorMessage("Không thể xử lý ảnh đại diện. Vui lòng thử lại.");
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.85);
        setTeacherAvatar(compressedBase64);
        setErrorMessage(null);
      };

      img.onerror = () => {
        setErrorMessage("Không thể đọc tệp ảnh đã chọn.");
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      setErrorMessage("Không thể tải ảnh từ máy tính.");
    };

    reader.readAsDataURL(file);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAvatarFile(file);
    }
    e.target.value = "";
  };

  const normalizeExcelHeader = (value: unknown) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "");

  const normalizeGender = (value: unknown): "Nam" | "Nữ" => {
    const normalized = String(value || "").trim().toLowerCase();
    if (["nu", "nữ", "female", "girl", "gai"].includes(normalized)) {
      return "Nữ";
    }
    return "Nam";
  };

  const normalizePhone = (value: unknown) =>
    String(value || "")
      .trim()
      .replace(/\s+/g, "")
      .replace(/[^\d+]/g, "");

  const excelDateToIso = (value: unknown) => {
    if (typeof value === "number") {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) {
        const year = String(parsed.y).padStart(4, "0");
        const month = String(parsed.m).padStart(2, "0");
        const day = String(parsed.d).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }

    const raw = String(value || "").trim();
    if (!raw) return "2016-01-01";

    const slashMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (slashMatch) {
      const [, d, m, y] = slashMatch;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    const parsedDate = new Date(raw);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().slice(0, 10);
    }

    return "2016-01-01";
  };

  const mapImportedStudentRow = (row: Record<string, unknown>) => {
    const normalizedRow = Object.fromEntries(
      Object.entries(row).map(([key, value]) => [normalizeExcelHeader(key), value])
    );

    const name = String(
      normalizedRow.hovaten ||
      normalizedRow.tenhocinh ||
      normalizedRow.hoten ||
      normalizedRow.hocsinh ||
      normalizedRow.fullname ||
      normalizedRow.name ||
      ""
    ).trim();

    const father = String(
      normalizedRow.hotenbo ||
      normalizedRow.tenbo ||
      normalizedRow.phuhuynhbo ||
      normalizedRow.bohoten ||
      normalizedRow.fathername ||
      ""
    ).trim();

    const mother = String(
      normalizedRow.hotenme ||
      normalizedRow.tenme ||
      normalizedRow.phuhuynhme ||
      normalizedRow.mehoten ||
      normalizedRow.mothername ||
      ""
    ).trim();

    const fatherPhoneValue =
      normalizedRow.sdtbo ||
      normalizedRow.dienthoaibo ||
      normalizedRow.sodienthoaibo ||
      normalizedRow.fatherphone ||
      "";

    const motherPhoneValue =
      normalizedRow.sdtme ||
      normalizedRow.dienthoaime ||
      normalizedRow.sodienthoaime ||
      normalizedRow.motherphone ||
      "";

    const sharedParentName = String(
      normalizedRow.phuhuynh ||
      normalizedRow.hotendailienhe ||
      normalizedRow.tenphuhuynh ||
      ""
    ).trim();

    const sharedPhoneValue =
      normalizedRow.sdt ||
      normalizedRow.sodienthoai ||
      normalizedRow.dienthoai ||
      normalizedRow.lienhe ||
      normalizedRow.phone ||
      "";

    const fatherPhoneNormalized = normalizePhone(fatherPhoneValue);
    const motherPhoneNormalized = normalizePhone(motherPhoneValue);
    const sharedPhoneNormalized = normalizePhone(sharedPhoneValue);
    const primaryPhone = fatherPhoneNormalized || motherPhoneNormalized || sharedPhoneNormalized;

    if (!name || !primaryPhone) {
      return null;
    }

    return {
      name,
      gender: normalizeGender(
        normalizedRow.gioitinh || normalizedRow.gender || normalizedRow.sex || "Nam"
      ),
      dob: excelDateToIso(
        normalizedRow.ngaysinh || normalizedRow.namsinh || normalizedRow.dob || normalizedRow.birthday
      ),
      phone: primaryPhone,
      fatherName: father || (!mother ? sharedParentName : ""),
      fatherPhone: fatherPhoneNormalized || (!motherPhoneNormalized ? sharedPhoneNormalized : ""),
      motherName: mother,
      motherPhone: motherPhoneNormalized,
      schoolGrade: parseInt(teacherClassCode) || 4,
      schoolClass: teacherClassCode.toUpperCase().trim()
    };
  };

  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const validFile = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");
    if (!validFile) {
      setErrorMessage("Vui lòng chọn tệp Excel hợp lệ (.xlsx hoặc .xls).");
      setExcelImportStatus(null);
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error("Tệp Excel không chứa sheet dữ liệu.");
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: ""
      });

      if (!rows.length) {
        throw new Error("Tệp Excel chưa có dòng dữ liệu học sinh.");
      }

      const importedStudents = rows
        .map(mapImportedStudentRow)
        .filter((student): student is NonNullable<typeof student> => Boolean(student));

      if (!importedStudents.length) {
        throw new Error(
          "Không đọc được học sinh hợp lệ. Cần tối thiểu cột Họ và tên + một số điện thoại liên hệ."
        );
      }

      setStudentsList((prev) => {
        const merged = [...prev];
        let skipped = 0;

        importedStudents.forEach((student) => {
          const exists = merged.some(
            (item) =>
              item.name.trim().toLowerCase() === student.name.trim().toLowerCase() &&
              item.dob === student.dob
          );

          if (exists) {
            skipped += 1;
            return;
          }

          merged.push(student);
        });

        const added = importedStudents.length - skipped;
        setExcelImportStatus(
          skipped > 0
            ? `Đã nhập ${added} học sinh từ Excel, bỏ qua ${skipped} dòng trùng tên + ngày sinh.`
            : `Đã nhập thành công ${added} học sinh từ tệp Excel.`
        );

        return merged;
      });

      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể đọc tệp Excel. Vui lòng kiểm tra lại định dạng.");
      setExcelImportStatus(null);
    }
  };

  // Add a single student manually
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setErrorMessage("Vui lòng điền họ tên học sinh.");
      return;
    }
    
    const contactPhone = fatherPhone.trim() || motherPhone.trim();
    if (!contactPhone) {
      setErrorMessage("Vui lòng nhập ít nhất một số điện thoại liên lạc của phụ huynh (bố hoặc mẹ).");
      return;
    }

    const newStudent = {
      name: studentName.trim(),
      gender: studentGender,
      dob: studentDob,
      phone: contactPhone,
      fatherName: fatherName.trim(),
      fatherPhone: fatherPhone.trim(),
      motherName: motherName.trim(),
      motherPhone: motherPhone.trim(),
      schoolGrade: parseInt(teacherClassCode) || 4,
      schoolClass: teacherClassCode.toUpperCase().trim()
    };

    setStudentsList([...studentsList, newStudent]);
    setExcelImportStatus(null);
    
    // Clear inputs
    setStudentName("");
    setFatherName("");
    setFatherPhone("");
    setMotherName("");
    setMotherPhone("");
    setErrorMessage(null);
  };

  // Quick fill sample students
  const handleLoadSampleStudents = () => {
    const updated = SAMPLE_STUDENTS.map(s => ({
      ...s,
      schoolGrade: parseInt(teacherClassCode) || 4,
      schoolClass: teacherClassCode.toUpperCase().trim()
    }));
    setStudentsList(updated);
    setExcelImportStatus("Đã nạp sẵn 5 học sinh mẫu để thầy cô trải nghiệm nhanh.");
    setErrorMessage(null);
  };

  const handleRemoveStudent = (index: number) => {
    setStudentsList(studentsList.filter((_, i) => i !== index));
    setExcelImportStatus(null);
  };

  // Submit everything to server
  const handleCompleteOnboarding = async () => {
    if (studentsList.length === 0) {
      setErrorMessage("Vui lòng thêm ít nhất một học sinh vào lớp học để tiếp tục.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // 1. Update Teacher Profile on backend with hasCompletedOnboarding = true
      const profileResp = await apiFetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: teacherName,
            classCode: teacherClassCode,
            avatar: teacherAvatar,
            phone: teacherPhone,
            experience: teacherExperience,
            achievements: teacherAchievements,
            bio: teacherBio,
            dob: teacherDob,
            workplace: teacherWorkplace,
            hasCompletedOnboarding: true
          })
      });

      if (!profileResp.ok) {
        const errData = await profileResp.json();
        throw new Error(errData.error || "Không thể cập nhật hồ sơ sư phạm.");
      }

      const profileData = await profileResp.json();
      const updatedUser = profileData.user;
      const newToken = profileData.token;

      // Save token back to local storage to sync
      if (newToken) {
        localStorage.setItem("auth_token", newToken);
      }

      // 2. Add students in bulk
      const studentResp = await apiFetch("/api/students/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentsList)
      });

      if (!studentResp.ok) {
        const errData = await studentResp.json();
        throw new Error(errData.error || "Không thể khởi tạo danh sách học sinh.");
      }

      // 3. Complete onboarding
      onOnboardingComplete(updatedUser);

    } catch (err: any) {
      setErrorMessage(err.message || "Đã xảy ra lỗi trong quá trình khởi tạo lớp học.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900/95 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 font-sans antialiased text-slate-800">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col md:flex-row min-h-[600px] animate-in fade-in zoom-in-95 duration-300">
        
        {/* Left Intro Banner */}
        <div className="bg-slate-900 text-white p-8 md:w-1/3 flex flex-col justify-between relative overflow-hidden shrink-0">
          <div className="absolute top-0 left-0 w-full h-full bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-6 relative z-10">
            <div className="inline-block bg-indigo-600/30 border border-indigo-500/30 text-indigo-400 font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-wider">
              Thiết lập ban đầu
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight leading-none text-white">EduAI Chào Thầy Cô! 👋</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Để tối ưu hóa trải nghiệm trợ lý sư phạm và cá nhân hóa sổ học bạ, thầy cô vui lòng hoàn thành 2 bước thiết lập nhanh sau đây.
              </p>
            </div>

            {/* Stepper Steps UI */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                  step === 1 
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                    : "bg-emerald-600 border-emerald-600 text-white"
                }`}>
                  {step > 1 ? <Check className="w-4 h-4" /> : "1"}
                </div>
                <div>
                  <h4 className={`text-xs font-bold leading-none ${step === 1 ? "text-white" : "text-emerald-400"}`}>
                    Hồ Sơ Giáo Viên
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Thông tin sư phạm cá nhân</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                  step === 2 
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                    : "bg-slate-800 border-slate-700 text-slate-400"
                }`}>
                  2
                </div>
                <div>
                  <h4 className={`text-xs font-bold leading-none ${step === 2 ? "text-white" : "text-slate-400"}`}>
                    Danh Sách Lớp
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Thêm học sinh để làm bạ</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800/80 text-[10px] text-slate-500 leading-relaxed relative z-10">
            <span>© 2026 EduAI – Công nghệ trí tuệ nhân tạo đồng hành cùng nhà giáo Việt Nam.</span>
          </div>
        </div>

        {/* Right Main Content Panel */}
        <div className="p-6 md:p-8 flex-1 flex flex-col justify-between overflow-y-auto max-h-[85vh] md:max-h-[680px]">
          <div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base uppercase tracking-wide">
                {step === 1 ? (
                  <>
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <span>BƯỚC 1: THIẾT LẬP HỒ SƠ SƯ PHẠM</span>
                  </>
                ) : (
                  <>
                    <Users className="w-5 h-5 text-indigo-600" />
                    <span>BƯỚC 2: KHỞI TẠO LỚP HỌC CHỦ NHIỆM</span>
                  </>
                )}
              </h3>
            </div>

            {errorMessage && (
              <div className="mt-4 bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-xl text-xs flex gap-2 items-center">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* STEP 1: TEACHER PROFILE SETUP FORM */}
            {step === 1 && (
              <form onSubmit={handleNextStep} className="space-y-4 pt-4 text-left">
                {/* Choose Avatar Preset */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700">Chọn hình đại diện của thầy cô:</label>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {PRESET_AVATARS.map((av, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setTeacherAvatar(av.url)}
                        className={`w-12 h-12 rounded-full border-2 overflow-hidden transition-all relative cursor-pointer ${
                          teacherAvatar === av.url ? "border-indigo-600 ring-2 ring-indigo-500/20 scale-105" : "border-slate-200 hover:border-slate-400"
                        }`}
                        title={av.name}
                      >
                        <img src={av.url} alt={av.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="h-12 px-3 rounded-full border border-dashed border-indigo-300 bg-indigo-50 text-indigo-700 text-[11px] font-bold hover:bg-indigo-100 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Tải ảnh từ máy</span>
                    </button>
                  </div>

                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />

                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <img
                      src={teacherAvatar}
                      alt="Ảnh đại diện giáo viên"
                      className="w-14 h-14 rounded-full object-cover border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800">Ảnh đại diện hiện tại</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed truncate">
                        {teacherAvatar.startsWith("data:") ? "Ảnh tải lên từ máy tính đã sẵn sàng sử dụng." : "Đang sử dụng ảnh mẫu có sẵn."}
                      </p>
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
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                      placeholder="Ví dụ: Cô Trịnh Thị Lan Anh"
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                    />
                  </div>

                  {/* Class code input */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Lớp chủ nhiệm chủ quản:</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: 4A, 3B, 5C..."
                      value={teacherClassCode}
                      onChange={(e) => setTeacherClassCode(e.target.value.toUpperCase().trim())}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-850 font-bold"
                    />
                  </div>

                  {/* Phone input */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Số điện thoại liên hệ:</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: 0912345678"
                      value={teacherPhone}
                      onChange={(e) => setTeacherPhone(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 font-mono"
                    />
                  </div>

                  {/* Experience edit */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Kinh nghiệm giảng dạy:</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: 5 năm giảng dạy, Giáo viên dạy giỏi cấp trường"
                      value={teacherExperience}
                      onChange={(e) => setTeacherExperience(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Ngày tháng năm sinh:</label>
                    <input
                      type="date"
                      value={teacherDob}
                      onChange={(e) => setTeacherDob(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Nơi công tác:</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Trường Tiểu học Nguyễn Du"
                      value={teacherWorkplace}
                      onChange={(e) => setTeacherWorkplace(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                    />
                  </div>
                </div>

                {/* Bio intro edit */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Giới thiệu ngắn về thầy cô:</label>
                  <textarea
                    rows={2}
                    placeholder="Hãy viết vài dòng gửi học sinh và phụ huynh. Ví dụ: Luôn tận tâm vì sự phát triển toàn diện của các con học sinh yêu quý..."
                    value={teacherBio}
                    onChange={(e) => setTeacherBio(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                  />
                </div>

                {/* Achievements edit */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Thành tích nổi bật:</label>
                  <textarea
                    rows={2}
                    placeholder="Ví dụ: Đạt Sáng kiến kinh nghiệm sư phạm cấp quận năm 2025; Giáo viên dạy giỏi cấp Tỉnh..."
                    value={teacherAchievements}
                    onChange={(e) => setTeacherAchievements(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                  />
                </div>

                {/* Actions bottom */}
                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-2 border-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <span>Tiếp tục thiết lập học sinh</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: STUDENTS SETUP FORM */}
            {step === 2 && (
              <div className="space-y-5 pt-4 text-left">
                {/* Auto initialization button */}
                <div className="bg-indigo-50 border border-indigo-150 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
                      <span>Thử nghiệm nhanh cùng học sinh mẫu?</span>
                    </h5>
                    <p className="text-[11px] text-indigo-700 leading-relaxed max-w-xl">
                      Để không phải nhập từng em học sinh, thầy cô có thể điền tự động danh sách gồm <strong>5 em học sinh mẫu chuẩn Thông tư 27</strong> (mã điểm số, tính cách đầy đủ) cực kỳ chân thực.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadSampleStudents}
                    className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all border-none shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <Smile className="w-4 h-4" />
                    <span>Tự động điền 5 em</span>
                  </button>
                </div>

                {/* Excel bulk import */}
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
                        <School className="w-4 h-4 text-emerald-600" />
                        <span>Nhập danh sách hàng loạt từ Excel</span>
                      </h4>
                      <p className="text-[11px] text-emerald-800 leading-relaxed max-w-2xl">
                        Hỗ trợ các cột phổ biến như: <strong>Họ và tên</strong>, <strong>Giới tính</strong>, <strong>Ngày sinh</strong>, 
                        <strong> Phụ huynh</strong>, <strong>SĐT</strong>, hoặc tách riêng <strong>Họ tên bố / SĐT bố / Họ tên mẹ / SĐT mẹ</strong>.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => excelInputRef.current?.click()}
                      className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border-none shadow-sm cursor-pointer"
                    >
                      Chọn file Excel
                    </button>
                  </div>

                  <input
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={handleExcelFileChange}
                    className="hidden"
                  />

                  <div className="rounded-xl border border-emerald-100 bg-white/80 p-3 text-[11px] text-slate-600 leading-relaxed">
                    <p className="font-bold text-slate-800 mb-1">Mẫu cột khuyến nghị:</p>
                    <p>Họ và tên | Giới tính | Ngày sinh | Phụ huynh | SĐT</p>
                    <p>hoặc</p>
                    <p>Họ và tên | Giới tính | Ngày sinh | Họ tên bố | SĐT bố | Họ tên mẹ | SĐT mẹ</p>
                  </div>

                  {excelImportStatus && (
                    <div className="bg-emerald-100/70 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-xs">
                      {excelImportStatus}
                    </div>
                  )}
                </div>

                {/* Add new student sub form */}
                <form onSubmit={handleAddStudent} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                    <Plus className="w-4 h-4 text-indigo-600" />
                    <span>Thêm học sinh thủ công</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-600">Họ và tên con:</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Lê Tuấn Nghĩa"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-600">Giới tính:</label>
                      <select
                        value={studentGender}
                        onChange={(e) => setStudentGender(e.target.value as "Nam" | "Nữ")}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-600">Ngày sinh:</label>
                      <input
                        type="date"
                        value={studentDob}
                        onChange={(e) => setStudentDob(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                    <div className="space-y-1 col-span-1 sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600">Họ tên Phụ huynh (Bố/Mẹ):</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Bố Lê Đình Minh"
                        value={fatherName || motherName}
                        onChange={(e) => {
                          setFatherName(e.target.value);
                          setMotherName("");
                        }}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="space-y-1 col-span-1 sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600">Số điện thoại liên lạc:</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: 0912345678"
                        value={fatherPhone || motherPhone}
                        onChange={(e) => {
                          setFatherPhone(e.target.value);
                          setMotherPhone(e.target.value);
                        }}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border-none flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm vào lớp</span>
                    </button>
                  </div>
                </form>

                {/* Display current class list */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 flex justify-between items-center">
                    <span>DANH SÁCH LỚP CHỦ NHIỆM {teacherClassCode} ({studentsList.length} học sinh)</span>
                    {studentsList.length > 0 && (
                      <button 
                        onClick={() => {
                          setStudentsList([]);
                          setExcelImportStatus(null);
                        }}
                        className="text-[10px] text-rose-600 hover:text-rose-700 cursor-pointer font-bold bg-transparent border-none"
                      >
                        Xóa tất cả
                      </button>
                    )}
                  </h4>

                  {studentsList.length === 0 ? (
                    <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-400 bg-slate-50/30">
                      Chưa có học sinh nào. Thầy cô vui lòng click nút "Tự động điền 5 em" hoặc nhập tay học sinh ở trên.
                    </div>
                  ) : (
                    <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-xs max-h-[180px] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0">
                          <tr>
                            <th className="px-4 py-2.5">Học sinh</th>
                            <th className="px-3 py-2.5">Giới tính</th>
                            <th className="px-3 py-2.5">Ngày sinh</th>
                            <th className="px-3 py-2.5">Liên hệ phụ huynh</th>
                            <th className="px-3 py-2.5 text-center">Hành động</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 bg-white">
                          {studentsList.map((st, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-2 font-bold text-slate-800">{st.name}</td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  st.gender === "Nữ" ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                                }`}>
                                  {st.gender}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">{st.dob}</td>
                              <td className="px-3 py-2">
                                <span className="block font-medium text-slate-700">{st.fatherName || st.motherName || "Chưa nhập"}</span>
                                <span className="block text-[10px] text-slate-400 font-mono">{st.phone}</span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStudent(idx)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer bg-transparent border-none"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {errorMessage && (
                  <div className="mt-4 bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-xl text-xs flex gap-2 items-center">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Actions Bottom */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    disabled={isSaving}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border-none disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay lại hồ sơ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCompleteOnboarding}
                    disabled={isSaving || studentsList.length === 0}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-600/10 flex items-center gap-2 border-none disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang khởi tạo hệ thống...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Hoàn tất & Vào giao diện chính</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
