import type {
  AdminChapter,
  AppearanceSettings,
  AppearanceSettingsUpdate,
  Book,
  BookAiJob,
  BookChapter,
  BookContent,
  BookFile,
  BookQaLog,
  CreateBookInput,
  UpdateBookInput
} from "@ai-smartbook/schema";

export interface ChapterInput {
  title: string;
  orderIndex: number;
  pageStart?: number | null;
  pageEnd?: number | null;
  level?: number;
  summary?: string | null;
}

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
    form.append("displayName", file.name);
    return http<{ file: BookFile }>(`/api/admin/books/${bookId}/files`, {
      method: "POST",
      body: form
    });
  },

  deleteFile: (bookId: string, fileId: string) =>
    http<{ deleted: boolean }>(`/api/admin/books/${bookId}/files/${fileId}`, {
      method: "DELETE"
    }),

  parseFile: (bookId: string, fileId: string) =>
    http<{ parsed: number; pageCount: number }>(
      `/api/admin/books/${bookId}/files/${fileId}/parse`,
      { method: "POST" }
    ),

  getContents: (bookId: string) =>
    http<{ contents: BookContent[] }>(`/api/admin/books/${bookId}/contents`),

  clearContents: (bookId: string) =>
    http<{ cleared: boolean }>(`/api/admin/books/${bookId}/contents`, {
      method: "DELETE"
    }),

  getChapters: (bookId: string) =>
    http<{ chapters: AdminChapter[] }>(`/api/admin/books/${bookId}/chapters`),

  generateChapters: (bookId: string) =>
    http<{ chapters: AdminChapter[] }>(`/api/admin/books/${bookId}/chapters/build`, {
      method: "POST",
      body: JSON.stringify({})
    }),

  linkChapterContent: (bookId: string) =>
    http<{ linked: number; chapters: AdminChapter[] }>(
      `/api/admin/books/${bookId}/chapters/link-content`,
      { method: "POST", body: JSON.stringify({}) }
    ),

  createChapter: (bookId: string, input: ChapterInput) =>
    http<{ chapter: BookChapter }>(`/api/admin/books/${bookId}/chapters`, {
      method: "POST",
      body: JSON.stringify(input)
    }),

  updateChapter: (bookId: string, chapterId: string, input: Partial<ChapterInput>) =>
    http<{ chapter: BookChapter }>(`/api/admin/books/${bookId}/chapters/${chapterId}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    }),

  deleteChapter: (bookId: string, chapterId: string) =>
    http<{ deleted: boolean }>(`/api/admin/books/${bookId}/chapters/${chapterId}`, {
      method: "DELETE"
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

  importQaMarkdown: (bookId: string, markdown: string) =>
    http<{ imported: number; logs: BookQaLog[] }>(
      `/api/admin/books/${bookId}/qa/import-markdown`,
      { method: "POST", body: JSON.stringify({ markdown }) }
    ),

  getQaLogs: (bookId: string) =>
    http<{ logs: BookQaLog[] }>(`/api/admin/books/${bookId}/qa-logs`),

  getJobs: (bookId: string) =>
    http<{ jobs: BookAiJob[] }>(`/api/admin/books/${bookId}/ai-jobs`),

  // ---- Dashboard / accounts ----------------------------------------------
  getDashboardStats: (range: DashboardRange = "month") =>
    http<AdminDashboardStats>(`/api/admin/dashboard/stats?range=${range}`),

  listAccounts: () => http<{ accounts: AdminAccount[] }>("/api/admin/accounts"),

  listStudentQuestions: () =>
    http<{ questions: StudentQuestion[] }>("/api/admin/student-questions"),

  deleteStudentQuestion: (id: string) =>
    http<{ deleted: boolean }>(`/api/admin/student-questions/${id}`, { method: "DELETE" }),

  deleteStudentQuestions: (ids: string[]) =>
    http<{ deleted: number }>("/api/admin/student-questions/delete", {
      method: "POST",
      body: JSON.stringify({ ids })
    }),

  // ---- Appearance settings -----------------------------------------------
  getAppearanceSettings: () =>
    http<{ settings: AppearanceSettings }>("/api/appearance-settings"),

  updateAppearanceSettings: (input: AppearanceSettingsUpdate) =>
    http<{ settings: AppearanceSettings }>("/api/admin/appearance-settings", {
      method: "PUT",
      body: JSON.stringify(input)
    }),

  uploadAppearanceImage: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return http<{ url: string }>("/api/admin/appearance-settings/upload", {
      method: "POST",
      body: form
    });
  }
};

export type DashboardRange = "week" | "month" | "all";

export interface DailyConversationPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalConversations: number;
  totalMessages: number;
  dailyConversations: DailyConversationPoint[];
}

export interface AdminAccount {
  id: string;
  name: string;
  loginMethod: string;
  osName: string;
  deviceType: string;
  browserName: string;
  lastSeenAt: string;
  online: boolean;
}

export interface StudentQuestion {
  id: string;
  sessionId: string;
  student: string;
  subject: string;
  content: string;
  createdAt: string;
}
