/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import pptxgen from "pptxgenjs";
import { SlideItem } from "../types";
import { getCachedItem } from "../knowledgeCache";
import { apiFetch } from "../utils/api";
import { 
  Sliders, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  Copy,
  Check, 
  MessageSquare, 
  Gamepad2, 
  Image as ImageIcon, 
  FileText, 
  Database,
  ArrowRight,
  Library,
  Download,
  Palette,
  MonitorPlay,
  BookOpen,
  Target,
  Layout,
  Zap
} from "lucide-react";

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

export default function SlideGenerator({ user }: { user?: any } = {}) {
  const [grade, setGrade] = useState<number>(4);
  const [subject, setSubject] = useState<string>("Khoa học");
  const [topic, setTopic] = useState<string>("Vòng tuần hoàn của nước trong tự nhiên");

  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [activeSlide, setActiveSlide] = useState<SlideItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [errorText, setErrorText] = useState("");
  const [slideStyle, setSlideStyle] = useState<"modern" | "schoolboard" | "playful">("modern");

  // Refs to prevent state duplication or stale closures
  const lastLoadedRepoRef = useRef<string | null>(null);
  const gradeRef = useRef<number>(grade);
  gradeRef.current = grade;

  // Document repository states
  const [sourceDocs, setSourceDocs] = useState<DocumentItem[]>([]);
  const [unlockedGrades, setUnlockedGrades] = useState<number[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // AI Image generation states
  const [imagePrompt, setImagePrompt] = useState<string>("");
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);

  // Helper: Map "Khối X" to number
  const mapGradeStringToNumber = (gradeStr: string): number => {
    const match = gradeStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : 4;
  };

  const getStorageKey = () => {
    return user && user.id ? `eduai_documents_repo_${user.id}` : "eduai_documents_repo";
  };

  // Synchronize document repository
  const loadDocuments = (isFirstMount = false) => {
    const key = getStorageKey();
    const saved = localStorage.getItem(key);
    if (saved === lastLoadedRepoRef.current && !isFirstMount) {
      return; // Skip update if raw content remains identical
    }
    lastLoadedRepoRef.current = saved;

    if (saved) {
      try {
        const parsed: DocumentItem[] = JSON.parse(saved);
        
        // Filter strictly: Only "Giáo án" or "Sách giáo khoa" (case-insensitive)
        const filtered = parsed.filter((d) => {
          if (!d.category) return false;
          const cat = d.category.trim().toLowerCase();
          return cat === "giáo án" || cat === "sách giáo khoa";
        });

        // Helper to extract week number from document name or filename
        const extractWeekNum = (nameStr: string): number => {
          const normalized = nameStr.toLowerCase();
          const match = normalized.match(/(?:tuần|tuan|t)\s*(\d+)/i);
          if (match) {
            return parseInt(match[1], 10);
          }
          return 999;
        };

        // Sort by: 1. Subject alphabetically (localeCompare 'vi')
        //          2. Week number from 1 to last week
        //          3. Name alphabetically as fallback
        filtered.sort((a, b) => {
          const subjComp = a.subject.localeCompare(b.subject, "vi");
          if (subjComp !== 0) return subjComp;

          const weekA = extractWeekNum(a.name);
          const weekB = extractWeekNum(b.name);
          if (weekA !== weekB) return weekA - weekB;

          return a.name.localeCompare(b.name, "vi");
        });

        setSourceDocs(filtered);

        // Determine unique grades from filtered docs
        const uniqueGrades = Array.from(new Set(
          filtered.map((doc) => mapGradeStringToNumber(doc.grade))
        )).sort((a, b) => a - b);
        
        setUnlockedGrades(uniqueGrades);

        // Update default selection based on available grades
        if (uniqueGrades.length > 0) {
          const currentGrade = isFirstMount ? 4 : gradeRef.current;
          if (!uniqueGrades.includes(currentGrade) || isFirstMount) {
            const defaultGrade = isFirstMount && uniqueGrades.includes(4) ? 4 : uniqueGrades[0];
            setGrade(defaultGrade);
            
            // Pre-fill fields matching the first available document
            const matchingDoc = filtered.find(d => mapGradeStringToNumber(d.grade) === defaultGrade);
            if (matchingDoc) {
              setSubject(matchingDoc.subject);
              // Extract a clean topic name from document name
              const cleanTopic = matchingDoc.name
                .replace(/^Giáo án\s+Toán\s+lớp\s+\d+\s*-\s*/i, "")
                .replace(/^Sách giáo khoa\s+[\w\s]+\s+lớp\s+\d+\s*-\s*/i, "")
                .split("(")[0].trim();
              setTopic(cleanTopic || matchingDoc.name);
              setSelectedDocId(matchingDoc.id);
            }
          }
        }
      } catch (e) {
        console.error("Error reading repository for slides:", e);
      }
    } else {
      setSourceDocs([]);
      setUnlockedGrades([]);
    }
  };

  // On mount and periodic verification
  useEffect(() => {
    loadDocuments(true);

    // Auto-sync with localstorage changes when teacher uploads documents in other tab
    const interval = setInterval(() => loadDocuments(false), 1500);
    return () => clearInterval(interval);
  }, [user]);

  // Sync subject and topic when grade, source documents list, or selected subject changes
  useEffect(() => {
    if (sourceDocs.length > 0) {
      const filteredDocs = sourceDocs.filter(d => mapGradeStringToNumber(d.grade) === grade);
      const subjects = Array.from(new Set(filteredDocs.map(d => d.subject))).filter(Boolean);
      
      if (subjects.length > 0) {
        // If current subject is not in the list of available subjects, auto-select the first one
        if (!subjects.includes(subject)) {
          const firstSubj = subjects[0];
          setSubject(firstSubj);
          
          // Pre-fill topic matching the first available document for this subject
          const matchedDoc = filteredDocs.find(d => d.subject === firstSubj);
          if (matchedDoc) {
            const cleanTopic = matchedDoc.name
              .replace(/^Giáo án\s+Toán\s+lớp\s+\d+\s*-\s*/i, "")
              .replace(/^Giáo án\s+[\w\s]+\s+lớp\s+\d+\s*-\s*/i, "")
              .replace(/^Sách giáo khoa\s+[\w\s]+\s+lớp\s+\d+\s*-\s*/i, "")
              .split("(")[0].trim();
            setTopic(cleanTopic || matchedDoc.name);
            setSelectedDocId(matchedDoc.id);
          }
        } else if (!selectedDocId) {
          // If subject matches but no document is selected, auto-select the first one
          const matchedDoc = filteredDocs.find(d => d.subject === subject);
          if (matchedDoc) {
            const cleanTopic = matchedDoc.name
              .replace(/^Giáo án\s+Toán\s+lớp\s+\d+\s*-\s*/i, "")
              .replace(/^Giáo án\s+[\w\s]+\s+lớp\s+\d+\s*-\s*/i, "")
              .replace(/^Sách giáo khoa\s+[\w\s]+\s+lớp\s+\d+\s*-\s*/i, "")
              .split("(")[0].trim();
            setTopic(cleanTopic || matchedDoc.name);
            setSelectedDocId(matchedDoc.id);
          }
        }
      }
    }
  }, [grade, sourceDocs, subject]);

  // Handle subject dropdown change
  const handleSubjectChange = (newSubj: string) => {
    setSubject(newSubj);
    // Auto-select corresponding doc and prefill topic for this grade & subject
    const matchingDoc = sourceDocs.find(
      d => mapGradeStringToNumber(d.grade) === grade && d.subject === newSubj
    );
    if (matchingDoc) {
      const cleanTopic = matchingDoc.name
        .replace(/^Giáo án\s+Toán\s+lớp\s+\d+\s*-\s*/i, "")
        .replace(/^Giáo án\s+[\w\s]+\s+lớp\s+\d+\s*-\s*/i, "")
        .replace(/^Sách giáo khoa\s+[\w\s]+\s+lớp\s+\d+\s*-\s*/i, "")
        .split("(")[0].trim();
      setTopic(cleanTopic || matchingDoc.name);
      setSelectedDocId(matchingDoc.id);
    }
  };

  // Dynamic list of subjects for currently selected grade
  const availableSubjects = Array.from(new Set(
    sourceDocs
      .filter(doc => mapGradeStringToNumber(doc.grade) === grade)
      .map(doc => doc.subject)
  )).filter(Boolean);

  // Dynamic list of documents for current grade + subject
  const availableDocs = sourceDocs.filter(
    (doc) =>
      mapGradeStringToNumber(doc.grade) === grade &&
      (!subject || doc.subject === subject)
  );

  // Handle document selection change
  const handleDocChange = (docId: string) => {
    setSelectedDocId(docId);
    if (!docId) return;

    const doc = sourceDocs.find(d => d.id === docId);
    if (doc) {
      const gNum = mapGradeStringToNumber(doc.grade);
      setGrade(gNum);
      setSubject(doc.subject);
      
      // Clean up topic string from document name
      const cleanTopic = doc.name
        .replace(/^Giáo án\s+Toán\s+lớp\s+\d+\s*-\s*/i, "")
        .replace(/^Giáo án\s+[\w\s]+\s+lớp\s+\d+\s*-\s*/i, "")
        .replace(/^Sách giáo khoa\s+[\w\s]+\s+lớp\s+\d+\s*-\s*/i, "")
        .split("(")[0].trim();
      setTopic(cleanTopic || doc.name);
    }
  };

  // Helper to load sample files instantly if repository is empty
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
        id: "sample-x",
        name: "Giáo án Khoa học lớp 4 - Vòng tuần hoàn của nước trong tự nhiên",
        category: "Giáo án",
        grade: "Khối 4",
        subject: "Khoa học",
        fileName: "Giao_An_Khoa_Hoc_4_Tuan_1.docx",
        fileSize: "1.1 MB",
        fileExtension: ".docx",
        uploadDate: "24/06/2026 07:15",
        notes: "Giáo án chi tiết về chu trình nước trong thiên nhiên cho học sinh khối 4."
      }
    ];

    // Read existing to merge, or save directly
    const key = getStorageKey();
    const saved = localStorage.getItem(key);
    let existing: DocumentItem[] = [];
    if (saved) {
      try {
        existing = JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }

    // Merge non-duplicate samples
    const merged = [...existing];
    samples.forEach(s => {
      if (!merged.some(m => m.name === s.name)) {
        merged.push(s);
      }
    });

    localStorage.setItem(key, JSON.stringify(merged));
    loadDocuments();
    setFeedbackMsg("Đã nạp thành công tài liệu Giáo án & Sách giáo khoa mẫu!");
    setTimeout(() => setFeedbackMsg(""), 3000);
  };

  const [aiCommand, setAiCommand] = useState<string>("Tôi muốn tạo slide của môn Khoa học tuần 1 khối 4");

  const handleGenerateSlides = async (overrideCommand?: string) => {
    setLoading(true);
    setErrorText("");
    setActiveSlide(null);
    setSlides([]);
    setImagePrompt("");

    // Read saved documents from repository
    const key = getStorageKey();
    const savedDocs = localStorage.getItem(key);
    let parsedDocs = [];
    if (savedDocs) {
      try {
        parsedDocs = JSON.parse(savedDocs);
      } catch (e) {
        console.error("Error reading saved documents for slide generation:", e);
      }
    }

    const commandToUse = overrideCommand || aiCommand;

    // Invoke Gemini server-side AI Slide creator grounded on documents
    try {
      const response = await apiFetch("/api/gemini/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          grade, 
          subject, 
          topic, 
          command: commandToUse,
          documents: parsedDocs,
          selectedDocId: selectedDocId || undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSlides(data);
        if (data.length > 0) {
          setActiveSlide(data[0]);
          setImagePrompt(data[0].illustrationPrompt);
        }
      } else {
        const errData = await response.json();
        setErrorText(errData.error || "tài liệu chưa tồn tại trong kho tài liệu vui lòng cập nhật tài liệu để tạo slide");
      }
    } catch (e) {
      setErrorText("tài liệu chưa tồn tại trong kho tài liệu vui lòng cập nhật tài liệu để tạo slide");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAIImage = async () => {
    if (!activeSlide || !imagePrompt) return;
    setIsGeneratingImage(true);
    setErrorText("");

    try {
      const response = await apiFetch("/api/gemini/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imagePrompt, aspectRatio: "16:9" })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.imageUrl) {
          const updatedSlide = { ...activeSlide, simulatedImage: data.imageUrl };
          setActiveSlide(updatedSlide);
          setSlides(prev => prev.map(s => s.slideNumber === activeSlide.slideNumber ? updatedSlide : s));
        } else {
          setErrorText("Hệ thống chưa tạo được ảnh, vui lòng thử lại câu lệnh khác.");
        }
      } else {
        setErrorText("Gặp sự cố khi kết nối máy chủ tạo ảnh AI.");
      }
    } catch (e) {
      setErrorText("Lỗi máy chủ khi tạo ảnh minh họa bằng AI.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleCopyPrompt = (promptText: string, idx: number) => {
    navigator.clipboard.writeText(promptText);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const handleDownloadPPTX = () => {
    if (slides.length === 0) return;

    // Create a new PowerPoint presentation instance
    const pptx = new pptxgen();
    
    // Set presentation properties
    pptx.title = `Bài giảng: ${topic}`;
    pptx.subject = subject;
    pptx.author = "EduAI";
    
    // Use standard 16:9 widescreen layout
    pptx.layout = "LAYOUT_16x9";

    // Theme color specifications (using solid Hex strings as expected by pptxgenjs)
    let bgFill = "0F172A"; // Modern Slate 900
    let titleColor = "F59E0B"; // Amber 500
    let textColor = "F8FAFC"; // Slate 50
    let footerColor = "94A3B8"; // Slate 400
    let fontName = "Arial"; // Clean standard display font
    let boxBg = "1E293B"; // slate card
    let boxBorder = "334155";
    let accentColor = "6366F1"; // Indigo

    if (slideStyle === "schoolboard") {
      bgFill = "022C22"; // Emerald 950
      titleColor = "FDE047"; // Yellow 300
      textColor = "F1F5F9"; // Slate 100
      footerColor = "34D399"; // Emerald 400
      boxBg = "064E3B"; // Dark Emerald 900
      boxBorder = "0F766E";
      accentColor = "10B981";
    } else if (slideStyle === "playful") {
      bgFill = "FFFBEB"; // Amber 50
      titleColor = "78350F"; // Amber 900
      textColor = "1E293B"; // Slate 800
      footerColor = "B45309"; // Amber 700
      boxBg = "FEF3C7"; // Amber 100
      boxBorder = "F59E0B";
      accentColor = "D97706";
    }

    slides.forEach((slideData) => {
      const slide = pptx.addSlide();
      
      // Set background fill color
      slide.background = { fill: bgFill };

      // Left brand bar
      slide.addShape("rect", {
        x: 0,
        y: 0,
        w: 0.15,
        h: 5.625,
        fill: { color: accentColor }
      });

      // Top-right Slide Counter indicator
      slide.addText(`SLIDE ${slideData.slideNumber}/${slides.length}`, {
        x: 8.5,
        y: 0.3,
        w: 1.5,
        h: 0.3,
        fontSize: 10,
        color: footerColor,
        fontFace: fontName,
        align: "right",
        bold: true
      });

      // Part label (Mở đầu, Nội dung, Tổng kết)
      let labelBg = "3B82F6"; // blue
      if (slideData.part === "Mở đầu") labelBg = "0EA5E9"; // sky
      if (slideData.part === "Tổng kết") labelBg = "10B981"; // emerald

      slide.addText((slideData.part || "BÀI HỌC").toUpperCase(), {
        x: 0.8,
        y: 0.3,
        w: 1.2,
        h: 0.25,
        fontSize: 9,
        bold: true,
        color: "FFFFFF",
        fontFace: fontName,
        fill: { color: labelBg },
        align: "center",
        valign: "middle"
      });

      // Title Textbox (fully separate and editable)
      slide.addText(slideData.title, {
        x: 0.8,
        y: 0.7,
        w: 8.4,
        h: 0.8,
        fontSize: 22,
        bold: true,
        color: titleColor,
        fontFace: fontName,
        valign: "middle"
      });

      // Main Bullet points text box (each line as a separate bullet in a list)
      // Passing an array of text objects is highly recommended for individual bullet items
      const bulletItems = slideData.points.map((pt) => ({
        text: pt,
        options: {
          bullet: true,
          fontSize: 14,
          color: textColor,
          fontFace: fontName,
          paraSpaceAfter: 8
        }
      }));

      slide.addText(bulletItems, {
        x: 0.8,
        y: 1.7,
        w: 8.4,
        h: 2.3,
        valign: "top"
      });

      // Dynamic Interactive activity box at bottom
      slide.addShape("roundRect", {
        x: 0.8,
        y: 4.1,
        w: 8.4,
        h: 0.8,
        fill: { color: boxBg },
        line: { color: boxBorder, width: 1 }
      });

      slide.addText(`${slideData.activityLabel.toUpperCase()}: ${slideData.activityContent}`, {
        x: 0.9,
        y: 4.15,
        w: 8.2,
        h: 0.7,
        fontSize: 10,
        color: slideStyle === "playful" ? "78350F" : textColor,
        fontFace: fontName,
        italic: true,
        valign: "middle"
      });

      // Footer branding
      slide.addText("Học liệu số thông minh EduAI • Phát triển bám sát Công văn 2345", {
        x: 0.8,
        y: 5.1,
        w: 8.4,
        h: 0.3,
        fontSize: 8,
        color: footerColor,
        fontFace: fontName,
        valign: "middle"
      });

      // Add actual Speaker notes (Kịch bản nói của giáo viên & Trò chơi hoạt động)
      const speakingScriptCleaned = slideData.speakingScript || "Không có kịch bản mẫu.";
      const notesContent = `[KỊCH BẢN GIẢNG BÀI - THẦY CÔ XƯNG THẦY/CÔ VỚI CÁC CON]:\n${speakingScriptCleaned}\n\n[TRÒ CHƠI / TƯƠNG TÁC TẠI LỚP]:\n${slideData.activityLabel}: ${slideData.activityContent}`;
      slide.addNotes(notesContent);
    });

    // Save and download PowerPoint file
    const safeTopic = topic.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_");
    pptx.writeFile({ fileName: `Bai_Giang_EduAI_${safeTopic}_Lop_${grade}.pptx` });
  };

  const handleDownloadHTML = () => {
    if (slides.length === 0) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bài giảng: ${topic} - Khối ${grade} - Môn ${subject}</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;1,400&family=Fira+Code&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
    }
    .font-serif-custom {
      font-family: 'Playfair Display', Georgia, serif;
    }
    .font-mono-custom {
      font-family: 'Fira Code', monospace;
    }
    .slide-enter {
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.4s ease, transform 0.4s ease;
    }
    .slide-active {
      opacity: 1;
      transform: translateY(0);
    }
  </style>
</head>
<body class="bg-slate-100 text-slate-800 flex flex-col min-h-screen">

  <!-- Header -->
  <header class="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50">
    <div class="flex items-center gap-3">
      <div class="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
      </div>
      <div>
        <h1 class="text-base font-bold text-slate-800 leading-tight">EduAI - BẢN TRÌNH CHIẾU SƯ PHẠM TRỰC QUAN</h1>
        <p class="text-xs text-slate-500">Môn: ${subject} • Lớp: ${grade} • Chủ đề: <b class="text-slate-700">${topic}</b></p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <div class="flex items-center bg-slate-100 p-1.5 rounded-lg border border-slate-200/60">
        <button onclick="setTheme('modern')" id="btn-theme-modern" class="theme-btn px-3 py-1 text-xs font-bold rounded-md transition-all bg-white text-slate-900 shadow-3xs">Hiện đại</button>
        <button onclick="setTheme('schoolboard')" id="btn-theme-schoolboard" class="theme-btn px-3 py-1 text-xs font-bold rounded-md transition-all text-slate-600 hover:text-slate-900">Phấn bảng</button>
        <button onclick="setTheme('playful')" id="btn-theme-playful" class="theme-btn px-3 py-1 text-xs font-bold rounded-md transition-all text-slate-600 hover:text-slate-900">Ấm áp</button>
      </div>
      <button onclick="togglePresenterMode()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
        Chế độ kịch bản
      </button>
    </div>
  </header>

  <div class="flex-1 flex flex-col lg:flex-row">
    <!-- Left Navigation Sidebar -->
    <aside id="sidebar" class="w-full lg:w-80 bg-white border-r border-slate-200 p-4 shrink-0 overflow-y-auto max-h-[calc(100vh-73px)] lg:max-h-none">
      <div class="mb-3 flex items-center justify-between">
        <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">MỤC LỤC TRÌNH CHIẾU</span>
        <span class="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">${slides.length} Slides</span>
      </div>
      <div class="space-y-2" id="slide-list-container">
        <!-- Filled by Javascript -->
      </div>
    </aside>

    <!-- Center Presentation Workspace -->
    <main class="flex-1 p-6 flex flex-col gap-6 justify-center max-w-5xl mx-auto w-full">
      
      <!-- Interactive Presentation Box -->
      <div id="presentation-viewport" class="aspect-video w-full rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-500 shadow-md">
        <!-- Floating details -->
        <div class="absolute top-4 left-5 flex gap-1.5 items-center z-10">
          <div class="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
          <div class="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
          <div class="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
          <span id="classroom-indicator" class="text-[9px] font-mono pl-2 text-slate-400">TRÌNH CHIẾU LỚP HỌC</span>
        </div>

        <div id="slide-number-indicator" class="absolute top-4 right-5 rounded px-2.5 py-1 text-[11px] font-mono tracking-wider font-extrabold bg-white/10">
          SLIDE 1/15
        </div>

        <!-- Slide Core Content Frame -->
        <div class="h-full flex flex-col justify-center pt-8 px-6">
          <div id="slide-inner-content" class="text-left space-y-6 max-w-3xl mx-auto w-full slide-enter">
            <!-- Title -->
            <h2 id="slide-title" class="font-extrabold text-2xl md:text-3xl tracking-tight leading-snug uppercase border-b pb-4">
              CHÀO MỪNG TIẾT HỌC
            </h2>
            <!-- Bullets -->
            <ul id="slide-points" class="space-y-3 text-sm md:text-lg pl-6 list-disc font-medium">
              <!-- Bullet points filled dynamically -->
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div id="slide-footer" class="text-center text-[11px] border-t pt-3 flex justify-between">
          <span>Học liệu số EduAI</span>
          <span class="font-semibold">Tiến trình sư phạm chuẩn hóa Công văn 2345</span>
        </div>
      </div>

      <!-- Controls Panel -->
      <div class="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div class="flex items-center gap-1.5">
          <kbd class="px-2 py-1 text-[10px] font-mono bg-slate-100 border border-slate-200 rounded text-slate-500">◀</kbd>
          <kbd class="px-2 py-1 text-[10px] font-mono bg-slate-100 border border-slate-200 rounded text-slate-500">▶</kbd>
          <span class="text-xs text-slate-400">Dùng phím mũi tên trên bàn phím để chuyển trang</span>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="prevSlide()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-lg transition-all border border-slate-200">
            ◀ Trang trước
          </button>
          <button onclick="nextSlide()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all shadow-xs">
            Trang tiếp ▶
          </button>
        </div>
      </div>

      <!-- Professional PowerPoint Design Specifications -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white border border-slate-200 p-4 rounded-xl text-left">
          <span class="text-[10px] font-extrabold text-slate-400 uppercase block tracking-wider mb-1">🎯 Mục tiêu Slide</span>
          <p id="meta-objective" class="text-xs font-bold text-slate-700 leading-normal">Loading...</p>
        </div>
        <div class="bg-white border border-slate-200 p-4 rounded-xl text-left">
          <span class="text-[10px] font-extrabold text-slate-400 uppercase block tracking-wider mb-1">📐 Bố cục đề xuất</span>
          <p id="meta-layout" class="text-xs font-bold text-slate-700 leading-normal">Loading...</p>
        </div>
        <div class="bg-white border border-slate-200 p-4 rounded-xl text-left">
          <span class="text-[10px] font-extrabold text-slate-400 uppercase block tracking-wider mb-1">🎨 Tranh minh họa</span>
          <p id="meta-illustration" class="text-xs font-bold text-slate-700 leading-normal mb-1">Loading...</p>
          <span id="meta-keyword" class="text-[9px] font-mono text-slate-400 block">Loading...</span>
        </div>
        <div class="bg-white border border-slate-200 p-4 rounded-xl text-left">
          <span class="text-[10px] font-extrabold text-slate-400 uppercase block tracking-wider mb-1">⚡ Hiệu ứng (Animation)</span>
          <p id="meta-animation" class="text-xs font-bold text-slate-700 leading-normal">Loading...</p>
        </div>
      </div>

      <!-- Bottom Teacher Guide / Script (Collapsible Speaker Guide) -->
      <div id="presenter-drawer" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Speech script -->
        <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-left">
          <div class="flex items-center gap-2 mb-2">
            <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            <span class="font-extrabold text-indigo-700 text-xs uppercase">Kịch bản giảng của Thầy/Cô</span>
          </div>
          <p id="teacher-speech" class="text-xs md:text-sm text-indigo-900 bg-white p-3.5 rounded-lg border border-indigo-100/40 font-medium leading-relaxed min-h-[70px]">
            Loading script...
          </p>
        </div>

        <!-- Activity game -->
        <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-left">
          <div class="flex items-center gap-2 mb-2">
            <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span id="activity-label" class="font-extrabold text-emerald-700 text-xs uppercase">Trò chơi tương tác</span>
          </div>
          <p id="activity-detail" class="text-xs md:text-sm text-emerald-950 bg-white p-3.5 rounded-lg border border-emerald-100/40 leading-relaxed min-h-[70px]">
            Loading activity...
          </p>
        </div>
      </div>

    </main>
  </div>

  <footer class="bg-slate-900 text-slate-400 py-4 px-6 border-t border-slate-800 text-center text-xs mt-auto">
    Bản quyền thuộc về phần mềm giảng dạy thông minh EduAI • Xuất bản năm 2026
  </footer>

  <script>
    const slides = ${JSON.stringify(slides)};
    let currentIdx = 0;
    let activeTheme = "${slideStyle}";

    function renderSlide() {
      const slide = slides[currentIdx];
      
      document.getElementById("slide-number-indicator").innerText = "SLIDE " + (currentIdx + 1) + " / " + slides.length;
      
      document.querySelectorAll(".slide-sidebar-btn").forEach((btn, idx) => {
        if (idx === currentIdx) {
          btn.classList.add("bg-slate-900", "text-white", "border-slate-900");
          btn.classList.remove("bg-slate-50", "text-slate-700", "border-slate-100");
          btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          btn.classList.remove("bg-slate-900", "text-white", "border-slate-900");
          btn.classList.add("bg-slate-50", "text-slate-700", "border-slate-100");
        }
      });

      const container = document.getElementById("slide-inner-content");
      container.classList.remove("slide-active");
      
      document.getElementById("slide-title").innerText = slide.title;
      
      let bulletsHtml = "";
      slide.points.forEach(p => {
        bulletsHtml += "<li>" + p + "</li>";
      });
      document.getElementById("slide-points").innerHTML = bulletsHtml;

      document.getElementById("teacher-speech").innerText = slide.speakingScript;
      document.getElementById("activity-label").innerText = "TRÒ CHƠI TƯƠNG TÁC (" + slide.activityLabel + ")";
      document.getElementById("activity-detail").innerText = slide.activityContent;

      // Update PPTX design metadata fields
      document.getElementById("meta-objective").innerText = slide.objective || "Khai thác tri thức cốt lõi";
      document.getElementById("meta-layout").innerText = slide.layout || "Chuẩn mực 1 ý chính";
      document.getElementById("meta-illustration").innerText = slide.illustration || "Hình vẽ minh họa bám sát nội dung";
      document.getElementById("meta-keyword").innerText = "Từ khóa: " + (slide.searchKeyword || "school vector cartoon");
      document.getElementById("meta-animation").innerText = slide.animation || "Fade";

      setTimeout(() => {
        container.classList.add("slide-active");
      }, 50);
    }

    function prevSlide() {
      if (currentIdx > 0) {
        currentIdx--;
        renderSlide();
      }
    }

    function nextSlide() {
      if (currentIdx < slides.length - 1) {
        currentIdx++;
        renderSlide();
      }
    }

    function goToSlide(idx) {
      currentIdx = idx;
      renderSlide();
    }

    let presenterVisible = true;
    function togglePresenterMode() {
      presenterVisible = !presenterVisible;
      const drawer = document.getElementById("presenter-drawer");
      if (presenterVisible) {
        drawer.style.display = "grid";
      } else {
        drawer.style.display = "none";
      }
    }

    function setTheme(theme) {
      activeTheme = theme;
      
      document.querySelectorAll(".theme-btn").forEach(btn => {
        btn.classList.remove("bg-white", "text-slate-900", "shadow-3xs");
        btn.classList.add("text-slate-600");
      });
      
      const activeBtn = document.getElementById("btn-theme-" + theme);
      activeBtn.classList.remove("text-slate-600");
      activeBtn.classList.add("bg-white", "text-slate-900", "shadow-3xs");

      const viewport = document.getElementById("presentation-viewport");
      const title = document.getElementById("slide-title");
      const points = document.getElementById("slide-points");
      const footer = document.getElementById("slide-footer");
      const classroom = document.getElementById("classroom-indicator");

      viewport.className = "aspect-video w-full rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-500 shadow-md";
      title.className = "font-extrabold text-2xl md:text-3xl tracking-tight leading-snug uppercase border-b pb-4";
      points.className = "space-y-3 text-sm md:text-lg pl-6 list-disc font-medium";
      footer.className = "text-center text-[11px] border-t pt-3 flex justify-between";

      if (theme === "modern") {
        viewport.classList.add("bg-slate-900", "border-4", "border-slate-800", "text-white");
        title.classList.add("text-amber-400", "border-white/10");
        points.classList.add("text-slate-100");
        footer.classList.add("text-slate-400", "border-white/5");
        classroom.className = "text-[9px] font-mono pl-2 text-slate-400";
      } else if (theme === "schoolboard") {
        viewport.classList.add("bg-emerald-950", "border-4", "border-emerald-900", "text-slate-100");
        title.classList.add("text-yellow-300", "border-white/10");
        points.classList.add("text-slate-100");
        footer.classList.add("text-emerald-400", "border-white/5");
        classroom.className = "text-[9px] font-mono pl-2 text-emerald-400";
      } else {
        viewport.classList.add("bg-amber-50", "border-4", "border-amber-200", "text-slate-800");
        title.classList.add("text-amber-800", "border-amber-200/60");
        points.classList.add("text-slate-800");
        footer.classList.add("text-slate-500", "border-amber-200/60");
        classroom.className = "text-[9px] font-mono pl-2 text-slate-500";
      }
    }

    function buildSidebar() {
      const container = document.getElementById("slide-list-container");
      let html = "";
      slides.forEach((slide, idx) => {
        let partBg = "bg-indigo-500";
        if (slide.part === "Mở đầu") partBg = "bg-sky-500";
        if (slide.part === "Tổng kết") partBg = "bg-emerald-500";
        const slidePart = slide.part || "Bài học";

        html += '<button onclick="goToSlide(' + idx + ')" class="slide-sidebar-btn w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-700">';
        html += '  <div class="w-6 h-6 rounded bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">' + slide.slideNumber + '</div>';
        html += '  <div class="min-w-0 flex-1">';
        html += '    <span class="inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded-md text-white uppercase tracking-wide ' + partBg + '">' + slidePart + '</span>';
        html += '    <p class="font-bold text-xs truncate mt-1 uppercase tracking-tight">' + slide.title + '</p>';
        html += '  </div>';
        html += '</button>';
      });
      container.innerHTML = html;
    }

    window.addEventListener("keydown", function(e) {
      if (e.key === "ArrowRight" || e.key === "Space") {
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        prevSlide();
      }
    });

    buildSidebar();
    setTheme(activeTheme);
    renderSlide();
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Bai_Giang_EduAI_${topic.replace(/\s+/g, "_")}_Lop_${grade}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const selectSlide = (slide: SlideItem) => {
    setActiveSlide(slide);
    setImagePrompt(slide.illustrationPrompt);
  };

  const navigateToRepositoryTab = () => {
    document.getElementById("tab-btn-repository")?.click();
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-3xs" id="slide-generator">
      {/* Status indicator grounded on the actual selected / available files */}
      {sourceDocs.length > 0 ? (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-xs text-emerald-800 flex items-center justify-between gap-2 mb-6" id="slide-grounded-status">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              <Library className="w-4 h-4 inline mr-1 text-emerald-600" />
              Đang liên kết <b>{sourceDocs.length} tài liệu nguồn</b> (Giáo án & Sách giáo khoa) làm nền tảng kiến thức.
            </span>
          </div>
          <span className="text-[10px] bg-emerald-150 px-2 py-0.5 rounded-md text-emerald-900 font-semibold uppercase">
            ĐÃ LIÊN KẾT KHO
          </span>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4 text-xs text-amber-800 space-y-2 mb-6" id="slide-grounded-status">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Chưa có tài liệu nguồn Giáo án & Sách giáo khoa cho Khối lớp nào!</p>
              <p className="text-[11px] text-amber-700 mt-0.5 leading-normal">
                Theo tiêu chuẩn sư phạm, thầy cô cần tải lên <b>Giáo án</b> hoặc <b>Sách giáo khoa</b> trong Kho tài liệu trước. Lớp nào có tài liệu thì mới có thể thiết kế bài giảng Slide cho lớp đó.
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-1 flex-wrap">
            <button
              id="btn-quick-seed-samples"
              onClick={handleLoadSamples}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              Nạp nhanh tài liệu mẫu
            </button>
            <button
              onClick={navigateToRepositoryTab}
              className="bg-white border border-amber-300 hover:bg-amber-100 text-amber-950 font-semibold text-[11px] px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
            >
              Đi tới Kho tài liệu
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {feedbackMsg && (
            <p className="text-[10px] text-emerald-600 font-semibold animate-pulse">{feedbackMsg}</p>
          )}
        </div>
      )}

      {/* RENDER CONTROLS IF WE HAVE VALID DOCUMENTS */}
      {sourceDocs.length > 0 && (
        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 mb-6 space-y-4" id="slide-selector-form">
          <div className="space-y-4">
            <label className="block text-xs font-extrabold text-indigo-700 uppercase flex items-center gap-1.5">
              <Database className="w-4 h-4 text-indigo-500" />
              Tạo slide ai tự động
            </label>

            <div className="space-y-4 pt-1 transition-all duration-300">
              {/* Quick Selector Dropdown */}
              <div className="grid grid-cols-1 gap-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Chọn tài liệu trong Kho giáo án có sẵn
                </label>
                <select
                  id="slide-select-source-doc"
                  value={selectedDocId}
                  onChange={(e) => handleDocChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:border-indigo-400"
                >
                  <option value="">-- Chọn giáo án nguồn để tự động đồng bộ --</option>
                  {availableDocs.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      [{doc.category}] {doc.grade} - {doc.subject}: {doc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                {/* Unlocked Grade selector */}
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Khối lớp</label>
                  <select
                    id="slide-select-grade"
                    value={grade}
                    onChange={(e) => {
                      const gVal = Number(e.target.value);
                      setGrade(gVal);
                      const matched = sourceDocs.find(d => mapGradeStringToNumber(d.grade) === gVal);
                      if (matched) {
                        setSubject(matched.subject);
                      }
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-400"
                  >
                    {unlockedGrades.map(gNum => (
                      <option key={gNum} value={gNum}>Bậc Tiểu học Lớp {gNum}</option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Môn học</label>
                  <select
                    id="slide-select-subject"
                    value={subject}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-400"
                  >
                    {availableSubjects.length > 0 ? (
                      availableSubjects.map((subj) => (
                        <option key={subj} value={subj}>
                          {subj}
                        </option>
                      ))
                    ) : (
                      <option value="">Không có môn học</option>
                    )}
                  </select>
                </div>

                {/* Topic Name and Submit */}
                <div className="md:col-span-5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tên chủ đề slide</label>
                  <input
                    id="slide-input-topic"
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-400"
                    placeholder="Ví dụ: Vòng tuần hoàn của nước"
                  />
                </div>
              </div>

              {/* Manual Creation Button */}
              <div className="flex justify-end pt-3 border-t border-slate-100/50 mt-1">
                <button
                  id="btn-manual-slide-generate"
                  disabled={loading || !topic.trim()}
                  onClick={() => {
                    const customCommand = `Tôi muốn tạo slide của môn ${subject} khối ${grade} chủ đề ${topic}`;
                    handleGenerateSlides(customCommand);
                  }}
                  className="w-full sm:w-auto h-[38px] flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold px-5 rounded-xl text-xs transition-all shadow-sm cursor-pointer shrink-0"
                >
                  {loading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  Tạo slide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {errorText && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex gap-3 text-rose-700 text-sm mb-6" id="slide-error">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{errorText}</p>
        </div>
      )}

      {/* RENDER GRID */}
      {slides.length > 0 && activeSlide ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="slide-workspace">
          {/* Left List of Slides */}
          <div className="lg:col-span-4 space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase block tracking-wider mb-2">DANH SÁCH BẢN TRÌNH CHIẾU</span>
            {slides.map((slide, i) => (
              <button
                key={slide.slideNumber}
                id={`btn-slides-select-${slide.slideNumber}`}
                onClick={() => selectSlide(slide)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center gap-3 ${
                  activeSlide.slideNumber === slide.slideNumber
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-700"
                }`}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs ${
                  activeSlide.slideNumber === slide.slideNumber ? "bg-white/10" : "bg-slate-200 text-slate-600"
                }`}>
                  {slide.slideNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {slide.part && (
                      <span className={`inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wide ${
                        slide.part === "Mở đầu" ? "bg-sky-500 text-white" :
                        slide.part === "Nội dung" ? "bg-indigo-500 text-white" :
                        "bg-emerald-500 text-white"
                      }`}>
                        {slide.part}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-xs truncate uppercase tracking-tight mt-1">{slide.title}</p>
                  <p className="text-[10px] opacity-70 mt-0.5 truncate">{slide.activityLabel}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Right Presentation / Editor Frame */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Slide Toolbar for Styles and Download */}
            <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left shadow-2xs">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-700 uppercase">Phong cách Slide:</span>
                <div className="flex bg-slate-200/60 p-1 rounded-lg border border-slate-300/40">
                  <button
                    onClick={() => setSlideStyle("modern")}
                    className={`px-3 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${
                      slideStyle === "modern"
                        ? "bg-slate-900 text-white shadow-3xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Hiện đại
                  </button>
                  <button
                    onClick={() => setSlideStyle("schoolboard")}
                    className={`px-3 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${
                      slideStyle === "schoolboard"
                        ? "bg-emerald-950 text-emerald-100 shadow-3xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Phấn bảng
                  </button>
                  <button
                    onClick={() => setSlideStyle("playful")}
                    className={`px-3 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${
                      slideStyle === "playful"
                        ? "bg-amber-100 text-amber-950 shadow-3xs border border-amber-200/50"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Ấm áp
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  id="btn-slide-download-html"
                  onClick={handleDownloadHTML}
                  className="bg-slate-700 hover:bg-slate-800 text-white font-extrabold text-[11px] px-3.5 py-2.5 rounded-xl transition-all shadow-3xs flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Tải bài giảng chạy trực tiếp trong trình duyệt offline"
                >
                  <MonitorPlay className="w-3.5 h-3.5" />
                  Bản HTML tương tác
                </button>
                <button
                  id="btn-slide-download-pptx"
                  onClick={handleDownloadPPTX}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-[11px] px-4 py-2.5 rounded-xl transition-all shadow-3xs flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Tải slide PowerPoint hoàn chỉnh, văn bản chỉnh sửa được và tạo hiệu ứng"
                >
                  <Download className="w-3.5 h-3.5" />
                  Tải PowerPoint (.pptx)
                </button>
              </div>
            </div>

            {/* Presentation Mockup viewport */}
            <div className={`rounded-2xl border-4 shadow-lg aspect-video p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
              slideStyle === "modern" ? "bg-slate-950 border-slate-800 text-white bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/40" :
              slideStyle === "schoolboard" ? "bg-emerald-950 border-emerald-900 text-slate-100 bg-gradient-to-br from-emerald-950 to-teal-950" :
              "bg-amber-50 border-amber-200 text-slate-800 bg-gradient-to-br from-amber-50 via-orange-50/40 to-amber-100/20"
            }`}>
              <div className="absolute top-3 left-4 flex gap-1.5 items-center z-10">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <span className={`text-[9px] font-mono pl-2 ${slideStyle === "playful" ? "text-slate-500" : "text-slate-400"}`}>
                  MÀN HÌNH TRÌNH CHIẾU TẠI LỚP {grade}A
                </span>
              </div>

              <div className={`absolute top-3 right-4 rounded px-2 py-0.5 text-[10px] font-mono tracking-wider font-extrabold ${
                slideStyle === "playful" ? "bg-slate-900/10 text-slate-700" : "bg-white/10 text-slate-100"
              }`}>
                SLIDE {activeSlide.slideNumber}/{slides.length}
              </div>

              <div className="h-full flex flex-col justify-center pt-8 px-4">
                {/* Bullets text */}
                <div className="text-left space-y-4 max-w-2xl mx-auto w-full">
                  <h3 className={`font-extrabold text-lg tracking-tight leading-snug uppercase border-b pb-3 transition-all ${
                    slideStyle === "modern" ? "text-amber-400 border-white/10" :
                    slideStyle === "schoolboard" ? "text-yellow-300 border-white/10 font-serif" :
                    "text-amber-900 border-amber-200"
                  }`}>
                    {activeSlide.title}
                  </h3>
                  <ul className={`space-y-2 text-xs md:text-sm pl-4 list-disc transition-all ${
                    slideStyle === "playful" ? "text-slate-700" : "text-slate-100"
                  }`}>
                    {activeSlide.points.map((pt, i) => (
                      <li key={i} className={`leading-relaxed tracking-tight font-medium ${
                        slideStyle === "playful" ? "text-slate-800" : "text-white/95"
                      }`}>{pt}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className={`text-center text-[10px] border-t pt-2 flex justify-between ${
                slideStyle === "playful" ? "text-slate-500 border-slate-900/10" : "text-slate-400 border-white/5"
              }`}>
                <span>Thương hiệu: EduAI 1.0</span>
                <span>Tiến trình sư phạm chuẩn hóa bám sát Công văn 2345</span>
              </div>
            </div>

            {/* Professional PowerPoint Design Specifications */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
              <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-rose-500" />
                    Mục tiêu Slide
                  </span>
                  <p className="text-xs font-extrabold text-slate-700 mt-2 leading-relaxed">
                    {activeSlide.objective || "Khai phá kiến thức học tập"}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Layout className="w-3.5 h-3.5 text-indigo-500" />
                    Bố cục đề xuất
                  </span>
                  <p className="text-xs font-extrabold text-indigo-700 mt-2 leading-relaxed">
                    {activeSlide.layout || "Chuẩn mực 1 ý chính"}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                    Tranh minh họa
                  </span>
                  <p className="text-xs font-bold text-slate-700 mt-2 leading-relaxed">
                    {activeSlide.illustration || "Hình vẽ Flat Cartoon"}
                  </p>
                </div>
                {activeSlide.searchKeyword && (
                  <span className="text-[9px] font-mono text-slate-400 block mt-2 border-t border-slate-200/40 pt-1.5">
                    Ảnh: {activeSlide.searchKeyword}
                  </span>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    Hiệu ứng (Animation)
                  </span>
                  <p className="text-xs font-extrabold text-slate-700 mt-2 leading-relaxed">
                    {activeSlide.animation || "Fade (Mờ dần)"}
                  </p>
                </div>
              </div>
            </div>

            {/* Split Information tabs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Teacher Speech Cards */}
              <div className="bg-indigo-50/50 p-4 border border-indigo-100 rounded-xl space-y-2.5 text-left">
                <span className="font-bold text-indigo-700 text-xs flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  KỊCH BẢN NÓI CỦA GIÁO VIÊN (CÔ/THẦY)
                </span>
                <p className="text-xs text-indigo-900 font-medium leading-relaxed bg-white p-3 rounded-lg border border-indigo-100/40 font-medium">
                  {activeSlide.speakingScript}
                </p>
              </div>

              {/* Classroom Interactive games */}
              <div className="bg-emerald-50/50 p-4 border border-emerald-100 rounded-xl space-y-2.5 text-left">
                <span className="font-bold text-emerald-700 text-xs flex items-center gap-1">
                  <Gamepad2 className="w-4 h-4" />
                  TRÒ CHƠI TƯƠNG TÁC TẠI LỚP ({activeSlide.activityLabel})
                </span>
                <p className="text-xs text-emerald-950 leading-relaxed bg-white p-3 rounded-lg border border-emerald-100/40">
                  {activeSlide.activityContent}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        !loading && sourceDocs.length > 0 && (
          <div className="flex flex-col items-center justify-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center px-4">
            <Sliders className="w-10 h-10 text-slate-300 mb-3" />
            <span className="font-semibold text-slate-700 text-sm">Chưa có Slide bài giảng</span>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Chọn tài liệu nguồn hoặc điền chủ đề rồi click "Thiết kế" ở trên để xem kịch bản slide tương tác và hình minh họa siêu thuần Việt lộng lẫy!
            </p>
          </div>
        )
      )}
    </div>
  );
}
