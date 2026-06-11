/**
 * Markdown 渲染組件（支援 LaTeX）
 * 
 * 功能：
 * - 渲染 Markdown 內容
 * - 支援 LaTeX 數學公式（行內公式 $...$ 和區塊公式 $$...$$）
 * - 支援程式碼高亮
 * - 支援表格、列表等 Markdown 語法
 */

import React, { useEffect, useRef } from 'react';
import rehypeRaw from 'rehype-raw';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

export function MarkdownRenderer({ children, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`} style={{ lineHeight: '1.85', fontSize: '15px' }}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={{
          // 自定義程式碼區塊樣式
          code({ node, inline, className, children, ...props }: any) {
            return inline ? (
              <code className="inline-code bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            ) : (
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto" style={{ margin: '1rem 0' }}>
                <code className={`${className} font-mono text-sm`} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          // 自定義表格樣式
          table({ children }: any) {
            return (
              <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
                <table className="min-w-full border border-border">{children}</table>
              </div>
            );
          },
          thead({ children }: any) {
            return <thead className="bg-muted">{children}</thead>;
          },
          th({ children }: any) {
            return (
              <th className="border border-border px-4 py-3 text-left font-semibold">
                {children}
              </th>
            );
          },
          td({ children }: any) {
            return <td className="border border-border px-4 py-3">{children}</td>;
          },
          // 自定義連結樣式
          a({ href, children }: any) {
            return (
              <a
                href={href}
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          },
          // 自定義標題樣式
          h1({ children }: any) {
            return <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '1.5rem', marginBottom: '0.75rem', lineHeight: 1.4 }}>{children}</h1>;
          },
          h2({ children }: any) {
            return <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '1.25rem', marginBottom: '0.65rem', lineHeight: 1.4 }}>{children}</h2>;
          },
          h3({ children }: any) {
            return <h3 style={{ fontSize: '1rem', fontWeight: 700, marginTop: '1.1rem', marginBottom: '0.55rem', lineHeight: 1.4 }}>{children}</h3>;
          },
          // 自定義列表樣式
          ul({ children }: any) {
            return (
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                {children}
              </ul>
            );
          },
          ol({ children }: any) {
            return (
              <ol style={{ listStyleType: 'decimal', paddingLeft: '1.5rem', marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                {children}
              </ol>
            );
          },
          li({ children, ...props }: any) {
            return (
              <li style={{ marginBottom: '0.35rem', lineHeight: '1.85', paddingLeft: '0.25rem' }}>
                {children}
              </li>
            );
          },
          // 自定義引用樣式
          blockquote({ children }: any) {
            return (
              <blockquote style={{ margin: '1rem 0', paddingLeft: '1rem', borderLeft: '4px solid var(--primary)', opacity: 0.75, fontStyle: 'italic' }}>
                {children}
              </blockquote>
            );
          },
          // 自定義段落樣式（修復 <p> 內不能包含 <pre> 的問題）
          p({ children }: any) {
            return (
              <div className="md-p" style={{ marginBottom: '0.75rem', lineHeight: '1.85', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                {children}
              </div>
            );
          },
          // 分隔線
          hr() {
            return <hr style={{ margin: '1.25rem 0', borderColor: 'var(--border)' }} />;
          },
          // strong
          strong({ children }: any) {
            return <strong style={{ fontWeight: 600 }}>{children}</strong>;
          },
          // details/summary 折疊區塊
          details({ children }: any) {
            return (
              <details style={{ margin: '0.75rem 0', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '6px', backgroundColor: 'var(--muted)' }}>
                {children}
              </details>
            );
          },
          summary({ children }: any) {
            return (
              <summary style={{ cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem', color: 'var(--muted-foreground)', userSelect: 'none', padding: '0.25rem 0' }}>
                {children}
              </summary>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

/**
 * 流式 Markdown 渲染組件（支援 LaTeX）
 * 用於流式回應的場景
 */
export function StreamingMarkdownRenderer({ children, className = '' }: MarkdownRendererProps) {
  const contentRef = useRef<string>('');
  
  useEffect(() => {
    contentRef.current = children;
  }, [children]);

  return <MarkdownRenderer className={className}>{children}</MarkdownRenderer>;
}
