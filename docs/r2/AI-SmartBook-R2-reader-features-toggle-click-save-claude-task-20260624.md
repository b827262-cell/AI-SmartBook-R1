# AI-SmartBook-R2｜Claude 任務：ReaderFeaturesPage 開關點擊與保存修正

日期：2026-06-24

目標分支：`fix/r2-smart-features-final-integration`

建議工作分支：`fix/r2-reader-features-toggle-click-save`

## 1. 問題現象

使用者在後台頁面測試：

`http://127.0.0.1:5174/admin/settings/reader-features`

畫面已正常載入，Network 顯示多筆 `reader-features` request，狀態為 200。

但點擊右側的「開啟」按鈕沒有反應。

目前觀察：

- 頁面不是白畫面。
- reader-features GET 成功。
- 點擊開關後沒有看到有效的 PUT 保存行為。
- UI 可能只是顯示狀態 badge，沒有真正綁定 onClick / onChange。

## 2. 需修正目標

請 Claude 修正 `ReaderFeaturesPage.tsx`，讓以下項目可點擊切換並保存：

1. 文字選取
2. 遮答案
3. 浮水印
4. PDF 工具列各項開關如有同樣問題，也需一併修正
5. 透明度 slider 拖曳後需更新 state 並保存

## 3. 正確行為

點擊「文字選取」時：

- UI 從開啟切換為關閉，或從關閉切換為開啟。
- 觸發 `PUT /api/admin/settings/reader-features`。
- PUT 成功後更新本地 state。
- 重新整理後仍保留設定。

浮水印與遮答案也需相同行為。

## 4. 需檢查檔案

請優先檢查：

```text
apps/AI-adm-D1/src/pages/ReaderFeaturesPage.tsx
apps/AI-adm-D1/src/server/index.ts
apps/AI-Stu-R1/src/studentClient.ts
```

## 5. 修正方向

請確認以下項目：

- 開關 UI 是否只是 status badge。
- 是否缺少 onClick 或 onChange。
- 是否有 saveReaderFeatureSettings 類似函式。
- PUT payload 是否包含完整 settings。
- 儲存後是否被 default true 覆蓋。
- 舊 settings fallback 不可破壞。

建議新增或修正函式：

```text
toggleExtraFeature
toggleWatermark
togglePdfTool
saveReaderFeatureSettings
```

## 6. API 驗證

請用 DevTools Network 確認：

- 點擊開關後會出現 PUT request。
- PUT 回應成功。
- 接著 GET 時狀態已改變。

也請使用 curl 檢查：

```bash
curl -s http://127.0.0.1:4300/api/admin/settings/reader-features
curl -s http://127.0.0.1:4300/api/student/settings/reader-features
```

## 7. 驗證指令

```bash
pnpm --filter AI-adm-D1 typecheck
pnpm --filter AI-adm-D1 build
pnpm --filter AI-Stu-R1 typecheck
pnpm --filter AI-Stu-R1 build
```

## 8. 人工驗收

1. 開啟 `/admin/settings/reader-features`。
2. 點擊文字選取，可切換開啟 / 關閉。
3. 點擊遮答案，可切換開啟 / 關閉。
4. 點擊浮水印，可切換開啟 / 關閉。
5. 拖曳透明度 slider，數值與預覽同步變化。
6. DevTools Network 可看到 PUT。
7. 重新整理頁面後設定仍保留。
8. 學生端 Reader 能讀取最新設定。

## 9. 服務重啟

修正後請重啟：

```bash
pnpm --filter AI-adm-D1 dev -- --host 0.0.0.0
pnpm --filter AI-Stu-R1 dev -- --host 0.0.0.0
```

若後端 server 是獨立 process，也要重啟後端。

## 10. 報告檔名

請 Claude 新增：

`docs/r2/AI-SmartBook-R2-reader-features-toggle-click-save-report-20260624.md`

## 11. Commit message

建議：

`fix(r2): enable reader feature toggles save action`
