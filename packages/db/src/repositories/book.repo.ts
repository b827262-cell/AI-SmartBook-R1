import { eq } from "drizzle-orm";
import type {
  Book,
  BookStatus,
  CreateBookInput,
  UpdateBookInput
} from "@ai-smartbook/schema";
import type { Db } from "../client";
import { books } from "../schema";
import { newId, nowIso } from "./util";

type Row = typeof books.$inferSelect;

function toBook(row: Row): Book {
  return { ...row, status: row.status as BookStatus };
}

export function makeBookRepo(db: Db) {
  return {
    findAll(): Book[] {
      return db.select().from(books).all().map(toBook);
    },

    findPublished(): Book[] {
      return db.select().from(books).where(eq(books.status, "published")).all().map(toBook);
    },

    findById(id: string): Book | null {
      const row = db.select().from(books).where(eq(books.id, id)).get();
      return row ? toBook(row) : null;
    },

    create(input: CreateBookInput): Book {
      const ts = nowIso();
      const row: Row = {
        id: newId("book"),
        title: input.title,
        subtitle: input.subtitle ?? null,
        description: input.description ?? null,
        coverUrl: input.coverUrl ?? null,
        status: input.status ?? "draft",
        createdAt: ts,
        updatedAt: ts
      };
      db.insert(books).values(row).run();
      return toBook(row);
    },

    update(id: string, input: UpdateBookInput): Book | null {
      const patch: Partial<Row> = { updatedAt: nowIso() };
      if (input.title !== undefined) patch.title = input.title;
      if (input.subtitle !== undefined) patch.subtitle = input.subtitle ?? null;
      if (input.description !== undefined) patch.description = input.description ?? null;
      if (input.coverUrl !== undefined) patch.coverUrl = input.coverUrl ?? null;
      if (input.status !== undefined) patch.status = input.status;
      db.update(books).set(patch).where(eq(books.id, id)).run();
      const row = db.select().from(books).where(eq(books.id, id)).get();
      return row ? toBook(row) : null;
    }
  };
}

export type BookRepo = ReturnType<typeof makeBookRepo>;
