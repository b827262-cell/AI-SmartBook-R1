import { useState } from "react";

export function ChatInput({
  disabled,
  onSend
}: {
  disabled?: boolean;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  }

  return (
    <form className="chat-input" onSubmit={submit}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="向這本書提問…"
        disabled={disabled}
      />
      <button className="btn" disabled={disabled || !text.trim()}>
        送出
      </button>
    </form>
  );
}
