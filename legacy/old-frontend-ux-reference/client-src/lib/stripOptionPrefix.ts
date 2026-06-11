/**
 * 去除選項文字開頭的 "A. " / "A) " / "(A) " 等前綴
 * 因為資料庫儲存時可能已含前綴，顯示時再加前綴會重複
 */
export function stripOptionPrefix(text: string): string {
  // 匹配 "A. " / "A) " / "(A) " / "A、" 等格式
  return text.replace(/^[A-Da-d][.)、]\s*|\([A-Da-d]\)\s*/i, '');
}
