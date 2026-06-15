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
  level: z.number().int().default(0),
  source: z.enum(["pdf_outline", "manual", "fallback"]).default("manual"),
  status: bookStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});
export type BookChapter = z.infer<typeof bookChapterSchema>;

export const chapterContentLinkStatusSchema = z.enum([
  "linked",
  "unlinked",
  "missing_content",
  "page_range_invalid"
]);
export type ChapterContentLinkStatus = z.infer<typeof chapterContentLinkStatusSchema>;

/** Chapter enriched with its computed content-link status (admin view). */
export const adminChapterSchema = bookChapterSchema.extend({
  contentLinkStatus: chapterContentLinkStatusSchema,
  linkedContentCount: z.number().int()
});
export type AdminChapter = z.infer<typeof adminChapterSchema>;

export const createChapterInputSchema = z.object({
  bookId: z.string(),
  title: z.string().min(1, "title is required"),
  summary: z.string().nullable().optional(),
  orderIndex: z.number(),
  pageStart: z.number().nullable().optional(),
  pageEnd: z.number().nullable().optional(),
  level: z.number().int().optional(),
  source: z.enum(["pdf_outline", "manual", "fallback"]).optional(),
  status: bookStatusSchema.optional()
});
export type CreateChapterInput = z.infer<typeof createChapterInputSchema>;

export const updateChapterInputSchema = createChapterInputSchema.partial().omit({ bookId: true });
export type UpdateChapterInput = z.infer<typeof updateChapterInputSchema>;
