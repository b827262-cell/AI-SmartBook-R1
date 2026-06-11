import { useState } from "react";
import { adminApi } from "../../api";

export function QaTab({ bookId }: { bookId: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [context, setContext] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setBusy(true);
    setError("");
    setAnswer("");
    try {
      const r = await adminApi.ask(bookId, question);
      setAnswer(r.answer);
      setContext(r.context);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form className="card" onSubmit={ask}>
        <h3 style={{ marginTop: 0 }}>知識問答</h3>
        <div className="row">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="輸入關於此書的問題…"
            style={{ flex: 1 }}
          />
          <button className="btn" disabled={busy || !question.trim()}>
            {busy ? "詢問中…" : "送出"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </form>

      {answer && (
        <div className="card">
          <strong>回答</strong>
          <div className="chat-answer" style={{ marginTop: 8 }}>
            {answer}
          </div>
          {context.length > 0 && (
            <details style={{ marginTop: 12 }}>
              <summary className="muted">引用內容（{context.length}）</summary>
              <ul>
                {context.map((c, i) => (
                  <li key={i} className="muted">
                    {c}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
