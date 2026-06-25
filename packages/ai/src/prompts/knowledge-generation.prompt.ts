import type { AiGenerateInput } from "../provider";

export const KNOWLEDGE_GENERATION_TASK = "[[task:knowledge_generation]]";

export function buildKnowledgeGenerationPrompt(input: {
  bookTitle: string;
  chapterTitle?: string | null;
  items: Array<{
    id: string;
    pageStart: number;
    pageEnd: number;
    chapterId?: string;
    chapterTitle?: string;
    text: string;
  }>;
}): AiGenerateInput {
  const source = input.items
    .map((item) => {
      const pageLabel =
        item.pageStart === item.pageEnd ? `p.${item.pageStart}` : `p.${item.pageStart}-${item.pageEnd}`;
      const chapterMeta = item.chapterTitle ? ` | chapter=${item.chapterTitle}` : "";
      return `[sourceRef=${item.id} | ${pageLabel}${chapterMeta}]\n${item.text}`;
    })
    .join("\n\n");

  const system = [
    KNOWLEDGE_GENERATION_TASK,
    "You extract textbook knowledge points from structured sentence-index content.",
    "Respond ONLY with a JSON array.",
    'Each item must match: {"title": string, "summary": string, "keywords": string[], "pageNumber"?: number, "chapterId"?: string, "sourceRef": string, "confidence"?: number}.',
    "Use Traditional Chinese for title and summary.",
    "title should be concise; summary should be 2 to 4 sentences.",
    "keywords must contain 3 to 8 concise terms.",
    "sourceRef must be copied from the provided sourceRef markers.",
    "Do not wrap the JSON in markdown fences.",
    "Do not add explanation outside JSON."
  ].join("\n");

  const prompt = [
    `Book title: ${input.bookTitle}`,
    `Chapter title: ${input.chapterTitle ?? "(mixed or unknown)"}`,
    "Structured sentence-index excerpts:",
    source.slice(0, 16000)
  ].join("\n\n");

  return { system, prompt, temperature: 0.2 };
}
