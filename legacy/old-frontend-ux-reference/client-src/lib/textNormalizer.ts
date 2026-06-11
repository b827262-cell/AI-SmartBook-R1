/**
 * 文字正規化工具
 * 用於處理從 PDF 複製貼上時產生的亂碼選項標記
 */

/**
 * 亂碼符號對應表
 * 將常見的 PDF 亂碼符號對應到標準選項標記 (A), (B), (C), (D)
 */
const OPTION_SYMBOL_MAP: Record<string, string> = {
  // 圓圈包圍的大寫字母（最常見的 PDF 亂碼）
  'Ⓐ': '(A)',
  'Ⓑ': '(B)',
  'Ⓒ': '(C)',
  'Ⓓ': '(D)',
  'Ⓔ': '(E)',
  'Ⓕ': '(F)',
  'Ⓖ': '(G)',
  'Ⓗ': '(H)',
  'Ⓘ': '(I)',
  'Ⓙ': '(J)',
  
  // 圓圈包圍的小寫字母
  'ⓐ': '(A)',
  'ⓑ': '(B)',
  'ⓒ': '(C)',
  'ⓓ': '(D)',
  'ⓔ': '(E)',
  'ⓕ': '(F)',
  'ⓖ': '(G)',
  'ⓗ': '(H)',
  'ⓘ': '(I)',
  'ⓙ': '(J)',
  
  // 圓圈類符號（通用）
  '⚪': '(A)',
  '⚫': '(B)',
  '◯': '(C)',
  '●': '(D)',
  '○': '(A)',
  '◉': '(B)',
  '⊙': '(C)',
  '◎': '(D)',
  
  // 方框類符號
  '☐': '(A)',
  '☑': '(B)',
  '☒': '(C)',
  '■': '(D)',
  '□': '(A)',
  
  // 數字圓圈（用於多選題或序號）
  '①': '(A)',
  '②': '(B)',
  '③': '(C)',
  '④': '(D)',
  '⑤': '(E)',
  '⑥': '(F)',
  '⑦': '(G)',
  '⑧': '(H)',
  '⑨': '(I)',
  '⑩': '(J)',
};

/**
 * 檢測文字中是否包含亂碼符號
 */
export function hasGarbledSymbols(text: string): boolean {
  const symbols = Object.keys(OPTION_SYMBOL_MAP);
  return symbols.some(symbol => text.includes(symbol));
}

/**
 * 正規化文字，將亂碼選項標記轉換為標準格式
 * 
 * @param text 原始文字
 * @returns 正規化後的文字
 */
export function normalizeText(text: string): string {
  let normalized = text;
  
  // 替換所有亂碼符號
  for (const [symbol, replacement] of Object.entries(OPTION_SYMBOL_MAP)) {
    // 使用全局替換，處理文字中所有出現的亂碼符號
    normalized = normalized.split(symbol).join(replacement);
  }
  
  return normalized;
}

/**
 * 獲取正規化統計資訊
 * 
 * @param text 原始文字
 * @returns 統計資訊，包含轉換的符號數量和類型
 */
export function getNormalizationStats(text: string): {
  hasGarbled: boolean;
  symbolsFound: string[];
  replacementCount: number;
} {
  const symbolsFound: string[] = [];
  let replacementCount = 0;
  
  for (const symbol of Object.keys(OPTION_SYMBOL_MAP)) {
    const count = (text.match(new RegExp(symbol, 'g')) || []).length;
    if (count > 0) {
      symbolsFound.push(symbol);
      replacementCount += count;
    }
  }
  
  return {
    hasGarbled: symbolsFound.length > 0,
    symbolsFound,
    replacementCount,
  };
}
