import type { BookChapter } from "@ai-smartbook/schema";

/**
 * Left chapter table-of-contents. Active chapter is highlighted in blue. When
 * the book has no chapters it shows an empty state but still offers "全部內容".
 */
export function ChapterSidebar({
  chapters,
  activeChapter,
  onSelect
}: {
  chapters: BookChapter[];
  activeChapter: string | null;
  onSelect: (chapterId: string | null) => void;
}) {
  return (
    <aside className="reader-toc">
      <h4>章節目錄</h4>
      <ul className="chapter-list">
        <li>
          <button
            className={activeChapter === null ? "active" : ""}
            onClick={() => onSelect(null)}
          >
            全部內容
          </button>
        </li>
        {chapters.map((ch) => (
          <li key={ch.id}>
            <button
              className={activeChapter === ch.id ? "active" : ""}
              onClick={() => onSelect(ch.id)}
            >
              <span className="ch-order">{ch.orderIndex + 1}.</span> {ch.title}
            </button>
          </li>
        ))}
      </ul>
      {chapters.length === 0 && <p className="muted toc-empty">尚未建立章節目錄</p>}
    </aside>
  );
}
