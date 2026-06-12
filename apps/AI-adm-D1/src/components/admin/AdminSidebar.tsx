import { NavLink } from "react-router-dom";
import { useAppearance } from "../../appearance";

const NAV_CLASS = ({ isActive }: { isActive: boolean }) =>
  `admin-nav-item ${isActive ? "active" : ""}`;

/**
 * Left navigation, scoped to 智能書本管理. The dashboard label is configurable
 * via appearance settings (e.g. 首頁 → 智能中控).
 */
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
      <p className="admin-nav-group">管理後台</p>
      <nav onClick={onNavigate}>
        <NavLink end to="/admin" className={NAV_CLASS}>
          {settings.dashboardNavLabel || "首頁"}
        </NavLink>
        <NavLink end to="/admin/accounts" className={NAV_CLASS}>
          帳戶管理
        </NavLink>
        <NavLink end to="/admin/appearance" className={NAV_CLASS}>
          介面設定
        </NavLink>
      </nav>

      <p className="admin-nav-subgroup">智能書本管理</p>
      <nav onClick={onNavigate}>
        <NavLink end to="/admin/books" className={NAV_CLASS}>
          書本列表
        </NavLink>
        <NavLink end to="/admin/books/new" className={NAV_CLASS}>
          新增書本
        </NavLink>
      </nav>
    </aside>
  );
}
