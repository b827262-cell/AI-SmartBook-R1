import type {
  AdminChapter,
  AppearanceSettings,
  AppearanceSettingsUpdate,
  Book,
  BookAiJob,
  BookChapter,
  BookContent,
  BookFile,
  BookFileRole,
  BookQaLog,
  ChapterPreviewRow,
  GeneratePdfJsonIndexInput,
  ReaderOutlineNode,
  ReaderOutlineSource,
  PdfJsonIndex,
  StoredJsonIndexSummary,
  CreateBookInput,
  UpdateBookInput,
  QuestionBankImportJob,
  QuestionBankImportResult
} from "@ai-smartbook/schema";

export interface ChapterInput {
  title: string;
  orderIndex: number;
  pageStart?: number | null;
  pageEnd?: number | null;
  level?: number;
  summary?: string | null;
}

export interface ReaderTocImportPayload {
  format: "json" | "markdown";
  content: string;
}

export interface ReaderTocSummary {
  fileId: string;
  fileName: string;
  createdAt: string;
  itemCount: number;
}

export interface ReaderTocResponse {
  source: ReaderOutlineSource;
  file: ReaderTocSummary | null;
  outline: ReaderOutlineNode[];
}

export interface GenerateReaderTocResponse extends ReaderTocResponse {
  textPreview: string;
  warnings: string[];
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

export interface UploadBookFileOptions {
  role?: BookFileRole;
  relatedFileId?: string | null;
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

  importReaderToc: (bookId: string, payload: ReaderTocImportPayload) =>
    http<ReaderTocResponse>(`/api/admin/books/${bookId}/reader-toc/import`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  getReaderToc: (bookId: string) => http<ReaderTocResponse>(`/api/admin/books/${bookId}/reader-toc`),

  // Generate a reader TOC from an already-stored JSON index (no large body upload).
  generateReaderTocFromJsonIndex: (
    bookId: string,
    jsonIndexFileId: string,
    pageStart: number,
    pageEnd: number
  ) =>
    http<GenerateReaderTocResponse>(
      `/api/admin/books/${bookId}/reader-toc/generate-from-json-index`,
      { method: "POST", body: JSON.stringify({ jsonIndexFileId, pageStart, pageEnd }) }
    ),

  deleteReaderToc: (bookId: string) =>
    http<{ deleted: number }>(`/api/admin/books/${bookId}/reader-toc`, {
      method: "DELETE"
    }),

  updateBook: (bookId: string, input: UpdateBookInput) =>
    http<{ book: Book }>(`/api/admin/books/${bookId}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    }),

  uploadFile: (bookId: string, file: File, options?: UploadBookFileOptions) => {
    const form = new FormData();
    form.append("file", file);
    form.append("displayName", file.name);
    if (options?.role) form.append("role", options.role);
    if (options?.relatedFileId) form.append("relatedFileId", options.relatedFileId);
    return http<{ file: BookFile }>(`/api/admin/books/${bookId}/files`, {
      method: "POST",
      body: form
    });
  },

  deleteFile: (bookId: string, fileId: string) =>
    http<{ deleted: boolean }>(`/api/admin/books/${bookId}/files/${fileId}`, {
      method: "DELETE"
    }),

  parseContent: (bookId: string, fileId: string) =>
    http<{ parsed: number; pageCount: number }>(
      `/api/admin/books/${bookId}/files/${fileId}/parse-content`,
      { method: "POST" }
    ),

  parseOutlinePreview: (bookId: string, fileId: string) =>
    http<{ parsed: number; pageCount: number; rows: ChapterPreviewRow[] }>(
      `/api/admin/books/${bookId}/files/${fileId}/outline-preview`,
      { method: "POST", body: JSON.stringify({}) }
    ),

  generateJsonIndex: (bookId: string, fileId: string, level: GeneratePdfJsonIndexInput["level"]) =>
    http<{ index: PdfJsonIndex }>(`/api/admin/books/${bookId}/files/${fileId}/generate-json-index`, {
      method: "POST",
      body: JSON.stringify({ level })
    }),

  applyChapterPreview: (bookId: string, fileId: string, rows: ChapterPreviewRow[]) =>
    http<{ applied: number; skipped: number; linked: number; chapters: AdminChapter[] }>(
      `/api/admin/books/${bookId}/files/${fileId}/apply-chapters`,
      { method: "POST", body: JSON.stringify({ rows }) }
    ),

  // ---- JSON index / QA reference -----------------------------------------
  // Sends only { level, setActive }; the server regenerates + stores the index
  // (the full item array is never uploaded, so large indexes do not 413).
  saveJsonIndex: (
    bookId: string,
    fileId: string,
    level: GeneratePdfJsonIndexInput["level"],
    setActive = false
  ) =>
    http<{ index: StoredJsonIndexSummary }>(
      `/api/admin/books/${bookId}/files/${fileId}/save-json-index`,
      { method: "POST", body: JSON.stringify({ level, setActive }) }
    ),

  uploadJsonIndex: (bookId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return http<{ index: StoredJsonIndexSummary }>(
      `/api/admin/books/${bookId}/json-indexes/upload`,
      { method: "POST", body: form }
    );
  },

  listJsonIndexes: (bookId: string) =>
    http<{ indexes: StoredJsonIndexSummary[]; activeId: string | null }>(
      `/api/admin/books/${bookId}/json-indexes`
    ),

  setActiveQaReference: (bookId: string, indexFileId: string) =>
    http<{ activeId: string; index: StoredJsonIndexSummary }>(
      `/api/admin/books/${bookId}/json-indexes/${indexFileId}/set-active-qa-reference`,
      { method: "POST", body: JSON.stringify({}) }
    ),

  getJsonIndexRawUrl: (bookId: string, indexFileId: string) =>
    `/api/admin/books/${bookId}/json-indexes/${indexFileId}/raw`,

  deleteJsonIndex: (bookId: string, indexFileId: string) =>
    http<{ deleted: boolean }>(`/api/admin/books/${bookId}/json-indexes/${indexFileId}`, {
      method: "DELETE"
    }),

  getBookFileUrl: (bookId: string, fileId: string) =>
    `/api/admin/books/${bookId}/files/${fileId}/raw`,

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

  setAccountRisk: (sessionId: string, riskLevel: RiskLevel, note?: string | null) =>
    http<{ account: AdminAccount | null }>(`/api/admin/accounts/${sessionId}/risk`, {
      method: "PATCH",
      body: JSON.stringify({ riskLevel, note: note ?? null })
    }),

  blockAccount: (sessionId: string, reason?: string | null) =>
    http<{ account: AdminAccount | null }>(`/api/admin/accounts/${sessionId}/block`, {
      method: "PATCH",
      body: JSON.stringify({ blocked: true, reason: reason ?? null })
    }),

  unblockAccount: (sessionId: string) =>
    http<{ account: AdminAccount | null }>(`/api/admin/accounts/${sessionId}/block`, {
      method: "PATCH",
      body: JSON.stringify({ blocked: false })
    }),

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
  },

  importQuestionBankJson: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return http<{ job: QuestionBankImportJob; errors: { index: number; message: string }[] }>(
      "/api/admin/import/question-bank/jobs",
      { method: "POST", body: form }
    );
  },

  listQuestionBankImportJobs: () =>
    http<{ jobs: QuestionBankImportJob[] }>("/api/admin/import/question-bank/jobs"),

  getQuestionBankImportJob: (jobId: string) =>
    http<{ job: QuestionBankImportJob }>(`/api/admin/import/question-bank/jobs/${jobId}`)
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

export type RiskLevel = "safe" | "risk" | "dangerous";

export interface AdminAccount {
  id: string;
  sessionId: string;
  name: string;
  loginMethod: string;
  osName: string;
  deviceType: string;
  browserName: string;
  ipAddress: string | null;
  ipLocation: string;
  riskLevel: RiskLevel;
  riskNote: string | null;
  isBlocked: boolean;
  blockedReason: string | null;
  blockedAt: string | null;
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
