import { z } from "zod";

export const bookStatusSchema = z.enum(["draft", "published", "archived"]);
export type BookStatus = z.infer<typeof bookStatusSchema>;

export const bookSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  category: z.string(),
  status: bookStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Book = z.infer<typeof bookSchema>;

export const createBookInputSchema = z.object({
  title: z.string().min(1, "title is required"),
  subtitle: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  status: bookStatusSchema.optional()
});
export type CreateBookInput = z.infer<typeof createBookInputSchema>;

export const updateBookInputSchema = createBookInputSchema.partial();
export type UpdateBookInput = z.infer<typeof updateBookInputSchema>;
