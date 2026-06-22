import { z } from "zod";

export const smartSolveScopeSchema = z.object({
  bookId: z.string().optional(),
  chapterId: z.string().optional(),
  chapterTitle: z.string().optional(),
  pageStart: z.number().int().optional(),
  pageEnd: z.number().int().optional()
});
export type SmartSolveScope = z.infer<typeof smartSolveScopeSchema>;

export const smartSolveItemSchema = z.object({
  externalId: z.string().optional(),
  title: z.string().optional(),
  prompt: z.string().min(1),
  solution: z.string().optional(),
  explanation: z.string().optional(),
  skill: z.string().optional(),
  difficulty: z.string().optional(),
  scope: smartSolveScopeSchema.optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});
export type SmartSolveItem = z.infer<typeof smartSolveItemSchema>;

export const smartSolveJsonFileSchema = z.union([
  z.object({
    version: z.string().optional(),
    source: z.string().optional(),
    bookId: z.string().optional(),
    scopes: z.array(smartSolveScopeSchema).optional(),
    items: z.array(smartSolveItemSchema)
  }),
  z.array(smartSolveItemSchema)
]);
export type SmartSolveJsonFile = z.infer<typeof smartSolveJsonFileSchema>;

export const smartSolveImportJobSchema = z.object({
  id: z.string(),
  bookId: z.string(),
  fileName: z.string(),
  status: z.enum(["pending", "done", "failed"]),
  totalRecords: z.number().int(),
  validRecords: z.number().int(),
  mappedRecords: z.number().int(),
  unmappedRecords: z.number().int(),
  invalidRecords: z.number().int(),
  resultJson: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type SmartSolveImportJob = z.infer<typeof smartSolveImportJobSchema>;

export const smartSolveImportItemSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  bookId: z.string(),
  externalId: z.string().nullable(),
  title: z.string().nullable(),
  prompt: z.string(),
  solution: z.string().nullable(),
  explanation: z.string().nullable(),
  skill: z.string().nullable(),
  difficulty: z.string().nullable(),
  scopeJson: z.string().nullable(),
  tagsJson: z.string().nullable(),
  metadataJson: z.string().nullable(),
  status: z.enum(["mapped", "unmapped", "invalid"]),
  errorJson: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type SmartSolveImportItem = z.infer<typeof smartSolveImportItemSchema>;
