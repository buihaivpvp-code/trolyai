/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { Student } from "../types";
import { apiFetch } from "../utils/api";
import AcademicChart from "./AcademicChart";
import { 
  UserPlus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Phone, 
  Calendar, 
  Users, 
  Sparkles, 
  Clipboard, 
  Download, 
  Check, 
  AlertCircle,
  FileSpreadsheet,
  LineChart,
  Award,
  BookOpen,
  Plus,
  PlusCircle,
  XCircle,
  Camera,
  Upload
} from "lucide-react";

interface StudentManagerProps {
  user?: any;
  onStudentsChanged?: () => void;
  onSelectForRemark?: (student: Student) => void;
  onSelectForParent?: (student: Student) => void;
  onSelectForForecast?: (student: Student) => void;
}

export default function StudentManager({ 
  user,
  onStudentsChanged,
  onSelectForRemark,
  onSelectForParent,
  onSelectForForecast
}: StudentManagerProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"name" | "rank">("name");

  // States for student details modal (3 modules)
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"info" | "grades" | "conduct" | "diary">("info");
  const [isSavingDetail, setIsSavingDetail] = useState(false);
  const [newActivity, setNewActivity] = useState("");

  // Helper to ensure realistic monthly grades and conduct evaluation are populated if missing
  const ensureStudentDetailFields = (student: Student): Student => {
    const updated = { ...student };
    const originalStudentIds = ["std-1", "std-2", "std-3", "std-4", "std-5"];
    const isOriginal = originalStudentIds.includes(student.id);
    
    if (!updated.monthlyGradesList || updated.monthlyGradesList.length === 0) {
      if (isOriginal) {
        // Generate deterministic mock grades based on student ID to make it realistic
        const seed = student.id.charCodeAt(student.id.length - 1) || 5;
        const baseGrades: { [subject: string]: number } = {
          "Toán": 7 + (seed % 4),
          "Tiếng Việt": 8 + (seed % 3),
          "Tiếng Anh": 6 + (seed % 5),
          "Khoa học": 7 + ((seed + 2) % 4),
          "Lịch sử & Địa lý": 7 + ((seed + 1) % 4),
        };

        const months = ["Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12", "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5"];
        
        updated.monthlyGradesList = Object.keys(baseGrades).map(sub => {
          const base = baseGrades[sub];
          const monthlyGrades: { [month: string]: number } = {};
          let total = 0;
          
          months.forEach((m, idx) => {
            // Vary slightly month to month
            const variance = Math.sin(seed + idx) * 0.8;
            const score = Math.min(10, Math.max(4, Math.round((base + variance) * 10) / 10));
            monthlyGrades[m] = score;
            total += score;
          });
          
          const yearlySummary = Math.round((total / months.length) * 10) / 10;
          
          return {
            subject: sub,
            monthlyGrades,
            yearlySummary
          };
        });
      } else {
        // Newly added student: Keep empty grades
        const baseGrades = ["Toán", "Tiếng Việt", "Tiếng Anh", "Khoa học", "Lịch sử & Địa lý"];
        updated.monthlyGradesList = baseGrades.map(sub => ({
          subject: sub,
          monthlyGrades: {},
          yearlySummary: 0
        }));
      }
    }

    if (!updated.conductEvaluation) {
      if (isOriginal) {
        const seed = student.id.charCodeAt(student.id.length - 1) || 5;
        const conducts: Array<"Tốt" | "Khá" | "Trung bình"> = ["Tốt", "Khá", "Trung bình"];
        const conduct = conducts[seed % 2]; // realistic bias to Tot or Kha
        
        const assessments = [
          "Học sinh ngoan ngoãn, có tinh thần tự giác cao, tích cực tham gia các hoạt động tập thể.",
          "Có ý thức kỷ luật tốt, lễ phép với thầy cô, hòa đồng với bạn bè, tích cực phát biểu phát biểu xây dựng bài.",
          "Chăm chỉ học tập, ngoan ngoãn, lễ phép và luôn tích cực giúp đỡ các bạn xung quanh.",
          "Nhiệt tình tham gia phong trào của lớp, ý thức tự giác cao, có nhiều tiến bộ trong học kỳ này."
        ];
        const teacherAssessment = assessments[seed % assessments.length];

        const activitiesList = [
          ["Tham gia Đội kịch trường", "Hội khỏe Phù Đổng cấp trường", "Ngày hội STEM"],
          ["Ban cán sự lớp gương mẫu", "Giải Nhất kể chuyện cấp trường", "Câu lạc bộ Âm nhạc"],
          ["Ủy viên ban chấp hành Chi đội", "Giải Ba vẽ tranh bảo vệ môi trường", "Hội thao trường"],
          ["Đội Sao đỏ tích cực", "Câu lạc bộ bóng đá", "Chiến dịch kế hoạch nhỏ"]
        ];
        const extraCurricularActivities = activitiesList[seed % activitiesList.length];

        updated.conductEvaluation = {
          conduct,
          teacherAssessment,
          extraCurricularActivities
        };
      } else {
        // Newly added student: Keep conduct empty/blank
        updated.conductEvaluation = {
          conduct: "" as any,
          teacherAssessment: "",
          extraCurricularActivities: []
        };
      }
    }

    return updated;
  };

  // Helper to extract last word (Vietnamese first name) for alphabetical sorting
  const getSortableName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) return "";
    const firstName = parts[parts.length - 1]; // last word
    const restOfName = parts.slice(0, parts.length - 1).join(" ");
    return `${firstName} ${restOfName}`;
  };

  // Pre-calculate GPA and classification for each student
  const studentsWithStats = students.map(student => {
    const fullStudent = ensureStudentDetailFields(student);
    const gradesList = fullStudent.monthlyGradesList || [];
    
    // Check if there are any actual scores (> 0) in the grades list
    const hasAnyGrades = gradesList.some(item => 
      Object.values(item.monthlyGrades).some(g => g !== undefined && g > 0)
    );

    const sumYearly = gradesList.reduce((sum, item) => sum + (item.yearlySummary || 0), 0);
    const gpa = hasAnyGrades && gradesList.length > 0 
      ? Math.round((sumYearly / gradesList.length) * 10) / 10 
      : 0;

    let classification = "—";
    if (hasAnyGrades) {
      if (gpa >= 9.0) classification = "Xuất sắc";
      else if (gpa >= 8.0) classification = "Giỏi";
      else if (gpa >= 6.5) classification = "Khá";
      else if (gpa >= 5.0) classification = "Trung bình";
      else classification = "Yếu";
    }

    return {
      ...student,
      gpa: hasAnyGrades ? gpa : null,
      classification
    };
  });

  // Calculate ranks based on GPA descending
  const rankedAll = [...studentsWithStats].sort((a, b) => (b.gpa || 0) - (a.gpa || 0));
  const rankMap: { [id: string]: number } = {};
  let currentRank = 1;
  for (let i = 0; i < rankedAll.length; i++) {
    const prevGpa = i > 0 ? (rankedAll[i - 1].gpa || 0) : 0;
    const currGpa = rankedAll[i].gpa || 0;
    if (i > 0 && currGpa < prevGpa) {
      currentRank = i + 1;
    }
    rankMap[rankedAll[i].id] = currentRank;
  }

  // Sort based on the active preference
  const sortedStudents = [...studentsWithStats].sort((a, b) => {
    if (sortBy === "rank") {
      const gpaA = a.gpa || 0;
      const gpaB = b.gpa || 0;
      if (gpaB !== gpaA) {
        return gpaB - gpaA;
      }
    }
    const nameA = getSortableName(a.name);
    const nameB = getSortableName(b.name);
    return nameA.localeCompare(nameB, "vi", { sensitivity: "base" });
  });
  
  // Single student form states
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"Nam" | "Nữ">("Nam");
  const [dob, setDob] = useState("2016-01-01");
  const [phone, setPhone] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [fatherPhone, setFatherPhone] = useState("");
  const [motherName, setMotherName] = useState("");
  const [motherPhone, setMotherPhone] = useState("");
  const [schoolClass, setSchoolClass] = useState("4A");
  const [schoolGrade, setSchoolGrade] = useState(4);
  const [avatar, setAvatar] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editGender, setEditGender] = useState<"Nam" | "Nữ">("Nam");
  const [editDob, setEditDob] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editFatherName, setEditFatherName] = useState("");
  const [editFatherPhone, setEditFatherPhone] = useState("");
  const [editMotherName, setEditMotherName] = useState("");
  const [editMotherPhone, setEditMotherPhone] = useState("");
  const [editClass, setEditClass] = useState("");

  // Bulk import states
  const [bulkText, setBulkText] = useState("");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState("");
  const [importMode, setImportMode] = useState<"file" | "sheet" | "paste">("file");
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");

  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Custom dialog confirmation state to bypass iframe window.confirm restriction
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchStudents();
    if (user && user.classCode) {
      setSchoolClass(user.classCode);
      const gradeNum = parseInt(user.classCode) || 4;
      setSchoolGrade(gradeNum);
    }
  }, [user]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const resp = await apiFetch("/api/students");
      if (resp.ok) {
        const data = await resp.json();
        setStudents(data);
      }
    } catch (e) {
      console.error("Lỗi lấy danh sách học sinh: ", e);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showNotification("Vui lòng điền họ tên học sinh", "error");
      return;
    }
    const finalPhone = phone.trim() || fatherPhone.trim() || motherPhone.trim();
    if (!finalPhone) {
      showNotification("Vui lòng điền ít nhất một số điện thoại liên lạc của bố hoặc mẹ", "error");
      return;
    }

    try {
      const resp = await apiFetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          gender,
          dob,
          phone: finalPhone,
          fatherName,
          fatherPhone,
          motherName,
          motherPhone,
          schoolGrade,
          schoolClass,
          avatar: avatar.trim() || undefined
        })
      });

      if (resp.ok) {
        showNotification(`Đã thêm học sinh ${name} vào danh sách lớp!`);
        setName("");
        setPhone("");
        setFatherName("");
        setFatherPhone("");
        setMotherName("");
        setMotherPhone("");
        setDob("2016-01-01");
        setGender("Nam");
        fetchStudents();
        if (onStudentsChanged) onStudentsChanged();
      } else {
        const err = await resp.json();
        showNotification(err.error || "Lỗi thêm học sinh", "error");
      }
    } catch (e) {
      showNotification("Lỗi kết nối máy chủ", "error");
    }
  };

  const handleStartEdit = (student: Student) => {
    setEditingId(student.id);
    setEditName(student.name);
    setEditGender(student.gender);
    setEditDob(student.dob);
    setEditPhone(student.phone);
    setEditFatherName(student.fatherName || "");
    setEditFatherPhone(student.fatherPhone || "");
    setEditMotherName(student.motherName || "");
    setEditMotherPhone(student.motherPhone || "");
    setEditClass(student.schoolClass);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) {
      showNotification("Họ tên không được để trống", "error");
      return;
    }
    const finalPhone = editPhone.trim() || editFatherPhone.trim() || editMotherPhone.trim();
    if (!finalPhone) {
      showNotification("Họ tên và ít nhất một số điện thoại liên hệ không được để trống", "error");
      return;
    }

    try {
      const resp = await apiFetch(`/api/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          gender: editGender,
          dob: editDob,
          phone: finalPhone,
          fatherName: editFatherName,
          fatherPhone: editFatherPhone,
          motherName: editMotherName,
          motherPhone: editMotherPhone,
          schoolClass: editClass
        })
      });

      if (resp.ok) {
        showNotification("Đã cập nhật thông tin cá nhân học sinh thành công!");
        setEditingId(null);
        fetchStudents();
        if (onStudentsChanged) onStudentsChanged();
      } else {
        showNotification("Lỗi cập nhật học sinh", "error");
      }
    } catch (e) {
      showNotification("Lỗi kết nối máy chủ", "error");
    }
  };

  const handleSaveDetailStudent = async () => {
    if (!detailStudent) return;
    
    setIsSavingDetail(true);
    try {
      const resp = await apiFetch(`/api/students/${detailStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(detailStudent)
      });

      if (resp.ok) {
        showNotification(`Đã cập nhật học bạ, lý lịch & hạnh kiểm cho em ${detailStudent.name}!`);
        fetchStudents();
        if (onStudentsChanged) onStudentsChanged();
        setDetailStudent(null);
      } else {
        showNotification("Lỗi khi lưu thông tin học sinh", "error");
      }
    } catch (e) {
      showNotification("Lỗi kết nối máy chủ khi lưu", "error");
    } finally {
      setIsSavingDetail(false);
    }
  };

  const handleGradeChange = (subjectIdx: number, month: string, val: string) => {
    if (!detailStudent || !detailStudent.monthlyGradesList) return;
    const list = [...detailStudent.monthlyGradesList];
    const sub = { ...list[subjectIdx] };
    const newMonthlyGrades = { ...sub.monthlyGrades };
    
    // Support empty values gracefully
    if (val === "") {
      delete newMonthlyGrades[month];
    } else {
      const num = parseFloat(val);
      if (isNaN(num) || num < 0 || num > 10) return;
      newMonthlyGrades[month] = num;
    }
    
    sub.monthlyGrades = newMonthlyGrades;

    // Recalculate average only using defined values
    const grades = Object.values(sub.monthlyGrades).filter((g): g is number => g !== undefined && g !== null);
    const avg = grades.length > 0 
      ? grades.reduce((sum: number, g: number) => sum + g, 0) / grades.length 
      : 0;
    sub.yearlySummary = Math.round(avg * 10) / 10;

    list[subjectIdx] = sub;
    setDetailStudent({ ...detailStudent, monthlyGradesList: list });
  };

  const handleConductChange = (conduct: "Tốt" | "Khá" | "Trung bình" | "Yếu") => {
    if (!detailStudent || !detailStudent.conductEvaluation) return;
    setDetailStudent({
      ...detailStudent,
      conductEvaluation: {
        ...detailStudent.conductEvaluation,
        conduct
      }
    });
  };

  const handleAssessmentChange = (text: string) => {
    if (!detailStudent || !detailStudent.conductEvaluation) return;
    setDetailStudent({
      ...detailStudent,
      conductEvaluation: {
        ...detailStudent.conductEvaluation,
        teacherAssessment: text
      }
    });
  };

  const handleAddActivity = () => {
    if (!detailStudent || !detailStudent.conductEvaluation || !newActivity.trim()) return;
    const currentList = detailStudent.conductEvaluation.extraCurricularActivities || [];
    setDetailStudent({
      ...detailStudent,
      conductEvaluation: {
        ...detailStudent.conductEvaluation,
        extraCurricularActivities: [...currentList, newActivity.trim()]
      }
    });
    setNewActivity("");
  };

  const handleRemoveActivity = (idxToRemove: number) => {
    if (!detailStudent || !detailStudent.conductEvaluation) return;
    const currentList = detailStudent.conductEvaluation.extraCurricularActivities || [];
    setDetailStudent({
      ...detailStudent,
      conductEvaluation: {
        ...detailStudent.conductEvaluation,
        extraCurricularActivities: currentList.filter((_, idx) => idx !== idxToRemove)
      }
    });
  };

  const initiateDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    setDeleteTarget(null);

    try {
      const resp = await apiFetch(`/api/students/${id}`, {
        method: "DELETE"
      });

      if (resp.ok) {
        showNotification(`Đã xóa học sinh ${name} khỏi danh sách lớp thành công.`);
        fetchStudents();
        if (onStudentsChanged) onStudentsChanged();
      } else {
        showNotification("Lỗi xóa học sinh", "error");
      }
    } catch (e) {
      showNotification("Không thể kết nối đến máy chủ", "error");
    }
  };

  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkError("");
    setBulkSuccessMsg("");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        
        const parsedLines = rows
          .map((row: any) => {
            if (!Array.isArray(row) || row.length === 0) return "";
            return row.map(cell => String(cell || "").trim()).join("\t");
          })
          .filter(line => line.trim().length > 0)
          .join("\n");
          
        setBulkText(parsedLines);
        setBulkSuccessMsg("Đọc tệp Excel thành công! Vui lòng kiểm tra lại nội dung phía dưới rồi nhấn 'Xác nhận tải danh sách'.");
      } catch (err: any) {
        setBulkError("Không thể đọc tệp Excel: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleGoogleSheetImport = async (url: string) => {
    if (!url) {
      setBulkError("Vui lòng nhập đường dẫn Google Sheets.");
      return;
    }
    
    setBulkError("");
    setBulkSuccessMsg("");
    
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      setBulkError("Đường dẫn Google Sheets không hợp lệ. Vui lòng đảm bảo đúng định dạng URL bảng tính.");
      return;
    }
    
    const spreadsheetId = match[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
    
    try {
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error("Không thể truy cập Google Sheet. Vui lòng đảm bảo bạn đã chia sẻ quyền 'Bất kỳ ai có liên kết đều có thể xem'.");
      }
      
      const csvText = await response.text();
      const parsedLines = csvText
        .split("\n")
        .map(line => {
          const parts = line.split(",").map(p => p.replace(/^"|"$/g, "").trim());
          return parts.join("\t");
        })
        .filter(line => line.trim().length > 0)
        .join("\n");
        
      setBulkText(parsedLines);
      setBulkSuccessMsg("Tải dữ liệu từ Google Sheets thành công! Vui lòng kiểm tra lại nội dung phía dưới rồi nhấn 'Xác nhận tải danh sách'.");
    } catch (err: any) {
      setBulkError(err.message || "Lỗi tải Google Sheets.");
    }
  };

  // Bulk import parsing
  // Expecting format: Họ và tên [Tab/comma] Giới tính [Tab/comma] Ngày sinh [Tab/comma] SĐT
  // Example: 
  // Nguyễn Văn A, Nam, 2016-05-12, 0912345678
  // Lê Thị B, Nữ, 2016-10-22, 0987654321
  const handleBulkImport = async () => {
    setBulkError("");
    setBulkSuccessMsg("");
    if (!bulkText.trim()) {
      setBulkError("Vui lòng tải tệp hoặc nhập dữ liệu để bắt đầu.");
      return;
    }

    const lines = bulkText.split("\n");
    const studentsToRegister = [];
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      let parts = line.split("\t");
      if (parts.length < 2) {
        const spaceParts = line.split(/\s{2,}/);
        if (spaceParts.length >= 2) {
          parts = spaceParts;
        } else if (line.includes(",")) {
          parts = line.split(",");
        } else if (line.includes(";")) {
          parts = line.split(";");
        } else {
          const spaceSplit = line.split(/\s+/);
          if (spaceSplit.length >= 4) {
            const lastPart = spaceSplit[spaceSplit.length - 1];
            const secondLast = spaceSplit[spaceSplit.length - 2];
            const thirdLast = spaceSplit[spaceSplit.length - 3];
            
            const isPhone = /^[0-9+() -]{9,15}$/.test(lastPart);
            const isDob = /^\d{4}-\d{2}-\d{2}$/.test(secondLast) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(secondLast);
            const isGender = ["nam", "nữ", "nu"].includes(thirdLast.toLowerCase());
            
            if (isPhone && isDob && isGender) {
              const name = spaceSplit.slice(0, spaceSplit.length - 3).join(" ");
              parts = [name, thirdLast, secondLast, lastPart];
            }
          }
        }
      }

      // Automatically detect and shift out STT (sequential number) column
      if (parts.length >= 2 && /^\d+$/.test(parts[0]?.trim() || "")) {
        parts.shift();
      }

      const rawName = parts[0]?.trim() || "";
      
      // Skip header rows
      const nameLower = rawName.toLowerCase();
      if (
        !rawName ||
        nameLower === "stt" ||
        nameLower === "số thứ tự" ||
        nameLower === "so thu tu" ||
        nameLower === "họ và tên" ||
        nameLower === "họ tên" ||
        nameLower === "ho va ten" ||
        nameLower === "hoten" ||
        nameLower === "tên học sinh" ||
        nameLower === "ten hoc sinh" ||
        nameLower === "tên" ||
        nameLower === "ten"
      ) {
        continue;
      }
      const rawGender = parts[1]?.trim() || "Nam";
      const rawDob = parts[2]?.trim() || "2016-01-01";
      const rawPhone = parts[3]?.trim() || "0900000000";
      const genderClean: "Nam" | "Nữ" = (rawGender.toLowerCase() === "nữ" || rawGender.toLowerCase() === "nu") ? "Nữ" : "Nam";
      let dobClean = rawDob;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDob)) {
        const dateParts = rawDob.split("/");
        if (dateParts.length === 3) {
          const d = dateParts[0].padStart(2, "0");
          const m = dateParts[1].padStart(2, "0");
          const y = dateParts[2];
          dobClean = `${y}-${m}-${d}`;
        } else {
          dobClean = "2016-01-01";
        }
      }

      studentsToRegister.push({
        name: rawName,
        gender: genderClean,
        dob: dobClean,
        phone: rawPhone,
        schoolGrade: schoolGrade,
        schoolClass: schoolClass
      });
    }

    if (studentsToRegister.length === 0) {
      setBulkError("Không tìm thấy học sinh hợp lệ nào để nhập.");
      return;
    }

    try {
      const resp = await apiFetch("/api/students/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentsToRegister)
      });

      if (resp.ok) {
        const added = await resp.json();
        setBulkSuccessMsg(`Đã nhập thành công ${added.length} học sinh mới vào hệ thống.`);
        setBulkText("");
        setGoogleSheetUrl("");
        fetchStudents();
        if (onStudentsChanged) onStudentsChanged();
      } else {
        const errorData = await resp.json();
        setBulkError(`Không thể lưu danh sách: ${errorData.error || "Lỗi máy chủ."}`);
      }
    } catch (e) {
      setBulkError("Lỗi kết nối mạng khi tải dữ liệu lên.");
    }
  };

  const loadExampleData = () => {
    setBulkText(
      "Phạm Quốc Anh\tNam\t2016-03-12\t0912345001\n" +
      "Trần Lê Quỳnh Anh\tNữ\t2016-07-28\t0912345002\n" +
      "Nguyễn Đăng Khoa\tNam\t2016-11-04\t0912345003\n" +
      "Vũ Phương Thảo\tNữ\t2016-09-15\t0912345004"
    );
  };

  return (
    <div className="space-y-6" id="student-manager-wrapper">
      {/* Notifications */}
      {notification && (
        <div 
          className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-2 animate-bounce ${
            notification.type === "success" 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
          id="manager-notification"
        >
          {notification.type === "success" ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-semibold text-sm">{notification.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 rounded-2xl p-6 text-white border border-indigo-950 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-800/20 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest bg-indigo-900/50 px-3 py-1 rounded-full border border-indigo-800/40">
              Phân hệ Hành chính Lớp học
            </span>
            <h2 className="text-2xl font-bold tracking-tight">Hồ Sơ Sĩ Số Lớp Chủ Nhiệm</h2>
            <p className="text-sm text-indigo-200/90 leading-relaxed max-w-2xl">
              Quản lý danh bạ, lý lịch trích ngang của học sinh tiểu học. Cập nhật ngày tháng năm sinh và Hotline liên hệ khẩn cấp của bố mẹ học sinh phục vụ công tác kết nối gia đình và nhà trường.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                if (showBulkImport) setShowBulkImport(false);
              }}
              className={`font-semibold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-1.5 border cursor-pointer ${
                showAddForm 
                  ? "bg-white text-indigo-950 border-white hover:bg-indigo-50" 
                  : "bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700"
              }`}
            >
              <UserPlus className="w-4.5 h-4.5" />
              {showAddForm ? "Đóng Thêm Học Sinh" : "Thêm Học Sinh Mới"}
            </button>

            <button
              onClick={() => {
                setShowBulkImport(!showBulkImport);
                if (showAddForm) setShowAddForm(false);
              }}
              className={`font-semibold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-1.5 border cursor-pointer ${
                showBulkImport
                  ? "bg-white text-indigo-950 border-white hover:bg-indigo-50"
                  : "bg-indigo-800 text-indigo-100 border-indigo-700 hover:bg-indigo-750"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              {showBulkImport ? "Đóng Nhập Excel" : "Nhập Hàng Loạt từ Excel"}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Import / Copy Paste Panel */}
      {showBulkImport && (
        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5 space-y-4" id="bulk-import-container">
          <div className="flex items-start gap-3">
            <Clipboard className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Nhập danh sách học sinh hàng loạt</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Chọn phương thức nhập dữ liệu học sinh hàng loạt bằng cách tải tệp Excel, nhập liên kết Google Sheets công khai, hoặc sao chép và dán trực tiếp.
              </p>
            </div>
          </div>

          {/* Import Mode Tabs */}
          <div className="flex gap-2 border-b border-amber-200 pb-2 mb-3">
            <button
              type="button"
              onClick={() => setImportMode("file")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${
                importMode === "file" ? "bg-amber-600 text-white" : "text-amber-800 hover:bg-amber-100/70"
              }`}
            >
              Tải tệp Excel / CSV
            </button>
            <button
              type="button"
              onClick={() => setImportMode("sheet")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${
                importMode === "sheet" ? "bg-amber-600 text-white" : "text-amber-800 hover:bg-amber-100/70"
              }`}
            >
              Nhập từ Google Sheets
            </button>
            <button
              type="button"
              onClick={() => setImportMode("paste")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${
                importMode === "paste" ? "bg-amber-600 text-white" : "text-amber-800 hover:bg-amber-100/70"
              }`}
            >
              Dán văn bản Copy
            </button>
          </div>

          {/* Mode 1: File Upload */}
          {importMode === "file" && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center space-y-3">
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer relative">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-xs font-semibold text-slate-600">Kéo thả hoặc click để tải lên tệp tin (.xlsx, .xls, .csv)</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Mode 2: Google Sheets */}
          {importMode === "sheet" && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <label className="text-xs font-bold text-slate-600 block">Đường dẫn Google Sheets (Công khai)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={googleSheetUrl}
                  onChange={(e) => setGoogleSheetUrl(e.target.value)}
                  placeholder="Ví dụ: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKv1S6pVxwK59/edit?usp=sharing"
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => handleGoogleSheetImport(googleSheetUrl)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer border-none transition-colors"
                >
                  Tải dữ liệu
                </button>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                * Lưu ý: Trang tính phải được chia sẻ công khai ở quyền "Bất kỳ ai có liên kết đều có thể xem" (Anyone with link can view).
              </p>
            </div>
          )}

          {/* Mode 3: Text Paste */}
          {importMode === "paste" && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 leading-relaxed">
                Định dạng gợi ý: <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono font-bold">Họ tên [Tab hoặc phẩy] Giới tính [Tab hoặc phẩy] Ngày sinh YYYY-MM-DD [Tab hoặc phẩy] SĐT bố mẹ</code>
              </p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Ví dụ:&#10;Nguyễn Hồng Nhung	Nữ	2016-05-15	0905123456&#10;Trần Hùng Cường	Nam	2016-09-20	0987654321"
                rows={5}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={loadExampleData}
                className="text-amber-800 hover:text-amber-900 text-xs font-semibold underline flex items-center gap-1 border-none bg-transparent cursor-pointer"
                id="btn-load-example"
              >
                <Sparkles className="w-3 h-3" />
                Tải văn bản mẫu để xem cấu trúc
              </button>
            </div>
          )}

          {/* Display current preview text area if it has loaded contents from file/sheet */}
          {importMode !== "paste" && bulkText.trim() && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Dữ liệu đã trích xuất (Có thể chỉnh sửa thủ công nếu cần):</label>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={4}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}

          {/* Action buttons if bulkText has contents */}
          {bulkText.trim() && (
            <div className="flex justify-end gap-2 pt-2 border-t border-amber-100">
              <button
                type="button"
                onClick={() => {
                  setBulkText("");
                  setBulkError("");
                  setBulkSuccessMsg("");
                  setGoogleSheetUrl("");
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-1.5 rounded-lg text-xs border-none cursor-pointer"
              >
                Xóa trống
              </button>
              <button
                type="button"
                onClick={handleBulkImport}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer border-none shadow-sm transition-colors"
                id="btn-confirm-bulk"
              >
                <Download className="w-3.5 h-3.5" />
                Xác nhận tải danh sách lớp
              </button>
            </div>
          )}

          {bulkError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800 text-xs whitespace-pre-line font-mono">
              {bulkError}
            </div>
          )}

          {bulkSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              {bulkSuccessMsg}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Add Student Personal Profile Form */}
        {showAddForm && (
          <div className="xl:col-span-4 space-y-4 animate-scale-up">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 text-sm uppercase tracking-wider">
                <UserPlus className="w-4 h-4 text-indigo-500" />
                Thêm mới lẻ học sinh
              </h3>
              
              <form onSubmit={handleCreateStudent} className="space-y-4">
                {/* Họ tên */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">Họ và Tên Học Sinh <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn Hải"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    id="input-new-student-name"
                  />
                </div>

                {/* Giới tính & Ngày sinh */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 block">Giới tính</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as "Nam" | "Nữ")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 block">Ngày sinh <span className="text-rose-500">*</span></label>
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Thông tin Phụ huynh */}
                <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-xs font-extrabold text-slate-700 block flex items-center gap-1.5 border-b border-slate-200/60 pb-1.5 uppercase tracking-wider">
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    Thông tin phụ huynh
                  </span>
                  
                  {/* Thông tin Bố */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Người liên hệ 1: Bố</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={fatherName}
                        onChange={(e) => setFatherName(e.target.value)}
                        placeholder="Họ tên Bố"
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="tel"
                        value={fatherPhone}
                        onChange={(e) => setFatherPhone(e.target.value)}
                        placeholder="SĐT Bố"
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Thông tin Mẹ */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Người liên hệ 2: Mẹ (nếu có)</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={motherName}
                        onChange={(e) => setMotherName(e.target.value)}
                        placeholder="Họ tên Mẹ"
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="tel"
                        value={motherPhone}
                        onChange={(e) => setMotherPhone(e.target.value)}
                        placeholder="SĐT Mẹ"
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Lớp & Khối lớp */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 block">Lớp học</label>
                    <input
                      type="text"
                      value={schoolClass}
                      onChange={(e) => setSchoolClass(e.target.value)}
                      placeholder="Ví dụ: 4A"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 block">Khối lớp chủ nhiệm</label>
                    <select
                      value={schoolGrade}
                      onChange={(e) => setSchoolGrade(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    >
                      {[1, 2, 3, 4, 5].map((g) => (
                        <option key={g} value={g}>Khối {g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Ảnh đại diện (Tải từ máy tính hoặc Nhập Link) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">Ảnh đại diện học sinh</label>
                  
                  {avatar ? (
                    <div className="relative flex items-center gap-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                      <img 
                        src={avatar} 
                        alt="Avatar Preview" 
                        className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-sm"
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-bold text-indigo-950 truncate">Ảnh đại diện đã chọn</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{avatar.startsWith("data:") ? "Dạng tệp base64 (offline-safe)" : avatar}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAvatar("")}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa ảnh"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file && file.type.startsWith("image/")) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            if (typeof reader.result === "string") {
                              setAvatar(reader.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      onClick={() => document.getElementById("create-student-file-input")?.click()}
                      className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1 ${
                        isDragging 
                          ? "border-indigo-500 bg-indigo-50/60" 
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100/80 hover:border-slate-300"
                      }`}
                    >
                      <input 
                        type="file" 
                        accept="image/*" 
                        id="create-student-file-input"
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (typeof reader.result === "string") {
                                setAvatar(reader.result);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <Upload className={`w-5 h-5 ${isDragging ? "text-indigo-500 animate-bounce" : "text-slate-400"}`} />
                      <span className="text-xs font-semibold text-slate-600">Kéo thả ảnh đại diện hoặc <span className="text-indigo-600 underline">chọn từ máy tính</span></span>
                      <span className="text-[10px] text-slate-400">Hỗ trợ JPG, PNG, GIF trực tiếp</span>
                    </div>
                  )}

                  {/* Option to manually enter URL if preferred */}
                  {!avatar && (
                    <details className="text-[11px] text-slate-500 mt-1 cursor-pointer text-left">
                      <summary className="hover:text-indigo-600 font-medium select-none">Hoặc nhập địa chỉ URL ảnh trực tiếp</summary>
                      <div className="mt-1">
                        <input
                          type="url"
                          value={avatar}
                          onChange={(e) => setAvatar(e.target.value)}
                          placeholder="Nhập địa chỉ URL của ảnh..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                        />
                      </div>
                    </details>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 mt-2"
                  id="btn-submit-new-student"
                >
                  <UserPlus className="w-4 h-4" />
                  Lưu Học Sinh Vào Lớp
                </button>
              </form>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 text-xs space-y-2 text-slate-500">
              <span className="font-bold text-slate-700 block uppercase tracking-wider mb-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-indigo-500" /> Hướng dẫn đồng bộ dữ liệu
              </span>
              <p>
                Hồ sơ học sinh sau khi lưu sẽ lập tức xuất hiện trong mục <strong>Sĩ số Lớp {schoolClass}</strong> của giáo viên.
              </p>
              <p>
                Hệ thống AI sẽ tự động khởi tạo hồ sơ tâm lý trung bình để cô giáo có thể lập tức thử nghiệm tính năng soạn Nhận xét tuần, mẫu thư liên lạc Zalo hay theo dõi kết quả học tập & dự báo can thiệp sớm.
              </p>
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: Interactive Table / Detailed Personal Card */}
        <div className={`${showAddForm ? "xl:col-span-8" : "xl:col-span-12"} space-y-4 transition-all duration-300`}>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            
            <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1 text-left">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Users className="w-4 h-4 text-indigo-500" />
                  SỔ LÝ LỊCH TRÍCH NGANG HÀNH CHÍNH ({students.length} học sinh)
                </h3>
                <p className="text-[11px] text-slate-500">✨ Nhấp vào <strong>tên học sinh</strong> để xem Học bạ & Đánh giá • Nhấp ✏️ để sửa lý lịch nhanh</p>
              </div>

              {/* Sorting Switcher */}
              <div className="flex items-center gap-1 bg-slate-200/50 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setSortBy("name")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    sortBy === "name"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  🔤 Tên (A-Z)
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy("rank")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    sortBy === "rank"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  🏆 Thứ hạng (ĐTB)
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center" id="manager-loading">
                <p className="text-slate-400 font-medium">Đang đồng bộ sổ danh bạ học sinh...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="p-12 text-center text-slate-400" id="manager-empty">
                Không có học sinh nào trong lớp. Hãy nhập lẻ hoặc dán bảng Excel phía trên.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs" id="students-table">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">Ảnh</th>
                      <th className="py-3 px-4">Họ và Tên</th>
                      <th className="py-3 px-4 text-center w-24">Thứ hạng</th>
                      <th className="py-3 px-4 text-center w-28">ĐTB Môn học</th>
                      <th className="py-3 px-4 text-center w-36">Học lực tạm thời</th>
                      {onSelectForForecast && (
                        <th className="py-3 px-4 text-center w-40">Biểu đồ học tập</th>
                      )}
                      <th className="py-3 px-4 w-24 text-right">Tác vụ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedStudents.map((student) => {
                      const rank = rankMap[student.id] || 1;
                      return (
                        <tr 
                          key={student.id} 
                          className="hover:bg-slate-50/60 transition-colors align-middle"
                          id={`row-student-${student.id}`}
                        >
                          {/* Avatar */}
                          <td className="py-2.5 px-3 text-center">
                            <img
                              referrerPolicy="no-referrer"
                              src={student.avatar}
                              alt={student.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-100 mx-auto shadow-xs"
                            />
                          </td>

                          {/* Họ tên */}
                          <td className="py-2.5 px-4 font-semibold text-slate-800">
                            <button
                              type="button"
                              onClick={() => {
                                const fullStudent = ensureStudentDetailFields(student);
                                setDetailStudent(fullStudent);
                                setActiveDetailTab("info");
                              }}
                              className="text-left font-bold text-slate-800 hover:text-indigo-600 hover:underline transition-all cursor-pointer flex items-center gap-1.5 group"
                              title="Nhấp để xem Học bạ, Lý lịch & Hạnh kiểm"
                            >
                              {student.name}
                              <Sparkles className="w-3.5 h-3.5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </td>

                          {/* Thứ hạng */}
                          <td className="py-2.5 px-4 text-center">
                            {student.gpa !== null && student.gpa !== undefined ? (
                              <span className={`inline-flex items-center justify-center font-mono font-black text-xs px-2.5 py-0.5 rounded-full ${
                                rank === 1
                                  ? "bg-amber-100 text-amber-900 border border-amber-200"
                                  : rank === 2
                                    ? "bg-slate-200 text-slate-850 border border-slate-300"
                                    : rank === 3
                                      ? "bg-orange-100 text-orange-900 border border-orange-200"
                                      : "bg-slate-100 text-slate-600"
                              }`}>
                                #{rank}
                              </span>
                            ) : (
                              <span className="text-slate-450 font-bold font-mono">—</span>
                            )}
                          </td>

                          {/* ĐTB Môn học */}
                          <td className="py-2.5 px-4 text-center font-mono font-extrabold text-sm text-slate-750">
                            {student.gpa !== null && student.gpa !== undefined ? student.gpa : "—"}
                          </td>

                          {/* Học lực tạm thời */}
                          <td className="py-2.5 px-4 text-center">
                            <span className={`inline-block text-[10px] font-black px-2.5 py-0.5 rounded-md border ${
                              student.classification === "Xuất sắc"
                                ? "bg-purple-50 text-purple-750 border-purple-200"
                                : student.classification === "Giỏi"
                                  ? "bg-emerald-50 text-emerald-750 border-emerald-200"
                                  : student.classification === "Khá"
                                    ? "bg-indigo-50 text-indigo-750 border-indigo-200"
                                    : student.classification === "Trung bình"
                                      ? "bg-amber-50 text-amber-750 border-amber-200"
                                      : student.classification === "Yêu"
                                        ? "bg-rose-50 text-rose-750 border-rose-200"
                                        : "bg-slate-50 text-slate-500 border-slate-200"
                            }`}>
                              {student.classification}
                            </span>
                          </td>

                          {/* Biểu đồ học tập */}
                          {onSelectForForecast && (
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center">
                                <button
                                  onClick={() => onSelectForForecast(ensureStudentDetailFields(student))}
                                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-xl text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs border border-indigo-100"
                                  title="Xem kết quả học tập & dự báo sớm"
                                >
                                  <LineChart className="w-3.5 h-3.5 text-indigo-600" />
                                  Biểu đồ học tập
                                </button>
                              </div>
                            </td>
                          )}

                          {/* Hành động sửa/xóa */}
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  const fullStudent = ensureStudentDetailFields(student);
                                  setDetailStudent(fullStudent);
                                  setActiveDetailTab("info");
                                }}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-all"
                                title="Chỉnh sửa lý lịch học sinh"
                                id={`btn-edit-${student.id}`}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => initiateDelete(student.id, student.name)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-all"
                                title="Xóa học sinh này"
                                id={`btn-delete-${student.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Elegant Custom Confirmation Modal for deletion without window.confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in" id="delete-confirmation-modal">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="bg-rose-50 p-2.5 rounded-full border border-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Xác nhận xóa học sinh?</h3>
            </div>
            
            <p className="text-slate-650 text-xs leading-relaxed">
              Bạn có chắc chắn muốn xóa học sinh <strong className="text-slate-800">{deleteTarget.name}</strong> ra khỏi danh sách lớp chủ nhiệm không? Tất cả dữ liệu học tập liên quan sẽ được gỡ khỏi bộ lưu trữ tạm thời của lớp học này. Hành động này không thể hoàn tác.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                id="btn-cancel-delete"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-md shadow-rose-100 cursor-pointer"
                id="btn-confirm-delete"
              >
                Đồng ý xóa học sinh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Student Profile Modal (3 modules) */}
      {detailStudent && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800" id="student-detail-modal">
          <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-100 flex flex-col shadow-2xl overflow-hidden max-h-[90vh] animate-scale-up">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6 relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="relative group cursor-pointer" 
                  onClick={() => document.getElementById("edit-student-file-input")?.click()}
                  title="Click để đổi ảnh đại diện từ máy tính"
                >
                  <img 
                    src={detailStudent.avatar} 
                    alt={detailStudent.name} 
                    className="w-14 h-14 rounded-full border-2 border-white/20 object-cover group-hover:brightness-75 transition-all"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-extrabold flex items-center gap-2">
                    {detailStudent.name}
                    <span className="bg-indigo-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      Lớp {detailStudent.schoolClass}
                    </span>
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setDetailStudent(null)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-all cursor-pointer"
                title="Đóng cửa sổ"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="bg-slate-100 border-b border-slate-200 px-6 flex gap-1 pt-3">
              <button
                onClick={() => setActiveDetailTab("info")}
                className={`py-2 px-4 rounded-t-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border-t border-x ${
                  activeDetailTab === "info"
                    ? "bg-white text-slate-900 border-slate-200"
                    : "bg-slate-50/50 text-slate-500 hover:bg-slate-50 hover:text-slate-800 border-transparent"
                }`}
              >
                <Users className="w-4 h-4 text-indigo-500" />
                Lý lịch Học sinh
              </button>
              <button
                onClick={() => setActiveDetailTab("grades")}
                className={`py-2 px-4 rounded-t-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border-t border-x ${
                  activeDetailTab === "grades"
                    ? "bg-white text-slate-900 border-slate-200"
                    : "bg-slate-50/50 text-slate-500 hover:bg-slate-50 hover:text-slate-800 border-transparent"
                }`}
              >
                <BookOpen className="w-4 h-4 text-emerald-500" />
                Học bạ & Điểm số
              </button>
              <button
                onClick={() => setActiveDetailTab("conduct")}
                className={`py-2 px-4 rounded-t-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border-t border-x ${
                  activeDetailTab === "conduct"
                    ? "bg-white text-slate-900 border-slate-200"
                    : "bg-slate-50/50 text-slate-500 hover:bg-slate-50 hover:text-slate-800 border-transparent"
                }`}
              >
                <Award className="w-4 h-4 text-rose-500" />
                Hạnh kiểm & Ngoại khóa
              </button>
              <button
                onClick={() => setActiveDetailTab("diary")}
                className={`py-2 px-4 rounded-t-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border-t border-x ${
                  activeDetailTab === "diary"
                    ? "bg-white text-slate-900 border-slate-200"
                    : "bg-slate-50/50 text-slate-500 hover:bg-slate-50 hover:text-slate-800 border-transparent"
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                Nhật ký học sinh
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[350px]">
              
              {/* Tab 1: Lý lịch học sinh */}
              {activeDetailTab === "info" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in text-left">
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Thông tin cá nhân học sinh</h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 block">Họ và Tên</label>
                        <input
                          type="text"
                          value={detailStudent.name}
                          onChange={(e) => setDetailStudent({ ...detailStudent, name: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 block">Giới tính</label>
                        <select
                          value={detailStudent.gender}
                          onChange={(e) => setDetailStudent({ ...detailStudent, gender: e.target.value as "Nam" | "Nữ" })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                        >
                          <option value="Nam">Nam</option>
                          <option value="Nữ">Nữ</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Ngày sinh
                        </label>
                        <input
                          type="date"
                          value={detailStudent.dob}
                          onChange={(e) => setDetailStudent({ ...detailStudent, dob: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 block">Lớp học</label>
                        <input
                          type="text"
                          value={detailStudent.schoolClass}
                          onChange={(e) => setDetailStudent({ ...detailStudent, schoolClass: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                        />
                      </div>
                    </div>

                    {/* Ảnh đại diện học sinh (Cập nhật từ máy tính) */}
                    <div className="space-y-1 pt-2">
                      <label className="text-[11px] font-bold text-slate-500 block">Ảnh đại diện học sinh</label>
                      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
                        <img 
                          src={detailStudent.avatar || (detailStudent.gender === "Nam" 
                            ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
                            : "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80")} 
                          alt="Student Avatar" 
                          className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-xs"
                        />
                        <div className="flex-1">
                          <input 
                            type="file" 
                            accept="image/*" 
                            id="edit-student-file-input"
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  if (typeof reader.result === "string") {
                                    setDetailStudent({ ...detailStudent, avatar: reader.result });
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById("edit-student-file-input")?.click()}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-indigo-100/40"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            Đổi ảnh từ thiết bị
                          </button>
                          <p className="text-[10px] text-slate-400 mt-1">Hỗ trợ tải lên ảnh JPG, PNG trực tiếp từ máy tính</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Thông tin Phụ huynh liên hệ</h4>
                    
                    <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/40 space-y-4">
                      {/* Bố */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-extrabold text-indigo-600 block uppercase tracking-wider text-left">Người liên hệ 1: Bố</span>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 block text-left">Họ tên Bố</label>
                            <input
                              type="text"
                              value={detailStudent.fatherName || ""}
                              onChange={(e) => setDetailStudent({ ...detailStudent, fatherName: e.target.value })}
                              placeholder="Họ tên Bố"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 block text-left">SĐT Bố</label>
                            <input
                              type="tel"
                              value={detailStudent.fatherPhone || ""}
                              onChange={(e) => setDetailStudent({ ...detailStudent, fatherPhone: e.target.value })}
                              placeholder="SĐT Bố"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Mẹ */}
                      <div className="space-y-2 border-t border-slate-200/50 pt-3">
                        <span className="text-[10px] font-extrabold text-indigo-600 block uppercase tracking-wider text-left">Người liên hệ 2: Mẹ (nếu có)</span>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 block text-left">Họ tên Mẹ</label>
                            <input
                              type="text"
                              value={detailStudent.motherName || ""}
                              onChange={(e) => setDetailStudent({ ...detailStudent, motherName: e.target.value })}
                              placeholder="Họ tên Mẹ"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 block text-left">SĐT Mẹ</label>
                            <input
                              type="tel"
                              value={detailStudent.motherPhone || ""}
                              onChange={(e) => setDetailStudent({ ...detailStudent, motherPhone: e.target.value })}
                              placeholder="SĐT Mẹ"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Học bạ học tập */}
              {activeDetailTab === "grades" && (
                <div className="space-y-4 animate-fade-in text-left">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Bảng điểm định kỳ theo tháng</h4>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-1 rounded-md">
                      📝 Điểm số hệ 10 (Sử dụng số để nhập từ 0 - 10)
                    </span>
                  </div>

                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                          <th className="py-3 px-4 font-bold">Môn học</th>
                          {["Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12", "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5"].map(m => (
                            <th key={m} className="py-3 px-2 text-center w-14 font-semibold">{m.replace("Tháng ", "T")}</th>
                          ))}
                          <th className="py-3 px-4 text-center w-20 text-slate-800 font-bold">Cả năm</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailStudent.monthlyGradesList?.map((gradeItem, sIdx) => (
                          <tr key={gradeItem.subject} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-700">{gradeItem.subject}</td>
                            {["Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12", "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5"].map(m => (
                              <td key={m} className="py-2 px-1 text-center">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="10"
                                  value={gradeItem.monthlyGrades[m] !== undefined ? gradeItem.monthlyGrades[m] : ""}
                                  onChange={(e) => handleGradeChange(sIdx, m, e.target.value)}
                                  className="w-10 text-center border border-slate-200 rounded-md py-1 px-0.5 text-xs font-mono font-bold bg-slate-50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-emerald-400 focus:outline-hidden"
                                />
                              </td>
                            ))}
                            <td className="py-2 px-4 text-center">
                              <span className={`font-mono font-extrabold text-xs px-2 py-0.5 rounded-full ${
                                gradeItem.yearlySummary >= 8.0 
                                  ? "bg-emerald-50 text-emerald-700"
                                  : gradeItem.yearlySummary >= 6.5
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-rose-50 text-rose-700"
                              }`}>
                                {gradeItem.yearlySummary}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>


                  {/* Real-time Interactive Chart Integration */}
                  <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <LineChart className="w-4 h-4 text-indigo-500 animate-pulse" />
                        <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Trực quan hóa xu hướng điểm số (Thời gian thực)</h4>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-white rounded-3xl border border-slate-100 shadow-2xs">
                      <AcademicChart student={detailStudent} />
                    </div>
                  </div>

                </div>
              )}

              {/* Tab 3: Hạnh kiểm & Ngoại khóa */}
              {activeDetailTab === "conduct" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in text-left">
                  {/* Hạnh kiểm */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Nhận xét Hạnh kiểm & Ý thức</h4>
                    
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">Xếp loại Hạnh kiểm</label>
                      <div className="grid grid-cols-4 gap-2">
                        {["Tốt", "Khá", "Trung bình", "Yếu"].map(lvl => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => handleConductChange(lvl as any)}
                            className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                              detailStudent.conductEvaluation?.conduct === lvl
                                ? lvl === "Tốt"
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                  : lvl === "Khá"
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                    : lvl === "Trung bình"
                                      ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                                      : "bg-rose-600 text-white border-rose-600 shadow-xs"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 block">Nhận xét chi tiết của giáo viên chủ nhiệm</label>
                      <textarea
                        rows={4}
                        value={detailStudent.conductEvaluation?.teacherAssessment || ""}
                        onChange={(e) => handleAssessmentChange(e.target.value)}
                        placeholder="Nhập nhận xét chi tiết..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Ngoại khóa */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Hoạt động ngoại khóa & Thành tích</h4>
                    
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newActivity}
                          onChange={(e) => setNewActivity(e.target.value)}
                          placeholder="Thêm hoạt động mới (e.g. Giải Ba điền kinh, Kế hoạch nhỏ...)"
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddActivity();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddActivity}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-3 text-xs transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 block uppercase">Danh sách hoạt động tham gia:</label>
                        {detailStudent.conductEvaluation?.extraCurricularActivities && detailStudent.conductEvaluation.extraCurricularActivities.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {detailStudent.conductEvaluation.extraCurricularActivities.map((act, aIdx) => (
                              <span 
                                key={act + aIdx} 
                                className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200/60 rounded-xl px-2.5 py-1 text-xs text-slate-700 font-medium"
                              >
                                {act}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveActivity(aIdx)}
                                  className="text-slate-400 hover:text-rose-500 rounded-full transition-colors cursor-pointer"
                                  title="Gỡ hoạt động"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">Học sinh chưa tham gia hoạt động ngoại khóa nào trong năm nay.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Nhật ký học sinh (Đồng bộ Sổ đầu bài AI) */}
              {activeDetailTab === "diary" && (
                <div className="space-y-4 animate-fade-in text-left">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-black text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                      NHẬT KÝ RÈN LUYỆN CÁ NHÂN (AI ĐỒNG BỘ)
                    </h4>
                    <span className="text-[10px] text-indigo-600 bg-indigo-50 font-bold px-2 py-0.5 rounded-md">Tự động liên kết Sổ Đầu Bài</span>
                  </div>

                  {!detailStudent.diary || detailStudent.diary.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                      🕒 Chưa có ghi chép nhật ký rèn luyện nào từ sổ đầu bài AI.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                      {detailStudent.diary.slice().reverse().map((entry: any) => (
                        <div 
                          key={entry.id} 
                          className={`p-3.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
                            entry.type === "khen_thuong" 
                              ? "bg-emerald-55/10 border-emerald-100 text-emerald-950" 
                              : "bg-rose-55/10 border-rose-100 text-rose-950"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className={`px-2 py-0.5 rounded-md ${entry.type === "khen_thuong" ? "bg-emerald-100 text-emerald-850" : "bg-rose-100 text-rose-850"}`}>
                              {entry.type === "khen_thuong" ? "✨ Tuyên dương" : "⚠️ Nhắc nhở vi phạm"}
                            </span>
                            <div className="flex items-center gap-2 text-slate-400 font-mono font-medium">
                              <span>Môn: {entry.subject || "Sinh hoạt"}</span>
                              <span>•</span>
                              <span>{entry.date}</span>
                            </div>
                          </div>
                          <p className="text-xs font-bold leading-relaxed">
                            {entry.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDetailStudent(null)}
                className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isSavingDetail}
                onClick={handleSaveDetailStudent}
                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-1.5 cursor-pointer"
              >
                {isSavingDetail ? (
                  <>Đang đồng bộ...</>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Lưu học bạ & nhận xét
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
