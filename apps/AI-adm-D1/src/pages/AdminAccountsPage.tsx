import { useCallback, useEffect, useState } from "react";
import { adminApi, type AdminAccount } from "../api";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { AdminCard } from "../components/admin/AdminCard";
import { AdminErrorCard } from "../components/admin/AdminErrorCard";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("zh-Hant");
}

export function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const header = (
    <AdminPageHeader
      title="帳戶管理"
      subtitle="查看前台使用者編號、裝置與上線狀態"
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
                  <th>最後上線時間</th>
                  <th>目前狀態</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td><code>{a.id}</code></td>
                    <td>{a.name}</td>
                    <td>{a.loginMethod}</td>
                    <td>{a.osName}</td>
                    <td>{a.deviceType}</td>
                    <td>{a.browserName}</td>
                    <td className="muted">{formatTime(a.lastSeenAt)}</td>
                    <td>
                      <span className={`badge ${a.online ? "parsed" : "draft"}`}>
                        {a.online ? "在線" : "離線"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted" style={{ marginTop: 12 }}>
          說明：匿名帳戶以前台對話 session 為單位推算；裝置、作業系統與瀏覽器由後端依
          request headers 解析並持久化，在線狀態採最近 15 分鐘活動判斷。
        </p>
      </AdminCard>
    </div>
  );
}
