# AI-SmartBook-R2｜Claude 任務：ReaderFeaturesPage fallback crash 修正

日期：2026-06-24

目標分支：`fix/r2-smart-features-final-integration`

建議工作分支：`fix/r2-reader-features-page-fallback-crash`

## 問題

後台開啟閱讀器功能設定頁時發生 React crash。

錯誤位置：

`ReaderFeaturesPage.tsx:219`

錯誤訊息：

`Cannot read properties of undefined (reading 'textSelectionEnabled')`

目前判斷不是單純服務沒開好，而是 settings 資料可能缺少 `extraFeatures`，前端直接讀 `settings.extraFeatures.textSelectionEnabled` 導致白畫面。

## Claude 需要修正

1. 在 `ReaderFeaturesPage.tsx` 加入 safe default fallback。
2. 不可直接讀取可能為 undefined 的 nested settings。
3. `extraFeatures` 缺欄位時，預設補：
   - `textSelectionEnabled: true`
   - `answerMaskEnabled: true`
4. `watermark` 缺欄位時，預設補安全值。
5. `noteFeatures` 與 `pdfTools` 也要保留既有 fallback。
6. 後端 `server/index.ts` 若回傳舊 JSON，也要在 read path 做 default merge。
7. API 回傳舊資料時，頁面不可 crash。

## 建議修正方向

在 ReaderFeaturesPage 內統一建立 safe settings，例如：

- `noteFeatures`：全部預設 true，再 spread API 回傳值
- `pdfTools`：全部預設 true，再 spread API 回傳值
- `extraFeatures`：全部預設 true，再 spread API 回傳值
- `watermark`：補 `enabled`、`opacity`、`source`、`extractedCode`、`extractedIsbn`、`text`

渲染時全部改用 safe settings，不要直接使用 raw settings 的 nested 欄位。

## 後端檢查

請檢查：

- `GET /api/admin/settings/reader-features`
- `GET /api/student/settings/reader-features`

若 DB 中 `app_settings.reader_feature_settings` 是舊格式，後端也必須補齊預設欄位後再回傳。

## 驗證

請執行：

```bash
pnpm --filter AI-adm-D1 typecheck
pnpm --filter AI-adm-D1 build
pnpm --filter AI-Stu-R1 typecheck
pnpm --filter AI-Stu-R1 build
```

請測 API：

```bash
curl -s http://127.0.0.1:4300/api/admin/settings/reader-features
curl -s http://127.0.0.1:4300/api/student/settings/reader-features
```

## 人工驗收

1. 開啟 `/admin/settings/reader-features` 不可白畫面。
2. 舊 settings JSON 缺少 `extraFeatures` 時，頁面仍可開啟。
3. 可看到文字選取、遮答案、浮水印、透明度設定。
4. 切換後可保存。
5. 重新整理後不 crash。

## 服務重啟

修正後需要重啟後台前端與後端 server。

若學生端有相關 type 或 API 變更，也需重啟學生端。

## 報告

請新增：

`docs/r2/AI-SmartBook-R2-reader-features-page-fallback-crash-fix-report-20260624.md`

報告需包含：status、branch、commit SHA、changed files、修正內容、typecheck/build、API smoke、browser check、final decision。

## Commit message

建議：

`fix(r2): add safe fallback for reader feature settings page`
