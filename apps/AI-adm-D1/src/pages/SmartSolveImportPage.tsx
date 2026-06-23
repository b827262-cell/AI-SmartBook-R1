import { useEffect, useRef, useState } from "react";
import type { Book } from "@ai-smartbook/schema";
import type { SmartSolveImportJob } from "@ai-smartbook/schema";
import { adminApi } from "../api";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { AdminCard } from "../components/admin/AdminCard";
import { AdminErrorCard } from "../components/admin/AdminErrorCard";

const SAMPLE_JSON = `{
  "items": [
    {
      "externalId": "ss-001",
      "prompt": "Explain debit and credit.",
      "solution": "Debit and credit are the two sides of accounting entries.",
      "scope": { "chapterTitle": "第一章" },
      "tags": ["accounting", "basic"]
    }
  ]
}`;

export function SmartSolveImportPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [booksError, setBooksError] = useState("");
  const [bookId, setBookId] = useState("");
  const [jobs, setJobs] = useState<SmartSolveImportJob[]>([]);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [actionError, setActionError] = useState("");
  const [showSample, setShowSample] = useState(false);
  const [summary, setSummary] = useState<{
    totalRecords: number;
    validRecords: number;
    mappedRecords: number;
    unmappedRecords: number;
    invalidRecords: number;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminApi
      .listBooks()
      .then((r) => setBooks(r.books))
      .catch((e) => setBooksError(e instanceof Error ? e.message : String(e)));
  }, []);

  function loadJobs(bid: string) {
    if (!bid) return;
    setLoadError("");
    adminApi
      .listSmartSolveImportJobs(bid)
      .then((r) => setJobs(r.jobs))
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)));
  }

  function onBookChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const bid = e.target.value;
    setBookId(bid);
    setJobs([]);
    setMsg("");
    setSummary(null);
    setActionError("");
    if (bid) loadJobs(bid);
  }

  async function onUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file || !bookId) return;
    setBusy(true);
    setActionError("");
    setMsg("");
    setSummary(null);
    try {
      const r = await adminApi.importSmartSolveJson(bookId, file);
      setSummary(r.summary);
      setMsg(
        `匯入完成 (${r.job.status})：共 ${r.summary.totalRecords} 筆，有效 ${r.summary.validRecords}，已映射 ${r.summary.mappedRecords}，未映射 ${r.summary.unmappedRecords}，無效 ${r.summary.invalidRecords}`
      );
      if (fileRef.current) fileRef.current.value = "";
      loadJobs(bookId);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const selectedBook = books.find((b) => b.id === bookId);

  return (
    <div style={{ padding: "1.5rem", maxWidth: 960 }}>
      <AdminPageHeader title="Smart Solve JSON Import" />

      {booksError && <AdminErrorCard description={`書本載入失敗：${booksError}`} />}
      {loadError && <AdminErrorCard description={loadError} />}

      <AdminCard title="上傳設定">
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600, fontSize: "0.9rem" }}>
            目標書本
          </label>
          {books.length === 0 && !booksError ? (
            <p style={{ color: "#888", fontSize: "0.9rem" }}>載入書本中…</p>
          ) : (
            <select
              value={bookId}
              onChange={onBookChange}
              style={{
                width: "100%",
                padding: "0.4rem 0.6rem",
                border: "1px solid #d1d5db",
                borderRadius: 4,
                fontSize: "0.9rem",
                background: "#fff"
              }}
            >
              <option value="">— 請選擇書本 —</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}（{b.id}）
                </option>
              ))}
            </select>
          )}
          {selectedBook && (
            <p style={{ marginTop: "0.3rem", fontSize: "0.8rem", color: "#6b7280" }}>
              Book ID：<code>{selectedBook.id}</code>
            </p>
          )}
          {!bookId && (
            <p style={{ marginTop: "0.3rem", fontSize: "0.85rem", color: "#d97706" }}>
              請先選擇書本才能上傳。
            </p>
          )}
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <button
            type="button"
            onClick={() => setShowSample((v) => !v)}
            style={{
              fontSize: "0.8rem",
              color: "#2563eb",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline"
            }}
          >
            {showSample ? "▲ 隱藏範例 JSON" : "▼ 查看範例 JSON"}
          </button>
          {showSample && (
            <pre
              style={{
                marginTop: "0.5rem",
                background: "#f1f5f9",
                padding: "0.75rem",
                borderRadius: 4,
                fontSize: "0.8rem",
                overflowX: "auto",
                fontFamily: "monospace"
              }}
            >
              {SAMPLE_JSON}
            </pre>
          )}
        </div>

        <p style={{ marginBottom: "0.75rem", fontSize: "0.85rem", color: "#555" }}>
          支援格式：<code>{"[{prompt, solution, scope:{chapterTitle|chapterId|pageStart}, ...}]"}</code>{" "}
          或 <code>{"{ items: [...] }"}</code>，最大 10 MB。
        </p>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            disabled={busy || !bookId}
            style={{ flex: 1 }}
          />
          <button
            onClick={onUpload}
            disabled={busy || !bookId}
            style={{
              padding: "0.4rem 1rem",
              background: busy || !bookId ? "#aaa" : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: busy || !bookId ? "not-allowed" : "pointer",
              whiteSpace: "nowrap"
            }}
          >
            {busy ? "處理中..." : "驗證並匯入"}
          </button>
        </div>

        {msg && <p style={{ marginTop: "0.75rem", color: "#16a34a", fontWeight: 600 }}>{msg}</p>}
        {actionError && (
          <div style={{ marginTop: "0.5rem" }}>
            <AdminErrorCard description={actionError} />
          </div>
        )}
        {summary && (
          <table style={{ marginTop: "0.75rem", fontSize: "0.875rem", borderCollapse: "collapse" }}>
            <tbody>
              {(
                [
                  ["總筆數", summary.totalRecords],
                  ["有效", summary.validRecords],
                  ["已映射章節", summary.mappedRecords],
                  ["未映射", summary.unmappedRecords],
                  ["無效", summary.invalidRecords]
                ] as [string, number][]
              ).map(([label, val]) => (
                <tr key={label}>
                  <td style={{ padding: "0.2rem 0.8rem 0.2rem 0", color: "#555" }}>{label}</td>
                  <td style={{ fontWeight: 600 }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminCard>

      <div style={{ marginTop: "1.25rem" }}>
        <AdminCard title="歷史匯入紀錄">
          {!bookId ? (
            <p style={{ color: "#888" }}>請先選擇書本以顯示匯入紀錄。</p>
          ) : jobs.length === 0 ? (
            <p style={{ color: "#888" }}>此書本尚無匯入紀錄。</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: "0.4rem 0.6rem" }}>檔案名稱</th>
                  <th style={{ padding: "0.4rem 0.6rem" }}>狀態</th>
                  <th style={{ padding: "0.4rem 0.6rem" }}>總筆數</th>
                  <th style={{ padding: "0.4rem 0.6rem" }}>已映射</th>
                  <th style={{ padding: "0.4rem 0.6rem" }}>未映射</th>
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
                    <td style={{ padding: "0.4rem 0.6rem" }}>{job.mappedRecords}</td>
                    <td style={{ padding: "0.4rem 0.6rem" }}>{job.unmappedRecords}</td>
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
