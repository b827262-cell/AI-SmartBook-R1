import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { AdminCard } from "../components/admin/AdminCard";

type SmartVideo = {
  id: string;
  bookId: string;
  chapterId: string | null;
  title: string;
  youtubeUrl: string;
  videoUrl: string;
  enabled: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

type Chapter = { id: string; title: string; orderIndex: number };

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

const EMPTY_FORM = { title: "", chapterId: "", youtubeUrl: "", videoUrl: "", enabled: true };

export function VideoSettingsPage() {
  const { bookId = "" } = useParams();
  const [videos, setVideos] = useState<SmartVideo[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function load() {
    setLoadError("");
    Promise.all([
      http<{ videos: SmartVideo[] }>(`/api/admin/books/${bookId}/smart-videos`),
      http<{ chapters: Chapter[] }>(`/api/admin/books/${bookId}/chapters`)
    ])
      .then(([v, c]) => {
        setVideos(v.videos);
        setChapters(c.chapters.sort((a, b) => a.orderIndex - b.orderIndex));
      })
      .catch((e: Error) => setLoadError(e.message));
  }

  useEffect(() => { load(); }, [bookId]);

  async function handleAdd() {
    setFormError("");
    if (!form.title.trim()) { setFormError("請填入課程標題"); return; }
    setSaving(true);
    try {
      await http(`/api/admin/books/${bookId}/smart-videos`, {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          chapterId: form.chapterId || null,
          youtubeUrl: form.youtubeUrl,
          videoUrl: form.videoUrl,
          enabled: form.enabled
        })
      });
      setForm(EMPTY_FORM);
      setMsg("已新增影音");
      load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(video: SmartVideo) {
    try {
      await http(`/api/admin/books/${bookId}/smart-videos/${video.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !video.enabled })
      });
      load();
    } catch (e: unknown) {
      setMsg(`切換失敗：${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleDelete(video: SmartVideo) {
    if (!confirm(`確定刪除「${video.title}」？此操作無法復原。`)) return;
    try {
      await http(`/api/admin/books/${bookId}/smart-videos/${video.id}`, { method: "DELETE" });
      setMsg("已刪除");
      load();
    } catch (e: unknown) {
      setMsg(`刪除失敗：${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="智能影音設定"
        subtitle="管理書本各章節的影音內容，學生端將依章節顯示啟用中的影音。"
        actions={
          <Link className="admin-btn ghost" to={`/admin/books/${bookId}/files`}>
            返回書本
          </Link>
        }
      />

      {loadError && <p style={{ color: "#dc2626", margin: "0 0 1rem" }}>{loadError}</p>}

      <AdminCard title="新增影音">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>課程標題 *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="例：中級會計 1-1"
              style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>章節（選填）</label>
            <select
              value={form.chapterId}
              onChange={(e) => setForm({ ...form, chapterId: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}
            >
              <option value="">（未指定）</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>YouTube 連結</label>
            <input
              value={form.youtubeUrl}
              onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=..."
              style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontFamily: "monospace", fontSize: 13 }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>影片連結（MP4 / CDN）</label>
            <input
              value={form.videoUrl}
              onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
              placeholder="https://cdn.example.com/video.mp4"
              style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontFamily: "monospace", fontSize: 13 }}
            />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            立即啟用
          </label>
        </div>
        {formError && <p style={{ color: "#dc2626", fontSize: 13, margin: "0 0 8px" }}>{formError}</p>}
        <button
          className="admin-btn"
          onClick={handleAdd}
          disabled={saving}
          style={{ padding: "8px 20px" }}
        >
          {saving ? "新增中…" : "新增影音"}
        </button>
        {msg && <span style={{ marginLeft: 12, color: "#6b7280", fontSize: 13 }}>{msg}</span>}
      </AdminCard>

      <div style={{ marginTop: "1.25rem" }}>
        <AdminCard title={`影音清單（${videos.length} 筆）`}>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
            1. 可新增 YouTube 連結或一般影片連結。2. 目前提供新增、啟用停用與刪除功能。3. 學生端將依章節顯示對應啟用中的影音內容。
          </p>
          {videos.length === 0 ? (
            <p className="muted">尚無影音設定，請使用上方表單新增。</p>
          ) : (
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>課程標題</th>
                    <th>章節</th>
                    <th>YouTube 連結</th>
                    <th>影片連結</th>
                    <th>啟用</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.sort((a, b) => a.orderIndex - b.orderIndex).map((v) => {
                    const chapterTitle = chapters.find((c) => c.id === v.chapterId)?.title ?? "（未指定）";
                    return (
                      <tr key={v.id}>
                        <td><strong>{v.title}</strong></td>
                        <td className="muted" style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chapterTitle}</td>
                        <td className="muted" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {v.youtubeUrl ? (
                            <a href={v.youtubeUrl} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                              {v.youtubeUrl.slice(0, 40)}{v.youtubeUrl.length > 40 ? "…" : ""}
                            </a>
                          ) : "—"}
                        </td>
                        <td className="muted" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {v.videoUrl ? <span title={v.videoUrl}>{v.videoUrl.slice(0, 40)}{v.videoUrl.length > 40 ? "…" : ""}</span> : "—"}
                        </td>
                        <td>
                          <button
                            onClick={() => void handleToggle(v)}
                            style={{
                              padding: "3px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12,
                              background: v.enabled ? "#dcfce7" : "#fee2e2",
                              color: v.enabled ? "#15803d" : "#dc2626"
                            }}
                          >
                            {v.enabled ? "啟用" : "停用"}
                          </button>
                        </td>
                        <td>
                          <button
                            onClick={() => void handleDelete(v)}
                            style={{ padding: "3px 10px", borderRadius: 6, border: "none", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontSize: 12 }}
                          >
                            刪除
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
