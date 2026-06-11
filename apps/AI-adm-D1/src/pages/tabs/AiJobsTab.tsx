import { useEffect, useState } from "react";
import type { BookAiJob } from "@ai-smartbook/schema";
import { adminApi } from "../../api";

export function AiJobsTab({ bookId }: { bookId: string }) {
  const [jobs, setJobs] = useState<BookAiJob[]>([]);

  useEffect(() => {
    adminApi.getJobs(bookId).then((d) => setJobs(d.jobs));
  }, [bookId]);

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>AI 任務記錄（{jobs.length}）</h3>
      {jobs.length === 0 ? (
        <p className="muted">尚無 AI 任務。</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>類型</th>
              <th>狀態</th>
              <th>建立時間</th>
              <th>錯誤</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td>{j.jobType}</td>
                <td>
                  <span className={`badge ${j.status}`}>{j.status}</span>
                </td>
                <td className="muted">{new Date(j.createdAt).toLocaleString()}</td>
                <td className="error">{j.errorMessage || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
