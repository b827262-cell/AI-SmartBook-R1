# AI-SmartBook-R2｜Reader Features Toggle Click Save Report

> Branch: `fix/r2-reader-features-toggle-click-save`  
> Base: `fix/r2-smart-features-final-integration`  
> Commit: `6be2327`  
> Date: 2026-06-24  
> Executor: Claude Sonnet 4.6

---

## Status
- **success:** 三個 toggle/save bug 全數修正
- **failure:** 無
- **blocker:** 無
- **permission-halt:** 無

---

## Branch & Git

- **branch:** `fix/r2-reader-features-toggle-click-save`
- **commit SHA:** `6be2327`
- **changed files:**
  - `apps/AI-adm-D1/src/pages/ReaderFeaturesPage.tsx` — 重構 ToggleBtn、分離 slider 狀態、save 失敗後 revert 狀態

---

## 根本問題分析

### Bug 1：ToggleBtn 定義在 component 內部

**原始寫法：**
```tsx
export function ReaderFeaturesPage() {
  // ...
  function ToggleBtn({ on, onClick }) { ... }  // ← 每次 render 產生新 function reference
  return (...<ToggleBtn .../>...);
}
```

**問題：** React 用 component function reference 作為 type identity。每次父元件 render，`ToggleBtn` 都是一個全新的 function reference，React 視之為「不同元件類型」，因此對每個現有的 `<ToggleBtn>` 執行 **unmount → remount**。

在某些情境下（如 React 18 自動批次更新），parent re-render 可能在 click event 完成 dispatch 前觸發，導致 button DOM element 在 click synthetic event 被消費前即被銷毀，使 `onClick` 不被調用。

**修正：** 將 `ToggleBtn` 移到 module 頂層（component 外），`disabled` 改為顯式 prop 傳入。

```tsx
// 現在：stable type reference, React 不再 unmount/remount
function ToggleBtn({ on, disabled, onClick }: { on: boolean; disabled: boolean; onClick: () => void }) { ... }
```

---

### Bug 2：Slider onChange 觸發大量並發 PUT

**原始寫法：**
```tsx
<input
  type="range"
  value={settings.watermark.opacity * 100}
  onChange={e => setWatermarkOpacity(Number(e.target.value) / 100)}
/>
```

`setWatermarkOpacity` 每次都調用 `save(updated)`, `save` 每次都設 `setSaving(true)`。一次 slider 拖曳可能觸發 50-100 次 `onChange`，產生 50-100 個並發 PUT。

**後果：**
- 整個拖曳期間 `saving = true` → 所有 toggle 按鈕 disabled → 使用者以為按鈕無反應
- 多個並發 PUT 回傳順序不確定 → state 可能被較早的 response 覆蓋

**修正：** 分離 slider 的顯示狀態（`sliderVal`）與 commit 狀態（`settings.watermark.opacity`），只在 `onMouseUp` / `onTouchEnd` 時 commit：

```tsx
const [sliderVal, setSliderVal] = useState(DEFAULT.watermark.opacity * 100);
const sliderDirty = useRef(false);

function onSliderChange(e) {
  setSliderVal(Number(e.target.value));  // live preview only, no save
  sliderDirty.current = true;
}

function onSliderCommit() {
  if (!sliderDirty.current) return;
  sliderDirty.current = false;
  const opacity = sliderVal / 100;
  const updated = { ...settings, watermark: { ...settings.watermark, opacity } };
  setSettings(updated);
  void save(updated, prev);  // ONE PUT per drag
}

<input
  type="range"
  value={sliderVal}
  onChange={onSliderChange}
  onMouseUp={onSliderCommit}
  onTouchEnd={onSliderCommit}
/>
```

---

### Bug 3：PUT 失敗後 Optimistic State 未 Revert

**原始行為：** 點擊 toggle → `setSettings(updated)` 樂觀更新 → PUT 失敗 → UI 仍顯示「已切換」狀態，但 server 沒有儲存，下次 refresh 後 state 回滾。使用者誤以為儲存成功。

**修正：** `save(updated, previousSettings)` 新增第二個參數，catch 時 revert：

```ts
async function save(updated: ReaderFeatureSettings, previousSettings: ReaderFeatureSettings) {
  ...
  try {
    ...
  } catch (e) {
    setSettings(previousSettings);  // revert
    setSliderVal(previousSettings.watermark.opacity * 100);  // revert slider too
    setError(e instanceof Error ? e.message : String(e));
  }
}
```

---

## 其他改進

| 項目 | 改動 |
|---|---|
| `mergeWithDefault()` | 抽取為 module-level 函式，GET 與 PUT 兩個路徑共用 |
| `TOGGLE_ROW_STYLE` | 移到 module scope（原本是 component 內部 const，每次 render 重新建立） |
| `sliderVal` 初始值 | GET 成功後同步 `setSliderVal(merged.watermark.opacity * 100)` |
| 透明度預覽 | 改用 `sliderVal / 100`（live preview 跟隨 slider，不等待 save） |
| `ToggleBtn type="button"` | 加上 `type="button"` 防止在 form 內意外 submit |

---

## Verification

| 項目 | 結果 |
|---|---|
| AI-adm-D1 typecheck | ✅ 0 errors |
| AI-adm-D1 build | ✅ 成功（463.73 kB，同之前） |
| AI-Stu-R1 typecheck | ✅ 0 errors |
| secret scan (AIza / GOOGLE_API_KEY) | ✅ clean |

---

## API Smoke（待整合後驗收）

```bash
# 初始狀態
curl -s http://127.0.0.1:4300/api/admin/settings/reader-features

# 切換後驗證
curl -s -X PUT http://127.0.0.1:4300/api/admin/settings/reader-features \
  -H "Content-Type: application/json" \
  -d '{"noteFeatures":{"smartNotesEnabled":false}}'
# 期望回傳 smartNotesEnabled: false，其他欄位不變

curl -s http://127.0.0.1:4300/api/student/settings/reader-features
# 期望同步反映新狀態
```

---

## Browser 驗收（待整合後執行）

1. 開啟 `/admin/settings/reader-features`
2. 點擊「智能筆記」→ 按鈕從綠色「開啟」切換為紅色「關閉」，DevTools Network 出現一個 PUT 請求
3. PUT 成功（200）→ 頂部出現「設定已儲存。」
4. 重新整理頁面 → 仍顯示「關閉」（伺服器已持久化）
5. 拖曳透明度 slider → 預覽即時更新（無 PUT），放手後出現一個 PUT
6. PUT 失敗時（如斷開後端）→ toggle 回到原狀態，顯示紅色錯誤訊息
7. 點擊「文字選取」、「遮答案」、「浮水印」→ 各自正確切換並 PUT
8. 學生端 `/api/student/settings/reader-features` → 回傳最新設定

---

## Final Decision

- **ready for integration**
- **reason:** 三個核心 bug 修正（ToggleBtn 元件穩定性、slider 並發 PUT、失敗後 state revert），typecheck + build 0 error。API 合約未變更，server/index.ts 無需修改。
