import type { ReactNode } from "react";

/** White rounded content card used across the admin pages. */
export function AdminCard({
  title,
  actions,
  children,
  className = ""
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`admin-card ${className}`}>
      {(title || actions) && (
        <div className="admin-card-head">
          {title && <h3>{title}</h3>}
          {actions && <div className="admin-card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
