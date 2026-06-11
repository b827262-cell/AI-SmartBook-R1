import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import express, { type Request, type Response } from "express";
import multer from "multer";
import { getDb, createRepositories, runMigrations, resolveDbPath } from "@ai-smartbook/db";
import { createAiProvider } from "@ai-smartbook/ai";
import {
  parsePdfToContents,
  splitBookIntoChapters,
  buildChaptersFromContents,
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
  type AiJobType,
  type BookAiJob
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

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const dir = resolve(UPLOAD_ROOT, String(req.params.bookId));
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const safe = file.originalname.replace(/[^\w.\-]+/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  }
});
const upload = multer({ storage });

const app = express();
app.use(express.json({ limit: "2mb" }));

function fail(res: Response, status: number, message: string) {
  res.status(status).json({ error: message });
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

function keywordChat(question: string, bookId: string) {
  const tokens = tokenizeQuestion(question);
  const contents = repos.contents.findByBookId(bookId);

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

function findPublishedBook(bookId: string) {
  const book = repos.books.findById(bookId);
  if (!book || book.status !== "published") return null;
  return book;
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

  const record = repos.files.create({
    bookId: book.id,
    fileName: file.originalname,
    filePath: file.path,
    fileType: file.mimetype || "application/octet-stream",
    fileSize: file.size,
    parseStatus: "pending"
  });
  res.status(201).json({ file: record });
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

// ---- Chapters -------------------------------------------------------------
app.get("/api/admin/books/:bookId/chapters", (req, res) => {
  res.json({ chapters: repos.chapters.findByBookId(req.params.bookId) });
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
    const { job, result } = await runJob(book.id, "build_chapters", req.body, () =>
      buildChaptersFromContents(ctx, book.id)
    );
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
  if (sessionId) {
    const session = repos.chat.findSessionById(sessionId);
    if (!session || session.bookId !== book.id) sessionId = undefined;
  }
  if (!sessionId) {
    sessionId = repos.chat.createSession({ bookId: book.id, title: question.slice(0, 40) }).id;
  }

  const { answer } = keywordChat(question, book.id);
  repos.chat.addMessage({ sessionId, role: "user", content: question });
  repos.chat.addMessage({ sessionId, role: "assistant", content: answer });

  res.json({
    sessionId,
    answer,
    chatMode: "keyword",
    messages: repos.chat.findMessages(sessionId)
  });
});

app.get("/api/student/books/:bookId/chat-sessions/:sessionId", (req, res) => {
  const book = findPublishedBook(String(req.params.bookId));
  if (!book) return fail(res, 404, "book not found");
  const session = repos.chat.findSessionById(String(req.params.sessionId));
  // Only expose sessions that belong to this published book.
  if (!session || session.bookId !== book.id) return fail(res, 404, "session not found");
  res.json({ sessionId: session.id, messages: repos.chat.findMessages(session.id) });
});

const port = Number(process.env.ADMIN_API_PORT || 4300);
app.listen(port, () => {
  console.log(
    `AI-adm-D1 admin API listening on ${port} (ai provider: ${ai.name}, db: ${resolveDbPath()})`
  );
});
