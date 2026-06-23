# AI-Stu-R1 / AI-adm-D1 Build & Typecheck 修復上報

## 任務
在 `feat/r2-integrate-imports-notes` 上建立 `fix/r2-build-typecheck-runtime-guards` 分支，修正學生閱讀器的型別問題，並驗證指定的 typecheck/build。

## 已完成修正
- 分支：`fix/r2-build-typecheck-runtime-guards`
- 只修改：
  - `apps/AI-Stu-R1/src/pages/BookReaderPage.tsx`
- 未修改架構：
  - 未調整 reader/admin module 架構
  - 未修改 .env、DB、logs、uploads、backups、.claude

## 修正重點
1. `VisualViewport` nullable guards
   - 使用明確變數保存 `window.visualViewport`，必要時 fallback。
2. `outerLayoutRef.current` null 檢查
   - 保留 root 引用供 closure 使用，避免 `null` 回推警告。
3. `book` nullable 防護
   - 觸控/導覽 handler 改用 `book?.pdfFileId`。
4. pointer type 檢查
   - 針對 `touch` / `pen` / `mouse` 的比較型別一致化。
5. ref 型別修正
   - `touchZoneRef` 改為 `useRef<HTMLDivElement>(null)`。

## 驗證命令
- `PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck`
- `PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build`
- `PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 typecheck`
- `PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build`

## 結果（本機）
- AI-Stu-R1 typecheck：通過
- AI-Stu-R1 build：通過
- AI-adm-D1 typecheck：通過
- AI-adm-D1 build：通過
- JSX parse error：已消失

## commit / push
- Commit：`f95e801c`
- Commit 訊息：`fix(r2): stabilize student reader typecheck and build`
- Push：成功推到 `origin/fix/r2-build-typecheck-runtime-guards`

## 其他記錄文件
- [AI-SmartBook-R2-runtime-stale-server-checks-20260623.md](/home/b827262/project/AI-SmartBook-R2/docs/r2/AI-SmartBook-R2-runtime-stale-server-checks-20260623.md)
