import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { BookChapter, BookContent } from "@ai-smartbook/schema";
import { studentClient } from "../studentClient";

export function ReadPage() {
  const { bookId = "" } = useParams();
  const [title, setTitle] = useState("");
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [contents, setContents] = useState<BookContent[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([studentClient.getBook(bookId), studentClient.getContents(bookId)])
      .then(([b, c]) => {
        setTitle(b.book.title);
        setChapters(b.book.chapters);
        setContents(c.contents);
      })
      .catch((e) => setError(String(e.message)));
  }, [bookId]);

  if (error) return <p style={{ color: "#b91c1c" }}>{error}</p>;

  return (
    <div>
      <div className="row" style={{ marginBottom: 16 }}>
        <Link className="back-link" to="/books">
          ← 返回書本
        </Link>
      </div>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <div className="reader">
        <aside className="toc">
          <h4>章節</h4>
          {chapters.length === 0 ? (
            <p className="muted">尚無章節</p>
          ) : (
            chapters.map((ch) => (
              <a key={ch.id} href={`#chapter-${ch.id}`}>
                {ch.title}
              </a>
            ))
          )}
          <p style={{ marginTop: 16 }}>
            <Link className="btn ghost" to={`/books/${bookId}/chat`}>
              問這本書
            </Link>
          </p>
        </aside>
        <section className="page">
          {contents.length === 0 ? (
            <p className="muted">這本書還沒有內容。</p>
          ) : (
            contents.map((c) => (
              <p className="para" key={c.id}>
                {c.pageNumber != null && <span className="pageno">p.{c.pageNumber}</span>}
                {c.contentText}
              </p>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
