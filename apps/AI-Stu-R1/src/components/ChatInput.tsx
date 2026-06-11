import { useRef, useState } from "react";

interface TextAttachment {
  id: string;
  kind: "text";
  name: string;
  content: string;
}
interface ImageAttachment {
  id: string;
  kind: "image";
  name: string;
  url: string;
}
type Attachment = TextAttachment | ImageAttachment;

const TEXT_EXT = /\.(txt|md|markdown)$/i;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
// Cap embedded text so a large file cannot blow past the API body limit.
const MAX_TEXT_CHARS = 8000;

function uid(): string {
  return Math.random().toString(36).slice(2);
}

/**
 * Chat composer for the student reader. Supports plain text plus attachments:
 * - .txt / .md → content is read and folded into the question context
 * - .png/.jpg/.jpeg/.webp (picked or pasted) → preview + a send hint only
 *   (phase 1 does NOT run OCR / Vision)
 */
export function ChatInput({
  disabled,
  onSend,
  placeholder = "向這本書提問…"
}: {
  disabled?: boolean;
  onSend: (text: string) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function addFiles(files: File[]): Promise<void> {
    const next: Attachment[] = [];
    let rejected = "";
    for (const file of files) {
      if (IMAGE_TYPES.includes(file.type)) {
        next.push({
          id: uid(),
          kind: "image",
          name: file.name || "貼上的圖片",
          url: URL.createObjectURL(file)
        });
      } else if (TEXT_EXT.test(file.name) || file.type === "text/plain" || file.type === "text/markdown") {
        const raw = await file.text();
        next.push({ id: uid(), kind: "text", name: file.name || "附件.txt", content: raw.slice(0, MAX_TEXT_CHARS) });
      } else {
        rejected = file.name || "未知檔案";
      }
    }
    if (next.length) setAttachments((a) => [...a, ...next]);
    setNote(rejected ? `不支援的檔案類型：${rejected}（僅支援 .txt / .md / 圖片）` : "");
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>): void {
    const images = Array.from(e.clipboardData?.files ?? []).filter((f) => IMAGE_TYPES.includes(f.type));
    if (images.length > 0) {
      e.preventDefault(); // keep pasted text behavior only when no image present
      void addFiles(images);
    }
  }

  function removeAttachment(id: string): void {
    setAttachments((a) => {
      const target = a.find((x) => x.id === id);
      if (target?.kind === "image") URL.revokeObjectURL(target.url);
      return a.filter((x) => x.id !== id);
    });
  }

  function composeMessage(): string {
    const parts: string[] = [];
    const base = text.trim();
    if (base) parts.push(base);

    for (const att of attachments) {
      if (att.kind === "text") parts.push(`［附件：${att.name}］\n${att.content}`);
    }
    const images = attachments.filter((a): a is ImageAttachment => a.kind === "image");
    if (images.length > 0) {
      parts.push(
        `（附帶 ${images.length} 張圖片：${images.map((i) => i.name).join("、")}；本階段僅預覽，未進行影像分析）`
      );
    }
    return parts.join("\n\n").trim();
  }

  function submit(e: React.FormEvent): void {
    e.preventDefault();
    if (disabled) return;
    if (!text.trim() && attachments.length === 0) return;
    const message = composeMessage();
    if (!message) return;

    onSend(message);
    attachments.forEach((a) => {
      if (a.kind === "image") URL.revokeObjectURL(a.url);
    });
    setText("");
    setAttachments([]);
    setNote("");
  }

  const canSend = !disabled && (text.trim().length > 0 || attachments.length > 0);

  return (
    <form className="chat-input-wrap" onSubmit={submit}>
      {attachments.length > 0 && (
        <div className="chat-attachments">
          {attachments.map((a) => (
            <div key={a.id} className={`chat-att ${a.kind}`}>
              {a.kind === "image" ? (
                <img src={a.url} alt={a.name} />
              ) : (
                <span className="att-file" title={a.name}>📄 {a.name}</span>
              )}
              <button
                type="button"
                className="att-remove"
                onClick={() => removeAttachment(a.id)}
                aria-label={`移除附件 ${a.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {note && <p className="chat-att-note">{note}</p>}

      <div className="chat-input">
        <button
          type="button"
          className="att-btn"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          title="附加 TXT / Markdown / 圖片"
          aria-label="附加檔案"
        >
          📎
        </button>
        <input
          ref={fileRef}
          type="file"
          hidden
          multiple
          accept=".txt,.md,.markdown,image/png,image/jpeg,image/webp"
          onChange={(e) => {
            if (e.target.files) void addFiles(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
        <input
          className="chat-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={onPaste}
          placeholder={placeholder}
          disabled={disabled}
        />
        <button className="btn" disabled={!canSend}>
          送出
        </button>
      </div>
    </form>
  );
}
