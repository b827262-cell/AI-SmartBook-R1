import { z } from "zod";

export const chatRoleSchema = z.enum(["user", "assistant", "system"]);
export type ChatRole = z.infer<typeof chatRoleSchema>;

/** Admin risk marking for an account/session. */
export const riskLevelSchema = z.enum(["safe", "risk", "dangerous"]);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const chatSessionSchema = z.object({
  id: z.string(),
  bookId: z.string(),
  userId: z.string().nullable().optional(),
  title: z.string(),
  createdAt: z.string(),
  lastSeenAt: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  osName: z.string().nullable().optional(),
  osVersion: z.string().nullable().optional(),
  browserName: z.string().nullable().optional(),
  browserVersion: z.string().nullable().optional(),
  deviceType: z.string().nullable().optional(),
  deviceVendor: z.string().nullable().optional(),
  deviceModel: z.string().nullable().optional(),
  // Server-captured login IP + (optional) geolocation. Never trusted from client.
  lastIpAddress: z.string().nullable().optional(),
  lastIpCountry: z.string().nullable().optional(),
  lastIpRegion: z.string().nullable().optional(),
  lastIpCity: z.string().nullable().optional(),
  lastIpSource: z.string().nullable().optional(),
  // Admin security controls. riskLevel is kept as a plain string here so the
  // raw DB row maps directly onto ChatSession; the enum is enforced at the API
  // boundary via riskLevelSchema.
  riskLevel: z.string(),
  isBlocked: z.boolean(),
  blockedAt: z.string().nullable().optional(),
  blockedReason: z.string().nullable().optional(),
  riskNote: z.string().nullable().optional()
});
export type ChatSession = z.infer<typeof chatSessionSchema>;

export const chatMessageSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  role: chatRoleSchema,
  content: z.string(),
  createdAt: z.string()
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const createChatSessionInputSchema = z.object({
  bookId: z.string(),
  userId: z.string().nullable().optional(),
  title: z.string().optional(),
  lastSeenAt: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  osName: z.string().nullable().optional(),
  osVersion: z.string().nullable().optional(),
  browserName: z.string().nullable().optional(),
  browserVersion: z.string().nullable().optional(),
  deviceType: z.string().nullable().optional(),
  deviceVendor: z.string().nullable().optional(),
  deviceModel: z.string().nullable().optional(),
  lastIpAddress: z.string().nullable().optional(),
  lastIpCountry: z.string().nullable().optional(),
  lastIpRegion: z.string().nullable().optional(),
  lastIpCity: z.string().nullable().optional(),
  lastIpSource: z.string().nullable().optional()
});
export type CreateChatSessionInput = z.infer<typeof createChatSessionInputSchema>;

/** Admin action: set an account/session risk marking (with optional note). */
export const setRiskLevelInputSchema = z.object({
  riskLevel: riskLevelSchema,
  note: z.string().nullable().optional()
});
export type SetRiskLevelInput = z.infer<typeof setRiskLevelInputSchema>;

/** Admin action: block / unblock an account/session (with optional reason). */
export const blockAccountInputSchema = z.object({
  blocked: z.boolean(),
  reason: z.string().nullable().optional()
});
export type BlockAccountInput = z.infer<typeof blockAccountInputSchema>;

export const createChatMessageInputSchema = z.object({
  sessionId: z.string(),
  role: chatRoleSchema,
  content: z.string()
});
export type CreateChatMessageInput = z.infer<typeof createChatMessageInputSchema>;

/** Public request body for the student/admin chat endpoint. */
export const chatRequestSchema = z.object({
  question: z.string().min(1, "question is required"),
  sessionId: z.string().optional()
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

/**
 * Student chat body. Accepts `message` (preferred) or legacy `question`, plus an
 * optional `sessionId` to continue persisted chat history. Presence of a real
 * question is validated in the handler so either field works.
 */
export const studentChatRequestSchema = z.object({
  message: z.string().optional(),
  question: z.string().optional(),
  sessionId: z.string().optional(),
  chapterId: z.string().optional()
});
export type StudentChatRequest = z.infer<typeof studentChatRequestSchema>;
