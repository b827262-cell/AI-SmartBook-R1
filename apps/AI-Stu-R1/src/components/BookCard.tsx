import { Link } from "react-router-dom";
import type { Book } from "@ai-smartbook/schema";

/** Ported book-card look from the legacy SmartBook Lite library view. */
export function BookCard({ book }: { book: Book }) {
  return (
    <article className="book-card">
      <div className="cover" />
      <div className="body">
        <h3>{book.title}</h3>
        <p>{book.description || book.subtitle || "智能書本"}</p>
        <div className="actions">
          <Link className="btn" to={`/books/${book.id}/read`}>
            開始閱讀
          </Link>
          <Link className="btn ghost" to={`/books/${book.id}/chat`}>
            問書本
          </Link>
        </div>
      </div>
    </article>
  );
}
