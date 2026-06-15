import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { BookChapter, BookContent } from "@ai-smartbook/schema";
import { studentClient, type BookDetail } from "../studentClient";
import type { StudentBook } from "../bookDisplay";
import { ReaderTopBar } from "../components/ReaderTopBar";
import { ReaderTabs, READER_TABS, type ReaderTabKey } from "../components/ReaderTabs";
import { ChapterSidebar } from "../components/ChapterSidebar";
import { ReaderViewport, type ReaderRatio } from "../components/ReaderViewport";
import { ChatPanel } from "../components/ChatPanel";
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
  const [contents, setContents] = useState<BookContent[]>([]);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ReaderTabKey>("smart-book");
  const [collapsed, setCollapsed] = useState(false);
  const [ratio, setRatio] = useState<ReaderRatio>("7:3");
  const [zoom] = useState(100);
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
    setPdfError("");
  }, [bookId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([studentClient.getBook(bookId), studentClient.getContents(bookId)])
      .then(([b, c]) => {
        setBook(b.book);
        setContents(c.contents);
      })
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

  const shownContents = useMemo(
    () => (safeActiveChapter ? contents.filter((c) => c.chapterId === safeActiveChapter) : contents),
    [contents, safeActiveChapter]
  );

  if (loading) return <p className="muted reader-state">載入中…</p>;
  if (error) return <p className="error-text reader-state">{error}</p>;
  if (!book) return <p className="muted reader-state">找不到這本書。</p>;

  const chapters: BookChapter[] = book.chapters ?? [];
  const ratioClass = `ratio-${ratio.replace(":", "-")}`;
  const watermarkText = [
    "iBrain 智匯",
    pdfSessionId ? `session ${pdfSessionId}` : "session pending",
    book.title || book.id,
    watermarkStamp || new Date().toLocaleDateString()
  ].join(" · ");

  function scrollToChat() {
    chatRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <div className="reader-workbench">
      <ReaderTopBar book={book as StudentBook} onToggleHistory={scrollToChat} />
      <ReaderTabs active={activeTab} onChange={setActiveTab} />

      {activeTab === "smart-book" ? (
        <>
          <section className="student-pdf-card">
            <div className="student-pdf-head">
              <div>
                <h3>Protected PDF View</h3>
                <p className="muted">
                  This is a first-layer protected reader stream. It reduces casual downloading but
                  does not claim full DevTools-proof DRM.
                </p>
              </div>
              <div className="student-pdf-meta">
                <span>{book.pdfFileName ?? "No PDF source"}</span>
                {pdfSessionId ? <strong>{pdfSessionId}</strong> : null}
              </div>
            </div>

            {!book.pdfFileId ? (
              <p className="muted">No protected PDF source is available for this book.</p>
            ) : pdfLoading ? (
              <p className="muted">Loading protected PDF…</p>
            ) : pdfError ? (
              <p className="error-text">{pdfError}</p>
            ) : pdfUrl ? (
              <div className="student-pdf-frame">
                <iframe
                  title={`${book.title} PDF`}
                  src={`${pdfUrl}#toolbar=0&navpanes=0`}
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
              <p className="muted">Protected PDF preview is not ready.</p>
            )}
          </section>

          <div className={`reader-main ${ratioClass} ${collapsed ? "toc-collapsed" : ""}`}>
            {!collapsed && (
              <ChapterSidebar
                chapters={chapters}
                activeChapter={safeActiveChapter}
                onSelect={setActiveChapter}
              />
            )}

            <ReaderViewport
              title={book.title}
              chapters={chapters}
              activeChapter={safeActiveChapter}
              onSelectChapter={setActiveChapter}
              contents={shownContents}
              collapsed={collapsed}
              onToggleCollapsed={() => setCollapsed((v) => !v)}
              zoom={zoom}
              onZoomReset={() => undefined}
              ratio={ratio}
              onRatio={setRatio}
              onAskAi={scrollToChat}
            />

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
          </div>
        </>
      ) : (
        <TabPlaceholder label={READER_TABS.find((t) => t.key === activeTab)?.label ?? ""} />
      )}
    </div>
  );
}
