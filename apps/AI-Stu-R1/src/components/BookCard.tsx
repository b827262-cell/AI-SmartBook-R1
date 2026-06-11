import { Link } from "react-router-dom";
import type { StudentBook } from "../bookDisplay";
import { getBookAuthorName } from "../bookDisplay";
import { BookCover } from "./BookCover";

/** Book card: cover (with fallback) + title, links into the reader. */
export function BookCard({ book }: { book: StudentBook }) {
  return (
    <Link className="book-card" to={`/books/${book.id}`}>
      <BookCover book={book} />
      <div className="body">
        <h3>{book.title}</h3>
        <p>{getBookAuthorName(book)}</p>
      </div>
    </Link>
  );
}
