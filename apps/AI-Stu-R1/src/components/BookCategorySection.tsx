import type { StudentBook } from "../bookDisplay";
import { useAppearance } from "../appearance";
import { BookCard } from "./BookCard";

interface BookCategorySectionProps {
  title: string;
  books: StudentBook[];
}

export function BookCategorySection({ title, books }: BookCategorySectionProps) {
  const a = useAppearance();

  return (
    <section className="bookshelf-section-block">
      <div className="bookshelf-section-head">
        <div className="bookshelf-section-title">
          <span className="section-icon" aria-hidden="true">
            {a.categoryIcon || "📚"}
          </span>
          <h2>{title}</h2>
          <span className="section-count">
            {books.length}
            {a.categoryCountSuffix}
          </span>
        </div>
        {a.showCategoryDivider ? <div className="section-line" /> : null}
      </div>
      <div className="bookshelf-grid">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </section>
  );
}
