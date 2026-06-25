import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import express, { type Response } from "express";
import {
  loadStudentRuntimeConfig,
  createDataSource,
  keywordChat,
  type StudentDataSource
} from "@ai-smartbook/student-runtime";
import { createDbHandle } from "@ai-smartbook/db";
import { chatRequestSchema } from "@ai-smartbook/schema";

const config = loadStudentRuntimeConfig();

type NoteType = "text" | "ai_answer" | "canvas";

interface NoteRecord {
  id: string;
  bookId: string;
  type: NoteType;
  title: string | null;
  content: string;
  chapterId: string | null;
  pageNumber: number | null;
  createdAt: string;
  updatedAt: string;
}

// Build the data source defensively: a missing/unopenable SQLite file (e.g.
// the student.db has not been synced yet) must not crash the server. We keep
// the process alive and answer data endpoints with an explicit 503 instead.
let dataSource: StudentDataSource | null = null;
let dataSourceError: string | null = null;
try {
  dataSource = createDataSource(config);
} catch (err) {
  dataSourceError = err instanceof Error ? err.message : String(err);
  console.error(
    `[stu-api] data source unavailable (mode=${config.mode}, db=${config.dbPath}): ${dataSourceError}`
  );
}

let notesDbHandle: ReturnType<typeof createDbHandle> | null = null;
let notesDbError: string | null = null;

/** Return the data source, or send a 503 and return null when unavailable. */
function requireDataSource(res: Response): StudentDataSource | null {
  if (!dataSource) {
    res.status(503).json({
      error: "student data source unavailable",
      detail: dataSourceError ?? "not initialized",
      mode: config.mode
    });
    return null;
  }
  return dataSource;
}

function ensureNotesHandle(res: Response): ReturnType<typeof createDbHandle> | null {
  if (notesDbHandle) return notesDbHandle;
  if (notesDbError) {
    res.status(503).json({
      error: "student notes storage unavailable",
      detail: notesDbError
    });
    return null;
  }

  try {
    const handle = createDbHandle(config.dbPath);
    handle.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS smart_book_notes (
        id TEXT PRIMARY KEY NOT NULL,
        bookId TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('text','ai_answer','canvas')),
        title TEXT,
        content TEXT NOT NULL DEFAULT '',
        chapterId TEXT,
        pageNumber INTEGER,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);
    notesDbHandle = handle;
    return notesDbHandle;
  } catch (err) {
    notesDbError = err instanceof Error ? err.message : String(err);
    res.status(503).json({
      error: "student notes storage unavailable",
      detail: notesDbError
    });
    return null;
  }
}

function parseNoteType(value: unknown): NoteType | null {
  return value === "text" || value === "ai_answer" || value === "canvas" ? value : null;
}

function parseNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length > 0 ? v : null;
}

function parsePageNumber(value: unknown): number | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return "invalid";
  return n;
}

function ensureWritableNotes(res: Response): boolean {
  if (!config.readonlyMode) return true;
  res.status(403).json({ error: "notes API is read-only in current runtime mode" });
  return false;
}

const app = express();
app.use(express.json());

// ---- Student API (read-only) ---------------------------------------------
app.get("/api/student/books", async (_req, res) => {
  const ds = requireDataSource(res);
  if (!ds) return;
  try {
    const books = await ds.listBooks();
    res.json({ mode: config.mode, books });
  } catch (err) {
    res.status(503).json({ error: "failed to read books", detail: String(err) });
  }
});

app.get("/api/student/books/:bookId", async (req, res) => {
  const ds = requireDataSource(res);
  if (!ds) return;
  try {
    const book = await ds.getBook(String(req.params.bookId));
    if (!book) return res.status(404).json({ error: "book not found" });
    res.json({ book });
  } catch (err) {
    res.status(503).json({ error: "failed to read book", detail: String(err) });
  }
});

app.get("/api/student/books/:bookId/contents", async (req, res) => {
  const ds = requireDataSource(res);
  if (!ds) return;
  try {
    const contents = await ds.getContents(String(req.params.bookId));
    res.json({ contents });
  } catch (err) {
    res.status(503).json({ error: "failed to read contents", detail: String(err) });
  }
});

app.post("/api/student/books/:bookId/chat", async (req, res) => {
  const ds = requireDataSource(res);
  if (!ds) return;
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  try {
    const bookId = String(req.params.bookId);
    const contents = await ds.getContents(bookId);

    // 1GB sqlite-api mode uses local keyword retrieval — no external AI call.
    const { answer, matchedContentIds } = keywordChat(parsed.data.question, contents);
    res.json({ answer, matchedContentIds, chatMode: config.chatMode });
  } catch (err) {
    res.status(503).json({ error: "failed to answer chat", detail: String(err) });
  }
});

app.get("/api/student/books/:bookId/notes", async (req, res) => {
  const ds = requireDataSource(res);
  if (!ds) return;
  try {
    const book = await ds.getBook(String(req.params.bookId));
    if (!book) return res.status(404).json({ error: "book not found" });

    const handle = ensureNotesHandle(res);
    if (!handle) return;

    const rows = handle.sqlite
      .prepare(
        "SELECT id, bookId, type, title, content, chapterId, pageNumber, createdAt, updatedAt FROM smart_book_notes WHERE bookId = ? ORDER BY updatedAt DESC"
      )
      .all(book.id) as NoteRecord[];

    res.json({ notes: rows });
  } catch (err) {
    res.status(503).json({ error: "failed to read notes", detail: String(err) });
  }
});

app.post("/api/student/books/:bookId/notes", async (req, res) => {
  if (!ensureWritableNotes(res)) return;
  const ds = requireDataSource(res);
  if (!ds) return;
  const body = req.body as {
    type?: unknown;
    title?: unknown;
    content?: unknown;
    chapterId?: unknown;
    pageNumber?: unknown;
  };

  const book = await ds.getBook(String(req.params.bookId));
  if (!book) return res.status(404).json({ error: "book not found" });

  const type = parseNoteType(body.type);
  if (!type) return res.status(400).json({ error: "invalid note type" });

  const title = parseNullableString(body.title);
  const content = parseNullableString(body.content) ?? "";
  const chapterId = parseNullableString(body.chapterId);
  const pageNumber = parsePageNumber(body.pageNumber);
  if (pageNumber === "invalid") return res.status(400).json({ error: "invalid pageNumber" });

  const now = new Date().toISOString();
  const id = randomUUID();

  const handle = ensureNotesHandle(res);
  if (!handle) return;

  try {
    handle.sqlite
      .prepare(
        "INSERT INTO smart_book_notes (id, bookId, type, title, content, chapterId, pageNumber, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(id, book.id, type, title, content, chapterId, pageNumber, now, now);

    const note: NoteRecord = {
      id,
      bookId: book.id,
      type,
      title,
      content,
      chapterId,
      pageNumber,
      createdAt: now,
      updatedAt: now
    };
    res.status(201).json({ note });
  } catch (err) {
    res.status(503).json({ error: "failed to create note", detail: String(err) });
  }
});

app.patch("/api/student/books/:bookId/notes/:noteId", async (req, res) => {
  if (!ensureWritableNotes(res)) return;
  const ds = requireDataSource(res);
  if (!ds) return;

  const book = await ds.getBook(String(req.params.bookId));
  if (!book) return res.status(404).json({ error: "book not found" });

  const handle = ensureNotesHandle(res);
  if (!handle) return;

  const noteId = String(req.params.noteId);
  const current = handle.sqlite
    .prepare("SELECT * FROM smart_book_notes WHERE id = ? AND bookId = ?")
    .get(noteId, book.id) as NoteRecord | undefined;

  if (!current) return res.status(404).json({ error: "note not found" });

  const body = req.body as {
    type?: unknown;
    title?: unknown;
    content?: unknown;
    chapterId?: unknown;
    pageNumber?: unknown;
  };

  const nextType = body.type === undefined ? current.type : parseNoteType(body.type);
  if (nextType === null) return res.status(400).json({ error: "invalid note type" });

  const nextTitle = body.title === undefined ? current.title : parseNullableString(body.title);
  const nextContent = body.content === undefined ? current.content : parseNullableString(body.content) ?? "";

  const pageCandidate = body.pageNumber ?? current.pageNumber;
  const nextPageNumber =
    pageCandidate === ""
      ? null
      : pageCandidate === undefined
        ? current.pageNumber
        : parsePageNumber(pageCandidate);
  if (nextPageNumber === "invalid") return res.status(400).json({ error: "invalid pageNumber" });

  const nextChapterId = body.chapterId === undefined ? current.chapterId : parseNullableString(body.chapterId);
  const now = new Date().toISOString();

  try {
    handle.sqlite
      .prepare(
        "UPDATE smart_book_notes SET type = ?, title = ?, content = ?, chapterId = ?, pageNumber = ?, updatedAt = ? WHERE id = ? AND bookId = ?"
      )
      .run(nextType, nextTitle, nextContent, nextChapterId, nextPageNumber, now, noteId, book.id);

    res.json({
      note: {
        id: noteId,
        bookId: book.id,
        type: nextType,
        title: nextTitle,
        content: nextContent,
        chapterId: nextChapterId,
        pageNumber: nextPageNumber,
        createdAt: current.createdAt,
        updatedAt: now
      } satisfies NoteRecord
    });
  } catch (err) {
    res.status(503).json({ error: "failed to update note", detail: String(err) });
  }
});

app.delete("/api/student/books/:bookId/notes/:noteId", async (req, res) => {
  if (!ensureWritableNotes(res)) return;
  const ds = requireDataSource(res);
  if (!ds) return;

  const book = await ds.getBook(String(req.params.bookId));
  if (!book) return res.status(404).json({ error: "book not found" });

  const handle = ensureNotesHandle(res);
  if (!handle) return;

  const noteId = String(req.params.noteId);
  const result = handle.sqlite
    .prepare("DELETE FROM smart_book_notes WHERE id = ? AND bookId = ?")
    .run(noteId, book.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: "note not found" });
  }

  res.json({ deleted: true });
});

// ---- Static frontend (production) ----------------------------------------
const publicDir = resolve(config.publicDir);
if (existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(resolve(publicDir, "index.html"));
  });
}

app.listen(config.apiPort, () => {
  console.log(
    `AI-Stu-R1 student API listening on ${config.apiPort} (mode=${config.mode}, chat=${config.chatMode})`
  );
});
