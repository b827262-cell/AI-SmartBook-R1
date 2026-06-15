import type { BookChapter } from "@ai-smartbook/schema";

/** Quick layout preset: PDF area vs AI area. PDF is the first value. */
export type ReaderRatio = "6:4" | "1:1" | "4:6";

export const READER_RATIOS: ReaderRatio[] = ["6:4", "1:1", "4:6"];

/** AI pane width (px) each ratio preset maps to (within the AI min/max range). */
export const RATIO_AI_WIDTH: Record<ReaderRatio, number> = {
  "6:4": 320,
  "1:1": 440,
  "4:6": 560
};

/** Discrete zoom percentages applied to the PDF.js render scale. Default 100. */
export const ZOOM_OPTIONS = [50, 75, 90, 100, 110, 125, 150, 175, 200];

/**
 * PDF-native reader toolbar. Every control drives the protected PDF viewer
 * state (chapter page jump, page step, render zoom, layout, collapse). The
 * ratio buttons are quick presets for the AI pane width; users can also drag
 * the split handles for fine control.
 */
export function PdfReaderToolbar({
  chapters,
  activeChapter,
  onSelectChapter,
  fullWidth,
  onToggleFullWidth,
  tocCollapsed,
  onToggleToc,
  aiCollapsed,
  onToggleAi,
  zoom,
  onZoom,
  ratio,
  onRatio,
  page,
  pageCount,
  onPrevPage,
  onNextPage,
  onOpenNote,
  onAskAi
}: {
  chapters: BookChapter[];
  activeChapter: string | null;
  onSelectChapter: (chapterId: string | null) => void;
  fullWidth: boolean;
  onToggleFullWidth: () => void;
  tocCollapsed: boolean;
  onToggleToc: () => void;
  aiCollapsed: boolean;
  onToggleAi: () => void;
  zoom: number;
  onZoom: (zoom: number) => void;
  ratio: ReaderRatio | null;
  onRatio: (ratio: ReaderRatio) => void;
  page: number | null;
  pageCount: number | null;
  onPrevPage: () => void;
  onNextPage: () => void;
  onOpenNote: () => void;
  onAskAi: () => void;
}) {
  const hasPdf = page != null;
  const atFirst = page == null || page <= 1;
  const atLast = page == null || (pageCount != null && page >= pageCount);

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
        value={activeChapter ?? ""}
        onChange={(e) => onSelectChapter(e.target.value || null)}
        title="章節大綱（跳至 PDF 實體頁）"
      >
        <option value="">全部內容（第 1 頁）</option>
        {chapters.map((ch) => (
          <option key={ch.id} value={ch.id}>
            {ch.orderIndex + 1}. {ch.title}
            {ch.pageStart != null ? `（P${ch.pageStart}）` : ""}
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

      <button type="button" className="tool-btn" onClick={onOpenNote} title="貼圖筆記">
        📌 貼圖筆記
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
        {aiCollapsed ? "展開AI" : "收合AI"}
      </button>

      <button type="button" className="tool-btn ask" onClick={onAskAi}>
        問AI
      </button>
    </div>
  );
}
