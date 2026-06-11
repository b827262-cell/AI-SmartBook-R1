import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../api";

export function NewBookPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { book } = await adminApi.createBook({
        title,
        subtitle,
        description,
        // Blank category is normalized to 未分類 server-side.
        category: category.trim() || "未分類",
        coverUrl,
        status
      });
      navigate(`/admin/books/${book.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <div>
      <h2>新增書本</h2>
      <form className="card" onSubmit={submit} style={{ maxWidth: 560 }}>
        <label>書名 *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        <label>副標題</label>
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        <label>類科 / 分類</label>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="例如：中級會計學（留空為未分類）"
        />
        <label>封面圖片網址（可留空）</label>
        <input
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
          placeholder="https://…（留空使用預設封面）"
        />
        <label>描述</label>
        <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        <label>狀態</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")}>
          <option value="draft">draft</option>
          <option value="published">published</option>
        </select>
        {error && <p className="error">{error}</p>}
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn" disabled={saving || !title}>
            {saving ? "建立中…" : "建立書本"}
          </button>
        </div>
      </form>
    </div>
  );
}
