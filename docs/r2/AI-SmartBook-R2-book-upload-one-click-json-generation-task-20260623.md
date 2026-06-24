# AI-SmartBook-R2 Task — Book Upload One-Click JSON Generation and Auto Setup

Date: 2026-06-23

## 1. Purpose

新增書籍後，後台應提供一鍵流程，自動產生 4 種 JSON，並同步設定好後續匯入與管理入口，減少人工操作。

Current problem:

```text
使用者會把 page-index.json / sentence-index.json 手動上傳到 Question Bank 或 Smart Solve 匯入頁。
但這些檔案是 PDF 解析索引，不是題庫或題解匯入格式，因此會出現 schema validation failed。
```

Desired behavior:

```text
新增書籍或進入書籍詳情後，按一次「產生 4 種 JSON」，系統自動產生：
1. page-index.json
2. sentence-index.json
3. question-bank-candidates.json
4. smart-solve-candidates.json

並在後台顯示狀態、下載入口、前往匯入/審核入口。
```

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

Base branch:

```text
feat/r2-integrate-imports-notes
```

Create feature branch:

```text
feat/r2-book-upload-one-click-json-generation
```

---

## 4. Product Requirements

### 4.1 Admin UI

Add a section on book detail or book processing page:

```text
解析產物 / JSON 產生
```

Add button:

```text
一鍵產生 4 種 JSON
```

After generation, show a table:

```text
檔案類型 | 狀態 | 筆數 | 產生時間 | 下載 | 下一步
```

Types:

```text
page-index
sentence-index
question-bank-candidates
smart-solve-candidates
```

Actions:

```text
下載 JSON
前往題庫匯入
前往智慧題解匯入
重新產生
```

### 4.2 Generated JSON Types

#### 4.2.1 page-index.json

Purpose:

```text
Reader page positioning / PDF text search / source text by page.
```

Shape:

```json
[
  {
    "bookId": "book_xxx",
    "pageNumber": 1,
    "pdfPage": 1,
    "text": "page text..."
  }
]
```

#### 4.2.2 sentence-index.json

Purpose:

```text
AI chat / RAG / sentence-level retrieval.
```

Shape:

```json
[
  {
    "id": "sent-001",
    "bookId": "book_xxx",
    "pageNumber": 1,
    "chapterTitle": "第一章",
    "text": "sentence text..."
  }
]
```

#### 4.2.3 question-bank-candidates.json

Purpose:

```text
Question Bank Import staging source.
```

Shape:

```json
{
  "source": "book_parse",
  "bookId": "book_xxx",
  "questions": [
    {
      "question_number": 1,
      "question": "題目文字",
      "options": ["A", "B", "C", "D"],
      "answer": "A",
      "explanation": "解析說明",
      "sourcePage": 12,
      "sourceText": "原始文字片段",
      "confidence": 0.5,
      "status": "candidate"
    }
  ]
}
```

First version may generate an empty candidates list with metadata if no rule-based question extraction is available:

```json
{
  "source": "book_parse",
  "bookId": "book_xxx",
  "questions": [],
  "notice": "No rule-based questions detected. Use PDF Screenshot Ask AI or OCR pipeline to generate questions."
}
```

#### 4.2.4 smart-solve-candidates.json

Purpose:

```text
Smart Solve Import staging source.
```

Shape:

```json
{
  "source": "book_parse",
  "bookId": "book_xxx",
  "items": [
    {
      "externalId": "ss-001",
      "prompt": "請解釋某概念。",
      "solution": "說明內容。",
      "explanation": "詳細解析。",
      "scope": {
        "chapterTitle": "第一章",
        "pageStart": 12
      },
      "tags": ["auto", "candidate"],
      "confidence": 0.5,
      "status": "candidate"
    }
  ]
}
```

First version may generate safe concept candidates from headings/chapters only, or an empty list with metadata.

---

## 5. Auto Setup Requirements

After generating artifacts, the system should reduce manual steps:

```text
1. Save generated artifact metadata.
2. Show generated file download links in admin UI.
3. On Smart Solve import page, allow selecting a generated smart-solve-candidates file for the selected book.
4. On Question Bank import page, show a shortcut to generated question-bank-candidates for the selected book.
5. Do not require user to manually pick page-index.json for question import.
6. Clearly mark page-index and sentence-index as source/index files, not direct import files.
```

Recommended query links:

```text
/admin/import/question-bank?bookId=<bookId>&artifact=question-bank-candidates
/admin/import/smart-solve?bookId=<bookId>&artifact=smart-solve-candidates
```

If auto-load artifact upload is not safe in first version, at least preselect the book and show download/import instructions.

---

## 6. Storage and DB Rules

Generated JSON files are runtime artifacts.

Rules:

```text
1. Do not commit generated JSON files.
2. Store generated artifacts under an ignored runtime folder.
3. Do not put large JSON into Git.
4. Store metadata in SQLite only if needed.
```

Suggested runtime folder:

```text
data/generated-json/<bookId>/
```

Ensure ignored by Git.

Suggested metadata table if needed:

```text
book_json_artifacts
```

Fields:

```text
id
book_id
artifact_type
file_name
file_path
record_count
status
created_at
updated_at
error_message
```

If a new table is added, use non-destructive migration:

```text
CREATE TABLE IF NOT EXISTS book_json_artifacts (...)
```

---

## 7. Backend API Requirements

Add admin endpoints:

```text
POST /api/admin/books/:bookId/json-artifacts/generate
GET  /api/admin/books/:bookId/json-artifacts
GET  /api/admin/books/:bookId/json-artifacts/:artifactId/download
```

Optional:

```text
DELETE /api/admin/books/:bookId/json-artifacts/:artifactId
```

Response for generate:

```json
{
  "bookId": "book_xxx",
  "artifacts": [
    {
      "type": "page-index",
      "status": "done",
      "recordCount": 100,
      "downloadUrl": "/api/admin/books/book_xxx/json-artifacts/art_1/download"
    }
  ]
}
```

---

## 8. Generation Strategy

Use existing parsed DB data where possible:

```text
book_contents / FileContent equivalent -> page-index
sentence/chunk data if present -> sentence-index
book_chapters -> scopes for smart-solve-candidates
existing text patterns -> question-bank-candidates if safe
```

Important:

```text
Do not fake questions.
If no reliable extraction exists, generate empty candidates with a clear notice.
```

Candidate extraction can be conservative:

```text
1. detect lines containing question number patterns if available
2. detect option-like lines A/B/C/D if available
3. otherwise leave candidates empty
```

---

## 9. Frontend UI Requirements

Update admin book detail page or add a dedicated page:

```text
/admin/books/:bookId/json-artifacts
```

UI sections:

```text
1. Explanation of the 4 JSON types.
2. One-click generate button.
3. Artifact status table.
4. Download buttons.
5. Shortcuts to Question Bank Import / Smart Solve Import.
6. Warning: page-index and sentence-index are not direct question imports.
```

---

## 10. Validation

Run:

```bash
PNPM_HOME=/tmp/pnpm pnpm --filter @ai-smartbook/db typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
```

Runtime test:

```text
1. Open a real book in admin.
2. Click 一鍵產生 4 種 JSON.
3. Verify all 4 artifacts appear.
4. Download each JSON.
5. Verify page-index and sentence-index are marked as source/index.
6. Verify question-bank-candidates has valid { questions: [...] } shape.
7. Verify smart-solve-candidates has valid { items: [...] } shape.
8. Verify import pages can guide user to the correct candidate files.
```

---

## 11. Required Report

Create:

```text
docs/r2/AI-SmartBook-R2-book-upload-one-click-json-generation-report-20260623.md
```

Report must include:

```text
1. status
2. branch
3. changed files
4. API endpoints added
5. DB migration added or not
6. storage path
7. UI behavior
8. sample output shapes
9. validation results
10. known limitations
11. commit SHA
12. push result
13. git status --short
14. confirmation no .env/db/log/.claude/generated-json committed
```

---

## 12. Commit and Push

Commit message:

```text
feat(r2): add one-click book JSON artifact generation
```

Push:

```text
origin feat/r2-book-upload-one-click-json-generation
```

---

## 13. Suggested Agent Assignment

Recommended:

```text
Primary: Claude Sonnet 4.6 Medium/High
Build/typecheck support: Codex-Spark 128K
E500 validation: AGY
```

---

## 14. Success Criteria

```text
1. Admin can generate 4 JSON artifacts with one click.
2. Generated JSON files are stored as runtime artifacts, not committed to Git.
3. Artifact metadata is visible in admin UI.
4. Question-bank-candidates has a valid import-compatible shape.
5. Smart-solve-candidates has a valid import-compatible shape.
6. page-index and sentence-index are clearly marked as source/index files.
7. Build/typecheck passes.
8. No .env/db/log/.claude/generated-json committed.
```
