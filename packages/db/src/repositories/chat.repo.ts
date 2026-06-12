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

type SessionClientInfo = Pick<
  ChatSession,
  | "lastSeenAt"
  | "userAgent"
  | "osName"
  | "osVersion"
  | "browserName"
  | "browserVersion"
  | "deviceType"
  | "deviceVendor"
  | "deviceModel"
>;

export function makeChatRepo(db: Db) {
  return {
    createSession(input: CreateChatSessionInput): ChatSession {
      const row: SessionRow = {
        id: newId("session"),
        bookId: input.bookId,
        userId: input.userId ?? null,
        title: input.title ?? "New chat",
        createdAt: nowIso(),
        lastSeenAt: input.lastSeenAt ?? null,
        userAgent: input.userAgent ?? null,
        osName: input.osName ?? null,
        osVersion: input.osVersion ?? null,
        browserName: input.browserName ?? null,
        browserVersion: input.browserVersion ?? null,
        deviceType: input.deviceType ?? null,
        deviceVendor: input.deviceVendor ?? null,
        deviceModel: input.deviceModel ?? null
      };
      db.insert(chatSessions).values(row).run();
      return row;
    },

    findSessionById(id: string): ChatSession | null {
      return db.select().from(chatSessions).where(eq(chatSessions.id, id)).get() ?? null;
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
    },

    /** All chat sessions (used by admin dashboard / accounts aggregates). */
    listSessions(): ChatSession[] {
      return db.select().from(chatSessions).orderBy(asc(chatSessions.createdAt)).all();
    },

    updateSessionClientInfo(id: string, input: SessionClientInfo): ChatSession | null {
      const patch: Partial<SessionRow> = {};
      if (input.lastSeenAt !== undefined) patch.lastSeenAt = input.lastSeenAt ?? null;
      if (input.userAgent !== undefined) patch.userAgent = input.userAgent ?? null;
      if (input.osName !== undefined) patch.osName = input.osName ?? null;
      if (input.osVersion !== undefined) patch.osVersion = input.osVersion ?? null;
      if (input.browserName !== undefined) patch.browserName = input.browserName ?? null;
      if (input.browserVersion !== undefined) patch.browserVersion = input.browserVersion ?? null;
      if (input.deviceType !== undefined) patch.deviceType = input.deviceType ?? null;
      if (input.deviceVendor !== undefined) patch.deviceVendor = input.deviceVendor ?? null;
      if (input.deviceModel !== undefined) patch.deviceModel = input.deviceModel ?? null;
      if (Object.keys(patch).length === 0) return this.findSessionById(id);
      db.update(chatSessions).set(patch).where(eq(chatSessions.id, id)).run();
      return this.findSessionById(id);
    },

    /** All chat messages across sessions (admin dashboard aggregates). */
    listAllMessages(): ChatMessage[] {
      return db
        .select()
        .from(chatMessages)
        .orderBy(asc(chatMessages.createdAt))
        .all()
        .map(toMessage);
    },

    /** Hard-delete a single message (admin student-question removal). */
    deleteMessage(id: string): void {
      db.delete(chatMessages).where(eq(chatMessages.id, id)).run();
    }
  };
}

export type ChatRepo = ReturnType<typeof makeChatRepo>;
