import { NavLink } from "react-router-dom";
import { useAppearance } from "../../appearance";
import { ADMIN_NAV_GROUPS } from "../../navigation/adminNav";

const NAV_CLASS = ({ isActive }: { isActive: boolean }) =>
  `admin-nav-item ${isActive ? "active" : ""}`;

const DISABLED_CLASS = "admin-nav-item admin-nav-item--disabled";

export function AdminSidebar({
  open,
  onNavigate
}: {
  open: boolean;
  onNavigate: () => void;
}) {
  const { settings } = useAppearance();

  return (
    <aside className={`admin-sidebar ${open ? "open" : ""}`}>
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="admin-nav-group">{group.label}</p>
          <nav onClick={onNavigate}>
            {group.items.map((item) => {
              const label =
                item.to === "/admin" && settings.dashboardNavLabel
                  ? settings.dashboardNavLabel
                  : item.label;

              if (item.enabled === false) {
                return (
                  <span
                    key={item.to}
                    className={DISABLED_CLASS}
                    title={item.description || "尚未實作"}
                  >
                    {label}
                    <span className="admin-nav-badge">待實作</span>
                  </span>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  end={item.end}
                  to={item.to}
                  className={NAV_CLASS}
                  title={item.description}
                >
                  {label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      ))}
    </aside>
  );
}
