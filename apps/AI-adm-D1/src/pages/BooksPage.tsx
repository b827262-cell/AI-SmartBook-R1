import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Book } from "@ai-smartbook/schema";
import { adminApi } from "../api";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { AdminCard } from "../components/admin/AdminCard";
import { AdminErrorCard } from "../components/admin/AdminErrorCard";

export function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    return adminApi
      .listBooks()
      .then((d) => setBooks(d.books))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const header = (
    <AdminPageHeader
      title="智能書本管理"
      subtitle="管理書本上架、章節與知識問答"
      actions={
        <Link className="admin-btn" to="/admin/books/new">
          + 新增書本
        </Link>
      }
    />
  );

  if (error) {
    return (
      <div>
        {header}
        <AdminErrorCard
          title="書本列表讀取失敗"
          description="後端目前無法回應，請確認 API Server 是否啟動，或稍後重新整理。"
          code={error}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  return (
    <div>
      {header}
      <AdminCard title={`書本列表（${books.length}）`}>
        {loading ? (
          <p className="muted">載入中…</p>
        ) : books.length === 0 ? (
          <p className="muted">尚無書本，請先新增。</p>
        ) : (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>書名</th>
                  <th>類科</th>
                  <th>作者</th>
                  <th>狀態</th>
                  <th>章節數</th>
                  <th>Q&A</th>
                  <th>建立時間</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {books.map((b) => (
                  <tr key={b.id}>
                    <td><strong>{b.title}</strong></td>
                    <td>{b.category || "未分類"}</td>
                    <td>{b.subtitle || "—"}</td>
                    <td><span className={`badge ${b.status}`}>{b.status}</span></td>
                    <td>—</td>
                    <td>—</td>
                    <td className="muted">{new Date(b.createdAt).toLocaleDateString("zh-Hant")}</td>
                    <td>
                      <div className="admin-row-actions">
                        <Link className="admin-link-btn" to={`/admin/books/${b.id}/chapters`}>查看章節</Link>
                        <Link className="admin-link-btn" to={`/admin/books/${b.id}/qa`}>管理 Q&A</Link>
                        <Link className="admin-link-btn" to={`/admin/books/${b.id}`}>編輯 / 檢視</Link>
                      </div>
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
