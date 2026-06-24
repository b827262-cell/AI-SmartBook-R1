import { desc, eq } from "drizzle-orm";
import type {
  AiJobStatus,
  AiJobType,
  BookAiJob,
  CreateAiJobInput,
  UpdateAiJobInput
} from "@ai-smartbook/schema";
import type { Db } from "../client";
import { bookAiJobs } from "../schema";
import { newId, nowIso } from "./util";

type Row = typeof bookAiJobs.$inferSelect;

function toJob(row: Row): BookAiJob {
  return { ...row, jobType: row.jobType as AiJobType, status: row.status as AiJobStatus };
}

export function makeAiJobRepo(db: Db) {
  return {
    create(input: CreateAiJobInput): BookAiJob {
      const ts = nowIso();
      const row: Row = {
        id: newId("job"),
        bookId: input.bookId,
        jobType: input.jobType,
        status: input.status ?? "pending",
        inputJson: input.inputJson ?? null,
        outputJson: null,
        errorMessage: null,
        createdAt: ts,
        updatedAt: ts
      };
      db.insert(bookAiJobs).values(row).run();
      return toJob(row);
    },

    update(id: string, input: UpdateAiJobInput): BookAiJob | null {
      const patch: Partial<Row> = { updatedAt: nowIso() };
      if (input.status !== undefined) patch.status = input.status;
      if (input.outputJson !== undefined) patch.outputJson = input.outputJson ?? null;
      if (input.errorMessage !== undefined) patch.errorMessage = input.errorMessage ?? null;
      db.update(bookAiJobs).set(patch).where(eq(bookAiJobs.id, id)).run();
      const row = db.select().from(bookAiJobs).where(eq(bookAiJobs.id, id)).get();
      return row ? toJob(row) : null;
    },

    findById(id: string): BookAiJob | null {
      const row = db.select().from(bookAiJobs).where(eq(bookAiJobs.id, id)).get();
      return row ? toJob(row) : null;
    },

    findByBookId(bookId: string): BookAiJob[] {
      return db
        .select()
        .from(bookAiJobs)
        .where(eq(bookAiJobs.bookId, bookId))
        .orderBy(desc(bookAiJobs.createdAt))
        .all()
        .map(toJob);
    }
  };
}

export type AiJobRepo = ReturnType<typeof makeAiJobRepo>;
