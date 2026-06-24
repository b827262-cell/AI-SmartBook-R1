# AI-SmartBook-R2｜D. ICO / 圖片設定 4×4 宮格版修正任務

Executor: Codex  
Date: 2026-06-24

## 1. 任務目標

將後台 `介面設定` 的 `D. ICO / 圖片設定` 改成 **4×4 宮格** 呈現。

目前先採用 4×4 共 16 格配置，後續可再依實際功能數量調整。

本任務重點：

```text
D. ICO / 圖片設定使用 4×4 宮格版面。
每一格都是一個可設定圖示卡片。
每格包含：標題、固定檔名、圖片預覽、更換按鈕。
支援資料夾匯入固定檔名圖片。
```

## 2. 版面方向

### 2.1 4×4 宮格配置

請將 `D. ICO / 圖片設定` 內的圖示卡片改為 4 欄 × 4 列。

建議配置如下：

```text
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ 文字選取     │ 智能筆記     │ 貼回筆記     │ 貼回 AI 筆記 │
│ a.png        │ b.png        │ c.png        │ d.png        │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ 截圖問 AI    │ 遮答案       │ 分類圖示     │ 按鈕 icon    │
│ e.png        │ f.png        │ g.png        │ h.png        │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ Header 品牌  │ 後台 Logo    │ Banner 圖片  │ 品牌圖示     │
│ 6.png        │ 1.png        │ 2.png        │ 4.png        │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ 預留 1       │ 預留 2       │ 預留 3       │ 預留 4       │
│ empty        │ empty        │ empty        │ empty        │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

第 4 列先保留為預留欄位，方便後續擴充。

## 3. 固定檔名與欄位對應

### 3.1 目前啟用欄位

| 位置 | 顯示名稱 | 固定檔名 | Setting key | 前台用途 |
|---:|---|---|---|---|
| 1 | 文字選取 | a.png | textSelectionIconUrl | PDF 工具列 |
| 2 | 智能筆記 | b.png | smartNoteIconUrl | PDF 工具列 |
| 3 | 貼回筆記 | c.png | pasteBackNoteIconUrl | PDF 工具列 |
| 4 | 貼回 AI 筆記 | d.png | pasteBackAiNoteIconUrl | PDF 工具列 |
| 5 | 截圖問 AI | e.png | screenshotAskAiIconUrl | PDF 工具列 |
| 6 | 遮答案 | f.png | hideAnswerIconUrl | PDF 工具列 |
| 7 | 分類圖示 | g.png | categoryIconUrl | 前台書籍分類 |
| 8 | 按鈕 icon | h.png | studentHeaderHomeButtonIconUrl | 前台 Header 首頁按鈕 |
| 9 | Header 品牌 | 6.png | studentHeaderBrandLogoUrl | 前台 Header 品牌圖示 |
| 10 | 後台 Logo | 1.png | headerLogoUrl | 後台 Header / 系統 Logo |
| 11 | Banner 圖片 | 2.png | bannerImageUrl 或 bannerIconUrl | Banner 圖片，依既有 schema 沿用 |
| 12 | 品牌圖示 | 4.png | brandIconUrl | 品牌圖示網址 |

### 3.2 預留欄位

第 13～16 格先保留，不需連動實際 setting key。

建議顯示：

```text
預留 1
預留 2
預留 3
預留 4
```

預留卡片可採 disabled 狀態，顯示：

```text
尚未啟用
```

## 4. UI 要求

### 4.1 區塊標題

保留或調整為：

```text
D. ICO / 圖片設定
自訂學生端筆記、AI、前台 Header 與系統相關功能的圖片與圖示。
```

### 4.2 上傳格式提示

```text
上傳格式：PNG / SVG / WebP / JPG（建議 icon 尺寸 24x24 或 32x32）
```

### 4.3 資料夾匯入提示

更新為：

```text
請選擇包含 1.png、2.png、4.png、6.png 與 a.png～h.png 的資料夾，系統會依檔名自動對應欄位。
```

### 4.4 每個圖示卡片內容

每格卡片需顯示：

```text
圖示名稱
固定檔名：xxx.png
圖片預覽
更換
```

例如：

```text
文字選取
固定檔名：a.png
[預覽圖]
[更換]
```

### 4.5 4×4 CSS 建議

可使用 CSS grid：

```css
.appearance-icon-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 1100px) {
  .appearance-icon-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .appearance-icon-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .appearance-icon-grid {
    grid-template-columns: 1fr;
  }
}
```

在桌面版主要呈現 4×4，窄螢幕再自動換行。

## 5. 匯入流程要求

`從資料夾匯入圖示` 需支援以下檔名：

```text
a.png
b.png
c.png
d.png
e.png
f.png
g.png
h.png
1.png
2.png
4.png
6.png
```

匯入規則：

1. 依 basename 比對，例如 `icons/a.png` 視為 `a.png`。
2. 找到對應檔案後，上傳並更新對應欄位。
3. 缺少的檔案不得清空既有欄位。
4. 未對應的檔案略過並顯示提示。
5. h.png 匯入時，除了寫入 `studentHeaderHomeButtonIconUrl`，也必須設定：

```text
studentHeaderHomeButtonIconMode = image
```

## 6. 前台套用要求

請確認前台仍正確讀取：

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

圖片載入失敗時，fallback 原本 emoji / 預設 icon。

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
apps/AI-adm-D1/src/styles.css
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
2. 確認 `D. ICO / 圖片設定` 使用 4×4 宮格。
3. 確認前 12 格顯示正確名稱與固定檔名。
4. 確認第 13～16 格為預留欄位或 disabled 狀態。
5. 使用單張 `更換` 功能，確認預覽會更新。
6. 使用 `從資料夾匯入圖示`，選擇包含指定檔名的資料夾。
7. 確認 a.png～h.png、1.png、2.png、4.png、6.png 對應正確。
8. 儲存後重新整理後台，確認設定仍存在。
9. 前台 `/books` 重新整理，確認 Header 品牌、首頁按鈕 icon、分類圖示生效。
10. 前台閱讀器重新整理，確認 a.png～f.png 對應工具列 icon。

## 10. Acceptance Criteria

- `D. ICO / 圖片設定` 已改為桌面版 4×4 宮格。
- 前 12 格對應既有功能圖示與系統圖片。
- 第 13～16 格可先作為預留欄位。
- 資料夾匯入支援 a.png～h.png、1.png、2.png、4.png、6.png。
- h.png 匯入會設定 `studentHeaderHomeButtonIconMode = image`。
- 前台重新整理後可看到 icon 更新。
- Typecheck / build 通過。
- 不提交 `.env`、DB、logs、`.claude/`、runtime upload data。

## 11. Suggested Commit Message

```bash
git commit -m "feat(r2): use 4x4 grid for appearance icons"
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
  - D. ICO / 圖片設定已改為 4×4 宮格
  - a.png～h.png、1.png、2.png、4.png、6.png 已納入匯入 mapping
  - 第 13～16 格目前為預留欄位

- 驗證結果:
  - AI-adm-D1 typecheck:
  - AI-adm-D1 build:
  - AI-Stu-R1 typecheck:
  - AI-Stu-R1 build:
  - 前台瀏覽器驗證:

- git status --short:
```
