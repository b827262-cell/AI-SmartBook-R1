# AI-SmartBook-R2｜筆記功能介面開關與 Admin Nav Bug Codex 任務

日期：2026-06-24  
Repository：`b827262-cell/AI-SmartBook-R1`  
目標分支：`fix/r2-smart-features-final-integration`  
Executor：Codex / Agent 3  
目的：修正後台側邊欄 duplicate `/admin/books` key 問題，並實測筆記功能開關與 PDF 工具開關是否已真正套用至學生端 Reader。

---

## 1. 任務背景

使用者在後台實測時發現：

```text
URL：127.0.0.1:5174/admin/books
頁面：智能書本管理
Console warning：Encountered two children with the same key, `/admin/books`
```

同時 UI 行為異常：

```text
點選「書本列表」時，「智能影音設定」也一起變成 active。
因此無法正確進入智能影音設定內容。
```

此外，使用者詢問「筆記功能介面開關」是否可以實測。本任務需補上筆記功能開關的 runtime 驗收項目，確認後台開關是否真正影響學生端 Reader。

---

## 2. 本任務範圍

### 2.1 必修 Bug

1. 修正 admin sidebar duplicate `/admin/books` key。
2. 修正「書本列表」與「智能影音設定」同時 active 問題。
3. 智能影音設定需有獨立 route，不可共用 `/admin/books`。

### 2.2 必測功能

1. 筆記功能開關是否存在。
2. 筆記功能開關是否可保存。
3. 筆記功能開關是否影響學生端 Reader。
4. PDF 小工具開關是否可保存。
5. PDF 小工具開關是否影響學生端 PDF toolbar。

---

## 3. 啟動指令

請 Codex 執行：

```bash
git fetch origin
git checkout fix/r2-smart-features-final-integration
git pull origin fix/r2-smart-features-final-integration
cat docs/r2/AI-SmartBook-R2-note-feature-toggle-runtime-test-codex-task-20260624.md
```

---

## 4. Admin Nav duplicate key 修正

### 4.1 搜尋指令

```bash
grep -R "智能影音" apps/AI-adm-D1/src -n
grep -R "smart-videos" apps/AI-adm-D1/src -n
grep -R "adminNav" apps/AI-adm-D1/src -n
grep -R "/admin/books" apps/AI-adm-D1/src -n
```

### 4.2 修正要求

| 項目 | 要求 |
|---|---|
| 書本列表 | 保留 `/admin/books` |
| 智能影音設定 | 不得使用 `/admin/books` |
| 智能影音設定 route | 改成獨立 route，例如 `/admin/settings/smart-videos` 或 `/admin/smart-videos` |
| React key | 每個 nav item 必須唯一，不得用重複 path 當 key |
| active 判斷 | 點書本列表時不得同時點亮智能影音設定 |

### 4.3 建議 active 判斷

若目前使用 `startsWith`，請調整為：

```ts
const isActive = item.exact
  ? pathname === item.path
  : pathname === item.path || pathname.startsWith(`${item.path}/`);
```

或讓 `/admin/books` 設定為 exact match。

### 4.4 驗收

| 操作 | 預期 |
|---|---|
| 開啟 `/admin/books` | 只亮「書本列表」 |
| 點選智能影音設定 | 只亮「智能影音設定」 |
| DevTools console | 不再出現 duplicate key `/admin/books` |
| 智能影音 route | 可進入智能影音頁或顯示明確空狀態 |

---

## 5. 筆記功能開關實測

### 5.1 應檢查的後台開關

請確認後台是否有以下筆記功能開關：

| 開關 | 預期用途 |
|---|---|
| 智能筆記 | 控制學生端智能筆記入口或功能 |
| 貼回筆記 | 控制筆記貼回原文位置功能 |
| 貼回 AI 筆記 | 控制 AI 筆記貼回原文位置功能 |
| 截圖問 AI | 控制學生端截圖問 AI 功能 |

請先搜尋：

```bash
grep -R "智能筆記" apps/AI-adm-D1/src apps/AI-Stu-R1/src packages -n
grep -R "貼回筆記" apps/AI-adm-D1/src apps/AI-Stu-R1/src packages -n
grep -R "截圖問 AI" apps/AI-adm-D1/src apps/AI-Stu-R1/src packages -n
grep -R "note" apps/AI-adm-D1/src apps/AI-Stu-R1/src packages -n | head -n 100
```

### 5.2 應檢查的 PDF 小工具開關

請確認後台是否有以下 PDF toolbar 工具開關：

| 工具 | 預期用途 |
|---|---|
| 螢光筆 | 控制學生端 PDF 工具列螢光筆 |
| 筆 | 控制學生端筆工具 |
| 直線 | 控制學生端直線工具 |
| 矩形 | 控制學生端矩形工具 |
| 圓形 | 控制學生端圓形工具 |
| 便利貼 | 控制學生端便利貼工具 |
| 橡皮擦 | 控制學生端橡皮擦工具 |

搜尋：

```bash
grep -R "螢光筆" apps/AI-adm-D1/src apps/AI-Stu-R1/src packages -n
grep -R "便利貼" apps/AI-adm-D1/src apps/AI-Stu-R1/src packages -n
grep -R "橡皮擦" apps/AI-adm-D1/src apps/AI-Stu-R1/src packages -n
grep -R "pdf" apps/AI-adm-D1/src apps/AI-Stu-R1/src packages -n | head -n 100
```

---

## 6. 筆記開關 runtime 驗收流程

### 6.1 後台保存測試

請在後台執行：

1. 關閉「智能筆記」。
2. 重新整理後台頁面。
3. 確認「智能筆記」仍保持關閉。
4. 開啟「智能筆記」。
5. 重新整理後台頁面。
6. 確認狀態仍保持開啟。

若目前沒有 UI，請用 API 測試並在報告中標示 UI not wired。

### 6.2 學生端 Reader 套用測試

請在學生端 Reader 驗證：

| 後台設定 | 學生端預期 |
|---|---|
| 智能筆記關閉 | 學生端智能筆記入口消失或 disabled |
| 智能筆記開啟 | 學生端智能筆記入口恢復 |
| 截圖問 AI 關閉 | 學生端截圖問 AI 消失或 disabled |
| 截圖問 AI 開啟 | 學生端截圖問 AI 恢復 |

若學生端未套用，請回報：

```text
Bug: Note feature toggles are visible in admin but not applied in student reader.
```

---

## 7. PDF 小工具 runtime 驗收流程

### 7.1 後台保存測試

1. 關閉「螢光筆」。
2. 重新整理後台。
3. 確認「螢光筆」仍為關閉。
4. 再開啟「螢光筆」。
5. 重新整理後台。
6. 確認狀態仍為開啟。

### 7.2 學生端 PDF toolbar 套用測試

| 後台設定 | 學生端預期 |
|---|---|
| 螢光筆關閉 | PDF toolbar 不顯示螢光筆 |
| 橡皮擦關閉 | PDF toolbar 不顯示橡皮擦 |
| 便利貼關閉 | PDF toolbar 不顯示便利貼 |
| 全部開啟 | PDF toolbar 顯示所有允許工具 |

若未套用，請回報：

```text
Bug: PDF tool toggles are visible in admin but not applied in student reader toolbar.
```

---

## 8. API / 程式層確認

請確認是否存在以下能力：

| 能力 | 檢查 |
|---|---|
| 後台讀取設定 | admin API 可讀取 note feature settings |
| 後台保存設定 | admin API 可保存 note feature settings |
| 學生端讀取設定 | student API 或 bootstrap settings 可讀取 |
| Reader 套用設定 | Reader / toolbar 依設定顯示或隱藏 |
| fallback | API 失敗時不白畫面，使用安全預設值 |

若缺其中一層，請修正或產出 blocker report。

---

## 9. 驗證指令

### 9.1 Typecheck / Build

```bash
pnpm --filter AI-adm-D1 typecheck
pnpm --filter AI-adm-D1 build
pnpm --filter AI-Stu-R1 typecheck
pnpm --filter AI-Stu-R1 build
```

### 9.2 Env / secret check

```bash
git status
git ls-files | grep -E '(^|/)\.env(\.|$)' || true
```

不得提交：

```text
.env
任何 API key
DB / sqlite / dump
logs
.claude/
apps/AI-adm-D1/data/
runtime upload data
temporary browser test folder
```

### 9.3 Console check

開啟瀏覽器 DevTools console，確認：

```text
不再出現 duplicate key `/admin/books`
```

---

## 10. 是否需要重啟服務

### 10.1 修正程式後需要重啟

如果只讀取任務 MD，不需要重啟。

若有修改以下項目，建議重啟：

| 修改內容 | 是否需要重啟 |
|---|---|
| adminNav / App.tsx / React route | 前端 Vite 通常 HMR 可更新，但建議重啟 AI-adm-D1 dev server |
| server/index.ts / API route | 需要重啟後端 server |
| packages schema / shared type | 建議重啟前後端 |
| env / API key | 必須重啟後端 server |
| build 後部署 | 必須重新 build 並重啟服務 |

### 10.2 建議重啟流程

若本機 dev：

```bash
# 停掉舊的 AI-adm-D1 dev process 後重開
pnpm --filter AI-adm-D1 dev -- --host 0.0.0.0

# 若學生端也要測 Reader
pnpm --filter AI-Stu-R1 dev -- --host 0.0.0.0
```

若有獨立後端 server process，請停止舊 process 並重新啟動該 server。

### 10.3 為何建議重啟

本次問題涉及：

```text
admin route
sidebar nav config
API route
student reader settings consumption
```

這些若只靠瀏覽器重新整理，可能仍吃到舊 Vite HMR 狀態或舊 server process。修正後建議重啟前後端，避免誤判。

---

## 11. 最終報告格式

請 Codex 用繁體中文輸出：

```md
## R2 Admin Nav and Note Toggle Runtime Test Report

### Status
- success:
- failure:
- blocker:
- permission-halt:

### Git
- branch:
- commit SHA:
- changed files:

### Admin Nav Bug
- duplicate `/admin/books` key fixed:
- book list active only:
- smart video active only:
- console warning removed:

### Note Feature Toggles
- admin UI exists:
- settings persist after refresh:
- student reader applies settings:
- gaps:

### PDF Tool Toggles
- admin UI exists:
- settings persist after refresh:
- student PDF toolbar applies settings:
- gaps:

### Verification
- AI-adm-D1 typecheck:
- AI-adm-D1 build:
- AI-Stu-R1 typecheck:
- AI-Stu-R1 build:
- env tracking:
- browser console:
- runtime probes:

### Service Restart
- restarted admin frontend:
- restarted backend server:
- restarted student frontend:

### Final Decision
- can continue final verification / cannot continue:
- reason:
```

---

## 12. 建議 commit message

若修正 admin nav 並完成開關驗證：

```bash
git commit -m "fix(r2): resolve admin nav and verify note feature toggles"
```

若只完成文件與測試報告：

```bash
git commit -m "docs(r2): add note feature toggle runtime test task"
```
