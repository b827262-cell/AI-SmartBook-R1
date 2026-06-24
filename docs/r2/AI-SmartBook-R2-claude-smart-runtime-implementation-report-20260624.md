# AI-SmartBook-R2｜Claude Smart Runtime Implementation Report

> Branch: `fix/r2-smart-features-runtime-claude`  
> Base: `fix/r2-admin-settings-files-integration`  
> Commit: `6a7fd55`  
> Date: 2026-06-24  
> Executor: Claude Sonnet 4.6

---

## Status
- **success:** 五項任務全數完成（Task A–E）
- **failure:** 無
- **blocker:** 無
- **permission-halt:** 無

---

## Git
- **repository:** b827262-cell/AI-SmartBook-R1
- **branch:** fix/r2-smart-features-runtime-claude
- **commit SHA:** 6a7fd55
- **changed files:**
  - `apps/AI-adm-D1/src/server/index.ts` — 新增 smartVideos / knowledgePoints 路由、auth guard、URL validation、Q&A idempotency
  - `apps/AI-adm-D1/src/pages/VideoSettingsPage.tsx` — 新增（智能影音設定管理頁）
  - `apps/AI-adm-D1/src/pages/QaPage.tsx` — 加入知識點管理區塊、修正頁面標題
  - `apps/AI-adm-D1/src/pages/NotesHelpPage.tsx` — 移除 localhost 硬編碼
  - `apps/AI-adm-D1/src/App.tsx` — 新增 `/admin/books/:bookId/smart-videos` 路由
  - `apps/AI-adm-D1/src/api.ts` — 新增 SmartVideo / KnowledgePoint 客戶端函式
  - `apps/AI-adm-D1/src/navigation/adminNav.ts` — 新增「智能影音設定」導覽入口

---

## Fixed Scope

### Task A — 智能影音設定 runtime
**儲存方式：** `app_settings` key=`smart_videos:{bookId}`，JSON 陣列，無需 DB migration。

**後端 API：**
| Method | Route | 說明 |
|---|---|---|
| GET | `/api/admin/books/:id/smart-videos` | 列出全部影音（管理員） |
| POST | `/api/admin/books/:id/smart-videos` | 新增影音（需 auth guard） |
| PATCH | `/api/admin/books/:id/smart-videos/:vid` | 更新標題/章節/URL/啟用狀態 |
| DELETE | `/api/admin/books/:id/smart-videos/:vid` | 刪除（需 auth guard） |
| GET | `/api/student/books/:id/smart-videos` | 學生端：僅回傳已啟用的影音 |

**前端：** `VideoSettingsPage.tsx`（新增影音表單 + 影音清單 + 啟用/停用/刪除）

**驗收：**
- 新增影音後重新讀取仍存在 ✅
- 停用影音後學生端不顯示（student sees: 0 videos）✅
- 啟用後學生端顯示（student sees: 1 videos）✅
- 刪除後後台與學生端均消失 ✅

---

### Task B — 知識點管理 runtime 外殼
**知識點來源：** 現有 `smart_book_notes`，`sourceMessageId` 以 `"one-click-knowledge-point:"` 為前綴。

**後端 API：**
| Method | Route | 說明 |
|---|---|---|
| GET | `/api/admin/books/:id/knowledge-points` | 知識點清單 |
| GET | `/api/admin/books/:id/knowledge-points/stats` | 章節數、知識點總數、最後更新 |
| POST | `/api/admin/books/:id/knowledge-points/sync` | 同步入口（stub，等待 GPT-5.4）|
| GET | `/api/admin/books/:id/knowledge-points/settings` | 取得開關設定 |
| PUT | `/api/admin/books/:id/knowledge-points/settings` | 儲存開關設定 |
| GET | `/api/student/books/:id/knowledge-points` | 學生端：依 sidebarEnabled 控制 |

**設定：** `sidebarEnabled`、`searchEnabled`、`defaultExpanded` 持久化至 `app_settings`。

**QaPage 更新：**
- 標題修正：`書本 Q&A / 知識問答` → `書本 Q&A / 知識點管理`（符合文件）
- 新增三區塊：知識點總覽（統計卡片 + 重新同步）、功能開關、知識點預覽表格

**文案修正：** 統計顯示 `X 章`（非「本」），語意為章節數量。

---

### Task C — NotesHelpPage localhost 硬編碼
移除：
```html
<!-- Before -->
<a href="http://localhost:5173/books">http://localhost:5173/books</a>

<!-- After -->
<code>/books</code>（加上部署說明文字）
```

localhost grep 驗證：
```
apps/AI-adm-D1/src/ → 僅 server 端 IP 正規化函式（非前端）✅
```

---

### Task D — Q&A 冪等性
在 `POST /api/admin/books/:id/qa/import-markdown` 中：
1. 載入現有 manual Q&A（`findManualByBookId`）
2. 對問題文字 normalize（`trim + collapse whitespace + toLowerCase`）
3. 相同問題的 item 計為 `skipped`，不重複寫入
4. 回傳 `{ imported, skipped, logs }`

```bash
# 重複匯入相同問題
→ {"imported":0,"skipped":1,"logs":[]}   ✅
```

---

### Task E — 安全性

**URL 驗證（影音 URL）：**
```
javascript:alert(1)  → 400 "不允許的 URL scheme（javascript/data/vbscript）" ✅
data:text/html,...   → 400 "不允許的 URL scheme" ✅
http://example.com   → 400 "影片 URL 必須使用 https://" ✅
https://... (valid)  → 201 created ✅
```

**Auth Guard：**
```typescript
// server/index.ts
const ADMIN_SECRET = process.env.ADMIN_SECRET?.trim() || "";
function requireAdminAuth(req, res): boolean {
  if (!ADMIN_SECRET) return true; // dev mode: skip
  const token = req.headers["authorization"]?.slice(7) ?? "";
  if (token !== ADMIN_SECRET) { res.status(401).json(...); return false; }
  return true;
}
```
適用於：POST/PATCH/DELETE smart-videos、POST knowledge-points/sync、PUT knowledge-points/settings。

**Q&A 渲染安全：** 後台 `QaPage.tsx` 使用 React JSX 文字節點（非 innerHTML），無 XSS 風險。

---

## 分工邊界（不碰撞 GPT-5.4）
- 知識點同步 stub (`/knowledge-points/sync`) 僅回傳現有計數，**不實作 AI 萃取邏輯**
- AI provider service / Google AI generation prompt 均未觸碰
- `getRawGoogleApiKey()` 讀取策略未修改

---

## Remaining Risks（不阻擋合併）
- 知識點同步為 stub，GPT-5.4 整合後才能真正從 sentence-index JSON 萃取
- Auth guard 在 `ADMIN_SECRET` 未設定時跳過（dev 模式），部署時需設定 env var
- 影音排序依 `orderIndex`，目前無拖曳排序 UI（可後補）
- Q&A sanitize 僅 server 端 dedup；若學生端以 `innerHTML` 渲染需補 DOMPurify
- 智能影音設定 nav 入口指向書本列表（需從各書本頁進入），非獨立全域入口
