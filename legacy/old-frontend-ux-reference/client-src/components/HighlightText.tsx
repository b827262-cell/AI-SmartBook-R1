import React from "react";

interface HighlightTextProps {
  text: string;
  highlight: string;
}

/**
 * 關鍵字高亮顯示元件
 * 將文字中的關鍵字以黃色背景高亮顯示
 */
export function HighlightText({ text, highlight }: HighlightTextProps) {
  // 如果沒有關鍵字或關鍵字為空,直接返回原文
  if (!highlight || !highlight.trim()) {
    return <>{text}</>;
  }

  // 使用正則表達式分割文字,保留關鍵字
  // 使用 'gi' flag 進行全局不區分大小寫的匹配
  const parts = text.split(new RegExp(`(${escapeRegExp(highlight)})`, "gi"));

  return (
    <>
      {parts.map((part, index) => {
        // 如果這個部分匹配關鍵字(不區分大小寫),則高亮顯示
        if (part.toLowerCase() === highlight.toLowerCase()) {
          return (
            <mark
              key={index}
              className="bg-yellow-200 dark:bg-yellow-600 font-semibold px-0.5 rounded"
            >
              {part}
            </mark>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}

/**
 * 轉義正則表達式特殊字符
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
