import { useEffect, useRef, useState } from "react";
import { studentClient } from "../studentClient";
import { MessageBubble, type ChatMessageItem } from "./MessageBubble";
import { ChatInput } from "./ChatInput";

/** Ported ChatPanel from the legacy tutor-chat feature, rewired to studentClient. */
export function ChatPanel({ bookId }: { bookId: string }) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    { role: "assistant", content: "你好！我可以根據這本書的內容回答你的問題。" }
  ]);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true);
    try {
      const r = await studentClient.chat(bookId, text);
      setMessages((m) => [...m, { role: "assistant", content: r.answer }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `發生錯誤：${e instanceof Error ? e.message : String(e)}` }
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chat-wrap">
      <div className="chat-scroll" ref={scrollRef}>
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {busy && <div className="bubble assistant muted">思考中…</div>}
      </div>
      <ChatInput disabled={busy} onSend={send} />
    </div>
  );
}
