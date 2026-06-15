import { readFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";
import type { OutlineNode } from "pdf-parse";
import type { BookChapter, BookContent } from "@ai-smartbook/schema";
import type { BookCoreContext } from "./context";

// ---------------------------------------------------------------------------
// PDF Outline extraction
// ---------------------------------------------------------------------------

export interface PdfOutlineEntry {
  title: string;
  level: number;
  pageNumber: number | null;
}

/**
 * Extract the outline (bookmarks) from a PDF file using pdf-parse v2.
 * Returns a flat list with depth information, or an empty array when the
 * PDF has no embedded outline.
 */
export async function extractPdfOutline(
  filePath: string
): Promise<PdfOutlineEntry[]> {
  const buffer = await readFile(filePath);
  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const info = await parser.getInfo();
    if (!info.outline || info.outline.length === 0) return [];

    const entries: PdfOutlineEntry[] = [];

    function walk(nodes: OutlineNode[], level: number) {
      for (const node of nodes) {
        let pageNumber: number | null = null;
        if (Array.isArray(node.dest) && node.dest.length > 0) {
          const first = node.dest[0];
          if (typeof first === "number") pageNumber = first + 1;
        }
        entries.push({
          title: node.title?.trim() || "",
          level,
          pageNumber
        });
        if (node.items?.length > 0) {
          walk(node.items as OutlineNode[], level + 1);
        }
      }
    }

    walk(info.outline, 0);
    return entries.filter((e) => e.title.length > 0);
  } finally {
    await parser.destroy();
  }
}

/**
 * Parse a page range embedded in an outline title, e.g. "01－1～37第1章" or
 * "000前1～2自序" -> { pageStart: 1, pageEnd: 37 }. Returns nulls when no range
 * is found. Handles half/full-width tildes and dashes.
 *
 * NOTE: the numbers in the title are PRINTED book page labels, not physical PDF
 * pages, so they are only suitable as an optional display field. Do NOT use the
 * result as a canonical chapter pageStart/pageEnd for content/chat/reader
 * navigation — that must come from the physical PDF page (outline destination).
 */
export function parsePageRangeFromTitle(title: string): {
  pageStart: number | null;
  pageEnd: number | null;
} {
  // Prefer a tilde-style range ("1～37") which denotes the real page span; a
  // leading "01－" section code uses a dash, so try tildes before dashes.
  const range =
    title.match(/(\d{1,4})\s*[~～〜]\s*(\d{1,4})/) ||
    title.match(/(\d{1,4})\s*[\-－—]\s*(\d{1,4})/);
  if (range) {
    const a = Number.parseInt(range[1], 10);
    const b = Number.parseInt(range[2], 10);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return { pageStart: a, pageEnd: Math.max(a, b) };
    }
  }
  const single = title.match(/(\d{1,4})/);
  if (single) {
    const a = Number.parseInt(single[1], 10);
    if (Number.isFinite(a)) return { pageStart: a, pageEnd: null };
  }
  return { pageStart: null, pageEnd: null };
}

/**
 * Re-link every parsed content row to the chapter whose page range contains it.
 * Clears existing links first so it is idempotent. Returns the linked count.
 */
export function linkChaptersByPageRange(ctx: BookCoreContext, bookId: string): number {
  ctx.repos.contents.unlinkChaptersByBookId(bookId);
  const chapters = ctx.repos.chapters.findByBookId(bookId);
  const contents = ctx.repos.contents.findByBookId(bookId);
  let linked = 0;
  for (const content of contents) {
    if (content.pageNumber == null) continue;
    const ch = chapters.find(
      (c) =>
        c.pageStart != null &&
        content.pageNumber! >= c.pageStart &&
        (c.pageEnd == null || content.pageNumber! <= c.pageEnd)
    );
    if (ch) {
      ctx.repos.contents.linkChapter(content.id, ch.id);
      linked += 1;
    }
  }
  return linked;
}

// ---------------------------------------------------------------------------
// Build chapters from PDF outline
// ---------------------------------------------------------------------------

/**
 * Build chapters from the PDF's built-in outline / bookmark structure.
 * Only top-level entries (level === 0) become chapters. Returns an empty
 * array when the PDF has no outline so the caller can fall back to the
 * content-based splitter.
 */
export async function buildChaptersFromPdfOutline(
  ctx: BookCoreContext,
  bookId: string
): Promise<BookChapter[]> {
  const files = ctx.repos.files.findByBookId(bookId);
  const pdfFile = files.find((f) => f.fileType === "application/pdf");
  if (!pdfFile) return [];

  const outline = await extractPdfOutline(pdfFile.filePath);
  if (outline.length === 0) return [];

  const topLevel = outline.filter((e) => e.level === 0);
  if (topLevel.length === 0) return [];

  const chapters = ctx.repos.chapters.createMany(
    topLevel.map((entry, idx) => {
      const nextEntry = topLevel[idx + 1];
      // Canonical chapter page ranges must be PHYSICAL PDF pages so they align
      // with content rows (which persist physical pageNumber). The outline's
      // destination page (entry.pageNumber) is physical 1-based. We must NOT
      // substitute a page number parsed out of the title text here, because
      // that text is a printed book page label (e.g. "1～37"), not the physical
      // PDF page, and mixing the two spaces breaks content/chat/reader linking.
      const pageStart = entry.pageNumber ?? null;
      const pageEnd =
        entry.pageNumber != null && nextEntry?.pageNumber != null
          ? nextEntry.pageNumber - 1
          : null;
      return {
        bookId,
        title: entry.title,
        summary: null,
        orderIndex: idx,
        pageStart,
        pageEnd,
        level: entry.level,
        source: "pdf_outline" as const,
        status: "draft" as const
      };
    })
  );

  // Link existing content rows to their chapter by page range.
  const contents = ctx.repos.contents.findByBookId(bookId);
  for (const content of contents) {
    if (content.pageNumber == null) continue;
    const ch = chapters.find(
      (c) =>
        c.pageStart != null &&
        content.pageNumber! >= c.pageStart &&
        (c.pageEnd == null || content.pageNumber! <= c.pageEnd)
    );
    if (ch) ctx.repos.contents.linkChapter(content.id, ch.id);
  }

  return chapters;
}

// ---------------------------------------------------------------------------
// Fallback: build chapters from content rows (original logic)
// ---------------------------------------------------------------------------

/**
 * Deterministically map existing book_contents into book_chapters by
 * grouping paragraphs, then link each content row to its chapter. Unlike
 * splitBook this does not call the AI provider — it builds structure from
 * the parsed pages so the reader always has navigable chapters.
 */
export async function buildChaptersFromContents(
  ctx: BookCoreContext,
  bookId: string,
  groupSize = 5
): Promise<BookChapter[]> {
  const book = ctx.repos.books.findById(bookId);
  if (!book) throw new Error(`Book not found: ${bookId}`);

  const contents = ctx.repos.contents.findByBookId(bookId);
  if (contents.length === 0) return [];

  const groups: BookContent[][] = [];
  for (let i = 0; i < contents.length; i += groupSize) {
    groups.push(contents.slice(i, i + groupSize));
  }

  const chapters = ctx.repos.chapters.createMany(
    groups.map((group, idx) => {
      const pages = group
        .map((c) => c.pageNumber)
        .filter((p): p is number => typeof p === "number");
      return {
        bookId,
        title: `第 ${idx + 1} 章`,
        summary: group[0]?.contentText.slice(0, 80) ?? null,
        orderIndex: idx,
        pageStart: pages.length ? Math.min(...pages) : null,
        pageEnd: pages.length ? Math.max(...pages) : null,
        level: 0,
        source: "fallback" as const,
        status: "draft" as const
      };
    })
  );

  chapters.forEach((chapter, idx) => {
    for (const content of groups[idx]) {
      ctx.repos.contents.linkChapter(content.id, chapter.id);
    }
  });

  return chapters;
}
