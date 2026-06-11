import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";
import { SafeLink } from "@/components/SafeLink";

interface MarkdownWithMathProps {
  children: string;
  /** 當在使用者訊息（藍色背景）中使用時設為 true，確保 code block 等元素的文字顏色正確 */
  isUserMessage?: boolean;
}

export function MarkdownWithMath({ children, isUserMessage = false }: MarkdownWithMathProps) {
  const codeBlockClass = isUserMessage
    ? "p-4 rounded-lg bg-white/20 overflow-x-auto my-4 max-w-full text-primary-foreground"
    : "p-4 rounded-lg bg-muted overflow-x-auto my-4 max-w-full text-foreground";

  const inlineCodeClass = isUserMessage
    ? "px-1.5 py-0.5 rounded bg-white/20 text-sm font-mono break-all text-primary-foreground"
    : "px-1.5 py-0.5 rounded bg-muted text-sm font-mono break-all text-foreground";

  const tableHeaderClass = isUserMessage
    ? "border border-white/30 px-4 py-3 bg-white/20 font-semibold text-left text-primary-foreground"
    : "border border-border px-4 py-3 bg-muted font-semibold text-left";

  const tableCellClass = isUserMessage
    ? "border border-white/30 px-4 py-3 text-primary-foreground"
    : "border border-border px-4 py-3";

  const tableClass = isUserMessage
    ? "w-full border-collapse border border-white/30"
    : "w-full border-collapse border border-border";

  return (
    <div className="overflow-x-auto max-w-full" style={{ lineHeight: '1.85', fontSize: '15px' }}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={{
          // 段落：充裕的段落間距
          // 使用 div 而非 p，避免 ReactMarkdown 在 p 內生成 div/pre 造成非法 HTML          // 段落：使用 div 避免 ReactMarkdown 在 p 內生成 div/pre 造成非法 HTML 嵌套
          p: ({ node, children, ...props }) => (
            <div
              className="break-words"
              style={{
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
                marginBottom: '1rem',
                lineHeight: '1.85',
                display: 'block',
                color: isUserMessage ? '#ffffff' : '#111111',
              }}
            >
              {children}
            </div>
          ),
          // 標題：粗體突出，上下有充裕空白
          h1: ({ node, ...props }) => (
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '1.5rem', marginBottom: '0.75rem', lineHeight: 1.4 }} {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '1.25rem', marginBottom: '0.65rem', lineHeight: 1.4 }} {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginTop: '1.1rem', marginBottom: '0.55rem', lineHeight: 1.4 }} {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem', lineHeight: 1.4 }} {...props} />
          ),
          // 無序列表：縮排清晰，項目間有明顯間距
          ul: ({ node, ...props }) => (
            <ul
              style={{
                listStyleType: 'disc',
                paddingLeft: '1.5rem',
                marginTop: '0.75rem',
                marginBottom: '0.75rem',
              }}
              {...props}
            />
          ),
          // 有序列表
          ol: ({ node, ...props }) => (
            <ol
              style={{
                listStyleType: 'decimal',
                paddingLeft: '1.5rem',
                marginTop: '0.75rem',
                marginBottom: '0.75rem',
              }}
              {...props}
            />
          ),
          // 列表項目：每個項目之間有明顯間距
          li: ({ node, ...props }) => (
            <li
              style={{
                marginBottom: '0.5rem',
                lineHeight: '1.85',
                paddingLeft: '0.25rem',
              }}
              {...props}
            />
          ),
          // 粗體
          strong: ({ node, ...props }) => (
            <strong style={{ fontWeight: 600 }} {...props} />
          ),
          // 分隔線
          hr: ({ node, ...props }) => (
            <hr style={{ margin: '1.25rem 0', borderColor: 'var(--border)' }} {...props} />
          ),
          // 引用區塊
          blockquote: ({ node, ...props }) => (
            <blockquote
              style={{
                margin: '1rem 0',
                paddingLeft: '1rem',
                borderLeft: '4px solid var(--primary)',
                opacity: 0.75,
                fontStyle: 'italic',
              }}
              {...props}
            />
          ),
          // 連結
          a: ({ node, ...props }) => (
            <SafeLink href={props.href as string} className="break-all">
              {props.children}
            </SafeLink>
          ),
          // 圖片
          img: ({ node, ...props }) => (
            <img
              {...props}
              className="max-w-full h-auto rounded-lg border border-border"
              style={{ margin: '1rem 0' }}
              loading="lazy"
            />
          ),
          // 程式碼
          code: ({ node, inline, className, children, ...props }: any) => {
            if (inline) {
              return (
                <code className={inlineCodeClass} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <div className={codeBlockClass}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  <code className={`${className || ''} break-words`} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
          // 覆寫 pre 元素，避免 ReactMarkdown 在 p 內生成 pre
          pre: ({ node, children, ...props }: any) => (
            <div className={codeBlockClass}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} {...props}>
                {children}
              </pre>
            </div>
          ),
          // 表格
          table: ({ node, ...props }) => (
            <div style={{ margin: '1rem 0', overflowX: 'auto', maxWidth: '100%' }}>
              <table className={tableClass} {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className={tableHeaderClass} {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className={tableCellClass} {...props} />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
