import { useEffect, useRef, useState } from "react";
import type { BookFile } from "@ai-smartbook/schema";
import { adminApi } from "../../api";

export function FilesTab({ bookId }: { bookId: string }) {
  const [files, setFiles] = useState<BookFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function reload() {
    adminApi.getBook(bookId).then((d) => setFiles(d.files));
  }
  useEffect(reload, [bookId]);

  async function onUpload() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await adminApi.uploadFile(bookId, file);
      setMsg(`已上傳 ${file.name}`);
      if (inputRef.current) inputRef.current.value = "";
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onParse(fileId: string) {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const r = await adminApi.parseFile(bookId, fileId);
      setMsg(`解析完成：${r.parsed} 段內容（${r.pageCount} 頁）`);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      reload();
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(fileId: string, fileName: string) {
    if (!window.confirm(`確定刪除檔案「${fileName}」？`)) return;

    setBusy(true);
    setError("");
    setMsg("");
    try {
      await adminApi.deleteFile(bookId, fileId);
      setMsg(`已刪除 ${fileName}`);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>上傳 PDF</h3>
        <div className="row">
          <input ref={inputRef} type="file" accept="application/pdf" style={{ maxWidth: 360 }} />
          <button className="btn" onClick={onUpload} disabled={busy}>
            上傳
          </button>
        </div>
        {msg && <p className="muted">{msg}</p>}
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>檔案列表</h3>
        {files.length === 0 ? (
          <p className="muted">尚無檔案。</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>檔名</th>
                <th>大小</th>
                <th>解析狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id}>
                  <td>{f.fileName}</td>
                  <td>{(f.fileSize / 1024).toFixed(1)} KB</td>
                  <td>
                    <span className={`badge ${f.parseStatus}`}>{f.parseStatus}</span>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <button className="btn secondary" onClick={() => onParse(f.id)} disabled={busy}>
                        解析
                      </button>
                      <button
                        className="btn secondary"
                        onClick={() => onDelete(f.id, f.fileName)}
                        disabled={busy}
                      >
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
