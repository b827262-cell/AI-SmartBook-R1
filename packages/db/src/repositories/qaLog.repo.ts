import { and, desc, eq } from "drizzle-orm";
import type { BookQaLog, CreateQaLogInput } from "@ai-smartbook/schema";
import type { Db } from "../client";
import { bookQaLogs } from "../schema";
import { newId, nowIso } from "./util";

type Row = typeof bookQaLogs.$inferSelect;

export function makeQaLogRepo(db: Db) {
  return {
    create(input: CreateQaLogInput): BookQaLog {
      const row: Row = {
        id: newId("qa"),
        bookId: input.bookId,
        chapterId: input.chapterId ?? null,
        question: input.question,
        answer: input.answer,
        contextJson: input.contextJson ?? null,
        provider: input.provider,
        model: input.model,
        createdAt: nowIso()
      };
      db.insert(bookQaLogs).values(row).run();
      return row;
    },

    createMany(inputs: CreateQaLogInput[]): BookQaLog[] {
      if (inputs.length === 0) return [];
      const rows: Row[] = inputs.map((input) => ({
        id: newId("qa"),
        bookId: input.bookId,
        chapterId: input.chapterId ?? null,
        question: input.question,
        answer: input.answer,
        contextJson: input.contextJson ?? null,
        provider: input.provider,
        model: input.model,
        createdAt: nowIso()
      }));
      db.insert(bookQaLogs).values(rows).run();
      return rows;
    },

    findByBookId(bookId: string): BookQaLog[] {
      return db
        .select()
        .from(bookQaLogs)
        .where(eq(bookQaLogs.bookId, bookId))
        .orderBy(desc(bookQaLogs.createdAt))
        .all();
    },

    findManualByBookId(bookId: string): BookQaLog[] {
      return db
        .select()
        .from(bookQaLogs)
        .where(
          and(
            eq(bookQaLogs.bookId, bookId),
            eq(bookQaLogs.provider, "manual"),
            eq(bookQaLogs.model, "markdown")
          )
        )
        .orderBy(desc(bookQaLogs.createdAt))
        .all();
    },

    deleteByBookIdAndSource(bookId: string, provider: string, model: string): number {
      const rows = db
        .select({ id: bookQaLogs.id })
        .from(bookQaLogs)
        .where(
          and(
            eq(bookQaLogs.bookId, bookId),
            eq(bookQaLogs.provider, provider),
            eq(bookQaLogs.model, model)
          )
        )
        .all();
      if (rows.length === 0) return 0;
      for (const row of rows) {
        db.delete(bookQaLogs).where(eq(bookQaLogs.id, row.id)).run();
      }
      return rows.length;
    }
  };
}

export type QaLogRepo = ReturnType<typeof makeQaLogRepo>;
