import type { BookCategoryGroup, StudentBook } from "../bookDisplay";
import { BookCategorySection } from "./BookCategorySection";

interface BookShelfSectionProps {
  groups: BookCategoryGroup[];
  latestBooks: StudentBook[];
}

export function BookShelfSection({ groups, latestBooks }: BookShelfSectionProps) {
  return (
    <section className="bookshelf-section">
      <div className="bookshelf-inner">
        {groups.map((group) => (
          <BookCategorySection key={group.category} title={group.category} books={group.books} />
        ))}

        {latestBooks.length > 0 ? (
          <BookCategorySection title="新上架書籍" books={latestBooks} />
        ) : null}
      </div>
    </section>
  );
}
