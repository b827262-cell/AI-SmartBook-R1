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
        for (const text of splitTextIntoParagraphs(page.text)) {
          contents.push({
            bookId,
            fileId,
            pageNumber: page.num,
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
