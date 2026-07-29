import React, { useState, useEffect, useRef } from "react";
import { apiFetch } from "../utils/api";
import { 
  Folder, 
  FolderOpen, 
  File, 
  Upload, 
  BookOpen, 
  Layers, 
  Download, 
  Trash2, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle, 
  FileText, 
  Library, 
  Grid, 
  List, 
  ChevronRight, 
  X, 
  AlertCircle,
  FileSpreadsheet,
  FileVideo,
  FileImage,
  Sliders,
  Sparkles,
  Eye,
  Info,
  Play,
  Pause,
  Clock,
  ArrowUpDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import mammoth from "mammoth";

const renderExtractedText = (text: string, zoomPercent: number) => {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div 
      className="space-y-2 font-sans transition-all duration-200" 
      style={{ fontSize: `${12 * (zoomPercent / 100)}px`, lineHeight: "1.7" }}
    >
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-2" />;
        
        // Headers like I. II. III.
        if (/^[IVXLCDM]+\.\s+/i.test(trimmed)) {
          return (
            <h4 key={idx} className="text-[13px] font-black text-slate-900 border-b border-slate-100 pb-1 pt-3 tracking-wide uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-indigo-600 rounded-xs inline-block"></span>
              {trimmed}
            </h4>
          );
        }
        
        // Subheadings like 1. 2. 3.
        if (/^\d+\.\s+/.test(trimmed)) {
          return (
            <h5 key={idx} className="font-bold text-slate-800 pt-2 flex items-center gap-1">
              {trimmed}
            </h5>
          );
        }
        
        // Bullet points like - or + or *
        if (trimmed.startsWith("-") || trimmed.startsWith("•") || trimmed.startsWith("+")) {
          return (
            <div key={idx} className="pl-4 flex items-start gap-1.5 text-slate-700">
              <span className="text-indigo-500 mt-1 select-none font-bold">•</span>
              <span>{trimmed.substring(1).trim()}</span>
            </div>
          );
        }
        
        // Checklist/exam brackets like [ ]
        if (trimmed.includes("[ ]") || trimmed.includes("[v]") || trimmed.includes("[x]")) {
          return (
            <div key={idx} className="pl-6 flex items-center gap-2 text-slate-700 bg-slate-50/50 p-1.5 rounded-lg border border-slate-100/50 my-1">
              <input type="checkbox" readOnly className="rounded border-slate-300 text-indigo-600 w-3.5 h-3.5 pointer-events-none" />
              <span>{trimmed.replace(/\[\s*v?\s*x?\s*\]/gi, "").trim()}</span>
            </div>
          );
        }
        
        // Default text paragraph
        return (
          <p key={idx} className="text-slate-700 text-justify leading-relaxed">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
};

interface DocumentItem {
  id: string;
  name: string;
  category: "Giáo án" | "Sách giáo khoa" | "Tài liệu tham khảo";
  grade: string; // "Khối 1", "Khối 2", etc. or "Tất cả"
  subject: string; // "Toán", "Tiếng Việt", etc. or "Tất cả"
  bookSeries?: string; // "Cánh Diều", "Kết nối tri thức", etc.
  refGroup?: string; // "Đề kiểm tra", "Phiếu bài tập tuần", etc.
  fileName: string;
  fileSize: string;
  fileExtension: string;
  uploadDate: string;
  notes?: string;
  lessonTopic?: string;
  aiSummary?: string;
  aiKeyActivities?: string[];
  aiObjectives?: string[];
  extractedText?: string;
  isUploaded?: boolean;
}

const rawFilesMap = new Map<string, File>();

// Simple, robust IndexedDB helper for original file storage
const DB_NAME = "eduai_files_db";
const STORE_NAME = "files_store";

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveFileToIndexedDB = async (id: string, file: File | Blob): Promise<void> => {
  try {
    const db = await getDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(file, id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("IndexedDB save error:", err);
  }
};

const getFileFromIndexedDB = async (id: string): Promise<File | Blob | null> => {
  try {
    const db = await getDB();
    return new Promise<File | Blob | null>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("IndexedDB get error:", err);
    return null;
  }
};

const deleteFileFromIndexedDB = async (id: string): Promise<void> => {
  try {
    const db = await getDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("IndexedDB delete error:", err);
  }
};

const removeVietnameseAccents = (str: string) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};

const generateMinimalPDF = (doc: DocumentItem) => {
  const cleanTitle = removeVietnameseAccents(doc.name);
  const cleanContent = removeVietnameseAccents(doc.extractedText || "Noidung tailieu dang duoc tai...");

  // Escape parentheses for PDF text strings
  const esc = (text: string) => text.replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  const lines = cleanContent.split("\n");
  const pagesStream: string[][] = [];
  let currentPageLines: string[] = [];
  
  // Header line template
  currentPageLines.push("BT");
  currentPageLines.push("/F2 14 Tf");
  currentPageLines.push("40 800 Td");
  currentPageLines.push(`(${esc(cleanTitle)}) Tj`);
  currentPageLines.push("/F1 9 Tf");
  currentPageLines.push("0 -20 Td");
  currentPageLines.push("(EDUAI SMART DOCUMENT REPOSITORY - BAN GOC) Tj");
  currentPageLines.push("0 -10 Td");
  currentPageLines.push("(---------------------------------------------------------------------------------------------------------) Tj");
  currentPageLines.push("0 -20 Td");

  // We have height from ~750 down to ~50
  let currentY = 750;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      currentPageLines.push("0 -15 Td () Tj");
      currentY -= 15;
    } else {
      // Auto-wrap line if it exceeds limit (around 85 chars for Helvetica 10pt at margin 40)
      const words = trimmed.split(" ");
      let currentLine = "";
      
      words.forEach((word) => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (testLine.length > 85) {
          currentPageLines.push(`0 -15 Td (${esc(currentLine)}) Tj`);
          currentY -= 15;
          currentLine = word;
          
          if (currentY < 60) {
            currentPageLines.push("ET");
            pagesStream.push(currentPageLines);
            currentPageLines = ["BT", "/F1 9 Tf", "40 800 Td", "(EDUAI SMART DOCUMENT REPOSITORY - BAN GOC) Tj", "0 -15 Td", "(---------------------------------------------------------------------------------------------------------) Tj", "0 -20 Td"];
            currentY = 760;
          }
        } else {
          currentLine = testLine;
        }
      });
      
      if (currentLine) {
        currentPageLines.push(`0 -15 Td (${esc(currentLine)}) Tj`);
        currentY -= 15;
      }
    }

    if (currentY < 60) {
      currentPageLines.push("ET");
      pagesStream.push(currentPageLines);
      currentPageLines = ["BT", "/F1 9 Tf", "40 800 Td", "(EDUAI SMART DOCUMENT REPOSITORY - BAN GOC) Tj", "0 -15 Td", "(---------------------------------------------------------------------------------------------------------) Tj", "0 -20 Td"];
      currentY = 760;
    }
  });

  if (currentPageLines.length > 0 && currentPageLines[currentPageLines.length - 1] !== "ET") {
    currentPageLines.push("ET");
    pagesStream.push(currentPageLines);
  }

  const pageCount = pagesStream.length || 1;

  // Build compliant basic PDF file structure
  let pdfContent = `%PDF-1.4\n`;
  // Catalog object
  pdfContent += `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  
  // Pages collection
  const kidsArray: string[] = [];
  for (let i = 0; i < pageCount; i++) {
    kidsArray.push(`${3 + i * 2} 0 R`);
  }
  pdfContent += `2 0 obj\n<< /Type /Pages /Kids [${kidsArray.join(" ")}] /Count ${pageCount} >>\nendobj\n`;

  // Write pages and streams
  for (let i = 0; i < pageCount; i++) {
    const pageObjId = 3 + i * 2;
    const streamObjId = pageObjId + 1;
    const streamText = (pagesStream[i] || ["BT", "ET"]).join("\n");
    
    pdfContent += `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /MediaBox [0 0 595 842] /Contents ${streamObjId} 0 R >>\nendobj\n`;
    pdfContent += `${streamObjId} 0 obj\n<< /Length ${streamText.length} >>\nstream\n${streamText}\nendstream\nendobj\n`;
  }

  // Basic dummy cross-references and trailer to make it compliant
  const totalObjects = 2 + pageCount * 2;
  pdfContent += `xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`;
  pdfContent += `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n100\n%%EOF`;

  return new Blob([pdfContent], { type: "application/pdf" });
};

const getMinimalMP4Blob = () => {
  const bytes = new Uint8Array([
    0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, // ftyp
    0x6d, 0x70, 0x34, 0x32, 0x00, 0x00, 0x00, 0x00,
    0x6d, 0x70, 0x34, 0x32, 0x69, 0x73, 0x6f, 0x6d,
    0x00, 0x00, 0x00, 0x08, 0x66, 0x72, 0x65, 0x65, // free
    0x00, 0x00, 0x00, 0x08, 0x6d, 0x64, 0x61, 0x74  // mdat
  ]);
  return new Blob([bytes], { type: "video/mp4" });
};

const extractWeekNumber = (name: string): number => {
  const normalized = name.toLowerCase();
  
  // Pattern 1: Look for "tuần XX" or "tuan XX" (e.g. Tuần 1, Tuan 05, Tuần_10, Tuần-12)
  const tuanMatch = normalized.match(/(?:tuần|tuan)[_\-\s]*(\d+)/);
  if (tuanMatch) {
    return parseInt(tuanMatch[1], 10);
  }
  
  // Pattern 2: Look for "T_XX" or "T-XX" or "TXX" where XX is a number
  const tMatch = normalized.match(/(?:\s+|\b)[tt][.\-_]?(\d+)(?:\b|\s+)/);
  if (tMatch) {
    return parseInt(tMatch[1], 10);
  }

  // Pattern 3: Look for "week XX", "wk XX", "w XX"
  const weekMatch = normalized.match(/(?:week|wk|w)[_\-\s]*(\d+)/);
  if (weekMatch) {
    return parseInt(weekMatch[1], 10);
  }

  // Pattern 4: Standalone number in the name (excluding typical grade numbers 1-5 or subject numbers)
  let cleaned = normalized.replace(/(?:khối|khoi|lớp|lop)\s*\d+/g, "");
  cleaned = cleaned.replace(/(?:toán|tiếng việt|tự nhiên xã hội|khoa học|lịch sử|địa lý|đạo đức|tin học|công nghệ|thể chất|âm nhạc|mỹ thuật|trải nghiệm)\s*\d+/g, "");
  
  const anyNumMatch = cleaned.match(/\b(\d+)\b/);
  if (anyNumMatch) {
    return parseInt(anyNumMatch[1], 10);
  }

  return 999; // Fallback so elements without a parsed week go to the end
};

const normalizeTuanWord = (name: string): string => {
  if (!name) return name;
  const normalizedStr = name.normalize("NFC");
  return normalizedStr.replace(/[tT][uU][aAàáảãạâầấẩẫậ][nN]/g, (match) => {
    if (match === match.toUpperCase()) {
      return "TUẦN";
    } else if (match[0] === match[0].toUpperCase()) {
      return "Tuần";
    } else {
      return "tuần";
    }
  });
};

const getDocumentsStorageKey = (currentUser?: any | null) => {
  return currentUser?.id ? `eduai_documents_repo_${currentUser.id}` : "eduai_documents_repo";
};

export default function DocumentRepository({ user }: { user?: any } = {}) {
  // State for document list (starts empty, saved in localStorage)
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedForDelete, setSelectedForDelete] = useState<string[]>([]);
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"All" | "Giáo án" | "Sách giáo khoa" | "Tài liệu tham khảo">("All");
  const [activeGrade, setActiveGrade] = useState<string>("All");
  const [activeSubject, setActiveSubject] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "date-desc" | "date-asc" | "subject-week" | "week-asc">("name-asc");

  // Upload Form States
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Bulk Upload States
  const [uploadMode, setUploadMode] = useState<"single" | "bulk">("single");
  const [selectedBulkFiles, setSelectedBulkFiles] = useState<File[]>([]);
  const [bulkStatuses, setBulkStatuses] = useState<{ [fileName: string]: "waiting" | "uploading" | "analyzing" | "success" | "error" }>({});
  const [bulkErrors, setBulkErrors] = useState<{ [fileName: string]: string }>({});
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  // Form Fields
  const [docName, setDocName] = useState("");
  const [docLessonTopic, setDocLessonTopic] = useState("");
  const [docCategory, setDocCategory] = useState<"Giáo án" | "Sách giáo khoa" | "Tài liệu tham khảo">("Giáo án");
  const [docGrade, setDocGrade] = useState("Khối 1");
  const [docSubject, setDocSubject] = useState("Toán");
  const [docBookSeries, setDocBookSeries] = useState("Kết nối tri thức với cuộc sống");
  const [docRefGroup, setDocRefGroup] = useState("Phiếu bài tập cuối tuần");
  const [docNotes, setDocNotes] = useState("");

  // Preview Drawer State
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [previewTab, setPreviewTab] = useState<"content" | "analysis">("content");
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(15);
  const [pdfZoom, setPdfZoom] = useState(100);

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);

  // AI Word Document Analysis States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);

  // Hover summary state
  const [hoveredDoc, setHoveredDoc] = useState<DocumentItem | null>(null);
  const [hoveredCoords, setHoveredCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reset hover when preview drawer opens
  useEffect(() => {
    if (previewDoc) {
      setHoveredDoc(null);
    }
  }, [previewDoc]);

  // Auto-combine Grade and File Name for document display name
  useEffect(() => {
    if (selectedFile) {
      setDocName(`${docGrade} - ${normalizeTuanWord(selectedFile.name)}`);
    } else {
      setDocName("");
    }
  }, [docGrade, selectedFile]);

  const handleMouseEnterDoc = (doc: DocumentItem, event: React.MouseEvent) => {
    setHoveredDoc(doc);
    updateCoords(event);
  };

  const handleMouseMoveDoc = (event: React.MouseEvent) => {
    updateCoords(event);
  };

  const handleMouseLeaveDoc = () => {
    setHoveredDoc(null);
  };

  const updateCoords = (event: React.MouseEvent) => {
    setHoveredCoords({
      x: event.clientX,
      y: event.clientY
    });
  };

  const getTooltipStyle = () => {
    if (!hoveredCoords) return { display: 'none' };
    
    const tooltipWidth = 320;
    const tooltipHeight = 180;
    
    let left = hoveredCoords.x + 15;
    let top = hoveredCoords.y + 15;
    
    // Guard right boundary
    if (left + tooltipWidth > window.innerWidth) {
      left = hoveredCoords.x - tooltipWidth - 15;
    }
    
    // Guard bottom boundary
    if (top + tooltipHeight > window.innerHeight) {
      top = hoveredCoords.y - tooltipHeight - 15;
    }
    
    // Guard left boundary
    if (left < 0) {
      left = 10;
    }
    
    // Guard top boundary
    if (top < 0) {
      top = 10;
    }
    
    return {
      position: 'fixed' as const,
      left: `${left}px`,
      top: `${top}px`,
      width: `${tooltipWidth}px`,
      zIndex: 9999,
    };
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to analyze lesson plan text content (directly or from file)
  const analyzeLessonPlanText = async (textToAnalyze: string, nameForAnalysis: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      setExtractedText(textToAnalyze);

      // Send text to backend Gemini analysis API
      const res = await apiFetch("/api/gemini/analyze-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: textToAnalyze,
          fileName: nameForAnalysis
        })
      });

      if (!res.ok) {
        throw new Error("Không thể kết nối máy chủ AI phân tích.");
      }

      const data = await res.json();
      setAnalysisResult(data);

      // Auto-populate fields!
      // We keep the exact filename as requested by the user, so we do not overwrite the document title here
      // if (data.title) setDocName(data.title);
      if (data.lessonTopic) setDocLessonTopic(data.lessonTopic);
      // We keep the selected grade as is, no need to overwrite it according to user requirements
      // if (data.grade) setDocGrade(data.grade);
      if (data.subject) setDocSubject(data.subject);
      if (data.category) setDocCategory(data.category);
      if (data.summary) setDocNotes(data.summary);

    } catch (err: any) {
      console.warn("Lỗi phân tích tài liệu: ", err);
      setAnalysisError(err.message || "Không thể phân tích tài liệu.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Function to extract text from .docx or .txt (or fall back to filename-only analysis for other file formats) and analyze using Gemini
  const analyzeFile = async (file: File) => {
    const idx = file.name.lastIndexOf(".");
    const ext = idx !== -1 ? file.name.substring(idx).toLowerCase() : "";

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      let rawText = "";

      if (ext === ".docx") {
        try {
          // 1. Read file as ArrayBuffer
          const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target?.result instanceof ArrayBuffer) {
                resolve(e.target.result);
              } else {
                reject(new Error("Không thể đọc định dạng dữ liệu của tệp Word."));
              }
            };
            reader.onerror = () => reject(new Error("Lỗi vật lý khi đọc tệp tin."));
            reader.readAsArrayBuffer(file);
          });

          // 2. Parse raw text with mammoth
          const mammothResult = await mammoth.extractRawText({ arrayBuffer });
          rawText = mammothResult.value;
        } catch (err: any) {
          console.warn("Mammoth failed to extract text, falling back to name analysis:", err);
          rawText = "";
        }
      } else if (ext === ".txt") {
        try {
          // Read file as plain text
          rawText = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              if (typeof e.target?.result === "string") {
                resolve(e.target.result);
              } else {
                reject(new Error("Không thể đọc định dạng dữ liệu của tệp TXT."));
              }
            };
            reader.onerror = () => reject(new Error("Lỗi vật lý khi đọc tệp tin."));
            reader.readAsText(file);
          });
        } catch (err: any) {
          console.warn("TXT reader failed, falling back to name analysis:", err);
          rawText = "";
        }
      }

      // If text extraction was not possible (or returned empty text), use the filename-only analysis mode
      if (!rawText || !rawText.trim()) {
        rawText = `Tài liệu: ${file.name}. Vui lòng tự động nhận diện thông tin giáo án bám sát khung chương trình tiểu học dựa trên tên tệp tin này.`;
      }

      await analyzeLessonPlanText(rawText, file.name);

    } catch (err: any) {
      console.warn("Lỗi phân tích tệp tin: ", err);
      setAnalysisError(err.message || "Không thể phân tích tài liệu.");
      setIsAnalyzing(false);
    }
  };

  // Vietnamese primary education taxonomy
  const grades = ["Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5"];
  const subjects = [
    "Toán",
    "Tiếng Việt",
    "Tiếng Anh",
    "Tự nhiên & Xã hội",
    "Khoa học",
    "Lịch sử & Địa lý",
    "Tin học & Công nghệ",
    "Đạo đức",
    "Mỹ thuật",
    "Âm nhạc",
    "Thể chất",
    "Hoạt động trải nghiệm"
  ];
  const bookSeriesList = [
    "Kết nối tri thức với cuộc sống",
    "Cánh Diều",
    "Chân trời sáng tạo"
  ];
  const refGroups = [
    "Phiếu bài tập cuối tuần",
    "Đề kiểm tra định kỳ",
    "Đề khảo sát chất lượng",
    "Tài liệu bồi dưỡng học sinh giỏi",
    "Tài liệu phụ đạo học sinh yếu",
    "Tranh ảnh & Video minh họa",
    "Giáo trình lý thuyết bổ trợ",
    "Khác"
  ];

  const getStorageKey = () => {
    return getDocumentsStorageKey(user);
  };

  // Load from database on mount and when user changes
  useEffect(() => {
    let active = true;
    const loadDocs = async () => {
      try {
        const res = await apiFetch("/api/documents");
        if (res.ok && active) {
          const data = await res.json();
          setDocuments(data);
        }
      } catch (e) {
        console.error("Error loading documents from database:", e);
      }
    };
    loadDocs();
    return () => {
      active = false;
    };
  }, [user]);

  const saveDocs = (newDocs: DocumentItem[]) => {
    setDocuments(newDocs);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (uploadMode === "bulk") {
        handleBulkFilesSelected(Array.from(e.dataTransfer.files));
      } else {
        handleFileSelected(e.dataTransfer.files[0]);
      }
    }
  };

  const handleFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (uploadMode === "bulk") {
        handleBulkFilesSelected(Array.from(e.target.files));
      } else {
        handleFileSelected(e.target.files[0]);
      }
    }
  };

  const handleFileSelected = (file: File) => {
    if (file.size > 3 * 1024 * 1024) {
      setUploadError(`Tệp tin "${file.name}" vượt quá 3MB. Vui lòng tải tệp dưới 3MB.`);
      return;
    }
    setSelectedFile(file);
    setUploadSuccess(false);
    setUploadError(null);

    // Trigger AI analysis automatically for all uploaded files (uses text content or filename)
    analyzeFile(file);
  };

  const handleBulkFilesSelected = (files: File[]) => {
    const tooLargeFiles = files.filter(f => f.size > 3 * 1024 * 1024);
    const validFiles = files.filter(f => f.size <= 3 * 1024 * 1024);

    if (tooLargeFiles.length > 0) {
      setUploadError(
        `Bỏ qua ${tooLargeFiles.length} tệp vượt quá 3MB: ${tooLargeFiles.map(f => f.name).join(", ")}. Vui lòng chỉ tải các tệp dưới 3MB.`
      );
    } else {
      setUploadError(null);
    }

    setSelectedBulkFiles(prev => {
      // Avoid duplicate file names in the list
      const existingNames = new Set(prev.map(f => `${f.name}_${f.size}`));
      const newFiles = validFiles.filter(f => !existingNames.has(`${f.name}_${f.size}`));
      return [...prev, ...newFiles];
    });
    setUploadSuccess(false);
    setBulkMessage(null);
  };

  const handleSaveBulkDocuments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBulkFiles.length === 0) return;

    // --- Duplicate check logic ---
    const duplicateFiles = selectedBulkFiles.filter(f => 
      documents.some(d => d.fileName === f.name || d.name === f.name)
    );

    let finalBulkFiles = [...selectedBulkFiles];
    let overwrite = false;

    if (duplicateFiles.length > 0) {
      const confirmOverwrite = window.confirm(`Phát hiện ${duplicateFiles.length} tệp đã tồn tại trong kho (trùng tên).\n\nBạn có muốn GHI ĐÈ lên các tệp cũ không?\n- Chọn OK để GHI ĐÈ (xóa tệp cũ).\n- Chọn Cancel để BỎ QUA (không tải các tệp trùng).`);
      if (confirmOverwrite) {
        overwrite = true;
      } else {
        const duplicateNames = new Set(duplicateFiles.map(f => f.name));
        finalBulkFiles = finalBulkFiles.filter(f => !duplicateNames.has(f.name));
        if (finalBulkFiles.length === 0) {
          setBulkMessage("Đã bỏ qua tất cả các tệp trùng. Không có tệp mới nào được tải lên.");
          return;
        }
      }
    }

    setIsUploading(true);
    setUploadError(null);
    setBulkMessage(null);
    setUploadProgress(0);

    let updatedDocumentsList = [...documents];
    
    if (overwrite) {
      const duplicateNames = new Set(duplicateFiles.map(f => f.name));
      const docsToDelete = updatedDocumentsList.filter(d => duplicateNames.has(d.fileName) || duplicateNames.has(d.name));
      
      for (const d of docsToDelete) {
        try {
          await apiFetch(`/api/documents/${d.id}`, { method: 'DELETE' });
          rawFilesMap.delete(d.id);
          await deleteFileFromIndexedDB(d.id);
        } catch (err) {
          console.error("Lỗi xóa tệp cũ khi ghi đè:", err);
        }
      }
      
      updatedDocumentsList = updatedDocumentsList.filter(d => !docsToDelete.some(td => td.id === d.id));
      setDocuments(updatedDocumentsList);
    }

    const initialStatuses: { [fileName: string]: "waiting" | "uploading" | "analyzing" | "success" | "error" } = {};
    finalBulkFiles.forEach(f => {
      initialStatuses[f.name] = "waiting";
    });
    setBulkStatuses(initialStatuses);
    setBulkErrors({});

    let successCount = 0;
    let failCount = 0;
    const failedFiles: File[] = [];

    for (let i = 0; i < finalBulkFiles.length; i++) {
      const file = finalBulkFiles[i];
      const normalizedFileName = normalizeTuanWord(file.name);
      setBulkStatuses(prev => ({ ...prev, [file.name]: "uploading" }));

      const docId = Math.random().toString(36).substr(2, 9);
      const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      const fileSizeStr = (file.size / (1024 * 1024)).toFixed(1) + " MB";

      try {
        // 1. Try text extraction & AI analysis FIRST
        setBulkStatuses(prev => ({ ...prev, [file.name]: "analyzing" }));
        let rawText = "";
        let analysisData: any = null;

        if (fileExt === ".docx") {
          try {
            const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                if (e.target?.result instanceof ArrayBuffer) {
                  resolve(e.target.result);
                } else {
                  reject(new Error("Lỗi định dạng Word."));
                }
              };
              reader.onerror = () => reject(new Error("Lỗi đọc tệp tin."));
              reader.readAsArrayBuffer(file);
            });
            const mammothResult = await mammoth.extractRawText({ arrayBuffer });
            rawText = mammothResult.value;
          } catch (err) {
            console.warn(`Mammoth failed for ${file.name}:`, err);
          }
        } else if (fileExt === ".txt") {
          try {
            rawText = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                if (typeof e.target?.result === "string") {
                  resolve(e.target.result);
                } else {
                  reject(new Error("Lỗi định dạng TXT."));
                }
              };
              reader.onerror = () => reject(new Error("Lỗi đọc tệp tin."));
              reader.readAsText(file);
            });
          } catch (err) {
            console.warn(`Plain text reader failed for ${file.name}:`, err);
          }
        }

        // Hướng 1: Replace Office file with text file
        let fileToUpload: File = file;
        let finalFileExt = fileExt;
        let finalFileSizeStr = fileSizeStr;
        if (rawText && [".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".rtf"].includes(fileExt)) {
           const txtBlob = new Blob([rawText], { type: "text/plain" });
           const newName = file.name.substring(0, file.name.lastIndexOf(".")) + ".txt";
           (txtBlob as any).name = newName;
           fileToUpload = txtBlob as File;
           finalFileExt = ".txt";
           finalFileSizeStr = (fileToUpload.size / (1024 * 1024)).toFixed(3) + " MB";
        }

        // 2. Read file as Base64 and upload to server
        setBulkStatuses(prev => ({ ...prev, [file.name]: "uploading" }));
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (typeof e.target?.result === "string") {
              resolve(e.target.result);
            } else {
              reject(new Error("Không thể chuyển đổi dữ liệu tệp tin."));
            }
          };
          reader.onerror = () => reject(new Error("Lỗi đọc tệp tin cục bộ."));
          reader.readAsDataURL(fileToUpload);
        });

        const uploadRes = await apiFetch("/api/documents/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: docId,
            fileName: fileToUpload.name,
            base64Data,
          }),
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || "Lỗi tải lên máy chủ.");
        }



        // Fallback or run AI call
        if (!rawText || !rawText.trim()) {
          rawText = `Tài liệu: ${normalizedFileName}. Vui lòng tự động nhận diện thông tin giáo án bám sát khung chương trình tiểu học dựa trên tên tệp tin này.`;
        }

        try {
          const aiRes = await apiFetch("/api/gemini/analyze-document", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: rawText,
              fileName: normalizedFileName,
            }),
          });

          if (aiRes.ok) {
            analysisData = await aiRes.json();
          }
        } catch (err) {
          console.warn(`AI analysis failed for ${file.name}:`, err);
        }

        // 3. Assemble and save DocumentItem
        const now = new Date();
        const dateStr = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

        // Hướng tự động phân loại dựa trên nội dung tệp
        const autoCategory = analysisData?.category || docCategory;
        const autoGrade = analysisData?.grade || docGrade;
        const autoSubject = analysisData?.subject || docSubject;

        // Combine Grade and File Name for display title
        const combinedTitle = `${autoGrade} - ${analysisData?.title || normalizedFileName}`;

        const newDoc: DocumentItem = {
          id: docId,
          name: combinedTitle,
          category: autoCategory,
          grade: autoCategory === "Tài liệu tham khảo" && autoGrade === "Tất cả" ? "Tất cả" : autoGrade,
          subject: autoCategory === "Tài liệu tham khảo" && autoSubject === "Tất cả" ? "Tất cả" : autoSubject,
          bookSeries: autoCategory === "Sách giáo khoa" ? docBookSeries : undefined,
          refGroup: autoCategory === "Tài liệu tham khảo" ? docRefGroup : undefined,
          fileName: fileToUpload.name,
          fileSize: finalFileSizeStr,
          fileExtension: finalFileExt,
          uploadDate: dateStr,
          notes: analysisData?.summary || `Hệ thống đã tải lên thành công tệp tin giáo án/tài liệu này trong gói tải lên hàng loạt.`,
          lessonTopic: analysisData?.lessonTopic || file.name.substring(0, file.name.lastIndexOf(".")) || file.name,
          aiSummary: analysisData?.summary || undefined,
          aiKeyActivities: analysisData?.keyActivities || undefined,
          aiObjectives: analysisData?.objectives || undefined,
          extractedText: rawText || undefined,
          isUploaded: true
        };

        // POST metadata to database
        const metaRes = await apiFetch("/api/documents", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newDoc)
        });

        if (!metaRes.ok) {
          throw new Error("Không thể lưu thông tin tài liệu vào cơ sở dữ liệu.");
        }

        // Add to rawFilesMap & IndexedDB
        rawFilesMap.set(newDoc.id, fileToUpload);
        await saveFileToIndexedDB(newDoc.id, fileToUpload);

        // Prepend to list
        updatedDocumentsList.unshift(newDoc);
        setBulkStatuses(prev => ({ ...prev, [file.name]: "success" }));
        successCount++;
      } catch (err: any) {
        console.error(`Failed to bulk upload ${file.name}:`, err);
        setBulkStatuses(prev => ({ ...prev, [file.name]: "error" }));
        setBulkErrors(prev => ({ ...prev, [file.name]: err.message || "Lỗi không xác định" }));
        failedFiles.push(file);
        failCount++;
      }

      // Progress overall
      setUploadProgress(Math.round(((i + 1) / selectedBulkFiles.length) * 100));
    }

    // Save final list
    saveDocs(updatedDocumentsList);
    setIsUploading(false);
    setUploadProgress(100);

    if (successCount > 0) {
      setUploadSuccess(true);
      setBulkMessage(`Đã tải lên thành công ${successCount}/${selectedBulkFiles.length} tài liệu.`);
      // Keep only failed files in selected bulk files list
      setSelectedBulkFiles(failedFiles);
      
      setTimeout(() => {
        setUploadSuccess(false);
        setBulkMessage(null);
      }, 6000);
    } else {
      setUploadError("Tất cả tệp tin tải lên đều thất bại. Vui lòng kiểm tra lại định dạng tệp.");
    }
  };

  const getFormatIcon = (ext: string) => {
    const lower = ext.toLowerCase();
    if (lower === ".pdf") {
      return <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-xs">PDF</div>;
    }
    if ([".doc", ".docx", ".docm", ".dot", ".dotx", ".dotm", ".rtf"].includes(lower)) {
      return <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">DOC</div>;
    }
    if ([".ppt", ".pptx", ".pptm", ".pps", ".ppsx", ".ppsm", ".pot", ".potx", ".potm"].includes(lower)) {
      return <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-xs">PPT</div>;
    }
    if ([".xls", ".xlsx", ".xlsm", ".xlsb", ".xlt", ".xltx", ".xltm", ".csv"].includes(lower)) {
      return <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">XLS</div>;
    }
    if ([".png", ".jpg", ".jpeg", ".gif", ".svg"].includes(lower)) {
      return <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-xs">IMG</div>;
    }
    if ([".mp4", ".mov", ".avi", ".mkv"].includes(lower)) {
      return <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs">VID</div>;
    }
    return <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">FILE</div>;
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;

    setIsUploading(true);
    setUploadProgress(10);
    setUploadError(null);

    const docId = Math.random().toString(36).substr(2, 9);
    
    let fileToUpload: File | null = selectedFile;
    
    // Hướng 1: Extract text and save as .txt to save space
    const fileExtLower = fileToUpload?.name.split(".").pop()?.toLowerCase() || "";
    if (fileToUpload && extractedText && ["doc", "docx", "ppt", "pptx", "xls", "xlsx", "rtf"].includes(fileExtLower)) {
       const txtBlob = new Blob([extractedText], { type: "text/plain" });
       const newName = fileToUpload.name.substring(0, fileToUpload.name.lastIndexOf(".")) + ".txt";
       (txtBlob as any).name = newName;
       fileToUpload = txtBlob as File;
    }

    const fileExt = fileToUpload ? "." + fileToUpload.name.split(".").pop() : ".pdf";
    const fileSizeStr = fileToUpload 
      ? (fileToUpload.size / (1024 * 1024)).toFixed(3) + " MB" 
      : (1.5 + Math.random() * 4).toFixed(1) + " MB";

    // Simulate progress animation
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev < 90) return prev + 15;
        return prev;
      });
    }, 150);

    try {
      let isUploaded = false;
      if (fileToUpload) {
        // Read file as Base64
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (typeof e.target?.result === "string") {
              resolve(e.target.result);
            } else {
              reject(new Error("Không thể chuyển đổi dữ liệu tệp tin."));
            }
          };
          reader.onerror = () => reject(new Error("Lỗi đọc tệp tin cục bộ."));
          reader.readAsDataURL(fileToUpload!);
        });

        // Send to server
        const uploadRes = await apiFetch("/api/documents/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: docId,
            fileName: normalizeTuanWord(fileToUpload.name),
            base64Data,
          }),
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || "Không thể lưu trữ tệp tin gốc lên máy chủ.");
        }
        isUploaded = true;
      }

      clearInterval(interval);
      setUploadProgress(100);

      const now = new Date();
      const dateStr = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

      // Hướng tự động phân loại dựa trên nội dung tệp
      const autoCategory = analysisResult?.category || docCategory;
      const autoGrade = analysisResult?.grade || docGrade;
      const autoSubject = analysisResult?.subject || docSubject;

      const newDoc: DocumentItem = {
        id: docId,
        name: normalizeTuanWord(docName.trim()),
        category: autoCategory,
        grade: autoCategory === "Tài liệu tham khảo" && autoGrade === "Tất cả" ? "Tất cả" : autoGrade,
        subject: autoCategory === "Tài liệu tham khảo" && autoSubject === "Tất cả" ? "Tất cả" : autoSubject,
        bookSeries: autoCategory === "Sách giáo khoa" ? docBookSeries : undefined,
        refGroup: autoCategory === "Tài liệu tham khảo" ? docRefGroup : undefined,
        fileName: fileToUpload ? normalizeTuanWord(fileToUpload.name) : normalizeTuanWord(docName) + fileExt,
        fileSize: fileSizeStr,
        fileExtension: fileExt,
        uploadDate: dateStr,
        notes: docNotes.trim() || undefined,
        lessonTopic: docLessonTopic.trim() || analysisResult?.lessonTopic || undefined,
        aiSummary: analysisResult?.summary || undefined,
        aiKeyActivities: analysisResult?.keyActivities || undefined,
        aiObjectives: analysisResult?.objectives || undefined,
        extractedText: extractedText || undefined,
        isUploaded: isUploaded || undefined
      };

      // POST metadata to database
      const metaRes = await apiFetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newDoc)
      });

      if (!metaRes.ok) {
        throw new Error("Không thể lưu thông tin tài liệu vào cơ sở dữ liệu.");
      }

      if (fileToUpload) {
        rawFilesMap.set(newDoc.id, fileToUpload);
        await saveFileToIndexedDB(newDoc.id, fileToUpload);
      }
      setDocuments(prev => [newDoc, ...prev]);

      setIsUploading(false);
      setUploadSuccess(true);
      setSelectedFile(null);
      setDocNotes("");
      setDocLessonTopic("");
      setAnalysisResult(null);
      setExtractedText(null);
      
      // Clear success banner after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      clearInterval(interval);
      setIsUploading(false);
      setUploadError(err.message || "Lỗi lưu trữ tài liệu. Vui lòng thử lại.");
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const doc = documents.find(d => d.id === id);
    if (doc) {
      setDeleteTarget(doc);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      try {
        const res = await apiFetch(`/api/documents/${deleteTarget.id}`, {
          method: "DELETE"
        });
        if (!res.ok) {
          throw new Error("Không thể xóa tài liệu trên máy chủ.");
        }

        const updated = documents.filter(d => d.id !== deleteTarget.id);
        setDocuments(updated);
        rawFilesMap.delete(deleteTarget.id);
        await deleteFileFromIndexedDB(deleteTarget.id);
        if (previewDoc?.id === deleteTarget.id) {
          setPreviewDoc(null);
        }
        if (hoveredDoc?.id === deleteTarget.id) {
          setHoveredDoc(null);
        }
      } catch (err) {
        console.error("Lỗi khi xóa tài liệu:", err);
        alert("Lỗi khi xóa tài liệu từ cơ sở dữ liệu. Vui lòng thử lại.");
      } finally {
        setDeleteTarget(null);
      }
    }
  };

  const toggleSelectForDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedForDelete(prev => 
      prev.includes(id) ? prev.filter(docId => docId !== id) : [...prev, id]
    );
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedForDelete.length === 0) return;
    
    const confirm = window.confirm(`Bạn có chắc chắn muốn xóa ${selectedForDelete.length} tài liệu đã chọn không?\nHành động này không thể hoàn tác.`);
    if (!confirm) return;

    try {
      const deletePromises = selectedForDelete.map(id => 
        apiFetch(`/api/documents/${id}`, { method: "DELETE" }).then(async res => {
          if (res.ok) {
             rawFilesMap.delete(id);
             await deleteFileFromIndexedDB(id);
          }
        })
      );
      await Promise.all(deletePromises);
      
      const updated = documents.filter(d => !selectedForDelete.includes(d.id));
      setDocuments(updated);
      setSelectedForDelete([]);
      
      if (previewDoc && selectedForDelete.includes(previewDoc.id)) {
        setPreviewDoc(null);
      }
      if (hoveredDoc && selectedForDelete.includes(hoveredDoc.id)) {
        setHoveredDoc(null);
      }
    } catch (err) {
      console.error("Lỗi khi xóa nhiều tài liệu:", err);
      alert("Đã xảy ra lỗi khi xóa một số tài liệu. Vui lòng thử lại.");
    }
  };

  const handleDownload = async (doc: DocumentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 1. Same-session download for actual uploaded files in memory
    if (rawFilesMap.has(doc.id)) {
      const originalFile = rawFilesMap.get(doc.id)!;
      const url = URL.createObjectURL(originalFile);
      const a = document.createElement("a");
      a.href = url;
      a.download = originalFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    // 2. Persistent IndexedDB download for uploaded files
    const localFile = await getFileFromIndexedDB(doc.id);
    if (localFile) {
      const url = URL.createObjectURL(localFile);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    // 3. Persistent backend server download for uploaded files
    if (doc.isUploaded) {
      const a = document.createElement("a");
      a.href = `/api/documents/download/${doc.id}`;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const cleanName = doc.name.replace(/[^a-zA-Z0-9\s_ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯưăâêôơư]/g, "");
    const ext = doc.fileExtension.toLowerCase();

    // 4. Beautiful styled single-file Word Document for .docx or .doc
    if (ext === ".docx" || ext === ".doc") {
      const contentText = doc.extractedText || "Nội dung tài liệu đang được tải...";
      
      const lines = contentText.split("\n");
      let inList = false;
      const htmlLines: string[] = [];

      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
          if (inList) {
            htmlLines.push("</ul>");
            inList = false;
          }
          htmlLines.push("<p>&nbsp;</p>");
          return;
        }

        // Headers like I. II. III.
        if (/^[IVXLCDM]+\.\s+/i.test(trimmed)) {
          if (inList) {
            htmlLines.push("</ul>");
            inList = false;
          }
          htmlLines.push(`<h2 style="color: #1e3a8a; margin-top: 24px; font-size: 16px; font-weight: bold; border-left: 4px solid #4f46e5; padding-left: 8px; margin-bottom: 10px;">${trimmed}</h2>`);
          return;
        }

        // Subheadings like 1. 2. 3.
        if (/^\d+\.\s+/.test(trimmed)) {
          if (inList) {
            htmlLines.push("</ul>");
            inList = false;
          }
          htmlLines.push(`<h3 style="color: #334155; margin-top: 18px; font-size: 14px; font-weight: bold; margin-bottom: 8px;">${trimmed}</h3>`);
          return;
        }

        // Bullet points like - or • or +
        if (trimmed.startsWith("-") || trimmed.startsWith("•") || trimmed.startsWith("+")) {
          if (!inList) {
            htmlLines.push(`<ul style="padding-left: 20px; margin-top: 8px; margin-bottom: 8px;">`);
            inList = true;
          }
          const cleanItem = trimmed.substring(1).trim();
          htmlLines.push(`<li style="font-size: 13px; color: #334155; margin-bottom: 6px;">${cleanItem}</li>`);
          return;
        }

        // Checklist/exam brackets like [ ]
        if (trimmed.includes("[ ]") || trimmed.includes("[v]") || trimmed.includes("[x]")) {
          if (inList) {
            htmlLines.push("</ul>");
            inList = false;
          }
          const isChecked = trimmed.includes("[v]") || trimmed.includes("[x]");
          const cleanCheckboxText = trimmed.replace(/\[\s*v?\s*x?\s*\]/gi, "").trim();
          htmlLines.push(`<div style="font-size: 13px; color: #334155; margin-top: 6px; margin-bottom: 6px; padding-left: 10px;">[${isChecked ? "x" : " "}] ${cleanCheckboxText}</div>`);
          return;
        }

        // Regular paragraph
        if (inList) {
          htmlLines.push("</ul>");
          inList = false;
        }
        htmlLines.push(`<p style="font-size: 13px; color: #334155; margin-bottom: 8px; text-align: justify; line-height: 1.6;">${trimmed}</p>`);
      });

      if (inList) {
        htmlLines.push("</ul>");
      }

      const formattedHtmlContent = htmlLines.join("\n");

      const docHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${doc.name}</title>
  <!--[if gte mso 9]><xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
  </w:WordDocument>
  </xml><![endif]-->
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
    h1 { color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; font-size: 22px; font-weight: bold; margin-bottom: 20px; }
    .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <h1>${doc.name}</h1>
  
  <div style="margin-bottom: 30px;">
    ${formattedHtmlContent}
  </div>

  <div class="footer">
    Tài liệu được kết xuất từ Hệ thống Quản lý và Phân tích Giáo án thông minh EduAI.
  </div>
</body>
</html>`;
      const blob = new Blob([docHtml], { type: "application/msword;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const downloadExt = ext === ".docx" ? ".doc" : ext;
      a.download = `${cleanName}_eduai${downloadExt}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    // 5. Real uncorrupted PDF Generation
    if (ext === ".pdf") {
      const pdfBlob = generateMinimalPDF(doc);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cleanName}_eduai.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    // 6. Excel sheet structure
    if (ext === ".xls" || ext === ".xlsx") {
      const contentText = doc.extractedText || "Không có dữ liệu văn bản.";
      const lines = contentText.split("\n");
      const xlsRows = lines.map(line => {
        const trimmed = line.trim();
        const isHeader = /^[IVXLCDM]+\.\s+/i.test(trimmed);
        const isSub = /^\d+\.\s+/.test(trimmed);
        
        let style = "font-size: 12px; color: #334155; padding: 6px 10px;";
        if (isHeader) {
          style = "font-size: 14px; font-weight: bold; color: #1e3a8a; padding: 12px 10px; background-color: #f1f5f9;";
        } else if (isSub) {
          style = "font-size: 12px; font-weight: bold; color: #475569; padding: 8px 10px;";
        }
        
        return `<tr><td style="${style}">${trimmed || "&nbsp;"}</td></tr>`;
      }).join("\n");

      const xlsHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; }
    td { border: 1px solid #cbd5e1; }
  </style>
</head>
<body>
  <table>
    <tr><td style="font-size: 18px; font-weight: bold; color: #1e3a8a; padding: 15px 10px; height: 50px;">${doc.name}</td></tr>
    ${xlsRows}
  </table>
</body>
</html>`;
      const blob = new Blob([xlsHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cleanName}_eduai${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    // 7. Interactive full-screen slide slideshow for presentation files
    if (ext === ".pptx" || ext === ".ppt") {
      const rawText = doc.extractedText || "";
      const textLines = rawText.split("\n");
      const slideshowSlides: { title: string; desc: string; bullets: string[] }[] = [];
      
      // Cover slide
      slideshowSlides.push({
        title: doc.name,
        desc: `Chuyên mục: ${doc.category} | Môn học: ${doc.subject} | Khối lớp: ${doc.grade}`,
        bullets: [
          `Chủ đề bài học: ${doc.lessonTopic || "Chưa xác định"}`,
          `Tên tệp tin gốc: ${doc.fileName}`
        ]
      });

      let currentSld: { title: string; desc: string; bullets: string[] } | null = null;
      
      textLines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        // Match roman numerals or uppercase headings
        const isHeading = /^[IVXLCDM]+\.\s+/i.test(trimmed) || (/^[A-ZĐÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĨŨƠ\s\d\.\:\-\,]{10,65}$/.test(trimmed) && trimmed === trimmed.toUpperCase());
        
        if (isHeading) {
          if (currentSld) {
            slideshowSlides.push(currentSld);
          }
          currentSld = {
            title: trimmed,
            desc: "",
            bullets: []
          };
        } else if (currentSld) {
          if (!currentSld.desc && trimmed.length > 25 && !trimmed.startsWith("-") && !trimmed.startsWith("•") && !trimmed.startsWith("+")) {
            currentSld.desc = trimmed;
          } else {
            const cleanBullet = trimmed.replace(/^[\-\•\+]\s*/, "");
            if (currentSld.bullets.length < 5) {
              currentSld.bullets.push(cleanBullet);
            }
          }
        }
      });
      
      if (currentSld) {
        slideshowSlides.push(currentSld);
      }
      
      // Fallback slides if no headings could be parsed
      if (slideshowSlides.length <= 1) {
        const nonSpacedLines = textLines.filter(l => l.trim() !== "");
        slideshowSlides.push({
          title: "Nội dung gốc (Phần 1)",
          desc: "Nội dung chi tiết từ tài liệu:",
          bullets: nonSpacedLines.slice(0, 5)
        });
        if (nonSpacedLines.length > 5) {
          slideshowSlides.push({
            title: "Nội dung gốc (Phần 2)",
            desc: "Nội dung tiếp theo:",
            bullets: nonSpacedLines.slice(5, 10)
          });
        }
      }

      const pptHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Trình chiếu: ${doc.name}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: white; margin: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }
    .slideshow-container { width: 90%; max-width: 900px; height: 560px; background: #1e293b; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 50px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid #334155; position: relative; }
    .header { font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; color: #38bdf8; font-weight: 800; display: flex; justify-content: space-between; }
    .slide-body { flex: 1; display: flex; flex-direction: column; justify-content: center; margin: 20px 0; }
    .slide-title { font-size: 34px; font-weight: 900; color: #f8fafc; line-height: 1.25; margin: 0 0 15px 0; border-left: 6px solid #6366f1; padding-left: 15px; }
    .slide-desc { font-size: 18px; color: #cbd5e1; line-height: 1.6; margin: 0; }
    .bullet-list { padding-left: 25px; margin: 15px 0 0 0; }
    .bullet-list li { font-size: 17px; color: #cbd5e1; margin-bottom: 10px; line-height: 1.5; }
    .footer { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #64748b; border-top: 1px solid #334155; padding-top: 15px; }
    .controls { display: flex; gap: 10px; }
    .btn { background: #334155; border: none; color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 700; transition: background 0.2s, transform 0.1s; font-size: 13px; }
    .btn:hover { background: #475569; transform: translateY(-1px); }
    .btn-primary { background: #4f46e5; }
    .btn-primary:hover { background: #4338ca; }
  </style>
</head>
<body>
  <div class="slideshow-container">
    <div class="header">
      <span>Trình chiếu Bài giảng EduAI</span>
      <span id="slide-num">Slide 1</span>
    </div>
    
    <div class="slide-body" id="slide-content">
    </div>

    <div class="footer">
      <span>${doc.subject} ${doc.grade} • ${doc.lessonTopic || "Bài giảng mẫu"}</span>
      <div class="controls">
        <button class="btn" onclick="prevSlide()">◀ Slide trước</button>
        <button class="btn btn-primary" onclick="nextSlide()">Slide tiếp theo ▶</button>
      </div>
    </div>
  </div>

  <script>
    const slides = ${JSON.stringify(slideshowSlides)};

    let currentIdx = 0;

    function renderSlide() {
      const slide = slides[currentIdx];
      document.getElementById("slide-num").innerText = "Slide " + (currentIdx + 1) + " / " + slides.length;
      
      let html = '<h2 class="slide-title">' + slide.title + '</h2>';
      if (slide.desc) {
        html += '<p class="slide-desc">' + slide.desc + '</p>';
      }
      if (slide.bullets && slide.bullets.length > 0) {
        html += '<ul class="bullet-list">';
        slide.bullets.forEach(function(b) {
          html += '<li>' + b + '</li>';
        });
        html += '</ul>';
      }
      document.getElementById("slide-content").innerHTML = html;
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

    renderSlide();
  </script>
</body>
</html>`;
      const blob = new Blob([pptHtml], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cleanName}_eduai_TRINH_CHIEU.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    // 8. Uncorrupted minimal MP4 Video Download
    if (ext === ".mp4") {
      const mp4Blob = getMinimalMP4Blob();
      const url = URL.createObjectURL(mp4Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cleanName}_eduai.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    // 9. Canvas PNG generation
    if ([".png", ".jpg", ".jpeg", ".gif", ".svg"].includes(ext)) {
      const canvas = document.createElement("canvas");
      canvas.width = 1000;
      canvas.height = 750;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 1000, 750);
        grad.addColorStop(0, "#4f46e5");
        grad.addColorStop(1, "#312e81");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1000, 750);
        
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(60, 60, 880, 630, 24);
        ctx.fill();
        
        ctx.fillStyle = "#4f46e5";
        ctx.beginPath();
        ctx.roundRect(60, 60, 880, 24, [24, 24, 0, 0]);
        ctx.fill();
        
        ctx.fillStyle = "#1e1b4b";
        ctx.font = "bold 32px sans-serif";
        ctx.fillText(doc.name.substring(0, 50), 100, 140);
        
        ctx.fillStyle = "#4f46e5";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(`MÔN HỌC: ${doc.subject.toUpperCase()}   |   KHỐI LỚP: ${doc.grade.toUpperCase()}`, 100, 195);
        
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(100, 220);
        ctx.lineTo(900, 220);
        ctx.stroke();

        ctx.fillStyle = "#1e293b";
        ctx.font = "bold 18px sans-serif";
        ctx.fillText("NỘI DUNG TÀI LIỆU:", 100, 260);

        ctx.fillStyle = "#334155";
        ctx.font = "14px sans-serif";
        const contentLines = (doc.extractedText || "Không có nội dung văn bản.").split("\n").filter(l => l.trim().length > 0);
        let textY = 295;
        contentLines.slice(0, 13).forEach((line) => {
          let lineText = line.trim();
          if (lineText.length > 80) {
            lineText = lineText.substring(0, 77) + "...";
          }
          ctx.fillText(lineText, 100, textY);
          textY += 28;
        });

        ctx.fillStyle = "#94a3b8";
        ctx.font = "italic 13px sans-serif";
        ctx.fillText(`Kết xuất ảnh tài liệu gốc từ Hệ thống EduAI  •  Ngày: ${doc.uploadDate}`, 100, 675);
      }

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${cleanName}_kho_tailieu.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, "image/png");
      return;
    }

    // 10. General text fallback including metadata and full content text
    const fallbackContent = `========================================================================
                      EDUAI - BẢN GỐC TÀI LIỆU SƯ PHẠM
========================================================================
Tên tài liệu: ${doc.name}
Phân loại: ${doc.category}
Khối lớp: ${doc.grade}
Môn học: ${doc.subject}
Chủ đề bài dạy: ${doc.lessonTopic || "Chưa xác định"}
Tên tệp gốc: ${doc.fileName}
Dung lượng: ${doc.fileSize}
Thời gian tải lên: ${doc.uploadDate}

========================================================================
Nội dung chi tiết tài liệu gốc:
========================================================================

${doc.extractedText || "Không có nội dung văn bản chi tiết."}
========================================================================`;

    const blob = new Blob([fallbackContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cleanName}_eduai.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Populate sample documents for trial
  const handleLoadSamples = () => {
    const samples: DocumentItem[] = [
      {
        id: "sample-1",
        name: "Giáo án Toán lớp 4 - Bài 12: Biểu thức có chứa chữ (Cánh Diều)",
        category: "Giáo án",
        grade: "Khối 4",
        subject: "Toán",
        fileName: "Giao_An_Toan_Lop_4_Canh_Dieu_B12.doc",
        fileSize: "1.4 MB",
        fileExtension: ".doc",
        uploadDate: "23/06/2026 08:30",
        notes: "Giáo án soạn theo Công văn 2345 bám sát hoạt động khởi động, hình thành kiến thức, thực hành và vận dụng.",
        lessonTopic: "Bài 12: Biểu thức có chứa chữ",
        aiSummary: "Giáo án Bài 12 hướng dẫn học sinh làm quen với khái niệm biểu thức có chứa một chữ. Tập trung phát triển năng lực tư duy, lập luận toán học thông qua các ví dụ thực tiễn sinh động.",
        aiObjectives: [
          "Nhận biết và bước đầu biết tính giá trị của biểu thức có chứa một chữ khi thay chữ bằng số.",
          "Phát triển năng lực giải quyết vấn đề toán học và giao tiếp toán học."
        ],
        aiKeyActivities: [
          "Khởi động: Trò chơi chiếc hộp bí mật",
          "Khám phá: Bài toán tình huống thực tế",
          "Luyện tập: Thực hành làm bài tập 1, 2, 3",
          "Vận dụng: Giải quyết tình huống thực tế"
        ],
        extractedText: `KẾ HOẠCH BÀI DẠY (GIÁO ÁN)
MÔN: TOÁN - LỚP 4
BÀI 12: BIỂU THỨC CÓ CHỨA CHỮ (SÁCH CÁNH DIỀU)
Thời gian thực hiện: 1 tiết (35 phút)

I. MỤC TIÊU BÀI HỌC
1. Kiến thức, kĩ năng:
- Học sinh làm quen và bước đầu nhận biết biểu thức có chứa một chữ.
- Biết cách tính giá trị của biểu thức khi thay chữ bằng một chữ số cụ thể.
2. Năng lực chú trọng:
- Năng lực tư duy và lập luận toán học thông qua việc giải quyết tình huống thực tế.
- Năng lực giao tiếp toán học qua việc trình bày, chia sẻ cách tính giá trị biểu thức.
3. Phẩm chất: Rèn luyện tính cẩn thận, chính xác khi thực hiện tính toán.

II. THIẾT BỊ DẠY HỌC & ĐỒ DÙNG DẠY HỌC
- Giáo viên: Bảng phụ ghi sẵn các ví dụ, máy chiếu, thẻ chữ số và các thẻ chữ cái a, b, c.
- Học sinh: SGK Toán lớp 4 bộ Cánh Diều, vở ghi, bảng con và phấn.

III. TIẾN TRÌNH HOẠT ĐỘNG SƯ PHẠM CHI TIẾT
1. Hoạt động Khởi động (5 phút):
- Giáo viên kể câu chuyện: "Bạn Lan có 3 quyển vở. Mẹ mua thêm cho Lan một số quyển vở nữa. Hỏi Lan có tất cả bao nhiêu quyển vở?"
- Học sinh thảo luận nhóm đôi: Ta chưa biết mẹ mua thêm chính xác bao nhiêu quyển. Nếu mẹ mua thêm 1 quyển? 2 quyển? 5 quyển? số quyển vở Lan có tất cả sẽ là bao nhiêu?
- Học sinh phát biểu: Lan sẽ có "3 + 1", "3 + 2", hoặc "3 + 5" quyển vở.
- Giáo viên chốt ý, dẫn dắt học sinh vào khái niệm biểu thức chứa chữ.

2. Hoạt động Khám phá kiến thức (15 phút):
- Giáo viên biểu diễn bảng sau lên màn hình chiếu:
  + Có: 3 quyển vở.
  + Thêm: "a" quyển vở.
  + Có tất cả: "3 + a" quyển vở.
- Giáo viên nhấn mạnh: "3 + a" được gọi là một biểu thức có chứa một chữ.
- Giáo viên hướng dẫn tính giá trị biểu thức:
  + Nếu a = 1 thì 3 + a = 3 + 1 = 4. Ta nói 4 là một giá trị của biểu thức 3 + a.
  + Nếu a = 2 thì 3 + a = 3 + 2 = 5. Ta nói 5 là một giá trị của biểu thức 3 + a.
  + Nếu a = 5 thì 3 + a = 3 + 5 = 8. Ta nói 8 là một giá trị của biểu thức 3 + a.
- Học sinh rút ra kết luận chung: Mỗi lần thay chữ a bằng một số cụ thể, ta tính được một giá trị của biểu thức 3 + a.

3. Hoạt động Thực hành - Luyện tập (12 phút):
- Học sinh thực hành làm bài tập 1, 2, 3 trong Sách giáo khoa trang 28-29.
- Bài tập 1: Tính giá trị của biểu thức 12 + b với b = 3, b = 8, b = 10.
  + Học sinh tự làm vào vở cá nhân.
  + 3 học sinh lên bảng trình bày 3 trường hợp.
  + Học sinh nhận xét chéo bài làm trên bảng của bạn.
- Bài tập 2: Cho biểu thức y - 5. Tính giá trị biểu thức với y = 10, y = 15, y = 20.
  + Giáo viên gọi học sinh trung bình - yếu thực hiện để củng cố kỹ năng cơ bản.

4. Hoạt động Vận dụng (3 phút):
- Học sinh liên hệ tìm một vài biểu thức có chứa chữ liên quan đến thực tiễn (Ví dụ: Tuổi của anh trai hơn em là 5 tuổi. Nếu tuổi em là x thì tuổi anh trai là x + 5 tuổi).
- Giáo viên tổng kết buổi học, tuyên dương tinh thần học tập sôi nổi của cả lớp.`
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
        notes: "Tài liệu tham khảo số hóa dùng để minh họa bài giảng trên bảng tương tác thông minh lớp 1.",
        lessonTopic: "Bài 1: Chữ A, a",
        aiSummary: "Sách giáo khoa Tiếng Việt lớp 1 Tập 1 hỗ trợ học sinh học chữ cái, âm vần cơ bản và rèn luyện các kỹ năng Nghe, Nói, Đọc, Viết ban đầu.",
        aiObjectives: [
          "Nhận biết chữ cái và ghép vần chính xác",
          "Phát triển ngôn ngữ nói tự tin trước đám đông"
        ],
        aiKeyActivities: [
          "Nhận diện mặt chữ",
          "Tập viết chữ cái",
          "Đọc trơn từ ứng dụng"
        ],
        extractedText: `SÁCH GIÁO KHOA TIẾNG VIỆT LỚP 1 - TẬP 1
BỘ SÁCH: KẾT NỐI TRI THỨC VỚI CUỘC SỐNG

CHỦ ĐỀ 1: EM ĐI HỌC
BÀI 1: CHỮ A, a (TRANG 12 - 13)

I. MỤC TIÊU BÀI HỌC
- Nhận biết chữ cái A và a (chữ in hoa và chữ in thường).
- Phát âm đúng âm "a".
- Biết viết chữ viết thường "a" trên bảng con đúng quy trình nét viết.
- Phát triển kỹ năng nghe - nói thông qua hoạt động tương tác thảo luận tranh vẽ chủ đề dạo chơi công viên.

II. NỘI DUNG SÁCH GIÁO KHOA CHI TIẾT
1. Hoạt động 1: Nhận biết và Khám phá (Đọc âm)
- Quan sát tranh vẽ lớn: Cảnh gia đình cùng bé đi dạo trong công viên xanh mát.
- Giáo viên gợi ý chỉ ra các vật và sinh vật trong hình vẽ: "ba ba", "hoa", "lá cây", "nhà cửa".
- Khai thác tiếng chung: Tiếng "ba", "hoa", "lá" đều chứa âm "a".
- Học sinh luyện đọc âm "a": đọc to, rõ ràng, phát âm tròn môi.
- Học sinh đọc mẫu cá nhân, đọc đồng thanh cả lớp.

2. Hoạt động 2: Tập viết (Viết chữ)
- Chữ mẫu: chữ viết thường "a".
- Cấu tạo nét chữ: gồm 1 nét cong kín (độ cao 2 ô ly, độ rộng 1.5 ô ly) và 1 nét móc ngược dưới bám sát nét cong kín.
- Quy trình viết:
  + Đặt bút dưới đường kẻ ngang thứ 3 một chút, viết nét cong kín từ phải sang trái.
  + Re bút lên đường kẻ ngang thứ 3, viết nét móc ngược bám sát nét cong kín, dừng bút ở đường kẻ ngang thứ 2.
- Học sinh viết mẫu trên không trung bằng ngón tay.
- Học sinh viết thực tế trên bảng con cá nhân. Giáo viên sửa lỗi viết méo, lệch dòng cho từng em.

3. Hoạt động 3: Luyện nói (Phát triển ngôn ngữ)
- Chủ đề tranh: "Chào hỏi ngày đầu tiên đi học".
- Học sinh trao đổi thảo luận cặp đôi: Em chào ai khi đến trường? Thầy cô giáo đón em thế nào?
- Đại diện nhóm nhỏ đứng lên đóng vai thực hành chào hỏi lễ phép trước lớp.`
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
        notes: "Đề kiểm tra cuối kỳ gồm đầy đủ 4 kỹ năng Nghe - Nói - Đọc - Viết thiết kế theo chuẩn Bộ Giáo Dục.",
        lessonTopic: "Kiểm tra định kỳ cuối học kỳ II",
        aiSummary: "Đề thi đánh giá toàn diện năng lực học sinh cuối kỳ II môn Tiếng Anh lớp 5 bám sát ma trận đề thi chuẩn của Bộ Giáo dục & Đào tạo.",
        aiObjectives: [
          "Đánh giá khả năng nghe hiểu và hoàn thành hội thoại",
          "Kiểm tra vốn từ vựng và ngữ pháp trọng tâm"
        ],
        aiKeyActivities: [
          "Phần Nghe (Listening)",
          "Phần Đọc & Viết (Reading & Writing)",
          "Phần Nói (Speaking Interview)"
        ],
        extractedText: `ĐỀ KIỂM TRA ĐỊNH KỲ CUỐI HỌC KỲ II - MÔN TIẾNG ANH LỚP 5
Thời gian làm bài: 40 phút (Không kể thời gian giao đề)

PART I: LISTENING (2.5 points - 10 minutes)
Task 1: Listen and tick (V) the correct box. There is one example. (1.5 points)
Example: What is Nam's favorite subject? -> English (Ticked)

1. What will the weather be like in Da Nang tomorrow?
   [ ] A. It will be hot and sunny with high temperature.
   [ ] B. It will be cloudy and rainy with cool wind.
   [ ] C. It will be cold and stormy with heavy rain.

2. Where is the nearest City Zoo?
   [ ] A. It is next to the primary school.
   [ ] B. It is opposite the local cinema.
   [ ] C. It is on the corner of the street, between the cafe and stadium.

Task 2: Listen and fill in each gap with ONE word. (1.0 point)
1. Mai usually goes to school by ________ in the morning.
2. Peter wants to be a ________ in the future because he loves taking care of animals.

PART II: READING AND WRITING (5.0 points - 20 minutes)
Task 3: Read the passage and choose the best answers. (2.5 points)
"My name is Nam. Last summer holiday, I went to Ha Long Bay with my family. We traveled there by modern coach. In the morning, we swam in the warm blue sea and built beautiful sandcastles. In the afternoon, we took an exciting boat cruise around the ancient islands. We had delicious seafood at a famous local restaurant. We enjoyed our summer holiday very much."

1. Nam went to Ha Long Bay with his ________.
   A. classmates           B. family               C. teachers
2. How did they travel to Ha Long Bay?
   A. By train             B. By coach             C. By plane
3. What did they do in the afternoon?
   A. Swam in the sea      B. Built sandcastles    C. Took a boat cruise

Task 4: Reorder the words to make complete sentences. (2.5 points)
1. should / Why / go / we / by / coach / ?
   => ___________________________________________________________
2. going / Ho Chi Minh / I'm / visit / to / City / tomorrow / .
   => ___________________________________________________________

PART III: SPEAKING (2.5 points - 5 minutes)
1. Greeting & Self-introduction: Ask student's name, age, class, and favorites.
2. Ask about seasonal weather activities: "What's your favorite season? What do you usually do in that season?"`
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
        notes: "Phiếu ôn luyện cuối tuần giúp học sinh củng cố kiến thức về phép nhân, phép chia trong phạm vi 1000.",
        lessonTopic: "Ôn tập và rèn luyện Tuần 16",
        aiSummary: "Phiếu ôn tập cuối tuần gồm hệ thống bài tập trắc nghiệm và tự luận ngắn giúp củng cố toàn bộ kiến thức tuần 16 môn Toán.",
        aiObjectives: [
          "Thành thạo phép nhân, chia trong phạm vi 1000",
          "Rèn luyện tính cẩn thận khi tính toán"
        ],
        aiKeyActivities: [
          "Trắc nghiệm nhanh",
          "Tự luận rèn kỹ năng",
          "Thử thách tư duy"
        ],
        extractedText: `PHIẾU BÀI TẬP CUỐI TUẦN 16 - MÔN TOÁN LỚP 3
Họ và tên học sinh: ....................................... Lớp: 3...

PHẦN I: TRẮC NGHIỆM KHÁCH QUAN (4.0 điểm)
Khoanh tròn vào chữ cái đặt trước câu trả lời chính xác nhất:

Câu 1: Kết quả đúng của phép nhân 123 x 3 là:
A. 369
B. 366
C. 396
D. 309

Câu 2: Số dư trong phép chia số 125 cho 4 là bao nhiêu?
A. Số dư bằng 0
B. Số dư bằng 1
C. Số dư bằng 2
D. Số dư bằng 3

Câu 3: Một tấm vải dài 24m, người ta cắt đi 1/4 tấm vải đó để may áo. Số mét vải còn lại của tấm vải là:
A. 6 mét
B. 12 mét
C. 18 mét
D. 20 mét

Câu 4: Đồng hồ chỉ mấy giờ nếu kim dài chỉ số 6 và kim ngắn chỉ lệch qua số 8 một chút?
A. 8 giờ đúng
B. 8 giờ 30 phút
C. 9 giờ kém 15 phút
D. 6 giờ 40 phút

PHẦN II: TỰ LUẬN THỰC HÀNH (6.0 điểm)

Bài 1: Đặt tính rồi tính (2.0 điểm)
a) 241 x 4                                b) 848 : 4
................                        ................
................                        ................
................                        ................

Bài 2: Tìm giá trị của x (2.0 điểm)
a) x : 6 = 112                            b) x * 5 = 525 - 25
................                        ................
................                        ................

Bài 3: Bài toán có lời văn giải thực tế (2.0 điểm)
Đề bài: Một cửa hàng lương thực có 180 kg gạo nếp sạch. Số gạo tẻ trong kho gấp 3 lần số gạo nếp. Hỏi cửa hàng lương thực đó có tất cả bao nhiêu ki-lô-gam cả hai loại gạo nếp và gạo tẻ?
Lời giải chi tiết:
...........................................................................
...........................................................................
...........................................................................`
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
        notes: "Video Timelapse sắc nét 1080p hỗ trợ bài dạy về sự lớn lên của thực vật.",
        lessonTopic: "Sự phát triển và nảy mầm của thực vật (Timelapse)",
        aiSummary: "Video tư liệu ghi hình toàn bộ quá trình hạt đậu xanh nảy mầm và phát triển thành cây con, dùng trong bài dạy Thực vật lớp 2.",
        aiObjectives: [
          "Hiểu các điều kiện cần thiết để hạt nảy mầm",
          "Phát triển óc quan sát khoa học ở học sinh"
        ],
        aiKeyActivities: [
          "Xem video Timelapse",
          "Thảo luận nhóm về các giai đoạn phát triển",
          "Ghi chép nhật ký quan sát"
        ],
        extractedText: `THÔNG TIN TƯ LIỆU VIDEO MINH HỌA BÀI GIẢNG
TÊN FILE: Timelaspe_Su_Lon_Len_Cua_Thuc_Vat_1080p.mp4
MÔN HỌC: TỰ NHIÊN & XÃ HỘI LỚP 2 - CHỦ ĐỀ THỰC VẬT

I. THÔNG TIN KỸ THUẬT VIDEO:
- Thời lượng: 45 giây (Tương đương 14 ngày thực tế ghi hình liên tục).
- Định dạng: MP4, chất lượng video Full HD 1080p sắc nét, tốc độ khung hình 60fps mượt mà.
- Chế độ: Timelapse (Tua nhanh thời gian từ khoảnh khắc gieo hạt dưới lòng đất đến khi ra cặp lá mầm thứ 4 đón nắng).

II. TIẾN TRÌNH QUAN SÁT CHO HỌC SINH (PHÂN CHIA THEO GIÂY):
- Giây 00 - 10: Hạt đỗ xanh ngậm nước trương nở phồng to. Vỏ hạt nứt nhẹ, một chiếc rễ mầm nhỏ đầu tiên trắng muốt đâm sâu xuống lòng đất bắt đầu làm nhiệm vụ hút nước và chất dinh dưỡng.
- Giây 11 - 25: Thân mầm uốn cong vươn mình kiêu hãnh lên khỏi mặt đất, đẩy bỏ lớp vỏ bọc hạt khô héo ra ngoài để lộ hai lá mầm màu xanh non sáng ngời.
- Giây 26 - 35: Hai lá mầm xòe rộng sang hai bên đón ánh sáng mặt trời để thực hiện quang hợp, rễ bên mọc nhiều hơn, đâm nhánh rộng vào đất giúp cây bám chắc. Thân mầm phát triển vươn dài rõ rệt.
- Giây 36 - 45: Xuất hiện chồi ngọn, chồi ngọn bung nở phát triển thành cặp lá thật thứ nhất có khía rãnh răng cưa đặc trưng. Cây đậu xanh non đứng thẳng, cứng cáp và khỏe mạnh.

III. GỢI Ý CÁC CÂU HỎI THẢO LUẬN TRONG TIẾT DẠY:
1. Em quan sát thấy hạt đỗ thay đổi như thế nào sau khi được gieo xuống đất ẩm?
2. Bộ phận nào của cây phát triển ra trước tiên để giúp cây non sinh trưởng? Rễ hay lá?
3. Cây non cần những điều kiện môi trường nào (đất xốp, nước ẩm, ánh sáng ấm) để có thể nảy mầm nhanh và lớn mạnh như trong tư liệu video?`
      }
    ];
    saveDocs(samples);
  };

  // Filter & Sort computation
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (doc.notes && doc.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = activeCategory === "All" || doc.category === activeCategory;
    const matchesGrade = activeGrade === "All" || doc.grade === activeGrade || doc.grade === "Tất cả";
    const matchesSubject = activeSubject === "All" || doc.subject === activeSubject || doc.subject === "Tất cả";
    return matchesSearch && matchesCategory && matchesGrade && matchesSubject;
  }).sort((a, b) => {
    if (sortBy === "week-asc") {
      const weekA = extractWeekNumber(a.name || a.fileName);
      const weekB = extractWeekNumber(b.name || b.fileName);
      if (weekA !== weekB) {
        return weekA - weekB;
      }
      return a.name.localeCompare(b.name, "vi", { sensitivity: "base" });
    }
    if (sortBy === "subject-week") {
      // 1. Sort by Grade (Khối)
      if (a.grade !== b.grade) {
        return a.grade.localeCompare(b.grade, "vi", { sensitivity: "base" });
      }
      // 2. Sort by Subject (Môn học)
      if (a.subject !== b.subject) {
        return a.subject.localeCompare(b.subject, "vi", { sensitivity: "base" });
      }
      // 3. Sort by Week (Tuần) numerically
      const weekA = extractWeekNumber(a.name || a.fileName);
      const weekB = extractWeekNumber(b.name || b.fileName);
      if (weekA !== weekB) {
        return weekA - weekB;
      }
      // 4. Fallback to name
      return a.name.localeCompare(b.name, "vi", { sensitivity: "base" });
    }
    if (sortBy === "name-asc") {
      return a.name.localeCompare(b.name, "vi", { sensitivity: "base" });
    }
    if (sortBy === "name-desc") {
      return b.name.localeCompare(a.name, "vi", { sensitivity: "base" });
    }
    if (sortBy === "date-desc") {
      return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
    }
    if (sortBy === "date-asc") {
      return new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
    }
    return 0;
  });

  const toggleSelectAll = () => {
    if (selectedForDelete.length === filteredDocs.length && filteredDocs.length > 0) {
      // Deselect all
      setSelectedForDelete([]);
    } else {
      // Select all currently filtered
      setSelectedForDelete(filteredDocs.map(d => d.id));
    }
  };

  return (
    <div className="space-y-6" id="document-repository-container">
      {/* 1. Header Hero section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="space-y-1">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Library className="w-5 h-5 text-indigo-600" />
            Kho Tài Liệu Sư Phạm Quốc Gia
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl">
            Lưu trữ tập trung và sắp xếp khoa học toàn bộ Giáo án 2345, Sách giáo khoa điện tử và Tài liệu bổ trợ tự do do thầy cô tải lên. Tự động liên kết, phân loại nhanh chóng theo khối và môn học.
          </p>
        </div>

        {documents.length === 0 && (
          <button
            id="btn-load-samples"
            onClick={handleLoadSamples}
            className="text-xs font-bold bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-100 text-indigo-700 px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Nạp tài liệu mẫu dùng thử
          </button>
        )}
      </div>

      {/* 2. Interactive Quick Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            label: "TỔNG SỐ TÀI LIỆU", 
            val: documents.length, 
            icon: Folder, 
            color: "text-indigo-600 bg-indigo-50",
            id: "stat-total-docs"
          },
          { 
            label: "GIÁO ÁN (CV 2345)", 
            val: documents.filter(d => d.category === "Giáo án").length, 
            icon: BookOpen, 
            color: "text-emerald-600 bg-emerald-50",
            id: "stat-plans"
          },
          { 
            label: "SÁCH GIÁO KHOA", 
            val: documents.filter(d => d.category === "Sách giáo khoa").length, 
            icon: Library, 
            color: "text-amber-600 bg-amber-50",
            id: "stat-textbooks"
          },
          { 
            label: "TÀI LIỆU THAM KHẢO", 
            val: documents.filter(d => d.category === "Tài liệu tham khảo").length, 
            icon: Layers, 
            color: "text-purple-600 bg-purple-50",
            id: "stat-references"
          },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx} 
              id={stat.id}
              className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center gap-4 shadow-sm"
            >
              <div className={`p-2.5 rounded-lg ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase block">{stat.label}</span>
                <span className="text-xl font-black text-slate-800 font-mono mt-0.5 block">{stat.val}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Main Split Workspace: Left (Upload form), Right (Filtered Docs View) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT WORKSPACE PANEL: File Upload & Classification */}
        <div className="xl:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5" id="upload-panel">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Tải Tài Liệu Lên Kho</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {uploadMode === "bulk" 
                  ? "Tải lên hàng loạt giáo án cho cả năm học cùng lúc." 
                  : "Kéo thả tệp tin giáo án hoặc nhấn để duyệt thủ công từ máy tính."}
              </p>
            </div>
          </div>

          {/* TAB MODE SELECTOR */}
          <div className="flex bg-slate-100 p-1 rounded-xl" id="upload-mode-tabs">
            <button
              type="button"
              onClick={() => {
                setUploadMode("single");
                setSelectedBulkFiles([]);
                setUploadError(null);
                setBulkMessage(null);
              }}
              className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all ${
                uploadMode === "single"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Tải đơn lẻ
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadMode("bulk");
                setSelectedFile(null);
                setUploadError(null);
                setBulkMessage(null);
              }}
              className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                uploadMode === "bulk"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              Tải hàng loạt 📦
            </button>
          </div>

          {uploadMode === "single" ? (
            <form onSubmit={handleSaveDocument} className="space-y-4">
              
              {/* DRAG AND DROP ZONE FOR FILES */}
              <div
                id="upload-dropzone"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleFileClick}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
                  isDragging 
                    ? "border-indigo-500 bg-indigo-50/50" 
                    : selectedFile 
                      ? "border-emerald-300 bg-emerald-50/10 hover:border-emerald-400" 
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="*"
                />

                {selectedFile ? (
                  <>
                    <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
                      <CheckCircle className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-700 block max-w-[250px] truncate mx-auto">
                        {selectedFile.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="text-[10px] text-rose-600 hover:underline font-bold"
                    >
                      Hủy chọn tệp này
                    </button>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-slate-100 rounded-full text-slate-400">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-700 block">Kéo thả tệp tin vào đây</span>
                      <span className="text-[11px] text-slate-500 block">Hoặc click để duyệt tệp tin (.docx, .txt, ...)</span>
                    </div>
                    <span className="text-[9px] text-slate-400 block max-w-[200px] leading-tight">
                      Hỗ trợ: PDF, Word, PowerPoint, Excel, Hình ảnh, Văn bản hoặc Video (Tối đa 50MB)
                    </span>
                  </>
                )}
              </div>

              {/* AI WORD DOCUMENT ANALYSIS STATUS */}
              {isAnalyzing && (
                <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl flex items-center gap-2.5 text-xs text-indigo-700 font-semibold animate-pulse" id="ai-analyzing-status">
                  <Sparkles className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                  <span className="leading-tight text-left">Trợ lý AI đang quét giáo án toàn diện và tóm tắt học thuật...</span>
                </div>
              )}

              {analysisResult && (
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl space-y-1.5 text-left" id="ai-analysis-success">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-900 font-extrabold">
                    <Sparkles className="w-4 h-4 text-emerald-600 animate-bounce" />
                    <span>Đọc & phân tích tệp thành công!</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    AI đã tự động trích xuất thông tin và điền: <b>Tên tài liệu</b>, <b>Môn học</b>, <b>Phân loại</b> và <b>Ghi chú tóm tắt</b>. Thầy cô có thể điều chỉnh lại nếu cần thiết.
                  </p>
                </div>
              )}

              {analysisError && (
                <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-center gap-2 text-xs text-amber-900 font-medium" id="ai-analysis-error">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-left leading-tight">{analysisError}</span>
                </div>
              )}

              {/* FORM SPECIFICATIONS */}
              <div className="space-y-3.5 pt-1 text-left">
                
                {/* Document Title (Pre-filled or edited) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Tên hiển thị tài liệu <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Nhập tên tài liệu lưu trữ..."
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-xs rounded-lg px-3 py-2 font-medium text-slate-700 shadow-sm focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                {/* Lesson Topic / Dạy bài gì */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Dạy bài / Chủ đề cốt lõi</label>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedFile) {
                          analyzeFile(selectedFile);
                        } else {
                          setAnalysisError("Vui lòng tải tệp tin lên trước khi chạy nhận diện AI.");
                        }
                      }}
                      disabled={isAnalyzing}
                      className="text-[9.5px] text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 font-extrabold px-2 py-0.5 rounded flex items-center gap-1 transition-all cursor-pointer border border-indigo-100"
                      title="Nhấn để yêu cầu AI nhận diện lại"
                    >
                      <Sparkles className={`w-3 h-3 text-indigo-500 ${isAnalyzing ? "animate-spin" : "animate-pulse"}`} />
                      {isAnalyzing ? "Đang quét..." : "AI Tự nhận diện 🔄"}
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Ví dụ: Bài 12: Biểu thức có chứa chữ..."
                    value={docLessonTopic}
                    onChange={(e) => setDocLessonTopic(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-xs rounded-lg px-3 py-2 font-medium text-slate-700 shadow-sm focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                {/* Main Classification Category */}
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Phân loại chính</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { label: "Giáo án", val: "Giáo án" },
                      { label: "Sách GK", val: "Sách giáo khoa" },
                      { label: "Tham khảo", val: "Tài liệu tham khảo" }
                    ].map((cat) => (
                      <button
                        key={cat.val}
                        type="button"
                        onClick={() => {
                          setDocCategory(cat.val as any);
                          // Default updates on category changes
                          if (cat.val === "Tài liệu tham khảo") {
                            setDocGrade("Khối 1");
                          }
                        }}
                        className={`text-[11px] py-1.5 px-1 rounded-md font-bold border transition-all cursor-pointer truncate ${
                          docCategory === cat.val
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* DYNAMIC FORM SEGMENTS */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Grade Selection */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Khối lớp</label>
                    <select
                      value={docGrade}
                      onChange={(e) => setDocGrade(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-medium text-slate-700 shadow-sm focus:outline-hidden focus:border-indigo-500"
                    >
                      {grades.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                      {docCategory === "Tài liệu tham khảo" && (
                        <option value="Tất cả">Tất cả các khối</option>
                      )}
                    </select>
                  </div>

                  {/* Subject Selection */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Môn học</label>
                    <select
                      value={docSubject}
                      onChange={(e) => setDocSubject(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-medium text-slate-700 shadow-sm focus:outline-hidden focus:border-indigo-500"
                    >
                      {subjects.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                      {docCategory === "Tài liệu tham khảo" && (
                        <option value="Tất cả">Chung / Đa môn</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Conditional options for Textbook sets */}
                {docCategory === "Sách giáo khoa" && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Bộ sách giáo khoa</label>
                    <select
                      value={docBookSeries}
                      onChange={(e) => setDocBookSeries(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-medium text-slate-700 shadow-sm focus:outline-hidden focus:border-indigo-500"
                    >
                      {bookSeriesList.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Conditional options for Reference Materials Group */}
                {docCategory === "Tài liệu tham khảo" && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Nhóm tài liệu tham khảo</label>
                    <select
                      value={docRefGroup}
                      onChange={(e) => setDocRefGroup(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-medium text-slate-700 shadow-sm focus:outline-hidden focus:border-indigo-500"
                    >
                      {refGroups.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Custom notes or curriculum context - Replaced with beautiful AI Summary display block */}
                {(docNotes || analysisResult) ? (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-left" id="ai-summary-display-block">
                    <div className="flex items-center gap-1.5 text-[10px] text-indigo-700 font-extrabold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span>AI Tổng Quan & Mục Tiêu Bài Học</span>
                    </div>
                    
                    {docLessonTopic && (
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Các bài học nhận diện được:</span>
                        <p className="text-xs font-bold text-indigo-950 leading-snug">{docLessonTopic}</p>
                      </div>
                    )}

                    {analysisResult?.objectives && analysisResult.objectives.length > 0 && (
                      <div className="space-y-1 border-t border-slate-100 pt-1.5">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Mục tiêu phát triển năng lực:</span>
                        <ul className="space-y-0.5 text-left list-none">
                          {analysisResult.objectives.slice(0, 3).map((obj: string, i: number) => (
                            <li key={i} className="text-[11px] font-medium text-slate-600 flex items-start gap-1.5">
                              <span className="text-indigo-500 font-black mt-0.5">•</span>
                              <span>{obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-1" id="ai-summary-placeholder">
                    <div className="flex justify-center text-slate-400">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">AI Phân Tích Tự Động</span>
                    <p className="text-[10px] text-slate-400 leading-normal px-2">
                      Nội dung bài học nhận diện và mục tiêu sẽ tự động hiển thị tại đây sau khi AI phân tích tệp tin hoặc văn bản dán ở trên.
                    </p>
                  </div>
                )}

              </div>

              {/* PROGRESS & ACTIONS BUTTON */}
              {isUploading && (
                <div className="space-y-1.5" id="upload-progress-container">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>Đang tải lên và mã hóa...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-200" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {uploadSuccess && (
                <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg border border-emerald-100 flex items-center gap-1.5 text-[11px] font-medium" id="upload-success-toast">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Đã lưu tài liệu mới vào kho thành công!</span>
                </div>
              )}

              {uploadError && (
                <div className="bg-rose-50 text-rose-700 px-3 py-2 rounded-lg border border-rose-100 flex items-center gap-1.5 text-[11px] font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />
                  <span>{uploadError}</span>
                </div>
              )}

              <button
                id="btn-submit-document"
                type="submit"
                disabled={isUploading || !selectedFile}
                className="w-full h-10 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Lưu Vào Kho Lưu Trữ
              </button>
            </form>
          ) : (
            <form onSubmit={handleSaveBulkDocuments} className="space-y-4">
              
              {/* DRAG AND DROP ZONE FOR BULK FILES */}
              <div
                id="upload-dropzone-bulk"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleFileClick}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                  isDragging 
                    ? "border-indigo-500 bg-indigo-50/50" 
                    : selectedBulkFiles.length > 0 
                      ? "border-emerald-300 bg-emerald-50/5 hover:border-emerald-400" 
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="*"
                  multiple
                />

                <div className="p-2.5 bg-indigo-50 rounded-full text-indigo-700">
                  <Upload className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-700 block">Kéo thả nhiều tệp tin vào đây</span>
                  <span className="text-[11px] text-slate-500 block">Hoặc click để chọn nhiều tệp giáo án cùng lúc</span>
                </div>
                <span className="text-[9px] text-slate-400 block max-w-[220px] leading-tight">
                  Hỗ trợ tải toàn bộ giáo án của 1 học kỳ hoặc cả năm học (.docx, .pdf, .txt...)
                </span>
              </div>

              {/* LIST OF SELECTED BULK FILES */}
              {selectedBulkFiles.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 max-h-[220px] overflow-y-auto divide-y divide-slate-200 text-left" id="bulk-files-list">
                  <div className="bg-slate-100 px-3 py-1.5 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Danh sách tệp chuẩn bị tải ({selectedBulkFiles.length})</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBulkFiles([]);
                        setBulkStatuses({});
                      }}
                      className="text-[10px] text-rose-600 hover:underline font-bold"
                    >
                      Xóa tất cả
                    </button>
                  </div>
                  {selectedBulkFiles.map((file, idx) => {
                    const status = bulkStatuses[file.name] || "waiting";
                    const fileExt = "." + file.name.split(".").pop();
                    return (
                      <div key={idx} className="p-2.5 flex items-center justify-between gap-2.5 bg-white">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="shrink-0 scale-75">
                            {getFormatIcon(fileExt)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-bold text-slate-700 block truncate" title={file.name}>
                              {file.name}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono block">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                            {status === "error" && bulkErrors[file.name] && (
                              <span className="text-[10px] text-rose-600 font-bold block leading-tight mt-1 whitespace-normal break-words max-w-[220px]">
                                ⚠️ {bulkErrors[file.name]}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {status === "waiting" && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-slate-500" /> Sẵn sàng
                            </span>
                          )}
                          {status === "uploading" && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse">
                              <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping mr-0.5 inline-block" /> Tải lên...
                            </span>
                          )}
                          {status === "analyzing" && (
                            <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse">
                              <Sparkles className="w-2.5 h-2.5 text-amber-500 animate-spin mr-0.5 inline-block" /> AI Đọc...
                            </span>
                          )}
                          {status === "success" && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                              <CheckCircle className="w-2.5 h-2.5 text-emerald-600 mr-0.5 inline-block" /> Xong
                            </span>
                          )}
                          {status === "error" && (
                            <span 
                              className="text-[10px] bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded flex items-center gap-1 cursor-help"
                              title={bulkErrors[file.name] || "Lỗi không xác định"}
                            >
                              <AlertCircle className="w-2.5 h-2.5 text-rose-600 mr-0.5 inline-block" /> Lỗi
                            </span>
                          )}
                          
                          {status === "waiting" && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBulkFiles(prev => prev.filter((_, fIdx) => fIdx !== idx));
                                setBulkStatuses(prev => {
                                  const copy = { ...prev };
                                  delete copy[file.name];
                                  return copy;
                                });
                              }}
                              className="text-slate-400 hover:text-rose-600 p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* COMMON METADATA SPECIFICATIONS */}
              <div className="space-y-3.5 pt-1 text-left">
                
                {/* Main Classification Category */}
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Phân loại chung cho lô tệp này</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { label: "Giáo án", val: "Giáo án" },
                      { label: "Sách GK", val: "Sách giáo khoa" },
                      { label: "Tham khảo", val: "Tài liệu tham khảo" }
                    ].map((cat) => (
                      <button
                        key={cat.val}
                        type="button"
                        onClick={() => {
                          setDocCategory(cat.val as any);
                          if (cat.val === "Tài liệu tham khảo") {
                            setDocGrade("Khối 1");
                          }
                        }}
                        className={`text-[11px] py-1.5 px-1 rounded-md font-bold border transition-all cursor-pointer truncate ${
                          docCategory === cat.val
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* DYNAMIC FORM SEGMENTS */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Grade Selection */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Khối lớp chung</label>
                    <select
                      value={docGrade}
                      onChange={(e) => setDocGrade(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-medium text-slate-700 shadow-3xs focus:outline-hidden focus:border-indigo-500"
                    >
                      {grades.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                      {docCategory === "Tài liệu tham khảo" && (
                        <option value="Tất cả">Tất cả các khối</option>
                      )}
                    </select>
                  </div>

                  {/* Subject Selection */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Môn học chung</label>
                    <select
                      value={docSubject}
                      onChange={(e) => setDocSubject(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-medium text-slate-700 shadow-3xs focus:outline-hidden focus:border-indigo-500"
                    >
                      {subjects.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                      {docCategory === "Tài liệu tham khảo" && (
                        <option value="Tất cả">Chung / Đa môn</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Conditional options for Textbook sets */}
                {docCategory === "Sách giáo khoa" && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Bộ sách giáo khoa</label>
                    <select
                      value={docBookSeries}
                      onChange={(e) => setDocBookSeries(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-medium text-slate-700 shadow-3xs focus:outline-hidden focus:border-indigo-500"
                    >
                      {bookSeriesList.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Conditional options for Reference Materials Group */}
                {docCategory === "Tài liệu tham khảo" && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Nhóm tài liệu tham khảo</label>
                    <select
                      value={docRefGroup}
                      onChange={(e) => setDocRefGroup(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-medium text-slate-700 shadow-3xs focus:outline-hidden focus:border-indigo-500"
                    >
                      {refGroups.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-left text-[11px] text-indigo-950 space-y-1 leading-normal">
                  <span className="font-extrabold flex items-center gap-1 text-indigo-850">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Quy trình tự động hóa
                  </span>
                  <p>Hệ thống sẽ tự động ghép tên tài liệu: <b>{docGrade} - [Tên tệp tin]</b>.</p>
                  <p>Đồng thời AI sẽ tự động đọc lướt nội dung từng tệp để nhận diện <b>Chủ đề bài dạy</b> và <b>Mô tả tóm tắt học thuật</b> tương ứng.</p>
                </div>

              </div>

              {/* PROGRESS & ACTIONS BUTTON */}
              {isUploading && (
                <div className="space-y-1.5" id="upload-progress-container-bulk">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>Đang tiến hành tải lên hàng loạt...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-200" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {bulkMessage && (
                <div className="bg-emerald-50 text-emerald-800 px-3 py-2 rounded-lg border border-emerald-100 flex items-center gap-1.5 text-[11px] font-medium" id="bulk-success-toast">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{bulkMessage}</span>
                </div>
              )}

              {uploadError && (
                <div className="bg-rose-50 text-rose-750 px-3 py-2 rounded-lg border border-rose-100 flex items-center gap-1.5 text-[11px] font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />
                  <span>{uploadError}</span>
                </div>
              )}

              <button
                id="btn-submit-bulk-document"
                type="submit"
                disabled={isUploading || selectedBulkFiles.length === 0}
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Layers className="w-4 h-4" />
                Lưu Hàng Loạt Vào Kho ({selectedBulkFiles.length})
              </button>
            </form>
          )}
        </div>

        {/* RIGHT WORKSPACE PANEL: Filterable Documents List */}
        <div className="xl:col-span-8 space-y-4" id="documents-list-panel">
          
          {/* SEARCH AND FILTERS BAR */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 text-left">
            
            {/* Row 1: Search & View modes */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="doc-search-input"
                  type="text"
                  placeholder="Tìm kiếm tài liệu bằng từ khóa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-4 py-2.5 font-medium text-slate-700 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                />
              </div>

              {/* Category buttons tab bar */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto shrink-0">
                {[
                  { label: "Tất cả", val: "All" },
                  { label: "Giáo án", val: "Giáo án" },
                  { label: "Sách GK", val: "Sách giáo khoa" },
                  { label: "Tham khảo", val: "Tài liệu tham khảo" }
                ].map(cat => (
                  <button
                    key={cat.val}
                    type="button"
                    onClick={() => {
                      setActiveCategory(cat.val as any);
                      if (cat.val === "Giáo án") {
                        setSortBy("week-asc");
                      } else if (sortBy === "week-asc" || sortBy === "subject-week") {
                        setSortBy("name-asc");
                      }
                    }}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      activeCategory === cat.val 
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Select Filters (Grade & Subject) */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 items-center">
              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase flex items-center gap-1">
                <Filter className="w-3 h-3" /> Bộ lọc nhanh:
              </span>

              {/* Grade filter */}
              <select
                id="doc-filter-grade"
                value={activeGrade}
                onChange={(e) => setActiveGrade(e.target.value)}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] rounded-lg px-2.5 py-1 font-semibold text-slate-600 focus:outline-hidden"
              >
                <option value="All">Tất cả Khối lớp</option>
                {grades.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              {/* Subject filter */}
              <select
                id="doc-filter-subject"
                value={activeSubject}
                onChange={(e) => setActiveSubject(e.target.value)}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] rounded-lg px-2.5 py-1 font-semibold text-slate-600 focus:outline-hidden"
              >
                <option value="All">Tất cả Môn học</option>
                {subjects.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {/* Sort filter */}
              <div className="flex items-center gap-1.5 pl-1.5 sm:border-l sm:border-slate-200" id="doc-sort-container">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  id="doc-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] rounded-lg px-2.5 py-1 font-semibold text-slate-600 focus:outline-hidden cursor-pointer"
                >
                  <option value="week-asc">Tuần học: Tuần 1 ➔ Tuần cuối 🔢</option>
                  <option value="subject-week">Môn & Tuần học (Giáo án) 📚</option>
                  <option value="name-asc">Tên: A-Z (ABC) 🔠</option>
                  <option value="name-desc">Tên: Z-A 🔤</option>
                  <option value="date-desc">Mới nhất 📅</option>
                  <option value="date-asc">Cũ nhất 🗓️</option>
                </select>
              </div>

              {/* Reset button if filtered */}
              {(activeCategory !== "All" || activeGrade !== "All" || activeSubject !== "All" || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory("All");
                    setActiveGrade("All");
                    setActiveSubject("All");
                    setSearchQuery("");
                  }}
                  className="text-[10px] text-indigo-600 hover:text-indigo-700 font-bold ml-auto flex items-center gap-0.5"
                >
                  Xóa bộ lọc
                </button>
              )}

              {/* Bulk Delete Actions */}
              {documents.length > 0 && (
                <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-0.5 ml-auto">
                  <label className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-slate-600 cursor-pointer hover:bg-slate-50 rounded-md">
                    <input
                      type="checkbox"
                      className="rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                      checked={selectedForDelete.length > 0 && selectedForDelete.length === filteredDocs.length}
                      ref={input => {
                        if (input) {
                          input.indeterminate = selectedForDelete.length > 0 && selectedForDelete.length < filteredDocs.length;
                        }
                      }}
                      onChange={toggleSelectAll}
                    />
                    Chọn tất cả
                  </label>
                  
                  {selectedForDelete.length > 0 && (
                    <button
                      type="button"
                      onClick={handleConfirmBulkDelete}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xóa {selectedForDelete.length} mục
                    </button>
                  )}
                </div>
              )}

              {/* View mode buttons */}
              <div className="flex gap-1 border border-slate-200 rounded-lg p-0.5 ml-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1 rounded-md transition-all cursor-pointer ${viewMode === "grid" ? "bg-slate-100 text-slate-700" : "text-slate-400 hover:text-slate-600"}`}
                  title="Hiển thị dạng lưới"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-1 rounded-md transition-all cursor-pointer ${viewMode === "list" ? "bg-slate-100 text-slate-700" : "text-slate-400 hover:text-slate-600"}`}
                  title="Hiển thị dạng danh sách"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* LISTING CONTAINER */}
          {filteredDocs.length === 0 ? (
            /* EMPTY STATE - REINFORCING DESKTOP PRECISION AESTHETIC */
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm" id="repo-empty-state">
              <div className="p-4 bg-slate-50 rounded-full border border-dashed border-slate-200 relative">
                <Folder className="w-10 h-10 text-slate-300" />
                <Upload className="w-4 h-4 text-slate-400 absolute right-3 bottom-3" />
              </div>
              
              <div className="space-y-1.5 max-w-sm">
                <h4 className="text-sm font-extrabold text-slate-700">Thầy cô chưa có tài liệu nào ở mục này</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {documents.length === 0 
                    ? "Kho lưu trữ hiện đang trống. Hãy kéo thả giáo án hằng ngày của thầy cô vào bảng bên trái để lưu trữ trực quan và tải xuống bất cứ lúc nào!" 
                    : "Không tìm thấy tài liệu phù hợp với tiêu chí tìm kiếm và bộ lọc nhanh đã chọn. Thầy cô hãy thử thay đổi từ khóa hoặc xóa bớt bộ lọc."}
                </p>
              </div>

              {documents.length === 0 && (
                <button
                  id="btn-empty-load-samples"
                  onClick={handleLoadSamples}
                  className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  Nạp tài liệu mẫu để kiểm tra tính năng
                </button>
              )}
            </div>
          ) : (
            /* RENDER VIEW GRID OR LIST */
            <AnimatePresence mode="popLayout">
              {viewMode === "grid" ? (
                /* GRID MODE */
                <motion.div 
                  layout
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  id="docs-grid-layout"
                >
                  {filteredDocs.map((doc) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      key={doc.id}
                      id={`doc-card-${doc.id}`}
                      onClick={() => setPreviewDoc(doc)}
                      onMouseEnter={(e) => handleMouseEnterDoc(doc, e)}
                      onMouseMove={handleMouseMoveDoc}
                      onMouseLeave={handleMouseLeaveDoc}
                      className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between text-left relative group shadow-sm"
                    >
                      {/* Top content row */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex gap-2 items-start">
                            <input
                              type="checkbox"
                              className="mt-1 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer flex-shrink-0"
                              checked={selectedForDelete.includes(doc.id)}
                              onChange={(e) => toggleSelectForDelete(doc.id, e as any)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            {getFormatIcon(doc.fileExtension)}
                          </div>
                          <div className="flex flex-wrap gap-1 items-end justify-end max-w-[120px]">
                            {/* Class/Grade Badge */}
                            <span className="text-[9px] bg-slate-100 border border-slate-200/60 text-slate-600 font-bold px-1.5 py-0.5 rounded">
                              {doc.grade}
                            </span>
                            {/* Category Badge */}
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                              doc.category === "Giáo án" 
                                ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                                : doc.category === "Sách giáo khoa" 
                                  ? "bg-amber-50 border-amber-100 text-amber-700" 
                                  : "bg-purple-50 border-purple-100 text-purple-700"
                            }`}>
                              {doc.category}
                            </span>
                          </div>
                        </div>

                        {/* Title & metadata */}
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-slate-800 line-clamp-2 leading-snug group-hover:text-indigo-650 transition-colors">
                            {doc.name}
                          </h4>
                          <div className="flex flex-wrap gap-x-2 text-[10px] text-slate-400 font-medium">
                            <span>Môn: <b>{doc.subject}</b></span>
                            <span>•</span>
                            <span>{doc.fileSize}</span>
                          </div>
                        </div>

                         {/* Conditional metadata details */}
                        {(doc.bookSeries || doc.refGroup) && (
                          <div className="text-[10px] bg-slate-50 p-1.5 rounded-lg border border-slate-200 text-slate-500 font-medium truncate">
                            {doc.bookSeries && `Bộ sách: ${doc.bookSeries}`}
                            {doc.refGroup && `Phân nhóm: ${doc.refGroup}`}
                          </div>
                        )}

                        {/* Lesson Topic / Dạy bài gì */}
                        {doc.lessonTopic && (
                          <div className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-850 p-2 rounded-lg font-bold flex items-center gap-2 shadow-3xs">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-650 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-[8px] text-indigo-500 font-extrabold uppercase block tracking-wider leading-none mb-0.5">DẠY BÀI / CHỦ ĐỀ</span>
                              <p className="truncate text-indigo-900 text-[10.5px] font-black">{doc.lessonTopic}</p>
                            </div>
                          </div>
                        )}

                        {/* Notes snippet */}
                        {doc.notes && (
                          <p className="text-[10px] text-slate-400 italic line-clamp-1 border-t border-slate-100 pt-2 mt-2">
                            "{doc.notes}"
                          </p>
                        )}
                      </div>

                      {/* Bottom action bar */}
                      <div className="flex justify-between items-center border-t border-slate-100/80 pt-3 mt-4">
                        <span className="text-[9px] text-slate-400 font-mono">
                          {doc.uploadDate}
                        </span>

                        <div className="flex gap-1.5">
                          <button
                            id={`btn-download-${doc.id}`}
                            onClick={(e) => handleDownload(doc, e)}
                            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/80 hover:bg-slate-100 text-slate-600 transition-all cursor-pointer"
                            title="Tải tệp tin gốc xuống máy"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-delete-${doc.id}`}
                            onClick={(e) => handleDelete(doc.id, e)}
                            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/80 hover:bg-rose-50 hover:text-rose-600 text-slate-450 transition-all cursor-pointer"
                            title="Xóa tài liệu khỏi kho"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                /* LIST MODE */
                <motion.div 
                  layout
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-3xs divide-y divide-slate-150"
                  id="docs-list-layout"
                >
                  {filteredDocs.map((doc) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.12 }}
                      key={doc.id}
                      id={`doc-row-${doc.id}`}
                      onClick={() => setPreviewDoc(doc)}
                      onMouseEnter={(e) => handleMouseEnterDoc(doc, e)}
                      onMouseMove={handleMouseMoveDoc}
                      onMouseLeave={handleMouseLeaveDoc}
                      className="p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-50/75 cursor-pointer transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          className="rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer flex-shrink-0"
                          checked={selectedForDelete.includes(doc.id)}
                          onChange={(e) => toggleSelectForDelete(doc.id, e as any)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        {getFormatIcon(doc.fileExtension)}
                        <div className="min-w-0 space-y-0.5">
                          <h4 className="text-xs font-black text-slate-800 truncate max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl">
                            {doc.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400 font-semibold">
                            <span className="text-slate-500 font-bold">{doc.category}</span>
                            <span>•</span>
                            <span>{doc.grade}</span>
                            <span>•</span>
                            <span>Môn: {doc.subject}</span>
                            <span>•</span>
                            <span>Dung lượng: {doc.fileSize}</span>
                          </div>
                          {doc.lessonTopic && (
                            <div className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100/50 text-indigo-750 text-[9px] px-2 py-0.5 rounded font-black mt-1 shadow-3xs">
                              <Sparkles className="w-3 h-3 text-indigo-650 shrink-0" />
                              <span>DẠY BÀI: {doc.lessonTopic}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right metadata & download buttons */}
                      <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 border-slate-100 pt-2.5 sm:pt-0">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {doc.uploadDate.split(" ")[0]}
                        </span>

                        <div className="flex gap-1">
                          <button
                            id={`btn-list-download-${doc.id}`}
                            onClick={(e) => handleDownload(doc, e)}
                            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/80 hover:bg-slate-100 text-slate-600 transition-all cursor-pointer"
                            title="Tải tệp tin gốc xuống"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-list-delete-${doc.id}`}
                            onClick={(e) => handleDelete(doc.id, e)}
                            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/80 hover:bg-rose-50 hover:text-rose-600 text-slate-450 transition-all cursor-pointer"
                            title="Xóa tài liệu"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          )}

        </div>

      </div>

      {/* 4. PREVIEW DRAWER (SLIDE IN SIDEBAR) */}
      <AnimatePresence>
        {previewDoc && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end" id="doc-preview-modal-wrapper">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewDoc(null)}
              className="absolute inset-0 bg-slate-900"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col text-left z-10"
              id="doc-preview-panel"
            >
              
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-900 text-white">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-black uppercase tracking-wider">Xem nhanh thông tin tài liệu</span>
                </div>
                <button
                  id="btn-close-preview"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-slate-50">
                
                {/* Header Information Card */}
                <div className="bg-white p-5 border-b border-slate-200 space-y-3 shrink-0">
                  <div className="flex gap-3.5 items-start">
                    <div className="shrink-0 mt-0.5">
                      {getFormatIcon(previewDoc.fileExtension)}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-sm font-black text-slate-800 leading-snug break-words">{previewDoc.name}</h3>
                      <p className="text-[10px] text-slate-400 font-mono truncate">Tên tệp gốc: {previewDoc.fileName}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[9px] font-extrabold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Phân loại: {previewDoc.category}
                    </span>
                    <span className="text-[9px] font-extrabold bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                      {previewDoc.grade}
                    </span>
                    <span className="text-[9px] font-extrabold bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                      Môn: {previewDoc.subject}
                    </span>
                    {previewDoc.bookSeries && (
                      <span className="text-[9px] font-extrabold bg-amber-50 border border-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        Bộ sách: {previewDoc.bookSeries}
                      </span>
                    )}
                    {previewDoc.refGroup && (
                      <span className="text-[9px] font-extrabold bg-purple-50 border border-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        Nhóm: {previewDoc.refGroup}
                      </span>
                    )}
                  </div>
                </div>

                {/* Sub-navigation Tabs */}
                <div className="bg-white border-b border-slate-200 px-4 flex gap-1 shrink-0">
                  <button
                    id="tab-preview-content"
                    onClick={() => setPreviewTab("content")}
                    className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                      previewTab === "content"
                        ? "border-indigo-600 text-indigo-650"
                        : "border-transparent text-slate-500 hover:text-slate-850"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem nội dung gốc</span>
                  </button>
                  <button
                    id="tab-preview-analysis"
                    onClick={() => setPreviewTab("analysis")}
                    className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                      previewTab === "analysis"
                        ? "border-indigo-600 text-indigo-650"
                        : "border-transparent text-slate-500 hover:text-slate-850"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Tóm tắt & Phân tích AI</span>
                  </button>
                </div>

                {/* Tab Views */}
                <div className="flex-1 overflow-y-auto p-5 min-h-0">
                  <AnimatePresence mode="wait">
                    {previewTab === "content" ? (
                      <motion.div
                        key="content-view"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-4"
                      >
                        {/* 1. VIDEO PREVIEW MODE */}
                        {previewDoc.fileExtension === ".mp4" ? (
                          <div className="space-y-4">
                            {/* Visual Video Screen */}
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-lg flex flex-col justify-between p-3 select-none group">
                              {/* Glowing backdrop or video graphic */}
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-radial from-indigo-950/40 via-slate-950 to-slate-950">
                                <FileVideo className={`w-16 h-16 text-indigo-500/80 ${isPlaying ? 'animate-pulse scale-105' : ''} transition-all duration-300`} />
                                <span className="text-[10px] text-slate-400 font-mono mt-3 tracking-widest uppercase">
                                  {isPlaying ? "LIVE STREAMING PREVIEW" : "PREVIEW PAUSED"}
                                </span>
                              </div>

                              {/* Top Bar overlay */}
                              <div className="z-10 w-full flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent p-2 -m-3 mb-0">
                                <span className="text-[10px] font-bold text-white/90 drop-shadow truncate max-w-xs">{previewDoc.fileName}</span>
                                <span className="text-[9px] font-mono text-slate-300 bg-black/40 px-1.5 py-0.5 rounded border border-white/10">1080p</span>
                              </div>

                              {/* Center Play Button Overlay */}
                              <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-indigo-650/90 hover:bg-indigo-600 hover:scale-105 text-white flex items-center justify-center transition-all shadow-xl shadow-indigo-950/40 cursor-pointer z-20"
                              >
                                {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
                              </button>

                              {/* Bottom Control bar overlay */}
                              <div className="z-10 w-full bg-gradient-to-t from-black/80 to-transparent p-3 -m-3 mt-auto space-y-2 pt-8">
                                {/* Timeline Progress slider */}
                                <div className="relative w-full h-1 bg-white/20 rounded-full cursor-pointer overflow-hidden" onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                                  setVideoProgress(pct);
                                }}>
                                  <div 
                                    className="absolute left-0 top-0 h-full bg-indigo-500 transition-all rounded-full"
                                    style={{ width: `${videoProgress}%` }}
                                  />
                                </div>
                                
                                <div className="flex items-center justify-between text-[10px] text-slate-300 font-mono">
                                  <div className="flex items-center gap-3">
                                    <button onClick={() => setIsPlaying(!isPlaying)} className="hover:text-white transition-colors cursor-pointer">
                                      {isPlaying ? "Tạm dừng" : "Phát"}
                                    </button>
                                    <span>
                                      {`00:${Math.round(45 * (videoProgress / 100)).toString().padStart(2, "0")} / 00:45`}
                                    </span>
                                  </div>
                                  <span className="text-slate-400">Timelapse Video</span>
                                </div>
                              </div>
                            </div>

                            {/* Clickable interactive chapters */}
                            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5 shadow-sm">
                              <h4 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-100">
                                <Info className="w-3.5 h-3.5 text-indigo-500" />
                                Điều khiển tiến trình quan sát
                              </h4>
                              
                              <div className="space-y-1.5">
                                <button 
                                  onClick={() => { setVideoProgress(10); setIsPlaying(true); }}
                                  className={`w-full p-2 rounded-lg text-left text-xs transition-all flex justify-between items-center border cursor-pointer ${
                                    videoProgress >= 5 && videoProgress < 25 
                                      ? "bg-indigo-50 border-indigo-200 text-indigo-950 font-bold" 
                                      : "bg-slate-50 hover:bg-slate-100 border-transparent text-slate-600"
                                  }`}
                                >
                                  <span>• Giây 0 - 10: Hạt đỗ hấp thụ nước & nứt vỏ</span>
                                  <span className="text-[10px] font-mono text-slate-400">Phút 00:05</span>
                                </button>
                                <button 
                                  onClick={() => { setVideoProgress(40); setIsPlaying(true); }}
                                  className={`w-full p-2 rounded-lg text-left text-xs transition-all flex justify-between items-center border cursor-pointer ${
                                    videoProgress >= 25 && videoProgress < 60 
                                      ? "bg-indigo-50 border-indigo-200 text-indigo-950 font-bold" 
                                      : "bg-slate-50 hover:bg-slate-100 border-transparent text-slate-600"
                                  }`}
                                >
                                  <span>• Giây 11 - 25: Thân vươn thẳng, xòe lá mầm</span>
                                  <span className="text-[10px] font-mono text-slate-400">Phút 00:18</span>
                                </button>
                                <button 
                                  onClick={() => { setVideoProgress(70); setIsPlaying(true); }}
                                  className={`w-full p-2 rounded-lg text-left text-xs transition-all flex justify-between items-center border cursor-pointer ${
                                    videoProgress >= 60 && videoProgress < 85 
                                      ? "bg-indigo-50 border-indigo-200 text-indigo-950 font-bold" 
                                      : "bg-slate-50 hover:bg-slate-100 border-transparent text-slate-600"
                                  }`}
                                >
                                  <span>• Giây 26 - 35: Lá mầm hứng sáng, rễ đâm sâu</span>
                                  <span className="text-[10px] font-mono text-slate-400">Phút 00:30</span>
                                </button>
                                <button 
                                  onClick={() => { setVideoProgress(95); setIsPlaying(true); }}
                                  className={`w-full p-2 rounded-lg text-left text-xs transition-all flex justify-between items-center border cursor-pointer ${
                                    videoProgress >= 85 
                                      ? "bg-indigo-50 border-indigo-200 text-indigo-950 font-bold" 
                                      : "bg-slate-50 hover:bg-slate-100 border-transparent text-slate-600"
                                  }`}
                                >
                                  <span>• Giây 36 - 45: Xuất hiện cặp lá thật đầu tiên</span>
                                  <span className="text-[10px] font-mono text-slate-400">Phút 00:42</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : [".docm", ".dot", ".dotx", ".dotm", ".rtf", ".xls", ".xlsx", ".xlsm", ".xlsb", ".xlt", ".xltx", ".xltm", ".ppt", ".pptx", ".pptm", ".pps", ".ppsx", ".ppsm", ".pot", ".potx", ".potm"].includes(previewDoc.fileExtension.toLowerCase()) ? (
                          /* 2. OFFICE FILE DIRECT PREVIEW AND DOWNLOAD */
                          <div className="flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-4 my-8 shadow-xs">
                            <div className="p-4 bg-indigo-50 rounded-full text-indigo-600">
                              <FileText className="w-10 h-10" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-sm font-black text-slate-800">Tài liệu Office ({previewDoc.fileExtension.substring(1).toUpperCase()})</h4>
                              <p className="text-xs text-slate-500 max-w-sm leading-normal">
                                Định dạng {previewDoc.fileExtension.toUpperCase()} cần được mở bằng Microsoft Office hoặc ứng dụng chuyên dụng. Vui lòng bấm nút dưới đây để tải về tệp tin gốc.
                              </p>
                            </div>
                            <button
                              onClick={(e) => handleDownload(previewDoc, e)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer border-none shadow-sm transition-all"
                            >
                              <Download className="w-4 h-4" />
                              Tải Về & Mở Tệp Tin Gốc
                            </button>
                          </div>
                        ) : (
                          /* 3. TEXT AND DOCUMENT READER PREVIEW (PDF, DOCX) */
                          <div className="space-y-3">
                            {/* Toolbar Controls */}
                            <div className="bg-slate-900 text-white rounded-xl px-4 py-2 flex items-center justify-between text-xs border border-slate-800 shadow-md">
                              <div className="flex items-center gap-1 font-bold text-[10px] text-indigo-400 uppercase tracking-wider">
                                {previewDoc.fileExtension === ".docx" || previewDoc.fileExtension === ".doc" ? (
                                  <>
                                    <span className="bg-blue-600 text-white font-extrabold px-1 py-0.5 rounded mr-1">W</span>
                                    <span>Word Viewer Mode</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="bg-rose-600 text-white font-extrabold px-1 py-0.5 rounded mr-1">PDF</span>
                                    <span>PDF Reader Mode</span>
                                  </>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2.5">
                                <button 
                                  onClick={() => setPdfZoom(prev => Math.max(50, prev - 25))} 
                                  className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors flex items-center justify-center font-black text-sm cursor-pointer"
                                  title="Thu nhỏ cỡ chữ"
                                >
                                  -
                                </button>
                                <span className="font-mono text-[10px] text-slate-300 w-10 text-center select-none">{pdfZoom}%</span>
                                <button 
                                  onClick={() => setPdfZoom(prev => Math.min(150, prev + 25))} 
                                  className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors flex items-center justify-center font-black text-sm cursor-pointer"
                                  title="Phóng to cỡ chữ"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* White paper viewport container */}
                            <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6 md:p-8 min-h-96 max-h-[520px] overflow-y-auto relative scrollbar-thin">
                              {/* Background watermark or page texture */}
                              <div className="absolute right-4 top-4 select-none pointer-events-none opacity-[0.03] text-indigo-950 font-black text-4xl">
                                EDUAI
                              </div>
                              
                              {/* Render Content */}
                              {renderExtractedText(
                                previewDoc.extractedText || `KẾ HOẠCH BÀI DẠY (GIÁO ÁN MINH HỌA)
MÔN: ${previewDoc.subject} - LỚP: ${previewDoc.grade}
Tên tệp gốc: ${previewDoc.fileName}
Nhóm tài liệu: ${previewDoc.category}

I. GIỚI THIỆU CHUNG
Tài liệu này được lưu trữ an toàn trên máy chủ học liệu của nhà trường. Giáo viên có thể trực tiếp tham chiếu, trích xuất dữ liệu, hoặc sử dụng tính năng "Tạo slide bài giảng" hoặc "Thiết lập ma trận kiểm tra" từ tư liệu này một cách nhanh chóng.

II. TIẾN TRÌNH GIẢNG DẠY KHUYÊN DÙNG
- Hoạt động 1: Khởi động (5 phút) - Giáo viên tạo động lực bằng trò chơi hoặc hỏi đáp nhanh.
- Hoạt động 2: Khám phá bài dạy (15 phút) - Giảng giải kiến thức mới bám sát sơ đồ trực quan.
- Hoạt động 3: Luyện tập (12 phút) - Học sinh làm bài tập nhóm hoặc phiếu cá nhân.
- Hoạt động 4: Vận dụng liên hệ (3 phút) - Gắn kết kiến thức với thực tiễn.

Ghi chú đính kèm của thầy cô:
"${previewDoc.notes || "Không có ghi chú thêm."}"`, 
                                pdfZoom
                              )}
                            </div>
                            
                            <p className="text-[10px] text-slate-400 text-center font-medium italic">
                              * Sử dụng nút phóng to (+) hoặc thu nhỏ (-) để thay đổi cỡ chữ đọc bài thoải mái.
                            </p>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="analysis-view"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-4"
                      >
                        {/* Summary Layout */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3.5 text-xs text-slate-700">
                          <h4 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1">
                            <Info className="w-3.5 h-3.5 text-indigo-500" />
                            Thông số kỹ thuật & Sư phạm
                          </h4>
                          <div className="space-y-2.5">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-medium">Tiêu chuẩn chương trình:</span>
                              <span className="font-bold text-slate-800">Thông tư 32/2018/TT-BGDĐT</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-medium">Dung lượng lưu trữ:</span>
                              <span className="font-bold text-slate-800 font-mono">{previewDoc.fileSize}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-medium">Định dạng file:</span>
                              <span className="font-bold text-slate-800 font-mono uppercase bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                {previewDoc.fileExtension.substring(1)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-medium">Ngày đồng bộ kho:</span>
                              <span className="font-bold text-slate-800 font-mono">{previewDoc.uploadDate}</span>
                            </div>
                            {previewDoc.notes && (
                              <div className="border-t border-slate-100 pt-2.5 mt-1">
                                <span className="font-extrabold text-slate-700 block mb-1">Ghi chú đính kèm:</span>
                                <p className="italic text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                  "{previewDoc.notes}"
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* AI Analysis Block */}
                        <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl space-y-4 text-xs text-slate-700 shadow-sm">
                          <h4 className="text-[11px] font-extrabold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-indigo-100/60 pb-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                            Phát hiện cốt lõi sư phạm bằng Trí tuệ AI
                          </h4>
                          
                          <div className="space-y-4 text-left">
                            {/* Dạy bài gì banner */}
                            <div className="bg-indigo-600 text-white p-3.5 rounded-xl space-y-1.5 relative overflow-hidden shadow-2xs">
                              <div className="absolute right-2 top-2 select-none opacity-10 pointer-events-none">
                                <Sparkles className="w-16 h-16 text-white" />
                              </div>
                              <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-200 block">Nội dung giảng dạy chính</span>
                              <div className="text-sm font-black flex items-center gap-2">
                                <Sparkles className="w-4 h-4 shrink-0 text-amber-300 animate-pulse" />
                                <span>DẠY BÀI: {previewDoc.lessonTopic || "Đang phân tích / Chưa xác định"}</span>
                              </div>
                            </div>

                            {previewDoc.aiSummary ? (
                              <div className="space-y-1">
                                <span className="font-extrabold text-indigo-950 block">Tóm tắt tự động:</span>
                                <p className="text-indigo-900 bg-white border border-indigo-100/50 p-3 rounded-xl italic font-medium leading-relaxed">
                                  "{previewDoc.aiSummary}"
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="font-extrabold text-indigo-950 block">Tóm tắt tự động:</span>
                                <p className="text-slate-500 bg-white/70 border border-slate-100 p-3 rounded-xl italic leading-relaxed">
                                  "Hệ thống tự động phát hiện định dạng tệp tin và trích xuất tóm tắt học thuật bám sát nội dung của giáo án."
                                </p>
                              </div>
                            )}

                            {previewDoc.aiObjectives && previewDoc.aiObjectives.length > 0 && (
                              <div className="space-y-1.5">
                                <span className="font-extrabold text-indigo-950 block">Mục tiêu năng lực cốt lõi:</span>
                                <ul className="space-y-1.5">
                                  {previewDoc.aiObjectives.map((obj, i) => (
                                    <li key={i} className="flex gap-2 items-start text-slate-700 leading-relaxed pl-1">
                                      <span className="text-indigo-500 font-bold mt-0.5">•</span>
                                      <span>{obj}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {previewDoc.aiKeyActivities && previewDoc.aiKeyActivities.length > 0 && (
                              <div className="space-y-2">
                                <span className="font-extrabold text-indigo-950 block">Các hoạt động chính phát hiện:</span>
                                <div className="grid grid-cols-1 gap-1.5">
                                  {previewDoc.aiKeyActivities.map((act, i) => (
                                    <span key={i} className="text-[10.5px] bg-white border border-indigo-100/70 text-indigo-950 px-3 py-2 rounded-lg font-bold flex items-center gap-2 shadow-3xs">
                                      <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center text-[9px] font-black">{i + 1}</span>
                                      <span className="truncate">{act}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-slate-150 flex gap-3 bg-slate-50 shrink-0">
                <button
                  id="btn-preview-download"
                  onClick={(e) => {
                    handleDownload(previewDoc, e);
                  }}
                  className="flex-1 h-10 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Tải Xuống Tệp Tin Gốc
                </button>
                <button
                  id="btn-preview-delete"
                  onClick={(e) => {
                    handleDelete(previewDoc.id, e);
                  }}
                  className="h-10 px-3 bg-rose-50 border border-rose-100 text-rose-700 hover:bg-rose-100 font-bold text-xs rounded-xl flex items-center justify-center cursor-pointer transition-all shadow-sm"
                  title="Xóa tài liệu khỏi hệ thống"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* FLOATING AI TOOLTIP ON HOVER */}
      <AnimatePresence>
        {hoveredDoc && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ duration: 0.15 }}
            style={getTooltipStyle()}
            className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-800 p-4 rounded-xl shadow-2xl z-[9999] pointer-events-none text-left flex flex-col gap-3"
            id="floating-doc-tooltip"
          >
            {/* Top row */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>Trợ lý AI • Tóm tắt nhanh</span>
              </div>
              <span className="text-[9px] text-slate-300 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                {hoveredDoc.fileExtension.toUpperCase()}
              </span>
            </div>

            {/* Document Title */}
            <div className="space-y-1">
              <h5 className="text-[11px] font-black text-slate-100 line-clamp-2 leading-snug">
                {hoveredDoc.name}
              </h5>
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[9px] text-slate-400 font-semibold">
                <span className="bg-slate-800 text-slate-300 px-1 rounded font-bold">{hoveredDoc.grade}</span>
                <span>•</span>
                <span>Môn: {hoveredDoc.subject}</span>
                <span>•</span>
                <span>Dung lượng: {hoveredDoc.fileSize}</span>
              </div>
            </div>

            {/* Summary Content block */}
            <div className="bg-slate-850 border border-slate-800/80 p-3 rounded-lg text-[11px] text-slate-200 leading-relaxed italic">
              {hoveredDoc.aiSummary ? (
                <span>"{hoveredDoc.aiSummary}"</span>
              ) : hoveredDoc.notes ? (
                <span>"{hoveredDoc.notes}"</span>
              ) : (
                <span className="text-slate-400 font-normal not-italic">
                  Chưa có tóm tắt tự động. Hãy tải lên tệp tin Word (.docx) để AI tự động trích xuất phân tích mục tiêu sư phạm!
                </span>
              )}
            </div>

            {/* Micro objectives / activities if available */}
            {hoveredDoc.aiObjectives && hoveredDoc.aiObjectives.length > 0 && (
              <div className="space-y-1 border-t border-slate-800/60 pt-2">
                <div className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider">Mục tiêu sư phạm:</div>
                <div className="text-[10px] text-slate-300 line-clamp-2 leading-normal">
                  • {hoveredDoc.aiObjectives[0]}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Elegant Custom Confirmation Modal for document deletion without window.confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" id="delete-doc-modal">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full border border-slate-100 p-6 shadow-2xl space-y-4 text-left"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="bg-rose-50 p-2.5 rounded-full border border-rose-100">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Xác nhận xóa tài liệu?</h3>
              </div>
              
              <p className="text-slate-600 text-xs leading-relaxed">
                Thầy cô có chắc chắn muốn xóa tài liệu <strong className="text-slate-900 font-bold">"{deleteTarget.name}"</strong> khỏi kho lưu trữ không? Hành động này sẽ gỡ bỏ tài liệu khỏi hệ thống và không thể hoàn tác.
              </p>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  id="btn-cancel-doc-delete"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-md shadow-rose-100 cursor-pointer"
                  id="btn-confirm-doc-delete"
                >
                  Đồng ý xóa tài liệu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
