import { z } from "zod";

export const aiJobTypeSchema = z.enum([
  "split_book",
  "build_chapters",
  "summarize_chapter",
  "book_qa"
]);
export type AiJobType = z.infer<typeof aiJobTypeSchema>;

export const aiJobStatusSchema = z.enum(["pending", "running", "success", "failed"]);
export type AiJobStatus = z.infer<typeof aiJobStatusSchema>;

export const bookAiJobSchema = z.object({
  id: z.string(),
  bookId: z.string(),
  jobType: aiJobTypeSchema,
  status: aiJobStatusSchema,
  inputJson: z.string().nullable().optional(),
  outputJson: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type BookAiJob = z.infer<typeof bookAiJobSchema>;

export const createAiJobInputSchema = z.object({
  bookId: z.string(),
  jobType: aiJobTypeSchema,
  status: aiJobStatusSchema.optional(),
  inputJson: z.string().nullable().optional()
});
export type CreateAiJobInput = z.infer<typeof createAiJobInputSchema>;

export const updateAiJobInputSchema = z.object({
  status: aiJobStatusSchema.optional(),
  outputJson: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional()
});
export type UpdateAiJobInput = z.infer<typeof updateAiJobInputSchema>;
