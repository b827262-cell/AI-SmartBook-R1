# AI-SmartBook-R2 Admin Routing, Data Entry, and Modular UI — Implementation Report

Date: 2026-06-23

## 1. Status

**success**

---

## 2. Branch

```
feat/r2-integrate-imports-notes
```

---

## 3. Root Cause: Question Bank 404

**Cause**: The Vite admin dev server (port 5174) proxies `/api` → `http://localhost:4300`. However, the process running on port 4300 was the **old Branch C server** (`feat/r2-ai-notes-navigation` worktree), which only contained the `GET /api/student/.../navigate` endpoint — not the question-bank or smart-solve routes.

The integration branch code already contained the correct routes. The fix was to kill the stale process and restart the admin API server from the integration branch code on port 4300.

**Routes confirmed in integration branch** (`apps/AI-adm-D1/src/server/index.ts`):
```
POST /api/admin/import/question-bank/jobs
GET  /api/admin/import/question-bank/jobs
GET  /api/admin/import/question-bank/jobs/:jobId
POST /api/admin/books/:bookId/imports/smart-solve/jobs
GET  /api/admin/books/:bookId/imports/smart-solve/jobs
GET  /api/admin/books/:bookId/imports/smart-solve/jobs/:jobId
GET  /api/student/books/:bookId/notes/:noteId/navigate
```

---

## 4. Root Cause: Smart Solve 404

**Cause**: Two separate issues:

1. Same stale server on port 4300 (same as Question Bank root cause).
2. User had to manually type a raw Book ID (e.g., `book_0d9fbaf1-...`), and any typo or wrong ID returned 404 from the API.

**Fix**: Replaced the raw text input with a `<select>` dropdown that loads books from `/api/admin/books` on mount. User selects a book title and the actual `bookId` is used automatically.

---

## 5. API Server / Proxy Mismatch

**Confirmed**: Vite proxy config at `apps/AI-adm-D1/vite.config.ts`:
```ts
proxy: {
  "/api": {
    target: process.env.ADMIN_API_TARGET || "http://localhost:4300",
    changeOrigin: true
  }
}
```

The proxy target (`http://localhost:4300`) was correct. The mismatch was that port 4300 ran stale code. Resolution: restart the server from the integration branch on port 4300 with `SQLITE_PATH` pointing to the main workspace DB.

---

## 6. Sidebar Modularization

### New file: `apps/AI-adm-D1/src/navigation/adminNav.ts`

Defines `AdminNavItem` and `AdminNavGroup` types and exports `ADMIN_NAV_GROUPS` — a static config array that drives the entire sidebar.

### Updated: `apps/AI-adm-D1/src/components/admin/AdminSidebar.tsx`

Now renders from `ADMIN_NAV_GROUPS`. Disabled items (`enabled: false`) render as `<span>` with a "待實作" badge. To add a new nav item, only `adminNav.ts` needs to change.

### New styles in `apps/AI-adm-D1/src/styles.css`

```css
.admin-nav-item--disabled   /* gray, non-clickable */
.admin-nav-badge            /* "待實作" pill */
```

---

## 7. Navigation Groups and Links

| Group | Item | Route | Status |
|-------|------|-------|--------|
| 管理後台 | 首頁 | `/admin` | ✅ Enabled |
| 管理後台 | 帳戶管理 | `/admin/accounts` | ✅ Enabled |
| 管理後台 | 介面設定 | `/admin/appearance` | ✅ Enabled |
| 智能書本管理 | 書本列表 | `/admin/books` | ✅ Enabled |
| 智能書本管理 | 新增書本 | `/admin/books/new` | ✅ Enabled |
| 智能書本管理 | AI 筆記導覽說明 | `/admin/notes-help` | ✅ Enabled (new) |
| 題庫與題解 | 題庫 JSON 匯入 | `/admin/import/question-bank` | ✅ Enabled |
| 題庫與題解 | 智慧題解 JSON 匯入 | `/admin/import/smart-solve` | ✅ Enabled |
| 題庫與題解 | 題庫中心（PDF辨識） | `/admin/question-bank-center` | ⛔ Disabled (待實作) |
| AI 助教管理 | AI助教科管理 | — | ⛔ Disabled (待實作) |
| AI 助教管理 | AI助教答記錄 | — | ⛔ Disabled (待實作) |
| AI 助教管理 | AI助教本綁定 | — | ⛔ Disabled (待實作) |
| AI 助教管理 | 學生內容總覽 | — | ⛔ Disabled (待實作) |

---

## 8. Smart Solve Book Selector Behavior

**Before**: Raw text input asking user to type `book_xxxxx`.

**After**: `<select>` dropdown populated from `GET /api/admin/books` on component mount. Each option shows `{book.title}（{book.id}）`. Upload button and history load use the selected `bookId` automatically. Upload is disabled until a book is selected. A collapsible "查看範例 JSON" section shows sample payload.

---

## 9. AI Notes Navigation User Test Guide

A new page `/admin/notes-help` was added (`NotesHelpPage.tsx`) with:

- Feature overview
- Step-by-step student test path: `/books` → open book → open notes panel → add note → jump to another page → click "定位"
- Navigation priority table
- API endpoint documentation

Help text also added directly in `SmartNotesPanel.tsx` (only when `onNavigate` prop is passed):
```
點「定位」可跳到筆記頁碼；沒有頁碼的筆記會顯示提示。
```

---

## 10. Upstream `codex/fix-ai-notes-navigation` Check

Branch exists at:
```
remotes/upstream/codex/fix-ai-notes-navigation
```

It uses a different project structure (`client/src/`) vs R2 (`apps/AI-adm-D1/src/`, `apps/AI-Stu-R1/src/`). Files noted as reference:
```
client/src/components/AdminNavbar.tsx
client/src/pages/AdminQuestionBankImport.tsx
client/src/pages/AdminSmartSolve.tsx
```

No code was cherry-picked or merged. The modular navigation design and UX improvements were implemented independently based on the R2 codebase structure.

---

## 11. Build and Typecheck Results

| Check | Result |
|-------|--------|
| `AI-adm-D1` typecheck | **PASS** (0 errors) |
| `AI-adm-D1` build | **PASS** (144 modules, 248 ms) |
| `AI-Stu-R1` build | **PASS** (441 ms; chunk size warning is pre-existing) |
| `AI-Stu-R1` typecheck | 9 pre-existing errors (unchanged from integration report; no JSX parse errors; build passes) |

---

## 12. Live curl Results

Server: `AI-adm-D1` on port 4300 (integration branch code, SQLITE_PATH = main workspace DB)

| Command | Result |
|---------|--------|
| `curl http://127.0.0.1:4300/api/admin/books` | **PASS** — 13 books |
| `curl http://127.0.0.1:4300/api/admin/import/question-bank/jobs` | **PASS** — 2 jobs |
| `curl http://127.0.0.1:4300/api/admin/books/<realBookId>/imports/smart-solve/jobs` | **PASS** — 2 jobs |
| `curl -I http://127.0.0.1:5174/admin/import/question-bank` | **HTTP 200** |
| `curl -I http://127.0.0.1:5174/admin/import/smart-solve` | **HTTP 200** |

---

## 13. Changed Files

| File | Change |
|------|--------|
| `apps/AI-adm-D1/src/navigation/adminNav.ts` | NEW — modular nav config with 4 groups, 13 items |
| `apps/AI-adm-D1/src/components/admin/AdminSidebar.tsx` | MODIFIED — renders from `ADMIN_NAV_GROUPS`, disabled items show badge |
| `apps/AI-adm-D1/src/pages/SmartSolveImportPage.tsx` | MODIFIED — book dropdown replaces raw text input; sample JSON help added |
| `apps/AI-adm-D1/src/pages/QuestionBankImportPage.tsx` | MODIFIED — collapsible sample JSON added; staging note added |
| `apps/AI-adm-D1/src/pages/NotesHelpPage.tsx` | NEW — `/admin/notes-help` with test guide and priority table |
| `apps/AI-adm-D1/src/App.tsx` | MODIFIED — added `NotesHelpPage` import and route |
| `apps/AI-adm-D1/src/styles.css` | MODIFIED — added `.admin-nav-item--disabled` and `.admin-nav-badge` styles |
| `apps/AI-Stu-R1/src/components/SmartNotesPanel.tsx` | MODIFIED — added inline nav hint when `onNavigate` is set |

---

## 14. Commit SHA

See push result below.

---

## 15. Push Result

See git push output.

---

## 16. git status --short

```
(clean — all changes committed)
```

---

## 17. Safety Confirmation

| Item | Status |
|------|--------|
| `.env` committed | **No** |
| SQLite `.db` committed | **No** |
| logs committed | **No** |
| uploads committed | **No** |
| backups committed | **No** |
| `.claude` local state committed | **No** |
| MySQL reference branch merged | **No** |
| `upstream/codex/fix-ai-notes-navigation` merged | **No** (reference only) |
