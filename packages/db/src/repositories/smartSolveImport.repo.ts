import { desc, eq } from "drizzle-orm";
import type { SmartSolveImportJob, SmartSolveImportItem } from "@ai-smartbook/schema";
import type { Db } from "../client";
import { smartSolveImportJobs, smartSolveImportItems } from "../schema";
import { newId, nowIso } from "./util";

type JobRow = typeof smartSolveImportJobs.$inferSelect;
type ItemRow = typeof smartSolveImportItems.$inferSelect;

function toJob(row: JobRow): SmartSolveImportJob {
  return row as SmartSolveImportJob;
}

function toItem(row: ItemRow): SmartSolveImportItem {
  return row as SmartSolveImportItem;
}

export interface CreateSmartSolveImportJobInput {
  bookId: string;
  fileName: string;
  status: "pending" | "done" | "failed";
  totalRecords: number;
  validRecords: number;
  mappedRecords: number;
  unmappedRecords: number;
  invalidRecords: number;
  resultJson?: string | null;
  errorMessage?: string | null;
}

export interface CreateSmartSolveImportItemInput {
  jobId: string;
  bookId: string;
  externalId?: string | null;
  title?: string | null;
  prompt: string;
  solution?: string | null;
  explanation?: string | null;
  skill?: string | null;
  difficulty?: string | null;
  scopeJson?: string | null;
  tagsJson?: string | null;
  metadataJson?: string | null;
  status: "mapped" | "unmapped" | "invalid";
  errorJson?: string | null;
}

export function makeSmartSolveImportRepo(db: Db) {
  return {
    createJob(input: CreateSmartSolveImportJobInput): SmartSolveImportJob {
      const now = nowIso();
      const row: JobRow = {
        id: newId("ssi"),
        bookId: input.bookId,
        fileName: input.fileName,
        status: input.status,
        totalRecords: input.totalRecords,
        validRecords: input.validRecords,
        mappedRecords: input.mappedRecords,
        unmappedRecords: input.unmappedRecords,
        invalidRecords: input.invalidRecords,
        resultJson: input.resultJson ?? null,
        errorMessage: input.errorMessage ?? null,
        createdAt: now,
        updatedAt: now
      };
      db.insert(smartSolveImportJobs).values(row).run();
      return toJob(row);
    },

    createItems(inputs: CreateSmartSolveImportItemInput[]): SmartSolveImportItem[] {
      const now = nowIso();
      const rows: ItemRow[] = inputs.map((input) => ({
        id: newId("ssii"),
        jobId: input.jobId,
        bookId: input.bookId,
        externalId: input.externalId ?? null,
        title: input.title ?? null,
        prompt: input.prompt,
        solution: input.solution ?? null,
        explanation: input.explanation ?? null,
        skill: input.skill ?? null,
        difficulty: input.difficulty ?? null,
        scopeJson: input.scopeJson ?? null,
        tagsJson: input.tagsJson ?? null,
        metadataJson: input.metadataJson ?? null,
        status: input.status,
        errorJson: input.errorJson ?? null,
        createdAt: now,
        updatedAt: now
      }));
      if (rows.length > 0) {
        db.insert(smartSolveImportItems).values(rows).run();
      }
      return rows.map(toItem);
    },

    findJobById(id: string): SmartSolveImportJob | null {
      const row = db
        .select()
        .from(smartSolveImportJobs)
        .where(eq(smartSolveImportJobs.id, id))
        .get();
      return row ? toJob(row) : null;
    },

    findJobsByBook(bookId: string, limit = 20): SmartSolveImportJob[] {
      return db
        .select()
        .from(smartSolveImportJobs)
        .where(eq(smartSolveImportJobs.bookId, bookId))
        .orderBy(desc(smartSolveImportJobs.createdAt))
        .limit(limit)
        .all()
        .map(toJob);
    },

    findItemsByJob(jobId: string): SmartSolveImportItem[] {
      return db
        .select()
        .from(smartSolveImportItems)
        .where(eq(smartSolveImportItems.jobId, jobId))
        .all()
        .map(toItem);
    }
  };
}

export type SmartSolveImportRepo = ReturnType<typeof makeSmartSolveImportRepo>;
