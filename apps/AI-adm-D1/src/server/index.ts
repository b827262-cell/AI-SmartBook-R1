import express from "express";
import { getAiSettings, saveAiSettings, clearGoogleApiKey, testAiConnection } from "./ai-settings-store.js";

const app = express();
app.use(express.json());

// ---- Books ----
app.get("/api/admin/books", (_req, res) => {
  res.json({ books: [] });
});

// ---- AI Settings ----

app.get("/api/admin/settings/ai-provider", async (_req, res) => {
  try {
    res.json(await getAiSettings());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.put("/api/admin/settings/ai-provider", async (req, res) => {
  try {
    const { googleApiKey, defaultModel, defaultEmbeddingModel } = req.body ?? {};
    res.json(await saveAiSettings({ googleApiKey, defaultModel, defaultEmbeddingModel }));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.delete("/api/admin/settings/ai-provider/google-key", async (_req, res) => {
  try {
    res.json(await clearGoogleApiKey());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post("/api/admin/settings/ai-provider/test", async (_req, res) => {
  try {
    res.json(await testAiConnection());
  } catch (err) {
    res.status(500).json({ ok: false, message: String(err) });
  }
});

// ---- Q&A (uses lazy AI client — reads fresh settings each call) ----
app.post("/api/admin/books/:bookId/qa", async (req, res) => {
  try {
    // Lazy-create AI provider using current settings from disk — no restart needed
    const { getRawGoogleApiKey } = await import("./ai-settings-store.js");
    const apiKey = await getRawGoogleApiKey();
    if (!apiKey) {
      return res.status(400).json({ error: "未提供 Google API Key，無法執行 AI 任務。" });
    }
    // TODO: replace with real Gemini client once @ai-smartbook/ai supports Gemini
    const answer = `[gemini-placeholder] Q: ${String(req.body?.question || "demo")}`;
    res.json({ answer });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

const port = Number(process.env.ADMIN_API_PORT || 4300);
app.listen(port, () => {
  console.log(`AI-adm-D1 admin API listening on ${port}`);
});
