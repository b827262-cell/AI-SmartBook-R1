import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Repositories } from "@ai-smartbook/db";
import { createAiProvider, buildKnowledgeGenerationPrompt } from "@ai-smartbook/ai";
import { extractJson } from "@ai-smartbook/book-core";
import {
  generatedKnowledgePointSchema,
  knowledgeGenerationStatusSchema,
  knowledgeGenerationSummarySchema,
  type Book,
  type BookChapter,
  type BookFile,
  type GeneratedKnowledgePoint,
  type KnowledgeGenerationError,
  type KnowledgeGenerationStatus,
  type KnowledgeGenerationSummary,
  type KnowledgeStats,
  type PdfJsonIndex,
  pdfJsonIndexSchema
} from "@ai-smartbook/schema";
import { getAiSettings, getRawGoogleApiKey } from "./ai-settings-store.js";

const JSON_INDEX_ROLE = "json_index" as const;
const KNOWLEDGE_STATUS_PREFIX = "knowledge_generation_status:";
const KNOWLEDGE_NOTE_SOURCE_PREFIX = "knowledge-point:";
const MAX_CHUNK_CHARS = 12_000;
const MAX_CHUNK_ITEMS = 36;
const MAX_ERROR_DETAILS = 20;
const MAX_RATE_LIMIT_ERRORS = 3;

type IndexChunk = {
  chapterId: string | null;
  chapterTitle: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  items: Array<{
    id: string;
    text: string;
    pageStart: number;
    pageEnd: number;
    chapterId?: string;
    chapterTitle?: string;
  }>;
};

function statusKey(bookId: string): string {
  return `${KNOWLEDGE_STATUS_PREFIX}${bookId}`;
}

function sourceMessageIdForKey(stableKey: string): string {
  return `${KNOWLEDGE_NOTE_SOURCE_PREFIX}${stableKey}`;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeTitle(value: string): string {
  return normalizeWhitespace(value).replace(/[：:]+$/g, "");
}

function normalizeKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of keywords) {
    const cleaned = normalizeWhitespace(raw).slice(0, 40);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out.slice(0, 8);
}

function buildStableKey(parts: Array<string | number | null | undefined>): string {
  const raw = parts.map((part) => String(part ?? "")).join("|");
  return createHash("sha1").update(raw).digest("hex").slice(0, 20);
}

function formatKnowledgeContent(summary: string, keywords: string[]): string {
  return `${summary}\n\n關鍵字：${keywords.join("、")}`;
}

function readStoredJsonIndex(file: BookFile): PdfJsonIndex | null {
  try {
    const parsed = pdfJsonIndexSchema.safeParse(JSON.parse(readFileSync(file.filePath, "utf8")));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function getLatestSentenceIndexFile(repos: Repositories, bookId: string): { file: BookFile | null; index: PdfJsonIndex | null } {
  const files = repos.files
    .findByBookId(bookId)
    .filter((file) => file.role === JSON_INDEX_ROLE)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  for (const file of files) {
    const index = readStoredJsonIndex(file);
    if (index?.level === "sentence") {
      return { file, index };
    }
  }
  return { file: null, index: null };
}

function filterIndexItemsForChapter(index: PdfJsonIndex, chapter: BookChapter | null) {
  if (!chapter) return index.items;
  const exact = index.items.filter((item) => item.chapterId === chapter.id);
  if (exact.length > 0) return exact;
  return index.items.filter((item) => {
    if (chapter.pageStart == null) return false;
    if (chapter.pageEnd == null) return item.pageStart >= chapter.pageStart;
    return item.pageStart >= chapter.pageStart && item.pageEnd <= chapter.pageEnd;
  });
}

function buildChunks(items: PdfJsonIndex["items"]): IndexChunk[] {
  const chunks: IndexChunk[] = [];
  let current: IndexChunk | null = null;
  let currentChars = 0;

  for (const item of items) {
    const nextChars = currentChars + item.text.length;
    const chapterId = item.chapterId ?? null;
    const chapterTitle = item.chapterTitle ?? null;
    const shouldFlush =
      current != null &&
      (nextChars > MAX_CHUNK_CHARS ||
        current.items.length >= MAX_CHUNK_ITEMS ||
        current.chapterId !== chapterId);

    if (shouldFlush && current) {
      chunks.push(current);
      current = null;
      currentChars = 0;
    }

    if (!current) {
      current = {
        chapterId,
        chapterTitle,
        pageStart: item.pageStart,
        pageEnd: item.pageEnd,
        items: []
      };
    }

    current.items.push({
      id: item.id,
      text: item.text,
      pageStart: item.pageStart,
      pageEnd: item.pageEnd,
      chapterId: item.chapterId,
      chapterTitle: item.chapterTitle
    });
    current.pageEnd = item.pageEnd;
    currentChars += item.text.length;
  }

  if (current && current.items.length > 0) {
    chunks.push(current);
  }
  return chunks;
}

function normalizeGeneratedPoint(point: GeneratedKnowledgePoint, chunk: IndexChunk): GeneratedKnowledgePoint {
  const title = normalizeTitle(point.title).slice(0, 120);
  const summary = normalizeWhitespace(point.summary).slice(0, 1200);
  const keywords = normalizeKeywords(point.keywords);
  const fallbackSourceRef = chunk.items[0]?.id ?? "unknown-source";
  return {
    title: title || "未命名知識點",
    summary: summary || "無摘要",
    keywords: keywords.length >= 3 ? keywords : [...keywords, "教材重點", "概念整理", "知識點"].slice(0, 3),
    chapterId: point.chapterId || chunk.chapterId || undefined,
    pageNumber: point.pageNumber ?? chunk.pageStart ?? undefined,
    sourceRef: normalizeWhitespace(point.sourceRef || fallbackSourceRef).slice(0, 160),
    confidence: typeof point.confidence === "number" ? Number(point.confidence.toFixed(2)) : undefined
  };
}

async function createGoogleProvider(selectedModel?: string) {
  const settings = await getAiSettings();
  const key = await getRawGoogleApiKey();
  if (!key) {
    return { provider: null, settings, hasKey: false as const };
  }
  const provider = createAiProvider({
    provider: "gemini",
    model: selectedModel || settings.defaultModel,
    geminiApiKey: key
  });
  return { provider, settings, hasKey: true as const };
}

function saveStatus(repos: Repositories, status: KnowledgeGenerationStatus): KnowledgeGenerationStatus {
  repos.settings.set(statusKey(status.bookId), JSON.stringify(status));
  return status;
}

export async function getKnowledgeGenerationStatus(repos: Repositories, bookId: string): Promise<KnowledgeGenerationStatus> {
  const raw = repos.settings.get(statusKey(bookId));
  const hasKey = (await getRawGoogleApiKey()) != null;
  if (!raw) {
    return {
      bookId,
      state: "idle",
      provider: "google",
      hasKey,
      sourceFile: null,
      updatedAt: null,
      lastSummary: null,
      message: null
    };
  }
  try {
    const parsed = knowledgeGenerationStatusSchema.parse(JSON.parse(raw));
    return { ...parsed, hasKey };
  } catch {
    return {
      bookId,
      state: "idle",
      provider: "google",
      hasKey,
      sourceFile: null,
      updatedAt: null,
      lastSummary: null,
      message: "status parse failed"
    };
  }
}

export function getKnowledgeStats(repos: Repositories, bookId: string): KnowledgeStats {
  const notes = repos.notes
    .findByBookId(bookId)
    .filter((note) => note.sourceMessageId?.startsWith(KNOWLEDGE_NOTE_SOURCE_PREFIX) ?? false);
  return {
    bookId,
    total: notes.length,
    withChapter: notes.filter((note) => note.chapterId != null).length,
    withPageNumber: notes.filter((note) => note.pageNumber != null).length,
    latestUpdatedAt: notes.map((note) => note.updatedAt).sort().at(-1) ?? null
  };
}

function buildUnavailableSummary(bookId: string, sourceFile: string | null, message: string): KnowledgeGenerationSummary {
  return {
    bookId,
    sourceFile,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 1,
    errors: [{ message }]
  };
}

async function runGeneration(
  repos: Repositories,
  book: Book,
  chapter: BookChapter | null,
  selectedModel?: string,
  maxChunks?: number
): Promise<KnowledgeGenerationSummary> {
  const { file, index } = getLatestSentenceIndexFile(repos, book.id);
  if (!file || !index) {
    return buildUnavailableSummary(book.id, null, "sentence-index JSON not found");
  }

  const providerState = await createGoogleProvider(selectedModel);
  if (!providerState.hasKey || !providerState.provider) {
    return buildUnavailableSummary(book.id, file.fileName, "Google API Key is not configured on the server");
  }

  const scopedItems = filterIndexItemsForChapter(index, chapter);
  if (scopedItems.length === 0) {
    return buildUnavailableSummary(book.id, file.fileName, chapter ? "chapter has no sentence-index items" : "sentence-index is empty");
  }

  const chunks = buildChunks(scopedItems).slice(0, maxChunks ?? Number.MAX_SAFE_INTEGER);
  const summary: KnowledgeGenerationSummary = {
    bookId: book.id,
    sourceFile: file.fileName,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };
  let rateLimitErrors = 0;

  function pushError(error: KnowledgeGenerationError) {
    if (summary.errors.length < MAX_ERROR_DETAILS) {
      summary.errors.push(error);
    }
  }

  for (const chunk of chunks) {
    try {
      const prompt = buildKnowledgeGenerationPrompt({
        bookTitle: book.title,
        chapterTitle: chunk.chapterTitle,
        items: chunk.items
      });
      const raw = await providerState.provider.generateText(prompt);
      const parsed = extractJson<GeneratedKnowledgePoint[]>(raw) ?? [];
      const validated = parsed
        .map((item) => generatedKnowledgePointSchema.safeParse(item))
        .filter((result): result is { success: true; data: GeneratedKnowledgePoint } => result.success)
        .map((result) => normalizeGeneratedPoint(result.data, chunk));

      if (validated.length === 0) {
        summary.failed += 1;
        pushError({
          sourceRef: chunk.items[0]?.id,
          message: "provider returned no valid knowledge-point JSON items"
        });
        continue;
      }

      for (const point of validated) {
        const stableKey = buildStableKey([
          book.id,
          point.chapterId ?? "",
          point.sourceRef,
          normalizeTitle(point.title).toLowerCase()
        ]);
        const sourceMessageId = sourceMessageIdForKey(stableKey);
        const existing = repos.notes.findByBookIdAndSourceMessageId(book.id, sourceMessageId);
        const content = formatKnowledgeContent(point.summary, point.keywords);

        if (!existing) {
          repos.notes.create(book.id, {
            type: "text",
            title: point.title,
            content,
            chapterId: point.chapterId ?? null,
            pageNumber: point.pageNumber ?? null,
            sourceMessageId
          });
          summary.created += 1;
          continue;
        }

        const changed =
          existing.title !== point.title ||
          existing.content !== content ||
          existing.chapterId !== (point.chapterId ?? null) ||
          existing.pageNumber !== (point.pageNumber ?? null);

        if (!changed) {
          summary.skipped += 1;
          continue;
        }

        repos.notes.update(existing.id, {
          title: point.title,
          content,
          chapterId: point.chapterId ?? null,
          pageNumber: point.pageNumber ?? null
        });
        summary.updated += 1;
      }
    } catch (error) {
      summary.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      pushError({
        sourceRef: chunk.items[0]?.id,
        message
      });
      if (/rate limited|quota/i.test(message)) {
        rateLimitErrors += 1;
        if (rateLimitErrors >= MAX_RATE_LIMIT_ERRORS) {
          pushError({
            sourceRef: chunk.items[0]?.id,
            message: `aborted after ${rateLimitErrors} provider quota/rate-limit errors`
          });
          break;
        }
      }
    }
  }

  return knowledgeGenerationSummarySchema.parse(summary);
}

export async function generateKnowledgePointsForBook(
  repos: Repositories,
  book: Book,
  selectedModel?: string,
  maxChunks?: number
): Promise<KnowledgeGenerationSummary> {
  const initial = await getKnowledgeGenerationStatus(repos, book.id);
  saveStatus(repos, {
    ...initial,
    bookId: book.id,
    provider: "google",
    state: "running",
    hasKey: (await getRawGoogleApiKey()) != null,
    sourceFile: initial.sourceFile ?? null,
    updatedAt: new Date().toISOString(),
    message: "running knowledge generation for book"
  });

  const summary = await runGeneration(repos, book, null, selectedModel, maxChunks);
  saveStatus(repos, {
    bookId: book.id,
    provider: "google",
    state: summary.failed > 0 && summary.created === 0 && summary.updated === 0 ? "failed" : "success",
    hasKey: (await getRawGoogleApiKey()) != null,
    sourceFile: summary.sourceFile ?? null,
    updatedAt: new Date().toISOString(),
    lastSummary: summary,
    message: summary.errors[0]?.message ?? null
  });
  return summary;
}

export async function generateKnowledgePointsForChapter(
  repos: Repositories,
  book: Book,
  chapter: BookChapter,
  selectedModel?: string,
  maxChunks?: number
): Promise<KnowledgeGenerationSummary> {
  const initial = await getKnowledgeGenerationStatus(repos, book.id);
  saveStatus(repos, {
    ...initial,
    state: "running",
    hasKey: (await getRawGoogleApiKey()) != null,
    updatedAt: new Date().toISOString(),
    message: `running knowledge generation for chapter ${chapter.title}`
  });

  const summary = await runGeneration(repos, book, chapter, selectedModel, maxChunks);
  saveStatus(repos, {
    bookId: book.id,
    provider: "google",
    state: summary.failed > 0 && summary.created === 0 && summary.updated === 0 ? "failed" : "success",
    hasKey: (await getRawGoogleApiKey()) != null,
    sourceFile: summary.sourceFile ?? null,
    updatedAt: new Date().toISOString(),
    lastSummary: summary,
    message: summary.errors[0]?.message ?? null
  });
  return summary;
}

export async function getGoogleKnowledgeProviderProbe(selectedModel?: string) {
  const settings = await getAiSettings();
  const key = await getRawGoogleApiKey();
  return {
    provider: "google" as const,
    hasKey: key != null,
    maskedKey: key ? `${key.slice(0, 4)}...${key.slice(-4)}` : null,
    model: selectedModel || settings.defaultModel
  };
}
