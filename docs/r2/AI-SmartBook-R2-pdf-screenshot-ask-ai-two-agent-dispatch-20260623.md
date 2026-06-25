# AI-SmartBook-R2 PDF Screenshot Ask AI — Two-Agent Dispatch

Date: 2026-06-23

Base branch:

```text
feat/r2-integrate-imports-notes
```

Base commit:

```text
d6eb778c8e63dc7be56db1dbf05111dfbeaf4fcd
```

Final integration branch:

```text
feat/r2-pdf-screenshot-ask-ai
```

## 1. 任務拆分

本次任務分為兩位 Agent 並行處理，規避同時改 `BookReaderPage.tsx`，以降低衝突。

- Agent 1：核心 Reader 截圖流程（Modal 外殼、選取互動、截圖資料流）
- Agent 2：外部 AI 按鈕與剪貼簿工具（provider 設定、複製行為、prompt 範本）

---

## 2. 關鍵規則

1. 兩個 Agent 不要同時改 `BookReaderPage.tsx`。
2. Agent 1 先做 core branch。
3. Agent 2 最好從 Agent 1 的 core branch 再開 buttons branch。
4. 最後再整合成 `feat/r2-pdf-screenshot-ask-ai`。
5. 不新增 DB。
6. 不自動上傳截圖。
7. 不把 Prompt / 圖片放進 URL。

---

## 3. Agent 1（Core）

- 建議模型：`Claude`
- 分支：`feat/r2-pdf-screenshot-ask-ai-core`
- base：`feat/r2-integrate-imports-notes`

職責：

1. PDF Reader 新增「截圖問 AI」
2. 框選模式
3. 橘色框線與四角控制點
4. 截取 PDF canvas 區域
5. 顯示截圖預覽 modal shell

---

## 4. Agent 2（Buttons）

- 指定模型：`Codex-Spark` / `GPT-5.4`
- 分支：`feat/r2-pdf-screenshot-ask-ai-buttons`
- base：建議 `feat/r2-pdf-screenshot-ask-ai-core`（未完成時可先在 `feat/r2-integrate-imports-notes` 作為工具文件/輔助開發）

職責（固定）：

1. AI provider config
2. `openExternalAi` helper
3. copy prompt helper
4. copy image helper
5. prompt templates
6. modal 內 Google / ChatGPT / Claude / Gemini 等按鈕

---

## 5. 安全要求（Agent 2）

- 不要新增 DB。
- 不自動上傳截圖。
- 不要將 prompt/image 放在 URL query string。
- 僅在用戶主動點擊時才開啟外部頁籤。
- 不在未必要時修改 `BookReaderPage.tsx`。

---

## 6. 驗證與整合（建議）

- `PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck`
- `PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build`
- `PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build`

整合順序：

1. Agent 1 完成 core branch 並推上遠端
2. Agent 2 從 Agent 1 分支建立 buttons 分支並實作
3. 將 core + buttons 合併到 `feat/r2-pdf-screenshot-ask-ai`
4. 完成最終 acceptance 驗證
