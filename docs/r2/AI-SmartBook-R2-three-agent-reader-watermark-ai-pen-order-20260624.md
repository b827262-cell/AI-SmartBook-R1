# AI-SmartBook-R2｜三 Agent 並行任務：Reader 開關、浮水印、AI 排版與 PDF 筆工具

日期：2026-06-24  
Repository：`b827262-cell/AI-SmartBook-R1`  
Base branch：`fix/r2-smart-features-final-integration`  
目的：依使用者最新 Reader 實測截圖與需求，將新增功能拆成三個 agent 並行執行，加速完成後台閱讀器開關、浮水印、貼回 AI / 截圖 AI 排版、PDF 筆工具可直接書寫。

---

## 1. 使用者需求摘要

使用者提供 5 張 Reader 實測圖，並提出以下需求：

1. 後台「閱讀器功能開關」需新增兩個功能：
   - `文字選取`
   - `遮答案`
2. 後台需新增 `浮水印` 開關。
3. 浮水印內容請直接抓 PDF 最後一頁，使用者指定需辨識：
   - `51MG122110`
   - `ISBN 978-626-411-527-8`
4. 浮水印需新增透明度調整。
5. `貼回 AI 筆記` 按下後，右側 AI 筆記面板排版需穩定。
6. `截圖問 AI` 按下後，框選 OCR 區域與右側 AI 面板排版需穩定。
7. `筆` 工具目前無法實際畫在 PDF 上，需修到可直接書寫。
8. 筆工具需支援粗細：`細 / 中 / 粗`。

---

## 2. 理解確認圖

已產出需求理解確認圖，用於對齊需求：

```text
/mnt/data/閱讀器需求理解確認圖.png
```

圖中確認 5 個區塊：

1. 閱讀器功能開關（後台）：文字選取、遮答案、浮水印、透明度、最後一頁內容預覽。
2. 閱讀器正常排版：工具列與 PDF 區固定為標準基準。
3. 按下「貼回 AI」後：右側開啟 AI 筆記編輯區。
4. 按下「截圖問 AI」後：PDF 區支援框選 OCR，右側 AI 面板不被遮罩蓋住。
5. 筆工具可直接畫在 PDF 上：支援細 / 中 / 粗與顏色。

---

## 3. 三 Agent 分工總表

| Agent | 建議模型 | 分支 | 任務定位 | 是否可並行 |
|---|---|---|---|---|
| Agent 1 | Claude / GPT-5.4 High | `fix/r2-reader-settings-watermark` | 後台閱讀器設定、文字選取 / 遮答案 / 浮水印 schema、API、UI、最後頁擷取 | 可並行 |
| Agent 2 | Claude / GPT-5.4 Medium | `fix/r2-reader-ai-panel-layout` | 貼回 AI 筆記與截圖問 AI 排版、右側 AI 面板、crop overlay 互動 | 可並行 |
| Agent 3 | Codex / GPT-5.4 Medium | `fix/r2-reader-pdf-pen-annotation` | PDF 筆工具直接書寫、細中粗、顏色、座標對齊、儲存/撤銷檢查 | 可並行 |

---

## 4. 共同規則

三個 agent 均需遵守：

1. 不得提交 `.env`、API key、DB dump、logs、runtime upload data、temporary browser folder。
2. 不得破壞已完成的：
   - `/admin/settings/reader-features`
   - `GET /api/admin/settings/reader-features`
   - `PUT /api/admin/settings/reader-features`
   - `GET /api/student/settings/reader-features`
   - note 4 欄 toggles
   - PDF 7 欄 toggles
   - Admin nav duplicate key 修復
   - 智能影音 route
   - Knowledge 100
   - Reader TOC fallback
   - Google knowledge generation service
3. 預設值必須安全：若新設定缺欄位，Reader 不可白畫面。
4. 三個分支完成後不得直接 merge main，需回到 `fix/r2-smart-features-final-integration` 做整合。
5. 每個 agent 完成後需產出 report 到 `docs/r2/`。

---

## 5. Agent 1：Reader Settings / Watermark

### 5.1 工作分支

```bash
git fetch origin
git checkout fix/r2-smart-features-final-integration
git pull origin fix/r2-smart-features-final-integration
git checkout -b fix/r2-reader-settings-watermark
```

若分支已存在：

```bash
git checkout fix/r2-reader-settings-watermark
git pull origin fix/r2-reader-settings-watermark
```

### 5.2 任務目標

在既有 reader feature settings 中補上：

1. 文字選取開關。
2. 遮答案開關。
3. 浮水印開關。
4. 浮水印透明度。
5. 浮水印內容從 PDF 最後一頁擷取。
6. 後台 UI 可保存，學生端 API 可讀。

### 5.3 建議設定結構

請優先沿用現有 `ReaderFeatureSettings`，不要重建另一套 settings。

建議新增：

```ts
type ReaderExtraFeatureSettings = {
  textSelectionEnabled: boolean;
  answerMaskEnabled: boolean;
};

type WatermarkSettings = {
  enabled: boolean;
  opacity: number;
  source: 'last_pdf_page' | 'manual';
  extractedCode?: string;
  extractedIsbn?: string;
  text?: string;
};
```

預設值建議：

```text
textSelectionEnabled: true
answerMaskEnabled: true
watermark.enabled: true 或依現況採 false；若啟用，透明度需低，避免干擾閱讀
watermark.opacity: 0.08 ~ 0.15 或 UI 顯示 50% 但實際需說明 mapping
watermark.source: last_pdf_page
```

### 5.4 浮水印最後一頁擷取

需能從 PDF 最後一頁抓出：

```text
51MG122110
ISBN 978-626-411-527-8
```

實作要求：

1. 優先使用現有 PDF text extraction / page text / sentence-index / OCR pipeline。
2. 若無現成能力，提供最小可用 adapter，並在 report 說明限制。
3. 辨識 regex 需支援：
   - 代碼：例如 `51MG122110`
   - ISBN：例如 `ISBN 978-626-411-527-8`
4. 若擷取失敗，不可讓 API 或 Reader 崩潰。
5. 後台 UI 需能看到預覽或空狀態。

### 5.5 後台 UI

在 `/admin/settings/reader-features` 補：

```text
文字選取 toggle
遮答案 toggle
浮水印 toggle
浮水印透明度 slider
浮水印內容預覽：51MG122110 / ISBN 978-626-411-527-8
```

### 5.6 API 驗收

```bash
curl -i http://127.0.0.1:4300/api/admin/settings/reader-features
curl -i http://127.0.0.1:4300/api/student/settings/reader-features
```

需看到新增欄位或等效結構。

### 5.7 Agent 1 不負責

不要處理：

```text
貼回 AI 右側面板排版
截圖問 AI crop overlay 排版
PDF 筆工具實際書寫
```

### 5.8 驗證

```bash
pnpm --filter AI-adm-D1 typecheck
pnpm --filter AI-adm-D1 build
pnpm --filter AI-Stu-R1 typecheck
pnpm --filter AI-Stu-R1 build
```

### 5.9 報告檔

請新增：

```text
docs/r2/AI-SmartBook-R2-agent1-reader-settings-watermark-report-20260624.md
```

### 5.10 Commit message

```bash
git commit -m "fix(r2): add reader text selection answer mask and watermark settings"
```

---

## 6. Agent 2：貼回 AI / 截圖 AI 排版

### 6.1 工作分支

```bash
git fetch origin
git checkout fix/r2-smart-features-final-integration
git pull origin fix/r2-smart-features-final-integration
git checkout -b fix/r2-reader-ai-panel-layout
```

若分支已存在：

```bash
git checkout fix/r2-reader-ai-panel-layout
git pull origin fix/r2-reader-ai-panel-layout
```

### 6.2 任務目標

修正 Reader 按下：

```text
貼回 AI 筆記
截圖問 AI
```

後的排版與互動。

### 6.3 貼回 AI 筆記排版要求

按下 `貼回AI筆記` 後：

1. PDF 保留在左側。
2. 右側開啟 AI 筆記編輯區。
3. 右側面板包含：
   - Google AI tab
   - + 新增
   - 筆記標題欄位
   - 來源 AI tabs
   - AI 回答 textarea
   - 自動按鈕
4. 右側面板不可覆蓋 PDF 工具列。
5. PDF 區域不可被壓到不可用。
6. 100% zoom 下不可橫向破版。
7. 寬度較小時需合理 RWD。

### 6.4 截圖問 AI 排版要求

按下 `截圖問AI` 後：

1. PDF 左側進入 crop / OCR 模式。
2. PDF 區域可呈現暗色遮罩。
3. 橘色 crop rectangle 有 handles，可拖曳調整。
4. OCR / 整頁 / 取消按鈕位置穩定。
5. 遮罩只套用 PDF 區，不覆蓋右側 AI 面板。
6. 右側 AI 面板仍可操作。
7. 取消截圖後排版恢復正常。

### 6.5 Agent 2 不負責

不要處理：

```text
後台 reader feature settings schema/API
浮水印最後頁擷取
PDF 筆工具繪圖引擎
```

若需要讀取新設定，請只使用 Agent 1 定義的 API contract 或 safe fallback。

### 6.6 建議檢查檔案

```bash
grep -R "貼回AI" apps/AI-Stu-R1/src -n
grep -R "截圖問" apps/AI-Stu-R1/src -n
grep -R "Google AI" apps/AI-Stu-R1/src -n
grep -R "OCR" apps/AI-Stu-R1/src -n
grep -R "crop" apps/AI-Stu-R1/src -n
```

### 6.7 驗證

```bash
pnpm --filter AI-Stu-R1 typecheck
pnpm --filter AI-Stu-R1 build
```

人工驗收：

```text
1. 正常 Reader 排版穩定。
2. 按貼回 AI，右側 AI panel 正確開啟。
3. 按截圖 AI，crop overlay 只作用 PDF 區。
4. 右側 AI panel 不被遮罩蓋住。
5. 取消截圖後回復正常。
```

### 6.8 報告檔

請新增：

```text
docs/r2/AI-SmartBook-R2-agent2-reader-ai-panel-layout-report-20260624.md
```

### 6.9 Commit message

```bash
git commit -m "fix(r2): stabilize reader AI panel and screenshot layout"
```

---

## 7. Agent 3：PDF 筆工具與 Annotation Layer

### 7.1 工作分支

```bash
git fetch origin
git checkout fix/r2-smart-features-final-integration
git pull origin fix/r2-smart-features-final-integration
git checkout -b fix/r2-reader-pdf-pen-annotation
```

若分支已存在：

```bash
git checkout fix/r2-reader-pdf-pen-annotation
git pull origin fix/r2-reader-pdf-pen-annotation
```

### 7.2 任務目標

修正使用者回報：目前選擇 `筆` 後無法實際畫在 PDF 上。

需實作：

1. 筆工具可以直接在 PDF 上書寫。
2. 支援粗細：`細 / 中 / 粗`。
3. 支援顏色。
4. 筆跡座標與 PDF page 對齊。
5. 不破壞 PDF 原始 canvas。
6. 盡可能接上撤銷 / 恢復 / 存到手稿。

### 7.3 建議技術方向

```text
PDF canvas 只負責渲染 PDF。
在 PDF page container 上建立 annotation overlay layer。
筆跡用 SVG path 或 overlay canvas 儲存。
pen mode 啟動 pointerdown / pointermove / pointerup。
座標依 zoom / scale 換算。
```

### 7.4 粗細 mapping

建議：

```text
細：2px
中：4px
粗：7px 或 8px
```

實際 mapping 請在 report 說明。

### 7.5 Agent 3 不負責

不要處理：

```text
後台 reader feature settings schema/API
浮水印最後頁擷取
貼回 AI / 截圖 AI 面板排版
```

### 7.6 建議檢查檔案

```bash
grep -R "PdfReaderToolbar" apps/AI-Stu-R1/src -n
grep -R "pen" apps/AI-Stu-R1/src -n
grep -R "annotation" apps/AI-Stu-R1/src -n
grep -R "存到手稿" apps/AI-Stu-R1/src -n
grep -R "undo" apps/AI-Stu-R1/src -n
```

### 7.7 驗證

```bash
pnpm --filter AI-Stu-R1 typecheck
pnpm --filter AI-Stu-R1 build
```

人工驗收：

```text
1. 選擇筆。
2. 選擇顏色。
3. 選擇細 / 中 / 粗。
4. 在 PDF 文字區直接拖曳書寫。
5. 看到筆跡出現在 PDF 上。
6. 換頁或縮放後，不應嚴重錯位。
7. 撤銷 / 恢復如已有功能，需能運作。
8. 存到手稿如已有功能，需不報錯。
```

### 7.8 報告檔

請新增：

```text
docs/r2/AI-SmartBook-R2-agent3-reader-pdf-pen-annotation-report-20260624.md
```

### 7.9 Commit message

```bash
git commit -m "fix(r2): enable pen annotations on PDF reader"
```

---

## 8. 三分支整合順序

三個 agent 完成後，回到整合分支：

```bash
git fetch origin
git checkout fix/r2-smart-features-final-integration
git pull origin fix/r2-smart-features-final-integration
```

建議合併順序：

```bash
git merge --no-ff origin/fix/r2-reader-settings-watermark
git merge --no-ff origin/fix/r2-reader-ai-panel-layout
git merge --no-ff origin/fix/r2-reader-pdf-pen-annotation
```

Conflict 保留原則：

| Conflict 區域 | 保留原則 |
|---|---|
| reader settings schema/API/admin UI | Agent 1 優先 |
| AI panel / crop layout CSS / component | Agent 2 優先 |
| PDF annotation overlay / pen pointer events | Agent 3 優先 |
| shared Reader toolbar props | 三者對齊，不能覆蓋彼此新增 props |

---

## 9. 整合後必跑驗證

```bash
pnpm --filter AI-adm-D1 typecheck
pnpm --filter AI-adm-D1 build
pnpm --filter AI-Stu-R1 typecheck
pnpm --filter AI-Stu-R1 build
```

```bash
git status
git ls-files | grep -E '(^|/)\.env(\.|$)' || true
```

---

## 10. 整合後人工驗收

### 10.1 後台

打開：

```text
/admin/settings/reader-features
```

預期：

1. 看得到文字選取。
2. 看得到遮答案。
3. 看得到浮水印。
4. 看得到透明度 slider。
5. 看得到或可擷取最後一頁浮水印內容：
   - `51MG122110`
   - `ISBN 978-626-411-527-8`
6. 設定保存後重新整理仍存在。

### 10.2 學生端 Reader

1. 關閉文字選取後，學生端文字選取不可用。
2. 關閉遮答案後，學生端遮答案不可用。
3. 開啟浮水印後，PDF 上可見低透明度浮水印。
4. 調整透明度後，學生端顯示效果改變。
5. 按貼回 AI，右側 AI 面板排版正確。
6. 按截圖 AI，crop overlay 與右側 AI 面板排版正確。
7. 選筆後可直接在 PDF 上書寫。
8. 細 / 中 / 粗 有明顯差異。

---

## 11. 服務重啟

只讀 MD 不需要重啟。

程式修改後需要重啟：

```bash
pnpm --filter AI-adm-D1 dev -- --host 0.0.0.0
pnpm --filter AI-Stu-R1 dev -- --host 0.0.0.0
```

若後端 API 是獨立 process，修改 server route / schema / settings 後需重啟後端。

---

## 12. 最終報告格式

每個 agent 完成後，請用繁體中文回報：

```md
## Agent Report

### Status
- success:
- failure:
- blocker:
- permission-halt:

### Git
- branch:
- commit SHA:
- changed files:

### Implemented Scope
- item 1:
- item 2:

### Verification
- typecheck:
- build:
- API smoke:
- browser check:
- env tracking:

### Remaining Risks
- risk 1:

### Final Decision
- ready for integration / not ready:
- reason:
```

---

## 13. 結論

本文件將最新 Reader 新需求拆為三條可並行工作線：

```text
Agent 1：後台設定 / 浮水印 / 最後頁擷取
Agent 2：貼回 AI / 截圖 AI 排版
Agent 3：PDF 筆工具直接書寫
```

三個分支完成後，再回到 `fix/r2-smart-features-final-integration` 整合與 AGY 最終驗收。
