# TUF ASUS / TUFA16 Tailscale 不重開機備援任務

> 執行對象：TUF ASUS / TUFA16 Linux 筆電  
> 主機名稱：`b822726-NB-TUFA16`  
> TUFA16 Tailscale IP：`100.70.207.69`  
> MBA2015 Tailscale IP：`100.95.90.116`  
> 執行者：AGY 或 Codex CLI  
> 任務目的：在目前不重開機的前提下，先恢復可用的 Tailscale userspace 連線與 SSH 備援路徑。

---

## 1. 背景判斷

目前已知：

```text
running kernel: 7.0.9-arch1-1
available module directory: /lib/modules/7.0.11-arch1-1
缺少 matching /lib/modules/7.0.9-arch1-1 對應的 tun module
```

因此：

1. `modprobe tun` 不能載入不同 kernel 版本的 `tun.ko`。
2. 在不重開機進入新 kernel 的情況下，無法恢復 kernel-mode `tailscale0`。
3. 本任務不追求恢復一般 `ssh user@100.x.x.x` 路由。
4. 本任務目標是改用 Tailscale userspace networking，讓 `tailscale ssh` 或 `tailscale nc` 作為暫時 SSH 通道。

---

## 2. 禁止事項

請嚴格遵守：

- 不要重開機。
- 不要刪除 `~/project`。
- 不要刪除專案資料。
- 不要刪除 Docker volume。
- 不要停止 OpenSSH Server。
- 不要移除 Tailscale 裝置。
- 不要執行 `tailscale logout`。
- 不要修改 GitHub repo 原始碼。
- 不要 commit / push 程式碼。
- 不要硬載不同 kernel 版本的 `tun.ko`。
- 不要執行 `iptables -F`、`nft flush ruleset` 這類破壞性防火牆清空指令。

---

## 3. 建立 log

```bash
set -u
mkdir -p ~/project/_logs
LOG_FILE="$HOME/project/_logs/tuf_asus_tailscale_no_reboot_fallback_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "===== TUF ASUS TAILSCALE NO-REBOOT FALLBACK ====="
date
whoami
hostname
uname -r
uname -a
```

---

## 4. 修護前確認

```bash
echo "===== kernel / module state ====="
uname -r
ls -ld /lib/modules/* 2>/dev/null || true
modinfo tun 2>/dev/null || true
sudo modprobe tun 2>/dev/null || true
ls -l /dev/net/tun 2>/dev/null || true

echo "===== tailscale state before ====="
systemctl status tailscaled --no-pager || true
tailscale version || true
tailscale ip -4 || true
tailscale status || true
ip addr show tailscale0 || true
ip route get 100.95.90.116 || true
```

若 `modprobe tun` 成功且 `tailscale0` 可恢復，請回報「kernel-mode 已恢復」。若仍失敗，繼續第 5 節。

---

## 5. 改成 userspace networking 模式

Arch / systemd 環境中，優先使用 systemd override，不直接依賴 `/etc/default/tailscaled`。

```bash
echo "===== configure tailscaled userspace networking override ====="
sudo mkdir -p /etc/systemd/system/tailscaled.service.d
sudo tee /etc/systemd/system/tailscaled.service.d/10-userspace-networking.conf >/dev/null <<'EOF'
[Service]
Environment="TS_DEBUG_FIREWALL_MODE=auto"
ExecStart=
ExecStart=/usr/bin/tailscaled --state=/var/lib/tailscale/tailscaled.state --socket=/run/tailscale/tailscaled.sock --port=41641 --tun=userspace-networking
EOF

sudo systemctl daemon-reload
sudo systemctl restart tailscaled
sleep 3
```

說明：

- 這不會建立 `tailscale0`。
- 這是預期結果。
- userspace networking 是暫時方案，不是完整恢復 kernel-mode route。

---

## 6. 重新確認 Tailscale 狀態

```bash
echo "===== tailscale state after userspace fallback ====="
systemctl status tailscaled --no-pager || true
tailscale ip -4 || true
tailscale status || true
ip addr show tailscale0 || true
ip route get 100.95.90.116 || true

echo "===== tailscale ping tests ====="
tailscale ping 100.95.90.116 || true
tailscale ping 100.76.46.86 || true
```

判斷：

- `tailscale0` 不存在是正常。
- `ip route get 100.95.90.116` 不走 tailscale0 是正常。
- 重點是 `tailscale status` 與 `tailscale ping` 能否正常。

---

## 7. 不重開機 SSH 備援方式 A：tailscale ssh

優先測這個。Tailscale CLI 文件說，當本機在 userspace networking mode 且無法直接連線時，可使用 `tailscale ssh`，它會透過本機 `tailscaled` 建立 SSH ProxyCommand。

```bash
echo "===== tailscale ssh to MBA2015 ====="
tailscale ssh chihweichen@100.95.90.116 || true
```

若進入互動式 SSH 成功，任務可視為暫時完成。

若 AGY / Codex 無法處理互動式 session，請改用第 8 節的非互動式命令。

---

## 8. 不重開機 SSH 備援方式 B：OpenSSH ProxyCommand + tailscale nc

Tailscale CLI 支援 `tailscale nc <hostname-or-IP> <port>`，可連到 tailnet 節點的指定 port。

請先做非互動式測試：

```bash
echo "===== ssh via ProxyCommand tailscale nc to MBA2015 ====="
ssh -o BatchMode=yes \
    -o ConnectTimeout=10 \
    -o ProxyCommand='tailscale nc %h %p' \
    chihweichen@100.95.90.116 \
    'hostname; whoami; date' || true
```

若因為沒有 SSH key 而出現 `Permission denied`，代表網路通道已建立，只剩認證問題。可改成互動式：

```bash
ssh -o ProxyCommand='tailscale nc %h %p' chihweichen@100.95.90.116
```

請勿使用不存在或未確認的 `tailscale ssh-proxy` 子指令。

---

## 9. E500 交叉驗證

```bash
echo "===== tailscale ssh to E500 ====="
tailscale ssh b827262@100.76.46.86 || true

echo "===== ssh via ProxyCommand tailscale nc to E500 ====="
ssh -o BatchMode=yes \
    -o ConnectTimeout=10 \
    -o ProxyCommand='tailscale nc %h %p' \
    b827262@100.76.46.86 \
    'hostname; whoami; date' || true
```

---

## 10. 驗收標準

本任務成功條件不是恢復 `tailscale0`，而是：

1. `tailscaled` 在 userspace networking mode 下可正常運行。
2. `tailscale ip -4` 可取得 `100.x.x.x`。
3. `tailscale status` 正常。
4. `tailscale ping 100.95.90.116` 至少能回應。
5. `tailscale ssh chihweichen@100.95.90.116` 或 `ssh -o ProxyCommand='tailscale nc %h %p' chihweichen@100.95.90.116` 至少一種方式可用。

---

## 11. 完成回報格式

```text
TUFA16 Tailscale 不重開機備援回報

1. Kernel / module 狀態：
   - uname -r:
   - /lib/modules:
   - modprobe tun 結果:
   - /dev/net/tun 是否存在:

2. userspace networking：
   - 是否建立 systemd override:
   - tailscaled 是否 active:
   - tailscale ip -4:
   - tailscale status:

3. 網路測試：
   - tailscale ping MBA2015:
   - tailscale ping E500:
   - tailscale0 是否存在:
   - ip route get 100.95.90.116:

4. SSH 備援測試：
   - tailscale ssh MBA2015 結果:
   - ProxyCommand tailscale nc MBA2015 結果:
   - tailscale ssh E500 結果:
   - ProxyCommand tailscale nc E500 結果:

5. 結論：
   - 暫時可用 / 仍不可用
   - 可用方式：tailscale ssh / ProxyCommand tailscale nc / 無
   - 完整恢復是否仍需重開機進入新 kernel：是 / 否

6. Log 檔位置：
   - ~/project/_logs/...
```

---

## 12. 可直接交給 AGY 的提示

```text
請依照 docs/TUF_ASUS_TAILSCALE_NO_REBOOT_FALLBACK_TASK.md 執行 TUFA16 Tailscale 不重開機備援任務。

目標：不要重開機，先讓 TUFA16 透過 userspace networking 使用 tailscale ssh 或 ssh ProxyCommand='tailscale nc %h %p' 連到 MBA2015 / E500。

限制：
1. 不重開機。
2. 不刪資料、不刪專案、不刪 Docker volume。
3. 不停用 OpenSSH Server。
4. 不做 tailscale logout，不移除裝置。
5. 不硬載不同 kernel 版本的 tun.ko。
6. 不使用 tailscale ssh-proxy；改用 tailscale ssh 或 tailscale nc。
7. 完成後依文件第 11 節格式回報。
```
