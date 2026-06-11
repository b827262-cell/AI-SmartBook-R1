import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { schema } from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

export interface DbHandle {
  db: Db;
  sqlite: Database.Database;
}

let cached: DbHandle | null = null;

/** Resolve the SQLite file path from env, defaulting to the local data dir. */
export function resolveDbPath(env: NodeJS.ProcessEnv = process.env): string {
  const raw =
    env.SQLITE_PATH ||
    (env.DATABASE_URL ? env.DATABASE_URL.replace(/^file:/, "") : "") ||
    "./data/ai-smartbook-r1.db";
  return resolve(raw);
}

export function createDbHandle(dbPath = resolveDbPath()): DbHandle {
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

/** Shared singleton handle for the default database path. */
export function getDb(): DbHandle {
  if (!cached) {
    cached = createDbHandle();
  }
  return cached;
}
