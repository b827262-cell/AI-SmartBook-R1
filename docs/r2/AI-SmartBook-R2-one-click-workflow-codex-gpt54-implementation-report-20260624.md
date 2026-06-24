# AI SmartBook R2 一鍵流程實作報告

- 任務檔案：`docs/r2/AI-SmartBook-R2-one-click-workflow-codex-gpt54-implementation-task-20260624.md`
- 分支：`fix/r2-admin-settings-files-integration`
- 任務提交：`3dad84362f025bfdb175c2a86ff5347f387264d4`
- 執行日期：`2026-06-24`

## 本次完成內容

1. 實作後端一鍵流程 API：
   - `POST /api/admin/books/:bookId/one-click-workflow`
   - `GET /api/admin/books/:bookId/one-click-workflow`
2. 將一鍵流程改為真正的 server-side job，狀態持久化於 `book_ai_jobs`。
3. 補上多步驟 workflow 狀態：
   - 檢查 PDF 與解析內容
   - 檢查 Google AI 設定
   - 建立 Q&A
   - 建立知識點
   - 同步知識點到後台
   - 同步到學生前台 / Published
   - 自動偵測起始頁並產生 Reader TOC
   - 最後建立章節
4. AI provider 改為依最新後台設定 / env fallback 動態建立，不再固定於 server 啟動時綁死。
5. Google AI 設定頁補上：
   - key 來源顯示（後台儲存 / 環境變數 / 無）
   - 綠燈時才允許選擇模型
6. Files Tab 一鍵完成區塊改為：
   - 真正啟動 workflow
   - 可選執行模型
   - 輪詢並顯示各步驟狀態
7. 自動生成資料改為可重跑：
   - workflow 產生的 Q&A 會先清掉舊資料再重建
   - workflow 產生的知識點會先清掉舊資料再重建
8. 已檢查 `pnpm-lock.yaml`，本次未納入不相關變動。

## 主要檔案

- `apps/AI-adm-D1/src/server/index.ts`
- `apps/AI-adm-D1/src/server/ai-settings-store.ts`
- `apps/AI-adm-D1/src/pages/tabs/FilesTab.tsx`
- `apps/AI-adm-D1/src/components/GoogleAiSettingsCard.tsx`
- `apps/AI-adm-D1/src/api.ts`
- `packages/schema/src/aiJob.schema.ts`
- `packages/db/src/repositories/aiJob.repo.ts`
- `packages/db/src/repositories/qaLog.repo.ts`
- `packages/db/src/repositories/smartBookNote.repo.ts`

## 驗證結果

- `pnpm typecheck`：通過
- `pnpm admin:build`：通過

## 實作備註

- 知識點目前落在既有 `smart_book_notes`，避免憑空新增一套未被 student/admin 使用的資料表。
- Student 端同步以既有 `published` 與 `notes/contents/outline` 資料流為準。
- Reader TOC 會先用整本 JSON index 偵測第一個有效 heading page，再以 `PDF 最末頁` 作為結束頁重新產生。
