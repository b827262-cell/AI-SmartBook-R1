import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync, createReadStream } from "node:fs";
import { resolve } from "node:path";
import express, { type Request, type Response } from "express";
import multer from "multer";
import { getDb, createRepositories, runMigrations, resolveDbPath } from "@ai-smartbook/db";
import { createAiProvider } from "@ai-smartbook/ai";
import {
  parsePdfToContents,
  splitBookIntoChapters,
  buildChaptersFromContents,
  buildChaptersFromPdfOutline,
  buildChapterPreviewRowsFromPdfOutline,
  extractPdfOutline,
  buildPdfJsonIndex,
  normalizeChaptersToReaderOutline,
  normalizeReaderOutline,
  isStructuredReaderOutline,
  buildReaderTocFromIndexItems,
  getChapterPreviewApplyStatus,
  flattenReaderOutline,
  linkChaptersByPageRange,
  summarizeChapter,
  askBookQuestion,
  type BookCoreContext
} from "@ai-smartbook/book-core";
import {
  applyChapterPreviewInputSchema,
  bookFileRoleSchema,
  readerTocInputNodeSchema,
  readerTocFileSchema,
  readerTocImportPayloadSchema,
  generateReaderTocFromIndexInputSchema,
  createBookInputSchema,
  updateBookInputSchema,
  createChapterInputSchema,
  updateChapterInputSchema,
  chatRequestSchema,
  studentChatRequestSchema,
  appearanceSettingsSchema,
  appearanceSettingsUpdateSchema,
  setRiskLevelInputSchema,
  blockAccountInputSchema,
  generatePdfJsonIndexInputSchema,
  saveJsonIndexInputSchema,
  pdfJsonIndexSchema,
  createSmartBookNoteInputSchema,
  updateSmartBookNoteInputSchema,
  questionBankJsonFileSchema,
  DEFAULT_APPEARANCE,
  type AiJobType,
  type Book,
  type BookFile,
  type BookAiJob,
  type ChapterPreviewRow,
  type ChatSession,
  type ReaderOutlineNode,
  type ReaderTocInputNode,
  type ReaderTocImportPayload,
  type PdfJsonIndex,
  type StoredJsonIndexSummary,
  type QuestionBankImportJob,
  type SmartBookNote,
  smartSolveJsonFileSchema,
  type ArtifactType,
  type BookJsonArtifact
} from "@ai-smartbook/schema";

const { db, sqlite } = getDb();
// Ensure the admin schema exists on the resolved DB path. This is idempotent
// and keeps `pnpm --filter AI-adm-D1 server:dev` working even before a manual
// `db:migrate` (it just yields an empty book list until you seed).
runMigrations(sqlite);
const repos = createRepositories(db);
const ai = createAiProvider();
const ctx: BookCoreContext = { repos, ai };

const UPLOAD_ROOT = resolve(process.env.UPLOAD_DIR || "./uploads/books");
const GENERATED_JSON_ROOT = resolve("./data/generated-json");
const JSON_INDEX_ROLE = "json_index" as const;
const READER_TOC_ROLE = "reader_toc" as const;
const READER_TOC_SCHEMA_VERSION = "smartbook-reader-toc-v1";
const READER_TOC_SOURCE = "manual_admin_import" as const;

function decodeUploadFileName(name: string): string {
  try {
    const decoded = Buffer.from(name, "latin1").toString("utf8");

    if (decoded.includes("\uFFFD")) return name;
    if (/[一-鿿ぁ-ゟ゠-ヿ]/u.test(decoded)) return decoded;
    if (!/[^\x00-\x7F]/.test(name) && /[^\x00-\x7F]/.test(decoded)) return decoded;

    return name;
  } catch {
    return name;
  }
}

function sanitizeUploadFileName(name: string): string {
  const normalized = decodeUploadFileName(name).normalize("NFC");
  const safe = normalized
    .replace(/[\/\\]/g, "_")
    .replace(/[\u0000-\u001f\u007f]+/g, "")
    .replace(/[^\p{L}\p{N}\p{M}\p{Pc}\p{Pd}.\s()（）[\]【】]+/gu, "_")
    .replace(/\s+/g, " ")
    .trim();

  return safe || "upload.pdf";
}

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const dir = resolve(UPLOAD_ROOT, String(req.params.bookId));
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const safe = sanitizeUploadFileName(file.originalname);
    cb(null, `${Date.now()}_${safe}`);
  }
});
const upload = multer({ storage });

// ---- Appearance image uploads (logo / banner icon) -----------------------
// Stored under a gitignored uploads dir and served read-only via /api/uploads.
const APPEARANCE_UPLOAD_DIR = resolve(process.env.UPLOAD_DIR || "./uploads", "appearance");
const APPEARANCE_IMAGE_TYPES = new Map<string, string>([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/svg+xml", ".svg"]
]);
const appearanceUpload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      if (!existsSync(APPEARANCE_UPLOAD_DIR)) mkdirSync(APPEARANCE_UPLOAD_DIR, { recursive: true });
      cb(null, APPEARANCE_UPLOAD_DIR);
    },
    filename(_req, file, cb) {
      const ext = APPEARANCE_IMAGE_TYPES.get(file.mimetype) || "";
      cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
    }
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    cb(null, APPEARANCE_IMAGE_TYPES.has(file.mimetype));
  }
});

const app = express();
app.use(express.json({ limit: "2mb" }));
// Serve uploaded appearance images read-only (rides the /api proxy in both apps).
app.use("/api/uploads/appearance", express.static(APPEARANCE_UPLOAD_DIR));

function fail(res: Response, status: number, message: string) {
  res.status(status).json({ error: message });
}

function isPdfBookFile(file: BookFile): boolean {
  return file.fileType === "application/pdf" || file.fileName.toLowerCase().endsWith(".pdf");
}

function isPdfUpload(fileName: string, fileType: string): boolean {
  return fileType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
}

function isImageMimeType(mimeType: string): boolean {
  return /^image\//.test(mimeType);
}

function isImageFile(file: Pick<BookFile, "fileName" | "fileType">): boolean {
  return (
    isImageMimeType(file.fileType) ||
    /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(file.fileName)
  );
}

function deleteStoredBookFile(file: BookFile): void {
  if (existsSync(file.filePath)) {
    unlinkSync(file.filePath);
  }
  repos.contents.deleteByFileId(file.id);
  repos.files.delete(file.id);
}

function parseIntFromString(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
}

function parsePageFromLabel(raw: string | null): number | null {
  if (!raw) return null;
  const match = raw.match(/\d+/);
  if (!match) return null;
  return parseIntFromString(match[0]);
}

function stripPageLabelFromTitle(rawTitle: string): { title: string; page: number | null } {
  const trimmed = rawTitle.trim();
  const prefixed = trimmed.match(/^\[\s*p\.?\s*(\d+)\s*\]\s*(.+)$/i);
  if (prefixed) {
    return { title: prefixed[2].trim(), page: parseIntFromString(prefixed[1]) };
  }

  const suffixed = trimmed.match(/^(.*?)\s+(?:\[\s*)?p\.?\s*(\d+)\s*(?:\]|\))?\s*$/i);
  if (suffixed) {
    return { title: suffixed[1].trim(), page: parseIntFromString(suffixed[2]) };
  }

  return { title: trimmed, page: null };
}

function normalizeReaderTocNode(
  raw: {
    id?: string;
    title: string;
    level?: number;
    page?: number | null;
    displayPage?: string | null;
    children?: unknown;
  },
  inheritedLevel: number,
  path: string[],
  source: ReaderOutlineNode["source"] = "manual_toc"
): ReaderOutlineNode {
  const explicitLevel =
    typeof raw.level === "number" && Number.isInteger(raw.level) && raw.level > 0 ? raw.level : undefined;
  const level = explicitLevel ?? inheritedLevel;
  const pageFromDisplay = parsePageFromLabel(raw.displayPage ?? null);
  const page = parseIntFromString(String(raw.page ?? pageFromDisplay ?? "")) ?? null;
  const children = Array.isArray(raw.children) ? raw.children : [];
  return {
    id: raw.id ?? `${source}-${path.join("-")}`,
    title: raw.title.trim(),
    level,
    page,
    pdfPage: page,
    displayPage: raw.displayPage ?? (page != null ? String(page) : null),
    children: children.map((child, index) =>
      normalizeReaderTocNode(
        child as {
          id?: string;
          title: string;
          level?: number;
          page?: number | null;
          displayPage?: string | null;
          children?: unknown;
        },
        level + 1,
        [...path, String(index + 1)],
        source
      )
    ),
    source
  };
}

function normalizeReaderTocNodes(raw: ReaderTocInputNode[]): ReaderOutlineNode[] {
  return raw
    .filter((item) => item && typeof item === "object" && typeof item.title === "string" && item.title.trim())
    .map((item, index) =>
      normalizeReaderTocNode(
        {
          id: item.id,
          title: item.title,
          level: item.level,
          page: item.page,
          displayPage: item.displayPage,
          children: item.children
        },
        1,
        [`manual-toc-root`, String(index + 1)],
        "manual_toc"
      )
    );
}

function parseReaderTocMarkdown(content: string): ReaderOutlineNode[] {
  const lines = content.replace(/\r/g, "").split("\n");
  const roots: ReaderOutlineNode[] = [];
  const stack: Array<{ level: number; node: ReaderOutlineNode }> = [];

  function add(level: number, title: string, page: number | null): ReaderOutlineNode | null {
    if (!title) return null;
    const node: ReaderOutlineNode = {
      id: `manual-toc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${roots.length + 1}`,
      title,
      level: Math.max(1, level),
      page,
      pdfPage: page,
      displayPage: page != null ? String(page) : null,
      children: [],
      source: "manual_toc"
    };

    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }

    stack.push({ level: node.level, node });
    return node;
  }

  for (const rawLine of lines) {
    const headingMatch = rawLine.match(/^(#{1,2})\s+(.*)$/);
    if (headingMatch) {
      const headingLevel = headingMatch[1].length;
      const parsed = stripPageLabelFromTitle(headingMatch[2]);
      add(headingLevel, parsed.title, parsed.page);
      continue;
    }

    const bulletMatch = rawLine.match(/^(\s*)[-*+]\s+(.*)$/);
    if (!bulletMatch) {
      continue;
    }

    const parsed = stripPageLabelFromTitle(bulletMatch[2]);
    // Bullet depth comes only from leading indentation, never from the current
    // stack top — otherwise flat sibling bullets cascade into deeper levels.
    const indent = Math.floor(bulletMatch[1].replace(/\t/g, "    ").length / 2);
    const level = 2 + indent;
    add(level, parsed.title, parsed.page);
  }

  return roots;
}

function toReaderTocInputNodes(nodes: ReaderOutlineNode[]): ReaderTocInputNode[] {
  return nodes.map((node) => ({
    id: node.id,
    title: node.title,
    level: node.level,
    page: node.page,
    displayPage: node.displayPage ?? null,
    children: toReaderTocInputNodes(node.children)
  }));
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseReaderTocImportFromPayload(
  bookId: string,
  payload: ReaderTocImportPayload
): { file: { schemaVersion: string; bookId: string; source: string; items: ReaderTocInputNode[] }; outline: ReaderOutlineNode[] } {
  if (payload.format === "markdown") {
    const outline = parseReaderTocMarkdown(payload.content);
    if (outline.length === 0) {
      throw new Error("No valid TOC entries found in markdown content.");
    }
    return {
      outline,
      file: {
        schemaVersion: READER_TOC_SCHEMA_VERSION,
        bookId,
        source: READER_TOC_SOURCE,
        items: toReaderTocInputNodes(outline)
      }
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(payload.content);
  } catch (error) {
    throw new Error("Invalid JSON content.");
  }

  if (isRecordValue(raw) && raw.schemaVersion === READER_TOC_SCHEMA_VERSION) {
    const parsed = readerTocFileSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error("Invalid JSON structure for manual TOC file.");
    }
    if (parsed.data.bookId !== bookId) {
      throw new Error(`JSON bookId mismatch: ${parsed.data.bookId}`);
    }
    const outline = normalizeReaderTocNodes(parsed.data.items);
    if (outline.length === 0) {
      throw new Error("JSON TOC payload has no outline items.");
    }
    return {
      outline,
      file: {
        schemaVersion: parsed.data.schemaVersion,
        bookId: parsed.data.bookId,
        source: parsed.data.source,
        items: parsed.data.items
      }
    };
  }

  const fallbackItems = readerTocInputNodeSchema.array().safeParse(raw);
  if (!fallbackItems.success) {
    throw new Error("Invalid JSON structure. Expect schemaVersion payload or a raw items array.");
  }
  const outline = normalizeReaderTocNodes(fallbackItems.data);
  if (outline.length === 0) {
    throw new Error("JSON TOC payload has no outline items.");
  }
  return {
    outline,
    file: {
      schemaVersion: READER_TOC_SCHEMA_VERSION,
      bookId,
      source: READER_TOC_SOURCE,
      items: fallbackItems.data
    }
  };
}

// ---- JSON index artifacts / QA reference ---------------------------------
// Stored JSON indexes are managed `book_files` with role "json_index". The
// active QA reference is a per-book pointer in app_settings (no migration).
const jsonUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

function qaReferenceKey(bookId: string): string {
  return `qa_reference:${bookId}`;
}
function getActiveQaReferenceId(bookId: string): string | null {
  return repos.settings.get(qaReferenceKey(bookId));
}
function setActiveQaReferenceId(bookId: string, fileId: string | null): void {
  repos.settings.set(qaReferenceKey(bookId), fileId ?? "");
}

/** Persist an index JSON to the book's upload dir and return the file path. */
function writeJsonIndexArtifact(bookId: string, baseName: string, json: PdfJsonIndex): string {
  const dir = resolve(UPLOAD_ROOT, bookId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const safe = sanitizeUploadFileName(baseName).replace(/\.json$/i, "");
  const path = resolve(dir, `${Date.now()}_${safe || "index"}.json`);
  writeFileSync(path, JSON.stringify(json, null, 2), "utf8");
  return path;
}

/** Read + validate a stored JSON index file. Returns null when unparseable. */
function readStoredJsonIndex(file: BookFile): PdfJsonIndex | null {
  try {
    const parsed = pdfJsonIndexSchema.safeParse(JSON.parse(readFileSync(file.filePath, "utf8")));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function summarizeReaderToc(nodes: ReaderOutlineNode[]) {
  return { itemCount: flattenReaderOutline(nodes).length };
}

function readStoredReaderToc(file: BookFile): ReaderOutlineNode[] | null {
  if (file.role !== READER_TOC_ROLE) return null;
  try {
    const raw = JSON.parse(readFileSync(file.filePath, "utf8"));
    const parsed = readerTocFileSchema.safeParse(raw);
    if (!parsed.success) return null;
    return normalizeReaderTocNodes(parsed.data.items);
  } catch {
    return null;
  }
}

/** Persist a manual TOC JSON document as a managed book_file. */
function writeReaderTocArtifact(bookId: string, payload: { schemaVersion: string; bookId: string; source: string; items: unknown[] }) {
  const dir = resolve(UPLOAD_ROOT, bookId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `${Date.now()}_reader_toc.json`);
  writeFileSync(path, JSON.stringify(payload, null, 2), "utf8");
  return path;
}

function findLatestReaderTocFile(bookId: string): { file: BookFile | null; outline: ReaderOutlineNode[] | null } {
  const files = repos.files
    .findByBookId(bookId)
    .filter((file) => file.role === READER_TOC_ROLE)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const file of files) {
    const outline = readStoredReaderToc(file);
    if (outline) return { file, outline };
  }
  return { file: null, outline: null };
}

/** Build the lightweight admin-list summary for a stored JSON index file. */
function summarizeStoredJsonIndex(file: BookFile, activeId: string | null): StoredJsonIndexSummary {
  const index = readStoredJsonIndex(file);
  return {
    fileId: file.id,
    fileName: file.fileName,
    fileSize: file.fileSize,
    createdAt: file.createdAt,
    isActive: file.id === activeId,
    valid: index != null,
    level: index?.level ?? null,
    levelLabel: index?.levelLabel ?? null,
    itemCount: index?.itemCount ?? null,
    pageCount: index?.pageCount ?? null,
    generatedAt: index?.generatedAt ?? null,
    sourceFileId: index?.fileId ?? file.relatedFileId ?? null
  };
}

/**
 * Keyword-search the active JSON index (if any) and return a QA answer built
 * from its structured items. Returns null when there is no active index, it is
 * unparseable, or nothing matches — letting the caller fall back to content QA.
 */
function answerFromActiveJsonIndex(
  bookId: string,
  question: string
): { answer: string; matchedContentIds: string[] } | null {
  const activeId = getActiveQaReferenceId(bookId);
  if (!activeId) return null;
  const file = repos.files.findById(activeId);
  if (!file || file.bookId !== bookId || file.role !== JSON_INDEX_ROLE) return null;
  const index = readStoredJsonIndex(file);
  if (!index || index.items.length === 0) return null;

  const tokens = tokenizeQuestion(question);
  if (tokens.length === 0) return null;
  const scored = index.items
    .map((item) => {
      const text = item.text.toLowerCase();
      const score = tokens.reduce((acc, t) => acc + (text.includes(t) ? 1 : 0), 0);
      return { item, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  if (scored.length === 0) return null;

  return {
    answer: [
      `根據結構化索引（${index.level} / ${index.levelLabel}）找到以下相關段落：`,
      ...scored.map((s, i) => {
        const range =
          s.item.pageStart === s.item.pageEnd
            ? `P${s.item.pageStart}`
            : `P${s.item.pageStart}-${s.item.pageEnd}`;
        return `${i + 1}. (${range}) ${s.item.text}`;
      })
    ].join("\n"),
    matchedContentIds: []
  };
}

async function replaceParsedContentsForFile(file: BookFile) {
  if (!isPdfBookFile(file)) {
    throw new Error("Only PDF source documents can be parsed.");
  }

  repos.contents.deleteByFileId(file.id);
  const { contents, pageCount } = await parsePdfToContents(file.filePath, file.bookId, file.id);
  repos.contents.createMany(contents);
  repos.files.updateParseStatus(file.id, "parsed");
  return { parsed: contents.length, pageCount };
}

function normalizePreviewRowsForApply(rows: ChapterPreviewRow[]): ChapterPreviewRow[] {
  return rows.map((row, index) => {
    const normalized: ChapterPreviewRow = {
      ...row,
      suggestedTitle: row.suggestedTitle.trim() || row.originalTitle.trim() || `Chapter ${index + 1}`,
      originalTitle: row.originalTitle.trim(),
      referenceTitle: row.referenceTitle?.trim() || null,
      printedPageLabel: row.printedPageLabel?.trim() || null,
      printedPageStart: row.printedPageStart?.trim() || null,
      printedPageEnd: row.printedPageEnd?.trim() || null,
      adminNote: row.adminNote?.trim() || null
    };
    return { ...normalized, applyStatus: getChapterPreviewApplyStatus(normalized) };
  });
}

const APPEARANCE_KEY = "appearance";

/** Load appearance settings merged over defaults (never throws / never blank). */
function loadAppearance() {
  const raw = repos.settings.get(APPEARANCE_KEY);
  if (!raw) return DEFAULT_APPEARANCE;
  try {
    return appearanceSettingsSchema.parse({ ...DEFAULT_APPEARANCE, ...JSON.parse(raw) });
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

function tokenizeQuestion(question: string): string[] {
  const grams = new Set<string>();
  for (const w of question.split(/[\s,，。．.!?？！、:：;；()「」『』\[\]]+/)) {
    const t = w.trim().toLowerCase();
    if (t.length >= 2 && /[a-z0-9]/.test(t)) grams.add(t);
  }
  const cleaned = question.replace(/[\s,，。．.!?？！、:：;；()「」『』\[\]]+/g, "").toLowerCase();
  for (let i = 0; i < cleaned.length - 1; i++) {
    grams.add(cleaned.slice(i, i + 2));
  }
  return [...grams];
}

function normalizeManualQuestion(question: string): string {
  return question
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[，。．,.!?？！、:：;；()（）「」『』\[\]【】"'`]/g, "");
}

function similarityScore(input: string, candidate: string): number {
  const normalizedInput = normalizeManualQuestion(input);
  const normalizedCandidate = normalizeManualQuestion(candidate);
  if (!normalizedInput || !normalizedCandidate) return 0;
  if (normalizedInput === normalizedCandidate) return 1;
  if (
    normalizedInput.includes(normalizedCandidate) ||
    normalizedCandidate.includes(normalizedInput)
  ) {
    return 0.92;
  }

  const inputTokens = new Set(tokenizeQuestion(input));
  const candidateTokens = new Set(tokenizeQuestion(candidate));
  if (inputTokens.size === 0 || candidateTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of inputTokens) {
    if (candidateTokens.has(token)) overlap += 1;
  }

  return overlap / Math.max(inputTokens.size, candidateTokens.size);
}

function findManualQaAnswer(bookId: string, question: string) {
  const manualLogs = repos.qaLogs.findManualByBookId(bookId);
  let best: { question: string; answer: string; score: number } | null = null;

  for (const log of manualLogs) {
    const score = similarityScore(question, log.question);
    if (!best || score > best.score) {
      best = { question: log.question, answer: log.answer, score };
    }
  }

  return best && best.score >= 0.72 ? best : null;
}

function keywordChat(question: string, bookId: string, chapterId?: string | null) {
  // Prefer the active structured JSON index as the QA reference; fall back to
  // content-based search when there is no active index or it has no match.
  const fromIndex = answerFromActiveJsonIndex(bookId, question);
  if (fromIndex) return fromIndex;

  const tokens = tokenizeQuestion(question);
  const all = repos.contents.findByBookId(bookId);
  // Scope to the chapter's linked content when a chapter is selected and has
  // linked content; otherwise fall back to whole-book search.
  const scoped = chapterId ? all.filter((c) => c.chapterId === chapterId) : [];
  const contents = scoped.length > 0 ? scoped : all;

  if (tokens.length === 0 || contents.length === 0) {
    return {
      answer: "目前書本內容中沒有找到明確答案，請換個關鍵字再試一次。",
      matchedContentIds: []
    };
  }

  const scored = contents
    .map((c) => {
      const text = c.contentText.toLowerCase();
      const score = tokens.reduce((acc, t) => acc + (text.includes(t) ? 1 : 0), 0);
      return { c, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (scored.length === 0) {
    return {
      answer: "目前書本內容中沒有找到明確答案，請換個關鍵字再試一次。",
      matchedContentIds: []
    };
  }

  return {
    answer: [
      "根據書本內容，找到以下相關段落：",
      ...scored.map((s, i) => `${i + 1}. ${s.c.contentText}`)
    ].join("\n"),
    matchedContentIds: scored.map((s) => s.c.id)
  };
}

type ClientInfo = {
  userAgent: string | null;
  browserName: string;
  browserVersion: string | null;
  osName: string;
  osVersion: string | null;
  deviceType: string;
  deviceVendor: string | null;
  deviceModel: string | null;
  ipAddress: string | null;
  ipSource: string | null;
};

function headerValue(req: Request, name: string): string {
  const value = req.headers[name];
  return Array.isArray(value) ? value.join(", ") : typeof value === "string" ? value : "";
}

// ---- Server-side IP resolution -------------------------------------------
// We never trust a client-supplied IP. When TRUST_PROXY=true (e.g. behind
// Nginx / Cloudflare) we honour the standard forwarding headers in a fixed
// priority order; otherwise we only trust the raw socket address.
const TRUST_PROXY = String(process.env.TRUST_PROXY).toLowerCase() === "true";

/** Normalize IPv6 localhost and IPv4-mapped IPv6 to their IPv4 form. */
function normalizeIp(raw: string): string {
  let ip = raw.trim();
  if (ip === "") return "";
  if (ip === "::1") return "127.0.0.1";
  // Strip an IPv4-mapped IPv6 prefix, e.g. ::ffff:127.0.0.1 -> 127.0.0.1.
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) ip = mapped[1];
  return ip;
}

/** Resolve the client IP and record which source it came from. */
function resolveClientIp(req: Request): { ip: string | null; source: string | null } {
  if (TRUST_PROXY) {
    const cf = headerValue(req, "cf-connecting-ip").trim();
    if (cf) return { ip: normalizeIp(cf), source: "cf-connecting-ip" };
    const xff = headerValue(req, "x-forwarded-for").split(",")[0]?.trim();
    if (xff) return { ip: normalizeIp(xff), source: "x-forwarded-for" };
    const xreal = headerValue(req, "x-real-ip").trim();
    if (xreal) return { ip: normalizeIp(xreal), source: "x-real-ip" };
  }
  const socket = req.socket?.remoteAddress ?? "";
  const ip = normalizeIp(socket);
  return { ip: ip || null, source: ip ? "socket" : null };
}

/** Private/loopback/link-local IPv4 or IPv6 — never sent to external geo. */
function isPrivateIp(ip: string | null): boolean {
  if (!ip) return true;
  if (ip === "127.0.0.1" || ip.startsWith("127.")) return true;
  if (ip === "::1" || ip === "0.0.0.0" || ip === "::") return true;
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  if (/^169\.254\./.test(ip)) return true; // link-local
  if (/^(fc|fd)[0-9a-f]{2}:/i.test(ip)) return true; // IPv6 ULA
  if (/^fe80:/i.test(ip)) return true; // IPv6 link-local
  return false;
}

/**
 * Human-readable location label for the admin table. We do not call any paid
 * external geolocation service: private/local IPs show a fixed label and public
 * IPs show stored geo fields when present, otherwise "Unknown".
 */
function describeIpLocation(session: ChatSession): string {
  const ip = session.lastIpAddress ?? null;
  if (!ip) return "—";
  if (isPrivateIp(ip)) return "Localhost / Private IP";
  const parts = [session.lastIpCity, session.lastIpRegion, session.lastIpCountry]
    .map((p) => (p ?? "").trim())
    .filter((p) => p.length > 0);
  return parts.length > 0 ? parts.join(", ") : "Unknown";
}

function normalizeOs(rawPlatform: string, userAgent: string) {
  const platform = rawPlatform.replace(/"/g, "").trim().toLowerCase();
  const ua = userAgent.toLowerCase();

  if (platform.includes("ios") || /iphone|ipad|ipod/.test(ua)) {
    const match = userAgent.match(/OS (\d+(?:[_\.\d]+)?)/i);
    return { name: "iOS", version: match ? match[1].replace(/_/g, ".") : null };
  }
  if (platform.includes("android") || /android/.test(ua)) {
    const match = userAgent.match(/Android (\d+(?:\.\d+)?)/i);
    return { name: "Android", version: match ? match[1] : null };
  }
  if (platform.includes("mac") || /mac os x/.test(ua)) {
    const match = userAgent.match(/Mac OS X (\d+(?:[_\.\d]+)?)/i);
    return { name: "macOS", version: match ? match[1].replace(/_/g, ".") : null };
  }
  if (platform.includes("win") || /windows nt/.test(ua)) {
    const match = userAgent.match(/Windows NT ([0-9.]+)/i);
    return { name: "Windows", version: match ? match[1] : null };
  }
  if (platform.includes("linux") || /linux|x11/.test(ua)) {
    return { name: "Linux", version: null };
  }
  return { name: "未知", version: null };
}

function normalizeBrowser(secChUa: string, userAgent: string) {
  const ch = secChUa.toLowerCase();

  if (ch.includes("microsoft edge") || /Edg\/([0-9.]+)/.test(userAgent)) {
    return {
      name: "Edge",
      version:
        userAgent.match(/Edg\/([0-9.]+)/)?.[1] ??
        secChUa.match(/Microsoft Edge";v="([^"]+)"/i)?.[1] ??
        null
    };
  }
  if (/Firefox\/([0-9.]+)/.test(userAgent)) {
    return { name: "Firefox", version: userAgent.match(/Firefox\/([0-9.]+)/)?.[1] ?? null };
  }
  if (
    (ch.includes("google chrome") || ch.includes("chromium") || /Chrome\/([0-9.]+)/.test(userAgent)) &&
    !/Edg\/|OPR\//.test(userAgent)
  ) {
    return {
      name: "Chrome",
      version:
        userAgent.match(/Chrome\/([0-9.]+)/)?.[1] ??
        secChUa.match(/(?:Google Chrome|Chromium)";v="([^"]+)"/i)?.[1] ??
        null
    };
  }
  if (
    /Version\/([0-9.]+).+Safari\//.test(userAgent) &&
    !/Chrome\/|Chromium\/|Edg\//.test(userAgent)
  ) {
    return { name: "Safari", version: userAgent.match(/Version\/([0-9.]+)/)?.[1] ?? null };
  }
  return { name: "未知", version: null };
}

function normalizeDeviceType(rawMobile: string, userAgent: string, osName: string) {
  const mobile = rawMobile.replace(/"/g, "").trim().toLowerCase();
  const ua = userAgent.toLowerCase();

  if (/ipad|tablet/.test(ua)) return "Tablet";
  if (mobile === "?1") return /ipad|tablet/.test(ua) ? "Tablet" : "Mobile";
  if (mobile === "?0") {
    if (osName === "Android" && /tablet/.test(ua)) return "Tablet";
    return "Desktop";
  }
  if (/iphone|ipod|mobile/.test(ua)) return "Mobile";
  if (osName === "Android") return /mobile/.test(ua) ? "Mobile" : "Tablet";
  if (osName === "Windows" || osName === "macOS" || osName === "Linux") return "Desktop";
  return "未知";
}

function detectDeviceModel(userAgent: string, osName: string) {
  if (osName === "iOS") {
    if (/iPad/i.test(userAgent)) return { vendor: "Apple", model: "iPad" };
    if (/iPhone/i.test(userAgent)) return { vendor: "Apple", model: "iPhone" };
  }
  const androidMatch = userAgent.match(/Android [^;)]*;\s*([^;)]+?)\s+Build\//i);
  if (androidMatch) {
    return { vendor: null, model: androidMatch[1].trim() || null };
  }
  return { vendor: null, model: null };
}

function parseClientInfo(req: Request): ClientInfo {
  const userAgent = headerValue(req, "user-agent").trim();
  const secChUa = headerValue(req, "sec-ch-ua");
  const secChUaPlatform = headerValue(req, "sec-ch-ua-platform");
  const secChUaMobile = headerValue(req, "sec-ch-ua-mobile");

  const os = normalizeOs(secChUaPlatform, userAgent);
  const browser = normalizeBrowser(secChUa, userAgent);
  const deviceType = normalizeDeviceType(secChUaMobile, userAgent, os.name);
  const device = detectDeviceModel(userAgent, os.name);
  const resolvedIp = resolveClientIp(req);

  return {
    userAgent: userAgent || null,
    browserName: browser.name,
    browserVersion: browser.version,
    osName: os.name,
    osVersion: os.version,
    deviceType,
    deviceVendor: device.vendor,
    deviceModel: device.model,
    ipAddress: resolvedIp.ip,
    ipSource: resolvedIp.source
  };
}

function enrichSessionClientInfo(existing: ChatSession | null, next: ClientInfo) {
  const keep = (current?: string | null, incoming?: string | null) =>
    incoming && incoming !== "未知" ? incoming : current ?? null;
  return {
    lastSeenAt: new Date().toISOString(),
    userAgent: keep(existing?.userAgent, next.userAgent),
    osName: keep(existing?.osName, next.osName) ?? "未知",
    osVersion: keep(existing?.osVersion, next.osVersion),
    browserName: keep(existing?.browserName, next.browserName) ?? "未知",
    browserVersion: keep(existing?.browserVersion, next.browserVersion),
    deviceType: keep(existing?.deviceType, next.deviceType) ?? "未知",
    deviceVendor: keep(existing?.deviceVendor, next.deviceVendor),
    deviceModel: keep(existing?.deviceModel, next.deviceModel),
    // Always refresh the IP to the latest request; keep prior geo (we do not
    // resolve geo yet, so these stay null unless a GeoIP provider is added).
    lastIpAddress: next.ipAddress ?? existing?.lastIpAddress ?? null,
    lastIpCountry: existing?.lastIpCountry ?? null,
    lastIpRegion: existing?.lastIpRegion ?? null,
    lastIpCity: existing?.lastIpCity ?? null,
    lastIpSource: next.ipSource ?? existing?.lastIpSource ?? null
  };
}

function findPublishedBook(bookId: string) {
  const book = repos.books.findById(bookId);
  if (!book || book.status !== "published") return null;
  return book;
}

function toAdminNote(note: SmartBookNote, book: Book | null) {
  return {
    ...note,
    bookTitle: book?.title ?? "未知書本",
    bookStatus: book?.status ?? "draft"
  };
}

function findPrimaryPdfSourceFile(bookId: string): BookFile | null {
  return (
    repos.files
      .findByBookId(bookId)
      .find((file) => file.role === "source_document" && isPdfBookFile(file)) ?? null
  );
}

function resolveStudentSessionId(req: Request): string | null {
  const fromHeader = headerValue(req, "x-student-session-id").trim();
  if (fromHeader) return fromHeader;
  const fromQuery = typeof req.query.sessionId === "string" ? req.query.sessionId.trim() : "";
  return fromQuery || null;
}

function resolveStudentSession(
  req: Request,
  res: Response,
  bookId: string,
  options: { allowCreate: boolean; title?: string; sessionIdOverride?: string | null }
): { session: ChatSession; clientInfo: ClientInfo } | null {
  const sessionId = options.sessionIdOverride?.trim() || resolveStudentSessionId(req);
  const existingSession = sessionId ? repos.chat.findSessionById(sessionId) : null;

  if (sessionId && !existingSession) {
    fail(res, 401, "invalid session");
    return null;
  }
  if (existingSession && existingSession.bookId !== bookId) {
    fail(res, 403, "session is not allowed to access this book");
    return null;
  }
  if (rejectIfBlocked(req, res, existingSession)) return null;

  const clientInfo = parseClientInfo(req);
  if (!existingSession) {
    if (!options.allowCreate) {
      fail(res, 401, "student session is required");
      return null;
    }
    const created = repos.chat.createSession({
      bookId,
      title: options.title ?? "Reader session",
      ...enrichSessionClientInfo(null, clientInfo)
    });
    return { session: created, clientInfo };
  }

  const updated =
    repos.chat.updateSessionClientInfo(
      existingSession.id,
      enrichSessionClientInfo(existingSession, clientInfo)
    ) ?? existingSession;
  return { session: updated, clientInfo };
}

interface ManualQaItem {
  question: string;
  answer: string;
}

function normalizeQaLabel(line: string): string {
  return line
    .replace(/^[#*\-\s>]+/, "")
    .replace(/\*\*/g, "")
    .trim();
}

function parseManualQaMarkdown(markdown: string): ManualQaItem[] {
  const lines = markdown.split(/\r?\n/);
  const items: ManualQaItem[] = [];
  let currentQuestion = "";
  let answerLines: string[] = [];
  let mode: "idle" | "question" | "answer" = "idle";

  function flush() {
    const question = currentQuestion.trim();
    const answer = answerLines.join("\n").trim();
    if (question && answer) {
      items.push({ question, answer });
    }
    currentQuestion = "";
    answerLines = [];
    mode = "idle";
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const normalized = normalizeQaLabel(rawLine);

    if (/^(Q|Q\d+|Question|問題|問)[:：]\s*/i.test(normalized)) {
      flush();
      currentQuestion = normalized.replace(/^(Q|Q\d+|Question|問題|問)[:：]\s*/i, "").trim();
      mode = "question";
      continue;
    }

    if (/^(A|Answer|答案|答)[:：]\s*/i.test(normalized)) {
      answerLines = [normalized.replace(/^(A|Answer|答案|答)[:：]\s*/i, "").trim()];
      mode = "answer";
      continue;
    }

    if (mode === "question" && normalized !== "") {
      currentQuestion = [currentQuestion, normalized].filter(Boolean).join(" ").trim();
      continue;
    }

    if (mode === "answer") {
      if (line === "") {
        answerLines.push("");
      } else {
        answerLines.push(rawLine.trim());
      }
    }
  }

  flush();
  return items;
}

/** Wrap an AI operation as a tracked book_ai_job row. */
async function runJob<T>(
  bookId: string,
  jobType: AiJobType,
  input: unknown,
  fn: () => Promise<T>
): Promise<{ job: BookAiJob; result: T }> {
  const job = repos.aiJobs.create({
    bookId,
    jobType,
    status: "running",
    inputJson: JSON.stringify(input ?? {})
  });
  try {
    const result = await fn();
    const updated = repos.aiJobs.update(job.id, {
      status: "success",
      outputJson: JSON.stringify(result)
    });
    return { job: updated ?? job, result };
  } catch (err) {
    repos.aiJobs.update(job.id, {
      status: "failed",
      errorMessage: err instanceof Error ? err.message : String(err)
    });
    throw err;
  }
}

// ---- Books ----------------------------------------------------------------
app.get("/api/admin/books", (_req, res) => {
  res.json({ books: repos.books.findAll() });
});

app.post("/api/admin/books", (req, res) => {
  const parsed = createBookInputSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, parsed.error.message);
  res.status(201).json({ book: repos.books.create(parsed.data) });
});

app.get("/api/admin/books/:bookId", (req, res) => {
  const book = repos.books.findById(req.params.bookId);
  if (!book) return fail(res, 404, "book not found");
  const chapters = repos.chapters.findByBookId(book.id);
  const files = repos.files.findByBookId(book.id);
  res.json({ book, chapters, files });
});

app.patch("/api/admin/books/:bookId", (req, res) => {
  const parsed = updateBookInputSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, parsed.error.message);
  const book = repos.books.update(req.params.bookId, parsed.data);
  if (!book) return fail(res, 404, "book not found");
  res.json({ book });
});

// ---- Files & parsing ------------------------------------------------------
app.post("/api/admin/books/:bookId/files", upload.single("file"), (req, res) => {
  const book = repos.books.findById(String(req.params.bookId));
  if (!book) return fail(res, 404, "book not found");
  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) return fail(res, 400, "file is required (multipart field 'file')");
  const rawDisplayName =
    typeof req.body?.displayName === "string" && req.body.displayName.trim() !== ""
      ? req.body.displayName
      : file.originalname;
  const displayName = sanitizeUploadFileName(rawDisplayName);
  const parsedRole = bookFileRoleSchema.safeParse(req.body?.role ?? "source_document");
  if (!parsedRole.success) return fail(res, 400, parsedRole.error.message);

  const role = parsedRole.data;
  if (role === READER_TOC_ROLE) {
    return fail(res, 400, "Use /reader-toc/import to create structured TOC files.");
  }
  const relatedFileId =
    typeof req.body?.relatedFileId === "string" && req.body.relatedFileId.trim() !== ""
      ? req.body.relatedFileId.trim()
      : null;

  if (role === "source_document" && !isPdfUpload(displayName, file.mimetype || "")) {
    return fail(res, 400, "Source documents must be uploaded as PDF files.");
  }

  if (role === "reference_image") {
    if (!isImageMimeType(file.mimetype || "")) {
      return fail(res, 400, "Reference images must use an image/* content type.");
    }
    if (!relatedFileId) {
      return fail(res, 400, "Reference images require a relatedFileId.");
    }
    const relatedFile = repos.files.findById(relatedFileId);
    if (!relatedFile || relatedFile.bookId !== book.id) {
      return fail(res, 404, "Related PDF file not found.");
    }
    if (!isPdfBookFile(relatedFile)) {
      return fail(res, 400, "Reference images can only be attached to a PDF source document.");
    }
  }

  const record = repos.files.create({
    bookId: book.id,
    fileName: displayName,
    filePath: file.path,
    fileType: file.mimetype || "application/octet-stream",
    fileSize: file.size,
    role,
    relatedFileId: role === "reference_image" ? relatedFileId : null,
    parseStatus: "pending"
  });
  res.status(201).json({ file: record });
});

app.get("/api/admin/books/:bookId/files/:fileId/raw", (req, res) => {
  const file = repos.files.findById(req.params.fileId);
  if (!file || file.bookId !== req.params.bookId) return fail(res, 404, "file not found");
  res.sendFile(file.filePath);
});

app.delete("/api/admin/books/:bookId/files/:fileId", (req, res) => {
  const file = repos.files.findById(req.params.fileId);
  if (!file || file.bookId !== req.params.bookId) return fail(res, 404, "file not found");

  try {
    for (const related of repos.files.findByRelatedFileId(file.id)) {
      deleteStoredBookFile(related);
    }
    deleteStoredBookFile(file);
  } catch (err) {
    return fail(res, 500, err instanceof Error ? err.message : "delete file failed");
  }

  res.json({ deleted: true });
});

app.post("/api/admin/books/:bookId/files/:fileId/parse-content", async (req, res) => {
  const file = repos.files.findById(req.params.fileId);
  if (!file || file.bookId !== req.params.bookId) return fail(res, 404, "file not found");
  if (file.role !== "source_document" || !isPdfBookFile(file)) {
    return fail(res, 400, "content parsing requires a PDF source document");
  }

  try {
    const result = await replaceParsedContentsForFile(file);
    res.json({ ...result, fileId: file.id });
  } catch (err) {
    repos.files.updateParseStatus(file.id, "failed");
    fail(res, 500, err instanceof Error ? err.message : "parse content failed");
  }
});

app.post("/api/admin/books/:bookId/files/:fileId/attach-reference-image", (req, res) => {
  const file = repos.files.findById(req.params.fileId);
  if (!file || file.bookId !== req.params.bookId) return fail(res, 404, "file not found");
  if (!isImageFile(file)) return fail(res, 400, "only image files can be attached as reference images");

  const relatedFileId =
    typeof req.body?.relatedFileId === "string" && req.body.relatedFileId.trim() !== ""
      ? req.body.relatedFileId.trim()
      : "";
  if (!relatedFileId) return fail(res, 400, "relatedFileId is required");

  const relatedFile = repos.files.findById(relatedFileId);
  if (!relatedFile || relatedFile.bookId !== req.params.bookId) {
    return fail(res, 404, "related PDF file not found");
  }
  if (relatedFile.role !== "source_document" || !isPdfBookFile(relatedFile)) {
    return fail(res, 400, "reference images must be attached to a PDF source document");
  }

  const updated = repos.files.updateMetadata(file.id, {
    role: "reference_image",
    relatedFileId: relatedFile.id
  });
  if (!updated) return fail(res, 500, "failed to update file classification");
  res.json({ file: updated });
});

app.post("/api/admin/books/:bookId/files/:fileId/outline-preview", async (req, res) => {
  const file = repos.files.findById(req.params.fileId);
  if (!file || file.bookId !== req.params.bookId) return fail(res, 404, "file not found");
  if (file.role !== "source_document" || !isPdfBookFile(file)) {
    return fail(res, 400, "outline preview requires a PDF source document");
  }

  try {
    const { parsed, pageCount } = await replaceParsedContentsForFile(file);
    const rows = await buildChapterPreviewRowsFromPdfOutline(file.filePath, pageCount);
    res.json({ parsed, pageCount, rows });
  } catch (err) {
    repos.files.updateParseStatus(file.id, "failed");
    fail(res, 500, err instanceof Error ? err.message : "outline preview failed");
  }
});

app.post("/api/admin/books/:bookId/files/:fileId/generate-json-index", async (req, res) => {
  const book = repos.books.findById(req.params.bookId);
  if (!book) return fail(res, 404, "book not found");

  const file = repos.files.findById(req.params.fileId);
  if (!file || file.bookId !== book.id) return fail(res, 404, "file not found");
  if (file.role !== "source_document" || !isPdfBookFile(file)) {
    return fail(res, 400, "JSON index generation requires a PDF source document");
  }

  const parsed = generatePdfJsonIndexInputSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, parsed.error.message);

  try {
    const { contents, pageCount } = await parsePdfToContents(file.filePath, book.id, file.id);
    const index = buildPdfJsonIndex({
      bookId: book.id,
      fileId: file.id,
      fileName: file.fileName,
      level: parsed.data.level,
      pageCount,
      contents,
      chapters: repos.chapters.findByBookId(book.id)
    });
    res.json({ index });
  } catch (err) {
    fail(res, 500, err instanceof Error ? err.message : "generate json index failed");
  }
});

// Persist a JSON index as a managed json_index file. The request body carries
// only { level, setActive }; the server regenerates the (possibly very large)
// index from the PDF so the request never ships the full item array (no 413).
app.post("/api/admin/books/:bookId/files/:fileId/save-json-index", async (req, res) => {
  const book = repos.books.findById(req.params.bookId);
  if (!book) return fail(res, 404, "book not found");
  const source = repos.files.findById(req.params.fileId);
  if (!source || source.bookId !== book.id) return fail(res, 404, "file not found");
  if (source.role !== "source_document" || !isPdfBookFile(source)) {
    return fail(res, 400, "saving a JSON index requires a PDF source document");
  }

  const parsed = saveJsonIndexInputSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, parsed.error.message);

  try {
    const { contents, pageCount } = await parsePdfToContents(source.filePath, book.id, source.id);
    const index = buildPdfJsonIndex({
      bookId: book.id,
      fileId: source.id,
      fileName: source.fileName,
      level: parsed.data.level,
      pageCount,
      contents,
      chapters: repos.chapters.findByBookId(book.id)
    });
    const baseName = `${source.fileName.replace(/\.pdf$/i, "")}-${index.level}-index`;
    const path = writeJsonIndexArtifact(book.id, baseName, index);
    const record = repos.files.create({
      bookId: book.id,
      fileName: `${baseName}.json`,
      filePath: path,
      fileType: "application/json",
      fileSize: Buffer.byteLength(JSON.stringify(index)),
      role: JSON_INDEX_ROLE,
      relatedFileId: source.id,
      parseStatus: "parsed"
    });
    if (parsed.data.setActive) setActiveQaReferenceId(book.id, record.id);
    res.status(201).json({ index: summarizeStoredJsonIndex(record, getActiveQaReferenceId(book.id)) });
  } catch (err) {
    fail(res, 500, err instanceof Error ? err.message : "save json index failed");
  }
});

// Manually upload a JSON index file (validated against the v1 schema).
app.post("/api/admin/books/:bookId/json-indexes/upload", jsonUpload.single("file"), (req, res) => {
  const book = repos.books.findById(String(req.params.bookId));
  if (!book) return fail(res, 404, "book not found");
  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) return fail(res, 400, "file is required (multipart field 'file')");

  let json: unknown;
  try {
    json = JSON.parse(file.buffer.toString("utf8"));
  } catch {
    return fail(res, 400, "Uploaded file is not valid JSON.");
  }
  const parsed = pdfJsonIndexSchema.safeParse(json);
  if (!parsed.success) {
    return fail(res, 400, `Invalid JSON index (smartbook-pdf-index-v1): ${parsed.error.message}`);
  }
  if (parsed.data.bookId !== book.id) {
    return fail(
      res,
      400,
      `This JSON index belongs to book ${parsed.data.bookId}, not the current book. Upload rejected.`
    );
  }

  try {
    const baseName = `${parsed.data.fileName.replace(/\.pdf$/i, "")}-${parsed.data.level}-index`;
    const path = writeJsonIndexArtifact(book.id, baseName, parsed.data);
    const record = repos.files.create({
      bookId: book.id,
      fileName: sanitizeUploadFileName(file.originalname) || `${baseName}.json`,
      filePath: path,
      fileType: "application/json",
      fileSize: file.size,
      role: JSON_INDEX_ROLE,
      relatedFileId: null,
      parseStatus: "parsed"
    });
    res.status(201).json({ index: summarizeStoredJsonIndex(record, getActiveQaReferenceId(book.id)) });
  } catch (err) {
    fail(res, 500, err instanceof Error ? err.message : "upload json index failed");
  }
});

// List stored JSON index artifacts for the book (newest first).
app.get("/api/admin/books/:bookId/json-indexes", (req, res) => {
  const book = repos.books.findById(req.params.bookId);
  if (!book) return fail(res, 404, "book not found");
  const activeId = getActiveQaReferenceId(book.id);
  const indexes = repos.files
    .findByBookId(book.id)
    .filter((f) => f.role === JSON_INDEX_ROLE)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((f) => summarizeStoredJsonIndex(f, activeId));
  res.json({ indexes, activeId: activeId || null });
});

// Set a stored JSON index as the active Knowledge QA reference.
app.post("/api/admin/books/:bookId/json-indexes/:indexFileId/set-active-qa-reference", (req, res) => {
  const book = repos.books.findById(req.params.bookId);
  if (!book) return fail(res, 404, "book not found");
  const file = repos.files.findById(req.params.indexFileId);
  if (!file || file.bookId !== book.id || file.role !== JSON_INDEX_ROLE) {
    return fail(res, 404, "JSON index not found");
  }
  setActiveQaReferenceId(book.id, file.id);
  res.json({ activeId: file.id, index: summarizeStoredJsonIndex(file, file.id) });
});

// Stream a stored JSON index file (View / Download).
app.get("/api/admin/books/:bookId/json-indexes/:indexFileId/raw", (req, res) => {
  const file = repos.files.findById(req.params.indexFileId);
  if (!file || file.bookId !== req.params.bookId || file.role !== JSON_INDEX_ROLE) {
    return fail(res, 404, "JSON index not found");
  }
  res.type("application/json").sendFile(file.filePath);
});

// Delete a stored JSON index artifact (never touches the source PDF).
app.delete("/api/admin/books/:bookId/json-indexes/:indexFileId", (req, res) => {
  const book = repos.books.findById(req.params.bookId);
  if (!book) return fail(res, 404, "book not found");
  const file = repos.files.findById(req.params.indexFileId);
  if (!file || file.bookId !== book.id || file.role !== JSON_INDEX_ROLE) {
    return fail(res, 404, "JSON index not found");
  }
  try {
    deleteStoredBookFile(file);
    // Clearing the active reference falls QA back to content-based behavior.
    if (getActiveQaReferenceId(book.id) === file.id) setActiveQaReferenceId(book.id, null);
    res.json({ deleted: true });
  } catch (err) {
    fail(res, 500, err instanceof Error ? err.message : "delete json index failed");
  }
});

app.post("/api/admin/books/:bookId/reader-toc/import", (req, res) => {
  const book = repos.books.findById(req.params.bookId);
  if (!book) return fail(res, 404, "book not found");
  const parsed = readerTocImportPayloadSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, parsed.error.message);

  try {
    const { outline, file } = parseReaderTocImportFromPayload(book.id, parsed.data);
    const path = writeReaderTocArtifact(book.id, file);

    const previous = repos.files.findByBookId(book.id).filter((item) => item.role === READER_TOC_ROLE);
    for (const candidate of previous) {
      deleteStoredBookFile(candidate);
    }

    const record = repos.files.create({
      bookId: book.id,
      fileName: `${file.source}-${Date.now()}.json`,
      filePath: path,
      fileType: "application/json",
      fileSize: Buffer.byteLength(JSON.stringify(file), "utf8"),
      role: READER_TOC_ROLE,
      relatedFileId: null,
      parseStatus: "parsed"
    });

    res.status(201).json({
      source: "manual_toc",
      file: {
        fileId: record.id,
        fileName: record.fileName,
        createdAt: record.createdAt,
        itemCount: summarizeReaderToc(outline).itemCount
      },
      outline
    });
  } catch (err) {
    fail(res, 400, err instanceof Error ? err.message : "import manual TOC failed");
  }
});

app.get("/api/admin/books/:bookId/reader-toc", (req, res) => {
  const book = repos.books.findById(req.params.bookId);
  if (!book) return fail(res, 404, "book not found");

  const latest = findLatestReaderTocFile(book.id);
  if (!latest.file || !latest.outline) {
    return res.json({ source: "manual_toc", file: null, outline: [] as ReaderOutlineNode[] });
  }

  res.json({
    source: "manual_toc",
    file: {
      fileId: latest.file.id,
      fileName: latest.file.fileName,
      createdAt: latest.file.createdAt,
      itemCount: summarizeReaderToc(latest.outline).itemCount
    },
    outline: latest.outline
  });
});

app.delete("/api/admin/books/:bookId/reader-toc", (req, res) => {
  const book = repos.books.findById(req.params.bookId);
  if (!book) return fail(res, 404, "book not found");

  const files = repos.files.findByBookId(book.id).filter((file) => file.role === READER_TOC_ROLE);
  if (files.length === 0) {
    return res.json({ deleted: 0 });
  }

  for (const file of files) {
    deleteStoredBookFile(file);
  }

  res.json({ deleted: files.length });
});

// Generate a compact reader TOC from an already-stored JSON index file. The
// large index never travels through the request body — only its file id + page
// range — so this avoids the 413 that pasting a full sentence index causes.
app.post("/api/admin/books/:bookId/reader-toc/generate-from-json-index", (req, res) => {
  const book = repos.books.findById(req.params.bookId);
  if (!book) return fail(res, 404, "book not found");

  const parsed = generateReaderTocFromIndexInputSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, parsed.error.message);

  const indexFile = repos.files.findById(parsed.data.jsonIndexFileId);
  if (!indexFile || indexFile.bookId !== book.id) return fail(res, 404, "JSON index not found");
  if (indexFile.role !== JSON_INDEX_ROLE) {
    return fail(res, 400, "Selected file is not a json_index file");
  }
  const index = readStoredJsonIndex(indexFile);
  if (!index) return fail(res, 400, "Stored JSON index is not a valid smartbook-pdf-index-v1 file");

  try {
    const { outline, lines, warnings } = buildReaderTocFromIndexItems(
      index.items,
      parsed.data.pageStart,
      parsed.data.pageEnd
    );
    if (outline.length === 0) {
      return fail(
        res,
        400,
        warnings[0] ?? "No chapter/section headings were found in the selected page range."
      );
    }

    const file = {
      schemaVersion: READER_TOC_SCHEMA_VERSION,
      bookId: book.id,
      source: READER_TOC_SOURCE,
      items: toReaderTocInputNodes(outline)
    };
    const path = writeReaderTocArtifact(book.id, file);

    // Replace any previous manual TOC so the latest one is the active source.
    for (const candidate of repos.files.findByBookId(book.id).filter((f) => f.role === READER_TOC_ROLE)) {
      deleteStoredBookFile(candidate);
    }
    const record = repos.files.create({
      bookId: book.id,
      fileName: `${READER_TOC_SOURCE}-${Date.now()}.json`,
      filePath: path,
      fileType: "application/json",
      fileSize: Buffer.byteLength(JSON.stringify(file), "utf8"),
      role: READER_TOC_ROLE,
      relatedFileId: indexFile.id,
      parseStatus: "parsed"
    });

    res.status(201).json({
      source: "manual_toc",
      file: {
        fileId: record.id,
        fileName: record.fileName,
        createdAt: record.createdAt,
        itemCount: summarizeReaderToc(outline).itemCount
      },
      outline,
      textPreview: lines.slice(0, 40).join("\n"),
      warnings
    });
  } catch (err) {
    fail(res, 500, err instanceof Error ? err.message : "generate reader TOC failed");
  }
});

app.post("/api/admin/books/:bookId/files/:fileId/apply-chapters", async (req, res) => {
  const book = repos.books.findById(req.params.bookId);
  if (!book) return fail(res, 404, "book not found");

  const file = repos.files.findById(req.params.fileId);
  if (!file || file.bookId !== book.id) return fail(res, 404, "file not found");
  if (file.role !== "source_document" || !isPdfBookFile(file)) {
    return fail(res, 400, "chapter apply requires a PDF source document");
  }

  const parsed = applyChapterPreviewInputSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, parsed.error.message);

  try {
    const normalizedRows = normalizePreviewRowsForApply(parsed.data.rows);
    const readyRows = normalizedRows
      .filter((row) => row.applyStatus === "ready")
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const hasFileContents = repos.contents.findByBookId(book.id).some((content) => content.fileId === file.id);
    if (!hasFileContents) {
      await replaceParsedContentsForFile(file);
    }

    repos.contents.unlinkChaptersByBookId(book.id);
    repos.chapters.deleteByBookId(book.id);

    repos.chapters.createMany(
      readyRows.map((row, index) => ({
        bookId: book.id,
        title: row.suggestedTitle,
        summary: row.adminNote ?? null,
        orderIndex: index,
        pageStart: row.pageStart,
        pageEnd: row.pageEnd,
        level: row.outlineLevel ?? 0,
        source: row.originalTitle ? "pdf_outline" : "manual",
        status: "draft"
      }))
    );

    const linked = linkChaptersByPageRange(ctx, book.id);
    res.json({
      applied: readyRows.length,
      skipped: normalizedRows.length - readyRows.length,
      linked,
      chapters: enrichChapters(book.id)
    });
  } catch (err) {
    fail(res, 500, err instanceof Error ? err.message : "apply chapters failed");
  }
});

app.get("/api/admin/books/:bookId/contents", (req, res) => {
  res.json({ contents: repos.contents.findByBookId(req.params.bookId) });
});

app.delete("/api/admin/books/:bookId/contents", (req, res) => {
  const book = repos.books.findById(req.params.bookId);
  if (!book) return fail(res, 404, "book not found");

  repos.contents.deleteByBookId(book.id);
  repos.files.resetParseStatusByBookId(book.id, "pending");

  res.json({ cleared: true });
});

// ---- Chapters -------------------------------------------------------------
/** Compute a chapter's content-link status from the book's parsed contents. */
function enrichChapters(bookId: string) {
  const chapters = repos.chapters.findByBookId(bookId);
  const contents = repos.contents.findByBookId(bookId);
  const bookHasContent = contents.length > 0;
  return chapters.map((c) => {
    const linkedContentCount = contents.filter((ct) => ct.chapterId === c.id).length;
    let contentLinkStatus: string;
    if (!bookHasContent) {
      contentLinkStatus = "missing_content";
    } else if (c.pageStart != null && c.pageEnd != null && c.pageEnd < c.pageStart) {
      contentLinkStatus = "page_range_invalid";
    } else if (linkedContentCount > 0) {
      contentLinkStatus = "linked";
    } else {
      contentLinkStatus = "unlinked";
    }
    return { ...c, contentLinkStatus, linkedContentCount };
  });
}

app.get("/api/admin/books/:bookId/chapters", (req, res) => {
  res.json({ chapters: enrichChapters(req.params.bookId) });
});

app.post("/api/admin/books/:bookId/chapters", (req, res) => {
  const parsed = createChapterInputSchema.safeParse({
    ...req.body,
    bookId: req.params.bookId
  });
  if (!parsed.success) return fail(res, 400, parsed.error.message);
  res.status(201).json({ chapter: repos.chapters.create(parsed.data) });
});

app.patch("/api/admin/books/:bookId/chapters/:chapterId", (req, res) => {
  const parsed = updateChapterInputSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, parsed.error.message);
  const chapter = repos.chapters.update(req.params.chapterId, parsed.data);
  if (!chapter) return fail(res, 404, "chapter not found");
  res.json({ chapter });
});

app.delete("/api/admin/books/:bookId/chapters/:chapterId", (req, res) => {
  const chapter = repos.chapters.findById(req.params.chapterId);
  if (!chapter || chapter.bookId !== req.params.bookId) return fail(res, 404, "chapter not found");
  // Detach any content linked to this chapter, then remove it.
  for (const c of repos.contents.findByChapterId(chapter.id)) {
    repos.contents.linkChapter(c.id, null);
  }
  repos.chapters.deleteById(chapter.id);
  res.json({ deleted: true });
});

// Idempotent rebuild: clear existing chapters + links, rebuild from outline
// (or content fallback), then link content by page range.
app.post("/api/admin/books/:bookId/chapters/build", async (req, res) => {
  const book = repos.books.findById(req.params.bookId);
  if (!book) return fail(res, 404, "book not found");
  try {
    repos.contents.unlinkChaptersByBookId(book.id);
    repos.chapters.deleteByBookId(book.id);
    const fromOutline = await buildChaptersFromPdfOutline(ctx, book.id);
    if (fromOutline.length === 0) await buildChaptersFromContents(ctx, book.id);
    linkChaptersByPageRange(ctx, book.id);
    res.json({ chapters: enrichChapters(book.id) });
  } catch (err) {
    fail(res, 500, err instanceof Error ? err.message : "build chapters failed");
  }
});

// Re-link parsed content to chapters by page range (idempotent).
app.post("/api/admin/books/:bookId/chapters/link-content", (req, res) => {
  const book = repos.books.findById(req.params.bookId);
  if (!book) return fail(res, 404, "book not found");
  const linked = linkChaptersByPageRange(ctx, book.id);
  res.json({ linked, chapters: enrichChapters(book.id) });
});

// ---- AI modules -----------------------------------------------------------
app.post("/api/admin/books/:bookId/ai/split-book", async (req, res) => {
  const book = repos.books.findById(req.params.bookId);
  if (!book) return fail(res, 404, "book not found");
  try {
    const { job, result } = await runJob(book.id, "split_book", req.body, () =>
      splitBookIntoChapters(ctx, book.id)
    );
    res.json({ job, chapters: result });
  } catch (err) {
    fail(res, 500, err instanceof Error ? err.message : "split-book failed");
  }
});

app.post("/api/admin/books/:bookId/ai/build-chapters", async (req, res) => {
  const book = repos.books.findById(req.params.bookId);
  if (!book) return fail(res, 404, "book not found");
  try {
    const { job, result } = await runJob(book.id, "build_chapters", req.body, async () => {
      // Idempotent regeneration: clear existing chapters (and their content
      // links) first so pressing "一鍵生成" twice never stacks duplicates.
      repos.contents.unlinkChaptersByBookId(book.id);
      repos.chapters.deleteByBookId(book.id);

      // Prefer the PDF's built-in outline / bookmarks when available.
      const fromOutline = await buildChaptersFromPdfOutline(ctx, book.id);
      const built = fromOutline.length > 0 ? fromOutline : await buildChaptersFromContents(ctx, book.id);
      // Re-link content by page range so chapters report an accurate status.
      linkChaptersByPageRange(ctx, book.id);
      return built;
    });
    res.json({ job, chapters: result });
  } catch (err) {
    fail(res, 500, err instanceof Error ? err.message : "build-chapters failed");
  }
});

app.post("/api/admin/books/:bookId/chapters/:chapterId/ai/summarize", async (req, res) => {
  const book = repos.books.findById(req.params.bookId);
  if (!book) return fail(res, 404, "book not found");
  try {
    const { job, result } = await runJob(
      book.id,
      "summarize_chapter",
      { chapterId: req.params.chapterId },
      () => summarizeChapter(ctx, book.id, req.params.chapterId)
    );
    res.json({ job, chapter: result });
  } catch (err) {
    fail(res, 500, err instanceof Error ? err.message : "summarize failed");
  }
});

app.post("/api/admin/books/:bookId/qa", async (req, res) => {
  const book = repos.books.findById(req.params.bookId);
  if (!book) return fail(res, 404, "book not found");
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, parsed.error.message);
  try {
    const { result } = await runJob(book.id, "book_qa", { question: parsed.data.question }, () =>
      askBookQuestion(ctx, book.id, parsed.data.question)
    );
    res.json({ answer: result.answer, context: result.contextChunks, log: result.log });
  } catch (err) {
    fail(res, 500, err instanceof Error ? err.message : "qa failed");
  }
});

app.post("/api/admin/books/:bookId/qa/import-markdown", (req, res) => {
  const book = repos.books.findById(req.params.bookId);
  if (!book) return fail(res, 404, "book not found");

  const markdown = typeof req.body?.markdown === "string" ? req.body.markdown : "";
  if (!markdown.trim()) return fail(res, 400, "markdown is required");

  const items = parseManualQaMarkdown(markdown);
  if (items.length === 0) {
    return fail(
      res,
      400,
      "no Q/A pairs found; use lines like 'Q: ...' and 'A: ...' in the markdown file"
    );
  }

  const created = repos.qaLogs.createMany(
    items.map((item) => ({
      bookId: book.id,
      question: item.question,
      answer: item.answer,
      contextJson: null,
      provider: "manual",
      model: "markdown"
    }))
  );

  res.status(201).json({ imported: created.length, logs: created });
});

app.get("/api/admin/books/:bookId/ai-jobs", (req, res) => {
  res.json({ jobs: repos.aiJobs.findByBookId(req.params.bookId) });
});

app.get("/api/admin/books/:bookId/qa-logs", (req, res) => {
  res.json({ logs: repos.qaLogs.findByBookId(req.params.bookId) });
});

app.get("/api/admin/notes", (_req, res) => {
  const books = repos.books.findAll();
  const bookMap = new Map(books.map((book) => [book.id, book]));
  const notes = repos.notes
    .findAll()
    .map((note) => toAdminNote(note, bookMap.get(note.bookId) ?? null));
  res.json({ notes });
});

app.get("/api/admin/books/:bookId/notes", (req, res) => {
  const book = repos.books.findById(String(req.params.bookId));
  if (!book) return fail(res, 404, "book not found");
  res.json({
    notes: repos.notes.findByBookId(book.id).map((note) => toAdminNote(note, book))
  });
});

app.delete("/api/admin/books/:bookId/notes/:noteId", (req, res) => {
  const book = repos.books.findById(String(req.params.bookId));
  if (!book) return fail(res, 404, "book not found");
  const note = repos.notes.findById(String(req.params.noteId));
  if (!note || note.bookId !== book.id) return fail(res, 404, "note not found");
  repos.notes.delete(note.id);
  res.json({ deleted: true });
});

// ---- Student read-only API -----------------------------------------------
app.get("/api/student/books", (_req, res) => {
  res.json({ mode: "repo-api", books: repos.books.findPublished() });
});

app.get("/api/student/books/:bookId", (req, res) => {
  const book = findPublishedBook(String(req.params.bookId));
  if (!book) return fail(res, 404, "book not found");
  const chapters = repos.chapters.findByBookId(book.id);
  const pdfFile = findPrimaryPdfSourceFile(book.id);
  res.json({
    book: {
      ...book,
      chapters,
      pdfFileId: pdfFile?.id ?? null,
      pdfFileName: pdfFile?.fileName ?? null
    }
  });
});

app.get("/api/student/books/:bookId/outline", async (req, res) => {
  const book = findPublishedBook(String(req.params.bookId));
  if (!book) return fail(res, 404, "book not found");

  const manualToc = findLatestReaderTocFile(book.id);
  if (manualToc.outline && manualToc.outline.length > 0) {
    return res.json({ bookId: book.id, source: "manual_toc", outline: manualToc.outline });
  }

  const jsonIndexFiles = repos.files
    .findByBookId(book.id)
    .filter((file) => file.role === JSON_INDEX_ROLE)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const activeId = getActiveQaReferenceId(book.id);
  const candidates = [
    ...jsonIndexFiles.filter((file) => {
      const index = readStoredJsonIndex(file);
      return index?.level === "chapter";
    }),
    ...jsonIndexFiles.filter((file) => file.id === activeId),
    ...jsonIndexFiles
  ];
  const seen = new Set<string>();

  for (const file of candidates) {
    if (seen.has(file.id)) continue;
    seen.add(file.id);
    const index = readStoredJsonIndex(file);
    if (!index) continue;
    const outline = normalizeReaderOutline(index, "split_json");
    if (outline.length > 0 && isStructuredReaderOutline(outline)) {
      return res.json({ bookId: book.id, source: "split_json", outline });
    }
  }

  const chapters = repos.chapters.findByBookId(book.id);
  const outline = normalizeChaptersToReaderOutline(chapters, "chapter_table");
  if (outline.length > 0 && isStructuredReaderOutline(outline)) {
    return res.json({ bookId: book.id, source: "chapter_table", outline });
  }

  const sourcePdf = findPrimaryPdfSourceFile(book.id);
  if (sourcePdf && isPdfBookFile(sourcePdf) && existsSync(sourcePdf.filePath)) {
    const fallbackEntries = await extractPdfOutline(sourcePdf.filePath);
    const fallbackOutline = normalizeReaderOutline(
      fallbackEntries.map((entry, index) => ({
        id: `pdf-outline-${index + 1}`,
        title: entry.title,
        level: (entry.level ?? 0) + 1,
        page: entry.pageNumber,
        pdfPage: entry.pageNumber,
        displayPage: entry.pageNumber != null ? String(entry.pageNumber) : null,
        children: [],
        source: "pdf_outline" as const
      })),
      "pdf_outline"
    );
    if (fallbackOutline.length > 0) {
      return res.json({ bookId: book.id, source: "pdf_outline", outline: fallbackOutline });
    }
  }

  res.json({ bookId: book.id, source: "fallback", outline: [] });
});

app.get("/api/student/books/:bookId/contents", (req, res) => {
  const book = findPublishedBook(String(req.params.bookId));
  if (!book) return fail(res, 404, "book not found");
  res.json({ contents: repos.contents.findByBookId(book.id) });
});

// ---- Smart Notes (text / ai_answer / canvas) -----------------------------
// Notes are scoped to a published book and optionally to chapter/page context.
app.get("/api/student/books/:bookId/notes", (req, res) => {
  const book = findPublishedBook(String(req.params.bookId));
  if (!book) return fail(res, 404, "book not found");
  res.json({ notes: repos.notes.findByBookId(book.id) });
});

app.post("/api/student/books/:bookId/notes", (req, res) => {
  const book = findPublishedBook(String(req.params.bookId));
  if (!book) return fail(res, 404, "book not found");
  const parsed = createSmartBookNoteInputSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, parsed.error.message);
  if (parsed.data.type === "canvas" && !parsed.data.canvasData) {
    return fail(res, 400, "canvas notes require canvasData");
  }
  if (parsed.data.type !== "canvas" && !parsed.data.content?.trim()) {
    return fail(res, 400, "text/ai_answer notes require content");
  }
  res.status(201).json({ note: repos.notes.create(book.id, parsed.data) });
});

app.patch("/api/student/books/:bookId/notes/:noteId", (req, res) => {
  const book = findPublishedBook(String(req.params.bookId));
  if (!book) return fail(res, 404, "book not found");
  const note = repos.notes.findById(String(req.params.noteId));
  if (!note || note.bookId !== book.id) return fail(res, 404, "note not found");
  const parsed = updateSmartBookNoteInputSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, parsed.error.message);
  res.json({ note: repos.notes.update(note.id, parsed.data) });
});

app.delete("/api/student/books/:bookId/notes/:noteId", (req, res) => {
  const book = findPublishedBook(String(req.params.bookId));
  if (!book) return fail(res, 404, "book not found");
  const note = repos.notes.findById(String(req.params.noteId));
  if (!note || note.bookId !== book.id) return fail(res, 404, "note not found");
  repos.notes.delete(note.id);
  res.json({ deleted: true });
});

app.get("/api/student/books/:bookId/notes/:noteId/navigate", (req, res) => {
  const book = findPublishedBook(String(req.params.bookId));
  if (!book) return fail(res, 404, "book not found");
  const note = repos.notes.findById(String(req.params.noteId));
  if (!note || note.bookId !== book.id) return fail(res, 404, "note not found");
  const hasNavigation = note.pageNumber != null || note.chapterId != null;
  return res.json({
    noteId: note.id,
    bookId: note.bookId,
    chapterId: note.chapterId,
    pageNumber: note.pageNumber,
    sourceMessageId: note.sourceMessageId,
    anchor: hasNavigation,
    fallback: hasNavigation ? null : "此筆記沒有頁碼或章節資訊"
  });
});

app.post("/api/student/books/:bookId/session", (req, res) => {
  const book = findPublishedBook(String(req.params.bookId));
  if (!book) return fail(res, 404, "book not found");

  const resolved = resolveStudentSession(req, res, book.id, {
    allowCreate: true,
    title: `Reader session · ${book.title}`,
    sessionIdOverride:
      typeof req.body?.sessionId === "string" && req.body.sessionId.trim() !== ""
        ? req.body.sessionId.trim()
        : null
  });
  if (!resolved) return;

  res.json({ sessionId: resolved.session.id });
});

app.get("/api/student/books/:bookId/files/:fileId/pdf-view", (req, res) => {
  const book = findPublishedBook(String(req.params.bookId));
  if (!book) return fail(res, 404, "book not found");

  const resolved = resolveStudentSession(req, res, book.id, { allowCreate: false });
  if (!resolved) return;

  const file = repos.files.findById(String(req.params.fileId));
  if (!file || file.bookId !== book.id) return fail(res, 404, "file not found");
  if (file.role !== "source_document" || !isPdfBookFile(file)) {
    return fail(res, 400, "file is not a PDF source document");
  }
  if (!existsSync(file.filePath)) return fail(res, 404, "file not found");

  repos.pdfAccessLogs.create({
    bookId: book.id,
    fileId: file.id,
    sessionId: resolved.session.id,
    ipAddress: resolved.clientInfo.ipAddress ?? null,
    userAgent: resolved.clientInfo.userAgent ?? null
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'inline; filename="reader.pdf"');
  res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.sendFile(file.filePath);
});

const BLOCKED_MESSAGE = "This account/session has been blocked by the administrator.";

/**
 * Reject (HTTP 403) a student request that must be blocked: either the referenced
 * session is explicitly blocked, or the resolved public IP matches a blocked
 * session. Private/local IPs are never IP-matched (that would block all
 * localhost dev), so for those only the explicit session block applies.
 * Returns true when a response was already sent.
 */
function rejectIfBlocked(req: Request, res: Response, session: ChatSession | null): boolean {
  if (session?.isBlocked) {
    fail(res, 403, BLOCKED_MESSAGE);
    return true;
  }
  const { ip } = resolveClientIp(req);
  if (ip && !isPrivateIp(ip) && repos.chat.isIpBlocked(ip)) {
    fail(res, 403, BLOCKED_MESSAGE);
    return true;
  }
  return false;
}

app.post("/api/student/books/:bookId/chat", (req, res) => {
  const book = findPublishedBook(String(req.params.bookId));
  if (!book) return fail(res, 404, "book not found");
  // Accept both { message } (student UX) and { question } (legacy) bodies.
  const parsed = studentChatRequestSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, parsed.error.message);
  const question = parsed.data.message ?? parsed.data.question ?? "";
  if (!question.trim()) return fail(res, 400, "message is required");

  // Resolve or create a chat session bound to this book.
  let sessionId = parsed.data.sessionId;
  const requestClientInfo = parseClientInfo(req);

  // Enforce admin blocks before doing any work: reject a blocked session, or a
  // brand-new session opened from an already-blocked public IP.
  const existingSession = sessionId ? repos.chat.findSessionById(sessionId) : null;
  if (rejectIfBlocked(req, res, existingSession)) return;

  if (sessionId) {
    const session = existingSession;
    if (!session || session.bookId !== book.id) {
      sessionId = undefined;
    } else {
      repos.chat.updateSessionClientInfo(session.id, enrichSessionClientInfo(session, requestClientInfo));
    }
  }
  if (!sessionId) {
    sessionId = repos.chat.createSession({
      bookId: book.id,
      title: question.slice(0, 40),
      ...enrichSessionClientInfo(null, requestClientInfo)
    }).id;
  }

  // When a chapter is selected but has no linked content, tell the student to
  // re-link it in the admin instead of silently searching the whole book.
  const chapterId = parsed.data.chapterId;
  if (chapterId) {
    const chapter = repos.chapters.findById(chapterId);
    const chapterLinked =
      chapter && chapter.bookId === book.id
        ? repos.contents.findByChapterId(chapterId).length > 0
        : false;
    if (chapter && chapter.bookId === book.id && !chapterLinked) {
      const notice = "此章尚未建立可問答內容，請回後台重新連結內容。";
      repos.chat.addMessage({ sessionId, role: "user", content: question });
      repos.chat.addMessage({ sessionId, role: "assistant", content: notice });
      return res.json({
        sessionId,
        answer: notice,
        chatMode: "chapter-unlinked",
        source: "chapter_unlinked",
        provider: "system",
        model: "local",
        messages: repos.chat.findMessages(sessionId)
      });
    }
  }

  const manualAnswer = findManualQaAnswer(book.id, question);
  const result = manualAnswer
    ? {
        answer: `以下為老師整理的 Q&A：\n${manualAnswer.answer}`,
        chatMode: "manual-qa",
        source: "manual_qa",
        provider: "manual",
        model: "markdown",
        matchedQuestion: manualAnswer.question
      }
    : {
        ...keywordChat(question, book.id, chapterId),
        chatMode: "keyword",
        source: chapterId ? "chapter_contents" : "book_contents",
        provider: "keyword",
        model: "local"
      };
  repos.chat.addMessage({ sessionId, role: "user", content: question });
  repos.chat.addMessage({ sessionId, role: "assistant", content: result.answer });

  res.json({
    sessionId,
    ...result,
    messages: repos.chat.findMessages(sessionId)
  });
});

app.get("/api/student/books/:bookId/chat-sessions/:sessionId", (req, res) => {
  const book = findPublishedBook(String(req.params.bookId));
  if (!book) return fail(res, 404, "book not found");
  const session = repos.chat.findSessionById(String(req.params.sessionId));
  // Only expose sessions that belong to this published book.
  if (!session || session.bookId !== book.id) return fail(res, 404, "session not found");
  if (rejectIfBlocked(req, res, session)) return;
  repos.chat.updateSessionClientInfo(session.id, enrichSessionClientInfo(session, parseClientInfo(req)));
  res.json({ sessionId: session.id, messages: repos.chat.findMessages(session.id) });
});

// ---- Admin dashboard / accounts ------------------------------------------
// There is no dedicated users/accounts table. "Accounts" are derived from chat
// sessions (one visitor session = one account proxy), with client info stored
// on the session from request headers.
const ONLINE_WINDOW_MS = 15 * 60 * 1000;

/** Local-timezone YYYY-MM-DD key (avoids UTC cross-day miscounts). */
function localDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Inclusive lower bound (ms epoch) for a dashboard range filter. */
function rangeStartMs(range: string): number {
  const now = Date.now();
  if (range === "week") return now - 7 * 86_400_000;
  if (range === "month") return now - 30 * 86_400_000;
  return 0; // "all"
}

/** Last-activity time per session = latest message, else session createdAt. */
function lastSeenBySession(messages: { sessionId: string; createdAt: string }[]) {
  const map = new Map<string, number>();
  for (const m of messages) {
    const t = Date.parse(m.createdAt);
    if (t > (map.get(m.sessionId) ?? 0)) map.set(m.sessionId, t);
  }
  return map;
}

function sessionLastActivityMs(session: ChatSession, messageLastSeen: Map<string, number>) {
  const fromSession = Date.parse(session.lastSeenAt || session.createdAt);
  const fromMessages = messageLastSeen.get(session.id) ?? 0;
  return Math.max(fromSession, fromMessages);
}

app.get("/api/admin/dashboard/stats", (req, res) => {
  const range = String(req.query.range || "month");
  const sessions = repos.chat.listSessions();
  const messages = repos.chat.listAllMessages();
  const now = Date.now();
  const lastSeen = lastSeenBySession(messages);

  // One account proxy per session (no real user identity is tracked).
  const accountLast = sessions.map((s) => sessionLastActivityMs(s, lastSeen));
  const totalUsers = accountLast.length;
  const activeUsers = accountLast.filter((t) => now - t <= ONLINE_WINDOW_MS).length;
  const totalConversations = sessions.length;
  const totalMessages = messages.length;

  // Daily trend = student question records per local day, within range. This is
  // the same source as the student-question list so the two always agree.
  const start = rangeStartMs(range);
  const dayMap = new Map<string, number>();
  for (const m of messages) {
    if (m.role !== "user") continue;
    if (Date.parse(m.createdAt) < start) continue;
    const key = localDateKey(m.createdAt);
    dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
  }
  const dailyConversations = [...dayMap.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json({ totalUsers, activeUsers, totalConversations, totalMessages, dailyConversations });
});

app.get("/api/admin/accounts", (_req, res) => {
  const sessions = repos.chat.listSessions();
  const messages = repos.chat.listAllMessages();
  const now = Date.now();
  const lastSeen = lastSeenBySession(messages);

  const accounts = sessions
    .map((s) => {
      const last = sessionLastActivityMs(s, lastSeen);
      return {
        id: s.userId || s.id,
        // Admin management actions always target the session row id.
        sessionId: s.id,
        name: s.title?.trim() || "匿名訪客",
        loginMethod: s.userId ? "帳號登入" : "匿名進入",
        osName: s.osName || "未知",
        deviceType: s.deviceType || "未知",
        browserName: s.browserName || "未知",
        ipAddress: s.lastIpAddress ?? null,
        ipLocation: describeIpLocation(s),
        riskLevel: (s.riskLevel as "safe" | "risk" | "dangerous") || "safe",
        riskNote: s.riskNote ?? null,
        isBlocked: !!s.isBlocked,
        blockedReason: s.blockedReason ?? null,
        blockedAt: s.blockedAt ?? null,
        lastSeenAt: new Date(last).toISOString(),
        online: now - last <= ONLINE_WINDOW_MS
      };
    })
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));

  res.json({ accounts });
});

// Admin-only: set the risk marking (safe / risk / dangerous) for a session.
app.patch("/api/admin/accounts/:sessionId/risk", (req, res) => {
  const parsed = setRiskLevelInputSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, parsed.error.message);
  const session = repos.chat.findSessionById(String(req.params.sessionId));
  if (!session) return fail(res, 404, "account not found");
  const updated = repos.chat.setRiskLevel(session.id, parsed.data.riskLevel, parsed.data.note ?? null);
  res.json({ account: updated });
});

// Admin-only: block / unblock a session. A blocked session (and any other
// session sharing its public IP) is rejected by the student-facing endpoints.
app.patch("/api/admin/accounts/:sessionId/block", (req, res) => {
  const parsed = blockAccountInputSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, parsed.error.message);
  const session = repos.chat.findSessionById(String(req.params.sessionId));
  if (!session) return fail(res, 404, "account not found");
  const updated = repos.chat.setBlocked(session.id, parsed.data.blocked, parsed.data.reason ?? null);
  res.json({ account: updated });
});

app.get("/api/admin/student-questions", (_req, res) => {
  const sessions = repos.chat.listSessions();
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const bookById = new Map(repos.books.findAll().map((b) => [b.id, b]));
  const messages = repos.chat.listAllMessages();

  const questions = messages
    .filter((m) => m.role === "user")
    .map((m) => {
      const session = sessionById.get(m.sessionId);
      const book = session ? bookById.get(session.bookId) : undefined;
      return {
        id: m.id,
        sessionId: m.sessionId,
        student: "匿名訪客",
        subject: book?.category || "未分類",
        content: m.content,
        createdAt: m.createdAt
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  res.json({ questions });
});

app.delete("/api/admin/student-questions/:id", (req, res) => {
  repos.chat.deleteMessage(String(req.params.id));
  res.json({ deleted: true });
});

app.post("/api/admin/student-questions/delete", (req, res) => {
  const ids = Array.isArray(req.body?.ids)
    ? (req.body.ids as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  for (const id of ids) repos.chat.deleteMessage(id);
  res.json({ deleted: ids.length });
});

// ---- Appearance settings -------------------------------------------------
// Public read (admin + student); admin-only update. Missing settings fall back
// to defaults so the UI never blanks out.
app.get("/api/appearance-settings", (_req, res) => {
  res.json({ settings: loadAppearance() });
});

app.put("/api/admin/appearance-settings", (req, res) => {
  const parsed = appearanceSettingsUpdateSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, parsed.error.message);
  const merged = appearanceSettingsSchema.parse({ ...loadAppearance(), ...parsed.data });
  repos.settings.set(APPEARANCE_KEY, JSON.stringify(merged));
  res.json({ settings: merged });
});

app.post("/api/admin/appearance-settings/upload", appearanceUpload.single("file"), (req, res) => {
  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) return fail(res, 400, "image is required (png/jpg/jpeg/webp/svg, <=2MB)");
  res.status(201).json({ url: `/api/uploads/appearance/${file.filename}` });
});

// ---- Question Bank JSON Import -------------------------------------------

const qbiUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

app.post("/api/admin/import/question-bank/jobs", qbiUpload.single("file"), (req, res) => {
  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) return fail(res, 400, "JSON file is required (multipart field 'file')");

  let raw: unknown;
  try {
    raw = JSON.parse(file.buffer.toString("utf8"));
  } catch {
    return fail(res, 400, "invalid JSON: could not parse file");
  }

  const parsed = questionBankJsonFileSchema.safeParse(raw);
  if (!parsed.success) return fail(res, 400, `invalid question bank JSON: ${parsed.error.message}`);

  const items = Array.isArray(parsed.data) ? parsed.data : parsed.data.questions;
  const errors: { index: number; message: string }[] = [];

  items.forEach((item, i) => {
    const hasNumber = item.question_number != null || item.questionNumber != null || item.number != null;
    if (!hasNumber) errors.push({ index: i, message: "missing question number" });
    if (!item.question?.trim()) errors.push({ index: i, message: "missing question text" });
  });

  const validRecords = items.length - new Set(errors.map((e) => e.index)).size;
  const jobStatus = errors.length === items.length && items.length > 0 ? "failed" : "done";

  const job = repos.questionBankImports.create({
    fileName: file.originalname,
    status: jobStatus,
    totalRecords: items.length,
    validRecords,
    invalidRecords: new Set(errors.map((e) => e.index)).size,
    resultJson: JSON.stringify({ errors }),
    errorMessage: jobStatus === "failed" ? "all records are invalid" : null
  });

  res.status(201).json({ job, errors });
});

app.get("/api/admin/import/question-bank/jobs", (_req, res) => {
  const jobs: QuestionBankImportJob[] = repos.questionBankImports.findRecent(20);
  res.json({ jobs });
});

app.get("/api/admin/import/question-bank/jobs/:jobId", (req, res) => {
  const job = repos.questionBankImports.findById(req.params.jobId);
  if (!job) return fail(res, 404, "job not found");
  res.json({ job });
});

// ── Smart Solve JSON Import ──────────────────────────────────────────────────
const ssUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.post(
  "/api/admin/books/:bookId/imports/smart-solve/jobs",
  ssUpload.single("file"),
  (req, res) => {
    const bookId = String(req.params.bookId);
    const book = repos.books.findById(bookId);
    if (!book) return fail(res, 404, "book not found");

    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) return fail(res, 400, "file is required");

    let parsed: unknown;
    try {
      parsed = JSON.parse(file.buffer.toString("utf-8"));
    } catch {
      return fail(res, 400, "invalid JSON: could not parse file");
    }

    const fileResult = smartSolveJsonFileSchema.safeParse(parsed);
    if (!fileResult.success) {
      return res.status(400).json({
        error: "file schema validation failed",
        issues: fileResult.error.issues.slice(0, 10).map((i) => ({
          path: i.path.join("."),
          message: i.message
        }))
      });
    }

    const fileData = fileResult.data;
    const rawItems = Array.isArray(fileData) ? fileData : fileData.items;

    // Fetch chapters for scope mapping
    const chapters = repos.chapters.findByBookId(bookId);

    const itemInputs: Parameters<typeof repos.smartSolveImports.createItems>[0] = [];
    let validCount = 0;
    let mappedCount = 0;
    let unmappedCount = 0;
    let invalidCount = 0;

    for (const item of rawItems) {
      const itemResult = (() => {
        if (!item.prompt || item.prompt.trim() === "") {
          return { ok: false, reason: "prompt is required" };
        }
        return { ok: true };
      })();

      if (!itemResult.ok) {
        invalidCount++;
        itemInputs.push({
          jobId: "",
          bookId,
          prompt: item.prompt ?? "",
          externalId: item.externalId ?? null,
          title: item.title ?? null,
          status: "invalid",
          errorJson: JSON.stringify({ reason: itemResult.reason })
        });
        continue;
      }

      validCount++;

      // Scope mapping: try chapterId, then chapterTitle, then page range
      let itemStatus: "mapped" | "unmapped" = "unmapped";
      const scope = item.scope;
      if (scope && chapters.length > 0) {
        const chapterById = scope.chapterId
          ? chapters.find((c) => c.id === scope.chapterId)
          : undefined;
        const chapterByTitle =
          !chapterById && scope.chapterTitle
            ? chapters.find(
                (c) => c.title.toLowerCase() === scope.chapterTitle!.toLowerCase()
              )
            : undefined;
        const chapterByPage =
          !chapterById && !chapterByTitle && scope.pageStart != null
            ? chapters.find(
                (c) =>
                  c.pageStart != null &&
                  c.pageEnd != null &&
                  scope.pageStart! >= c.pageStart &&
                  scope.pageStart! <= c.pageEnd
              )
            : undefined;

        if (chapterById || chapterByTitle || chapterByPage) {
          itemStatus = "mapped";
          mappedCount++;
        } else {
          unmappedCount++;
        }
      } else if (scope) {
        unmappedCount++;
      } else {
        unmappedCount++;
      }

      itemInputs.push({
        jobId: "",
        bookId,
        externalId: item.externalId ?? null,
        title: item.title ?? null,
        prompt: item.prompt,
        solution: item.solution ?? null,
        explanation: item.explanation ?? null,
        skill: item.skill ?? null,
        difficulty: item.difficulty ?? null,
        scopeJson: scope ? JSON.stringify(scope) : null,
        tagsJson: item.tags ? JSON.stringify(item.tags) : null,
        metadataJson: item.metadata ? JSON.stringify(item.metadata) : null,
        status: itemStatus
      });
    }

    const totalRecords = rawItems.length;
    const resultSummary = {
      totalRecords,
      validRecords: validCount,
      mappedRecords: mappedCount,
      unmappedRecords: unmappedCount,
      invalidRecords: invalidCount
    };

    const job = repos.smartSolveImports.createJob({
      bookId,
      fileName: file.originalname,
      status: invalidCount === totalRecords ? "failed" : "done",
      totalRecords,
      validRecords: validCount,
      mappedRecords: mappedCount,
      unmappedRecords: unmappedCount,
      invalidRecords: invalidCount,
      resultJson: JSON.stringify(resultSummary)
    });

    // Insert items with jobId filled in
    const itemsWithJobId = itemInputs.map((i) => ({ ...i, jobId: job.id }));
    repos.smartSolveImports.createItems(itemsWithJobId);

    return res.status(201).json({ job, summary: resultSummary });
  }
);

app.get("/api/admin/books/:bookId/imports/smart-solve/jobs", (req, res) => {
  const bookId = String(req.params.bookId);
  const book = repos.books.findById(bookId);
  if (!book) return fail(res, 404, "book not found");
  const jobs = repos.smartSolveImports.findJobsByBook(bookId, 20);
  return res.json({ jobs });
});

app.get("/api/admin/books/:bookId/imports/smart-solve/jobs/:jobId", (req, res) => {
  const bookId = String(req.params.bookId);
  const jobId = String(req.params.jobId);
  const book = repos.books.findById(bookId);
  if (!book) return fail(res, 404, "book not found");
  const job = repos.smartSolveImports.findJobById(jobId);
  if (!job || job.bookId !== bookId) return fail(res, 404, "job not found");
  const items = repos.smartSolveImports.findItemsByJob(jobId);
  return res.json({ job, items });
});

// ---- Book JSON artifact generation ----------------------------------------

function toArtifactDownloadUrl(bookId: string, artifactId: string): string {
  return `/api/admin/books/${bookId}/json-artifacts/${artifactId}/download`;
}

function artifactSummary(a: BookJsonArtifact, bookId: string) {
  return {
    id: a.id,
    bookId: a.bookId,
    artifactType: a.artifactType,
    fileName: a.fileName,
    recordCount: a.recordCount,
    status: a.status,
    errorMessage: a.errorMessage,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    downloadUrl: toArtifactDownloadUrl(bookId, a.id)
  };
}

/** Build page-index.json from book_contents rows. */
function buildPageIndex(bookId: string, contents: Array<{ pageNumber?: number | null; contentText: string }>) {
  return contents
    .filter((c) => c.pageNumber != null)
    .map((c) => ({
      bookId,
      pageNumber: c.pageNumber as number,
      pdfPage: c.pageNumber as number,
      text: c.contentText.slice(0, 2000)
    }));
}

/** Build sentence-index.json — one entry per content row. */
function buildSentenceIndex(
  bookId: string,
  contents: Array<{ pageNumber?: number | null; contentText: string; chapterId?: string | null }>,
  chapters: Array<{ id: string; title: string }>
) {
  const chapterMap = new Map(chapters.map((c) => [c.id, c.title]));
  return contents.map((c, i) => ({
    id: `sent-${String(i + 1).padStart(4, "0")}`,
    bookId,
    pageNumber: c.pageNumber ?? 0,
    chapterTitle: c.chapterId ? (chapterMap.get(c.chapterId) ?? "") : "",
    text: c.contentText.slice(0, 1000)
  }));
}

/** Generate 4 JSON artifacts for a book, write to disk, and record in DB. */
function generateAllArtifacts(bookId: string) {
  const contents = repos.contents.findByBookId(bookId);
  const chapters = repos.chapters.findByBookId(bookId);

  const dir = resolve(GENERATED_JSON_ROOT, bookId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  // Remove old artifact records for this book so re-generation is clean.
  repos.jsonArtifacts.deleteByBookId(bookId);

  const results: BookJsonArtifact[] = [];

  const tasks: Array<{
    type: ArtifactType;
    fileName: string;
    data: () => unknown;
    count: () => number;
  }> = [
    {
      type: "page-index",
      fileName: "page-index.json",
      data: () => buildPageIndex(bookId, contents),
      count: () => contents.filter((c) => c.pageNumber != null).length
    },
    {
      type: "sentence-index",
      fileName: "sentence-index.json",
      data: () => buildSentenceIndex(bookId, contents, chapters),
      count: () => contents.length
    },
    {
      type: "question-bank-candidates",
      fileName: "question-bank-candidates.json",
      data: () => ({
        source: "book_parse",
        bookId,
        questions: [],
        notice: "No rule-based questions detected. Use PDF Screenshot Ask AI or OCR pipeline to generate questions."
      }),
      count: () => 0
    },
    {
      type: "smart-solve-candidates",
      fileName: "smart-solve-candidates.json",
      data: () => ({
        source: "book_parse",
        bookId,
        items: chapters.map((ch, i) => ({
          externalId: `ss-${String(i + 1).padStart(3, "0")}`,
          prompt: `請解釋「${ch.title}」的主要概念。`,
          solution: "",
          explanation: "",
          scope: {
            chapterTitle: ch.title,
            pageStart: ch.pageStart ?? null
          },
          tags: ["auto", "candidate"],
          confidence: 0.5,
          status: "candidate"
        })),
        notice: chapters.length === 0
          ? "No chapters found. Add chapters before generating smart-solve candidates."
          : undefined
      }),
      count: () => chapters.length
    }
  ];

  for (const task of tasks) {
    const filePath = resolve(dir, task.fileName);
    try {
      const data = task.data();
      writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
      const artifact = repos.jsonArtifacts.create({
        bookId,
        artifactType: task.type,
        fileName: task.fileName,
        filePath,
        recordCount: task.count(),
        status: "done"
      });
      results.push(artifact);
    } catch (err) {
      const artifact = repos.jsonArtifacts.create({
        bookId,
        artifactType: task.type,
        fileName: task.fileName,
        filePath,
        recordCount: 0,
        status: "error",
        errorMessage: String(err)
      });
      results.push(artifact);
    }
  }

  return results;
}

// POST /api/admin/books/:bookId/json-artifacts/generate
app.post("/api/admin/books/:bookId/json-artifacts/generate", (req, res) => {
  const bookId = String(req.params.bookId);
  const book = repos.books.findById(bookId);
  if (!book) return fail(res, 404, "book not found");

  const artifacts = generateAllArtifacts(bookId);
  return res.status(201).json({
    bookId,
    artifacts: artifacts.map((a) => artifactSummary(a, bookId))
  });
});

// GET /api/admin/books/:bookId/json-artifacts
app.get("/api/admin/books/:bookId/json-artifacts", (req, res) => {
  const bookId = String(req.params.bookId);
  const book = repos.books.findById(bookId);
  if (!book) return fail(res, 404, "book not found");
  const artifacts = repos.jsonArtifacts.findByBookId(bookId);
  return res.json({ artifacts: artifacts.map((a) => artifactSummary(a, bookId)) });
});

// GET /api/admin/books/:bookId/json-artifacts/:artifactId/download
app.get("/api/admin/books/:bookId/json-artifacts/:artifactId/download", (req, res) => {
  const bookId = String(req.params.bookId);
  const artifactId = String(req.params.artifactId);
  const book = repos.books.findById(bookId);
  if (!book) return fail(res, 404, "book not found");
  const artifact = repos.jsonArtifacts.findById(artifactId);
  if (!artifact || artifact.bookId !== bookId) return fail(res, 404, "artifact not found");
  if (!existsSync(artifact.filePath)) return fail(res, 404, "artifact file missing — please regenerate");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${artifact.fileName}"`);
  createReadStream(artifact.filePath).pipe(res);
});

// DELETE /api/admin/books/:bookId/json-artifacts/:artifactId
app.delete("/api/admin/books/:bookId/json-artifacts/:artifactId", (req, res) => {
  const bookId = String(req.params.bookId);
  const artifactId = String(req.params.artifactId);
  const book = repos.books.findById(bookId);
  if (!book) return fail(res, 404, "book not found");
  const artifact = repos.jsonArtifacts.findById(artifactId);
  if (!artifact || artifact.bookId !== bookId) return fail(res, 404, "artifact not found");
  if (existsSync(artifact.filePath)) {
    try { unlinkSync(artifact.filePath); } catch { /* ignore */ }
  }
  repos.jsonArtifacts.deleteById(artifactId);
  return res.json({ deleted: true });
});

const port = Number(process.env.ADMIN_API_PORT || 4300);
app.listen(port, () => {
  console.log(
    `AI-adm-D1 admin API listening on ${port} (ai provider: ${ai.name}, db: ${resolveDbPath()})`
  );
});
