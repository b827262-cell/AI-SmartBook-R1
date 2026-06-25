import type { AiGenerateInput } from "../provider";

export const BOOK_QA_TASK = "[[task:book_qa]]";

export function buildBookQaPrompt(input: {
  bookTitle: string;
  question: string;
  contextChunks: string[];
}): AiGenerateInput {
  const context = input.contextChunks.length
    ? input.contextChunks.map((c, i) => `[${i + 1}] ${c}`).join("\n\n")
    : "(no relevant passages found)";

  const system = [
    BOOK_QA_TASK,
    "You are a helpful tutor answering questions strictly about the given book.",
    "Use only the provided context. If the answer is not in the context, say so honestly.",
    "Answer in the same language as the question."
  ].join("\n");

  const prompt = [
    `Book: ${input.bookTitle}`,
    "Context passages:",
    context,
    `Question: ${input.question}`
  ].join("\n\n");

  return { system, prompt };
}
