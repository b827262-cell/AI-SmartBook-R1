interface HeroSearchSectionProps {
  query: string;
  onQueryChange: (value: string) => void;
}

function LearnIcon() {
  return (
    <span className="hero-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 12h7M12 8.5V12l3 2.5" />
      </svg>
    </span>
  );
}

function SearchIcon() {
  return (
    <span className="search-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="6" />
        <path d="m20 20-4.2-4.2" />
      </svg>
    </span>
  );
}

export function HeroSearchSection({ query, onQueryChange }: HeroSearchSectionProps) {
  return (
    <section className="hero-search-section">
      <div className="hero-search-inner">
        <div className="hero-title-row">
          <LearnIcon />
          <h1>iBrain 智能學習夥伴</h1>
        </div>
        <p>書籍・課程・測驗一站搞定</p>
        <label className="hero-search-box">
          <SearchIcon />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="搜尋科目、老師名稱..."
          />
        </label>
      </div>
    </section>
  );
}
