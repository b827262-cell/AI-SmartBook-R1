import { desc, eq, and } from "drizzle-orm";
import type { OneClickSolveJob, OneClickSolveCandidate } from "@ai-smartbook/schema";
import type { Db } from "../client";
import { oneClickSolveJobs, oneClickSolveCandidates } from "../schema";
import { newId, nowIso } from "./util";

type JobRow = typeof oneClickSolveJobs.$inferSelect;
type CandidateRow = typeof oneClickSolveCandidates.$inferSelect;

function toJob(row: JobRow): OneClickSolveJob {
  return row as OneClickSolveJob;
}

function toCandidate(row: CandidateRow): OneClickSolveCandidate {
  return {
    id: row.id,
    jobId: row.jobId,
    bookId: row.bookId,
    questionType: row.questionType,
    question: row.question,
    options: JSON.parse(row.optionsJson),
    answer: row.answer,
    explanation: row.explanation,
    sourcePage: row.sourcePage,
    sourceText: row.sourceText,
    status: row.status as "candidate" | "needs_review" | "approved" | "staged" | "rejected",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export interface CreateOneClickSolveCandidateInput {
  jobId: string;
  bookId: string;
  questionType: string;
  question: string;
  options: { label: string; text: string }[];
  answer?: string | null;
  explanation?: string | null;
  sourcePage?: number | null;
  sourceText?: string | null;
  status: "candidate" | "needs_review" | "approved" | "staged" | "rejected";
}

export function makeOneClickSolveRepo(db: Db) {
  return {
    createJob(bookId: string): OneClickSolveJob {
      const now = nowIso();
      const row: JobRow = {
        id: newId("ocj"),
        bookId,
        status: "pending",
        createdAt: now,
        updatedAt: now
      };
      db.insert(oneClickSolveJobs).values(row).run();
      return toJob(row);
    },

    updateJobStatus(jobId: string, status: "pending" | "processing" | "done" | "failed"): void {
      const now = nowIso();
      db.update(oneClickSolveJobs)
        .set({ status, updatedAt: now })
        .where(eq(oneClickSolveJobs.id, jobId))
        .run();
    },

    findJobById(id: string): OneClickSolveJob | null {
      const row = db
        .select()
        .from(oneClickSolveJobs)
        .where(eq(oneClickSolveJobs.id, id))
        .get();
      return row ? toJob(row) : null;
    },

    findJobsByBook(bookId: string, limit = 20): OneClickSolveJob[] {
      return db
        .select()
        .from(oneClickSolveJobs)
        .where(eq(oneClickSolveJobs.bookId, bookId))
        .orderBy(desc(oneClickSolveJobs.createdAt))
        .limit(limit)
        .all()
        .map(toJob);
    },

    createCandidates(inputs: CreateOneClickSolveCandidateInput[]): OneClickSolveCandidate[] {
      const now = nowIso();
      const rows: CandidateRow[] = inputs.map((input) => ({
        id: newId("occ"),
        jobId: input.jobId,
        bookId: input.bookId,
        questionType: input.questionType,
        question: input.question,
        optionsJson: JSON.stringify(input.options),
        answer: input.answer ?? null,
        explanation: input.explanation ?? null,
        sourcePage: input.sourcePage ?? null,
        sourceText: input.sourceText ?? null,
        status: input.status,
        createdAt: now,
        updatedAt: now
      }));
      if (rows.length > 0) {
        db.insert(oneClickSolveCandidates).values(rows).run();
      }
      return rows.map(toCandidate);
    },

    findCandidatesByJob(jobId: string): OneClickSolveCandidate[] {
      return db
        .select()
        .from(oneClickSolveCandidates)
        .where(eq(oneClickSolveCandidates.jobId, jobId))
        .all()
        .map(toCandidate);
    },

    findCandidatesByBook(bookId: string): OneClickSolveCandidate[] {
      return db
        .select()
        .from(oneClickSolveCandidates)
        .where(eq(oneClickSolveCandidates.bookId, bookId))
        .all()
        .map(toCandidate);
    },

    findStagedCandidatesByBook(bookId: string): OneClickSolveCandidate[] {
      return db
        .select()
        .from(oneClickSolveCandidates)
        .where(
          and(
            eq(oneClickSolveCandidates.bookId, bookId),
            eq(oneClickSolveCandidates.status, "staged")
          )
        )
        .all()
        .map(toCandidate);
    },

    updateCandidateStatus(
      candidateId: string,
      status: "candidate" | "needs_review" | "approved" | "staged" | "rejected"
    ): void {
      const now = nowIso();
      db.update(oneClickSolveCandidates)
        .set({ status, updatedAt: now })
        .where(eq(oneClickSolveCandidates.id, candidateId))
        .run();
    }
  };
}

export type OneClickSolveRepo = ReturnType<typeof makeOneClickSolveRepo>;
