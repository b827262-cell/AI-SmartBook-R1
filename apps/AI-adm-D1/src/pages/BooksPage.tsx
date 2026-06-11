import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Book } from "@ai-smartbook/schema";
import { adminApi } from "../api";

export function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .listBooks()
      .then((d) => setBooks(d.books))
      .catch((e) => setError(String(e.message)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="row between" style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0 }}>書本管理</h2>
        <Link className="btn" to="/admin/books/new">
          + 新增書本
        </Link>
      </div>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">載入中…</p>
      ) : books.length === 0 ? (
        <div className="card">尚無書本，請先新增。</div>
      ) : (
        <div className="book-grid">
          {books.map((b) => (
            <Link key={b.id} to={`/admin/books/${b.id}`} className="card" style={{ display: "block" }}>
              <div className="row between">
                <strong>{b.title}</strong>
                <span className={`badge ${b.status}`}>{b.status}</span>
              </div>
              <p className="muted" style={{ marginBottom: 4 }}>類科：{b.category || "未分類"}</p>
              {b.subtitle && <p className="muted">{b.subtitle}</p>}
              <p className="muted" style={{ marginBottom: 0 }}>
                {b.description?.slice(0, 60) || "（無描述）"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
