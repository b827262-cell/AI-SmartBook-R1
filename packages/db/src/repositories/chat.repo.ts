import { and, asc, eq } from "drizzle-orm";
import type {
  ChatMessage,
  ChatRole,
  ChatSession,
  CreateChatMessageInput,
  CreateChatSessionInput,
  RiskLevel
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
  | "lastIpAddress"
  | "lastIpCountry"
  | "lastIpRegion"
  | "lastIpCity"
  | "lastIpSource"
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
        deviceModel: input.deviceModel ?? null,
        lastIpAddress: input.lastIpAddress ?? null,
        lastIpCountry: input.lastIpCountry ?? null,
        lastIpRegion: input.lastIpRegion ?? null,
        lastIpCity: input.lastIpCity ?? null,
        lastIpSource: input.lastIpSource ?? null,
        // New sessions start as unmarked and unblocked.
        riskLevel: "safe",
        isBlocked: false,
        blockedAt: null,
        blockedReason: null,
        riskNote: null
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
      if (input.lastIpAddress !== undefined) patch.lastIpAddress = input.lastIpAddress ?? null;
      if (input.lastIpCountry !== undefined) patch.lastIpCountry = input.lastIpCountry ?? null;
      if (input.lastIpRegion !== undefined) patch.lastIpRegion = input.lastIpRegion ?? null;
      if (input.lastIpCity !== undefined) patch.lastIpCity = input.lastIpCity ?? null;
      if (input.lastIpSource !== undefined) patch.lastIpSource = input.lastIpSource ?? null;
      if (Object.keys(patch).length === 0) return this.findSessionById(id);
      db.update(chatSessions).set(patch).where(eq(chatSessions.id, id)).run();
      return this.findSessionById(id);
    },

    /** Admin: set the risk marking (safe/risk/dangerous) and optional note. */
    setRiskLevel(id: string, riskLevel: RiskLevel, note?: string | null): ChatSession | null {
      const patch: Partial<SessionRow> = { riskLevel };
      if (note !== undefined) patch.riskNote = note ?? null;
      db.update(chatSessions).set(patch).where(eq(chatSessions.id, id)).run();
      return this.findSessionById(id);
    },

    /** Admin: block or unblock a session, recording the time/reason on block. */
    setBlocked(id: string, blocked: boolean, reason?: string | null): ChatSession | null {
      const patch: Partial<SessionRow> = {
        isBlocked: blocked,
        blockedAt: blocked ? nowIso() : null,
        blockedReason: blocked ? reason ?? null : null
      };
      db.update(chatSessions).set(patch).where(eq(chatSessions.id, id)).run();
      return this.findSessionById(id);
    },

    /**
     * True when any session sharing this exact (public) IP is blocked. Used to
     * enforce blocks against anonymous visitors who have no persistent identity.
     * Callers must not pass private/local IPs (would block all localhost dev).
     */
    isIpBlocked(ip: string): boolean {
      if (!ip) return false;
      const hit = db
        .select({ id: chatSessions.id })
        .from(chatSessions)
        .where(and(eq(chatSessions.lastIpAddress, ip), eq(chatSessions.isBlocked, true)))
        .get();
      return !!hit;
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
