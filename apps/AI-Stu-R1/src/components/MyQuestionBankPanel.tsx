import { useEffect, useState } from "react";
import type { OneClickSolveCandidate } from "@ai-smartbook/schema";
import { studentClient } from "../studentClient";

interface MyQuestionBankPanelProps {
  bookId: string;
}

export function MyQuestionBankPanel({ bookId }: MyQuestionBankPanelProps) {
  const [candidates, setCandidates] = useState<OneClickSolveCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (bookId) {
      setLoading(true);
      setError("");
      studentClient
        .getQuestionBank(bookId)
        .then((res) => {
          setCandidates(res.candidates);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : String(err));
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [bookId]);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
        載入題庫中...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#dc2626" }}>
        載入失敗：{error}
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div style={{ padding: "3rem 2rem", textAlign: "center", color: "#6b7280" }}>
        <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: "1.6" }}>
          這本書尚未建立題庫。請由後台執行「一鍵解書」或匯入題庫資料。
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        height: "100%",
        overflowY: "auto"
      }}
    >
      <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem", fontWeight: 600, color: "#1f2937" }}>
        我的題庫 (共 {candidates.length} 題)
      </h3>

      {candidates.map((c, index) => {
        const isExpanded = expandedId === c.id;
        return (
          <div
            key={c.id}
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: "1.25rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
            }}
          >
            {/* Header / Question Info */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "0.75rem" }}>
              <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "#111827", lineHeight: "1.4" }}>
                單選題 {index + 1}. {c.question}
              </span>
              {c.sourcePage && (
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: "0.75rem",
                    color: "#2563eb",
                    background: "#eff6ff",
                    padding: "0.15rem 0.5rem",
                    borderRadius: 9999,
                    fontWeight: 500
                  }}
                >
                  第 {c.sourcePage} 頁
                </span>
              )}
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", margin: "0.75rem 0", paddingLeft: "0.5rem" }}>
              {c.options.map((opt) => (
                <div key={opt.label} style={{ fontSize: "0.9rem", color: "#374151" }}>
                  <span style={{ fontWeight: 600, marginRight: "0.5rem", color: "#4b5563" }}>({opt.label})</span>
                  {opt.text}
                </div>
              ))}
            </div>

            {/* Expandable Answer/Explanation */}
            <div style={{ marginTop: "1rem", borderTop: "1px solid #f3f4f6", paddingTop: "0.75rem" }}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : c.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem"
                }}
              >
                {isExpanded ? "▲ 隱藏答案與解析" : "▼ 顯示答案與解析"}
              </button>

              {isExpanded && (
                <div style={{ marginTop: "0.75rem", padding: "0.75rem 1rem", background: "#f9fafb", borderRadius: 6, fontSize: "0.85rem", color: "#4b5563" }}>
                  <div style={{ marginBottom: "0.5rem" }}>
                    <strong style={{ color: "#1f2937" }}>正確答案：</strong>
                    <span style={{ color: "#dc2626", fontWeight: 600 }}>{c.answer || "無"}</span>
                  </div>
                  {c.explanation && (
                    <div style={{ marginBottom: "0.5rem" }}>
                      <strong style={{ color: "#1f2937" }}>解析說明：</strong>
                      {c.explanation}
                    </div>
                  )}
                  {c.sourceText && (
                    <div style={{ borderLeft: "3px solid #d1d5db", paddingLeft: "0.75rem", fontStyle: "italic", color: "#6b7280" }}>
                      來源教材片段："{c.sourceText}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
