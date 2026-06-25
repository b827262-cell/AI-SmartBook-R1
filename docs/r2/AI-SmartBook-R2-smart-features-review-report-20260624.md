# AI-SmartBook-R2｜Smart Features Claude Review Report

> Branch: `fix/r2-admin-settings-files-integration`  
> Handoff Doc: `AI-SmartBook-R2-smart-features-claude-handoff-20260624.md`  
> Review Date: 2026-06-24  
> Executor: Claude Sonnet 4.6  
> Method: Runtime verification — Express server（port 4399）啟動，curl 驅動所有相關端點，源碼靜態分析補充

---

## 驗收總結

**cannot merge（as described）**

Handoff 文件描述三組功能，其中兩組在現行 branch 為零實作。若縮小範圍至「AI 筆記導覽說明 + Q&A 列表管理」子集，該部分可合併。

| 功能 | 實作狀態 |
|---|---|
| 功能一：智能影音設定 | ❌ 未實作 — 無 Page / Route / Nav / 後端 API |
| 功能二：AI 筆記導覽說明 | ✅ 已實作，navigate API 行為正確 |
| 功能三：書本 Q&A 管理（Q&A 部分）| ✅ 已實作，匯入 / 新增 / 列表正常 |
| 功能三：書本知識點管理 | ❌ 未實作 — 無重新同步 API / 側欄開關 / 章節統計 |

---

## 驗證結果

### Status

- **success:** AI 筆記導覽說明頁、navigate API、Q&A 匯入 API 均正確實作
- **failure:** 智能影音設定頁面未實作；知識點管理功能不存在於本分支
- **blocker:** 2 項（見下方 Required Fixes）
- **permission-halt:** 無

### Verification Table

| 項目 | 結果 | 證據 |
|---|---|---|
| route `/admin/notes-help` | ✅ | `App.tsx:31` + `adminNav.ts:37` 已註冊 |
| route `/admin/settings/smart-features` | ❌ | 不存在於任何 Page / Route / Nav |
| `GET /api/admin/books/:id/qa-logs` | ✅ | `{"logs":[...]}` 正常回應 |
| `POST /qa/import-markdown`（空 body）| ✅ | `{"error":"markdown is required"}` |
| `POST /qa/import-markdown`（有效內容）| ✅ | `{"imported":2,"logs":[...]}` |
| `GET /api/student/.../navigate`（有頁碼）| ✅ | `{"anchor":true,"pageNumber":42,"fallback":null}` |
| `GET /api/student/.../navigate`（無定位）| ✅ | `{"anchor":false,"fallback":"此筆記沒有頁碼或章節資訊"}` |
| secret scan | ✅ | git grep clean |
| `.env` tracking | ✅ | 僅 `.env.example` 被追蹤 |
| UI smoke test | ⚠️ | 無 Playwright，瀏覽器渲染未驗證 |

---

## 功能逐項審查

### 功能一：智能影音設定

**結論：未實作（BLOCKER）**

對 `apps/AI-adm-D1/src/` 與 `apps/AI-Stu-R1/src/` 全域搜尋「影音」、「video」、「VideoSetting」、「smart-feature」均無結果。

```bash
# adminNav.ts 無影音入口
grep -n "影音\|video\|smart.feature" apps/AI-adm-D1/src/navigation/adminNav.ts
# → 無輸出

# 無對應 Page 檔案
ls apps/AI-adm-D1/src/pages/ | grep -i video
# → 無輸出
```

Handoff 文件第 2 節描述的 UI 欄位（課程標題、章節、YouTube 連結、影片連結、啟用 toggle、刪除）、後端 CRUD、學生端章節影音顯示，均未找到任何對應實作。

---

### 功能二：AI 筆記導覽說明

**結論：✅ 通過**

#### 頁面實作確認

`NotesHelpPage.tsx` 已正確實作：
- `AdminPageHeader` title: `AI 筆記導覽 — 功能說明`
- 功能概覽、學生端操作步驟、定位行為優先順序表、API 端點說明
- adminNav 入口：`{ label: "AI 筆記導覽說明", to: "/admin/notes-help", enabled: true }`

#### Navigate API Runtime 驗證

```bash
# Step 1: 建立含頁碼的筆記
POST /api/student/books/{bookId}/notes
{"content":"測試筆記","pageNumber":42,"type":"text","sessionId":"test-session-001"}
→ {"note":{"id":"note_ff19...","pageNumber":42,...}}

# Step 2: 查詢定位 → anchor:true
GET /api/student/books/{bookId}/notes/note_ff19.../navigate
→ {
    "anchor": true,
    "pageNumber": 42,
    "chapterId": null,
    "fallback": null
  }

# Step 3: 建立無頁碼筆記 → anchor:false
POST /api/student/books/{bookId}/notes
{"content":"沒有頁碼","type":"text","sessionId":"test-session-002"}

GET /api/student/books/{bookId}/notes/note_a68c.../navigate
→ {
    "anchor": false,
    "pageNumber": null,
    "chapterId": null,
    "fallback": "此筆記沒有頁碼或章節資訊"
  }
```

#### 前端定位邏輯確認（`BookReaderPage.tsx`）

```tsx
// line 799-813 — 符合 handoff 定位優先順序
function handleNoteNavigate(note: SmartBookNote) {
  if (note.pageNumber != null) {            // priority 1: 直接跳頁
    jumpToPage(note.pageNumber);
    if (isMobile) setMobilePanel(null);
  } else if (note.chapterId) {
    const chapter = chapters.find((c) => c.id === note.chapterId);
    if (chapter?.pageStart != null) {       // priority 2: 章節起始頁
      jumpToPage(chapter.pageStart);
      if (isMobile) setMobilePanel(null);
    } else {                                // priority 3: 無法定位
      setMobileNoticeMessage("此筆記的章節無法定位（缺少頁碼）");
    }
    // priority 4: 無 pageNumber / chapterId → 不顯示定位按鈕（由 anchor:false 控制）
  }
}
```

#### 找到問題

- `NotesHelpPage.tsx:25` 硬編碼 `href="http://localhost:5173/books"` — 生產環境無效，需修正。
- Priority 3（chapterId 存在但無 pageStart）：桌面版靜默失敗（無提示），僅行動版顯示 `mobileNoticeMessage`。文件描述為「顯示非阻塞提示訊息」，桌面版體驗不一致。

---

### 功能三：書本 Q&A / 知識點管理

#### Q&A 管理（✅ 通過）

**頁面標題落差（非 blocker，但需確認）：**

| 項目 | 文件描述 | 實際程式碼 |
|---|---|---|
| 頁面標題 | `書本 Q&A / 知識點管理` | `書本 Q&A / 知識問答`（`QaPage.tsx:71`）|
| 按鈕 | Q&A 管理、知識點管理 | 手動上架 Markdown、（無知識點按鈕）|

**Q&A API Runtime 驗證：**

```bash
# POST import-markdown（空 body）
curl -X POST /api/admin/books/{id}/qa/import-markdown -d '{"markdown":""}'
→ {"error":"markdown is required"}   ✅ 驗證正常

# POST import-markdown（有效內容）
curl -X POST /api/admin/books/{id}/qa/import-markdown \
  -d '{"markdown":"Q: 這本書在做什麼？\nA: 測試。\n\nQ: 第二題？\nA: 答案。"}'
→ {"imported":2,"logs":[{...},{...}]}   ✅

# GET qa-logs
curl /api/admin/books/{id}/qa-logs
→ {"logs":[...2 items...]}   count 與 import 一致 ✅
```

**冪等性問題（已知，建議修正）：**

```bash
# 重複匯入相同問題
curl -X POST .../qa/import-markdown -d '{"markdown":"Q: 這本書在做什麼？\nA: 測試。"}'
→ imported: 1, total count: 3 (原本 2 + 新增 1)
```

相同問題重複匯入會建立新紀錄（無唯一鍵 upsert），使用者誤操作可能產生重複 Q&A。

#### 知識點管理（❌ 未實作，BLOCKER）

對 `apps/AI-adm-D1/src/pages/QaPage.tsx` 與整個 src 目錄搜尋：

```bash
grep -n "知識點\|KnowledgePoint\|sentenceIndex\|重新同步\|128" apps/AI-adm-D1/src/pages/QaPage.tsx
# → 無輸出
```

Handoff 文件第 4 節描述的以下功能均不存在：
- 知識點來源顯示（sentence-index JSON）
- 重新同步 JSON 按鈕
- 知識點總數統計（128 章 / 4,235 個）
- 知識點功能開關（啟用側欄 / 顯示搜尋 / 預設展開）
- 章節預覽與知識點數量
- 匯出章節清單 CSV

---

## 安全性審查

### ⚠️ Q&A 匯入無 XSS sanitization

```bash
curl -X POST .../qa/import-markdown \
  -d '{"markdown":"Q: <script>alert(1)</script>\nA: test"}'
→ stored as: '<script>alert(1)</script>'
   raw script tag stored: True
```

問題與答案以原始字串存入 SQLite。目前 `QaPage.tsx` 以 React JSX 文字節點渲染（安全），但需確認：
1. 學生端 Q&A 顯示是否使用 `innerHTML` / `dangerouslySetInnerHTML`
2. 管理後台若加入 Markdown 渲染需補 DOMPurify 或 sanitize-html

**建議：** 存入前對 `<script>`、`javascript:` 等危險 pattern 做 server-side strip，或使用 Zod `.transform()` sanitize。

### ⚠️ 後台 API 無身份驗證

```bash
curl http://localhost:4399/api/admin/books → HTTP 200（未登入）
```

所有 `/api/admin/` 路由無 session / JWT 驗證中介軟體。本專案為本地 dev tool，風險可接受；但若部署至可公開存取環境，需補 auth middleware。

### ✅ .env 與 secret 安全

```bash
git ls-files | grep "\.env"
→ .env.example
→ deploy/systemd/student.env.example

git grep -l "AIzaSy\|GOOGLE_API_KEY=" -- ':!*.md' ':!docs/'
→ clean
```

`.env` 未被追蹤，無真實 API Key 提交至 Git。

---

## Probe 結果（邊界測試）

| Probe | 結果 |
|---|---|
| 🔍 navigate：note 屬於其他 bookId | `{"error":"note not found"}` ✅（正確拒絕跨書存取）|
| 🔍 Q&A import：空 markdown body | `{"error":"markdown is required"}` ✅ |
| 🔍 Q&A import：重複匯入同題 | 新增而非更新（无 upsert）⚠️ |
| 🔍 XSS payload 存入 Q&A | 原始 `<script>` 標籤存入，無 server-side sanitize ⚠️ |
| 🔍 未登入存取 `/api/admin/books` | HTTP 200（無 auth middleware）⚠️ |

---

## Required Fixes Before Merge

1. **（BLOCKER）智能影音設定** — 建立 `VideoSettingsPage.tsx`、後端影音 CRUD API（新增 / 啟用 toggle / 刪除）、`adminNav.ts` 入口、學生端章節影音顯示邏輯。若本次 merge 不含此功能，需將 handoff 文件第 2 節標記為「待實作」並移除相關驗收要求。

2. **（BLOCKER）知識點管理** — 實作 sentence-index JSON 同步 API（冪等 upsert）、知識點側欄三個功能開關、章節統計、匯出 CSV。或明確聲明本 PR 不含此功能並更新文件範圍說明。

3. **（應修）NotesHelpPage 硬編碼 localhost** — `NotesHelpPage.tsx:25` 的 `href="http://localhost:5173/books"` 改為環境變數或純文字說明，避免生產環境死連結。

---

## 建議 Backlog（不阻擋合併）

| 項目 | 等級 | 說明 |
|---|---|---|
| Q&A 重複匯入冪等性 | medium | 補唯一鍵 upsert 避免重複問答 |
| Q&A/注記 XSS sanitization | medium | Server-side strip 危險 HTML pattern |
| navigate priority 3 桌面版靜默失敗 | low | 補桌面版非阻塞提示 |
| 後台 API auth middleware | low（dev tool）| 若部署至公開環境需補 |
| QaPage 標題文案 | low | 「知識問答」vs「知識點管理」需確認最終定案 |

---

## Final Decision

**cannot merge（as described in handoff doc）**

**理由：** Handoff 文件描述三組功能，智能影音設定（功能一）與知識點管理（功能三之知識點部分）在目前 branch 為零實作，與文件描述存在重大落差。  
**若縮小範圍：** 僅含「AI 筆記導覽說明 + Q&A 列表管理」的子集已具備可合併品質，navigate API 行為正確、Q&A 匯入驗證完整、安全性問題為可追蹤 backlog。  
**建議：** 釐清本次 PR 實際實作範圍，更新 handoff 文件預期後重新驗收，或補齊兩項缺失功能。
