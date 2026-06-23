import { useEffect, useState } from "react";
import type { OneClickSolveJob, OneClickSolveCandidate } from "@ai-smartbook/schema";
import { adminApi } from "../api";
import { AdminCard } from "./admin/AdminCard";
import { AdminErrorCard } from "./admin/AdminErrorCard";

interface OneClickSolvePanelProps {
  bookId: string;
}

export function OneClickSolvePanel({ bookId }: OneClickSolvePanelProps) {
  const [jobs, setJobs] = useState<OneClickSolveJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<OneClickSolveCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);

  // Load jobs when bookId changes
  useEffect(() => {
    if (bookId) {
      loadJobs();
      setSelectedJobId(null);
      setCandidates([]);
      setMsg("");
      setError("");
    }
  }, [bookId]);

  // If there's a pending/processing job, poll it
  useEffect(() => {
    const activeJob = jobs.find((j) => j.status === "pending" || j.status === "processing");
    if (!activeJob) return;

    const timer = setInterval(async () => {
      try {
        const res = await adminApi.getOneClickSolveJob(bookId, activeJob.id);
        // Update job status in jobs list
        setJobs((prevJobs) =>
          prevJobs.map((j) => (j.id === res.job.id ? res.job : j))
        );
        if (res.job.status === "done" || res.job.status === "failed") {
          clearInterval(timer);
          if (res.job.status === "done") {
            setMsg("一鍵解書完成！");
            if (selectedJobId === res.job.id || !selectedJobId) {
              setSelectedJobId(res.job.id);
              setCandidates(res.candidates);
            }
          } else {
            setError("一鍵解書執行失敗。");
          }
        }
      } catch (e) {
        console.error("Error polling one-click job status:", e);
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [jobs, bookId, selectedJobId]);

  // Load candidates when selectedJobId changes
  useEffect(() => {
    if (selectedJobId) {
      loadCandidates(selectedJobId);
    } else {
      setCandidates([]);
    }
  }, [selectedJobId]);

  async function loadJobs() {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.listOneClickSolveJobs(bookId);
      setJobs(res.jobs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadCandidates(jobId: string) {
    setCandidatesLoading(true);
    try {
      const res = await adminApi.getOneClickSolveJob(bookId, jobId);
      setCandidates(res.candidates);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCandidatesLoading(false);
    }
  }

  async function handleStartSolve() {
    setError("");
    setMsg("");
    setLoading(true);
    try {
      const res = await adminApi.createOneClickSolveJob(bookId);
      setJobs((prev) => [res.job, ...prev]);
      setMsg("已開始一鍵解書任務，請稍候...");
      setSelectedJobId(res.job.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleStageAll() {
    if (!selectedJobId) return;
    setLoading(true);
    setError("");
    try {
      await adminApi.stageOneClickSolveCandidates(bookId, selectedJobId);
      setMsg("已成功將所有候選題目上架至我的題庫！");
      await loadCandidates(selectedJobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleStageSingle(candidateId: string) {
    if (!selectedJobId) return;
    setError("");
    try {
      await adminApi.stageOneClickSolveCandidates(bookId, selectedJobId, [candidateId]);
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, status: "staged" } : c))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <AdminCard title="一鍵解書 (One-Click Solve Book)">
        <p style={{ fontSize: "0.9rem", color: "#4b5563", marginBottom: "1rem", lineHeight: "1.5" }}>
          一鍵解書會從目前書本的解析文字與索引資料中整理選擇題候選，結果需確認後再提供給學生端使用。
        </p>

        {error && <AdminErrorCard description={error} />}
        {msg && <p style={{ color: "#059669", fontSize: "0.9rem", fontWeight: 600, marginBottom: "1rem" }}>{msg}</p>}

        <div style={{ marginBottom: "1.5rem" }}>
          <button
            onClick={handleStartSolve}
            disabled={loading || jobs.some((j) => j.status === "pending" || j.status === "processing")}
            style={{
              padding: "0.5rem 1.25rem",
              background: loading || jobs.some((j) => j.status === "pending" || j.status === "processing") ? "#9ca3af" : "#059669",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: loading || jobs.some((j) => j.status === "pending" || j.status === "processing") ? "not-allowed" : "pointer",
              transition: "background-color 0.2s"
            }}
          >
            {jobs.some((j) => j.status === "pending" || j.status === "processing")
              ? "一鍵解書處理中..."
              : "執行一鍵解書"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: "1.5rem" }}>
          {/* Jobs List */}
          <div style={{ borderRight: "1px solid #e5e7eb", paddingRight: "1rem" }}>
            <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "#374151" }}>歷史任務</h4>
            {jobs.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "#9ca3af" }}>無歷史任務</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: "400px", overflowY: "auto" }}>
                {jobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    style={{
                      textAlign: "left",
                      padding: "0.5rem",
                      border: selectedJobId === job.id ? "1.5px solid #2563eb" : "1px solid #e5e7eb",
                      borderRadius: 6,
                      background: selectedJobId === job.id ? "#eff6ff" : "#f9fafb",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.2rem"
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "#1f2937" }}>ID: {job.id}</span>
                    <span style={{
                      color: job.status === "done" ? "#059669" : job.status === "failed" ? "#dc2626" : "#d97706",
                      fontWeight: 600
                    }}>
                      狀態: {job.status}
                    </span>
                    <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>
                      {new Date(job.createdAt).toLocaleString("zh-TW")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Candidates Detail & Review */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#374151", fontWeight: 600 }}>
                候選題目列表 {selectedJobId && `(任務: ${selectedJobId})`}
              </h4>
              {selectedJobId && candidates.length > 0 && candidates.some(c => c.status !== "staged") && (
                <button
                  onClick={handleStageAll}
                  disabled={loading}
                  style={{
                    padding: "0.35rem 0.75rem",
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    fontSize: "0.8rem",
                    cursor: "pointer"
                  }}
                >
                  一鍵全部上架
                </button>
              )}
            </div>

            {candidatesLoading ? (
              <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>載入候選題目中...</p>
            ) : !selectedJobId ? (
              <p style={{ fontSize: "0.85rem", color: "#9ca3af", textAlign: "center", padding: "2rem" }}>
                請選擇左側歷史任務以檢視題目。
              </p>
            ) : candidates.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "#6b7280", textAlign: "center", padding: "2rem" }}>
                該任務未產出任何候選題目。
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "500px", overflowY: "auto" }}>
                {candidates.map((c, idx) => (
                  <div
                    key={c.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: "1rem",
                      background: "#fff",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#111827" }}>
                        Q{idx + 1}. {c.question}
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.15rem 0.4rem",
                          borderRadius: 9999,
                          fontWeight: 600,
                          background:
                            c.status === "staged"
                              ? "#d1fae5"
                              : c.status === "needs_review"
                                ? "#fef3c7"
                                : "#f3f4f6",
                          color:
                            c.status === "staged"
                              ? "#065f46"
                              : c.status === "needs_review"
                                ? "#92400e"
                                : "#374151"
                        }}
                      >
                        {c.status}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", margin: "0.5rem 0", paddingLeft: "1rem" }}>
                      {c.options.map((opt) => (
                        <div key={opt.label} style={{ fontSize: "0.85rem", color: "#4b5563" }}>
                          <span style={{ fontWeight: 600, marginRight: "0.5rem" }}>({opt.label})</span>
                          {opt.text}
                        </div>
                      ))}
                    </div>

                    <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.5rem", borderTop: "1px dashed #f3f4f6", paddingTop: "0.5rem" }}>
                      <div>
                        <strong style={{ color: "#374151" }}>答案：</strong>
                        <span style={{ color: "#dc2626", fontWeight: 600 }}>{c.answer || "無"}</span>
                      </div>
                      {c.explanation && (
                        <div style={{ marginTop: "0.25rem" }}>
                          <strong style={{ color: "#374151" }}>解析：</strong>
                          {c.explanation}
                        </div>
                      )}
                      {c.sourcePage && (
                        <div style={{ marginTop: "0.25rem" }}>
                          <strong style={{ color: "#374151" }}>來源頁碼：</strong>
                          第 {c.sourcePage} 頁
                        </div>
                      )}
                      {c.sourceText && (
                        <div style={{ marginTop: "0.25rem", fontStyle: "italic", background: "#f9fafb", padding: "0.25rem 0.5rem", borderRadius: 4 }}>
                          "{c.sourceText}"
                        </div>
                      )}
                    </div>

                    {c.status !== "staged" && (
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem" }}>
                        <button
                          onClick={() => handleStageSingle(c.id)}
                          style={{
                            padding: "0.25rem 0.6rem",
                            background: "#059669",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            fontSize: "0.75rem",
                            cursor: "pointer"
                          }}
                        >
                          確認上架
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
