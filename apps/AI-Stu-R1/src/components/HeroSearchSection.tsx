import { useEffect, useState } from "react";
import { useAppearance } from "../appearance";

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

/** Banner icon: configured image, falling back to the built-in mark on error. */
function BannerIcon({ url, size }: { url: string; size: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  if (url && !failed) {
    return (
      <img
        className="hero-mark-img"
        src={url}
        alt=""
        style={{ width: size, height: size, objectFit: "contain" }}
        onError={() => setFailed(true)}
      />
    );
  }
  return <LearnIcon />;
}

export function HeroSearchSection({ query, onQueryChange }: HeroSearchSectionProps) {
  const a = useAppearance();
  const isCard = a.studentHeroVariant === "card" || a.studentHeroShowCard;

  return (
    <section className={`hero-search-section ${isCard ? "hero-card" : "hero-compact"}`}>
      <div
        className="hero-search-inner"
        style={{
          paddingTop: a.studentHeroPaddingTop,
          paddingBottom: a.studentHeroPaddingBottom,
          maxWidth: a.studentContentMaxWidth
        }}
      >
        <div className={`hero-title-block ${a.studentHeroTextAlign === "left" ? "is-left" : ""}`}>
          <div className="hero-title-main" style={{ gap: a.bannerIconTitleGap }}>
            <BannerIcon url={a.bannerIconUrl} size={a.bannerIconSize} />
            <h1 style={{ fontSize: a.studentHeroTitleFontSize }}>{a.bannerTitle}</h1>
            <span className="hero-subtitle" style={{ fontSize: a.studentHeroSubtitleFontSize }}>
              {a.bannerSubtitle}
            </span>
          </div>
        </div>

        <div className="hero-search-row" style={{ maxWidth: a.studentHeroSearchMaxWidth }}>
          <label className="hero-search-box" style={{ height: a.studentHeroSearchHeight }}>
            <SearchIcon />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={a.searchPlaceholder}
            />
          </label>
          {a.assistantButtonVisible && (
            <button
              type="button"
              className="hero-assistant-btn"
              style={{ height: a.studentHeroSearchHeight }}
            >
              🤖 {a.assistantButtonText}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
