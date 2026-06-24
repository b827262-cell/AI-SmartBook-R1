import React, { useEffect, useRef, useState } from "react";
import { Card } from "@ai-smartbook/ui";
import {
  type AiProviderStatus,
  clearGoogleApiKey,
  getAiProviderSettings,
  saveAiProviderSettings,
  testAiConnection,
} from "../api.js";

export const GOOGLE_AI_MODEL_OPTIONS = [
  { label: "Gemini 3.1 Flash Lite", value: "gemini-3.1-flash-lite", type: "generate" },
  { label: "Gemma 4 31B", value: "gemma-4-31b", type: "generate" },
  { label: "Gemma 4 26B", value: "gemma-4-26b", type: "generate" },
  { label: "Gemini Embedding 2", value: "gemini-embedding-2", type: "embedding" },
  { label: "Gemini Embedding 1", value: "gemini-embedding-1", type: "embedding" },
  { label: "Gemini 3.5 Flash", value: "gemini-3.5-flash", type: "generate" },
  { label: "Gemini 3 Flash", value: "gemini-3-flash", type: "generate" },
  { label: "Gemini 2.5 Flash", value: "gemini-2.5-flash", type: "generate" },
  { label: "Gemini 2.5 Flash Lite", value: "gemini-2.5-flash-lite", type: "generate" },
] as const;

const GENERATE_MODELS = GOOGLE_AI_MODEL_OPTIONS.filter((m) => m.type === "generate");
const EMBEDDING_MODELS = GOOGLE_AI_MODEL_OPTIONS.filter((m) => m.type === "embedding");

type Toast = { msg: string; ok: boolean };

export function GoogleAiSettingsCard() {
  const [status, setStatus] = useState<AiProviderStatus | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [defaultModel, setDefaultModel] = useState("gemini-2.5-flash");
  const [defaultEmbeddingModel, setDefaultEmbeddingModel] = useState("gemini-embedding-1");
  const [toast, setToast] = useState<Toast | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const loadSettings = async () => {
    try {
      const s = await getAiProviderSettings();
      setStatus(s);
      setDefaultModel(s.defaultModel);
      setDefaultEmbeddingModel(s.defaultEmbeddingModel);
    } catch {
      showToast("讀取設定失敗", false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const s = await saveAiProviderSettings({
        googleApiKey: apiKeyInput.trim() || undefined,
        defaultModel,
        defaultEmbeddingModel,
      });
      setStatus(s);
      setApiKeyInput("");
      showToast("設定已儲存", true);
    } catch (e) {
      showToast(`儲存失敗：${e}`, false);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("確定要清除 Google API Key 嗎？")) return;
    setClearing(true);
    try {
      await clearGoogleApiKey();
      await loadSettings();
      showToast("已清除 Google API Key", true);
    } catch (e) {
      showToast(`清除失敗：${e}`, false);
    } finally {
      setClearing(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const r = await testAiConnection();
      await loadSettings();
      showToast(r.message, r.ok);
    } catch (e) {
      showToast(`連線測試失敗：${e}`, false);
    } finally {
      setTesting(false);
    }
  };

  const aiStatusLine = status?.hasGoogleApiKey
    ? "AI 狀態：🟢 Google API Key 已提供"
    : "AI 狀態：🔴 未提供 Google API Key";

  const testStatusText =
    status?.lastTestStatus === "success"
      ? "成功"
      : status?.lastTestStatus === "failed"
        ? "失敗"
        : "尚未測試";

  return (
    <Card style={{ maxWidth: 640 }}>
      <h2 style={{ margin: "0 0 4px 0", fontSize: 18, fontWeight: 700 }}>Google AI 設定</h2>
      <p style={{ margin: "0 0 20px 0", color: "#6b7280", fontSize: 14 }}>
        提供 Google API Key 後，可啟用 AI 建立 Q&A、AI 萃取知識點、截圖問 AI 與語意搜尋等功能。
      </p>

      {/* AI Status */}
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          background: status?.hasGoogleApiKey ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${status?.hasGoogleApiKey ? "#bbf7d0" : "#fecaca"}`,
          marginBottom: 20,
          fontSize: 14,
        }}
      >
        <div style={{ fontWeight: 600 }}>{aiStatusLine}</div>
        {status?.hasGoogleApiKey && status.maskedGoogleApiKey && (
          <div style={{ color: "#6b7280", marginTop: 2 }}>Key：{status.maskedGoogleApiKey}</div>
        )}
        <div style={{ color: "#6b7280", marginTop: 2 }}>連線測試：{testStatusText}</div>
      </div>

      {/* API Key Input */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          Google API Key
        </label>
        <input
          type="password"
          placeholder={status?.hasGoogleApiKey ? "（已儲存，輸入新 Key 以覆蓋）" : "貼上 Google API Key"}
          value={apiKeyInput}
          onChange={(e) => setApiKeyInput(e.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "9px 12px",
            borderRadius: 9,
            border: "1px solid #d1d5db",
            fontSize: 14,
            fontFamily: "monospace",
          }}
        />
      </div>

      {/* Model Selectors */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            預設生成模型
          </label>
          <select
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 10px",
              borderRadius: 9,
              border: "1px solid #d1d5db",
              fontSize: 14,
              background: "white",
            }}
          >
            {GENERATE_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            預設 Embedding 模型
          </label>
          <select
            value={defaultEmbeddingModel}
            onChange={(e) => setDefaultEmbeddingModel(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 10px",
              borderRadius: 9,
              border: "1px solid #d1d5db",
              fontSize: 14,
              background: "white",
            }}
          >
            {EMBEDDING_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={btnStyle("#111827")}
        >
          {saving ? "儲存中…" : "儲存設定"}
        </button>
        <button
          onClick={handleTest}
          disabled={testing || !status?.hasGoogleApiKey}
          style={btnStyle("#2563eb", !status?.hasGoogleApiKey)}
        >
          {testing ? "測試中…" : "測試連線"}
        </button>
        <button
          onClick={handleClear}
          disabled={clearing || !status?.hasGoogleApiKey}
          style={btnStyle("#dc2626", !status?.hasGoogleApiKey)}
        >
          {clearing ? "清除中…" : "清除 Key"}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            marginTop: 16,
            padding: "10px 14px",
            borderRadius: 9,
            background: toast.ok ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${toast.ok ? "#bbf7d0" : "#fecaca"}`,
            color: toast.ok ? "#15803d" : "#dc2626",
            fontSize: 14,
          }}
        >
          {toast.msg}
        </div>
      )}
    </Card>
  );
}

function btnStyle(bg: string, disabled = false): React.CSSProperties {
  return {
    padding: "9px 18px",
    borderRadius: 9,
    border: "none",
    background: disabled ? "#9ca3af" : bg,
    color: "white",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    fontWeight: 500,
  };
}
