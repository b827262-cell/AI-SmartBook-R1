# AI-SmartBook-R2 Admin Module Architecture Inventory

Date: 2026-06-23  
Branch: `feat/r2-integrate-imports-notes`  
Base commit: `1cbd6727`

---

## Overview

This document inventories every planned admin module for AI-SmartBook-R2, recording the current implementation status, missing pieces, and recommended next steps. Source code was not modified.

Legend:

| Status | Meaning |
|--------|---------|
| `done` | Route, page, API, and DB layer all exist and are verified |
| `partial` | Some layers exist but others are missing or incomplete |
| `placeholder` | Route/page exists but no working backend or DB layer |
| `missing` | No route, no page, no API |

---

## Group 1 — 管理後台

### 1.1 首頁

| Field | Value |
|-------|-------|
| Route | `/admin` |
| Page/Component | `AdminDashboardPage.tsx` |
| API | `GET /api/admin/dashboard/stats`, `GET /api/admin/student-questions` |
| DB Table | `chat_sessions`, `chat_messages`, `book_qa_logs` (aggregated) |
| Status | **done** |
| Description | Dashboard shows conversation trend chart, question keyword cloud, subject breakdown, and recent student questions. All API endpoints active. |
| Next Step | No action needed. Optionally add active-user count or session heatmap. |
| Risk | Low |
| Suggested Branch | — |

---

### 1.2 帳戶管理

| Field | Value |
|-------|-------|
| Route | `/admin/accounts` |
| Page/Component | `AdminAccountsPage.tsx` |
| API | `GET /api/admin/accounts`, `PATCH /api/admin/accounts/:sessionId/risk`, `PATCH /api/admin/accounts/:sessionId/block` |
| DB Table | `chat_sessions` |
| Status | **done** |
| Description | Lists student sessions with risk flagging and block controls. No user auth table — identity is session-based. |
| Next Step | No action needed unless real user auth (email/password) is added in a future phase. |
| Risk | Low |
| Suggested Branch | — |

---

### 1.3 介面設定

| Field | Value |
|-------|-------|
| Route | `/admin/appearance` |
| Page/Component | `AppearanceSettingsPage.tsx` |
| API | `GET /api/appearance-settings`, `PUT /api/admin/appearance-settings`, `POST /api/admin/appearance-settings/upload` |
| DB Table | `app_settings` |
| Status | **done** |
| Description | Supports logo/favicon upload, color theme, dashboard nav label, and welcome text. |
| Next Step | No action needed. |
| Risk | Low |
| Suggested Branch | — |

---

## Group 2 — 智能書本管理

### 2.1 書本列表

| Field | Value |
|-------|-------|
| Route | `/admin/books` |
| Page/Component | `BooksPage.tsx` |
| API | `GET /api/admin/books`, `POST /api/admin/books` |
| DB Table | `books` |
| Status | **done** |
| Description | Lists all books, supports search and status filter. Links to per-book detail. |
| Next Step | No action needed. |
| Risk | Low |
| Suggested Branch | — |

---

### 2.2 新增書本

| Field | Value |
|-------|-------|
| Route | `/admin/books/new` |
| Page/Component | `NewBookPage.tsx` |
| API | `POST /api/admin/books`, `POST /api/admin/books/:bookId/files` |
| DB Table | `books`, `book_files` |
| Status | **done** |
| Description | Creates a book record and immediately allows PDF upload. |
| Next Step | No action needed. |
| Risk | Low |
| Suggested Branch | — |

---

### 2.3 章節 / TOC 管理

| Field | Value |
|-------|-------|
| Route | `/admin/books/:bookId/chapters` (dedicated), `/admin/books/:bookId/*` (tabbed) |
| Page/Component | `ChaptersPage.tsx`, `BookDetail.tsx` → `ChaptersTab.tsx`, `ContentsTab.tsx`, `FilesTab.tsx` |
| API | `GET/POST /api/admin/books/:bookId/chapters`, `PATCH/DELETE /api/admin/books/:bookId/chapters/:chapterId`, `POST .../chapters/build`, `POST .../reader-toc/import`, `GET/DELETE .../reader-toc`, `POST .../reader-toc/generate-from-json-index`, `POST .../files/:fileId/apply-chapters`, `POST .../ai/split-book`, `POST .../ai/build-chapters`, `POST .../chapters/:chapterId/ai/summarize` |
| DB Table | `book_chapters`, `book_contents`, `book_files`, `book_ai_jobs` |
| Status | **done** |
| Description | Full chapter management including AI-assisted TOC building, outline import from JSON/Markdown, and per-chapter AI summarization. |
| Next Step | No action needed. Bulk chapter edit or drag-and-drop reorder could improve UX. |
| Risk | Low |
| Suggested Branch | — |

---

### 2.4 AI 筆記管理

| Field | Value |
|-------|-------|
| Route | `/admin/notes-help` (help/guide page only) |
| Page/Component | `NotesHelpPage.tsx` |
| API | Student-side: `GET /api/student/books/:bookId/notes`, `GET .../notes/:noteId/navigate` |
| DB Table | `smart_book_notes` |
| Status | **partial** |
| Description | Notes are created and navigated on the student side. There is no admin-side note listing, moderation, or deletion by book. The `/admin/notes-help` page is documentation only. |
| Missing | Admin API for listing notes by book, admin UI for viewing/deleting notes |
| Next Step | Add `GET /api/admin/books/:bookId/notes` and a simple admin notes list page showing note type, page, chapter, and a delete button. |
| Risk | Low |
| Suggested Branch | `feat/r2-admin-notes-management` |

---

## Group 3 — 題庫與題解

### 3.1 題庫中心（PDF辨識）

| Field | Value |
|-------|-------|
| Route | `/admin/question-bank-center` (not registered) |
| Page/Component | None |
| API | None |
| DB Table | None dedicated (would need new table) |
| Status | **missing** |
| Description | Planned feature: upload a PDF exam paper, OCR/AI parse it into structured question items, and feed into question bank staging. Not started. |
| Missing | Everything — route, page, API, DB table, AI integration |
| Next Step | Define schema first (`question_bank_items` or similar). Then build OCR ingestion pipeline. High complexity — do after simpler modules. |
| Risk | High |
| Suggested Branch | `feat/r2-question-bank-pdf-ocr` |

---

### 3.2 題庫 JSON 匯入

| Field | Value |
|-------|-------|
| Route | `/admin/import/question-bank` |
| Page/Component | `QuestionBankImportPage.tsx` |
| API | `POST /api/admin/import/question-bank/jobs`, `GET /api/admin/import/question-bank/jobs`, `GET /api/admin/import/question-bank/jobs/:jobId` |
| DB Table | `question_bank_import_jobs` |
| Status | **done** |
| Description | Upload JSON → validate → create import job record. Sample JSON visible in collapsible help. Staging only — no production question table yet. |
| Limitation | Data stays in staging (`question_bank_import_jobs`). No downstream production table or query API for students. |
| Next Step | Design and implement `question_bank_items` production table + promotion flow from staging. |
| Risk | Medium |
| Suggested Branch | `feat/r2-question-bank-items-table` |

---

### 3.3 智慧題解 JSON 匯入

| Field | Value |
|-------|-------|
| Route | `/admin/import/smart-solve` |
| Page/Component | `SmartSolveImportPage.tsx` |
| API | `POST /api/admin/books/:bookId/imports/smart-solve/jobs`, `GET /api/admin/books/:bookId/imports/smart-solve/jobs`, `GET /api/admin/books/:bookId/imports/smart-solve/jobs/:jobId` |
| DB Table | `smart_solve_import_jobs`, `smart_solve_import_items` |
| Status | **done** |
| Description | Book dropdown (loads from `/api/admin/books`), JSON upload, scope mapping to chapters. Records stored as staging items with `mapped/unmapped/invalid` status. |
| Limitation | Data stays in staging. No student-facing `smart_solve` query API or reader integration yet. |
| Next Step | Implement `GET /api/student/books/:bookId/smart-solve` so students can query solutions by chapter/page. |
| Risk | Medium |
| Suggested Branch | `feat/r2-smart-solve-student-api` |

---

### 3.4 匯入紀錄 / Job History

| Field | Value |
|-------|-------|
| Route | None dedicated |
| Page/Component | None (history is inline in each import page) |
| API | Covered by existing job list endpoints for question-bank and smart-solve |
| DB Table | `question_bank_import_jobs`, `smart_solve_import_jobs` |
| Status | **partial** |
| Description | Per-module job history exists inline in `QuestionBankImportPage` and `SmartSolveImportPage`. No unified cross-module import history view. |
| Missing | Unified `/admin/import/history` page aggregating all import jobs |
| Next Step | Create a combined import history page querying both job tables. Low priority unless needed for audit. |
| Risk | Low |
| Suggested Branch | `feat/r2-admin-import-history` |

---

## Group 4 — AI 助教管理

### 4.1 AI助教科管理

| Field | Value |
|-------|-------|
| Route | `/admin/ai-subject` (not registered) |
| Page/Component | None |
| API | None |
| DB Table | None (no `subjects` or `ai_subjects` table) |
| Status | **missing** |
| Description | Planned: manage subject/course categories that constrain which books and QA the AI tutor operates on. Currently the AI tutor is book-scoped only (`chat_sessions.book_id`), with no subject abstraction. |
| Missing | Route, page, API, DB table (`subjects` or `ai_tutor_subjects`) |
| Next Step | Define subject schema, link to books, then build CRUD admin page. |
| Risk | Medium — requires schema migration |
| Suggested Branch | `feat/r2-ai-subject-management` |

---

### 4.2 AI助教答記錄

| Field | Value |
|-------|-------|
| Route | `/admin/books/:bookId/qa` (per-book view) or via `QaTab.tsx` in `BookDetail` |
| Page/Component | `QaPage.tsx`, `QaTab.tsx` |
| API | `GET /api/admin/books/:bookId/qa-logs`, `POST /api/admin/books/:bookId/qa`, `POST .../qa/import-markdown` |
| DB Table | `book_qa_logs` |
| Status | **partial** |
| Description | QA log viewing and manual QA import exist per-book. No cross-book aggregated QA log admin view. |
| Missing | Global `/admin/ai-qa-logs` view across all books; export functionality |
| Next Step | Add `GET /api/admin/qa-logs` (no bookId filter) + admin page for global QA log listing and export. |
| Risk | Low |
| Suggested Branch | `feat/r2-admin-global-qa-logs` |

---

### 4.3 AI助教本綁定

| Field | Value |
|-------|-------|
| Route | `/admin/ai-book-binding` (not registered) |
| Page/Component | None |
| API | None dedicated |
| DB Table | Currently implicit — `chat_sessions.book_id` is the only binding |
| Status | **missing** |
| Description | Planned: explicit configuration of which books are accessible per subject, class group, or user role. Currently any published book is globally accessible. |
| Missing | Route, page, API, DB table (`book_access_rules` or similar) |
| Next Step | Design access model first (by subject? by user group? by date range?). Then build config table and admin UI. |
| Risk | Medium — depends on access model design decision |
| Suggested Branch | `feat/r2-ai-book-binding` |

---

### 4.4 AI課堂端點管理

| Field | Value |
|-------|-------|
| Route | `/admin/ai-classroom` (not registered) |
| Page/Component | None |
| API | None |
| DB Table | None |
| Status | **missing** |
| Description | Planned: manage classroom-specific AI tutor endpoints (e.g., custom prompts, model selection, response language per class). Currently the AI tutor uses a single global config from `app_settings`. |
| Missing | Route, page, API, DB table |
| Next Step | Clarify scope with product owner before implementing. Consider whether this is an extension of `app_settings` or a separate `classroom_configs` table. |
| Risk | High — scope unclear |
| Suggested Branch | `feat/r2-ai-classroom-endpoints` |

---

### 4.5 建議問快取管理

| Field | Value |
|-------|-------|
| Route | `/admin/suggest-cache` (not registered) |
| Page/Component | None |
| API | None |
| DB Table | None |
| Status | **missing** |
| Description | Planned: manage cached suggested questions shown to students before they type. Currently no suggestion caching system exists in the codebase. |
| Missing | Route, page, API, DB table (`suggestion_cache` or similar) |
| Next Step | First build the student-facing suggestion feature; admin cache management is a follow-on. |
| Risk | High — depends on student feature that does not exist |
| Suggested Branch | `feat/r2-suggestion-cache` |

---

### 4.6 學生內容總覽

| Field | Value |
|-------|-------|
| Route | `/admin/student-overview` (not registered) |
| Page/Component | Partial — `AdminDashboardPage.tsx` shows some student question data |
| API | `GET /api/admin/student-questions`, `GET /api/admin/dashboard/stats` |
| DB Table | `chat_sessions`, `chat_messages`, `book_qa_logs` |
| Status | **partial** |
| Description | Student question data and conversation stats are visible on the dashboard, but there is no dedicated per-student detail view or per-student note/session listing. |
| Missing | Dedicated `/admin/student-overview` page with per-session drill-down; per-student note summary |
| Next Step | Create `AdminStudentOverviewPage.tsx` using existing `chat_sessions` and `book_qa_logs` data. No new DB tables needed. |
| Risk | Low |
| Suggested Branch | `feat/r2-admin-student-overview` |

---

## Summary Table

| Module | Group | Status | Route | API | DB Table |
|--------|-------|--------|-------|-----|---------|
| 首頁 | 管理後台 | **done** | ✅ | ✅ | ✅ |
| 帳戶管理 | 管理後台 | **done** | ✅ | ✅ | ✅ |
| 介面設定 | 管理後台 | **done** | ✅ | ✅ | ✅ |
| 書本列表 | 智能書本管理 | **done** | ✅ | ✅ | ✅ |
| 新增書本 | 智能書本管理 | **done** | ✅ | ✅ | ✅ |
| 章節 / TOC 管理 | 智能書本管理 | **done** | ✅ | ✅ | ✅ |
| AI 筆記管理 | 智能書本管理 | **partial** | ⚠️ help only | ⚠️ student side | ✅ reused |
| 題庫中心（PDF辨識） | 題庫與題解 | **missing** | ❌ | ❌ | ❌ |
| 題庫 JSON 匯入 | 題庫與題解 | **done** | ✅ | ✅ | ✅ staging |
| 智慧題解 JSON 匯入 | 題庫與題解 | **done** | ✅ | ✅ | ✅ staging |
| 匯入紀錄 / Job History | 題庫與題解 | **partial** | ❌ unified | ⚠️ inline only | ✅ |
| AI助教科管理 | AI 助教管理 | **missing** | ❌ | ❌ | ❌ |
| AI助教答記錄 | AI 助教管理 | **partial** | ⚠️ per-book | ⚠️ per-book | ✅ |
| AI助教本綁定 | AI 助教管理 | **missing** | ❌ | ❌ | ❌ |
| AI課堂端點管理 | AI 助教管理 | **missing** | ❌ | ❌ | ❌ |
| 建議問快取管理 | AI 助教管理 | **missing** | ❌ | ❌ | ❌ |
| 學生內容總覽 | AI 助教管理 | **partial** | ❌ dedicated | ⚠️ dashboard | ✅ reused |

**Totals**: done: 8 / partial: 5 / missing: 4  
(Total modules: 17)

---

## Missing Routes

```
/admin/notes-help           — help page only, no admin CRUD
/admin/question-bank-center — not registered
/admin/ai-subject           — not registered
/admin/ai-book-binding      — not registered
/admin/ai-classroom         — not registered
/admin/suggest-cache        — not registered
/admin/student-overview     — not registered (partial coverage on dashboard)
/admin/import/history       — not registered (inline per-module only)
```

---

## Missing API Endpoints

```
GET  /api/admin/books/:bookId/notes          — admin note list per book
DELETE /api/admin/books/:bookId/notes/:noteId — admin note delete
GET  /api/admin/qa-logs                       — cross-book QA log aggregate
GET  /api/admin/student-overview              — per-student session/note summary
GET  /api/admin/subjects                      — AI tutor subject management
POST /api/admin/subjects
GET  /api/admin/book-access-rules             — book binding / access control
GET  /api/student/books/:bookId/smart-solve   — student smart-solve query (staging → production)
GET  /api/student/books/:bookId/question-bank — student question bank query (staging → production)
POST /api/admin/import/question-bank-pdf      — PDF OCR ingestion (not started)
```

---

## Missing DB Tables

| Table | Purpose | Risk |
|-------|---------|------|
| `question_bank_items` | Production question bank (promoted from staging) | Medium |
| `subjects` | AI tutor subject / course categories | Medium |
| `book_access_rules` | Per-book binding to subjects or user groups | Medium |
| `classroom_configs` | Classroom-specific AI tutor settings | High |
| `suggestion_cache` | Cached suggested questions per book/chapter | High |

---

## Recommended Implementation Order

| Priority | Module | Reason | Branch |
|----------|--------|--------|--------|
| 1 | AI 筆記管理（admin CRUD） | Admin notes list needs 1 API + 1 page, no new table, low risk | `feat/r2-admin-notes-management` |
| 2 | 學生內容總覽 | Uses existing tables, no migration, completes partial module | `feat/r2-admin-student-overview` |
| 3 | AI助教答記錄（global view） | Uses `book_qa_logs`, no migration, global cross-book view | `feat/r2-admin-global-qa-logs` |
| 4 | 匯入紀錄 / Job History | Unified view using existing job tables, no migration | `feat/r2-admin-import-history` |
| 5 | 題庫 JSON → 生產資料表 | Design `question_bank_items` + promotion flow | `feat/r2-question-bank-items-table` |
| 6 | 智慧題解 → 學生 API | Expose staged smart-solve items via student endpoint | `feat/r2-smart-solve-student-api` |
| 7 | AI助教科管理 | New `subjects` table, medium complexity | `feat/r2-ai-subject-management` |
| 8 | AI助教本綁定 | Depends on subjects design, medium complexity | `feat/r2-ai-book-binding` |
| 9 | 題庫中心（PDF辨識） | High complexity, AI integration, separate spike | `feat/r2-question-bank-pdf-ocr` |
| 10 | AI課堂端點管理 | Requires product spec before coding | `feat/r2-ai-classroom-endpoints` |
| 11 | 建議問快取管理 | Depends on student suggestion feature (not started) | `feat/r2-suggestion-cache` |

---

## Existing DB Tables Reference

| Table | Used By |
|-------|---------|
| `books` | Book list / management |
| `book_files` | PDF upload and storage |
| `book_contents` | Parsed PDF text content |
| `book_chapters` | Chapter / TOC data |
| `chat_sessions` | Student sessions (accounts) |
| `chat_messages` | AI tutor conversation history |
| `pdf_access_logs` | PDF view tracking |
| `book_ai_jobs` | AI job queue (split-book, build-chapters) |
| `book_qa_logs` | AI tutor Q&A records |
| `app_settings` | Appearance and global config |
| `smart_book_notes` | Student notes with page/chapter metadata |
| `question_bank_import_jobs` | Question bank import staging |
| `smart_solve_import_jobs` | Smart Solve import staging (job level) |
| `smart_solve_import_items` | Smart Solve import staging (item level) |

Total: **14 tables**

---

## Notes

- Source code was **not modified** in this task. This is a documentation-only inventory.
- All route/API/table data was derived from reading `App.tsx`, `server/index.ts`, `schema.ts`, and `migrate.ts` on branch `feat/r2-integrate-imports-notes` at commit `1cbd6727`.
- `adminNav.ts` already marks unimplemented items as `enabled: false` — enabling a module requires both `enabled: true` in `adminNav.ts` and the corresponding page/API implementation.
