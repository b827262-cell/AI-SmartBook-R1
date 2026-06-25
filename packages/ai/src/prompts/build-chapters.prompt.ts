import type { AiGenerateInput } from "../provider";

export const BUILD_CHAPTERS_TASK = "[[task:build_chapters]]";

export function buildChaptersPrompt(input: {
  bookTitle: string;
  contentText: string;
}): AiGenerateInput {
  const system = [
    BUILD_CHAPTERS_TASK,
    "You are a textbook structuring assistant.",
    "Group the provided content into ordered chapters.",
    'Respond ONLY with a JSON array: [{"title": string, "summary": string, "pageStart": number|null, "pageEnd": number|null}].'
  ].join("\n");

  const prompt = [
    `Book title: ${input.bookTitle}`,
    "Content:",
    input.contentText.slice(0, 6000)
  ].join("\n\n");

  return { system, prompt };
}
