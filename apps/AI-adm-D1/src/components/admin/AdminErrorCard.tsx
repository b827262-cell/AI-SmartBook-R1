import { useNavigate } from "react-router-dom";

/**
 * Friendly error card shown instead of a raw "502 Bad Gateway" / fetch-failed
 * string. Offers refresh and back-to-list recovery actions.
 */
export function AdminErrorCard({
  title = "資料讀取失敗",
  description = "後端目前無法回應，請確認 API Server 是否啟動，或稍後重新整理。",
  code,
  onRetry
}: {
  title?: string;
  description?: string;
  code?: string;
  onRetry?: () => void;
}) {
  const navigate = useNavigate();

  return (
    <section className="admin-error-card">
      <div className="admin-error-icon" aria-hidden="true">!</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {code && <code className="admin-error-code">{code}</code>}
      <div className="admin-error-actions">
        <button
          type="button"
          className="admin-btn"
          onClick={() => (onRetry ? onRetry() : window.location.reload())}
        >
          重新整理
        </button>
        <button
          type="button"
          className="admin-btn ghost"
          onClick={() => navigate("/admin/books")}
        >
          返回書本列表
        </button>
      </div>
    </section>
  );
}
