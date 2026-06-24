import { useEffect, useState, type KeyboardEvent } from "react";
import { useAppearance } from "../appearance";
import type { ReaderOutlineNode } from "@ai-smartbook/schema";

/** Quick layout preset: PDF area vs AI area. PDF is the first value. */
export type ReaderRatio = "6:4" | "1:1" | "4:6";

export const READER_RATIOS: ReaderRatio[] = ["6:4", "1:1", "4:6"];

/** AI pane width (px) each ratio preset maps to (within the AI min/max range). */
export const RATIO_AI_WIDTH: Record<ReaderRatio, number> = {
  "6:4": 320,
  "1:1": 440,
  "4:6": 560
};

export const RATIO_TOC_WIDTH: Record<ReaderRatio, number> = {
  "6:4": 240,
  "1:1": 300,
  "4:6": 260
};

/** Discrete zoom percentages applied to the PDF.js render scale. Default 100. */
export const ZOOM_OPTIONS = [50, 75, 90, 100, 110, 125, 150, 175, 200];

type ReaderToolbarIconMode =
  | "textSelection"
  | "smartNote"
  | "pasteBackNote"
  | "pasteBackAiNote"
  | "screenshot"
  | "hideAnswer";

type ReaderToolbarIconPayload = {
  url: string;
  fallback: string;
};

function ReaderToolbarIcon({
  mode,
  fallback
}: {
  mode: ReaderToolbarIconMode;
  fallback: string;
}) {
  const a = useAppearance();
  const fallbackConfig: ReaderToolbarIconPayload[] = [
    { url: a.textSelectionIconUrl, fallback },
    { url: a.smartNoteIconUrl, fallback },
    { url: a.pasteBackNoteIconUrl, fallback },
    { url: a.pasteBackAiNoteIconUrl, fallback },
    { url: a.screenshotAskAiIconUrl, fallback },
    { url: a.hideAnswerIconUrl, fallback }
  ];

  const key = (() => {
    switch (mode) {
      case "textSelection":
        return 0;
      case "smartNote":
        return 1;
      case "pasteBackNote":
        return 2;
      case "pasteBackAiNote":
        return 3;
      case "screenshot":
        return 4;
      case "hideAnswer":
        return 5;
      default:
        return 0;
    }
  })();
  const icon = fallbackConfig[key];
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [icon.url]);

  if (icon.url && !failed) {
    return (
      <img
        src={icon.url}
        alt=""
        style={{ width: 16, height: 16, objectFit: "contain", marginRight: 6 }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span style={{ width: 16, height: 16, marginRight: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      {icon.fallback}
    </span>
  );
}

/**
 * PDF-native reader toolbar. Every control drives the protected PDF viewer
 * state (chapter page jump, page step, render zoom, layout, collapse). The
 * ratio buttons are quick presets for the AI pane width; users can also drag
 * the split handles for fine control.
 */
export function PdfReaderToolbar({
  outlineNodes,
  activeNodeId,
  onSelectOutlineNode,
  fullWidth,
  onToggleFullWidth,
  tocCollapsed,
  onToggleToc,
  selectionMode,
  onToggleSelection,
  aiOpen,
  onToggleAi,
  notesOpen,
  onToggleNotes,
  zoom,
  onZoom,
  ratio,
  onRatio,
  page,
  pageCount,
  onJumpPage,
  onPrevPage,
  onNextPage,
  onAskAi,
  onStickyNote,
  onPasteBackNote,
  onScreenshotAsk,
  maskMode,
  onToggleMask,
  features
}: {
  outlineNodes: ReaderOutlineNode[];
  activeNodeId: string | null;
  onSelectOutlineNode: (nodeId: string | null) => void;
  fullWidth: boolean;
  onToggleFullWidth: () => void;
  tocCollapsed: boolean;
  onToggleToc: () => void;
  selectionMode: boolean;
  onToggleSelection: () => void;
  aiOpen: boolean;
  onToggleAi: () => void;
  notesOpen: boolean;
  onToggleNotes: () => void;
  zoom: number;
  onZoom: (zoom: number) => void;
  ratio: ReaderRatio | null;
  onRatio: (ratio: ReaderRatio) => void;
  page: number | null;
  pageCount: number | null;
  onJumpPage: (page: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onAskAi: () => void;
  onStickyNote: () => void;
  onPasteBackNote: () => void;
  onScreenshotAsk: () => void;
  maskMode: boolean;
  onToggleMask: () => void;
  features: {
    noteFeatures: {
      smartNotesEnabled: boolean;
      pasteBackNotesEnabled: boolean;
      pasteBackAiNotesEnabled: boolean;
      screenshotAskAiEnabled: boolean;
    };
    pdfTools: {
      highlightEnabled: boolean;
      penEnabled: boolean;
      lineEnabled: boolean;
      rectangleEnabled: boolean;
      circleEnabled: boolean;
      stickyNoteEnabled: boolean;
      eraserEnabled: boolean;
    };
  };
}) {
  const hasPdf = page != null;
  const atFirst = page == null || page <= 1;
  const atLast = page == null || (pageCount != null && page >= pageCount);
  const [pageInput, setPageInput] = useState(page != null ? String(page) : "");
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    setPageInput(page != null ? String(page) : "");
    setPageError("");
  }, [page]);

  function submitPageInput() {
    const raw = pageInput.trim();
    if (!raw) {
      setPageInput(page != null ? String(page) : "");
      setPageError("");
      return;
    }
    const parsed = Number(raw);
    if (!Number.isInteger(parsed)) {
      setPageError("頁碼格式錯誤");
      return;
    }
    const next = Math.max(1, pageCount != null ? Math.min(pageCount, parsed) : parsed);
    onJumpPage(next);
    setPageInput(String(next));
    setPageError(parsed === next ? "" : "頁碼已調整至可用範圍");
  }

  function onPageInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") submitPageInput();
  }

  return (
    <div className="pdf-toolbar">
      <button type="button" className="tool-btn" onClick={onToggleToc}>
        {tocCollapsed ? "▸ 展開章節" : "◂ 收合章節"}
      </button>

      <button
        type="button"
        className={`tool-btn ${fullWidth ? "active" : ""}`}
        onClick={onToggleFullWidth}
        title="切換閱讀器滿版 / 一般寬度"
      >
        {fullWidth ? "滿版" : "一般"}
      </button>

      <select
        className="tool-select"
        value={activeNodeId ?? ""}
        onChange={(e) => onSelectOutlineNode(e.target.value || null)}
        title="章節大綱（跳至 PDF 實體頁）"
      >
        <option value="">全部內容（第 1 頁）</option>
        {outlineNodes.map((node) => (
          <option key={node.id} value={node.id} disabled={node.page == null}>
            {"　".repeat(Math.max(0, node.level - 1))}
            {node.title}
            {node.page != null ? `（P${node.page}）` : ""}
          </option>
        ))}
      </select>

      <div className="tool-pagenav" title="PDF 實體頁導覽">
        <button type="button" className="tool-btn" onClick={onPrevPage} disabled={atFirst}>
          ◀
        </button>
        <span className="tool-page">
          {hasPdf ? `P${page}` : "—"}
          {pageCount != null ? ` / ${pageCount}` : ""}
        </span>
        <input
          className={`tool-page-input ${pageError ? "invalid" : ""}`}
          type="text"
          value={pageInput}
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label="輸入 PDF 頁碼"
          title={pageError || "輸入 PDF 頁碼後按 Enter"}
          onChange={(event) => setPageInput(event.target.value.replace(/\D/g, ""))}
          onKeyDown={onPageInputKeyDown}
          onBlur={() => {
            if (pageInput.trim() === "") setPageInput(page != null ? String(page) : "");
          }}
          disabled={!hasPdf}
        />
        <button type="button" className="tool-btn" onClick={onNextPage} disabled={atLast}>
          ▶
        </button>
      </div>

      <label className="tool-zoom">
        <span className="tool-zoom-label">縮放</span>
        <select
          className="tool-select"
          value={zoom}
          onChange={(e) => onZoom(Number(e.target.value))}
        >
          {ZOOM_OPTIONS.map((z) => (
            <option key={z} value={z}>
              {z}%
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className={`tool-btn ${selectionMode ? "active" : ""}`}
        onClick={onToggleSelection}
        title="文字選取：拖曳選取 PDF 文字後可複製 / 加入筆記 / 問AI重點"
      >
        <ReaderToolbarIcon mode="textSelection" fallback="🔖" />
        {selectionMode ? "結束選取" : "文字選取"}
      </button>

      {features.noteFeatures.smartNotesEnabled && (
        <button
          type="button"
          className={`tool-btn ${notesOpen ? "active" : ""}`}
          onClick={onToggleNotes}
          title="智能筆記"
        >
          <ReaderToolbarIcon mode="smartNote" fallback="🧠" />
          {notesOpen ? "收合筆記" : "智能筆記"}
        </button>
      )}

      <span className="tool-divider" aria-hidden="true" />

      {features.pdfTools.stickyNoteEnabled && (
        <button
          type="button"
          className="tool-btn reader-action-btn"
          onClick={onStickyNote}
          title="貼圖筆記：開啟筆記畫板，記錄此頁筆記"
        >
          <ReaderToolbarIcon mode="pasteBackNote" fallback="📌" />
          貼圖筆記
        </button>
      )}

      {features.noteFeatures.pasteBackAiNotesEnabled && (
        <button
          type="button"
          className="tool-btn reader-action-btn"
          onClick={onPasteBackNote}
          title="貼回AI筆記：開啟外部 AI 平台後，將 AI 回答貼回此筆記欄"
        >
          <ReaderToolbarIcon mode="pasteBackAiNote" fallback="🤖" />
          貼回AI筆記
        </button>
      )}

      {features.noteFeatures.screenshotAskAiEnabled && (
        <button
          type="button"
          className="tool-btn reader-action-btn"
          onClick={onScreenshotAsk}
          title="截圖問AI：選取 PDF 區域截圖後，手動複製提示詞問 AI"
        >
          <ReaderToolbarIcon mode="screenshot" fallback="📸" />
          截圖問AI
        </button>
      )}

      {features.pdfTools.highlightEnabled && (
        <button type="button" className="tool-btn reader-action-btn" title="螢光筆" onClick={() => {}}>
          <span style={{ marginRight: 6 }}>🖍️</span>螢光筆
        </button>
      )}

      {features.pdfTools.penEnabled && (
        <button type="button" className="tool-btn reader-action-btn" title="筆" onClick={() => {}}>
          <span style={{ marginRight: 6 }}>🖊️</span>筆
        </button>
      )}

      {features.pdfTools.lineEnabled && (
        <button type="button" className="tool-btn reader-action-btn" title="直線" onClick={() => {}}>
          <span style={{ marginRight: 6 }}>📏</span>直線
        </button>
      )}

      {features.pdfTools.rectangleEnabled && (
        <button type="button" className="tool-btn reader-action-btn" title="矩形" onClick={() => {}}>
          <span style={{ marginRight: 6 }}>🔲</span>矩形
        </button>
      )}

      {features.pdfTools.circleEnabled && (
        <button type="button" className="tool-btn reader-action-btn" title="圓形" onClick={() => {}}>
          <span style={{ marginRight: 6 }}>⭕</span>圓形
        </button>
      )}

      {features.pdfTools.eraserEnabled && (
        <button type="button" className="tool-btn reader-action-btn" title="橡皮擦" onClick={() => {}}>
          <span style={{ marginRight: 6 }}>🧽</span>橡皮擦
        </button>
      )}

      <button
        type="button"
        className={`tool-btn reader-action-btn ${maskMode ? "active" : ""}`}
        onClick={onToggleMask}
        title="遮答案：拖曳選取區域，覆蓋白色方塊遮住答案"
      >
        <ReaderToolbarIcon mode="hideAnswer" fallback="🙈" />
        {maskMode ? "結束遮答案" : "遮答案"}
      </button>

      <span className="tool-spacer" />

      <div className="tool-ratio" title="PDF 與 AI 區域比例（快速調整 AI 寬度）">
        {READER_RATIOS.map((r) => (
          <button
            key={r}
            type="button"
            className={ratio === r ? "active" : ""}
            onClick={() => onRatio(r)}
          >
            {r}
          </button>
        ))}
      </div>

      <button type="button" className="tool-btn" onClick={onToggleAi}>
        {aiOpen ? "收合AI" : "展開AI"}
      </button>

      <button type="button" className="tool-btn ask" onClick={onAskAi}>
        問AI
      </button>
    </div>
  );
}
