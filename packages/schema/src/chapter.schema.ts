import { z } from "zod";
import { bookStatusSchema } from "./book.schema";

export const bookChapterSchema = z.object({
  id: z.string(),
  bookId: z.string(),
  title: z.string(),
  summary: z.string().nullable().optional(),
  orderIndex: z.number(),
  pageStart: z.number().nullable().optional(),
  pageEnd: z.number().nullable().optional(),
  status: bookStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});
export type BookChapter = z.infer<typeof bookChapterSchema>;

export const createChapterInputSchema = z.object({
  bookId: z.string(),
  title: z.string().min(1, "title is required"),
  summary: z.string().nullable().optional(),
  orderIndex: z.number(),
  pageStart: z.number().nullable().optional(),
  pageEnd: z.number().nullable().optional(),
  status: bookStatusSchema.optional()
});
export type CreateChapterInput = z.infer<typeof createChapterInputSchema>;

export const updateChapterInputSchema = createChapterInputSchema.partial().omit({ bookId: true });
export type UpdateChapterInput = z.infer<typeof updateChapterInputSchema>;
