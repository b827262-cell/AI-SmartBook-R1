import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Book } from "@ai-smartbook/schema";
import type { StudentNote } from "../studentClient";
import { studentClient } from "../studentClient";

type NoteType = "text" | "ai_answer" | "canvas";

interface NoteItem extends StudentNote {
  bookTitle: string;
  bookSubtitle?: string | null;
  bookId: string;
}

const TYPE_LABEL: Record<NoteType, string> = {
  text: "文字",
  ai_answer: "AI 解答",
  canvas: "手寫"
};

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "未知日期";
  return d.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function emptyState(mode: string): string {
  if (mode === "my-notes") {
    return "尚未建立題庫與收藏資料。此頁目前先呈現可用的智能筆記。";
  }
  return "尚未建立筆記。可在閱讀器操作時用「文字筆記」與「AI 解答」類型新增。";
}

export function NotesDirectoryPage({
  mode,
  title,
  intro
}: {
  mode: "notes" | "my-notes";
  title: string;
  intro: string;
}) {
  const [searchParams] = useSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.get("type") || "all");
  const selectedBookId = searchParams.get("bookId") || "";

  useEffect(() => {
    const selectedFromQuery = searchParams.get("type");
    if (selectedFromQuery) {
      setTypeFilter(selectedFromQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const bookResult = await studentClient.listBooks();
        const allBooks = bookResult.books;
        setBooks(allBooks);

        const targetBooks =
          selectedBookId && allBooks.some((book) => book.id === selectedBookId)
            ? allBooks.filter((book) => book.id === selectedBookId)
            : allBooks;

        const settled = await Promise.allSettled(
          targetBooks.map(async (book) => {
            const response = await studentClient.listNotes(book.id);
            return response.notes.map((note) => ({
              ...note,
              bookId: book.id,
              bookTitle: book.title,
              bookSubtitle: book.subtitle
            }));
          })
        );
        const merged = settled.flatMap((item) => (item.status === "fulfilled" ? item.value : []));
        merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setNotes(merged);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setNotes([]);
        setBooks([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [selectedBookId]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return notes.filter((note) => {
      if (typeFilter !== "all" && note.type !== typeFilter) return false;
      if (!keyword) return true;
      return (
        (note.title || "").toLowerCase().includes(keyword) ||
        (note.content || "").toLowerCase().includes(keyword) ||
        note.bookTitle.toLowerCase().includes(keyword)
      );
    });
  }, [notes, query, typeFilter]);

  async function removeNote(noteId: string, bookId: string) {
    if (busyId) return;
    if (!window.confirm("確定刪除這則筆記？")) return;
    try {
      setBusyId(noteId);
      await studentClient.deleteNote(bookId, noteId);
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
      if (filtered.length === 1) {
        setFilteredTypeIfEmpty();
      }
    } catch (e) {
      window.alert(`刪除失敗：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusyId("");
    }
  }

  function setFilteredTypeIfEmpty() {
    // keep type filter when removing note for now; no-op placeholder to keep behavior explicit.
    if (typeFilter !== "all" && filtered.length <= 1) {
      setTypeFilter("all");
    }
  }

  const typeOptions = [
    { value: "all", label: "全部" },
    { value: "text", label: "文字" },
    { value: "ai_answer", label: "AI 解答" },
    { value: "canvas", label: "手寫" }
  ];

  return (
    <main className="notes-page">
      <section className="notes-page-head">
        <Link to="/books" className="notes-btn">
          ← 回到書本
        </Link>
        <div>
          <h1>{title}</h1>
          <p className="muted">{intro}</p>
        </div>
      </section>

      <section className="notes-filterbar">
        <label>
          <span>關鍵字</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜尋標題、內容、書名"
          />
        </label>
        <label>
          <span>類型</span>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {loading ? (
        <p className="muted">載入中…</p>
      ) : error ? (
        <p className="error-text">{error}</p>
      ) : filtered.length === 0 ? (
        <section className="notes-empty">{emptyState(mode)}</section>
      ) : (
        <section className="notes-list">
          {filtered.map((note) => (
            <article key={note.id} className="notes-item">
              <div className="notes-item-head">
                <div>
                  <strong>{note.title || "(未命名筆記)"}</strong>
                  <p className="muted">
                    {note.bookTitle}
                    {note.pageNumber != null && ` / 第 ${note.pageNumber} 頁`}
                    {note.chapterId ? ` / ${note.chapterId}` : ""}
                  </p>
                </div>
                <span className={`notes-type-badge ${note.type}`}>{TYPE_LABEL[note.type]}</span>
              </div>
              <p className="notes-item-body">{note.content || "（無內容）"}</p>
              <p className="notes-item-meta">
                更新：{formatDate(note.updatedAt)} · 書籍ID：{note.bookId}
              </p>
              <div className="notes-item-actions">
                <Link className="notes-btn notes-btn-small" to={`/books/${note.bookId}/read`}>
                  前往書本
                </Link>
                <button
                  type="button"
                  className="notes-btn notes-btn-small"
                  onClick={() => void removeNote(note.id, note.bookId)}
                  disabled={busyId === note.id}
                >
                  刪除
                </button>
              </div>
            </article>
          ))}
          {books.length > 0 ? (
            <p className="notes-page-meta">已載入 {filtered.length} 則筆記 · 共 {books.length} 本書</p>
          ) : null}
        </section>
      )}
    </main>
  );
}
