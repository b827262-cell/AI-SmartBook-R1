import React, { useEffect, useState } from "react";
import { Card } from "@ai-smartbook/ui";
import { type AiProviderStatus, getAiProviderSettings } from "../api.js";

const NO_KEY_STEPS = ["拆書（預設頂級）", "建立章節", "產生 Reader TOC", "產生 JSON 索引", "設定 Q&A Reference", "建立基礎知識點"];
const AI_STEPS = ["AI 建立 Q&A", "AI 萃取知識點", "截圖問 AI", "語意搜尋 / Embedding"];

export function FilesPage() {
  const [aiStatus, setAiStatus] = useState<AiProviderStatus | null>(null);
  const [oneClickResult, setOneClickResult] = useState<string | null>(null);

  useEffect(() => {
    getAiProviderSettings().then(setAiStatus).catch(() => null);
  }, []);

  const hasKey = aiStatus?.hasGoogleApiKey ?? false;

  const handleOneClick = () => {
    if (!hasKey) {
      setOneClickResult(
        "已完成非 AI 流程；AI 建立 Q&A 與 AI 萃取知識點因未提供 Google API Key 而略過。"
      );
    } else {
      setOneClickResult(`一鍵完成執行中（預設模型：${aiStatus?.defaultModel}）…`);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 24px 0" }}>檔案 / PDF 管理</h1>

      {/* AI Status Block */}
      <Card style={{ marginBottom: 24, maxWidth: 640 }}>
        <h2 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700 }}>AI 執行狀態</h2>
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: hasKey ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${hasKey ? "#bbf7d0" : "#fecaca"}`,
            fontSize: 14,
          }}
        >
          <div style={{ fontWeight: 600 }}>
            {hasKey ? "AI 狀態：🟢 Google API Key 已提供" : "AI 狀態：🔴 未提供 Google API Key"}
          </div>
          {hasKey && aiStatus?.defaultModel && (
            <div style={{ color: "#6b7280", marginTop: 2 }}>預設模型：{aiStatus.defaultModel}</div>
          )}
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#374151" }}>
              可執行（不需 API Key）
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#6b7280" }}>
              {NO_KEY_STEPS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 6,
                color: hasKey ? "#15803d" : "#dc2626",
              }}
            >
              {hasKey ? "可執行（AI 功能）" : "需 API Key"}
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#6b7280" }}>
              {AI_STEPS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* One-click Workflow */}
      <Card style={{ maxWidth: 640 }}>
        <h2 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700 }}>一鍵完成工作流程</h2>
        <p style={{ margin: "0 0 16px 0", fontSize: 14, color: "#6b7280" }}>
          依序執行：拆書 → 建立章節 → 建立知識點
          {hasKey ? " → AI 建立 Q&A → AI 萃取知識點" : "（AI 步驟因無 Key 而略過）"}
        </p>
        <button
          onClick={handleOneClick}
          style={{
            padding: "10px 22px",
            borderRadius: 10,
            border: "none",
            background: "#111827",
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          一鍵完成
        </button>

        {oneClickResult && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 14px",
              borderRadius: 9,
              background: "#f8fafc",
              border: "1px solid #e5e7eb",
              fontSize: 14,
              color: "#374151",
            }}
          >
            {oneClickResult}
          </div>
        )}
      </Card>
    </div>
  );
}
