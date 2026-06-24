import { useState } from "react";

interface NoteDraft {
  page: number;
  chapterTitle: string | null;
  text: string;
  createdAt: string;
}

/**
 * 貼圖筆記 (sticky note) modal.
 *
 * IMPORTANT: real screenshot capture is intentionally NOT implemented here.
 * The protected reader renders the PDF inside a browser-native <iframe> (the
 * built-in PDF plugin), whose pixels live in a separate process and cannot be
 * read by this page — `canvas.drawImage` does not accept an iframe and
 * html2canvas cannot rasterize plugin/cross-origin content. A genuine in-app
 * screenshot therefore requires rendering the PDF ourselves with PDF.js on a
 * canvas. That migration is out of scope for this change, so we do not fake a
 * capture. Instead we keep the page/chapter context and let the student write a
 * text note draft (kept locally for this session only; not persisted).
 */
export function StickyNoteModal({
  bookTitle,
  page,
  chapterTitle,
  onClose
}: {
  bookTitle: string;
  page: number;
  chapterTitle: string | null;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<NoteDraft[]>([]);

  function addDraft() {
    const value = text.trim();
    if (!value) return;
    setDrafts((list) => [
      { page, chapterTitle, text: value, createdAt: new Date().toLocaleString("zh-Hant") },
      ...list
    ]);
    setText("");
  }

  return (
    <div className="note-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="note-modal"
        role="dialog"
        aria-modal="true"
        aria-label="貼圖筆記"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>📌 貼圖筆記</h3>

        <div className="note-limitation">
          截圖擷取目前無法使用：受保護的閱讀器以瀏覽器原生 PDF（iframe / 內建外掛）呈現，其畫面像素
          無法被頁面讀取（無法對 iframe 進行 canvas 截圖）。真正的截圖筆記需改用 PDF.js 於 canvas
          自行繪製 PDF（規劃中）。以下可先建立文字筆記草稿。
        </div>

        <p className="note-context muted">
          書本：{bookTitle}｜PDF 實體頁：P{page}
          {chapterTitle ? `｜章節：${chapterTitle}` : ""}
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="輸入這一頁的筆記內容…"
        />

        <div className="note-actions">
          <button type="button" onClick={addDraft} disabled={!text.trim()}>
            新增草稿（本機暫存）
          </button>
          <button type="button" onClick={onClose}>
            關閉
          </button>
        </div>

        {drafts.length > 0 && (
          <ul className="note-drafts">
            {drafts.map((d, i) => (
              <li key={i}>
                <div className="note-draft-meta">
                  P{d.page}
                  {d.chapterTitle ? `｜${d.chapterTitle}` : ""}｜{d.createdAt}
                </div>
                <div>{d.text}</div>
              </li>
            ))}
          </ul>
        )}
        <p className="note-context muted" style={{ marginTop: 10 }}>
          注意：草稿僅保留於本次工作階段，重新整理後會清除（本任務未新增筆記後端儲存）。
        </p>
      </div>
    </div>
  );
}
