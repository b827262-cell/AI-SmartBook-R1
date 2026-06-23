# AI-SmartBook-R2 Student Reader Local Image Picker Report

- 日期：2026-06-23
- 分支：`fix/r2-student-reader-local-image-picker`
- Commit: e6b7541c
- Push: 已推至 origin fix/r2-student-reader-local-image-picker

## 狀態

- success

## 變更檔案

- `apps/AI-Stu-R1/src/components/ExternalAiAskModal.tsx`
- `apps/AI-Stu-R1/src/styles.css`

## 驗證結果

### 1. Google AI Link 檢查

- `apps/AI-Stu-R1/src/lib/external-ai.ts`
  - `https://google.com/ai` 已存在且保持不變。
- `openExternalAi` 仍為開啟 `provider.homeUrl`，未將 prompt 或 image 參數附加到 URL。

### 2. 圖片上傳行為

- `ExternalAiAskModal` 新增本機上傳流程：
  - `accept="image/*"` 的隱藏檔案輸入。
  - 支援 `change` 後讀取 `image/*` 單檔並建立 `previewUrl`。
  - 自動顯示預覽區塊。

### 3. 圖片預覽 / 清除 / 取代

- 新增圖片區塊 `external-ai-image-area`：有來源標示與預覽。
- 「上傳圖片」可重複點擊覆蓋先前圖片（replace）。
- 「清除圖片」可清空目前所選影像。
- 以 `URL.createObjectURL` 建立預覽時，關閉 modal / 更換圖片時會釋放 blob URL。

### 4. 複製行為

- 新增「複製圖片」按鈕改用目前選取影像（上傳/截圖）。
- 複製失敗會回退顯示：
  - 「此瀏覽器不支援直接複製圖片，請使用「上傳圖片」後到 AI 平台手動選取檔案，或使用系統截圖工具。」

### 5. 提示詞複製

- 「複製提示詞」仍使用 `copyPrompt`，成功與失敗訊息正常更新。

### 6. 型別檢查 / 打包

- `PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck`：通過。
- `PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build`：通過。

### 7. 安全與隱私

- 未修改後端/DB。
- 未新增或新增任何 screenshot/image prompt 上傳邏輯。
- 外部 AI 仍僅開啟 provider home URL。

### 8. 人工驗證

- 目前未執行互動式 GUI 手動流程（無法在此環境進行實體瀏覽器操作）。

## Git 資訊

- `git status --short`：
  - `M apps/AI-Stu-R1/src/components/ExternalAiAskModal.tsx`
  - `M apps/AI-Stu-R1/src/styles.css`
  - `?? .claude/`
  - `?? apps/AI-adm-D1/data/`
- 未提交 `.env` / DB 檔案 / logs / `.claude` / runtime 檔。
