import type { AiGenerateInput } from "../provider";

export const SUMMARIZE_CHAPTER_TASK = "[[task:summarize_chapter]]";

export function buildSummarizeChapterPrompt(input: {
  chapterTitle: string;
  contentText: string;
}): AiGenerateInput {
  const system = [
    SUMMARIZE_CHAPTER_TASK,
    "You are a study assistant.",
    "Summarise the chapter clearly in 2-4 sentences using the source language.",
    "Respond with plain text only, no markdown headings."
  ].join("\n");

  const prompt = [
    `Chapter: ${input.chapterTitle}`,
    "Content:",
    input.contentText.slice(0, 6000)
  ].join("\n\n");

  return { system, prompt };
}
