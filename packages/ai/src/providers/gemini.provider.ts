import type { AiGenerateInput, AiProvider } from "../provider";

/**
 * Minimal Gemini provider using the public generateContent REST endpoint.
 * The API key is supplied from server-side config only and never hardcoded.
 */
export class GeminiAiProvider implements AiProvider {
  readonly name = "gemini" as const;
  readonly model: string;
  private readonly apiKey: string;

  constructor(apiKey: string, model = "gemini-3.5-flash") {
    if (!apiKey) {
      throw new Error("GeminiAiProvider requires GEMINI_API_KEY");
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateText(input: AiGenerateInput): Promise<string> {
    const model = input.model || this.model;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const body = {
      systemInstruction: input.system
        ? { parts: [{ text: input.system }] }
        : undefined,
      contents: [{ role: "user", parts: [{ text: input.prompt }] }],
      generationConfig: {
        temperature: input.temperature ?? 0.4
      }
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Gemini request failed: ${res.status} ${text.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    return parts.map((p) => p.text ?? "").join("").trim();
  }
}
