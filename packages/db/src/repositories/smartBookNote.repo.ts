import { and, desc, eq } from "drizzle-orm";
import type {
  CreateSmartBookNoteInput,
  SmartBookNote,
  SmartBookNoteType,
  UpdateSmartBookNoteInput
} from "@ai-smartbook/schema";
import type { Db } from "../client";
import { smartBookNotes } from "../schema";
import { newId, nowIso } from "./util";

type Row = typeof smartBookNotes.$inferSelect;

function toNote(row: Row): SmartBookNote {
  return { ...row, type: row.type as SmartBookNoteType };
}

export function makeSmartBookNoteRepo(db: Db) {
  return {
    create(bookId: string, input: CreateSmartBookNoteInput): SmartBookNote {
      const ts = nowIso();
      const row: Row = {
        id: newId("note"),
        bookId,
        chapterId: input.chapterId ?? null,
        pageNumber: input.pageNumber ?? null,
        type: input.type,
        title: input.title?.trim() || defaultTitle(input.type),
        content: input.content ?? null,
        canvasData: input.canvasData ?? null,
        canvasImageUrl: input.canvasImageUrl ?? null,
        sourceMessageId: input.sourceMessageId ?? null,
        createdAt: ts,
        updatedAt: ts
      };
      db.insert(smartBookNotes).values(row).run();
      return toNote(row);
    },

    findAll(): SmartBookNote[] {
      return db
        .select()
        .from(smartBookNotes)
        .orderBy(desc(smartBookNotes.createdAt))
        .all()
        .map(toNote);
    },

    findByBookId(bookId: string): SmartBookNote[] {
      return db
        .select()
        .from(smartBookNotes)
        .where(eq(smartBookNotes.bookId, bookId))
        .orderBy(desc(smartBookNotes.createdAt))
        .all()
        .map(toNote);
    },

    findById(id: string): SmartBookNote | null {
      const row = db.select().from(smartBookNotes).where(eq(smartBookNotes.id, id)).get();
      return row ? toNote(row) : null;
    },

    update(id: string, input: UpdateSmartBookNoteInput): SmartBookNote | null {
      const patch: Partial<Row> = { updatedAt: nowIso() };
      if (input.title !== undefined) patch.title = input.title;
      if (input.content !== undefined) patch.content = input.content;
      if (input.canvasData !== undefined) patch.canvasData = input.canvasData;
      if (input.canvasImageUrl !== undefined) patch.canvasImageUrl = input.canvasImageUrl;
      if (input.chapterId !== undefined) patch.chapterId = input.chapterId;
      if (input.pageNumber !== undefined) patch.pageNumber = input.pageNumber;
      db.update(smartBookNotes).set(patch).where(eq(smartBookNotes.id, id)).run();
      return this.findById(id);
    },

    delete(id: string): void {
      db.delete(smartBookNotes).where(eq(smartBookNotes.id, id)).run();
    },

    deleteByBookIdAndTypeAndSourcePrefix(bookId: string, type: SmartBookNoteType, sourcePrefix: string): number {
      const rows = db
        .select({ id: smartBookNotes.id, sourceMessageId: smartBookNotes.sourceMessageId })
        .from(smartBookNotes)
        .where(and(eq(smartBookNotes.bookId, bookId), eq(smartBookNotes.type, type)))
        .all()
        .filter((row) => row.sourceMessageId?.startsWith(sourcePrefix) ?? false);
      if (rows.length === 0) return 0;
      for (const row of rows) {
        db.delete(smartBookNotes).where(eq(smartBookNotes.id, row.id)).run();
      }
      return rows.length;
    }
  };
}

function defaultTitle(type: SmartBookNoteType): string {
  if (type === "ai_answer") return "AI 筆記";
  if (type === "canvas") return "手寫筆記";
  return "筆記";
}

export type SmartBookNoteRepo = ReturnType<typeof makeSmartBookNoteRepo>;
