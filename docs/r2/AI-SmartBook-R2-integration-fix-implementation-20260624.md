# AI-SmartBook-R2｜整合修正任務實作紀錄

> Branch: `fix/r2-admin-settings-files-integration`  
> Commit: `8c9d47825b66d32b95bc4b28f659afcb381a1b64`  
> Date: 2026-06-24  
> Executor: Claude Sonnet 4.6

---

## 1. 任務背景

兩條功能分支各自完成後，實測發現多項整合缺陷。此任務開一條整合修正分支，合併兩支後一次修正：

| 合併來源 | 說明 |
|---|---|
| `origin/feat/r2-admin-google-ai-settings` | Google AI Key 設定、API 端點、基礎前端 |
| `origin/feat/r2-admin-appearance-image-folder-import-impl` | 完整後台 UI（AdminShell / Sidebar / 書本 CRUD / 外觀設定）|

整合基底：`origin/master`

---

## 2. 分支建立指令

```bash
git fetch origin
git checkout -b fix/r2-admin-settings-files-integration origin/master
git merge origin/feat/r2-admin-appearance-image-folder-import-impl
git merge origin/feat/r2-admin-google-ai-settings
```

---

## 3. 合併衝突清單與解法

| 衝突檔案 | 衝突性質 | 解法 |
|---|---|---|
| `.gitignore` | 內容衝突 | 合併兩支新增規則：`tmp_*.ts` + `apps/AI-adm-D1/data/` + `.claude/` |
| `apps/AI-adm-D1/src/main.tsx` | 內容衝突 | 保留 appearance branch 版（使用 `App.tsx` 入口） |
| `apps/AI-adm-D1/tsconfig.json` | 新增/新增 | 保留 appearance branch 版（`extends ../../tsconfig.base.json`）|
| `apps/AI-adm-D1/src/api.ts` | 新增/新增 | 保留 appearance branch 全量 api.ts，將 AI provider 函式以 `http()` helper 追加 |
| `apps/AI-adm-D1/src/server/index.ts` | 3 處衝突 | 保留 appearance branch 完整伺服器；加入 `ai-settings-store.ts` import；移除合併殘留死碼 |

### 3.1 死碼清除

合併後第三個衝突（`/api/admin/books/:bookId/qa`）解析錯誤，導致舊版 lazy-import QA stub 被附加到 SmartSolve GET endpoint 函式體末尾（`return res.json(...)` 之後）。TypeScript 回報 `await` 在非 async 函式中使用的錯誤，手動移除後修復。

---

## 4. 六項修正清單

### 修正 1 — 後台 FilesTab.tsx 全面中文化

**問題：** `/admin/books/:bookId/files` 頁面大量英文 UI 標籤。

**修正：** 直接替換 `apps/AI-adm-D1/src/pages/tabs/FilesTab.tsx` 中所有英文字串。

| 英文原文 | 中文修正 |
|---|---|
| `Upload PDF` (h3) | `上傳 PDF` |
| `Upload` (button) | `上傳` |
| `Manual Reader TOC` | `手動匯入閱讀器目錄` |
| `Import structured chapter/section...` | `匯入學生閱讀器使用的章節／段落階層結構。` |
| `Preview` | `預覽` |
| `Import / Replace` | `匯入 / 取代` |
| `Delete TOC` | `刪除目錄` |
| `Active TOC:` | `目前目錄：` |
| `none` | `無` |
| `Items:` | `項目數：` |
| `Updated:` | `更新時間：` |
| `This is a sentence JSON Index...` | `這是句子 JSON 索引，不是閱讀器目錄。請改用「從 JSON 索引產生閱讀器目錄」功能。` |
| `Files` (h3) | `檔案清單` |
| `No files uploaded yet.` | `尚無上傳的檔案。` |
| `Name / Role / Related PDF / Size / Parse status / Actions` | `檔名 / 類型 / 關聯 PDF / 大小 / 解析狀態 / 操作` |
| `PDF source / Reference image / Misclassified image / Unsupported source` | 對應中文 |
| `Re-parse Content / Parse Content` | `重新解析內容 / 解析內容` |
| `Re-parse Outline / Parse Outline` | `重新解析目錄結構 / 解析目錄結構` |
| `Generate JSON Index` | `產生 JSON 索引` |
| `View JSON / Download JSON` | `查看 JSON / 下載 JSON` |
| `Delete` | `刪除` |
| `Preview Chapters` | `預覽章節` |
| `Add Row / Apply Chapters` | `新增列 / 套用章節` |
| 預覽章節表格 6 個欄位 | 全部中文化 |
| `Remove` | `移除` |
| `JSON Index Result` | `JSON 索引結果` |
| `Save as QA Reference` | `設為 QA 參考資料` |
| `JSON Index / QA Reference` | `JSON 索引 / QA 參考資料` |
| `Upload JSON` | `上傳 JSON` |
| `Reader TOC page start: / page end:` | `閱讀器目錄起始頁：/ 終止頁：` |
| `Active QA Reference` | `使用中 QA 參考` |
| `Set as QA Reference` | `設為 QA 參考資料` |
| `Generate Reader TOC` | `產生閱讀器目錄` |
| `Delete JSON` | `刪除 JSON` |

**額外問題修正：** Edit 操作時 TypeScript 解析工具將 `"muted"` 的直雙引號替換為彎引號（U+201C/U+201D），導致 TypeScript 報 `TS1127 Invalid character`。以 Python binary replace 修正全檔所有彎引號。

---

### 修正 2 — 後台 FilesTab.tsx 加入 AI 狀態紅綠燈 + 一鍵完成

**新增：**
- 從 `api.ts` 匯入 `getAiProviderSettings`
- 新增 `aiStatus` / `oneClickMsg` 狀態
- `useEffect` 中同時載入 AI 設定
- return JSX 頂部加入 AI 執行狀態卡片

```
AI 執行狀態（無 Key）：
🔴 未提供 Google API Key
可執行：拆書、建立章節、建立基礎知識點
略過：AI 建立 Q&A、AI 萃取知識點、截圖問 AI

AI 執行狀態（有 Key）：
🟢 Google API Key 已提供
預設模型：gemini-2.5-flash
可執行：拆書、建立章節、AI 建立 Q&A、AI 建立知識點

一鍵完成按鈕：
拆書（預設頂級）→ 建立章節（首面 1 ～ 末面 589）→ 建立 Q&A → 建立知識點
無 Key：顯示非 AI 流程略過警告
```

---

### 修正 3 — 後台導覽列新增 AI 模型設定入口

**`apps/AI-adm-D1/src/navigation/adminNav.ts`：**

```ts
{ label: "AI 模型設定", to: "/admin/settings/ai", end: true, enabled: true,
  description: "Google API Key 與預設模型設定" }
```

加入「管理後台」群組，與「介面設定」同一層級。

---

### 修正 4 — App.tsx 加入 /admin/settings/ai 路由

**`apps/AI-adm-D1/src/App.tsx`：**

```tsx
import { AiSettingsPage } from "./pages/AiSettingsPage";
...
<Route path="/admin/settings/ai" element={<AiSettingsPage />} />
```

---

### 修正 5 — AiSettingsPage 改用 AdminPageHeader

**`apps/AI-adm-D1/src/pages/AiSettingsPage.tsx`：**

使用 `<AdminPageHeader title="AI 模型設定" subtitle="..." />` 取代自訂 h1，符合後台統一樣式。

---

### 修正 6 — GoogleAiSettingsCard.tsx 去除 @ai-smartbook/ui 依賴

**`apps/AI-adm-D1/src/components/GoogleAiSettingsCard.tsx`：**

- 移除 `import { Card } from "@ai-smartbook/ui"`
- 改用 `<section className="admin-card">` 符合後台樣式系統
- 移除 `React` 具名匯入（JSX transform 不需要）
- 移除 `.js` 副檔名（後台使用 Bundler 模式不需要）

---

## 5. ICO / Appearance 修正確認

以下項目已由 `feat/r2-admin-appearance-image-folder-import-impl` 分支實作並合併：

| 項目 | 狀態 |
|---|---|
| `1.png` → `headerLogoUrl` + `studentHeaderBrandLogoUrl` | ✅ AppearanceSettingsPage.tsx `patch` 函式 |
| `5.png` → `studentHeaderHomeButtonIconUrl` + `iconMode = "image"` | ✅ `patch` 函式 |
| `a.png` → `textSelectionIconUrl` | ✅ `IMPORTABLE_ICON_FIELDS` |
| `b.png` → `smartNoteIconUrl` | ✅ |
| `c.png` → `pasteBackNoteIconUrl` | ✅ |
| `d.png` → `pasteBackAiNoteIconUrl` | ✅ |
| `e.png` → `screenshotAskAiIconUrl` | ✅ |
| `f.png` → `hideAnswerIconUrl` | ✅ |
| PdfReaderToolbar 使用 `useAppearance()` 讀取圖示 | ✅ `ReaderToolbarIcon` 元件（圖片失敗時 fallback emoji）|

---

## 6. 驗證結果

```
pnpm --filter AI-adm-D1 typecheck  ✅ 通過（0 errors）
pnpm --filter AI-adm-D1 build      ✅ 通過（440 kB bundle）
pnpm --filter AI-Stu-R1 typecheck  ✅ 通過（0 errors）
pnpm --filter AI-Stu-R1 build      ✅ 通過（790 kB bundle）
secret grep (AIza, GOOGLE_API_KEY)  ✅ 僅文件範例，無真實 Key
```

---

## 7. 變更檔案摘要

| 檔案 | 變更類型 |
|---|---|
| `.gitignore` | 修改（新增 `apps/AI-adm-D1/data/` 與 `.claude/`）|
| `apps/AI-adm-D1/src/App.tsx` | 修改（新增 AI 設定路由）|
| `apps/AI-adm-D1/src/api.ts` | 修改（新增 AI provider 函式）|
| `apps/AI-adm-D1/src/components/GoogleAiSettingsCard.tsx` | 新增 |
| `apps/AI-adm-D1/src/navigation/adminNav.ts` | 修改（新增 AI 模型設定導覽項目）|
| `apps/AI-adm-D1/src/pages/AiSettingsPage.tsx` | 新增 |
| `apps/AI-adm-D1/src/pages/tabs/FilesTab.tsx` | 修改（中文化 + AI 狀態 + 一鍵完成）|
| `apps/AI-adm-D1/src/server/ai-settings-store.ts` | 新增 |
| `apps/AI-adm-D1/src/server/index.ts` | 修改（AI 設定端點 + 衝突解決）|

---

## 8. Commit 資訊

```
commit 8c9d47825b66d32b95bc4b28f659afcb381a1b64
fix(r2): merge google-ai-settings + appearance branches and integrate

Merge origin/feat/r2-admin-appearance-image-folder-import-impl and
origin/feat/r2-admin-google-ai-settings into fix/r2-admin-settings-files-integration,
then apply all integration fixes:

1. FilesTab.tsx: full Chinese localization
2. FilesTab.tsx: add AI status red/green indicator and one-click workflow block
3. App.tsx + adminNav.ts: add /admin/settings/ai route and nav entry
4. AiSettingsPage.tsx: use AdminPageHeader for consistent admin layout
5. GoogleAiSettingsCard.tsx: remove ui Card dependency; use admin-card CSS class
6. server/index.ts: add AI settings endpoints with fresh-disk-read per request
7. api.ts: add AI provider functions using existing http() helper
8. ai-settings-store.ts: server-side JSON storage; raw key never returned
9. Resolve all merge conflicts; remove dead code from conflict resolution
```

---

## 9. 未完成 / 後續 TODO

| 項目 | 說明 |
|---|---|
| 一鍵完成後端串接 | 目前 `handleOneClick()` 僅為 UI placeholder，需串接真實 workflow API |
| Gemini SDK 整合 | `testAiConnection()` 目前為 placeholder，需真實 API ping |
| Key 加密 at rest | 使用 `AI_SETTINGS_ENCRYPTION_KEY` env secret 加密 `googleApiKeyRaw` |
| Embedding model guard | 後端驗證 embedding 模型不得用於生成任務 |
| 書本 CRUD 完整流程驗證 | 需實機測試 `/admin/books` 頁面及 PDF 上傳流程 |
