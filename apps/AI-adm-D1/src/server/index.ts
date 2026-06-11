import express from "express";
import { createAiProvider } from "@ai-smartbook/ai";

const app = express();
app.use(express.json());

app.get("/api/admin/books", (_req, res) => {
  res.json({ books: [] });
});

app.post("/api/admin/books/:bookId/qa", async (req, res) => {
  const ai = createAiProvider();
  const answer = await ai.generateText({ prompt: String(req.body?.question || "demo question") });
  res.json({ answer });
});

const port = Number(process.env.ADMIN_API_PORT || 4300);
app.listen(port, () => {
  console.log(`AI-adm-D1 admin API listening on ${port}`);
});
