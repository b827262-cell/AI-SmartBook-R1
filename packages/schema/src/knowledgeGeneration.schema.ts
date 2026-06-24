import { z } from "zod";

export const generatedKnowledgePointSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(1200),
  keywords: z.array(z.string().min(1).max(40)).min(1).max(8),
  chapterId: z.string().optional(),
  pageNumber: z.number().int().positive().optional(),
  sourceRef: z.string().min(1).max(160),
  confidence: z.number().min(0).max(1).optional()
});
export type GeneratedKnowledgePoint = z.infer<typeof generatedKnowledgePointSchema>;

export const knowledgeGenerationErrorSchema = z.object({
  sourceRef: z.string().optional(),
  message: z.string()
});
export type KnowledgeGenerationError = z.infer<typeof knowledgeGenerationErrorSchema>;

export const knowledgeGenerationSummarySchema = z.object({
  bookId: z.string(),
  sourceFile: z.string().nullable().optional(),
  created: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  errors: z.array(knowledgeGenerationErrorSchema)
});
export type KnowledgeGenerationSummary = z.infer<typeof knowledgeGenerationSummarySchema>;

export const knowledgeGenerationStatusSchema = z.object({
  bookId: z.string(),
  state: z.enum(["idle", "running", "success", "failed"]),
  provider: z.literal("google"),
  hasKey: z.boolean(),
  sourceFile: z.string().nullable().optional(),
  updatedAt: z.string().nullable(),
  lastSummary: knowledgeGenerationSummarySchema.nullable(),
  message: z.string().nullable()
});
export type KnowledgeGenerationStatus = z.infer<typeof knowledgeGenerationStatusSchema>;

export const knowledgeStatsSchema = z.object({
  bookId: z.string(),
  total: z.number().int().nonnegative(),
  withChapter: z.number().int().nonnegative(),
  withPageNumber: z.number().int().nonnegative(),
  latestUpdatedAt: z.string().nullable()
});
export type KnowledgeStats = z.infer<typeof knowledgeStatsSchema>;

export const knowledgeGenerationRequestSchema = z.object({
  selectedModel: z.string().min(1).optional(),
  maxChunks: z.number().int().positive().max(50).optional()
});
export type KnowledgeGenerationRequest = z.infer<typeof knowledgeGenerationRequestSchema>;
