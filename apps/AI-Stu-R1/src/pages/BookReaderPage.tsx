import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { useParams } from "react-router-dom";
import type { BookChapter, ReaderOutlineNode, ReaderOutlineSource } from "@ai-smartbook/schema";
import { studentClient, type BookDetail } from "../studentClient";
import type { StudentBook } from "../bookDisplay";
import { ReaderTopBar } from "../components/ReaderTopBar";
import { ReaderTabs, READER_TABS, type ReaderTabKey } from "../components/ReaderTabs";
import { ChapterSidebar } from "../components/ChapterSidebar";
import {
  PdfReaderToolbar,
  RATIO_AI_WIDTH,
  RATIO_TOC_WIDTH,
  type ReaderRatio
} from "../components/PdfReaderToolbar";
import { ProtectedPdfViewer } from "../components/ProtectedPdfViewer";
import { ChatPanel } from "../components/ChatPanel";
import { StickyNoteModal } from "../components/StickyNoteModal";
import { TabPlaceholder } from "../components/TabPlaceholder";

const QUICK_PROMPTS = [
  "整理這頁重點",
  "用例子解釋",
  "本章有考題？",
  "解析第一題",
  "關鍵字找考題"
];

// Resizable pane bounds (desktop). PDF area is flexible (min-width in CSS).
const TOC_MIN = 220;
const TOC_MAX = 420;
const TOC_DEFAULT = 260;
const AI_MIN = 300;
const AI_MAX = 560;
const AI_DEFAULT = 380;
const TOC_WIDTH_KEY = "smartbook.reader.tocWidth";
const AI_WIDTH_KEY = "smartbook.reader.aiWidth";
const OUTER_LAYOUT_KEY = "smartbook.reader.outerLayout";
const LAYOUT_RATIO_KEY = "smartbook.reader.layoutRatio";
const OUTER_GUTTER_MIN = 16;
const OUTER_GUTTER_MAX = 520;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function readStoredWidth(key: string, fallback: number, min: number, max: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? clamp(n, min, max) : fallback;
  } catch {
    return fallback;
  }
}

function readStoredRatio(): ReaderRatio {
  try {
    const raw = localStorage.getItem(LAYOUT_RATIO_KEY);
    return raw === "6:4" || raw === "1:1" || raw === "4:6" ? raw : "6:4";
  } catch {
    return "6:4";
  }
}

function defaultOuterGutter(): number {
  if (typeof window === "undefined") return 80;
  return clamp(Math.floor((window.innerWidth - 1280) / 2), OUTER_GUTTER_MIN, OUTER_GUTTER_MAX);
}

function readStoredOuterLayout(): { leftGutter: number; rightGutter: number } {
  try {
    const fallback = defaultOuterGutter();
    const raw = localStorage.getItem(OUTER_LAYOUT_KEY);
    if (!raw) return { leftGutter: fallback, rightGutter: fallback };
    const parsed = JSON.parse(raw) as { leftGutter?: unknown; rightGutter?: unknown };
    const left = typeof parsed.leftGutter === "number" ? parsed.leftGutter : fallback;
    const right = typeof parsed.rightGutter === "number" ? parsed.rightGutter : fallback;
    return {
      leftGutter: clamp(left, OUTER_GUTTER_MIN, OUTER_GUTTER_MAX),
      rightGutter: clamp(right, OUTER_GUTTER_MIN, OUTER_GUTTER_MAX)
    };
  } catch {
    const fallback = defaultOuterGutter();
    return { leftGutter: fallback, rightGutter: fallback };
  }
}

function studentSessionKey(bookId: string): string {
  return `smartbook.chatSession.${bookId}`;
}

function flattenOutline(nodes: ReaderOutlineNode[]): ReaderOutlineNode[] {
  const flat: ReaderOutlineNode[] = [];
  function walk(items: ReaderOutlineNode[]) {
    for (const item of items) {
      flat.push(item);
      walk(item.children);
    }
  }
  walk(nodes);
  return flat;
}

function chaptersToFallbackOutline(chapters: BookChapter[]): ReaderOutlineNode[] {
  const nodes = chapters
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        level: Math.max(1, (chapter.level ?? 0) + 1),
        page: chapter.pageStart ?? null,
        pdfPage: chapter.pageStart ?? null,
        displayPage: chapter.pageStart != null ? String(chapter.pageStart) : null,
        children: [],
        source: (chapter.source === "pdf_outline" ? "pdf_outline" : "chapter_table") as ReaderOutlineNode["source"]
      }));

  const stack: ReaderOutlineNode[] = [];
  const roots: ReaderOutlineNode[] = [];

  for (const node of nodes) {
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

/** Draggable vertical split handle. Reports pointer dx so the parent clamps. */
function PaneSplitter({
  onResize,
  label,
  className = ""
}: {
  onResize: (dx: number) => void;
  label: string;
  className?: string;
}) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    lastX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.classList.add("reader-resizing");
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const dx = e.clientX - lastX.current;
    lastX.current = e.clientX;
    if (dx !== 0) onResize(dx);
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    document.body.classList.remove("reader-resizing");
  }

  return (
    <div
      className={`reader-split ${className}`.trim()}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <span className="reader-split-grip" />
    </div>
  );
}

function OuterResizeHandle({
  onResize,
  label
}: {
  onResize: (dx: number) => void;
  label: string;
}) {
  return (
    <PaneSplitter onResize={onResize} label={label} className="outer" />
  );
}

export function BookReaderPage() {
  const { bookId = "" } = useParams();
  const initialOuterLayout = useMemo(() => readStoredOuterLayout(), []);
  const [book, setBook] = useState<BookDetail | null>(null);
  const [outline, setOutline] = useState<ReaderOutlineNode[]>([]);
  const [outlineSource, setOutlineSource] = useState<ReaderOutlineSource>("fallback");
  const [selectedOutlineId, setSelectedOutlineId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ReaderTabKey>("smart-book");
  const [collapsed, setCollapsed] = useState(false);
  const [aiCollapsed, setAiCollapsed] = useState(false);
  const [tocWidth, setTocWidth] = useState(() =>
    readStoredWidth(TOC_WIDTH_KEY, TOC_DEFAULT, TOC_MIN, TOC_MAX)
  );
  const [aiWidth, setAiWidth] = useState(() =>
    readStoredWidth(AI_WIDTH_KEY, AI_DEFAULT, AI_MIN, AI_MAX)
  );
  const [leftGutter, setLeftGutter] = useState(initialOuterLayout.leftGutter);
  const [rightGutter, setRightGutter] = useState(initialOuterLayout.rightGutter);
  const [layoutRatio, setLayoutRatio] = useState<ReaderRatio>(() => readStoredRatio());
  const [zoom, setZoom] = useState(100);
  // PDF physical page is the canonical navigation source of truth.
  const [pdfPage, setPdfPage] = useState(1);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfSessionId, setPdfSessionId] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [watermarkStamp, setWatermarkStamp] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  // Persist pane widths so the layout survives reloads.
  useEffect(() => {
    try {
      localStorage.setItem(TOC_WIDTH_KEY, String(tocWidth));
    } catch {
      /* ignore */
    }
  }, [tocWidth]);
  useEffect(() => {
    try {
      localStorage.setItem(AI_WIDTH_KEY, String(aiWidth));
    } catch {
      /* ignore */
    }
  }, [aiWidth]);
  useEffect(() => {
    try {
      localStorage.setItem(OUTER_LAYOUT_KEY, JSON.stringify({ leftGutter, rightGutter }));
    } catch {
      /* ignore */
    }
  }, [leftGutter, rightGutter]);
  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_RATIO_KEY, layoutRatio);
    } catch {
      /* ignore */
    }
  }, [layoutRatio]);

  // Reset per-book view state when switching books.
  useEffect(() => {
    setSelectedOutlineId(null);
    setOutline([]);
    setOutlineSource("fallback");
    setActiveTab("smart-book");
    setPdfPage(1);
    setPageCount(null);
    setNoteOpen(false);
    setPdfError("");
  }, [bookId]);

  useEffect(() => {
    setLoading(true);
    studentClient
      .getBook(bookId)
      .then((b) => setBook(b.book))
      .catch((e) => setError(String(e.message)))
      .finally(() => setLoading(false));
  }, [bookId]);

  useEffect(() => {
    if (!book) return;
    let disposed = false;
    studentClient
      .getOutline(book.id)
      .then((result) => {
        if (disposed) return;
        setOutline(result.outline);
        setOutlineSource(result.source);
      })
      .catch(() => {
        if (disposed) return;
        setOutline(chaptersToFallbackOutline(book.chapters ?? []));
        setOutlineSource("fallback");
      });
    return () => {
      disposed = true;
    };
  }, [book]);

  useEffect(() => {
    setPdfBlob(null);
    setPdfLoading(false);
    setPdfError("");
    setPdfSessionId(null);
    setWatermarkStamp("");
  }, [bookId]);

  useEffect(() => {
    if (!bookId || !book?.pdfFileId) return;

    const pdfFileId = book.pdfFileId;
    let disposed = false;

    async function loadProtectedPdf(savedSessionId?: string | null) {
      const ensured = await studentClient.ensureBookSession(bookId, savedSessionId ?? undefined);
      if (disposed) return;
      localStorage.setItem(studentSessionKey(bookId), ensured.sessionId);
      setPdfSessionId(ensured.sessionId);
      setWatermarkStamp(new Date().toLocaleString());
      const blob = await studentClient.getProtectedPdfBlob(bookId, pdfFileId, ensured.sessionId);
      if (disposed) return;
      setPdfBlob(blob);
    }

    async function run() {
      setPdfLoading(true);
      setPdfError("");
      const savedSessionId = localStorage.getItem(studentSessionKey(bookId));
      try {
        await loadProtectedPdf(savedSessionId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (savedSessionId && /invalid session/i.test(message)) {
          localStorage.removeItem(studentSessionKey(bookId));
          try {
            await loadProtectedPdf(null);
            return;
          } catch (retryErr) {
            if (!disposed) {
              setPdfError(retryErr instanceof Error ? retryErr.message : String(retryErr));
            }
            return;
          }
        }
        if (!disposed) setPdfError(message);
      } finally {
        if (!disposed) setPdfLoading(false);
      }
    }

    void run();

    return () => {
      disposed = true;
    };
  }, [bookId, book?.pdfFileId]);

  if (loading) return <p className="muted reader-state">載入中…</p>;
  if (error) return <p className="error-text reader-state">{error}</p>;
  if (!book) return <p className="muted reader-state">找不到這本書。</p>;

  const chapters: BookChapter[] = book.chapters ?? [];
  const flatOutline = flattenOutline(outline);
  const pageMappedOutline = flatOutline.filter((node) => node.page != null);
  const activeOutlineNode =
    [...pageMappedOutline]
      .filter((node) => (node.page ?? 0) <= pdfPage)
      .sort((a, b) => (b.page ?? 0) - (a.page ?? 0))[0] ??
    flatOutline.find((node) => node.id === selectedOutlineId) ??
    null;
  const activeOutlineId = activeOutlineNode?.id ?? null;
  const activeChapter =
    activeOutlineNode != null
      ? chapters.find((chapter) => chapter.id === activeOutlineNode.id) ??
        chapters.find((chapter) => chapter.pageStart != null && chapter.pageStart === activeOutlineNode.page) ??
        null
      : null;
  const safeActiveChapter = activeChapter?.id ?? null;
  const activeChapterTitle = activeOutlineNode?.title ?? activeChapter?.title ?? null;
  const watermarkText = [
    "iBrain 智匯",
    pdfSessionId ? `session ${pdfSessionId}` : "session pending",
    book.title || book.id,
    watermarkStamp || new Date().toLocaleDateString()
  ].join(" · ");

  function jumpToPage(page: number) {
    const clamped = clamp(page, 1, pageCount ?? Number.MAX_SAFE_INTEGER);
    setPdfPage(clamped);
  }

  function selectOutlineNode(nodeId: string | null) {
    setSelectedOutlineId(nodeId);
    if (!nodeId) {
      setPdfPage(1);
      return;
    }
    const node = flatOutline.find((candidate) => candidate.id === nodeId);
    if (node?.page != null) jumpToPage(node.page);
  }

  const prevPage = () => setPdfPage((p) => Math.max(1, p - 1));
  const nextPage = () =>
    setPdfPage((p) => (pageCount != null ? Math.min(pageCount, p + 1) : p + 1));
  const resizeToc = (dx: number) => setTocWidth((w) => clamp(w + dx, TOC_MIN, TOC_MAX));
  const resizeAi = (dx: number) => setAiWidth((w) => clamp(w - dx, AI_MIN, AI_MAX));
  const fullWidth = leftGutter <= OUTER_GUTTER_MIN + 4 && rightGutter <= OUTER_GUTTER_MIN + 4;

  function toggleFullWidth() {
    if (fullWidth) {
      const restored = defaultOuterGutter();
      setLeftGutter(restored);
      setRightGutter(restored);
      return;
    }
    setLeftGutter(OUTER_GUTTER_MIN);
    setRightGutter(OUTER_GUTTER_MIN);
  }

  function applyLayoutRatio(nextRatio: ReaderRatio) {
    setLayoutRatio(nextRatio);
    setTocWidth(RATIO_TOC_WIDTH[nextRatio]);
    setAiWidth(RATIO_AI_WIDTH[nextRatio]);
  }

  function resizeLeftOuter(dx: number) {
    const next = clamp(leftGutter + dx, OUTER_GUTTER_MIN, OUTER_GUTTER_MAX);
    const applied = next - leftGutter;
    if (applied === 0) return;
    setLeftGutter(next);
    if (!collapsed) {
      setTocWidth((width) => clamp(width - applied, TOC_MIN, TOC_MAX));
    }
  }

  function resizeRightOuter(dx: number) {
    const next = clamp(rightGutter - dx, OUTER_GUTTER_MIN, OUTER_GUTTER_MAX);
    const applied = rightGutter - next;
    if (applied === 0) return;
    setRightGutter(next);
    if (!aiCollapsed) {
      setAiWidth((width) => clamp(width + applied, AI_MIN, AI_MAX));
    }
  }

  function scrollToChat() {
    setAiCollapsed(false);
    requestAnimationFrame(() =>
      chatRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    );
  }

  return (
    <div
      className="reader-outer-layout"
      style={
        {
          "--reader-left-gutter": `${leftGutter}px`,
          "--reader-right-gutter": `${rightGutter}px`
        } as CSSProperties
      }
    >
      <div className="reader-outer-gutter left" aria-hidden="true" />
      <OuterResizeHandle
        onResize={resizeLeftOuter}
        label="調整左側空白與閱讀器寬度"
      />
      <div className="reader-workbench">
        <ReaderTopBar book={book as StudentBook} onToggleHistory={scrollToChat} />
        <ReaderTabs active={activeTab} onChange={setActiveTab} />

        {activeTab === "smart-book" ? (
          <>
            <PdfReaderToolbar
              outlineNodes={flatOutline}
              activeNodeId={activeOutlineId}
              onSelectOutlineNode={selectOutlineNode}
              fullWidth={fullWidth}
              onToggleFullWidth={toggleFullWidth}
              tocCollapsed={collapsed}
              onToggleToc={() => setCollapsed((v) => !v)}
              aiCollapsed={aiCollapsed}
              onToggleAi={() => setAiCollapsed((v) => !v)}
              zoom={zoom}
              onZoom={setZoom}
              ratio={layoutRatio}
              onRatio={applyLayoutRatio}
              page={book.pdfFileId ? pdfPage : null}
              pageCount={pageCount}
              onJumpPage={jumpToPage}
              onPrevPage={prevPage}
              onNextPage={nextPage}
              onOpenNote={() => setNoteOpen(true)}
              onAskAi={scrollToChat}
            />

            <div className="reader-main">
              {!collapsed && (
                <ChapterSidebar
                  outline={outline}
                  activeNodeId={activeOutlineId}
                  outlineSource={outlineSource}
                  onSelect={selectOutlineNode}
                  width={tocWidth}
                />
              )}
              {!collapsed && (
                <PaneSplitter onResize={resizeToc} label="調整章節與 PDF 寬度" />
              )}

              <section className="reader-pdf-col">
                {!book.pdfFileId ? (
                  <div className="reader-pdf-status-wrap">
                    <p className="muted">尚未提供 PDF 教材。</p>
                  </div>
                ) : pdfLoading ? (
                  <div className="reader-pdf-status-wrap">
                    <p className="muted">Loading protected PDF…</p>
                  </div>
                ) : pdfError ? (
                  <div className="reader-pdf-status-wrap">
                    <p className="error-text">{pdfError}</p>
                  </div>
                ) : pdfBlob ? (
                  <ProtectedPdfViewer
                    blob={pdfBlob}
                    page={pdfPage}
                    zoom={zoom}
                    watermarkText={watermarkText}
                    onPageCount={setPageCount}
                    onError={setPdfError}
                  />
                ) : (
                  <div className="reader-pdf-status-wrap">
                    <p className="muted">Protected PDF preview is not ready.</p>
                  </div>
                )}
              </section>

              {!aiCollapsed && (
                <PaneSplitter onResize={resizeAi} label="調整 PDF 與 AI 寬度" />
              )}
              {!aiCollapsed && (
                <div className="reader-chat-col" ref={chatRef} style={{ width: aiWidth }}>
                  <ChatPanel
                    bookId={bookId}
                    chapterId={safeActiveChapter ?? undefined}
                    title="AI 問答"
                    subtitle="點擊左側章節可限定提問範圍"
                    quickPrompts={QUICK_PROMPTS}
                    inputPlaceholder="問 AI 問題（支援貼上圖片）..."
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <TabPlaceholder label={READER_TABS.find((t) => t.key === activeTab)?.label ?? ""} />
        )}

        {noteOpen && (
          <StickyNoteModal
            bookTitle={book.title}
            page={pdfPage}
            chapterTitle={activeChapterTitle}
            onClose={() => setNoteOpen(false)}
          />
        )}
      </div>
      <OuterResizeHandle
        onResize={resizeRightOuter}
        label="調整右側空白與閱讀器寬度"
      />
      <div className="reader-outer-gutter right" aria-hidden="true" />
    </div>
  );
}
