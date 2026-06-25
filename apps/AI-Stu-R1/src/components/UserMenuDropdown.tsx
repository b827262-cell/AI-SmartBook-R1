interface UserMenuDropdownProps {
  open: boolean;
  name: string;
  points: number;
  canLogout: boolean;
  onLogout: () => void;
}

export function UserMenuDropdown({
  open,
  name,
  points,
  canLogout,
  onLogout
}: UserMenuDropdownProps) {
  if (!open) return null;

  return (
    <div className="user-menu-dropdown">
      <div className="user-menu-meta">
        <strong title={name}>{name}</strong>
        <span>點數餘額：{points}</span>
      </div>
      <button className="user-menu-item" onClick={onLogout} disabled={!canLogout} type="button">
        登出
      </button>
    </div>
  );
}
