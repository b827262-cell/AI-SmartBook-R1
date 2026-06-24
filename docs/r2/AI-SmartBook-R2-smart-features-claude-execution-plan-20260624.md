# AI-SmartBook-R2 Smart Features Claude Execution Plan

日期：2026-06-24  
Repository：`b827262-cell/AI-SmartBook-R1`  
Branch：`fix/r2-admin-settings-files-integration`  
前置 Claude Review Report：`docs/r2/AI-SmartBook-R2-smart-features-review-report-20260624.md`  
前置 Review Commit：`264fc74`  
本文件目的：將 Claude Review 中發現的 blocker、warning 與 cannot merge 決策，整理成下一輪 Claude 可直接執行的修正任務。

---

## 1. 背景與目前狀態

本輪 smart features review 已完成 runtime 驗證與安全性 probe。Claude Review 結論為：

```text
Final Decision: cannot merge
```

主要原因是目前三組功能中，部分功能停留在 UI 或說明頁階段，尚未完成 runtime 實作、資料流串接或安全性防護。

已確認 AGY 先前驗收通過的六項基礎整合可視為獨立範圍；但本文件所涵蓋的 smart features scope 不可直接合併至主分支。

---

## 2. 可合併與不可合併範圍切分

### 2.1 已通過，可視情況獨立合併的基礎範圍

| 項目 | 狀態 |
|---|---|
| FilesTab 中文化 | passed |
| FilesTab AI 狀態紅綠燈 | passed |
| 後台 AI 設定入口 | passed |
| Google AI Settings Card 樣式 | passed |
| appearance icon / ICO 套用 | passed |
| Reader Toolbar icon 套用 | passed |

### 2.2 本文件要求 Claude 修正的不可合併範圍

| 項目 | 狀態 | 原因 |
|---|---|---|
| 智能影音設定 | blocker | UI 已有，但 runtime / API / persistence / 學生端顯示尚未完整實作 |
| 知識點管理 | blocker | UI 已有，但 JSON sync / API / idempotency / 學生端設定串接尚未完整實作 |
| NotesHelpPage localhost 硬編碼 | warning / fix required | 不利部署，正式環境會指向錯誤 host |
| Q&A 冪等性 | warning / fix required | 重複操作可能造成重複資料或不一致 |
| URL / XSS 安全性 | warning / fix required | 影音 URL、輸入欄位需做安全驗證 |
| 後台 API auth guard | warning / fix required | 後台新增、刪除、同步類 API 必須確認權限 |

---

## 3. Claude 執行總目標

Claude 下一輪任務目標：

1. 補齊智能影音設定的後端 API、資料保存、CRUD 與學生端顯示。
2. 補齊知識點管理的 JSON 同步、統計、idempotent upsert 與學生端設定串接。
3. 移除 NotesHelpPage 中的 localhost 硬編碼，改用相對路徑或統一 API client。
4. 修正 Q&A 新增 / 同步的冪等性問題。
5. 補 URL validation 與輸入清理，降低 XSS 風險。
6. 補後台 API 權限保護，避免未授權操作。
7. 重新執行 typecheck、build、curl probe、secret check 與 UI smoke test。
8. 產出新的 Claude implementation report 與 final verification report。

---

## 4. 修正任務 A：智能影音設定 runtime 實作

### 4.1 目前問題

Claude Review 指出：智能影音設定畫面存在，但 runtime 驗證顯示功能未完整落地。需要確認不是只有展示假資料，而是可實際新增、讀取、更新、刪除並同步到學生端。

### 4.2 應實作內容

請 Claude 檢查現有資料結構後實作，不要重複建立不必要的 schema。

建議至少具備：

| 能力 | 要求 |
|---|---|
| list | 後台可讀取目前所有影音設定 |
| create | 後台可新增 YouTube 或 MP4 / CDN 影音 |
| update | 後台可更新標題、章節、URL、啟用狀態 |
| delete | 後台可刪除或 soft delete 影音 |
| enable toggle | 啟用 / 停用狀態可保存 |
| chapter binding | 影音需綁定 bookId / chapterId 或等價欄位 |
| student display | 學生端閱讀器依章節顯示啟用中的影音 |
| validation | URL、標題、章節欄位需驗證 |
| auth | 後台操作需受權限保護 |

### 4.3 URL validation 規則

請加入 allowlist 概念：

| 類型 | 允許 |
|---|---|
| YouTube | `https://www.youtube.com/watch?...` 或 `https://youtu.be/...` |
| 一般影片 | `https://` 開頭且副檔名或 content type 可識別為影片 |
| CDN | 只允許 `https://` |
| 禁止 | `javascript:`、`data:`、未知 scheme、空白 control chars |

### 4.4 學生端驗收條件

| 情境 | 預期 |
|---|---|
| 章節有啟用影音 | 學生端該章節顯示影音入口 |
| 章節影音停用 | 學生端不顯示該影音 |
| URL 不合法 | 後台拒絕保存並顯示錯誤 |
| 刪除影音 | 後台列表與學生端皆不再顯示 |
| 同一章節多支影音 | 順序穩定且不破版 |

---

## 5. 修正任務 B：知識點管理 runtime 實作

### 5.1 目前問題

Claude Review 指出：知識點管理畫面存在，但 runtime 驗證顯示同步、統計、資料來源與學生端串接未完整落地。

### 5.2 應實作內容

| 能力 | 要求 |
|---|---|
| source detection | 可讀取 book 對應的 split-book / sentence-index JSON 來源 |
| sync | 可由後台觸發重新同步 JSON |
| idempotent upsert | 重複同步不得產生重複章節或知識點 |
| stats | 統計章節數、已抓取章節、知識點總數、最後更新時間 |
| preview | 顯示章節與知識點預覽 |
| settings | 啟用知識點側欄、顯示搜尋欄、預設展開章節需可保存 |
| student integration | 學生端知識點側欄與搜尋需依後台設定顯示 |
| error handling | JSON 缺失、格式錯誤、空資料需有清楚錯誤訊息 |
| export | CSV 匯出需支援繁體中文與 UTF-8 |

### 5.3 文字修正

畫面目前出現：

```text
總章節數：128 本
```

請 Claude 確認實際語意後修正，建議改為其中之一：

```text
總章節數：128 章
```

或

```text
總節點數：128 個
```

### 5.4 冪等性要求

重複執行「重新同步 JSON」時：

1. 不應新增重複章節。
2. 不應新增重複知識點。
3. 已存在的自動萃取節點應以 stable key 更新。
4. 人工編輯內容不可被無條件覆蓋；若必須覆蓋，需有明確策略。
5. 最後更新時間可更新，但資料筆數不應無故膨脹。

建議 stable key：

```text
bookId + chapterId + sourceFile + sourceIndex 或 contentHash
```

---

## 6. 修正任務 C：NotesHelpPage localhost 硬編碼

### 6.1 目前問題

Claude Review 指出 NotesHelpPage 存在 localhost 硬編碼，部署到正式環境後可能造成 API 指向錯誤。

### 6.2 修正要求

請 Claude：

1. 搜尋 NotesHelpPage 與相關 API client。
2. 移除 hardcoded localhost URL。
3. 改用相對路徑、共用 API client 或環境變數設定。
4. 確保 dev、staging、production 皆可正常運作。
5. 增加 fallback 或錯誤提示，不可造成白畫面。

### 6.3 驗收條件

| 檢查 | 預期 |
|---|---|
| grep localhost | NotesHelpPage 不再出現硬編碼 API host |
| dev server | 本機仍可正常呼叫 API |
| production-like | 非 localhost domain 下不會錯誤指向 localhost |
| build | typecheck / build 均通過 |

---

## 7. 修正任務 D：Q&A 冪等性

### 7.1 目前問題

Claude Review 指出 Q&A 存在冪等性問題。可能是重複建立、重新同步或重複匯入時，產生重複問答。

### 7.2 修正要求

請 Claude 確認 Q&A 來源與建立流程，並補上：

1. 唯一鍵策略。
2. 重複建立保護。
3. upsert 或 duplicate detection。
4. API 回應需清楚區分 created / updated / skipped。
5. 重新執行同一批資料時，筆數不應無故增加。

建議 unique key：

```text
bookId + normalizedQuestion
```

或若 Q&A 由章節產生：

```text
bookId + chapterId + normalizedQuestion
```

---

## 8. 修正任務 E：安全性修正

### 8.1 XSS / URL 安全

請 Claude 檢查所有可由後台輸入並在學生端顯示的欄位：

| 欄位 | 風險 | 要求 |
|---|---|---|
| 影音 URL | unsafe scheme / script injection | allowlist + encode |
| 課程標題 | HTML injection | escape / render as text |
| Q&A 問題與答案 | HTML injection | escape / markdown sanitize |
| 知識點內容 | HTML injection | sanitize 或 render as text |
| JSON 匯入內容 | 惡意字串 | validation + sanitize |

禁止將使用者輸入直接透過 dangerous HTML rendering 輸出，除非已經做嚴格 sanitize。

### 8.2 後台 API auth guard

請 Claude 確認以下操作需要登入與管理權限：

1. 新增影音。
2. 更新影音。
3. 刪除影音。
4. 重新同步知識點 JSON。
5. 新增 / 更新 / 刪除 Q&A。
6. 修改知識點功能開關。
7. 匯出資料若包含內部內容，也需權限保護。

未授權呼叫應回傳 401 或 403，不應成功修改資料。

### 8.3 secret 安全

請 Claude 確認：

1. 實際 API Key 不得提交至 Git。
2. 實際 API Key 不得出現在前端 bundle。
3. `.env` 不得被 Git 追蹤。
4. 文件僅可使用 placeholder，不可包含真實值。

---

## 9. 建議 Claude 執行順序

```text
Step 1: git status，確認目前分支與工作樹
Step 2: 閱讀 Claude review report 264fc74
Step 3: 搜尋 smart video / knowledge / notes help / q&a 相關檔案
Step 4: 先修 NotesHelpPage localhost 硬編碼
Step 5: 實作智能影音設定 runtime
Step 6: 實作知識點管理 runtime 與 idempotent sync
Step 7: 修 Q&A 冪等性
Step 8: 補 URL validation 與 auth guard
Step 9: 跑 typecheck / build / curl probe / secret check
Step 10: 產出 implementation report 與 verification report
Step 11: commit 並 push
```

---

## 10. 建議驗證指令

### 10.1 Typecheck / Build

```bash
pnpm --filter AI-adm-D1 typecheck
pnpm --filter AI-adm-D1 build
pnpm --filter AI-Stu-R1 typecheck
pnpm --filter AI-Stu-R1 build
```

### 10.2 localhost hardcode check

```bash
grep -R "localhost" apps packages \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=.git || true
```

### 10.3 env tracking check

```bash
git status
git ls-files | grep -E '(^|/)\.env(\.|$)' || true
```

### 10.4 API smoke test

請依實際 routes 調整：

```bash
curl -i http://127.0.0.1:4300/api/admin/smart-videos
curl -i http://127.0.0.1:4300/api/admin/knowledge-points
curl -i http://127.0.0.1:4300/api/student/books
```

### 10.5 XSS probe 概念

請以測試資料驗證：

```text
1. 影音 URL 使用不安全 scheme 時應被拒絕
2. 標題輸入 HTML 片段時，學生端應以文字呈現或被 sanitize
3. Q&A 答案含 HTML 片段時，不可直接執行
4. JSON 匯入含惡意字串時，不可破壞頁面
```

### 10.6 Auth probe 概念

請以未登入或未帶管理權限的狀態呼叫後台寫入 API，預期：

```text
HTTP 401 或 HTTP 403
```

不可回傳成功，也不可修改資料。

---

## 11. 完成標準

Claude 修正完成後，需符合以下條件才可重新送驗：

| 條件 | 必須結果 |
|---|---|
| 智能影音設定 | CRUD、啟用、刪除、學生端顯示皆可 runtime 驗證 |
| 知識點管理 | JSON sync、統計、預覽、設定開關、學生端側欄皆可 runtime 驗證 |
| NotesHelpPage | 無 localhost API host 硬編碼 |
| Q&A | 重複匯入 / 建立不產生重複資料 |
| XSS | 不安全 URL 與 HTML injection 被阻擋或安全處理 |
| Auth | 後台寫入 API 未授權不可操作 |
| Typecheck | AI-adm-D1 與 AI-Stu-R1 均 0 errors |
| Build | AI-adm-D1 與 AI-Stu-R1 均成功 |
| Secret | 實際 API Key 未進 Git、未進 bundle、未進報告 |
| Report | 新增 implementation report 與 final verification report |

---

## 12. Claude 最終回報格式

Claude 完成後，請用繁體中文輸出：

```md
## Claude Execution Report

### Status
- success:
- failure:
- blocker:
- permission-halt:

### Git
- repository:
- branch:
- commit SHA:
- changed files:

### Fixed Scope
- Smart video runtime:
- Knowledge runtime:
- NotesHelpPage localhost hardcode:
- Q&A idempotency:
- XSS / URL validation:
- Auth guard:

### Verification
- typecheck:
- build:
- route smoke:
- API smoke:
- XSS probe:
- auth probe:
- idempotency probe:
- secret / env tracking:

### Remaining Risks
- risk 1:
- risk 2:

### Final Decision
- can merge / cannot merge:
- reason:
```

---

## 13. 建議 commit message

若完成 blocker 修正，建議：

```text
fix(r2): implement smart features runtime blockers
```

若只完成文件或部分修正，請勿使用 final fix 字眼，改用：

```text
chore(r2): document smart features blocker execution plan
```

或

```text
fix(r2): address notes help and smart feature safety checks
```

---

## 14. 結論

目前 smart features scope 維持 cannot merge。下一輪 Claude 執行重點不是再補畫面，而是補 runtime、資料流、安全性與冪等性。完成後需重新產出驗收報告，並由 AGY 或 Claude 再做 final verification，通過後才可重新判定 can merge。
