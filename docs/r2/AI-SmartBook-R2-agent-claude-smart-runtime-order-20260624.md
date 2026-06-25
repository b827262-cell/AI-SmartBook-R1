# AI-SmartBook-R2 Agent Order — Claude Smart Runtime

日期：2026-06-24  
Repository：`b827262-cell/AI-SmartBook-R1`  
Base branch：`fix/r2-admin-settings-files-integration`  
建議 Claude 工作分支：`fix/r2-smart-features-runtime-claude`  
任務角色：Claude 負責 smart features runtime blocker、安全性、API 權限、資料流與 UI/UX 一致性修正。

---

## 1. 背景

目前 R2 smart features review 已產出 cannot merge 結論。主要原因是部分功能目前只有 UI 或說明頁，尚未完成 runtime、後端資料流、學生端串接與安全性驗證。

Claude 本輪任務不是新增更多靜態畫面，而是把既有 smart features 補成可實際運作、可驗證、可安全合併的功能。

參考文件：

- `docs/r2/AI-SmartBook-R2-smart-features-review-report-20260624.md`
- `docs/r2/AI-SmartBook-R2-smart-features-claude-execution-plan-20260624.md`
- `docs/r2/AI-SmartBook-R2-smart-features-claude-handoff-20260624.md`

---

## 2. 嚴格分工

Claude 只負責下列範圍：

| 範圍 | 責任 |
|---|---|
| 智能影音設定 runtime | API、CRUD、啟用停用、刪除、學生端章節顯示 |
| 知識點管理 runtime 外殼 | API route、同步入口、統計、設定保存、學生端開關串接 |
| NotesHelpPage | 移除 localhost 硬編碼，改用相對路徑或共用 API client |
| Q&A 冪等性 | 避免重複新增、重複同步造成資料膨脹 |
| XSS / URL validation | 影音 URL、Q&A、知識點、JSON 匯入內容安全處理 |
| Auth guard | 後台寫入 / 刪除 / 同步 API 必須有權限保護 |
| UI/UX 文案 | 修正「128 本」等明顯不一致文案，保持繁體中文一致性 |

Claude 不負責 Google AI 產生知識點核心 prompt/service。該任務交由 GPT-5.4 / Codex 執行。

---

## 3. 不可碰撞邊界

為避免與 GPT-5.4 / Codex 衝突，Claude 應避免大改下列範圍：

| 檔案 / 模組 | 規則 |
|---|---|
| Google AI provider service | 不建立完整 Google AI 生成 service；只預留 interface 或呼叫點 |
| knowledge generation prompt | 不設計最終 AI prompt；可保留 TODO 或 adapter 介面 |
| AI knowledge extraction core | 不實作 LLM 萃取核心邏輯 |
| env key loading | 不重寫 Google API Key 讀取策略；僅確認不外洩 |

若必須改同一檔案，請將變更限制在 route、validation、auth、UI glue，不要和 GPT-5.4 的 provider / generator 互相覆蓋。

---

## 4. 建議開分支

請 Claude 從 base branch 開新分支：

```bash
git checkout fix/r2-admin-settings-files-integration
git pull origin fix/r2-admin-settings-files-integration
git checkout -b fix/r2-smart-features-runtime-claude
```

完成後 push：

```bash
git push origin fix/r2-smart-features-runtime-claude
```

---

## 5. 任務 A：智能影音設定 runtime

### 5.1 需求

智能影音設定必須從靜態 UI 變成可實際運作功能。

### 5.2 必做項目

| 功能 | 必須完成 |
|---|---|
| 讀取列表 | 後台可讀取影音列表 |
| 新增影音 | 可新增 YouTube 或一般影片連結 |
| 更新影音 | 可修改標題、章節、URL、啟用狀態 |
| 刪除影音 | 可刪除或 soft delete，需避免誤刪 |
| 啟用停用 | toggle 必須保存並影響學生端 |
| 章節綁定 | 每筆影音需能對應 book / chapter |
| 學生端顯示 | 學生端只顯示啟用中的章節影音 |
| URL 驗證 | 阻擋不安全 scheme 與惡意輸入 |
| 權限保護 | 後台寫入 API 需有 auth guard |

### 5.3 驗收條件

1. 新增影音後重新整理仍存在。
2. 停用影音後學生端不顯示。
3. 刪除影音後後台與學生端皆不顯示。
4. 不安全 URL 被拒絕。
5. 未授權操作無法新增 / 修改 / 刪除。

---

## 6. 任務 B：知識點管理 runtime 外殼

### 6.1 需求

知識點管理需補足後台同步入口、統計、開關保存與學生端串接。Google AI 實際萃取核心由 GPT-5.4 / Codex 完成，Claude 需提供穩定接口與可驗證資料流。

### 6.2 必做項目

| 功能 | Claude 責任 |
|---|---|
| JSON source detection | 找到 book 對應 split-book / sentence-index JSON |
| sync API route | 提供重新同步入口，先可接現有 parser / stub adapter |
| idempotent upsert interface | 設計避免重複資料的 upsert 流程 |
| stats | 顯示章節數、知識點總數、最後更新時間 |
| preview | 顯示章節與知識點預覽 |
| settings | 啟用側欄、搜尋欄、預設展開需可保存 |
| student side | 學生端依設定顯示知識點側欄 / 搜尋欄 |
| error handling | JSON 不存在或格式錯誤需顯示明確錯誤 |

### 6.3 文案修正

若畫面語意是章節數，請將：

```text
128 本
```

改成：

```text
128 章
```

若實際是節點數，請改成：

```text
128 個節點
```

---

## 7. 任務 C：NotesHelpPage localhost 硬編碼

### 7.1 修正要求

1. 搜尋 NotesHelpPage 相關檔案。
2. 移除 hardcoded localhost API host。
3. 改用相對 API path 或共用 API client。
4. 確保 dev / production-like URL 都正常。
5. 錯誤時顯示提示，不可白畫面。

### 7.2 驗收

```bash
grep -R "localhost" apps packages \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=.git || true
```

若仍有 localhost，需在報告中逐一說明為何保留。

---

## 8. 任務 D：Q&A 冪等性

### 8.1 需求

重複新增、重複同步或重複匯入 Q&A，不可造成資料無限制增加。

### 8.2 建議策略

| 策略 | 說明 |
|---|---|
| normalized question | 將問題 trim、空白正規化後作為比對基礎 |
| book scope | 同一本書內相同問題不得重複建立 |
| chapter scope | 若有章節來源，可加入 chapterId |
| upsert | 已存在則更新或跳過 |
| clear response | API 回傳 created / updated / skipped |

---

## 9. 任務 E：安全性

### 9.1 XSS / URL

請檢查後台輸入並會在學生端顯示的欄位：

- 影音標題
- 影音 URL
- Q&A 問題
- Q&A 答案
- 知識點標題與內容
- JSON 匯入內容

要求：

1. render as text 為預設。
2. 若使用 markdown / HTML，必須 sanitize。
3. 禁止不安全 URL scheme。
4. 禁止將使用者輸入直接 dangerous render。

### 9.2 Auth guard

以下 API 必須受後台權限保護：

- 新增影音
- 修改影音
- 刪除影音
- 重新同步知識點 JSON
- 新增 / 修改 / 刪除 Q&A
- 修改知識點功能開關

未授權應回傳 401 或 403。

---

## 10. 驗證指令

```bash
pnpm --filter AI-adm-D1 typecheck
pnpm --filter AI-adm-D1 build
pnpm --filter AI-Stu-R1 typecheck
pnpm --filter AI-Stu-R1 build
```

檢查 `.env`：

```bash
git status
git ls-files | grep -E '(^|/)\.env(\.|$)' || true
```

API smoke test 請依實際 route 調整：

```bash
curl -i http://127.0.0.1:4300/api/admin/smart-videos
curl -i http://127.0.0.1:4300/api/admin/knowledge-points
curl -i http://127.0.0.1:4300/api/student/books
```

---

## 11. 完成後輸出報告

請 Claude 完成後新增：

```text
docs/r2/AI-SmartBook-R2-claude-smart-runtime-implementation-report-20260624.md
docs/r2/AI-SmartBook-R2-claude-smart-runtime-verification-report-20260624.md
```

報告格式：

```md
## Claude Smart Runtime Execution Report

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
- smart video runtime:
- knowledge runtime shell:
- NotesHelpPage localhost:
- Q&A idempotency:
- XSS / URL validation:
- auth guard:

### Verification
- typecheck:
- build:
- route smoke:
- API smoke:
- XSS probe:
- auth probe:
- idempotency probe:
- env tracking:

### Remaining Risks
- risk 1:
- risk 2:

### Final Decision
- can merge / cannot merge:
- reason:
```

---

## 12. Commit message 建議

```text
fix(r2): implement smart features runtime blockers
```

若只完成部分修正：

```text
fix(r2): address smart runtime safety and integration gaps
```

---

## 13. 結論

Claude 的核心任務是補齊 smart features runtime 與安全性，不負責 Google AI 知識點產生核心。完成後需讓 GPT-5.4 / Codex 的 Google knowledge generation branch 可以安全接入，不互相覆蓋。
