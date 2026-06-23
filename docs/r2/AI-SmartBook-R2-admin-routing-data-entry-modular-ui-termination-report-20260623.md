# AI-SmartBook-R2 Admin Routing、Data Entry、Modular UI — 結案報告

日期：2026-06-23

---

## 結案狀態

**success**

---

## 分支資訊

| 項目 | 值 |
|------|-----|
| 分支 | `feat/r2-integrate-imports-notes` |
| Commit SHA | `5a9bdc22` |
| Push 結果 | 成功推送至 `b827262-cell/AI-SmartBook-R1` |

---

## API 404 根本原因分析

### Question Bank 404

Port 4300 上運行的是舊版 **Branch C server**（`feat/r2-ai-notes-navigation` worktree），該 server 僅包含 `GET /api/student/.../navigate` 路由，缺少題庫與智慧題解相關路由。

整合分支 server（含所有路由）先前被啟動在 port 4397，不是 Vite proxy 預設的 port 4300，導致每次前端發出 API request 都被舊 server 回傳 404。

**整合分支已有完整路由（`apps/AI-adm-D1/src/server/index.ts`）：**

```
POST /api/admin/import/question-bank/jobs
GET  /api/admin/import/question-bank/jobs
GET  /api/admin/import/question-bank/jobs/:jobId
POST /api/admin/books/:bookId/imports/smart-solve/jobs
GET  /api/admin/books/:bookId/imports/smart-solve/jobs
GET  /api/admin/books/:bookId/imports/smart-solve/jobs/:jobId
GET  /api/student/books/:bookId/notes/:noteId/navigate
```

**修正方式：** 終止 port 4300 上的舊 server，改以整合分支程式碼重新啟動，並以 `SQLITE_PATH` 指向主 workspace DB。

### Smart Solve 404

除 stale server 問題外，使用者必須手動輸入 raw Book ID（如 `book_0d9fbaf1-...`），輸入錯誤即回傳 404。此問題已由 UI 改版解決（見下方 §修正內容）。

---

## API Server / Proxy 不符確認

Vite proxy 設定（`apps/AI-adm-D1/vite.config.ts`）：

```ts
proxy: {
  "/api": {
    target: process.env.ADMIN_API_TARGET || "http://localhost:4300",
    changeOrigin: true
  }
}
```

Proxy target 設定本身正確，問題在於 port 4300 執行的是錯誤版本的 server。重啟後 proxy 正常運作。

---

## 修正內容

### 1. Admin 側邊欄模組化

**新建：** `apps/AI-adm-D1/src/navigation/adminNav.ts`

定義 `AdminNavItem`、`AdminNavGroup` 型別，並匯出 `ADMIN_NAV_GROUPS` 靜態設定陣列：

| 群組 | 已啟用項目 | 待實作項目 |
|------|-----------|-----------|
| 管理後台 | 首頁、帳戶管理、介面設定 | — |
| 智能書本管理 | 書本列表、新增書本、AI 筆記導覽說明 | — |
| 題庫與題解 | 題庫 JSON 匯入、智慧題解 JSON 匯入 | 題庫中心（PDF辨識）|
| AI 助教管理 | — | AI助教科管理、AI助教答記錄、AI助教本綁定、學生內容總覽 |

**修改：** `apps/AI-adm-D1/src/components/admin/AdminSidebar.tsx`

完全由 `ADMIN_NAV_GROUPS` 驅動，移除所有硬編碼連結。未啟用項目顯示為灰色 `<span>` 並附「待實作」badge，不產生壞連結。日後新增功能只需修改 `adminNav.ts`。

**修改：** `apps/AI-adm-D1/src/styles.css`

新增：

```css
.admin-nav-item--disabled   /* 灰色、禁止點擊 */
.admin-nav-badge            /* "待實作" 小標籤 */
```

---

### 2. Smart Solve Book ID UX 改版

**修改：** `apps/AI-adm-D1/src/pages/SmartSolveImportPage.tsx`

| 項目 | 修改前 | 修改後 |
|------|--------|--------|
| 書本選擇 | 手動輸入 raw Book ID 文字框 | 從 `/api/admin/books` 載入的 `<select>` 下拉選單 |
| 選單標籤 | — | `{book.title}（{book.id}）` |
| 匯入按鈕 | 任何時候都可點擊 | 未選書本時禁用 |
| 提示文字 | 無 | 未選書本時顯示警示 |
| 範例 JSON | 無 | 可展開/收合的 `<pre>` 區塊 |

---

### 3. Question Bank 範例 JSON 說明

**修改：** `apps/AI-adm-D1/src/pages/QuestionBankImportPage.tsx`

- 加入說明：「匯入後建立 staging 記錄，不直接寫入正式題庫資料表」
- 新增可展開/收合的範例 JSON：

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

---

### 4. AI 筆記導覽說明頁

**新建：** `apps/AI-adm-D1/src/pages/NotesHelpPage.tsx`（路由：`/admin/notes-help`）

頁面包含：

- 功能概覽
- 學生端操作步驟（5 步驟：開啟 /books → 選書 → 開筆記面板 → 新增筆記 → 點「定位」）
- 定位行為優先順序表（4 種情境）
- API 端點文件（`GET /api/student/books/:bookId/notes/:noteId/navigate`）

**修改：** `apps/AI-Stu-R1/src/components/SmartNotesPanel.tsx`

當 `onNavigate` prop 存在時顯示行內提示：

> 點「定位」可跳到筆記頁碼；沒有頁碼的筆記會顯示提示。

---

## 靜態驗證結果

| 套件 / 應用 | 指令 | 結果 |
|------------|------|------|
| `AI-adm-D1` typecheck | `pnpm --filter AI-adm-D1 typecheck` | **PASS**（0 errors）|
| `AI-adm-D1` build | `pnpm --filter AI-adm-D1 build` | **PASS**（144 modules，248 ms）|
| `AI-Stu-R1` build | `pnpm --filter AI-Stu-R1 build` | **PASS**（441 ms）|
| `AI-Stu-R1` typecheck | — | 9 個既有錯誤（無 JSX parse 錯誤；build 正常通過）|

---

## Live curl 驗證結果

Server：`AI-adm-D1` port 4300（整合分支程式碼 + main workspace DB）

| 指令 | 結果 |
|------|------|
| `curl http://127.0.0.1:4300/api/admin/books` | **PASS** — 13 本書 |
| `curl http://127.0.0.1:4300/api/admin/import/question-bank/jobs` | **PASS** — 2 個 jobs |
| `curl http://127.0.0.1:4300/api/admin/books/<realBookId>/imports/smart-solve/jobs` | **PASS** — 2 個 jobs |
| `curl -I http://127.0.0.1:5174/admin/import/question-bank` | **HTTP 200** |
| `curl -I http://127.0.0.1:5174/admin/import/smart-solve` | **HTTP 200** |

---

## Upstream Branch 確認

| 項目 | 結果 |
|------|------|
| `upstream/codex/fix-ai-notes-navigation` 是否存在 | **是**（`remotes/upstream/codex/fix-ai-notes-navigation`）|
| 是否 merge | **否**（專案結構不同，`client/src/` vs `apps/AI-adm-D1/src/`）|
| 是否 cherry-pick | **否** |
| 處理方式 | 結構參考，功能由 R2 codebase 獨立實作 |

---

## 新增/修改檔案（9 個）

| 檔案 | 說明 |
|------|------|
| `apps/AI-adm-D1/src/navigation/adminNav.ts` | 新建 — 模組化導覽設定 |
| `apps/AI-adm-D1/src/pages/NotesHelpPage.tsx` | 新建 — AI 筆記說明頁 |
| `docs/r2/AI-SmartBook-R2-admin-routing-data-entry-modular-ui-report-20260623.md` | 新建 — 實作報告 |
| `apps/AI-adm-D1/src/components/admin/AdminSidebar.tsx` | 修改 — 由設定驅動，加入 disabled 邏輯 |
| `apps/AI-adm-D1/src/pages/SmartSolveImportPage.tsx` | 修改 — 書本下拉選單取代文字輸入 |
| `apps/AI-adm-D1/src/pages/QuestionBankImportPage.tsx` | 修改 — 加入範例 JSON 說明 |
| `apps/AI-adm-D1/src/App.tsx` | 修改 — 加入 NotesHelpPage 路由 |
| `apps/AI-adm-D1/src/styles.css` | 修改 — 加入 disabled/badge 樣式 |
| `apps/AI-Stu-R1/src/components/SmartNotesPanel.tsx` | 修改 — 加入定位提示文字 |

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
| MySQL 參考分支已 merge | **否（正確）** |
| `upstream/codex/fix-ai-notes-navigation` 已 merge | **否（正確）** |

---

## 後續待辦

| 項目 | 說明 |
|------|------|
| AI 助教管理（4 項）| 目前標記「待實作」；實作後在 `adminNav.ts` 設 `enabled: true` 即可啟用 |
| `AI-Stu-R1` 既有 TS 錯誤（9 個）| 與 note navigation 無關，可在後續 reader refactor 階段清理 |

---

建議現在輸入 `/compact`，壓縮本輪上下文後再開始下一輪任務。
