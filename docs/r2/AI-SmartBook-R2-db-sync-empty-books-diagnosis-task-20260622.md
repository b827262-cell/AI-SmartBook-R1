# AI-SmartBook-R2 DB Sync Empty Books Diagnosis Task

Date: 2026-06-22

## Purpose

Create a safe Codex/AGY handoff task for diagnosing why `AI-SmartBook-R2` starts successfully but `/api/admin/books` returns an empty book list.

This task is documentation-first. The expected cause is that R2 may be reading a different SQLite file than the one manually copied to:

```text
/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db
```

The most likely root cause is relative DB paths in `.env`, such as:

```env
DATABASE_URL=file:./data/ai-smartbook-r1.db
SQLITE_PATH=./data/ai-smartbook-r1.db
STU_DB_PATH=./data/ai-smartbook-r1.db
```

When services are launched through `pnpm --filter`, the working directory may not be the monorepo root, so `./data/...` may resolve to a package-local path and create/read an empty SQLite database.

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

## Critical Safety Rules

1. Do not modify source code.
2. Do not print `.env` secrets.
3. Do not commit `.env`.
4. Do not commit SQLite database files.
5. Do not delete any database file until it has been inspected and backed up or renamed.
6. Only create or update a Markdown report under `docs/r2/`.
7. Local `.env` changes are allowed only for runtime verification and must not be staged.
8. If the actual R1 database containing books cannot be identified, stop and report `blocker`.

## Known Current State

R2 services were previously started successfully on default ports:

```text
Admin/main API: 4300
Student API: 4310
Admin frontend: 5174
Student frontend: 5173
```

Previous curl result:

```text
http://127.0.0.1:4300/api/admin/books -> 200 OK, but returned {"books":[]}
```

SQLite integrity check previously returned:

```text
ok
```

## Diagnosis Steps

### 1. Confirm workspace and branch

```bash
cd /home/b827262/project/AI-SmartBook-R2
git status -sb
git branch --show-current
```

Expected branch:

```text
feat/ai-smartbook-r2-modular-imports
```

### 2. Check DB-related environment variables without printing secrets

```bash
grep -nEi 'DATABASE_URL|SQLITE_PATH|STU_DB_PATH|STU_RUNTIME_MODE|STU_READONLY_MODE' .env
```

If paths are relative, prepare to change them locally to absolute paths.

### 3. Inspect the intended R2 database

```bash
sqlite3 /home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db "PRAGMA integrity_check;"
sqlite3 /home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db "SELECT count(*) AS books FROM books;"
sqlite3 /home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db "SELECT id, title, status FROM books LIMIT 20;"
```

Record counts only. Do not dump full contents.

### 4. Search for all SQLite files in R2

```bash
find /home/b827262/project/AI-SmartBook-R2 -type f \( -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \) -ls
```

For each candidate DB, inspect book count:

```bash
for db in $(find /home/b827262/project/AI-SmartBook-R2 -type f \( -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \)); do
  echo "=== $db ==="
  sqlite3 "$db" "SELECT count(*) AS books FROM books;" 2>/dev/null || true
done
```

If package-local empty DB files exist, do not delete them. Rename only after confirmation and record this in the report.

### 5. Search R1 for the real database containing books

```bash
find /home/b827262/project/AI-SmartBook-R1 -type f \( -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \) -ls

for db in $(find /home/b827262/project/AI-SmartBook-R1 -type f \( -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \)); do
  echo "=== $db ==="
  sqlite3 "$db" "SELECT count(*) AS books FROM books;" 2>/dev/null || true
  sqlite3 "$db" "SELECT id, title, status FROM books LIMIT 10;" 2>/dev/null || true
done
```

Identify the R1 database with the expected book records.

### 6. If the copied R2 DB is empty but a populated R1 DB exists, resync safely

Stop R2 processes first, only if they are confirmed under the R2 workspace:

```bash
ps -ef | grep AI-SmartBook-R2 | grep node || true
pkill -f '/home/b827262/project/AI-SmartBook-R2' || true
```

Back up current R2 DB before overwriting:

```bash
cd /home/b827262/project/AI-SmartBook-R2
mkdir -p data/backups
cp -av data/ai-smartbook-r1.db "data/backups/ai-smartbook-r1.before-resync.$(date +%Y%m%d-%H%M%S).db"
```

Use SQLite backup from the confirmed populated R1 DB:

```bash
sqlite3 /path/to/confirmed-populated-r1.db ".backup '/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db'"
```

Then verify:

```bash
sqlite3 /home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db "PRAGMA integrity_check;"
sqlite3 /home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db "SELECT count(*) AS books FROM books;"
```

### 7. Change local `.env` DB paths to absolute paths

Make a local backup first:

```bash
cd /home/b827262/project/AI-SmartBook-R2
cp -av .env ".env.bak.$(date +%Y%m%d-%H%M%S)"

sed -i 's#^DATABASE_URL=.*#DATABASE_URL=file:/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db#' .env
sed -i 's#^SQLITE_PATH=.*#SQLITE_PATH=/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db#' .env
sed -i 's#^STU_DB_PATH=.*#STU_DB_PATH=/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db#' .env
```

Verify without printing secrets:

```bash
grep -nEi 'DATABASE_URL|SQLITE_PATH|STU_DB_PATH|STU_RUNTIME_MODE|STU_READONLY_MODE' .env
git check-ignore -v .env data/ai-smartbook-r1.db
```

### 8. Restart R2 services

Use the existing local convention. If the previous setup used `nohup`, continue using it:

```bash
cd /home/b827262/project/AI-SmartBook-R2
set -a
source .env
set +a

nohup pnpm --filter AI-adm-D1 server:dev > r2-api.log 2>&1 &
nohup env ADMIN_API_TARGET=http://127.0.0.1:4300 pnpm --filter AI-adm-D1 dev > r2-admin.log 2>&1 &
nohup env STUDENT_API_TARGET=http://127.0.0.1:4300 ADMIN_API_TARGET=http://127.0.0.1:4300 pnpm --filter AI-Stu-R1 dev > r2-student.log 2>&1 &
```

Optional student runtime API:

```bash
nohup pnpm --filter AI-Stu-R1 server:dev > r2-stu-api.log 2>&1 &
```

### 9. Verify runtime DB path and book list

```bash
tail -n 60 r2-api.log
ss -ltnp | grep -E ':4300|:4310|:5173|:5174' || true
curl -s http://127.0.0.1:4300/api/admin/books | head -c 1000
echo
curl -I http://127.0.0.1:5174/
curl -I http://127.0.0.1:5173/books
```

The API startup log should show the absolute DB path:

```text
/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db
```

The admin books API should no longer return an empty list if the correct populated DB was synced.

## Required Report

Create:

```text
docs/r2/AI-SmartBook-R2-db-sync-empty-books-diagnosis-report-20260622.md
```

The report must include:

1. Status: `success`, `failure`, `blocker`, or `permission-halt`.
2. R2 branch.
3. Original `.env` DB path style: relative or absolute.
4. Resolved root cause.
5. R2 DB count before fix.
6. R1 DB candidates and book counts.
7. Selected source DB path, if any.
8. Whether R2 DB was resynced.
9. SQLite `integrity_check` result after resync.
10. Final R2 DB book count.
11. API curl result after restart.
12. Admin frontend check result.
13. Student frontend check result.
14. Whether source code was modified: must be `no`.
15. Whether `.env` or DB files were committed: must be `no`.
16. `git status --short`.

## Git Commit Rules

Stage only the report:

```bash
git add docs/r2/AI-SmartBook-R2-db-sync-empty-books-diagnosis-report-20260622.md
```

Do not stage `.env`, DB files, backups, logs, or source code.

Commit message:

```text
docs: add R2 db sync empty books diagnosis report
```

Push to:

```text
origin feat/ai-smartbook-r2-modular-imports
```

## Final Termination Report in Traditional Chinese

The final AGY/Codex response must include:

- 狀態：success / failure / blocker / permission-halt
- 問題原因
- 實際讀取的 DB 路徑
- R1 來源 DB 路徑
- R2 DB 書籍數
- API 測試結果
- 後台網址
- 前台網址
- 建立報告檔案路徑
- Commit SHA
- Push 結果
- git status --short
- 是否修改原始碼：否
- 是否提交 `.env` / DB：否
