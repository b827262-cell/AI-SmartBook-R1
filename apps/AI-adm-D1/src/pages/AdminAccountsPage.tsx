import { useCallback, useEffect, useState } from "react";
import { adminApi, type AdminAccount, type RiskLevel } from "../api";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { AdminCard } from "../components/admin/AdminCard";
import { AdminErrorCard } from "../components/admin/AdminErrorCard";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("zh-Hant");
}

// Map each risk level to its label and an existing badge colour class.
const RISK_META: Record<RiskLevel, { label: string; badge: string }> = {
  safe: { label: "安全", badge: "published" },
  risk: { label: "風險", badge: "draft" },
  dangerous: { label: "危險", badge: "failed" }
};

const RISK_OPTIONS: RiskLevel[] = ["safe", "risk", "dangerous"];

export function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    return adminApi
      .listAccounts()
      .then((r) => setAccounts(r.accounts))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Run an admin mutation, then refresh the list so badges/state stay accurate.
  const runAction = useCallback(
    async (sessionId: string, action: () => Promise<unknown>) => {
      setBusyId(sessionId);
      setActionError("");
      try {
        await action();
        await load();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusyId(null);
      }
    },
    [load]
  );

  const onChangeRisk = (a: AdminAccount, riskLevel: RiskLevel) => {
    if (riskLevel === a.riskLevel) return;
    void runAction(a.sessionId, () => adminApi.setAccountRisk(a.sessionId, riskLevel));
  };

  const onToggleBlock = (a: AdminAccount) => {
    if (a.isBlocked) {
      void runAction(a.sessionId, () => adminApi.unblockAccount(a.sessionId));
      return;
    }
    const reason = window.prompt("封鎖原因（可留空）：", "") ?? null;
    void runAction(a.sessionId, () => adminApi.blockAccount(a.sessionId, reason || null));
  };

  const header = (
    <AdminPageHeader
      title="帳戶管理"
      subtitle="查看前台使用者編號、IP、裝置與上線狀態，並進行風險標記與封鎖管理"
    />
  );

  if (error) {
    return (
      <div>
        {header}
        <AdminErrorCard
          title="帳戶資料讀取失敗"
          description="後端目前無法回應，請確認 API Server 是否啟動，或稍後重新整理。"
          code={error}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  return (
    <div>
      {header}
      <AdminCard title={`使用者編號（${accounts.length}）`}>
        {actionError && (
          <p className="badge failed" style={{ marginBottom: 12 }}>
            操作失敗：{actionError}
          </p>
        )}
        {loading ? (
          <p className="muted">載入中…</p>
        ) : accounts.length === 0 ? (
          <p className="muted">目前尚無前台使用者編號紀錄。</p>
        ) : (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>編號</th>
                  <th>學生名稱</th>
                  <th>登入方式</th>
                  <th>作業系統</th>
                  <th>裝置類型</th>
                  <th>瀏覽器</th>
                  <th>IP 位址</th>
                  <th>IP 位置</th>
                  <th>風險標記</th>
                  <th>封鎖狀態</th>
                  <th>最後上線時間</th>
                  <th>目前狀態</th>
                  <th>管理</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => {
                  const risk = RISK_META[a.riskLevel] ?? RISK_META.safe;
                  const busy = busyId === a.sessionId;
                  return (
                    <tr key={a.sessionId}>
                      <td><code>{a.id}</code></td>
                      <td>{a.name}</td>
                      <td>{a.loginMethod}</td>
                      <td>{a.osName}</td>
                      <td>{a.deviceType}</td>
                      <td>{a.browserName}</td>
                      <td><code>{a.ipAddress ?? "—"}</code></td>
                      <td className="muted">{a.ipLocation}</td>
                      <td>
                        <span className={`badge ${risk.badge}`}>{risk.label}</span>
                      </td>
                      <td>
                        {a.isBlocked ? (
                          <span className="badge failed" title={a.blockedReason ?? undefined}>
                            已封鎖
                          </span>
                        ) : (
                          <span className="badge">正常</span>
                        )}
                      </td>
                      <td className="muted">{formatTime(a.lastSeenAt)}</td>
                      <td>
                        <span className={`badge ${a.online ? "parsed" : "draft"}`}>
                          {a.online ? "在線" : "離線"}
                        </span>
                      </td>
                      <td>
                        <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
                          <select
                            value={a.riskLevel}
                            disabled={busy}
                            style={{ width: "auto" }}
                            onChange={(e) => onChangeRisk(a, e.target.value as RiskLevel)}
                          >
                            {RISK_OPTIONS.map((lvl) => (
                              <option key={lvl} value={lvl}>
                                {RISK_META[lvl].label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className={`btn ${a.isBlocked ? "secondary" : ""}`}
                            disabled={busy}
                            onClick={() => onToggleBlock(a)}
                          >
                            {a.isBlocked ? "解除封鎖" : "封鎖"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted" style={{ marginTop: 12 }}>
          說明：匿名帳戶以前台對話 session 為單位推算；IP、裝置、作業系統與瀏覽器由後端依
          request 解析並持久化（不信任前端傳值）。本機或私有 IP 顯示「Localhost / Private IP」。
          風險標記分為安全 / 風險 / 危險；封鎖後，該 session 及相同公開 IP 的前台請求會被拒絕。
        </p>
      </AdminCard>
    </div>
  );
}
