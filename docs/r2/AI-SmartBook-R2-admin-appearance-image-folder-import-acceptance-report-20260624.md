# AI-SmartBook-R2 Admin Appearance Image Folder Import 驗收報告

- 任務日誌：2026-06-24
- 分支：`feat/r2-admin-appearance-image-folder-import-impl`
- Commit（最終）：`967128a2`

## 狀態
- success: 已完成後台 `介面設定` 的「ICO / 圖片設定」欄位擴充與固定檔名批次匯入流程。
- failure: 無。
- blocker: 無。
- permission-halt: 無。

## 變更檔案
- `packages/schema/src/appearance.schema.ts`
- `apps/AI-adm-D1/src/pages/AppearanceSettingsPage.tsx`
- `apps/AI-adm-D1/src/styles.css`
- `docs/r2/AI-SmartBook-R2-admin-appearance-image-folder-import-acceptance-report-20260624.md`（本報告）

## 實作摘要
- 擴充 `AppearanceSettings` schema，新增欄位：
  - `categoryIconUrl`
  - `brandIconUrl`
  - `textSelectionIconUrl`
  - `smartNoteIconUrl`
  - `pasteBackNoteIconUrl`
  - `pasteBackAiNoteIconUrl`
  - `screenshotAskAiIconUrl`
  - `hideAnswerIconUrl`
- 在 `AI-adm-D1` `介面設定` 新增 `D. ICO / 圖片設定`（系統圖片 + 筆記功能圖示）區塊。
- 針對 `1~5` 與 `a~f` 建立 `固定檔名 ↔ 欄位` 對應輸入卡片、預覽、`更換` 按鈕。
- 新增 `從資料夾匯入圖示` 按鈕（多檔/資料夾選擇 fallback）：
  - 依 `basename` 比對 `1.png`～`5.png`、`a.png`～`f.png`。
  - 找到後逐一上傳並更新對應欄位。
  - 缺失檔案不清空既有值。
  - 非法/未對應檔案提示已略過。
- 保留既有圖片上傳 API，只新增畫面行為，不新增後端或 DB 欄位 migration。

## 圖片 / ICO 對應
- `1.png` → `Logo 圖片（換圖）`：`headerLogoUrl`
- `2.png` → `Banner 圖片`：`bannerIconUrl`
- `3.png` → `分類圖示（categoryIcon）`：`categoryIconUrl`
- `4.png` → `品牌圖示網址`：`brandIconUrl`
- `5.png` → `按鈕 icon 網址`：`studentHeaderHomeButtonIconUrl`
- `a.png` → `文字選取`：`textSelectionIconUrl`
- `b.png` → `智能筆記`：`smartNoteIconUrl`
- `c.png` → `貼回筆記`：`pasteBackNoteIconUrl`
- `d.png` → `貼回 AI 筆記`：`pasteBackAiNoteIconUrl`
- `e.png` → `截圖問 AI`：`screenshotAskAiIconUrl`
- `f.png` → `遮答案`：`hideAnswerIconUrl`

## 驗證結果
- `PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 typecheck`：pass
- `PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build`：pass
- `PNPM_HOME=/tmp/pnpm pnpm --filter @ai-smartbook/schema typecheck`：pass
- 手動 UI 驗證：
  - 未啟動真實瀏覽器進行互動錄影；完成欄位與邏輯檢核於 code review + typecheck/build。

## git status --short
- 目前可見變更：
  - `M apps/AI-adm-D1/src/pages/AppearanceSettingsPage.tsx`
  - `M apps/AI-adm-D1/src/styles.css`
  - `M packages/schema/src/appearance.schema.ts`
- 未提交項目保留：
  - `?? .claude/`
  - `?? apps/AI-adm-D1/data/`
