import type { Book, BookContent } from "@ai-smartbook/schema";
import type { StudentBookDetail, StudentDataSource } from "./dataSource";

/**
 * Data source for the `remote-api` runtime mode. It proxies the admin
 * (AI-adm-D1) API. This is a thin placeholder for a future deployment where
 * the student frontend talks to a central server instead of a local SQLite.
 */
export class RemoteDataSource implements StudentDataSource {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    if (!baseUrl) throw new Error("RemoteDataSource requires STU_REMOTE_API_BASE_URL");
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`);
    if (!res.ok) throw new Error(`Remote API ${path} failed: ${res.status}`);
    return (await res.json()) as T;
  }

  async listBooks(): Promise<Book[]> {
    const data = await this.get<{ books: Book[] }>("/api/admin/books");
    return data.books.filter((b) => b.status === "published");
  }

  async getBook(bookId: string): Promise<StudentBookDetail | null> {
    try {
      return await this.get<StudentBookDetail>(`/api/admin/books/${bookId}`);
    } catch {
      return null;
    }
  }

  async getContents(bookId: string): Promise<BookContent[]> {
    const data = await this.get<{ contents: BookContent[] }>(
      `/api/admin/books/${bookId}/contents`
    );
    return data.contents;
  }
}
