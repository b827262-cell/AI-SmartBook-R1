import { useEffect, useState } from "react";
import type { Book } from "@ai-smartbook/schema";

/**
 * Book cover that renders coverUrl when present and falls back to a generated
 * book-like cover (title + category + author) when the URL is missing or the
 * image fails to load. Never shows a broken image.
 */
export function BookCover({ book, size = "card" }: { book: Book; size?: "card" | "hero" }) {
  const [failed, setFailed] = useState(false);

  // Reset the error state when the cover source changes so a valid cover on the
  // next book is not stuck showing the previous book's fallback.
  useEffect(() => {
    setFailed(false);
  }, [book.coverUrl, book.title]);

  const showImage = !!book.coverUrl && !failed;

  if (showImage) {
    return (
      <div className={`book-cover ${size}`}>
        <img src={book.coverUrl ?? ""} alt={book.title} onError={() => setFailed(true)} />
      </div>
    );
  }

  return (
    <div className={`book-cover ${size} fallback`} aria-label={book.title}>
      <span className="fc-category">{book.category || "未分類"}</span>
      <span className="fc-title">{book.title}</span>
      <span className="fc-author">{book.subtitle || "SmartBook"}</span>
    </div>
  );
}
