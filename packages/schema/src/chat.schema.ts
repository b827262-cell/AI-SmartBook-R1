import { z } from "zod";

export const chatRoleSchema = z.enum(["user", "assistant", "system"]);
export type ChatRole = z.infer<typeof chatRoleSchema>;

export const chatSessionSchema = z.object({
  id: z.string(),
  bookId: z.string(),
  userId: z.string().nullable().optional(),
  title: z.string(),
  createdAt: z.string()
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
  title: z.string().optional()
});
export type CreateChatSessionInput = z.infer<typeof createChatSessionInputSchema>;

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
  sessionId: z.string().optional()
});
export type StudentChatRequest = z.infer<typeof studentChatRequestSchema>;
