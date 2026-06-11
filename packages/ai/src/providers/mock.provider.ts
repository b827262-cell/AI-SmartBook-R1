import type { AiGenerateInput, AiProvider } from "../provider";
import { SPLIT_BOOK_TASK } from "../prompts/split-book.prompt";
import { BUILD_CHAPTERS_TASK } from "../prompts/build-chapters.prompt";
import { SUMMARIZE_CHAPTER_TASK } from "../prompts/summarize-chapter.prompt";
import { BOOK_QA_TASK } from "../prompts/book-qa.prompt";

/**
 * Deterministic provider used by default. It recognises the task markers
 * embedded in the system prompt so the full admin AI flow runs end to end
 * without any real API key.
 */
export class MockAiProvider implements AiProvider {
  readonly name = "mock" as const;
  readonly model: string;

  constructor(model = "mock-model") {
    this.model = model;
  }

  async generateText(input: AiGenerateInput): Promise<string> {
    const system = input.system ?? "";

    if (system.includes(SPLIT_BOOK_TASK) || system.includes(BUILD_CHAPTERS_TASK)) {
      return JSON.stringify([
        { title: "第一章 導論", summary: "本章介紹本書主題與學習目標。", pageStart: 1, pageEnd: 1 },
        { title: "第二章 核心概念", summary: "本章說明核心概念與重要定義。", pageStart: 2, pageEnd: 2 },
        { title: "第三章 應用與總結", summary: "本章整合前述內容並提供應用範例。", pageStart: 3, pageEnd: 3 }
      ]);
    }

    if (system.includes(SUMMARIZE_CHAPTER_TASK)) {
      const firstLine = input.prompt.split("\n").find((l) => l.startsWith("Chapter:")) ?? "本章";
      return `（mock 摘要）${firstLine.replace("Chapter:", "").trim()}：本章重點已整理，涵蓋主要概念與應用。`;
    }

    if (system.includes(BOOK_QA_TASK)) {
      const q = input.prompt.split("\n").find((l) => l.startsWith("Question:")) ?? "";
      const hasContext = !input.prompt.includes("(no relevant passages found)");
      if (!hasContext) {
        return "目前書本內容中找不到明確答案，建議換個關鍵字再問一次。";
      }
      return `（mock 回答）根據書本內容，${q.replace("Question:", "").trim()} 的重點如下：請參考上方引用段落的說明。`;
    }

    return `[mock-ai] ${input.prompt.slice(0, 300)}`;
  }
}
