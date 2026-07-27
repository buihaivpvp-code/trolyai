/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Student, ClassJournalEntry } from "../types";
import { apiFetch } from "../utils/api";
import { 
  Sparkles, 
  Calendar, 
  BookOpen, 
  Clock, 
  FileText, 
  UserCheck, 
  UserX, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Loader2, 
  AlertCircle,
  TrendingUp,
  Search,
  Filter,
  Pencil
} from "lucide-react";

export default function ClassJournal({ user }: { user?: any } = {}) {
  const [students, setStudents] = useState<Student[]>([]);
  const [journals, setJournals] = useState<ClassJournalEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form fields
  const [date, setDate] = useState(() => {
    // Current local date in YYYY-MM-DD
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(today.getTime() - tzOffset)).toISOString().slice(0, 10);
    return localISOTime;
  });
  const [lessonNumber, setLessonNumber] = useState<number>(1);
  const [subject, setSubject] = useState<string>("Toán");
  const [lessonTopic, setLessonTopic] = useState<string>("");
  const [teacherComment, setTeacherComment] = useState<string>("");

  // AI Analyzed States
  const [analyzing, setAnalyzing] = useState(false);
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  
  const [evaluation, setEvaluation] = useState("");
  const [orderliness, setOrderliness] = useState<"Tốt" | "Khá" | "Trung bình" | "Yếu">("Tốt");
  const [studentPraise, setStudentPraise] = useState<{ studentId?: string; studentName: string; note: string }[]>([]);
  const [studentInfractions, setStudentInfractions] = useState<{ studentId?: string; studentName: string; note: string }[]>([]);

  // Filtering list
  const [filterDate, setFilterDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
    fetchJournals();
  }, [user]);

  const fetchStudents = async () => {
    try {
      const res = await apiFetch("/api/students");
      if (res.ok) {
        let data = await res.json() as Student[];
        if (user && user.classCode) {
          data = data.filter((s: Student) => s.schoolClass === user.classCode);
        }
        setStudents(data);
      }
    } catch (e) {
      console.error("Lỗi tải danh sách học sinh: ", e);
    }
  };

  const fetchJournals = async () => {
    try {
      const res = await apiFetch("/api/journal");
      if (res.ok) {
        const data = await res.json();
        setJournals(data);
      }
    } catch (e) {
      console.error("Lỗi tải sổ đầu bài: ", e);
    }
  };

  const handleAnalyzeWithAI = async () => {
    if (!teacherComment.trim()) {
      setError("Vui lòng nhập lời phê thô của giáo viên để AI phân tích.");
      return;
    }
    setError(null);
    setAnalyzing(true);
    setIsAnalyzed(false);

    try {
      const response = await apiFetch("/api/gemini/analyze-journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          lessonNumber,
          subject,
          lessonTopic: lessonTopic || "Bài học ôn tập hằng ngày",
          teacherComment,
          classCode: user?.classCode
        })
      });

      if (!response.ok) {
        throw new Error("Lỗi máy chủ không thể phân tích lời phê.");
      }

      const data = await response.json();
      if (data.subject) {
        setSubject(data.subject);
      }
      setEvaluation(data.evaluation || "");
      setOrderliness(data.orderliness || "Tốt");
      setStudentPraise(data.studentPraise || []);
      setStudentInfractions(data.studentInfractions || []);
      setIsAnalyzed(true);
      setSuccessMsg("AI đã bóc tách & phân tích thành công! Thầy cô có thể kiểm tra và tùy chỉnh trước khi lưu.");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (e: any) {
      setError(e.message || "Lỗi kết nối dịch vụ phân tích AI.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveJournal = async () => {
    if (!evaluation.trim()) {
      setError("Nhận xét chính thức không được để trống.");
      return;
    }
    setError(null);
    setSaving(true);

    try {
      const url = editingId ? `/api/journal/${editingId}` : "/api/journal";
      const method = editingId ? "PUT" : "POST";
      const response = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          lessonNumber,
          subject,
          lessonTopic: lessonTopic || "Bài học ôn tập hằng ngày",
          teacherComment,
          evaluation,
          orderliness,
          studentPraise,
          studentInfractions
        })
      });

      if (!response.ok) {
        throw new Error(editingId ? "Lỗi không thể cập nhật sổ đầu bài." : "Lỗi không thể lưu sổ đầu bài.");
      }

      const updatedEntry = await response.json();
      if (editingId) {
        setJournals(prev => prev.map(j => j.id === editingId ? updatedEntry : j));
        setSuccessMsg(`Đã cập nhật thành công tiết học môn ${subject} trong Sổ đầu bài.`);
      } else {
        setJournals(prev => [...prev, updatedEntry]);
        setSuccessMsg(`Đã ghi nhận thành công tiết học môn ${subject} vào Sổ đầu bài chính và đồng bộ học bạ/nhật ký rèn luyện học sinh.`);
      }
      
      // Reset Form
      setEditingId(null);
      setLessonTopic("");
      setTeacherComment("");
      setEvaluation("");
      setStudentPraise([]);
      setStudentInfractions([]);
      setIsAnalyzed(false);
      
      // Re-fetch students to update their personal log diaries dynamically
      fetchStudents();

      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (e: any) {
      setError(e.message || "Lỗi đồng bộ cơ sở dữ liệu.");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (journal: ClassJournalEntry) => {
    setEditingId(journal.id);
    setDate(journal.date);
    setLessonNumber(journal.lessonNumber);
    setSubject(journal.subject);
    setLessonTopic(journal.lessonTopic);
    setTeacherComment(journal.teacherComment);
    setEvaluation(journal.evaluation);
    setOrderliness(journal.orderliness);
    setStudentPraise(journal.studentPraise || []);
    setStudentInfractions(journal.studentInfractions || []);
    setIsAnalyzed(true);
    
    // Scroll to top form smoothly
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setLessonTopic("");
    setTeacherComment("");
    setEvaluation("");
    setStudentPraise([]);
    setStudentInfractions([]);
    setIsAnalyzed(false);
  };

  const handleDeleteJournal = async (id: string) => {
    if (!confirm("Thầy cô có chắc chắn muốn xóa mục Sổ đầu bài này?")) return;
    setError(null);
    try {
      const res = await apiFetch(`/api/journal/${id}`, { method: "DELETE" });
      if (res.ok) {
        setJournals(prev => prev.filter(j => j.id !== id));
        setSuccessMsg("Đã xóa tiết học khỏi Sổ Đầu Bài.");
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Không thể xóa tiết học khỏi Sổ Đầu Bài.");
        setTimeout(() => setError(null), 5000);
      }
    } catch (e: any) {
      console.error("Lỗi khi xóa tiết học:", e);
      setError("Lỗi kết nối hoặc lỗi hệ thống khi xóa tiết học.");
      setTimeout(() => setError(null), 5000);
    }
  };

  // Student list helpers
  const handleAddPraise = () => {
    setStudentPraise(prev => [...prev, { studentId: students[0]?.id || "", studentName: students[0]?.name || "", note: "Phát biểu hăng hái" }]);
  };

  const handleAddInfraction = () => {
    setStudentInfractions(prev => [...prev, { studentId: students[0]?.id || "", studentName: students[0]?.name || "", note: "Nói chuyện riêng" }]);
  };

  const handleUpdatePraise = (index: number, field: "studentId" | "note", value: string) => {
    setStudentPraise(prev => {
      const updated = [...prev];
      if (field === "studentId") {
        const matched = students.find(s => s.id === value);
        updated[index].studentId = value;
        updated[index].studentName = matched ? matched.name : "";
      } else {
        updated[index].note = value;
      }
      return updated;
    });
  };

  const handleUpdateInfraction = (index: number, field: "studentId" | "note", value: string) => {
    setStudentInfractions(prev => {
      const updated = [...prev];
      if (field === "studentId") {
        const matched = students.find(s => s.id === value);
        updated[index].studentId = value;
        updated[index].studentName = matched ? matched.name : "";
      } else {
        updated[index].note = value;
      }
      return updated;
    });
  };

  const handleRemovePraise = (index: number) => {
    setStudentPraise(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleRemoveInfraction = (index: number) => {
    setStudentInfractions(prev => prev.filter((_, idx) => idx !== index));
  };

  // Filter & Search Logic
  const filteredJournals = journals.filter(j => {
    const matchesDate = !filterDate || j.date === filterDate;
    const matchesQuery = !searchQuery || 
      j.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.lessonTopic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.evaluation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.teacherComment.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDate && matchesQuery;
  });

  return (
    <div className="space-y-8" id="ai-class-journal-root">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT PANEL: INPUT FORM & AI MODULE (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
            <h3 className="font-bold text-sm text-slate-800 flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                1. Khởi tạo Thông tin Tiết học & Ghi chép
              </span>
              {editingId && (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                  <Pencil className="w-2.5 h-2.5" /> ĐANG SỬA
                </span>
              )}
            </h3>

            {editingId && (
              <div className="bg-amber-50/70 border border-amber-150 p-3.5 rounded-xl flex items-center justify-between text-xs text-amber-900 font-bold animate-fadeIn">
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Thầy cô đang chỉnh sửa tiết học. Hãy cập nhật thông tin dưới đây.</span>
                </div>
                <button 
                  onClick={handleCancelEdit}
                  className="text-[10px] font-extrabold bg-white border border-amber-200 hover:bg-amber-100 px-2.5 py-1 rounded-md text-amber-800 transition-colors cursor-pointer"
                >
                  HỦY SỬA ❌
                </button>
              </div>
            )}

            {/* Error and Success alerts */}
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-900 text-xs p-3.5 rounded-xl flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-bold">{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-900 text-xs p-3.5 rounded-xl flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">{successMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Date selection module */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Chọn Ngày Ghi Sổ</label>
                <input 
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white transition-all text-slate-800"
                />
              </div>

              {/* Lesson selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Tiết Thứ mấy</label>
                <select 
                  value={lessonNumber}
                  onChange={(e) => setLessonNumber(Number(e.target.value))}
                  className="w-full text-xs font-bold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white transition-all text-slate-800"
                >
                  <option value={1}>Tiết 1 (Sáng)</option>
                  <option value={2}>Tiết 2 (Sáng)</option>
                  <option value={3}>Tiết 3 (Sáng)</option>
                  <option value={4}>Tiết 4 (Sáng)</option>
                  <option value={5}>Tiết 5 (Chiều)</option>
                  <option value={6}>Tiết 6 (Chiều)</option>
                </select>
              </div>

            </div>

            {/* Lesson topic */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500">Tên bài dạy / Chủ đề bài học</label>
              <div className="relative">
                <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input 
                  type="text"
                  placeholder="Ví dụ: Ôn tập các phép tính trong phạm vi 100.000 (Trang 12)"
                  value={lessonTopic}
                  onChange={(e) => setLessonTopic(e.target.value)}
                  className="w-full text-xs font-semibold pl-10 pr-4 py-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl focus:bg-white transition-all text-slate-800"
                />
              </div>
            </div>

            {/* Raw Teacher comments */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-500">Nhận xét thô của thầy cô (AI quét tên bóc tách)</label>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-sm">Vui lòng viết đầy đủ tên học sinh</span>
              </div>
              <textarea 
                rows={4}
                placeholder="Ví dụ: Giờ học Toán hôm nay rất vui, học sinh hiểu bài nhanh. Minh giải bài toán nâng cao rất xuất sắc và hăng hái phát biểu được tuyên dương. Tuy nhiên, Nam còn làm việc riêng bị cô nhắc nhở. An quên mang sách giáo khoa."
                value={teacherComment}
                onChange={(e) => setTeacherComment(e.target.value)}
                className="w-full text-xs font-medium p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl focus:bg-white transition-all text-slate-800 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              id="btn-analyze-journal"
              disabled={analyzing}
              onClick={handleAnalyzeWithAI}
              className="w-full py-3.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  ĐANG PHÂN TÍCH LỜI PHÊ BẰNG TRÍ TUỆ NHÂN TẠO...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  CHẠY AI PHÂN TÍCH LỜI PHÊ & QUÉT TÊN LỚP HỌC
                </>
              )}
            </button>

          </div>

          {/* AI INTERMEDIARY RESULTS PREVIEW (Only visible after analysis or if ready) */}
          {isAnalyzed && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  2. Kết quả AI phân loại & bóc tách học sinh
                </h3>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 font-bold px-2.5 py-1 rounded-full">
                  Kiểm tra trước khi đồng bộ
                </span>
              </div>

              {/* Subject (AI detected, editable) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                  Môn Học (AI tự động nhận diện)
                </label>
                <input 
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ví dụ: Toán, Tiếng Việt, Tiếng Anh..."
                  className="w-full text-xs font-bold p-3 border border-indigo-150 rounded-xl text-indigo-950 bg-indigo-50/20 focus:bg-white focus:border-indigo-300 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                />
              </div>

              {/* Evaluation summary */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Nội dung đánh giá Sổ đầu bài chính (Đã chuốt văn phong)</label>
                <textarea 
                  rows={2}
                  value={evaluation}
                  onChange={(e) => setEvaluation(e.target.value)}
                  className="w-full text-xs font-bold p-3 border border-slate-200 rounded-xl text-slate-800 bg-emerald-50/20"
                />
              </div>

              {/* Orderliness select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Xếp loại trật tự nề nếp</label>
                <div className="flex gap-2">
                  {(["Tốt", "Khá", "Trung bình", "Yếu"] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setOrderliness(level)}
                      className={`flex-1 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                        orderliness === level 
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs" 
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Praised Students Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    Học sinh được biểu dương / khen ngợi
                  </label>
                  <button 
                    onClick={handleAddPraise}
                    className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md hover:bg-indigo-100 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Thêm thủ công
                  </button>
                </div>

                {studentPraise.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Không phát hiện học sinh nào được tuyên dương.</p>
                ) : (
                  <div className="space-y-2">
                    {studentPraise.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-emerald-50/30 p-2.5 rounded-xl border border-emerald-100/50">
                        <select
                          value={item.studentId || ""}
                          onChange={(e) => handleUpdatePraise(idx, "studentId", e.target.value)}
                          className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800"
                        >
                          <option value="">-- Chọn học sinh --</option>
                          {students.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.schoolClass})</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={item.note}
                          onChange={(e) => handleUpdatePraise(idx, "note", e.target.value)}
                          placeholder="Lý do khen thưởng"
                          className="flex-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800"
                        />
                        <button 
                          onClick={() => handleRemovePraise(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Infracted Students Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-rose-700 flex items-center gap-1">
                    <UserX className="w-4 h-4 text-rose-600" />
                    Học sinh có lỗi / bị nhắc nhở
                  </label>
                  <button 
                    onClick={handleAddInfraction}
                    className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md hover:bg-indigo-100 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Thêm thủ công
                  </button>
                </div>

                {studentInfractions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Không phát hiện học sinh vi phạm.</p>
                ) : (
                  <div className="space-y-2">
                    {studentInfractions.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-rose-50/30 p-2.5 rounded-xl border border-rose-100/50">
                        <select
                          value={item.studentId || ""}
                          onChange={(e) => handleUpdateInfraction(idx, "studentId", e.target.value)}
                          className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800"
                        >
                          <option value="">-- Chọn học sinh --</option>
                          {students.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.schoolClass})</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={item.note}
                          onChange={(e) => handleUpdateInfraction(idx, "note", e.target.value)}
                          placeholder="Lỗi vi phạm / lí do nhắc nhở"
                          className="flex-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800"
                        />
                        <button 
                          onClick={() => handleRemoveInfraction(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm Submit button */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                {editingId && (
                  <button
                    onClick={handleCancelEdit}
                    type="button"
                    className="flex-1 py-4 rounded-xl text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-700 shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-200"
                  >
                    HỦY CHỈNH SỬA
                  </button>
                )}
                <button
                  id="btn-confirm-save-journal"
                  disabled={saving}
                  onClick={handleSaveJournal}
                  className={`py-4 rounded-xl text-xs font-black text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 ${
                    editingId ? "bg-amber-600 hover:bg-amber-700 flex-[2]" : "bg-emerald-600 hover:bg-emerald-700 w-full"
                  }`}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {editingId ? "ĐANG CẬP NHẬT..." : "ĐANG LƯU SỔ ĐẦU BÀI & ĐỒNG BỘ ĐỒNG LOẠT HỌC SINH..."}
                    </>
                  ) : (
                    <>
                      {editingId ? <Sparkles className="w-4 h-4 text-amber-200" /> : <CheckCircle className="w-4 h-4" />}
                      {editingId ? "CẬP NHẬT GHI SỔ & ĐỒNG BỘ 🔄" : "XÁC NHẬN LƯU GHI SỔ & ĐỒNG BỘ HỌC BẠ HỌC SINH 🟢"}
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

        </div>

        {/* RIGHT PANEL: CLASS JOURNAL HISTORY LOG BOOK (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            
            <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                SỔ ĐẦU BÀI CHÍNH THỨC (LỚP 4A)
              </h3>
              <p className="text-[11px] text-slate-400">Xem và lọc lịch sử các tiết học đã ghi sổ đầu bài chính thức thành công.</p>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-[10px] text-slate-400 block uppercase">Lọc theo Ngày</span>
                <input 
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-150 rounded-lg p-2 font-semibold text-slate-800"
                />
              </div>
              <div className="space-y-1">
                <span className="font-bold text-[10px] text-slate-400 block uppercase">Tìm kiếm từ khóa</span>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
                  <input 
                    type="text"
                    value={searchQuery}
                    placeholder="Môn, bài học..."
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 rounded-lg pl-7 pr-2 py-2 font-semibold text-slate-800"
                  />
                </div>
              </div>
            </div>

            {filterDate || searchQuery ? (
              <div className="flex justify-between items-center bg-indigo-50/50 p-2 rounded-lg text-[10px]">
                <span className="font-bold text-indigo-700">Đang kích hoạt bộ lọc tìm kiếm</span>
                <button 
                  onClick={() => { setFilterDate(""); setSearchQuery(""); }}
                  className="text-indigo-600 font-bold hover:underline cursor-pointer"
                >
                  Xóa bộ lọc
                </button>
              </div>
            ) : null}

            {/* List entries */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredJournals.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Chưa tìm thấy tiết học nào khớp với bộ lọc của thầy cô.
                </div>
              ) : (
                filteredJournals.slice().reverse().map((journal) => (
                  <div key={journal.id} className="border border-slate-150 hover:border-slate-300 rounded-xl p-4 bg-white transition-all space-y-3 relative group">
                    
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="font-bold text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                            Tiết {journal.lessonNumber}
                          </span>
                          <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {journal.subject}
                          </span>
                        </div>
                        <p className="font-extrabold text-xs text-slate-800 mt-1.5 break-words">
                          Bài: {journal.lessonTopic}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1 shrink-0">
                        <span className="block text-[10px] text-slate-400 font-mono font-medium">{journal.date}</span>
                        
                        {/* Edit & Delete Action Buttons */}
                        <div className="flex items-center gap-1 mt-0.5">
                          <button
                            onClick={() => handleStartEdit(journal)}
                            className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Sửa tiết học"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteJournal(journal.id)}
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Xóa tiết học"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full mt-1 ${
                          journal.orderliness === "Tốt" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                            : journal.orderliness === "Khá"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}>
                          Nề nếp: {journal.orderliness}
                        </span>
                      </div>
                    </div>

                    {/* Official Evaluation */}
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Lời phê chuẩn hóa (Sổ đầu bài chính)</span>
                      <p className="text-xs text-slate-700 font-bold leading-normal">
                        {journal.evaluation}
                      </p>
                    </div>

                    {/* Praised & infractions in lists */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      
                      {/* Praised list */}
                      <div className="space-y-1">
                        <span className="font-bold text-emerald-600 block">⭐ Biểu dương:</span>
                        {journal.studentPraise.length === 0 ? (
                          <span className="text-slate-400 italic">Không có</span>
                        ) : (
                          <ul className="list-disc pl-3.5 space-y-0.5 text-slate-600 font-semibold">
                            {journal.studentPraise.map((p, pIdx) => (
                              <li key={pIdx}>
                                <b>{p.studentName.split(" ").pop()}</b>: {p.note}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Infractions list */}
                      <div className="space-y-1">
                        <span className="font-bold text-rose-600 block">⚠️ Nhắc nhở:</span>
                        {journal.studentInfractions.length === 0 ? (
                          <span className="text-slate-400 italic">Không có</span>
                        ) : (
                          <ul className="list-disc pl-3.5 space-y-0.5 text-slate-600 font-semibold">
                            {journal.studentInfractions.map((i, iIdx) => (
                              <li key={iIdx}>
                                <b>{i.studentName.split(" ").pop()}</b>: {i.note}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                    </div>

                  </div>
                ))
              )}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
