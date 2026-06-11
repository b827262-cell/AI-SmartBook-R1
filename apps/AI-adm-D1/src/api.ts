import type {
  Book,
  BookAiJob,
  BookChapter,
  BookContent,
  BookFile,
  BookQaLog,
  CreateBookInput,
  UpdateBookInput
} from "@ai-smartbook/schema";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: init?.body && !(init.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : undefined,
    ...init
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export const adminApi = {
  listBooks: () => http<{ books: Book[] }>("/api/admin/books"),

  createBook: (input: CreateBookInput) =>
    http<{ book: Book }>("/api/admin/books", {
      method: "POST",
      body: JSON.stringify(input)
    }),

  getBook: (bookId: string) =>
    http<{ book: Book; chapters: BookChapter[]; files: BookFile[] }>(
      `/api/admin/books/${bookId}`
    ),

  updateBook: (bookId: string, input: UpdateBookInput) =>
    http<{ book: Book }>(`/api/admin/books/${bookId}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    }),

  uploadFile: (bookId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return http<{ file: BookFile }>(`/api/admin/books/${bookId}/files`, {
      method: "POST",
      body: form
    });
  },

  parseFile: (bookId: string, fileId: string) =>
    http<{ parsed: number; pageCount: number }>(
      `/api/admin/books/${bookId}/files/${fileId}/parse`,
      { method: "POST" }
    ),

  getContents: (bookId: string) =>
    http<{ contents: BookContent[] }>(`/api/admin/books/${bookId}/contents`),

  getChapters: (bookId: string) =>
    http<{ chapters: BookChapter[] }>(`/api/admin/books/${bookId}/chapters`),

  splitBook: (bookId: string) =>
    http<{ chapters: BookChapter[] }>(`/api/admin/books/${bookId}/ai/split-book`, {
      method: "POST",
      body: JSON.stringify({})
    }),

  summarizeChapter: (bookId: string, chapterId: string) =>
    http<{ chapter: BookChapter }>(
      `/api/admin/books/${bookId}/chapters/${chapterId}/ai/summarize`,
      { method: "POST", body: JSON.stringify({}) }
    ),

  ask: (bookId: string, question: string) =>
    http<{ answer: string; context: string[]; log: BookQaLog }>(
      `/api/admin/books/${bookId}/qa`,
      { method: "POST", body: JSON.stringify({ question }) }
    ),

  getJobs: (bookId: string) =>
    http<{ jobs: BookAiJob[] }>(`/api/admin/books/${bookId}/ai-jobs`)
};
