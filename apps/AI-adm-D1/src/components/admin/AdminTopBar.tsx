import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppearance } from "../../appearance";

// Front-end identity constants (no auth API in scope).
const ADMIN_IDENTITY = { org: "admin", initial: "管", label: "管理者" };

/** Sticky white top bar: hamburger, configurable brand (name + logo), home. */
export function AdminTopBar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { settings } = useAppearance();
  const [logoFailed, setLogoFailed] = useState(false);

  // Reset the logo error state when the URL changes so a new valid logo shows.
  useEffect(() => setLogoFailed(false), [settings.headerLogoUrl]);

  const showLogo = !!settings.headerLogoUrl && !logoFailed;

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
        <Link to="/admin" className="admin-brand" style={{ gap: `${settings.headerLogoTextGap}px` }}>
          {showLogo ? (
            <img
              className="admin-brand-logo"
              src={settings.headerLogoUrl}
              alt={settings.systemName}
              style={{ width: settings.headerLogoSize, height: settings.headerLogoSize }}
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span
              className="admin-brand-mark"
              style={{ width: settings.headerLogoSize, height: settings.headerLogoSize }}
            >
              iB
            </span>
          )}
          <span>{settings.systemName}</span>
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
