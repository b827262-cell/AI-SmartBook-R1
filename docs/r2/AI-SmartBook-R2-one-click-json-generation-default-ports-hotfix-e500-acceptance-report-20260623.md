# AI-SmartBook-R2 One-Click JSON Generation Default Ports Hotfix E500 Acceptance Report

日期：2026-06-23
分支：`feat/r2-book-upload-one-click-json-generation`

## 狀態

pass

## 分支 / Commit

- Branch：`feat/r2-book-upload-one-click-json-generation`
- 起始 HEAD：`fd17cbfe`

## Migration 結果

- 驗證：`book_json_artifacts` 表已存在於 `data/ai-smartbook-r1.db`。
  - `SELECT name FROM sqlite_master WHERE type='table' AND name='book_json_artifacts';`
- 其他 migration 指令未另行執行（本次為 hotfix 驗證作業，僅確認既有 schema 可直接支援）。

## API 驗證結果

先確認 source route 定義（`apps/AI-adm-D1/src/server/index.ts`）：

- `POST /api/admin/books/:bookId/json-artifacts/generate`
- `GET /api/admin/books/:bookId/json-artifacts`
- `GET /api/admin/books/:bookId/json-artifacts/:artifactId/download`

以書本 `book_dc5d9ca9-9719-4376-b609-da4298ad38aa` 測試：

1. `GET /api/admin/books/book_dc5d9ca9-9719-4376-b609-da4298ad38aa/json-artifacts`
   - `HTTP 200`
   - 回應：`{"artifacts":[]}`
2. `POST /api/admin/books/book_dc5d9ca9-9719-4376-b609-da4298ad38aa/json-artifacts/generate`
   - `HTTP 201`
   - 產生 4 筆：`page-index`、`sentence-index`、`question-bank-candidates`、`smart-solve-candidates`
3. `GET /api/admin/books/book_dc5d9ca9-9719-4376-b609-da4298ad38aa/json-artifacts`
   - `HTTP 200`
   - 回應含 4 筆 artifact 記錄，`status` 均為 `done`
4. 下載 endpoint 測試
   - `/api/admin/books/book_dc5d9ca9-9719-4376-b609-da4298ad38aa/json-artifacts/<artifactId>/download`
   - 均為 `HTTP 200`

## UI 驗證結果

- Admin 前端啟動於 `5174`（`http://127.0.0.1:5174`）
- `GET /admin/books/book_dc5d9ca9-9719-4376-b609-da4298ad38aa` → `HTTP 200`
- `GET /admin/books/book_dc5d9ca9-9719-4376-b609-da4298ad38aa/json-artifacts` → `HTTP 200`
- 以 API 先行一鍵產生，前端 JSON artifact 列表 API 可即時回傳資料（避免預期 404）

## 4 種 JSON 下載與檢核

下載後檔案存放於：

- `/home/b827262/project/AI-SmartBook-R2/apps/AI-adm-D1/data/generated-json/book_dc5d9ca9-9719-4376-b609-da4298ad38aa/page-index.json`
- `/home/b827262/project/AI-SmartBook-R2/apps/AI-adm-D1/data/generated-json/book_dc5d9ca9-9719-4376-b609-da4298ad38aa/sentence-index.json`
- `/home/b827262/project/AI-SmartBook-R2/apps/AI-adm-D1/data/generated-json/book_dc5d9ca9-9719-4376-b609-da4298ad38aa/question-bank-candidates.json`
- `/home/b827262/project/AI-SmartBook-R2/apps/AI-adm-D1/data/generated-json/book_dc5d9ca9-9719-4376-b609-da4298ad38aa/smart-solve-candidates.json`

檢核項目：

- `page-index.json`：`[ ... ]` 陣列（`HTTP 200`）
- `sentence-index.json`：`[ ... ]` 陣列（`HTTP 200`）
- `question-bank-candidates.json`：物件，包含 `bookId, notice, questions, source`，其中 `questions` 為陣列
- `smart-solve-candidates.json`：物件，包含 `bookId, notice, items, source`，其中 `items` 為陣列
- `page-index.json` / `sentence-index.json` 已標示為 `artifactType` 對應 `page-index` / `sentence-index`

## 來源埠驗證

- Admin API：`4300`
- Admin 前端：`5174`
- 一切驗證以 IPv6 回呼 (`[::1]:4300`) 完成；Admin API 實際監聽行為為 `tcp6 :::4300`，對應前端頁面仍可正確使用同主機 API 設定。

## git status --short

```text
?? .claude/
?? apps/AI-adm-D1/data/
```

- 不提交 `.env`
- 不提交 DB（`*.db` / `*.sqlite`）
- 不提交 logs
- 不提交 `.claude`
- 不提交 `generated-json`
