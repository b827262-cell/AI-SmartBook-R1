import { useState } from "react";

interface AiProviderLink {
  name: string;
  homeUrl: string;
}

const PASTE_BACK_PROVIDERS: AiProviderLink[] = [
  { name: "ChatGPT", homeUrl: "https://chatgpt.com/" },
  { name: "Claude", homeUrl: "https://claude.ai/new" },
  { name: "Gemini", homeUrl: "https://gemini.google.com/app" },
  { name: "Perplexity", homeUrl: "https://www.perplexity.ai/" },
  { name: "Grok", homeUrl: "https://grok.x.ai/" },
  { name: "Copilot", homeUrl: "https://copilot.microsoft.com/" },
  { name: "Meta AI", homeUrl: "https://www.meta.ai/" },
  { name: "Google AI", homeUrl: "https://google.com/ai" },
  { name: "其他", homeUrl: "" }
];

export function PasteBackNotePanel({
  bookTitle,
  pageLabel,
  chapterTitle,
  onSave,
  onClose
}: {
  bookTitle: string;
  pageLabel: string | null;
  chapterTitle: string | null;
  onSave: (title: string, content: string) => Promise<void>;
  onClose: () => void;
}) {
  const [noteTitle, setNoteTitle] = useState(
    chapterTitle ? `${chapterTitle} - AI 解答` : pageLabel ? `${pageLabel} - AI 解答` : "AI 解答筆記"
  );
  const [noteContent, setNoteContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  async function handleSave() {
    const content = noteContent.trim();
    const title = noteTitle.trim() || "AI 解答筆記";
    if (!content) {
      setStatus("請先貼上 AI 回答內容");
      return;
    }
    setSaving(true);
    setStatus("");
    try {
      await onSave(title, content);
      setStatus("筆記已儲存 ✓");
      setNoteContent("");
      setTimeout(onClose, 1000);
    } catch (e) {
      setStatus(`儲存失敗：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  function openProvider(homeUrl: string) {
    if (!homeUrl) return;
    try {
      window.open(homeUrl, "_blank", "noopener,noreferrer");
    } catch {
      setStatus("無法開啟外部頁籤，請確認瀏覽器未封鎖彈窗。");
    }
  }

  return (
    <div className="paste-back-backdrop" role="presentation" onClick={onClose}>
      <div
        className="paste-back-modal"
        role="dialog"
        aria-modal="true"
        aria-label="貼回AI筆記"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="paste-back-header">
          <h3>🤖 貼回AI筆記</h3>
          <button type="button" className="tool-btn" onClick={onClose}>關閉</button>
        </div>

        <p className="paste-back-desc muted">
          開啟外部 AI 平台後提問，取得 AI 回答，再將回答貼入下方儲存為筆記。
          <br />
          <strong>不會自動上傳任何資料至外部服務。</strong>
        </p>

        {bookTitle && (
          <p className="paste-back-ctx muted">
            書本：{bookTitle}
            {pageLabel ? `　頁：${pageLabel}` : ""}
            {chapterTitle ? `　章節：${chapterTitle}` : ""}
          </p>
        )}

        <div className="paste-back-providers">
          {PASTE_BACK_PROVIDERS.map((p) => (
            <button
              key={p.name}
              type="button"
              className="paste-back-provider-btn"
              onClick={() => openProvider(p.homeUrl)}
              disabled={!p.homeUrl}
              title={p.homeUrl ? `開啟 ${p.name}` : "其他平台（手動開啟）"}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="paste-back-fields">
          <label className="paste-back-label">
            筆記標題
            <input
              className="paste-back-input"
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="筆記標題"
            />
          </label>

          <label className="paste-back-label">
            將 AI 回答貼入這裡
            <textarea
              className="paste-back-textarea"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="將 AI 回答貼入這裡…"
              rows={8}
            />
          </label>
        </div>

        {status && (
          <p className={status.includes("失敗") ? "error-text" : "paste-back-status"}>{status}</p>
        )}

        <div className="paste-back-actions">
          <button
            type="button"
            className="btn"
            onClick={() => void handleSave()}
            disabled={saving || !noteContent.trim()}
          >
            {saving ? "儲存中…" : "儲存為筆記"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
