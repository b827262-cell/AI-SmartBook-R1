import { useEffect, useState } from "react";
import type { Book } from "@ai-smartbook/schema";
import { studentClient } from "../studentClient";
import { BookCard } from "../components/BookCard";

export function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentClient
      .listBooks()
      .then((d) => setBooks(d.books))
      .catch((e) => setError(String(e.message)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>智能書本</h2>
      <p className="muted">選擇一本書開始閱讀，或直接向書本提問。</p>
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
      {loading ? (
        <p className="muted">載入中…</p>
      ) : books.length === 0 ? (
        <p className="muted">目前沒有可閱讀的書本。</p>
      ) : (
        <div className="book-grid">
          {books.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      )}
    </div>
  );
}
