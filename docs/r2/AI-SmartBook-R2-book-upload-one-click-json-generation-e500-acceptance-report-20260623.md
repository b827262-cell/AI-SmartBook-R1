# AI-SmartBook-R2 One-Click JSON Generation E500 Acceptance Report

日期：2026-06-23  
分支：`feat/r2-book-upload-one-click-json-generation`

## 狀態

success

## 分支 / Commit

- Branch：`feat/r2-book-upload-one-click-json-generation`
- HEAD：`e9bf9188`

## 遷移結果

已執行：

- `pnpm db:migrate`
- 輸出：`[db] migration complete: /home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db`
- 結果：PASS

## API 驗證結果

環境重啟：

- 原有 4300/5174 被舊 process 占用，改以新服務啟動
- Admin API：`HOME=/tmp SQLITE_PATH=/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db ADMIN_API_PORT=4301 pnpm server:dev`
- Admin Frontend：`HOME=/tmp ADMIN_API_TARGET=http://127.0.0.1:4301 pnpm dev -- --port 5175`

測試書本：`book_0d9fbaf1-93ea-4b42-899d-b00c614c390c`

1. `GET http://127.0.0.1:4301/api/admin/books`
   - 狀態：`200`
   - 回傳：含書籍陣列
2. `GET http://127.0.0.1:4301/api/admin/books/book_0d9fbaf1-93ea-4b42-899d-b00c614c390c/json-artifacts`
   - 前置：回傳空陣列 `{"artifacts":[]}`
3. `POST http://127.0.0.1:4301/api/admin/books/book_0d9fbaf1-93ea-4b42-899d-b00c614c390c/json-artifacts/generate`
   - 結果：`200`，回傳 4 筆 `done`
   - `recordCount`: page-index=3, sentence-index=3, question-bank-candidates=0, smart-solve-candidates=1
4. 下載 API（4 檔）
   - `/api/admin/books/.../json-artifacts/<id>/download`
   - 全部 `200`，Content-Type `application/json; charset=utf-8`

## UI 驗證結果

- 開啟書本頁：`http://127.0.0.1:5175/admin/books/book_0d9fbaf1-93ea-4b42-899d-b00c614c390c` → `HTTP 200`
- 開啟 JSON 產生頁籤：`http://127.0.0.1:5175/admin/books/book_0d9fbaf1-93ea-4b42-899d-b00c614c390c/json-artifacts` → `HTTP 200`
- 透過前端 source 取樣（Vite 模組）驗證到：
  - UI 提示含「page-index 與 sentence-index 是索引檔，不可直接匯入題庫或智慧題解」
  - `JsonArtifactsTab.tsx` 內 `ARTIFACT_LABELS` 標記 `page-index` / `sentence-index` 為 `role: index`

## 4 種 JSON 下載與 JSON 結構驗證

下載後檔案存放在：

- `/home/b827262/project/AI-SmartBook-R2/apps/AI-adm-D1/data/generated-json/book_0d9fbaf1-93ea-4b42-899d-b00c614c390c/page-index.json`
- `/home/b827262/project/AI-SmartBook-R2/apps/AI-adm-D1/data/generated-json/book_0d9fbaf1-93ea-4b42-899d-b00c614c390c/sentence-index.json`
- `/home/b827262/project/AI-SmartBook-R2/apps/AI-adm-D1/data/generated-json/book_0d9fbaf1-93ea-4b42-899d-b00c614c390c/question-bank-candidates.json`
- `/home/b827262/project/AI-SmartBook-R2/apps/AI-adm-D1/data/generated-json/book_0d9fbaf1-93ea-4b42-899d-b00c614c390c/smart-solve-candidates.json`

結構驗證：

- `page-index.json`
  - 第一列包含 `bookId, pageNumber, pdfPage, text`
- `sentence-index.json`
  - 第一列包含 `id, bookId, pageNumber, chapterTitle, text`
- `question-bank-candidates.json`
  - 包含 `source, bookId, questions, notice`
  - `questions` 型別為陣列，驗證為空陣列
- `smart-solve-candidates.json`
  - 包含 `source, bookId, items`
  - `items` 型別為陣列，且有 1 筆

## 歸檔與 Git 驗證

`git status --short` 片段：

```text
?? .claude/
?? apps/AI-adm-D1/data/
```

- `apps/AI-adm-D1/data/` 為新生成檔，未加入版本控制（執行階段檔案）

## 提交規範結果

- `.env`：否
- DB (`*.db` / `*.sqlite`)：否
- logs：否
- `.claude`：否
- `generated-json`：否

