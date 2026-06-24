# AI-SmartBook-R2 Admin Module Architecture Inventory — 結案報告

日期：2026-06-23

---

## 結案狀態

**success**

---

## 分支資訊

| 項目 | 值 |
|------|-----|
| 分支 | `feat/r2-integrate-imports-notes` |
| Commit SHA | `3c9a0171` |
| Push 結果 | 成功推送至 `b827262-cell/AI-SmartBook-R1` |

---

## 任務說明

本輪為純文件任務，不修改任何 source code。

目標：盤點 AI-SmartBook-R2 所有計畫中的 Admin 模組，逐一記錄現有路由、頁面元件、API 端點、DB 資料表、實作狀態，以及建議下一步與風險等級，產出架構盤點文件供後續開發規劃使用。

---

## 盤點方法

讀取以下四個檔案作為盤點依據，未執行任何建置或 server 啟動：

| 檔案 | 用途 |
|------|------|
| `apps/AI-adm-D1/src/App.tsx` | 所有前端路由定義 |
| `apps/AI-adm-D1/src/server/index.ts` | 所有 API 端點（Express routes） |
| `packages/db/src/schema.ts` | Drizzle ORM 資料表定義 |
| `packages/db/src/migrate.ts` | SQLite CREATE TABLE 清單 |

---

## 完成盤點模組數（共 17 個）

| 狀態 | 數量 | 模組 |
|------|------|------|
| **done**（完整實作） | 8 | 首頁、帳戶管理、介面設定、書本列表、新增書本、章節/TOC管理、題庫JSON匯入、智慧題解JSON匯入 |
| **partial**（部分完成） | 5 | AI筆記管理、匯入紀錄/Job History、AI助教答記錄、學生內容總覽、（章節管理已有但筆記管理admin端缺失） |
| **missing**（尚未開始） | 4 | 題庫中心（PDF辨識）、AI助教科管理、AI助教本綁定、AI課堂端點管理、建議問快取管理 |

> 注意：「建議問快取管理」計入 missing 群組，AI 助教管理群組實際列出 6 項，故模組總數為 17。

---

## 現有 DB 資料表（14 個）

| 資料表 | 功能 |
|--------|------|
| `books` | 書本列表 |
| `book_files` | PDF 上傳與儲存 |
| `book_contents` | PDF 解析文字內容 |
| `book_chapters` | 章節 / TOC 資料 |
| `chat_sessions` | 學生對話 session |
| `chat_messages` | AI 助教對話記錄 |
| `pdf_access_logs` | PDF 瀏覽記錄 |
| `book_ai_jobs` | AI 任務佇列 |
| `book_qa_logs` | AI 問答記錄 |
| `app_settings` | 外觀與全域設定 |
| `smart_book_notes` | 學生筆記（含頁碼/章節 metadata）|
| `question_bank_import_jobs` | 題庫匯入 staging |
| `smart_solve_import_jobs` | 智慧題解匯入 staging（job 層）|
| `smart_solve_import_items` | 智慧題解匯入 staging（item 層）|

---

## 缺少的 Route（8 個）

```
/admin/notes-help             — 僅說明頁，無 admin 筆記 CRUD
/admin/question-bank-center   — 未註冊
/admin/ai-subject             — 未註冊
/admin/ai-book-binding        — 未註冊
/admin/ai-classroom           — 未註冊
/admin/suggest-cache          — 未註冊
/admin/student-overview       — 未註冊（dashboard 有部分資料）
/admin/import/history         — 未註冊（各模組頁有 inline 記錄）
```

---

## 缺少的 API Endpoint（10 個）

```
GET    /api/admin/books/:bookId/notes              — admin 筆記列表（按書本）
DELETE /api/admin/books/:bookId/notes/:noteId      — admin 筆記刪除
GET    /api/admin/qa-logs                          — 跨書籍 QA 記錄彙整
GET    /api/admin/student-overview                 — 學生對話/筆記總覽
GET    /api/admin/subjects                         — AI 助教科目管理
POST   /api/admin/subjects                         — 新增科目
GET    /api/admin/book-access-rules                — 書本權限綁定設定
GET    /api/student/books/:bookId/smart-solve      — 智慧題解學生查詢（staging → 生產）
GET    /api/student/books/:bookId/question-bank    — 題庫學生查詢（staging → 生產）
POST   /api/admin/import/question-bank-pdf         — PDF OCR 題庫匯入（尚未開始）
```

---

## 缺少的 DB Table（5 個）

| Table | 用途 | 風險 |
|-------|------|------|
| `question_bank_items` | 正式題庫（從 staging 升格） | 中 |
| `subjects` | AI 助教科目分類 | 中 |
| `book_access_rules` | 書本權限綁定 | 中 |
| `classroom_configs` | 課堂 AI 端點設定 | 高（需求未確定）|
| `suggestion_cache` | 學生建議問快取 | 高（依賴尚未實作的學生功能）|

---

## 建議實作順序

| 優先序 | 模組 | 理由 | 風險 | 建議分支 |
|--------|------|------|------|---------|
| 1 | AI 筆記管理（admin CRUD） | 1 API + 1 頁面，無需新資料表，低風險 | 低 | `feat/r2-admin-notes-management` |
| 2 | 學生內容總覽 | 使用現有資料表，無需 migration | 低 | `feat/r2-admin-student-overview` |
| 3 | AI助教答記錄（全局視圖） | 使用 `book_qa_logs`，無需 migration | 低 | `feat/r2-admin-global-qa-logs` |
| 4 | 匯入紀錄 / Job History | 合併現有 job 資料表視圖 | 低 | `feat/r2-admin-import-history` |
| 5 | 題庫 JSON → 生產資料表 | 設計 `question_bank_items` + 升格流程 | 中 | `feat/r2-question-bank-items-table` |
| 6 | 智慧題解 → 學生 API | 開放 staging 資料給學生端查詢 | 中 | `feat/r2-smart-solve-student-api` |
| 7 | AI助教科管理 | 需新增 `subjects` 資料表 | 中 | `feat/r2-ai-subject-management` |
| 8 | AI助教本綁定 | 依賴科目設計，需 `book_access_rules` | 中 | `feat/r2-ai-book-binding` |
| 9 | 題庫中心（PDF辨識） | 高複雜度，需 AI/OCR 整合，獨立 spike | 高 | `feat/r2-question-bank-pdf-ocr` |
| 10 | AI課堂端點管理 | 需先確認產品需求規格 | 高 | `feat/r2-ai-classroom-endpoints` |
| 11 | 建議問快取管理 | 依賴尚未實作的學生建議問功能 | 高 | `feat/r2-suggestion-cache` |

---

## 新增文件

| 檔案 | 說明 |
|------|------|
| `docs/r2/AI-SmartBook-R2-admin-module-architecture-inventory-20260623.md` | 完整模組架構盤點（17 模組，含路由/API/DB/狀態/建議）|

---

## git status --short

```
（clean — 所有變更已提交）
```

---

## 安全性確認

| 項目 | 狀態 |
|------|------|
| `.env` 已提交 | **否（正確）** |
| SQLite `.db` 已提交 | **否（正確）** |
| logs、uploads、backups 已提交 | **否（正確）** |
| `.claude/` 本地狀態已提交 | **否（正確）** |
| Source code 已修改 | **否（正確，純文件任務）** |

---

## 後續待辦

依照建議實作順序，建議優先開始：

1. `feat/r2-admin-notes-management` — 最低風險，最快補全 partial 模組
2. `feat/r2-admin-student-overview` — 使用現有資料，無 schema 變更

---

建議現在輸入 `/compact`，壓縮本輪上下文後再開始下一輪任務。
