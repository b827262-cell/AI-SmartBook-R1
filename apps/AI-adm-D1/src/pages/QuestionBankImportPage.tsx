import { useEffect, useRef, useState } from "react";
import type { QuestionBankImportJob } from "@ai-smartbook/schema";
import { adminApi } from "../api";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { AdminCard } from "../components/admin/AdminCard";
import { AdminErrorCard } from "../components/admin/AdminErrorCard";

export function QuestionBankImportPage() {
  const [jobs, setJobs] = useState<QuestionBankImportJob[]>([]);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [actionError, setActionError] = useState("");
  const [importErrors, setImportErrors] = useState<{ index: number; message: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function loadJobs() {
    setLoadError("");
    adminApi
      .listQuestionBankImportJobs()
      .then((r) => setJobs(r.jobs))
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    loadJobs();
  }, []);

  async function onUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setActionError("");
    setMsg("");
    setImportErrors([]);
    try {
      const r = await adminApi.importQuestionBankJson(file);
      setMsg(
        `匯入完成：共 ${r.job.totalRecords} 筆，有效 ${r.job.validRecords} 筆，無效 ${r.job.invalidRecords} 筆`
      );
      setImportErrors(r.errors);
      if (fileRef.current) fileRef.current.value = "";
      loadJobs();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: 900 }}>
      <AdminPageHeader title="Question Bank JSON Import" />

      {loadError && <AdminErrorCard description={loadError} />}

      <AdminCard title="上傳題庫 JSON">
        <p style={{ marginBottom: "0.75rem", fontSize: "0.9rem", color: "#555" }}>
          支援格式：<code>{"[{question, options, answer, ...}, ...]"}</code> 或{" "}
          <code>{"{ questions: [...] }"}</code>，最大 5 MB。
        </p>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            disabled={busy}
            style={{ flex: 1 }}
          />
          <button
            onClick={onUpload}
            disabled={busy}
            style={{
              padding: "0.4rem 1rem",
              background: busy ? "#aaa" : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: busy ? "not-allowed" : "pointer"
            }}
          >
            {busy ? "處理中..." : "驗證並匯入"}
          </button>
        </div>
        {msg && (
          <p style={{ marginTop: "0.75rem", color: "#16a34a", fontWeight: 600 }}>{msg}</p>
        )}
        {actionError && <AdminErrorCard description={actionError} />}
        {importErrors.length > 0 && (
          <div style={{ marginTop: "0.75rem" }}>
            <p style={{ color: "#b91c1c", fontWeight: 600 }}>驗證錯誤（{importErrors.length} 筆）：</p>
            <ul style={{ marginTop: "0.25rem", paddingLeft: "1.25rem", fontSize: "0.85rem" }}>
              {importErrors.slice(0, 20).map((e) => (
                <li key={e.index}>
                  第 {e.index + 1} 筆：{e.message}
                </li>
              ))}
              {importErrors.length > 20 && <li>... 以及更多 {importErrors.length - 20} 筆錯誤</li>}
            </ul>
          </div>
        )}
      </AdminCard>

      <div style={{ marginTop: "1.25rem" }}>
      <AdminCard title="歷史匯入紀錄">
        {jobs.length === 0 ? (
          <p style={{ color: "#888" }}>尚無匯入紀錄。</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: "0.4rem 0.6rem" }}>檔案名稱</th>
                <th style={{ padding: "0.4rem 0.6rem" }}>狀態</th>
                <th style={{ padding: "0.4rem 0.6rem" }}>總筆數</th>
                <th style={{ padding: "0.4rem 0.6rem" }}>有效</th>
                <th style={{ padding: "0.4rem 0.6rem" }}>無效</th>
                <th style={{ padding: "0.4rem 0.6rem" }}>時間</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.4rem 0.6rem" }}>{job.fileName}</td>
                  <td style={{ padding: "0.4rem 0.6rem" }}>
                    <span
                      style={{
                        color:
                          job.status === "done"
                            ? "#16a34a"
                            : job.status === "failed"
                              ? "#b91c1c"
                              : "#d97706",
                        fontWeight: 600
                      }}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.4rem 0.6rem" }}>{job.totalRecords}</td>
                  <td style={{ padding: "0.4rem 0.6rem" }}>{job.validRecords}</td>
                  <td style={{ padding: "0.4rem 0.6rem" }}>{job.invalidRecords}</td>
                  <td style={{ padding: "0.4rem 0.6rem" }}>
                    {new Date(job.createdAt).toLocaleString("zh-TW")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminCard>
      </div>
    </div>
  );
}
