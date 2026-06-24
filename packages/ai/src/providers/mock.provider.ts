import type { AiGenerateInput, AiProvider } from "../provider";
import { SPLIT_BOOK_TASK } from "../prompts/split-book.prompt";
import { BUILD_CHAPTERS_TASK } from "../prompts/build-chapters.prompt";
import { SUMMARIZE_CHAPTER_TASK } from "../prompts/summarize-chapter.prompt";
import { BOOK_QA_TASK } from "../prompts/book-qa.prompt";
import { KNOWLEDGE_GENERATION_TASK } from "../prompts/knowledge-generation.prompt";

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

    if (system.includes(KNOWLEDGE_GENERATION_TASK)) {
      return JSON.stringify([
        {
          title: "財務報導的基本目的",
          summary: "財務報導的核心目的在於提供對投資與決策有用的資訊。使用者可據此評估企業的資源、義務與績效變化。這些資訊也有助於預測未來現金流量。",
          keywords: ["財務報導", "決策有用性", "現金流量"],
          pageNumber: 1,
          sourceRef: "mock-source-1",
          confidence: 0.86
        },
        {
          title: "財務報表表達的一致性",
          summary: "財務報表在表達上需要維持分類與揭露的一致性，才能提升可比較性。若分類方式頻繁變動，使用者將難以追蹤企業表現。適當揭露可降低誤讀風險。",
          keywords: ["財務報表", "一致性", "可比較性"],
          pageNumber: 2,
          sourceRef: "mock-source-2",
          confidence: 0.82
        }
      ]);
    }

    return `[mock-ai] ${input.prompt.slice(0, 300)}`;
  }
}
