import { Router, Response } from "express";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.ts";
import { Logger } from "../middleware/logger.ts";
import { R2Storage } from "../services/r2Storage.ts";
import { Database } from "../services/db.ts";

const router = Router();

function sanitizeFolderName(name: string): string {
  if (!name) return "giaovien";
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .trim();
}

type DriveScanItem = {
  id: string;
  name: string;
  link: string;
  kind: "file" | "folder";
  extension: string;
  mimeType?: string;
  sizeLabel?: string;
};

const GOOGLE_HOSTS = ["drive.google.com", "docs.google.com"];

function inferContentType(fileName: string): string {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".docm")) return "application/vnd.ms-word.document.macroEnabled.12";
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
  if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (lower.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
  if (lower.endsWith(".pptx")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (lower.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (lower.endsWith(".json")) return "application/json; charset=utf-8";
  if (lower.endsWith(".csv")) return "text/csv; charset=utf-8";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";

  return "application/octet-stream";
}

function isGoogleDriveLikeUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return GOOGLE_HOSTS.some((host) => parsed.hostname.includes(host));
  } catch {
    return false;
  }
}

function extractDriveResource(inputUrl: string): { type: "folder" | "file"; id: string } | null {
  try {
    const parsed = new URL(inputUrl);

    const folderMatch = parsed.pathname.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch?.[1]) {
      return { type: "folder", id: folderMatch[1] };
    }

    const fileMatch = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch?.[1]) {
      return { type: "file", id: fileMatch[1] };
    }

    const documentMatch = parsed.pathname.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (documentMatch?.[1]) {
      return { type: "file", id: documentMatch[1] };
    }

    const spreadsheetMatch = parsed.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (spreadsheetMatch?.[1]) {
      return { type: "file", id: spreadsheetMatch[1] };
    }

    const presentationMatch = parsed.pathname.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (presentationMatch?.[1]) {
      return { type: "file", id: presentationMatch[1] };
    }

    const formMatch = parsed.pathname.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
    if (formMatch?.[1]) {
      return { type: "file", id: formMatch[1] };
    }

    const queryId = parsed.searchParams.get("id");
    if (queryId) {
      const inferredType = parsed.pathname.includes("/folders/") ? "folder" : "file";
      return { type: inferredType, id: queryId };
    }

    return null;
  } catch {
    return null;
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/&#39;/g, "'")
    .replace(/"/g, '"')
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">");
}

function stripHtml(value: string): string {
  return decodeHtml(value).replace(/<[^>]*>/g, "").trim();
}

function inferExtension(name: string, mimeType?: string): string {
  const lowerName = name.toLowerCase();

  const dotIndex = lowerName.lastIndexOf(".");
  if (dotIndex !== -1) {
    return lowerName.slice(dotIndex);
  }

  if (!mimeType) return "";

  if (mimeType.includes("document")) return ".gdoc";
  if (mimeType.includes("spreadsheet")) return ".gsheet";
  if (mimeType.includes("presentation")) return ".gslides";
  if (mimeType.includes("form")) return ".gform";
  if (mimeType.includes("pdf")) return ".pdf";
  if (mimeType.includes("image/")) return ".img";
  if (mimeType.includes("video/")) return ".video";

  return "";
}

function inferMimeTypeFromLink(link: string): string | undefined {
  if (link.includes("/document/")) return "application/vnd.google-apps.document";
  if (link.includes("/spreadsheets/")) return "application/vnd.google-apps.spreadsheet";
  if (link.includes("/presentation/")) return "application/vnd.google-apps.presentation";
  if (link.includes("/forms/")) return "application/vnd.google-apps.form";
  return undefined;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "EduAI-DriveScanner/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Không thể truy cập tài nguyên Drive công khai (${response.status}).`);
  }

  return response.text();
}

function parseMetaContent(html: string, property: string): string {
  const regex = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i");
  const match = html.match(regex);
  return match?.[1] ? decodeHtml(match[1]).trim() : "";
}

function parseTitle(html: string): string {
  const ogTitle = parseMetaContent(html, "og:title");
  if (ogTitle) return ogTitle;

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch?.[1]) return "Google Drive Item";

  return stripHtml(titleMatch[1])
    .replace(/\s*-\s*Google Drive\s*$/i, "")
    .replace(/\s*-\s*Google Docs\s*$/i, "")
    .replace(/\s*-\s*Google Sheets\s*$/i, "")
    .replace(/\s*-\s*Google Slides\s*$/i, "")
    .trim();
}

function parseFolderEntriesFromEmbeddedView(html: string): DriveScanItem[] {
  const results: DriveScanItem[] = [];
  const seen = new Set<string>();

  const anchorRegex = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorRegex.exec(html)) !== null) {
    const href = decodeHtml(match[1]);
    const text = stripHtml(match[2]);

    if (!href || !text) continue;
    if (!href.includes("drive.google.com") && !href.startsWith("/")) continue;

    const absoluteLink = href.startsWith("/")
      ? `https://drive.google.com${href}`
      : href;

    const resource = extractDriveResource(absoluteLink);
    if (!resource) continue;
    if (seen.has(resource.id)) continue;

    seen.add(resource.id);

    const mimeType = inferMimeTypeFromLink(absoluteLink);
    results.push({
      id: resource.id,
      name: text,
      link: absoluteLink,
      kind: resource.type,
      extension: resource.type === "folder" ? "" : inferExtension(text, mimeType),
      mimeType
    });
  }

  return results;
}

async function scanPublicDriveFolder(folderId: string, originalUrl: string): Promise<DriveScanItem[]> {
  const embeddedUrl = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
  const html = await fetchText(embeddedUrl);
  const entries = parseFolderEntriesFromEmbeddedView(html);

  if (entries.length > 0) {
    return entries;
  }

  const title = parseTitle(html) || "Thư mục Google Drive";
  return [
    {
      id: folderId,
      name: title,
      link: originalUrl,
      kind: "folder",
      extension: ""
    }
  ];
}

async function scanPublicDriveFile(fileId: string, originalUrl: string): Promise<DriveScanItem[]> {
  const html = await fetchText(originalUrl);
  const title = parseTitle(html);
  const mimeType =
    parseMetaContent(html, "og:type") ||
    inferMimeTypeFromLink(originalUrl);

  return [
    {
      id: fileId,
      name: title || "Tệp Google Drive",
      link: originalUrl,
      kind: "file",
      extension: inferExtension(title || "Tệp Google Drive", mimeType),
      mimeType
    }
  ];
}

/**
 * @route POST /api/documents/upload
 * @desc Upload base64 encoded educational documents safely
 * @access Private
 */
router.post("/upload", authenticateToken as any, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id, fileName, base64Data } = req.body;
    if (!id || !fileName || !base64Data) {
      return res.status(400).json({ error: "Missing required fields: id, fileName, base64Data" });
    }

    let cleanBase64 = base64Data;
    if (base64Data.includes(";base64,")) {
      cleanBase64 = base64Data.split(";base64,").pop() || "";
    }

    const buffer = Buffer.from(cleanBase64, "base64");

    // Save file inside a virtual folder based on teacher's name and ID
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const folderName = `${sanitizeFolderName(req.user?.name || "giaovien")}_${req.user?.id || "public"}`;
    const safeFileName = `${folderName}/${id}_${sanitizedName}`;
    const contentType = inferContentType(sanitizedName);

    if (!R2Storage.isEnabled()) {
      return res.status(503).json({
        error: "S3/R2 object storage chưa được cấu hình. Vui lòng thiết lập STORAGE_S3_ACCESS_KEY_ID, STORAGE_S3_SECRET_ACCESS_KEY, STORAGE_S3_BUCKET (hoặc các biến CF_R2_* tương thích)."
      });
    }

    const uploadResult = await R2Storage.uploadDocument({
      key: safeFileName,
      body: buffer,
      contentType,
    });

    Logger.info(`Uploaded document to object storage: ${safeFileName} (${buffer.length} bytes) for user: ${req.user?.email}`);
    return res.json({
      success: true,
      fileName: safeFileName,
      storage: "r2",
      url: uploadResult.url || undefined,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/documents/scan-drive
 * @desc Scan a public Google Drive file/folder link and return discovered entries
 * @access Private
 */
router.post("/scan-drive", authenticateToken as any, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { url } = req.body as { url?: string };
    const normalizedUrl = String(url || "").trim();

    if (!normalizedUrl) {
      return res.status(400).json({ error: "Thiếu liên kết Google Drive cần quét." });
    }

    if (!isGoogleDriveLikeUrl(normalizedUrl)) {
      return res.status(400).json({ error: "Liên kết không phải Google Drive/Docs hợp lệ." });
    }

    const resource = extractDriveResource(normalizedUrl);
    if (!resource) {
      return res.status(400).json({ error: "Không nhận diện được mã thư mục hoặc tệp từ liên kết Google Drive." });
    }

    let items: DriveScanItem[] = [];
    if (resource.type === "folder") {
      items = await scanPublicDriveFolder(resource.id, normalizedUrl);
    } else {
      items = await scanPublicDriveFile(resource.id, normalizedUrl);
    }

    Logger.info(`Drive scan completed for user ${req.user?.email}: ${normalizedUrl} -> ${items.length} item(s)`);

    res.json({
      success: true,
      resourceType: resource.type,
      resourceId: resource.id,
      itemCount: items.length,
      items
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/documents/download/:id
 * @desc Retrieve and download original file by unique document identifier
 * @access Private
 */
router.get("/download/:id", authenticateToken as any, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    if (!R2Storage.isEnabled()) {
      return res.status(503).send("S3/R2 object storage is not configured");
    }

    const folderName = `${sanitizeFolderName(req.user?.name || "giaovien")}_${req.user?.id || "public"}`;
    const objectKey = await R2Storage.findDocumentKey(`${folderName}/${id}_`);
    if (!objectKey) {
      return res.status(404).send("File not found");
    }

    const storedObject = await R2Storage.downloadDocument(objectKey);
    if (!storedObject) {
      return res.status(404).send("File not found");
    }

    const filePrefix = `${folderName}/${id}_`;
    const originalName = objectKey.startsWith(filePrefix) ? objectKey.slice(filePrefix.length) : objectKey;
    Logger.info(`Document download triggered from object storage: ${objectKey}`);
    res.setHeader("Content-Type", storedObject.contentType || inferContentType(originalName));
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(originalName)}"`);
    return res.send(storedObject.body);
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/documents
 * @desc Fetch all documents for the authenticated teacher
 * @access Private
 */
router.get("/", authenticateToken as any, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const ownerId = req.user?.role === "admin" ? undefined : req.user?.id;
    const documents = Database.getDocuments(ownerId);
    res.json(documents);
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/documents
 * @desc Save new document metadata
 * @access Private
 */
router.post("/", authenticateToken as any, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const ownerId = req.user?.role === "admin" ? undefined : req.user?.id;
    const currentDocuments = Database.getDocuments(ownerId);
    const newDoc = req.body;

    if (!newDoc.id || !newDoc.name) {
      return res.status(400).json({ error: "Missing required fields in document metadata." });
    }

    // Ensure ownerId is set on the document metadata
    const docWithOwner = {
      ...newDoc,
      ownerId
    };

    currentDocuments.push(docWithOwner);
    Database.saveDocuments(currentDocuments, ownerId);
    res.status(201).json(docWithOwner);
  } catch (err) {
    next(err);
  }
});

/**
 * @route DELETE /api/documents/:id
 * @desc Delete document metadata and remove from S3/R2 storage
 * @access Private
 */
router.delete("/:id", authenticateToken as any, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const ownerId = req.user?.role === "admin" ? undefined : req.user?.id;
    const currentDocuments = Database.getDocuments(ownerId);
    const targetDoc = currentDocuments.find(d => d.id === id);

    if (!targetDoc) {
      return res.status(404).json({ error: "Không tìm thấy tài liệu cần xóa." });
    }

    // 1. Delete from R2 object storage if it's uploaded
    if (R2Storage.isEnabled()) {
      const folderName = `${sanitizeFolderName(req.user?.name || "giaovien")}_${req.user?.id || "public"}`;
      const objectKey = await R2Storage.findDocumentKey(`${folderName}/${id}_`);
      if (objectKey) {
        await R2Storage.deleteDocument(objectKey);
      }
    }

    // 2. Delete metadata from database
    const updatedDocs = currentDocuments.filter(d => d.id !== id);
    Database.saveDocuments(updatedDocs, ownerId);

    Logger.info(`Deleted document ${id} for user ${req.user?.email}`);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;