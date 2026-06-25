import type { Repositories } from "@ai-smartbook/db";
import type { AiProvider } from "@ai-smartbook/ai";

/** Shared dependencies injected into book-core service functions. */
export interface BookCoreContext {
  repos: Repositories;
  ai: AiProvider;
}

/** Extract the first JSON array/object found in a model response. */
export function extractJson<T>(text: string): T | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.search(/[[{]/);
  if (start === -1) return null;
  const slice = candidate.slice(start);
  try {
    return JSON.parse(slice) as T;
  } catch {
    // Try to trim trailing noise after the last closing bracket.
    const lastArr = slice.lastIndexOf("]");
    const lastObj = slice.lastIndexOf("}");
    const end = Math.max(lastArr, lastObj);
    if (end > 0) {
      try {
        return JSON.parse(slice.slice(0, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
