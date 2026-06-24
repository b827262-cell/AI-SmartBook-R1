export type ReaderTabKey =
  | "smart-book"
  | "smart-note"
  | "smart-manuscript"
  | "my-question-bank";

export interface ReaderTab {
  key: ReaderTabKey;
  label: string;
}

export const READER_TABS: ReaderTab[] = [
  { key: "smart-book", label: "智能書本" },
  { key: "smart-note", label: "智能筆記" },
  { key: "smart-manuscript", label: "智能手稿" },
  { key: "my-question-bank", label: "我的題庫" }
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
