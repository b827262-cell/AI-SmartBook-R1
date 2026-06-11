export type BookStatus = "draft" | "published" | "archived";
export type ParseStatus = "pending" | "parsed" | "failed";
export type ChatRole = "user" | "assistant" | "system";

export interface Book {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  coverUrl?: string | null;
  status: BookStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BookChapter {
  id: string;
  bookId: string;
  title: string;
  summary?: string | null;
  orderIndex: number;
  pageStart?: number | null;
  pageEnd?: number | null;
  status: BookStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BookContent {
  id: string;
  bookId: string;
  fileId?: string | null;
  chapterId?: string | null;
  pageNumber?: number | null;
  contentText: string;
  orderIndex: number;
  createdAt: string;
}

export interface SyncPackage {
  version: string;
  schemaVersion: number;
  exportedAt: string;
  books: Book[];
  chapters: BookChapter[];
  contents: BookContent[];
}
