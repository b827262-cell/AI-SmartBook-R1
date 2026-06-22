import { z } from "zod";

export const readerOutlineSourceSchema = z.enum([
  "split_json",
  "chapter_table",
  "pdf_outline",
  "manual_toc",
  "fallback"
]);
export type ReaderOutlineSource = z.infer<typeof readerOutlineSourceSchema>;

export type ReaderOutlineNode = {
  id: string;
  title: string;
  level: number;
  page: number | null;
  pdfPage?: number | null;
  displayPage?: string | null;
  children: ReaderOutlineNode[];
  source?: ReaderOutlineSource;
};

export const readerOutlineNodeSchema: z.ZodType<ReaderOutlineNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    title: z.string(),
    level: z.number().int().min(1),
    page: z.number().int().nullable(),
    pdfPage: z.number().int().nullable().optional(),
    displayPage: z.string().nullable().optional(),
    children: z.array(readerOutlineNodeSchema),
    source: readerOutlineSourceSchema.optional()
  })
);

export const readerTocImportFormatSchema = z.enum(["json", "markdown"]);
export type ReaderTocImportFormat = z.infer<typeof readerTocImportFormatSchema>;

export const readerTocImportPayloadSchema = z.object({
  format: readerTocImportFormatSchema,
  content: z.string().min(1)
});
export type ReaderTocImportPayload = z.infer<typeof readerTocImportPayloadSchema>;

/** Body for generating a reader TOC from an already-stored JSON index file. */
export const generateReaderTocFromIndexInputSchema = z.object({
  jsonIndexFileId: z.string().min(1),
  pageStart: z.number().int().min(1),
  pageEnd: z.number().int().min(1)
});
export type GenerateReaderTocFromIndexInput = z.infer<typeof generateReaderTocFromIndexInputSchema>;

export type ReaderTocInputNode = {
  id?: string;
  title: string;
  level?: number;
  page?: number | null;
  pdfPage?: number | null;
  displayPage?: string | null;
  children?: ReaderTocInputNode[];
};

export const readerTocInputNodeSchema: z.ZodType<ReaderTocInputNode> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    title: z.string().min(1),
    level: z.number().int().min(1).optional(),
    page: z.number().int().nullable().optional(),
    pdfPage: z.number().int().nullable().optional(),
    displayPage: z.string().nullable().optional(),
    children: z.array(readerTocInputNodeSchema).default([])
  })
);

export const readerTocSourceSchema = z.literal("manual_admin_import");
export type ReaderTocSource = z.infer<typeof readerTocSourceSchema>;

export const readerTocFileSchema = z.object({
  schemaVersion: z.literal("smartbook-reader-toc-v1"),
  bookId: z.string().min(1),
  source: readerTocSourceSchema,
  items: z.array(readerTocInputNodeSchema)
});
export type ReaderTocFile = z.infer<typeof readerTocFileSchema>;

export const readerOutlineResponseSchema = z.object({
  bookId: z.string(),
  source: readerOutlineSourceSchema,
  outline: z.array(readerOutlineNodeSchema)
});
export type ReaderOutlineResponse = z.infer<typeof readerOutlineResponseSchema>;
