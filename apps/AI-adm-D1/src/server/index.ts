import { existsSync, mkdirSync, unlinkSync } from "node:fs";
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
  linkChaptersByPageRange,
  summarizeChapter,
  askBookQuestion,
  type BookCoreContext
} from "@ai-smartbook/book-core";
import {
  createBookInputSchema,
  updateBookInputSchema,
  createChapterInputSchema,
  updateChapterInputSchema,
  chatRequestSchema,
  studentChatRequestSchema,
  appearanceSettingsSchema,
  appearanceSettingsUpdateSchema,
  DEFAULT_APPEARANCE,
  type AiJobType,
  type BookAiJob,
  type ChatSession
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
};

function headerValue(req: Request, name: string): string {
  const value = req.headers[name];
  return Array.isArray(value) ? value.join(", ") : typeof value === "string" ? value : "";
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

  return {
    userAgent: userAgent || null,
    browserName: browser.name,
    browserVersion: browser.version,
    osName: os.name,
    osVersion: os.version,
    deviceType,
    deviceVendor: device.vendor,
    deviceModel: device.model
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
    deviceModel: keep(existing?.deviceModel, next.deviceModel)
  };
}

function findPublishedBook(bookId: string) {
  const book = repos.books.findById(bookId);
  if (!book || book.status !== "published") return null;
  return book;
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

  const record = repos.files.create({
    bookId: book.id,
    fileName: displayName,
    filePath: file.path,
    fileType: file.mimetype || "application/octet-stream",
    fileSize: file.size,
    parseStatus: "pending"
  });
  res.status(201).json({ file: record });
});

app.delete("/api/admin/books/:bookId/files/:fileId", (req, res) => {
  const file = repos.files.findById(req.params.fileId);
  if (!file || file.bookId !== req.params.bookId) return fail(res, 404, "file not found");

  if (existsSync(file.filePath)) {
    try {
      unlinkSync(file.filePath);
    } catch (err) {
      return fail(res, 500, err instanceof Error ? err.message : "delete file failed");
    }
  }

  repos.contents.deleteByFileId(file.id);
  repos.files.delete(file.id);

  res.json({ deleted: true });
});

app.post("/api/admin/books/:bookId/files/:fileId/parse", async (req, res) => {
  const file = repos.files.findById(req.params.fileId);
  if (!file || file.bookId !== req.params.bookId) return fail(res, 404, "file not found");

  try {
    const { contents, pageCount } = await parsePdfToContents(
      file.filePath,
      file.bookId,
      file.id
    );
    repos.contents.createMany(contents);
    repos.files.updateParseStatus(file.id, "parsed");
    res.json({ parsed: contents.length, pageCount, fileId: file.id });
  } catch (err) {
    repos.files.updateParseStatus(file.id, "failed");
    fail(res, 500, err instanceof Error ? err.message : "parse failed");
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

// ---- Student read-only API -----------------------------------------------
app.get("/api/student/books", (_req, res) => {
  res.json({ mode: "repo-api", books: repos.books.findPublished() });
});

app.get("/api/student/books/:bookId", (req, res) => {
  const book = findPublishedBook(String(req.params.bookId));
  if (!book) return fail(res, 404, "book not found");
  const chapters = repos.chapters.findByBookId(book.id);
  res.json({ book: { ...book, chapters } });
});

app.get("/api/student/books/:bookId/contents", (req, res) => {
  const book = findPublishedBook(String(req.params.bookId));
  if (!book) return fail(res, 404, "book not found");
  res.json({ contents: repos.contents.findByBookId(book.id) });
});

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
  if (sessionId) {
    const session = repos.chat.findSessionById(sessionId);
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
        name: s.title?.trim() || "匿名訪客",
        loginMethod: s.userId ? "帳號登入" : "匿名進入",
        osName: s.osName || "未知",
        deviceType: s.deviceType || "未知",
        browserName: s.browserName || "未知",
        lastSeenAt: new Date(last).toISOString(),
        online: now - last <= ONLINE_WINDOW_MS
      };
    })
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));

  res.json({ accounts });
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

const port = Number(process.env.ADMIN_API_PORT || 4300);
app.listen(port, () => {
  console.log(
    `AI-adm-D1 admin API listening on ${port} (ai provider: ${ai.name}, db: ${resolveDbPath()})`
  );
});
