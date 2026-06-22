import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { BookQaLog } from "@ai-smartbook/schema";
import { adminApi } from "../api";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { AdminCard } from "../components/admin/AdminCard";
import { AdminErrorCard } from "../components/admin/AdminErrorCard";

const MD_PLACEHOLDER = "Q: 這本書在做什麼？\nA: 這是老師整理好的標準答案。\n\nQ: 第二題...\nA: 第二題答案...";

export function QaPage() {
  const { bookId = "" } = useParams();
  const [logs, setLogs] = useState<BookQaLog[]>([]);
  const [loadError, setLoadError] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [actionError, setActionError] = useState("");
  const askRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLDivElement>(null);

  const loadLogs = useCallback(() => {
    setLoadError("");
    return adminApi
      .getQaLogs(bookId)
      .then((r) => setLogs(r.logs))
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, [bookId]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  async function onImport() {
    if (!markdown.trim()) return;
    setBusy(true);
    setActionError("");
    setMsg("");
    try {
      const r = await adminApi.importQaMarkdown(bookId, markdown);
      setMsg(`已手動上架 ${r.imported} 組 Q&A`);
      setMarkdown("");
      await loadLogs();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setBusy(true);
    setActionError("");
    setMsg("");
    try {
      await adminApi.ask(bookId, question);
      setQuestion("");
      await loadLogs();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <AdminPageHeader
      title="書本 Q&A / 知識問答"
      actions={
        <>
          <Link className="admin-btn ghost" to="/admin/books">
            返回書本列表
          </Link>
          <button
            className="admin-btn"
            onClick={() => askRef.current?.scrollIntoView({ behavior: "smooth" })}
          >
            新增 Q&A
          </button>
          <button
            className="admin-btn secondary"
            onClick={() => importRef.current?.scrollIntoView({ behavior: "smooth" })}
          >
            手動上架 Markdown
          </button>
        </>
      }
    />
  );

  if (loadError) {
    return (
      <div>
        {header}
        <AdminErrorCard
          title="Q&A 資料讀取失敗"
          description="後端目前無法回應，請確認 API Server 是否啟動，或稍後重新整理。"
          code={loadError}
          onRetry={() => void loadLogs()}
        />
      </div>
    );
  }

  return (
    <div>
      {header}

      <AdminCard title={`Q&A 列表（${logs.length}）`}>
        {logs.length === 0 ? (
          <p className="muted">尚無手動或 AI 問答紀錄。</p>
        ) : (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>問題</th>
                  <th>答案摘要</th>
                  <th>來源</th>
                  <th>建立時間</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td><strong>{log.question}</strong></td>
                    <td className="muted">{log.answer.slice(0, 80)}{log.answer.length > 80 ? "…" : ""}</td>
                    <td className="muted">{log.provider}/{log.model}</td>
                    <td className="muted">{new Date(log.createdAt).toLocaleString("zh-Hant")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <div ref={importRef}>
        <AdminCard title="手動上架 Q&A Markdown">
          <p className="muted">使用 `Q:` / `A:` 格式即可批次建立問答；重複上架會新增紀錄。</p>
          <textarea
            rows={9}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder={MD_PLACEHOLDER}
          />
          <div className="row" style={{ marginTop: 12 }}>
            <button className="admin-btn" onClick={onImport} disabled={busy || !markdown.trim()}>
              {busy ? "上架中…" : "手動上架"}
            </button>
            {msg && <span className="muted">{msg}</span>}
          </div>
        </AdminCard>
      </div>

      <div ref={askRef}>
        <AdminCard title="新增 Q&A（向書本提問）">
          <form className="row" onSubmit={onAsk}>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="輸入關於此書的問題…"
              style={{ flex: 1 }}
            />
            <button className="admin-btn" disabled={busy || !question.trim()}>
              {busy ? "送出中…" : "送出"}
            </button>
          </form>
        </AdminCard>
      </div>

      {actionError && <p className="error">{actionError}</p>}
    </div>
  );
}
