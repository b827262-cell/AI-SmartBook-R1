import { useEffect, useState } from "react";
import type { BookContent } from "@ai-smartbook/schema";
import { adminApi } from "../../api";

export function ContentsTab({ bookId }: { bookId: string }) {
  const [contents, setContents] = useState<BookContent[]>([]);

  useEffect(() => {
    adminApi.getContents(bookId).then((d) => setContents(d.contents));
  }, [bookId]);

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>內容段落（{contents.length}）</h3>
      {contents.length === 0 ? (
        <p className="muted">尚無內容，請先上傳 PDF 並解析。</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th style={{ width: 60 }}>#</th>
              <th style={{ width: 60 }}>頁</th>
              <th>內容</th>
            </tr>
          </thead>
          <tbody>
            {contents.map((c) => (
              <tr key={c.id}>
                <td>{c.orderIndex}</td>
                <td>{c.pageNumber ?? "-"}</td>
                <td>{c.contentText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
