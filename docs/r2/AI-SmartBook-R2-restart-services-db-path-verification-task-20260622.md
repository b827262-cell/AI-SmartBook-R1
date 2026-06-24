# AI-SmartBook-R2 Restart Services and DB Path Verification Task

Date: 2026-06-22

## Purpose

Create a safe AGY/Codex handoff task to restart the AI-SmartBook-R2 frontend, backend, and API services after DB path correction, then verify that the API reads the correct SQLite database and returns book data.

This task is for execution guidance only. It must not change source code and must not commit `.env` or SQLite database files.

## Execution Rule

```text
GitHub Execution in English.
Termination report in Traditional Chinese.
```

## Target Workspace

```text
/home/b827262/project/AI-SmartBook-R2
```

Target branch:

```text
feat/ai-smartbook-r2-modular-imports
```

## Critical Rules

1. Do not modify source code.
2. Do not print `.env` secrets.
3. Do not commit `.env`.
4. Do not commit SQLite database files.
5. Do not delete DB files.
6. Only stop processes confirmed to belong to `AI-SmartBook-R2`.
7. Do not stop unrelated node processes.
8. Only create a Markdown verification report under `docs/r2/`.
9. Stage only the verification report file.
10. At the end, remind the user to run `/compact`.

## Known Expected DB

Main R2 DB:

```text
/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db
```

Expected book count:

```text
13
```

Expected `.env` DB paths:

```env
DATABASE_URL=file:/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db
SQLITE_PATH=/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db
STU_DB_PATH=/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db
```

## Services and Ports

```text
Admin/main API: 4300
Student API: 4310
Admin frontend: 5174
Student frontend: 5173
```

## Steps

### 1. Enter workspace

```bash
cd /home/b827262/project/AI-SmartBook-R2
```

### 2. Confirm branch and git status

```bash
git status -sb
git branch --show-current
```

Expected branch:

```text
feat/ai-smartbook-r2-modular-imports
```

### 3. Verify local `.env` and DB without printing secrets

```bash
test -f .env
test -f data/ai-smartbook-r1.db
grep -nEi 'DATABASE_URL|SQLITE_PATH|STU_DB_PATH|STU_RUNTIME_MODE|STU_READONLY_MODE' .env
sqlite3 /home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db "PRAGMA integrity_check;"
sqlite3 /home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db "SELECT count(*) AS books FROM books;"
git check-ignore -v .env data/ai-smartbook-r1.db
```

Expected results:

```text
PRAGMA integrity_check => ok
book count => 13
.env ignored by git
SQLite DB ignored by git
```

### 4. Inspect current ports and processes

```bash
ss -ltnp | grep -E ':4300|:4310|:5173|:5174' || true
ps -ef | grep AI-SmartBook-R2 | grep node || true
```

### 5. Stop only confirmed R2 processes

For each PID using ports `4300`, `4310`, `5173`, or `5174`:

```bash
ps -fp <PID>
readlink -f /proc/<PID>/cwd || true
```

Only kill the PID if cwd is under:

```text
/home/b827262/project/AI-SmartBook-R2
```

Use:

```bash
kill <PID>
```

Wait 2 seconds and verify:

```bash
ss -ltnp | grep -E ':4300|:4310|:5173|:5174' || true
```

If a confirmed R2 PID remains, use:

```bash
kill -TERM <PID>
```

Do not use `kill -9` unless clearly necessary. If used, explain why in the report.

### 6. Start R2 services using nohup

```bash
cd /home/b827262/project/AI-SmartBook-R2
set -a
source .env
set +a
```

Start Admin/main API:

```bash
nohup pnpm --filter AI-adm-D1 server:dev > r2-api.log 2>&1 &
```

Start Student API:

```bash
nohup pnpm --filter AI-Stu-R1 server:dev > r2-stu-api.log 2>&1 &
```

Start Admin frontend:

```bash
nohup env ADMIN_API_TARGET=http://127.0.0.1:4300 pnpm --filter AI-adm-D1 dev > r2-admin.log 2>&1 &
```

Start Student frontend:

```bash
nohup env STUDENT_API_TARGET=http://127.0.0.1:4300 ADMIN_API_TARGET=http://127.0.0.1:4300 pnpm --filter AI-Stu-R1 dev > r2-student.log 2>&1 &
```

### 7. Wait and verify ports

Wait 5 seconds, then run:

```bash
ss -ltnp | grep -E ':4300|:4310|:5173|:5174' || true
```

Expected ports:

```text
4300 listening
4310 listening
5174 listening
5173 listening
```

### 8. Verify API log DB path

```bash
tail -n 80 r2-api.log
```

The API log must show DB path:

```text
db: /home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db
```

If it shows this wrong path, report failure or blocker:

```text
/home/b827262/project/AI-SmartBook-R2/apps/AI-adm-D1/data/ai-smartbook-r1.db
```

### 9. Verify API and frontend

```bash
curl -s http://127.0.0.1:4300/api/admin/books | head -c 2000
echo
curl -s http://127.0.0.1:4300/api/appearance-settings | head -c 500
echo
curl -I http://127.0.0.1:5174/
curl -I http://127.0.0.1:5173/books
```

### 10. Confirm books are not empty

The admin books API should return non-empty books, ideally 13 books.

If it still returns:

```json
{"books":[]}
```

Report `blocker` and include:

1. `r2-api.log` DB path.
2. SQLite count from main DB.
3. Current PID and cwd for port 4300.

### 11. Create verification report

Create:

```text
docs/r2/AI-SmartBook-R2-db-path-restart-verification-20260622.md
```

The report must include:

1. Status: `success`, `failure`, `blocker`, or `permission-halt`.
2. Branch.
3. Stopped R2 PIDs.
4. `.env` DB paths, without secrets.
5. SQLite `integrity_check` result.
6. SQLite book count.
7. API log DB path.
8. Port status after restart.
9. Curl result for `/api/admin/books`.
10. Admin frontend result.
11. Student frontend result.
12. Whether source code was changed: must be `no`.
13. Whether `.env` or DB files were committed: must be `no`.
14. `git status --short`.

### 12. Stage only the report

```bash
git add docs/r2/AI-SmartBook-R2-db-path-restart-verification-20260622.md
```

Do not stage `.env`, DB files, backups, logs, or source code.

### 13. Commit

```bash
git commit -m "docs: add R2 db path restart verification report"
```

### 14. Push

```bash
git push origin feat/ai-smartbook-r2-modular-imports
```

## Final Termination Report in Traditional Chinese

The final AGY/Codex response must include:

- 狀態：success / failure / blocker / permission-halt
- 停止的 R2 PID
- R2 API DB 實際路徑
- SQLite 書籍數
- `/api/admin/books` 是否非空
- 後台網址
- 前台網址
- 報告檔案路徑
- Commit SHA
- Push 結果
- `git status --short`
- 是否修改原始碼：否
- 是否提交 `.env` / DB：否
- 最後提醒：建議現在輸入 `/compact`，壓縮本輪上下文後再開始下一輪任務。

## Success Criteria

The task is successful only if all conditions are true:

1. R2 API log points to:

```text
/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db
```

2. SQLite book count is `13`.
3. `/api/admin/books` returns non-empty `books`.
4. Admin frontend returns `200 OK`.
5. Student frontend `/books` returns `200 OK`.
6. No source code was modified.
7. No `.env` or DB files were committed.
