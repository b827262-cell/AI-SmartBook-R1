import { readFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";
import type { CreateBookContentInput } from "@ai-smartbook/schema";
import { splitTextIntoParagraphs } from "./content-splitter";

export interface ParsePdfResult {
  contents: CreateBookContentInput[];
  pageCount: number;
}

/**
 * Parse a PDF file into book_contents input rows using pdf-parse v2, which
 * exposes per-page text. Empty paragraphs are never emitted; when no pages
 * are available the whole document is split into paragraphs instead.
 */
export async function parsePdfToContents(
  filePath: string,
  bookId: string,
  fileId: string
): Promise<ParsePdfResult> {
  const buffer = await readFile(filePath);
  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const result = await parser.getText();
    const contents: CreateBookContentInput[] = [];
    let orderIndex = 0;

    if (result.pages.length > 0) {
      for (const page of result.pages) {
        // pdf-parse v2 numbers pages 1..numPages (see TextResult.num), so it is
        // already the 1-based physical PDF page. We never derive the page from
        // chunk order, a printed page label, or a cover/TOC offset: physical
        // PDF page N must always persist as pageNumber N. Enforce the 1-based
        // invariant and fail fast — silently converting a 0-based index would
        // risk duplicate pageNumber values rather than surface the regression.
        if (!Number.isInteger(page.num) || page.num < 1) {
          throw new Error(
            `Invalid PDF page number from parser: ${page.num}. Expected 1-based physical page number.`
          );
        }
        const physicalPageNumber = page.num;
        for (const text of splitTextIntoParagraphs(page.text)) {
          contents.push({
            bookId,
            fileId,
            pageNumber: physicalPageNumber,
            orderIndex: orderIndex++,
            contentText: text
          });
        }
      }
    } else {
      for (const text of splitTextIntoParagraphs(result.text)) {
        contents.push({
          bookId,
          fileId,
          pageNumber: null,
          orderIndex: orderIndex++,
          contentText: text
        });
      }
    }

    return { contents, pageCount: result.total ?? result.pages.length };
  } finally {
    await parser.destroy();
  }
}

export interface ExtractWatermarkResult {
  text: string;
  extractedCode?: string;
  extractedIsbn?: string;
}

/**
 * Extracts text from the last page of a PDF and attempts to identify watermark info
 * (e.g., Code like "51MG122110" and ISBN).
 */
export async function extractLastPdfPageText(filePath: string): Promise<ExtractWatermarkResult> {
  const buffer = await readFile(filePath);
  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const result = await parser.getText();
    if (result.pages.length === 0) {
      return { text: "" };
    }

    const lastPage = result.pages[result.pages.length - 1];
    const text = lastPage.text || "";

    const codeMatch = text.match(/\b[A-Z0-9]{10}\b/);
    const isbnMatch = text.match(/ISBN\s+[\d-]{10,17}/i);

    return {
      text: text.trim(),
      extractedCode: codeMatch ? codeMatch[0] : undefined,
      extractedIsbn: isbnMatch ? isbnMatch[0] : undefined
    };
  } finally {
    await parser.destroy();
  }
}
