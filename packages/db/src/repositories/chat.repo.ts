import { asc, eq } from "drizzle-orm";
import type {
  ChatMessage,
  ChatRole,
  ChatSession,
  CreateChatMessageInput,
  CreateChatSessionInput
} from "@ai-smartbook/schema";
import type { Db } from "../client";
import { chatMessages, chatSessions } from "../schema";
import { newId, nowIso } from "./util";

type SessionRow = typeof chatSessions.$inferSelect;
type MessageRow = typeof chatMessages.$inferSelect;

function toMessage(row: MessageRow): ChatMessage {
  return { ...row, role: row.role as ChatRole };
}

export function makeChatRepo(db: Db) {
  return {
    createSession(input: CreateChatSessionInput): ChatSession {
      const row: SessionRow = {
        id: newId("session"),
        bookId: input.bookId,
        userId: input.userId ?? null,
        title: input.title ?? "New chat",
        createdAt: nowIso()
      };
      db.insert(chatSessions).values(row).run();
      return row;
    },

    addMessage(input: CreateChatMessageInput): ChatMessage {
      const row: MessageRow = {
        id: newId("msg"),
        sessionId: input.sessionId,
        role: input.role,
        content: input.content,
        createdAt: nowIso()
      };
      db.insert(chatMessages).values(row).run();
      return toMessage(row);
    },

    findMessages(sessionId: string): ChatMessage[] {
      return db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, sessionId))
        .orderBy(asc(chatMessages.createdAt))
        .all()
        .map(toMessage);
    }
  };
}

export type ChatRepo = ReturnType<typeof makeChatRepo>;
