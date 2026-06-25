import type { ReactNode } from "react";

/** Page title row with an optional subtitle and right-aligned actions slot. */
export function AdminPageHeader({
  title,
  subtitle,
  actions
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="admin-page-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p className="admin-page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </header>
  );
}
