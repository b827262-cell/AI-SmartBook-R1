import type { BookChapter, BookContent } from "@ai-smartbook/schema";

export type ReaderRatio = "7:3" | "1:1" | "3:7";

/**
 * Center reading viewport: a toolbar plus a white "paper" content area with
 * proper typographic spacing (not raw text). Most toolbar controls are real
 * (collapse / chapter select / zoom / ratio / ask-AI); sticky-note is a visual
 * placeholder per scope.
 */
export function ReaderViewport({
  title,
  chapters,
  activeChapter,
  onSelectChapter,
  contents,
  collapsed,
  onToggleCollapsed,
  zoom,
  onZoomReset,
  ratio,
  onRatio,
  onAskAi
}: {
  title: string;
  chapters: BookChapter[];
  activeChapter: string | null;
  onSelectChapter: (id: string | null) => void;
  contents: BookContent[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  zoom: number;
  onZoomReset: () => void;
  ratio: ReaderRatio;
  onRatio: (r: ReaderRatio) => void;
  onAskAi: () => void;
}) {
  const ratios: ReaderRatio[] = ["7:3", "1:1", "3:7"];

  return (
    <section className="reader-viewport">
      <div className="reader-toolbar">
        <button type="button" className="tool-btn" onClick={onToggleCollapsed}>
          {collapsed ? "▸ 展開章節" : "◂ 收合章節"}
        </button>

        <select
          className="tool-select"
          value={activeChapter ?? ""}
          onChange={(e) => onSelectChapter(e.target.value || null)}
        >
          <option value="">{title} · 全部內容</option>
          {chapters.map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.orderIndex + 1}. {ch.title}
            </option>
          ))}
        </select>

        <span className="tool-page">{contents.length} 頁</span>

        <button type="button" className="tool-btn" onClick={onZoomReset} title="重設縮放">
          {zoom}%
        </button>

        <button type="button" className="tool-btn" title="貼圖筆記（即將推出）">
          📌 貼圖筆記
        </button>

        <div className="tool-ratio">
          {ratios.map((r) => (
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

        <button type="button" className="tool-btn ask" onClick={onAskAi}>
          問 AI
        </button>
      </div>

      <div className="reader-paper-scroll">
        <article className="reader-paper" style={{ fontSize: `${zoom}%` }}>
          <h1 className="paper-title">{title}</h1>
          {contents.length === 0 ? (
            <p className="muted">這個章節還沒有內容。</p>
          ) : (
            contents.map((c) => (
              <p className="paper-para" key={c.id}>
                {c.pageNumber != null && <span className="paper-pageno">p.{c.pageNumber}</span>}
                {c.contentText}
              </p>
            ))
          )}
        </article>
      </div>
    </section>
  );
}
