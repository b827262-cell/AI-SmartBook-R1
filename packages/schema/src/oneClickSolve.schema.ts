import { z } from "zod";

export const oneClickSolveCandidateSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  bookId: z.string(),
  questionType: z.string(),
  question: z.string(),
  options: z.array(z.object({
    label: z.string(),
    text: z.string()
  })),
  answer: z.string().nullable().optional(),
  explanation: z.string().nullable().optional(),
  sourcePage: z.number().int().nullable().optional(),
  sourceText: z.string().nullable().optional(),
  status: z.enum(["candidate", "needs_review", "approved", "staged", "rejected"]),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type OneClickSolveCandidate = z.infer<typeof oneClickSolveCandidateSchema>;

export const oneClickSolveJobSchema = z.object({
  id: z.string(),
  bookId: z.string(),
  status: z.enum(["pending", "processing", "done", "failed"]),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type OneClickSolveJob = z.infer<typeof oneClickSolveJobSchema>;
