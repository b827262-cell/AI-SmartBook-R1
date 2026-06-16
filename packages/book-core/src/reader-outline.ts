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

function stringValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isInteger(value)) return String(value);
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

function normalizeTitle(value: string): string {
  return value.trim().replace(/\s+/g, " ").replace(/\s+(?=[,，。．.!?！？:：])/g, "");
}

function compactTitle(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

function stripOutlineNumbering(title: string): string {
  return normalizeTitle(title)
    .replace(/^\d{1,3}\s*[—\-－]\s*/u, "")
    .replace(/^0+(?=[前後])/u, "");
}

function parsePrintedPageLabelFromTitle(title: string): string | null {
  const stripped = stripOutlineNumbering(title);
  const match = compactTitle(stripped).match(
    /^((前|後)?\d{1,4}(?:\s*[~～〜]\s*\d{1,4}(?:[\+＋]\d+[A-Za-z]*)?)?)/u
  );
  return match ? match[1] : null;
}

function suggestChapterTitleFromOutline(title: string): string {
  const stripped = stripOutlineNumbering(title);
  const printed = parsePrintedPageLabelFromTitle(title);
  let remainder = stripped;

  if (printed && remainder.startsWith(printed)) {
    remainder = remainder.slice(printed.length);
  }

  return remainder.replace(/^[—\-－:：]+/u, "").trim() || normalizeTitle(title);
}

function normalizeOutlineTitle(title: string | null): string {
  return title == null ? "" : suggestChapterTitleFromOutline(title);
}

function isPdfStyleFlatTitle(title: string): boolean {
  const compact = compactTitle(title);
  if (/^(0+\d+)?(前|後)?\d{1,4}(?:[～〜~]\d{1,4}(?:[\+＋]\d+[A-Za-z]*)?)?/.test(compact)) return true;
  if (/^第\d+章/.test(compact)) return true;
  if (/^第\d+章$/.test(compact)) return true;
  if (/^第[零一二三四五六七八九十百千兩]+章$/.test(compact)) return true;
  if (/^第\d+節$/.test(compact)) return true;
  if (/^第[零一二三四五六七八九十百千兩]+節$/.test(compact)) return true;
  if (/^[前後]?目錄$/.test(compact)) return true;
  if (/^(目錄|自序|前言|序言|附錄|參考文獻)/.test(compact)) return true;
  return false;
}

function buildOutlineTree(nodes: ReaderOutlineNode[]): ReaderOutlineNode[] {
  const cloned = nodes.map((node) => ({ ...node, children: [...node.children] }));
  const roots: ReaderOutlineNode[] = [];
  const stack: ReaderOutlineNode[] = [];

  for (const node of cloned) {
    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  }

  return roots;
}

function hasNested(nodes: ReaderOutlineNode[]): boolean {
  for (const node of nodes) {
    if (node.level > 1 || node.children.length > 0) return true;
    if (hasNested(node.children)) return true;
  }
  return false;
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
        title: normalizeOutlineTitle(title),
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
      title: normalizeOutlineTitle(chapterTitle),
      level: 1,
      page,
      pdfPage: page,
      displayPage: page != null ? String(page) : null,
      children: [],
      source
    });
  });

  const grouped = [...byChapter.values()];
  if (directNodes.length > 0) return buildOutlineTree(directNodes);
  return grouped.length > 0 ? buildOutlineTree(grouped) : null;
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
    title: normalizeOutlineTitle(title ?? `Section ${path.join(".")}`),
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

  return buildOutlineTree(nodes);
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

export function isStructuredReaderOutline(nodes: ReaderOutlineNode[]): boolean {
  if (hasNested(nodes)) return true;
  if (nodes.length === 0) return false;
  return !nodes.every((node) => isPdfStyleFlatTitle(node.title));
}

export function normalizeChaptersToReaderOutline(
  chapters: BookChapter[],
  source: ReaderOutlineSource = "chapter_table"
): ReaderOutlineNode[] {
  return buildOutlineTree(
    [...chapters]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((chapter, index) => ({
        id: chapter.id,
        title: normalizeOutlineTitle(chapter.title.trim() || `Chapter ${index + 1}`),
        level: Math.max(1, (chapter.level ?? 0) + 1),
        page: chapter.pageStart ?? null,
        pdfPage: chapter.pageStart ?? null,
        displayPage: chapter.pageStart != null ? String(chapter.pageStart) : null,
        children: [],
        source: chapter.source === "pdf_outline" ? "pdf_outline" : source
      }))
  );
}

// ---------------------------------------------------------------------------
// Reader TOC from a stored PDF JSON index (page-range slice + heading parser)
// ---------------------------------------------------------------------------

/** Minimal shape of a PDF JSON index item used for TOC extraction. */
export interface PdfIndexItemLike {
  pageStart?: number | null;
  pageEnd?: number | null;
  page?: number | null;
  pageNumber?: number | null;
  text?: string | null;
}

const CHAPTER_HEADING_RE = /第\s*[零一二三四五六七八九十百千兩0-9]+\s*章/u;
const SECTION_HEADING_RE = /第\s*[零一二三四五六七八九十百千兩0-9]+\s*節/u;
const ENUM_HEADING_RE = /^[（(]?\s*[一二三四五六七八九十]+\s*[、，．.)）]/u;

function indexItemPage(item: PdfIndexItemLike): number | null {
  return parsePage(item.pageStart ?? item.page ?? item.pageNumber ?? item.pageEnd ?? null);
}

/** Strip trailing dot-leaders / page numbers and collapse whitespace. */
function cleanHeadingTitle(value: string): string {
  return normalizeTitle(
    value
      .replace(/[\.．·・…\s]{2,}\d*\s*$/u, "")
      .replace(/\s*\d{1,4}\s*$/u, "")
  ).trim();
}

/**
 * Build a chapter/section reader outline from a stored PDF JSON index, limited
 * to items whose page falls within [pageStart, pageEnd]. Headings are detected
 * structurally (第X章 / 第X節 / 一、二、三) and raw bookmark prefixes such as
 * "01－1～37＋1第1章" are dropped by slicing from the heading marker.
 */
export function buildReaderTocFromIndexItems(
  items: PdfIndexItemLike[],
  pageStart: number,
  pageEnd: number
): { outline: ReaderOutlineNode[]; lines: string[]; warnings: string[] } {
  const lo = Math.min(pageStart, pageEnd);
  const hi = Math.max(pageStart, pageEnd);
  const warnings: string[] = [];

  const scoped = items
    .map((item, index) => ({ item, index, page: indexItemPage(item) }))
    .filter((entry) => entry.page != null && entry.page >= lo && entry.page <= hi)
    .sort((a, b) => (a.page! - b.page!) || (a.index - b.index));

  if (scoped.length === 0) {
    warnings.push(`No index items found in page range ${lo}-${hi}.`);
    return { outline: [], lines: [], warnings };
  }

  const flat: ReaderOutlineNode[] = [];
  const matchedLines: string[] = [];
  let lastTitle = "";
  let seq = 0;

  for (const entry of scoped) {
    const text = typeof entry.item.text === "string" ? entry.item.text : "";
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;

      let level: 1 | 2 | null = null;
      let title = "";

      // A real heading is short and does not end like a full sentence; this
      // rejects body sentences that merely contain "第X章/節" mid-text.
      const endsLikeSentence = /[。．.!！?？]\s*$/u.test(line);
      if (!endsLikeSentence && line.length <= 48) {
        const chapter = line.match(CHAPTER_HEADING_RE);
        const section = line.match(SECTION_HEADING_RE);
        if (chapter && (chapter.index ?? 99) <= 12) {
          level = 1;
          title = cleanHeadingTitle(line.slice(chapter.index ?? 0));
        } else if (section && (section.index ?? 99) <= 14) {
          level = 2;
          title = cleanHeadingTitle(line.slice(section.index ?? 0));
        } else if (ENUM_HEADING_RE.test(line)) {
          level = 2;
          title = cleanHeadingTitle(line);
        }
      }

      if (level == null || !title) continue;
      // Drop exact consecutive duplicates (sentence index repeats headings).
      if (title === lastTitle) continue;
      lastTitle = title;
      seq += 1;
      matchedLines.push(`${level === 1 ? "" : "  "}${title}`);
      flat.push({
        id: `manual-toc-${seq}`,
        title,
        level,
        page: entry.page,
        pdfPage: entry.page,
        displayPage: entry.page != null ? String(entry.page) : null,
        children: [],
        source: "manual_toc"
      });
    }
  }

  if (flat.length === 0) {
    warnings.push("No chapter/section heading lines were detected in the selected page range.");
    return { outline: [], lines: [], warnings };
  }
  if (!flat.some((node) => node.level === 1)) {
    warnings.push("No chapter (第X章) heading detected; sections have no parent chapter.");
  }

  const outline = buildOutlineTree(flat);
  if (!hasNested(outline)) {
    warnings.push("Generated outline has no nested sections (chapters only).");
  }
  return { outline, lines: matchedLines, warnings };
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
