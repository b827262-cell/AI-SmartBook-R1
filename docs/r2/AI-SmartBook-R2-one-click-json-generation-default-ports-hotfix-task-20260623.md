# AI-SmartBook-R2 Task — One-Click JSON Generation Default Ports Hotfix

Date: 2026-06-23

## 1. Purpose

Manual user testing showed that the One-Click JSON Generation UI fails on the default E500 ports:

```text
Admin frontend: http://127.0.0.1:5174
Admin API:      http://127.0.0.1:4300
```

Observed UI error:

```text
404 Not Found
尚未產生任何 JSON，請點擊「一鍵產生 4 種 JSON」。
```

Browser console shows 404 calls related to:

```text
/api/admin/books/:bookId/json-artifacts
/api/admin/books/:bookId/json-artifacts/generate
```

Important context:

The previous E500 acceptance report passed using temporary ports:

```text
Admin API:      4301
Admin frontend: 5175
```

Therefore, this is not a complete production/default-port acceptance. The default 4300/5174 services likely still run stale code or a different branch.

---

## 2. Execution Rule

```text
GitHub Execution in English.
Termination report in Traditional Chinese.
```

Final report must include:

```text
建議現在輸入 /compact，壓縮本輪上下文後再開始下一輪任務。
```

---

## 3. Workspace and Branch

Workspace:

```text
/home/b827262/project/AI-SmartBook-R2
```

Branch:

```text
feat/r2-book-upload-one-click-json-generation
```

---

## 4. Root-Cause Checklist

Check the following in order.

### 4.1 Confirm local branch and HEAD

```bash
cd /home/b827262/project/AI-SmartBook-R2

git fetch origin --prune
git checkout feat/r2-book-upload-one-click-json-generation
git pull --ff-only origin feat/r2-book-upload-one-click-json-generation

git branch --show-current
git rev-parse --short HEAD
git status --short
```

Expected:

```text
feat/r2-book-upload-one-click-json-generation
HEAD includes implementation commits and report commits.
```

### 4.2 Confirm source routes exist

```bash
grep -n "json-artifacts" apps/AI-adm-D1/src/server/index.ts
grep -n "generateJsonArtifacts" apps/AI-adm-D1/src/api.ts
grep -n "JsonArtifactsTab" apps/AI-adm-D1/src/pages/BookDetail.tsx
```

Expected:

```text
Routes and frontend client methods exist.
```

### 4.3 Confirm migration table exists

```bash
sqlite3 data/ai-smartbook-r1.db ".schema book_json_artifacts"
sqlite3 data/ai-smartbook-r1.db "SELECT name FROM sqlite_master WHERE type='table' AND name='book_json_artifacts';"
```

If missing:

```bash
PNPM_HOME=/tmp/pnpm pnpm db:migrate
```

### 4.4 Identify stale default-port processes

Check 4300 and 5174:

```bash
lsof -iTCP:4300 -sTCP:LISTEN -n -P
lsof -iTCP:5174 -sTCP:LISTEN -n -P
```

For each PID, confirm cwd:

```bash
readlink -f /proc/<PID>/cwd
```

Only stop processes whose cwd is:

```text
/home/b827262/project/AI-SmartBook-R2
```

Do not kill R1 or unrelated processes.

---

## 5. Required Default-Port Restart

Restart default services from the feature branch.

### 5.1 Stop default-port stale services

After cwd confirmation:

```bash
kill <PID_4300>
kill <PID_5174>
```

### 5.2 Start Admin API on 4300

Use absolute DB paths:

```bash
cd /home/b827262/project/AI-SmartBook-R2

nohup env \
  DATABASE_URL=file:/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db \
  SQLITE_PATH=/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db \
  STU_DB_PATH=/home/b827262/project/AI-SmartBook-R2/data/ai-smartbook-r1.db \
  PNPM_HOME=/tmp/pnpm \
  pnpm --filter AI-adm-D1 server:dev \
  > r2-api.log 2>&1 &
```

### 5.3 Start Admin frontend on 5174

```bash
nohup env \
  ADMIN_API_TARGET=http://127.0.0.1:4300 \
  PNPM_HOME=/tmp/pnpm \
  pnpm --filter AI-adm-D1 dev -- --host 0.0.0.0 --port 5174 \
  > r2-admin.log 2>&1 &
```

---

## 6. Required Default-Port API Tests

Use a real bookId:

```bash
BOOK_ID=$(curl -s http://127.0.0.1:4300/api/admin/books | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const j=JSON.parse(s);const b=(j.books||[])[0];if(!b){process.exit(2)};console.log(b.id)})')
echo "$BOOK_ID"
```

Test list endpoint:

```bash
curl -i "http://127.0.0.1:4300/api/admin/books/$BOOK_ID/json-artifacts"
```

Expected:

```text
HTTP 200
{"artifacts": ...}
```

Test generate endpoint:

```bash
curl -i -X POST "http://127.0.0.1:4300/api/admin/books/$BOOK_ID/json-artifacts/generate" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected:

```text
HTTP 200
4 artifact summaries
```

Test frontend proxy endpoint:

```bash
curl -i "http://127.0.0.1:5174/api/admin/books/$BOOK_ID/json-artifacts"
```

Expected:

```text
HTTP 200
Not 404
```

Test page:

```bash
curl -I "http://127.0.0.1:5174/admin/books/$BOOK_ID/json-artifacts"
```

Expected:

```text
HTTP 200
```

---

## 7. Manual Browser Test

Open:

```text
http://127.0.0.1:5174/admin/books/<BOOK_ID>/json-artifacts
```

Verify:

```text
1. JSON 產生 tab loads.
2. Existing artifact list loads or empty state appears without 404.
3. Click 一鍵產生 4 種 JSON.
4. The page shows 4 artifacts.
5. Download buttons work.
6. page-index and sentence-index are marked as source/index files.
7. question-bank-candidates has questions array shape.
8. smart-solve-candidates has items array shape.
```

---

## 8. Storage Path Issue to Check

The previous report showed generated files under:

```text
apps/AI-adm-D1/data/generated-json/<bookId>/
```

But the intended runtime folder is:

```text
data/generated-json/<bookId>/
```

Investigate whether `GENERATED_JSON_ROOT = resolve("./data/generated-json")` resolves relative to the package cwd.

If so, fix it safely by using an explicit project root or env var, for example:

```text
GENERATED_JSON_ROOT=/home/b827262/project/AI-SmartBook-R2/data/generated-json
```

or compute root from an existing DB path helper.

Acceptance requirement:

```text
Generated JSON should be under the project data directory, not apps/AI-adm-D1/data, unless intentionally documented and ignored.
```

Also ensure Git ignore covers the actual generated path.

---

## 9. Required Report

Create:

```text
docs/r2/AI-SmartBook-R2-one-click-json-generation-default-ports-hotfix-report-20260623.md
```

Report must include:

```text
1. status: success / failure / blocker / permission-halt
2. branch and HEAD
3. whether source routes exist
4. whether book_json_artifacts table exists
5. stopped default-port PIDs and cwd confirmation
6. restarted PIDs for 4300 and 5174
7. curl results on 4300
8. curl results through 5174 proxy
9. browser manual result
10. generated JSON actual storage path
11. whether storage path was fixed
12. git status --short
13. confirmation no .env/db/log/.claude/generated-json committed
```

---

## 10. Commit and Push

If only documentation/report changes:

```text
docs(r2): add one-click JSON default-port hotfix report
```

If source hotfix is needed for storage path or route issue:

```text
fix(r2): stabilize one-click JSON generation on default ports
```

Push:

```text
origin feat/r2-book-upload-one-click-json-generation
```

---

## 11. Success Criteria

```text
1. Default Admin API 4300 exposes json-artifacts endpoints.
2. Default Admin frontend 5174 can call those endpoints through proxy.
3. /admin/books/:bookId/json-artifacts no longer shows 404.
4. 一鍵產生 4 種 JSON works from the real default UI.
5. Generated JSON files are stored in the intended ignored runtime folder.
6. No .env/db/log/.claude/generated-json committed.
```
