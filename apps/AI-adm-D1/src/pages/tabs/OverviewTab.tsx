import { useEffect, useState } from "react";
import type { Book, BookChapter, BookFile } from "@ai-smartbook/schema";
import { adminApi } from "../../api";

export function OverviewTab({ bookId }: { bookId: string }) {
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [files, setFiles] = useState<BookFile[]>([]);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    adminApi.getBook(bookId).then((d) => {
      setBook(d.book);
      setChapters(d.chapters);
      setFiles(d.files);
      setStatus(d.book.status);
    });
  }, [bookId]);

  if (!book) return <p className="muted">載入中…</p>;

  async function changeStatus(next: string) {
    const { book: updated } = await adminApi.updateBook(bookId, {
      status: next as Book["status"]
    });
    setStatus(updated.status);
  }

  return (
    <div className="card">
      <p className="muted">{book.description || "（無描述）"}</p>
      <div className="row" style={{ gap: 24, marginTop: 12 }}>
        <div>檔案：<strong>{files.length}</strong></div>
        <div>章節：<strong>{chapters.length}</strong></div>
        <div>
          狀態：
          <select
            value={status}
            onChange={(e) => changeStatus(e.target.value)}
            style={{ width: 160, display: "inline-block", marginLeft: 8 }}
          >
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </div>
      </div>
    </div>
  );
}
