import { z } from "zod";

export const pdfJsonIndexLevelSchema = z.enum(["page", "chapter", "clause", "line", "sentence"]);
export type PdfJsonIndexLevel = z.infer<typeof pdfJsonIndexLevelSchema>;

export const pdfJsonIndexLevelLabelSchema = z.enum(["簡單", "進階", "複雜", "高階", "頂級"]);
export type PdfJsonIndexLevelLabel = z.infer<typeof pdfJsonIndexLevelLabelSchema>;

export const pdfJsonIndexSourceSchema = z.object({
  pageNumberMode: z.literal("pdf_physical_page"),
  lineMode: z.enum(["newline_split_from_stored_page_text"]).optional()
});
export type PdfJsonIndexSource = z.infer<typeof pdfJsonIndexSourceSchema>;

export const pdfJsonIndexItemSchema = z.object({
  id: z.string(),
  type: pdfJsonIndexLevelSchema,
  pageStart: z.number().int(),
  pageEnd: z.number().int(),
  text: z.string(),
  charCount: z.number().int().nonnegative(),
  chapterId: z.string().optional(),
  chapterTitle: z.string().optional()
});
export type PdfJsonIndexItem = z.infer<typeof pdfJsonIndexItemSchema>;

export const pdfJsonIndexSchema = z.object({
  schemaVersion: z.literal("smartbook-pdf-index-v1"),
  bookId: z.string(),
  fileId: z.string(),
  fileName: z.string(),
  level: pdfJsonIndexLevelSchema,
  levelLabel: pdfJsonIndexLevelLabelSchema,
  generatedAt: z.string(),
  pageCount: z.number().int().nonnegative(),
  itemCount: z.number().int().nonnegative(),
  source: pdfJsonIndexSourceSchema,
  notes: z.array(z.string()).optional(),
  items: z.array(pdfJsonIndexItemSchema)
});
export type PdfJsonIndex = z.infer<typeof pdfJsonIndexSchema>;

export const generatePdfJsonIndexInputSchema = z.object({
  level: pdfJsonIndexLevelSchema
});
export type GeneratePdfJsonIndexInput = z.infer<typeof generatePdfJsonIndexInputSchema>;
