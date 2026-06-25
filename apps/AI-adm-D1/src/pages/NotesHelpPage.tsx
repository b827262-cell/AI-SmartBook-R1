import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { AdminCard } from "../components/admin/AdminCard";

export function NotesHelpPage() {
  return (
    <div style={{ padding: "1.5rem", maxWidth: 860 }}>
      <AdminPageHeader title="AI 筆記導覽 — 功能說明" />

      <AdminCard title="功能概覽">
        <p style={{ marginBottom: "0.75rem" }}>
          AI 筆記導覽讓學生在閱讀器中快速跳到筆記所在的頁碼或章節。
          系統會在筆記有頁碼或章節 ID 時，顯示「定位」按鈕。
        </p>
        <p style={{ color: "#555", fontSize: "0.9rem" }}>
          此功能完全向下相容——沒有頁碼的舊筆記不受影響，僅隱藏「定位」按鈕。
        </p>
      </AdminCard>

      <div style={{ marginTop: "1.25rem" }}>
        <AdminCard title="學生端操作步驟">
          <ol style={{ paddingLeft: "1.5rem", lineHeight: 2, fontSize: "0.9rem" }}>
            <li>
              開啟學生閱讀器（請依部署環境的學生端網址進入書本列表頁，例如：
              <code style={{ marginLeft: "0.25rem", fontSize: "0.85em", background: "#f1f5f9", padding: "0 0.3em", borderRadius: 3 }}>
                /books
              </code>
              ）。
            </li>
            <li>點選任意書本進入閱讀器。</li>
            <li>開啟右側「智能筆記」面板（桌面版）或底部「筆記」按鈕（行動版）。</li>
            <li>
              新增一則文字筆記（系統會自動記錄目前所在頁碼）。
            </li>
            <li>
              跳到其他頁面後，點擊筆記列表中的
              <strong style={{ marginLeft: "0.25rem", color: "#2563eb" }}>「定位」</strong>
              按鈕，閱讀器會自動跳回該筆記的頁碼。
            </li>
          </ol>
        </AdminCard>
      </div>

      <div style={{ marginTop: "1.25rem" }}>
        <AdminCard title="定位行為優先順序">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: "0.4rem 0.6rem" }}>優先</th>
                <th style={{ padding: "0.4rem 0.6rem" }}>條件</th>
                <th style={{ padding: "0.4rem 0.6rem" }}>動作</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["1", "筆記有 pageNumber", "jumpToPage(pageNumber)，關閉行動版面板"],
                ["2", "筆記有 chapterId 且章節有 pageStart", "jumpToPage(chapter.pageStart)，關閉面板"],
                ["3", "筆記有 chapterId 但章節無 pageStart", "顯示非阻塞提示訊息"],
                ["4", "無 pageNumber 也無 chapterId", "不顯示「定位」按鈕"]
              ].map(([p, c, a]) => (
                <tr key={p} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.4rem 0.6rem", fontWeight: 600 }}>{p}</td>
                  <td style={{ padding: "0.4rem 0.6rem" }}>{c}</td>
                  <td style={{ padding: "0.4rem 0.6rem" }}>{a}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>
      </div>

      <div style={{ marginTop: "1.25rem" }}>
        <AdminCard title="API 端點">
          <code
            style={{
              display: "block",
              background: "#f1f5f9",
              padding: "0.75rem 1rem",
              borderRadius: 4,
              fontSize: "0.85rem",
              fontFamily: "monospace"
            }}
          >
            GET /api/student/books/:bookId/notes/:noteId/navigate
          </code>
          <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#555" }}>
            回傳 <code>{"{ anchor: boolean, pageNumber, chapterId, fallback }"}</code>。
            anchor=true 表示有定位資訊；anchor=false 時 fallback 為提示訊息。
          </p>
        </AdminCard>
      </div>
    </div>
  );
}
