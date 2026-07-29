import React, { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";
import { 
  Sparkles, 
  FileText, 
  Layers, 
  Sliders, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Shuffle, 
  Eye, 
  BookOpen, 
  RefreshCw, 
  FileCode, 
  ListOrdered,
  ChevronRight,
  Printer,
  Copy,
  FolderOpen
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DocumentItem {
  id: string;
  name: string;
  category: "Giáo án" | "Sách giáo khoa" | "Tài liệu tham khảo";
  grade: string;
  subject: string;
  fileName: string;
  extractedText?: string;
}

interface MCQ {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: string;
  explanation: string;
}

interface EssayQ {
  id: string;
  question: string;
  sampleSolution: string;
  gradingGuide: string;
  score: number;
}

interface GeneratedTest {
  testTitle: string;
  grade: string;
  subject: string;
  difficulty: string;
  duration: string;
  multipleChoiceQuestions: MCQ[];
  essayQuestions: EssayQ[];
  isFallback?: boolean;
}

interface ShuffledCode {
  code: string; // e.g. "101", "102" or "Gốc"
  multipleChoiceQuestions: MCQ[];
  essayQuestions: EssayQ[];
}

export default function AITestCreator({ user }: { user?: any } = {}) {
  // Input builders
  const [selectedGrade, setSelectedGrade] = useState("Lớp 3");
  const [selectedSubject, setSelectedSubject] = useState("Toán");
  const [scopeText, setScopeText] = useState("Kiến thức đến Tuần 12 về các phép tính nhân chia");
  
  // Compiled AI prompt following: [lớp đang học]+[môn học]+[độ rộng nội dung]
  const [aiCommand, setAiCommand] = useState("");

  // Options
  const [difficulty, setDifficulty] = useState<"dễ" | "vừa" | "nâng cao">("vừa");
  const [numMC, setNumMC] = useState(5);
  const [numEssay, setNumEssay] = useState(2);
  const [numCodes, setNumCodes] = useState(3); // default to 3 codes

  // State
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [baseTest, setBaseTest] = useState<GeneratedTest | null>(null);
  const [allCodes, setAllCodes] = useState<ShuffledCode[]>([]);
  const [activeCodeIdx, setActiveCodeIdx] = useState(0); // index 0 is always "Gốc" or first code
  const [previewTab, setPreviewTab] = useState<"test" | "answers">("test");

  // Repository context files
  const [repoDocs, setRepoDocs] = useState<DocumentItem[]>([]);
  const [matchedDocs, setMatchedDocs] = useState<DocumentItem[]>([]);

  // Synchronize the AI command string when the structured builders change
  useEffect(() => {
    setAiCommand(`${selectedGrade} + ${selectedSubject} + ${scopeText}`);
  }, [selectedGrade, selectedSubject, scopeText]);

  // Load documents on mount to search for match context
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await apiFetch("/api/documents");
        if (res.ok) {
          const parsed = await res.json();
          setRepoDocs(parsed);
        } else {
          setRepoDocs([]);
        }
      } catch (e) {
        console.error("Error fetching repository:", e);
        setRepoDocs([]);
      }
    };
    fetchDocs();
  }, [user]);

  // Update matched documents context whenever Grade/Subject change
  useEffect(() => {
    if (repoDocs.length === 0) return;
    
    // Normalize grade search (e.g. "Lớp 3" -> "Khối 3")
    const cleanGradeNum = selectedGrade.replace(/[^0-9]/g, "");
    
    const matched = repoDocs.filter(doc => {
      const docGradeNum = doc.grade.replace(/[^0-9]/g, "");
      const matchesGrade = docGradeNum === cleanGradeNum || doc.grade === "Tất cả";
      
      const cleanSub = doc.subject.toLowerCase();
      const searchSub = selectedSubject.toLowerCase();
      const matchesSubject = cleanSub.includes(searchSub) || searchSub.includes(cleanSub) || doc.subject === "Tất cả";
      
      return matchesGrade && matchesSubject;
    });

    // Prioritize "Giáo án" first, then "Tài liệu tham khảo", then "Sách giáo khoa"
    const sortedMatched = [...matched].sort((a, b) => {
      const getPriority = (cat: string) => {
        if (cat === "Giáo án") return 1;
        if (cat === "Tài liệu tham khảo") return 2;
        return 3;
      };
      return getPriority(a.category) - getPriority(b.category);
    });

    setMatchedDocs(sortedMatched);
  }, [selectedGrade, selectedSubject, repoDocs]);

  // Handle manual changes to the compiled prompt box (allowing teachers to overwrite)
  const handleAiCommandChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAiCommand(val);
    
    // Try to split back if formatted with '+'
    if (val.includes("+")) {
      const parts = val.split("+");
      if (parts.length >= 1) setSelectedGrade(parts[0].trim());
      if (parts.length >= 2) setSelectedSubject(parts[1].trim());
      if (parts.length >= 3) setScopeText(parts.slice(2).join("+").trim());
    }
  };

  // Fisher-Yates shuffle algorithm helper
  const shuffleArray = <T,>(arr: T[]): T[] => {
    const list = [...arr];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };

  // Perform multi-code shuffling safely without blending options between questions
  const generateShuffledCodes = (test: GeneratedTest, codesCount: number): ShuffledCode[] => {
    const result: ShuffledCode[] = [];

    // 1. Add the original base version first
    result.push({
      code: "Gốc",
      multipleChoiceQuestions: test.multipleChoiceQuestions,
      essayQuestions: test.essayQuestions
    });

    // 2. Generate randomized codes
    for (let c = 1; c <= codesCount; c++) {
      const codeNum = (100 + c).toString(); // e.g. "101", "102"
      
      // Shuffle the order of multiple choice questions
      const shuffledMCQs = shuffleArray(test.multipleChoiceQuestions).map((originalQ, qIdx) => {
        // Shuffle options inside this question
        const optKeys: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];
        const originalOptTexts = optKeys.map(k => originalQ.options[k]);
        
        // Find the text of the correct answer
        const correctText = originalQ.options[originalQ.correctAnswer as "A" | "B" | "C" | "D"];
        
        // Shuffle option texts
        const shuffledOptTexts = shuffleArray(originalOptTexts);
        
        // Rebuild options object and locate the new correct key
        const newOptions = {
          A: shuffledOptTexts[0],
          B: shuffledOptTexts[1],
          C: shuffledOptTexts[2],
          D: shuffledOptTexts[3]
        };
        
        // Locate which letter is now the correct answer
        let newCorrectKey: "A" | "B" | "C" | "D" = "A";
        if (newOptions.B === correctText) newCorrectKey = "B";
        else if (newOptions.C === correctText) newCorrectKey = "C";
        else if (newOptions.D === correctText) newCorrectKey = "D";

        return {
          ...originalQ,
          id: `mc-${codeNum}-${qIdx + 1}`,
          options: newOptions,
          correctAnswer: newCorrectKey
        };
      });

      // Shuffle the order of essay questions
      const shuffledEssayQs = shuffleArray(test.essayQuestions).map((orig, eIdx) => ({
        ...orig,
        id: `essay-${codeNum}-${eIdx + 1}`
      }));

      result.push({
        code: codeNum,
        multipleChoiceQuestions: shuffledMCQs,
        essayQuestions: shuffledEssayQs
      });
    }

    return result;
  };

  // Trigger AI test generation
  const handleGenerateTest = async () => {
    setLoading(true);
    setErrorText("");
    setBaseTest(null);
    setAllCodes([]);
    setActiveCodeIdx(0);

    // Build matched documents context text
    let contextText = "";
    if (matchedDocs.length > 0) {
      contextText = matchedDocs.map((doc, idx) => {
        return `[TÀI LIỆU KHẢO SÁT CHÍNH ${idx + 1}]
Tiêu đề: ${doc.name}
Phân loại: ${doc.category}
Khối: ${doc.grade} | Môn: ${doc.subject}
Nội dung bài học:
${doc.extractedText || "Chưa trích xuất đầy đủ văn bản chi tiết."}
--------------------------------------------------`;
      }).join("\n\n");
      
      // Keep it within a safe maximum character limit to optimize token costs
      if (contextText.length > 15000) {
        contextText = contextText.substring(0, 15000) + "\n...[Nội dung quá dài, được lược bớt để đảm bảo tốc độ xử lý]...";
      }
    }

    try {
      const response = await apiFetch("/api/gemini/generate-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: selectedGrade,
          subject: selectedSubject,
          scope: scopeText,
          difficulty: difficulty,
          numMultipleChoice: numMC,
          numEssay: numEssay,
          documentsContext: contextText
        })
      });

      if (response.ok) {
        const testData = await response.json() as GeneratedTest;
        setBaseTest(testData);
        
        // Generate versions (shuffled codes)
        const codes = generateShuffledCodes(testData, numCodes);
        setAllCodes(codes);
        // Focus on the first randomized code (e.g. "101") if available, otherwise "Gốc"
        setActiveCodeIdx(codes.length > 1 ? 1 : 0);
      } else {
        const err = await response.json();
        setErrorText(err.error || "Gặp lỗi trong quá trình AI biên soạn đề kiểm tra.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorText("Lỗi máy chủ kết nối: Vui lòng kiểm tra lại đường truyền mạng.");
    } finally {
      setLoading(false);
    }
  };

  // Build a highly professional school-styled Word document using native compatible HTML markup
  const downloadAsWordDoc = () => {
    if (!baseTest || allCodes.length === 0) return;
    
    const activeCode = allCodes[activeCodeIdx];
    const codeLabel = activeCode.code === "Gốc" ? "GỐC" : `MÃ ĐỀ: ${activeCode.code}`;
    const subjectUpper = baseTest.subject.toUpperCase();
    const gradeUpper = baseTest.grade.toUpperCase();

    // 1. Build answer keys table cells for Multiple Choice questions
    let mcAnswersRows = "";
    activeCode.multipleChoiceQuestions.forEach((q, idx) => {
      mcAnswersRows += `
        <tr>
          <td align="center" style="border: 1px solid #000000; font-weight: bold; padding: 6px;">Câu ${idx + 1}</td>
          <td align="center" style="border: 1px solid #000000; font-weight: bold; color: #1e3a8a; padding: 6px;">${q.correctAnswer}</td>
          <td style="border: 1px solid #000000; font-size: 11pt; padding: 6px;">${q.explanation}</td>
        </tr>
      `;
    });

    // 2. Build detailed solution descriptions for Essay questions
    let essayAnswersContent = "";
    activeCode.essayQuestions.forEach((q, idx) => {
      essayAnswersContent += `
        <div style="margin-bottom: 15px; border-bottom: 1px dashed #cccccc; padding-bottom: 10px;">
          <p style="font-weight: bold; margin-bottom: 5px;">Câu ${idx + 1} (${q.score} điểm):</p>
          <p style="margin-left: 15px; font-style: italic; color: #555555; margin-bottom: 5px;"><b>Câu hỏi:</b> ${q.question}</p>
          <p style="margin-left: 15px; margin-bottom: 5px;"><b>Lời giải mẫu:</b></p>
          <p style="margin-left: 30px; white-space: pre-line; margin-bottom: 10px;">${q.sampleSolution}</p>
          <p style="margin-left: 15px; margin-bottom: 5px;"><b>Hướng dẫn chấm & Thang điểm:</b></p>
          <p style="margin-left: 30px; white-space: pre-line; color: #1e3a8a;">${q.gradingGuide}</p>
        </div>
      `;
    });

    // 3. Render questions content
    let mcQuestionsHtml = "";
    activeCode.multipleChoiceQuestions.forEach((q, idx) => {
      mcQuestionsHtml += `
        <div style="margin-bottom: 15px;">
          <p style="font-weight: bold; margin-bottom: 5px;">Câu ${idx + 1}: ${q.question}</p>
          <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; margin-left: 15px; margin-bottom: 10px;">
            <tr>
              <td style="width: 50%; padding: 4px;"><b>A.</b> ${q.options.A}</td>
              <td style="width: 50%; padding: 4px;"><b>B.</b> ${q.options.B}</td>
            </tr>
            <tr>
              <td style="width: 50%; padding: 4px;"><b>C.</b> ${q.options.C}</td>
              <td style="width: 50%; padding: 4px;"><b>D.</b> ${q.options.D}</td>
            </tr>
          </table>
        </div>
      `;
    });

    let essayQuestionsHtml = "";
    activeCode.essayQuestions.forEach((q, idx) => {
      essayQuestionsHtml += `
        <div style="margin-bottom: 20px;">
          <p style="font-weight: bold; margin-bottom: 5px;">Câu ${idx + 1} (${q.score} điểm): ${q.question}</p>
          <div style="height: 100px; border: 1px dashed #dddddd; margin-top: 10px; margin-bottom: 10px; background-color: #fafafa;">
            <p style="font-size: 9pt; color: #aaaaaa; padding: 10px; font-style: italic;">(Học sinh làm bài ở phần trống dưới đây)</p>
          </div>
        </div>
      `;
    });

    // Complete MS Word HTML wrapper format
    const docHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${baseTest.testTitle}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: A4;
            margin: 1.0in 1.0in 1.0in 1.0in;
            mso-header-margin: .5in;
            mso-footer-margin: .5in;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 13pt;
            line-height: 1.45;
            color: #000000;
          }
          p { margin: 0 0 8px 0; }
        </style>
      </head>
      <body>
        <!-- DE THI SHEET -->
        <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 30px; font-size: 11pt;">
          <tr>
            <td align="center" style="width: 45%; vertical-align: top;">
              <p style="font-weight: bold; text-transform: uppercase; margin-bottom: 2px;">SỞ GIÁO DỤC VÀ ĐÀO TẠO</p>
              <p style="font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000000; display: inline-block; padding-bottom: 4px; margin-bottom: 0;">TRƯỜNG TIỂU HỌC ĐÔNG ĐÔ</p>
            </td>
            <td align="center" style="width: 55%; vertical-align: top;">
              <p style="font-weight: bold; margin-bottom: 2px;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
              <p style="font-weight: bold; border-bottom: 1px solid #000000; display: inline-block; padding-bottom: 4px; margin-bottom: 0;">Độc lập - Tự do - Hạnh phúc</p>
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="font-size: 16pt; font-weight: bold; margin-bottom: 5px; text-transform: uppercase;">${baseTest.testTitle}</h2>
          <p style="font-weight: bold; font-style: italic; font-size: 12pt;">
            Môn học: ${baseTest.subject} | Khối: ${baseTest.grade} <br/>
            Thời gian làm bài: ${baseTest.duration} (Không kể thời gian giao đề)
          </p>
          <div style="font-weight: bold; font-size: 14pt; border: 2px solid #000000; display: inline-block; padding: 6px 15px; margin-top: 5px; background-color: #f3f4f6;">
            ${codeLabel}
          </div>
        </div>

        <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12pt;">
          <tr>
            <td style="width: 50%;"><b>Họ và tên học sinh:</b> ......................................................</td>
            <td style="width: 25%;"><b>Lớp:</b> ..............</td>
            <td style="width: 25%;" align="center"><b>Số báo danh:</b> .........</td>
          </tr>
        </table>

        <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12pt; text-align: center;">
          <tr>
            <td style="width: 33%; font-weight: bold; background-color: #f9fafb;">Điểm số</td>
            <td style="width: 33%; font-weight: bold; background-color: #f9fafb;">Lời phê của thầy cô giáo</td>
            <td style="width: 34%; font-weight: bold; background-color: #f9fafb;">Chữ ký Giám thị</td>
          </tr>
          <tr style="height: 60px;">
            <td></td>
            <td></td>
            <td></td>
          </tr>
        </table>

        <!-- PHẦN I: TRẮC NGHIỆM -->
        <h3 style="font-size: 14pt; font-weight: bold; border-bottom: 1px solid #000000; margin-top: 25px; margin-bottom: 15px; padding-bottom: 3px;">PHẦN I. TRẮC NGHIỆM KHÁCH QUAN (${activeCode.multipleChoiceQuestions.length * 0.5} điểm)</h3>
        <p style="font-style: italic; font-size: 11pt; margin-bottom: 15px;">Khoanh tròn vào chữ cái đặt trước câu trả lời đúng nhất:</p>
        
        ${mcQuestionsHtml}

        <!-- PHẦN II: TỰ LUẬN -->
        <h3 style="font-size: 14pt; font-weight: bold; border-bottom: 1px solid #000000; margin-top: 30px; margin-bottom: 15px; padding-bottom: 3px;">PHẦN II. TỰ LUẬN (${10 - activeCode.multipleChoiceQuestions.length * 0.5} điểm)</h3>
        <p style="font-style: italic; font-size: 11pt; margin-bottom: 15px;">Trình bày chi tiết lời giải và kết quả vào khoảng trống trống dưới đây:</p>
        
        ${essayQuestionsHtml}

        <br style="page-break-before: always; clear: both;"/>

        <!-- ĐÁP ÁN & HƯỚNG DẪN CHẤM SHEET -->
        <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 30px; font-size: 11pt;">
          <tr>
            <td align="center" style="width: 45%; vertical-align: top;">
              <p style="font-weight: bold; text-transform: uppercase; margin-bottom: 2px;">TRƯỜNG TIỂU HỌC ĐÔNG ĐÔ</p>
              <p style="font-weight: bold; font-size: 10pt; margin-bottom: 0; color: #555555;">Hội đồng khảo thí sư phạm</p>
            </td>
            <td align="center" style="width: 55%; vertical-align: top;">
              <p style="font-weight: bold; text-transform: uppercase; margin-bottom: 2px;">HƯỚNG DẪN CHẤM THI CHUẨN</p>
              <p style="font-weight: bold; font-style: italic; margin-bottom: 0;">(Đáp án chính thức gồm 02 phần)</p>
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="font-size: 15pt; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; color: #1e3a8a;">ĐÁP ÁN VÀ BIỂU ĐIỂM CHI TIẾT</h2>
          <p style="font-weight: bold; font-style: italic; font-size: 12pt;">
            Áp dụng cho: ${baseTest.testTitle} | ${codeLabel}
          </p>
        </div>

        <h3 style="font-size: 13pt; font-weight: bold; color: #1e3a8a; border-bottom: 1.5px solid #1e3a8a; margin-top: 25px; margin-bottom: 10px; padding-bottom: 3px;">I. ĐÁP ÁN PHẦN TRẮC NGHIỆM KHÁCH QUAN</h3>
        <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 12pt; margin-bottom: 25px;">
          <thead>
            <tr style="background-color: #f3f4f6; font-weight: bold;">
              <td align="center" style="width: 15%; border: 1px solid #000000; padding: 6px;">Câu hỏi</td>
              <td align="center" style="width: 20%; border: 1px solid #000000; padding: 6px;">Đáp án đúng</td>
              <td style="width: 65%; border: 1px solid #000000; padding: 6px;">Giải thích chi tiết của Chuyên gia sư phạm</td>
            </tr>
          </thead>
          <tbody>
            ${mcAnswersRows}
          </tbody>
        </table>

        <h3 style="font-size: 13pt; font-weight: bold; color: #1e3a8a; border-bottom: 1.5px solid #1e3a8a; margin-top: 25px; margin-bottom: 15px; padding-bottom: 3px;">II. ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM PHẦN TỰ LUẬN</h3>
        
        ${essayAnswersContent}

        <div style="text-align: right; margin-top: 40px; font-style: italic; font-size: 11pt;">
          <p>Đông Đô, ngày ...... tháng ...... năm 2026</p>
          <p style="font-weight: bold; text-transform: uppercase; margin-right: 30px; margin-top: 5px;">TỔ TRƯỞNG CHUYÊN MÔN KÝ DUYỆT</p>
          <br/><br/><br/>
          <p style="margin-right: 40px;">.......................................................</p>
        </div>
      </body>
      </html>
    `;

    // Download file utilizing blob with application/msword and standard .doc extension for complete MS Word compatibility
    const blob = new Blob(["\ufeff", docHtml], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${baseTest.testTitle.replace(/[^a-zA-Z0-9\s-_]/g, "_")}_MaDe_${activeCode.code}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Quick action to copy the entire test content to clipboard
  const handleCopyClipboard = () => {
    if (!baseTest || allCodes.length === 0) return;
    const activeCode = allCodes[activeCodeIdx];
    
    let text = `=== ${baseTest.testTitle.toUpperCase()} ===\n`;
    text += `Môn học: ${baseTest.subject} | Khối: ${baseTest.grade}\n`;
    text += `Mã đề: ${activeCode.code}\n`;
    text += `Thời gian làm bài: ${baseTest.duration}\n\n`;
    
    text += `PHẦN I. TRẮC NGHIỆM KHÁCH QUAN\n`;
    activeCode.multipleChoiceQuestions.forEach((q, idx) => {
      text += `Câu ${idx + 1}: ${q.question}\n`;
      text += `  A. ${q.options.A}\n`;
      text += `  B. ${q.options.B}\n`;
      text += `  C. ${q.options.C}\n`;
      text += `  D. ${q.options.D}\n\n`;
    });

    text += `PHẦN II. TỰ LUẬN\n`;
    activeCode.essayQuestions.forEach((q, idx) => {
      text += `Câu ${idx + 1} (${q.score} điểm): ${q.question}\n\n`;
    });

    if (previewTab === "answers") {
      text += `=== ĐÁP ÁN & HƯỚNG DẪN CHẤM ===\n\n`;
      text += `I. ĐÁP ÁN TRẮC NGHIỆM:\n`;
      activeCode.multipleChoiceQuestions.forEach((q, idx) => {
        text += `Câu ${idx + 1}: ${q.correctAnswer} - ${q.explanation}\n`;
      });
      text += `\nII. ĐÁP ÁN TỰ LUẬN:\n`;
      activeCode.essayQuestions.forEach((q, idx) => {
        text += `Câu ${idx + 1} (${q.score} điểm):\n- Lời giải mẫu:\n${q.sampleSolution}\n- Hướng dẫn chấm:\n${q.gradingGuide}\n\n`;
      });
    }

    navigator.clipboard.writeText(text);
    alert("Đã sao chép toàn bộ nội dung đề kiểm tra và đáp án vào bộ nhớ tạm!");
  };

  return (
    <div className="space-y-6" id="ai-test-creator-root">
      {/* WORKSPACE CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: PARAMETERS FOR BUILDER (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-250/60 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <Sliders className="w-4 h-4 text-slate-500" />
              Thiết lập cấu trúc đề thi
            </h3>

            {/* THREE PARAMETERS BUILDER */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Lớp đang học</label>
                <div className="grid grid-cols-5 gap-1 bg-slate-50 p-1 rounded-xl">
                  {["Lớp 1", "Lớp 2", "Lớp 3", "Lớp 4", "Lớp 5"].map((gr) => (
                    <button
                      key={gr}
                      onClick={() => setSelectedGrade(gr)}
                      className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                        selectedGrade === gr
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                      }`}
                    >
                      {gr}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Môn học</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-xl">
                  {["Toán", "Tiếng Việt", "Tiếng Anh", "Khoa học", "Lịch sử & Địa lý"].map((sub) => (
                    <button
                      key={sub}
                      onClick={() => setSelectedSubject(sub)}
                      className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition-all truncate ${
                        selectedSubject === sub
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                      }`}
                      title={sub}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Độ rộng nội dung (Mốc kiến thức đã học)
                </label>
                <input
                  type="text"
                  value={scopeText}
                  onChange={(e) => setScopeText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  placeholder="Ví dụ: kiến thức đến tuần 12 về các phép tính"
                />
              </div>

              {/* AUTOMATED AI SYNTAX BOX */}
              <div className="bg-indigo-50/50 rounded-xl p-3.5 border border-indigo-100/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                    <FileCode className="w-3.5 h-3.5" />
                    Câu lệnh AI tạo đề [Lớp] + [Môn] + [Độ rộng]
                  </span>
                  <span className="text-[9px] text-indigo-500 font-mono">Bám sát Thông tư</span>
                </div>
                <input
                  type="text"
                  value={aiCommand}
                  onChange={handleAiCommandChange}
                  className="w-full bg-white border border-indigo-150/60 rounded-lg px-2.5 py-1.5 text-xs font-mono text-indigo-900 focus:outline-hidden"
                />
              </div>

              {/* REPOSITORY ALIGNMENT SUMMARY */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                  Kho học liệu bối cảnh tương thích
                </div>
                
                {matchedDocs.length > 0 ? (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Tìm thấy {matchedDocs.length} tài liệu phù hợp để nạp bối cảnh:
                    </p>
                    <div className="max-h-24 overflow-y-auto scrollbar-thin space-y-1 pr-1">
                      {matchedDocs.map((doc, i) => (
                        <div key={doc.id} className="text-[10px] bg-white p-1 rounded-md border border-slate-100 flex justify-between items-center text-slate-650">
                          <span className="font-bold text-slate-800 truncate max-w-[150px]">{doc.name}</span>
                          <span className={`px-1 rounded-sm text-[8px] font-bold text-white ${
                            doc.category === "Giáo án" ? "bg-indigo-500" : "bg-sky-500"
                          }`}>{doc.category}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-2 italic leading-relaxed">
                    Không tìm thấy giáo án hoặc tài liệu tham khảo lớp này trong kho. AI sẽ tự động tạo nội dung chuẩn khung chương trình của Bộ GD&ĐT.
                  </p>
                )}
              </div>

              {/* DIFFICULTY SELECTION */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Mức độ khó chủ đạo</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "dễ", label: "Dễ (Cơ bản)", color: "text-emerald-700 border-emerald-100 hover:bg-emerald-50 bg-emerald-50/20 active:bg-emerald-100" },
                    { id: "vừa", label: "Vừa sức", color: "text-amber-700 border-amber-100 hover:bg-amber-50 bg-amber-50/20 active:bg-amber-100" },
                    { id: "nâng cao", label: "Nâng cao (Phân hóa)", color: "text-rose-700 border-rose-100 hover:bg-rose-50 bg-rose-50/20 active:bg-rose-100" }
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      onClick={() => setDifficulty(lvl.id as any)}
                      className={`p-2 rounded-xl text-center border text-[11px] font-bold transition-all cursor-pointer ${
                        difficulty === lvl.id
                          ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                          : lvl.color
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* QUESTIONS COUNT INPUTS */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Số câu trắc nghiệm</label>
                  <div className="relative flex items-center">
                    <input
                      id="input-num-mc"
                      type="number"
                      min="0"
                      max="100"
                      value={numMC}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setNumMC(isNaN(val) ? 0 : Math.max(0, val));
                      }}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      placeholder="Nhập số câu..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Số câu tự luận</label>
                  <div className="relative flex items-center">
                    <input
                      id="input-num-essay"
                      type="number"
                      min="0"
                      max="50"
                      value={numEssay}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setNumEssay(isNaN(val) ? 0 : Math.max(0, val));
                      }}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      placeholder="Nhập số câu..."
                    />
                  </div>
                </div>
              </div>

              {/* VERSION CODES MULTIPLIER NUMBER INPUT */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Số lượng mã đề cần tạo (1-99)</label>
                <div className="relative flex items-center">
                  <input
                    id="input-num-codes"
                    type="number"
                    min="1"
                    max="99"
                    value={numCodes}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (isNaN(val)) {
                        setNumCodes(1);
                      } else {
                        setNumCodes(Math.min(99, Math.max(1, val)));
                      }
                    }}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="Nhập số mã đề (1-99)..."
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-1.5 italic leading-tight">
                  (*) Các mã đề sẽ chỉ xáo trộn ngẫu nhiên câu hỏi và trắc nghiệm nội bộ các phương án (A, B, C, D) của câu đó, giữ nguyên đáp án đúng, không tráo sang câu khác.
                </p>
              </div>

              {/* TRIGGER GENERATE BUTTON */}
              <button
                onClick={handleGenerateTest}
                disabled={loading}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white py-3 px-4 rounded-xl font-bold text-xs tracking-wide transition-all shadow-md flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    AI ĐANG BIÊN SOẠN KHẢO THÍ CHUYÊN SÂU...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    TIẾN HÀNH BIÊN SOẠN ĐỀ KIỂM TRA BẰNG AI
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW AND OUTPUT (7 Columns) */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {!baseTest && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-xs text-center flex flex-col items-center justify-center h-full min-h-[450px]"
              >
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                  <BookOpen className="w-8 h-8 text-slate-400" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Chưa có đề kiểm tra nào được khởi tạo</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                  Thiết lập cấu trúc chương trình, mốc tuần hoặc câu lệnh sư phạm bên trái để AI tiến hành phân tích kho dữ liệu và biên soạn đề thi.
                </p>
              </motion.div>
            )}

            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-xs text-center flex flex-col items-center justify-center h-full min-h-[450px] space-y-4"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin" />
                  <Sparkles className="w-5 h-5 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">AI đang tổng hợp dữ liệu học trình...</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                    AI đang phân tích các tài liệu {matchedDocs.length > 0 ? "trong kho" : "chuẩn khung"} để thiết kế ma trận câu hỏi tăng dần độ khó, viết lời giải thích mẫu và biểu điểm chấm thi...
                  </p>
                </div>
              </motion.div>
            )}

            {baseTest && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden"
              >
                {/* TOOLBAR CONTROLS */}
                <div className="bg-slate-900 text-white px-5 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="bg-emerald-500 text-white rounded-md p-1">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs tracking-tight uppercase text-emerald-400">Đã biên soạn thành công</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {baseTest.isFallback ? "Bản quyền EduAI thiết kế (Offline Mode)" : "Mô hình Gemini-3.5-flash biên soạn"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleCopyClipboard}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Sao chép
                    </button>
                    <button
                      onClick={downloadAsWordDoc}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Tải bản Word (.doc)
                    </button>
                  </div>
                </div>

                {/* VERSION TABS BAR */}
                <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex items-center justify-between gap-4 overflow-x-auto">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phiên bản mã đề:</span>
                    <div className="flex bg-slate-200/60 p-0.5 rounded-lg border border-slate-200">
                      {allCodes.map((item, idx) => (
                        <button
                          key={item.code}
                          onClick={() => {
                            setActiveCodeIdx(idx);
                          }}
                          className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                            activeCodeIdx === idx
                              ? "bg-white text-slate-900 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {item.code === "Gốc" ? "Gốc" : `Mã đề ${item.code}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PREVIEW TYPE TOGGLE */}
                  <div className="flex bg-slate-200/60 p-0.5 rounded-lg border border-slate-200 shrink-0">
                    <button
                      onClick={() => setPreviewTab("test")}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                        previewTab === "test"
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Xem đề thi
                    </button>
                    <button
                      onClick={() => setPreviewTab("answers")}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                        previewTab === "answers"
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Xem đáp án
                    </button>
                  </div>
                </div>

                {/* LIVE PREVIEW CONTAINER */}
                <div className="p-6 sm:p-8 overflow-y-auto max-h-[600px] scrollbar-thin bg-slate-50/30">
                  
                  {/* SCHOOL TEST DOCUMENT PREVIEW DESIGN */}
                  <div className="bg-white border border-slate-250/60 rounded-2xl shadow-xs p-6 sm:p-8 font-sans leading-relaxed text-slate-800 select-text max-w-3xl mx-auto" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                    
                    {/* TEST BODY TAB */}
                    {previewTab === "test" ? (
                      <div className="space-y-6">
                        {/* School standard header table */}
                        <div className="grid grid-cols-2 border-b border-slate-100 pb-4 mb-4 text-center">
                          <div className="text-[12px]">
                            <p className="font-extrabold uppercase text-slate-900 leading-tight">SỞ GIÁO DỤC VÀ ĐÀO TẠO</p>
                            <p className="font-bold uppercase text-slate-800 border-b border-slate-400 inline-block pb-0.5 mt-0.5">TRƯỜNG TIỂU HỌC ĐÔNG ĐÔ</p>
                          </div>
                          <div className="text-[12px]">
                            <p className="font-extrabold text-slate-900 leading-tight">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                            <p className="font-bold text-slate-800 border-b border-slate-400 inline-block pb-0.5 mt-0.5">Độc lập - Tự do - Hạnh phúc</p>
                          </div>
                        </div>

                        {/* Title block */}
                        <div className="text-center space-y-1 my-4">
                          <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-wide">{baseTest.testTitle}</h3>
                          <p className="text-xs text-slate-600 font-medium">
                            Môn học: <b className="text-slate-900">{baseTest.subject}</b> | Khối: <b className="text-slate-900">{baseTest.grade}</b>
                          </p>
                          <p className="text-xs text-slate-500 italic">
                            Thời gian làm bài: {baseTest.duration} (Không kể thời gian phát đề)
                          </p>
                          <div className="inline-block mt-2 bg-slate-100 text-slate-800 font-mono font-bold text-xs px-3 py-1 rounded-md border border-slate-200">
                            MÃ ĐỀ: {allCodes[activeCodeIdx].code === "Gốc" ? "ĐỀ GỐC" : allCodes[activeCodeIdx].code}
                          </div>
                        </div>

                        {/* Student metadata table */}
                        <div className="grid grid-cols-3 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 bg-slate-50 gap-2 mb-4">
                          <div><b>Họ và tên học sinh:</b> .........................................</div>
                          <div><b>Lớp:</b> ....................</div>
                          <div><b>Số báo danh:</b> .............</div>
                        </div>

                        {/* Scoring cells */}
                        <div className="grid grid-cols-3 border border-slate-200 rounded-lg text-center overflow-hidden text-xs text-slate-800 mb-6">
                          <div className="p-2 border-r border-slate-200 bg-slate-50/60 font-bold">Điểm số</div>
                          <div className="p-2 border-r border-slate-200 bg-slate-50/60 font-bold">Lời phê của thầy cô</div>
                          <div className="p-2 bg-slate-50/60 font-bold">Giám thị ký tên</div>
                          <div className="h-12 border-t border-r border-slate-200"></div>
                          <div className="h-12 border-t border-r border-slate-200"></div>
                          <div className="h-12 border-t border-slate-200"></div>
                        </div>

                        {/* SECTION I: MCQ */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-black text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-2">
                            <span className="bg-indigo-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-sm">PHẦN I</span>
                            TRẮC NGHIỆM KHÁCH QUAN ({allCodes[activeCodeIdx].multipleChoiceQuestions.length * 0.5} điểm)
                          </h4>
                          <p className="text-xs text-slate-550 italic mb-3">Khoanh tròn vào phương án chứa chữ cái đặt trước câu trả lời đúng duy nhất:</p>
                          
                          <div className="space-y-4">
                            {allCodes[activeCodeIdx].multipleChoiceQuestions.map((q, idx) => (
                              <div key={q.id} className="space-y-1.5 pl-2 border-l-2 border-slate-100">
                                <p className="text-xs text-slate-850 font-bold">
                                  Câu {idx + 1}: <span className="font-medium text-slate-750">{q.question}</span>
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-slate-650 pl-2">
                                  <div><b>A.</b> {q.options.A}</div>
                                  <div><b>B.</b> {q.options.B}</div>
                                  <div><b>C.</b> {q.options.C}</div>
                                  <div><b>D.</b> {q.options.D}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* SECTION II: ESSAY */}
                        <div className="space-y-4 pt-4">
                          <h4 className="text-sm font-black text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-2">
                            <span className="bg-indigo-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-sm">PHẦN II</span>
                            TỰ LUẬN ({10 - allCodes[activeCodeIdx].multipleChoiceQuestions.length * 0.5} điểm)
                          </h4>
                          <p className="text-xs text-slate-550 italic mb-3">Học sinh trình bày đầy đủ lời giải, phép tính và đáp số vào khoảng trống trống dưới đây:</p>
                          
                          <div className="space-y-6">
                            {allCodes[activeCodeIdx].essayQuestions.map((q, idx) => (
                              <div key={q.id} className="space-y-2 pl-2 border-l-2 border-slate-150">
                                <p className="text-xs text-slate-850 font-bold">
                                  Câu {idx + 1} <span className="text-slate-500">({q.score} điểm)</span>: <span className="font-medium text-slate-750">{q.question}</span>
                                </p>
                                <div className="border border-dashed border-slate-200 rounded-lg h-24 bg-slate-50/40 p-2 flex items-start">
                                  <span className="text-[10px] text-slate-350 italic">(Dành cho học sinh làm bài)</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      // ANSWERS AND GRADINGS TAB
                      <div className="space-y-6">
                        {/* Standard answers header */}
                        <div className="text-center space-y-1 mb-6">
                          <h3 className="text-sm font-black text-indigo-700 tracking-wider uppercase">ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM THI</h3>
                          <h2 className="text-md font-bold text-slate-900 uppercase">{baseTest.testTitle}</h2>
                          <div className="inline-block bg-indigo-50 border border-indigo-200 text-indigo-800 font-mono font-bold text-xs px-3 py-0.5 rounded-md">
                            MÃ ĐỀ CHẤM: {allCodes[activeCodeIdx].code === "Gốc" ? "ĐỀ GỐC" : allCodes[activeCodeIdx].code}
                          </div>
                        </div>

                        {/* SECTION I MCQ KEY TABLE */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-black text-slate-900 border-b border-slate-200 pb-1 uppercase tracking-wide flex items-center gap-1.5">
                            <span className="w-2 h-3.5 bg-indigo-600 rounded-xs inline-block"></span>
                            I. Đáp án trắc nghiệm khách quan
                          </h4>
                          
                          <div className="overflow-x-auto border border-slate-200 rounded-xl">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-100 font-bold border-b border-slate-200 text-slate-750">
                                  <th className="p-2 border-r border-slate-200 w-16 text-center">Câu hỏi</th>
                                  <th className="p-2 border-r border-slate-200 w-20 text-center">Đáp án đúng</th>
                                  <th className="p-2">Lời giải thích chi tiết sư phạm</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-150">
                                {allCodes[activeCodeIdx].multipleChoiceQuestions.map((q, idx) => (
                                  <tr key={q.id} className="hover:bg-slate-50/50">
                                    <td className="p-2 border-r border-slate-200 text-center font-bold">Câu {idx + 1}</td>
                                    <td className="p-2 border-r border-slate-200 text-center font-black text-indigo-600 bg-indigo-50/20">{q.correctAnswer}</td>
                                    <td className="p-2 text-slate-650 leading-relaxed">{q.explanation}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* SECTION II ESSAY ANSWERS */}
                        <div className="space-y-4 pt-4">
                          <h4 className="text-xs font-black text-slate-900 border-b border-slate-200 pb-1 uppercase tracking-wide flex items-center gap-1.5">
                            <span className="w-2 h-3.5 bg-indigo-600 rounded-xs inline-block"></span>
                            II. Đáp án tự luận và Biểu điểm
                          </h4>

                          <div className="space-y-4">
                            {allCodes[activeCodeIdx].essayQuestions.map((q, idx) => (
                              <div key={q.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 space-y-2">
                                <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5">
                                  <p className="text-xs font-bold text-slate-800">
                                    Câu {idx + 1} <span className="text-indigo-600">({q.score} điểm)</span>
                                  </p>
                                  <span className="text-[9px] bg-slate-200 px-1.5 py-0.5 rounded-md font-bold text-slate-600">Tự luận</span>
                                </div>
                                <p className="text-xs text-slate-700 italic"><b>Đề bài:</b> {q.question}</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                  <div className="bg-white p-3 rounded-lg border border-slate-100 text-[11px] leading-relaxed">
                                    <p className="font-extrabold text-slate-800 text-[10px] uppercase text-emerald-600 mb-1">Lời giải mẫu chi tiết:</p>
                                    <p className="text-slate-650 whitespace-pre-line">{q.sampleSolution}</p>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg border border-slate-100 text-[11px] leading-relaxed">
                                    <p className="font-extrabold text-slate-800 text-[10px] uppercase text-indigo-600 mb-1">Hướng dẫn chấm & Thang điểm:</p>
                                    <p className="text-slate-650 whitespace-pre-line">{q.gradingGuide}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
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
    </div>
  );
}
