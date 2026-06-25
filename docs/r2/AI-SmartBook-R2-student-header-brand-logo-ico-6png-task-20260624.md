# AI-SmartBook-R2｜前台 Header 品牌圖示移至 ICO 區 6.png 修正任務

Executor: Codex
Date: 2026-06-24

## 1. 任務目標

調整後台 `介面設定` 的圖片 / ICO 欄位配置。

目前 `前台 Header / 導覽列設定` 的品牌區中，有欄位：

```text
品牌圖示網址（studentHeaderBrandLogoUrl）
```

目前示例值：

```text
/api/uploads/appearance/1781249343405_9ee8d9.png
```

需求變更：

```text
studentHeaderBrandLogoUrl 不再放在「前台 Header / 導覽列設定」品牌區。
請移到 ICO / 圖片設定區，固定檔名為 6.png。
```

## 2. 新的固定檔名規則

更新 `D. ICO / 圖片設定` 的系統圖片 mapping。

| 固定檔名 | 欄位 | 說明 |
|---|---|---|
| 1.png | headerLogoUrl | 後台 Header / 系統 Logo 圖片 |
| 2.png | bannerImageUrl 或 bannerIconUrl | Banner 圖片，依現有 schema 命名沿用 |
| 3.png | categoryIconUrl | 分類圖示 |
| 4.png | brandIconUrl | 品牌圖示網址，若現有功能仍需保留 |
| 5.png | studentHeaderHomeButtonIconUrl | 前台首頁按鈕 icon；匯入時需自動設定 studentHeaderHomeButtonIconMode = image |
| 6.png | studentHeaderBrandLogoUrl | 前台 Header 品牌圖示 |

筆記功能圖示維持：

| 固定檔名 | 欄位 |
|---|---|
| a.png | textSelectionIconUrl |
| b.png | smartNoteIconUrl |
| c.png | pasteBackNoteIconUrl |
| d.png | pasteBackAiNoteIconUrl |
| e.png | screenshotAskAiIconUrl |
| f.png | hideAnswerIconUrl |

## 3. 後台 UI 調整

### 3.1 移除原位置

在 `前台 Header / 導覽列設定` 的品牌區，移除或隱藏：

```text
品牌圖示網址（studentHeaderBrandLogoUrl）
```

避免同一欄位在兩個區塊重複設定。

### 3.2 新增到 ICO / 圖片設定區

在 `D. ICO / 圖片設定` 的 `系統圖片` 群組中新增卡片：

```text
前台 Header 品牌圖示
固定檔名：6.png
設定 key：studentHeaderBrandLogoUrl
```

卡片需與其他 ICO 卡片一致，包含：

- 標題
- 固定檔名提示
- 目前圖片預覽
- `更換` 按鈕

## 4. 匯入流程調整

`從資料夾匯入圖示` 需支援 `6.png`。

新增對應：

```text
6.png → studentHeaderBrandLogoUrl → 前台 Header 品牌圖示
```

更新匯入提示文字：

```text
請選擇包含 1.png～6.png 與 a.png～f.png 的資料夾，系統會依檔名自動對應欄位。
```

匯入成功訊息可改為：

```text
已匯入 12 個圖示。
```

缺檔提示也需包含 6.png 的可能性。

## 5. 前台行為

前台 `StudentHeader` 應繼續讀取：

```text
studentHeaderBrandLogoUrl
```

行為不變：

- 有值且圖片載入成功：顯示該圖片。
- 無值或圖片載入失敗：fallback 既有品牌 icon。

本任務只調整後台欄位位置與匯入 mapping，不需要改變前台顯示邏輯，除非目前前台未正確讀取該欄位。

## 6. 需檢查檔案

請先檢查實際檔案名稱與欄位：

```bash
find apps/AI-adm-D1/src -type f | grep -Ei "appearance|setting|header|icon|image|upload"
find apps/AI-Stu-R1/src -type f | grep -Ei "StudentHeader|appearance|header|icon"
find packages -type f | grep -Ei "appearance|schema"
```

已知可能相關：

```text
apps/AI-adm-D1/src/pages/AppearanceSettingsPage.tsx
apps/AI-Stu-R1/src/components/StudentHeader.tsx
packages/schema/src/appearance.schema.ts
```

## 7. 驗證

請至少執行：

```bash
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
```

手動驗證：

1. 進入後台 `介面設定`。
2. 確認 `前台 Header / 導覽列設定` 不再出現 `品牌圖示網址（studentHeaderBrandLogoUrl）`。
3. 確認 `D. ICO / 圖片設定` 中出現：
   - `前台 Header 品牌圖示`
   - `固定檔名：6.png`
4. 使用 `更換` 上傳圖片，儲存後重新整理確認仍存在。
5. 使用 `從資料夾匯入圖示`，選擇包含 `6.png` 的資料夾，確認自動寫入 `studentHeaderBrandLogoUrl`。
6. 前台 `/books` 重新整理後，確認 Header 品牌圖示顯示 6.png。

## 8. Acceptance Criteria

- `studentHeaderBrandLogoUrl` 已從 `前台 Header / 導覽列設定` 品牌區移除。
- `studentHeaderBrandLogoUrl` 已移至 `D. ICO / 圖片設定`。
- `6.png` 固定對應 `studentHeaderBrandLogoUrl`。
- 資料夾匯入支援 `1.png～6.png` 與 `a.png～f.png`。
- 前台 Header 重新整理後可看到 6.png 對應圖片。
- Typecheck / build 通過。
- `.env`、DB、logs、`.claude/`、runtime upload data 未提交。

## 9. Suggested Commit Message

```bash
git commit -m "fix(r2): move student header brand logo to ico import"
```

## 10. 最終回報格式

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
  - studentHeaderBrandLogoUrl 已移至 ICO 區 6.png
  - 前台 Header / 導覽列設定已移除品牌圖示網址欄位
  - 資料夾匯入已支援 6.png

- 驗證結果:
  - AI-adm-D1 typecheck:
  - AI-adm-D1 build:
  - AI-Stu-R1 typecheck:
  - AI-Stu-R1 build:
  - 前台 /books Header 品牌圖示:

- git status --short:
```
