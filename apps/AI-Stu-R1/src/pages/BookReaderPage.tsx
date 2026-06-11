import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { BookChapter, BookContent } from "@ai-smartbook/schema";
import { studentClient, type BookDetail } from "../studentClient";
import { BookCover } from "../components/BookCover";
import { ChatPanel } from "../components/ChatPanel";

export function BookReaderPage() {
  const { bookId = "" } = useParams();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [contents, setContents] = useState<BookContent[]>([]);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([studentClient.getBook(bookId), studentClient.getContents(bookId)])
      .then(([b, c]) => {
        setBook(b.book);
        setContents(c.contents);
      })
      .catch((e) => setError(String(e.message)))
      .finally(() => setLoading(false));
  }, [bookId]);

  // Contents shown for the selected chapter (or all when none selected).
  const shownContents = useMemo(
    () => (activeChapter ? contents.filter((c) => c.chapterId === activeChapter) : contents),
    [contents, activeChapter]
  );

  if (loading) return <p className="muted">載入中…</p>;
  if (error) return <p style={{ color: "#b91c1c" }}>{error}</p>;
  if (!book) return <p className="muted">找不到這本書。</p>;

  const chapters: BookChapter[] = book.chapters ?? [];

  return (
    <div>
      <div className="row" style={{ marginBottom: 16 }}>
        <Link className="back-link" to="/books">
          ← 返回書庫
        </Link>
      </div>

      <div className="reader-grid">
        {/* Left: book meta */}
        <aside className="reader-meta">
          <BookCover book={book} size="hero" />
          <h2>{book.title}</h2>
          {book.subtitle && <p className="muted">{book.subtitle}</p>}
          <p className="cat-tag">{book.category || "未分類"}</p>
          {book.description && <p className="desc">{book.description}</p>}
        </aside>

        {/* Center: chapters + contents */}
        <section className="reader-body">
          <h4>章節目錄</h4>
          {chapters.length === 0 ? (
            <p className="muted">尚未建立章節目錄</p>
          ) : (
            <ul className="chapter-list">
              <li>
                <button
                  className={activeChapter === null ? "active" : ""}
                  onClick={() => setActiveChapter(null)}
                >
                  全部內容
                </button>
              </li>
              {chapters.map((ch) => (
                <li key={ch.id}>
                  <button
                    className={activeChapter === ch.id ? "active" : ""}
                    onClick={() => setActiveChapter(ch.id)}
                  >
                    <span className="ch-order">{ch.orderIndex + 1}.</span> {ch.title}
                  </button>
                  {activeChapter === ch.id && ch.summary && (
                    <p className="ch-summary">{ch.summary}</p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <h4 style={{ marginTop: 24 }}>內容</h4>
          {shownContents.length === 0 ? (
            <p className="muted">這個章節還沒有內容。</p>
          ) : (
            shownContents.map((c) => (
              <p className="para" key={c.id}>
                {c.pageNumber != null && <span className="pageno">p.{c.pageNumber}</span>}
                {c.contentText}
              </p>
            ))
          )}
        </section>

        {/* Right: knowledge QA chat */}
        <aside className="reader-chat">
          <h4>知識問答</h4>
          <ChatPanel bookId={bookId} />
        </aside>
      </div>
    </div>
  );
}
