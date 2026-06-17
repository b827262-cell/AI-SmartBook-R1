import { useCallback, useEffect, useRef, useState } from "react";
import type { SmartBookNote, SmartBookNoteType } from "@ai-smartbook/schema";
import { studentClient } from "../studentClient";

const CANVAS_W = 600;
const CANVAS_H = 360;

const TYPE_LABEL: Record<SmartBookNoteType, string> = {
  text: "文字",
  ai_answer: "AI 解答",
  canvas: "手寫"
};

/**
 * Smart Notes MVP panel: typed notes, saved AI answers, and a basic handwriting
 * canvas. All notes are scoped to the current book and tagged with the current
 * page / chapter context. Talks only to /api/student/* via studentClient.
 */
export function SmartNotesPanel({
  bookId,
  pageNumber,
  chapterId,
  chapterTitle,
  refreshKey = 0
}: {
  bookId: string;
  pageNumber: number | null;
  chapterId: string | null;
  chapterTitle: string | null;
  refreshKey?: number;
}) {
  const [notes, setNotes] = useState<SmartBookNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [textBody, setTextBody] = useState("");
  const [canvasDirty, setCanvasDirty] = useState(false);
  const [preview, setPreview] = useState<SmartBookNote | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    studentClient
      .listNotes(bookId)
      .then((r) => setNotes(r.notes))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [bookId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // Prime the canvas with a white background so thumbnails are not transparent.
  const resetCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setCanvasDirty(false);
  }, []);

  useEffect(() => {
    resetCanvas();
  }, [resetCanvas]);

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pointFromEvent(e);
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !last.current) return;
    const p = pointFromEvent(e);
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!canvasDirty) setCanvasDirty(true);
  }
  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = false;
    last.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function noteContext() {
    return {
      chapterId,
      pageNumber: pageNumber ?? null
    };
  }

  function onCreateTextNote() {
    if (!textBody.trim()) return;
    void run(async () => {
      await studentClient.createNote(bookId, {
        type: "text",
        title: textTitle.trim() || undefined,
        content: textBody.trim(),
        ...noteContext()
      });
      setTextTitle("");
      setTextBody("");
      load();
    });
  }

  function onSaveCanvasNote() {
    const canvas = canvasRef.current;
    if (!canvas || !canvasDirty) return;
    const canvasData = canvas.toDataURL("image/png");
    void run(async () => {
      await studentClient.createNote(bookId, {
        type: "canvas",
        title: "手寫筆記",
        canvasData,
        ...noteContext()
      });
      resetCanvas();
      load();
    });
  }

  function onDelete(noteId: string) {
    if (!window.confirm("刪除這則筆記？")) return;
    void run(async () => {
      await studentClient.deleteNote(bookId, noteId);
      if (preview?.id === noteId) setPreview(null);
      load();
    });
  }

  function contextLabel(note: SmartBookNote): string {
    const parts: string[] = [];
    if (note.pageNumber != null) parts.push(`p.${note.pageNumber}`);
    if (note.title) parts.push(note.title);
    return parts.join(" · ");
  }

  return (
    <div className="notes-panel">
      <div className="notes-compose">
        <div className="notes-context muted">
          目前內容：
          {pageNumber != null ? `PDF 第 ${pageNumber} 頁` : "未指定頁"}
          {chapterTitle ? ` · ${chapterTitle}` : ""}
        </div>

        <section className="notes-card">
          <h4>文字筆記</h4>
          <input
            className="notes-input"
            placeholder="標題（可留空）"
            value={textTitle}
            onChange={(e) => setTextTitle(e.target.value)}
          />
          <textarea
            className="notes-textarea"
            placeholder="輸入筆記內容…"
            value={textBody}
            onChange={(e) => setTextBody(e.target.value)}
          />
          <button
            type="button"
            className="notes-btn primary"
            disabled={busy || !textBody.trim()}
            onClick={onCreateTextNote}
          >
            新增文字筆記
          </button>
        </section>

        <section className="notes-card">
          <h4>手寫筆記</h4>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="notes-canvas"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          <div className="notes-canvas-actions">
            <button type="button" className="notes-btn" onClick={resetCanvas} disabled={busy}>
              清除
            </button>
            <button
              type="button"
              className="notes-btn primary"
              onClick={onSaveCanvasNote}
              disabled={busy || !canvasDirty}
            >
              儲存手寫筆記
            </button>
          </div>
        </section>
      </div>

      <div className="notes-list">
        <h4>我的筆記（{notes.length}）</h4>
        {error ? <p className="error-text">{error}</p> : null}
        {loading ? (
          <p className="muted">載入中…</p>
        ) : notes.length === 0 ? (
          <p className="muted">尚無筆記。可新增文字、儲存 AI 解答，或手寫一頁。</p>
        ) : (
          <ul className="notes-items">
            {notes.map((note) => (
              <li key={note.id} className="notes-item">
                <div className="notes-item-head">
                  <span className={`notes-type-badge ${note.type}`}>{TYPE_LABEL[note.type]}</span>
                  <span className="muted notes-item-ctx">{contextLabel(note)}</span>
                  <button
                    type="button"
                    className="notes-btn small"
                    onClick={() => onDelete(note.id)}
                    disabled={busy}
                  >
                    刪除
                  </button>
                </div>
                {note.type === "canvas" && note.canvasData ? (
                  <img
                    className="notes-canvas-thumb"
                    src={note.canvasData}
                    alt="手寫筆記"
                    onClick={() => setPreview(note)}
                  />
                ) : (
                  <p className="notes-item-body">{note.content}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {preview?.canvasData ? (
        <div className="notes-preview-backdrop" onClick={() => setPreview(null)} role="presentation">
          <img
            className="notes-preview-img"
            src={preview.canvasData}
            alt="手寫筆記預覽"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
