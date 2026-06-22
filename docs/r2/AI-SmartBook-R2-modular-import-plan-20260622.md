# AI-SmartBook R2 模組化匯入規劃（documentation-only）

Date: 2026-06-22

## 1. Executive Summary

R2 目標不再直接套用上游 MySQL 導向的匯入功能，而是以 R1 的 SQLite 前提，建立三大模組化匯入能力的架構化實作計畫：

- 問題題庫匯入（Question Bank JSON Import）
- 智慧題解匯入（Smart Solve JSON Import）
- AI 筆記導覽修復（AI Notes Navigation）

本次規劃的邊界是：

1) 僅規劃、定義邏輯與介面，不落實原始碼變更。  
2) 以 Feature Module 為單位切分到 `admin backend` / `student frontend` / `sqlite persistence` 三層。  
3) 採「Feature branch replay」方式逐模組落地，避免一次性大量合併帶來回歸風險。  

在不變更既有 R1 核心流程（書本上傳、PDF 解析、聊天）前提下，新增可回退的匯入模組是可推進的第一步。

---

## 2. Why Direct Merge Is Not Allowed

直接 merge 上游參考分支在本專案不可行，原因如下：

1. 參考分支背景為 MySQL 專案流，資料型別、欄位預設、JSON 轉換與路由實作假設與 R1 的 SQLite 架構不一致。  
2. 分支差異量大，包含大量與匯入目標無關的 UI/Router/工具檔；實際操作上是「大補丁遷移」而非功能 cherry-pick。  
3. 上游分支包含腳本、GUI、以及大量歷史過渡提交，無法在 R1 現行部署目標（1GB VPS + SQLite）直接平滑套用。  
4. 直接合併會造成既有 note API、題目模型、檔案角色與 migration 邊界模糊，不利於後續回退與審核。  

因此，本報告採「先規劃、再分模組落地」方式，優先保證資料一致性與可驗證性。

---

## 3. R1 Current Architecture Assumption

以下基於 `b827262-cell/AI-SmartBook-R1` 目前狀態的實作前提（documentation-only 設計假設）：

- 前端：
  - 管理端 `apps/AI-adm-D1`：書本管理、TOC、QA 與 notes 流程。
  - 學生端 `apps/AI-Stu-R1`：PDF 閱讀、章節導覽、聊天、智慧筆記顯示/編輯。
- 後端：
  - 目前主後端 API 聚合於管理端 server（`apps/AI-adm-D1/src/server/index.ts`），對外提供 `/api/admin/*`、`/api/student/*`。  
- 資料層：
  - 目前主資料表以 `packages/db/src/schema.ts` 的 SQLite schema 為主，已有 `books / book_files / book_chapters / smart_book_notes` 等基礎資料。  
- 既有筆記 API：
  - 學生端已有 `GET/POST/PATCH/DELETE /api/student/books/:bookId/notes`，資料欄位含 `chapterId / pageNumber / sourceMessageId`，可作為 AI Notes 導覽的擴充起點。

在以上基礎下，R2 規劃須維持：

1. 不破壞既有 `smart_book_notes` 使用者資料。  
2. 不新增 MySQL 相依。  
3. 匯入功能走新模組/新路徑，不影響既有上架、閱讀、聊天主流程。

---

## 4. R2 Target Architecture

R2 採「模組邊界 + 流水線」架構，將原本複合式匯入需求分為三模組：

1. `question-bank-import`：問題題庫 JSON 的上傳、驗證、草稿比對、寫入。  
2. `smart-solve-import`：Smart Solve / 智慧解題 JSON 的導入、章節對映、scope 維度綁定。  
3. `reader-notes-navigation`：AI 筆記頁面導覽修正，提供頁碼/章節/對話定位錨點。  

每個模組至少有：

- `server module`（API + repo）
- `schema module`（Zod + 型別）
- `import state tables`（任務表 + 映射/錯誤紀錄）
- `admin ui integration`（獨立 tab/page）
- `student ui integration`（導覽/定位互動）

設計目標為「新增模組可獨立驗收、故障可局部停用、不影響其他模組」。

---

## 5. SQLite Adaptation Strategy

SQLite 適配原則：

1. **最小 schema 破壞**：新表新欄位採「append-only」設計，避免修改既有核心表結構。  
2. **明確驗證層**：所有 import payload 經 `zod` 驗證後才進 DB，拒絕不完整/型別偏差資料。  
3. **作業可追蹤**：每筆匯入都要有 job record，含 `status / errorCode / errorDetail / counters`。  
4. **參照一致性**：章節、頁碼、書本都以 R1 現有 `books / book_chapters / book_files` 作為外鍵來源。  
5. **無 schema lock**：不要求全域 migrations 一次到位；以模組 PR 為單位補齊 schema/repo，再進行全量 migration。  
6. **回退友善**：若匯入模組不可用，可由 feature flag/路由控管回退到既有行為，不影響 reader/chat。  

---

## 6. Module Boundary Design

### 6.1 共用邊界

- **`packages/schema`**
  - 新增 3 組 import 專用 schema：`Question*`, `SmartSolve*`, `ReaderNote*`。
- **`packages/db`**
  - 新增對應 repository：`questionBankImportRepo / smartSolveImportRepo / readerNoteNavigationRepo`（可先預留介面，待 phase 實作）。
- **`apps/AI-adm-D1`**
  - 新增獨立 admin 匯入路徑：`/admin/books/:bookId/imports/*`（含 module-specific tabs）。  
- **`apps/AI-Stu-R1`**
  - 讀書頁新增「筆記導覽錨點」事件入口，對應 student API 的跳頁能力。  

### 6.2 隔離原則

- 各模組只可讀取 `books / book_chapters / book_files` 作為引用資料，不直接修改非目標資料。  
- 每模組不共享可變 state，僅透過 API 與 db rows 溝通。  
- 重複邏輯（如 JSON parse、欄位正規化、頁碼格式化）放在 shared utility，不放在 route。  

---

## 7. Module 1: Question Bank JSON Import

### 功能定位

將外部 `questions.json` 上傳為可驗證、可重播的題庫導入流程，先以本地 DryRun 預覽 + 後續提交模式實作。

### 職責

- 驗證 JSON schema（題型、選項、答案 index、解析欄位、題目編碼）。  
- 產生匯入摘要：有效題數、錯誤筆數、重複題目/缺值項。  
- 支援目標題庫新增與更新策略（預設為僅新增 + 可擴充覆蓋規則）。  
- 匯入結果輸出 `QuestionBankImportJob`（成功/失敗明細）。  

### 建議 API（Admin）

- `POST /api/admin/import/question-bank/jobs`：建立匯入任務（回傳 task id）。  
- `POST /api/admin/import/question-bank/jobs/:jobId/file`：上傳 JSON。  
- `GET /api/admin/import/question-bank/jobs/:jobId`：查看作業摘要與錯誤清單。  
- `POST /api/admin/import/question-bank/jobs/:jobId/execute`：執行匯入。  
- `GET /api/admin/import/question-bank/jobs/:jobId/download-errors`：下載錯誤報告。  

### UI 提案

- 管理端新增 `Question Bank Import` Tab（於 `BookDetail` 周邊頁籤）。  
- 上傳後先顯示 Preview（可過濾錯誤/警告），再點選「執行匯入」。  
- 保留舊有 `smart_book`/`qa` 流程，避免 UI 串接衝突。  

---

## 8. Module 2: Smart Solve JSON Import

### 功能定位

將 Smart Solve 類題目資料導入 `books / chapters / pages` 對應架構，建立可供題庫 / tutor scope 使用的結構化輸入。

### 職責

- 驗證 Smart Solve 格式與 item schema。  
- 解析 item 的 `skill / scope / tags / answers / explanations`。  
- 維持 `scope` 對書本與章節的映射（含可選頁碼）。  
- 支援巢狀章節輸入、可切回滾的批次作業。  
- 預留前端匯入預覽與報告。  

### 建議 API（Admin）

- `POST /api/admin/import/smart-solve/jobs`
- `POST /api/admin/import/smart-solve/jobs/:jobId/file`
- `GET /api/admin/import/smart-solve/jobs/:jobId`
- `POST /api/admin/import/smart-solve/jobs/:jobId/execute`
- `GET /api/admin/import/smart-solve/jobs/:jobId/download-errors`
- `POST /api/admin/import/smart-solve/scopes/build`（可選）：從書本章節/目錄生成 fallback 映射草案。  

### UI 提案

- 管理端 `Smart Solve Import` 視圖：
  - 單一檔案/多檔拖曳上傳
  - Scope 標記（book/chapter/page）
  - 匯入報告（總筆數、導入數、警告、錯誤）  

---

## 9. Module 3: AI Notes Navigation

### 功能定位

修正 AI 筆記在學生閱讀端的定位一致性：點擊 note 後可回跳到對應頁碼、章節，並保持聊天/筆記來源上下文。

### 職責

- 新增筆記定位屬性（例如章節 anchor / 文字偏移 / source snapshot）。  
- 提供 student endpoint for note jump：以 noteId/anchor 回傳書頁定位資訊。  
- reader 與 notes panel 事件同步：AI 筆記點擊後更新頁碼、章節、可選高亮。  
- 相容既有 `SmartBookNote` 結構，避免舊資料遺失。  

### 建議 API（Student）

- `GET /api/student/books/:bookId/notes/:noteId/navigate`：回傳 `chapterId/pageNumber/anchor`。  
- `POST /api/student/books/:bookId/notes/:noteId/anchor`：更新或補齊定位資料。  
- `GET /api/student/books/:bookId/notes/anchors?chapterId=...&page=...`：批次查詢定位索引。  

### UI 提案

- `apps/AI-Stu-R1` 的 Notes Panel 點擊事件新增 `scrollToNoteAnchor`。  
- 若 PDF 尚未載入該頁，先切換頁碼再嘗試回位。  
- 提供 fallback：無錨點時以 `chapterId/pageNumber` 粗對位。  

---

## 10. Proposed Folder Structure

建議新增結構（以 R2 專用模組目錄為中心）：

```text
apps/
  AI-adm-D1/
    src/
      pages/
        ImportHubPage.tsx
      pages/modules/
        question-bank/
          QuestionBankImportPage.tsx
          QuestionBankImportJobPanel.tsx
        smart-solve/
          SmartSolveImportPage.tsx
          ScopeMappingPanel.tsx
        notes-navigation/
          NoteNavigationSettingsPage.tsx
      server/
        import/
          questionBankRouter.ts
          smartSolveRouter.ts
          readerNotesRouter.ts
      routes/
        importRoutes.ts
packages/
  schema/
    src/
      questionBankImport.schema.ts
      smartSolveImport.schema.ts
      readerNoteNavigation.schema.ts
  db/
    src/
      schema/
        questionBankImport.schema.ts (optional split)
        smartSolveImport.schema.ts (optional split)
        readerNoteNavigation.schema.ts (optional split)
      repositories/
        questionBankImport.repo.ts
        smartSolveImport.repo.ts
        readerNoteNavigation.repo.ts
```

### 與既有目錄兼容

- R1 既有 server/router 保持現況；新增 router 可透過 `index.ts` 組裝掛載。  
- 既有 note 功能不移除，新增欄位與表採增量方式導入。  

---

## 11. Proposed SQLite Tables

以下以文件建議表名為主（可依實作調整），欄位含基本欄位最小集：

### 11.1 QuestionBankImport

- `QuestionBankImportJob`
  - `id` (PK), `bookId?`, `status`, `uploadPath`, `totalRecords`, `validRecords`, `invalidRecords`, `createdBy`, `createdAt`, `finishedAt`, `errorCode`, `errorDetails`  
- `QuestionItem`
  - `id`, `jobId`(FK), `externalId`, `subject`, `questionText`, `difficulty`, `type`, `explanation`, `createdAt`, `updatedAt`
- `QuestionChoice`
  - `id`, `questionItemId`, `index`, `content`, `isCorrect`, `createdAt`
- `QuestionSourceMap`
  - `id`, `questionItemId`, `sourceSystem`, `sourcePayload`, `sourceChapter`, `sourcePage`, `createdAt`

### 11.2 SmartSolveImport

- `SmartSolveImportJob`
  - `id`, `jobType`, `status`, `totalItems`, `insertedItems`, `skippedItems`, `failedItems`, `createdBy`, `createdAt`, `finishedAt`, `errorSummary`
- `SmartSolveItem`
  - `id`, `jobId`, `externalItemId`, `prompt`, `answer`, `optionsJson`, `analysisJson`, `knowledgePointId`, `createdAt`
- `SmartSolveKnowledgePoint`
  - `id`, `name`, `parentPointId`, `orderIndex`, `metadataJson`, `createdAt`
- `SmartSolveBookScope`
  - `id`, `itemId`, `bookId`, `chapterId`, `startPage`, `endPage`, `scopeType`, `createdAt`

### 11.3 Reader Notes Navigation

- `ReaderNote`
  - `id`, `noteId`(FK to smart_book_notes.id), `chapterId`, `pageNumber`, `anchorType`, `anchorJson`, `resolvedAt`, `createdAt`
- `ReaderNoteAnchor`
  - `id`, `noteId`, `bookId`, `chapterId`, `pageNumber`, `x`, `y`, `selectionText`, `sourceVersion`, `createdAt`
- `ReaderNoteConversation`
  - `id`, `noteId`, `conversationId`, `sourceMessageId`, `createdAt`
- `ReaderNoteSource`
  - `id`, `noteId`, `sourceType`, `sourceRef`, `metadataJson`, `createdAt`

**遷移策略**：`reader-notes` 可先新增 `ReaderNote*` 表作為「新定位層」，並保留原 `smart_book_notes` 寫入不變，逐步將新 navigation 資料補齊。  

---

## 12. API Boundary Proposal

### Admin API 群組

```text
/api/admin/import/question-bank/*
/api/admin/import/smart-solve/*
/api/admin/import/shared/validate
```

共用規則：

- 所有 `/api/admin/import/*` 回傳 `{ success, data, warning, errorCode }`。  
- 大檔案輸入走「上傳 job + 取樣驗證 + execute」兩階段，避免一次性 timeout。  
- 匯入結果輸出可含 `dryRun` 與 `commitHash`（可選）以利審計。  

### Student API 群組

```text
/api/student/books/:bookId/notes/:noteId/navigate
/api/student/books/:bookId/notes/:noteId/anchor
/api/student/books/:bookId/notes/anchors
```

### 安全與權限

- 匯入 API 僅管理員可呼叫；note navigation API 僅同一書本可存取。  
- 皆需保留輸入大小限制（上限 2MB JSON 以內為起始）。  
- 回報 `400` 錯誤時附上 machine-friendly error code。  

---

## 13. Frontend Integration Proposal

### Admin

1. 在 `BookDetail` 下方新增 `導入中心` tab（或獨立頁面）：Question Bank / Smart Solve 分開 tab。  
2. 新增 `Question Bank Import`、`Smart Solve Import` 狀態卡：顯示 pending / running / done / failed。  
3. 引入共用 `ImportFileDropzone` 風格（僅限 JSON）。  
4. 提供「只驗證」與「立即匯入」雙按鈕，避免誤匯。  

### Student

1. 在 Notes Panel 點選每筆 note 可觸發 `navigate` API。  
2. Reader 收到 `pageNumber / chapterId / anchor` 後同步更新：  
   - 切頁
   - 對應章節選取
   - 觸發可選 highlight anchor  
3. 導覽失敗顯示 toast 並保留原始 note 頁面，避免空白體驗。  

---

## 14. Implementation Order

1. **R2 架構報告（本文件）**  
2. **SQLite schema 與 repositories 規格化**（先建立三模組表、type + repo 介面）  
3. **question-bank-import**（含 admin preview + dry-run）  
4. **smart-solve-import**（含 scope 建立與匯入映射）  
5. **reader-notes-navigation**（先 API 後前端）  
6. **Admin UI tabs 上線**  
7. **Student reader navigation 驗證**  
8. **build + acceptance 測試 + 回滾演練**  

---

## 15. Risk Notes

1. MySQL schema 不能直接複製到 SQLite；必須逐欄位映射與 JSON 欄位型別調整。  
2. 直接 merge 可能破壞 R1，包含未預期 migration、路由副作用與既有行為退化。  
3. 參考分支可能含大量無關變更，需以 feature replay 導入。  
4. Reader/notes 類改動容易與既有學生端 reader 頁面衝突（頁碼計算、章節切換、聊天室/筆記 panel 狀態）。  
5. JSON 匯入若過度寬鬆會導入汙染資料，必須採嚴格驗證 + error 追蹤。  
6. 大型檔案與嵌套結構在目前 1GB 環境下需分批處理，避免長時間 lock。  

---

## 16. Validation Checklist

- build passes（相關 package & workspace）  
- SQLite schema is valid（schema 與 migration 可重放）  
- admin import page loads（Question Bank、Smart Solve 至少可打開）  
- invalid JSON returns clear error（400 + code + line context）  
- valid question bank JSON imports correctly（題目/選項/答案落庫與重複偵測）  
- Smart Solve JSON maps to book/chapter/page correctly（scope mapping 可驗證）  
- student reader notes jump to correct page（note 點擊定位成功）  
- existing R1 upload and reader flow still works（上傳、閱讀、聊天不退化）  
- rollback path exists（可停用 import endpoint、保留舊流程）  

---

## 17. Recommended Next Codex-Spark Task

建議下一個 codex-spark 任務為：

- **「建立 `question-bank-import` 最小落地第一版（schema + job + dry-run）」**
- 輸出文件：
  - `docs/r2/AI-SmartBook-R2-question-bank-minimum-implementation-plan-20260622.md`
- 附帶驗收清單：
  - 單筆與多筆 JSON 匯入
  - 重複題目偵測
  - 錯誤回報可下載

此順序可快速建立最小可見價值，再逐步擴展 Smart Solve 與 Notes 導覽，降低首輪整體風險。
