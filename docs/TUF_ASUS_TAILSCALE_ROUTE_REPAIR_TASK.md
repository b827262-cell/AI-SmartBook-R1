# TUF ASUS / TUFA16 Tailscale 路由修護任務

> 執行對象：TUF ASUS / TUFA16 Linux 筆電  
> 主機名稱：`b822726-NB-TUFA16`  
> Tailscale IP：`100.70.207.69`  
> 目標測試對象：MBA2015 / `chihwei-macbook-air` / `100.95.90.116`  
> 執行者：AGY 或 Codex CLI  
> 任務目的：修復 TUFA16 主動連線到其他 Tailscale 節點時出現 `Network is unreachable` 的問題。

---

## 1. 已知狀態

使用者回報：

```text
S25 手機可以 SSH 連 MBA2015，正常。
S25 手機可以 SSH 連 TUFA16，正常。
```

因此初步判斷：

1. MBA2015 的 SSH Server 正常。
2. TUFA16 的 SSH Server 正常。
3. Tailscale 帳號與裝置授權大致正常。
4. 問題集中在 **TUFA16 主動連其他 Tailscale 節點時，本機 tailscale0 / route / tailscaled 狀態異常**。

TUFA16 上曾出現：

```bash
ssh chihweichen@100.95.90.116
```

錯誤：

```text
ssh: connect to host 100.95.90.116 port 22: Network is unreachable
```

---

## 2. 禁止事項

本任務只處理 Tailscale 網路路由修護。請嚴格遵守：

- 不要刪除 `~/project`。
- 不要刪除任何專案資料。
- 不要刪除 Docker volume。
- 不要停用 SSH Server。
- 不要移除 Tailscale 帳號或裝置，除非使用者明確要求。
- 不要修改 GitHub repo 原始碼。
- 不要 commit / push 程式碼。
- 不要停用 Wi-Fi / Ethernet 主要網路。
- 不要執行破壞性清理，例如 `rm -rf`、`docker system prune`、`iptables -F`。

---

## 3. 建立修護 log

請先建立 log：

```bash
set -u
mkdir -p ~/project/_logs
LOG_FILE="$HOME/project/_logs/tuf_asus_tailscale_route_repair_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "===== TUF ASUS TAILSCALE ROUTE REPAIR ====="
date
whoami
hostname
uname -a
```

---

## 4. 修護前診斷

請先收集狀態，不要急著重裝：

```bash
echo "===== tailscaled service BEFORE ====="
systemctl status tailscaled --no-pager || true

echo "===== tailscale version ====="
tailscale version || true

echo "===== tailscale ip BEFORE ====="
tailscale ip -4 || true

echo "===== tailscale status BEFORE ====="
tailscale status || true

echo "===== tailscale0 BEFORE ====="
ip addr show tailscale0 || true

echo "===== route to MBA2015 BEFORE ====="
ip route get 100.95.90.116 || true

echo "===== route to E500 BEFORE ====="
ip route get 100.76.46.86 || true

echo "===== tailscale ping MBA2015 BEFORE ====="
tailscale ping 100.95.90.116 || true

echo "===== tailscale ping E500 BEFORE ====="
tailscale ping 100.76.46.86 || true
```

---

## 5. 第一階段修護：重啟 tailscaled

先執行低風險修護：

```bash
echo "===== restart tailscaled ====="
sudo systemctl enable --now tailscaled
sudo systemctl restart tailscaled
sleep 3

systemctl status tailscaled --no-pager || true
tailscale ip -4 || true
tailscale status || true
ip addr show tailscale0 || true
ip route get 100.95.90.116 || true
tailscale ping 100.95.90.116 || true
```

若 `tailscale ping 100.95.90.116` 成功，請進入第 8 節驗證。  
若仍失敗，進入第 6 節。

---

## 6. 第二階段修護：reset Tailscale local state

若第一階段仍出現 `Network is unreachable` 或 `tailscale0` 不正常，執行：

```bash
echo "===== tailscale down / up --reset ====="
sudo tailscale down || true
sleep 2
sudo tailscale up --reset
sleep 3

tailscale ip -4 || true
tailscale status || true
ip addr show tailscale0 || true
ip route get 100.95.90.116 || true
tailscale ping 100.95.90.116 || true
```

注意：

- `sudo tailscale up --reset` 可能要求重新登入或重新授權。
- 若終端機出現登入 URL，請回報使用者手動開啟授權。
- 不要移除裝置，不要刪除 Tailscale 設定資料。

---

## 7. 第三階段診斷：確認 Linux 路由與防火牆

若第二階段後仍失敗，請執行診斷，不要做破壞性修改：

```bash
echo "===== network interfaces ====="
ip -4 addr show || true

echo "===== routing table ====="
ip route || true

echo "===== route to MBA2015 detail ====="
ip route get 100.95.90.116 || true

echo "===== tailscale netcheck ====="
tailscale netcheck || true

echo "===== resolvectl ====="
resolvectl status 2>/dev/null || true

echo "===== ufw status ====="
sudo ufw status verbose 2>/dev/null || true

echo "===== nft ruleset summary ====="
sudo nft list ruleset 2>/dev/null | head -200 || true
```

判斷重點：

1. `ip addr show tailscale0` 是否存在。
2. `tailscale ip -4` 是否仍為 `100.70.207.69` 或其他 100.x IP。
3. `ip route get 100.95.90.116` 是否走 `tailscale0`。
4. `tailscale ping 100.95.90.116` 是否成功。
5. 若一般 `ping` 不通但 `tailscale ping` 通，仍可能可以 SSH。

---

## 8. SSH 驗證

當 `tailscale ping 100.95.90.116` 成功後，再測 SSH：

```bash
echo "===== SSH test to MBA2015 ====="
ssh -o BatchMode=yes -o ConnectTimeout=8 chihweichen@100.95.90.116 'hostname; whoami; date' || true
```

若 `BatchMode` 因為沒有 key 而失敗，請再執行互動式測試：

```bash
ssh chihweichen@100.95.90.116
```

錯誤判讀：

- `Network is unreachable`：TUFA16 本機 Tailscale route 仍壞。
- `Connection refused`：網路通，但 MBA2015 SSH Server 未開或 port 22 未聽。
- `Operation timed out`：可能是 MacBook 休眠、防火牆或 Tailscale ACL。
- `Permission denied`：網路已通，只剩帳號、密碼或 SSH key 問題。
- 成功登入：修護完成。

---

## 9. 交叉測試其他節點

請同時測 E500：

```bash
echo "===== tailscale ping E500 ====="
tailscale ping 100.76.46.86 || true

echo "===== SSH test to E500 ====="
ssh -o BatchMode=yes -o ConnectTimeout=8 b827262@100.76.46.86 'hostname; whoami; date' || true
```

目的：確認 TUFA16 是否只連 MBA2015 失敗，或所有 Tailscale peer 都失敗。

---

## 10. 最終回報格式

完成後，請依以下格式回報：

```text
TUF ASUS / TUFA16 Tailscale 修護回報

1. 主機：
   - hostname:
   - whoami:
   - tailscale ip:

2. 修護前狀態：
   - tailscaled service:
   - tailscale0 是否存在:
   - ip route get 100.95.90.116:
   - tailscale ping 100.95.90.116:

3. 已執行動作：
   - 是否 restart tailscaled:
   - 是否 tailscale down / up --reset:
   - 是否需要重新登入授權:

4. 修護後狀態：
   - tailscaled service:
   - tailscale0 是否存在:
   - ip route get 100.95.90.116:
   - tailscale ping 100.95.90.116:
   - SSH to MBA2015 結果:
   - SSH to E500 結果:

5. 結論：
   - 已修復 / 未修復
   - 若未修復，卡在哪一層：service / tailscale0 / route / ACL / SSH auth

6. Log 檔位置：
   - ~/project/_logs/...
```

---

## 11. 可直接交給 AGY 的提示

```text
請依照 docs/TUF_ASUS_TAILSCALE_ROUTE_REPAIR_TASK.md 在 TUF ASUS / TUFA16 Linux 筆電上修復 Tailscale 路由問題。

已知：
- TUFA16 Tailscale IP 是 100.70.207.69。
- MBA2015 Tailscale IP 是 100.95.90.116。
- S25 手機可以 SSH 到 MBA2015 與 TUFA16，所以兩端 SSH Server 大致正常。
- TUFA16 主動 ssh chihweichen@100.95.90.116 時出現 Network is unreachable。

限制：
1. 只修復 tailscaled / tailscale0 / route。
2. 不刪專案，不刪資料。
3. 不停用 SSH Server。
4. 不修改程式碼，不 commit，不 push。
5. 若 tailscale up --reset 要求登入授權，先回報，不要亂刪裝置。
6. 完成後依文件第 10 節格式回報。
```
