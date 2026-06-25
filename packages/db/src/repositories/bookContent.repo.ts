import { and, eq, like, asc } from "drizzle-orm";
import type { BookContent, CreateBookContentInput } from "@ai-smartbook/schema";
import type { Db } from "../client";
import { bookContents } from "../schema";
import { newId, nowIso } from "./util";

type Row = typeof bookContents.$inferSelect;

export function makeBookContentRepo(db: Db) {
  return {
    createMany(contents: CreateBookContentInput[]): BookContent[] {
      if (contents.length === 0) return [];
      const ts = nowIso();
      const rows: Row[] = contents.map((c) => ({
        id: newId("content"),
        bookId: c.bookId,
        fileId: c.fileId ?? null,
        chapterId: c.chapterId ?? null,
        pageNumber: c.pageNumber ?? null,
        contentText: c.contentText,
        orderIndex: c.orderIndex,
        createdAt: ts
      }));
      db.insert(bookContents).values(rows).run();
      return rows;
    },

    findByBookId(bookId: string): BookContent[] {
      return db
        .select()
        .from(bookContents)
        .where(eq(bookContents.bookId, bookId))
        .orderBy(asc(bookContents.orderIndex))
        .all();
    },

    deleteByFileId(fileId: string): void {
      db.delete(bookContents).where(eq(bookContents.fileId, fileId)).run();
    },

    deleteByBookId(bookId: string): void {
      db.delete(bookContents).where(eq(bookContents.bookId, bookId)).run();
    },

    findByChapterId(chapterId: string): BookContent[] {
      return db
        .select()
        .from(bookContents)
        .where(eq(bookContents.chapterId, chapterId))
        .orderBy(asc(bookContents.orderIndex))
        .all();
    },

    /** Detach every content row from its chapter (used before regenerating). */
    unlinkChaptersByBookId(bookId: string): void {
      db.update(bookContents)
        .set({ chapterId: null })
        .where(eq(bookContents.bookId, bookId))
        .run();
    },

    linkChapter(contentId: string, chapterId: string | null): void {
      db.update(bookContents)
        .set({ chapterId })
        .where(eq(bookContents.id, contentId))
        .run();
    },

    searchByKeyword(bookId: string, keyword: string): BookContent[] {
      const term = `%${keyword.replace(/[%_]/g, "")}%`;
      return db
        .select()
        .from(bookContents)
        .where(and(eq(bookContents.bookId, bookId), like(bookContents.contentText, term)))
        .orderBy(asc(bookContents.orderIndex))
        .all();
    }
  };
}

export type BookContentRepo = ReturnType<typeof makeBookContentRepo>;
