import { z } from "zod";

export const readerOutlineSourceSchema = z.enum([
  "split_json",
  "chapter_table",
  "pdf_outline",
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

export const readerOutlineResponseSchema = z.object({
  bookId: z.string(),
  source: readerOutlineSourceSchema,
  outline: z.array(readerOutlineNodeSchema)
});
export type ReaderOutlineResponse = z.infer<typeof readerOutlineResponseSchema>;
