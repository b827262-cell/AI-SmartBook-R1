# AI-SmartBook-R2 Three-Agent Acceleration Order：Admin Nav、智能影音、筆記 / PDF 開關

日期：2026-06-24  
Repository：`b827262-cell/AI-SmartBook-R1`  
目前整合分支：`fix/r2-smart-features-final-integration`  
目的：將目前剩餘問題拆成三個 agent 並行處理，加快 admin nav 修正、筆記 / PDF 開關持久化、學生端 Reader 套用與驗收。

---

## 1. 背景

目前 Codex 靜態檢查已確認：

1. `AdminNav` 中「書本列表」與「智能影音設定」都使用 `to: "/admin/books"`。
2. `AdminSidebar` 使用 `item.to` 當 key，因此 React duplicate key warning 仍會發生。
3. `App.tsx` 已存在 `/admin/books/:bookId/smart-videos`，但 nav 錨點仍指向 `/admin/books`，導致 active 判斷重疊。
4. 筆記功能開關 / PDF 工具開關目前沒有形成完整可驗證機制。
5. `appearance.schema.ts` 主要是版型與 icon 設定，目前沒有 note / PDF tool toggle 欄位。
6. 學生端 `PdfReaderToolbar.tsx` 目前只依外觀 icon 輸出工具按鈕，尚未依開關隱藏 / 停用。

因此本任務拆分成三個 agent 並行處理。

---

## 2. 三 Agent 分工總表

| Agent | 建議模型 | 分支 | 任務定位 | 可否並行 |
|---|---|---|---|---|
| Agent A | Codex / GPT-5.4 Medium | `fix/r2-admin-nav-smart-video-route` | 修 admin nav duplicate key、智能影音 route / active 狀態 | 可立即執行 |
| Agent B | Claude / GPT-5.4 High | `fix/r2-note-pdf-toggle-settings-api` | 建立 note / PDF toggle schema、後台 API、後台保存 UI | 可立即執行 |
| Agent C | Codex / GPT-5.4 Medium | `fix/r2-student-reader-toggle-consumption` | 學生端 Reader / PdfReaderToolbar 套用設定、驗收與 fallback | 可並行，但需遵守 Agent B API contract |

---

## 3. 共同規則

三個 agent 均需遵守：

1. 不得提交 `.env`。
2. 不得提交任何 API key、DB dump、runtime upload data、logs、temporary browser folder。
3. 不得修改 Google knowledge generation service、sentence-index parser、Reader TOC fallback、knowledge100 邏輯，除非只為修 typecheck。
4. 變更完成後必須產出 report 到 `docs/r2/`。
5. 最終整合前，不要直接 merge 到主分支。
6. 若發現自己的任務需要大幅修改其他 agent 負責範圍，立即停止並回報 blocker。

---

## 4. Agent A：Admin Nav / 智能影音 Route 修正

### 4.1 工作分支

```bash
git fetch origin
git checkout fix/r2-smart-features-final-integration
git pull origin fix/r2-smart-features-final-integration
git checkout -b fix/r2-admin-nav-smart-video-route
```

若分支已存在：

```bash
git checkout fix/r2-admin-nav-smart-video-route
git pull origin fix/r2-admin-nav-smart-video-route
```

### 4.2 任務目標

修正後台左側選單 duplicate key 與 active 狀態錯誤。

目前問題：

```text
Encountered two children with the same key, `/admin/books`
```

且「書本列表」與「智能影音設定」同時 active。

### 4.3 必改項目

| 項目 | 要求 |
|---|---|
| 書本列表 | 保留 `to: "/admin/books"` |
| 智能影音設定 | 不得使用 `to: "/admin/books"` |
| 智能影音 route | 使用獨立 route，例如 `/admin/settings/smart-videos` 或 `/admin/smart-videos` |
| React key | 不得用重複 `item.to` 當 key；若可行，改為 `key={item.id}` |
| nav item id | 每個 nav item 需有唯一 id |
| active 判斷 | `/admin/books` 只點亮書本列表，不點亮智能影音設定 |

### 4.4 搜尋指令

```bash
grep -R "智能影音" apps/AI-adm-D1/src -n
grep -R "smart-videos" apps/AI-adm-D1/src -n
grep -R "adminNav" apps/AI-adm-D1/src -n
grep -R "/admin/books" apps/AI-adm-D1/src -n
```

### 4.5 建議修正策略

1. 在 `adminNav.ts` 中為每個 item 補唯一 `id`。
2. `AdminSidebar.tsx` 使用 `item.id` 當 React key。
3. 書本列表 route 保持 `/admin/books`。
4. 智能影音設定改為獨立 route。
5. 若目前只有 per-book route `/admin/books/:bookId/smart-videos`，請建立一個全域 smart video index page 或導引頁，讓管理員先選書本。
6. Active matching 改成 exact 或明確判斷，避免重疊。

### 4.6 驗收

```bash
pnpm --filter AI-adm-D1 typecheck
pnpm --filter AI-adm-D1 build
```

瀏覽器驗收：

```text
1. 開啟 /admin/books，只亮「書本列表」。
2. 點「智能影音設定」，只亮「智能影音設定」。
3. Console 不再出現 duplicate key `/admin/books`。
4. 智能影音頁可進入，或至少顯示明確空狀態 / 選書提示。
```

### 4.7 報告檔

請新增：

```text
docs/r2/AI-SmartBook-R2-agentA-admin-nav-smart-video-route-report-20260624.md
```

### 4.8 Commit message

```bash
git commit -m "fix(r2): resolve admin nav smart video route conflict"
```

---

## 5. Agent B：Note / PDF Toggle Settings API 與後台保存

### 5.1 工作分支

```bash
git fetch origin
git checkout fix/r2-smart-features-final-integration
git pull origin fix/r2-smart-features-final-integration
git checkout -b fix/r2-note-pdf-toggle-settings-api
```

若分支已存在：

```bash
git checkout fix/r2-note-pdf-toggle-settings-api
git pull origin fix/r2-note-pdf-toggle-settings-api
```

### 5.2 任務目標

建立可持久化的筆記功能開關與 PDF 工具開關設定，並完成後台讀取 / 保存。

Agent B 負責「設定來源與後台保存」，不負責學生端 toolbar 實際套用。

### 5.3 建議 schema

請依現有 schema 命名風格實作，可放在 appearance settings 中，或新增 feature settings schema。

建議資料結構：

```ts
type NoteFeatureSettings = {
  smartNotesEnabled: boolean;
  pasteBackNotesEnabled: boolean;
  pasteBackAiNotesEnabled: boolean;
  screenshotAskAiEnabled: boolean;
};

type PdfToolSettings = {
  highlightEnabled: boolean;
  penEnabled: boolean;
  lineEnabled: boolean;
  rectangleEnabled: boolean;
  circleEnabled: boolean;
  stickyNoteEnabled: boolean;
  eraserEnabled: boolean;
};
```

預設值：全部 `true`，避免破壞既有學生端功能。

### 5.4 必做項目

| 項目 | 要求 |
|---|---|
| schema | 補 note feature / PDF tool toggle 欄位 |
| admin GET API | 後台可讀取設定 |
| admin PUT/PATCH API | 後台可保存設定 |
| persistence | 重整後仍保留設定 |
| default fallback | 無資料時全部開啟 |
| admin UI | 後台可切換 4 個筆記開關與 7 個 PDF 工具開關 |
| report | 清楚列出 API route 與 payload |

### 5.5 後台 UI 開關

筆記功能開關：

```text
智能筆記
貼回筆記
貼回 AI 筆記
截圖問 AI
```

PDF 工具開關：

```text
螢光筆
筆
直線
矩形
圓形
便利貼
橡皮擦
```

### 5.6 建議 API contract

Agent B 需產出明確 contract，供 Agent C 使用。

建議：

```http
GET /api/admin/settings/reader-features
PUT /api/admin/settings/reader-features
GET /api/student/settings/reader-features
```

若採用既有 appearance API，請在 report 中明確標示實際 route。

回傳概念：

```json
{
  "noteFeatures": {
    "smartNotesEnabled": true,
    "pasteBackNotesEnabled": true,
    "pasteBackAiNotesEnabled": true,
    "screenshotAskAiEnabled": true
  },
  "pdfTools": {
    "highlightEnabled": true,
    "penEnabled": true,
    "lineEnabled": true,
    "rectangleEnabled": true,
    "circleEnabled": true,
    "stickyNoteEnabled": true,
    "eraserEnabled": true
  }
}
```

### 5.7 驗收

```bash
pnpm --filter AI-adm-D1 typecheck
pnpm --filter AI-adm-D1 build
```

API 驗收：

```bash
curl -s http://127.0.0.1:4300/api/admin/settings/reader-features | head -c 1000
```

保存驗收：

```text
1. 關閉智能筆記。
2. 重新整理後台。
3. 智能筆記仍保持關閉。
4. 重新打開後，刷新仍保持開啟。
```

### 5.8 報告檔

請新增：

```text
docs/r2/AI-SmartBook-R2-agentB-note-pdf-toggle-settings-api-report-20260624.md
```

### 5.9 Commit message

```bash
git commit -m "fix(r2): add persistent note and PDF tool toggles"
```

---

## 6. Agent C：Student Reader / PdfReaderToolbar 套用設定與驗收

### 6.1 工作分支

```bash
git fetch origin
git checkout fix/r2-smart-features-final-integration
git pull origin fix/r2-smart-features-final-integration
git checkout -b fix/r2-student-reader-toggle-consumption
```

若分支已存在：

```bash
git checkout fix/r2-student-reader-toggle-consumption
git pull origin fix/r2-student-reader-toggle-consumption
```

### 6.2 任務目標

讓學生端 Reader 與 PDF toolbar 依設定顯示 / 隱藏功能。

Agent C 負責學生端 consumption，不負責後台保存 UI。若 Agent B API 尚未完成，請先用安全 fallback 與 contract adapter，不要硬編寫死。

### 6.3 必做項目

| 項目 | 要求 |
|---|---|
| student settings fetch | 讀取 reader feature settings |
| fallback | API 不存在或失敗時，全部工具預設開啟 |
| Reader UI | 智能筆記 / 截圖問 AI 等入口依設定顯示 |
| PdfReaderToolbar | 螢光筆、筆、直線、矩形、圓形、便利貼、橡皮擦依設定顯示 |
| no crash | 設定缺欄位不可白畫面 |
| report | 列出學生端實際套用檔案與 fallback 策略 |

### 6.4 注意邊界

Agent C 不要修改：

```text
adminNav.ts
AdminSidebar.tsx
admin settings persistence schema
server Google knowledge service
Reader TOC fallback
knowledge100 generation logic
```

若需要 shared type，但 Agent B 分支尚未合併，請在報告中標示需整合時對齊。

### 6.5 建議搜尋

```bash
grep -R "PdfReaderToolbar" apps/AI-Stu-R1/src -n
grep -R "智能筆記" apps/AI-Stu-R1/src -n
grep -R "截圖問" apps/AI-Stu-R1/src -n
grep -R "螢光筆" apps/AI-Stu-R1/src -n
grep -R "eraser" apps/AI-Stu-R1/src -n
```

### 6.6 驗收

```bash
pnpm --filter AI-Stu-R1 typecheck
pnpm --filter AI-Stu-R1 build
```

學生端手動驗收：

```text
1. noteFeatures.smartNotesEnabled=false 時，智能筆記入口消失或 disabled。
2. noteFeatures.screenshotAskAiEnabled=false 時，截圖問 AI 消失或 disabled。
3. pdfTools.highlightEnabled=false 時，PDF toolbar 不顯示螢光筆。
4. pdfTools.eraserEnabled=false 時，PDF toolbar 不顯示橡皮擦。
5. API 失敗時，學生端不白畫面，工具預設全部開啟。
```

### 6.7 報告檔

請新增：

```text
docs/r2/AI-SmartBook-R2-agentC-student-reader-toggle-consumption-report-20260624.md
```

### 6.8 Commit message

```bash
git commit -m "fix(r2): apply reader feature toggles in student UI"
```

---

## 7. 三分支整合順序

三個 agent 完成後，建立或回到整合分支：

```bash
git fetch origin
git checkout fix/r2-smart-features-final-integration
git pull origin fix/r2-smart-features-final-integration
```

建議合併順序：

```bash
git merge --no-ff origin/fix/r2-admin-nav-smart-video-route
git merge --no-ff origin/fix/r2-note-pdf-toggle-settings-api
git merge --no-ff origin/fix/r2-student-reader-toggle-consumption
```

整合時的保留原則：

| Conflict 區域 | 保留原則 |
|---|---|
| adminNav / AdminSidebar | Agent A 優先 |
| settings schema / admin API / admin UI | Agent B 優先 |
| student Reader / PdfReaderToolbar | Agent C 優先 |
| shared type | 以 Agent B contract 為準，Agent C 對齊 |

---

## 8. 整合後必跑驗證

```bash
pnpm --filter AI-adm-D1 typecheck
pnpm --filter AI-adm-D1 build
pnpm --filter AI-Stu-R1 typecheck
pnpm --filter AI-Stu-R1 build
```

```bash
git status
git ls-files | grep -E '(^|/)\.env(\.|$)' || true
```

瀏覽器驗收：

```text
1. /admin/books 只亮書本列表。
2. 智能影音設定 route 不與 /admin/books 重複。
3. Console 無 duplicate key `/admin/books`。
4. 後台筆記功能開關可保存。
5. 後台 PDF 工具開關可保存。
6. 學生端 Reader 依開關顯示 / 隱藏功能。
7. 學生端 PDF toolbar 依開關顯示 / 隱藏工具。
```

---

## 9. 服務重啟要求

只讀 MD 不需要重啟。

程式修正後建議重啟：

```bash
pnpm --filter AI-adm-D1 dev -- --host 0.0.0.0
pnpm --filter AI-Stu-R1 dev -- --host 0.0.0.0
```

若有獨立後端 server process，修改 API route / schema / env 後必須重啟後端。

原因：本批任務會修改 nav、route、server API、shared schema、student reader consumption。若不重啟，容易看到舊 Vite HMR 或舊 server 狀態。

---

## 10. 最終報告格式

每個 agent 請用繁體中文回報：

```md
## Agent Report

### Status
- success:
- failure:
- blocker:
- permission-halt:

### Git
- branch:
- commit SHA:
- changed files:

### Implemented Scope
- item 1:
- item 2:

### Verification
- typecheck:
- build:
- runtime probe:
- browser check:
- env tracking:

### Remaining Risks
- risk 1:

### Final Decision
- ready for integration / not ready:
- reason:
```

---

## 11. 結論

本文件將目前剩餘問題拆成三個可並行 agent：

```text
Agent A：先修 admin nav duplicate key 與智能影音 route
Agent B：建立 note / PDF toggle 的 schema、API、後台保存
Agent C：學生端 Reader / PdfReaderToolbar 套用 toggle 設定
```

三個分支完成後再回到 `fix/r2-smart-features-final-integration` 整合。不得直接合併到主分支。
