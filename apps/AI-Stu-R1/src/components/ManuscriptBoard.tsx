import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type DrawTool = "pen" | "highlight" | "eraser" | "text";

interface TextOverlay {
  x: number;
  y: number;
  value: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CANVAS_W = 1400;
const CANVAS_H = 1000;
const COLORS = ["#111111", "#e53e3e", "#2563eb", "#16a34a", "#d97706", "#9333ea", "#ec4899", "#ffffff"];
const TOOL_LINE_WIDTH: Record<DrawTool, number> = {
  pen: 3,
  highlight: 18,
  eraser: 28,
  text: 0
};
const STORAGE_KEY = (bookId: string, page: number) => `ms:${bookId}:${page}`;

// ---------------------------------------------------------------------------
// Coordinate mapping
// ---------------------------------------------------------------------------
function toCanvasPos(
  e: React.PointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
    y: ((e.clientY - rect.top) / rect.height) * CANVAS_H
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export interface ManuscriptBoardProps {
  bookId: string;
  bookTitle: string;
  page: number;
  chapterTitle: string | null;
  onClose?: () => void;
  asModal?: boolean;
}

export function ManuscriptBoard({
  bookId,
  bookTitle,
  page,
  chapterTitle,
  onClose,
  asModal = false
}: ManuscriptBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [tool, setTool] = useState<DrawTool>("pen");
  const [color, setColor] = useState("#111111");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);

  const [textOverlay, setTextOverlay] = useState<TextOverlay | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // ---- helpers ----------------------------------------------------------------

  function ctx() {
    return canvasRef.current?.getContext("2d") ?? null;
  }

  function snapshot(): string {
    return canvasRef.current?.toDataURL() ?? "";
  }

  function pushHistory(dataUrl: string) {
    setHistory((prev) => {
      const trimmed = prev.slice(0, histIdx + 1);
      return [...trimmed, dataUrl].slice(-30);
    });
    setHistIdx((i) => Math.min(i + 1, 29));
  }

  const loadFromStorage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const saved = localStorage.getItem(STORAGE_KEY(bookId, page));
    if (saved) {
      const img = new Image();
      img.onload = () => {
        c.drawImage(img, 0, 0);
        pushHistory(canvas.toDataURL());
      };
      img.src = saved;
    } else {
      pushHistory(canvas.toDataURL());
    }
  }, [bookId, page]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- mount / page change ---------------------------------------------------
  useEffect(() => {
    setHistory([]);
    setHistIdx(-1);
    setTextOverlay(null);
    isDrawing.current = false;
    loadFromStorage();
  }, [loadFromStorage]);

  // ---- drawing helpers -------------------------------------------------------

  function startLine(e: React.PointerEvent<HTMLCanvasElement>) {
    if (tool === "text") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const c = canvas.getContext("2d");
    if (!c) return;

    isDrawing.current = true;
    lastPos.current = toCanvasPos(e, canvas);

    c.save();
    if (tool === "eraser") {
      c.globalCompositeOperation = "source-over";
      c.strokeStyle = "#ffffff";
      c.lineWidth = TOOL_LINE_WIDTH.eraser;
    } else if (tool === "highlight") {
      c.globalCompositeOperation = "multiply";
      const rgb = hexToRgb(color);
      c.strokeStyle = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)` : "rgba(255,235,0,0.4)";
      c.lineWidth = TOOL_LINE_WIDTH.highlight;
    } else {
      c.globalCompositeOperation = "source-over";
      c.strokeStyle = color;
      c.lineWidth = TOOL_LINE_WIDTH.pen;
    }
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(lastPos.current.x, lastPos.current.y);
    c.restore();

    // keep context state in a ref so we can restore in move/up
    e.currentTarget.dataset.toolActive = "1";
  }

  function continueLine(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || tool === "text" || !lastPos.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;
    const pos = toCanvasPos(e, canvas);

    c.save();
    if (tool === "eraser") {
      c.globalCompositeOperation = "source-over";
      c.strokeStyle = "#ffffff";
      c.lineWidth = TOOL_LINE_WIDTH.eraser;
    } else if (tool === "highlight") {
      c.globalCompositeOperation = "multiply";
      const rgb = hexToRgb(color);
      c.strokeStyle = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)` : "rgba(255,235,0,0.4)";
      c.lineWidth = TOOL_LINE_WIDTH.highlight;
    } else {
      c.globalCompositeOperation = "source-over";
      c.strokeStyle = color;
      c.lineWidth = TOOL_LINE_WIDTH.pen;
    }
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(lastPos.current.x, lastPos.current.y);
    c.lineTo(pos.x, pos.y);
    c.stroke();
    c.restore();

    lastPos.current = pos;
  }

  function endLine() {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPos.current = null;
    const dataUrl = snapshot();
    pushHistory(dataUrl);
    try { localStorage.setItem(STORAGE_KEY(bookId, page), dataUrl); } catch { /* storage full */ }
  }

  // ---- text tool ------------------------------------------------------------

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (tool !== "text") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setTextOverlay({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      value: ""
    });
    setTimeout(() => textareaRef.current?.focus(), 30);
  }

  function commitText() {
    if (!textOverlay || !textOverlay.value.trim()) {
      setTextOverlay(null);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;
    const rect = canvas.getBoundingClientRect();
    const canvasX = (textOverlay.x / rect.width) * CANVAS_W;
    const canvasY = (textOverlay.y / rect.height) * CANVAS_H;

    c.save();
    c.font = `bold ${20}px sans-serif`;
    c.fillStyle = color;
    const lines = textOverlay.value.split("\n");
    lines.forEach((line, i) => {
      c.fillText(line, canvasX, canvasY + i * 26);
    });
    c.restore();

    const dataUrl = snapshot();
    pushHistory(dataUrl);
    try { localStorage.setItem(STORAGE_KEY(bookId, page), dataUrl); } catch { /* */ }
    setTextOverlay(null);
  }

  // ---- undo / redo ----------------------------------------------------------

  function undo() {
    if (histIdx <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;
    const newIdx = histIdx - 1;
    const img = new Image();
    img.onload = () => { c.clearRect(0, 0, CANVAS_W, CANVAS_H); c.drawImage(img, 0, 0); };
    img.src = history[newIdx];
    setHistIdx(newIdx);
    try { localStorage.setItem(STORAGE_KEY(bookId, page), history[newIdx]); } catch { /* */ }
  }

  function redo() {
    if (histIdx >= history.length - 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;
    const newIdx = histIdx + 1;
    const img = new Image();
    img.onload = () => { c.clearRect(0, 0, CANVAS_W, CANVAS_H); c.drawImage(img, 0, 0); };
    img.src = history[newIdx];
    setHistIdx(newIdx);
    try { localStorage.setItem(STORAGE_KEY(bookId, page), history[newIdx]); } catch { /* */ }
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const dataUrl = snapshot();
    pushHistory(dataUrl);
    try { localStorage.removeItem(STORAGE_KEY(bookId, page)); } catch { /* */ }
  }

  // ---- cursor ---------------------------------------------------------------
  const cursorStyle: React.CSSProperties = {
    cursor:
      tool === "eraser" ? "cell" :
      tool === "text" ? "text" :
      "crosshair"
  };

  // ---- render ---------------------------------------------------------------
  const board = (
    <div className={`manuscript-board${asModal ? " manuscript-board--modal" : ""}`}>
      {/* Header */}
      <div className="manuscript-header">
        <span className="manuscript-title">
          ✏️ 筆記畫板 — 第 {page} 頁
          {chapterTitle ? `　${chapterTitle}` : ""}
        </span>
        <span className="manuscript-meta muted">{bookTitle}</span>
        {onClose && (
          <button type="button" className="btn btn-secondary manuscript-close-btn" onClick={onClose}>
            關閉
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="manuscript-toolbar">
        {/* Tools */}
        <div className="manuscript-tool-group" role="group" aria-label="繪圖工具">
          {(["pen", "highlight", "eraser", "text"] as DrawTool[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`manuscript-tool-btn${tool === t ? " active" : ""}`}
              onClick={() => setTool(t)}
              title={TOOL_LABEL[t]}
              aria-pressed={tool === t}
            >
              {TOOL_ICON[t]}
            </button>
          ))}
        </div>

        <span className="manuscript-sep" aria-hidden="true" />

        {/* Color palette */}
        <div className="manuscript-color-group" role="group" aria-label="顏色">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`manuscript-color-btn${color === c ? " active" : ""}`}
              style={{ background: c, border: c === "#ffffff" ? "1px solid #ccc" : undefined }}
              title={c}
              onClick={() => setColor(c)}
              aria-label={`顏色 ${c}`}
            />
          ))}
        </div>

        <span className="manuscript-sep" aria-hidden="true" />

        {/* Undo / Redo */}
        <button
          type="button"
          className="manuscript-tool-btn"
          onClick={undo}
          disabled={histIdx <= 0}
          title="復原 (Ctrl+Z)"
        >↩</button>
        <button
          type="button"
          className="manuscript-tool-btn"
          onClick={redo}
          disabled={histIdx >= history.length - 1}
          title="取消復原 (Ctrl+Y)"
        >↪</button>

        <span className="manuscript-sep" aria-hidden="true" />

        {/* Clear */}
        <button
          type="button"
          className="manuscript-tool-btn manuscript-clear-btn"
          onClick={clearCanvas}
          title="清除畫板"
        >🗑 清除</button>
      </div>

      {/* Canvas area */}
      <div className="manuscript-canvas-wrap">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="manuscript-canvas"
          style={cursorStyle}
          onPointerDown={startLine}
          onPointerMove={continueLine}
          onPointerUp={endLine}
          onPointerCancel={endLine}
          onClick={handleCanvasClick}
        />

        {/* Text overlay input */}
        {textOverlay && (
          <textarea
            ref={textareaRef}
            className="manuscript-text-input"
            style={{ left: textOverlay.x, top: textOverlay.y, color }}
            value={textOverlay.value}
            onChange={(e) => setTextOverlay({ ...textOverlay, value: e.target.value })}
            onBlur={commitText}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitText(); }
              if (e.key === "Escape") setTextOverlay(null);
            }}
            rows={3}
            placeholder="輸入文字，Enter 確認"
          />
        )}
      </div>

      <div className="manuscript-footer muted">
        工具：{TOOL_LABEL[tool]}　顏色：{color}　步驟：{histIdx + 1}/{history.length}
        &ensp;｜&ensp;手稿暫存於瀏覽器本機，不會上傳。
      </div>
    </div>
  );

  if (asModal) {
    return (
      <div
        className="manuscript-backdrop"
        role="presentation"
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      >
        {board}
      </div>
    );
  }

  return board;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TOOL_LABEL: Record<DrawTool, string> = {
  pen: "鋼筆",
  highlight: "螢光筆",
  eraser: "橡皮擦",
  text: "文字"
};
const TOOL_ICON: Record<DrawTool, string> = {
  pen: "✒️",
  highlight: "🖊",
  eraser: "⬜",
  text: "T"
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}
