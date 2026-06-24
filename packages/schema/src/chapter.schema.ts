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

export const chapterPreviewEntryTypeSchema = z.enum([
  "front_matter",
  "toc",
  "chapter",
  "appendix",
  "copyright",
  "back_matter",
  "group",
  "unknown"
]);
export type ChapterPreviewEntryType = z.infer<typeof chapterPreviewEntryTypeSchema>;

export const chapterPreviewApplyStatusSchema = z.enum([
  "ready",
  "disabled",
  "missing_page",
  "invalid_range"
]);
export type ChapterPreviewApplyStatus = z.infer<typeof chapterPreviewApplyStatusSchema>;

export const chapterPreviewRowSchema = z.object({
  id: z.string().optional(),
  outlineLevel: z.number().int().default(0),
  enabled: z.boolean(),
  originalTitle: z.string(),
  referenceTitle: z.string().nullable().optional(),
  suggestedTitle: z.string(),
  printedPageLabel: z.string().nullable().optional(),
  printedPageStart: z.string().nullable().optional(),
  printedPageEnd: z.string().nullable().optional(),
  pageStart: z.number().int().nullable(),
  pageEnd: z.number().int().nullable(),
  entryType: chapterPreviewEntryTypeSchema,
  sortOrder: z.number().int(),
  adminNote: z.string().nullable().optional(),
  applyStatus: chapterPreviewApplyStatusSchema.optional()
});
export type ChapterPreviewRow = z.infer<typeof chapterPreviewRowSchema>;

export const applyChapterPreviewInputSchema = z.object({
  rows: z.array(chapterPreviewRowSchema)
});
export type ApplyChapterPreviewInput = z.infer<typeof applyChapterPreviewInputSchema>;

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
