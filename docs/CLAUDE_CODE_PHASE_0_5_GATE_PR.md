# AI-SmartBook-R1 Phase 0.5 Gate PR — Claude Code 編修任務

> Created: 2026-06-18  
> Updated: 2026-06-18  
> Target repo: `b827262-cell/AI-SmartBook-R1`  
> Source reference: `https://github.com/b827262-cell/AI-SmartBook-R1/tree/02c214a6166ea0defbe124ee550b54b113bb9ed9/docs`  
> Backup docs path: `b827262-cell/Project-md-backup/md/AI-SmartBook-R1`  
> Purpose: 將 Phase 0.5 進場前的架構審查整理成 Claude Code 可直接執行的任務規格。  
> Execution language: English  
> Final report language: Traditional Chinese

---

## 1. 核心結論

AI-SmartBook-R1 的整體架構方向正確，但目前仍屬於「骨架完成、核心待填」階段。

Phase 0.5 進場前，請先完成 Gate PR，不要先擴張 UI 或大型功能。

Gate PR 的目的：

1. 修正 `book-core` 模組邊界。
2. 補齊兩個 app 的 Vite / TypeScript 設定。
3. 新增自動化 boundary check。
4. 保持 Student side 輕量與安全隔離。

---

## 2. 架構判斷

### 2.1 已確認的正確方向

- `AI-Stu-R1` 學生端保持輕量，適合 1GB 小機部署。
- 學生端不應該碰 AI API Key。
- `packages/schema` 與 `packages/ai` 是目前最成熟的兩個 package。
- `legacy/` 只能作為 UX 參考，不應直接搬移舊程式碼。
- 管理端才是 AI provider 的合法使用者。

### 2.2 主要風險

| ID | 問題 | 影響 | 本次 Gate 是否處理 |
|---|---|---|---|
| H1 | `packages/book-core` 不應依賴 `@ai-smartbook/ai` 與 `@ai-smartbook/db` | 破壞純函數模組邊界 | 是 |
| H2 | `apps/AI-Stu-R1` 缺少 `vite.config.ts` | dev proxy / build 設定不完整 | 是 |
| H3 | `apps/AI-adm-D1` 缺少 `vite.config.ts` | dev proxy / build 設定不完整 | 是 |
| H4 | 兩個 app 缺少 `tsconfig.json` | `pnpm typecheck` 不穩定 | 是 |
| H5 | `packages/db` 仍是空殼 | 後續真資料流被阻塞 | 否，下一 Sprint |

---

## 3. 本次 Claude Code 任務範圍

請只做 Gate PR，不要做大型功能實作。

### 3.1 必做

1. 移除 `packages/book-core/package.json` 對以下 package 的依賴：
   - `@ai-smartbook/ai`
   - `@ai-smartbook/db`

2. 補 `apps/AI-Stu-R1/vite.config.ts`
   - 使用 React plugin。
   - dev server port: `5173`。
   - proxy `/api/student` 到 `http://localhost:4310`。

3. 補 `apps/AI-adm-D1/vite.config.ts`
   - 使用 React plugin。
   - dev server port: `5174`。
   - proxy `/api/admin` 到 `http://localhost:4300`。

4. 補兩個 app 的 `tsconfig.json`
   - extends `../../tsconfig.base.json`。
   - include `src` 與 `vite.config.ts`。
   - 視現況加入 `vite/client` types。

5. 新增 `scripts/boundary-check.sh`
   - `apps/AI-Stu-R1` 不得 import `@ai-smartbook/ai`。
   - `apps/AI-Stu-R1` 不得 import `@ai-smartbook/db`。
   - `packages/student-runtime` 不得 import `@ai-smartbook/ai`。
   - `packages/book-core/package.json` 不得出現 `@ai-smartbook/ai`。
   - `packages/book-core/package.json` 不得出現 `@ai-smartbook/db`。
   - `deploy/systemd/student.env.example` 不得出現 `API_KEY`。

6. 確認腳本具備可執行權限。

7. 執行驗證：

```bash
pnpm install
pnpm typecheck
pnpm build
bash scripts/boundary-check.sh
```

如 repo 目前沒有完整 `typecheck` 或 `build` script，請不要擴大重構，只需如實回報 blocker。

---

## 4. 禁止範圍

本次任務不得做以下事項：

- 不實作 `packages/db`。
- 不實作 PDF upload / parsing flow。
- 不新增 OAuth。
- 不新增 full RAG / vector search / embeddings。
- 不新增 quiz generation。
- 不新增 credits / points system。
- 不新增 WebSocket。
- 不改 legacy 架構。
- 不直接 copy-paste `legacy/` 程式碼到新 apps。
- 不改 UI 視覺版面。
- 不引入 Docker / PM2 / MySQL / Redis。

---

## 5. 建議實作參考

### 5.1 Student Vite config

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/student': 'http://localhost:4310',
    },
  },
});
```

### 5.2 Admin Vite config

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api/admin': 'http://localhost:4300',
    },
  },
});
```

### 5.3 App tsconfig

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

### 5.4 Boundary check

```bash
#!/usr/bin/env bash
set -euo pipefail

FAIL=0

echo "=== AI-SmartBook-R1 Boundary Check ==="

if grep -r "@ai-smartbook/ai" apps/AI-Stu-R1/ 2>/dev/null; then
  echo "FAIL: AI-Stu-R1 imports @ai-smartbook/ai"
  FAIL=1
fi

if grep -r "@ai-smartbook/db" apps/AI-Stu-R1/ 2>/dev/null; then
  echo "FAIL: AI-Stu-R1 imports @ai-smartbook/db"
  FAIL=1
fi

if grep -r "@ai-smartbook/ai" packages/student-runtime/ 2>/dev/null; then
  echo "FAIL: student-runtime imports @ai-smartbook/ai"
  FAIL=1
fi

if grep -q "@ai-smartbook/ai" packages/book-core/package.json 2>/dev/null; then
  echo "FAIL: book-core depends on @ai-smartbook/ai"
  FAIL=1
fi

if grep -q "@ai-smartbook/db" packages/book-core/package.json 2>/dev/null; then
  echo "FAIL: book-core depends on @ai-smartbook/db"
  FAIL=1
fi

if grep -q "API_KEY" deploy/systemd/student.env.example 2>/dev/null; then
  echo "FAIL: student.env.example contains API_KEY"
  FAIL=1
fi

if [ "$FAIL" -eq 0 ]; then
  echo "Boundary check passed"
else
  echo "Boundary check failed"
fi

exit "$FAIL"
```

---

## 6. Claude Code 可直接使用的任務指令

```text
You are working in the AI-SmartBook-R1 repository.

Task: Implement the Phase 0.5 Gate PR only.

Scope:
1. Remove @ai-smartbook/ai and @ai-smartbook/db dependencies from packages/book-core/package.json.
2. Add apps/AI-Stu-R1/vite.config.ts with React plugin, port 5173, and /api/student proxy to http://localhost:4310.
3. Add apps/AI-adm-D1/vite.config.ts with React plugin, port 5174, and /api/admin proxy to http://localhost:4300.
4. Add tsconfig.json to both apps, extending ../../tsconfig.base.json and including src plus vite.config.ts.
5. Add scripts/boundary-check.sh to verify module boundaries.
6. Make scripts/boundary-check.sh executable.
7. Run pnpm install, pnpm typecheck, pnpm build, and bash scripts/boundary-check.sh if available.

Strict restrictions:
- Do not implement packages/db.
- Do not implement PDF upload or parsing.
- Do not modify UI.
- Do not copy code from legacy/.
- Do not add OAuth, RAG, quiz generation, credits, WebSocket, Docker, PM2, MySQL, or Redis.
- Keep this as a small config and boundary PR.

Final report must be in Traditional Chinese and include:
- success / failure / blocker / permission-halt status
- changed files
- commands run
- test results
- remaining risks
- suggested commit message
```

---

## 7. 驗收標準

| Gate | 驗收項目 | 通過條件 |
|---|---|---|
| G1 | book-core boundary | `packages/book-core/package.json` 無 `@ai-smartbook/ai`、`@ai-smartbook/db` |
| G2 | Student Vite config | `/api/student` proxy 到 4310 |
| G3 | Admin Vite config | `/api/admin` proxy 到 4300 |
| G4 | TypeScript config | 兩個 app 均有 `tsconfig.json` |
| G5 | Boundary script | `bash scripts/boundary-check.sh` 可執行 |
| G6 | Scope control | 無 UI / DB / PDF / RAG / OAuth 額外實作 |

---

## 8. 下一階段，不在本次 Gate PR 內

Gate PR 合併後，下一階段才進入：

1. `packages/db` Drizzle schema + connection + repositories。
2. `packages/book-core` 純函數 PDF/text/markdown parsing + content splitting。
3. `AI-adm-D1` Books CRUD + upload orchestration。
4. `AI-Stu-R1` readonly SQLite reading API。
5. 1GB target deployment verification。

---

## 9. 終止回報格式

```md
## 最終回報

- 狀態：success / failure / blocker / permission-halt
- Branch：
- Commit SHA：
- Changed files：
- Commands run：
- Test results：
- Remaining risks：
- Suggested commit message：
```

---

## 10. 總結

這份任務的目的不是完成 AI-SmartBook-R1，而是先讓 Phase 0.5 有乾淨的地基。

請優先保護三條邊界：

1. Student side never touches AI or API keys.
2. book-core stays pure and does not call AI or DB.
3. legacy is UX reference only, not source code to copy.
