# AI-SmartBook-R2 Four-Agent Formal Dispatch

日期：2026-06-23

分支：`feat/r2-integrate-imports-notes`  
追蹤 Commit SHA：`32fd11eeadce3d00120ebd07fd6fc88d96f324e1`

---

## 1. 文件目的

本文件用於正式分派 AI-SmartBook-R2 下一輪多 Agent 工作，其中 **Agent B** 負責：

> 前台六大模組盤點與移植策略：智能書本、影音、題庫、筆記、手稿、我的題庫

本任務是**盤點 + 遷移規劃任務**，不是直接把六大模組一次實作進 R2。  
目標是建立一份可供後續 Agent 直接開工的前台模組清單、來源對照、依賴拆解、風險分級與移植順序。

---

## 2. Agent B 任務摘要

### 2.1 Agent

`GPT-5.4 Medium / High`

### 2.2 任務名稱

`R2 Frontend Six-Module Inventory And Migration Strategy`

### 2.3 工作目錄

`/home/b827262/project/AI-SmartBook-R2`

### 2.4 基礎分支

`feat/r2-integrate-imports-notes`

### 2.5 任務類型

純盤點 / 文件 / 規劃任務。  
除非為了補充盤點證據而必須小幅新增說明文件，否則**不應修改前台功能程式碼**。

---

## 3. 背景現況

R2 目前前台學生端已落地的頁面只有：

| 路由 | 檔案 | 狀態 |
|------|------|------|
| `/books` | `apps/AI-Stu-R1/src/pages/BooksPage.tsx` | 已有 |
| `/books/:bookId` | `apps/AI-Stu-R1/src/pages/BookReaderPage.tsx` | 已有 |

也就是說，R2 目前已實裝的前台主體仍然集中在：

1. 書本列表
2. 書本閱讀器
3. 書本內 AI / 筆記 / TOC 等子能力

相對地，舊前台 reference 中仍存在大量尚未納入 R2 的學生功能模組，尤其是本次要盤點的六大模組：

1. 智能書本
2. 影音
3. 題庫
4. 筆記
5. 手稿
6. 我的題庫

---

## 4. Agent B 核心目標

Agent B 必須完成以下成果：

1. 盤點舊前台六大模組在 `legacy/old-frontend-ux-reference` 中的主要頁面 / feature / 共用元件來源。
2. 盤點每個模組在 R2 現況中：
   - 已存在什麼
   - 缺少什麼
   - 是否可直接沿用既有 R2 schema / API / state model
3. 針對每個模組提出：
   - 最小可移植切片（small vertical slice）
   - 前置依賴
   - 技術風險
   - 建議拆分分支
4. 輸出一份正式報告，讓後續 Agent 可以依模組逐個開分支移植。

---

## 5. 六大模組盤點範圍

### 5.1 智能書本

**舊前台主要來源**

| 類型 | 路徑 |
|------|------|
| 主頁入口 | `legacy/old-frontend-ux-reference/client-src/pages/SmartBooks.tsx` |
| 主要功能 | `legacy/old-frontend-ux-reference/client-src/features/smartbook/SmartBooksRoute.tsx` |
| viewer 包裝 | `legacy/old-frontend-ux-reference/client-src/features/smartbook/SmartBookViewer.tsx` |
| 相關組件 | `legacy/old-frontend-ux-reference/client-src/features/smartbook/*` |

**R2 現況**

| 項目 | 狀態 |
|------|------|
| 書本列表 | 已有 |
| 書本閱讀器 | 已有 |
| AI 筆記 | 已有 MVP |
| 智能書本其他複合頁籤能力 | 多數未搬 |

**盤點重點**

- 舊版 SmartBooksRoute 是否其實已被 R2 `BooksPage + BookReaderPage` 吸收大部分骨架
- 哪些能力是閱讀器內子模組而非獨立模組
- 哪些 UI/流程不應整包搬移，應拆成 reader 子功能

### 5.2 影音

**舊前台主要來源**

| 類型 | 路徑 |
|------|------|
| 主頁 | `legacy/old-frontend-ux-reference/client-src/pages/VideoCourse.tsx` |
| 內嵌版 | `legacy/old-frontend-ux-reference/client-src/pages/VideoCourse.tsx` 中 `VideoCourseEmbedded` |
| 與 tutor chat 串接 | `legacy/old-frontend-ux-reference/client-src/features/tutor-chat/TutorChatRoute.tsx` |

**R2 現況**

| 項目 | 狀態 |
|------|------|
| 影音前台 route | 無 |
| 影音資料模型 | 未見 R2 專用 schema / API |
| 與學生端 header / portal 串接 | 無 |

**盤點重點**

- 影音是否必須先有 admin module / 資料表 / 字幕 API 才可搬
- 哪些依賴來自舊系統 tRPC / 影音後端，R2 尚未具備
- 是否應先做只讀播放殼層，再補 AI 問答 / 字幕跳轉

### 5.3 題庫

**舊前台主要來源**

| 類型 | 路徑 |
|------|------|
| 學生練習主頁 | `legacy/old-frontend-ux-reference/client-src/pages/AiQuestionPractice.tsx` |
| 題庫列表頁 | `legacy/old-frontend-ux-reference/client-src/pages/QuestionBankList.tsx` |
| 智能書本內題庫區塊 | `legacy/old-frontend-ux-reference/client-src/features/smartbook/SmartBooksRoute.tsx` |

**R2 現況**

| 項目 | 狀態 |
|------|------|
| 題庫 JSON 匯入 staging | 已有 admin 端 |
| 學生前台題庫 route | 無 |
| 正式題庫資料表 | 尚未完成 |
| 題目作答 / 成績 / 解析 | 無 |

**盤點重點**

- 題庫學生前台不能直接搬，因為正式資料層尚未完成
- 必須分清楚「staging 匯入」與「學生可練習題庫」的差異
- 哪些 UI 可以預先移植，哪些必須等 `question_bank_items` 等正式 schema

### 5.4 筆記

**舊前台主要來源**

| 類型 | 路徑 |
|------|------|
| 筆記頁 | `legacy/old-frontend-ux-reference/client-src/pages/Notes.tsx` |
| 學習筆記頁 | `legacy/old-frontend-ux-reference/client-src/pages/LearningNotes.tsx` |
| 筆記詳情 | `legacy/old-frontend-ux-reference/client-src/pages/LearningNoteDetail.tsx` |
| 內嵌筆記 tab | `legacy/old-frontend-ux-reference/client-src/pages/tabs/InlineNotesTab.tsx` |
| 我的筆記本 | `legacy/old-frontend-ux-reference/client-src/pages/MyNotes.tsx` |

**R2 現況**

| 項目 | 狀態 |
|------|------|
| reader 內 smart notes | 已有 |
| 獨立筆記中心 | 無 |
| saved folders / categories | 無對應 schema |
| 筆記 AI 提問 / 圖片上傳 | 無 |

**盤點重點**

- 區分「書本內 smart notes」與「全域筆記中心」是兩種產品層級
- 哪些資料仍可重用 `smart_book_notes`
- 哪些舊版功能依賴 tRPC savedNotes 系統，R2 目前沒有

### 5.5 手稿

**舊前台主要來源**

| 類型 | 路徑 |
|------|------|
| Chat / Manus 整合 | `legacy/old-frontend-ux-reference/client-src/pages/Chat.tsx` |
| Manus 對話 / OAuth / 雲端依賴 | 同上與相關 AI 設定頁 |

**R2 現況**

| 項目 | 狀態 |
|------|------|
| Manus 專屬 route | 無 |
| Manus auth / cloud backend | 無 |
| R2 AI provider | 目前偏書本 / admin 任務用途 |

**盤點重點**

- 手稿模組是否應視為外部依賴高、暫不納入第一波
- 哪些 UX 是可保留概念、不可直接照搬實作
- 是否應先拆成 spike / feasibility study，而不是正式功能分支

### 5.6 我的題庫

**舊前台主要來源**

| 類型 | 路徑 |
|------|------|
| 題庫管理 / 我的題庫相關流程 | `legacy/old-frontend-ux-reference/client-src/pages/AiQuestionPractice.tsx`、`QuestionBankList.tsx`、部分 SmartBooksRoute |

**R2 現況**

| 項目 | 狀態 |
|------|------|
| 學生個人題庫收藏 / 已購 / 已解鎖視圖 | 無 |
| 題庫正式資料層 | 尚未完成 |
| 個人題庫歷史 / 錯題 / 復習 | 無 |

**盤點重點**

- 明確區分「平台題庫」與「我的題庫」
- 釐清是否依賴購買、點數、解鎖、歷史成績等舊系統模型
- 判斷應延後到正式題庫功能完成後再切出

---

## 6. 建議盤點方法

Agent B 應至少讀取以下來源後再出結論：

### 6.1 R2 現有前台

| 檔案 | 用途 |
|------|------|
| `apps/AI-Stu-R1/src/App.tsx` | 目前學生端實際 route 範圍 |
| `apps/AI-Stu-R1/src/pages/BooksPage.tsx` | 書本首頁能力 |
| `apps/AI-Stu-R1/src/pages/BookReaderPage.tsx` | 現有 reader 能力範圍 |
| `apps/AI-Stu-R1/src/components/*` | reader / AI / notes / chapter / toolbar 組成 |

### 6.2 R2 現有資料層

| 檔案 | 用途 |
|------|------|
| `packages/schema/src/*` | 判斷目前有哪些正式 schema |
| `packages/db/src/schema.ts` | SQLite table 現況 |
| `apps/AI-adm-D1/src/server/index.ts` | 已有學生 / 管理 API 能力 |

### 6.3 舊前台 reference

| 檔案群組 | 用途 |
|------|------|
| `legacy/old-frontend-ux-reference/client-src/pages/*` | 找主入口頁 |
| `legacy/old-frontend-ux-reference/client-src/features/*` | 找複合流程與大型功能 |
| `legacy/old-frontend-ux-reference/client-src/components/*` | 找可重用 UI / editor / viewer |

---

## 7. Agent B 輸出要求

Agent B 必須至少產出一份正式報告，內容需包含：

1. 六大模組總表
2. 每個模組：
   - 舊前台主要來源檔案
   - R2 是否已有對應功能
   - 缺少 route / API / DB / state 的項目
   - 可先搬的最小切片
   - 暫不可搬的原因
   - 風險等級
   - 建議獨立分支名稱
3. 建議實作順序
4. 明確標示：
   - 哪些屬於「直接移植」
   - 哪些屬於「重設計後再移植」
   - 哪些屬於「暫不建議進入第一波」

---

## 8. 建議輸出格式

報告建議檔名：

`docs/r2/AI-SmartBook-R2-frontend-six-module-inventory-and-migration-report-20260623.md`

若需任務書，可另補：

`docs/r2/AI-SmartBook-R2-frontend-six-module-inventory-and-migration-task-20260623.md`

---

## 9. 建議分支策略

本任務本身建議走**文件分支**或直接在盤點分支進行，不做大規模 source code 變更。

後續若要依盤點結果實作，建議拆成至少下列分支：

| 優先序 | 建議分支 | 模組 | 原因 |
|------|------|------|------|
| 1 | `feat/r2-student-notes-center` | 筆記 | 與現有 `smart_book_notes` 最接近 |
| 2 | `feat/r2-student-question-bank-shell` | 題庫 | 可先做空殼 / 只讀列表，但正式資料層仍待補 |
| 3 | `feat/r2-student-video-shell` | 影音 | 可先做 route / layout / mock shell |
| 4 | `feat/r2-smartbook-reader-advanced-panels` | 智能書本 | 把舊 SmartBooksRoute 能力拆回 reader 子模組 |
| 5 | `spike/r2-manus-module-feasibility` | 手稿 | 外部依賴高，先做 feasibility |
| 6 | `feat/r2-my-question-bank` | 我的題庫 | 依賴正式題庫與個人化資料模型，後置 |

---

## 10. 執行規則

1. 不修改 `.env`
2. 不提交 SQLite `.db`
3. 不提交 logs / uploads / backups / `.claude`
4. 不直接把舊前台整包複製進 R2
5. 盤點時要明確區分：
   - UI 殼層
   - 資料層依賴
   - 舊系統專屬 tRPC / auth / Manus / 點數邏輯
6. 若某模組高度依賴舊系統且 R2 完全沒有基礎資料層，必須標示為 `high risk` 或 `defer`

---

## 11. Agent B Prompt

```text
GitHub Execution in English.
Report in Traditional Chinese.

Task:
Inventory and propose a migration strategy for six legacy student-facing frontend modules into AI-SmartBook-R2.

Workspace:
/home/b827262/project/AI-SmartBook-R2

Base branch:
feat/r2-integrate-imports-notes

Focus modules:
1. Smart Book
2. Video
3. Question Bank
4. Notes
5. Manus
6. My Question Bank

Primary goal:
Produce a formal migration report that maps each legacy module to:
- source files in legacy/old-frontend-ux-reference
- current R2 status
- missing route/API/DB/state pieces
- minimum viable migration slice
- dependencies
- risk level
- suggested implementation branch

Important rules:
1. Do not modify .env.
2. Do not commit DB files, logs, uploads, backups, or .claude.
3. Do not bulk-copy old frontend code into R2.
4. Distinguish clearly between:
   - reusable UI
   - reusable domain flow
   - legacy-only backend dependencies
5. Mark modules that should be deferred instead of migrated immediately.

Suggested files to inspect:
- apps/AI-Stu-R1/src/App.tsx
- apps/AI-Stu-R1/src/pages/*
- apps/AI-Stu-R1/src/components/*
- apps/AI-adm-D1/src/server/index.ts
- packages/schema/src/*
- packages/db/src/schema.ts
- legacy/old-frontend-ux-reference/client-src/pages/*
- legacy/old-frontend-ux-reference/client-src/features/*

Required output:
docs/r2/AI-SmartBook-R2-frontend-six-module-inventory-and-migration-report-20260623.md

The report must include:
- executive summary
- six-module inventory table
- per-module migration analysis
- recommended migration order
- explicit defer/high-risk list
- proposed feature branch list

Validation:
- git status --short
- ensure no source code is unintentionally modified unless strictly needed for documentation support

Final report fields:
- status
- branch
- files inspected
- six modules covered
- recommended order
- defer list
- report path
- git status --short
- whether .env/db/log/.claude were committed: no
```

---

## 12. 驗收標準

1. 六大模組全部被逐項盤點。
2. 每個模組都有舊前台來源對照。
3. 每個模組都有 R2 現況評估。
4. 每個模組都有最小切片與風險判定。
5. 有清楚的建議實作順序。
6. 有明確標示哪些模組應延後。
7. 不提交 `.env` / DB / logs / uploads / backups / `.claude`。

