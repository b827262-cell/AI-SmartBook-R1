import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { Document, Page, pdfjs } from "react-pdf";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  BookOpen,
  Upload,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Settings,
  Eye,
  EyeOff,
  Link,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  Lock,
  Unlock,
  GripVertical,
  Scissors,
  Sparkles,
  ChevronDown,
  MessageSquare,
  BookOpenCheck,
  Pencil,
  FolderOpen,
  Tag,
  Palette,
  Languages,
} from "lucide-react";
import { stripOptionPrefix } from "@/lib/stripOptionPrefix";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
console.debug("[PDF] pdfjs.version", pdfjs.version);
console.debug("[PDF] workerSrc", pdfjs.GlobalWorkerOptions.workerSrc);

// ===== PDF 預覽元件 =====
function PdfViewer({
  pdfUrl,
  currentPage,
  onPageChange,
  totalPages,
  pageOffset = 0,
  onAdjustPages,
}: {
  pdfUrl: string;
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
  pageOffset?: number;
  onAdjustPages?: (delta: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1.2);
  const [containerWidth, setContainerWidth] = useState(0);
  const [useBlobFallback, setUseBlobFallback] = useState(false);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const proxiedUrl = useMemo(
    () => pdfUrl.startsWith('/') || pdfUrl.includes('/api/pdf-proxy')
      ? pdfUrl
      : `/api/pdf-proxy?url=${encodeURIComponent(pdfUrl)}`,
    [pdfUrl]
  );
  const pageWidth = Math.max(1, Math.floor(containerWidth - 32));
  const renderWidth = Math.max(1, Math.floor(pageWidth * scale));
  const documentFile = useMemo(() => {
    if (pdfObjectUrl) return pdfObjectUrl;
    return { url: proxiedUrl, withCredentials: true };
  }, [pdfObjectUrl, proxiedUrl]);
  const documentOptions = useMemo(() => ({ withCredentials: true }), []);

  const goTo = (page: number) => {
    const p = Math.max(1, Math.min(totalPages, page));
    onPageChange(p);
  };

  // 鍵盤控制：左右鍵翻頁、+/-鍵縮放
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 避免在輸入框中觸發
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goTo(currentPage - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goTo(currentPage + 1);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setScale(s => Math.min(3, parseFloat((s + 0.2).toFixed(1))));
      } else if (e.key === '-') {
        e.preventDefault();
        setScale(s => Math.max(0.5, parseFloat((s - 0.2).toFixed(1))));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const nextWidth = Math.floor(container.clientWidth);
      console.debug("[AdminSmartBooks PDF] container width", nextWidth);
      setContainerWidth(nextWidth);
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    setLoading(true);
    setUseBlobFallback(false);
    setPdfObjectUrl(null);
  }, [proxiedUrl]);

  useEffect(() => {
    return () => {
      if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
    };
  }, [pdfObjectUrl]);

  useEffect(() => {
    if (!useBlobFallback) return;

    let cancelled = false;

    const fetchPdfBlob = async () => {
      setLoading(true);
      console.debug("[AdminSmartBooks PDF] blob fallback fetch start", { url: proxiedUrl });
      try {
        const response = await fetch(proxiedUrl, {
          credentials: "include",
        });
        const contentType = response.headers.get("content-type") || "";
        console.debug("[AdminSmartBooks PDF] blob fallback fetch response", {
          status: response.status,
          contentType,
        });

        const blob = await response.blob();
        console.debug("[AdminSmartBooks PDF] blob fallback loaded", {
          size: blob.size,
          type: blob.type,
        });

        if (!response.ok) {
          throw new Error(`PDF fetch failed: ${response.status} ${response.statusText}`);
        }

        if (!contentType.toLowerCase().includes("application/pdf") && !blob.type.toLowerCase().includes("application/pdf")) {
          console.warn("[AdminSmartBooks PDF] blob fallback unexpected content-type", {
            contentType,
            blobType: blob.type,
          });
        }

        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        setPdfObjectUrl(objectUrl);
      } catch (error) {
        console.error("[AdminSmartBooks PDF] blob fallback failed", {
          firstMessage: error instanceof Error ? error.message : String(error),
          error,
        });
        if (!cancelled) setLoading(false);
      }
    };

    fetchPdfBlob();

    return () => {
      cancelled = true;
    };
  }, [proxiedUrl, useBlobFallback]);

  useEffect(() => {
    console.debug("[AdminSmartBooks PDF] current page", currentPage);
  }, [currentPage]);

  const handleLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.debug("[AdminSmartBooks PDF] pdf load success", {
      numPages,
      url: pdfObjectUrl || proxiedUrl,
      source: pdfObjectUrl ? "blob-object-url" : "credentialed-url",
    });
    setLoading(false);
  }, [pdfObjectUrl, proxiedUrl]);

  const handleLoadError = useCallback((error: Error) => {
    console.error("[AdminSmartBooks PDF] pdf load failed", {
      firstMessage: error?.message || String(error),
      usingBlobFallback: useBlobFallback,
      url: pdfObjectUrl || proxiedUrl,
      error,
    });
    if (!useBlobFallback) {
      setUseBlobFallback(true);
      return;
    }
    setLoading(false);
  }, [pdfObjectUrl, proxiedUrl, useBlobFallback]);

  const handlePageRenderSuccess = useCallback(() => {
    console.debug("[AdminSmartBooks PDF] render success", {
      currentPage,
      containerWidth,
      renderWidth,
    });
  }, [containerWidth, currentPage, renderWidth]);

  // 驗證頁碼轉換：展示頁碼 = PDF 頁碼 - pageOffset
  const displayPage = currentPage - pageOffset;
  const displayTotal = totalPages - pageOffset;
  // 輸入展示頁碼時轉回 PDF 頁碼
  const goToDisplay = (displayP: number) => {
    const pdfPage = displayP + pageOffset;
    goTo(pdfPage);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gray-100">
      {/* 工具列 */}
      <div className="flex shrink-0 items-center gap-2 border-b bg-white p-2 text-sm">
        <Button variant="ghost" size="icon" onClick={() => goTo(currentPage - 1)} disabled={currentPage <= 1 + pageOffset}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={displayPage > 0 ? displayPage : ""}
            onChange={e => goToDisplay(parseInt(e.target.value) || 1)}
            className="w-16 h-7 text-center text-sm"
            min={1}
            max={displayTotal}
          />
          <span className="text-gray-500">/ {displayTotal > 0 ? displayTotal : totalPages}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => goTo(currentPage + 1)} disabled={currentPage >= totalPages}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        {onAdjustPages && (
          <button
            className="flex items-center gap-1 ml-2 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 text-xs text-amber-700 hover:bg-amber-100 whitespace-nowrap"
            onClick={() => {
              // 目前 PDF 頁碼設為書本第 1 頁
              // 新 pageOffset = currentPage - 1
              const newOffset = currentPage - 1;
              const delta = newOffset - pageOffset;
              if (delta !== 0) onAdjustPages(delta);
            }}
            title={`將 PDF 第 ${currentPage} 頁設為書本第 1 頁`}
          >
            📌 以此頁作為第1頁
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" className="w-8 h-8 p-0 text-lg font-bold" onClick={() => setScale(s => Math.max(0.5, parseFloat((s - 0.2).toFixed(1))))}>-</Button>
          <span className="text-xs text-gray-500 min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="sm" className="w-8 h-8 p-0 text-lg font-bold" onClick={() => setScale(s => Math.min(3, parseFloat((s + 0.2).toFixed(1))))}>+</Button>
        </div>
      </div>

      {/* PDF 畫布 - overflow-auto 確保縮放後可滾動 */}
      <div ref={containerRef} className="min-h-0 flex-1 overflow-auto">
        <div className="flex min-h-full justify-center overflow-visible p-4">
          {loading && (
            <div className="mt-20 flex items-center gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>載入 PDF 中...</span>
            </div>
          )}
          <Document
            file={documentFile}
            options={documentOptions}
            loading={null}
            onLoadSuccess={handleLoadSuccess}
            onLoadError={handleLoadError}
            className="flex justify-center"
          >
            {pageWidth > 0 && (
              <div className="overflow-visible bg-white shadow-lg">
                <Page
                  key={`${currentPage}-${renderWidth}`}
                  pageNumber={currentPage}
                  width={renderWidth}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  onRenderSuccess={handlePageRenderSuccess}
                  onRenderError={(error) => console.error("[AdminSmartBooks PDF] render failed", error)}
                  className="[&>canvas]:block [&>canvas]:max-w-none"
                />
              </div>
            )}
          </Document>
        </div>
      </div>
    </div>
  );
}

// ===== 章節編輯面板 =====
function ChapterEditor({
  bookId,
  totalPages,
  currentPdfPage,
  pageOffset,
  onJumpToPage,
  onRefresh,
}: {
  bookId: number;
  totalPages: number;
  currentPdfPage: number;
  pageOffset: number;
  onJumpToPage: (page: number) => void;
  onRefresh: () => void;
}) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.smartBookAdmin.getById.useQuery({ id: bookId });
  const updateChapter = trpc.smartBookAdmin.updateChapter.useMutation({
    onSuccess: () => { utils.smartBookAdmin.getById.invalidate({ id: bookId }); },
  });
  const addChapter = trpc.smartBookAdmin.addChapter.useMutation({
    onSuccess: () => {
      utils.smartBookAdmin.getById.invalidate({ id: bookId });
      toast.success("章節已新增");
    },
  });
  const deleteChapter = trpc.smartBookAdmin.deleteChapter.useMutation({
    onSuccess: () => {
      utils.smartBookAdmin.getById.invalidate({ id: bookId });
      toast.success("章節已刪除");
    },
  });

  const autoSplitChapter = trpc.smartBookAdmin.autoSplitChapter.useMutation({
    onSuccess: (result, vars) => {
      utils.smartBookAdmin.getById.invalidate({ id: bookId });
      toast.success(`AI 已成功拆分為 ${result.count} 個子主題！`);
      setSplittingId(null);
      setExpandedId(vars.chapterId);
    },
    onError: (err) => {
      toast.error(err.message || "AI 拆分失敗");
      setSplittingId(null);
    },
  });
  const generateQA = trpc.smartBookAdmin.generateChapterQA.useMutation({
    onSuccess: (data, vars) => {
      if (data.generated) {
        utils.smartBookAdmin.getById.invalidate({ id: bookId });
      }
    },
  });
  const [generatingQAId, setGeneratingQAId] = useState<number | null>(null);
  // AI 自動出題（選擇題）
  const [generatingQuizId, setGeneratingQuizId] = useState<number | null>(null);
  const [batchGeneratingQuiz, setBatchGeneratingQuiz] = useState(false);
  const [quizGenJobId, setQuizGenJobId] = useState<string | null>(null);
  const [quizGenProgress, setQuizGenProgress] = useState<{ current: number; total: number } | null>(null);
  const [isPollingQuizProgress, setIsPollingQuizProgress] = useState(false);
  const { data: quizAutoGenData, refetch: refetchQuizAutoGenProgress } = trpc.smartBookLearningAdmin.getAutoGenProgress.useQuery(
    { bookId },
    { enabled: isPollingQuizProgress, refetchInterval: isPollingQuizProgress ? 2000 : false }
  );
  const autoGenerateQuiz = trpc.smartBookLearningAdmin.autoGenerateAllChaptersQuiz.useMutation({
    onMutate: () => setIsPollingQuizProgress(true),
    onSuccess: (data) => {
      setGeneratingQuizId(null);
      setBatchGeneratingQuiz(false);
      setIsPollingQuizProgress(false);
      setQuizGenProgress(null);
      refetchQuizCounts();
      refetchQuestionCounts();
      refetchReviewQuizCounts();
      toast.success(`AI 出題任務已啟動！正在為 ${data.chaptersCount} 個章節生成選擇題，請稍後在「題目管理」查看結果。`);
    },
    onError: (err) => {
      setGeneratingQuizId(null);
      setBatchGeneratingQuiz(false);
      setIsPollingQuizProgress(false);
      setQuizGenProgress(null);
      toast.error('AI 出題失敗：' + err.message);
    },
  });
  // 取得各章節題目數量（學習腳本）
  const { data: quizCountsData, refetch: refetchQuizCounts } = trpc.smartBookLearningAdmin.getChapterQuizCounts.useQuery(
    { bookId },
    { staleTime: 30 * 1000 }
  );
  // 取得各章節選擇題數量（含子章節累計，與學生端一致）
  const { data: reviewQuizCountsData, refetch: refetchReviewQuizCounts } = trpc.smartBookLearningAdmin.getChapterReviewQuizCounts.useQuery(
    { bookId },
    { staleTime: 30 * 1000 }
  );
  // 單個 Q&A 自訂題數
  const [showQACountPicker, setShowQACountPicker] = useState<number | null>(null); // chapterId
  const [singleQACount, setSingleQACount] = useState(5);
  // 一鍵生成選擇題
  const [generatingQuestionsId, setGeneratingQuestionsId] = useState<number | null>(null);
  const generateChapterQuestions = trpc.smartBookAdmin.generateChapterQuestions.useMutation({
    onSuccess: (data, vars) => {
      setGeneratingQuestionsId(null);
      refetchQuestionCounts();
      refetchReviewQuizCounts();
      toast.success(`生成完成！新增 ${data.inserted} 題（共 ${data.total} 題）`);
    },
    onError: (err) => { setGeneratingQuestionsId(null); toast.error('生成失敗：' + err.message); },
  });
  const { data: questionCountsData, refetch: refetchQuestionCounts } = trpc.smartBookAdmin.getBookQuestionCounts.useQuery(
    { bookId },
    { staleTime: 30 * 1000 }
  );
  // 全書出題每章節題數
  const [questionsPerChapter, setQuestionsPerChapter] = useState(5);
  // 全書一鍵出題難度選擇（記住上次選擇）
  const [quizDifficulty, setQuizDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>(() => {
    return (localStorage.getItem('quizDifficulty') as any) || 'mixed';
  });
  const [showQuizDiffDialog, setShowQuizDiffDialog] = useState(false);
  // 單章節出題難度+題數選擇 Dialog
  const [showSingleChapterQuizDialog, setShowSingleChapterQuizDialog] = useState<{ chapterId: number; title: string } | null>(null);
  const [singleChapterQuizCount, setSingleChapterQuizCount] = useState<number>(() => {
    return parseInt(localStorage.getItem('singleChapterQuizCount') || '5', 10);
  });
  const [singleChapterQuizDifficulty, setSingleChapterQuizDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>(() => {
    return (localStorage.getItem('singleChapterQuizDifficulty') as any) || 'mixed';
  });
  // 章節快速預覽 Modal（點擊 N題 標籤）
  const [chapterQuizPreview, setChapterQuizPreview] = useState<{ chapterId: number; title: string } | null>(null);
  const { data: chapterPreviewData, isLoading: chapterPreviewLoading } = trpc.smartBookAdmin.getBookQuestions.useQuery(
    { bookId, chapterId: chapterQuizPreview?.chapterId },
    { enabled: !!chapterQuizPreview }
  );
  // 題目管理 Modal
  const [showQuizManager, setShowQuizManager] = useState(false);
  const [quizManagerSearch, setQuizManagerSearch] = useState('');
  const [quizManagerEditId, setQuizManagerEditId] = useState<number | null>(null);
  const [quizManagerEditData, setQuizManagerEditData] = useState<any>(null);
  const { data: allQuestionsData, refetch: refetchAllQuestions } = trpc.smartBookAdmin.getBookQuestions.useQuery(
    { bookId },
    { enabled: showQuizManager }
  );
  const updateQuestion = trpc.smartBookAdmin.updateQuestion.useMutation({
    onSuccess: () => { refetchAllQuestions(); setQuizManagerEditId(null); toast.success('已更新'); },
    onError: (err) => toast.error('更新失敗：' + err.message),
  });
  const deleteQuestion = trpc.smartBookAdmin.deleteQuestion.useMutation({
    onSuccess: () => { refetchAllQuestions(); toast.success('已刪除'); },
    onError: (err) => toast.error('刪除失敗：' + err.message),
  });
  // Q&A 管理介面
  const [showQAManager, setShowQAManager] = useState<{ chapterId: number; title: string } | null>(null);
  const { data: qaList, refetch: refetchQA } = trpc.smartBookAdmin.getChapterQA.useQuery(
    { bookId, chapterId: showQAManager?.chapterId ?? 0 },
    { enabled: !!showQAManager }
  );
  const updateQA = trpc.smartBookAdmin.updateQA.useMutation({
    onSuccess: () => { refetchQA(); toast.success("已更新"); setEditingQAId(null); },
    onError: (err) => toast.error("更新失敗：" + err.message),
  });
  const deleteQA = trpc.smartBookAdmin.deleteQA.useMutation({
    onSuccess: () => { refetchQA(); toast.success("已刪除"); },
    onError: (err) => toast.error("刪除失敗：" + err.message),
  });
  const [editingQAId, setEditingQAId] = useState<number | null>(null);
  const [editQAQuestion, setEditQAQuestion] = useState("");
  const [editQAAnswer, setEditQAAnswer] = useState("");
  const [showAddQAForm, setShowAddQAForm] = useState(false);
  const [newQAQuestion, setNewQAQuestion] = useState("");
  const [newQAAnswer, setNewQAAnswer] = useState("");
  const addQA = trpc.smartBookAdmin.addQA.useMutation({
    onSuccess: () => { refetchQA(); toast.success("已新增 QA"); setShowAddQAForm(false); setNewQAQuestion(""); setNewQAAnswer(""); },
    onError: (err) => toast.error("新增失敗：" + err.message),
  });
  const regenerateChapterQA = trpc.smartBookAdmin.regenerateChapterQA.useMutation({
    onSuccess: (data) => { refetchQA(); toast.success(`重新生成完成，共 ${data.count} 題`); },
    onError: (err) => toast.error("重新生成失敗：" + err.message),
  });

  const clearSubTopics = trpc.smartBookAdmin.clearSubTopics.useMutation({
    onSuccess: () => {
      utils.smartBookAdmin.getById.invalidate({ id: bookId });
      toast.success("已清除子主題");
    },
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStart, setEditStart] = useState(1);
  const [editEnd, setEditEnd] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newStart, setNewStart] = useState(1);
  const [newEnd, setNewEnd] = useState(10);
  const [newChapterNum, setNewChapterNum] = useState(1);
  const [splittingId, setSplittingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [clearConfirmId, setClearConfirmId] = useState<number | null>(null);

  const chapters = data?.chapters || [];
  // 只顯示主章節（無 parentChapterId）
  const mainChapters = chapters.filter((ch: any) => !ch.parentChapterId);
  // 取得某章節的子主題
  const getSubTopics = (chId: number) => chapters.filter((ch: any) => ch.parentChapterId === chId);

  // 書本印刷頁碼 = PDF頁碼 - pageOffset
  const displayPage = currentPdfPage - pageOffset;

  // 找出目前頁碼所在的章節（startPage/endPage 已是書本印刷頁碼）
  const currentChapter = chapters.find(
    ch => displayPage >= ch.startPage && displayPage <= ch.endPage
  );

  const startEdit = (ch: any) => {
    setEditingId(ch.id);
    setEditTitle(ch.title);
    setEditStart(ch.startPage);
    setEditEnd(ch.endPage);
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateChapter.mutate({
      id: editingId,
      title: editTitle,
      startPage: editStart,
      endPage: editEnd,
    });
    setEditingId(null);
  };

  const handleAdd = () => {
    addChapter.mutate({
      bookId,
      chapterNumber: newChapterNum,
      title: newTitle,
      startPage: newStart,
      endPage: newEnd,
    });
    setShowAddForm(false);
    setNewTitle("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* 目前頁碼提示 */}
      <div className="p-3 bg-blue-50 border-b text-sm">
        <div className="flex items-center justify-between">
          <span className="text-blue-700 font-medium">
            目前頁碼：第 {displayPage > 0 ? displayPage : 1} 頁
            <span className="text-xs text-gray-400 ml-1">(PDF第{currentPdfPage}頁)</span>
          </span>
          {currentChapter && (
            <Badge variant="secondary" className="text-xs">
              {currentChapter.title}
            </Badge>
          )}
        </div>
        {!currentChapter && (
          <p className="text-orange-600 text-xs mt-1">⚠️ 此頁尚未分配到任何章節</p>
        )}
      </div>

      {/* 章節列表 */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-2">
        {/* 全書一鍵批次出題 */}
        {chapters.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-green-700 font-medium">AI 自動出題</span>
              <div className="flex items-center gap-1.5">
                {/* 每章節題數選擇器 */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-green-600">每章</span>
                  <select
                    value={questionsPerChapter}
                    onChange={e => setQuestionsPerChapter(Number(e.target.value))}
                    className="h-7 text-xs border border-green-300 rounded px-1 bg-white text-green-700 focus:outline-none"
                    disabled={batchGeneratingQuiz || autoGenerateQuiz.isPending}
                  >
                    {[3, 5, 8, 10, 15, 20].map(n => (
                      <option key={n} value={n}>{n}題</option>
                    ))}
                  </select>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-green-700 border-green-400 hover:bg-green-100"
                  disabled={batchGeneratingQuiz || autoGenerateQuiz.isPending}
                  onClick={() => setShowQuizDiffDialog(true)}
                >
                  {batchGeneratingQuiz
                    ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />生成中...</>
                    : <><BookOpenCheck className="w-3 h-3 mr-1" />全書一鍵出題</>}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-blue-700 border-blue-300 hover:bg-blue-50"
                  onClick={() => navigate(`/admin/smart-books/${bookId}/quiz`)}
                  title="查看和管理全書選擇題"
                >
                  <Pencil className="w-3 h-3 mr-1" />題目管理
                </Button>
              </div>
            </div>
            {batchGeneratingQuiz && quizAutoGenData !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-green-600">
                  <span>已生成項目</span>
                  <span className="font-medium">{quizAutoGenData.count} 項</span>
                </div>
                <div className="w-full bg-green-200 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: chapters.length > 0 ? `${Math.min(100, Math.round(quizAutoGenData.count / (chapters.length * 3) * 100))}%` : '0%' }}
                  />
                </div>
                <p className="text-xs text-green-500">背景生成中，請稍候...</p>
              </div>
            )}
          </div>
        )}
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm p-4">
            <Loader2 className="w-4 h-4 animate-spin" />載入中...
          </div>
        ) : chapters.length === 0 ? (
          <div className="text-center text-gray-400 text-sm p-8">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>尚未偵測到章節</p>
            <p className="text-xs mt-1">可手動新增或重新處理書本</p>
          </div>
        ) : (
          mainChapters.map((ch: any) => {
            const subTopics = getSubTopics(ch.id);
            const hasSubs = subTopics.length > 0;
            const isExpanded = expandedId === ch.id;
            const isSplitting = splittingId === ch.id;
            const chPages = (ch.endPage || ch.startPage) - ch.startPage + 1;
            return (
              <div key={ch.id}>
                <div
                  className={`border rounded-lg p-3 transition-colors ${
                    currentChapter?.id === ch.id ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"
                  }`}
                >
                  {editingId === ch.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        placeholder="章節標題"
                        className="text-sm h-8"
                      />
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 whitespace-nowrap">起始頁</span>
                        <Input
                          type="number"
                          value={editStart}
                          onChange={e => setEditStart(parseInt(e.target.value) || 1)}
                          className="h-7 w-20 text-sm"
                          min={1}
                          max={totalPages}
                        />
                        <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setEditStart(currentPdfPage - pageOffset)}>
                          ← 當前({currentPdfPage - pageOffset})頁
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 whitespace-nowrap">結束頁</span>
                        <Input
                          type="number"
                          value={editEnd}
                          onChange={e => setEditEnd(parseInt(e.target.value) || 1)}
                          className="h-7 w-20 text-sm"
                          min={1}
                          max={totalPages}
                        />
                        <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setEditEnd(currentPdfPage - pageOffset)}>
                          ← 當前({currentPdfPage - pageOffset})頁
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-xs" onClick={saveEdit}>儲存</Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingId(null)}>取消</Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <button
                            className={`font-medium text-sm text-left w-full hover:text-blue-600 transition-colors ${ch.isEnabled === 0 ? 'text-gray-400 line-through' : ''}`}
                            onClick={() => onJumpToPage(ch.startPage)}
                            title="點擊跳到此章節"
                          >
                            {ch.title}
                          </button>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400">第 {ch.startPage}-{ch.endPage} 頁 ({chPages}頁)</span>
                            {ch.isEnabled === 0 && (
                              <Badge variant="outline" className="text-xs h-4 px-1 text-gray-400 border-gray-300">
                                已關閉
                              </Badge>
                            )}
                            {hasSubs && (
                              <Badge variant="secondary" className="text-xs h-4 px-1">
                                {subTopics.length} 子主題
                              </Badge>
                            )}
                            {ch.splitStatus === 'splitting' && (
                              <span className="text-xs text-orange-500 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" />拆分中
                              </span>
                            )}
                            {/* 選擇題題庫數量標籤（含子章節累計，可點擊預覽） */}
                            {reviewQuizCountsData?.counts[ch.id] != null && reviewQuizCountsData.counts[ch.id] > 0 && (
                              <button
                                className={`text-xs px-1.5 py-0.5 rounded shrink-0 cursor-pointer transition-colors ${
                                  reviewQuizCountsData.counts[ch.id] >= 10
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                }`}
                                onClick={() => setChapterQuizPreview({ chapterId: ch.id, title: ch.title })}
                                title="點擊預覽選擇題"
                              >
                                {reviewQuizCountsData.counts[ch.id]}題
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {hasSubs && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-500"
                              onClick={() => setExpandedId(isExpanded ? null : ch.id)}
                              title={isExpanded ? "收起子主題" : "展開子主題"}
                            >
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </Button>
                          )}
                          {chPages >= 3 && ch.splitStatus !== 'done' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-purple-500 hover:text-purple-700"
                              onClick={() => {
                                setSplittingId(ch.id);
                                autoSplitChapter.mutate({ chapterId: ch.id });
                              }}
                              disabled={isSplitting}
                              title={`AI 自動拆分此章節 (${chPages}頁)`}
                            >
                              {isSplitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            </Button>
                          )}
                          {ch.splitStatus === 'done' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-orange-400 hover:text-orange-600"
                              onClick={() => setClearConfirmId(ch.id)}
                              title="清除子主題，重新拆分"
                            >
                              <Scissors className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {/* AI 自動出選擇題（章節完成測驗用） */}
                          {!hasSubs && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-500 hover:text-emerald-700"
                              onClick={() => {
                                setShowSingleChapterQuizDialog({ chapterId: ch.id, title: ch.title });
                              }}
                              disabled={generatingQuestionsId === ch.id}
                              title="AI 出選擇題（可選難度與題數）"
                            >
                              {generatingQuestionsId === ch.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <BookOpenCheck className="w-3.5 h-3.5" />}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 ${ch.isEnabled !== 0 ? 'text-green-500 hover:text-green-700' : 'text-gray-300 hover:text-gray-500'}`}
                            onClick={() => updateChapter.mutate({ id: ch.id, isEnabled: ch.isEnabled === 0 })}
                            title={ch.isEnabled !== 0 ? '點擊關閉（學生看不到）' : '點擊開放（學生可看）'}
                          >
                            {ch.isEnabled !== 0 ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(ch)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600"
                            onClick={() => deleteChapter.mutate({ id: ch.id })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* 子主題列表 */}
                {hasSubs && isExpanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {subTopics.map((st: any) => (
                      <div
                        key={st.id}
                        className="border border-dashed border-purple-200 rounded-lg p-2 bg-purple-50 flex items-center justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <button
                              className="text-xs font-medium text-left hover:text-purple-700 text-purple-800 truncate"
                              onClick={() => onJumpToPage(st.startPage)}
                            >
                              {st.title}
                            </button>
                            {reviewQuizCountsData?.counts[st.id] != null && reviewQuizCountsData.counts[st.id] > 0 && (
                              <button
                                className={`text-xs px-1 py-0.5 rounded shrink-0 cursor-pointer hover:opacity-80 transition-opacity ${
                                  reviewQuizCountsData.counts[st.id] >= 10
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                }`}
                                onClick={() => setChapterQuizPreview({ chapterId: st.id, title: st.title })}
                                title="點擊預覽選擇題"
                              >
                                {reviewQuizCountsData.counts[st.id]}題
                              </button>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">第 {st.startPage}-{st.endPage} 頁</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-amber-500 hover:text-amber-700 shrink-0"
                          onClick={() => { setShowQACountPicker(st.id); setSingleQACount(5); }}
                          disabled={generatingQAId === st.id}
                          title="生成知識點 Q&A"
                        >
                          {generatingQAId === st.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <MessageSquare className="w-3 h-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-green-500 hover:text-green-700 shrink-0"
                          onClick={() => {
                            setShowSingleChapterQuizDialog({ chapterId: st.id, title: st.title });
                          }}
                          disabled={generatingQuestionsId === st.id}
                          title="AI 出選擇題（可選難度與題數）"
                        >
                          {generatingQuestionsId === st.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <BookOpenCheck className="w-3 h-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-blue-400 hover:text-blue-600 shrink-0"
                          onClick={() => setShowQAManager({ chapterId: st.id, title: st.title })}
                          title="查看/管理 Q&A"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-400 hover:text-red-600 shrink-0"
                          onClick={() => deleteChapter.mutate({ id: st.id })}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 新增章節表單 */}
      {showAddForm && (
        <div className="border-t p-3 bg-gray-50 space-y-2">
          <p className="text-sm font-medium text-gray-700">新增章節</p>
          <div className="flex gap-2">
            <Input
              type="number"
              value={newChapterNum}
              onChange={e => setNewChapterNum(parseInt(e.target.value) || 1)}
              placeholder="章號"
              className="h-8 w-16 text-sm"
            />
            <Input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="章節標題"
              className="h-8 text-sm flex-1"
            />
          </div>
          <div className="flex gap-2 text-sm items-center">
            <span className="text-gray-500 text-xs">起始</span>
            <Input type="number" value={newStart} onChange={e => setNewStart(parseInt(e.target.value) || 1)} className="h-7 w-20 text-sm" />
            <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setNewStart(currentPdfPage)}>← 當前</Button>
            <span className="text-gray-500 text-xs">結束</span>
            <Input type="number" value={newEnd} onChange={e => setNewEnd(parseInt(e.target.value) || 1)} className="h-7 w-20 text-sm" />
            <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setNewEnd(currentPdfPage)}>← 當前</Button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={!newTitle}>新增</Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAddForm(false)}>取消</Button>
          </div>
        </div>
      )}

      {/* 底部操作列 */}
      <div className="border-t p-3 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          新增章節
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={onRefresh}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* 單個 Q&A 題數選擇 Dialog */}
      {showQACountPicker !== null && (
        <Dialog open onOpenChange={() => setShowQACountPicker(null)}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-sm">選擇生成題數</DialogTitle>
            </DialogHeader>
            <div className="flex gap-2 mt-2">
              {[3, 5, 10].map(n => (
                <button
                  key={n}
                  onClick={() => setSingleQACount(n)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    singleQACount === n
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-white text-gray-600 border-gray-200 hover:border-amber-300"
                  }`}
                >
                  {n} 題
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">自訂：
              <input
                type="number" min={1} max={20} value={singleQACount}
                onChange={e => setSingleQACount(Math.min(20, Math.max(1, parseInt(e.target.value) || 5)))}
                className="ml-1 w-12 border rounded px-1 text-center text-xs"
              />
            </p>
            <DialogFooter className="mt-3">
              <Button variant="outline" size="sm" onClick={() => setShowQACountPicker(null)}>取消</Button>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => {
                  const chId = showQACountPicker;
                  setShowQACountPicker(null);
                  setGeneratingQAId(chId);
                  generateQA.mutate(
                    { bookId, chapterId: chId, questionCount: singleQACount },
                    { onSettled: () => setGeneratingQAId(null) }
                  );
                }}
              >
                開始生成
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Q&A 管理 Dialog */}
      {showQAManager && (
        <Dialog open onOpenChange={() => { setShowQAManager(null); setEditingQAId(null); }}>
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <Eye className="w-4 h-4 text-blue-500" />
                Q&A 管理：{showQAManager.title}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-3 mt-2 pr-1">
              {!qaList || qaList.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">尚未生成 Q&A，請點擊左側 💬 按鈕生成</p>
              ) : (
                qaList.map((qa: any) => (
                  <div key={qa.id} className="border rounded-lg p-3 space-y-2">
                    {editingQAId === qa.id ? (
                      <>
                        <div>
                          <Label className="text-xs text-gray-500">問題</Label>
                          <Textarea
                            value={editQAQuestion}
                            onChange={e => setEditQAQuestion(e.target.value)}
                            className="mt-1 text-sm min-h-[60px]"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">答案</Label>
                          <Textarea
                            value={editQAAnswer}
                            onChange={e => setEditQAAnswer(e.target.value)}
                            className="mt-1 text-sm min-h-[100px]"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => setEditingQAId(null)}>取消</Button>
                          <Button
                            size="sm"
                            onClick={() => updateQA.mutate({ qaId: qa.id, question: editQAQuestion, answer: editQAAnswer })}
                            disabled={updateQA.isPending}
                          >
                            {updateQA.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "儲存"}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-800 flex-1">Q: {qa.question}</p>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="icon" variant="ghost"
                              className="h-6 w-6 text-gray-400 hover:text-blue-500"
                              onClick={() => { setEditingQAId(qa.id); setEditQAQuestion(qa.question); setEditQAAnswer(qa.answer); }}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon" variant="ghost"
                              className="h-6 w-6 text-gray-400 hover:text-red-500"
                              onClick={() => deleteQA.mutate({ qaId: qa.id })}
                              disabled={deleteQA.isPending}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 bg-gray-50 rounded p-2">A: {qa.answer}</p>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
            {/* 新增 QA 表單 */}
            {showAddQAForm ? (
              <div className="border-t pt-3 mt-2 space-y-2">
                <p className="text-xs font-medium text-gray-600">新增問答</p>
                <div>
                  <Label className="text-xs text-gray-500">問題</Label>
                  <Textarea value={newQAQuestion} onChange={e => setNewQAQuestion(e.target.value)} className="mt-1 text-sm min-h-[50px]" placeholder="請輸入問題..." />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">答案</Label>
                  <Textarea value={newQAAnswer} onChange={e => setNewQAAnswer(e.target.value)} className="mt-1 text-sm min-h-[80px]" placeholder="請輸入答案..." />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => { setShowAddQAForm(false); setNewQAQuestion(''); setNewQAAnswer(''); }}>取消</Button>
                  <Button
                    size="sm"
                    onClick={() => addQA.mutate({ bookId, chapterId: showQAManager.chapterId, question: newQAQuestion, answer: newQAAnswer })}
                    disabled={addQA.isPending || !newQAQuestion.trim() || !newQAAnswer.trim()}
                  >
                    {addQA.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : '儲存'}
                  </Button>
                </div>
              </div>
            ) : null}
            <DialogFooter className="mt-3 flex-wrap gap-2">
              <p className="text-xs text-gray-400 mr-auto">共 {qaList?.length ?? 0} 題</p>
              <Button
                size="sm" variant="outline"
                onClick={() => setShowAddQAForm(v => !v)}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                + 新增 QA
              </Button>
              <Button
                size="sm" variant="outline"
                onClick={() => regenerateChapterQA.mutate({ bookId, chapterId: showQAManager.chapterId, count: 5 })}
                disabled={regenerateChapterQA.isPending}
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                {regenerateChapterQA.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                重新生成
              </Button>
              <Button variant="outline" onClick={() => { setShowQAManager(null); setEditingQAId(null); setShowAddQAForm(false); }}>關閉</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 全書一鍵出題 難度選擇 Dialog */}
      {showQuizDiffDialog && (
        <Dialog open onOpenChange={() => setShowQuizDiffDialog(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpenCheck className="w-5 h-5 text-green-600" />
                全書一鍵出題
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">考題難度</p>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { value: 'easy' as const, label: '簡單', activeClass: 'bg-green-500 text-white border-green-500', inactiveClass: 'bg-green-50 border-green-300 text-green-700', desc: '基礎概念' },
                    { value: 'medium' as const, label: '中等', activeClass: 'bg-yellow-500 text-white border-yellow-500', inactiveClass: 'bg-yellow-50 border-yellow-300 text-yellow-700', desc: '理解應用' },
                    { value: 'hard' as const, label: '困難', activeClass: 'bg-red-500 text-white border-red-500', inactiveClass: 'bg-red-50 border-red-300 text-red-700', desc: '深度分析' },
                    { value: 'mixed' as const, label: '混合', activeClass: 'bg-purple-500 text-white border-purple-500', inactiveClass: 'bg-purple-50 border-purple-300 text-purple-700', desc: '易中難均衡' },
                  ]).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setQuizDifficulty(opt.value); localStorage.setItem('quizDifficulty', opt.value); }}
                      className={`flex flex-col items-center py-2 px-1 rounded-lg border-2 text-xs font-medium transition-all ${
                        quizDifficulty === opt.value ? opt.activeClass : opt.inactiveClass
                      }`}
                    >
                      <span className="font-bold">{opt.label}</span>
                      <span className="text-[10px] opacity-80 mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500">• 選擇會自動記住，下次開啟時自動帶入</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQuizDiffDialog(false)}>取消</Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  setShowQuizDiffDialog(false);
                  setBatchGeneratingQuiz(true);
                  autoGenerateQuiz.mutate({ bookId, replaceExisting: false, questionsPerChapter, difficulty: quizDifficulty });
                }}
              >
                確定開始
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {/* 單章節出題 難度+題數選擇 Dialog */}
      {showSingleChapterQuizDialog && (
        <Dialog open onOpenChange={() => setShowSingleChapterQuizDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpenCheck className="w-5 h-5 text-emerald-600" />
                <span className="truncate">{showSingleChapterQuizDialog.title}</span>
              </DialogTitle>
              <p className="text-xs text-gray-500 mt-1">AI 出選擇題</p>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {/* 題數選擇 */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">出題數量</p>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5 flex-wrap">
                    {[3, 5, 8, 10, 15, 20].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => { setSingleChapterQuizCount(n); localStorage.setItem('singleChapterQuizCount', String(n)); }}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                          singleChapterQuizCount === n
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                        }`}
                      >
                        {n} 題
                      </button>
                    ))}
                  </div>
                  <input
                    type="number" min={1} max={30} value={singleChapterQuizCount}
                    onChange={e => { const v = Math.min(30, Math.max(1, parseInt(e.target.value) || 5)); setSingleChapterQuizCount(v); localStorage.setItem('singleChapterQuizCount', String(v)); }}
                    className="ml-1 w-12 border rounded px-1 text-center text-xs h-7"
                  />
                </div>
              </div>
              {/* 難度選擇 */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">考題難度</p>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { value: 'easy' as const, label: '簡單', activeClass: 'bg-green-500 text-white border-green-500', inactiveClass: 'bg-green-50 border-green-300 text-green-700', desc: '基礎概念' },
                    { value: 'medium' as const, label: '中等', activeClass: 'bg-yellow-500 text-white border-yellow-500', inactiveClass: 'bg-yellow-50 border-yellow-300 text-yellow-700', desc: '理解應用' },
                    { value: 'hard' as const, label: '困難', activeClass: 'bg-red-500 text-white border-red-500', inactiveClass: 'bg-red-50 border-red-300 text-red-700', desc: '深度分析' },
                    { value: 'mixed' as const, label: '混合', activeClass: 'bg-purple-500 text-white border-purple-500', inactiveClass: 'bg-purple-50 border-purple-300 text-purple-700', desc: '易中難均衡' },
                  ]).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setSingleChapterQuizDifficulty(opt.value); localStorage.setItem('singleChapterQuizDifficulty', opt.value); }}
                      className={`flex flex-col items-center py-2 px-1 rounded-lg border-2 text-xs font-medium transition-all ${
                        singleChapterQuizDifficulty === opt.value ? opt.activeClass : opt.inactiveClass
                      }`}
                    >
                      <span className="font-bold">{opt.label}</span>
                      <span className="text-[10px] opacity-80 mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500">• 選擇會自動記住，下次開啟時自動帶入</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSingleChapterQuizDialog(null)}>取消</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={generateChapterQuestions.isPending}
                onClick={() => {
                  const { chapterId } = showSingleChapterQuizDialog!;
                  setShowSingleChapterQuizDialog(null);
                  setGeneratingQuestionsId(chapterId);
                  generateChapterQuestions.mutate({
                    bookId,
                    chapterId,
                    count: singleChapterQuizCount,
                    difficulty: singleChapterQuizDifficulty,
                    forceRegenerate: false,
                  });
                }}
              >
                {generateChapterQuestions.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />生成中...</> : '確定開始'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {/* 題目管理 Modal */}
      {showQuizManager && (
        <Dialog open onOpenChange={(open) => { if (!open) { setShowQuizManager(false); setQuizManagerEditId(null); } }}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpenCheck className="w-5 h-5 text-blue-600" />
                全書選擇題管理
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                placeholder="搜尋題目..."
                value={quizManagerSearch}
                onChange={e => setQuizManagerSearch(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <Button size="sm" variant="outline" onClick={() => refetchAllQuestions()} className="text-blue-600 border-blue-200">
                <RefreshCw className="w-4 h-4 mr-1" />重新整理
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1">
              {!allQuestionsData ? (
                <div className="text-center py-8 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />載入中...
                </div>
              ) : allQuestionsData.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <BookOpenCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>尚無選擇題，請先使用「全書一鍵出題」</p>
                </div>
              ) : (() => {
                const filtered = allQuestionsData.filter(q =>
                  !quizManagerSearch ||
                  q.question.toLowerCase().includes(quizManagerSearch.toLowerCase()) ||
                  (q.options as string[]).some(o => o.toLowerCase().includes(quizManagerSearch.toLowerCase()))
                );
                const grouped = filtered.reduce((acc: Record<number, typeof filtered>, q) => {
                  if (!acc[q.chapterId]) acc[q.chapterId] = [];
                  acc[q.chapterId].push(q);
                  return acc;
                }, {});
                return Object.entries(grouped).map(([chIdStr, qs]) => {
                  const chId = parseInt(chIdStr);
                  const chapter = chapters.find((c: any) => c.id === chId);
                  return (
                    <div key={chId} className="border rounded-lg overflow-hidden">
                      <div className="bg-blue-50 px-3 py-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-800">{chapter ? chapter.title : `章節 #${chId}`}</span>
                        <span className="text-xs text-blue-500">{qs.length} 題</span>
                      </div>
                      <div className="divide-y">
                        {qs.map((q, idx) => (
                          <div key={q.id} className="p-3">
                            {quizManagerEditId === q.id ? (
                              <div className="space-y-2">
                                <div>
                                  <label className="text-xs text-gray-500 mb-1 block">題目</label>
                                  <textarea
                                    value={quizManagerEditData?.question ?? ''}
                                    onChange={e => setQuizManagerEditData((d: any) => ({ ...d, question: e.target.value }))}
                                    className="w-full border rounded px-2 py-1 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-300"
                                    rows={2}
                                  />
                                </div>
                                {[0,1,2,3].map(i => (
                                  <div key={i} className="flex items-center gap-2">
                                    <button
                                      onClick={() => setQuizManagerEditData((d: any) => ({ ...d, correctIndex: i }))}
                                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                                        quizManagerEditData?.correctIndex === i ? 'border-green-500 bg-green-500' : 'border-gray-300'
                                      }`}
                                      title="設為正確答案"
                                    />
                                    <input
                                      value={(quizManagerEditData?.options as string[])?.[i] ?? ''}
                                      onChange={e => setQuizManagerEditData((d: any) => {
                                        const opts = [...(d.options as string[])];
                                        opts[i] = e.target.value;
                                        return { ...d, options: opts };
                                      })}
                                      className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                                      placeholder={`選項 ${String.fromCharCode(65+i)}`}
                                    />
                                  </div>
                                ))}
                                <div>
                                  <label className="text-xs text-gray-500 mb-1 block">解析提示（可空）</label>
                                  <textarea
                                    value={quizManagerEditData?.hint ?? ''}
                                    onChange={e => setQuizManagerEditData((d: any) => ({ ...d, hint: e.target.value }))}
                                    className="w-full border rounded px-2 py-1 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-300"
                                    rows={2}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() => updateQuestion.mutate({
                                      questionId: q.id,
                                      question: quizManagerEditData.question,
                                      options: quizManagerEditData.options,
                                      correctIndex: quizManagerEditData.correctIndex,
                                      hint: quizManagerEditData.hint,
                                    })}
                                    disabled={updateQuestion.isPending}
                                  >
                                    {updateQuestion.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : '儲存'}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setQuizManagerEditId(null)}>取消</Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start gap-2 mb-1">
                                    <p className="text-sm font-medium text-gray-800 flex-1">{idx+1}. {q.question}</p>
                                    {q.difficulty && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 font-medium ${
                                        q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                        q.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                                        'bg-yellow-100 text-yellow-700'
                                      }`}>
                                        {q.difficulty === 'easy' ? '簡單' : q.difficulty === 'hard' ? '困難' : '中度'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-0.5">
                                    {(q.options as string[]).map((opt, i) => (
                                        <p key={i} className={`text-xs px-2 py-0.5 rounded ${
                                        i === q.correctIndex ? 'bg-green-100 text-green-700 font-medium' : 'text-gray-500'
                                      }`}>
                                        {String.fromCharCode(65+i)}. {stripOptionPrefix(opt)}
                                      </p>
                                    ))}
                                  </div>
                                  {q.hint && <p className="text-xs text-blue-500 mt-1">解析：{q.hint}</p>}
                                </div>
                                <div className="flex flex-col gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => { setQuizManagerEditId(q.id); setQuizManagerEditData({ question: q.question, options: q.options, correctIndex: q.correctIndex, hint: q.hint ?? '' }); }}
                                    className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                    title="編輯"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => { if (confirm('確定刪除此題？')) deleteQuestion.mutate({ questionId: q.id }); }}
                                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                                    title="刪除"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            <DialogFooter className="mt-4 border-t pt-3">
              <div className="flex items-center gap-2 text-xs text-gray-500 mr-auto">
                共 {allQuestionsData?.length ?? 0} 題選擇題
              </div>
              <Button variant="outline" onClick={() => setShowQuizManager(false)}>關閉</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 章節題目快速預覽 Modal */}
      {chapterQuizPreview && (
        <Dialog open onOpenChange={(open) => { if (!open) setChapterQuizPreview(null); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <BookOpenCheck className="w-4 h-4 text-blue-600" />
                {chapterQuizPreview.title}
                <span className="text-sm font-normal text-gray-500 ml-1">題目預覽</span>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto mt-2 space-y-3 pr-1">
              {chapterPreviewLoading ? (
                <div className="text-center py-8 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />載入中...
                </div>
              ) : !chapterPreviewData || chapterPreviewData.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <BookOpenCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>尚無選擇題，請先出題</p>
                </div>
              ) : (
                chapterPreviewData.map((q, idx) => (
                  <div key={q.id} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-start gap-2 mb-2">
                      <p className="text-sm font-medium text-gray-800 flex-1">{idx+1}. {q.question}</p>
                      {q.difficulty && (
                        <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 font-medium ${
                          q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                          q.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {q.difficulty === 'easy' ? '簡單' : q.difficulty === 'hard' ? '困難' : '中度'}
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5 mb-2">
                      {(q.options as string[]).map((opt, i) => (
                        <p key={i} className={`text-xs px-2 py-0.5 rounded ${
                          i === q.correctIndex ? 'bg-green-100 text-green-700 font-medium' : 'text-gray-500'
                        }`}>
                          {String.fromCharCode(65+i)}. {opt.replace(/^[A-D][.)．）]s*/,'')}
                        </p>
                      ))}
                    </div>
                    {q.hint && <p className="text-xs text-blue-500">解析：{q.hint}</p>}
                  </div>
                ))
              )}
            </div>
            <DialogFooter className="mt-3 border-t pt-3">
              <div className="text-xs text-gray-500 mr-auto">
                共 {chapterPreviewData?.length ?? 0} 題選擇題
                {chapterPreviewData && chapterPreviewData.length > 0 && (
                  <span className="ml-2">
                    簡單 {chapterPreviewData.filter(q => q.difficulty === 'easy').length} /
                    中度 {chapterPreviewData.filter(q => !q.difficulty || q.difficulty === 'medium').length} /
                    困難 {chapterPreviewData.filter(q => q.difficulty === 'hard').length}
                  </span>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => { setChapterQuizPreview(null); navigate(`/admin/smart-books/${bookId}/quiz`); }}>
                全書管理
              </Button>
              <Button variant="outline" onClick={() => setChapterQuizPreview(null)}>關閉</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 清除子主題確認 */}
      <AlertDialog open={!!clearConfirmId} onOpenChange={() => setClearConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認清除子主題？</AlertDialogTitle>
            <AlertDialogDescription>
              清除後，此章節的所有子主題將被刪除（包含對應的知識點與學習進度），且無法復原。確定要清除並重新拆分嗎？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => {
                if (clearConfirmId) clearSubTopics.mutate({ chapterId: clearConfirmId });
                setClearConfirmId(null);
              }}
            >
              確認清除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ===== 書本設定對話框 =====
function BookSettingsDialog({
  book,
  open,
  onClose,
}: {
  book: any;
  open: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const updateBook = trpc.smartBookAdmin.update.useMutation({
    onSuccess: () => {
      utils.smartBookAdmin.list.invalidate();
      toast.success("設定已儲存");
      onClose();
    },
  });

  const [title, setTitle] = useState(book?.title || "");
  const [author, setAuthor] = useState(book?.author || "");
  const [isPublic, setIsPublic] = useState(!!book?.isPublic);
  const [purchaseUrl, setPurchaseUrl] = useState(book?.purchaseUrl || "");
  const [pageOffset, setPageOffset] = useState(book?.pageOffset || 0);
  const [hasPageNumbers, setHasPageNumbers] = useState(book?.hasPageNumbers !== 0);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(book?.coverImageUrl || null);
  const [clearCover, setClearCover] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [unlockCredits, setUnlockCredits] = useState<string>(""); // 空字串 = 沖用全域預設
  const [unlockValidDays, setUnlockValidDays] = useState<string>(""); // 空字串 = 永久有效
  const [bookLanguage, setBookLanguage] = useState<"zh" | "en">((book as any)?.language || "zh");
  const [purchaseGiftCredits, setPurchaseGiftCredits] = useState<string>(String((book as any)?.purchaseGiftCredits ?? 0));
  const [contentType, setContentType] = useState<"book" | "handout">((book as any)?.contentType || "book");
  const [memberJoinUrl, setMemberJoinUrl] = useState<string>((book as any)?.memberJoinUrl || "");

  // 讀取書本點數設定
  const settingsQuery = trpc.smartBookLearningAdmin.getSettings.useQuery(
    { bookId: book?.id },
    { enabled: !!book?.id }
  );
  const updateSettingsMutation = trpc.smartBookLearningAdmin.updateSettings.useMutation();

  useEffect(() => {
    if (book) {
      setTitle(book.title || "");
      setAuthor(book.author || "");
      setIsPublic(!!book.isPublic);
      setPurchaseUrl(book.purchaseUrl || "");
      setPageOffset(book.pageOffset || 0);
      setHasPageNumbers(book.hasPageNumbers !== 0);
      setCoverPreview(book.coverImageUrl || null);
      setCoverFile(null);
      setClearCover(false);
      setBookLanguage((book as any).language || "zh");
      setPurchaseGiftCredits(String((book as any)?.purchaseGiftCredits ?? 0));
      setContentType((book as any)?.contentType || "book");
      setMemberJoinUrl((book as any)?.memberJoinUrl || "");
    }
  }, [book]);

  useEffect(() => {
    if (settingsQuery.data) {
      const uc = settingsQuery.data.unlockCredits;
      setUnlockCredits(uc !== null && uc !== undefined ? String(uc) : "");
      const uvd = (settingsQuery.data as any).unlockValidDays;
      setUnlockValidDays(uvd !== null && uvd !== undefined ? String(uvd) : "");
    }
  }, [settingsQuery.data]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setCoverPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setUploadingCover(true);
    try {
      let coverBase64: string | undefined;
      let coverFileName: string | undefined;
      if (coverFile) {
        const buffer = await coverFile.arrayBuffer();
        coverBase64 = btoa(new Uint8Array(buffer).reduce((d, b) => d + String.fromCharCode(b), ""));
        coverFileName = coverFile.name;
      }
      // 同時更新書本點數設定
      const unlockCreditsNum = unlockCredits.trim() === "" ? null : parseInt(unlockCredits);
      const unlockValidDaysNum = unlockValidDays.trim() === "" ? null : parseInt(unlockValidDays);
      const settingsPayload: any = { bookId: book.id };
      if (unlockCreditsNum !== null && !isNaN(unlockCreditsNum)) settingsPayload.unlockCredits = unlockCreditsNum;
      else settingsPayload.unlockCredits = null;
      if (unlockValidDaysNum !== null && !isNaN(unlockValidDaysNum)) settingsPayload.unlockValidDays = unlockValidDaysNum;
      else settingsPayload.unlockValidDays = null;
      updateSettingsMutation.mutate(settingsPayload);
      updateBook.mutate({
        id: book.id,
        title: title.trim() || undefined,
        author: author.trim() || undefined,
        isPublic,
        purchaseUrl,
        pageOffset,
        hasPageNumbers,
        coverBase64,
        coverFileName,
        clearCover: clearCover && !coverFile ? true : undefined,
        language: bookLanguage,
        purchaseGiftCredits: parseInt(purchaseGiftCredits) || 0,
        contentType,
        memberJoinUrl: memberJoinUrl.trim() || undefined,
      });
    } finally {
      setUploadingCover(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>書本設定 — {book?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
          {/* 書名 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">書名</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="輸入書名"
            />
          </div>
          {/* 作者名 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">作者名</label>
            <input
              type="text"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="輸入作者名（選填）"
            />
          </div>
          {/* 公開開關 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">公開書本</p>
              <p className="text-xs text-gray-500">開啟後學生可在智能書本頁面看到此書</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>



          {/* 封面圖片 */}
          <div>
            <Label className="text-sm font-medium">封面圖片</Label>
            <div className="mt-2 flex items-start gap-3">
              {/* 預覽 */}
              <div className="w-20 h-28 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200 flex-shrink-0">
                {coverPreview ? (
                  <img src={coverPreview} alt="封面預覽" className="w-full h-full object-cover" />
                ) : (
                  <BookOpen className="w-8 h-8 text-gray-300" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => document.getElementById(`settings-cover-${book?.id}`)?.click()}
                >
                  <Upload className="w-3 h-3 mr-1" />
                  {coverFile ? "更換圖片" : "上傳封面"}
                </Button>
                {coverPreview && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-red-500"
                    onClick={() => { setCoverFile(null); setCoverPreview(null); setClearCover(true); }}
                  >
                    移除封面
                  </Button>
                )}
                {coverFile && (
                  <p className="text-xs text-gray-500 truncate max-w-[140px]">{coverFile.name}</p>
                )}
                <input
                  id={`settings-cover-${book?.id}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverChange}
                />
              </div>
            </div>
          </div>

          {/* 是否有頁碼 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">書本有印刷頁碼</p>
              <p className="text-xs text-gray-500">關閉則 AI 改用「請翻到『章節名稱』」引導學生翻書</p>
            </div>
            <Switch checked={hasPageNumbers} onCheckedChange={setHasPageNumbers} />
          </div>

          {/* 頁碼偏移 */}
          <div>
            <Label className="text-sm font-medium">頁碼偏移</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                value={pageOffset}
                onChange={e => setPageOffset(parseInt(e.target.value) || 0)}
                className="w-24 text-sm"
                min={0}
                max={20}
              />
              <span className="text-xs text-gray-500">頁（封面/目錄不計頁碼時設為 1 或 2）</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">例：封面佔 1 頁，書本第 1 頁實際是 PDF 第 2 頁，設為 1</p>
          </div>

          {/* 內容類型 */}
          <div>
            <Label className="text-sm font-medium">內容類型</Label>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setContentType("book")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  contentType === "book"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                📚 書本
              </button>
              <button
                type="button"
                onClick={() => setContentType("handout")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  contentType === "handout"
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                📋 講義
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {contentType === "book" ? "書本：學生需輸入購書憑證才能使用" : "講義：學生需輸入學員編號才能使用"}
            </p>
          </div>

          {/* 書本語言 */}
          <div>
            <Label className="text-sm font-medium">書本語言</Label>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setBookLanguage("zh")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  bookLanguage === "zh"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                🇨🇳 中文書本
              </button>
              <button
                type="button"
                onClick={() => setBookLanguage("en")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  bookLanguage === "en"
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                🇺🇸 英文書本
              </button>
            </div>
            {bookLanguage === "en" && (
              <p className="text-xs text-green-600 mt-1">✅ AI 將用中文講解英文單字，並以英文語音朜讀例句</p>
            )}
          </div>

          {/* 購書憑證贈點數 */}
          <div>
            <Label className="text-sm font-medium">購書憑證贈點數</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                min="0"
                max="9999"
                value={purchaseGiftCredits}
                onChange={e => setPurchaseGiftCredits(e.target.value)}
                placeholder="0"
                className="w-40 text-sm"
              />
              <span className="text-xs text-gray-500">點</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">學生輸入購書憑證後贈送的點數（設為 0 則不贈點，每人每本只能兌換一次）</p>
          </div>

          {/* 購書連結（書本用） */}
          {contentType === "book" && (
          <div>
            <Label className="text-sm font-medium">購書連結</Label>
            <Input
              value={purchaseUrl}
              onChange={e => setPurchaseUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">提供給學生的購書連結（可不填）</p>
          </div>
          )}

          {/* 加入會員連結（講義用） */}
          {contentType === "handout" && (
          <div>
            <Label className="text-sm font-medium">加入會員連結</Label>
            <Input
              value={memberJoinUrl}
              onChange={e => setMemberJoinUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">學生點擊後可前往加入公司會員系統取得學員編號（可不填）</p>
          </div>
          )}

          {/* 首次解鎖贈點數 */}
          <div>
            <Label className="text-sm font-medium">首次解鎖贈點數</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                min="0"
                max="9999"
                value={unlockCredits}
                onChange={e => setUnlockCredits(e.target.value)}
                placeholder="留空 = 沿用全域預設"
                className="w-40 text-sm"
              />
              <span className="text-xs text-gray-500">點</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">學生首次進入此書時自動贈送。留空表示沖用系統全域預設（50 點），設為 0 則不贈點</p>
          </div>
          {/* 贈點有效天數 */}
          <div>
            <Label className="text-sm font-medium">贈點有效天數</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                min="0"
                max="365"
                value={unlockValidDays}
                onChange={e => setUnlockValidDays(e.target.value)}
                placeholder="留空 = 永久有效"
                className="w-40 text-sm"
              />
              <span className="text-xs text-gray-500">天</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">贈點從首次解鎖起算，超過有效天數後自動歸零。留空表示永久有效</p>
          </div>
        </div>
        <DialogFooter className="shrink-0 border-t pt-3 mt-0">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button onClick={handleSave} disabled={updateBook.isPending || uploadingCover}>
            {(updateBook.isPending || uploadingCover) ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            儲存設定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== 上傳書本對話框（含大綱預覽步驟）=====
type OutlineChapter = {
  chapterNumber: number;
  title: string;
  startPage: number;
  endPage: number;
  sortOrder: number;
};

async function fileToBase64(file: File): Promise<{ base64: string; fileName: string }> {
  const isWordFile = file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx');
  if (isWordFile) {
    const formData = new FormData();
    formData.append('file', file);
    const convRes = await fetch('/api/convert/word-to-pdf', { method: 'POST', body: formData, credentials: 'include' });
    if (!convRes.ok) {
      const err = await convRes.json().catch(() => ({ error: '轉換失敗' }));
      throw new Error(err.error || 'Word 轉 PDF 失敗');
    }
    const convData = await convRes.json();
    const pdfRes = await fetch(convData.pdfUrl);
    const pdfBuf = await pdfRes.arrayBuffer();
    return { base64: btoa(new Uint8Array(pdfBuf).reduce((d, b) => d + String.fromCharCode(b), '')), fileName: convData.pdfFileName };
  }
  const buf = await file.arrayBuffer();
  return { base64: btoa(new Uint8Array(buf).reduce((d, b) => d + String.fromCharCode(b), '')), fileName: file.name };
}

function UploadBookDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [cachedPdfBase64, setCachedPdfBase64] = useState('');
  const [cachedFileName, setCachedFileName] = useState('');
  const [previewChapters, setPreviewChapters] = useState<OutlineChapter[]>([]);
  const [previewTotalPages, setPreviewTotalPages] = useState(0);
  const [outlineWarning, setOutlineWarning] = useState<string | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStart, setEditStart] = useState(0);
  const [editEnd, setEditEnd] = useState(0);

  const previewOutline = trpc.smartBookAdmin.previewOutline.useMutation({
    onSuccess: (data) => {
      setPreviewTotalPages(data.totalPages);
      setPreviewChapters(data.chapters.map((ch, i) => ({ ...ch, sortOrder: i })));
      setOutlineWarning(data.outlineWarning ?? null);
      if (data.outlineWarning) toast.error(data.outlineWarning);
      setStep('preview');
    },
    onError: (err) => toast.error('大綱偵測失敗：' + err.message),
  });

  const uploadWithOutline = trpc.smartBookAdmin.uploadWithOutline.useMutation({
    onSuccess: () => {
      utils.smartBookAdmin.list.invalidate();
      toast.success('書本建立成功！正在背景提取文字...');
      handleClose();
    },
    onError: (err) => toast.error('建立失敗：' + err.message),
  });

  const handleClose = () => {
    setStep('form');
    setTitle(''); setAuthor(''); setDescription('');
    setPdfFile(null); setCoverFile(null);
    setCachedPdfBase64(''); setCachedFileName('');
    setPreviewChapters([]); setPreviewTotalPages(0);
    setOutlineWarning(null);
    setEditingIdx(null);
    onClose();
  };

  const handlePreview = async () => {
    if (!pdfFile || !title) return;
    setConverting(true);
    try {
      const { base64, fileName } = await fileToBase64(pdfFile);
      setCachedPdfBase64(base64);
      setCachedFileName(fileName);
      previewOutline.mutate({ pdfBase64: base64, fileName });
    } catch (err: any) {
      toast.error('轉換失敗：' + err.message);
    } finally {
      setConverting(false);
    }
  };

  const handleConfirm = async () => {
    let coverBase64: string | undefined;
    let coverFileName: string | undefined;
    if (coverFile) {
      const buf = await coverFile.arrayBuffer();
      coverBase64 = btoa(new Uint8Array(buf).reduce((d, b) => d + String.fromCharCode(b), ''));
      coverFileName = coverFile.name;
    }
    uploadWithOutline.mutate({
      title, author, description,
      pdfBase64: cachedPdfBase64,
      fileName: cachedFileName,
      coverBase64, coverFileName,
      chapters: previewChapters,
    });
  };

  const saveEdit = () => {
    if (editingIdx === null) return;
    setPreviewChapters(prev => prev.map((ch, i) => i === editingIdx ? { ...ch, title: editTitle, startPage: editStart, endPage: editEnd } : ch));
    setEditingIdx(null);
  };

  const addChapter = () => {
    const lastEnd = previewChapters.length > 0 ? previewChapters[previewChapters.length - 1].endPage : 0;
    setPreviewChapters(prev => [...prev, {
      chapterNumber: prev.length + 1,
      title: `第${prev.length + 1}章`,
      startPage: lastEnd + 1,
      endPage: previewTotalPages,
      sortOrder: prev.length,
    }]);
  };

  const removeChapter = (idx: number) => {
    setPreviewChapters(prev => prev.filter((_, i) => i !== idx).map((ch, i) => ({ ...ch, chapterNumber: i + 1, sortOrder: i })));
  };

  const isLoading = converting || previewOutline.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={step === 'preview' ? 'max-w-2xl' : 'max-w-lg'}>
        <DialogHeader>
          <DialogTitle>
            {step === 'form' ? '上傳新書本' : `確認大綱—「${title}」（共 ${previewTotalPages} 頁）`}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">書名 *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="輸入書名" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">作者</Label>
              <Input value={author} onChange={e => setAuthor(e.target.value)} placeholder="輸入作者" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">簡介</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="書本簡介..." className="mt-1 text-sm" rows={2} />
            </div>
            <div>
              <Label className="text-sm">PDF / Word 檔案 *</Label>
              <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => document.getElementById('pdf-upload-single')?.click()}>
                {pdfFile ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <span>{pdfFile.name}</span>
                    <span className="text-gray-400">({(pdfFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">
                    <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>點擊選擇 PDF 或 Word 檔案</p>
                    <p className="text-xs mt-1">.pdf / .doc / .docx，Word 會自動轉換為 PDF</p>
                  </div>
                )}
              </div>
              <input id="pdf-upload-single" type="file" accept=".pdf,.doc,.docx" className="hidden"
                onChange={e => setPdfFile(e.target.files?.[0] || null)} />
            </div>
            <div>
              <Label className="text-sm">封面圖片（選填）</Label>
              <div className="mt-1 flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => document.getElementById('cover-upload-single')?.click()}>
                  {coverFile ? coverFile.name : '選擇封面圖片'}
                </Button>
                {coverFile && <Button variant="ghost" size="sm" onClick={() => setCoverFile(null)}>移除</Button>}
              </div>
              <input id="cover-upload-single" type="file" accept="image/*" className="hidden"
                onChange={e => setCoverFile(e.target.files?.[0] || null)} />
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="py-2">
            <p className="text-sm text-gray-500 mb-3">AI 已偵測到以下章節結構，可直接修改標題和頁碼後確認建立。</p>
            {outlineWarning && (
              <div className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {outlineWarning}
              </div>
            )}
            <div className="max-h-80 overflow-y-auto space-y-1 border rounded-lg p-2 bg-gray-50">
              {previewChapters.map((ch, i) => (
                <div key={i} className="bg-white rounded border px-3 py-2">
                  {editingIdx === i ? (
                    <div className="space-y-2">
                      <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="text-sm h-7" placeholder="章節標題" />
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">起始頁</span>
                        <Input type="number" value={editStart} onChange={e => setEditStart(Number(e.target.value))} className="w-20 h-6 text-xs" />
                        <span className="text-gray-500">結束頁</span>
                        <Input type="number" value={editEnd} onChange={e => setEditEnd(Number(e.target.value))} className="w-20 h-6 text-xs" />
                        <Button size="sm" className="h-6 text-xs px-2" onClick={saveEdit}>儲存</Button>
                        <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setEditingIdx(null)}>取消</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-6">{ch.chapterNumber}.</span>
                      <span className="flex-1 text-sm font-medium truncate">{ch.title}</span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">p.{ch.startPage}–{ch.endPage}</span>
                      <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => { setEditingIdx(i); setEditTitle(ch.title); setEditStart(ch.startPage); setEditEnd(ch.endPage); }}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-6 h-6 text-red-400" onClick={() => removeChapter(i)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-2 w-full" onClick={addChapter}>
              <Plus className="w-3 h-3 mr-1" />新增章節
            </Button>
          </div>
        )}

        <DialogFooter>
          {step === 'form' ? (
            <>
              <Button variant="ghost" onClick={handleClose}>取消</Button>
              <Button onClick={handlePreview} disabled={!pdfFile || !title || isLoading}>
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />{converting ? 'Word 轉換中...' : 'AI 偵測大綱中...'}</> : <><Sparkles className="w-4 h-4 mr-1" />AI 偵測大綱</>}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep('form')}>返回修改</Button>
              <Button onClick={handleConfirm} disabled={previewChapters.length === 0 || uploadWithOutline.isPending}>
                {uploadWithOutline.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />建立中...</> : <><CheckCircle className="w-4 h-4 mr-1" />確認建立（{previewChapters.length} 個章節）</>}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== 合併多 PDF 對話框 =====
function MergePdfsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  type PdfItem = {
    file: File;
    chapters: OutlineChapter[];
    totalPages: number;
    detectedTitle: string;
    error?: string;
    loading: boolean;
  };

  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfItems, setPdfItems] = useState<PdfItem[]>([]);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [editingPdfIdx, setEditingPdfIdx] = useState<number | null>(null);
  const [editingChIdx, setEditingChIdx] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStart, setEditStart] = useState(0);
  const [editEnd, setEditEnd] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);

  const previewMerge = trpc.smartBookAdmin.previewMergeOutline.useMutation({
    onSuccess: (data) => {
      setPdfItems(prev => prev.map((item, i) => {
        const info = data.pdfs[i];
        if (!info) return item;
        return {
          ...item,
          totalPages: info.totalPages,
          detectedTitle: info.detectedTitle,
          chapters: info.chapters.map((ch, ci) => ({ ...ch, sortOrder: ci })),
          error: info.error,
          loading: false,
        };
      }));
      setStep('preview');
      setPreviewLoading(false);
    },
    onError: (err) => { toast.error('大綱偵測失敗：' + err.message); setPreviewLoading(false); },
  });

  const mergePdfsUpload = trpc.smartBookAdmin.mergePdfsUpload.useMutation({
    onSuccess: (data) => {
      utils.smartBookAdmin.list.invalidate();
      toast.success(`合併建立成功！共 ${data.totalPages} 頁，${data.chapterCount} 個章節。`);
      handleClose();
    },
    onError: (err) => toast.error('建立失敗：' + err.message),
  });

  const handleClose = () => {
    setStep('upload'); setTitle(''); setAuthor(''); setDescription('');
    setCoverFile(null); setPdfItems([]); setEditingPdfIdx(null); setEditingChIdx(null);
    onClose();
  };

  const handleFilesAdded = (files: FileList | null) => {
    if (!files) return;
    const newItems: PdfItem[] = Array.from(files).map(f => ({
      file: f, chapters: [], totalPages: 0, detectedTitle: f.name.replace(/\.pdf$/i, ''), loading: false,
    }));
    setPdfItems(prev => [...prev, ...newItems]);
  };

  const handlePreview = async () => {
    if (pdfItems.length === 0 || !title) return;
    setPreviewLoading(true);
    try {
      const pdfs = await Promise.all(pdfItems.map(async (item) => {
        const { base64, fileName } = await fileToBase64(item.file);
        return { pdfBase64: base64, fileName };
      }));
      previewMerge.mutate({ pdfs });
    } catch (err: any) {
      toast.error('轉換失敗：' + err.message);
      setPreviewLoading(false);
    }
  };

  const handleConfirm = async () => {
    let coverBase64: string | undefined;
    let coverFileName: string | undefined;
    if (coverFile) {
      const buf = await coverFile.arrayBuffer();
      coverBase64 = btoa(new Uint8Array(buf).reduce((d, b) => d + String.fromCharCode(b), ''));
      coverFileName = coverFile.name;
    }
    const pdfs = await Promise.all(pdfItems.map(async (item) => {
      const { base64, fileName } = await fileToBase64(item.file);
      return {
        pdfBase64: base64, fileName,
        chapters: item.chapters.map(ch => ({ title: ch.title, startPage: ch.startPage, endPage: ch.endPage })),
      };
    }));
    mergePdfsUpload.mutate({ title, author, description, coverBase64, coverFileName, pdfs });
  };

  // 拖拉排序
  const handleDragStart = (e: React.DragEvent, idx: number) => { e.dataTransfer.setData('text/plain', String(idx)); };
  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const srcIdx = parseInt(e.dataTransfer.getData('text/plain'));
    if (srcIdx === targetIdx) return;
    setPdfItems(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(srcIdx, 1);
      arr.splice(targetIdx, 0, moved);
      return arr;
    });
    setDragOverIdx(null);
  };

  const saveChEdit = (pdfIdx: number, chIdx: number) => {
    setPdfItems(prev => prev.map((item, pi) => pi !== pdfIdx ? item : {
      ...item,
      chapters: item.chapters.map((ch, ci) => ci !== chIdx ? ch : { ...ch, title: editTitle, startPage: editStart, endPage: editEnd }),
    }));
    setEditingPdfIdx(null); setEditingChIdx(null);
  };

  const addChapterToPdf = (pdfIdx: number) => {
    setPdfItems(prev => prev.map((item, pi) => pi !== pdfIdx ? item : {
      ...item,
      chapters: [...item.chapters, {
        chapterNumber: item.chapters.length + 1,
        title: `第${item.chapters.length + 1}章`,
        startPage: item.chapters.length > 0 ? item.chapters[item.chapters.length - 1].endPage + 1 : 1,
        endPage: item.totalPages || 1,
        sortOrder: item.chapters.length,
      }],
    }));
  };

  const removeChapterFromPdf = (pdfIdx: number, chIdx: number) => {
    setPdfItems(prev => prev.map((item, pi) => pi !== pdfIdx ? item : {
      ...item,
      chapters: item.chapters.filter((_, ci) => ci !== chIdx).map((ch, ci) => ({ ...ch, chapterNumber: ci + 1, sortOrder: ci })),
    }));
  };

  const totalChapters = pdfItems.reduce((s, item) => s + item.chapters.length, 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' ? '合併多個 PDF 成一本書' : `確認大綱—「${title}」`}
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">書名 *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="輸入書名" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">作者</Label>
                <Input value={author} onChange={e => setAuthor(e.target.value)} placeholder="輸入作者" className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-sm">簡介</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="書本簡介..." className="mt-1 text-sm" rows={2} />
            </div>
            <div>
              <Label className="text-sm">封面圖片（選填）</Label>
              <div className="mt-1 flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => document.getElementById('cover-upload-merge')?.click()}>
                  {coverFile ? coverFile.name : '選擇封面'}
                </Button>
                {coverFile && <Button variant="ghost" size="sm" onClick={() => setCoverFile(null)}>移除</Button>}
              </div>
              <input id="cover-upload-merge" type="file" accept="image/*" className="hidden" onChange={e => setCoverFile(e.target.files?.[0] || null)} />
            </div>
            <div>
              <Label className="text-sm">PDF / Word 檔案（可多選）</Label>
              <div className="mt-1 border-2 border-dashed border-blue-200 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 bg-blue-50/30"
                onClick={() => document.getElementById('pdf-upload-merge')?.click()}>
                <Upload className="w-8 h-8 mx-auto mb-1 text-blue-400" />
                <p className="text-sm text-blue-600">點擊選擇多個 PDF / Word 檔案</p>
                <p className="text-xs text-gray-400 mt-1">每個檔案將自動偵測章節，可後續拖拉排序</p>
              </div>
              <input id="pdf-upload-merge" type="file" accept=".pdf,.doc,.docx" multiple className="hidden"
                onChange={e => handleFilesAdded(e.target.files)} />
            </div>
            {pdfItems.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <p className="text-xs text-gray-500 mb-1">已選擇 {pdfItems.length} 個檔案（可拖拉排序）：</p>
                {pdfItems.map((item, i) => (
                  <div key={i}
                    draggable
                    onDragStart={e => handleDragStart(e, i)}
                    onDragOver={e => { e.preventDefault(); setDragOverIdx(i); }}
                    onDrop={e => handleDrop(e, i)}
                    onDragLeave={() => setDragOverIdx(null)}
                    className={`flex items-center gap-2 bg-white border rounded px-3 py-2 cursor-grab ${dragOverIdx === i ? 'border-blue-400 bg-blue-50' : ''}`}>
                    <GripVertical className="w-4 h-4 text-gray-300" />
                    <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span className="flex-1 text-sm truncate">{item.file.name}</span>
                    <span className="text-xs text-gray-400">{(item.file.size / 1024 / 1024).toFixed(1)} MB</span>
                    <Button variant="ghost" size="icon" className="w-6 h-6 text-red-400" onClick={() => setPdfItems(prev => prev.filter((_, pi) => pi !== i))}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="py-2">
            <p className="text-sm text-gray-500 mb-3">AI 已偵測每個 PDF 的章節，可修改標題和頁碼。拖拉檔案列表可調整順序。</p>
            <div className="max-h-96 overflow-y-auto space-y-3">
              {pdfItems.map((item, pi) => (
                <div key={pi} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium flex-1 truncate">{item.file.name}</span>
                    <span className="text-xs text-gray-400">{item.totalPages} 頁</span>
                    {item.error && <span className="text-xs text-red-500">偵測失敗</span>}
                  </div>
                  <div className="space-y-1 pl-2">
                    {item.chapters.map((ch, ci) => (
                      <div key={ci} className="bg-white rounded border px-2 py-1.5">
                        {editingPdfIdx === pi && editingChIdx === ci ? (
                          <div className="space-y-1">
                            <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="text-sm h-7" />
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-gray-500">起</span>
                              <Input type="number" value={editStart} onChange={e => setEditStart(Number(e.target.value))} className="w-16 h-6 text-xs" />
                              <span className="text-gray-500">結</span>
                              <Input type="number" value={editEnd} onChange={e => setEditEnd(Number(e.target.value))} className="w-16 h-6 text-xs" />
                              <Button size="sm" className="h-6 text-xs px-2" onClick={() => saveChEdit(pi, ci)}>儲存</Button>
                              <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => { setEditingPdfIdx(null); setEditingChIdx(null); }}>取消</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-5">{ch.chapterNumber}.</span>
                            <span className="flex-1 text-sm truncate">{ch.title}</span>
                            <span className="text-xs text-gray-400 whitespace-nowrap">p.{ch.startPage}–{ch.endPage}</span>
                            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => { setEditingPdfIdx(pi); setEditingChIdx(ci); setEditTitle(ch.title); setEditStart(ch.startPage); setEditEnd(ch.endPage); }}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="w-6 h-6 text-red-400" onClick={() => removeChapterFromPdf(pi, ci)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full h-7 text-xs mt-1" onClick={() => addChapterToPdf(pi)}>
                      <Plus className="w-3 h-3 mr-1" />新增章節
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'upload' ? (
            <>
              <Button variant="ghost" onClick={handleClose}>取消</Button>
              <Button onClick={handlePreview} disabled={pdfItems.length === 0 || !title || previewLoading || previewMerge.isPending}>
                {(previewLoading || previewMerge.isPending) ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />AI 偵測中...</> : <><Sparkles className="w-4 h-4 mr-1" />AI 偵測大綱（{pdfItems.length} 個檔案）</>}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep('upload')}>返回修改</Button>
              <Button onClick={handleConfirm} disabled={totalChapters === 0 || mergePdfsUpload.isPending}>
                {mergePdfsUpload.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />合併建立中...</> : <><CheckCircle className="w-4 h-4 mr-1" />確認合併（{totalChapters} 個章節）</>}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== 書本編輯器（分割畫面） =====
function BookEditor({ bookId, onBack }: { bookId: number; onBack: () => void }) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data, isLoading, refetch } = trpc.smartBookAdmin.getById.useQuery({ id: bookId });
  const reprocess = trpc.smartBookAdmin.reprocess.useMutation({
    onSuccess: () => {
      toast.success("已重新處理，請稍後重新整理");
      setTimeout(() => refetch(), 5000);
    },
  });
  const [batchResult, setBatchResult] = useState<{ processed: number; skipped: number; failed: number; results: any[] } | null>(null);
  const [showBatchResult, setShowBatchResult] = useState(false);
  const batchSplit = trpc.smartBookAdmin.batchSplitChapters.useMutation({
    onSuccess: (result) => {
      utils.smartBookAdmin.getById.invalidate({ id: bookId });
      setBatchResult(result);
      setShowBatchResult(true);
      if (result.processed > 0) {
        toast.success(`批次拆分完成！成功 ${result.processed} 個章節${
          result.failed > 0 ? `，${result.failed} 個失敗` : ""
        }`);
      } else {
        toast.info("所有章節已拆分完成，無需重複處理");
      }
    },
    onError: (err) => toast.error("批次拆分失敗：" + err.message),
  });
  const adjustChapterPages = trpc.smartBookAdmin.adjustChapterPages.useMutation({
    onSuccess: (result) => {
      const newOffset = result.newOffset ?? 0;
      const pdfPage1 = 1 - newOffset;
      toast.success(`頁碼已設定：PDF第1頁 = 書本第${pdfPage1}頁（${result.affected} 個章節）`);
      refetch();
    },
    onError: () => toast.error("調整失敗"),
  });

  // 批次生成 Q&A
  const [showBatchQADialog, setShowBatchQADialog] = useState(false);
  const [showBookQAManager, setShowBookQAManager] = useState(false);
  const [qaManagerSearch, setQAManagerSearch] = useState('');
  const [qaManagerEditId, setQAManagerEditId] = useState<number | null>(null);
  const [qaManagerEditQ, setQAManagerEditQ] = useState('');
  const [qaManagerEditA, setQAManagerEditA] = useState('');
  const { data: allBookQAData, refetch: refetchAllBookQA } = trpc.smartBookAdmin.getChapterQA.useQuery(
    { bookId, chapterId: 0 },
    { enabled: showBookQAManager }
  );
  const updateQA = trpc.smartBookAdmin.updateQA.useMutation({ onSuccess: () => refetchAllBookQA() });
  const deleteQAItem = trpc.smartBookAdmin.deleteQA.useMutation({ onSuccess: () => refetchAllBookQA() });
  const addQAItem = trpc.smartBookAdmin.addQA.useMutation({ onSuccess: () => refetchAllBookQA() });
  const [newQAQ, setNewQAQ] = useState('');
  const [newQAA, setNewQAA] = useState('');
  const [newQAChapterId, setNewQAChapterId] = useState<number | null>(null);
  const [batchQACount, setBatchQACount] = useState(5);
  const [batchQAForce, setBatchQAForce] = useState(false);
  const [batchQAOnlySubChapters, setBatchQAOnlySubChapters] = useState(true);
  const [showBatchQAResult, setShowBatchQAResult] = useState(false);
  const [batchQAResult, setBatchQAResult] = useState<{ total: number; success: number; skipped: number; failed: number } | null>(null);
  // 一鍵全書處理
  const [showOneClickDialog, setShowOneClickDialog] = useState(false);
  // 難度選擇（記住上次選擇）
  const [batchDifficulty, setBatchDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>(() => {
    return (localStorage.getItem('batchDifficulty') as any) || 'mixed';
  });

  // 本地標記：剛點擊啟動時設 true，頁面重載後會重置為 false
  const [localRunning, setLocalRunning] = useState(false);
  // 常態查詢進度：頁面載入即查一次，running 時每 3 秒輪詢
  const { data: oneClickProgress, isLoading: isProgressLoading, refetch: refetchOneClickProgress } = trpc.smartBookAdmin.getBatchProcessProgress.useQuery(
    { bookId },
    {
      // 頁面載入即執行一次查詢（enabled 預設 true）
      // running 時每 3 秒輪詢；其他狀態不輪詢
      refetchInterval: (query) => (query.state.data?.status === 'running' ? 3000 : false)
    }
  );
  const isPollingOneClick = localRunning || oneClickProgress?.status === 'running';
  // 顯示浮窗條件：
  // 1. 後端確認 running 狀態
  // 2. 本地剛啟動（等待第一次查詢回來）
  // 3. 頁面載入中（还沒確認是否有任務）且曾經有過 running 記錄→ 用 isProgressLoading 處理
  const showProgressFloat = localRunning || oneClickProgress?.status === 'running';
  useEffect(() => {
    if (oneClickProgress?.status === 'done') {
      setLocalRunning(false);
      toast.success(`一鍵處理完成！拆分 ${oneClickProgress.successSplit ?? 0} 章、知識點 ${oneClickProgress.successLesson} 章、簡答 ${oneClickProgress.successQA} 章、考題 ${oneClickProgress.successQuiz} 章`);
      utils.smartBookAdmin.getById.invalidate({ id: bookId });
    } else if (oneClickProgress?.status === 'cancelled') {
      setLocalRunning(false);
      toast.warning('一鍵處理已終止');
    }
  }, [oneClickProgress?.status]);
  const batchProcessBook = trpc.smartBookAdmin.batchProcessBook.useMutation({
    onSuccess: (data) => {
      setShowOneClickDialog(false);
      setLocalRunning(true);
      refetchOneClickProgress();
      toast.info(data.message);
    },
    onError: (err) => toast.error('一鍵處理失敗：' + err.message),
  });
  const cancelBatchProcess = trpc.smartBookAdmin.cancelBatchProcess.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.warning('已發送終止信號，處理將在當前步驟完成後停止');
        refetchOneClickProgress();
      } else {
        toast.error(data.message);
      }
    },
    onError: (err) => toast.error('終止失敗：' + err.message),
  });

  // 進度輯詢
  const [isPollingProgress, setIsPollingProgress] = useState(false);
  const { data: progressData } = trpc.smartBookAdmin.getBatchQAProgress.useQuery(
    { bookId },
    { enabled: isPollingProgress, refetchInterval: isPollingProgress ? 2000 : false }
  );
  const batchGenerateQA = trpc.smartBookAdmin.batchGenerateQA.useMutation({
    onMutate: () => setIsPollingProgress(true),
    onSuccess: (data) => {
      setIsPollingProgress(false);
      setBatchQAResult(data);
      setShowBatchQADialog(false);
      setShowBatchQAResult(true);
      utils.smartBookAdmin.getById.invalidate({ id: bookId });
      toast.success(`批次生成完成！成功 ${data.success} 個，跳過 ${data.skipped} 個`);
    },
    onError: (err) => { setIsPollingProgress(false); toast.error("批次生成失敗：" + err.message); },
  });

  const book = data?.book;
  const effectivePageOffset = book?.pageOffset || 0;
  // currentPage 是 PDF 頁碼，初始値應從書本第 1 頁開始（= 1 + pageOffset）
  const [currentPage, setCurrentPage] = useState(() => 1 + (book?.pageOffset || 0));
  // 懶加載：預設不顯示 PDF，點擊按鈕才載入
  const [pdfVisible, setPdfVisible] = useState(false);
  // 當 pageOffset 更新時，同步跳到書本第 1 頁
  useEffect(() => {
    setCurrentPage(1 + effectivePageOffset);
  }, [effectivePageOffset]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!book) return null;

  return (
    <div className="fixed inset-0 z-50 flex min-h-0 flex-col overflow-hidden bg-white">
      {/* 頂部標題列 */}
      <div className="flex shrink-0 items-center gap-3 border-b bg-white p-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          返回
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">{book.title}</h2>
          <p className="text-xs text-gray-500">
            {book.totalPages} 頁 ·
            <span className={`ml-1 ${
              book.processingStatus === "ready" ? "text-green-600" :
              book.processingStatus === "processing" ? "text-blue-600" :
              book.processingStatus === "failed" ? "text-red-600" : "text-gray-500"
            }`}>
              {book.processingStatus === "ready" ? "✓ 處理完成" :
               book.processingStatus === "processing" ? "⟳ 處理中..." :
               book.processingStatus === "failed" ? "✗ 處理失敗" : "等待處理"}
            </span>
            {book.processingStep && (
              <span className="ml-1 text-gray-400">— {book.processingStep}</span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700"
          onClick={() => batchSplit.mutate({ bookId })}
          disabled={batchSplit.isPending}
          title="自動對所有超過 8 頁的章節進行 AI 拆分"
        >
          {batchSplit.isPending ? (
            <><Loader2 className="w-4 h-4 mr-1 animate-spin" />拆分中...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-1" />一鍵拆分長章節</>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
          onClick={() => setShowBatchQADialog(true)}
          disabled={batchGenerateQA.isPending}
          title="批次對所有子主題生成 Q&A"
        >
          {batchGenerateQA.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              {progressData ? `生成中 ${progressData.current}/${progressData.total}` : "生成中..."}
            </>
          ) : (
            <><MessageSquare className="w-4 h-4 mr-1" />一鍵生成 Q&A</>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700"
          onClick={() => navigate(`/admin/smart-books/${bookId}/qa`)}
          title="查看和管理全書 Q&A 問答集"
        >
          <BookOpen className="w-4 h-4 mr-1" />
          QA 管理
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => reprocess.mutate({ id: bookId })}
          disabled={reprocess.isPending || book.processingStatus === "processing"}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${reprocess.isPending ? "animate-spin" : ""}`} />
          重新處理
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-orange-600 border-orange-300 hover:bg-orange-50 hover:text-orange-700 font-medium"
          onClick={() => setShowOneClickDialog(true)}
          disabled={batchProcessBook.isPending || oneClickProgress?.status === 'running'}
          title="一鍵自動完成所有章節的知識點、考題、簡答生成"
        >
          {oneClickProgress?.status === 'running' ? (
            <><Loader2 className="w-4 h-4 mr-1 animate-spin" />處理中...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-1" />一鍵全書處理</>
          )}
        </Button>
        <a
          href={`/admin/smart-book-unit-qa/${bookId}?from=bookEditor`}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-green-200 text-green-700 rounded-md hover:bg-green-50 transition-colors"
        >
          <BookOpenCheck className="w-4 h-4" />
          備課設計
        </a>
        <a
          href={`/admin/smart-book-exam-sets/${bookId}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-amber-200 text-amber-700 rounded-md hover:bg-amber-50 transition-colors"
          title="管理此書本的考古題專區"
        >
          <FileText className="w-4 h-4" />
          考古題
        </a>
      </div>
      {/* 批次拆分結果 Dialog */}
      {showBatchResult && batchResult && (
        <Dialog open onOpenChange={() => setShowBatchResult(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                批次拆分完成
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{batchResult.processed}</p>
                  <p className="text-xs text-green-700 mt-1">成功拆分</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-500">{batchResult.skipped}</p>
                  <p className="text-xs text-gray-600 mt-1">跳過（已拆分）</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-500">{batchResult.failed}</p>
                  <p className="text-xs text-red-600 mt-1">失敗</p>
                </div>
              </div>
              {batchResult.results.length > 0 && (
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {batchResult.results.map((r: any) => (
                    <div key={r.chapterId} className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg ${
                      r.status === "done" ? "bg-green-50" : "bg-red-50"
                    }`}>
                      <span className="truncate flex-1 mr-2">{r.title}</span>
                      {r.status === "done" ? (
                        <span className="text-green-600 text-xs shrink-0">✓ {r.count} 個子主題</span>
                      ) : (
                        <span className="text-red-500 text-xs shrink-0">✗ {r.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setShowBatchResult(false)}>確認</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 一鍵全書處理 Dialog */}
      {showOneClickDialog && (
        <Dialog open onOpenChange={() => setShowOneClickDialog(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                一鍵全書處理
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800 space-y-2">
                <p className="font-medium">自動逐章完成以下內容：</p>
                <ul className="space-y-1 text-xs list-none">
                  <li>📚 知識點導引學習（導引式對話）</li>
                  <li>❓ 精選考題（每章 5 題選擇題）</li>
                  <li>💬 精選簡答（Q&A 問答集）</li>
                </ul>
                <p className="text-xs text-orange-600 mt-2">• 失敗的章節會自動跳過，不中斷整體流程</p>
                <p className="text-xs text-orange-600">• 對話進行中可關閉此頁面，處理會在後台繼續</p>
                <p className="text-xs text-orange-600">• 預計時間：依章節數量，大約 5~15 分鐘</p>
              </div>
              {/* 難度選擇 */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">考題難度</p>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { value: 'easy' as const, label: '簡單', activeClass: 'bg-green-500 text-white border-green-500', inactiveClass: 'bg-green-50 border-green-300 text-green-700', desc: '基礎概念' },
                    { value: 'medium' as const, label: '中等', activeClass: 'bg-yellow-500 text-white border-yellow-500', inactiveClass: 'bg-yellow-50 border-yellow-300 text-yellow-700', desc: '理解應用' },
                    { value: 'hard' as const, label: '困難', activeClass: 'bg-red-500 text-white border-red-500', inactiveClass: 'bg-red-50 border-red-300 text-red-700', desc: '深度分析' },
                    { value: 'mixed' as const, label: '混合', activeClass: 'bg-purple-500 text-white border-purple-500', inactiveClass: 'bg-purple-50 border-purple-300 text-purple-700', desc: '易中難均衡' },
                  ]).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setBatchDifficulty(opt.value); localStorage.setItem('batchDifficulty', opt.value); }}
                      className={`flex flex-col items-center py-2 px-1 rounded-lg border-2 text-xs font-medium transition-all ${
                        batchDifficulty === opt.value ? opt.activeClass : opt.inactiveClass
                      }`}
                    >
                      <span className="font-bold">{opt.label}</span>
                      <span className="text-[10px] opacity-80 mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOneClickDialog(false)}>取消</Button>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => batchProcessBook.mutate({ bookId, difficulty: batchDifficulty })}
                disabled={batchProcessBook.isPending}
              >
                {batchProcessBook.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />起動中...</> : '確定開始'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 一鍵全書處理 進度顯示區塊 */}
      {/* 查詢中的載入狀態：頁面初載時顯示小指示 */}
      {isProgressLoading && !oneClickProgress && (
        <div className="fixed bottom-4 right-4 z-50 bg-white border border-orange-200 rounded-xl shadow-lg px-4 py-3 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
          <span className="text-xs text-orange-600">檢查處理進度...</span>
        </div>
      )}
      {showProgressFloat && oneClickProgress && (
        <div className="fixed bottom-4 right-4 z-50 bg-white border border-orange-200 rounded-xl shadow-lg p-4 w-80">
          <div className="flex items-center gap-2 mb-2">
            {oneClickProgress.status === 'running' ? (
              <Loader2 className="w-4 h-4 animate-spin text-orange-500 flex-shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            )}
            <span className="text-sm font-medium text-orange-700 flex-1 truncate">
              {oneClickProgress.currentStep || '一鍵全書處理中...'}
            </span>
            <span className="text-xs text-gray-400 flex-shrink-0">{oneClickProgress.current}/{oneClickProgress.total}</span>
          </div>
          {oneClickProgress.currentChapter && (
            <p className="text-xs text-gray-500 mb-2 truncate">章節：{oneClickProgress.currentChapter}</p>
          )}
          <div className="w-full bg-orange-100 rounded-full h-1.5 mb-2">
            <div
              className="bg-orange-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: oneClickProgress.total > 0 ? `${Math.round(oneClickProgress.current / oneClickProgress.total * 100)}%` : '0%' }}
            />
          </div>
          <div className="flex gap-2 text-xs text-gray-500 mb-3 flex-wrap">
            {(oneClickProgress.successSplit ?? 0) > 0 && <span className="text-purple-600">拆分 ✓{oneClickProgress.successSplit}</span>}
            <span>知識點 ✓{oneClickProgress.successLesson}</span>
            <span>簡答 ✓{oneClickProgress.successQA}</span>
            <span>考題 ✓{oneClickProgress.successQuiz}</span>
            {oneClickProgress.failed > 0 && <span className="text-red-500">失敗 {oneClickProgress.failed}</span>}
          </div>
          {oneClickProgress.status === 'running' && (
            <div className="flex gap-2">
              <button
                onClick={() => cancelBatchProcess.mutate({ bookId })}
                disabled={cancelBatchProcess.isPending}
                className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                {cancelBatchProcess.isPending ? '終止中...' : '⏹ 終止處理'}
              </button>
              <button
                onClick={() => {
                  cancelBatchProcess.mutate({ bookId }, {
                    onSuccess: () => {
                      setTimeout(() => {
                        batchProcessBook.mutate({ bookId, replaceExisting: true });
                      }, 1500);
                    }
                  });
                }}
                disabled={cancelBatchProcess.isPending || batchProcessBook.isPending}
                className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 disabled:opacity-50 transition-colors"
              >
                🔄 全部重來
              </button>
            </div>
          )}
        </div>
      )}

      {/* 批次生成 Q&A 設定 Dialog */}
      {showBatchQADialog && (
        <Dialog open onOpenChange={() => setShowBatchQADialog(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-600" />
                一鍵批次生成 Q&A
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-sm font-medium">每節生成題數</Label>
                <div className="flex items-center gap-2 mt-2">
                  {[3, 5, 8, 10].map(n => (
                    <button
                      key={n}
                      onClick={() => setBatchQACount(n)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        batchQACount === n
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-white text-gray-600 border-gray-200 hover:border-amber-300"
                      }`}
                    >
                      {n} 題
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">也可自輸數字：
                  <input
                    type="number" min={1} max={20} value={batchQACount}
                    onChange={e => setBatchQACount(Math.min(20, Math.max(1, parseInt(e.target.value) || 5)))}
                    className="ml-1 w-12 border rounded px-1 text-center text-xs"
                  />
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox" id="onlySubChapters"
                    checked={batchQAOnlySubChapters}
                    onChange={e => setBatchQAOnlySubChapters(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="onlySubChapters" className="text-sm text-gray-700">只對子主題（節）生成，跳過主章</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox" id="forceRegenerate"
                    checked={batchQAForce}
                    onChange={e => setBatchQAForce(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="forceRegenerate" className="text-sm text-gray-700">強制重新生成（覆蓋已有 Q&A）</label>
                </div>
              </div>
              {batchGenerateQA.isPending && progressData && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>生成進度</span>
                    <span className="font-medium">{progressData.current} / {progressData.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: progressData.total > 0 ? `${Math.round(progressData.current / progressData.total * 100)}%` : '0%' }}
                    />
                  </div>
                  {progressData.currentTitle && (
                    <p className="text-xs text-gray-400 truncate">正在處理：{progressData.currentTitle}</p>
                  )}
                </div>
              )}
              <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-700">
                ⚠️ 每個章節需要呼叫 AI，內容較多時可能需要幾分鐘。請耐心等待。
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowBatchQADialog(false)}>取消</Button>
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => batchGenerateQA.mutate({
                  bookId,
                  questionCount: batchQACount,
                  force: batchQAForce,
                  onlySubChapters: batchQAOnlySubChapters,
                })}
                disabled={batchGenerateQA.isPending}
              >
                {batchGenerateQA.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />生成中...</> : "開始生成"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 批次生成 Q&A 結果 Dialog */}
      {showBatchQAResult && batchQAResult && (
        <Dialog open onOpenChange={() => setShowBatchQAResult(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-600" />
                批次生成 Q&A 完成
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{batchQAResult.success}</p>
                <p className="text-xs text-green-700 mt-1">成功生成</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-500">{batchQAResult.skipped}</p>
                <p className="text-xs text-gray-600 mt-1">跳過（已有）</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-500">{batchQAResult.failed}</p>
                <p className="text-xs text-red-600 mt-1">失敗</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-3 text-center">共處理 {batchQAResult.total} 個章節</p>
            <DialogFooter className="mt-4">
              <Button onClick={() => setShowBatchQAResult(false)}>確認</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 全書 QA 管理 Modal */}
      {showBookQAManager && (
        <Dialog open onOpenChange={(open) => { if (!open) { setShowBookQAManager(false); setQAManagerEditId(null); } }}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-600" />
                全書 Q&A 管理 — {book.title}
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                placeholder="搜尋問題或答案..."
                value={qaManagerSearch}
                onChange={e => setQAManagerSearch(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => { refetchAllBookQA(); }}
                className="text-purple-600 border-purple-200"
              >
                <RefreshCw className="w-4 h-4 mr-1" />重新整理
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1">
              {!allBookQAData ? (
                <div className="text-center py-8 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  載入中...
                </div>
              ) : allBookQAData.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>尚無 Q&A，請先使用「一鍵生成 Q&A」</p>
                </div>
              ) : (() => {
                const chapters = data?.chapters || [];
                const filtered = allBookQAData.filter(qa =>
                  !qaManagerSearch ||
                  qa.question.toLowerCase().includes(qaManagerSearch.toLowerCase()) ||
                  qa.answer.toLowerCase().includes(qaManagerSearch.toLowerCase())
                );
                // 按章節分組
                const grouped = filtered.reduce((acc: Record<number, typeof filtered>, qa) => {
                  if (!acc[qa.chapterId]) acc[qa.chapterId] = [];
                  acc[qa.chapterId].push(qa);
                  return acc;
                }, {});
                return Object.entries(grouped).map(([chIdStr, qas]) => {
                  const chId = parseInt(chIdStr);
                  const chapter = chapters.find((c: any) => c.id === chId);
                  return (
                    <div key={chId} className="border rounded-lg overflow-hidden">
                      <div className="bg-purple-50 px-3 py-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-purple-800">
                          {chapter ? chapter.title : `章節 #${chId}`}
                        </span>
                        <span className="text-xs text-purple-500">{qas.length} 題</span>
                      </div>
                      <div className="divide-y">
                        {qas.map(qa => (
                          <div key={qa.id} className="p-3">
                            {qaManagerEditId === qa.id ? (
                              <div className="space-y-2">
                                <div>
                                  <label className="text-xs text-gray-500 mb-1 block">問題</label>
                                  <textarea
                                    value={qaManagerEditQ}
                                    onChange={e => setQAManagerEditQ(e.target.value)}
                                    className="w-full border rounded px-2 py-1 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-300"
                                    rows={2}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 mb-1 block">答案</label>
                                  <textarea
                                    value={qaManagerEditA}
                                    onChange={e => setQAManagerEditA(e.target.value)}
                                    className="w-full border rounded px-2 py-1 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-300"
                                    rows={3}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                    onClick={() => updateQA.mutate({ qaId: qa.id, question: qaManagerEditQ, answer: qaManagerEditA }, {
                                      onSuccess: () => { setQAManagerEditId(null); toast.success('已更新'); }
                                    })}
                                    disabled={updateQA.isPending}
                                  >
                                    {updateQA.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : '儲存'}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setQAManagerEditId(null)}>取消</Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 mb-1">Q: {qa.question}</p>
                                  <p className="text-sm text-gray-600">A: {qa.answer}</p>
                                </div>
                                <div className="flex flex-col gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => { setQAManagerEditId(qa.id); setQAManagerEditQ(qa.question); setQAManagerEditA(qa.answer); }}
                                    className="p-1 text-gray-400 hover:text-purple-600 rounded"
                                    title="編輯"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => { if (confirm('確定刪除此 Q&A？')) deleteQAItem.mutate({ qaId: qa.id }, { onSuccess: () => toast.success('已刪除') }); }}
                                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                                    title="刪除"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {/* 新增 QA */}
                        {newQAChapterId === chId ? (
                          <div className="p-3 bg-green-50 space-y-2">
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">新問題</label>
                              <textarea
                                value={newQAQ}
                                onChange={e => setNewQAQ(e.target.value)}
                                placeholder="輸入問題..."
                                className="w-full border rounded px-2 py-1 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-green-300"
                                rows={2}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">新答案</label>
                              <textarea
                                value={newQAA}
                                onChange={e => setNewQAA(e.target.value)}
                                placeholder="輸入答案..."
                                className="w-full border rounded px-2 py-1 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-green-300"
                                rows={3}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => addQAItem.mutate({ bookId, chapterId: chId, question: newQAQ, answer: newQAA }, {
                                  onSuccess: () => { setNewQAChapterId(null); setNewQAQ(''); setNewQAA(''); toast.success('已新增'); }
                                })}
                                disabled={!newQAQ.trim() || !newQAA.trim() || addQAItem.isPending}
                              >
                                {addQAItem.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : '新增'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setNewQAChapterId(null); setNewQAQ(''); setNewQAA(''); }}>取消</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2">
                            <button
                              onClick={() => { setNewQAChapterId(chId); setNewQAQ(''); setNewQAA(''); }}
                              className="w-full text-xs text-green-600 hover:text-green-700 border border-dashed border-green-300 hover:border-green-400 rounded py-1.5 transition-colors"
                            >
                              + 新增 Q&A
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            <DialogFooter className="mt-4 border-t pt-3">
              <div className="flex items-center gap-2 text-xs text-gray-500 mr-auto">
                共 {allBookQAData?.length ?? 0} 題 Q&A
              </div>
              <Button variant="outline" onClick={() => setShowBookQAManager(false)}>關閉</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 分割畫面 */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* 左側：PDF 預覽（懶加載） */}
        <div className="flex min-h-0 w-3/5 flex-col overflow-hidden border-r">
          {pdfVisible ? (
            <PdfViewer
              pdfUrl={`/api/smart-books/${bookId}/pdf`}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              totalPages={book.totalPages}
              pageOffset={effectivePageOffset}
              onAdjustPages={(delta) => adjustChapterPages.mutate({ bookId, delta })}
            />
          ) : (
            <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 overflow-hidden bg-gray-50">
              <FileText className="w-16 h-16 text-gray-300" />
              <div className="text-center">
                <p className="text-gray-500 font-medium mb-1">PDF 預覽（未載入）</p>
                <p className="text-xs text-gray-400 mb-4">預設不載入 PDF，可加快頁面開啟速度</p>
                <Button
                  onClick={() => setPdfVisible(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  載入 PDF 預覽
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 右側：章節編輯 */}
        <div className="flex min-h-0 w-2/5 flex-col overflow-hidden">
          <ChapterEditor
            bookId={bookId}
            totalPages={book.totalPages}
            currentPdfPage={currentPage}
            pageOffset={effectivePageOffset}
            onJumpToPage={(page) => { setPdfVisible(true); setCurrentPage(page); }}
            onRefresh={() => refetch()}
          />
        </div>
      </div>
    </div>
  );
}

// ===== 批次上傳對話框 =====
function BatchUploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: categories } = trpc.smartBookAdmin.listCategories.useQuery();
  const [files, setFiles] = useState<Array<{ file: File; title: string; id: string }>>([]);
  const [categoryId, setCategoryId] = useState<string>('none');
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<Array<{ fileName: string; success: boolean; error?: string }> | null>(null);

  const batchUpload = trpc.smartBookAdmin.batchUpload.useMutation({
    onSuccess: (data) => {
      utils.smartBookAdmin.list.invalidate();
      setResults(data.results);
      setUploading(false);
      if (data.failCount === 0) {
        toast.success(`批次上傳完成！共 ${data.successCount} 本書本建立中`);
      } else {
        toast.warning(`完成 ${data.successCount} 本，${data.failCount} 本失敗`);
      }
    },
    onError: (err) => { toast.error('上傳失敗：' + err.message); setUploading(false); },
  });

  const handleClose = () => {
    setFiles([]);
    setCategoryId('none');
    setResults(null);
    setUploading(false);
    onClose();
  };

  // 檔名轉書名：去除副檔名、特殊字元、多餘空白
  const fileNameToTitle = (name: string) => {
    return name
      .replace(/\.(pdf|docx?|PDF|DOCX?)$/, '')
      .replace(/[_-]+/g, ' ')
      .trim();
  };

  const handleFilesAdded = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles = Array.from(fileList)
      .filter(f => /\.(pdf|docx?)$/i.test(f.name))
      .map(f => ({ file: f, title: fileNameToTitle(f.name), id: Math.random().toString(36).slice(2) }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const filePayloads = await Promise.all(files.map(async ({ file, title }) => {
        const buf = await file.arrayBuffer();
        const base64 = btoa(new Uint8Array(buf).reduce((d, b) => d + String.fromCharCode(b), ''));
        return { pdfBase64: base64, fileName: file.name, title };
      }));
      const catId = categoryId !== 'none' ? parseInt(categoryId) : null;
      batchUpload.mutate({ files: filePayloads, categoryId: catId });
    } catch (err: any) {
      toast.error('轉換失敗：' + err.message);
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-500" />
            批次上傳書本
          </DialogTitle>
        </DialogHeader>

        {results ? (
          // 上傳結果
          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            <p className="text-sm text-gray-500 mb-3">
              共 {results.filter(r => r.success).length} 本建立成功，{results.filter(r => !r.success).length} 本失敗
            </p>
            {results.map((r, i) => (
              <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                r.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                {r.success
                  ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                <span className="flex-1 truncate">{r.fileName}</span>
                {r.error && <span className="text-red-500 text-xs">{r.error}</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            {/* 分類選擇 */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 shrink-0">統一分類</label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="選擇分類（可不選）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不設定分類</SelectItem>
                  {categories?.map(cat => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 檔案托放區 */}
            <div
              className="border-2 border-dashed border-blue-300 rounded-xl p-6 text-center cursor-pointer hover:bg-blue-50 transition-colors"
              onClick={() => document.getElementById('batch-upload-input')?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFilesAdded(e.dataTransfer.files); }}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-blue-400" />
              <p className="text-sm text-blue-600 font-medium">點擊或拖曳多個檔案</p>
              <p className="text-xs text-gray-400 mt-1">支援 .pdf / .doc / .docx，可一次選多個</p>
              <input
                id="batch-upload-input"
                type="file"
                accept=".pdf,.doc,.docx"
                multiple
                className="hidden"
                onChange={(e) => handleFilesAdded(e.target.files)}
              />
            </div>

            {/* 檔案列表 */}
            {files.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">已選擇 {files.length} 個檔案</p>
                  <button
                    className="text-xs text-red-500 hover:underline"
                    onClick={() => setFiles([])}
                  >全部清除</button>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                  {files.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border">
                      <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <input
                          className="w-full text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none py-0.5 truncate"
                          value={item.title}
                          onChange={(e) => setFiles(prev => prev.map(f => f.id === item.id ? { ...f, title: e.target.value } : f))}
                          placeholder="書名"
                        />
                        <p className="text-xs text-gray-400 truncate">{item.file.name}</p>
                      </div>
                      <button
                        className="text-gray-400 hover:text-red-500 shrink-0"
                        onClick={() => setFiles(prev => prev.filter(f => f.id !== item.id))}
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="border-t pt-3">
          {results ? (
            <Button onClick={handleClose}>關閉</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={handleClose} disabled={uploading}>取消</Button>
              <Button
                onClick={handleUpload}
                disabled={files.length === 0 || uploading}
              >
                {uploading
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />上傳中（{files.length} 本）...</>
                  : <><Upload className="w-4 h-4 mr-1" />開始上傳（{files.length} 本）</>}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== 主頁面 =====
// ===== 分類管理對話框 =====
function CategoryManagerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: categories, isLoading } = trpc.smartBookAdmin.listCategories.useQuery();
  const createCategory = trpc.smartBookAdmin.createCategory.useMutation({
    onSuccess: () => { utils.smartBookAdmin.listCategories.invalidate(); toast.success('分類已建立'); setNewName(''); setNewColor('#6366f1'); setNewIcon('📚'); },
    onError: (e) => toast.error('建立失敗：' + e.message),
  });
  const updateCategory = trpc.smartBookAdmin.updateCategory.useMutation({
    onSuccess: () => { utils.smartBookAdmin.listCategories.invalidate(); toast.success('分類已更新'); setEditingId(null); },
    onError: (e) => toast.error('更新失敗：' + e.message),
  });
  const deleteCategory = trpc.smartBookAdmin.deleteCategory.useMutation({
    onSuccess: () => { utils.smartBookAdmin.listCategories.invalidate(); toast.success('分類已刪除'); },
    onError: (e) => toast.error('刪除失敗：' + e.message),
  });
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [newIcon, setNewIcon] = useState('📚');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const PRESET_COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6b7280'];
  const PRESET_ICONS = ['📚','📖','📝','🎓','💡','🔬','📐','🌍','💻','🎨','📊','🏛️','⚗️','🧮','📜'];
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FolderOpen className="w-5 h-5 text-indigo-500" />書本分類管理</DialogTitle></DialogHeader>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {isLoading ? <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div> : (
            <>
              {categories?.map(cat => (
                <div key={cat.id} className="flex items-center gap-2 p-2 rounded-lg border">
                  {editingId === cat.id ? (
                    <>
                      <input value={editIcon} onChange={e => setEditIcon(e.target.value)} className="w-10 text-center border rounded p-1" />
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1 h-8 text-sm" />
                      <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                      <Button size="sm" className="h-7 text-xs" onClick={() => updateCategory.mutate({ id: cat.id, name: editName, color: editColor, icon: editIcon })} disabled={updateCategory.isPending}>儲存</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>取消</Button>
                    </>
                  ) : (
                    <>
                      <span className="text-lg w-8 text-center">{cat.icon}</span>
                      <span className="flex-1 font-medium text-sm">{cat.name}</span>
                      <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: cat.color }} />
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditColor(cat.color); setEditIcon(cat.icon); }}><Pencil className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => deleteCategory.mutate({ id: cat.id })} disabled={deleteCategory.isPending}><Trash2 className="w-3 h-3" /></Button>
                    </>
                  )}
                </div>
              ))}
              {(!categories || categories.length === 0) && <p className="text-sm text-gray-400 text-center py-2">尚無分類，請新增</p>}
            </>
          )}
        </div>
        <div className="border-t pt-4 space-y-3">
          <p className="text-sm font-medium">新增分類</p>
          <div className="flex gap-2">
            <input value={newIcon} onChange={e => setNewIcon(e.target.value)} placeholder="圖示" className="w-12 text-center border rounded p-1 text-lg" />
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="分類名稱（如：資料庫）" className="flex-1" />
            <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border" title="選擇顏色" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {PRESET_ICONS.map(ic => <button key={ic} onClick={() => setNewIcon(ic)} className={`text-lg p-1 rounded hover:bg-gray-100 ${newIcon === ic ? 'bg-indigo-100 ring-1 ring-indigo-400' : ''}`}>{ic}</button>)}
          </div>
          <div className="flex gap-1 flex-wrap">
            {PRESET_COLORS.map(c => <button key={c} onClick={() => setNewColor(c)} className={`w-6 h-6 rounded-full border-2 ${newColor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}
          </div>
          <Button className="w-full" onClick={() => createCategory.mutate({ name: newName, color: newColor, icon: newIcon })} disabled={!newName.trim() || createCategory.isPending}>
            <Plus className="w-4 h-4 mr-1" />建立分類
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminSmartBooks() {
  const utils = trpc.useUtils();
  // 支援從備課頁返回時自動開啟 BookEditor
  const [location] = typeof window !== 'undefined' ? [window.location.href] : [''];
  const _urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const _editBookIdFromUrl = parseInt(_urlParams.get('editBookId') || '0') || null;
  const { data: books, isLoading, refetch } = trpc.smartBookAdmin.list.useQuery(undefined, {
    refetchInterval: (query) => {
      // 如果有書本在處理中，每 5 秒刷新一次
      // tRPC v11 的 refetchInterval 接收 query state 物件，需透過 .state.data 取得資料
      const data = query.state.data;
      const hasProcessing = Array.isArray(data) && data.some((b: any) =>
        b.processingStatus === "processing" || b.processingStatus === "pending" || b.hasSplitting
      );
      return hasProcessing ? 4000 : false;
    },
  });
  const deleteBook = trpc.smartBookAdmin.delete.useMutation({
    onSuccess: () => {
      utils.smartBookAdmin.list.invalidate();
      toast.success("書本已刪除");
    },
  });
  const togglePublicMutation = trpc.smartBookAdmin.update.useMutation({
    onSuccess: (_data, variables) => {
      utils.smartBookAdmin.list.invalidate();
      toast.success(variables.isPublic ? "書本已公開，學生可見" : "書本已關閉，學生不可見");
    },
    onError: (err) => toast.error("切換失敗：" + err.message),
  });
  const reprocessBook = trpc.smartBookAdmin.reprocess.useMutation({
    onSuccess: () => {
      toast.success("已重新處理，請稍後重新整理");
      setTimeout(() => refetch(), 5000);
    },
    onError: (err) => toast.error("重新處理失敗：" + err.message),
  });

  const resetAllProgressMutation = trpc.lessonPointsAdmin.resetMyProgress.useMutation({
    onSuccess: (data: any) => {
      toast.success(`已清空所有書本的學習進度（共 ${data.cleared} 筆），現在可重新測試學生視角！`);
    },
    onError: (e) => toast.error("清空進度失敗：" + e.message),
  });
  const [showUpload, setShowUpload] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [editingBookId, setEditingBookId] = useState<number | null>(_editBookIdFromUrl);
  const [settingsBook, setSettingsBook] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [filterCategoryId, setFilterCategoryId] = useState<number | 'all' | 'uncategorized'>('all');
  const [setCategoryBookId, setSetCategoryBookId] = useState<number | null>(null);
  const [convertConfirmId, setConvertConfirmId] = useState<number | null>(null);
  const convertToTraditional = trpc.convertChinese.convertBookToTraditional.useMutation({
    onSuccess: (result) => {
      utils.smartBookAdmin.list.invalidate();
      toast.success(`簡轉繁完成！共轉換 ${result.chaptersConverted} 個章節`);
      setConvertConfirmId(null);
    },
    onError: (err) => {
      toast.error('簡轉繁失敗：' + err.message);
      setConvertConfirmId(null);
    },
  });
  const { data: categories } = trpc.smartBookAdmin.listCategories.useQuery();
  const setBookCategory = trpc.smartBookAdmin.setBookCategory.useMutation({
    onSuccess: () => { utils.smartBookAdmin.list.invalidate(); toast.success('分類已設定'); setSetCategoryBookId(null); },
    onError: (e) => toast.error('設定分類失敗：' + e.message),
  });

  // 如果在編輯模式，顯示分割畫面
  if (editingBookId) {
    return <BookEditor bookId={editingBookId} onBack={() => setEditingBookId(null)} />;
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "ready": return "bg-green-100 text-green-700";
      case "processing": return "bg-blue-100 text-blue-700";
      case "failed": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "ready": return "✓ 就緒";
      case "processing": return "⟳ 處理中";
      case "failed": return "✗ 失敗";
      default: return "等待";
    }
  };

  // 分類筛選邏輯
  const filteredBooks = books?.filter(book => {
    if (filterCategoryId === 'all') return true;
    if (filterCategoryId === 'uncategorized') return !(book as any).categoryId;
    return (book as any).categoryId === filterCategoryId;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-blue-600" />
            智能書本管理
          </h1>
          <p className="text-gray-500 text-sm mt-1">上傳書本 PDF，AI 自動解析章節，提供學生引導式學習</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowCategoryManager(true)}>
            <FolderOpen className="w-4 h-4 mr-1" />
            分類管理
          </Button>
          <Button variant="outline" onClick={() => setShowMerge(true)}>
            <Plus className="w-4 h-4 mr-1" />
            合併多 PDF
          </Button>
          <Button variant="outline" onClick={() => setShowBatchUpload(true)}>
            <Upload className="w-4 h-4 mr-1" />
            批次上傳
          </Button>
          <Button onClick={() => setShowUpload(true)}>
            <Plus className="w-4 h-4 mr-1" />
            上傳書本
          </Button>
        </div>
      </div>

      {/* 分類筛選 Tab */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilterCategoryId('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filterCategoryId === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          全部（{books?.length || 0}）
        </button>
        {categories?.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilterCategoryId(cat.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
              filterCategoryId === cat.id ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={filterCategoryId === cat.id ? { backgroundColor: cat.color } : {}}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}（{books?.filter(b => (b as any).categoryId === cat.id).length || 0}）</span>
          </button>
        ))}
        <button
          onClick={() => setFilterCategoryId('uncategorized')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filterCategoryId === 'uncategorized' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          未分類（{books?.filter(b => !(b as any).categoryId).length || 0}）
        </button>
      </div>

      {/* 書本列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filteredBooks?.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">{filterCategoryId === 'all' ? '尚未上傳任何書本' : '此分類尚無書本'}</p>
          <p className="text-sm mt-1">點擊右上角「上傳書本」開始</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBooks?.map(book => (
            <div key={book.id} className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* 封面 */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center relative" style={{ minHeight: '160px' }}>
                {book.coverImageUrl ? (
                  <img src={book.coverImageUrl} alt={book.title} className="w-full object-contain" style={{ maxHeight: '240px' }} />
                ) : (
                  <BookOpen className="w-16 h-16 text-blue-300" />
                )}
                {/* 狀態徽章 */}
                <div className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(book.processingStatus)}`}>
                  {statusLabel(book.processingStatus)}
                </div>
                {/* 公開/私有 快速開關 */}
                <div
                  className="absolute top-2 left-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePublicMutation.mutate({ id: book.id, isPublic: !book.isPublic });
                  }}
                  title={book.isPublic ? '點擊關閉（學生不可見）' : '點擊公開（學生可見）'}
                >
                  {togglePublicMutation.isPending && (togglePublicMutation.variables as any)?.id === book.id ? (
                    <Badge className="bg-gray-400 text-white text-xs cursor-wait gap-1">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />處理中
                    </Badge>
                  ) : book.isPublic ? (
                    <Badge className="bg-green-500 text-white text-xs cursor-pointer hover:bg-green-600 transition-colors">公開 ●</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-gray-300 transition-colors">未公開 ○</Badge>
                  )}
                </div>
              </div>

                {/* 書本資訊 */}
              <div className="p-4">
                {/* 分類標籤 */}
                {(() => {
                  const cat = categories?.find(c => c.id === (book as any).categoryId);
                  return cat ? (
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-xs px-2 py-0.5 rounded-full text-white flex items-center gap-1" style={{ backgroundColor: cat.color }}>
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </span>
                    </div>
                  ) : null;
                })()}
                <h3 className="font-semibold text-sm line-clamp-2 mb-1">{book.title}</h3>
                {book.author && <p className="text-xs text-gray-500 mb-2">{book.author}</p>}
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                  {book.processingStatus === 'failed' ? (
                    <span className="text-red-500 font-medium">✗ 處理失敗</span>
                  ) : (
                    <span>{book.totalPages || "?"} 頁</span>
                  )}

                </div>
                {book.processingStatus === "processing" && book.processingStep && (
                  <p className="text-xs text-blue-600 mb-3 truncate">{book.processingStep}</p>
                )}
                {(book as any).hasSplitting && (
                  <div className="flex items-center gap-1.5 text-xs text-purple-600 mb-3 bg-purple-50 rounded-lg px-2 py-1.5">
                    <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                    <span>AI 拆分章節中，請稍候...</span>
                  </div>
                )}

                {/* 操作按鈕 */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    title="設定分類"
                    onClick={() => setSetCategoryBookId(book.id)}
                  >
                    <Tag className="w-3.5 h-3.5" />
                  </Button>
                  {book.processingStatus === 'failed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                      onClick={() => reprocessBook.mutate({ id: book.id })}
                      disabled={reprocessBook.isPending}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 mr-1 ${reprocessBook.isPending ? 'animate-spin' : ''}`} />
                      重新處理
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setEditingBookId(book.id)}
                    disabled={book.processingStatus !== "ready"}
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    編輯章節
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setSettingsBook(book)}
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-orange-500 hover:text-orange-600 border-orange-200 hover:bg-orange-50"
                    title="簡體轉繁體"
                    onClick={() => setConvertConfirmId(book.id)}
                  >
                    <Languages className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-red-500 hover:text-red-600"
                    onClick={() => setDeleteConfirmId(book.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 上傳對話框 */}
      <UploadBookDialog open={showUpload} onClose={() => setShowUpload(false)} />
      <MergePdfsDialog open={showMerge} onClose={() => setShowMerge(false)} />
      <BatchUploadDialog open={showBatchUpload} onClose={() => setShowBatchUpload(false)} />

      {/* 分類管理對話框 */}
      <CategoryManagerDialog open={showCategoryManager} onClose={() => setShowCategoryManager(false)} />

      {/* 設定書本分類對話框 */}
      <Dialog open={!!setCategoryBookId} onOpenChange={() => setSetCategoryBookId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Tag className="w-5 h-5 text-indigo-500" />設定書本分類</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <button
              onClick={() => setBookCategory.mutate({ bookId: setCategoryBookId!, categoryId: null })}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm hover:bg-gray-50 ${
                !books?.find(b => b.id === setCategoryBookId)?.categoryId ? 'border-indigo-400 bg-indigo-50' : ''
              }`}
            >
              📂 未分類
            </button>
            {categories?.map(cat => (
              <button
                key={cat.id}
                onClick={() => setBookCategory.mutate({ bookId: setCategoryBookId!, categoryId: cat.id })}
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm hover:bg-gray-50 flex items-center gap-2 ${
                  books?.find(b => b.id === setCategoryBookId)?.categoryId === cat.id ? 'border-indigo-400 bg-indigo-50' : ''
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
                <div className="w-3 h-3 rounded-full ml-auto" style={{ backgroundColor: cat.color }} />
              </button>
            ))}
            {(!categories || categories.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">尚無分類，請先建立分類</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 設定對話框 */}
      {settingsBook && (
        <BookSettingsDialog
          book={settingsBook}
          open={!!settingsBook}
          onClose={() => setSettingsBook(null)}
        />
      )}

      {/* 簡繁轉換確認 */}
      <AlertDialog open={!!convertConfirmId} onOpenChange={() => setConvertConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Languages className="w-5 h-5 text-orange-500" />
              確認簡體轉繁體
            </AlertDialogTitle>
            <AlertDialogDescription>
              將書本標題、描述、全文及所有章節內容從簡體中文轉換為繁體中文（台灣用語）。
              <br />
              <strong className="text-orange-600">此操作不可逆，轉換後無法還原為簡體。</strong>
              <br />
              內容較多時可能需要數秒，請耐心等待。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => {
                if (convertConfirmId) convertToTraditional.mutate({ bookId: convertConfirmId });
              }}
              disabled={convertToTraditional.isPending}
            >
              {convertToTraditional.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" />轉換中...</>
              ) : '確認轉換'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 刪除確認 */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              刪除後無法復原，包含所有章節、對話記錄和學習進度。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => {
                if (deleteConfirmId) deleteBook.mutate({ id: deleteConfirmId });
                setDeleteConfirmId(null);
              }}
            >
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
