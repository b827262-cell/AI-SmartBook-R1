import type {
  AppearanceSettings,
  Book,
  BookChapter,
  BookContent,
  ChatMessage
} from "@ai-smartbook/schema";

export interface BookDetail extends Book {
  chapters: BookChapter[];
}

export interface ChatResponse {
  sessionId: string;
  answer: string;
  chatMode: string;
  source?: string;
  provider?: string;
  model?: string;
  matchedQuestion?: string;
  messages: ChatMessage[];
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/**
 * Student-facing API client. It only talks to /api/student/* — it never stores
 * an API key and never calls an AI SDK directly.
 */
export const studentClient = {
  listBooks: () => http<{ mode: string; books: Book[] }>("/api/student/books"),

  getBook: (bookId: string) => http<{ book: BookDetail }>(`/api/student/books/${bookId}`),

  getContents: (bookId: string) =>
    http<{ contents: BookContent[] }>(`/api/student/books/${bookId}/contents`),

  sendBookChat: (
    bookId: string,
    body: { message: string; sessionId?: string; chapterId?: string }
  ) =>
    http<ChatResponse>(`/api/student/books/${bookId}/chat`, {
      method: "POST",
      body: JSON.stringify(body)
    }),

  getBookChatSession: (bookId: string, sessionId: string) =>
    http<{ sessionId: string; messages: ChatMessage[] }>(
      `/api/student/books/${bookId}/chat-sessions/${sessionId}`
    ),

  getAppearanceSettings: () =>
    http<{ settings: AppearanceSettings }>("/api/appearance-settings")
};
