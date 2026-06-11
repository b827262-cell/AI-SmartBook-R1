import { Link } from "react-router-dom";

// Front-end identity constants (no auth API in scope).
const ADMIN_IDENTITY = { org: "admin", initial: "管", label: "管理者" };

/** Sticky white top bar: hamburger, brand, home link, identity avatar. */
export function AdminTopBar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        <button
          type="button"
          className="admin-hamburger"
          onClick={onToggleSidebar}
          aria-label="切換側邊選單"
        >
          ☰
        </button>
        <Link to="/admin" className="admin-brand">
          <span className="admin-brand-mark">iB</span>
          <span>iBrain 智匯 · AI-adm-D1</span>
        </Link>
      </div>

      <Link to="/admin" className="admin-topbar-home">
        首頁
      </Link>

      <div className="admin-topbar-right">
        <span className="admin-identity-name">{ADMIN_IDENTITY.org}</span>
        <span className="admin-avatar" title={ADMIN_IDENTITY.label} aria-label={ADMIN_IDENTITY.label}>
          {ADMIN_IDENTITY.initial}
        </span>
      </div>
    </header>
  );
}
