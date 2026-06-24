export * from "./provider";
export * from "./ai-client";
export { MockAiProvider } from "./providers/mock.provider";
export { GeminiAiProvider } from "./providers/gemini.provider";
export { OpenAiCompatibleProvider } from "./providers/openai-compatible.provider";

export { buildSplitBookPrompt, SPLIT_BOOK_TASK } from "./prompts/split-book.prompt";
export { buildChaptersPrompt, BUILD_CHAPTERS_TASK } from "./prompts/build-chapters.prompt";
export { buildSummarizeChapterPrompt, SUMMARIZE_CHAPTER_TASK } from "./prompts/summarize-chapter.prompt";
export { buildBookQaPrompt, BOOK_QA_TASK } from "./prompts/book-qa.prompt";
export { buildKnowledgeGenerationPrompt, KNOWLEDGE_GENERATION_TASK } from "./prompts/knowledge-generation.prompt";
