/**
 * Split raw text into clean, non-empty paragraphs suitable for storage
 * as book_contents rows. Collapses excessive whitespace and drops blanks.
 */
export function splitTextIntoParagraphs(text: string, maxLen = 1200): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/ /g, " ");

  const rawBlocks = normalized
    .split(/\n\s*\n+/)
    .map((b) => b.replace(/[ \t]+/g, " ").trim())
    .filter((b) => b.length > 0);

  const chunks: string[] = [];
  for (const block of rawBlocks) {
    if (block.length <= maxLen) {
      chunks.push(block);
      continue;
    }
    // Further split long blocks on sentence boundaries.
    const sentences = block.split(/(?<=[。！？.!?])\s+/);
    let current = "";
    for (const s of sentences) {
      if ((current + s).length > maxLen && current) {
        chunks.push(current.trim());
        current = "";
      }
      current += s + " ";
    }
    if (current.trim()) chunks.push(current.trim());
  }

  return chunks.filter((c) => c.length > 0);
}
