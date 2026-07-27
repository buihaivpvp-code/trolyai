/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { LessonPlan, LessonPlanActivity } from "../types";
import { getCachedItem } from "../knowledgeCache";
import { apiFetch } from "../utils/api";
import { 
  BookOpen, 
  FileText, 
  Download, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Eye, 
  Cpu, 
  Search, 
  Database, 
  ArrowRight, 
  File, 
  FolderOpen, 
  Check, 
  RefreshCw 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DocumentItem {
  id: string;
  name: string;
  category: "Giáo án" | "Sách giáo khoa" | "Tài liệu tham khảo";
  grade: string;
  subject: string;
  bookSeries?: string;
  refGroup?: string;
  fileName: string;
  fileSize: string;
  fileExtension: string;
  uploadDate: string;
  notes?: string;
}

interface SearchResult {
  analysis: string;
  relevantDocs: Array<{
    id: string;
    name: string;
    relevanceScore: number;
    matchReason: string;
  }>;
  pedagogicalSuggestion: string;
  suggestedTopic: string;
}

export default function LessonPlanEditor({ user }: { user?: any } = {}) {
  // Main Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<"create" | "search">("create");

  // Lesson Plan Generator State
  const [grade, setGrade] = useState<number>(4);
  const [curr, setCurr] = useState<"Kết nối tri thức" | "Chân trời sáng tạo" | "Cánh diều">("Kết nối tri thức");
  const [subject, setSubject] = useState<string>("Khoa học");
  const [topic, setTopic] = useState<string>("Vòng tuần hoàn của nước trong tự nhiên");
  const [customFocus, setCustomFocus] = useState<string>("");

  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  // Document Repository Integration State
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const getStorageKey = () => {
    return user && user.id ? `eduai_documents_repo_${user.id}` : "eduai_documents_repo";
  };

  // Sync documents from localStorage on mount and when sub-tab switches to search or user changes
  const loadDocumentsFromRepo = () => {
    const key = getStorageKey();
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setDocuments(JSON.parse(saved));
      } catch (e) {
        console.error("Error reading saved documents", e);
      }
    } else {
      setDocuments([]);
    }
  };

  useEffect(() => {
    loadDocumentsFromRepo();
  }, [activeSubTab, user]);

  // Load sample documents to help teachers test the search instantly
  const handleLoadSamples = () => {
    const samples: DocumentItem[] = [
      {
        id: "sample-1",
        name: "Giáo án Toán lớp 4 - Bài 12: Biểu thức có chứa chữ (Cánh Diều)",
        category: "Giáo án",
        grade: "Khối 4",
        subject: "Toán",
        fileName: "Giao_An_Toan_Lop_4_Canh_Dieu_B12.docx",
        fileSize: "1.4 MB",
        fileExtension: ".docx",
        uploadDate: "23/06/2026 08:30",
        notes: "Giáo án soạn theo Công văn 2345 bám sát hoạt động khởi động, hình thành kiến thức, thực hành và vận dụng."
      },
      {
        id: "sample-2",
        name: "Sách giáo khoa Tiếng Việt lớp 1 - Tập 1 (Kết nối tri thức)",
        category: "Sách giáo khoa",
        grade: "Khối 1",
        subject: "Tiếng Việt",
        bookSeries: "Kết nối tri thức với cuộc sống",
        fileName: "SGK_Tieng_Viet_1_Tap_1_KNTT.pdf",
        fileSize: "12.8 MB",
        fileExtension: ".pdf",
        uploadDate: "23/06/2026 08:35",
        notes: "Tài liệu tham khảo số hóa dùng để minh họa bài giảng trên bảng tương tác thông minh lớp 1."
      },
      {
        id: "sample-3",
        name: "Đề thi học kỳ II môn Tiếng Anh lớp 5 - Có File Audio nghe mẫu",
        category: "Tài liệu tham khảo",
        grade: "Khối 5",
        subject: "Tiếng Anh",
        refGroup: "Đề kiểm tra định kỳ",
        fileName: "De_Thi_HK2_English_Grade_5_With_Key.pdf",
        fileSize: "4.2 MB",
        fileExtension: ".pdf",
        uploadDate: "23/06/2026 09:10",
        notes: "Đề kiểm tra cuối kỳ gồm đầy đủ 4 kỹ năng Nghe - Nói - Đọc - Viết thiết kế theo chuẩn Bộ Giáo Dục."
      },
      {
        id: "sample-4",
        name: "Phiếu bài tập ôn tập cuối tuần 16 môn Toán lớp 3",
        category: "Tài liệu tham khảo",
        grade: "Khối 3",
        subject: "Toán",
        refGroup: "Phiếu bài tập cuối tuần",
        fileName: "Phieu_BT_Toan_3_Tuan_16.pdf",
        fileSize: "850 KB",
        fileExtension: ".pdf",
        uploadDate: "24/06/2026 06:45",
        notes: "Phiếu ôn luyện cuối tuần giúp học sinh củng cố kiến thức về phép nhân, phép chia trong phạm vi 1000."
      },
      {
        id: "sample-5",
        name: "Video tư liệu: Quá trình hạt đậu nảy mầm (Tự nhiên & Xã hội lớp 2)",
        category: "Tài liệu tham khảo",
        grade: "Khối 2",
        subject: "Tự nhiên & Xã hội",
        refGroup: "Tranh ảnh & Video minh họa",
        fileName: "Nay_Mam_Dau_Xanh_TimeLapse.mp4",
        fileSize: "18.5 MB",
        fileExtension: ".mp4",
        uploadDate: "24/06/2026 06:50",
        notes: "Video Timelapse sắc nét 1080p hỗ trợ bài dạy về sự lớn lên của thực vật."
      }
    ];
    const key = getStorageKey();
    localStorage.setItem(key, JSON.stringify(samples));
    setDocuments(samples);
    setFeedbackMessage("Đã nạp thành công 5 tài liệu sư phạm tiểu học mẫu vào Kho tài liệu!");
    setTimeout(() => setFeedbackMessage(""), 4000);
  };

  // Perform AI-powered Document Search
  const handleAISearch = async (queryToSearch = searchQuery) => {
    if (!queryToSearch.trim()) return;
    setIsSearching(true);
    setSearchError("");
    setSearchResult(null);

    try {
      const response = await apiFetch("/api/gemini/document-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryToSearch,
          documents: documents
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResult(data);
      } else {
        const errData = await response.json();
        setSearchError(errData.error || "Gặp sự cố không mong muốn khi tìm kiếm tài liệu bằng AI.");
      }
    } catch (e: any) {
      setSearchError("Lỗi kết nối máy chủ AI. Vui lòng kiểm tra lại môi trường dự án.");
    } finally {
      setIsSearching(false);
    }
  };

  // Pre-fill the lesson creator when teacher wants to build a lesson plan directly from search
  const handleSelectDocForLesson = (docName: string, docGrade: string, docSubject: string) => {
    // Standardize Grade string (e.g. "Khối 4" -> 4)
    const matchedGrade = docGrade.match(/\d+/);
    const parsedGrade = matchedGrade ? Number(matchedGrade[0]) : 4;

    setGrade(parsedGrade);
    setSubject(docSubject === "Tất cả" ? "Toán" : docSubject);
    
    // Cleanse topic name from file name
    const cleanTopic = docName
      .replace(/Giáo án|Sách giáo khoa|Tài liệu tham khảo/gi, "")
      .replace(/lớp \d+/gi, "")
      .replace(/Bài \d+:/gi, "")
      .replace(/-\s*|-|đầy đủ|ôn tập|cuối tuần/gi, " ")
      .replace(/\([^)]*\)/g, "")
      .replace(/\.[^/.]+$/, "")
      .trim();

    setTopic(cleanTopic || docName);
    
    // Switch Sub-tab to editor
    setActiveSubTab("create");
    setFeedbackMessage(`Đã nạp thông tin bài giảng: "${cleanTopic || docName}" vào bộ biên soạn giáo án!`);
    setTimeout(() => setFeedbackMessage(""), 4000);
  };

  // Mock download trigger
  const handleDownloadDoc = (doc: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const content = `========================================================================
                      EDUAI - KHO TÀI LIỆU SƯ PHẠM TIỂU HỌC
========================================================================
MÔ PHỎNG TỆP TIN TẢI XUỐNG THÀNH CÔNG

Tên tài liệu: ${doc.name}
Phân loại chính: ${doc.category}
Khối lớp: ${doc.grade}
Môn học: ${doc.subject}
Tên tệp gốc: ${doc.fileName || `${doc.name}.pdf`}
Dung lượng: ${doc.fileSize || "1.5 MB"}

Ghi chú đính kèm: 
${doc.notes || "Không có ghi chú thêm."}
========================================================================`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.name.replace(/[^a-zA-Z0-9]/g, "_")}_download.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCreateLessonPlan = async () => {
    setLoading(true);
    setErrorText("");
    setLessonPlan(null);

    // 1. Hybrid Check: Look up in our static zero-cost cache first!
    const cached = getCachedItem(grade, subject, topic);
    if (cached && !customFocus) {
      // Simulate slight load for design feel, then load zero cost
      setTimeout(() => {
        setLessonPlan(cached.lessonPlan);
        setLoading(false);
      }, 600);
      return;
    }

    // 2. Cache miss or Teacher has custom preferences: Invoke Gemini API server-side
    try {
      const response = await apiFetch("/api/gemini/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade,
          subject,
          topic,
          curriculum: curr,
          customFocus
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLessonPlan(data);
      } else {
        const errData = await response.json();
        setErrorText(errData.error || "Gặp sự cố không mong muốn khi gọi Trí tuệ nhân tạo.");
      }
    } catch (e: any) {
      setErrorText("Lỗi mạng: Không thể kết nối với máy chủ AI. Vui lòng kiểm tra lại môi trường dự án.");
    } finally {
      setLoading(false);
    }
  };

  // Microsoft Word .doc Export Handler
  const handleExportWord = () => {
    if (!lessonPlan) return;

    const filename = `GIÁO ÁN_${lessonPlan.subject.toUpperCase()}_LỚP_${lessonPlan.grade}_${lessonPlan.topic.replace(/\s+/g, "_")}.doc`;

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Giáo án tiểu học EduAI</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.5; color: #000000; }
          .header-text { text-align: center; font-weight: bold; margin-bottom: 25px; }
          .title-text { text-align: center; font-size: 16pt; font-weight: bold; color: #000000; margin-bottom: 30px; text-transform: uppercase; }
          .section-title { font-weight: bold; font-size: 14pt; margin-top: 20px; margin-bottom: 10px; text-decoration: underline; }
          .bullet-list { margin-left: 20px; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
          th, td { border: 1px solid #000000; padding: 10px; text-align: left; vertical-align: top; font-size: 11pt; }
          th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
          .activity-header { font-weight: bold; font-size: 12pt; background-color: #e6e6e6; padding: 8px; margin-top: 15px; border: 1px solid #000000; }
        </style>
      </head>
      <body>
        <div class="header-text">
          SỞ GIÁO DỤC VÀ ĐÀO TẠO VIỆT NAM<br>
          TRƯỜNG TIỂU HỌC QUỐC GIA CHUẨN MẪU
        </div>
        
        <div class="title-text">
          KẾ HOẠCH BÀI DẠY (GIÁO ÁN CHUẨN 2345)<br>
          MÔN HỌC: ${lessonPlan.subject.toUpperCase()} - KHỐI LỚP ${lessonPlan.grade}<br>
          SÁCH GIÁO KHOA: Bộ sách ${lessonPlan.curriculum}<br>
          BÀI DẠY: ${lessonPlan.topic.toUpperCase()}
        </div>

        <div class="section-title">I. MỤC TIÊU BÀI HỌC:</div>
        <ul class="bullet-list">
          ${lessonPlan.objectives.map(obj => `<li>${obj}</li>`).join("")}
        </ul>

        <div class="section-title">II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU:</div>
        <ul class="bullet-list">
          <li><b>Thiết bị của Giáo viên:</b> ${lessonPlan.materials.teacher.join(", ")}</li>
          <li><b>Thiết bị của Học sinh:</b> ${lessonPlan.materials.student.join(", ")}</li>
        </ul>

        <div class="section-title">III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU (HOẠT ĐỘNG SONG HÀNH):</div>
        
        ${Object.entries(lessonPlan.activities).map(([key, act]: [any, LessonPlanActivity]) => `
          <div class="activity-header">${act.title} (Thời lượng: ${act.duration})</div>
          <table>
            <thead>
              <tr>
                <th style="width: 50%;">HOẠT ĐỘNG CỦA GIÁO VIÊN</th>
                <th style="width: 50%;">HOẠT ĐỘNG CỦA HỌC SINH</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${act.teacherActions.replace(/\n/g, "<br>")}</td>
                <td>${act.studentActions.replace(/\n/g, "<br>")}</td>
              </tr>
            </tbody>
          </table>
        `).join("")}

        <br><br>
        <table style="border: none !important;">
          <tr style="border: none !important;">
            <td style="border: none !important; width: 50%; text-align: center;">
              <b>BAN GIÁM HIỆU DUYỆT</b><br>
              <i>(Ký và ghi rõ họ tên)</i>
            </td>
            <td style="border: none !important; width: 50%; text-align: center;">
              <b>GIÁO VIÊN CHỦ NHIỆM</b><br>
              <i>(Ký và ghi rõ họ tên)</i>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + htmlContent], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getCurriculumTag = () => {
    const cached = getCachedItem(grade, subject, topic);
    if (cached && !customFocus) {
      return {
        text: "Knowledge Cache (Vận hành $0 API)",
        desc: "Sản phẩm được lấy lập tức từ cơ sở dữ liệu mẫu quốc gia. Tiết kiệm 100% token chi phí đại lý của bạn!",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200"
      };
    }
    return {
      text: "AI Customization (Gọi API Gemini-3.5)",
      desc: "Sinh tự động theo thời gian thực dùng trí tuệ tư duy mô hình để tùy biến hoàn chỉnh cho riêng bài giảng này.",
      badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-200"
    };
  };

  const currentHybridState = getCurriculumTag();

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-3xs" id="lesson-plan-editor">
      
      {/* 1. Header Hero section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-500" />
            AI Giáo Án 2345 & Sách Giáo Khoa
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Biên soạn giáo án song hành tương tác, kết hợp tìm kiếm và tra cứu AI trên kho tài liệu của Thầy/Cô.
          </p>
        </div>
        {lessonPlan && activeSubTab === "create" && (
          <button
            id="btn-export-word"
            onClick={handleExportWord}
            className="flex items-center justify-center gap-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors self-start cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            Tải File Word Giáo Án (.doc)
          </button>
        )}
      </div>

      {/* 2. Success/Feedback Toast Banner */}
      <AnimatePresence>
        {feedbackMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-emerald-800 text-xs font-semibold mb-6 shadow-3xs"
          >
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Sub-Tab Switcher (Biên soạn vs AI Search) */}
      <div className="flex border-b border-slate-150 mb-6 gap-2">
        <button
          onClick={() => setActiveSubTab("create")}
          className={`pb-3 px-4 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 cursor-pointer ${
            activeSubTab === "create"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Biên soạn giáo án 2345
        </button>
        <button
          onClick={() => setActiveSubTab("search")}
          className={`pb-3 px-4 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 cursor-pointer ${
            activeSubTab === "search"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Search className="w-4 h-4" />
          Tìm kiếm bằng AI (Grounded Search)
          <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
            {documents.length} tệp
          </span>
        </button>
      </div>

      {/* 4. Sub-Tab Content Rendering */}
      <AnimatePresence mode="wait">
        {activeSubTab === "create" ? (
          <motion.div
            key="create-tab"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
          >
            {/* INPUT CONTROLS SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 mb-6">
              {/* Grade */}
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Thông tin Khối Lớp</label>
                <select
                  id="select-grade"
                  value={grade}
                  onChange={(e) => setGrade(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:border-indigo-400"
                >
                  {[1, 2, 3, 4, 5].map(g => (
                    <option key={g} value={g}>Học tập Khối Lớp {g}</option>
                  ))}
                </select>
              </div>

              {/* Curriculum Book */}
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Bộ Sách Giáo Khoa</label>
                <select
                  id="select-curriculum"
                  value={curr}
                  onChange={(e) => setCurr(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:border-indigo-400"
                >
                  <option value="Kết nối tri thức">Kết nối tri thức với C.Sống</option>
                  <option value="Chân trời sáng tạo">Chân trời sáng tạo quốc nội</option>
                  <option value="Cánh diều">Sách Giáo khoa Cánh Diều VN</option>
                </select>
              </div>

              {/* School Subject */}
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Môn học</label>
                <input
                  id="input-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:border-indigo-400"
                  placeholder="Ví dụ: Khoa học, Toán, Tiếng Việt"
                />
              </div>

              {/* Topic */}
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tên Chủ Đề Bài Học</label>
                <input
                  id="input-topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:border-indigo-400"
                  placeholder="Ví dụ: Vòng tuần hoàn của nước..."
                />
              </div>

              {/* Custom Guidelines */}
              <div className="md:col-span-12">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center justify-between">
                  <span>YÊU CẦU TÙY CHỈNH NÂNG CAO (GIAO TÁC GEMINI AI)</span>
                  <span className="text-[10px] text-indigo-500 font-normal">Để trống để kích hoạt Knowledge cache miễn phí</span>
                </label>
                <textarea
                  id="textarea-custom"
                  rows={2}
                  value={customFocus}
                  onChange={(e) => setCustomFocus(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-700 focus:outline-none focus:border-indigo-400"
                  placeholder="Ví dụ: Cho thêm trò chơi đố vui hoạt động ngoài trời, thêm phần quà khích lệ trẻ em..."
                ></textarea>
              </div>

              <div className="md:col-span-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t border-slate-200/50 pt-4">
                <div className="text-xs max-w-sm sm:max-w-md">
                  <span className={`inline-block border text-[10px] px-2 py-0.5 rounded-md font-bold mb-1 ${currentHybridState.badgeClass}`}>
                    {currentHybridState.text}
                  </span>
                  <p className="text-slate-500 tracking-tight leading-normal">{currentHybridState.desc}</p>
                </div>
                <button
                  id="btn-create-lesson-plan"
                  onClick={handleCreateLessonPlan}
                  disabled={loading || !subject || !topic}
                  className={`w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition-all focus:ring-4 focus:ring-indigo-100 cursor-pointer`}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Đang biên soạn sư phạm...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Soạn Giáo án Tức Thì
                    </>
                  )}
                </button>
              </div>
            </div>

            {errorText && (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex gap-3 text-rose-700 text-sm mb-6" id="lesson-plan-error">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>{errorText}</p>
              </div>
            )}

            {/* RENDER PLAN OUTPUT */}
            {lessonPlan ? (
              <div className="space-y-6 animate-fade-in" id="lesson-plan-output">
                <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50/50 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    I. MỤC TIÊU TIỂU HỌC VÀ CHUẨN CẦN ĐẠT:
                  </h3>
                  <ul className="space-y-1.5 list-disc list-inside text-sm text-slate-600 pl-2">
                    {lessonPlan.objectives.map((obj, i) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="bg-white border border-slate-150 p-3 rounded-xl shadow-xs">
                      <span className="font-bold text-xs text-indigo-700 block mb-1">Thiết bị của Giáo viên (GV):</span>
                      <p className="text-xs text-slate-500">{lessonPlan.materials.teacher.join(", ")}</p>
                    </div>
                    <div className="bg-white border border-slate-150 p-3 rounded-xl shadow-xs">
                      <span className="font-bold text-xs text-emerald-700 block mb-1">Thiết bị của Học sinh (HS):</span>
                      <p className="text-xs text-slate-500">{lessonPlan.materials.student.join(", ")}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <FileText className="w-4 h-4 text-slate-600" />
                    II. TIẾN TRÌNH HOẠT ĐỘNG DẠY HỌC SONG HÀNH (THÔNG TƯ 2345):
                  </h3>

                  {Object.entries(lessonPlan.activities).map(([key, activity]: [any, LessonPlanActivity]) => {
                    return (
                      <div key={key} className="border border-slate-100 rounded-2xl overflow-hidden shadow-xs" id={`activity-${key}`}>
                        {/* Activity Banner */}
                        <div className="bg-slate-900 text-white px-4 py-2.5 flex justify-between items-center text-xs">
                          <span className="font-bold tracking-wide uppercase">{activity.title}</span>
                          <span className="bg-white/20 font-mono px-2 py-0.5 rounded-md font-semibold text-[11px] text-white">
                            Thời lượng ước tính: {activity.duration}
                          </span>
                        </div>

                        {/* Split Table Rows */}
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-150 bg-white">
                          {/* Teacher Activity column */}
                          <div className="p-4 text-slate-700 text-xs">
                            <span className="font-bold text-indigo-700 tracking-wider text-[10px] uppercase block mb-2 bg-indigo-50 px-2 py-1 rounded-sm w-fit">
                              HOẠT ĐỘNG CỦA GIÁO VIÊN
                            </span>
                            <p className="leading-relaxed whitespace-pre-line bg-indigo-50/10 p-3 rounded-lg border border-indigo-50">
                              {activity.teacherActions}
                            </p>
                          </div>

                          {/* Student Activity column */}
                          <div className="p-4 text-slate-700 text-xs">
                            <span className="font-bold text-emerald-700 tracking-wider text-[10px] uppercase block mb-2 bg-emerald-50 px-2 py-1 rounded-sm w-fit">
                              HOẠT ĐỘNG CỦA HỌC SINH
                            </span>
                            <p className="leading-relaxed whitespace-pre-line bg-emerald-50/10 p-3 rounded-lg border border-emerald-50">
                              {activity.studentActions}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              !loading && (
                <div className="flex flex-col items-center justify-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center px-4">
                  <BookOpen className="w-10 h-10 text-slate-300 mb-3" />
                  <span className="font-semibold text-slate-700 text-sm">Chưa có giáo án biên soạn</span>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Chọn Khối học, bộ sách và điền nội dung môn học. Hãy nhấn gõ nút "Soạn Giáo án Tức Thì" phía trên để trải nghiệm công nghệ hybrid cực kỳ hiện đại!
                  </p>
                </div>
              )
            )}
          </motion.div>
        ) : (
          <motion.div
            key="search-tab"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* Grounded Database Banner Status */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden shadow-xs">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
              <div>
                <span className="bg-indigo-500 text-white text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md tracking-wider">
                  Cơ sở dữ liệu liên kết
                </span>
                <h3 className="text-sm font-bold text-white mt-1.5 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-indigo-400" />
                  Học liệu từ Kho Tài Liệu của Thầy/Cô
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed max-w-xl">
                  Khi thầy cô tải lên các tệp giáo án hoặc sách giáo khoa ở tab <b>Kho Tài Liệu</b>, Trí tuệ nhân tạo Gemini sẽ đọc và lấy cơ sở đó để định hình câu trả lời sư phạm bám sát bài dạy.
                </p>
              </div>
              <div className="bg-white/10 px-4 py-2 rounded-xl text-center shrink-0 border border-white/5">
                <span className="text-[10px] text-slate-300 block uppercase font-medium">Kho hiện có</span>
                <span className="font-mono text-xl font-bold text-indigo-300">{documents.length} tài liệu</span>
              </div>
            </div>

            {/* Empty state & sample data loader */}
            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                <FolderOpen className="w-12 h-12 text-slate-350 mb-3" />
                <h4 className="font-bold text-slate-700 text-sm">Kho tài liệu hiện đang trống</h4>
                <p className="text-xs text-slate-400 mt-1.5 max-w-md leading-normal">
                  Chưa tìm thấy tệp giáo án hay sách giáo khoa nào trong cơ sở dữ liệu lưu trữ cục bộ. Hãy tải tệp lên trong mô-đun <b>Kho Tài Liệu</b> hoặc click nạp nhanh bộ mẫu dưới đây để thử nghiệm tính năng tìm kiếm AI:
                </p>
                <button
                  onClick={handleLoadSamples}
                  className="mt-4 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-5 rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Nạp 5 Tài liệu học liệu mẫu để thử nghiệm
                </button>
              </div>
            ) : (
              <>
                {/* Search query input */}
                <div className="bg-white border border-slate-150 p-4 rounded-2xl shadow-3xs space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAISearch()}
                      placeholder="Nhập nội dung cần tìm kiếm (Ví dụ: 'Tìm giáo án Toán lớp 4' hoặc 'Phương pháp dạy Tiếng Việt 1')..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-28 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:bg-white transition-all text-slate-800 font-medium"
                    />
                    <Search className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                    <button
                      onClick={() => handleAISearch()}
                      disabled={isSearching || !searchQuery.trim()}
                      className="absolute right-2 top-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      {isSearching ? "Đang tìm..." : "Tìm kiếm AI"}
                    </button>
                  </div>

                  {/* Quick-suggest queries chips */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
                    <span className="font-semibold text-slate-600">Gợi ý nhanh:</span>
                    {[
                      "Tìm giáo án Toán lớp 4 về biểu thức",
                      "Sách giáo khoa Tiếng Việt lớp 1",
                      "Tài liệu ôn tập Toán lớp 3",
                      "Quá trình nảy mầm lớp 2"
                    ].map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSearchQuery(q);
                          handleAISearch(q);
                        }}
                        className="bg-slate-50 border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 text-slate-600 hover:text-indigo-700 px-2.5 py-1 rounded-md transition-all text-[11px] font-medium cursor-pointer"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Loading State Animation */}
                {isSearching && (
                  <div className="flex flex-col items-center justify-center py-16 space-y-3">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin absolute" />
                      <Cpu className="w-5 h-5 text-indigo-600 animate-pulse" />
                    </div>
                    <div className="text-center space-y-1">
                      <span className="text-xs font-bold text-slate-700 block animate-pulse">Gemini đang thực hiện grounded search...</span>
                      <p className="text-[10px] text-slate-400 max-w-xs leading-normal">
                        Mô hình đang đọc sâu danh sách tệp đính kèm, trích xuất cấu trúc giáo trình và tổng hợp khuyến nghị sư phạm tương ứng.
                      </p>
                    </div>
                  </div>
                )}

                {/* Error Box */}
                {searchError && (
                  <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex gap-3 text-rose-700 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>{searchError}</p>
                  </div>
                )}

                {/* Search Results Display */}
                {searchResult && (
                  <div className="space-y-6 animate-fade-in">
                    
                    {/* 1. AI Synthesized Analysis Callout */}
                    <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 opacity-15">
                        <Sparkles className="w-16 h-16 text-indigo-500" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-indigo-600 text-white rounded-md p-1">
                          <Cpu className="w-4 h-4" />
                        </span>
                        <h4 className="font-bold text-slate-800 text-sm">Phân tích & Phản hồi từ Trợ lý AI:</h4>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line relative z-10 pl-1 font-medium">
                        {searchResult.analysis}
                      </p>
                    </div>

                    {/* 2. Matched Documents Cards List */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-700 text-xs flex items-center gap-1.5 uppercase tracking-wider pl-1">
                        <File className="w-4 h-4 text-indigo-500" />
                        Tài liệu tham chiếu phù hợp nhất ({searchResult.relevantDocs.length}):
                      </h4>

                      {searchResult.relevantDocs.length === 0 ? (
                        <div className="p-5 text-center bg-slate-50 border border-slate-150 rounded-xl text-xs text-slate-400">
                          Không tìm thấy tài liệu phù hợp trong Kho. Hãy tải tệp lên trong mô-đun Kho Tài Liệu để cập nhật cơ sở dữ liệu.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {searchResult.relevantDocs.map((matchDoc) => {
                            // Find full original document info from our list
                            const originalDoc = documents.find(d => d.id === matchDoc.id);
                            
                            return (
                              <div key={matchDoc.id} className="bg-white border border-slate-150 rounded-2xl p-4 shadow-3xs flex flex-col justify-between hover:border-indigo-300 transition-all relative overflow-hidden group">
                                <div className="absolute top-0 right-0 bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold px-3 py-1 rounded-bl-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                  {matchDoc.relevanceScore}% Khớp
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-start gap-2.5 pr-14">
                                    <FileText className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
                                    <div>
                                      <span className="font-bold text-slate-800 text-xs group-hover:text-indigo-700 transition-colors block leading-snug">
                                        {matchDoc.name}
                                      </span>
                                      {originalDoc && (
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="bg-slate-100 text-slate-600 text-[9px] px-1.5 py-0.5 rounded font-bold">
                                            {originalDoc.category}
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-medium">
                                            {originalDoc.subject} • {originalDoc.grade}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] text-slate-500 italic leading-relaxed">
                                    <b>Nhận diện AI:</b> {matchDoc.matchReason}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4 gap-2">
                                  {originalDoc && (
                                    <button
                                      onClick={(e) => handleDownloadDoc(originalDoc, e)}
                                      className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-[10px] font-bold py-1.5 px-2.5 rounded-md hover:bg-slate-50 transition-all cursor-pointer"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      Tải tài liệu mẫu
                                    </button>
                                  )}
                                  
                                  {/* Fast prefill and compile CTA */}
                                  <button
                                    onClick={() => handleSelectDocForLesson(
                                      matchDoc.name, 
                                      originalDoc?.grade || "Khối 4", 
                                      originalDoc?.subject || "Toán"
                                    )}
                                    className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] py-1.5 px-3.5 rounded-lg transition-all shadow-3xs cursor-pointer ml-auto"
                                  >
                                    <span>Chọn nhanh để Soạn Giáo án</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 3. Pedagogical Suggestion Callout */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
                      <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wider pl-1">
                        <BookOpen className="w-4 h-4 text-emerald-500" />
                        Gợi ý Sư phạm & Phương pháp giảng dạy:
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed pl-1 font-medium whitespace-pre-line">
                        {searchResult.pedagogicalSuggestion}
                      </p>
                    </div>

                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
