import { existsSync } from "node:fs";
import { resolve } from "node:path";
import express from "express";
import {
  loadStudentRuntimeConfig,
  createDataSource,
  keywordChat
} from "@ai-smartbook/student-runtime";
import { chatRequestSchema } from "@ai-smartbook/schema";

const config = loadStudentRuntimeConfig();
const dataSource = createDataSource(config);

const app = express();
app.use(express.json());

// ---- Student API (read-only) ---------------------------------------------
app.get("/api/student/books", async (_req, res) => {
  const books = await dataSource.listBooks();
  res.json({ mode: config.mode, books });
});

app.get("/api/student/books/:bookId", async (req, res) => {
  const book = await dataSource.getBook(String(req.params.bookId));
  if (!book) return res.status(404).json({ error: "book not found" });
  res.json({ book });
});

app.get("/api/student/books/:bookId/contents", async (req, res) => {
  const contents = await dataSource.getContents(String(req.params.bookId));
  res.json({ contents });
});

app.post("/api/student/books/:bookId/chat", async (req, res) => {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const bookId = String(req.params.bookId);
  const contents = await dataSource.getContents(bookId);

  // 1GB sqlite-api mode uses local keyword retrieval — no external AI call.
  const { answer, matchedContentIds } = keywordChat(parsed.data.question, contents);
  res.json({ answer, matchedContentIds, chatMode: config.chatMode });
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
