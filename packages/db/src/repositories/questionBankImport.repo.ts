import { desc, eq } from "drizzle-orm";
import type { QuestionBankImportJob } from "@ai-smartbook/schema";
import type { Db } from "../client";
import { questionBankImportJobs } from "../schema";
import { newId, nowIso } from "./util";

type Row = typeof questionBankImportJobs.$inferSelect;

export interface CreateQuestionBankImportJobInput {
  fileName: string;
  status: "pending" | "done" | "failed";
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  resultJson?: string | null;
  errorMessage?: string | null;
}

function toJob(row: Row): QuestionBankImportJob {
  return row as QuestionBankImportJob;
}

export function makeQuestionBankImportRepo(db: Db) {
  return {
    create(input: CreateQuestionBankImportJobInput): QuestionBankImportJob {
      const row: Row = {
        id: newId("qbi"),
        fileName: input.fileName,
        status: input.status,
        totalRecords: input.totalRecords,
        validRecords: input.validRecords,
        invalidRecords: input.invalidRecords,
        resultJson: input.resultJson ?? null,
        errorMessage: input.errorMessage ?? null,
        createdAt: nowIso()
      };
      db.insert(questionBankImportJobs).values(row).run();
      return toJob(row);
    },

    findById(id: string): QuestionBankImportJob | null {
      const row = db
        .select()
        .from(questionBankImportJobs)
        .where(eq(questionBankImportJobs.id, id))
        .get();
      return row ? toJob(row) : null;
    },

    findRecent(limit = 20): QuestionBankImportJob[] {
      return db
        .select()
        .from(questionBankImportJobs)
        .orderBy(desc(questionBankImportJobs.createdAt))
        .limit(limit)
        .all()
        .map(toJob);
    }
  };
}

export type QuestionBankImportRepo = ReturnType<typeof makeQuestionBankImportRepo>;
