import { loadAiConfig, type AiClientConfig, type AiProvider } from "./provider";
import { MockAiProvider } from "./providers/mock.provider";
import { GeminiAiProvider } from "./providers/gemini.provider";
import { OpenAiCompatibleProvider } from "./providers/openai-compatible.provider";

/**
 * Factory that builds the configured provider. Falls back to the mock
 * provider whenever a real provider is selected without its API key, so
 * the system always stays runnable.
 */
export function createAiProvider(config: AiClientConfig = loadAiConfig()): AiProvider {
  switch (config.provider) {
    case "gemini":
      if (!config.geminiApiKey) {
        console.warn("[ai] AI_PROVIDER=gemini but GEMINI_API_KEY missing, using mock provider");
        return new MockAiProvider(config.model);
      }
      return new GeminiAiProvider(config.geminiApiKey, config.model);

    case "openai-compatible":
      if (!config.openaiApiKey) {
        console.warn("[ai] AI_PROVIDER=openai-compatible but OPENAI_API_KEY missing, using mock provider");
        return new MockAiProvider(config.model);
      }
      return new OpenAiCompatibleProvider(config.openaiApiKey, config.openaiBaseUrl, config.model);

    case "mock":
    default:
      return new MockAiProvider(config.model);
  }
}

export class AiClient {
  readonly provider: AiProvider;

  constructor(config?: AiClientConfig) {
    this.provider = createAiProvider(config);
  }

  get name() {
    return this.provider.name;
  }

  get model() {
    return this.provider.model;
  }

  generateText(input: Parameters<AiProvider["generateText"]>[0]) {
    return this.provider.generateText(input);
  }
}
