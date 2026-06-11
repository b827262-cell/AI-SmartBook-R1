export interface ChatMessageItem {
  role: "user" | "assistant";
  content: string;
}

/** Ported chat bubble look from the legacy tutor-chat panel. */
export function MessageBubble({ message }: { message: ChatMessageItem }) {
  return <div className={`bubble ${message.role}`}>{message.content}</div>;
}
