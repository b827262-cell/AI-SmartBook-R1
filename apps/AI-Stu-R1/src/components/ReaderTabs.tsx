export type ReaderTabKey =
  | "smart-book"
  | "smart-video"
  | "smart-quiz"
  | "smart-note"
  | "smart-manuscript";

export interface ReaderTab {
  key: ReaderTabKey;
  label: string;
}

export const READER_TABS: ReaderTab[] = [
  { key: "smart-book", label: "智能書本" },
  { key: "smart-video", label: "智能影音" },
  { key: "smart-quiz", label: "智能練題" },
  { key: "smart-note", label: "智能筆記" },
  { key: "smart-manuscript", label: "智能手稿" }
];

/** Second-level feature tabs with a blue active underline. */
export function ReaderTabs({
  active,
  onChange
}: {
  active: ReaderTabKey;
  onChange: (key: ReaderTabKey) => void;
}) {
  return (
    <nav className="reader-tabs" role="tablist">
      {READER_TABS.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={active === tab.key}
          className={`reader-tab ${active === tab.key ? "active" : ""}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
