import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const books = sqliteTable("books", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  description: text("description"),
  coverUrl: text("cover_url"),
  category: text("category").notNull().default("未分類"),
  status: text("status").notNull().default("draft"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const bookFiles = sqliteTable("book_files", {
  id: text("id").primaryKey(),
  bookId: text("book_id").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull().default(0),
  parseStatus: text("parse_status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const bookContents = sqliteTable("book_contents", {
  id: text("id").primaryKey(),
  bookId: text("book_id").notNull(),
  fileId: text("file_id"),
  chapterId: text("chapter_id"),
  pageNumber: integer("page_number"),
  contentText: text("content_text").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: text("created_at").notNull()
});

export const bookChapters = sqliteTable("book_chapters", {
  id: text("id").primaryKey(),
  bookId: text("book_id").notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  orderIndex: integer("order_index").notNull().default(0),
  pageStart: integer("page_start"),
  pageEnd: integer("page_end"),
  status: text("status").notNull().default("draft"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const chatSessions = sqliteTable("chat_sessions", {
  id: text("id").primaryKey(),
  bookId: text("book_id").notNull(),
  userId: text("user_id"),
  title: text("title").notNull().default("New chat"),
  createdAt: text("created_at").notNull()
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull()
});

export const bookAiJobs = sqliteTable("book_ai_jobs", {
  id: text("id").primaryKey(),
  bookId: text("book_id").notNull(),
  jobType: text("job_type").notNull(),
  status: text("status").notNull().default("pending"),
  inputJson: text("input_json"),
  outputJson: text("output_json"),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const bookQaLogs = sqliteTable("book_qa_logs", {
  id: text("id").primaryKey(),
  bookId: text("book_id").notNull(),
  chapterId: text("chapter_id"),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  contextJson: text("context_json"),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  createdAt: text("created_at").notNull()
});

export type DbSchema = {
  books: typeof books;
  bookFiles: typeof bookFiles;
  bookContents: typeof bookContents;
  bookChapters: typeof bookChapters;
  chatSessions: typeof chatSessions;
  chatMessages: typeof chatMessages;
  bookAiJobs: typeof bookAiJobs;
  bookQaLogs: typeof bookQaLogs;
};

export const schema = {
  books,
  bookFiles,
  bookContents,
  bookChapters,
  chatSessions,
  chatMessages,
  bookAiJobs,
  bookQaLogs
};
