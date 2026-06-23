import { useEffect, useState } from "react";
import type { BookJsonArtifactSummary } from "@ai-smartbook/schema";
import { adminApi } from "../../api";

const ARTIFACT_LABELS: Record<string, { label: string; role: "index" | "candidate" }> = {
  "page-index": { label: "頁面索引 (page-index)", role: "index" },
  "sentence-index": { label: "句子索引 (sentence-index)", role: "index" },
  "question-bank-candidates": { label: "題庫候選題目 (question-bank-candidates)", role: "candidate" },
  "smart-solve-candidates": { label: "智慧題解候選 (smart-solve-candidates)", role: "candidate" }
};

export function JsonArtifactsTab({ bookId }: { bookId: string }) {
  const [artifacts, setArtifacts] = useState<BookJsonArtifactSummary[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .listJsonArtifacts(bookId)
      .then((d) => setArtifacts(d.artifacts))
      .catch(() => setArtifacts([]))
      .finally(() => setLoading(false));
  }, [bookId]);

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    try {
      const res = await adminApi.generateJsonArtifacts(bookId);
      setArtifacts(res.artifacts);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(artifactId: string) {
    try {
      await adminApi.deleteJsonArtifact(bookId, artifactId);
      setArtifacts((prev) => prev.filter((a) => a.id !== artifactId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>解析產物 / JSON 產生</h3>
      <p className="muted" style={{ marginBottom: 12 }}>
        一鍵產生 4 種 JSON 檔案，供後續題庫匯入與智慧題解匯入使用。
        <br />
        <strong>注意：</strong>page-index 與 sentence-index 是索引檔，
        <em>不可直接匯入題庫或智慧題解</em>；請使用 question-bank-candidates 與 smart-solve-candidates。
      </p>

      <button
        className="btn"
        type="button"
        onClick={handleGenerate}
        disabled={generating}
        style={{ marginBottom: 16 }}
      >
        {generating ? "產生中…" : "一鍵產生 4 種 JSON"}
      </button>

      {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}

      {loading && <p className="muted">載入中…</p>}

      {!loading && artifacts.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
              <th style={{ padding: "6px 8px" }}>檔案類型</th>
              <th style={{ padding: "6px 8px" }}>狀態</th>
              <th style={{ padding: "6px 8px" }}>筆數</th>
              <th style={{ padding: "6px 8px" }}>角色</th>
              <th style={{ padding: "6px 8px" }}>產生時間</th>
              <th style={{ padding: "6px 8px" }}>下載</th>
              <th style={{ padding: "6px 8px" }}>下一步</th>
              <th style={{ padding: "6px 8px" }}></th>
            </tr>
          </thead>
          <tbody>
            {artifacts.map((a) => {
              const meta = ARTIFACT_LABELS[a.artifactType];
              return (
                <tr key={a.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "6px 8px" }}>{meta?.label ?? a.artifactType}</td>
                  <td style={{ padding: "6px 8px" }}>
                    <span
                      style={{
                        color:
                          a.status === "done"
                            ? "#16a34a"
                            : a.status === "error"
                            ? "#dc2626"
                            : "#b45309"
                      }}
                    >
                      {a.status === "done" ? "完成" : a.status === "error" ? "錯誤" : "處理中"}
                    </span>
                    {a.errorMessage && (
                      <span className="muted" style={{ marginLeft: 4, fontSize: 12 }}>
                        ({a.errorMessage.slice(0, 60)})
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "6px 8px" }}>{a.recordCount}</td>
                  <td style={{ padding: "6px 8px" }}>
                    {meta?.role === "index" ? (
                      <span className="muted" style={{ fontSize: 12 }}>索引檔 (不可直接匯入)</span>
                    ) : (
                      <span style={{ color: "#1d4ed8", fontSize: 12 }}>候選匯入檔</span>
                    )}
                  </td>
                  <td style={{ padding: "6px 8px", fontSize: 12 }}>
                    {new Date(a.createdAt).toLocaleString("zh-TW")}
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    {a.status === "done" && (
                      <a
                        href={a.downloadUrl}
                        download={a.fileName}
                        className="btn"
                        style={{ fontSize: 12, padding: "2px 8px" }}
                      >
                        下載 JSON
                      </a>
                    )}
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    {a.artifactType === "question-bank-candidates" && a.status === "done" && (
                      <a
                        href={`/admin/import/question-bank?bookId=${encodeURIComponent(bookId)}&artifact=question-bank-candidates`}
                        style={{ fontSize: 12, color: "#1d4ed8" }}
                      >
                        前往題庫匯入
                      </a>
                    )}
                    {a.artifactType === "smart-solve-candidates" && a.status === "done" && (
                      <a
                        href={`/admin/import/smart-solve?bookId=${encodeURIComponent(bookId)}&artifact=smart-solve-candidates`}
                        style={{ fontSize: 12, color: "#1d4ed8" }}
                      >
                        前往智慧題解匯入
                      </a>
                    )}
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <button
                      type="button"
                      onClick={() => handleDelete(a.id)}
                      style={{ fontSize: 12, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}
                    >
                      刪除
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {!loading && artifacts.length === 0 && (
        <p className="muted">尚未產生任何 JSON，請點擊「一鍵產生 4 種 JSON」。</p>
      )}

      {artifacts.length > 0 && (
        <div style={{ marginTop: 16, padding: 12, background: "#f0f9ff", borderRadius: 6, fontSize: 13 }}>
          <strong>快速入口：</strong>
          <br />
          <a
            href={`/admin/import/question-bank?bookId=${encodeURIComponent(bookId)}&artifact=question-bank-candidates`}
            style={{ color: "#1d4ed8", marginRight: 16 }}
          >
            前往題庫匯入頁
          </a>
          <a
            href={`/admin/import/smart-solve?bookId=${encodeURIComponent(bookId)}&artifact=smart-solve-candidates`}
            style={{ color: "#1d4ed8" }}
          >
            前往智慧題解匯入頁
          </a>
        </div>
      )}
    </div>
  );
}
