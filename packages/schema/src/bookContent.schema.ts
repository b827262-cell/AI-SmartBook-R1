import { z } from "zod";

export const bookContentSchema = z.object({
  id: z.string(),
  bookId: z.string(),
  fileId: z.string().nullable().optional(),
  chapterId: z.string().nullable().optional(),
  pageNumber: z.number().nullable().optional(),
  contentText: z.string(),
  orderIndex: z.number(),
  createdAt: z.string()
});
export type BookContent = z.infer<typeof bookContentSchema>;

export const createBookContentInputSchema = z.object({
  bookId: z.string(),
  fileId: z.string().nullable().optional(),
  chapterId: z.string().nullable().optional(),
  pageNumber: z.number().nullable().optional(),
  contentText: z.string(),
  orderIndex: z.number()
});
export type CreateBookContentInput = z.infer<typeof createBookContentInputSchema>;
