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
  const chatRef = useRef<HTMLDivElement>(null);

  // Reset per-book view state when switching books.
  useEffect(() => {
    setActiveChapter(null);
    setActiveTab("smart-book");
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

  function scrollToChat() {
    chatRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <div className="reader-workbench">
      <ReaderTopBar book={book as StudentBook} onToggleHistory={scrollToChat} />
      <ReaderTabs active={activeTab} onChange={setActiveTab} />

      {activeTab === "smart-book" ? (
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
      ) : (
        <TabPlaceholder label={READER_TABS.find((t) => t.key === activeTab)?.label ?? ""} />
      )}
    </div>
  );
}
