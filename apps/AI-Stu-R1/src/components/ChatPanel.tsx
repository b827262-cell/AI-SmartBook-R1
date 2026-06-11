import { useEffect, useRef, useState } from "react";
import { studentClient } from "../studentClient";
import { MessageBubble, type ChatMessageItem } from "./MessageBubble";
import { ChatInput } from "./ChatInput";

const GREETING: ChatMessageItem = {
  role: "assistant",
  content: "你好！我可以根據這本書的內容回答你的問題。"
};

function sessionKey(bookId: string): string {
  return `smartbook.chatSession.${bookId}`;
}

/**
 * Knowledge-QA chat panel. Persists the chat session id in localStorage and
 * restores history from the server on mount so a page refresh keeps the
 * conversation. Talks only to /api/student/* via studentClient.
 */
export function ChatPanel({
  bookId,
  title,
  subtitle,
  quickPrompts = [],
  inputPlaceholder
}: {
  bookId: string;
  title?: string;
  subtitle?: string;
  quickPrompts?: string[];
  inputPlaceholder?: string;
}) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([GREETING]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore persisted session history when the book changes.
  useEffect(() => {
    setMessages([GREETING]);
    setError("");
    const saved = localStorage.getItem(sessionKey(bookId));
    setSessionId(saved);
    if (!saved) return;
    studentClient
      .getBookChatSession(bookId, saved)
      .then((r) => {
        const restored = r.messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
        if (restored.length > 0) setMessages([GREETING, ...restored]);
      })
      .catch(() => {
        // Stale/invalid session — drop it and start fresh.
        localStorage.removeItem(sessionKey(bookId));
        setSessionId(null);
      });
  }, [bookId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true);
    setError("");
    try {
      const r = await studentClient.sendBookChat(bookId, {
        message: text,
        sessionId: sessionId ?? undefined
      });
      setSessionId(r.sessionId);
      localStorage.setItem(sessionKey(bookId), r.sessionId);
      setMessages((m) => [...m, { role: "assistant", content: r.answer }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chat-wrap">
      {(title || subtitle) && (
        <div className="chat-head">
          {title && <h4>{title}</h4>}
          {subtitle && <p className="chat-sub">{subtitle}</p>}
        </div>
      )}
      <div className="chat-scroll" ref={scrollRef}>
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {busy && <div className="bubble assistant muted">思考中…</div>}
        {error && <div className="bubble assistant" style={{ color: "#b91c1c" }}>發生錯誤：{error}</div>}
      </div>
      {quickPrompts.length > 0 && (
        <div className="chat-quick">
          {quickPrompts.map((q) => (
            <button key={q} type="button" disabled={busy} onClick={() => send(q)}>
              {q}
            </button>
          ))}
        </div>
      )}
      <ChatInput disabled={busy} onSend={send} placeholder={inputPlaceholder} />
    </div>
  );
}
