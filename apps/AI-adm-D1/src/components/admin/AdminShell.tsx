import { useState, type ReactNode } from "react";
import { AdminTopBar } from "./AdminTopBar";
import { AdminSidebar } from "./AdminSidebar";

/**
 * App shell: sticky top bar + collapsible sidebar (drawer on narrow screens
 * with a dim overlay) + scrollable content area.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="admin-shell">
      <AdminTopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <div className="admin-body">
        <AdminSidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
        {sidebarOpen && (
          <div
            className="admin-overlay"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
