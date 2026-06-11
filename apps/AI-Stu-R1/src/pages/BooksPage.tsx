import { useEffect, useMemo, useState } from "react";
import type { Book } from "@ai-smartbook/schema";
import { studentClient } from "../studentClient";
import { BookCard } from "../components/BookCard";

interface CategoryGroup {
  category: string;
  books: Book[];
}

/** Group books by category; counts are derived from data, never hardcoded. */
function groupByCategory(books: Book[]): CategoryGroup[] {
  const map = new Map<string, Book[]>();
  for (const b of books) {
    const key = b.category?.trim() || "未分類";
    const list = map.get(key) ?? [];
    list.push(b);
    map.set(key, list);
  }
  return [...map.entries()]
    .map(([category, list]) => ({ category, books: list }))
    .sort((a, b) => b.books.length - a.books.length || a.category.localeCompare(b.category));
}

export function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    studentClient
      .listBooks()
      .then((d) => setBooks(d.books))
      .catch((e) => setError(String(e.message)))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => groupByCategory(books), [books]);
  const activeGroup = groups.find((g) => g.category === active) ?? null;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>智能書本</h2>
      <p className="muted">選擇一個類科，瀏覽該類科底下的書本。</p>
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      {loading ? (
        <p className="muted">載入中…</p>
      ) : books.length === 0 ? (
        <p className="muted">目前沒有可閱讀的書本。</p>
      ) : !activeGroup ? (
        <div className="category-grid">
          {groups.map((g) => (
            <button key={g.category} className="category-card" onClick={() => setActive(g.category)}>
              <span className="cat-name">{g.category}</span>
              <span className="cat-count">{g.books.length} 本</span>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <div className="row" style={{ marginBottom: 16, gap: 12, alignItems: "center" }}>
            <button className="back-link" onClick={() => setActive(null)}>
              ← 所有類科
            </button>
            <h3 style={{ margin: 0 }}>
              {activeGroup.category}（{activeGroup.books.length} 本）
            </h3>
          </div>
          <div className="book-grid">
            {activeGroup.books.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
