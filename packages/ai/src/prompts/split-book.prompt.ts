import type { AiGenerateInput } from "../provider";

/** Marker used by the mock provider to recognise the task. */
export const SPLIT_BOOK_TASK = "[[task:split_book]]";

export function buildSplitBookPrompt(input: {
  bookTitle: string;
  contentText: string;
}): AiGenerateInput {
  const system = [
    SPLIT_BOOK_TASK,
    "You are a textbook structuring assistant.",
    "Given raw book text, propose a clean chapter outline.",
    'Respond ONLY with a JSON array of objects: [{"title": string, "summary": string}].',
    "Use the same language as the source text. Do not add commentary."
  ].join("\n");

  const prompt = [
    `Book title: ${input.bookTitle}`,
    "Raw content (may be truncated):",
    input.contentText.slice(0, 6000)
  ].join("\n\n");

  return { system, prompt };
}
