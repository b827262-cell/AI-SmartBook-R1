# AI-SmartBook-R2：前台 Header 品牌圖示 6.png 與 ICO 4×4 宮格實作報告（2026-06-24）

- 任務來源：
  - `docs/r2/AI-SmartBook-R2-student-header-brand-logo-ico-6png-task-20260624.md`
  - `docs/r2/AI-SmartBook-R2-ico-4x4-grid-layout-codex-task-20260624.md`
- 分支：`fix/r2-admin-settings-files-integration`

## 狀態
- success:
  - 後台 `D. ICO / 圖片設定` 已整併為 4×4 宮格。
  - 新增 `6.png` 固定檔名對應 `studentHeaderBrandLogoUrl`（前台 Header 品牌圖示）。
  - `1.png` 不再改寫 `studentHeaderBrandLogoUrl`。
  - 匯入流程支援 `1.png、2.png、4.png、6.png、a.png～h.png`。
  - `h.png` 對應 `studentHeaderHomeButtonIconUrl`。
  - `5.png` 保留為相容匯入，亦寫入 `studentHeaderHomeButtonIconUrl` 並設 `studentHeaderHomeButtonIconMode=image`。
  - 後台「前台 Header / 導覽列設定」已移除 `studentHeaderBrandLogoUrl` 輸入欄位（欄位移至 ICO 區）。
  - 圖片載入失敗 fallback 仍維持既有 emoji 行為。
- failure: 無
- blocker: 無
- permission-halt: 無

## current branch / commit
- branch: `fix/r2-admin-settings-files-integration`
- commit: `05d7287`

## changed files
- `apps/AI-adm-D1/src/pages/AppearanceSettingsPage.tsx`
- `apps/AI-adm-D1/src/styles.css`
- `docs/r2/AI-SmartBook-R2-admin-header-brand-ico-6png-4x4-grid-report-20260624.md`（本報告）

## 實作摘要
- 重新整理 `IMPORTABLE_ICON_FIELDS` 映射：
  - `6.png` → `studentHeaderBrandLogoUrl`，標籤顯示為「前台 Header 品牌圖示」。
  - 移除 `1.png` 對 `studentHeaderBrandLogoUrl` 的同步寫入邏輯。
  - 新增 `g.png` → `categoryIconUrl`、`h.png` → `studentHeaderHomeButtonIconUrl`，並在 patch 中同時寫入 `studentHeaderHomeButtonIconMode=image`。
  - 新增 `IMPORTABLE_ICON_FIELDS_COMPAT` 以維持 `5.png` 的向下相容匯入。
- D. ICO 區改為 4×4 格線渲染：
  - 新增 `IMPORT_ICON_GRID` 設定順序：`a,b,c,d,e,f,g,h,6,1,2,4 + 4 個預留`。
  - 實作預留卡片 `預留 1~4`，顯示 `尚未啟用`。
- 資料夾匯入提示文字更新為：`1.png、2.png、4.png、6.png 與 a.png～h.png`。
- 移除前台 Header 區塊中的 `studentHeaderBrandLogoUrl` 網址/上傳欄位，改由 ICO 區卡片管理。
- 新增 CSS：
  - `.appearance-icon-grid` 4 欄桌機格線，加入回應式斷點（3欄 / 2欄 / 1欄）。
  - 預留卡片視覺樣式。

## 對應表
- `1.png` → `headerLogoUrl`
- `2.png` → `bannerIconUrl`
- `4.png` → `brandIconUrl`
- `6.png` → `studentHeaderBrandLogoUrl`
- `5.png`（相容）→ `studentHeaderHomeButtonIconUrl` + `studentHeaderHomeButtonIconMode=image`
- `a.png` → `textSelectionIconUrl`
- `b.png` → `smartNoteIconUrl`
- `c.png` → `pasteBackNoteIconUrl`
- `d.png` → `pasteBackAiNoteIconUrl`
- `e.png` → `screenshotAskAiIconUrl`
- `f.png` → `hideAnswerIconUrl`
- `g.png` → `categoryIconUrl`
- `h.png` → `studentHeaderHomeButtonIconUrl` + `studentHeaderHomeButtonIconMode=image`

## 驗證結果
- `PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 typecheck`：pass
- `PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build`：pass
- `PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck`：pass
- `PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build`：pass
- API 驗證：
  - `curl -s http://127.0.0.1:4300/api/appearance-settings` 回應 200，關鍵欄位存在。
  - 回傳中 `studentHeaderBrandLogoUrl`、`studentHeaderHomeButtonIconUrl`、`studentHeaderHomeButtonIconMode` 可讀取到值。
- 前台頁面連線：
  - `curl -I -s http://127.0.0.1:5174/books` 回應 200。
  - `curl -I -s http://127.0.0.1:5174/books/1` 回應 200。

## git status --short（目前）
- `?? ai-stu-r1-dist-a04232f.tar.gz`
- `?? test-pup/`

## 提交與上傳
- 本報告已與代碼同分支提交並推到 GitHub：
  - commit: `05d7287`
  - push: `origin fix/r2-admin-settings-files-integration`

## 不提交項目聲明
- 本次未提交 `.env`、DB、logs、`.claude/`、runtime upload data。
