import type { AiGenerateInput, AiProvider } from "../provider";

/**
 * Minimal Gemini provider using the public generateContent REST endpoint.
 * The API key is supplied from server-side config only and never hardcoded.
 */
export class GeminiAiProvider implements AiProvider {
  readonly name = "gemini" as const;
  readonly model: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(apiKey: string, model = "gemini-3.5-flash") {
    if (!apiKey) {
      throw new Error("GeminiAiProvider requires GEMINI_API_KEY");
    }
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = 20_000;
    this.maxRetries = 1;
  }

  async generateText(input: AiGenerateInput): Promise<string> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const model = input.model || this.model;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

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
          body: JSON.stringify(body),
          signal: controller.signal
        }).finally(() => clearTimeout(timer));

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          const retriable = res.status === 429 || res.status >= 500;
          const err = new Error(this.mapHttpError(res.status, text));
          if (retriable && attempt < this.maxRetries) {
            lastError = err;
            continue;
          }
          throw err;
        }

        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const parts = data.candidates?.[0]?.content?.parts ?? [];
        return parts.map((p) => p.text ?? "").join("").trim();
      } catch (error) {
        const err = this.mapRuntimeError(error);
        if (attempt < this.maxRetries && this.isRetriableError(err)) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }
    throw lastError ?? new Error("Google AI request failed.");
  }

  private mapHttpError(status: number, text: string): string {
    const hint =
      status === 400
        ? "invalid request"
        : status === 401 || status === 403
          ? "invalid or unauthorized API key"
          : status === 404
            ? "model not found"
            : status === 429
              ? "rate limited"
              : status >= 500
                ? "upstream service error"
                : "unexpected provider error";
    return `Google AI request failed (${status}: ${hint})${text ? `: ${text.slice(0, 180)}` : ""}`;
  }

  private mapRuntimeError(error: unknown): Error {
    if (error instanceof Error && error.name === "AbortError") {
      return new Error(`Google AI request timed out after ${this.timeoutMs}ms`);
    }
    return error instanceof Error ? error : new Error(String(error));
  }

  private isRetriableError(error: Error): boolean {
    return /timed out|rate limited|upstream service error/i.test(error.message);
  }
}
