# AI-SmartBook R2 DB Path Restart Verification

Date: 2026-06-22

## 環境
- Repo: `/home/b827262/project/AI-SmartBook-R2`
- Branch: `feat/ai-smartbook-r2-modular-imports`
- `.env` DB env 已為絕對路徑：
  - `DATABASE_URL=file:/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db`
  - `SQLITE_PATH=/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db`
  - `STU_DB_PATH=/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db`

## 操作紀錄
1. 先停止舊 R2 監聽進程（4300/5174/5173）
   - `kill 1933130 1933362 1933369 1921966 ...`（依 `ss -ltnp` 逐次清理）
2. 以 `HOME=/tmp` 啟動（本環境 `pnpm` 需此環境變數）並重啟服務
   - `setsid env HOME=/tmp pnpm --filter AI-adm-D1 server:dev`（寫入 `r2-api.log`）
   - `setsid env HOME=/tmp ADMIN_API_TARGET=http://127.0.0.1:4300 pnpm --filter AI-adm-D1 dev`（寫入 `r2-admin.log`）
   - `setsid env HOME=/tmp STUDENT_API_TARGET=http://127.0.0.1:4300 ADMIN_API_TARGET=http://127.0.0.1:4300 pnpm --filter AI-Stu-R1 dev`（寫入 `r2-student.log`）
3. 驗證端口
   - `ss -ltnp | rg '4300|5173|5174|5175'`

## 重啟結果
- 目前 listener：
  - `*:4300`
  - `*:5174`
  - `*:5173`
- `r2-api.log` 顯示的 DB 路徑：
  - `AI-adm-D1 admin API listening on 4300 (ai provider: mock, db: /home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db)`
- API 回傳驗證：
  - `curl -sS http://127.0.0.1:4300/api/admin/books`
  - 回傳包含 13 本書（`13` 個 `"id"`）
