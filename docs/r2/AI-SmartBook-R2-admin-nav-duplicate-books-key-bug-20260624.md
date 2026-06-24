# AI-SmartBook-R2 Bug Report：Admin Nav duplicate `/admin/books` key

日期：2026-06-24  
Repository：`b827262-cell/AI-SmartBook-R1`  
建議修正分支：`fix/r2-smart-features-final-integration`  
回報來源：使用者後台實測截圖與 Chrome DevTools console warning

---

## 1. Bug 摘要

後台目前在 `/admin/books` 頁面出現 React warning：

```text
Encountered two children with the same key, `/admin/books`.
Keys should be unique so that components maintain their identity across updates.
Non-unique keys may cause children to be duplicated and/or omitted.
```

同時，左側選單出現異常：

- 點選「書本管理 / 書本列表」後，`智能影音設定` 也一起呈現 selected / active 狀態。
- 使用者因此無法正確進入或辨識「智能影音設定」內容。
- 目前畫面仍停留在 `/admin/books` 的智能書本管理列表。

---

## 2. 實測畫面

使用者畫面：

```text
URL：127.0.0.1:5174/admin/books
頁面：智能書本管理
左側選單：書本列表與智能影音設定同時呈現藍色 active 狀態
Console warning：Encountered two children with the same key, `/admin/books`
```

---

## 3. 初步判斷

此問題高度可能來自後台側邊欄 navigation 設定。

可能原因：

1. `adminNav` / sidebar nav config 中有兩個 item 共用同一個 `path` 或 `key`：

```text
/admin/books
```

2. React render list 時使用 `item.path` 當 key，導致兩個 nav item key 重複。
3. active 判斷可能使用 `pathname.startsWith(item.path)`，而 `智能影音設定` 也誤設為 `/admin/books`，造成兩個項目同時 active。
4. 智能影音應該使用獨立 route，例如：

```text
/admin/settings/smart-videos
/admin/smart-videos
/admin/books/:bookId/smart-videos
```

但目前可能被誤設為 `/admin/books`。

---

## 4. 建議檢查檔案

請 Codex / Agent 3 檢查：

```bash
grep -R "智能影音" apps/AI-adm-D1/src -n
grep -R "smart-videos" apps/AI-adm-D1/src -n
grep -R "adminNav" apps/AI-adm-D1/src -n
grep -R "path: '/admin/books'" apps/AI-adm-D1/src -n
grep -R 'path: "/admin/books"' apps/AI-adm-D1/src -n
```

可能相關檔案：

```text
apps/AI-adm-D1/src/adminNav.ts
apps/AI-adm-D1/src/App.tsx
apps/AI-adm-D1/src/components/AdminSidebar.tsx
apps/AI-adm-D1/src/pages/BooksPage.tsx
apps/AI-adm-D1/src/pages/SmartVideoSettingsPage.tsx
```

實際檔名請以專案為準。

---

## 5. 修正要求

### 5.1 nav key 必須唯一

若 sidebar render 使用 `key={item.path}`，請確保每個 nav item 的 `path` 唯一。

或改為：

```tsx
key={item.id}
```

並確保每個 nav item 有唯一 `id`。

### 5.2 智能影音設定不得使用 `/admin/books`

請將「智能影音設定」改成獨立 route，例如：

```text
/admin/settings/smart-videos
```

或依目前專案 route 命名改為：

```text
/admin/smart-videos
```

不可與「書本列表」共用：

```text
/admin/books
```

### 5.3 active 判斷需避免誤亮

若 active 判斷使用 `startsWith`，請避免 `/admin/books` 誤套到其他項目。

建議：

```ts
const isActive = item.exact
  ? pathname === item.path
  : pathname === item.path || pathname.startsWith(`${item.path}/`);
```

或者對 `/admin/books` 這類主路徑設 `exact: true`。

### 5.4 route 與頁面需一致

修正後請確認：

| 選單 | route | 預期頁面 |
|---|---|---|
| 書本列表 | `/admin/books` | 智能書本管理列表 |
| 智能影音設定 | `/admin/settings/smart-videos` 或實際專案路徑 | 智能影音設定頁 |

---

## 6. 驗收項目

### 6.1 Console warning

開啟 `/admin/books`，DevTools console 不應再出現：

```text
Encountered two children with the same key, `/admin/books`
```

### 6.2 UI active 狀態

| 操作 | 預期 |
|---|---|
| 點選書本列表 | 只有「書本列表」active |
| 點選智能影音設定 | 只有「智能影音設定」active |
| 直接輸入 `/admin/books` | 不會同時點亮智能影音設定 |
| 直接輸入智能影音 route | 不會同時點亮書本列表 |

### 6.3 route smoke test

依實際 route 調整：

```bash
curl -I http://127.0.0.1:5174/admin/books
curl -I http://127.0.0.1:5174/admin/settings/smart-videos
```

若 Vite fallback 回 200，仍需以瀏覽器確認頁面內容。

### 6.4 grep 驗證

確認 nav config 不存在兩個 `/admin/books` path：

```bash
grep -R "/admin/books" apps/AI-adm-D1/src -n
```

若仍有多筆，請確認是否為 route 定義、link 或文字說明，而不是重複 nav key。

---

## 7. 不可影響範圍

修正此 bug 時，不要改動：

```text
Google knowledge generation service
sentence-index parser
Reader TOC fallback
knowledge100 generation logic
.env / API Key 設定
```

本 bug 只針對 admin sidebar navigation key / route / active state。

---

## 8. 建議 commit message

```bash
git commit -m "fix(r2): resolve duplicate admin books nav key"
```

---

## 9. 最終回報格式

請用繁體中文回報：

```md
## Admin Nav Duplicate Key Bug Fix Report

### Status
- success:
- failure:
- blocker:
- permission-halt:

### Git
- branch:
- commit SHA:
- changed files:

### Fixed
- duplicate `/admin/books` key:
- smart video nav route:
- active state matching:

### Verification
- console warning removed:
- `/admin/books` only highlights book list:
- smart video route only highlights smart video setting:
- typecheck:
- build:

### Final Decision
- can continue final verification / cannot continue:
- reason:
```
