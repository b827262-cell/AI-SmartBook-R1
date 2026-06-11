import { useEffect, useState } from "react";
import type { BookChapter } from "@ai-smartbook/schema";
import { adminApi } from "../../api";

export function ChaptersTab({ bookId }: { bookId: string }) {
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function reload() {
    adminApi.getChapters(bookId).then((d) => setChapters(d.chapters));
  }
  useEffect(reload, [bookId]);

  async function onGenerate() {
    setBusy(true);
    setError("");
    try {
      await adminApi.generateChapters(bookId);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onSummarize(chapterId: string) {
    setBusy(true);
    setError("");
    try {
      await adminApi.summarizeChapter(bookId, chapterId);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card row between">
        <div>
          <h3 style={{ margin: 0 }}>章節（{chapters.length}）</h3>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            依 PDF 解析內容直接生成章節草稿。
          </p>
        </div>
        <button className="btn" onClick={onGenerate} disabled={busy}>
          {busy ? "處理中…" : "一鍵生成"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}

      {chapters.map((c) => (
        <div className="card" key={c.id}>
          <div className="row between">
            <strong>
              {c.orderIndex + 1}. {c.title}
            </strong>
            <button className="btn secondary" onClick={() => onSummarize(c.id)} disabled={busy}>
              AI 摘要
            </button>
          </div>
          <p className="muted" style={{ marginBottom: 0 }}>
            {c.summary || "（尚無摘要）"}
          </p>
        </div>
      ))}
    </div>
  );
}
