import { eq } from "drizzle-orm";
import type {
  BookFile,
  BookFileRole,
  CreateBookFileInput,
  ParseStatus
} from "@ai-smartbook/schema";
import type { Db } from "../client";
import { bookFiles } from "../schema";
import { newId, nowIso } from "./util";

type Row = typeof bookFiles.$inferSelect;

function toFile(row: Row): BookFile {
  return {
    ...row,
    role: row.role as BookFileRole,
    parseStatus: row.parseStatus as ParseStatus
  };
}

export function makeBookFileRepo(db: Db) {
  return {
    create(input: CreateBookFileInput): BookFile {
      const ts = nowIso();
      const row: Row = {
        id: newId("file"),
        bookId: input.bookId,
        fileName: input.fileName,
        filePath: input.filePath,
        fileType: input.fileType,
        fileSize: input.fileSize,
        role: input.role ?? "source_document",
        relatedFileId: input.relatedFileId ?? null,
        parseStatus: input.parseStatus ?? "pending",
        createdAt: ts,
        updatedAt: ts
      };
      db.insert(bookFiles).values(row).run();
      return toFile(row);
    },

    findById(id: string): BookFile | null {
      const row = db.select().from(bookFiles).where(eq(bookFiles.id, id)).get();
      return row ? toFile(row) : null;
    },

    findByBookId(bookId: string): BookFile[] {
      return db.select().from(bookFiles).where(eq(bookFiles.bookId, bookId)).all().map(toFile);
    },

    findByRelatedFileId(relatedFileId: string): BookFile[] {
      return db
        .select()
        .from(bookFiles)
        .where(eq(bookFiles.relatedFileId, relatedFileId))
        .all()
        .map(toFile);
    },

    delete(id: string): void {
      db.delete(bookFiles).where(eq(bookFiles.id, id)).run();
    },

    updateParseStatus(id: string, status: ParseStatus): void {
      db.update(bookFiles)
        .set({ parseStatus: status, updatedAt: nowIso() })
        .where(eq(bookFiles.id, id))
        .run();
    },

    resetParseStatusByBookId(bookId: string, status: ParseStatus = "pending"): void {
      db.update(bookFiles)
        .set({ parseStatus: status, updatedAt: nowIso() })
        .where(eq(bookFiles.bookId, bookId))
        .run();
    }
  };
}

export type BookFileRepo = ReturnType<typeof makeBookFileRepo>;
