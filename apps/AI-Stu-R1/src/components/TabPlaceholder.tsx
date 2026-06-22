/** Placeholder body for not-yet-built reader tabs (影音 / 練題 / 筆記 / 手稿). */
export function TabPlaceholder({ label }: { label: string }) {
  return (
    <div className="tab-placeholder">
      <div className="tab-placeholder-card">
        <h3>{label}</h3>
        <p className="muted">此功能即將推出，敬請期待。</p>
      </div>
    </div>
  );
}
