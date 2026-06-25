# AI-SmartBook-R2 Admin Notes Post-Merge E500 Acceptance Task (2026-06-23)

## 基本資訊
- **Status**: 以 AGY 重點測方式記錄（非最終 go/no-go）
- **Branch**: `feat/r2-integrate-imports-notes`
- **指定 Commit SHA（AGY 任務來源）**: `c440927a7862659b93c46adc65e982de78e09bc9`
- **測試時間**: 2026-06-23
- **驗證主機**: 本地長駐服務
  - Admin API: `http://127.0.0.1:4300`
  - Admin Frontend: `http://127.0.0.1:5174`
  - Student Frontend: `http://127.0.0.1:5173`

## 測試參考 Book ID
- `BOOK_ID=book_0d9fbaf1-93ea-4b42-899d-b00c614c390c`

## AGY 重點測結果

| # | 測項 | 目標 URL | 結果 | 說明 |
|---|------|----------|------|------|
| 1 | Admin Notes 頁面 | `GET /admin/notes` | **PASS** | 回應 200，頁面可載入 |
| 2 | Admin Notes API | `GET /api/admin/notes` | **FAIL** | 回應 404 `Cannot GET /api/admin/notes` |
| 3 | Book Notes API | `GET /api/admin/books/{bookId}/notes` | **FAIL** | 回應 404 `Cannot GET /api/admin/books/{bookId}/notes` |
| 4 | Question Bank Import UI | `GET /admin/import/question-bank` | **PASS** | 回應 200 |
| 5 | Smart Solve Import UI | `GET /admin/import/smart-solve` | **PASS** | 回應 200 |
| 6 | Student 書單頁 | `GET /books` | **PASS** | 回應 200 |
| 7 | Reader AI Notes Navigation（頁面可達） | `GET /books/{bookId}` | **PASS** | 回應 200（可載入 Reader 畫面）；此項未執行筆記錨點互動點擊自動化驗證 |

## 觀察與補充
- `/api/admin/import/question-bank/jobs` 目前回應 200，表示 Admin API 本體仍可提供既有題庫匯入 API。
- `smart_book_notes` 在 DB 中有資料（`data/ai-smartbook-r1.db` 中有 `4` 筆），但 Admin Notes API 在實體 API 回應 404，可能為「服務啟動實例與程式版本不一致（未採用最新版路由）」。

## 建議
1. 對 `AI-adm-D1` 的 server process 做一次重啟，確認實際使用到本次分支最新 server 代碼，重新複測 `T2`、`T3`。
2. `T2`、`T3` 重測通過後，再補充一筆 admin/navigate 點擊流程手動驗證（從 Reader 打開 note card 並觸發 `handleNoteNavigate`）。
