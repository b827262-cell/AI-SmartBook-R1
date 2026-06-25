# AI-SmartBook-R2 Smart Features Process and Claude Review Handoff

日期：2026-06-24  
Repository：`b827262-cell/AI-SmartBook-R1`  
Branch：`fix/r2-admin-settings-files-integration`  
用途：記錄智能影音設定、AI 筆記導覽說明、書本 Q&A / 知識點管理等功能畫面與編修重點，交由 Claude 進行審查與後續驗收。

---

## 1. 本文件目的

本文件彙整目前 R2 後台新增與調整的三組智能學習功能：

1. 智能影音設定
2. AI 筆記導覽功能說明
3. 書本 Q&A / 知識點管理

本文件作為 Claude Review Handoff 使用，協助 Claude 從功能、UI、資料流、API、權限與部署風險角度進行複查。

本文件不保存、不展示、不提交任何實際 API Key 或 secret。

---

## 2. 功能一：智能影音設定

### 2.1 畫面位置

後台左側選單：

```text
功能設定 → 智能影音設定
```

頁面標題：

```text
智能功能設定
```

頁面說明：

```text
管理 SmartBook 各項智能學習功能與內容設定
```

---

### 2.2 目前畫面內容

智能影音設定區塊包含：

| 欄位 | 說明 |
|---|---|
| 課程標題 | 對應影片所屬課程或單元名稱 |
| 章節 | 對應書本章節，例如中級會計學（上）/ 第一章 |
| YouTube 連結 | 可填入 YouTube 教學影片連結 |
| 影片連結 | 可填入一般 MP4 / CDN 影片連結 |
| 啟用 | 控制該影音是否在學生端顯示 |
| 操作 | 目前提供刪除操作 |

畫面中已出現範例資料：

```text
課程標題：中級會計1-1
章節：中級會計學（上）/ 第一章 財務報導之觀念架構
YouTube 連結：YouTube watch 連結
影片連結：CDN MP4 連結
啟用：開啟
```

---

### 2.3 已完成編修重點

- 新增「智能影音設定」管理頁面。
- 支援新增影音入口，按鈕文字為「新增影音」。
- 支援 YouTube 連結與一般影片連結兩種來源。
- 支援依章節綁定影片內容。
- 支援啟用 / 停用切換。
- 支援刪除影音項目。
- 功能說明區已中文化，內容包含：
  1. 可新增 YouTube 連結或一般影片連結。
  2. 目前提供新增與刪除功能。
  3. 學生端將依章節顯示對應影音內容。

---

### 2.4 建議 Claude 檢查項目

請 Claude 確認：

1. 新增影音流程是否有表單驗證。
2. YouTube URL 與 MP4 / CDN URL 是否有基本格式檢查。
3. 啟用 toggle 是否正確寫回後端。
4. 刪除操作是否有確認提示，避免誤刪。
5. 學生端是否依章節正確顯示啟用中的影音。
6. 停用影音是否不會出現在學生端。
7. 影片連結是否避免不安全 URL 或 XSS 注入。
8. 若同一章節有多支影片，排序規則是否明確。

---

## 3. 功能二：AI 筆記導覽功能說明

### 3.1 畫面位置

後台左側選單：

```text
AI 筆記管理 → AI 筆記導覽說明
```

頁面標題：

```text
AI 筆記導覽 — 功能說明
```

頁面說明：

```text
說明 AI 筆記導覽的功能、定位邏輯與相關設定，協助學生快速回到筆記所在的頁面或章節。
```

---

### 3.2 功能概要

AI 筆記導覽可讓學生在閱讀器中，快速從 AI 筆記或智能筆記回到對應頁面或章節。

目前功能說明中強調：

- AI 筆記導覽讓學生在閱讀器中，快速跳回到筆記所在頁面或章節。
- 系統會依筆記所包含的定位資訊，自動判斷並導至最合適的位置。
- 目標是提升學習效率與閱讀體驗。

---

### 3.3 學生端操作步驟

畫面中列出的學生操作流程：

1. 開啟學生閱讀器並進入要閱讀的書本。
2. 點選任意筆記入口，例如面板。
3. 點擊任一筆記項目內的「定位」按鈕，或點擊「智能筆記」面板中的筆記卡片。
4. 閱讀器會依定位邏輯自動跳回該筆記的頁碼或章節。
5. 若無法精準定位，將導至最近可定位的章節起始頁面。

---

### 3.4 定位優先順序

| 優先順序 | 條件 | 說明 |
|---|---|---|
| 1 | 有 `pageNumber` | 直接跳轉到指定頁碼，最高優先 |
| 2 | 有 `chapterId` 且有 `pageStart` | 跳轉到章節起始頁面 |
| 3 | 僅有 `chapterId` | 跳轉到該章節的開頭，若有章節索引 |
| 4 | 以上皆無 | 不顯示「定位」按鈕，或導回閱讀器首頁 |

---

### 3.5 API 端點

畫面中列出的 API：

```http
GET /api/student/books/:bookId/notes/:noteId/navigate
```

回傳格式概念：

```ts
{
  anchor: boolean,
  pageNumber?: number,
  chapterId?: string,
  fallback?: string
}
```

欄位說明：

| 欄位 | 說明 |
|---|---|
| `anchor=true` | 表示有定位資訊，可成功定位 |
| `anchor=false` | 表示無法精準定位，將使用 fallback |
| `pageNumber` | 目標頁碼，若有 |
| `chapterId` | 目標章節 ID，若有 |
| `fallback` | 無法精準定位時提供建議路徑資訊 |

---

### 3.6 筆記功能開關

畫面中包含四個筆記功能開關：

| 功能 | 說明 | 狀態 |
|---|---|---|
| 智能筆記 | AI 輔助摘要與重點整理 | 開啟 |
| 貼回筆記 | 將筆記貼回原文位置 | 開啟 |
| 貼回 AI 筆記 | 將 AI 筆記貼回原文位置 | 開啟 |
| 截圖問 AI | 截圖內容詢問 AI 助教 | 開啟 |

---

### 3.7 PDF 小工具設定

畫面中包含 PDF 閱讀工具列可用工具控制：

| 工具 | 說明 | 狀態 |
|---|---|---|
| 螢光筆 | PDF 標註工具 | 開啟 |
| 筆 | PDF 手寫或自由筆工具 | 開啟 |
| 直線 | PDF 繪線工具 | 開啟 |
| 矩形 | PDF 框選工具 | 開啟 |
| 圓形 | PDF 圓形標註工具 | 開啟 |
| 便利貼 | PDF 貼紙 / 註解工具 | 開啟 |
| 橡皮擦 | 清除標註工具 | 開啟 |

提示文字：

```text
關閉的工具將不會顯示在學生端 PDF 工具列中。
```

---

### 3.8 建議 Claude 檢查項目

請 Claude 確認：

1. `pageNumber`、`chapterId`、`pageStart` 的資料來源是否一致。
2. 若筆記資料缺少頁碼，fallback 是否能正確導到章節起始頁。
3. API 回傳格式是否與前端 consumption 一致。
4. 四個筆記功能開關是否有實際控制學生端功能。
5. PDF 小工具開關是否實際影響學生端 toolbar 顯示。
6. 關閉工具後，學生端是否不再顯示該工具。
7. 手機版閱讀器是否也遵守相同設定。
8. API 錯誤時是否有良好 fallback，不造成白畫面。

---

## 4. 功能三：書本 Q&A / 知識點管理

### 4.1 畫面位置

後台左側選單：

```text
書本列表 → 書本 Q&A / 知識點管理
```

頁面標題：

```text
書本 Q&A / 知識點管理
```

頁面說明：

```text
管理書本的問答與知識點，提供學生更精準的學習支援。
```

---

### 4.2 頁面主要操作

頁面右上角包含：

| 按鈕 | 說明 |
|---|---|
| 返回書本列表 | 回到書本列表頁 |
| 新增 Q&A | 手動新增問答 |
| Q&A 管理 | 切換至 Q&A 管理區 |
| 知識點管理 | 切換至知識點管理區 |

---

### 4.3 Q&A 列表

目前 Q&A 區塊顯示：

```text
已建立 24 筆問答
```

列表欄位：

| 欄位 | 說明 |
|---|---|
| # | 序號 |
| 問題 | 問答題目 |
| 答案摘要 | 答案前段摘要 |
| 建立時間 | 建立日期與時間 |
| 狀態 | 例如已發布 |
| 操作 | 更多操作入口 |

目前顯示範例：

1. 這本書在做什麼？
2. 會計基本假設有哪些？
3. 什麼是權責發生制？

狀態皆顯示：

```text
已發布
```

並提供：

```text
查看全部 24 筆 Q&A
```

---

### 4.4 知識點管理

知識點管理區塊顯示資料來源：

```text
資料來源：split-book / sentence-index JSON
來源檔案：51M320901全書-sentence-index.json
```

功能說明：

```text
內容萃取成拆書後的 JSON 檔，自動建立章節的知識點。
```

提供操作：

```text
重新同步 JSON
```

---

### 4.5 知識點功能開關

| 功能 | 說明 | 狀態 |
|---|---|---|
| 啟用知識點側欄 | 控制學生端是否顯示知識點側欄 | 開啟 |
| 顯示搜尋欄 | 控制學生端知識點搜尋 | 開啟 |
| 預設展開章節 | 控制章節是否預設展開 | 關閉 |

---

### 4.6 知識點來源與更新

畫面說明包含：

- 拆書 `split-book` 完成後，系統會自動從 JSON 檔收錄章節與知識點。
- AI 會根據章節標題與內容，自動建立知識點。
- 如節點內容更新，請重新同步以更新知識點。

---

### 4.7 知識點總覽

畫面統計：

| 指標 | 數值 |
|---|---:|
| 總章節數 | 128 本 |
| 本書已抓取章節 | 856 章 |
| 知識點總數 | 4,235 個 |
| 最後更新時間 | 2025-05-20 14:35 |

注意：`總章節數` 畫面目前顯示為「128 本」，建議 Claude 確認這是否應為「128 章」或「128 個章節節點」。

---

### 4.8 章節與知識點預覽

目前畫面顯示章節預覽：

| 章節標題 | 知識點數 | 更新時間 |
|---|---:|---|
| 第零章 緒論 | 24 | 2025-05-20 14:35 |
| 第一章 財務報導之觀念架構 | 58 | 2025-05-20 14:35 |
| 第二章 財務報表的表達 | 76 | 2025-05-20 14:35 |

提供操作：

| 按鈕 | 說明 |
|---|---|
| 預覽知識點 | 查看已建立知識點 |
| 匯出章節清單 CSV | 匯出章節摘要與知識點資訊 |

---

### 4.9 建議 Claude 檢查項目

請 Claude 確認：

1. Q&A 數量是否與資料庫實際筆數一致。
2. Q&A 已發布狀態是否有對應 publish 欄位。
3. Q&A 搜尋是否支援問題與答案摘要。
4. 知識點總數是否與 sentence-index JSON 萃取結果一致。
5. 「總章節數 128 本」用詞是否需要修正為「128 章」或「128 個節點」。
6. 重新同步 JSON 是否具備冪等性。
7. 重新同步時是否會覆蓋人工編輯的知識點。
8. `split-book / sentence-index JSON` 缺失時是否有清楚錯誤提示。
9. 匯出 CSV 是否正確處理中文與 UTF-8 BOM。
10. 學生端知識點側欄、搜尋欄、預設展開是否與後台開關一致。

---

## 5. 建議資料流檢查

Claude 應確認以下資料流：

```text
Admin Settings / Book Management
  → API server
  → Database / JSON source
  → Student Reader
  → Chapter / Note / Knowledge / Video display
```

重點資料源：

| 資料 | 來源 | 用途 |
|---|---|---|
| 影音設定 | 後台手動建立 | 學生端章節影音顯示 |
| 筆記定位 | AI 筆記 / 智能筆記資料 | 閱讀器定位跳轉 |
| 章節資訊 | reader_toc / split JSON | 筆記導覽與知識點章節歸屬 |
| 知識點 | sentence-index JSON / AI 萃取 | 學生端知識點側欄與搜尋 |
| Q&A | 後台建立或 AI 產生 | 學生端問答學習支援 |

---

## 6. 建議驗收指令

### 6.1 Typecheck / Build

```bash
pnpm --filter AI-adm-D1 typecheck
pnpm --filter AI-adm-D1 build
pnpm --filter AI-Stu-R1 typecheck
pnpm --filter AI-Stu-R1 build
```

### 6.2 後台頁面 smoke test

依實際 dev server port 檢查：

```bash
curl -I http://127.0.0.1:4300/admin/settings/smart-features || true
curl -I http://127.0.0.1:4300/admin/ai-notes/help || true
curl -I http://127.0.0.1:4300/admin/books || true
```

若路由名稱不同，請以實際 `App.tsx` 或 router 設定為準。

### 6.3 API smoke test

請依實際 API routes 執行：

```bash
curl -s http://127.0.0.1:4300/api/admin/books | head -c 500
curl -s http://127.0.0.1:4300/api/admin/settings | head -c 500
curl -s http://127.0.0.1:4300/api/student/books | head -c 500
```

### 6.4 Secret / `.env` 檢查

請 Claude 確認：

- 實際 API Key 不得出現在 Git 追蹤檔案。
- 實際 API Key 不得出現在前端 bundle。
- `.env` 不得被 Git 追蹤。
- 僅允許 `.env.example` 或文件 placeholder 存在於 GitHub。

可執行：

```bash
git status
git ls-files | grep -E '(^|/)\.env(\.|$)' || true
```

---

## 7. Claude Review Checklist

請 Claude 依下列面向審查：

### 7.1 UI / UX

- 中文文案是否一致。
- 按鈕命名是否符合管理者語境。
- 卡片、表格、toggle、分頁樣式是否一致。
- 左側選單目前有「特製作」標籤，請確認是否為正式文案或應調整。
- 長網址是否在表格中正確換行，不破版。
- 行動版或窄螢幕是否仍可操作。

### 7.2 功能正確性

- 影音新增、啟用、刪除是否正確。
- AI 筆記定位規則是否符合優先順序。
- PDF 小工具開關是否真的控制學生端 toolbar。
- Q&A 搜尋、查看全部、狀態顯示是否正確。
- 知識點重新同步是否正確且可重複執行。

### 7.3 安全性

- 不可將任何 secret 打包進前端 bundle。
- URL 欄位需避免不安全 scheme、惡意 iframe 或 XSS 注入。
- 刪除 / 重新同步類操作需有權限檢查。
- 後台 API 不應可由未登入使用者操作。

### 7.4 資料一致性

- Q&A 數量、知識點數、章節數需與後端實際資料一致。
- sentence-index JSON 與 reader_toc 的章節 mapping 需一致。
- 若 JSON 缺失或格式錯誤，UI 需顯示可理解錯誤。
- 重複同步不可造成重複知識點或章節。

---

## 8. Claude 最終回報格式

請 Claude 用繁體中文輸出：

```md
## Claude Final Review Report

### Status
- success:
- failure:
- blocker:
- permission-halt:

### Scope
- 智能影音設定:
- AI 筆記導覽說明:
- 書本 Q&A / 知識點管理:

### Verification
- typecheck:
- build:
- route smoke test:
- API smoke test:
- UI smoke test:
- secret scan:
- .env tracking check:

### Findings
- passed:
- warnings:
- remaining risks:

### Required Fixes Before Merge
1.
2.
3.

### Final Decision
- can merge / cannot merge:
- reason:
```

---

## 9. 殘留風險與 backlog

| 風險 | 等級 | 說明 | 建議處理 |
|---|---|---|---|
| 影音 URL 未驗證 | high | 若允許任意 URL，可能造成惡意連結或 XSS 風險 | 加入 URL scheme allowlist 與格式驗證 |
| 知識點重複同步 | medium | 重複同步可能產生重複節點 | 加入唯一鍵或 idempotent upsert |
| Q&A / 知識點數量用詞不一致 | low | 「128 本」可能應為「128 章」 | Claude 確認後修正文案 |
| PDF 工具開關僅 UI 顯示 | medium | 若學生端未接設定，功能開關只是展示 | 補學生端實測或 integration test |
| 影片刪除無二次確認 | medium | 管理員可能誤刪 | 補 confirm dialog 或 soft delete |
| 長網址表格破版 | low | 表格內 YouTube / CDN URL 可能影響 RWD | 補 overflow-wrap 或 tooltip |

---

## 10. 結論

目前三組功能畫面已具備完整的後台操作雛形：

1. 智能影音設定可管理章節影音內容。
2. AI 筆記導覽說明已清楚定義定位優先順序、API 與學生端操作流程。
3. 書本 Q&A / 知識點管理已整合 Q&A 列表、知識點來源、同步、統計與章節預覽。

下一步請 Claude 依本文件進行最終 review，重點確認後端資料流、學生端是否真正套用設定、secret 是否未外洩，以及 UI 文案與功能開關是否一致。
