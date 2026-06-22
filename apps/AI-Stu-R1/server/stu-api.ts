import { existsSync } from "node:fs";
import { resolve } from "node:path";
import express, { type Response } from "express";
import {
  loadStudentRuntimeConfig,
  createDataSource,
  keywordChat,
  type StudentDataSource
} from "@ai-smartbook/student-runtime";
import { chatRequestSchema } from "@ai-smartbook/schema";

const config = loadStudentRuntimeConfig();

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
