import { desc, eq } from "drizzle-orm";
import type { Db } from "../client";
import { pdfAccessLogs } from "../schema";
import { newId, nowIso } from "./util";

type Row = typeof pdfAccessLogs.$inferSelect;

export interface CreatePdfAccessLogInput {
  bookId: string;
  fileId: string;
  sessionId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  viewedAt?: string;
}

export interface PdfAccessLog {
  id: string;
  bookId: string;
  fileId: string;
  sessionId: string;
  ipAddress: string | null;
  userAgent: string | null;
  viewedAt: string;
}

function toPdfAccessLog(row: Row): PdfAccessLog {
  return {
    id: row.id,
    bookId: row.bookId,
    fileId: row.fileId,
    sessionId: row.sessionId,
    ipAddress: row.ipAddress ?? null,
    userAgent: row.userAgent ?? null,
    viewedAt: row.viewedAt
  };
}

export function makePdfAccessLogRepo(db: Db) {
  return {
    create(input: CreatePdfAccessLogInput): PdfAccessLog {
      const row: Row = {
        id: newId("pdflog"),
        bookId: input.bookId,
        fileId: input.fileId,
        sessionId: input.sessionId,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        viewedAt: input.viewedAt ?? nowIso()
      };
      db.insert(pdfAccessLogs).values(row).run();
      return toPdfAccessLog(row);
    },

    findBySessionId(sessionId: string): PdfAccessLog[] {
      return db
        .select()
        .from(pdfAccessLogs)
        .where(eq(pdfAccessLogs.sessionId, sessionId))
        .orderBy(desc(pdfAccessLogs.viewedAt))
        .all()
        .map(toPdfAccessLog);
    }
  };
}

export type PdfAccessLogRepo = ReturnType<typeof makePdfAccessLogRepo>;
