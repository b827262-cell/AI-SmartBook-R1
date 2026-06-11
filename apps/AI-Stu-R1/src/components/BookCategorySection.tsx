import type { StudentBook } from "../bookDisplay";
import { BookCard } from "./BookCard";

interface BookCategorySectionProps {
  title: string;
  books: StudentBook[];
}

export function BookCategorySection({ title, books }: BookCategorySectionProps) {
  return (
    <section className="bookshelf-section-block">
      <div className="bookshelf-section-head">
        <div className="bookshelf-section-title">
          <span className="section-icon" aria-hidden="true">
            📚
          </span>
          <h2>{title}</h2>
          <span className="section-count">{books.length}本</span>
        </div>
        <div className="section-line" />
      </div>
      <div className="bookshelf-grid">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </section>
  );
}
