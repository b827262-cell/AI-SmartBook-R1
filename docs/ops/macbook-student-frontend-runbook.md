# MacBook 學生端前端設定運行手冊 (Runbook)

本文件旨在為 MacBook 開發環境中的學生端前端（Student Frontend）設定提供完整的運行指南。

---

## 1. 設置目的 (Purpose)
此 MacBook 設置旨在提供一個本地端開發與測試環境，使開發人員能在本機運行學生端前端項目（`AI-Stu-R1`），並透過代理將 API 請求轉發至指定的後端 API 伺服器。這有助於在不影響生產環境的情況下進行前端功能的開發、調試與介面驗證。

## 2. 存取連接埠與網址 (Access URLs)
在正確啟動服務後，可使用以下網址進行存取：

*   **主前端網址 (Main Frontend URL):**
    [http://34.81.110.125/books](http://34.81.110.125/books)
*   **備用前端網址 (Backup Frontend URL):**
    [http://100.95.90.116:5173/books](http://100.95.90.116:5173/books)

## 3. 啟動指令 (Start Command)
請在專案根目錄下執行以下指令以啟動學生端前端開發伺服器：

```bash
STUDENT_API_TARGET=http://34.81.110.125 pnpm --filter AI-Stu-R1 dev -- --host 0.0.0.0
```

> [!NOTE]
> 該指令會將 `STUDENT_API_TARGET` 環境變數設置為遠端後端 API 位址，並啟動 Vite 開發伺服器，同時使用 `--host 0.0.0.0` 允許區域網路或虛擬專用網路內的其他裝置進行存取。

## 4. API 代理機制說明 (API Proxy Explanation)
在本地開發模式下，前端的 API 請求會透過 Vite 的內置代理（Proxy）機制進行轉發。
根據 `apps/AI-Stu-R1/vite.config.ts` 中的設定：

*   所有匹配 `/api/student`、`/api/appearance-settings` 以及 `/api/uploads` 的請求，都會被 Vite 伺服器攔截並轉發至 `STUDENT_API_TARGET` 或 `ADMIN_API_TARGET` 所設定的後端伺服器位址。
*   此代理機制可避免開發時遭遇跨來源資源共用（CORS）的問題，簡化本地端與遠端 API 的對接。

## 5. Tailscale 存取注意事項 (Tailscale Access Note)
*   備用前端網址中使用的 IP 位址 `100.95.90.116` 為 Tailscale 虛擬網卡所分配的專用 IP。
*   **重要前提：** 存取該網址或以此 IP 進行互聯時，您的 MacBook 以及嘗試存取該服務的用戶端設備必須同時啟動並連接至同一個 **Tailscale VPN** 網路。若未連線，將無法正常載入頁面或連接 API。

## 6. Nginx 調整原則 (Do Not Modify Nginx)
> [!IMPORTANT]
> 此設定為**純本地開發與調試環境**。請**勿**為了解決本地開發時的暫時性問題而修改生產環境或系統伺服器上的 Nginx 設定檔。所有的代理、路由轉發應完全依靠 Vite 開發伺服器（Vite Dev Server）內置的 proxy 機制完成。

## 7. 常見問題與故障排除 (Troubleshooting)

### 🔴 502 Bad Gateway
*   **原因分析：** 
    通常是由於 Vite 代理伺服器無法連線至指定的後端 API 伺服器（即 `STUDENT_API_TARGET` 所指向的 `http://34.81.110.125`）。
*   **排查步驟：**
    1. 檢查本機網路連線是否正常。
    2. 嘗試使用 `ping 34.81.110.125` 或 `curl -I http://34.81.110.125` 測試後端伺服器是否在線。
    3. 確認是否需要特定的 VPN 或網路權限（如 Tailscale）才能存取該後端 IP。

### 🔴 favicon 404
*   **原因分析：**
    瀏覽器自動嘗試請求網站圖示 `/favicon.ico`，但開發伺服器對該靜態資源返回了 404 Not Found 錯誤。
*   **排查步驟：**
    *   此錯誤不會影響核心業務邏輯與網頁功能。
    *   若想消除此錯誤，可將 favicon 檔案放置於 `apps/AI-Stu-R1/public/` 目錄下，或在 `index.html` 中補上正確的 `<link rel="icon" ...>` 標籤。

### 🔴 API 目標回退至 127.0.0.1:4300 (API target fallback to 127.0.0.1:4300)
*   **原因分析：**
    在啟動 Vite 開發伺服器時，沒有正確帶入 `STUDENT_API_TARGET` 與 `ADMIN_API_TARGET` 環境變數。
*   **排查步驟：**
    *   根據 Vite 設定，若偵測不到上述兩個環境變數，將自動回退（Fallback）至預設的本地 API 位址 `http://127.0.0.1:4300`。
    *   請確保啟動指令完全正確，必須在 `pnpm` 前面加上環境變數宣告：
        ```bash
        STUDENT_API_TARGET=http://34.81.110.125 pnpm --filter AI-Stu-R1 dev -- --host 0.0.0.0
        ```
