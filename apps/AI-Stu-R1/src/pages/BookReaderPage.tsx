import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { BookChapter } from "@ai-smartbook/schema";
import { studentClient, type BookDetail } from "../studentClient";
import type { StudentBook } from "../bookDisplay";
import { ReaderTopBar } from "../components/ReaderTopBar";
import { ReaderTabs, READER_TABS, type ReaderTabKey } from "../components/ReaderTabs";
import { ChapterSidebar } from "../components/ChapterSidebar";
import { PdfReaderToolbar, type ReaderRatio } from "../components/PdfReaderToolbar";
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

const PDF_WATERMARK_TILES = Array.from({ length: 8 }, (_, index) => index);

function studentSessionKey(bookId: string): string {
  return `smartbook.chatSession.${bookId}`;
}

export function BookReaderPage() {
  const { bookId = "" } = useParams();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ReaderTabKey>("smart-book");
  const [collapsed, setCollapsed] = useState(false);
  const [aiCollapsed, setAiCollapsed] = useState(false);
  const [ratio, setRatio] = useState<ReaderRatio>("6:4");
  const [zoom, setZoom] = useState(100);
  // PDF physical page is the canonical navigation source of truth.
  const [pdfPage, setPdfPage] = useState(1);
  const [noteOpen, setNoteOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfSessionId, setPdfSessionId] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [watermarkStamp, setWatermarkStamp] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  // Reset per-book view state when switching books.
  useEffect(() => {
    setActiveChapter(null);
    setActiveTab("smart-book");
    setPdfPage(1);
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
    setPdfUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setPdfLoading(false);
    setPdfError("");
    setPdfSessionId(null);
    setWatermarkStamp("");
  }, [bookId]);

  useEffect(() => {
    if (!bookId || !book?.pdfFileId) return;

    const pdfFileId = book.pdfFileId;
    let disposed = false;
    let objectUrl: string | null = null;

    async function loadProtectedPdf(savedSessionId?: string | null) {
      const ensured = await studentClient.ensureBookSession(bookId, savedSessionId ?? undefined);
      if (disposed) return;
      localStorage.setItem(studentSessionKey(bookId), ensured.sessionId);
      setPdfSessionId(ensured.sessionId);
      setWatermarkStamp(new Date().toLocaleString());
      const blob = await studentClient.getProtectedPdfBlob(bookId, pdfFileId, ensured.sessionId);
      if (disposed) return;
      objectUrl = URL.createObjectURL(blob);
      setPdfUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return objectUrl;
      });
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
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [bookId, book?.pdfFileId]);

  // Guard against a stale chapter id that does not belong to the current book.
  const safeActiveChapter = useMemo(
    () => ((book?.chapters ?? []).some((ch) => ch.id === activeChapter) ? activeChapter : null),
    [book, activeChapter]
  );

  if (loading) return <p className="muted reader-state">載入中…</p>;
  if (error) return <p className="error-text reader-state">{error}</p>;
  if (!book) return <p className="muted reader-state">找不到這本書。</p>;

  const chapters: BookChapter[] = book.chapters ?? [];
  const ratioClass = `ratio-${ratio.replace(":", "-")}`;
  const activeChapterTitle = chapters.find((c) => c.id === safeActiveChapter)?.title ?? null;
  const watermarkText = [
    "iBrain 智匯",
    pdfSessionId ? `session ${pdfSessionId}` : "session pending",
    book.title || book.id,
    watermarkStamp || new Date().toLocaleDateString()
  ].join(" · ");

  // Chapter selection drives PDF navigation. chapter.pageStart is treated as the
  // canonical PDF physical page; printed labels are never used here.
  function selectChapter(chapterId: string | null) {
    setActiveChapter(chapterId);
    if (!chapterId) {
      setPdfPage(1);
      return;
    }
    const chapter = chapters.find((c) => c.id === chapterId);
    if (chapter?.pageStart != null) setPdfPage(chapter.pageStart);
  }

  function scrollToChat() {
    setAiCollapsed(false);
    requestAnimationFrame(() =>
      chatRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    );
  }

  // Browser-native PDF viewer reads page/zoom from the URL fragment. The iframe
  // element identity stays stable so changing the hash navigates in place.
  const pdfSrc = pdfUrl
    ? `${pdfUrl}#page=${pdfPage}&zoom=${zoom}&toolbar=0&navpanes=0`
    : "";

  return (
    <div className="reader-workbench">
      <ReaderTopBar book={book as StudentBook} onToggleHistory={scrollToChat} />
      <ReaderTabs active={activeTab} onChange={setActiveTab} />

      {activeTab === "smart-book" ? (
        <>
          <PdfReaderToolbar
            chapters={chapters}
            activeChapter={safeActiveChapter}
            onSelectChapter={selectChapter}
            tocCollapsed={collapsed}
            onToggleToc={() => setCollapsed((v) => !v)}
            aiCollapsed={aiCollapsed}
            onToggleAi={() => setAiCollapsed((v) => !v)}
            zoom={zoom}
            onZoom={setZoom}
            ratio={ratio}
            onRatio={setRatio}
            page={book.pdfFileId ? pdfPage : null}
            onOpenNote={() => setNoteOpen(true)}
            onAskAi={scrollToChat}
          />

          <div
            className={`reader-main ${ratioClass} ${collapsed ? "toc-collapsed" : ""} ${
              aiCollapsed ? "ai-collapsed" : ""
            }`}
          >
            {!collapsed && (
              <ChapterSidebar
                chapters={chapters}
                activeChapter={safeActiveChapter}
                onSelect={selectChapter}
              />
            )}

            <section className="reader-pdf-col">
              {!book.pdfFileId ? (
                <div className="reader-pdf-status">
                  <p className="muted">尚未提供 PDF 教材。</p>
                </div>
              ) : pdfLoading ? (
                <div className="reader-pdf-status">
                  <p className="muted">Loading protected PDF…</p>
                </div>
              ) : pdfError ? (
                <div className="reader-pdf-status">
                  <p className="error-text">{pdfError}</p>
                </div>
              ) : pdfUrl ? (
                <div className="student-pdf-frame">
                  <iframe
                    title={`${book.title} PDF`}
                    src={pdfSrc}
                    className="student-pdf-iframe"
                  />
                  <div className="student-pdf-watermark" aria-hidden="true">
                    {PDF_WATERMARK_TILES.map((tile) => (
                      <span key={tile} className="student-pdf-watermark-item">
                        {watermarkText}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="reader-pdf-status">
                  <p className="muted">Protected PDF preview is not ready.</p>
                </div>
              )}
            </section>

            {!aiCollapsed && (
              <div className="reader-chat-col" ref={chatRef}>
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
  );
}
