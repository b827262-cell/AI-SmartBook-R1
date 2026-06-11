import express from "express";
import { loadStudentRuntimeConfig } from "@ai-smartbook/student-runtime";

const config = loadStudentRuntimeConfig();
const app = express();
app.use(express.json());

app.get("/api/student/books", (_req, res) => {
  res.json({
    mode: config.mode,
    books: [
      {
        id: "demo",
        title: "Demo SmartBook",
        description: "Seed 後會由 SQLite student.db 提供。",
        status: "published"
      }
    ]
  });
});

app.get("/api/student/books/:bookId", (req, res) => {
  res.json({ id: req.params.bookId, title: "Demo SmartBook" });
});

app.get("/api/student/books/:bookId/contents", (_req, res) => {
  res.json({ contents: [{ id: "demo-content", contentText: "Demo book content.", orderIndex: 1 }] });
});

app.post("/api/student/books/:bookId/chat", (req, res) => {
  const question = String(req.body?.question || "");
  res.json({
    answer: question
      ? `這是 keyword chat placeholder。收到問題：「${question}」。`
      : "目前書本內容中沒有找到明確答案。"
  });
});

app.listen(config.apiPort, () => {
  console.log(`AI-Stu-R1 student API listening on ${config.apiPort}`);
});
