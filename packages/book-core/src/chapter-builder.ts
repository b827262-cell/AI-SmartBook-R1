import type { BookChapter, BookContent } from "@ai-smartbook/schema";
import type { BookCoreContext } from "./context";

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
