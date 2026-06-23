import { asc, eq } from "drizzle-orm";
import type { ArtifactType, BookJsonArtifact } from "@ai-smartbook/schema";
import type { Db } from "../client";
import { bookJsonArtifacts } from "../schema";
import { newId, nowIso } from "./util";

type Row = typeof bookJsonArtifacts.$inferSelect;

function toArtifact(row: Row): BookJsonArtifact {
  return {
    ...row,
    artifactType: row.artifactType as ArtifactType,
    status: row.status as BookJsonArtifact["status"]
  };
}

export interface CreateBookJsonArtifactInput {
  bookId: string;
  artifactType: ArtifactType;
  fileName: string;
  filePath: string;
  recordCount: number;
  status: "pending" | "done" | "error";
  errorMessage?: string | null;
}

export function makeBookJsonArtifactRepo(db: Db) {
  return {
    create(input: CreateBookJsonArtifactInput): BookJsonArtifact {
      const ts = nowIso();
      const row: Row = {
        id: newId("artifact"),
        bookId: input.bookId,
        artifactType: input.artifactType,
        fileName: input.fileName,
        filePath: input.filePath,
        recordCount: input.recordCount,
        status: input.status,
        errorMessage: input.errorMessage ?? null,
        createdAt: ts,
        updatedAt: ts
      };
      db.insert(bookJsonArtifacts).values(row).run();
      return toArtifact(row);
    },

    findByBookId(bookId: string): BookJsonArtifact[] {
      return db
        .select()
        .from(bookJsonArtifacts)
        .where(eq(bookJsonArtifacts.bookId, bookId))
        .orderBy(asc(bookJsonArtifacts.createdAt))
        .all()
        .map(toArtifact);
    },

    findById(id: string): BookJsonArtifact | null {
      const row = db.select().from(bookJsonArtifacts).where(eq(bookJsonArtifacts.id, id)).get();
      return row ? toArtifact(row) : null;
    },

    deleteByBookId(bookId: string): void {
      db.delete(bookJsonArtifacts).where(eq(bookJsonArtifacts.bookId, bookId)).run();
    },

    deleteById(id: string): void {
      db.delete(bookJsonArtifacts).where(eq(bookJsonArtifacts.id, id)).run();
    }
  };
}

export type BookJsonArtifactRepo = ReturnType<typeof makeBookJsonArtifactRepo>;
