import { asc, eq } from "drizzle-orm";
import type {
  BookChapter,
  BookStatus,
  CreateChapterInput,
  UpdateChapterInput
} from "@ai-smartbook/schema";
import type { Db } from "../client";
import { bookChapters } from "../schema";
import { newId, nowIso } from "./util";

type Row = typeof bookChapters.$inferSelect;

function toChapter(row: Row): BookChapter {
  return { ...row, status: row.status as BookStatus };
}

function buildRow(input: CreateChapterInput): Row {
  const ts = nowIso();
  return {
    id: newId("chapter"),
    bookId: input.bookId,
    title: input.title,
    summary: input.summary ?? null,
    orderIndex: input.orderIndex,
    pageStart: input.pageStart ?? null,
    pageEnd: input.pageEnd ?? null,
    status: input.status ?? "draft",
    createdAt: ts,
    updatedAt: ts
  };
}

export function makeChapterRepo(db: Db) {
  return {
    findByBookId(bookId: string): BookChapter[] {
      return db
        .select()
        .from(bookChapters)
        .where(eq(bookChapters.bookId, bookId))
        .orderBy(asc(bookChapters.orderIndex))
        .all()
        .map(toChapter);
    },

    findById(id: string): BookChapter | null {
      const row = db.select().from(bookChapters).where(eq(bookChapters.id, id)).get();
      return row ? toChapter(row) : null;
    },

    create(input: CreateChapterInput): BookChapter {
      const row = buildRow(input);
      db.insert(bookChapters).values(row).run();
      return toChapter(row);
    },

    createMany(inputs: CreateChapterInput[]): BookChapter[] {
      if (inputs.length === 0) return [];
      const rows = inputs.map(buildRow);
      db.insert(bookChapters).values(rows).run();
      return rows.map(toChapter);
    },

    update(id: string, input: UpdateChapterInput): BookChapter | null {
      const patch: Partial<Row> = { updatedAt: nowIso() };
      if (input.title !== undefined) patch.title = input.title;
      if (input.summary !== undefined) patch.summary = input.summary ?? null;
      if (input.orderIndex !== undefined) patch.orderIndex = input.orderIndex;
      if (input.pageStart !== undefined) patch.pageStart = input.pageStart ?? null;
      if (input.pageEnd !== undefined) patch.pageEnd = input.pageEnd ?? null;
      if (input.status !== undefined) patch.status = input.status;
      db.update(bookChapters).set(patch).where(eq(bookChapters.id, id)).run();
      const row = db.select().from(bookChapters).where(eq(bookChapters.id, id)).get();
      return row ? toChapter(row) : null;
    }
  };
}

export type ChapterRepo = ReturnType<typeof makeChapterRepo>;
