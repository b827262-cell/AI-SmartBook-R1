import type Database from "better-sqlite3";
import { createDbHandle, resolveDbPath } from "./client";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    cover_url TEXT,
    category TEXT NOT NULL DEFAULT '未分類',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS book_files (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    role TEXT NOT NULL DEFAULT 'source_document',
    related_file_id TEXT,
    parse_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS book_contents (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    file_id TEXT,
    chapter_id TEXT,
    page_number INTEGER,
    content_text TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS book_chapters (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    page_start INTEGER,
    page_end INTEGER,
    level INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL DEFAULT 'manual',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    user_id TEXT,
    title TEXT NOT NULL DEFAULT 'New chat',
    created_at TEXT NOT NULL,
    last_seen_at TEXT,
    user_agent TEXT,
    os_name TEXT,
    os_version TEXT,
    browser_name TEXT,
    browser_version TEXT,
    device_type TEXT,
    device_vendor TEXT,
    device_model TEXT,
    last_ip_address TEXT,
    last_ip_country TEXT,
    last_ip_region TEXT,
    last_ip_city TEXT,
    last_ip_source TEXT,
    risk_level TEXT NOT NULL DEFAULT 'safe',
    is_blocked INTEGER NOT NULL DEFAULT 0,
    blocked_at TEXT,
    blocked_reason TEXT,
    risk_note TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS pdf_access_logs (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    file_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    viewed_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS book_ai_jobs (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    input_json TEXT,
    output_json TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS book_qa_logs (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    chapter_id TEXT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    context_json TEXT,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS smart_book_notes (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    chapter_id TEXT,
    page_number INTEGER,
    type TEXT NOT NULL DEFAULT 'text',
    title TEXT NOT NULL DEFAULT '',
    content TEXT,
    canvas_data TEXT,
    canvas_image_url TEXT,
    source_message_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_book_files_book ON book_files(book_id)`,
  `CREATE INDEX IF NOT EXISTS idx_book_contents_book ON book_contents(book_id)`,
  `CREATE INDEX IF NOT EXISTS idx_book_contents_chapter ON book_contents(chapter_id)`,
  `CREATE INDEX IF NOT EXISTS idx_book_chapters_book ON book_chapters(book_id)`,
  `CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pdf_access_logs_book ON pdf_access_logs(book_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pdf_access_logs_session ON pdf_access_logs(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_book_ai_jobs_book ON book_ai_jobs(book_id)`,
  `CREATE INDEX IF NOT EXISTS idx_book_qa_logs_book ON book_qa_logs(book_id)`,
  `CREATE INDEX IF NOT EXISTS idx_smart_book_notes_book ON smart_book_notes(book_id)`
];

/**
 * Add a column to an existing table only when it is missing. SQLite has no
 * `ADD COLUMN IF NOT EXISTS`, so we probe `PRAGMA table_info` first. This keeps
 * migrations non-destructive and safe to re-run against older databases.
 */
function addColumnIfMissing(
  sqlite: Database.Database,
  table: string,
  column: string,
  definition: string
): void {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (cols.some((c) => c.name === column)) return;
  sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
}

/** Idempotently create all tables (and backfill new columns) on the connection. */
export function runMigrations(sqlite: Database.Database): void {
  const tx = sqlite.transaction(() => {
    for (const stmt of STATEMENTS) {
      sqlite.exec(stmt);
    }
    // Backfill columns added after the initial schema. Existing rows pick up the
    // DEFAULT, so legacy books become '未分類' without a destructive migration.
    addColumnIfMissing(sqlite, "books", "category", "category TEXT NOT NULL DEFAULT '未分類'");
    addColumnIfMissing(sqlite, "book_files", "role", "role TEXT NOT NULL DEFAULT 'source_document'");
    addColumnIfMissing(sqlite, "book_files", "related_file_id", "related_file_id TEXT");
    addColumnIfMissing(sqlite, "chat_sessions", "last_seen_at", "last_seen_at TEXT");
    addColumnIfMissing(sqlite, "chat_sessions", "user_agent", "user_agent TEXT");
    addColumnIfMissing(sqlite, "chat_sessions", "os_name", "os_name TEXT");
    addColumnIfMissing(sqlite, "chat_sessions", "os_version", "os_version TEXT");
    addColumnIfMissing(sqlite, "chat_sessions", "browser_name", "browser_name TEXT");
    addColumnIfMissing(sqlite, "chat_sessions", "browser_version", "browser_version TEXT");
    addColumnIfMissing(sqlite, "chat_sessions", "device_type", "device_type TEXT");
    addColumnIfMissing(sqlite, "chat_sessions", "device_vendor", "device_vendor TEXT");
    addColumnIfMissing(sqlite, "chat_sessions", "device_model", "device_model TEXT");
    // Account security: login IP tracking + admin risk/block controls.
    addColumnIfMissing(sqlite, "chat_sessions", "last_ip_address", "last_ip_address TEXT");
    addColumnIfMissing(sqlite, "chat_sessions", "last_ip_country", "last_ip_country TEXT");
    addColumnIfMissing(sqlite, "chat_sessions", "last_ip_region", "last_ip_region TEXT");
    addColumnIfMissing(sqlite, "chat_sessions", "last_ip_city", "last_ip_city TEXT");
    addColumnIfMissing(sqlite, "chat_sessions", "last_ip_source", "last_ip_source TEXT");
    addColumnIfMissing(sqlite, "chat_sessions", "risk_level", "risk_level TEXT NOT NULL DEFAULT 'safe'");
    addColumnIfMissing(sqlite, "chat_sessions", "is_blocked", "is_blocked INTEGER NOT NULL DEFAULT 0");
    addColumnIfMissing(sqlite, "chat_sessions", "blocked_at", "blocked_at TEXT");
    addColumnIfMissing(sqlite, "chat_sessions", "blocked_reason", "blocked_reason TEXT");
    addColumnIfMissing(sqlite, "chat_sessions", "risk_note", "risk_note TEXT");
    addColumnIfMissing(sqlite, "book_chapters", "level", "level INTEGER NOT NULL DEFAULT 0");
    addColumnIfMissing(sqlite, "book_chapters", "source", "source TEXT NOT NULL DEFAULT 'manual'");
  });
  tx();
}

async function main() {
  const dbPath = resolveDbPath();
  const { sqlite } = createDbHandle(dbPath);
  runMigrations(sqlite);
  sqlite.close();
  console.log(`[db] migration complete: ${dbPath}`);
}

// Run when executed directly via `tsx src/migrate.ts`.
const invokedDirectly = process.argv[1]?.includes("migrate");
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
