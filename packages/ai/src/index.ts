export type AiProviderName = "mock" | "gemini" | "openai-compatible";

export interface AiProvider {
  name: AiProviderName;
  generateText(input: { system?: string; prompt: string }): Promise<string>;
}

export class MockAiProvider implements AiProvider {
  name: AiProviderName = "mock";

  async generateText(input: { system?: string; prompt: string }): Promise<string> {
    return `[mock-ai] ${input.prompt.slice(0, 300)}`;
  }
}

export function createAiProvider(): AiProvider {
  return new MockAiProvider();
}
