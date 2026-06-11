import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Book, BookChapter, BookContent } from "@ai-smartbook/schema";
import { adminApi } from "../api";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { AdminCard } from "../components/admin/AdminCard";
import { AdminErrorCard } from "../components/admin/AdminErrorCard";

export function ChaptersPage() {
  const { bookId = "" } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [contents, setContents] = useState<BookContent[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError("");
    return Promise.all([adminApi.getBook(bookId), adminApi.getContents(bookId)])
      .then(([b, c]) => {
        setBook(b.book);
        setChapters(b.chapters);
        setContents(c.contents);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [bookId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function regenerate() {
    setBusy(true);
    setError("");
    try {
      await adminApi.generateChapters(bookId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function contentCount(chapterId: string): number {
    return contents.filter((c) => c.chapterId === chapterId).length;
  }

  if (error) {
    return (
      <div>
        <AdminPageHeader
          title="書本章節管理"
          actions={
            <Link className="admin-btn ghost" to="/admin/books">
              返回書本列表
            </Link>
          }
        />
        <AdminErrorCard
          title="章節資料讀取失敗"
          description="後端目前無法回應，請確認 API Server 是否啟動，或稍後重新整理。"
          code={error}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="書本章節管理"
        actions={
          <>
            <Link className="admin-btn ghost" to="/admin/books">
              返回書本列表
            </Link>
            <button className="admin-btn" onClick={regenerate} disabled={busy}>
              {busy ? "處理中…" : "重新產生章節"}
            </button>
            <button
              className="admin-btn secondary"
              onClick={regenerate}
              disabled={busy}
              title="重新依 PDF 內建 outline 產生章節（冪等，不會疊加）"
            >
              同步 PDF Outline
            </button>
          </>
        }
      />

      <AdminCard title="書本資訊">
        {!book ? (
          <p className="muted">載入中…</p>
        ) : (
          <div className="admin-info-grid">
            <div><span className="muted">書名</span><strong>{book.title}</strong></div>
            <div><span className="muted">類科</span><strong>{book.category || "未分類"}</strong></div>
            <div><span className="muted">作者</span><strong>{book.subtitle || "—"}</strong></div>
            <div><span className="muted">章節數</span><strong>{chapters.length}</strong></div>
            <div><span className="muted">狀態</span><span className={`badge ${book.status}`}>{book.status}</span></div>
          </div>
        )}
      </AdminCard>

      <AdminCard title={`章節列表（${chapters.length}）`}>
        {chapters.length === 0 ? (
          <p className="muted">尚未建立章節，請按「重新產生章節」。</p>
        ) : (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>章節標題</th>
                  <th>頁碼</th>
                  <th>層級</th>
                  <th>對應內容</th>
                </tr>
              </thead>
              <tbody>
                {chapters.map((c) => {
                  const n = contentCount(c.id);
                  return (
                    <tr key={c.id}>
                      <td>{c.orderIndex + 1}. {c.title}</td>
                      <td>{c.pageStart != null ? `${c.pageStart}${c.pageEnd != null ? `–${c.pageEnd}` : ""}` : "—"}</td>
                      <td>L1</td>
                      <td>
                        {n > 0 ? (
                          <span className="badge parsed">已連結 {n} 段</span>
                        ) : (
                          <span className="badge draft">未連結</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <div className="admin-inline-link">
        <button className="admin-link-btn" onClick={() => navigate(`/admin/books/${bookId}/qa`)}>
          前往「書本 Q&A / 知識問答」 →
        </button>
      </div>
    </div>
  );
}
