import type { Book } from "@ai-smartbook/schema";

export interface StudentBook extends Book {
  subject?: string | null;
  author?: string | null;
  teacherName?: string | null;
  instructorName?: string | null;
  coverImage?: string | null;
  thumbnailUrl?: string | null;
}

export interface BookCategoryGroup {
  category: string;
  books: StudentBook[];
}

export function getBookCategoryName(book: StudentBook): string {
  return (book.category || book.subject || "未分類").trim() || "未分類";
}

export function getBookAuthorName(book: StudentBook): string {
  return (
    book.author ||
    book.teacherName ||
    book.instructorName ||
    (book.subtitle && book.subtitle !== book.category ? book.subtitle : "") ||
    "授課老師待補"
  );
}

export function getBookCoverUrl(book: StudentBook): string {
  return book.coverUrl || book.coverImage || book.thumbnailUrl || "";
}

function getBookTimestamp(book: StudentBook): number {
  const raw = book.updatedAt || book.createdAt;
  const parsed = raw ? Date.parse(raw) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sortBooksNewestFirst(books: StudentBook[]): StudentBook[] {
  return [...books].sort((a, b) => getBookTimestamp(b) - getBookTimestamp(a));
}

export function groupBooksByCategory(books: StudentBook[]): BookCategoryGroup[] {
  const map = new Map<string, StudentBook[]>();

  for (const book of books) {
    const key = getBookCategoryName(book);
    const list = map.get(key) ?? [];
    list.push(book);
    map.set(key, list);
  }

  return [...map.entries()]
    .map(([category, list]) => ({
      category,
      books: sortBooksNewestFirst(list)
    }))
    .sort((a, b) => {
      if (a.category === "未分類") return 1;
      if (b.category === "未分類") return -1;
      return a.category.localeCompare(b.category, "zh-Hant");
    });
}

export function matchesBookSearch(book: StudentBook, query: string): boolean {
  const term = query.trim().toLowerCase();
  if (!term) return true;

  return [
    book.title,
    getBookCategoryName(book),
    getBookAuthorName(book)
  ]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(term));
}
