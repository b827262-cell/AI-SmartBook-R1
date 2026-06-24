# AI-SmartBook-R2 Task — JSON Import Format Detection and Converter UX

Date: 2026-06-23

## 1. Purpose

Manual testing showed that users can select existing book index JSON files such as:

```text
*-page-index.json
*-sentence-index.json
```

on the following pages:

```text
/admin/import/question-bank
/admin/import/smart-solve
```

but these files are not valid Question Bank or Smart Solve import files, so the UI reports raw schema validation errors.

Observed errors:

```text
Smart Solve JSON Import:
資料讀取失敗
file schema validation failed

Question Bank JSON Import:
資料讀取失敗
invalid question bank JSON: expected array, received object
```

This task improves the import UX so the app can detect wrong JSON families and explain the correct format.

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

Create branch:

```text
feat/r2-json-import-format-detection
```

---

## 4. Current Expected Formats

### 4.1 Question Bank JSON Import

Current supported formats:

```json
[
  {
    "question_number": 1,
    "question": "下列何者為會計恆等式？",
    "options": ["資產=負債+權益", "資產=收入+費用"],
    "answer": "資產=負債+權益"
  }
]
```

or:

```json
{
  "questions": [
    {
      "question_number": 1,
      "question": "題目文字",
      "options": ["A", "B", "C", "D"],
      "answer": "A"
    }
  ]
}
```

### 4.2 Smart Solve JSON Import

Current supported formats:

```json
{
  "items": [
    {
      "externalId": "ss-001",
      "prompt": "Explain debit and credit.",
      "solution": "Debit and credit are the two sides of accounting entries.",
      "scope": {
        "chapterTitle": "第一章"
      },
      "tags": ["accounting", "basic"]
    }
  ]
}
```

or an array of equivalent items.

### 4.3 Not Supported as Direct Import

These are not direct Question Bank / Smart Solve imports:

```text
page-index.json
sentence-index.json
reader-toc.json
PDF text extraction index JSON
book outline JSON
```

They are source/index files. They may be used later to help create question or solution data, but they cannot be imported directly as question bank or smart solve items.

---

## 5. Required Fixes

### 5.1 Add JSON Family Detection

Create a frontend utility, for example:

```text
apps/AI-adm-D1/src/utils/jsonImportFormat.ts
```

It should classify JSON into these families:

```text
question_bank
smart_solve
page_index
sentence_index
reader_toc
unknown_object
unknown_array
invalid_json
```

Detection examples:

```text
question_bank:
- root is array and items contain question / answer / options
- or root.questions is array

smart_solve:
- root is array and items contain prompt / solution
- or root.items is array and items contain prompt / solution

page_index:
- filename contains page-index
- or JSON contains page/pageNumber/pdfPage/text style page records

sentence_index:
- filename contains sentence-index
- or JSON contains sentence/chunk/text/pageNumber style records

reader_toc:
- JSON contains outline / toc / chapters style entries
```

### 5.2 Friendly Error Messages

Replace raw schema errors with user-facing messages.

For Question Bank page when user uploads page-index/sentence-index:

```text
你上傳的是 PDF 索引檔，不是題庫 JSON。
題庫匯入需要 question / options / answer 欄位。
請改用「查看範例 JSON」格式，或先透過 AI / OCR 將 PDF 內容轉成題庫 JSON。
```

For Smart Solve page when user uploads page-index/sentence-index:

```text
你上傳的是 PDF 索引檔，不是智慧題解 JSON。
智慧題解匯入需要 prompt / solution / scope 欄位。
請改用「查看範例 JSON」格式，或先把索引內容整理成 Smart Solve items。
```

For unknown JSON:

```text
此 JSON 無法辨識為目前支援的匯入格式。請確認根層為陣列，或包含 questions / items 欄位。
```

### 5.3 Add Downloadable Sample JSON

Add buttons on both pages:

```text
下載題庫範例 JSON
下載智慧題解範例 JSON
```

The downloaded files should be valid and immediately importable.

Suggested filenames:

```text
question-bank-sample.json
smart-solve-sample.json
```

### 5.4 Add Format Preview Before Upload

After a file is selected, before the user clicks import, show:

```text
偵測格式：PDF page index / 題庫 JSON / Smart Solve JSON / 無法辨識
```

If wrong format is detected:

```text
Disable import button or require explicit confirmation.
```

Recommended:

```text
Disable import button for page_index / sentence_index / reader_toc on these import pages.
```

### 5.5 Backend Error Normalization

If frontend detection misses a case, backend should still return normalized errors.

Server response should include:

```json
{
  "error": "INVALID_IMPORT_FORMAT",
  "message": "你上傳的是 PDF 索引檔，不是題庫 JSON。",
  "detectedFormat": "page_index"
}
```

Do not expose raw Zod messages as the main user-facing message.

Raw validation details can remain in a debug field if useful.

---

## 6. Optional Converter, Not Auto Import

Do not automatically convert page-index/sentence-index into questions.

If safe, add a helper panel:

```text
這類檔案可作為 AI 生成題庫的來源。請使用「截圖問 AI」或後續「題庫中心 PDF 辨識」功能產生 question/options/answer JSON。
```

Optional future branch:

```text
feat/r2-question-bank-json-converter
```

Not in this task:

```text
1. AI generation from page-index.
2. OCR pipeline.
3. Writing formal question_bank_items table.
4. Automatic conversion into production question bank.
```

---

## 7. Suggested Files

Inspect and update:

```text
apps/AI-adm-D1/src/pages/QuestionBankImportPage.tsx
apps/AI-adm-D1/src/pages/SmartSolveImportPage.tsx
apps/AI-adm-D1/src/api.ts
apps/AI-adm-D1/src/server/index.ts
```

Potential new files:

```text
apps/AI-adm-D1/src/utils/jsonImportFormat.ts
apps/AI-adm-D1/src/utils/downloadJson.ts
```

If schema package is better:

```text
packages/schema/src/importFormat.schema.ts
```

Keep implementation small.

---

## 8. Validation

Run:

```bash
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
```

Manual tests:

```text
1. Upload valid question-bank-sample.json to /admin/import/question-bank -> PASS.
2. Upload page-index.json to /admin/import/question-bank -> friendly wrong-format message, no raw Zod wall.
3. Upload valid smart-solve-sample.json to /admin/import/smart-solve -> PASS.
4. Upload page-index.json to /admin/import/smart-solve -> friendly wrong-format message.
5. Upload malformed JSON -> friendly invalid JSON message.
6. History table still loads.
7. Existing 404 fixes remain intact.
```

---

## 9. Required Report

Create:

```text
docs/r2/AI-SmartBook-R2-json-import-format-detection-report-20260623.md
```

Report must include:

```text
1. status
2. branch
3. changed files
4. detected JSON families
5. UI changes on Question Bank page
6. UI changes on Smart Solve page
7. backend error normalization, if implemented
8. sample JSON download behavior
9. validation results
10. known limitations
11. commit SHA
12. push result
13. git status --short
14. confirmation no .env/db/log/.claude committed
```

---

## 10. Commit and Push

Commit message:

```text
fix(r2): add JSON import format detection and friendly validation
```

Push:

```text
origin feat/r2-json-import-format-detection
```

---

## 11. Suggested Agent Assignment

Recommended:

```text
Primary: Codex-Spark 128K
Review / UX wording: GPT-5.4 Medium
E500 manual acceptance: AGY
```

---

## 12. Success Criteria

```text
1. Users no longer see raw schema validation walls for page-index/sentence-index.
2. Wrong file family is detected before import.
3. Valid sample question bank JSON imports successfully.
4. Valid sample smart solve JSON imports successfully.
5. page-index JSON is clearly explained as source/index data, not a question bank.
6. Build/typecheck passes.
7. No .env/db/log/.claude committed.
```
