/**
 * Markdown 清理工具
 * 用於過濾和修正 AI 生成的錯誤 Markdown 語法
 */

/**
 * 清理 Markdown 內容中的錯誤符號
 * @param content 原始 Markdown 內容
 * @returns 清理後的 Markdown 內容
 */
export function cleanMarkdown(content: string): string {
  if (!content) return content;

  let cleaned = content;

  // 1. 移除單獨一行的標題符號（沒有內容的標題）
  // 例如：##### *** 或 ### 或 ####
  cleaned = cleaned.replace(/^#{1,6}\s*[\*\-_]*\s*$/gm, '');

  // 2. 移除單獨一行的分隔線符號（格式錯誤的分隔線）
  // 正確的分隔線應該是 --- 或 *** 或 ___ （至少3個）
  // 移除後面跟著其他符號的分隔線，例如：--- ### 或 *** ####
  cleaned = cleaned.replace(/^[\-\*_]{1,}\s+#{1,6}.*$/gm, '');
  cleaned = cleaned.replace(/^[\-\*_]{1,2}\s*$/gm, '');

  // 3. 移除標題符號後面直接接星號的情況
  // 例如：##### *** 改為空行
  cleaned = cleaned.replace(/^(#{1,6})\s*[\*]{3,}\s*$/gm, '');

  // 4. 移除多餘的連續空行（保留最多2個連續空行）
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');

  // 5. 移除行首的多餘星號（不是列表項的星號）
  // 保留列表項（* 後面有空格和內容）
  cleaned = cleaned.replace(/^\*{3,}\s*$/gm, '');

  // 6. 移除單獨的 ### 或 #### 等標題符號（沒有內容）
  cleaned = cleaned.replace(/^#{1,6}\s*$/gm, '');

  // 7. 移除標題行尾部的多餘標題符號
  // 例如：#### 內容 #### 改為 #### 內容
  cleaned = cleaned.replace(/^(#{1,6}\s+.+?)\s+#{1,6}\s*$/gm, '$1');

  // 8. 清理開頭和結尾的空白
  cleaned = cleaned.trim();

  return cleaned;
}
