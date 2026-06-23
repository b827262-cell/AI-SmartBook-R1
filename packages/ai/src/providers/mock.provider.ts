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

    if (system.includes("one-click-solve") || input.prompt.includes("one-click-solve")) {
      return JSON.stringify([
        {
          questionType: "single_choice",
          question: "什麼是本文提到的核心概念？",
          options: [
            { label: "A", text: "抗重力設計" },
            { label: "B", text: "古典力學" },
            { label: "C", text: "量子纏結" },
            { label: "D", text: "相對論" }
          ],
          answer: "A",
          explanation: "根據教材內容，核心概念是抗重力設計。",
          sourcePage: 1,
          sourceText: "本教材主要探討抗重力設計的實務應用..."
        },
        {
          questionType: "single_choice",
          question: "關於第二章的描述，下列何者正確？",
          options: [
            { label: "A", text: "內容完全無用" },
            { label: "B", text: "介紹了核心概念與重要定義" },
            { label: "C", text: "只討論了歷史背景" },
            { label: "D", text: "是由機器人撰寫的" }
          ],
          answer: "B",
          explanation: "第二章導言明確指出本章說明核心概念與重要定義。",
          sourcePage: 2,
          sourceText: "第二章核心概念：本章說明核心概念與重要定義。"
        }
      ]);
    }

    return `[mock-ai] ${input.prompt.slice(0, 300)}`;

  }
}
