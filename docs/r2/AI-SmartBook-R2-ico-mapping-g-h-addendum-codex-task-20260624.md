# AI-SmartBook-R2｜D. ICO / 圖片設定 g.png、h.png 對應修正任務

Executor: Codex  
Date: 2026-06-24

## 1. 任務目標

依最新 UI 方向調整後台 `介面設定` 的 `D. ICO / 圖片設定`。

本次重點：

```text
分類圖示（categoryIcon）改由 g.png 匯入
按鈕 icon 網址（studentHeaderHomeButtonIconUrl）改由 h.png 匯入
```

此任務是對前一份 `studentHeaderBrandLogoUrl -> 6.png` 任務的補充修正。

## 2. 最新檔名對應規則

### 2.1 系統圖片 / Header 圖片

| 固定檔名 | 欄位 | 顯示名稱 |
|---|---|---|
| 1.png | headerLogoUrl | 後台 Header / 系統 Logo 圖片 |
| 2.png | bannerImageUrl 或 bannerIconUrl | Banner 圖片，依既有 schema 命名沿用 |
| 4.png | brandIconUrl | 品牌圖示網址，若既有功能仍需保留 |
| 6.png | studentHeaderBrandLogoUrl | 前台 Header 品牌圖示 |

### 2.2 D. ICO / 圖片設定中的功能 icon

請依附圖方向，讓 ICO 區主要呈現功能圖示卡片。

| 固定檔名 | 欄位 | 顯示名稱 |
|---|---|---|
| a.png | textSelectionIconUrl | 文字選取 |
| b.png | smartNoteIconUrl | 智能筆記 |
| c.png | pasteBackNoteIconUrl | 貼回筆記 / 貼圖筆記 |
| d.png | pasteBackAiNoteIconUrl | 貼回 AI 筆記 |
| e.png | screenshotAskAiIconUrl | 截圖問 AI |
| f.png | hideAnswerIconUrl | 遮答案 |
| g.png | categoryIconUrl 或 categoryIcon | 分類圖示（categoryIcon） |
| h.png | studentHeaderHomeButtonIconUrl | 按鈕 icon 網址（studentHeaderHomeButtonIconUrl） |

## 3. 重要變更

### 3.1 categoryIcon 改為 g.png

原先如果有：

```text
3.png -> categoryIconUrl
```

請改為：

```text
g.png -> categoryIconUrl 或 categoryIcon
```

若專案同時有 `categoryIcon` 與 `categoryIconUrl`：

- 若前台顯示圖片，優先使用 `categoryIconUrl`。
- 若 `categoryIcon` 是 emoji / 文字 fallback，請保留 fallback，不要破壞既有行為。
- 匯入 `g.png` 時應寫入圖片 URL 欄位，例如 `categoryIconUrl`。

### 3.2 studentHeaderHomeButtonIconUrl 改為 h.png

原先如果有：

```text
5.png -> studentHeaderHomeButtonIconUrl
```

請改為：

```text
h.png -> studentHeaderHomeButtonIconUrl
```

匯入 `h.png` 時仍需自動設定：

```text
studentHeaderHomeButtonIconMode = image
```

### 3.3 6.png 維持前台 Header 品牌圖示

請保留：

```text
6.png -> studentHeaderBrandLogoUrl
```

並確認 `前台 Header / 導覽列設定` 品牌區不要重複出現 `studentHeaderBrandLogoUrl` 欄位。該欄位應集中在 `D. ICO / 圖片設定`。

## 4. 匯入提示文字更新

把資料夾匯入提示更新為：

```text
請選擇包含 1.png、2.png、4.png、6.png 與 a.png～h.png 的資料夾，系統會依檔名自動對應欄位。
```

若為了相容舊版，也可在說明中補充：

```text
舊版 3.png、5.png 不再作為主要對應；請改用 g.png、h.png。
```

## 5. UI 顯示要求

在 `D. ICO / 圖片設定` 中顯示以下卡片：

```text
文字選取          a.png
智能筆記          b.png
貼回筆記          c.png
貼回 AI 筆記      d.png
截圖問 AI         e.png
遮答案            f.png
分類圖示          g.png
按鈕 icon         h.png
前台 Header 品牌圖示 6.png
```

每張卡片都需顯示：

- 標題
- 固定檔名
- 圖片預覽
- 更換按鈕

## 6. 前台套用要求

請確認前台讀取以下欄位：

```text
studentHeaderBrandLogoUrl -> Header 品牌圖示，來自 6.png
studentHeaderHomeButtonIconUrl -> 首頁按鈕 icon，來自 h.png
categoryIconUrl -> 分類圖示，來自 g.png
textSelectionIconUrl -> a.png
smartNoteIconUrl -> b.png
pasteBackNoteIconUrl -> c.png
pasteBackAiNoteIconUrl -> d.png
screenshotAskAiIconUrl -> e.png
hideAnswerIconUrl -> f.png
```

圖片載入失敗時，必須 fallback 原本 emoji / 預設 icon。

## 7. 需檢查檔案

請先搜尋實際檔案：

```bash
find apps/AI-adm-D1/src -type f | grep -Ei "appearance|setting|icon|image|upload"
find apps/AI-Stu-R1/src -type f | grep -Ei "appearance|StudentHeader|BookCategory|Toolbar|icon"
find packages -type f | grep -Ei "appearance|schema"
```

可能相關：

```text
apps/AI-adm-D1/src/pages/AppearanceSettingsPage.tsx
apps/AI-Stu-R1/src/components/StudentHeader.tsx
apps/AI-Stu-R1/src/components/PdfReaderToolbar.tsx
packages/schema/src/appearance.schema.ts
```

## 8. 驗證指令

```bash
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
```

## 9. 手動驗證

1. 後台進入 `介面設定`。
2. 確認 `D. ICO / 圖片設定` 卡片顯示 g.png 與 h.png。
3. 使用資料夾匯入，確認：
   - `g.png` 寫入分類圖示欄位。
   - `h.png` 寫入首頁按鈕 icon 欄位。
   - `h.png` 匯入後 `studentHeaderHomeButtonIconMode` 為 `image`。
4. 儲存設定後重新整理後台，確認設定仍存在。
5. 前台 `/books` 重新整理，確認：
   - Header 品牌圖示使用 6.png。
   - 首頁按鈕 icon 使用 h.png。
   - 分類圖示使用 g.png。
6. 前台閱讀器重新整理，確認 a.png～f.png 對應工具列 icon。

## 10. Acceptance Criteria

- g.png 對應分類圖示。
- h.png 對應 studentHeaderHomeButtonIconUrl。
- h.png 匯入時自動設定 studentHeaderHomeButtonIconMode = image。
- 6.png 仍對應 studentHeaderBrandLogoUrl。
- D. ICO / 圖片設定顯示 g.png、h.png 卡片。
- 前台重新整理後可以看到 g.png、h.png、6.png 的效果。
- Typecheck / build 通過。
- 不提交 `.env`、DB、logs、`.claude/`、runtime upload data。

## 11. Suggested Commit Message

```bash
git commit -m "fix(r2): update appearance icon import mapping"
```

## 12. 最終回報格式

```text
## 最終報告（繁體中文）

- 狀態
  - success:
  - failure:
  - blocker:
  - permission-halt:

- current branch:
- current commit SHA:

- changed files:
  - ...

- 實作摘要:
  - g.png 已對應分類圖示
  - h.png 已對應 studentHeaderHomeButtonIconUrl
  - h.png 匯入時會設定 studentHeaderHomeButtonIconMode = image
  - 6.png 維持 studentHeaderBrandLogoUrl

- 驗證結果:
  - AI-adm-D1 typecheck:
  - AI-adm-D1 build:
  - AI-Stu-R1 typecheck:
  - AI-Stu-R1 build:
  - 前台瀏覽器驗證:

- git status --short:
```
