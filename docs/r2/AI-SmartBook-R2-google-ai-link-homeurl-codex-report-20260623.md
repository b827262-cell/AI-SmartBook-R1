# AI-SmartBook-R2 Google AI homeUrl 驗收報告（Codex）

- 日期：2026-06-23
- 分支：feat/r2-student-reader-toolbar-modules
- 頭像提交（HEAD）：a3366fd71cf4e2c845bafd799dc7639375b21db8

## 1) 狀態

- status：success

## 2) 驗證檔案

- apps/AI-Stu-R1/src/lib/external-ai.ts
- apps/AI-Stu-R1/src/components/PasteBackNotePanel.tsx

## 3) 指定項目檢查

- `external-ai.ts` 中 `Google` provider 已是：
  - `homeUrl: "https://google.com/ai"`
  - 檢查結果：`grep -n` 在第 32 行命中。
- `PasteBackNotePanel.tsx` 中 `Google AI` provider 已是：
  - `{ name: "Google AI", homeUrl: "https://google.com/ai" }`
  - 檢查結果：`grep -n` 在第 16 行命中。
- `PasteBackNotePanel.tsx` 已全面使用 `homeUrl`：
  - `interface AiProviderLink { name: string; homeUrl: string; }`
  - `openProvider(homeUrl: string)` + `onClick={() => openProvider(p.homeUrl)}`
  - `disabled={!p.homeUrl}`、`title={p.homeUrl ? ... : ...}`
- 檢查結果：未發現 `p.url`/`url` 欄位與 `openProvider` 的相關路徑。

## 4) grep 結果摘要

```text
external-ai.ts:32  homeUrl: "https://google.com/ai"
PasteBackNotePanel.tsx:16  { name: "Google AI", homeUrl: "https://google.com/ai" }
PasteBackNotePanel.tsx:5   homeUrl: string;
PasteBackNotePanel.tsx:61  function openProvider(homeUrl: string) {
PasteBackNotePanel.tsx:62  if (!homeUrl) return;
PasteBackNotePanel.tsx:64      window.open(homeUrl, "_blank", "noopener,noreferrer");
PasteBackNotePanel.tsx:104 onClick={() => openProvider(p.homeUrl)}
PasteBackNotePanel.tsx:105 disabled={!p.homeUrl}
PasteBackNotePanel.tsx:106 title={p.homeUrl ? `開啟 ${p.name}` : "其他平台（手動開啟）"}
```

## 5) AI-Stu-R1 typecheck / build

- typecheck：`PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck`
  - 結果：通過
- build：`PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build`
  - 結果：通過（Vite chunk size warning 由既有建置輸出提醒）

## 6) 手動瀏覽器驗證

- 本輪未執行互動式 GUI 手動驗證（環境未啟動可視化 E500 前端流程）。
- 依需求確認程式邏輯：Google 按鈕使用 `window.open(p.homeUrl)` 開新分頁，不組合 `prompt`、`image` 或頁面文字到 URL。

## 7) 隱私與傳輸檢查

- Google 連結不以 URL 帶入 prompt/image/content
- 未觀察到自動傳送 prompt / screenshot 參數到 Google URL 的實作。

## 8) git status

- 變更後 `git status --short`：

```text
?? .claude/
?? apps/AI-adm-D1/data/
```

## 9) 提交約束確認

- 未提交 `.env`
- 未提交 DB 檔案
- 未提交 logs
- 未提交 `.claude`
- 未提交 runtime generated 資料
- 報告中 `apps/AI-adm-D1/data/` 與 `.claude/` 保持 untracked 未納入 commit。

## 10) Commit / Push 結果

- Commit：`docs(r2): add Google AI homeUrl verification report`
- 目標分支：`origin feat/r2-student-reader-toolbar-modules`

建議現在輸入 /compact，壓縮本輪上下文後再開始下一輪任務。
