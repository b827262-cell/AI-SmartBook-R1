import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Book, SmartBookNote } from "@ai-smartbook/schema";
import { adminApi, type AdminSmartBookNote } from "../api";
import { AdminCard } from "../components/admin/AdminCard";
import { AdminErrorCard } from "../components/admin/AdminErrorCard";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";

const NOTE_TYPE_LABEL: Record<SmartBookNote["type"], string> = {
  text: "文字筆記",
  ai_answer: "AI 回答",
  canvas: "手寫筆記"
};

function buildStudentReaderUrl(bookId: string): string {
  if (typeof window === "undefined") return `/books/${bookId}`;
  const url = new URL(`/books/${bookId}`, window.location.origin);
  if (url.port === "5174") url.port = "5173";
  return url.toString();
}

function noteContext(note: AdminSmartBookNote): string {
  const parts: string[] = [];
  if (note.pageNumber != null) parts.push(`第 ${note.pageNumber} 頁`);
  if (note.chapterId) parts.push(`章節 ${note.chapterId}`);
  return parts.join(" / ") || "無頁碼或章節資訊";
}

function notePreview(note: AdminSmartBookNote): string {
  if (note.content?.trim()) return note.content.trim();
  if (note.type === "canvas") return "此筆記為手寫畫布內容，請使用閱讀器查看。";
  return "—";
}

export function AdminNotesPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [notes, setNotes] = useState<AdminSmartBookNote[]>([]);
  const bookTitleMap = useMemo(() => new Map(books.map((b) => [b.id, b.title])), [books]);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const loadBooks = useCallback(async () => {
    const response = await adminApi.listBooks();
    setBooks(response.books);
  }, []);

  const loadNotes = useCallback(async (bookId: string) => {
    const response = bookId
      ? await adminApi.listNotesByBook(bookId)
      : await adminApi.listNotes();
    setNotes(response.notes);
  }, []);

  const loadPage = useCallback(
    async (bookId: string) => {
      setLoading(true);
      setError("");
      try {
        await Promise.all([loadBooks(), loadNotes(bookId)]);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [loadBooks, loadNotes]
  );

  useEffect(() => {
    void loadPage(selectedBookId);
  }, [loadPage, selectedBookId]);

  const selectedBook = useMemo(
    () => books.find((book) => book.id === selectedBookId) ?? null,
    [books, selectedBookId]
  );

  async function onDelete(note: AdminSmartBookNote) {
    const confirmed = window.confirm(
      `確定要刪除「${note.title || NOTE_TYPE_LABEL[note.type]}」嗎？此操作無法復原。`
    );
    if (!confirmed) return;

    setDeletingId(note.id);
    setActionError("");
    setMessage("");
    try {
      await adminApi.deleteNote(note.bookId, note.id);
      setMessage("筆記已刪除。");
      await loadNotes(selectedBookId);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingId("");
    }
  }

  const header = (
    <AdminPageHeader
      title="AI 筆記管理"
      subtitle="檢視學生端 smart_book_notes，依書本篩選並刪除不需要的筆記。"
      actions={
        <Link className="admin-btn ghost" to="/admin/notes-help">
          查看導覽說明
        </Link>
      }
    />
  );

  if (error) {
    return (
      <div>
        {header}
        <AdminErrorCard
          title="AI 筆記資料讀取失敗"
          description="無法載入後台筆記列表，請確認 Admin API 是否正常運作。"
          code={error}
          onRetry={() => void loadPage(selectedBookId)}
        />
      </div>
    );
  }

  return (
    <div>
      {header}

      <AdminCard title="篩選條件">
        <div className="admin-notes-toolbar">
          <div className="admin-notes-filter">
            <label htmlFor="admin-notes-book-filter">書本</label>
            <select
              id="admin-notes-book-filter"
              value={selectedBookId}
              onChange={(e) => {
                setSelectedBookId(e.target.value);
                setMessage("");
                setActionError("");
              }}
              disabled={loading}
            >
              <option value="">全部書本</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-notes-summary">
            <span>目前筆記數：{loading ? "載入中…" : notes.length}</span>
            <span>範圍：{selectedBook ? selectedBook.title : "全部書本"}</span>
          </div>
        </div>
      </AdminCard>

      {message ? <p style={{ color: "#166534", fontWeight: 600 }}>{message}</p> : null}
      {actionError ? <p style={{ color: "#b91c1c", fontWeight: 600 }}>{actionError}</p> : null}

      <AdminCard title={`筆記列表（${notes.length}）`}>
        {loading ? (
          <p className="muted">載入中…</p>
        ) : notes.length === 0 ? (
          <p className="muted">
            {selectedBook ? "這本書目前沒有學生筆記。" : "目前沒有任何學生筆記。"}
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>書本</th>
                  <th>標題 / 內容</th>
                  <th>類型</th>
                  <th>頁碼</th>
                  <th>章節</th>
                  <th>建立時間</th>
                  <th>相關連結</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {notes.map((note) => (
                  <tr key={note.id}>
                    <td>
                      <strong>{bookTitleMap.get(note.bookId) ?? note.bookId.slice(0, 12) + "…"}</strong>
                      <div className="muted" style={{ fontSize: "0.78rem" }}>{note.bookId}</div>
                    </td>
                    <td className="admin-note-content-cell">
                      <p className="admin-note-title">{note.title || NOTE_TYPE_LABEL[note.type]}</p>
                      <p className="admin-note-content">{notePreview(note)}</p>
                      <div className="muted" style={{ marginTop: "0.35rem" }}>
                        {noteContext(note)}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${note.type}`}>{NOTE_TYPE_LABEL[note.type]}</span>
                    </td>
                    <td>{note.pageNumber ?? "—"}</td>
                    <td>{note.chapterId ?? "—"}</td>
                    <td>{new Date(note.createdAt).toLocaleString("zh-TW")}</td>
                    <td>
                      <div className="admin-note-actions">
                        <a
                          className="admin-inline-text-link"
                          href={buildStudentReaderUrl(note.bookId)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          開啟學生閱讀器
                        </a>
                        <Link className="admin-inline-text-link" to={`/admin/books/${note.bookId}`}>
                          後台查看書本
                        </Link>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-link-btn"
                        onClick={() => void onDelete(note)}
                        disabled={deletingId === note.id}
                      >
                        {deletingId === note.id ? "刪除中…" : "刪除"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
