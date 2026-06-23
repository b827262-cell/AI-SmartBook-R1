import type {
  AppearanceSettings,
  Book,
  BookChapter,
  BookContent,
  ChatMessage,
  CreateSmartBookNoteInput,
  QuestionBankImportJob,
  ReaderOutlineResponse,
  SmartSolveImportItem,
  SmartSolveImportJob,
  SmartBookNote,
  UpdateSmartBookNoteInput
} from "@ai-smartbook/schema";

export interface BookDetail extends Book {
  chapters: BookChapter[];
  pdfFileId?: string | null;
  pdfFileName?: string | null;
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

export interface SmartSolveJobDetailResponse {
  job: SmartSolveImportJob;
  items: SmartSolveImportItem[];
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

async function fetchPdfBlob(path: string, sessionId: string): Promise<Blob> {
  const res = await fetch(path, {
    headers: { "X-Student-Session-Id": sessionId },
    cache: "no-store"
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `${res.status} ${res.statusText}`);
  }
  return await res.blob();
}

/**
 * Student-facing API client. It only talks to /api/student/* — it never stores
 * an API key and never calls an AI SDK directly.
 */
export const studentClient = {
  listBooks: () => http<{ mode: string; books: Book[] }>("/api/student/books"),

  getBook: (bookId: string) => http<{ book: BookDetail }>(`/api/student/books/${bookId}`),

  getOutline: (bookId: string) =>
    http<ReaderOutlineResponse>(`/api/student/books/${bookId}/outline`),

  getContents: (bookId: string) =>
    http<{ contents: BookContent[] }>(`/api/student/books/${bookId}/contents`),

  ensureBookSession: (bookId: string, sessionId?: string | null) =>
    http<{ sessionId: string }>(`/api/student/books/${bookId}/session`, {
      method: "POST",
      body: JSON.stringify(sessionId ? { sessionId } : {})
    }),

  getProtectedPdfBlob: (bookId: string, fileId: string, sessionId: string) =>
    fetchPdfBlob(`/api/student/books/${bookId}/files/${fileId}/pdf-view`, sessionId),

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
    http<{ settings: AppearanceSettings }>("/api/appearance-settings"),

  listQuestionBankJobs: () =>
    http<{ jobs: QuestionBankImportJob[] }>("/api/student/question-bank/jobs"),

  listSmartSolveJobs: (bookId: string) =>
    http<{ jobs: SmartSolveImportJob[] }>(`/api/student/books/${bookId}/smart-solve/jobs`),

  getSmartSolveJob: (bookId: string, jobId: string) =>
    http<SmartSolveJobDetailResponse>(`/api/student/books/${bookId}/smart-solve/jobs/${jobId}`),

  // ---- Smart Notes -------------------------------------------------------
  listNotes: (bookId: string) =>
    http<{ notes: SmartBookNote[] }>(`/api/student/books/${bookId}/notes`),

  createNote: (bookId: string, input: CreateSmartBookNoteInput) =>
    http<{ note: SmartBookNote }>(`/api/student/books/${bookId}/notes`, {
      method: "POST",
      body: JSON.stringify(input)
    }),

  updateNote: (bookId: string, noteId: string, input: UpdateSmartBookNoteInput) =>
    http<{ note: SmartBookNote }>(`/api/student/books/${bookId}/notes/${noteId}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    }),

  deleteNote: (bookId: string, noteId: string) =>
    http<{ deleted: boolean }>(`/api/student/books/${bookId}/notes/${noteId}`, {
      method: "DELETE"
    }),

  navigateNote: (bookId: string, noteId: string) =>
    http<{
      noteId: string;
      bookId: string;
      chapterId: string | null;
      pageNumber: number | null;
      sourceMessageId: string | null;
      anchor: boolean;
      fallback: string | null;
    }>(`/api/student/books/${bookId}/notes/${noteId}/navigate`)
};
