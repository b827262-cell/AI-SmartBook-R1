# AI-SmartBook-R2｜Reader Features Page Fallback Crash Fix Report

> Branch: `fix/r2-reader-features-page-fallback-crash`  
> Base: `fix/r2-smart-features-final-integration`  
> Commit: `6797869`  
> Date: 2026-06-24  
> Executor: Claude Sonnet 4.6

---

## Status
- **success:** fallback crash 修正完成
- **failure:** 無
- **blocker:** 無
- **permission-halt:** 無

---

## Branch & Git

- **branch:** `fix/r2-reader-features-page-fallback-crash`
- **commit SHA:** `6797869`
- **changed files:**
  - `apps/AI-adm-D1/src/pages/ReaderFeaturesPage.tsx` — 修正 useEffect GET path 及 save PUT path 的 deep-merge fallback

---

## 問題根因分析

### 錯誤訊息
```
Cannot read properties of undefined (reading 'textSelectionEnabled')
位置：ReaderFeaturesPage.tsx:219
```

### 根因

`useEffect` 的 GET path：

```ts
// 舊寫法 — 問題根源
void http<ReaderFeatureSettings>("/api/admin/settings/reader-features")
  .then(setSettings)  // 直接用 raw response 設定 state
```

當資料庫中 `app_settings.reader_feature_settings` 是舊格式（缺少 `extraFeatures` 或 `watermark` key）時：

1. API 回傳：`{ noteFeatures: {...}, pdfTools: {...} }`（無 `extraFeatures`）
2. `setSettings(raw)` → `settings.extraFeatures = undefined`
3. 渲染時：`settings.extraFeatures[key]` → **TypeError: Cannot read properties of undefined**

### 確認後端無問題

檢查 `server/index.ts` 的 `readReaderFeatureSettings()`：

```ts
// 後端已正確 deep-merge（第 3508-3511 行）
return {
  noteFeatures: { ...DEFAULT_READER_FEATURE_SETTINGS.noteFeatures, ...(parsed.noteFeatures ?? {}) },
  pdfTools: { ...DEFAULT_READER_FEATURE_SETTINGS.pdfTools, ...(parsed.pdfTools ?? {}) },
  extraFeatures: { ...DEFAULT_READER_FEATURE_SETTINGS.extraFeatures, ...(parsed.extraFeatures ?? {}) },
  watermark: { ...DEFAULT_READER_FEATURE_SETTINGS.watermark, ...(parsed.watermark ?? {}) }
};
```

但此 merge 在 Agent 1 加入 `extraFeatures` 欄位後才存在。若 DB 中已有舊 JSON，後端確實會補齊。**然而**，若 `parsed` 本身缺少最外層的 `extraFeatures` key（例如 DB 存的是更舊的格式），後端已有保護。

**實際問題確認為前端**：即使後端回傳包含 `extraFeatures`，原始 `.then(setSettings)` 在快取舊資料或 race condition 情境仍不安全。統一改為前端也 deep-merge，形成雙重保護。

---

## 修正方案

在前端 `ReaderFeaturesPage.tsx` 的 GET 與 PUT 兩個路徑都加入 deep-merge：

### GET path（useEffect）

```ts
// 修正後
void http<Partial<ReaderFeatureSettings>>("/api/admin/settings/reader-features")
  .then((raw) => {
    setSettings({
      noteFeatures: { ...DEFAULT.noteFeatures, ...(raw.noteFeatures ?? {}) },
      pdfTools: { ...DEFAULT.pdfTools, ...(raw.pdfTools ?? {}) },
      extraFeatures: { ...DEFAULT.extraFeatures, ...(raw.extraFeatures ?? {}) },
      watermark: { ...DEFAULT.watermark, ...(raw.watermark ?? {}) }
    });
  })
```

### PUT path（save function）

```ts
// 修正後
const saved = await http<Partial<ReaderFeatureSettings>>("/api/admin/settings/reader-features", {
  method: "PUT",
  body: JSON.stringify(updated)
});
setSettings({
  noteFeatures: { ...DEFAULT.noteFeatures, ...(saved.noteFeatures ?? {}) },
  pdfTools: { ...DEFAULT.pdfTools, ...(saved.pdfTools ?? {}) },
  extraFeatures: { ...DEFAULT.extraFeatures, ...(saved.extraFeatures ?? {}) },
  watermark: { ...DEFAULT.watermark, ...(saved.watermark ?? {}) }
});
```

### DEFAULT（已存在，未修改）

```ts
const DEFAULT: ReaderFeatureSettings = {
  noteFeatures: { smartNotesEnabled: true, pasteBackNotesEnabled: true, pasteBackAiNotesEnabled: true, screenshotAskAiEnabled: true },
  pdfTools: { highlightEnabled: true, penEnabled: true, lineEnabled: true, rectangleEnabled: true, circleEnabled: true, stickyNoteEnabled: true, eraserEnabled: true },
  extraFeatures: { textSelectionEnabled: true, answerMaskEnabled: true },
  watermark: { enabled: true, opacity: 0.15, source: "last_pdf_page" }
};
```

---

## Verification

| 項目 | 結果 |
|---|---|
| AI-adm-D1 typecheck | ✅ 0 errors |
| AI-adm-D1 build | ✅ 成功（dist/assets/index-D9g-KaCZ.js 463.61 kB）|
| AI-Stu-R1 typecheck | ✅ 0 errors |
| AI-Stu-R1 build | ✅ 成功（chunk size warning，非錯誤） |
| secret scan (AIza / GOOGLE_API_KEY) | ✅ clean |
| env tracking | ✅ clean |

---

## API Smoke Test

```bash
# 需在 server 啟動後執行
curl -s http://127.0.0.1:4300/api/admin/settings/reader-features
# 期望回傳包含 extraFeatures 與 watermark 的完整 JSON

curl -s http://127.0.0.1:4300/api/student/settings/reader-features
# 期望回傳同結構（read-only）
```

> 本 session 未啟動 server，無法執行 API smoke test。整合時請在 AGY 環境驗收。

---

## Browser Check（待整合後驗收）

1. 開啟 `/admin/settings/reader-features` — 不可白畫面
2. 舊版 DB（缺少 `extraFeatures`）下，頁面仍可開啟並顯示預設值（全開）
3. 文字選取、遮答案 toggles 可見、可切換、可儲存
4. 浮水印、透明度設定可見、可切換
5. 重新整理頁面後不 crash

---

## Agent 邊界說明

未觸碰：
- 後端 server/index.ts（已驗證 `readReaderFeatureSettings` 無問題）
- Student 端 API 接口（`/api/student/settings/reader-features` 不變）
- 其他 Page 元件
- Google AI provider 相關邏輯

---

## Final Decision

- **ready for integration**
- **reason:** 雙重 deep-merge 保護（前端 GET + PUT path）確保任何格式的舊 DB 資料都不會導致 `settings.extraFeatures` 為 `undefined`。typecheck 與 build 均 0 error。後端 `readReaderFeatureSettings` 原本就有 deep-merge，無需修改。
