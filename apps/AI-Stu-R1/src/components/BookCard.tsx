import { Link } from "react-router-dom";
import type { Book } from "@ai-smartbook/schema";
import { BookCover } from "./BookCover";

/** Book card: cover (with fallback) + title, links into the reader. */
export function BookCard({ book }: { book: Book }) {
  return (
    <Link className="book-card" to={`/books/${book.id}`}>
      <BookCover book={book} />
      <div className="body">
        <h3>{book.title}</h3>
        <p>{book.subtitle || book.description || "智能書本"}</p>
      </div>
    </Link>
  );
}
