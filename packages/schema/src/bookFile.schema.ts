import { z } from "zod";

export const parseStatusSchema = z.enum(["pending", "parsed", "failed"]);
export type ParseStatus = z.infer<typeof parseStatusSchema>;

export const bookFileRoleSchema = z.enum(["source_document", "reference_image", "json_index", "reader_toc"]);
export type BookFileRole = z.infer<typeof bookFileRoleSchema>;

export const bookFileSchema = z.object({
  id: z.string(),
  bookId: z.string(),
  fileName: z.string(),
  filePath: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  role: bookFileRoleSchema.default("source_document"),
  relatedFileId: z.string().nullable().optional(),
  parseStatus: parseStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});
export type BookFile = z.infer<typeof bookFileSchema>;

export const createBookFileInputSchema = z.object({
  bookId: z.string(),
  fileName: z.string(),
  filePath: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  role: bookFileRoleSchema.optional(),
  relatedFileId: z.string().nullable().optional(),
  parseStatus: parseStatusSchema.optional()
});
export type CreateBookFileInput = z.infer<typeof createBookFileInputSchema>;
