import { useEffect, useState } from "react";
import { AdminCard } from "../components/admin/AdminCard";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";

type NoteFeatureSettings = {
  smartNotesEnabled: boolean;
  pasteBackNotesEnabled: boolean;
  pasteBackAiNotesEnabled: boolean;
  screenshotAskAiEnabled: boolean;
};

type PdfToolSettings = {
  highlightEnabled: boolean;
  penEnabled: boolean;
  lineEnabled: boolean;
  rectangleEnabled: boolean;
  circleEnabled: boolean;
  stickyNoteEnabled: boolean;
  eraserEnabled: boolean;
};

type ReaderFeatureSettings = {
  noteFeatures: NoteFeatureSettings;
  pdfTools: PdfToolSettings;
};

const DEFAULT: ReaderFeatureSettings = {
  noteFeatures: { smartNotesEnabled: true, pasteBackNotesEnabled: true, pasteBackAiNotesEnabled: true, screenshotAskAiEnabled: true },
  pdfTools: { highlightEnabled: true, penEnabled: true, lineEnabled: true, rectangleEnabled: true, circleEnabled: true, stickyNoteEnabled: true, eraserEnabled: true }
};

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init
  });
  if (!res.ok) {
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(d.error ?? `${res.status}`);
  }
  return res.json() as Promise<T>;
}

const NOTE_LABELS: { key: keyof NoteFeatureSettings; label: string; desc: string }[] = [
  { key: "smartNotesEnabled", label: "智能筆記", desc: "AI 自動生成筆記功能" },
  { key: "pasteBackNotesEnabled", label: "貼回筆記", desc: "將筆記貼回文件功能" },
  { key: "pasteBackAiNotesEnabled", label: "貼回 AI 筆記", desc: "將 AI 筆記貼回文件功能" },
  { key: "screenshotAskAiEnabled", label: "截圖問 AI", desc: "截取畫面後向 AI 提問" }
];

const PDF_LABELS: { key: keyof PdfToolSettings; label: string; desc: string }[] = [
  { key: "highlightEnabled", label: "螢光筆", desc: "文字螢光標記工具" },
  { key: "penEnabled", label: "筆", desc: "手寫筆工具" },
  { key: "lineEnabled", label: "直線", desc: "繪製直線工具" },
  { key: "rectangleEnabled", label: "矩形", desc: "繪製矩形工具" },
  { key: "circleEnabled", label: "圓形", desc: "繪製圓形工具" },
  { key: "stickyNoteEnabled", label: "便利貼", desc: "新增便利貼注記" },
  { key: "eraserEnabled", label: "橡皮擦", desc: "清除標記工具" }
];

export function ReaderFeaturesPage() {
  const [settings, setSettings] = useState<ReaderFeatureSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void http<ReaderFeatureSettings>("/api/admin/settings/reader-features")
      .then(setSettings)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  async function save(updated: ReaderFeatureSettings) {
    setSaving(true);
    setMsg("");
    setError("");
    try {
      const saved = await http<ReaderFeatureSettings>("/api/admin/settings/reader-features", {
        method: "PUT",
        body: JSON.stringify(updated)
      });
      setSettings(saved);
      setMsg("設定已儲存。");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function toggleNote(key: keyof NoteFeatureSettings) {
    const updated = { ...settings, noteFeatures: { ...settings.noteFeatures, [key]: !settings.noteFeatures[key] } };
    setSettings(updated);
    void save(updated);
  }

  function togglePdf(key: keyof PdfToolSettings) {
    const updated = { ...settings, pdfTools: { ...settings.pdfTools, [key]: !settings.pdfTools[key] } };
    setSettings(updated);
    void save(updated);
  }

  const toggleRowStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 0", borderBottom: "1px solid #f3f4f6"
  };

  function ToggleBtn({ on, onClick }: { on: boolean; onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        disabled={saving}
        style={{
          padding: "4px 14px", borderRadius: 6, border: "none", cursor: "pointer",
          fontSize: 12, minWidth: 52,
          background: on ? "#dcfce7" : "#fee2e2",
          color: on ? "#15803d" : "#dc2626",
          opacity: saving ? 0.6 : 1
        }}
      >
        {on ? "開啟" : "關閉"}
      </button>
    );
  }

  if (loading) return <div><AdminPageHeader title="閱讀器功能開關" /><p className="muted">載入中…</p></div>;

  return (
    <div>
      <AdminPageHeader title="閱讀器功能開關" />

      <p className="muted" style={{ marginBottom: "1rem" }}>
        關閉的功能將對所有學生端立即生效。開關預設全部開啟，不會影響既有操作。
      </p>

      {error && <p className="error" style={{ marginBottom: "1rem" }}>{error}</p>}
      {msg && <p style={{ color: "#15803d", marginBottom: "1rem", fontSize: 14 }}>{msg}</p>}

      <AdminCard title="筆記功能開關">
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>控制學生端 AI 筆記相關功能的顯示。</p>
        {NOTE_LABELS.map(({ key, label, desc }) => (
          <div key={key} style={toggleRowStyle}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{desc}</div>
            </div>
            <ToggleBtn on={settings.noteFeatures[key]} onClick={() => toggleNote(key)} />
          </div>
        ))}
      </AdminCard>

      <div style={{ marginTop: "1rem" }}>
        <AdminCard title="PDF 工具開關">
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>控制 PDF 閱讀器工具列中各工具的顯示。</p>
          {PDF_LABELS.map(({ key, label, desc }) => (
            <div key={key} style={toggleRowStyle}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{desc}</div>
              </div>
              <ToggleBtn on={settings.pdfTools[key]} onClick={() => togglePdf(key)} />
            </div>
          ))}
        </AdminCard>
      </div>
    </div>
  );
}
