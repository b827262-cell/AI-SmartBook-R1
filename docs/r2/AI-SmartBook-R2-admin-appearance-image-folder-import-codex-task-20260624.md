# AI-SmartBook-R2 後台介面設定：圖示與圖片資料夾匯入任務

Executor: Codex  
Date: 2026-06-24

## 1. 任務目標

請在後台「介面設定」頁面擴充圖示 / 圖片設定區，新增系統圖片欄位、筆記功能圖示欄位，並提供依固定檔名批次匯入的功能。

最終需讓管理者可準備一個資料夾，內含 `1.png` 到 `5.png` 與 `a.png` 到 `f.png`，再由後台一次匯入並自動對應欄位。

## 2. 執行規則

- Codex 執行與 commit message 使用英文。
- 最終回報使用繁體中文。
- 不提交 `.env`、DB、logs、`.claude/` 或 runtime upload data。
- 實作前先檢查既有檔案與 schema，不要重複建立相同用途欄位。

## 3. 後台位置

頁面：`介面設定`

請將現有 `ICO 圖示設定` 擴充為：

```text
D. ICO / 圖片設定
自訂後台、學生端與 AI 相關功能的圖片與圖示。
上傳格式：PNG / SVG / WebP / JPG（建議 icon 尺寸 24x24 或 32x32）
```

區塊內建議分成兩組：

1. 系統圖片
2. 筆記功能圖示

## 4. 系統圖片欄位

新增或補齊以下欄位：

| 顯示名稱 | 固定檔名 | 建議設定 key |
|---|---|---|
| Logo 圖片（換圖） | 1.png | headerLogoUrl |
| Banner 圖片 | 2.png | bannerImageUrl |
| 分類圖示（categoryIcon） | 3.png | categoryIconUrl |
| 品牌圖示網址 | 4.png | brandIconUrl |
| 按鈕 icon 網址（studentHeaderHomeButtonIconUrl） | 5.png | studentHeaderHomeButtonIconUrl |

每個欄位要有：

- 名稱
- 固定檔名提示
- 目前圖片預覽
- `更換` 按鈕

## 5. 筆記功能圖示欄位

依照目前 UI 圖示卡片，由左至右、上至下對應：

| 顯示名稱 | 固定檔名 | 建議設定 key |
|---|---|---|
| 文字選取 | a.png | textSelectionIconUrl |
| 智能筆記 | b.png | smartNoteIconUrl |
| 貼回筆記 | c.png | pasteBackNoteIconUrl |
| 貼回 AI 筆記 | d.png | pasteBackAiNoteIconUrl |
| 截圖問 AI | e.png | screenshotAskAiIconUrl |
| 遮答案 | f.png | hideAnswerIconUrl |

每張卡片也要顯示固定檔名提示與 `更換` 按鈕。

## 6. 從資料夾匯入圖示

新增按鈕：

```text
從資料夾匯入圖示
```

輔助文字：

```text
請選擇包含 1.png～5.png 與 a.png～f.png 的資料夾，系統會依檔名自動對應欄位。
```

檔名對應：

```text
1.png → Logo 圖片（換圖）
2.png → Banner 圖片
3.png → 分類圖示（categoryIcon）
4.png → 品牌圖示網址
5.png → 按鈕 icon 網址（studentHeaderHomeButtonIconUrl）
a.png → 文字選取
b.png → 智能筆記
c.png → 貼回筆記
d.png → 貼回 AI 筆記
e.png → 截圖問 AI
f.png → 遮答案
```

前端可使用資料夾選取或多檔選取。若資料夾選取在型別上較麻煩，多檔選取可作為 fallback。

匯入規則：

- 依檔案 basename 比對，例如 `folder/1.png` 仍視為 `1.png`。
- 找到對應檔案後上傳並更新該欄位預覽。
- 缺少的檔案不得清空原設定。
- 未對應的檔案略過並提示。

訊息範例：

```text
已匯入 11 個圖示。
部分檔案未找到：2.png、e.png。已匯入其餘檔案。
已略過未對應檔案：readme.txt、old-logo.png。
```

## 7. 需要檢查的檔案

請先搜尋實際檔案名稱：

```bash
find apps/AI-adm-D1/src -type f | grep -Ei "appearance|setting|upload|api|icon|image"
find packages -type f | grep -Ei "appearance|schema|setting|icon|image"
```

可能相關：

```text
apps/AI-adm-D1/src/api.ts
apps/AI-adm-D1/src/server/index.ts
packages/schema/src/appearance.schema.ts
```

## 8. Schema / API 注意事項

確認或新增以下 setting keys：

```text
headerLogoUrl
bannerImageUrl
categoryIconUrl
brandIconUrl
studentHeaderHomeButtonIconUrl
textSelectionIconUrl
smartNoteIconUrl
pasteBackNoteIconUrl
pasteBackAiNoteIconUrl
screenshotAskAiIconUrl
hideAnswerIconUrl
```

沿用既有圖片上傳 API。如果要新增上傳 API，請只允許圖片格式：

```text
png, svg, webp, jpg, jpeg
```

## 9. 驗證指令

至少執行：

```bash
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-adm-D1 build
```

若 schema package 有獨立 typecheck，也請執行。

## 10. 手動驗證

1. 開啟後台。
2. 進入 `介面設定`。
3. 確認 `D. ICO / 圖片設定` 出現。
4. 確認 `1.png` 到 `5.png` 系統圖片欄位存在。
5. 確認 `a.png` 到 `f.png` 筆記功能圖示欄位存在。
6. 單張點擊 `更換` 可以更新預覽。
7. 點擊 `從資料夾匯入圖示`。
8. 選取包含固定檔名的資料夾或多個檔案。
9. 確認每個檔案對應到正確欄位。
10. 按 `儲存設定` 後重新整理，設定仍存在。

## 11. Acceptance Criteria

- 後台 `介面設定` 已新增系統圖片欄位。
- 筆記功能圖示支援 `a.png` 到 `f.png` 固定檔名提示。
- 支援資料夾或多檔案批次匯入。
- 匯入結果有清楚提示。
- 缺檔不會清空原設定。
- Typecheck 通過。
- Build 通過。
- 未提交 runtime files、DB、logs、`.env`、`.claude/`。

## 12. Suggested Commit Messages

```bash
git commit -m "feat(r2): add appearance image folder import"
git commit -m "docs(r2): record appearance image import verification"
```

## 13. 最終回報格式

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
  - ...

- 圖片 / ICO 對應:
  - 1.png → Logo 圖片（換圖）:
  - 2.png → Banner 圖片:
  - 3.png → 分類圖示（categoryIcon）:
  - 4.png → 品牌圖示網址:
  - 5.png → studentHeaderHomeButtonIconUrl:
  - a.png → 文字選取:
  - b.png → 智能筆記:
  - c.png → 貼回筆記:
  - d.png → 貼回 AI 筆記:
  - e.png → 截圖問 AI:
  - f.png → 遮答案:

- 驗證結果:
  - typecheck:
  - build:
  - manual folder import:

- git status --short:
```
