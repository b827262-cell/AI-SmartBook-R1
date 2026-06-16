import type {
  BookChapter,
  ReaderOutlineNode,
  ReaderOutlineSource
} from "@ai-smartbook/schema";

type ObjectRecord = Record<string, unknown>;

const ROOT_KEYS = ["outline", "chapters", "toc", "items"];
const TITLE_KEYS = ["title", "name", "heading", "label", "chapterTitle", "text"];
const PAGE_KEYS = ["page", "pageNumber", "pageStart", "startPage", "pdfPage", "logicalPage", "displayPage"];
const CHILD_KEYS = ["children", "items", "sections", "subsections", "nodes"];

function isRecord(value: unknown): value is ObjectRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function parsePage(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1) return value;
  if (typeof value === "string") {
    const match = value.trim().match(/\d+/);
    if (!match) return null;
    const parsed = Number.parseInt(match[0], 10);
    return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
  }
  return null;
}

function firstString(record: ObjectRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = stringValue(record[key]);
    if (value) return value;
  }
  return null;
}

function firstPage(record: ObjectRecord): { page: number | null; displayPage: string | null } {
  for (const key of PAGE_KEYS) {
    const raw = record[key];
    const page = parsePage(raw);
    if (page != null) return { page, displayPage: stringValue(raw) };
  }
  return { page: null, displayPage: null };
}

function childValues(record: ObjectRecord): unknown[] {
  for (const key of CHILD_KEYS) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function rootValues(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  if (!isRecord(input)) return [];
  for (const key of ROOT_KEYS) {
    const value = input[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function normalizePdfIndexItems(input: ObjectRecord, source: ReaderOutlineSource): ReaderOutlineNode[] | null {
  if (input.schemaVersion !== "smartbook-pdf-index-v1" || !Array.isArray(input.items)) return null;
  const byChapter = new Map<string, ReaderOutlineNode>();
  const directNodes: ReaderOutlineNode[] = [];

  input.items.forEach((raw, index) => {
    if (!isRecord(raw)) return;
    const chapterTitle = stringValue(raw.chapterTitle);
    const chapterId = stringValue(raw.chapterId);
    const itemType = stringValue(raw.type);
    const { page } = firstPage(raw);

    if (itemType === "chapter") {
      const title = chapterTitle ?? firstString(raw, TITLE_KEYS);
      if (!title) return;
      directNodes.push({
        id: chapterId ?? firstString(raw, ["id"]) ?? `${source}-chapter-${index + 1}`,
        title,
        level: 1,
        page,
        pdfPage: page,
        displayPage: page != null ? String(page) : null,
        children: [],
        source
      });
      return;
    }

    if (!chapterTitle) return;
    const key = chapterId ?? chapterTitle;
    const existing = byChapter.get(key);
    if (existing) {
      if (existing.page == null || (page != null && page < existing.page)) {
        existing.page = page;
        existing.pdfPage = page;
        existing.displayPage = page != null ? String(page) : existing.displayPage ?? null;
      }
      return;
    }
    byChapter.set(key, {
      id: chapterId ?? `${source}-chapter-${byChapter.size + 1}`,
      title: chapterTitle,
      level: 1,
      page,
      pdfPage: page,
      displayPage: page != null ? String(page) : null,
      children: [],
      source
    });
  });

  const grouped = [...byChapter.values()];
  if (directNodes.length > 0) return directNodes;
  return grouped.length > 0 ? grouped : null;
}

function normalizeNode(
  raw: unknown,
  path: number[],
  source: ReaderOutlineSource,
  inheritedLevel: number
): ReaderOutlineNode | null {
  if (!isRecord(raw)) return null;
  const children = childValues(raw)
    .map((child, index) => normalizeNode(child, [...path, index + 1], source, inheritedLevel + 1))
    .filter((node): node is ReaderOutlineNode => node != null);
  const title = firstString(raw, TITLE_KEYS);
  if (!title && children.length === 0) return null;
  const levelRaw = typeof raw.level === "number" && Number.isInteger(raw.level) ? raw.level : inheritedLevel;
  const level = Math.max(1, levelRaw);
  const { page, displayPage } = firstPage(raw);
  const id = firstString(raw, ["id", "key", "slug"]) ?? `${source}-${path.join("-")}`;

  return {
    id,
    title: title ?? `Section ${path.join(".")}`,
    level,
    page,
    pdfPage: parsePage(raw.pdfPage) ?? page,
    displayPage,
    children,
    source
  };
}

function normalizeFlatItems(items: unknown[], source: ReaderOutlineSource): ReaderOutlineNode[] {
  const nodes = items
    .map((item, index) => normalizeNode(item, [index + 1], source, 1))
    .filter((node): node is ReaderOutlineNode => node != null);

  // Flat chapter-like JSON indexes have no children. Return them directly; the
  // UI still gets page mapping and active state without inventing hierarchy.
  return nodes;
}

export function normalizeReaderOutline(input: unknown, source: ReaderOutlineSource = "split_json"): ReaderOutlineNode[] {
  if (isRecord(input)) {
    const fromPdfIndex = normalizePdfIndexItems(input, source);
    if (fromPdfIndex) return fromPdfIndex;
  }
  const roots = rootValues(input);
  if (roots.length === 0) return [];
  return normalizeFlatItems(roots, source);
}

export function normalizeChaptersToReaderOutline(
  chapters: BookChapter[],
  source: ReaderOutlineSource = "chapter_table"
): ReaderOutlineNode[] {
  return [...chapters]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((chapter, index) => ({
      id: chapter.id,
      title: chapter.title.trim() || `Chapter ${index + 1}`,
      level: Math.max(1, (chapter.level ?? 0) + 1),
      page: chapter.pageStart ?? null,
      pdfPage: chapter.pageStart ?? null,
      displayPage: chapter.pageStart != null ? String(chapter.pageStart) : null,
      children: [],
      source: chapter.source === "pdf_outline" ? "pdf_outline" : source
    }));
}

export function flattenReaderOutline(nodes: ReaderOutlineNode[]): ReaderOutlineNode[] {
  const flattened: ReaderOutlineNode[] = [];
  function walk(items: ReaderOutlineNode[]) {
    for (const item of items) {
      flattened.push(item);
      walk(item.children);
    }
  }
  walk(nodes);
  return flattened;
}
