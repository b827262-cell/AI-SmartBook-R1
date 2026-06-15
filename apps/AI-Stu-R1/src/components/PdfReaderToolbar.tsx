import type { BookChapter } from "@ai-smartbook/schema";

/** PDF area vs AI area width ratio. PDF is the first value. */
export type ReaderRatio = "6:4" | "1:1" | "4:6";

export const READER_RATIOS: ReaderRatio[] = ["6:4", "1:1", "4:6"];

/** Discrete zoom percentages applied to the PDF viewer. Default is 100. */
export const ZOOM_OPTIONS = [75, 90, 100, 110, 125, 150];

/**
 * PDF-native reader toolbar. Every control drives the protected PDF viewer
 * state (chapter page jump, zoom, layout ratio, collapse) rather than the old
 * MD/text reader. It does not fetch or render the PDF itself.
 */
export function PdfReaderToolbar({
  chapters,
  activeChapter,
  onSelectChapter,
  tocCollapsed,
  onToggleToc,
  aiCollapsed,
  onToggleAi,
  zoom,
  onZoom,
  ratio,
  onRatio,
  page,
  onOpenNote,
  onAskAi
}: {
  chapters: BookChapter[];
  activeChapter: string | null;
  onSelectChapter: (chapterId: string | null) => void;
  tocCollapsed: boolean;
  onToggleToc: () => void;
  aiCollapsed: boolean;
  onToggleAi: () => void;
  zoom: number;
  onZoom: (zoom: number) => void;
  ratio: ReaderRatio;
  onRatio: (ratio: ReaderRatio) => void;
  page: number | null;
  onOpenNote: () => void;
  onAskAi: () => void;
}) {
  return (
    <div className="pdf-toolbar">
      <button type="button" className="tool-btn" onClick={onToggleToc}>
        {tocCollapsed ? "▸ 展開章節" : "◂ 收合章節"}
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

      <span className="tool-page" title="目前 PDF 實體頁">
        {page != null ? `P${page}` : "—"}
      </span>

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

      <div className="tool-ratio" title="PDF 與 AI 區域比例">
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
