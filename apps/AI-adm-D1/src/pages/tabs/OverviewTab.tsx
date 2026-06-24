import { useEffect, useState } from "react";
import type { Book, BookChapter, BookFile } from "@ai-smartbook/schema";
import { adminApi } from "../../api";

export function OverviewTab({ bookId }: { bookId: string }) {
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [files, setFiles] = useState<BookFile[]>([]);
  const [status, setStatus] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [savedMeta, setSavedMeta] = useState(false);

  useEffect(() => {
    adminApi.getBook(bookId).then((d) => {
      setBook(d.book);
      setChapters(d.chapters);
      setFiles(d.files);
      setStatus(d.book.status);
      setCategory(d.book.category ?? "");
      setCoverUrl(d.book.coverUrl ?? "");
    });
  }, [bookId]);

  if (!book) return <p className="muted">載入中…</p>;

  async function changeStatus(next: string) {
    const { book: updated } = await adminApi.updateBook(bookId, {
      status: next as Book["status"]
    });
    setStatus(updated.status);
  }

  async function saveMeta() {
    // Blank category/coverUrl are normalized (未分類 / null) server-side.
    const { book: updated } = await adminApi.updateBook(bookId, { category, coverUrl });
    setCategory(updated.category ?? "");
    setCoverUrl(updated.coverUrl ?? "");
    setSavedMeta(true);
    setTimeout(() => setSavedMeta(false), 1500);
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
      <div className="row" style={{ gap: 16, marginTop: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block" }}>類科 / 分類</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="留空為未分類"
            style={{ width: 220 }}
          />
        </div>
        <div>
          <label style={{ display: "block" }}>封面圖片網址</label>
          <input
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="留空使用預設封面"
            style={{ width: 320 }}
          />
        </div>
        <button className="btn" type="button" onClick={saveMeta}>
          儲存分類 / 封面
        </button>
        {savedMeta && <span className="muted">已儲存 ✓</span>}
      </div>
    </div>
  );
}
