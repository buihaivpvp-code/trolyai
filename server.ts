/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";

// Load environment variables
dotenv.config();

// Import production-grade backend components
import { Database } from "./backend/services/db.ts";
import { requestLogger } from "./backend/middleware/logger.ts";
import { globalErrorHandler } from "./backend/middleware/errorHandler.ts";
import { authenticateToken } from "./backend/middleware/auth.ts";
import authRouter from "./backend/routes/auth.ts";
import studentsRouter from "./backend/routes/students.ts";
import journalRouter from "./backend/routes/journal.ts";
import documentsRouter from "./backend/routes/documents.ts";

const app = express();
const PORT = Number(process.env.PORT) || 2630;
const isVercel = Boolean(process.env.VERCEL);

// Set body size limits to allow base64 uploads of large documents (PDFs, PPTX, etc.)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Apply Centralized Request Logger Middleware
app.use(requestLogger);


type SlideSample = {
  id: string;
  grade: string;
  subject: string;
  lessonKind: string;
  title: string;
  pedagogicalFocus: string[];
  structure: string[];
  slideBlueprint: Array<{
    slideType: string;
    titlePattern: string;
    contentPattern: string;
    teacherPromptPattern: string;
    visualHint: string;
  }>;
  qualityRules: string[];
};

type TestSample = {
  id: string;
  grade: string;
  subject: string;
  examKind: string;
  title: string;
  assessmentMindset: string[];
  blueprint: {
    contentAreas: string[];
    difficultyDistribution: Record<string, string>;
  };
  questionPatterns: Array<{
    type: string;
    pattern: string;
    rule: string;
  }>;
  qualityRules: string[];
};

type AiSampleKnowledge = {
  slides: SlideSample[];
  tests: TestSample[];
};

function normalizeSearchText(value: string = ""): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFirstNumber(value: string): number | null {
  const match = String(value || "").match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

function loadAiSampleKnowledge(): AiSampleKnowledge {
  return { slides: [], tests: [] };
}

function selectSlideSamples(params: {
  grade?: string | number;
  subject?: string;
  topic?: string;
  documents?: any[];
  matchedDoc?: any;
}): SlideSample[] {
  const knowledge = loadAiSampleKnowledge();
  const gradeNum = extractFirstNumber(String(params.matchedDoc?.grade || params.grade || ""));
  const normalizedSubject = normalizeSearchText(params.matchedDoc?.subject || params.subject || "");
  const normalizedTopic = normalizeSearchText(params.matchedDoc?.lessonTopic || params.topic || params.matchedDoc?.name || "");
  const corpus = normalizeSearchText([
    normalizedSubject,
    normalizedTopic,
    ...(params.documents || []).slice(0, 5).map((doc: any) => `${doc.subject || ""} ${doc.name || ""} ${doc.lessonTopic || ""}`)
  ].join(" "));

  return [...knowledge.slides]
    .map((sample) => {
      let score = 0;
      const sampleGradeNum = extractFirstNumber(sample.grade);
      const sampleSubject = normalizeSearchText(sample.subject);
      const sampleLessonKind = normalizeSearchText(sample.lessonKind);
      const sampleText = normalizeSearchText([
        sample.title,
        sample.subject,
        sample.lessonKind,
        ...sample.pedagogicalFocus,
        ...sample.structure,
        ...sample.qualityRules
      ].join(" "));

      if (gradeNum !== null && sampleGradeNum === gradeNum) score += 50;
      if (normalizedSubject && sampleSubject === normalizedSubject) score += 45;
      if (normalizedTopic && sampleText.includes(normalizedTopic)) score += 15;
      if (corpus.includes("chu trinh") || corpus.includes("quy trinh") || corpus.includes("vong tuan hoan")) {
        if (sampleLessonKind.includes("new lesson") || sampleText.includes("chu trinh") || sampleText.includes("quy trinh")) {
          score += 10;
        }
      }

      return { sample, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.sample);
}

function selectTestSamples(params: {
  grade?: string;
  subject?: string;
  scope?: string;
  difficulty?: string;
}): TestSample[] {
  const knowledge = loadAiSampleKnowledge();
  const gradeNum = extractFirstNumber(params.grade || "");
  const normalizedSubject = normalizeSearchText(params.subject || "");
  const normalizedScope = normalizeSearchText(params.scope || "");
  const normalizedDifficulty = normalizeSearchText(params.difficulty || "");

  return [...knowledge.tests]
    .map((sample) => {
      let score = 0;
      const sampleGradeNum = extractFirstNumber(sample.grade);
      const sampleSubject = normalizeSearchText(sample.subject);
      const sampleText = normalizeSearchText([
        sample.title,
        sample.examKind,
        ...sample.assessmentMindset,
        ...sample.blueprint.contentAreas,
        ...sample.qualityRules,
        ...sample.questionPatterns.map((pattern) => `${pattern.type} ${pattern.pattern} ${pattern.rule}`)
      ].join(" "));

      if (gradeNum !== null && sampleGradeNum === gradeNum) score += 50;
      if (normalizedSubject && sampleSubject === normalizedSubject) score += 45;

      const scopeWords = normalizedScope.split(/\s+/).filter((word) => word.length > 2);
      score += scopeWords.filter((word) => sampleText.includes(word)).length * 5;

      if (normalizedDifficulty.includes("nang cao") && sampleText.includes("van dung")) score += 5;
      if (normalizedDifficulty.includes("de") && sampleText.includes("nhan biet")) score += 5;

      return { sample, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.sample);
}

// -------------------------------------------------------------
// PRODUCTION-GRADE BACKEND ROUTERS
// -------------------------------------------------------------
app.use("/api/auth", authRouter);
app.use("/api/students", studentsRouter);
app.use("/api/journal", journalRouter);
app.use("/api/documents", documentsRouter);

app.get(["/api/backend", "/backend"], (_req, res) => {
  const students = Database.getStudents();
  const users = Database.getUsers();
  const studentFiles = [
    "Supabase: students_base",
    "Supabase: grades",
    "Supabase: psychological_profiles",
    "Supabase: semi_boarding_profiles",
    "Supabase: talent_profiles",
    "Supabase: attendances",
    "Supabase: behavior_counts",
    "Supabase: diaries",
    "Supabase: monthly_grades"
  ];
  const teacherFiles = ["Supabase: users"];
  const uploadFiles: string[] = [];

  const studentsMarkup = students.length
    ? students
        .slice(0, 12)
        .map(
          (student) => `
            <tr>
              <td>${student.id}</td>
              <td>${student.name}</td>
              <td>${student.schoolClass || "-"}</td>
              <td>${student.phone || "-"}</td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="4">Chưa có dữ liệu học sinh.</td></tr>`;

  const teacherMarkup = users.length
    ? users
        .map(
          (user) => `
            <tr>
              <td>${user.id}</td>
              <td>${user.name || "-"}</td>
              <td>${user.email || "-"}</td>
              <td>${user.role || "-"}</td>
              <td>${user.classCode || "-"}</td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="5">Chưa có dữ liệu giáo viên.</td></tr>`;

  const uploadMarkup = uploadFiles.length
    ? uploadFiles
        .map(
          (file) => `
            <li>
              <code>${file}</code>
            </li>
          `
        )
        .join("")
    : `<li>Chưa có file nào trong <code>Cloudflare R2</code>.</li>`;

  const studentFilesMarkup = studentFiles
    .map((file) => `<li><code>${file}</code></li>`)
    .join("");

  const teacherFilesMarkup = teacherFiles
    .map((file) => `<li><code>${file}</code></li>`)
    .join("");

  res
    .status(200)
    .setHeader("Content-Type", "text/html; charset=utf-8")
    .send(`<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EduAI Backend Console</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #020617;
        --panel: rgba(15, 23, 42, 0.92);
        --line: rgba(148, 163, 184, 0.18);
        --text: #e2e8f0;
        --muted: #94a3b8;
        --accent: #38bdf8;
        --good: #22c55e;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, Arial, sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top right, rgba(56, 189, 248, 0.12), transparent 28%),
          radial-gradient(circle at top left, rgba(129, 140, 248, 0.14), transparent 30%),
          var(--bg);
      }
      .wrap {
        max-width: 1240px;
        margin: 0 auto;
        padding: 28px 20px 48px;
      }
      .panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 22px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
      }
      .hero {
        padding: 28px;
        margin-bottom: 20px;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 700;
        color: #bbf7d0;
        background: rgba(34, 197, 94, 0.12);
        border: 1px solid rgba(34, 197, 94, 0.28);
        border-radius: 999px;
        padding: 6px 10px;
      }
      h1 {
        margin: 14px 0 10px;
        font-size: 32px;
        line-height: 1.15;
      }
      h2 {
        margin: 0 0 12px;
        font-size: 20px;
      }
      p {
        margin: 0;
        color: var(--muted);
        line-height: 1.7;
      }
      .meta, .stats {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      .meta { margin-top: 18px; }
      .chip {
        font-size: 13px;
        color: #cbd5e1;
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 10px 12px;
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 18px;
      }
      .section {
        padding: 22px;
      }
      .section-head {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 16px;
      }
      .stats { margin-top: 10px; }
      .subgrid {
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        gap: 18px;
      }
      .box {
        background: rgba(2, 6, 23, 0.36);
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 16px;
      }
      .box h3 {
        margin: 0 0 10px;
        font-size: 15px;
      }
      ul {
        margin: 0;
        padding-left: 18px;
        color: #cbd5e1;
      }
      li { margin: 8px 0; }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        overflow: hidden;
      }
      th, td {
        padding: 10px 12px;
        border-bottom: 1px solid var(--line);
        text-align: left;
        vertical-align: top;
      }
      th {
        color: #cbd5e1;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      td {
        color: #e2e8f0;
      }
      code {
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid var(--line);
        color: #bae6fd;
        padding: 2px 8px;
        border-radius: 8px;
        font-size: 12px;
      }
      .hint {
        font-size: 12px;
        color: var(--muted);
        margin-top: 10px;
      }
      .footer {
        margin-top: 16px;
        font-size: 12px;
        color: var(--muted);
      }
      @media (max-width: 960px) {
        .subgrid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <section class="panel hero">
        <div class="badge">● Backend độc lập đang hoạt động</div>
        <h1>EduAI Backend Console</h1>
        <p>
          Đây là giao diện backend độc lập, không dùng giao diện frontend chính. Trang này chỉ phục vụ quản trị dữ liệu,
          kiểm tra nhanh tài nguyên backend và truy cập các nhóm thông tin chính của hệ thống.
        </p>
        <div class="meta">
          <span class="chip"><strong>Service:</strong> EduAI Backend Console</span>
          <span class="chip"><strong>Port:</strong> ${PORT}</span>
          <span class="chip"><strong>Health:</strong> <code>/api/health</code></span>
          <span class="chip"><strong>Route:</strong> <code>/backend</code></span>
        </div>
      </section>

      <section class="grid">
        <article class="panel section">
          <div class="section-head">
            <div>
              <h2>1. Dữ liệu học sinh</h2>
              <p>Khu vực backend này hiển thị các tệp dữ liệu học sinh đang được quản lý trong thư mục <code>data/</code>.</p>
            </div>
            <div class="stats">
              <span class="chip">Tổng học sinh: <strong>${students.length}</strong></span>
              <span class="chip">Số file dữ liệu: <strong>${studentFiles.length}</strong></span>
            </div>
          </div>

          <div class="subgrid">
            <div class="box">
              <h3>Tệp dữ liệu học sinh</h3>
              <ul>${studentFilesMarkup}</ul>
              <div class="hint">Các file này lưu hồ sơ nền, điểm, chuyên cần, hành vi, nhật ký và các hồ sơ mở rộng của học sinh.</div>
            </div>

            <div class="box">
              <h3>Xem nhanh dữ liệu học sinh</h3>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Họ tên</th>
                    <th>Lớp</th>
                    <th>Liên hệ</th>
                  </tr>
                </thead>
                <tbody>
                  ${studentsMarkup}
                </tbody>
              </table>
              <div class="hint">Bảng chỉ hiển thị nhanh 12 học sinh đầu tiên từ dữ liệu backend hiện tại.</div>
            </div>
          </div>
        </article>

        <article class="panel section">
          <div class="section-head">
            <div>
              <h2>2. Kho tài liệu backend</h2>
              <p>Các tệp tải lên được backend lưu trực tiếp trong thư mục <code>uploads/</code> và quản lý tách biệt với frontend.</p>
            </div>
            <div class="stats">
              <span class="chip">Tổng file tài liệu: <strong>${uploadFiles.length}</strong></span>
              <span class="chip">API tải file: <code>/api/documents/download/:id</code></span>
            </div>
          </div>

          <div class="box">
              <h3>Danh sách tệp tài liệu hiện có</h3>
            <ul>${uploadMarkup}</ul>
            <div class="hint">Tên file được backend chuẩn hóa khi upload để đảm bảo an toàn lưu trữ.</div>
          </div>
        </article>

        <article class="panel section">
          <div class="section-head">
            <div>
              <h2>3. Tài khoản giáo viên và quản trị</h2>
              <p>Thông tin người dùng backend đang được lưu trong file <code>data/users.json</code>.</p>
            </div>
            <div class="stats">
              <span class="chip">Tổng tài khoản: <strong>${users.length}</strong></span>
              <span class="chip">Số file dữ liệu: <strong>${teacherFiles.length}</strong></span>
            </div>
          </div>

          <div class="subgrid">
            <div class="box">
              <h3>File dữ liệu giáo viên</h3>
              <ul>${teacherFilesMarkup}</ul>
              <div class="hint">File này chứa email, vai trò, lớp chủ nhiệm và hồ sơ tài khoản của giáo viên.</div>
            </div>

            <div class="box">
              <h3>Danh sách giáo viên / tài khoản</h3>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Họ tên</th>
                    <th>Email</th>
                    <th>Vai trò</th>
                    <th>Lớp</th>
                  </tr>
                </thead>
                <tbody>
                  ${teacherMarkup}
                </tbody>
              </table>
            </div>
          </div>
        </article>
      </section>

      <div class="footer">
        Đây là console backend độc lập của EduAI. Giao diện này không phụ thuộc frontend chính và được dùng để quản lý, kiểm tra và quan sát dữ liệu BE.
      </div>
    </div>
  </body>
</html>`);
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "EduAI Backend",
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY || "";
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Gemini AI Client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini AI: ", err);
  }
} else {
  console.warn("WARNING: GEMINI_API_KEY is not configured or uses the placeholder. Fallback mock responses will be enabled.");
}

function getAiClient(req: any): GoogleGenAI | null {
  const customKey = req.headers["x-gemini-api-key"] || req.headers["X-Gemini-Api-Key"];
  if (customKey && typeof customKey === "string" && customKey.trim()) {
    try {
      return new GoogleGenAI({
        apiKey: customKey.trim(),
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build-custom"
          }
        }
      });
    } catch (err) {
      console.error("Failed to initialize custom Gemini AI client:", err);
    }
  }
  return ai;
}

function formatGeminiError(error: any): string {
  if (!error) return "Không tìm thấy chi tiết lỗi từ hệ thống AI.";
  
  let msg = "";
  if (typeof error === "string") {
    msg = error;
  } else if (error.message) {
    msg = error.message;
  } else {
    try {
      msg = JSON.stringify(error);
    } catch (e) {
      msg = String(error);
    }
  }

  // Try to parse if it contains a JSON structure
  try {
    if (msg.includes('{') && msg.includes('}')) {
      const startIdx = msg.indexOf('{');
      const endIdx = msg.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        const jsonPart = msg.substring(startIdx, endIdx + 1);
        const parsed = JSON.parse(jsonPart);
        if (parsed?.error?.message) {
          msg = parsed.error.message;
        } else if (parsed?.message) {
          msg = parsed.message;
        }
      }
    }
  } catch (e) {
    // Ignore and keep current msg
  }

  const lowercaseMsg = msg.toLowerCase();

  if (
    lowercaseMsg.includes("429") || 
    lowercaseMsg.includes("resource_exhausted") || 
    lowercaseMsg.includes("quota") || 
    lowercaseMsg.includes("depleted") || 
    lowercaseMsg.includes("rate limit") ||
    lowercaseMsg.includes("limit exceeded")
  ) {
    return "Lỗi 429 (Hết lượt truy cập/Tài khoản): Tài khoản API Key này đã hết lượt sử dụng miễn phí hoặc số dư tài khoản trả trước bị cạn kiệt. Thầy cô vui lòng kiểm tra lại phần thanh toán (Billing) trên Google AI Studio hoặc đổi sang một API Key mới.";
  }
  
  if (
    (lowercaseMsg.includes("400") && (lowercaseMsg.includes("key") || lowercaseMsg.includes("credential") || lowercaseMsg.includes("api key"))) ||
    lowercaseMsg.includes("api key not valid") || 
    lowercaseMsg.includes("api_key_invalid") || 
    lowercaseMsg.includes("invalid key")
  ) {
    return "Lỗi 400 (Khóa không hợp lệ): Khóa API Key thầy cô nhập không chính xác hoặc đã bị vô hiệu hóa. Vui lòng kiểm tra lại từng ký tự trong khóa API.";
  }
  
  if (
    lowercaseMsg.includes("503") || 
    lowercaseMsg.includes("service unavailable") || 
    lowercaseMsg.includes("overloaded") || 
    lowercaseMsg.includes("server error")
  ) {
    return "Lỗi 503 (Dịch vụ bận): Máy chủ Google Gemini đang bị quá tải tạm thời. Thầy cô vui lòng thử lại sau vài giây.";
  }
  
  if (lowercaseMsg.includes("expired")) {
    return "Khóa API Key của thầy cô đã hết hạn. Vui lòng tạo khóa mới trên Google AI Studio.";
  }

  return msg;
}

// Helper to generate content with resilient fallback models
async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
}, customAi?: GoogleGenAI | null) {
  const client = customAi || ai;
  if (!client) {
    throw new Error("AI client not initialized.");
  }

  const primaryModel = "gemini-3.5-flash";
  const backupModels = ["gemini-3.1-flash-lite", "gemini-flash-latest"];

  try {
    const response = await client.models.generateContent({
      model: primaryModel,
      contents: params.contents,
      config: params.config,
    });
    return response;
  } catch (error: any) {
    console.warn(`Primary model ${primaryModel} failed. Error: ${error.message || error}. Attempting backup models...`);
    
    for (const model of backupModels) {
      try {
        console.log(`Attempting fallback with model: ${model}`);
        const response = await client.models.generateContent({
          model: model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (backupError: any) {
        console.warn(`Backup model ${model} failed: ${backupError.message || backupError}`);
      }
    }
    
    throw error;
  }
}

// Ensure unique ID helper
function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function generateLocalLessonPlan(grade: any, subject: string, topic: string, curriculum: string) {
  return {
    grade: Number(grade) || 4,
    subject,
    topic,
    curriculum,
    objectives: [
      `Học sinh tiếp thu trọn vẹn kiến thức cốt lõi về "${topic}" môn ${subject} lớp ${grade}.`,
      "Rèn luyện các năng lực tự chủ, hợp tác nhóm giải quyết tình huống thực tiễn.",
      "Hình thành các phẩm chất chăm học, trung thực và ý thức trách nhiệm bảo vệ cuộc sống."
    ],
    materials: {
      teacher: ["Hình ảnh minh họa trình chiếu bài giảng", "Thẻ câu hỏi thảo luận nhóm", "Phiếu học tập cá nhân"],
      student: [`Sách giáo khoa môn ${subject} bộ sưu tập ${curriculum}`, "Bút màu, giấy viết nháp"]
    },
    activities: {
      warmup: {
        title: "Hoạt động 1: Khởi động",
        duration: "5 phút",
        teacherActions: `GV tổ chức trò chơi dân gian khởi động kết hợp câu đố vui mở đầu bài học: "Ai nhanh ai đúng". Đặt câu hỏi mở đầu về chủ đề sinh động "${topic}".`,
        studentActions: "HS hào hứng tham gia trả lời nhanh các câu đố vui của giáo viên, thiết lập tâm lý vui tươi sẵn sàng tiếp nhận bài mới."
      },
      explore: {
        title: "Hoạt động 2: Khám phá lý thuyết mới",
        duration: "15 phút",
        teacherActions: `GV trình chiếu tranh vẽ sơ đồ của "${topic}". Giảng kỹ lý thuyết và đặt câu hỏi gợi mở sâu từng vấn đề cốt lõi. Giao nhiệm vụ thảo luận nhóm học tập.`,
        studentActions: "HS tập trung theo dõi hình ảnh, ghi chép nhanh các điểm quan trọng. Làm việc nhóm 4 cùng nhau phân tích và trả lời các phần việc trên phiếu học tập."
      },
      practice: {
        title: "Hoạt động 3: Luyện tập",
        duration: "10 phút",
        teacherActions: `GV hướng dẫn làm các bài tập SGK nâng cao nhẹ. Cho các bạn xung phong lên bảng thi đua tính/vẽ/viết. Theo dõi giúp đỡ các nhóm học sinh còn chậm hơn.`,
        studentActions: "HS hoàn thành bài tập cá nhân vào vở luyện tập. 3 đại diện HS chia đội lên bảng trình bày đáp án, nhận xét nhận xét chéo của nhau."
      },
      apply: {
        title: "Hoạt động 4: Vận dụng",
        duration: "5 phút",
        teacherActions: `GV giao nhiệm vụ liên hệ thực tiễn về nhà: Hãy cùng cha mẹ quan sát hiện tượng "${topic}" trong đời sống gia đình và ghi chép lại kết quả sáng mai chia sẻ.`,
        studentActions: "HS tự suy nghĩ hướng giải quyết, đăng ký chia sẻ các hành động nhỏ hữu ích trong thực tiễn hằng ngày cùng gia đình."
      }
    },
    isFromCache: false,
    isFallback: true
  };
}

function generateLocalComment(studentName: string, praise: string, feedback: string, encouragement: string) {
  const mockPraise = `Em là học sinh có ưu điểm nổi trội về "${praise}". Ở lớp em luôn hòa đồng, tích cực giơ tay xây dựng bài học và giúp đỡ bè bạn xung quanh.`;
  const mockFeedback = `Bên cạnh đó, trong môn Tiếng Việt/Toán em vẫn "${feedback}". Giáo viên khuyên em cần dành thêm thời gian rèn luyện thêm ở nhà để kỹ năng hoàn thiện tốt hơn.`;
  const mockEncouragement = `Cô tin tưởng chắc chắn rằng với khả năng tiếp thu tốt và sự đồng hành khích lệ của gia đình em "${encouragement}", em sẽ gặt hái được nhiều kết quả tiến bộ vượt bậc thời gian tới!`;

  return {
    rawComment: `${mockPraise} Tuy nhiên em còn hơi chậm chưa tập trung hẳn. ${mockEncouragement}`,
    cleanedComment: `${mockPraise} ${mockFeedback} ${mockEncouragement}`,
    wordGuardViolations: [],
    hasBeenCleaned: true,
    stepComments: {
      praise: mockPraise,
      feedback: mockFeedback,
      encouragement: mockEncouragement
    }
  };
}

function generateLocalParentMemo(studentName: string, behaviorSummary: string) {
  return {
    content: `Kính gửi gia đình con ${studentName},\n\nTuần này con rất tích cực tham gia các hoạt động đội nhóm học tập, luôn hoạt bát vui tươi cùng bè bạn. Về việc học tập, con còn gặp đôi chút bỡ ngỡ khó khăn trong việc hoàn thành bài tập viết đúng thời gian quy định ở lớp (Nhận thấy hành vi: ${behaviorSummary}). Giáo viên tin tưởng rằng với sự nhắc nhở và đồng hành sát sao của gia đình cùng cô giáo ở lớp, con sẽ sớm thích nghi tốt hơn và tự tin tỏa sáng hơn trong các ngày học tới.\n\nChúc bố mẹ một tuần mới vui vẻ!\nTrân trọng từ Cô giáo Chủ nhiệm!`,
    isFallback: true
  };
}

function generateLocalTest(grade: string, subject: string, scope: string, difficulty: string, numMultipleChoice: number, numEssay: number) {
  const testTitle = `ĐỀ KIỂM TRA ĐỊNH KỲ MÔN ${subject.toUpperCase()} - LỚP ${grade.replace(/[^0-9]/g, "")}`;
  const duration = subject.toLowerCase().includes("toán") ? "40 phút" : "35 phút";
  
  const multipleChoiceQuestions = [];
  const gradeNum = parseInt(grade.replace(/[^0-9]/g, "")) || 3;
  
  for (let i = 1; i <= numMultipleChoice; i++) {
    let qText = `Câu ${i}: Câu hỏi trắc nghiệm số ${i} mức độ tăng dần về ${scope || "Kiến thức tuần mới nhất"}`;
    let options = {
      A: "Đáp án A (Lựa chọn trả lời đúng chuẩn xác)",
      B: "Đáp án B (Phương án gây nhiễu hợp lý cấp tiểu học)",
      C: "Đáp án C (Phương án phân tích nhầm lẫn thường gặp)",
      D: "Đáp án D (Nhận định chưa đúng mức độ kiến thức)"
    };
    let correctAnswer = "A";
    let explanation = `Giải thích cụ thể: Đáp án A là câu trả lời đúng vì bám sát giáo án bài học về môn ${subject} và phù hợp năng lực học sinh lớp ${gradeNum}.`;
    
    if (subject.toLowerCase().includes("toán")) {
      if (gradeNum === 1) {
        qText = `Câu ${i}: Trong phạm vi 10, phép tính nào dưới đây có kết quả lớn nhất?`;
        options = {
          A: `${5 + i}`,
          B: `${3 + i}`,
          C: `${4 + i - 1}`,
          D: `${2 + i}`
        };
        correctAnswer = "A";
        explanation = `Phép tính ở phương án A cho kết quả bằng ${5 + i}, lớn hơn tất cả các phương án còn lại.`;
      } else if (gradeNum === 2) {
        qText = `Câu ${i}: Số thích hợp để điền vào chỗ chấm của biểu thức: ${i * 5} x 2 = ... là:`;
        options = {
          A: `${i * 10}`,
          B: `${i * 5}`,
          C: `${i * 10 + 5}`,
          D: `${i * 10 - 5}`
        };
        correctAnswer = "A";
        explanation = `Ta có phép nhân: ${i * 5} nhân 2 bằng ${i * 10}. Vậy điền số ${i * 10}.`;
      } else if (gradeNum === 3) {
        qText = `Câu ${i}: Một hình vuông có độ dài cạnh là ${i * 4} cm. Chu vi của hình vuông đó bằng bao nhiêu xăng-ti-mét?`;
        options = {
          A: `${i * 16} cm`,
          B: `${i * 8} cm`,
          C: `${i * 4} cm`,
          D: `${i * 12} cm`
        };
        correctAnswer = "A";
        explanation = `Chu vi hình vuông bằng độ dài một cạnh nhân với 4. Ta có: ${i * 4} x 4 = ${i * 16} (cm).`;
      } else if (gradeNum === 4) {
        qText = `Câu ${i}: Một lớp học có 35 học sinh, số học sinh nam bằng 3/4 số học sinh nữ. Số học sinh nam của lớp học đó là:`;
        options = {
          A: "15 học sinh",
          B: "20 học sinh",
          C: "12 học sinh",
          D: "18 học sinh"
        };
        correctAnswer = "A";
        explanation = `Tổng số phần bằng nhau là: 3 + 4 = 7 (phần). Giá trị một phần là: 35 : 7 = 5 (học sinh). Số học sinh nam là: 5 x 3 = 15 (học sinh).`;
      } else {
        qText = `Câu ${i}: Trung bình cộng của hai số là ${i * 30}. Số thứ nhất là ${i * 20}. Số thứ hai là:`;
        options = {
          A: `${i * 40}`,
          B: `${i * 30}`,
          C: `${i * 50}`,
          D: `${i * 20}`
        };
        correctAnswer = "A";
        explanation = `Tổng hai số là: ${i * 30} x 2 = ${i * 60}. Số thứ hai là: ${i * 60} - ${i * 20} = ${i * 40}.`;
      }
    } else if (subject.toLowerCase().includes("tiếng việt") || subject.toLowerCase().includes("ngữ văn") || subject.toLowerCase().includes("văn")) {
      if (gradeNum <= 2) {
        qText = `Câu ${i}: Từ nào dưới đây viết đúng chính tả tiếng Việt?`;
        options = {
          A: "Xinh xắn",
          B: "Sinh sắn",
          C: "Xinh sắn",
          D: "Sinh xắn"
        };
        correctAnswer = "A";
        explanation = `"Xinh xắn" là từ láy viết đúng quy tắc chính tả âm đầu 'x'.`;
      } else {
        qText = `Câu ${i}: Trong câu "Dưới bóng tre xanh, ta giữ gìn nền văn hóa lâu đời", từ nào đóng vai trò là chủ ngữ?`;
        options = {
          A: "ta",
          B: "Dưới bóng tre xanh",
          C: "giữ gìn",
          D: "nền văn hóa lâu đời"
        };
        correctAnswer = "A";
        explanation = `Chủ ngữ trả lời cho câu hỏi "Ai?", ở đây "ta" thực hiện hành động giữ gìn nền văn hóa lâu đời.`;
      }
    } else if (subject.toLowerCase().includes("tiếng anh") || subject.toLowerCase().includes("english")) {
      qText = `Câu ${i}: Choose the correct answer to complete the sentence: "How old ______ you?" - "I am nine years old."`;
      options = {
        A: "are",
        B: "is",
        C: "am",
        D: "be"
      };
      correctAnswer = "A";
      explanation = `With subject pronoun "you", we use the linking verb "are".`;
    } else {
      qText = `Câu ${i}: Để bảo vệ sức khỏe học đường và tránh cận thị, học sinh cần giữ khoảng cách tối thiểu từ mắt đến sách là bao nhiêu?`;
      options = {
        A: "25 - 30 cm",
        B: "10 - 15 cm",
        C: "45 - 50 cm",
        D: "5 - 8 cm"
      };
      correctAnswer = "A";
      explanation = `Khoảng cách 25 - 30 cm giúp mắt điều tiết vừa phải, hạn chế nguy cơ cận thị học đường.`;
    }

    multipleChoiceQuestions.push({
      id: `mc-${i}`,
      question: qText,
      options,
      correctAnswer,
      explanation
    });
  }

  const essayQuestions = [];
  for (let i = 1; i <= numEssay; i++) {
    let qText = `Câu ${i} (Tự luận - ${i === numEssay ? "Vận dụng cao" : "Vận dụng"}): Giải quyết tình huống nâng cao nhẹ môn ${subject} liên hệ chủ đề "${scope}"`;
    let sampleSolution = "Đáp án chi tiết mẫu và cách tính từng bước cụ thể đạt điểm tối đa.";
    let gradingGuide = "Biểu điểm chi tiết: Viết đúng biểu thức (1đ), tính đúng kết quả (0.5đ), đáp số có đơn vị (0.5đ).";
    let score = i === numEssay ? 3.0 : 2.0;

    if (subject.toLowerCase().includes("toán")) {
      if (gradeNum <= 2) {
        qText = `Câu ${i} (Tự luận): Một cửa hàng có ${i * 40} quyển vở. Cửa hàng đã bán được ${i * 15} quyển vở. Hỏi cửa hàng còn lại bao nhiêu quyển vở?`;
        sampleSolution = `Số quyển vở cửa hàng còn lại là:\n${i * 40} - ${i * 15} = ${i * 25} (quyển vở).\nĐáp số: ${i * 25} quyển vở.`;
        gradingGuide = `- Viết lời giải đúng: 0.5 điểm\n- Viết phép tính trừ đúng: 1.0 điểm\n- Tính ra kết quả chính xác: 0.5 điểm\n- Viết đáp số kèm đơn vị: 0.5 điểm`;
        score = 2.5;
      } else {
        qText = `Câu ${i} (Tự luận): Một thửa ruộng hình chữ nhật có chu vi bằng ${i * 120}m, chiều dài gấp đôi chiều rộng. Tính diện tích của thửa ruộng hình chữ nhật đó.`;
        const nuaChuVi = i * 60;
        const rong = nuaChuVi / 3;
        const dai = rong * 2;
        const dienTich = dai * rong;
        sampleSolution = `Nửa chu vi thửa ruộng là: ${i * 120} : 2 = ${nuaChuVi} (m)\nChiều rộng thửa ruộng là: ${nuaChuVi} : (2 + 1) x 1 = ${rong} (m)\nChiều dài thửa ruộng là: ${rong} x 2 = ${dai} (m)\nDiện tích thửa ruộng là: ${dai} x ${rong} = ${dienTich} (m²)\nĐáp số: ${dienTich} m².`;
        gradingGuide = `- Tính đúng nửa chu vi thửa ruộng: 0.5 điểm\n- Tìm chiều dài, chiều rộng đúng tỉ lệ: 1.0 điểm\n- Tính diện tích thửa ruộng chính xác: 1.0 điểm\n- Ghi đúng đáp số kèm đơn vị (m²): 0.5 điểm`;
        score = 3.0;
      }
    } else if (subject.toLowerCase().includes("tiếng việt") || subject.toLowerCase().includes("ngữ văn")) {
      qText = `Câu ${i} (Tự luận): Em hãy viết một đoạn văn ngắn (khoảng 4 đến 6 câu) tả lại cảnh đẹp quê hương em vào một buổi sáng sớm mùa hè.`;
      sampleSolution = `Gợi ý giải:\n- Câu mở đoạn giới thiệu cảnh đẹp quê hương vào buổi sáng.\n- Câu thân đoạn miêu tả bầu trời, làn gió, cây cối, âm thanh tiếng chim hót...\n- Câu kết đoạn bày tỏ tình cảm thiêng liêng và niềm tự hào đối với quê hương mình.`;
      gradingGuide = `- Viết đúng dung lượng từ 4-6 câu: 0.5 điểm\n- Nội dung tả chân thực, sinh động, giàu hình ảnh quê hương: 1.5 điểm\n- Sử dụng từ ngữ chuẩn xác, không sai chính tả, đặt dấu câu đúng chỗ: 1.0 điểm`;
      score = 3.0;
    } else {
      qText = `Câu ${i} (Tự luận): Tại sao chúng ta cần phải rửa tay sạch sẽ bằng xà phòng trước khi ăn cơm và sau khi đi vệ sinh?`;
      sampleSolution = `Chúng ta cần rửa tay bằng xà phòng vì:\n1. Bàn tay hằng ngày tiếp xúc với nhiều bề mặt có chứa vi khuẩn, vi-rút gây bệnh.\n2. Xà phòng giúp diệt sạch vi khuẩn bám trên da tay.\n3. Việc này bảo vệ đường tiêu hóa không bị nhiễm trùng, ngừa dịch bệnh lây lan.`;
      gradingGuide = `- Giải thích bàn tay bám nhiều vi khuẩn: 1.0 điểm\n- Chỉ ra tác dụng diệt khuẩn của xà phòng: 1.0 điểm\n- Ý nghĩa bảo vệ sức khỏe và hệ tiêu hóa: 1.0 điểm`;
      score = 3.0;
    }

    essayQuestions.push({
      id: `essay-${i}`,
      question: qText,
      sampleSolution,
      gradingGuide,
      score
    });
  }

  let currentSum = numMultipleChoice * 0.5 + essayQuestions.reduce((a, b) => a + b.score, 0);
  if (currentSum !== 10) {
    const diff = 10 - currentSum;
    if (essayQuestions.length > 0) {
      essayQuestions[essayQuestions.length - 1].score = Math.round((essayQuestions[essayQuestions.length - 1].score + diff) * 10) / 10;
    }
  }

  return {
    testTitle,
    grade,
    subject,
    difficulty,
    duration,
    multipleChoiceQuestions,
    essayQuestions,
    isFallback: true
  };
}

// -------------------------------------------------------------
// CORE AI API ROUTES
// -------------------------------------------------------------

/**
 * 1. AI GIÁO ÁN 2345 (Lesson Plan Generator with Tabular output)
 */
app.post("/api/gemini/lesson", async (req, res): Promise<any> => {
  const { grade, subject, topic, curriculum, customFocus } = req.body;

  if (!grade || !subject || !topic || !curriculum) {
    return res.status(400).json({ error: "Thiếu thông tin bắt buộc để soạn giáo án." });
  }

  const prompt = `Bạn là một AI chuyên gia giáo dục tiểu học Việt Nam xuất sắc, thiết kế giáo án chuẩn Thông tư 2345 cho khối lớp ${grade}, môn ${subject}, bài học "${topic}" thuộc bộ sách cánh diều/chân trời sáng tạo/kết nối tri thức là "${curriculum}".
  
Yêu cầu soạn thảo giáo án chi tiết, KHÔNG viết dạng văn bản dài, mà phải chia thành 4 hoạt động bắt buộc đúng cấu trúc Thông tư 2345:
- Hoạt động 1: Khởi động (Mục tiêu, hình thức tổ chức, tạo không khí học tập)
- Hoạt động 2: Khám phá lý thuyết mới (Kiến thức cốt lõi mới)
- Hoạt động 3: Luyện tập (Thực hành luyện tập các dạng bài, giải toán hoặc ngữ pháp...)
- Hoạt động 4: Vận dụng (Gắn kết vận dụng thực tế)

Mỗi hoạt động phải mô tả cực kỳ cụ thể các công việc hành động của Giáo viên và Học sinh theo mô hình tương tác trực quan:
- Hoạt động của Giáo viên (Teacher actions): Câu hỏi gợi mở, giao nhiệm vụ, hướng dẫn, đồ dùng dạy học sử dụng.
- Hoạt động của Học sinh (Student actions): Trả lời câu hỏi, làm việc cá nhân/nhóm, trình bày trước lớp, tự làm thí nghiệm.

Hãy trả về phản hồi dưới dạng cấu trúc JSON chính xác theo Schema quy định dưới đây. Chú ý ngôn ngữ phản hồi bắt buộc là tiếng Việt thuần túy sư phạm tiểu học phù hợp lứa tuổi trẻ em Việt Nam.

Yêu cầu Custom từ giáo viên: ${customFocus || "Không có yêu cầu đặc biệt."}`;

  const currentAi = getAiClient(req);
  if (!currentAi) {
    return res.json(generateLocalLessonPlan(grade, subject, topic, curriculum));
  }

  try {
    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["grade", "subject", "topic", "curriculum", "objectives", "materials", "activities"],
          properties: {
            grade: { type: Type.INTEGER },
            subject: { type: Type.STRING },
            topic: { type: Type.STRING },
            curriculum: { type: Type.STRING },
            objectives: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            materials: {
              type: Type.OBJECT,
              required: ["teacher", "student"],
              properties: {
                teacher: { type: Type.ARRAY, items: { type: Type.STRING } },
                student: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            activities: {
              type: Type.OBJECT,
              required: ["warmup", "explore", "practice", "apply"],
              properties: {
                warmup: {
                  type: Type.OBJECT,
                  required: ["title", "duration", "teacherActions", "studentActions"],
                  properties: {
                    title: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    teacherActions: { type: Type.STRING },
                    studentActions: { type: Type.STRING }
                  }
                },
                explore: {
                  type: Type.OBJECT,
                  required: ["title", "duration", "teacherActions", "studentActions"],
                  properties: {
                    title: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    teacherActions: { type: Type.STRING },
                    studentActions: { type: Type.STRING }
                  }
                },
                practice: {
                  type: Type.OBJECT,
                  required: ["title", "duration", "teacherActions", "studentActions"],
                  properties: {
                    title: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    teacherActions: { type: Type.STRING },
                    studentActions: { type: Type.STRING }
                  }
                },
                apply: {
                  type: Type.OBJECT,
                  required: ["title", "duration", "teacherActions", "studentActions"],
                  properties: {
                    title: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    teacherActions: { type: Type.STRING },
                    studentActions: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      }
    }, currentAi);

    const resultText = response.text || "{}";
    const parsed = JSON.parse(resultText);
    parsed.isFromCache = false;
    res.json(parsed);

  } catch (error: any) {
    console.warn("Error generating lesson plan, using local fallback: ", error.message || error);
    res.json(generateLocalLessonPlan(grade, subject, topic, curriculum));
  }
});

/**
 * 1ab. AI DOCUMENT WORD FILE ANALYSIS
 * Trích xuất phân tích nội dung tóm tắt và phân loại thông minh của tệp Word
 */
app.post("/api/gemini/analyze-document", async (req, res): Promise<any> => {
  let { text = "", fileName = "" } = req.body;

  if (!text && !fileName) {
    return res.status(400).json({ error: "Không tìm thấy nội dung văn bản hoặc tên tệp để phân tích." });
  }

  // If text is empty (e.g. .doc, .pdf, .ppt etc. files whose text couldn't be extracted client-side), we fall back to name-only analysis
  if (!text) {
    text = `Tài liệu: ${fileName}. Vui lòng tự động nhận diện thông tin giáo án bám sát khung chương trình tiểu học dựa trên tên tệp tin này.`;
  }

  // 1. Build solid local fallback helper
  const cleanTitle = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim();
  
  // Quick keyword-based metadata detection for fallback
  let detectedGrade = "Khối 1";
  if (/khối\s*2|lớp\s*2/i.test(text) || /khối\s*2|lớp\s*2/i.test(fileName)) detectedGrade = "Khối 2";
  else if (/khối\s*3|lớp\s*3/i.test(text) || /khối\s*3|lớp\s*3/i.test(fileName)) detectedGrade = "Khối 3";
  else if (/khối\s*4|lớp\s*4/i.test(text) || /khối\s*4|lớp\s*4/i.test(fileName)) detectedGrade = "Khối 4";
  else if (/khối\s*5|lớp\s*5/i.test(text) || /khối\s*5|lớp\s*5/i.test(fileName)) detectedGrade = "Khối 5";

  let detectedSubject = "Toán";
  if (/tiếng\s*việt/i.test(text) || /tiếng\s*việt/i.test(fileName)) detectedSubject = "Tiếng Việt";
  else if (/tiếng\s*anh|english/i.test(text) || /tiếng\s*anh|english/i.test(fileName)) detectedSubject = "Tiếng Anh";
  else if (/tự\s*nhiên/i.test(text) || /tự\s*nhiên/i.test(fileName)) detectedSubject = "Tự nhiên & Xã hội";
  else if (/khoa\s*học/i.test(text) || /khoa\s*học/i.test(fileName)) detectedSubject = "Khoa học";
  else if (/lịch\s*sử|địa\s*lý/i.test(text) || /lịch\s*sử|địa\s*lý/i.test(fileName)) detectedSubject = "Lịch sử & Địa lý";
  else if (/tin\s*học/i.test(text) || /tin\s*học/i.test(fileName)) detectedSubject = "Tin học & Công nghệ";
  else if (/đạo\s*đức/i.test(text) || /đạo\s*đức/i.test(fileName)) detectedSubject = "Đạo đức";

  let detectedCategory: "Giáo án" | "Sách giáo khoa" | "Tài liệu tham khảo" = "Giáo án";
  if (/sách\s*giáo\s*khoa|sgk/i.test(text) || /sách\s*giáo\s*khoa|sgk/i.test(fileName)) detectedCategory = "Sách giáo khoa";
  else if (/đề\s*thi|đề\s*kiểm\s*tra|phiếu\s*bài\s*tập/i.test(text) || /đề\s*thi|đề\s*kiểm\s*tra|phiếu\s*bài\s*tập/i.test(fileName)) detectedCategory = "Tài liệu tham khảo";

  let detectedLessonTopic = "";
  const lessonMatch = text.match(/(?:Bài|Chủ đề)\s*\d+[^.\n]*/i);
  if (lessonMatch) {
    detectedLessonTopic = lessonMatch[0].trim().substring(0, 100);
  } else {
    detectedLessonTopic = cleanTitle;
  }

  const localFallback = {
    title: cleanTitle || "Tài liệu Word Tiểu học",
    grade: detectedGrade,
    subject: detectedSubject,
    category: detectedCategory,
    lessonTopic: detectedLessonTopic,
    summary: `Tài liệu Word được tải lên và phân tích tự động. Nội dung bám sát khung đào tạo môn ${detectedSubject} ${detectedGrade} cấp tiểu học.`,
    keyActivities: ["Hoạt động Khởi động bài học", "Khám phá kiến thức cốt lõi", "Luyện tập bài tập thực hành", "Vận dụng thực tế"],
    objectives: ["Giúp học sinh tiếp thu kiến thức trọng tâm của bài học", "Nâng cao năng lực giải quyết vấn đề và tự học cá nhân"]
  };

  const currentAi = getAiClient(req);
  if (!currentAi) {
    return res.json(localFallback);
  }

  try {
    const prompt = `Bạn là một AI trợ lý học thuật chuyên nghiệp dành cho giáo viên Tiểu học Việt Nam.
Hãy phân tích tài liệu sau đây (được trích xuất từ một tệp tin tài liệu giáo án/văn bản chữ/sách giáo khoa/phiếu bài tập):

Tên tệp gốc: ${fileName}
Nội dung văn bản trích xuất:
${text.substring(0, 200000)}

CHÚ Ý QUAN TRỌNG:
- Không cần tập trung nhận diện hay bận tâm giáo án/sách giáo khoa thuộc về khối lớp (grade) nào cụ thể. Hãy tập trung tối đa vào phân tích và nhận diện chính xác 100% nội dung tệp tin đã tải lên, bao gồm: tên bài dạy, chủ đề cốt lõi, mô tả tóm tắt bám sát nội dung thực tế, mục tiêu kiến thức/năng lực thực tế, và các hoạt động dạy học chính được đề cập trực tiếp trong giáo án hoặc sách giáo khoa (SGK).
- Đọc kỹ lưỡng nội dung văn bản để trích xuất thông tin một cách khách quan, chính xác nhất bám sát thực tế của tệp tin.

Yêu cầu phân tích và trả về cấu trúc JSON gồm:
1. "title": Tiêu đề chuẩn hóa, đẹp đẽ, sư phạm bằng tiếng Việt (Ví dụ: "Giáo án Toán - Tuần 12" hoặc "Sách giáo khoa Tiếng Việt - Chủ điểm Quê hương").
2. "lessonTopic": Tên tất cả các bài học hoặc chủ đề giảng dạy cụ thể được tìm thấy trực tiếp trong tài liệu. QUÉT TOÀN DIỆN VÀ CHÍNH XÁC: Liệt kê đầy đủ tất cả các bài dạy/chủ đề cốt lõi phát hiện được từ nội dung tệp, phân cách bằng dấu phẩy (Ví dụ: "Bài 12: Biểu thức có chứa chữ, Bài 13: Tính giá trị biểu thức").
3. "grade": Khối lớp phù hợp nhất nếu tìm thấy rõ ràng (Ví dụ: "Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5", hoặc "Tất cả"). Nếu không rõ, hãy điền "Tất cả".
4. "subject": Môn học phù hợp nhất (Chỉ chọn 1 trong các môn: "Toán", "Tiếng Việt", "Tiếng Anh", "Tự nhiên & Xã hội", "Khoa học", "Lịch sử & Địa lý", "Tin học & Công nghệ", "Đạo đức", "Mỹ thuật", "Âm nhạc", "Thể chất", "Hoạt động trải nghiệm").
5. "category": Phân loại (Chỉ chọn 1 trong: "Giáo án", "Sách giáo khoa", "Tài liệu tham khảo").
6. "summary": Mô tả tổng quan chi tiết và chính xác nhất về nội dung của giáo án/tài liệu này, liên kết chặt chẽ với các bài học và chủ đề cốt lõi đã nhận diện. Nội dung mô tả BẮT BUỘC phải làm rõ: giáo án/SGK này bao gồm những bài học cụ thể nào và mục tiêu tương ứng (về kiến thức, năng lực) của từng bài học đó là gì.
7. "keyActivities": Mảng các chuỗi chứa tên các hoạt động dạy học chính được phát hiện trực tiếp trong tài liệu.
8. "objectives": Mảng các mục tiêu kiến thức, năng lực chính được phát hiện của tất cả các bài học có trong tài liệu.

Đảm bảo trả về đúng định dạng JSON chuẩn. Không thêm bớt văn bản giải thích ngoài JSON.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["title", "lessonTopic", "grade", "subject", "category", "summary", "keyActivities", "objectives"],
          properties: {
            title: { type: Type.STRING },
            lessonTopic: { type: Type.STRING },
            grade: { type: Type.STRING },
            subject: { type: Type.STRING },
            category: { type: Type.STRING },
            summary: { type: Type.STRING },
            keyActivities: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            objectives: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    }, currentAi);

    const responseText = response.text || "{}";
    const result = JSON.parse(responseText);
    res.json({
      title: result.title || localFallback.title,
      lessonTopic: result.lessonTopic || localFallback.lessonTopic,
      grade: result.grade || localFallback.grade,
      subject: result.subject || localFallback.subject,
      category: result.category || localFallback.category,
      summary: result.summary || localFallback.summary,
      keyActivities: result.keyActivities || localFallback.keyActivities,
      objectives: result.objectives || localFallback.objectives
    });

  } catch (error: any) {
    const rawMsg = error && error.message ? String(error.message) : String(error);
    let cleanMsg = rawMsg;
    if (rawMsg.includes("RESOURCE_EXHAUSTED") || rawMsg.includes("429") || rawMsg.includes("quota") || rawMsg.includes("quota exceeded")) {
      cleanMsg = "Gemini API Quota Exceeded (429). Using secure local taxonomy mapping fallback.";
    }
    console.warn("AI document analyzer failed, using local fallback: " + cleanMsg);
    res.json(localFallback);
  }
});

/**
 * 1b. AI DOCUMENT SEARCH & GROUNDED QA
 * Dựa trên dữ liệu từ Kho tài liệu của giáo viên để phân tích, tìm kiếm thông tin bằng Trí tuệ Nhân tạo
 */
app.post("/api/gemini/document-search", async (req, res): Promise<any> => {
  const { query, documents = [] } = req.body;

  if (!query) {
    return res.status(400).json({ error: "Thầy cô vui lòng nhập nội dung cần tìm kiếm hoặc câu hỏi." });
  }

  // Local fallback / keyword matcher implementation to ensure 100% robustness
  const buildLocalFallback = () => {
    const normalizedQuery = query.toLowerCase();
    const matchedDocs = documents.map((doc: any) => {
      let score = 0;
      const name = (doc.name || "").toLowerCase();
      const subject = (doc.subject || "").toLowerCase();
      const notes = (doc.notes || "").toLowerCase();
      const grade = (doc.grade || "").toLowerCase();
      const category = (doc.category || "").toLowerCase();

      if (name.includes(normalizedQuery)) score += 50;
      if (subject.includes(normalizedQuery)) score += 30;
      if (notes.includes(normalizedQuery)) score += 20;
      if (grade.includes(normalizedQuery)) score += 20;
      if (category.includes(normalizedQuery)) score += 10;

      const words = normalizedQuery.split(/\s+/).filter((w: string) => w.length > 2);
      words.forEach((word: string) => {
        if (name.includes(word)) score += 10;
        if (subject.includes(word)) score += 5;
        if (notes.includes(word)) score += 5;
      });

      return {
        id: doc.id,
        name: doc.name,
        relevanceScore: Math.min(score, 100),
        matchReason: `Khớp các từ khóa liên quan đến ${doc.category.toLowerCase()} ${doc.subject ? `môn ${doc.subject}` : ""} ${doc.grade ? `lớp ${doc.grade}` : ""}.`
      };
    })
    .filter((d: any) => d.relevanceScore > 0)
    .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);

    return {
      analysis: `Hệ thống tìm kiếm cục bộ đã phân tích ${documents.length} tài liệu trong Kho của thầy cô. Dựa trên từ khóa "${query}", chúng tôi tìm thấy ${matchedDocs.length} tài liệu phù hợp nhất để hỗ trợ thầy cô lập kế hoạch giảng dạy.`,
      relevantDocs: matchedDocs.slice(0, 3),
      pedagogicalSuggestion: "Thầy cô có thể click trực tiếp vào tài liệu được tìm thấy để xem chi tiết, tải file mẫu, hoặc nhấn nút 'Chọn nhanh để Soạn Giáo án' để tự động điền thông tin và khởi chạy tính năng biên soạn bài dạy chuẩn 2345.",
      suggestedTopic: matchedDocs.length > 0 ? matchedDocs[0].name.replace(/\.[^/.]+$/, "") : ""
    };
  };

  const currentAi = getAiClient(req);
  if (!currentAi) {
    return res.json(buildLocalFallback());
  }

  try {
    const prompt = `Bạn là một trợ lý AI chuyên môn sư phạm xuất sắc tại Việt Nam, phục vụ giáo viên tiểu học.
Nhiệm vụ của bạn là dựa trên danh sách tài liệu từ "Kho Tài Liệu" của giáo viên dưới đây để trả lời câu hỏi, tìm kiếm thông tin, đề xuất bài giảng hoặc gợi ý sư phạm.

Danh sách tài liệu hiện có trong Kho Tài Liệu của giáo viên:
${JSON.stringify(documents, null, 2)}

Yêu cầu/Câu hỏi tìm kiếm của giáo viên: "${query}"

Hãy thực hiện phân tích và phản hồi dưới dạng JSON có cấu trúc sau:
{
  "analysis": "Lời giải thích phân tích chi tiết bằng tiếng Việt sư phạm ấm áp, lịch sự. Trả lời trực tiếp câu hỏi của giáo viên dựa vào việc tra cứu các tài liệu được cung cấp.",
  "relevantDocs": [
    {
      "id": "id_của_tài_liệu_khớp_nhất",
      "name": "Tên tài liệu",
      "relevanceScore": 95, // điểm số phù hợp từ 0 đến 100
      "matchReason": "Giải thích ngắn gọn lý do tài liệu này cực kỳ phù hợp với truy vấn."
    }
  ],
  "pedagogicalSuggestion": "Gợi ý sư phạm sâu sắc: Khuyên giáo viên nên áp dụng những tài liệu tìm thấy này như thế nào trong bài dạy thực tế hoặc thiết lập hoạt động học tập phù hợp.",
  "suggestedTopic": "Chủ đề bài dạy cụ thể gợi ý tương ứng (ví dụ: 'Vòng tuần hoàn của nước' hoặc 'Bảng nhân 3')"
}

Yêu cầu cực kỳ quan trọng:
1. Chỉ đề xuất các tài liệu có THỰC SỰ tồn tại trong mảng JSON danh sách tài liệu được cung cấp ở trên.
2. Nếu không tìm thấy bất kỳ tài liệu nào liên quan, hãy giải thích nhẹ nhàng trong phần 'analysis', đồng thời đưa ra gợi ý giáo viên có thể bổ sung thêm tài liệu dạng nào vào Kho.
3. Ngôn ngữ giao tiếp bằng tiếng Việt chuẩn mực sư phạm tiểu học.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["analysis", "relevantDocs", "pedagogicalSuggestion", "suggestedTopic"],
          properties: {
            analysis: { type: Type.STRING },
            relevantDocs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "name", "relevanceScore", "matchReason"],
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  relevanceScore: { type: Type.INTEGER },
                  matchReason: { type: Type.STRING }
                }
              }
            },
            pedagogicalSuggestion: { type: Type.STRING },
            suggestedTopic: { type: Type.STRING }
          }
        }
      }
    }, currentAi);

    const resultText = response.text || "{}";
    res.json(JSON.parse(resultText));

  } catch (error: any) {
    console.error("Error searching documents with Gemini: ", error);
    // Silent failover to robust local algorithm
    res.json(buildLocalFallback());
  }
});


/**
 * 2. AI SLIDE GENERATOR (with speak scripts, interactivity and Pure Vietnamese illustration prompt joiner)
 * Grounded on uploaded documents from the Teacher Repository to ensure pedagogical accuracy.
 */
// Helper function to match a document based on the user's natural language command
function matchDocumentForCommand(command: string, documents: any[]): any {
  if (!documents || documents.length === 0) return null;

  const normalizeText = (value: string = "") => normalizeSearchText(value);

  const cmdLower = command.toLowerCase();
  const cmdNormalized = normalizeText(command);

  // Extract grade number from command: e.g. "khối 4", "lớp 4", "k4"
  let gradeNum: number | null = null;
  const gradeMatch = cmdNormalized.match(/(?:khoi|lop|k)\s*(\d+)/i);
  if (gradeMatch) {
    gradeNum = parseInt(gradeMatch[1], 10);
  }

  // Extract subject from command with broader aliases
  let subject: string | null = null;
  if (cmdNormalized.includes("toan")) subject = "Toán";
  else if (cmdNormalized.includes("tieng viet") || cmdNormalized.includes("tap lam van") || cmdNormalized.includes("chinh ta")) subject = "Tiếng Việt";
  else if (cmdNormalized.includes("khoa hoc") || cmdNormalized.includes("tu nhien xa hoi") || cmdNormalized.includes("tu nhien va xa hoi")) subject = "Khoa học";
  else if (cmdNormalized.includes("lich su") || cmdNormalized.includes("dia ly") || cmdNormalized.includes("dia li")) subject = "Lịch sử & Địa lý";
  else if (cmdNormalized.includes("tin hoc") || cmdNormalized.includes("cong nghe")) subject = "Tin học & Công nghệ";
  else if (cmdNormalized.includes("dao duc")) subject = "Đạo đức";
  else if (cmdNormalized.includes("tieng anh") || cmdNormalized.includes("english")) subject = "Tiếng Anh";
  else if (cmdNormalized.includes("my thuat") || cmdNormalized.includes("mi thuat")) subject = "Mỹ thuật";
  else if (cmdNormalized.includes("am nhac")) subject = "Âm nhạc";
  else if (cmdNormalized.includes("the chat") || cmdNormalized.includes("the duc")) subject = "Thể chất";
  else if (cmdNormalized.includes("trai nghiem")) subject = "Hoạt động trải nghiệm";

  // Extract lesson/week number from command: e.g. "tuần 12", "bài 12"
  let weekNum: string | null = null;
  const weekMatch = cmdNormalized.match(/(?:tuan|bai|chu de|b)\s*(\d+)/i);
  if (weekMatch) {
    weekNum = weekMatch[1];
  }

  const stopWords = new Set([
    "toi", "muon", "tao", "slide", "cua", "mon", "khoi", "lop", "tuan", "bai",
    "giao", "an", "sach", "giao", "khoa", "cho", "ve", "va", "la", "hoc", "day"
  ]);

  const cmdWords = cmdNormalized
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  let bestDoc: any = null;
  let maxScore = -1;
  let bestGradeSubjectDoc: any = null;
  let bestGradeSubjectScore = -1;

  for (const doc of documents) {
    let score = 0;
    const docNameLower = (doc.name || "").toLowerCase();
    const docSubjectLower = (doc.subject || "").toLowerCase();
    const docGradeLower = (doc.grade || "").toLowerCase();
    const docTextLower = (doc.extractedText || "").toLowerCase();

    const docSearchCorpusRaw = [
      doc.name,
      doc.subject,
      doc.grade,
      doc.fileName,
      doc.notes,
      doc.bookSeries,
      doc.refGroup,
      doc.lessonTopic,
      doc.extractedText
    ].filter(Boolean).join(" ");

    const docSearchCorpus = normalizeText(docSearchCorpusRaw);
    const docGradeNumMatch = docGradeLower.match(/\d+/);
    const docGradeNum = docGradeNumMatch ? parseInt(docGradeNumMatch[0], 10) : null;
    const gradeMatches = gradeNum === null || docGradeNum === gradeNum;

    const subjectMatches = !subject || (
      normalizeText(doc.subject || "").includes(normalizeText(subject)) ||
      normalizeText(doc.name || "").includes(normalizeText(subject)) ||
      docSearchCorpus.includes(normalizeText(subject))
    );

    // 1. Grade check
    if (gradeNum !== null) {
      if (gradeMatches) {
        score += 45;
      } else {
        score -= 40;
      }
    }

    // 2. Subject check
    if (subject !== null) {
      if (subjectMatches) {
        score += 45;
      } else {
        score -= 40;
      }
    }

    // 3. Week/Lesson check across all metadata
    if (weekNum !== null) {
      const weekPatterns = [
        `tuan ${weekNum}`,
        `bai ${weekNum}`,
        `chu de ${weekNum}`,
        `week ${weekNum}`
      ];
      if (weekPatterns.some(pattern => docSearchCorpus.includes(pattern))) {
        score += 50;
      }
    }

    // 4. Topic keyword check across all metadata
    let wordMatches = 0;
    cmdWords.forEach(word => {
      if (docSearchCorpus.includes(word)) {
        wordMatches++;
      }
    });
    score += wordMatches * 15;

    // 5. Prefer pedagogically relevant categories
    if (docNameLower.includes("giao an") || docNameLower.includes("giáo án") || (doc.category || "") === "Giáo án") {
      score += 12;
    } else if (docNameLower.includes("sach giao khoa") || docNameLower.includes("sách giáo khoa") || (doc.category || "") === "Sách giáo khoa") {
      score += 8;
    }

    // Track best grade+subject match separately for graceful fallback
    if (gradeMatches && subjectMatches && score > bestGradeSubjectScore) {
      bestGradeSubjectScore = score;
      bestGradeSubjectDoc = doc;
    }

    if (score > maxScore) {
      maxScore = score;
      bestDoc = doc;
    }
  }

  // Standard accept path
  if (maxScore > 15) {
    return bestDoc;
  }

  // Graceful fallback: if teacher command clearly matches grade + subject, use the best available doc
  if (bestGradeSubjectDoc) {
    return bestGradeSubjectDoc;
  }

  return null;
}

// Helper to resolve highly relevant Unsplash images based on teaching topic and content
function getRelevantImageUrl(subject: string, title: string, points: string[]): string {
  const text = (title + " " + points.join(" ")).toLowerCase();
  
  // Math & Numbers
  if (subject === "Toán" || text.includes("toán") || text.includes("phép cộng") || text.includes("phép trừ") || text.includes("nhân") || text.includes("chia") || text.includes("biểu thức") || text.includes("phân số") || text.includes("số học") || text.includes("hình học") || text.includes("đo lường")) {
    const randIds = [
      "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=600&auto=format&fit=crop&q=80"
    ];
    return randIds[Math.floor(Math.random() * randIds.length)];
  }
  
  // Science & Nature / Water Cycle
  if (subject === "Khoa học" || text.includes("nước") || text.includes("tuần hoàn") || text.includes("mưa") || text.includes("bốc hơi") || text.includes("ngưng tụ") || text.includes("khoa học") || text.includes("tự nhiên") || text.includes("môi trường") || text.includes("thực vật") || text.includes("động vật") || text.includes("sinh học") || text.includes("hơi nước")) {
    const randIds = [
      "https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1548263544-24e2c88c72e9?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=600&auto=format&fit=crop&q=80"
    ];
    return randIds[Math.floor(Math.random() * randIds.length)];
  }
  
  // Reading & Literature / English / Vietnamese
  if (subject === "Tiếng Việt" || subject === "Tiếng Anh" || text.includes("đọc") || text.includes("viết") || text.includes("sách") || text.includes("kể chuyện") || text.includes("chữ") || text.includes("từ vựng") || text.includes("ngôn ngữ") || text.includes("luyện từ") || text.includes("câu")) {
    const randIds = [
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=600&auto=format&fit=crop&q=80"
    ];
    return randIds[Math.floor(Math.random() * randIds.length)];
  }
  
  // History & Geography
  if (subject === "Lịch sử & Địa lý" || text.includes("lịch sử") || text.includes("địa lý") || text.includes("bản đồ") || text.includes("quốc gia") || text.includes("thời gian") || text.includes("văn hóa") || text.includes("di tích") || text.includes("đất nước")) {
    return "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&auto=format&fit=crop&q=80";
  }
  
  // Arts / Music / Crafts
  if (subject === "Mỹ thuật" || subject === "Âm nhạc" || text.includes("vẽ") || text.includes("màu") || text.includes("nhạc") || text.includes("hát") || text.includes("đàn") || text.includes("nghệ thuật") || text.includes("nhạc cụ")) {
    return "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&auto=format&fit=crop&q=80";
  }
  
  // General active / sports / physical
  if (subject === "Thể chất" || text.includes("thể thao") || text.includes("chạy") || text.includes("nhảy") || text.includes("vận động") || text.includes("sức khỏe") || text.includes("thể dục")) {
    return "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&auto=format&fit=crop&q=80";
  }

  // Fallback general friendly classroom
  return "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=600&auto=format&fit=crop&q=80"; 
}

/**
 * 2. AI SLIDE GENERATOR (with speak scripts, interactivity and Pure Vietnamese illustration prompt joiner)
 * Grounded on uploaded documents from the Teacher Repository to ensure pedagogical accuracy.
 */
app.post("/api/gemini/slides", async (req, res): Promise<any> => {
  const { grade, subject, topic, command, documents = [], selectedDocId } = req.body;

  const normalizedDocs = Array.isArray(documents) ? documents.filter(Boolean) : [];
  let matchedDoc: any = null;

  const findFallbackDocument = () => {
    if (normalizedDocs.length === 0) return null;

    const normalizedSubject = normalizeSearchText(subject || "");
    const gradeNum = extractFirstNumber(String(grade || ""));

    const gradeAndSubjectDoc = normalizedDocs.find((doc: any) => {
      const docGradeNum = extractFirstNumber(String(doc?.grade || ""));
      const docSubject = normalizeSearchText(doc?.subject || "");
      const gradeMatches = gradeNum === null || docGradeNum === gradeNum;
      const subjectMatches = !normalizedSubject || docSubject.includes(normalizedSubject);
      return gradeMatches && subjectMatches;
    });

    if (gradeAndSubjectDoc) return gradeAndSubjectDoc;

    const pedagogicalDoc = normalizedDocs.find((doc: any) =>
      doc?.category === "Giáo án" || doc?.category === "Sách giáo khoa"
    );

    return pedagogicalDoc || normalizedDocs[0];
  };

  // 1. If we have a manually selected document ID, find it directly
  if (selectedDocId) {
    matchedDoc = normalizedDocs.find((d: any) => d.id === selectedDocId);
  }

  // 2. Analyze by command if supplied and no doc matched yet
  if (!matchedDoc && command) {
    matchedDoc = matchDocumentForCommand(command, normalizedDocs);
  }

  // 3. Legacy support: match by grade, subject, and topic
  if (!matchedDoc) {
    const legacyCommand = `Môn ${subject} Khối ${grade} ${topic}`;
    matchedDoc = matchDocumentForCommand(legacyCommand, normalizedDocs);
  }

  // 4. Final graceful fallback: use the best repository document instead of hard failing
  if (!matchedDoc) {
    matchedDoc = findFallbackDocument();
  }

  if (!matchedDoc) {
    return res.status(404).json({
      error: "tài liệu chưa tồn tại trong kho tài liệu vui lòng cập nhật tài liệu để tạo slide",
      notFound: true
    });
  }

  // Set local parameters derived from matched document
  const finalGrade = matchedDoc ? matchedDoc.grade : `Khối ${grade || 4}`;
  const finalSubject = matchedDoc ? matchedDoc.subject : (subject || "Khoa học");
  const finalTopic = matchedDoc ? (matchedDoc.lessonTopic || matchedDoc.name.replace(/^Giáo án\s+/i, "")) : (topic || "Bài học");

  const promptBaseFixed = "Vietnamese primary school educational illustration, Vietnamese students, red scarf, friendly classroom, bright colors, cute watercolor cartoon style, safe for children, Vietnamese labels only, no foreign language text";
  const matchedSlideSamples = selectSlideSamples({
    grade,
    subject,
    topic,
    documents,
    matchedDoc
  });

  const buildFallbackSlides = () => {
    const slidesList = [];
    
    // Part 1: Mở đầu (3 slides)
    slidesList.push({
      slideNumber: 1,
      part: "Mở đầu",
      title: `CHÀO MỪNG TIẾT HỌC - ${finalTopic.toUpperCase()}`,
      points: [
        `Chào mừng cả lớp đến với tiết học môn ${finalSubject} - lớp ${finalGrade}.`,
        "Cùng chuẩn bị đầy đủ sách vở, bút mực sẵn sàng khám phá.",
        "Tiết học bám sát nội dung chương trình học cốt lõi."
      ],
      illustrationPrompt: "None",
      illustrationStyleBase: "None",
      speakingScript: `Cô xin chào tất cả các con học sinh yêu quý! Hôm nay, lớp chúng mình sẽ cùng đồng hành học môn ${finalSubject} với một bài học cực kỳ lôi cuốn mang tên "${finalTopic}". Các con đã sẵn sàng chưa nào?`,
      activityLabel: "Khởi động hào hứng",
      activityContent: "Cả lớp cùng đứng dậy vỗ tay nhịp nhàng 3 tiếng và hô to: 'Học chủ động - Khám phá vui - Học hết mình!'",
      simulatedImage: "",
      objective: "Kích hoạt tâm thế học tập chủ động và tạo không khí vui tươi đầu giờ học",
      layout: "Trang bìa chính - Tiêu đề trung tâm lớn với phông nền rực rỡ",
      illustration: "Vector hoạt hình các bạn học sinh đeo khăn quàng đỏ vui tươi đến lớp",
      searchKeyword: "Vietnamese students school cartoon vector",
      animation: "Fade"
    });

    slidesList.push({
      slideNumber: 2,
      part: "Mở đầu",
      title: "HOẠT ĐỘNG KHỞI ĐỘNG (WARM-UP)",
      points: [
        "Kích hoạt tư duy và liên hệ kinh nghiệm thực tế của các con.",
        "Cùng suy nghĩ và trả lời nhanh câu hỏi gợi mở từ thầy cô.",
        "Tạo mối liên kết sinh động từ cuộc sống vào bài học mới."
      ],
      illustrationPrompt: "None",
      illustrationStyleBase: "None",
      speakingScript: `Để bắt đầu bài học hôm nay, thầy/cô có một câu đố nhỏ dành cho các con nhé. Hãy cùng quan sát xung quanh và cho thầy/cô biết các con đã bao giờ nhìn thấy hiện tượng này trong cuộc sống chưa?`,
      activityLabel: "Hỏi đáp nhanh",
      activityContent: "Thảo luận nhóm đôi trong 1 phút để kể tên 3 hiện tượng thực tiễn liên quan đến bài học.",
      simulatedImage: "",
      objective: "Khai thác vốn sống thực tế và kích thích sự tò mò của học sinh",
      layout: "Bố cục câu hỏi trung tâm - 2 cột hỏi đáp",
      illustration: "Hình vẽ các hộp quà bí ẩn và dấu hỏi chấm màu sắc sặc sỡ",
      searchKeyword: "mystery gift box question mark cartoon illustration",
      animation: "Zoom"
    });

    slidesList.push({
      slideNumber: 3,
      part: "Mở đầu",
      title: "MỤC TIÊU BÀI HỌC CỐT LÕI",
      points: [
        matchedDoc && matchedDoc.aiObjectives && matchedDoc.aiObjectives[0] ? matchedDoc.aiObjectives[0] : "Hiểu được kiến thức cơ bản cốt lõi của bài học hằng ngày.",
        matchedDoc && matchedDoc.aiObjectives && matchedDoc.aiObjectives[1] ? matchedDoc.aiObjectives[1] : "Nâng cao năng lực tự học, làm việc nhóm và giải quyết vấn đề.",
        "Hình thành thói quen rèn luyện, bảo vệ thiên nhiên và tôn trọng kỷ luật."
      ],
      illustrationPrompt: "None",
      illustrationStyleBase: "None",
      speakingScript: `Sau khi học xong bài học này, các con sẽ tự tin nắm vững các mục tiêu cốt lõi: từ việc nắm bắt kiến thức chính xác cho tới rèn luyện kỹ năng thực hành xuất sắc trong cuộc sống đó!`,
      activityLabel: "Cam kết đồng lòng",
      activityContent: "Từng bàn học sinh quay sang đập tay (High-five) với bạn bên cạnh để hứa cùng nhau học thật tập trung.",
      simulatedImage: "",
      objective: "Định hướng chuẩn đầu ra về năng lực và phẩm chất cho học sinh",
      layout: "Bố cục 3 khối hộp tiêu chuẩn (Card Layout) nằm ngang trực quan",
      illustration: "Icon tấm khiên bảo vệ và chiếc cúp vinh quang vàng rực rỡ",
      searchKeyword: "trophy gold achievement icon vector flat",
      animation: "Appear"
    });

    // Part 2: Nội dung bài học (10 slides bám sát nội dung giáo án)
    const mockContents = [
      {
        title: "Khái niệm và Kiến thức cơ bản",
        desc: "Lý thuyết trọng tâm ban đầu giúp học sinh hiểu sâu vấn đề giảng dạy bám sát giáo án.",
        examples: ["Ví dụ 1: Trường hợp thực tế gặp trong lớp học.", "Ví dụ bổ sung 2: Hiện tượng phổ biến trong tự nhiên đời sống."],
        layout: "Quy trình Process Flow 3 bước dọc theo trục ngang",
        illustration: "Sơ đồ vẽ tay giải thích khái niệm cốt lõi bằng nét vẽ dễ thương",
        searchKeyword: "concept layout flat infographic design",
        animation: "Morph"
      },
      {
        title: "Hiện tượng thực tế và Trực quan hóa",
        desc: "Mô tả sinh động các biểu hiện, ví dụ cụ thể bám sát đời sống lứa tuổi tiểu học.",
        examples: ["Ví dụ thực tiễn 1: Trực quan hóa qua các vật dụng quanh ta.", "Ví dụ bổ sung 2: Liên hệ thói quen hàng ngày của học sinh."],
        layout: "Bố cục Before/After so sánh sự khác biệt trực quan",
        illustration: "Tranh vẽ hoạt hình hai tình huống trái ngược để học sinh phân tích",
        searchKeyword: "before after comparison cartoon vector",
        animation: "Fade"
      },
      {
        title: "Giải thích Quy luật cốt lõi",
        desc: "Phân tích nguyên lý, cách vận hành một cách đơn giản, khoa học và dễ nhớ.",
        examples: ["Ví dụ khoa học: Giải thích nguyên nhân của hiện tượng.", "Ví dụ liên hệ thêm: Cách ứng dụng quy luật này vào thực tế."],
        layout: "Sơ đồ chu kỳ Cycle Diagram tuần hoàn khép kín",
        illustration: "Sơ đồ các mũi tên chỉ hướng tuần hoàn sinh động",
        searchKeyword: "cycle process circular flow diagram vector",
        animation: "Zoom"
      },
      {
        title: "Bài tập thực hành mẫu - Ví dụ 1",
        desc: "Hướng dẫn chi tiết từng bước giải bài tập, giải quyết câu hỏi mẫu của giáo án.",
        examples: ["Ví dụ giải toán/khoa học mẫu 1: Thực hiện theo phương pháp chuẩn.", "Ví dụ mẫu mở rộng 2: Bài toán tương tự nhưng nâng cao nhẹ."],
        layout: "Bố cục 2 cột song song: Đề bài bên trái - Lời giải chi tiết bên phải",
        illustration: "Hình vẽ bảng viết phấn có các bước giải bài toán khoa học",
        searchKeyword: "blackboard with chalk notes illustration vector",
        animation: "Appear"
      },
      {
        title: "Tự rèn luyện rèn trí nhớ - Thử thách 1",
        desc: "Học sinh tự làm bài tập cá nhân để khắc sâu kiến thức vừa khám phá.",
        examples: ["Ví dụ luyện tập tại lớp: Bài tập tự giải nhanh.", "Ví dụ bổ sung cho học sinh giỏi: Thử thách tư duy nhanh."],
        layout: "Bố cục bảng dữ liệu Table ngắn gọn có tô màu ô quan trọng",
        illustration: "Icon chiếc bút chì và cuốn vở học sinh tinh nghịch",
        searchKeyword: "pencil book study element cartoon icon",
        animation: "Fade"
      },
      {
        title: "Phân tích chuyên sâu - Ví dụ 2",
        desc: "Đưa ra các tình huống nâng cao nhẹ bám sát sách giáo khoa để kích thích tư duy.",
        examples: ["Ví dụ chuyên sâu 1: Tình huống phát sinh cần giải quyết mẫu.", "Ví dụ bổ sung 2: Tình huống liên môn kích hoạt tư duy phản biện."],
        layout: "Sơ đồ tư duy Mindmap đơn giản phân nhánh từ khoá chính",
        illustration: "Sơ đồ các đám mây tư duy liên kết nhiều màu sắc rực rỡ",
        searchKeyword: "mind map visual design vector graphic",
        animation: "Morph"
      },
      {
        title: "Hoạt động thảo luận nhóm lớn",
        desc: "Chia sẻ, lắng nghe và tổng hợp ý kiến giải pháp của các đội nhóm.",
        examples: ["Ví dụ thảo luận 1: Phân tích nhóm về chủ đề chính.", "Ví dụ thảo luận 2: Phản biện ý kiến và rút ra bài học chung."],
        layout: "Bố cục chia 4 phần tư bento grid cân đối",
        illustration: "Tranh vẽ các bạn nhỏ quây quần bên chiếc bàn tròn cùng thảo luận",
        searchKeyword: "group discussion kids cartoon illustration",
        animation: "Zoom"
      },
      {
        title: "Thực hành ứng dụng trực quan - Thử thách 2",
        desc: "Luyện tập kỹ năng thông qua phiếu học tập cá nhân và thi đua trên bảng.",
        examples: ["Ví dụ ứng dụng thực tế: Thiết kế hoặc viết nhanh ý kiến.", "Ví dụ thực tế bổ sung: Thuyết trình ngắn gọn trước lớp."],
        layout: "Bố cục danh sách Checklist có đánh dấu kiểm xanh ngọc",
        illustration: "Bảng kiểm đánh giá tiến độ rèn luyện học sinh thích thú",
        searchKeyword: "checklist checkmark checklist cartoon icon",
        animation: "Appear"
      },
      {
        title: "Ghi nhớ sư phạm quan trọng",
        desc: "Tóm gọn lại các ghi chú, công thức vàng cần học sinh ghi vào vở học đầy đủ.",
        examples: ["Ví dụ từ khóa vàng 1: Định nghĩa súc tích ghi nhớ.", "Ví dụ từ khóa vàng 2: Quy tắc ghi nhớ nhanh bằng thơ/mẹo."],
        layout: "Bố cục trích dẫn Quote nổi bật với dải lụa mềm mại phía dưới",
        illustration: "Bóng đèn phát sáng đại diện cho ý tưởng và kiến thức vàng",
        searchKeyword: "lightbulb idea smart concept vector cartoon",
        animation: "Fade"
      },
      {
        title: "Trò chơi củng cố kiến thức",
        desc: "Trò chơi tương tác giúp ôn tập toàn bộ kiến thức của phần lý thuyết đã học.",
        examples: ["Ví dụ trò chơi ôn tập: Đố vui trắc nghiệm nhanh.", "Ví dụ củng cố bổ sung: Ai nhanh ai đúng giành điểm tốt."],
        layout: "Bố cục ma trận ô chữ hoặc các mảnh ghép câu đố rực rỡ",
        illustration: "Chiếc rương kho báu vàng lấp lánh đang mở ra",
        searchKeyword: "treasure chest sparkling gold coins vector cartoon",
        animation: "Zoom"
      }
    ];

    mockContents.forEach((content, index) => {
      const sNum = 4 + index;
      slidesList.push({
        slideNumber: sNum,
        part: "Nội dung",
        title: `${content.title.toUpperCase()}`,
        points: [
          matchedDoc && matchedDoc.extractedText ? `Nội dung: ${content.title}. Bám sát giáo án chính thức.` : `Khám phá bài học sinh động "${finalTopic}".`,
          `Nội dung: ${content.desc}`,
          ...content.examples
        ],
        illustrationPrompt: "None",
        illustrationStyleBase: "None",
        speakingScript: `Các con ơi, bây giờ chúng mình bước vào phần quan trọng nhất của bài học. Hãy cùng Thầy/Cô nhìn lên màn hình và phân tích kỹ nội dung về ${content.title} để nắm rõ kiến thức nhé!`,
        activityLabel: "Thử thách trí tuệ",
        activityContent: `Giải quyết bài tập mẫu số ${index + 1} trong phiếu bài tập cá nhân của con trong vòng 2 phút.`,
        simulatedImage: "",
        objective: `Truyền đạt sâu sắc phần kiến thức số ${index + 1} bám sát phương pháp trực quan sinh động`,
        layout: content.layout,
        illustration: content.illustration,
        searchKeyword: content.searchKeyword,
        animation: content.animation
      });
    });

    // Part 3: Tổng kết bài học (2 slides)
    slidesList.push({
      slideNumber: 14,
      part: "Tổng kết",
      title: "TỔNG KẾT BÀI HỌC & GIAO BÀI VỀ NHÀ",
      points: [
        `Hôm nay chúng ta đã hoàn thành trọn vẹn bài dạy: "${finalTopic}".`,
        "Ôn lại các từ khóa cốt lõi ngay sau khi tan trường.",
        "Bài tập về nhà: Hoàn thành bài tập tuần, sưu tầm thêm ví dụ thực tế.",
        "Chuẩn bị trước bài học tiếp theo đầy hứng khởi."
      ],
      illustrationPrompt: "None",
      illustrationStyleBase: "None",
      speakingScript: `Tiết học của chúng ta ngày hôm nay đã khép lại rất thành công! Các con học tập vô cùng chăm chỉ. Thầy/Cô giao một vài bài tập nhỏ về nhà để chúng mình tự luyện tập nhé!`,
      activityLabel: "Cam kết rèn luyện",
      activityContent: "Đứng dậy đồng thanh hứa: 'Về nhà ôn bài - Tự giác rèn luyện - Chuẩn bị chu đáo!'",
      simulatedImage: "",
      objective: "Hệ thống hóa kiến thức toàn bài học và chuyển giao nhiệm vụ tự rèn luyện",
      layout: "Bố cục Timeline 3 chặng kết hợp cột nhắc nhở trực quan",
      illustration: "Hình vẽ ngôi nhà ấm áp bừng sáng biểu thị bài tập về nhà",
      searchKeyword: "warm sweet home cartoon illustration vector",
      animation: "Fade"
    });

    slidesList.push({
      slideNumber: 15,
      part: "Tổng kết",
      title: "CẢM ƠN CẢ LỚP & KẾT THÚC TIẾT HỌC",
      points: [
        "Chân thành cảm ơn tinh thần học tập hết mình của các con.",
        "Chúc các em học sinh luôn chăm ngoan, học giỏi mỗi ngày.",
        "Hẹn gặp lại các con trong những tiết học lý thú tiếp theo!",
        "EduAI luôn đồng hành cùng thành công học tập của các con!"
      ],
      illustrationPrompt: "None",
      illustrationStyleBase: "None",
      speakingScript: `Cảm ơn các con rất nhiều vì một buổi học tràn ngập tiếng cười và những câu trả lời xuất sắc! Thầy/Cô chúc các con luôn vui tươi và hẹn gặp lại các con vào tiết học ngày mai nhé!`,
      activityLabel: "Lời chào yêu thương",
      activityContent: "Tất cả học sinh vẫy tay chào thầy cô và nở một nụ cười thật tươi đón chào ngày mới.",
      simulatedImage: "",
      objective: "Gắn kết tình cảm thầy trò và lưu lại ấn tượng tích cực sau giờ học",
      layout: "Bố cục Slide kết thúc - Câu cảm ơn trung tâm trang nhã",
      illustration: "Vector khinh khí cầu mang biểu tượng trái tim rực rỡ bay cao",
      searchKeyword: "hot air balloon heart love thank you cartoon vector",
      animation: "Zoom"
    });

    return slidesList;
  };

  const currentAi = getAiClient(req);
  if (!currentAi) {
    return res.json(buildFallbackSlides());
  }

  try {
    const groundedInfo = `
TÀI LIỆU NGUỒN ĐÃ KHỚP TRONG KHO GIÁO ÁN:
- Tên tài liệu: "${matchedDoc.name}"
- Phân loại: ${matchedDoc.category}
- Môn học: ${matchedDoc.subject}
- Khối lớp: ${matchedDoc.grade}
- Tóm tắt học thuật AI: ${matchedDoc.aiSummary || matchedDoc.notes || ""}
- Chi tiết văn bản giáo án của bài học:
${matchedDoc.extractedText ? matchedDoc.extractedText.substring(0, 15000) : "Không có văn bản trích xuất."}

HÃY BÁM SÁT CÁC THÔNG TIN, HOẠT ĐỘNG, BÀI TẬP VÀ VÍ DỤ CỤ THỂ TRONG GIÁO ÁN TRÊN ĐỂ SOẠN SLIDE NHẰM ĐẢM BẢO TÍNH SƯ PHẠM VÀ CHÍNH XÁC TUYỆT ĐỐI!
`;

    const slideSamplesText = matchedSlideSamples.length > 0
      ? JSON.stringify(matchedSlideSamples, null, 2)
      : "Không tìm thấy mẫu slide phù hợp trong kho mẫu. Hãy vẫn giữ tư duy: mục tiêu bài học trước, tiến trình tiết dạy sau, mỗi slide là một nhiệm vụ sư phạm.";

    const prompt = `Bạn là một Chuyên gia Thiết kế PowerPoint với hơn 15 năm kinh nghiệm trong lĩnh vực giáo dục, đào tạo và thiết kế bài giảng. Bạn đồng thời là chuyên gia Instructional Design (Thiết kế học liệu), Presentation Design và Information Visualization.
Bạn không chỉ dựa vào tài liệu nguồn mà còn phải học theo các MẪU SLIDE CHUẨN trong kho mẫu nội bộ để giữ đúng tư duy sư phạm, cấu trúc tiết dạy và chất lượng đầu ra.
Nhiệm vụ của bạn không phải là sao chép nội dung từ Word sang PowerPoint, mà là chuyển đổi nội dung thành một bài trình chiếu trực quan, dễ hiểu, sinh động và hỗ trợ tối đa cho việc giảng dạy tiểu học Việt Nam bám sát Thông tư 27 của Bộ GD&ĐT.

---
# Triết lý thiết kế PowerPoint chuyên nghiệp:
- Một slide chỉ truyền tải một ý chính cực kỳ cô đọng.
- Slide hỗ trợ giáo viên giảng bài sinh động, không thay thế giáo viên hay lặp lại toàn văn bản.
- Ít chữ nhưng nhiều thông tin. Tuyệt đối không tạo slide chỉ toàn các đoạn văn dài lê thê.
- Hình ảnh và sơ đồ biểu diễn trực quan luôn được ưu tiên hơn diễn giải dài dòng.
- Đơn giản, trang nhã, chuyên nghiệp và có chiều sâu sư phạm vượt trội.

---
# Nguyên tắc biên soạn nội dung hiển thị ('points'):
- Không dùng đoạn văn dài. Tối đa 3 - 4 dòng ngắn cho một slide.
- Mỗi ý chính cực kỳ ngắn gọn (mục tiêu lý tưởng là không quá 6 từ mỗi dòng khi có thể).
- Thay vì chép cả câu văn, hãy cô đọng thành từ khóa cốt lõi, công thức vàng, quy trình từng bước, hoặc sơ đồ so sánh.

---
# Kho mẫu tham chiếu bắt buộc
Dưới đây là các MẪU SLIDE CHUẨN trong kho dữ liệu mẫu. Hãy học cách tổ chức tư duy, trình tự sư phạm, độ cô đọng nội dung, kiểu hoạt động và chất lượng trực quan từ các mẫu này. Không sao chép nguyên văn, mà phải biến đổi cho đúng bài học mới.
${slideSamplesText}

# Quy trình thiết kế & Cấu trúc nội dung slide
Bạn hãy thiết kế một bộ slide bài giảng chuẩn mực gồm đúng 15 slide đồng bộ bám sát tài liệu giáo án đã khớp:
${groundedInfo}

Yêu cầu bài slide bắt buộc phải đáp ứng đúng các tiêu chí sau đây:
1. ĐÚNG SỐ LƯỢNG VÀ CẤU TRÚC PHẦN (Đủ 15 slide):
   - Phần 1: Mở đầu (Slide 1 đến Slide 3): Giới thiệu sinh động, mục tiêu bài học cụ thể, hoạt động khởi động vui tươi (Warm-up).
   - Phần 2: Nội dung bài học (Slide 4 đến Slide 13 - Đúng 10 slide): Trọng tâm kiến thức lý thuyết, quy luật, ví dụ minh họa, bài tập mẫu, hoạt động rèn luyện thảo luận nhóm đôi/nhóm lớn bám sát nội dung và mạch tư duy của giáo án nguồn.
   - Phần 3: Tổng kết bài học (Slide 14 đến Slide 15 - Đúng 2 slide): Tổng hợp ghi nhớ vàng, dặn dò bài tập rèn luyện thực tiễn tại nhà, kết thúc và cảm ơn cả lớp học.

2. CÁC TRƯỜNG DỮ LIỆU BẮT BUỘC TRONG MỖI SLIDE (JSON):
   - slideNumber: Kiểu số nguyên từ 1 đến 15.
   - part: Chuỗi tương ứng ("Mở đầu" | "Nội dung" | "Tổng kết").
   - title: Tiêu đề slide bằng tiếng Việt ngắn gọn, ghi rõ đề mục chi tiết, có tính sư phạm khoa học (Ví dụ: "KHÁI NIỆM VỀ VÒNG TUẦN HOÀN", "BÀI TẬP MẪU: ĐẶT TÍNH RỒI TÍNH", "HOẠT ĐỘNG: THẢO LUẬN NHÓM ĐÔI").
   - objective: Mục tiêu sư phạm cụ thể mà riêng slide này hướng tới học sinh (Ví dụ: "Giúp học sinh phân biệt được trạng thái lỏng và khí của nước thông qua thực tế").
   - points: Mảng 3-4 chuỗi tiếng Việt chứa các ý chính trình chiếu. Các chuỗi này phải cực kỳ ngắn gọn, sắc bén, tinh lọc dưới dạng từ khóa sư phạm (Ví dụ: "• Trạng thái 1: Thể lỏng (nước mưa, sông hồ)", "• Trạng thái 2: Thể khí (hơi nước bốc lên)", "• Tác nhân kích hoạt: Nhiệt độ ánh nắng mặt trời").
   - layout: Đề xuất giải pháp bố cục trực quan hóa cụ thể phù hợp nhất cho nội dung slide đó, chọn từ các mẫu chuyên nghiệp: "Timeline", "Process Flow", "Comparison 2 cột", "Mindmap", "Pyramid", "Cycle Diagram", "Flowchart Diagram", "Table so sánh", "Matrix", "Infographic quy trình", "Checklist", "Quote nổi bật", "FAQ".
   - illustration: Đề xuất hình ảnh minh họa chi tiết, phù hợp tâm lý học sinh tiểu học (Ví dụ: "Hình vẽ phẳng vector minh hoạ chu trình bốc hơi nước và mây ngưng tụ tươi sáng", "Tranh hoạt hình các bạn học sinh ngồi thảo luận vui vẻ").
   - searchKeyword: Từ khóa tìm ảnh minh hoạ trên Unsplash/Shutterstock bằng tiếng Anh (Ví dụ: "water condensation cartoon vector", "children happy learning school cartoon").
   - animation: Hiệu ứng chuyển động sư phạm tinh tế (chọn giữa: "Appear", "Fade", "Morph", "Zoom").
   - illustrationPrompt: Luôn đặt cố định là "None".
   - illustrationStyleBase: Luôn đặt cố định là "None".
   - speakingScript: Kịch bản giảng bài chi tiết bằng tiếng Việt sư phạm ấm áp của giáo viên chủ nhiệm, xưng Cô/Thầy và các con, giải thích cặn kẽ ý chính và ví dụ thực tế liên quan đến lứa tuổi tiểu học, bám sát giáo án.
   - activityLabel: Tên trò chơi, thử thách rèn luyện hoặc hoạt động tương tác tại chỗ.
   - activityContent: Nội dung chi tiết câu đố, thi đua rèn luyện hoặc câu hỏi tương tác để khuấy động bầu không khí học tập.

Hãy trả về phản hồi dưới dạng mảng JSON chứa đúng 15 Slide đầy đủ các trường thông tin trên, tuyệt đối không có bất kỳ ký tự hay văn bản giải thích nào ngoài khối JSON.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            required: [
              "slideNumber", "part", "title", "points", "illustrationPrompt", "illustrationStyleBase", "speakingScript", "activityLabel", "activityContent",
              "objective", "layout", "illustration", "searchKeyword", "animation"
            ],
            properties: {
              slideNumber: { type: Type.INTEGER },
              part: { type: Type.STRING },
              title: { type: Type.STRING },
              points: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              illustrationPrompt: { type: Type.STRING },
              illustrationStyleBase: { type: Type.STRING },
              speakingScript: { type: Type.STRING },
              activityLabel: { type: Type.STRING },
              activityContent: { type: Type.STRING },
              objective: { type: Type.STRING },
              layout: { type: Type.STRING },
              illustration: { type: Type.STRING },
              searchKeyword: { type: Type.STRING },
              animation: { type: Type.STRING }
            }
          }
        }
      }
    }, currentAi);

    const parsed = JSON.parse(response.text || "[]");
    
    // Enrich with high-quality relevant initial Unsplash images
    const enriched = parsed.map((slide: any) => ({
      ...slide,
      simulatedImage: getRelevantImageUrl(finalSubject, slide.title, slide.points)
    }));
    
    res.json(enriched);

  } catch (error: any) {
    console.warn("Gemini API error (falling back to local slide generator): ", error.message || error);
    res.json(buildFallbackSlides());
  }
});


/**
 * 2b. AI REAL-TIME IMAGE GENERATION
 * Generates an educational slide illustration from a prompt using gemini-2.5-flash-image
 */
app.post("/api/gemini/generate-image", async (req, res): Promise<any> => {
  const { prompt, aspectRatio = "16:9" } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Vui lòng cung cấp câu lệnh để sinh ảnh minh họa." });
  }

  const buildFallbackImage = () => {
    // Generate a high quality fallback image using beautiful, relevant Unsplash seeds
    const cleanPrompt = prompt.split(",")[0] || "primary school cartoon illustration";
    const randId = Math.floor(Math.random() * 200) + 1;
    return {
      imageUrl: `https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80&sig=${randId}`,
      success: true,
      isFallback: true
    };
  };

  const currentAi = getAiClient(req);
  if (!currentAi) {
    return res.json(buildFallbackImage());
  }

  try {
    const response = await currentAi.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio === "16:9" ? "16:9" : "4:3"
        }
      }
    });

    let base64Image = "";
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          break;
        }
      }
    }

    if (base64Image) {
      return res.json({
        imageUrl: `data:image/png;base64,${base64Image}`,
        success: true
      });
    } else {
      return res.json(buildFallbackImage());
    }

  } catch (error: any) {
    console.error("Error generating image with Gemini: ", error);
    return res.json(buildFallbackImage());
  }
});

/**
 * 3. AI NHẬN XÉT HỌC BẠ (Report Remarks AI with 3-step praise, suggestions, encouragement & word guards!)
 */
app.post("/api/gemini/comment", async (req, res): Promise<any> => {
  const { studentName, praise, feedback, encouragement } = req.body;

  if (!praise || !feedback || !encouragement) {
    return res.status(400).json({ error: "Vui lòng nhập đầy đủ các ý định khen ngợi, góp ý để AI nhận xét." });
  }

  const prompt = `Bạn là một giáo viên chủ nhiệm có trí tuệ cảm xúc tinh tế tại trường tiểu học Việt Nam. Hãy soạn một lời nhận xét học bạ cuối tuần/cuối kỳ chuẩn mực theo thông tư 27 cho học sinh tên là "${studentName || "học sinh"}".
  
Bắt buộc tuân thủ bộ Quy tắc Ứng xử Sư phạm Văn minh Tiểu học sau đây:
1. Thực hiện nghiêm ngặt Framework 3 bước:
   - Bước 1: Khen ngợi (Đánh giá cao mặt tốt, nỗ lực nổi bật của em)
   - Bước 2: Góp ý thiết thực (Chỉ ra điểm cần cải thiện một cách khéo léo, mang tính xây dựng)
   - Bước 3: Khích lệ nhiệt thành (Bày tỏ niềm tin tưởng lớn em sẽ tiến bộ trong tương lai)
2. KIỂM SOÁT CHẤT LƯỢNG NGÔN NGỮ CỰC KỲ KHẮT KHE:
   - Bạn TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP dùng các từ mang tính nhãn ép tiêu cực: "lười", "kém", "chậm hiểu", "yếu".
   - Nếu có ý kiến đánh giá học lực còn kém, phải viết thay bằng cụm từ giảm nhẹ động viên đại loại như: "cần thêm thời gian rèn luyện", "đang trong quá trình hoàn thiện năng lực", "còn gặp đôi chút thử thách cần động viên".
   
Vui lòng trả về phản hôi dưới dạng JSON có cấu trúc để hiển thị:
- rawComment (bản nháp thô ban đầu)
- cleanedComment (bản hoàn chỉnh trau chuốt sư phạm không có từ cấm, cực kỳ ấm áp mang lại tự tin cho gia đình học sinh)
- wordGuardViolations (mảng lưu các từ xấu đã kiểm tra lọc bỏ nếu có)
- hasBeenCleaned (true nếu đã được chọn từ khéo léo)
- stepComments: { praise: "đoạn khen ngợi", feedback: "đoạn góp ý giảm nhẹ", encouragement: "đoạn động viên" }

Ý định giáo viên đưa vào:
- Khen: "${praise}"
- Góp ý: "${feedback}"
- Khích lệ: "${encouragement}"`;

  const currentAi = getAiClient(req);
  if (!currentAi) {
    return res.json(generateLocalComment(studentName, praise, feedback, encouragement));
  }

  try {
    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["rawComment", "cleanedComment", "wordGuardViolations", "hasBeenCleaned", "stepComments"],
          properties: {
            rawComment: { type: Type.STRING },
            cleanedComment: { type: Type.STRING },
            wordGuardViolations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            hasBeenCleaned: { type: Type.BOOLEAN },
            stepComments: {
              type: Type.OBJECT,
              required: ["praise", "feedback", "encouragement"],
              properties: {
                praise: { type: Type.STRING },
                feedback: { type: Type.STRING },
                encouragement: { type: Type.STRING }
              }
            }
          }
        }
      }
    }, currentAi);

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);

  } catch (error: any) {
    console.warn("Error generating remark, using local fallback: ", error);
    res.json(generateLocalComment(studentName, praise, feedback, encouragement));
  }
});

/**
 * 4. AI PHỤ HUYNH (Sandwich Principle parent composer for emotional intelligence)
 */
app.post("/api/gemini/parent", async (req, res): Promise<any> => {
  const { studentName, behaviorSummary } = req.body;

  if (!studentName || !behaviorSummary) {
    return res.status(400).json({ error: "Thiếu thông tin học sinh để soạn thư gửi phụ huynh." });
  }

  const prompt = `Bạn là một Trợ lý AI Giáo viên Chủ Nhiệm khéo léo, thiết lập kết nối chặt chẽ và truyền năng lượng tích cực cho phụ huynh học sinh. Viết tin nhắn Zalo ngắn gọn gửi gia đình em học sinh tên là "${studentName}".
  
Hãy thực hiện đúng Nguyên tắc Sandwich tinh tế bậc nhất:
- Lớp 1 (Khen): Nhìn nhận một hành động tích cực gần đây hay điểm đáng khen lấp lánh của con.
- Lớp 2 (Góp ý): Nêu ra một vài khó khăn nhỏ/nhược điểm cần cùng gia đình bổ khuyết tuần này một cách khách quan không trách cứ, dựa vào tóm tắt hành vi: "${behaviorSummary}".
- Lớp 3 (Khích lệ): Lên phương án cả lớp, giáo viên và ba mẹ cùng đồng hành để giúp con phát huy tốt vào tuần sau.

Thư gửi ngắn khoảng 100 chữ, hành văn lịch sự, xưng hô 'GV chủ nhiệm lớp' và 'Gia đình/Bố mẹ'.`;

  const currentAi = getAiClient(req);
  if (!currentAi) {
    return res.json(generateLocalParentMemo(studentName, behaviorSummary));
  }

  try {
    const response = await generateContentWithFallback({
      contents: prompt,
    }, currentAi);

    res.json({ content: response.text });
  } catch (error: any) {
    console.warn("Error generating parent memo, using local fallback: ", error);
    res.json(generateLocalParentMemo(studentName, behaviorSummary));
  }
});

/**
 * 5. AI DỰ BÁO HỌC TẬP (Estimates risks + issues personalized intervention plans!)
 */
function generateLocalForecast(studentName: string, circular27Grades: any, subjectGrades: any, attendance: any) {
  const grades = circular27Grades || [2, 2, 2, 2];
  const circularAvg = grades.reduce((a: number, b: number) => a + b, 0) / grades.length; // 1 to 3
  
  const scores = Object.values(subjectGrades || { "Toán": 8, "Tiếng Việt": 8 }) as number[];
  const subjectsAvg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 8.0; // 1 to 10
  
  // Higher risk if scores are low
  let calcScore = 50; // start neutral
  
  // Impact of subject average (1 to 10)
  if (subjectsAvg >= 8.5) {
    calcScore -= 35; // very low risk
  } else if (subjectsAvg >= 7.0) {
    calcScore -= 15; // low/normal risk
  } else if (subjectsAvg <= 5.0) {
    calcScore += 35; // extremely high risk of falling behind
  } else {
    calcScore += 10; // moderate risk
  }
  
  // Impact of circular 27 average (1 to 3)
  if (circularAvg >= 2.6) {
    calcScore -= 15;
  } else if (circularAvg <= 1.5) {
    calcScore += 15;
  }
  
  calcScore = Math.max(5, Math.min(95, Math.round(calcScore)));
  
  return {
    riskScore: calcScore,
    summary: `Dựa trên phân tích xu hướng học tập thực tế, học sinh ${studentName} có điểm trung bình kiểm tra đạt ${subjectsAvg.toFixed(1)}/10. Hệ thống đề xuất tiếp tục theo sát đà tiến bộ và củng cố các lỗ hổng kiến thức để nâng cao hiệu quả học tập.`,
    keyIssues: [
      subjectsAvg <= 6.5 ? `Điểm số một số môn cốt lõi đang nằm ở ngưỡng cần bồi dưỡng (${subjectsAvg.toFixed(1)}/10).` : "Học lực các môn khá tốt, cần tăng cường ôn luyện nâng cao để đạt điểm 9, 10.",
      circularAvg <= 1.8 ? "Đánh giá năng lực tuần đôi khi còn Chưa hoàn thành (CHT)." : "Cần rèn luyện tính cẩn thận và thói quen soát bài trước khi nộp."
    ],
    actions: {
      school: [
        "Tập trung phụ đạo các chuyên đề kiến thức chưa vững ngay trong giờ tự học ở trường.",
        "Giao thêm các bài tập tự luyện bổ trợ vừa sức giúp củng cố lý thuyết căn bản môn học.",
        "Khích lệ tinh thần để học sinh tự tin phát biểu, giải đáp bài tập trước lớp học."
      ],
      family: [
        "Cùng con ôn tập lại các lý thuyết và bài tập kiểm tra bị điểm chưa tốt.",
        "Thiết lập lịch tự học buổi tối từ 30-45 phút tập trung cao độ vào rèn luyện môn Toán và Tiếng Việt.",
        "Sử dụng các phương pháp học tập sinh động, sơ đồ tư duy để rèn luyện thói quen tự học."
      ]
    }
  };
}

app.post("/api/gemini/forecast", async (req, res): Promise<any> => {
  const { studentName, circular27Grades, subjectGrades, attendance } = req.body;

  if (!studentName) {
    return res.status(400).json({ error: "Thiếu thông tin học sinh để tính toán cảnh báo học tập." });
  }

  const prompt = `Bạn là AI Phân tích xu hướng học tập tiểu học chuẩn sư phạm Việt Nam. Hãy thực hiện dự báo nguy cơ học lực của học sinh "${studentName}" dựa trên các điểm số trực tiếp sau:
- Đánh giá năng lực tuần (Thông tư 27): ${JSON.stringify(circular27Grades)} (trong đó 1=CHT - Chưa hoàn thành, 2=HT - Hoàn thành, 3=HTT - Hoàn thành tốt).
- Điểm kiểm tra các môn học hiện tại (tháng này):
${Object.entries(subjectGrades || {}).map(([sub, score]) => `  + Môn ${sub}: ${score}/10 điểm`).join("\n")}
- Chuyên cần thực tế (để xem xét nhịp sinh học): nghỉ học ${attendance?.absentDays || 0} ngày, đi trễ ${attendance?.lateDays || 0} ngày.

Yêu cầu cực kỳ quan trọng:
1. Đánh giá tính toán phần trăm dự báo rủi ro sa sút học lực trong tháng tới (riskScore từ 0 đến 100%). CHỈ CĂN CỨ VÀO ĐIỂM SỐ TRỰC TIẾP và năng lực học tập này. KHÔNG căn cứ hay suy diễn từ hành vi quên bài tập, mất trật tự hay không làm bài.
   - Điểm số thấp (dưới 5 đối với môn học, hoặc nhiều CHT tuần) hoặc dốc sụt giảm sẽ làm nguy cơ rủi ro rất cao (riskScore > 70%).
   - Điểm số cao ổn định (môn học 8-10, tuần HTT) sẽ làm nguy cơ rủi ro cực thấp (riskScore < 20%).
2. Đưa ra nhận định sư phạm tóm tắt sâu sắc về học lực (summary).
3. Đưa ra danh sách các vấn đề khó khăn về mặt kiến thức môn học đáng lo ngại (keyIssues).
4. Thiết lập chương trình can thiệp hỗ trợ lấy lại thăng bằng kiến thức phối hợp giữa Nhà trường & Gia đình (school và family).

Trả về một JSON có cấu trúc sau:
- riskScore: (số nguyên %, ví dụ từ 0 đến 100)
- summary: (tóm tắt phân tích bằng ngôn ngữ sư phạm)
- keyIssues: (mảng các vấn đề đáng lo ngại nhất về kiến thức/môn học của em học sinh này)
- actions: { school: ["giải pháp kèm cặp củng cố kiến thức của giáo viên ở lớp"], family: ["phương pháp đồng hành tự học củng cố của phụ huynh ở nhà"] }`;

  const currentAi = getAiClient(req);
  if (!currentAi) {
    const fallback = generateLocalForecast(studentName, circular27Grades, subjectGrades, attendance);
    return res.json(fallback);
  }

  try {
    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["riskScore", "summary", "keyIssues", "actions"],
          properties: {
            riskScore: { type: Type.INTEGER },
            summary: { type: Type.STRING },
            keyIssues: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            actions: {
              type: Type.OBJECT,
              required: ["school", "family"],
              properties: {
                school: { type: Type.ARRAY, items: { type: Type.STRING } },
                family: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          }
        }
      }
    }, currentAi);

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);

  } catch (error: any) {
    console.warn("AI Model failed or quota exceeded, falling back to local pedagogical rules engine: ", error.message);
    const fallback = generateLocalForecast(studentName, circular27Grades, subjectGrades, attendance);
    res.json(fallback);
  }
});


// -------------------------------------------------------------
// SEED INITIAL STUDENT LIST - Loaded dynamically from production-grade DB Service
// -------------------------------------------------------------

/**
 * 8. AI TEST GENERATOR (Tạo đề kiểm tra chất lượng từ Giáo án và Tài liệu tham khảo)
 */
app.post("/api/gemini/generate-test", async (req, res): Promise<any> => {
  const { grade, subject, scope, difficulty = "vừa", numMultipleChoice = 5, numEssay = 2, documentsContext = "" } = req.body;

  if (!grade || !subject || !scope) {
    return res.status(400).json({ error: "Thiếu thông tin lớp học, môn học hoặc phạm vi kiến thức bắt buộc." });
  }

  const matchedTestSamples = selectTestSamples({
    grade,
    subject,
    scope,
    difficulty
  });

  const currentAi = getAiClient(req);
  if (!currentAi) {
    return res.json(generateLocalTest(grade, subject, scope, difficulty, numMultipleChoice, numEssay));
  }

  // Active AI generation prompt flow
  try {
    const testSamplesText = matchedTestSamples.length > 0
      ? JSON.stringify(matchedTestSamples, null, 2)
      : "Không tìm thấy mẫu đề phù hợp trong kho mẫu. Hãy vẫn giữ tư duy: lập ma trận trước khi viết câu hỏi, phân bố mức độ nhận thức, đảm bảo ngôn ngữ trong sáng và thời lượng hợp lý.";

    const prompt = `Bạn là một chuyên gia khảo thí, kiểm định chất lượng và biên soạn đề kiểm tra cấp tiểu học Việt Nam có chuyên môn cao xuất sắc.
Bạn không chỉ dựa vào tài liệu nội dung mà còn phải tham chiếu KHO ĐỀ MẪU nội bộ để học cách phân bố độ khó, kiểu câu hỏi, tư duy ma trận đề và chất lượng hướng dẫn chấm.
Hãy thiết kế một đề kiểm tra chuẩn hóa chất lượng bám sát tiến độ học tập sư phạm dựa trên các tiêu chí sau:
- Khối lớp: ${grade}
- Môn học: ${subject}
- Phạm vi kiến thức đến thời điểm hiện tại: "${scope}"
- Mức độ khó chủ đạo: Mức "${difficulty}" (Dễ, Vừa hoặc Nâng cao)
- Số lượng câu hỏi trắc nghiệm khách quan: ${numMultipleChoice} câu (mỗi câu 0.5 điểm)
- Số lượng câu hỏi tự luận: ${numEssay} câu

CƠ SỞ DỮ LIỆU THAM KHẢO CHÍNH (Chiết xuất từ giáo án giảng dạy thực tế và tư liệu kho học liệu của giáo viên):
${documentsContext || "Không có tài liệu tham khảo cụ thể. Hãy tự thiết kế nội dung bám sát khung chương trình giáo dục phổ thông tiểu học mới của Bộ Giáo dục và Đào tạo Việt Nam đối với môn học và lớp tương ứng."}

KHO MẪU THAM CHIẾU BẮT BUỘC:
${testSamplesText}

YÊU CẦU THIẾT KẾ ĐỀ THI:
1. ĐỘ KHÓ TĂNG DẦN BẮT BUỘC: Đề thi phải được thiết kế có độ khó tăng dần rõ rệt từ câu đầu tiên đến câu cuối cùng. Phần trắc nghiệm đi từ nhận biết đơn giản nhất đến thông hiểu và vận dụng. Phần tự luận đi từ bài toán/câu hỏi cơ bản đến bài toán tổng hợp, phân hóa học sinh khá giỏi ở câu cuối.
2. CHUẨN SƯ PHẠM TIỂU HỌC VIỆT NAM: Ngôn ngữ câu hỏi phải trong sáng, tường minh, ngắn gọn, phù hợp với tâm sinh lý lứa tuổi tiểu học. Tuyệt đối không chứa lỗi chính tả, không dùng thuật ngữ quá cao siêu.
3. cấu trúc trắc nghiệm: Mỗi câu hỏi trắc nghiệm có đúng 4 phương án lựa chọn (A, B, C, D) và có một đáp án đúng duy nhất. Có giải thích (explanation) súc tích lý do tại sao phương án đó đúng.
4. CẤU TRÚC TỰ LUẬN: Mỗi câu tự luận phải đi kèm đáp án giải mẫu chi tiết (sampleSolution) và hướng dẫn chấm theo biểu điểm cụ thể (gradingGuide). Gán điểm số (score) hợp lý cho mỗi câu tự luận sao cho: (Số câu trắc nghiệm * 0.5) + Tổng điểm tự luận = đúng 10.0 điểm.
5. CHÍNH XÁC NỘI DUNG: Bám sát các thông tin từ phần cơ sở dữ liệu tham khảo của giáo viên được cung cấp ở trên (nếu có) để tạo câu hỏi sát với bài học thực tế trên lớp hằng tuần.

Hãy trả về phản hồi dưới dạng định dạng JSON có cấu trúc chính xác tuyệt đối theo schema quy định dưới đây. Chú ý ngôn ngữ phản hồi bắt buộc là tiếng Việt thuần túy.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["testTitle", "grade", "subject", "difficulty", "duration", "multipleChoiceQuestions", "essayQuestions"],
          properties: {
            testTitle: { type: Type.STRING },
            grade: { type: Type.STRING },
            subject: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            duration: { type: Type.STRING },
            multipleChoiceQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "question", "options", "correctAnswer", "explanation"],
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.OBJECT,
                    required: ["A", "B", "C", "D"],
                    properties: {
                      A: { type: Type.STRING },
                      B: { type: Type.STRING },
                      C: { type: Type.STRING },
                      D: { type: Type.STRING }
                    }
                  },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                }
              }
            },
            essayQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "question", "sampleSolution", "gradingGuide", "score"],
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  sampleSolution: { type: Type.STRING },
                  gradingGuide: { type: Type.STRING },
                  score: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      }
    }, currentAi);

    const resultText = response.text || "{}";
    const parsed = JSON.parse(resultText);
    parsed.isFallback = false;
    res.json(parsed);

  } catch (error: any) {
    console.warn("Error generating test, using local fallback: ", error.message || error);
    res.json(generateLocalTest(grade, subject, scope, difficulty, numMultipleChoice, numEssay));
  }
});

// -------------------------------------------------------------
// SỔ ĐẦU BÀI DATABASE - Loaded dynamically from production-grade DB Service
// -------------------------------------------------------------
const students = Database.getStudents();
const classJournals = Database.getJournals();

// AI Analyze Teacher Comment
app.post("/api/gemini/analyze-journal", async (req, res): Promise<any> => {
  const { date, lessonNumber, subject, lessonTopic, teacherComment, classCode } = req.body;
  if (!teacherComment) {
    return res.status(400).json({ error: "Vui lòng nhập nhận xét của giáo viên để phân tích." });
  }

  // Dynamically load fresh student list
  const currentStudents = Database.getStudents() || [];
  const activeStudents = classCode 
    ? currentStudents.filter(s => s.schoolClass === classCode)
    : currentStudents;

  const studentNamesList = activeStudents.map(s => ({ id: s.id, name: s.name }));

  const prompt = `Bạn là một trợ lý AI phân tích Sổ Đầu Bài lớp học Tiểu học Việt Nam.
Giáo viên ghi nhận xét thô như sau cho tiết học:
"${teacherComment}"

Môn học đề xuất hoặc tự chọn: ${subject || "Chưa rõ"}
Bài học: ${lessonTopic || "Chưa rõ"}
Tiết: ${lessonNumber || 1}
Ngày: ${date || "Chưa rõ"}

Danh sách học sinh trong lớp:
${JSON.stringify(studentNamesList, null, 2)}

Hãy phân tích lời nhận xét thô này để đưa ra các thông tin sau:
1. "subject": Tên môn học chính xác của tiết dạy. Nếu môn học là "Chưa rõ" hoặc chưa được định nghĩa chính xác, hãy tự động nhận diện môn học dựa trên nội dung bài dạy hoặc lời nhận xét (ví dụ: "Ôn tập phép cộng" -> "Toán", "Luyện từ và câu" hoặc "tả cảnh" -> "Tiếng Việt", "English" hoặc "vocab" -> "Tiếng Anh", "đá cầu" -> "Thể chất", còn lại nếu không rõ hãy chọn môn "Sinh hoạt"). Trả về một chuỗi ngắn chứa tên môn học (ví dụ: "Toán", "Tiếng Việt", "Tiếng Anh", "Khoa học", "Lịch sử & Địa lý", "Tin học", "Đạo đức", "Mỹ thuật", "Âm nhạc", "Thể chất", "Sinh hoạt").
2. "evaluation": Đánh giá tổng quát về tiết học bằng văn phong sư phạm chính thức, lịch sự, trang trọng (ví dụ: "Tiết học diễn ra sôi nổi, học sinh hăng hái phát biểu xây dựng bài, tuy nhiên một số em còn nói chuyện riêng.").
3. "orderliness": Xếp loại nề nếp/trật tự lớp học (Chỉ chọn 1 trong 4 xếp loại: "Tốt", "Khá", "Trung bình", "Yếu").
4. "studentPraise": Danh sách học sinh được khen ngợi hoặc tuyên dương. Với mỗi em, tìm đúng tên trong danh sách lớp và trả về:
   - "studentName": Tên đầy đủ tìm được (hoặc tên trùng khớp trong danh sách lớp).
   - "note": Lý do khen ngợi (ví dụ: "Hăng hái phát biểu bài, giải toán nhanh").
5. "studentInfractions": Danh sách học sinh vi phạm hoặc bị nhắc nhở lỗi. Với mỗi em, tìm đúng tên trong danh sách lớp và trả về:
   - "studentName": Tên đầy đủ tìm được (hoặc tên trùng khớp trong danh sách lớp).
   - "note": Lý do vi phạm/nhắc nhở (ví dụ: "Nói chuyện riêng bị nhắc nhở").

Yêu cầu trả về định dạng JSON chính xác theo Schema dưới đây.`;

  const buildLocalFallback = () => {
    const praise: any[] = [];
    const infractions: any[] = [];
    let orderliness: "Tốt" | "Khá" | "Trung bình" | "Yếu" = "Tốt";
    let evaluation = "Tiết học hoàn thành tốt mục tiêu đề ra, học sinh nắm vững kiến thức.";
    let detectedSubject = subject || "Sinh hoạt";

    const textLower = (teacherComment + " " + (lessonTopic || "")).toLowerCase();
    if (textLower.includes("toán") || textLower.includes("phép cộng") || textLower.includes("phép nhân") || textLower.includes("chia") || textLower.includes("hình học")) {
      detectedSubject = "Toán";
    } else if (textLower.includes("tiếng việt") || textLower.includes("tập làm văn") || textLower.includes("chính tả") || textLower.includes("luyện từ") || textLower.includes("đọc")) {
      detectedSubject = "Tiếng Việt";
    } else if (textLower.includes("anh") || textLower.includes("english")) {
      detectedSubject = "Tiếng Anh";
    }

    activeStudents.forEach(s => {
      const nameParts = s.name.toLowerCase().split(" ");
      const lastName = nameParts[nameParts.length - 1];

      const hasName = textLower.includes(s.name.toLowerCase()) || textLower.includes(lastName);
      if (hasName) {
        const isPraise = /khen|tuyên dương|tốt|hăng hái|phát biểu|đúng|giỏi|xuất sắc|ngoan/i.test(textLower);
        const isInfraction = /phạt|nhắc nhở|nói chuyện|lười|chưa làm|quên|đi muộn|nghịch/i.test(textLower);

        if (isInfraction) {
          infractions.push({
            studentId: s.id,
            studentName: s.name,
            note: "Chưa tập trung trong giờ học hoặc vi phạm lỗi nề nếp"
          });
          orderliness = "Khá";
        } else if (isPraise || !isInfraction) {
          praise.push({
            studentId: s.id,
            studentName: s.name,
            note: "Có đóng góp tích cực cho tiết học, phát biểu bài tốt"
          });
        }
      }
    });

    if (infractions.length > 1) {
      orderliness = "Trung bình";
      evaluation = "Tiết học diễn ra cơ bản hoàn thành nội dung, tuy nhiên nề nếp lớp học chưa nghiêm túc, còn một vài học sinh nói chuyện riêng.";
    }

    return {
      subject: detectedSubject,
      evaluation,
      orderliness,
      studentPraise: praise,
      studentInfractions: infractions
    };
  };

  const currentAi = getAiClient(req);
  if (!currentAi) {
    const fallback = buildLocalFallback();
    return res.json(fallback);
  }

  try {
    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["subject", "evaluation", "orderliness", "studentPraise", "studentInfractions"],
          properties: {
            subject: { type: Type.STRING },
            evaluation: { type: Type.STRING },
            orderliness: { type: Type.STRING },
            studentPraise: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["studentName", "note"],
                properties: {
                  studentName: { type: Type.STRING },
                  note: { type: Type.STRING }
                }
              }
            },
            studentInfractions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["studentName", "note"],
                properties: {
                  studentName: { type: Type.STRING },
                  note: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    }, currentAi);

    const parsed = JSON.parse(response.text || "{}");
    
    const mapStudent = (nameFromAi: string) => {
      if (!nameFromAi) return null;
      const cleanAiName = nameFromAi.toLowerCase().trim();
      
      let match = activeStudents.find(s => s.name.toLowerCase() === cleanAiName);
      if (match) return match;

      match = activeStudents.find(s => s.name.toLowerCase().includes(cleanAiName) || cleanAiName.includes(s.name.toLowerCase()));
      if (match) return match;

      const aiLastName = cleanAiName.split(" ").pop() || "";
      if (aiLastName.length > 1) {
        match = activeStudents.find(s => {
          const sLastName = s.name.toLowerCase().split(" ").pop() || "";
          return sLastName === aiLastName;
        });
        if (match) return match;
      }
      return null;
    };

    if (parsed.studentPraise && Array.isArray(parsed.studentPraise)) {
      parsed.studentPraise = parsed.studentPraise.map((item: any) => {
        const student = mapStudent(item.studentName);
        return {
          ...item,
          studentId: student ? student.id : undefined,
          studentName: student ? student.name : item.studentName
        };
      });
    }

    if (parsed.studentInfractions && Array.isArray(parsed.studentInfractions)) {
      parsed.studentInfractions = parsed.studentInfractions.map((item: any) => {
        const student = mapStudent(item.studentName);
        return {
          ...item,
          studentId: student ? student.id : undefined,
          studentName: student ? student.name : item.studentName
        };
      });
    }

    res.json(parsed);

  } catch (error: any) {
    console.error("Error in AI Journal Analysis: ", error);
    res.json(buildLocalFallback());
  }
});

app.post("/api/gemini/test-key", async (req, res): Promise<any> => {
  const currentAi = getAiClient(req);
  if (!currentAi) {
    return res.status(400).json({ success: false, error: "Không tìm thấy cấu hình API Key. Thầy cô vui lòng nhập khóa API." });
  }

  try {
    const response = await currentAi.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Chỉ phản hồi đúng duy nhất chữ 'OK' để xác thực kết nối hệ thống. Không kèm theo ký tự khác.",
    });
    const text = response.text || "";
    if (text.includes("OK") || text.trim().length > 0) {
      return res.json({ success: true, message: "Kết nối thành công! API Key của thầy cô đang hoạt động ổn định và chính xác." });
    }
    return res.json({ success: false, error: "Hệ thống nhận được phản hồi không khớp từ AI. Hãy thử lại." });
  } catch (error: any) {
    console.error("Test API key failed:", error);
    const friendlyError = formatGeminiError(error);
    return res.status(500).json({ success: false, error: friendlyError });
  }
});

// Register Global Error-Handling Middleware (last in Express queue)
app.use(globalErrorHandler);

// -------------------------------------------------------------
// MERGED FE + BE SERVER STARTUP
// -------------------------------------------------------------

async function setupFrontend() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: "spa",
    });

    app.use(vite.middlewares);

    app.use("*", async (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: "API endpoint không tồn tại." });
      }

      try {
        const indexPath = path.resolve(process.cwd(), "index.html");
        let template = await fs.promises.readFile(indexPath, "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (error) {
        vite.ssrFixStacktrace(error as Error);
        next(error);
      }
    });

    return;
  }

  const distPath = path.resolve(process.cwd(), "dist");
  const indexPath = path.join(distPath, "index.html");

  app.use(express.static(distPath));

  app.use("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "API endpoint không tồn tại." });
    }
    res.sendFile(indexPath);
  });
}

let setupFrontendPromise: Promise<void> | null = null;

function ensureFrontendSetup(): Promise<void> {
  if (!setupFrontendPromise) {
    setupFrontendPromise = setupFrontend();
  }
  return setupFrontendPromise;
}


export default app;
export { app };

async function startServer() {
  await ensureFrontendSetup();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EduAI: Merged FE + BE running on http://localhost:${PORT}`);
  });
}

if (!isVercel) {
  startServer().catch((error) => {
    console.error("Failed to start merged server:", error);
    process.exit(1);
  });
}
