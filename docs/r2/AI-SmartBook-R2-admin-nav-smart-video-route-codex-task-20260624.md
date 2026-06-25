# AI-SmartBook-R2：管理後台智能影音設定導覽修正任務

## 任務背景
- 於 Admin Sidebar 中 `智能影音設定` 與 `書本列表` 同時使用 `/admin/books`，導致：
  1) 導航列 React `key` 重複
  2) 智能影音頁（實際路由 `/admin/books/:bookId/smart-videos`）不會被正確標示為 active

## 執行目的
- 消除重複 route key 警示
- 修正 `智能影音設定` 的 active 判斷，讓其在 `/admin/books/:bookId/smart-videos` 路徑下仍能正確高亮
- 保留既有 `/admin/books` 導航行為與其他項目功能

## 變更內容

### 1) 導航資料結構補強
- 檔案：`apps/AI-adm-D1/src/navigation/adminNav.ts`
- 變更：
  - 在 `AdminNavItem` 加入可選欄位 `isActivePath?: (pathname: string) => boolean`
  - 為 `智能影音設定` 指定自訂 active 判斷：
    - `^/admin/books/[^/]+/smart-videos`（比對子書本影音設定路徑）

### 2) Sidebar active 與 key 邏輯修正
- 檔案：`apps/AI-adm-D1/src/components/admin/AdminSidebar.tsx`
- 變更：
  - 引入 `useLocation` 取得目前 `pathname`
  - 將導覽項目 `key` 改為 `${item.label}-${item.to}`，避免 `/admin/books` 重複 key
  - `NavLink` 的 `className` 改為根據 `item.isActivePath`（若有）覆寫 active 判斷

## 檢核重點
1. `書本列表`（`/admin/books`）保持正常高亮與行為
2. 進入 `/admin/books/:bookId/smart-videos` 時：
   - `智能影音設定` 顯示為 active
   - 其他非子路由項目不會誤觸發 active
3. Sidebar 不再因 duplicate key 造成 React warning

## 相關執行指令
- `git status --short`
- `git diff -- apps/AI-adm-D1/src/navigation/adminNav.ts apps/AI-adm-D1/src/components/admin/AdminSidebar.tsx`

## 限制
- 本次未執行 build / test，僅完成路由導覽邏輯修正與文件化。

## 結果
- 已完成程式修正並產生本次任務紀錄 MD，待提交上傳 GitHub。
