import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { BookQaLog, SmartBookNote } from "@ai-smartbook/schema";
import { adminApi } from "../api";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { AdminCard } from "../components/admin/AdminCard";
import { AdminErrorCard } from "../components/admin/AdminErrorCard";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init
  });
  if (!res.ok) {
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(d.error || `${res.status}`);
  }
  return res.json() as Promise<T>;
}

type KpSettings = { sidebarEnabled: boolean; searchEnabled: boolean; defaultExpanded: boolean };
type KpStats = { totalChapters: number; totalKnowledgePoints: number; lastUpdatedAt: string | null };

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

  // Knowledge points state
  const [kps, setKps] = useState<SmartBookNote[]>([]);
  const [kpStats, setKpStats] = useState<KpStats | null>(null);
  const [kpSettings, setKpSettings] = useState<KpSettings>({ sidebarEnabled: true, searchEnabled: true, defaultExpanded: false });
  const [kpSyncing, setKpSyncing] = useState(false);
  const [kpMsg, setKpMsg] = useState("");

  const loadLogs = useCallback(() => {
    setLoadError("");
    return adminApi
      .getQaLogs(bookId)
      .then((r) => setLogs(r.logs))
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, [bookId]);

  function loadKpData() {
    void http<{ knowledgePoints: SmartBookNote[] }>(`/api/admin/books/${bookId}/knowledge-points`)
      .then((r) => setKps(r.knowledgePoints));
    void http<KpStats>(`/api/admin/books/${bookId}/knowledge-points/stats`)
      .then(setKpStats);
    void http<KpSettings>(`/api/admin/books/${bookId}/knowledge-points/settings`)
      .then(setKpSettings);
  }

  useEffect(() => {
    void loadLogs();
    loadKpData();
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

  async function handleKpSync() {
    setKpSyncing(true);
    setKpMsg("");
    try {
      const r = await http<{ synced: number; message: string }>(`/api/admin/books/${bookId}/knowledge-points/sync`, { method: "POST" });
      setKpMsg(r.message);
      loadKpData();
    } catch (e: unknown) {
      setKpMsg(`同步失敗：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setKpSyncing(false);
    }
  }

  async function handleKpSettingToggle(key: keyof KpSettings) {
    const updated = { ...kpSettings, [key]: !kpSettings[key] };
    try {
      await http(`/api/admin/books/${bookId}/knowledge-points/settings`, {
        method: "PUT",
        body: JSON.stringify(updated)
      });
      setKpSettings(updated);
    } catch (e: unknown) {
      setKpMsg(`設定儲存失敗：${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const header = (
    <AdminPageHeader
      title="書本 Q&A / 知識點管理"
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
            Q&A 管理
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

      {/* Knowledge Points Management */}
      <div style={{ marginTop: "1.5rem", borderTop: "2px solid #e5e7eb", paddingTop: "1.5rem" }}>
        <h2 style={{ margin: "0 0 1rem", fontSize: 18, fontWeight: 700 }}>知識點管理</h2>

        {kpStats && (
          <AdminCard title="知識點總覽">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 12 }}>
              {[
                { label: "總章節數", value: `${kpStats.totalChapters} 章` },
                { label: "知識點總數", value: `${kpStats.totalKnowledgePoints} 個` },
                { label: "最後更新", value: kpStats.lastUpdatedAt ? new Date(kpStats.lastUpdatedAt).toLocaleString("zh-Hant") : "—" }
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button className="admin-btn secondary" onClick={() => void handleKpSync()} disabled={kpSyncing}>
                {kpSyncing ? "同步中…" : "重新同步 JSON"}
              </button>
              {kpMsg && <span style={{ fontSize: 13, color: "#6b7280" }}>{kpMsg}</span>}
            </div>
          </AdminCard>
        )}

        <div style={{ marginTop: "1rem" }}>
          <AdminCard title="知識點功能開關">
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>關閉的功能將不會顯示在學生端。</p>
            {([
              ["sidebarEnabled", "啟用知識點側欄", "控制學生端是否顯示知識點側欄"],
              ["searchEnabled", "顯示搜尋欄", "控制學生端知識點搜尋功能"],
              ["defaultExpanded", "預設展開章節", "章節是否預設展開"]
            ] as [keyof KpSettings, string, string][]).map(([key, label, desc]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{desc}</div>
                </div>
                <button
                  onClick={() => void handleKpSettingToggle(key)}
                  style={{
                    padding: "4px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12,
                    background: kpSettings[key] ? "#dcfce7" : "#fee2e2",
                    color: kpSettings[key] ? "#15803d" : "#dc2626"
                  }}
                >
                  {kpSettings[key] ? "開啟" : "關閉"}
                </button>
              </div>
            ))}
          </AdminCard>
        </div>

        {kps.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <AdminCard title={`知識點預覽（${kps.length} 筆）`}>
              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>標題</th>
                      <th>內容摘要</th>
                      <th>頁碼</th>
                      <th>建立時間</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kps.slice(0, 20).map((kp) => (
                      <tr key={kp.id}>
                        <td><strong>{kp.title}</strong></td>
                        <td className="muted">{(kp.content ?? "").slice(0, 60)}{(kp.content?.length ?? 0) > 60 ? "…" : ""}</td>
                        <td className="muted">{kp.pageNumber ?? "—"}</td>
                        <td className="muted">{new Date(kp.createdAt).toLocaleString("zh-Hant")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {kps.length > 20 && <p className="muted" style={{ marginTop: 8 }}>僅顯示前 20 筆，共 {kps.length} 筆。</p>}
            </AdminCard>
          </div>
        )}
      </div>
    </div>
  );
}
