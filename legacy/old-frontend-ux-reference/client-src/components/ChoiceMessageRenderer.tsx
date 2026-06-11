import { MarkdownWithMath } from "@/components/MarkdownWithMath";

interface ChoiceMessageRendererProps {
  content: string;
  /** 是否為使用者訊息（藍色背景） */
  isUserMessage?: boolean;
  /** 是否已作答（作答後鎖住選項） */
  hasAnswered?: boolean;
  /** 已選的選項（用於高亮） */
  selectedOption?: string | null;
  /** 點擊選項時的回呼 */
  onSelectOption?: (option: string, fullText: string) => void;
}

/**
 * 偵測訊息是否包含 ABCD 選擇題格式（且非解析回覆）
 * 支援格式：(A)、（A）、【A】、A.、A)
 */
function hasChoiceOptions(content: string): boolean {
  // 支援多種格式：(A)、（A）、【A】
  const hasABCD =
    /[\(（【]A[\)）】]|^A[.、)）]\s/m.test(content) &&
    /[\(（【]B[\)）】]|^B[.、)）]\s/m.test(content) &&
    /[\(（【]C[\)）】]|^C[.、)）]\s/m.test(content) &&
    /[\(（【]D[\)）】]|^D[.、)）]\s/m.test(content);
  if (!hasABCD) return false;
  // 排除解析回覆
  const isAnalysis = /正確答案是|答對了|✅|答錯了|❌|關鍵說明：|這個選項是|這項選擇|選項分析|選項說明|選項解析|分析各選項/.test(content);
  return !isAnalysis;
}

/**
 * 解析訊息，把選項拆分出來
 * 支援：
 * 1. 每個選項各佔一行：(A) xxx\n(B) xxx
 * 2. 同一行多個選項：(A) xxx (B) xxx (C) xxx (D) xxx
 * 3. 【A】格式：【A】xxx【B】xxx
 */
function parseChoiceContent(content: string) {
  // 先嘗試逐行解析（最常見格式）
  const lines = content.split('\n');
  // 支援 (A)、（A）、【A】 開頭的行
  const optionRegex = /^[\s]*(?:[\(（【]([ABCD])[\)）】]|([ABCD])[.、)）])\s*(.*)/;

  let firstOptionIdx = -1;
  let lastOptionIdx = -1;
  const optionLines: { key: string; text: string; lineIdx: number }[] = [];

  lines.forEach((line, idx) => {
    const match = line.match(optionRegex);
    if (match) {
      const key = match[1] || match[2];
      if (firstOptionIdx === -1) firstOptionIdx = idx;
      lastOptionIdx = idx;
      optionLines.push({ key, text: match[3].trim(), lineIdx: idx });
    }
  });

  // 逐行解析成功（至少找到 2 個選項）
  if (optionLines.length >= 2) {
    const beforeLines = lines.slice(0, firstOptionIdx);
    const afterLines = lines.slice(lastOptionIdx + 1);
    return {
      beforeOptions: beforeLines.join('\n').trim(),
      options: optionLines,
      afterOptions: afterLines.join('\n').trim(),
    };
  }

  // 嘗試同行解析：(A) xxx (B) xxx (C) xxx (D) xxx
  // 或 【A】xxx【B】xxx
  const inlineRegex = /[\(（【]([ABCD])[\)）】]\s*((?:(?![\(（【][ABCD][\)）】]).)+)/g;
  const inlineOptions: { key: string; text: string }[] = [];
  let match;
  while ((match = inlineRegex.exec(content)) !== null) {
    inlineOptions.push({ key: match[1], text: match[2].trim() });
  }

  if (inlineOptions.length >= 2) {
    // 找到第一個選項前的文字
    const firstOptionPos = content.search(/[\(（【][ABCD][\)）】]/);
    const beforeOptions = firstOptionPos > 0 ? content.slice(0, firstOptionPos).trim() : '';
    // 找到最後一個選項後的文字
    const lastOptionKey = inlineOptions[inlineOptions.length - 1].key;
    const lastOptionPattern = new RegExp(`[\\(（【]${lastOptionKey}[\\)）】][^\\(（【]*`);
    const lastMatch = content.match(lastOptionPattern);
    const afterOptions = lastMatch
      ? content.slice(content.lastIndexOf(lastMatch[0]) + lastMatch[0].length).trim()
      : '';

    return {
      beforeOptions,
      options: inlineOptions,
      afterOptions,
    };
  }

  return null;
}

export function ChoiceMessageRenderer({
  content,
  isUserMessage = false,
  hasAnswered = false,
  selectedOption = null,
  onSelectOption,
}: ChoiceMessageRendererProps) {
  // 不是選擇題，直接渲染 Markdown
  if (!hasChoiceOptions(content)) {
    return <MarkdownWithMath isUserMessage={isUserMessage}>{content}</MarkdownWithMath>;
  }

  const parsed = parseChoiceContent(content);
  if (!parsed) {
    return <MarkdownWithMath isUserMessage={isUserMessage}>{content}</MarkdownWithMath>;
  }

  const { beforeOptions, options, afterOptions } = parsed;

  return (
    <div>
      {/* 題目文字（選項前） */}
      {beforeOptions && (
        <MarkdownWithMath isUserMessage={isUserMessage}>{beforeOptions}</MarkdownWithMath>
      )}

      {/* 選項按鈕區 */}
      <div className="flex flex-col gap-2 my-3">
        {options.map(({ key, text }) => {
          const isSelected = selectedOption === key;
          const isDisabled = hasAnswered;

          return (
            <button
              key={key}
              disabled={isDisabled}
              onClick={() => {
                if (!isDisabled && onSelectOption) {
                  onSelectOption(key, `(${key}) ${text}`);
                }
              }}
              className={`
                flex items-start gap-3 w-full text-left px-4 py-3 rounded-xl border-2 transition-all
                ${isDisabled
                  ? isSelected
                    ? 'bg-primary/20 border-primary text-foreground cursor-default'
                    : 'bg-muted/50 border-border text-muted-foreground cursor-default opacity-60'
                  : 'bg-background border-border hover:border-primary hover:bg-primary/5 active:scale-[0.99] cursor-pointer'
                }
              `}
              style={{ fontSize: '14px', lineHeight: '1.6' }}
            >
              {/* 選項標籤圓圈 */}
              <span
                className={`
                  flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm border-2
                  ${isSelected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : isDisabled
                      ? 'bg-muted border-border text-muted-foreground'
                      : 'bg-background border-border text-foreground'
                  }
                `}
              >
                {key}
              </span>
              {/* 選項文字 */}
              <span className="flex-1 pt-0.5 text-foreground">{text}</span>
            </button>
          );
        })}
      </div>

      {/* 選項後的文字（如 AI 額外說明） */}
      {afterOptions && (
        <MarkdownWithMath isUserMessage={isUserMessage}>{afterOptions}</MarkdownWithMath>
      )}
    </div>
  );
}
