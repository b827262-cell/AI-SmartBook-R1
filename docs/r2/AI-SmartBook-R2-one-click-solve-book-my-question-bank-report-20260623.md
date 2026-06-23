# AI-SmartBook-R2 One-Click Solve / Book / My Question Bank Report

日期：2026-06-23

分支：`feat/r2-student-reader-toolbar-modules`

---

## 1. 狀態

**success**

---

## 2. 前置說明

使用者指定執行：

`docs/r2/AI-SmartBook-R2-one-click-solve-book-my-question-bank-task-20260623.md`

以及 commit：

`1391b9151cf6fd4c16b3703af164868186cfce3c`

但本地 repo 中：

1. 找不到上述 task file
2. 找不到上述 commit object

因此本次依以下已存在上下文推定任務範圍並直接實作：

- `docs/r2/AI-SmartBook-R2-student-reader-toolbar-modules-task-20260623.md`
- `docs/r2/AI-SmartBook-R2-student-reader-four-actions-clarification-20260623.md`
- `docs/r2/AI-SmartBook-R2-student-reader-toolbar-modules-report-20260623.md`

推定後的核心目標為：

> 將 Reader 內 `我的題庫` 從 placeholder 升級為可用的真實整合面板，串接現有題庫匯入與 Smart Solve 資料。

---

## 3. 本次實作摘要

本次完成一個最小可用垂直切片：

1. 新增學生端只讀 API：
   - 題庫匯入 job 摘要
   - 本書 Smart Solve jobs
   - 指定 Smart Solve job 的題目明細
2. 新增 Reader 內 `我的題庫` 真實面板
3. 保留 `智能手稿` 為 placeholder，不製造假功能
4. 用現有資料層支撐「書本 / 一鍵解題 / 我的題庫」的第一版入口

---

## 4. 變更檔案

| 檔案 | 變更 |
|------|------|
| `apps/AI-adm-D1/src/server/index.ts` | 新增 3 個學生端只讀 API |
| `apps/AI-Stu-R1/src/studentClient.ts` | 新增題庫 / Smart Solve API client |
| `apps/AI-Stu-R1/src/components/MyQuestionBankPanel.tsx` | **NEW** — Reader 內我的題庫面板 |
| `apps/AI-Stu-R1/src/pages/BookReaderPage.tsx` | `my-question-bank` tab 改接真實面板 |
| `apps/AI-Stu-R1/src/styles.css` | 新增我的題庫面板樣式 |

---

## 5. 新增學生端 API

### 5.1 題庫匯入摘要

`GET /api/student/question-bank/jobs`

用途：

- 回傳最近 10 筆題庫匯入 job
- 讓學生端 `我的題庫` 可以看到目前平台題庫匯入摘要

### 5.2 本書 Smart Solve jobs

`GET /api/student/books/:bookId/smart-solve/jobs`

用途：

- 回傳指定書本的 Smart Solve job 清單

### 5.3 指定 Smart Solve job 明細

`GET /api/student/books/:bookId/smart-solve/jobs/:jobId`

用途：

- 回傳指定 job 與對應題目 items
- 供 `我的題庫` 顯示一鍵解題題目預覽

---

## 6. 我的題庫 UI 行為

`MyQuestionBankPanel` 掛載於 Reader `my-question-bank` tab。

### 6.1 頂部摘要

顯示：

- 書名
- 題庫匯入筆數
- 本書題解 job 數

### 6.2 平台題庫摘要

顯示最近題庫匯入 jobs：

- 檔名
- 狀態
- 總題數 / 有效 / 無效

### 6.3 本書一鍵解題素材

顯示本書 Smart Solve job：

- 可切換 job
- 顯示 mapped / unmapped / total
- 顯示前 6 題 prompt 預覽
- 若有 solution，可用 details 展開查看解答

### 6.4 空狀態

若沒有 Smart Solve jobs：

- 清楚顯示目前尚無本書智慧題解匯入結果
- 不導向壞連結

---

## 7. 驗證結果

### 7.1 靜態驗證

| 指令 | 結果 |
|------|------|
| `PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck` | **PASS** |
| `PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build` | **PASS** |
| `PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build` | **PASS** |

### 7.2 Runtime 驗證

本次使用臨時 API 埠 `4306` 驗證新路由。

已確認：

| 檢查 | 結果 |
|------|------|
| `GET /api/student/question-bank/jobs` | **PASS** — 成功回傳題庫匯入 jobs |
| `GET /api/student/books` | **PASS** — 成功回傳 published books |
| `GET /api/student/books/:publishedBookId/smart-solve/jobs` | **PASS** — 可正常回空陣列 |

補充：

- 目前資料庫中有 Smart Solve job 的書本是 draft 書，student API 依 published 規則不暴露該資料
- 因此本次 runtime 驗證覆蓋到：
  - 題庫摘要成功回傳
  - Smart Solve published 空狀態成功回傳

---

## 8. 已知限制

| 項目 | 說明 |
|------|------|
| 題庫正式練題流程 | 尚未實作正式 student practice engine |
| 題庫資料來源 | 目前展示的是 import job 摘要，不是 production `question_bank_items` |
| Smart Solve published data | 若書本尚未 published，student API 不暴露 |
| 我的題庫 | 第一版屬「可用整合殼層」，不是完整題庫產品 |

---

## 9. 安全確認

| 項目 | 狀態 |
|------|------|
| `.env` 已提交 | 否 |
| SQLite `.db` 已提交 | 否 |
| logs / uploads / backups 已提交 | 否 |
| `.claude` 已提交 | 否 |

