import type { Book, BookChapter, BookContent } from "@ai-smartbook/schema";

export interface StudentBookDetail extends Book {
  chapters: BookChapter[];
}

/** Read-only data access used by the student API across all runtime modes. */
export interface StudentDataSource {
  listBooks(): Promise<Book[]>;
  getBook(bookId: string): Promise<StudentBookDetail | null>;
  getContents(bookId: string): Promise<BookContent[]>;
}
