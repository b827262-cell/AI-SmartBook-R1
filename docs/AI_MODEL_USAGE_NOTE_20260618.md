# AI 模型使用邊界備註：gpt-5.3-codex-spark XHigh 回歸案例

日期：2026-06-18  
專案：AI-SmartBook-R1  
案例頁面：`/admin/accounts` 後台帳戶管理表格  
紀錄目的：建立模型任務分工與風險邊界，避免小模型在 UI 結構任務中造成回歸。

---

## 1. 事件摘要

本次使用 `gpt-5.3-codex-spark XHigh` 處理後台 `/admin/accounts` 表格修正時，發生 UI 回歸。

原始需求包含：

1. 修正後台帳戶管理表格最右側按鍵被截斷，只剩藍色邊框的問題。
2. 將欄位名稱 `IP 位置` 改為 `裝置連線`。
3. 評估是否讓使用者可用滑鼠自行調整欄寬。

實際結果：

1. 可調欄寬功能沒有成功穩定落地。
2. 表格中多個欄位被刪除或沒有渲染。
3. 原本完整帳戶表格退化成只剩部分欄位。
4. 需要改由 Claude Sonnet 4.6 協助恢復。

結論：

> `gpt-5.3-codex-spark XHigh` 不適合處理涉及資料表欄位結構、React render map、colgroup、tbody/thead 對齊、互動式 UI 狀態保存的任務。

---

## 2. 原始欄位完整清單

`/admin/accounts` 表格應保留以下 13 欄，順序不可任意省略：

1. 編號
2. 學生名稱
3. 登入方式
4. 作業系統
5. 裝置類型
6. 瀏覽器
7. IP 位址
8. 裝置連線
9. 風險標記
10. 封鎖狀態
11. 最後上線時間
12. 目前狀態
13. 管理

注意：

- `IP 位置` 應改名為 `裝置連線`。
- 只改顯示名稱，不改 API、DB schema、session data、account logic。
- `thead` 與 `tbody` 欄位數必須一致。
- 若使用 `columns` array、`colgroup` 或 render map，必須確認 13 欄全部存在。

---

## 3. 本次錯誤研判

這次小模型可能改壞的位置包括：

- `columns` array
- `<thead>` 欄位清單
- `<tbody>` row cell render
- `<colgroup>` 欄位寬度設定
- CSS `overflow` / `width` / `max-width`
- table layout fixed / scroll wrapper
- localStorage 欄寬狀態

表格類 UI 的風險在於：

- 表頭少一欄會造成資料對不齊。
- row render 少一個 cell 會造成資料消失。
- `colgroup` 欄位數不一致會讓欄寬行為異常。
- `overflow: hidden` 或欄寬壓縮會造成最右側操作按鈕被裁切。
- 互動式 resize 若沒有完整測試，容易讓欄位消失或變成 width: 0。

---

## 4. gpt-5.3-codex-spark XHigh 適合任務

建議定位：**低風險執行型模型**。

適合交付：

- `rg` / `grep` 找檔案
- 看 log
- 找錯字
- 單純改顯示文字
- 小型 CSS 修補
- 新增註解
- 補簡單型別
- 修單一 `if` 條件
- 整理 Markdown
- 產生測試指令
- 跑 `build` / `lint`
- 產出 `git diff` 摘要
- 檢查檔案是否存在
- 比對欄位名稱是否出現

範例可交付任務：

```text
Find all files related to /admin/accounts. Do not modify files. Only report the paths and suspicious CSS/table layout code.
```

```text
Rename the visible column label from "IP 位置" to "裝置連線". Only change display text. Do not change API fields, schema, or render structure.
```

```text
Run pnpm build and summarize the error output. Do not modify files.
```

---

## 5. 不建議交給 gpt-5.3-codex-spark 的任務

避免交付：

- 表格 columns 重構
- React `map` render 結構改造
- `thead` / `tbody` / `colgroup` 對齊
- 可拖曳欄寬
- sticky column
- 複雜 RWD
- 多欄位資料表 UI
- 涉及 localStorage 狀態保存的互動功能
- 跨檔案 UI 結構調整
- API response 與前端欄位重新對應
- 會影響既有資料顯示完整性的任務

這類任務建議交給：

- Claude Sonnet 4.6
- Claude Opus 4.8
- GPT-5.5 High / XHigh
- 其他具備較強架構穩定性與回歸意識的模型

---

## 6. 使用方式：模型任務分工

### 6.1 小模型使用方式

使用 `gpt-5.3-codex-spark XHigh` 時，應限制為「查找、確認、局部修正」。

建議指令格式：

```text
You are doing an inspection-only task.
Do not modify files.
Find the files related to [target feature], summarize the current implementation, and list risks.
```

或：

```text
Make a minimal one-line text change only.
Do not refactor.
Do not change component structure.
Do not change API/data logic.
After the change, show the exact diff.
```

### 6.2 中高階模型使用方式

遇到以下關鍵字時，應提高模型等級：

- table structure
- columns array
- render map
- colgroup
- resizable column
- sticky column
- RWD layout
- localStorage UI state
- regression repair
- restore missing fields
- admin data table

建議由高階模型先寫規格，再讓執行模型做極小步修改。

---

## 7. 表格修正任務標準流程

任何表格 UI 修正，必須遵守以下流程。

### Step 1：先列出欄位清單

修正前必須列出：

- 欄位名稱
- 欄位順序
- 對應資料來源
- 是否為操作欄位
- 是否允許省略

### Step 2：確認 `thead` 與 `tbody`

必須檢查：

- 表頭欄位數
- row cell 數量
- 欄位順序
- 是否有條件 render 導致欄位缺失

### Step 3：只改一個問題

不要同時做：

- 欄位恢復
- 可調欄寬
- sticky 欄
- RWD 改版
- localStorage 保存

每次只處理一個問題。

### Step 4：截圖驗收

驗收情境：

1. 正常桌面寬度
2. Chrome DevTools dock 在右側
3. 窄視窗寬度
4. 橫向捲動到底
5. 最右側管理按鈕完整可用

### Step 5：欄位完整性驗收

`/admin/accounts` 必須看到或可水平捲動看到全部 13 欄：

```text
編號 / 學生名稱 / 登入方式 / 作業系統 / 裝置類型 / 瀏覽器 / IP 位址 / 裝置連線 / 風險標記 / 封鎖狀態 / 最後上線時間 / 目前狀態 / 管理
```

---

## 8. Claude Sonnet 4.6 修復指令範本

```text
Please revert and repair the /admin/accounts table regression.

The previous attempt to implement resizable columns using gpt-5.3-codex-spark XHigh broke the table and removed several columns.

Priority:
1. Restore the full accounts table columns.
2. Do not keep the resizable-column feature for now.
3. Keep only a safe horizontal scroll wrapper.
4. Keep the column rename: "IP 位置" must be "裝置連線".
5. Do not change API behavior, session data, schema, or account logic.

Required columns in exact order:
1. 編號
2. 學生名稱
3. 登入方式
4. 作業系統
5. 裝置類型
6. 瀏覽器
7. IP 位址
8. 裝置連線
9. 風險標記
10. 封鎖狀態
11. 最後上線時間
12. 目前狀態
13. 管理

Acceptance:
- All 13 columns render.
- thead and tbody cell counts match.
- The table scrolls horizontally when needed.
- The 管理 / 封鎖 button is not clipped.
- pnpm build passes.
```

---

## 9. Codex Spark 安全使用範本

### 9.1 查找檔案

```text
Inspection only. Do not modify files.
Find all files related to /admin/accounts and the admin accounts table layout.
Return:
1. File paths
2. Relevant components
3. Relevant CSS selectors
4. Possible cause of right-side button clipping
```

### 9.2 改欄位名稱

```text
Make a minimal display-text-only change.
Rename the column header "IP 位置" to "裝置連線" on /admin/accounts.
Do not change API fields, database schema, data mapping, table structure, or CSS.
Show the exact diff after editing.
```

### 9.3 跑驗證

```text
Run the relevant validation commands for the admin app.
Do not modify files.
Report:
1. Command executed
2. Success/failure
3. Error summary if failed
4. Suggested next step
```

---

## 10. 後續規則

1. 小模型先做「查找」再做「修改」。
2. 表格 UI 不允許一次做大改。
3. 互動式功能必須獨立分支、獨立 PR、獨立驗收。
4. 欄位完整性要列為 acceptance criteria。
5. 若小模型造成回歸，立即停止讓同模型補救，改交給高階模型修復。
6. 修復任務優先目標是「恢復資料完整顯示」，不是加新功能。

---

## 11. 總結

本案例的主要教訓：

> gpt-5.3-codex-spark XHigh 可以當快速工人，但不適合當 UI 結構設計者。

未來建議：

- Spark：找檔、看 log、改小字、小 CSS、跑驗證。
- Sonnet / Opus / GPT-5.5：表格結構、RWD、互動 UI、資料流、回歸修復。

對於 AI-SmartBook-R1，後台資料表屬於高回歸風險區域，任何欄位、表頭、tbody、colgroup、CSS overflow 修改都必須先做欄位清單與截圖驗收。
