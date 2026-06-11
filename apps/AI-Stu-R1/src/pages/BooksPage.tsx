import { useEffect, useMemo, useState } from "react";
import { studentClient } from "../studentClient";
import {
  groupBooksByCategory,
  matchesBookSearch,
  sortBooksNewestFirst,
  type StudentBook
} from "../bookDisplay";
import { HeroSearchSection } from "../components/HeroSearchSection";
import { BookShelfSection } from "../components/BookShelfSection";

export function BooksPage() {
  const [books, setBooks] = useState<StudentBook[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    studentClient
      .listBooks()
      .then((d) => setBooks(d.books as StudentBook[]))
      .catch((e) => setError(String(e.message)))
      .finally(() => setLoading(false));
  }, []);

  const filteredBooks = useMemo(
    () => books.filter((book) => matchesBookSearch(book, query)),
    [books, query]
  );
  const groups = useMemo(() => groupBooksByCategory(filteredBooks), [filteredBooks]);
  const latestBooks = useMemo(
    () => sortBooksNewestFirst(filteredBooks).slice(0, 8),
    [filteredBooks]
  );

  return (
    <div className="books-homepage">
      <HeroSearchSection query={query} onQueryChange={setQuery} />

      <section className="books-homepage-state">
        <div className="bookshelf-inner">
          {error ? <p className="error-text">{error}</p> : null}
          {loading ? <p className="muted">載入中…</p> : null}
          {!loading && !error && books.length === 0 ? (
            <p className="muted">目前沒有可閱讀的書本。</p>
          ) : null}
          {!loading && !error && books.length > 0 && filteredBooks.length === 0 ? (
            <p className="muted">找不到符合搜尋條件的書籍。</p>
          ) : null}
        </div>
      </section>

      {!loading && !error && filteredBooks.length > 0 ? (
        <BookShelfSection groups={groups} latestBooks={latestBooks} />
      ) : null}
    </div>
  );
}
