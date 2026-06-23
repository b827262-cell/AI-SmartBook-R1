import { useEffect, useMemo, useState } from "react";
import type { QuestionBankImportJob, SmartSolveImportItem, SmartSolveImportJob } from "@ai-smartbook/schema";
import { studentClient } from "../studentClient";

function statusLabel(status: string): string {
  if (status === "done") return "已完成";
  if (status === "failed") return "失敗";
  return "處理中";
}

function statusClass(status: string): string {
  if (status === "done") return "success";
  if (status === "failed") return "failed";
  return "pending";
}

function scopeLabel(item: SmartSolveImportItem): string {
  if (!item.scopeJson) return "未提供範圍";
  try {
    const scope = JSON.parse(item.scopeJson) as {
      chapterTitle?: string;
      chapterId?: string;
      pageStart?: number;
      pageEnd?: number;
    };
    if (scope.chapterTitle) return scope.chapterTitle;
    if (scope.chapterId) return `章節 ${scope.chapterId}`;
    if (scope.pageStart != null && scope.pageEnd != null) return `P${scope.pageStart} - P${scope.pageEnd}`;
    if (scope.pageStart != null) return `P${scope.pageStart}`;
  } catch {
    return "範圍資料解析失敗";
  }
  return "未提供範圍";
}

export function MyQuestionBankPanel({
  bookId,
  bookTitle
}: {
  bookId: string;
  bookTitle: string;
}) {
  const [questionBankJobs, setQuestionBankJobs] = useState<QuestionBankImportJob[]>([]);
  const [smartSolveJobs, setSmartSolveJobs] = useState<SmartSolveImportJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedItems, setSelectedItems] = useState<SmartSolveImportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([
      studentClient.listQuestionBankJobs(),
      studentClient.listSmartSolveJobs(bookId)
    ])
      .then(([qb, ss]) => {
        if (cancelled) return;
        setQuestionBankJobs(qb.jobs);
        setSmartSolveJobs(ss.jobs);
        const nextJobId = ss.jobs[0]?.id ?? "";
        setSelectedJobId(nextJobId);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedJobId) {
      setSelectedItems([]);
      return;
    }
    setDetailsLoading(true);
    studentClient
      .getSmartSolveJob(bookId, selectedJobId)
      .then((response) => {
        if (!cancelled) setSelectedItems(response.items);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookId, selectedJobId]);

  const selectedJob = useMemo(
    () => smartSolveJobs.find((job) => job.id === selectedJobId) ?? null,
    [smartSolveJobs, selectedJobId]
  );

  return (
    <div className="my-question-bank-panel">
      <div className="my-question-bank-hero">
        <div>
          <h3>我的題庫</h3>
          <p className="muted">
            整合 {bookTitle} 的智慧題解素材與平台題庫匯入摘要，作為後續一鍵解題 / 練題的入口。
          </p>
        </div>
        <div className="my-question-bank-badges">
          <span className="badge pending">題庫匯入 {questionBankJobs.length}</span>
          <span className="badge success">本書題解 {smartSolveJobs.length}</span>
        </div>
      </div>

      {loading ? <p className="muted">載入我的題庫資料中…</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error ? (
        <div className="my-question-bank-grid">
          <section className="my-question-bank-card">
            <div className="my-question-bank-card-head">
              <h4>平台題庫摘要</h4>
              <span className="muted">最近 10 筆匯入 job</span>
            </div>
            {questionBankJobs.length === 0 ? (
              <p className="muted">目前沒有可顯示的題庫匯入紀錄。</p>
            ) : (
              <ul className="my-question-bank-job-list">
                {questionBankJobs.slice(0, 5).map((job) => (
                  <li key={job.id}>
                    <div className="my-question-bank-job-title-row">
                      <strong>{job.fileName}</strong>
                      <span className={`badge ${statusClass(job.status)}`}>{statusLabel(job.status)}</span>
                    </div>
                    <div className="my-question-bank-job-meta muted">
                      共 {job.totalRecords} 題 / 有效 {job.validRecords} / 無效 {job.invalidRecords}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="my-question-bank-card">
            <div className="my-question-bank-card-head">
              <h4>本書一鍵解題素材</h4>
              <span className="muted">智慧題解 / Smart Solve</span>
            </div>
            {smartSolveJobs.length === 0 ? (
              <p className="muted">這本書目前還沒有可用的智慧題解匯入結果。</p>
            ) : (
              <>
                <label className="my-question-bank-select">
                  <span className="muted">選擇題解批次</span>
                  <select
                    value={selectedJobId}
                    onChange={(event) => setSelectedJobId(event.target.value)}
                  >
                    {smartSolveJobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.fileName} · mapped {job.mappedRecords} / {job.totalRecords}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedJob ? (
                  <div className="my-question-bank-job-summary">
                    <span className={`badge ${statusClass(selectedJob.status)}`}>
                      {statusLabel(selectedJob.status)}
                    </span>
                    <span>共 {selectedJob.totalRecords} 題</span>
                    <span>已映射 {selectedJob.mappedRecords}</span>
                    <span>未映射 {selectedJob.unmappedRecords}</span>
                  </div>
                ) : null}

                {detailsLoading ? (
                  <p className="muted">載入題解內容中…</p>
                ) : selectedItems.length === 0 ? (
                  <p className="muted">此題解批次目前沒有可預覽題目。</p>
                ) : (
                  <ul className="my-question-bank-item-list">
                    {selectedItems.slice(0, 6).map((item) => (
                      <li key={item.id}>
                        <div className="my-question-bank-item-head">
                          <strong>{item.title || item.prompt.slice(0, 36)}</strong>
                          <span className={`badge ${item.status === "mapped" ? "success" : item.status === "invalid" ? "failed" : "pending"}`}>
                            {item.status}
                          </span>
                        </div>
                        <p>{item.prompt}</p>
                        <div className="muted">範圍：{scopeLabel(item)}</div>
                        {item.solution ? (
                          <details>
                            <summary>查看解答</summary>
                            <p>{item.solution}</p>
                            {item.explanation ? <p className="muted">{item.explanation}</p> : null}
                          </details>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
