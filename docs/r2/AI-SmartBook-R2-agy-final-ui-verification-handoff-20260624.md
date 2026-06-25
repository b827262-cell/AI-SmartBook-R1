# AI-SmartBook-R2｜AGY 最終 UI / Runtime 驗收交接文件

日期：2026-06-24  
Repository：`b827262-cell/AI-SmartBook-R1`  
驗收目標分支：`fix/r2-smart-features-final-integration`  
驗收角色：AGY  
目的：針對三分支整合後的後台導覽、智能影音入口、閱讀器功能開關、學生端 Reader / PDF toolbar 套用進行最終驗收。

---

## 1. 背景與流程摘要

本輪工作源自使用者在後台實測時發現：

```text
Encountered two children with the same key, `/admin/books`.
```

以及 UI 行為異常：

```text
點選「書本列表」時，「智能影音設定」也一起 active，導致看不到智能影音內容。
```

後續又確認「筆記功能開關 / PDF 工具開關」尚未形成完整可驗證機制，因此拆為三條工作線加速處理。

---

## 2. 前置任務文件與提交

### 2.1 三 Agent 加速任務文件

```text
docs/r2/AI-SmartBook-R2-three-agent-admin-note-toggle-acceleration-order-20260624.md
```

Commit：

```text
f08c0aa65795a34a04b512ff2a5dbf4b30c05a0e
```

Commit message：

```text
docs(r2): add three-agent admin note toggle acceleration order
```

### 2.2 Codex 任務文件

```text
docs/r2/AI-SmartBook-R2-note-feature-toggle-runtime-test-codex-task-20260624.md
```

Commit：

```text
5487f5da196a5a776cf284c00cdf598a4fd53aa5
```

Commit message：

```text
docs(r2): add note feature toggle runtime test task
```

### 2.3 Admin Nav Bug 文件

```text
docs/r2/AI-SmartBook-R2-admin-nav-duplicate-books-key-bug-20260624.md
```

Commit：

```text
de5f102705186d590202cc47eef7f2573c649a00
```

Commit message：

```text
docs(r2): add admin nav duplicate books key bug report
```

---

## 3. 三 Agent 分支與實作摘要

### 3.1 Agent A：Admin Nav / 智能影音 Route

Branch：

```text
fix/r2-admin-nav-smart-video-route
```

執行狀態：AGY 在 final integration 時發現遠端一開始缺少 Agent A 實作分支，已代執行並推送。

主要修正：

1. 修正 `adminNav.ts`：為 nav item 加入唯一 `id`。
2. 修正 `AdminSidebar.tsx`：改用 `key={item.id}`，避免 React duplicate key。
3. 修正「書本列表」與「智能影音設定」共用 `/admin/books` 造成的 active 重疊。
4. 修正 `App.tsx` route 權重：將 `/admin/books/:bookId/smart-videos` 移到 wildcard route 之前，避免被攔截。

### 3.2 Agent B：Note / PDF Toggle Settings API

Branch：

```text
fix/r2-note-pdf-toggle-settings-api
```

Commits：

```text
f161d76：實作
e74b89c：報告
```

狀態：Agent B 任務完成，ready for integration。

後端實作摘要：

1. 在 `server/index.ts` 建立 `ReaderFeatureSettings` 型別。
2. 包含 `NoteFeatureSettings` 4 欄：
   - `smartNotesEnabled`
   - `pasteBackNotesEnabled`
   - `pasteBackAiNotesEnabled`
   - `screenshotAskAiEnabled`
3. 包含 `PdfToolSettings` 7 欄：
   - `highlightEnabled`
   - `penEnabled`
   - `lineEnabled`
   - `rectangleEnabled`
   - `circleEnabled`
   - `stickyNoteEnabled`
   - `eraserEnabled`
4. 儲存於 `app_settings`：
   - key：`reader_feature_settings`
   - value：JSON
   - 無 DB migration
5. 預設全部為 `true`，避免破壞既有學生端功能。
6. 缺欄位時自動補齊預設值。
7. API：
   - `GET /api/admin/settings/reader-features`
   - `PUT /api/admin/settings/reader-features`，需 auth guard
   - `GET /api/student/settings/reader-features`，學生端 read-only

### 3.3 Agent C：Student Reader / PdfReaderToolbar Consumption

Branch：

```text
fix/r2-student-reader-toggle-consumption
```

狀態：已被 AGY 合併進 final integration。

預期整合內容：

1. 學生端 Reader 讀取 reader feature settings。
2. API 失敗或缺欄位時使用 safe fallback：全部功能開啟。
3. Reader 入口依 note feature settings 顯示 / 隱藏或 disabled。
4. `PdfReaderToolbar.tsx` 依 PDF tool settings 顯示 / 隱藏工具。

---

## 4. Final Integration 整合摘要

整合分支：

```text
fix/r2-smart-features-final-integration
```

已合併分支：

```text
origin/fix/r2-admin-nav-smart-video-route
origin/fix/r2-note-pdf-toggle-settings-api
origin/fix/r2-student-reader-toggle-consumption
```

整合處理：

1. Agent A 導覽及 route 修復已整合。
2. Agent B 後台設定 API 與持久化已整合。
3. Agent C 學生端 Reader / toolbar 套用已整合。
4. `App.tsx` 衝突已手動解決：保留智能影音 route 與 ReaderFeaturesPage route。
5. `adminNav.ts` 衝突已手動解決：保留 `id` 設計，並為 `閱讀器功能開關` 加入唯一 id。

Final integration report：

```text
docs/r2/AI-SmartBook-R2-final-integration-report-20260624.md
```

---

## 5. AGY 驗收前準備

請 AGY 在驗收機器上執行：

```bash
git fetch origin
git checkout fix/r2-smart-features-final-integration
git pull origin fix/r2-smart-features-final-integration
```

確認最新 commit 包含 final integration 與本 handoff 文件。

---

## 6. 服務重啟要求

本輪整合修改了以下類型：

```text
adminNav.ts
AdminSidebar.tsx
App.tsx route
server/index.ts API
student Reader / PdfReaderToolbar
schema / settings handling
```

因此 AGY 驗收前需要重啟服務。

### 6.1 後台前端

```bash
pnpm --filter AI-adm-D1 dev -- --host 0.0.0.0
```

### 6.2 學生端前端

```bash
pnpm --filter AI-Stu-R1 dev -- --host 0.0.0.0
```

### 6.3 後端 server

若後端 server 是獨立 process，請停止舊 process 並重新啟動，確保 `server/index.ts` 與 API route 已載入最新程式。

---

## 7. 必跑靜態驗證

```bash
pnpm --filter AI-adm-D1 typecheck
pnpm --filter AI-adm-D1 build
pnpm --filter AI-Stu-R1 typecheck
pnpm --filter AI-Stu-R1 build
```

若 workspace 或 packages 有受影響，請補跑相關 package typecheck。

---

## 8. Git / Secret / Env 驗證

```bash
git status
git ls-files | grep -E '(^|/)\.env(\.|$)' || true
```

AGY 需確認：

1. `.env` 未被追蹤。
2. 無 API key、DB dump、logs、runtime upload data 被提交。
3. 報告文件不包含實際 secret。
4. 工作樹為乾淨狀態，或明確說明未提交檔案。

---

## 9. Admin Nav 驗收

### 9.1 Duplicate key 驗收

開啟後台：

```text
/admin/books
```

預期：

```text
Console 不再出現 duplicate key `/admin/books`
```

### 9.2 Active 狀態驗收

| 操作 | 預期 |
|---|---|
| 點選「書本列表」 | 只有「書本列表」 active |
| 點選「智能影音設定」或進入智能影音頁 | 只有對應智能影音項目 active |
| 直接開 `/admin/books` | 不會同時點亮智能影音設定 |
| 直接開 `/admin/books/:bookId/smart-videos` | 不會被 `/admin/books` 或 wildcard route 攔截 |

---

## 10. 智能影音 Route 驗收

請使用實際 bookId 測試：

```text
/admin/books/<bookId>/smart-videos
```

預期：

1. 可以進入智能影音管理頁。
2. 不會回到書本管理列表。
3. 不會被 BookDetail 或 wildcard route 攔截。
4. 若沒有資料，應顯示空狀態，不應白畫面。

API smoke：

```bash
curl -i http://127.0.0.1:4300/api/admin/books/<bookId>/smart-videos
```

預期：

```text
HTTP 200 / 401 / 403 均需依登入與 auth guard 判斷。
若登入狀態下應正常取得資料或空陣列。
```

---

## 11. Reader Feature Settings API 驗收

### 11.1 Admin GET

```bash
curl -i http://127.0.0.1:4300/api/admin/settings/reader-features
```

預期：

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

若 admin API 有 auth guard，未登入 curl 回 401 / 403 可接受；請再用瀏覽器登入狀態驗證。

### 11.2 Student GET

```bash
curl -i http://127.0.0.1:4300/api/student/settings/reader-features
```

預期：

1. 學生端可 read-only 取得設定。
2. 無資料時回傳全部 true。
3. 缺欄位時自動補齊預設值。

### 11.3 Admin PUT

請用登入後台 UI 測試為主；若使用 API，需帶入正確 auth。

驗收：

1. 關閉一個 note feature。
2. 重新整理後台。
3. 該開關仍保持關閉。
4. 再打開，重新整理後仍保持開啟。

---

## 12. 後台 Reader Features Page 驗收

打開：

```text
/admin/settings/reader-features
```

預期可見：

### 12.1 筆記功能開關

```text
智能筆記
貼回筆記
貼回 AI 筆記
截圖問 AI
```

### 12.2 PDF 工具開關

```text
螢光筆
筆
直線
矩形
圓形
便利貼
橡皮擦
```

驗收：

1. 每個開關可切換。
2. 儲存後重新整理仍保留設定。
3. 無 UI 崩潰或白畫面。
4. 若 API 失敗，應有錯誤提示。

---

## 13. 學生端 Reader 套用驗收

請進入學生端 Reader，使用實際書籍測試。

### 13.1 筆記功能

| 後台設定 | 學生端預期 |
|---|---|
| `smartNotesEnabled=false` | 智能筆記入口消失或 disabled |
| `smartNotesEnabled=true` | 智能筆記入口恢復 |
| `screenshotAskAiEnabled=false` | 截圖問 AI 消失或 disabled |
| `screenshotAskAiEnabled=true` | 截圖問 AI 恢復 |
| `pasteBackNotesEnabled=false` | 貼回筆記功能消失或 disabled |
| `pasteBackAiNotesEnabled=false` | 貼回 AI 筆記功能消失或 disabled |

### 13.2 PDF toolbar

| 後台設定 | 學生端預期 |
|---|---|
| `highlightEnabled=false` | 不顯示螢光筆 |
| `penEnabled=false` | 不顯示筆 |
| `lineEnabled=false` | 不顯示直線 |
| `rectangleEnabled=false` | 不顯示矩形 |
| `circleEnabled=false` | 不顯示圓形 |
| `stickyNoteEnabled=false` | 不顯示便利貼 |
| `eraserEnabled=false` | 不顯示橡皮擦 |
| 全部 true | 所有允許工具恢復顯示 |

### 13.3 Fallback 驗收

模擬 student settings API 不可用或回傳缺欄位時：

預期：

```text
學生端不白畫面，功能預設全部開啟。
```

---

## 14. Regression 驗收

AGY 需確認本輪修正沒有破壞已完成項目：

1. `/admin/settings/ai` 仍可開啟。
2. `/admin/import/smart-solve` 仍可看到 knowledge point count 選項。
3. Knowledge 100 相關 UI / API 未被本輪修改破壞。
4. Reader TOC fallback 仍保留 `fallback_success` 或等效狀態。
5. Google knowledge generation service 未被誤改。
6. 學生端 `/books` 與 Reader 基本閱讀功能正常。

---

## 15. AGY 最終回報格式

請 AGY 產出繁體中文驗收報告，建議檔名：

```text
docs/r2/AI-SmartBook-R2-agy-final-ui-verification-report-20260624.md
```

報告格式：

```md
# AI-SmartBook-R2 AGY Final UI / Runtime Verification Report

## Status
- success:
- failure:
- blocker:
- permission-halt:

## Git
- repository:
- branch:
- current commit SHA:
- merged branches:
- changed files since previous verification:

## Static Verification
- AI-adm-D1 typecheck:
- AI-adm-D1 build:
- AI-Stu-R1 typecheck:
- AI-Stu-R1 build:
- env tracking:
- secret check:

## Admin Nav Verification
- duplicate `/admin/books` key warning removed:
- `/admin/books` active state:
- smart video route active state:
- smart video route not intercepted:

## Reader Feature Settings Verification
- admin GET:
- admin PUT:
- student GET:
- default all true:
- missing field fallback:
- persistence after refresh:

## Admin UI Verification
- `/admin/settings/reader-features` visible:
- note feature toggles visible:
- PDF tool toggles visible:
- save / reload behavior:

## Student Reader Verification
- smart notes toggle applied:
- screenshot ask AI toggle applied:
- paste back note toggles applied:
- PDF toolbar toggles applied:
- fallback behavior:

## Regression Verification
- AI settings page:
- smart solve page:
- knowledge100:
- Reader TOC fallback:
- Google knowledge generation service:
- student books / reader:

## Final Decision
- can merge / cannot merge:
- reason:
- required follow-up:
```

---

## 16. 最終判定標準

可以合併條件：

1. Console duplicate key warning 已消失。
2. 書本列表與智能影音不再同時 active。
3. 智能影音 per-book route 可正確開啟。
4. `/admin/settings/reader-features` 可開啟並保存設定。
5. `GET /api/student/settings/reader-features` 可取得設定。
6. 學生端 Reader / PDF toolbar 會依設定顯示 / 隱藏功能。
7. typecheck / build 通過。
8. 未提交 `.env` 或 secret。
9. 無重大 regression。

若任一核心條件未過，請標示 `cannot merge`，並列出 blocker。
