import { z } from "zod";

export const bookQaLogSchema = z.object({
  id: z.string(),
  bookId: z.string(),
  chapterId: z.string().nullable().optional(),
  question: z.string(),
  answer: z.string(),
  contextJson: z.string().nullable().optional(),
  provider: z.string(),
  model: z.string(),
  createdAt: z.string()
});
export type BookQaLog = z.infer<typeof bookQaLogSchema>;

export const createQaLogInputSchema = z.object({
  bookId: z.string(),
  chapterId: z.string().nullable().optional(),
  question: z.string(),
  answer: z.string(),
  contextJson: z.string().nullable().optional(),
  provider: z.string(),
  model: z.string()
});
export type CreateQaLogInput = z.infer<typeof createQaLogInputSchema>;
