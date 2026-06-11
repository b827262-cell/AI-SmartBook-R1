import React, { useState, useRef, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { emitDeductCredits } from "@/components/CoinAnimation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  BookOpen,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  ShoppingCart,
  CheckCircle,
  MessageSquare,
  BookMarked,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  BarChart3,
  X,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Coins,
  Coffee,
  Trophy,
  BookOpenCheck,
  ChevronDown,
  Zap,
  Bookmark,
  BookmarkCheck,
  Trash2,
  FileText,
  Pencil,
  Save,
  NotebookPen,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Streamdown } from "streamdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLocation } from "wouter";
import { ImageEditModal } from "@/components/ImageEditModal";
import { ImageIcon, Camera, BookmarkPlus, Download } from "lucide-react";
import { stripOptionPrefix } from "@/lib/stripOptionPrefix";
import { useTTS } from "@/hooks/useTTS";
import { SpeakingWave } from "@/components/SpeakingWave";

// ===== 頁碼預覽 Modal =====
function PagePreviewModal({
  bookId,
  page,
  onClose,
}: {
  bookId: number;
  page: number;
  onClose: () => void;
}) {
  const { data, isLoading } = trpc.smartBookStudent.getPageContent.useQuery(
    { bookId, page },
    { enabled: !!bookId && !!page }
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            第 {page} 頁內容
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : data?.text ? (
            <div className="bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{data.text}</p>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">此頁面無文字內容（可能為圖片頁）</p>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3 text-right">
            來源：書本第 {page} 頁
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== 學習進度儀表板 =====
function ProgressDashboard({
  bookId,
  onClose,
}: {
  bookId: number;
  onClose: () => void;
}) {
  const { data, isLoading } = trpc.smartBookStudent.getProgress.useQuery({ bookId });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            學習進度儀表板
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : data ? (
            <>
              {/* 整體進度 */}
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800">整體學習進度</span>
                  <span className="text-lg font-bold text-blue-600">{data.overallProgress}%</span>
                </div>
                <Progress value={data.overallProgress} className="h-3" />
                <p className="text-xs text-blue-600 mt-2">
                  已完成 {data.completedChapters} / {data.totalChapters} 個章節（完成度 ≥ 80%）
                </p>
              </div>

              {/* 各章節進度 */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {data.chapters.map((ch, chIdx) => (
                  <div key={ch.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700 truncate max-w-[70%]">
                        Ch.{chIdx + 1} {ch.title}
                      </span>
                      <span className="text-xs text-gray-500 shrink-0 ml-2">
                        {ch.progressPercent}%
                        {ch.progressPercent >= 80 && (
                          <CheckCircle className="w-3 h-3 text-green-500 inline ml-1" />
                        )}
                      </span>
                    </div>
                    <Progress
                      value={ch.progressPercent}
                      className="h-2"
                    />
                    {/* 上次讀到頁碼已隱藏 */}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-gray-400">
              <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">尚無學習記錄</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== 多書交叉問答介面 =====
function MultiBookChat({ books, onBack }: { books: any[]; onBack: () => void }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const sendMutation = trpc.smartBookStudent.sendMultiBookMessage.useMutation();
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const bookTitles = books.map(b => b.title).join('、');

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    const newHistory = [...messages, { role: 'user' as const, content: msg }];
    setMessages(newHistory);
    setLoading(true);
    try {
      const res = await sendMutation.mutateAsync({
        bookIds: books.map(b => b.id),
        message: msg,
        history: messages.slice(-10),
      });
      setMessages([...newHistory, { role: 'assistant' as const, content: res.content }]);
    } catch (e: any) {
      toast.error(e.message || 'AI 回應失敗');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* 頂部 */}
      <div className="flex items-center gap-3 p-4 border-b bg-white">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ChevronLeft className="w-4 h-4" />
          返回
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-indigo-500 font-medium">多書交叉問答</p>
          <p className="text-sm font-semibold truncate">{bookTitles}</p>
        </div>
      </div>

      {/* 書本標籤 */}
      <div className="flex flex-wrap gap-2 px-4 py-2 bg-indigo-50 border-b">
        {books.map(b => (
          <span key={b.id} className="text-xs bg-white border border-indigo-200 text-indigo-600 px-2 py-0.5 rounded-full">
            {b.coverImageUrl ? <img src={b.coverImageUrl} alt="" className="inline w-4 h-4 object-contain mr-1 rounded" /> : null}
            {b.title}
          </span>
        ))}
      </div>

      {/* 對話區 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">可以直接問跨書本的問題</p>
            <p className="text-xs mt-1 text-gray-300">AI 會標明答案來自哪本書</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
              m.role === 'user'
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-100 shadow-sm text-gray-800'
            }`}>
              {m.role === 'assistant' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">{m.content}</ReactMarkdown>
              ) : m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 輸入區 */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="輸入問題，AI 會跨書本搜尋回答..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={loading}
          />
          <Button size="sm" onClick={handleSend} disabled={loading || !input.trim()} className="rounded-xl">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===== 書本列表頁 =====
function BookList({ onSelectBook }: { onSelectBook: (book: any) => void }) {
  const { data: books, isLoading } = trpc.smartBookStudent.list.useQuery();
  const { data: categories, isLoading: catLoading } = trpc.smartBookStudent.listCategories.useQuery();
  // 第一層：選定的類科 ID（null = 顯示類科列表）
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  // 多書勾選
  const [selectedBookIds, setSelectedBookIds] = useState<Set<number>>(new Set());
  const [showMultiChat, setShowMultiChat] = useState(false);

  const loading = isLoading || catLoading;

  if (loading) {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <div className="mb-6">
          <div className="h-7 w-36 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-52 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border rounded-xl p-5 animate-pulse">
              <div className="h-8 w-8 bg-gray-200 rounded mb-3" />
              <div className="h-5 w-24 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-16 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 第二層：顯示選定類科下的書本清單
  // 多書問答介面
  if (showMultiChat && selectedCategoryId !== null) {
    const selectedCat = categories?.find(c => c.id === selectedCategoryId);
    const catBooks = books?.filter(b => (b as any).categoryId === selectedCategoryId) ?? [];
    const selectedBooks = catBooks.filter(b => selectedBookIds.has(b.id));
    return (
      <MultiBookChat
        books={selectedBooks}
        onBack={() => setShowMultiChat(false)}
      />
    );
  }

  if (selectedCategoryId !== null) {
    const selectedCat = categories?.find(c => c.id === selectedCategoryId);
    const catBooks = books?.filter(b => (b as any).categoryId === selectedCategoryId) ?? [];
    const isUncategorized = selectedCategoryId === -1;
    const displayBooks = isUncategorized
      ? (books?.filter(b => !(b as any).categoryId) ?? [])
      : catBooks;

    return (
      <div className="p-4 max-w-3xl mx-auto">
        {/* 頁頭列 */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => { setSelectedCategoryId(null); setSelectedBookIds(new Set()); }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            返回類科
          </button>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xl">{selectedCat?.icon ?? '📚'}</span>
            <h1 className="text-xl font-bold" style={{ color: selectedCat?.color ?? '#6366f1' }}>
              {selectedCat?.name ?? '書本'}
            </h1>
            <span className="text-sm text-gray-400">({displayBooks.length} 本)</span>
          </div>
        </div>

        {/* 多書問答提示 */}
        {displayBooks.length > 1 && (
          <div className="mb-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
            <p className="text-xs text-indigo-600 font-medium mb-2">💡 勾選多本書，進行跨書本交叉問答</p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => {
                  if (selectedBookIds.size === displayBooks.length) {
                    setSelectedBookIds(new Set());
                  } else {
                    setSelectedBookIds(new Set(displayBooks.map(b => b.id)));
                  }
                }}
              >
                {selectedBookIds.size === displayBooks.length ? '取消全選' : '全選'}
              </Button>
              {selectedBookIds.size >= 2 && (
                <Button
                  size="sm"
                  className="text-xs bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => setShowMultiChat(true)}
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  多書問答（{selectedBookIds.size} 本）
                </Button>
              )}
              {selectedBookIds.size === 1 && (
                <span className="text-xs text-gray-400">再勾選 1 本以上即可開始多書問答</span>
              )}
            </div>
          </div>
        )}

        {/* 書本清單（垂直清單式） */}
        {displayBooks.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">此類科尚無書本</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayBooks.map((book, idx) => {
              const isChecked = selectedBookIds.has(book.id);
              return (
                <div
                  key={book.id}
                  className={`flex items-center gap-4 bg-white border rounded-xl p-4 transition-all ${
                    isChecked ? 'border-indigo-400 shadow-md bg-indigo-50/30' : 'hover:shadow-md hover:border-indigo-200'
                  }`}
                >
                  {/* 勾選框 */}
                  <button
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isChecked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 hover:border-indigo-400'
                    }`}
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedBookIds(prev => {
                        const next = new Set(prev);
                        if (next.has(book.id)) next.delete(book.id);
                        else next.add(book.id);
                        return next;
                      });
                    }}
                  >
                    {isChecked && <CheckCircle className="w-4 h-4 text-white" />}
                  </button>
                  {/* 封面縮略圖 */}
                  <div
                    className="w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center cursor-pointer"
                    onClick={() => onSelectBook(book)}
                  >
                    {book.coverImageUrl ? (
                      <img src={book.coverImageUrl} alt={book.title} className="w-full h-full object-contain" />
                    ) : (
                      <BookOpen className="w-7 h-7 text-blue-200" />
                    )}
                  </div>
                  {/* 書本資訊 */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelectBook(book)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">Vol.{idx + 1}</span>
                    </div>
                    <h3 className="font-semibold text-sm hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">{book.title}</h3>
                    {book.author && <p className="text-xs text-gray-400 mt-1">{book.author}</p>}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 hover:text-indigo-400 flex-shrink-0 transition-colors cursor-pointer" onClick={() => onSelectBook(book)} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 第一層：類科卡片列表
  const allCategories = categories ?? [];
  const uncatBooks = books?.filter(b => !(b as any).categoryId) ?? [];

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          智能書本
        </h1>
        <p className="text-gray-500 text-xs mt-1">選擇類科，開始 AI 引導式學習</p>
      </div>

      {allCategories.length === 0 && uncatBooks.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">目前沒有可用的書本</p>
          <p className="text-sm mt-1">請稍後再來查看</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {allCategories.map(cat => {
            const catBooks = books?.filter(b => (b as any).categoryId === cat.id) ?? [];
            return (
              <div
                key={cat.id}
                className="bg-white border rounded-xl p-5 hover:shadow-lg hover:border-indigo-200 transition-all cursor-pointer group"
                onClick={() => setSelectedCategoryId(cat.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: cat.color + '20' }}
                  >
                    {cat.icon}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 transition-colors mt-1" />
                </div>
                <h2 className="font-bold text-base mb-1 group-hover:text-indigo-600 transition-colors" style={{ color: cat.color }}>
                  {cat.name}
                </h2>
                <p className="text-xs text-gray-400">{catBooks.length} 本書</p>
              </div>
            );
          })}
          {/* 未分類的書本類科卡 */}
          {uncatBooks.length > 0 && (
            <div
              className="bg-white border rounded-xl p-5 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer group"
              onClick={() => setSelectedCategoryId(-1)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gray-100">
                  📂
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors mt-1" />
              </div>
              <h2 className="font-bold text-base mb-1 text-gray-600">其他書本</h2>
              <p className="text-xs text-gray-400">{uncatBooks.length} 本書</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== 購書驗證關卡 =====
function PurchaseVerification({
  book,
  onVerified,
  onBack,
}: {
  book: any;
  onVerified: () => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState<"intro" | "quiz" | "success" | "suspended" | "locked">("intro");
  const [verifyBonusCredits, setVerifyBonusCredits] = useState<number>(0);
  const [verifyNewDailyBalance, setVerifyNewDailyBalance] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [verificationId, setVerificationId] = useState<number | null>(null);
  const [quizData, setQuizData] = useState<{ question: string; page: number; options: string[]; optionLabels: string[]; purchaseUrl?: string | null } | null>(null);
  const [error, setError] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState<number>(3);
  const [suspendedUntil, setSuspendedUntil] = useState<Date | null>(null);
  const [lockedPurchaseUrl, setLockedPurchaseUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [changeCount, setChangeCount] = useState<number>(0);
  const MAX_CHANGE_COUNT = 2;
  const [correctRoundCount, setCorrectRoundCount] = useState<number>(0);
  const REQUIRED_CORRECT = 2;

  // 快速通關密碼
  const [showBypass, setShowBypass] = useState(false);
  const [bypassInput, setBypassInput] = useState("");
  const [bypassError, setBypassError] = useState("");
  const bypassVerification = trpc.smartBookStudent.bypassVerification.useMutation({
    onSuccess: () => {
      onVerified();
    },
    onError: (err) => {
      setBypassError(err.message || "密碼錯誤，請再試一次");
    },
  });

  // 暫停倒數計時
  useEffect(() => {
    if (!suspendedUntil) return;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((suspendedUntil.getTime() - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        setSuspendedUntil(null);
        setStep("quiz");
        setError("");
        setAttemptsLeft(3);
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [suspendedUntil]);

  const getQuiz = trpc.smartBookStudent.getVerificationQuestion.useMutation({
    onSuccess: (data) => {
      setVerificationId(data.verificationId);
      setQuizData({ question: data.question, page: data.page, options: data.options || [], optionLabels: data.optionLabels || ["A","B","C","D"], purchaseUrl: data.purchaseUrl });
      // 換題後重置換題次數（新題目）
      if (data.changeCount !== undefined) setChangeCount(data.changeCount);
      // 保留已答對次數
      if (data.correctRoundCount !== undefined) setCorrectRoundCount(data.correctRoundCount);
      setStep("quiz");
    },
    onError: (err) => {
      // 換題次數超限時顯示提示
      toast.error(err.message);
    },
  });

  const submitAnswer = trpc.smartBookStudent.submitVerification.useMutation({
    onSuccess: (data: any) => {
      if (data.passed) {
        setCorrectRoundCount(REQUIRED_CORRECT);
        // 取得獎勵點數資訊（由 completeChapterVerification 或 submitVerification 回傳）
        if (data.bonusCredits) setVerifyBonusCredits(data.bonusCredits);
        if (data.newDailyBalance !== undefined) setVerifyNewDailyBalance(data.newDailyBalance);
        setStep("success");
        setTimeout(onVerified, 2500);
      } else if (data.needsNextQuestion) {
        // 答對了但還不夠次數，自動出下一題
        const newCount = data.correctRoundCount || 0;
        setCorrectRoundCount(newCount);
        setError("");
        setSelectedOption(null);
        setAttemptsLeft(3);
        setChangeCount(0);
        // 自動取得下一題（傳入舊 verificationId 讓後端能讀取 correctRoundCount）
        toast.success(`答對！（${newCount}/${REQUIRED_CORRECT}）請繼續作答第 ${newCount + 1} 題`);
        getQuiz.mutate({ bookId: data.bookId, verificationId: verificationId ?? undefined });
      } else if (data.locked) {
        setLockedPurchaseUrl(data.purchaseUrl || null);
        setStep("locked");
      } else if (data.suspended) {
        setSuspendedUntil(new Date(data.suspendedUntil));
        setStep("suspended");
      } else {
        const left = data.attemptsLeft ?? 0;
        setAttemptsLeft(left);
        setError(data.hint || "答案不正確，請再試一次。");
        setSelectedOption(null);
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const showPurchaseLink = book.verificationMode === "purchase_link" || book.verificationMode === "both";
  const showAiQuiz = book.verificationMode === "ai_quiz" || book.verificationMode === "both";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full overflow-hidden">
        {/* 書本封面 */}
        <div className="h-32 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center relative">
          {book.coverImageUrl ? (
            <img src={book.coverImageUrl} alt={book.title} className="h-full w-full object-cover opacity-50" />
          ) : null}
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-white opacity-80" />
          </div>
        </div>

        <div className="p-6">
          <h2 className="font-bold text-lg mb-1">{book.title}</h2>
          {book.author && <p className="text-sm text-gray-500 mb-4">{book.author}</p>}

          {step === "intro" && (
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-orange-800">此書本需要購書驗證</p>
                    <p className="text-xs text-orange-600 mt-1">
                      為了確認您已購買此書，請完成以下驗證步驟。
                    </p>
                  </div>
                </div>
              </div>

              {showPurchaseLink && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">尚未購書？</p>
                  {book.purchaseUrl ? (
                    <a
                      href={book.purchaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      前往購書
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <div className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gray-100 text-gray-400 rounded-lg text-sm border border-dashed border-gray-300">
                      <ShoppingCart className="w-4 h-4" />
                      購書連結尚未設定（請聯絡老師）
                    </div>
                  )}
                </div>
              )}

              {showAiQuiz && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {showPurchaseLink ? "已購書？進行驗證：" : "請完成驗證："}
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => getQuiz.mutate({ bookId: book.id })}
                    disabled={getQuiz.isPending}
                  >
                    {getQuiz.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" />準備驗證題目...</>
                    ) : (
                      <><CheckCircle className="w-4 h-4 mr-2" />開始購書驗證</>
                    )}
                  </Button>
                </div>
              )}

              {/* 快速通關密碼區塊 */}
              {book.hasBypassPassword && (
                <div className="border-t border-gray-100 pt-4">
                  {!showBypass ? (
                    <button
                      onClick={() => setShowBypass(true)}
                      className="w-full text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 py-1"
                    >
                      <Zap className="w-3 h-3" />
                      有通關密碼?
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                        <Zap className="w-3 h-3 text-yellow-500" />
                        輸入快速通關密碼
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={bypassInput}
                          onChange={e => { setBypassInput(e.target.value); setBypassError(""); }}
                          placeholder="輸入密碼..."
                          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
                          onKeyDown={e => e.key === 'Enter' && bypassInput.trim() && bypassVerification.mutate({ bookId: book.id, password: bypassInput.trim() })}
                        />
                        <Button
                          size="sm"
                          onClick={() => bypassVerification.mutate({ bookId: book.id, password: bypassInput.trim() })}
                          disabled={!bypassInput.trim() || bypassVerification.isPending}
                        >
                          {bypassVerification.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "確認"}
                        </Button>
                      </div>
                      {bypassError && <p className="text-xs text-red-500">{bypassError}</p>}
                    </div>
                  )}
                </div>
              )}

              <Button variant="ghost" className="w-full text-sm" onClick={onBack}>
                返回書本列表
              </Button>
            </div>
          )}

          {step === "quiz" && quizData && (
            <div className="space-y-4">
              {/* 驗證進度指示器 */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">驗證進度</span>
                <div className="flex items-center gap-2">
                  {Array.from({ length: REQUIRED_CORRECT }).map((_, i) => (
                    <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                      i < correctRoundCount
                        ? 'bg-green-500 border-green-500 text-white'
                        : i === correctRoundCount
                        ? 'bg-blue-50 border-blue-400 text-blue-600'
                        : 'bg-gray-50 border-gray-200 text-gray-400'
                    }`}>
                      {i < correctRoundCount ? '✓' : i + 1}
                    </div>
                  ))}
                  <span className="text-sm font-semibold text-gray-700 ml-1">{correctRoundCount}/{REQUIRED_CORRECT}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-600 font-medium mb-2">
                  📖 請翻開書本找到相關內容回答以下問題：
                </p>
                <p className="text-sm font-medium text-gray-800 leading-relaxed">{quizData.question}</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-red-600">{error}</p>
                    {attemptsLeft > 0 && (
                      <p className="text-xs text-orange-600 mt-1 font-medium">
                        ⚠️ 還有 {attemptsLeft} 次機會，答錯 3 次將暫停 3 分鐘
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ABCD 選項按鈕 */}
              {quizData.options && quizData.options.length > 0 ? (
                <div className="space-y-2">
                  {quizData.options.map((opt, idx) => {
                    const label = quizData.optionLabels?.[idx] || String.fromCharCode(65 + idx);
                    const isSelected = selectedOption === opt;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedOption(opt)}
                        className={`w-full text-left px-4 py-3 rounded-lg border-2 text-sm transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 text-blue-800 font-medium"
                            : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                        }`}
                      >
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2 ${
                          isSelected ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
                        }`}>{label}</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Input
                  value={selectedOption || ""}
                  onChange={e => setSelectedOption(e.target.value)}
                  placeholder="請輸入您的答案..."
                  className="text-sm"
                />
              )}

              <Button
                className="w-full text-sm"
                onClick={() => verificationId && selectedOption && submitAnswer.mutate({ verificationId, answer: selectedOption })}
                disabled={!selectedOption || submitAnswer.isPending || !verificationId}
              >
                {submitAnswer.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : "提交答案"}
              </Button>
            </div>
          )}

          {step === "suspended" && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-3xl">⏸️</span>
              </div>
              <div>
                <p className="font-bold text-lg text-orange-700">請先休息一下</p>
                <p className="text-sm text-gray-500 mt-1">連續答錯 3 次，請稍待後再試</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-3xl font-mono font-bold text-orange-600">
                  {Math.floor(countdown / 60).toString().padStart(2, '0')}:{(countdown % 60).toString().padStart(2, '0')}
                </p>
                <p className="text-xs text-orange-500 mt-1">倒數計時，時間到自動恢復</p>
              </div>
              <p className="text-xs text-gray-400">💡 趁這段時間翻閱書本，找找答案吧！</p>
            </div>
          )}

          {step === "locked" && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <p className="font-bold text-lg text-red-700">今日驗證已鎖定</p>
                <p className="text-sm text-gray-500 mt-1">連續兩輪驗證失敗，請明天再來試試</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
                <p className="text-sm font-medium text-amber-800 mb-2">💡 溫馨提醒</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  驗證題目來自書本內容，需要實際翻閱書本才能作答。
                  建議購買正版書籍，支持作者的辛勤創作！
                </p>
              </div>
              {lockedPurchaseUrl && (
                <a
                  href={lockedPurchaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" />
                  前往購書
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <Button variant="ghost" className="w-full text-sm" onClick={onBack}>
                返回書本列表
              </Button>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <p className="font-bold text-lg text-green-700">驗證成功！🎉</p>
              {verifyBonusCredits > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mx-2">
                  <p className="text-amber-700 font-semibold text-sm">🎁 獲得 {verifyBonusCredits} 點今日提問點數</p>
                  <p className="text-amber-600 text-xs mt-1">今日剩餘：{verifyNewDailyBalance} 點（每天午夜歸零）</p>
                </div>
              )}
              <p className="text-sm text-gray-500">正在進入書本...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== 測驗模組元件 =====
type QuizQuestion = {
  id: number;
  chapterId: number;
  question: string;
  options: string[];
  correctIndex: number;
  hint?: string | null;
};

type QuizMode = 'select' | 'doing' | 'result';

function BookQuizTab({ bookId, chapters }: { bookId: number; chapters: any[] }) {
  const [mode, setMode] = useState<QuizMode>('select');
  const [quizType, setQuizType] = useState<'chapter' | 'mock' | 'wrong'>('chapter');
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [quizResult, setQuizResult] = useState<{ correctCount: number; totalCount: number; wrongCount: number; creditsDeducted?: number; creditsEarned?: number; deductSuccess?: boolean; todayTotalEarned?: number } | null>(null);
  const [showWrongBook, setShowWrongBook] = useState(false);
  const [showAwardAnim, setShowAwardAnim] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(10); // 每題倒數 10 秒
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const mainChapters = chapters.filter((c: any) => !c.parentChapterId);

  const { data: quizStats, refetch: refetchQuizStats } = trpc.smartBookStudent.getBookQuizStats.useQuery({ bookId });
  const { data: wrongAnswers, refetch: refetchWrong } = trpc.smartBookStudent.getWrongAnswers.useQuery({ bookId, isLearned: false });
  const { data: learnedWrong } = trpc.smartBookStudent.getWrongAnswers.useQuery({ bookId, isLearned: true });

  const utils = trpc.useUtils();
  const [isLoadingChapter, setIsLoadingChapter] = useState(false);
  const [isLoadingMock, setIsLoadingMock] = useState(false);
  const [loadingMockDots, setLoadingMockDots] = useState('');
  const mockQsMutation = trpc.smartBookStudent.getMockExamQuestions.useQuery(
    { bookId, count: 20 },
    { enabled: false }
  );

  const deductOneQuestionMutation = trpc.smartBookStudent.deductOneQuestion.useMutation();

  const submitMutation = trpc.smartBookStudent.submitQuizAnswers.useMutation({
    onSuccess: (data) => {
      setQuizResult(data);
      setMode('result');
      refetchWrong();
      refetchQuizStats(); // 即時更新考試次數
      // 模擬考試且有賺到點時播放領獎動畫
      if (data.creditsEarned && data.creditsEarned > 0) {
        setShowAwardAnim(true);
        setTimeout(() => setShowAwardAnim(false), 3500);
      }
    },
    onError: () => toast.error('提交失敗，請稍後再試'),
  });

  const markLearnedMutation = trpc.smartBookStudent.markWrongAnswerLearned.useMutation({
    onSuccess: () => { refetchWrong(); toast.success('已標記為學會！'); },
  });

  const startChapterQuiz = async (chapterId: number) => {
    setSelectedChapterId(chapterId);
    setIsLoadingChapter(true);
    try {
      // 直接用 utils.fetch 傳入正確的 chapterId，完全繞過 React state 非同步問題
      const data = await utils.smartBookStudent.getChapterQuestions.fetch(
        { bookId, chapterId, count: 5 }
      );
      if (!data || data.length === 0) {
        toast.error('此章節尚無題目，請先在後台生成題目');
        return;
      }
      const qs = data.map((q: any) => ({ ...q, options: Array.isArray(q.options) ? q.options : JSON.parse(q.options as string) }));
      setQuestions(qs);
      setUserAnswers(new Array(qs.length).fill(null));
      setCurrentIdx(0);
      setQuizType('chapter');
      setMode('doing');
    } catch (err) {
      toast.error('載入題目失敗，請稍後再試');
    } finally {
      setIsLoadingChapter(false);
    }
  };

  const startMockExam = async () => {
    setIsLoadingMock(true);
    setLoadingMockDots('');
    // 動態點點動畫
    const dotsInterval = setInterval(() => {
      setLoadingMockDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    try {
      const result = await utils.smartBookStudent.getMockExamQuestions.fetch({ bookId, count: 20 });
      const rawQuestions = result?.questions ?? [];
      if (rawQuestions.length === 0) {
        toast.error('尚無題目，請先在後台生成題目');
        return;
      }
      const qs = rawQuestions.map((q: any) => ({ ...q, options: Array.isArray(q.options) ? q.options : JSON.parse(q.options as string) }));
      setQuestions(qs);
      setUserAnswers(new Array(qs.length).fill(null));
      setCurrentIdx(0);
      setQuizType('mock');
      setMode('doing');
    } catch (err) {
      toast.error('出題失敗，請稍後再試');
    } finally {
      clearInterval(dotsInterval);
      setIsLoadingMock(false);
      setLoadingMockDots('');
    }
  };

  const startWrongReview = () => {
    if (!wrongAnswers || wrongAnswers.length === 0) {
      toast('目前沒有錯題！');
      return;
    }
    const qs: QuizQuestion[] = wrongAnswers.map((wa: any) => ({
      id: wa.questionId,
      chapterId: wa.chapterId,
      question: wa.question,
      options: Array.isArray(wa.options) ? wa.options : JSON.parse(wa.options as string),
      correctIndex: wa.correctIndex,
      hint: wa.hint,
    }));
    setQuestions(qs);
    setUserAnswers(new Array(qs.length).fill(null));
    setCurrentIdx(0);
    setQuizType('wrong');
    setMode('doing');
  };
  const handleAnswer = (optIdx: number) => {
    // 點選選項時中斷朗讀
    window.speechSynthesis.cancel();

    // 如果是第一次選這題（原本為 null），才扣點；已選過換選不重複扣點
    const isFirstSelection = userAnswers[currentIdx] === null;
    const newAnswers = [...userAnswers];
    newAnswers[currentIdx] = optIdx;
    setUserAnswers(newAnswers);

    // 所有考題類型：第一次選這題時扣 1 點，並觸發金幣飛走動畫
    if (isFirstSelection) {
      const q = questions[currentIdx];
      if (q) {
        const deductType = quizType === 'mock' ? 'mock_exam_deduct' : 'chapter_quiz_deduct';
        deductOneQuestionMutation.mutate({ bookId, questionId: q.id, deductType });
        // 用 setTimeout 確保在 render 完成後才觸發金幣動畫
        setTimeout(() => emitDeductCredits(1), 0);
      }
      // 第一次選才自動跳下一題；換選不跳題
      setTimeout(() => {
        if (currentIdx < questions.length - 1) {
          setCurrentIdx(i => i + 1);
        }
      }, 600);
    }
  };

  // 每題倒數計時器：只有模擬考試才有倒數，章節考試（5 題）不需要
  React.useEffect(() => {
    if (mode !== 'doing' || quizType !== 'mock') return;
    setTimeLeft(10);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          // 時間到：用 setTimeout 完全在 render 外處理扣點和跳題
          setTimeout(() => {
            // 若該題未作答，先扣點
            if (userAnswers[currentIdx] === null) {
              const q = questions[currentIdx];
              if (q) {
                const deductType = quizType === 'mock' ? 'mock_exam_deduct' : 'chapter_quiz_deduct';
                deductOneQuestionMutation.mutate({ bookId, questionId: q.id, deductType });
                emitDeductCredits(1);
              }
            }
            // 再跳下一題或交卷
            if (currentIdx < questions.length - 1) {
              setCurrentIdx(currentIdx + 1);
            } else {
              handleSubmit();
            }
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current!);
    };
  }, [currentIdx, mode]);

  const handleSubmit = () => {
    const answersPayload = questions.map((q, i) => ({
      questionId: q.id,
      chapterId: q.chapterId,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      userAnswer: userAnswers[i] ?? -1,
      hint: q.hint ?? undefined,
    }));
    submitMutation.mutate({
      bookId,
      chapterId: quizType === 'chapter' ? (selectedChapterId ?? undefined) : undefined,
      mode: quizType === 'wrong' ? 'chapter' : quizType,
      answers: answersPayload,
    });
  };

  // 錯題本檢視
  if (showWrongBook) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setShowWrongBook(false)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ChevronLeft className="w-4 h-4" />
            返回
          </button>
          <h3 className="font-bold text-gray-800">錯題本</h3>
        </div>
        {(!wrongAnswers || wrongAnswers.length === 0) ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">✅</div>
            <p>目前沒有錯題，繼續保持！</p>
          </div>
        ) : (
          <div className="space-y-3">
            {wrongAnswers.map((wa: any) => {
              const opts = Array.isArray(wa.options) ? wa.options : JSON.parse(wa.options as string);
              return (
                <div key={wa.id} className="bg-white border rounded-xl p-4">
                  <p className="text-sm font-medium text-gray-800 mb-3">{wa.question}</p>
                  <div className="space-y-1.5 mb-3">
                    {opts.map((opt: string, i: number) => (
                      <div key={i} className={`text-xs px-3 py-1.5 rounded-lg ${
                        i === wa.correctIndex ? 'bg-green-100 text-green-700 font-medium' :
                        i === wa.userAnswer ? 'bg-red-100 text-red-600' : 'bg-gray-50 text-gray-600'
                      }`}>
                        {String.fromCharCode(65 + i)}. {stripOptionPrefix(opt)}
                        {i === wa.correctIndex && ' ✓'}
                        {i === wa.userAnswer && i !== wa.correctIndex && ' ✗'}
                      </div>
                    ))}
                  </div>
                  {wa.hint && <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mb-3">💡 {wa.hint}</p>}
                  <button
                    onClick={() => markLearnedMutation.mutate({ id: wa.id })}
                    className="text-xs text-green-600 border border-green-300 rounded-lg px-3 py-1 hover:bg-green-50"
                  >
                    ✓ 已學會，移出錯題本
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 測驗進行中
  if (mode === 'doing') {
    const q = questions[currentIdx];
    const answered = userAnswers[currentIdx] !== null;
    const answeredCount = userAnswers.filter(a => a !== null).length;
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              setShowLeaveConfirm(true);
            }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="w-4 h-4" />
            離開測驗
          </button>
          {/* 模擬考試離開確認對話框 */}
          {showLeaveConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">⚠️</div>
                  <h3 className="text-base font-bold text-gray-800 mb-1">
                    {quizType === 'mock' ? '確定要離開模擬考試？' : '確定要離開測驗？'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {quizType === 'mock'
                      ? <>離開將<span className="text-red-500 font-semibold">不計贈點</span>，已扣點不會退還。</>
                      : <>已扣點不會退還，確定要離開？</>
                    }
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLeaveConfirm(false)}
                    className="flex-1 border rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                  >繼續作答</button>
                  <button
                    onClick={() => { setShowLeaveConfirm(false); setMode('select'); refetchQuizStats(); }}
                    className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm hover:bg-red-600"
                  >確定離開</button>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            {/* 倒數計時器：只有模擬考試才顯示 */}
            {quizType === 'mock' && (
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${
                timeLeft <= 10 ? 'bg-red-100 text-red-600 animate-pulse' : timeLeft <= 20 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'
              }`}>
                <span>⏱</span>
                <span>{timeLeft}s</span>
              </div>
            )}
            <span className="text-sm text-gray-500">{currentIdx + 1} / {questions.length}</span>
          </div>
        </div>
        <div className="bg-white border rounded-xl p-5 mb-4">
          <p className="text-sm font-medium text-gray-800 leading-relaxed mb-4">{q.question}</p>
          <div className="space-y-2">
            {q.options.map((opt: string, i: number) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition-all ${
                  userAnswers[currentIdx] === i
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>{stripOptionPrefix(opt)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {currentIdx > 0 && (
              <button onClick={() => setCurrentIdx(i => i - 1)} className="text-sm text-gray-500 border rounded-lg px-3 py-1.5 hover:bg-gray-50">← 上一題</button>
            )}
            {currentIdx < questions.length - 1 && (
              <button onClick={() => setCurrentIdx(i => i + 1)} className="text-sm text-blue-600 border border-blue-300 rounded-lg px-3 py-1.5 hover:bg-blue-50">下一題 →</button>
            )}
          </div>
          {answeredCount === questions.length && (
            <button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="bg-blue-600 text-white text-sm px-5 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {submitMutation.isPending ? '提交中...' : '提交答案'}
            </button>
          )}
        </div>
        <div className="mt-3">
          <div className="flex gap-1 flex-wrap">
            {questions.map((_: any, i: number) => (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                className={`w-7 h-7 text-xs rounded-lg border ${
                  i === currentIdx ? 'bg-blue-600 text-white border-blue-600' :
                  userAnswers[i] !== null ? 'bg-green-100 text-green-700 border-green-300' :
                  'bg-white text-gray-500 border-gray-200'
                }`}
              >{i + 1}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 結果頁
  if (mode === 'result' && quizResult) {
    const pct = Math.round((quizResult.correctCount / quizResult.totalCount) * 100);
    const netCredits = (quizResult.creditsEarned ?? 0) - (quizResult.creditsDeducted ?? 0);
    const isMock = quizType === 'mock';
    const earned = quizResult.creditsEarned ?? 0;
    const todayTotal = quizResult.todayTotalEarned ?? 0;
    return (
      <div className="relative">
        {/* 領獎動畫滞層 */}
        {showAwardAnim && (
          <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
            <div className="text-center">
              {/* 煙火大字 */}
              <div style={{
                fontSize: '80px',
                animation: 'awardBounce 0.6s ease-out',
                display: 'block',
              }}>🏆</div>
              <div style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#16a34a',
                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                animation: 'awardFadeUp 0.8s ease-out 0.3s both',
                background: 'rgba(255,255,255,0.95)',
                borderRadius: '16px',
                padding: '12px 28px',
                marginTop: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              }}>+{earned} 點入車！</div>
              <div style={{
                fontSize: '16px',
                color: '#374151',
                background: 'rgba(255,255,255,0.9)',
                borderRadius: '12px',
                padding: '8px 20px',
                marginTop: '8px',
                animation: 'awardFadeUp 0.8s ease-out 0.6s both',
              }}>今日已累計賺取 {todayTotal} / 100 點</div>
            </div>
          </div>
        )}
        <style>{`
          @keyframes awardBounce {
            0% { transform: scale(0) rotate(-20deg); opacity: 0; }
            60% { transform: scale(1.3) rotate(5deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          @keyframes awardFadeUp {
            0% { transform: translateY(20px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
        `}</style>
        {/* 頂部按鈕列 */}
        <div className="flex gap-3 mb-4">
          <button onClick={() => { setMode('select'); refetchQuizStats(); }} className="flex-1 border rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">返回列表</button>
          <button
            onClick={() => {
              setUserAnswers(new Array(questions.length).fill(null));
              setCurrentIdx(0);
              setMode('doing');
            }}
            className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm hover:bg-blue-700"
          >再做一次</button>
        </div>
        <div className="text-center py-6">
          <div className="text-5xl mb-3">{pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '📚'}</div>
          <h3 className="text-xl font-bold text-gray-800 mb-1">
            {pct >= 80 ? '太棒了！' : pct >= 60 ? '不错喔！' : '繼續加油！'}
          </h3>
          <p className="text-gray-500 text-sm mb-3">答對 {quizResult.correctCount} / {quizResult.totalCount} 題（{pct}%）</p>

          {/* 模擬考試點數結算卡片 */}
          {isMock && (
            <div className="mx-auto max-w-xs mb-4">
              {quizResult.totalCount < 20 && (
                <div className="bg-orange-50 border border-orange-300 rounded-xl px-4 py-3 mb-3 text-center">
                  <p className="text-sm text-orange-600 font-semibold">⚠️ 本次未完成全部題目，不計贈點</p>
                  <p className="text-xs text-orange-400 mt-0.5">需作答完 20 題才會給予答對獎勵</p>
                </div>
              )}
              <div className={`rounded-2xl border-2 px-5 py-4 ${
                netCredits >= 0 ? 'border-green-300 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <p className="text-xs text-gray-500 mb-2 font-medium">🎯 本次模擬考試點數</p>
                <div className="flex items-center justify-center gap-4 text-sm mb-2">
                  <div className="text-center">
                    <p className="text-xs text-gray-400">入場費</p>
                    <p className="text-red-500 font-bold text-lg">−{quizResult.creditsDeducted ?? 0}</p>
                  </div>
                  <div className="text-gray-300 text-xl">+</div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">答對獎勵</p>
                    <p className="text-green-600 font-bold text-lg">+{earned}</p>
                  </div>
                  <div className="text-gray-300 text-xl">=</div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">對沖</p>
                    <p className={`font-bold text-xl ${netCredits >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {netCredits >= 0 ? '+' : ''}{netCredits}
                    </p>
                  </div>
                </div>
                {quizResult.deductSuccess === false ? (
                  <p className="text-xs text-orange-500 text-center">點數不足，未扣點</p>
                ) : (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-center text-gray-500">
                      今日已累計賺取 
                      <span className="font-bold text-orange-500">{todayTotal}</span>
                       / 100 點
                      {todayTotal >= 100 && <span className="text-green-600 ml-1">🌟 今日已達上限！</span>}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 章節考題點數資訊 */}
          {!isMock && (quizResult.creditsDeducted ?? 0) > 0 && (
            <div className="inline-flex items-center gap-2 bg-gray-50 border rounded-xl px-4 py-2 mb-3 text-sm">
              <span className="text-red-500">−{quizResult.creditsDeducted} 點</span>
              <span className="text-gray-400">| 章節精選考題</span>
            </div>
          )}

          {quizResult.wrongCount > 0 && (
            <p className="text-sm text-orange-600 bg-orange-50 rounded-xl px-4 py-2 inline-block mb-4">
              {quizResult.wrongCount} 題已加入錯題本
            </p>
          )}
        </div>
        <div className="space-y-3 mb-6">
          {questions.map((q: QuizQuestion, i: number) => {
            const ua = userAnswers[i] ?? -1;
            const isCorrect = ua === q.correctIndex;
            return (
              <div key={q.id} className={`border rounded-xl p-4 ${ isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50' }`}>
                <div className="flex items-start gap-2 mb-2">
                  <span className={`text-sm font-bold shrink-0 ${ isCorrect ? 'text-green-600' : 'text-red-500' }`}>{isCorrect ? '✓' : '✗'}</span>
                  <p className="text-sm text-gray-800">{q.question}</p>
                </div>
                <div className="ml-5 space-y-1">
                  {!isCorrect && (
                    <p className="text-xs text-red-600">你的答案：{String.fromCharCode(65 + ua)}. {ua >= 0 ? stripOptionPrefix(q.options[ua]) : '未作答'}</p>
                  )}
                  <p className="text-xs text-green-700 font-medium">正確答案：{String.fromCharCode(65 + q.correctIndex)}. {stripOptionPrefix(q.options[q.correctIndex])}</p>
                  {q.hint && <p className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">💡 {q.hint}</p>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setMode('select'); refetchQuizStats(); }} className="flex-1 border rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">返回列表</button>
          <button
            onClick={() => {
              setUserAnswers(new Array(questions.length).fill(null));
              setCurrentIdx(0);
              setMode('doing');
            }}
            className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm hover:bg-blue-700"
          >再做一次</button>
        </div>
      </div>
    );
  }

  // 選擇頁（預設）
  return (
    <div className="space-y-4">
      {/* 積分規則說明面板 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <p className="text-xs font-semibold text-blue-700 mb-1.5">🎯 精選考題規則</p>
        <div className="space-y-1 text-xs text-blue-600">
          <div className="flex items-start gap-1.5">
            <span className="font-bold shrink-0">模擬考試：</span>
            <span>每題扣 <strong>1 點</strong>，答對 <strong>+2 點</strong>；<strong>20 題全部作答完畢才有贈點</strong>，中途離開不計分；<strong>每題 10 秒倒數</strong>，時間到自動跳題</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="font-bold shrink-0">章節精選：</span>
            <span>每題扣 <strong>1 點</strong>（5 題 = -5 點），答對不賺點</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="font-bold shrink-0">每日上限：</span>
            <span>每日最多賺取 <strong>100 點</strong>，零點後重置</span>
          </div>
        </div>
      </div>
      {/* 統計卡片 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{quizStats?.totalQuestions ?? 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">題庫總題數</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-orange-500">{quizStats?.wrongCount ?? 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">錯題待複習</p>
        </div>
      </div>

      {/* 模擬考試 */}
      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-800 text-sm">
              🎯 模擬考試
              {(quizStats?.mockAttempts ?? 0) > 0 && (
                <span className="ml-2 text-xs text-red-500 font-semibold">已考 {quizStats?.mockAttempts} 次</span>
              )}
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              {quizStats?.totalQuestions
                ? `題庫共 ${quizStats.totalQuestions} 題，每次隨機取 20 題`
                : '從全書隨機抄 20 題'}
            </p>
          </div>
          <button
            onClick={startMockExam}
            disabled={isLoadingMock}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-70 flex items-center gap-2 min-w-[72px] justify-center"
          >
            {isLoadingMock ? (
              <><Loader2 className="w-4 h-4 animate-spin" />出題中</>
            ) : '開始'}
          </button>
        </div>
        {/* 每日賺點上限提示 */}
        {(quizStats?.todayEarned ?? 0) >= 100 && !isLoadingMock && (
          <div className="mt-2 flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
            <span className="text-orange-500 text-sm">🔔</span>
            <p className="text-xs text-orange-600">今日已達賺點上限，仍可繼續練習但不計贈點</p>
          </div>
        )}
        {/* 出題中進度提示 */}
        {isLoadingMock && (
          <div className="mt-3 pt-3 border-t border-blue-100">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-blue-400"
                    style={{ animation: `thinkingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                  />
                ))}
              </div>
              <p className="text-xs text-blue-600 font-medium">
                AI 正在為您精心出題{loadingMockDots}
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-1">這可能需要 10~30 秒，請耐心等候</p>
          </div>
        )}
      </div>

      {/* 錯題本 */}
      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-800 text-sm">📕 錯題本複習</h4>
            <p className="text-xs text-gray-400 mt-0.5">
              {quizStats?.wrongCount ? `${quizStats.wrongCount} 題待複習` : '目前沒有錯題'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowWrongBook(true)}
              className="text-sm text-gray-500 border rounded-xl px-3 py-2 hover:bg-gray-50"
            >查看</button>
            <button
              onClick={startWrongReview}
              disabled={!quizStats?.wrongCount}
              className="bg-orange-500 text-white text-sm px-4 py-2 rounded-xl hover:bg-orange-600 disabled:opacity-40"
            >練習</button>
          </div>
        </div>
      </div>

      {/* 章節精選 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-700 text-sm">📚 章節精選</h4>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">每次隨機取 5 題</span>
        </div>
        <div className="space-y-2">
          {mainChapters.map((ch: any) => {
            const count = quizStats?.totalByChapter?.[ch.id] ?? 0;
            return (
              <div key={ch.id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{ch.title}</p>
                  {count > 0 ? (
                    <p className="text-xs text-green-600">
                      題庫共 {count} 題，隨機取 5 題{(quizStats?.attemptsByChapter?.[ch.id] ?? 0) > 0 ? <span className="text-red-500 font-semibold">・已考 {quizStats?.attemptsByChapter?.[ch.id]} 次</span> : ''}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">尚無題目</p>
                  )}
                </div>
                <button
                  onClick={() => startChapterQuiz(ch.id)}
                  disabled={count === 0 || (isLoadingChapter && selectedChapterId === ch.id)}
                  className="text-sm text-blue-600 border border-blue-300 rounded-xl px-3 py-1.5 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {isLoadingChapter && selectedChapterId === ch.id ? (
                    <><span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin inline-block"></span>載入中</>
                  ) : '開始'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===== QA 問答集元件 =====
// 高亮文字中的關鍵字
function highlightText(text: string, keyword: string): React.ReactNode {
  if (!keyword.trim()) return text;
  const parts = text.split(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase()
      ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark>
      : part
  );
}

function BookQATab({ bookId, qaData, isLoading, onCreditsChange }: {
  bookId: number;
  qaData?: { chapters: any[]; qaList: any[]; viewedQAIds?: number[] };
  isLoading: boolean;
  onCreditsChange?: () => void;
}) {
  const [expandedQA, setExpandedQA] = useState<number | null>(null);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const isComposingRef = React.useRef(false);
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewedQAIds, setViewedQAIds] = useState<Set<number>>(new Set(qaData?.viewedQAIds ?? []));
  const [deductingQAId, setDeductingQAId] = useState<number | null>(null);
  const [lastDeductMsg, setLastDeductMsg] = useState<string | null>(null);

  // 同步 viewedQAIds（當 qaData 更新時）
  React.useEffect(() => {
    if (qaData?.viewedQAIds) {
      setViewedQAIds(new Set(qaData.viewedQAIds));
    }
  }, [qaData?.viewedQAIds]);

  const viewQAMutation = trpc.smartBookStudent.viewQA.useMutation({
    onSuccess: (data, variables) => {
      if (!data.alreadyViewed && data.creditsDeducted > 0) {
        setViewedQAIds(prev => new Set([...prev, variables.qaId]));
        setLastDeductMsg(`-${data.creditsDeducted} 點`);
        setTimeout(() => setLastDeductMsg(null), 2000);
        // 觸發 Navbar 金幣動畫 + 即時更新點數
        emitDeductCredits(data.creditsDeducted);
        onCreditsChange?.();
      }
      setDeductingQAId(null);
    },
    onError: () => setDeductingQAId(null),
  });

  const handleExpandQA = (qaId: number) => {
    const isOpening = expandedQA !== qaId;
    setExpandedQA(isOpening ? qaId : null);
    // 展開時若未查看過，呼叫 viewQA 扣點
    if (isOpening && !viewedQAIds.has(qaId)) {
      setDeductingQAId(qaId);
      viewQAMutation.mutate({ bookId, qaId });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white rounded-xl p-4 border animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!qaData || qaData.qaList.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-5xl mb-3">💬</div>
        <p className="text-base font-medium">尚無 QA 問答集</p>
        <p className="text-sm mt-1">老師尚未新增問答集</p>
      </div>
    );
  }

  const mainChapters = qaData.chapters.filter((c: any) => !c.parentChapterId);
  const trimmed = searchQuery.trim().toLowerCase();

  const handleSearchInput = (val: string) => {
    setInputValue(val);
    if (isComposingRef.current) return; // 組字中不觸發搜尋
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => setSearchQuery(val), 300);
  };

  // 搜尋模式：直接列出所有符合的 QA
  if (trimmed) {
    const matched = qaData.qaList.filter((q: any) =>
      q.question.toLowerCase().includes(trimmed) || q.answer.toLowerCase().includes(trimmed)
    );
    return (
      <div>
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="搜尋問題或答案..."
            value={inputValue}
            onChange={e => handleSearchInput(e.target.value)}
            onCompositionStart={() => { isComposingRef.current = true; }}
            onCompositionEnd={e => {
              isComposingRef.current = false;
              const val = (e.target as HTMLInputElement).value;
              if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
              setSearchQuery(val);
            }}
            className="w-full border rounded-xl px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button onClick={() => { setSearchQuery(''); setInputValue(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        {matched.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">找不到相關問答</div>
        ) : (
          <div className="space-y-2">
            {matched.map((qa: any) => (
              <div key={qa.id} className="bg-white border rounded-xl px-4 py-3">
                <button className="w-full text-left" onClick={() => setExpandedQA(expandedQA === qa.id ? null : qa.id)}>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold text-sm shrink-0 mt-0.5">Q</span>
                    <p className="text-sm text-gray-800 font-medium">{highlightText(qa.question, trimmed)}</p>
                  </div>
                </button>
                {expandedQA === qa.id && (
                  <div className="mt-2 ml-5 flex items-start gap-2">
                    <span className="text-blue-500 font-bold text-sm shrink-0">A</span>
                    <div className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none">
                      <ReactMarkdown>{qa.answer}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 積分規則說明面板 */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
        <span className="text-orange-500 text-lg shrink-0">💬</span>
        <div className="text-xs text-orange-700">
          <p className="font-semibold mb-1">精選簡答規則</p>
          <p>每次展開答案扣 <strong>1 點</strong>，同一題已查看過不再扣點。</p>
        </div>
        {lastDeductMsg && (
          <span className="ml-auto text-xs font-bold text-red-500 bg-red-50 rounded-full px-2 py-0.5 animate-bounce">{lastDeductMsg}</span>
        )}
      </div>
      <div className="relative">
        <input
          type="text"
          placeholder="搜尋問題或答案..."
          value={inputValue}
          onChange={e => handleSearchInput(e.target.value)}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={e => {
            isComposingRef.current = false;
            const val = (e.target as HTMLInputElement).value;
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            setSearchQuery(val);
          }}
          className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>
      {mainChapters.map((chapter: any, chapterIdx: number) => {
        const chapterQAs = qaData.qaList.filter((q: any) => q.chapterId === chapter.id);
        const subChapterIds = qaData.chapters.filter((c: any) => c.parentChapterId === chapter.id).map((c: any) => c.id);
        const allRelatedQAs = [...chapterQAs, ...qaData.qaList.filter((q: any) => subChapterIds.includes(q.chapterId))];
        if (allRelatedQAs.length === 0) return null;
        return (
          <div key={chapter.id} className="bg-white border rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
              onClick={() => setExpandedChapter(expandedChapter === chapter.id ? null : chapter.id)}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-orange-500">{chapterIdx + 1}</span>
                <span className="font-medium text-sm text-gray-800">{chapter.title}</span>
                <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{allRelatedQAs.length} 題</span>
              </div>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedChapter === chapter.id ? 'rotate-90' : ''}`} />
            </button>
            {expandedChapter === chapter.id && (
              <div className="border-t divide-y">
                {allRelatedQAs.map((qa: any) => (
                  <div key={qa.id} className="px-4 py-3">
                    <button
                      className="w-full text-left"
                      onClick={() => handleExpandQA(qa.id)}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-blue-500 font-bold text-sm shrink-0 mt-0.5">Q</span>
                        <p className="text-sm text-gray-800 font-medium">{qa.question}</p>
                        {viewedQAIds.has(qa.id) ? (
                          <span className="ml-auto text-xs text-green-500 bg-green-50 rounded-full px-1.5 py-0.5 shrink-0">✓ 已看</span>
                        ) : (
                          <span className="ml-auto text-xs text-orange-400 bg-orange-50 rounded-full px-1.5 py-0.5 shrink-0">{deductingQAId === qa.id ? '...' : '-1點'}</span>
                        )}
                      </div>
                    </button>
                    {expandedQA === qa.id && (
                      <div className="mt-2 ml-5 flex items-start gap-2">
                        <span className="text-blue-500 font-bold text-sm shrink-0">A</span>
                        <div className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none">
                          <ReactMarkdown>{qa.answer}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===== 精選簡答（含歷屆考題簡答）包裝元件 =====
// ===== 歷屆考題簡答隨機練習模式 =====
function EssayPracticeMode({ bookId, questions }: { bookId: number; questions: any[] }) {
  const [usedIds, setUsedIds] = useState<number[]>([]);
  const [currentQ, setCurrentQ] = useState<any | null>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [started, setStarted] = useState(false);

  const submitAnswer = trpc.examSetStudent.submitAnswer.useMutation({
    onSuccess: (data) => { setFeedback(data.feedback); setIsSubmitting(false); },
    onError: (e) => { setIsSubmitting(false); toast.error(e.message); },
  });

  const addWrong = trpc.examSetStudent.addToWrongBook.useMutation({
    onSuccess: () => toast.success('已加入錯題本'),
    onError: () => toast.error('加入失敗'),
  });

  const saveNote = trpc.examSetStudent.saveNote.useMutation({
    onSuccess: () => { setNoteSaved(true); toast.success('筆記已儲存'); },
    onError: () => toast.error('儲存失敗'),
  });

  const pickNext = () => {
    const remaining = questions.filter(q => !usedIds.includes(q.id));
    if (remaining.length === 0) {
      setCurrentQ(null);
      return;
    }
    const next = remaining[Math.floor(Math.random() * remaining.length)];
    setCurrentQ(next);
    setUsedIds(prev => [...prev, next.id]);
    setAnswer('');
    setFeedback(null);
    setNoteText('');
    setShowNote(false);
    setNoteSaved(false);
  };

  if (!started) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-5xl">📝</div>
        <p className="text-base font-semibold text-gray-800">歷屆考題簡答練習</p>
        <p className="text-sm text-gray-500">共 {questions.length} 道簡答題，每次隨機出一題<br/>作答後立即 AI 批改，可收藏筆記或加入錯題本</p>
        <Button onClick={() => { setStarted(true); pickNext(); }} className="px-8">
          開始練習
        </Button>
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-5xl">🎉</div>
        <p className="text-base font-semibold text-gray-800">本輪已完成！</p>
        <p className="text-sm text-gray-500">已練習 {usedIds.length} 道題目</p>
        <Button onClick={() => { setUsedIds([]); setStarted(false); }} variant="outline">
          重新開始
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 進度列 */}
      <div className="flex items-center justify-between text-xs text-gray-500 bg-white rounded-xl px-4 py-2 border">
        <span>已練習 <strong className="text-blue-600">{usedIds.length}</strong> 題</span>
        <span>剩餘 <strong className="text-orange-500">{questions.length - usedIds.length}</strong> 題未練習</span>
        <button onClick={() => { setStarted(false); setUsedIds([]); }} className="text-gray-400 hover:text-gray-600 text-xs">結束練習</button>
      </div>

      {/* 題目卡片 */}
      <div className="bg-white border rounded-xl p-4 space-y-3">
        {/* 題目標籤 */}
        <div className="flex items-center gap-2 flex-wrap">
          {currentQ.sourceYear && <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{currentQ.sourceYear}</span>}
          {currentQ.sourceExam && <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 max-w-[220px] truncate">{currentQ.sourceExam}</span>}
          {currentQ.examSetTitle && <span className="text-xs text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">{currentQ.examSetTitle}</span>}
        </div>

        {/* 題目文字 */}
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{currentQ.questionText}</p>
        {currentQ.referencePages && (
          <p className="text-xs text-orange-600 bg-orange-50 rounded px-2 py-1">📖 參考頁碼：{currentQ.referencePages}</p>
        )}

        {/* 作答區 or 批改結果 */}
        {!feedback ? (
          <div className="space-y-2 pt-2 border-t">
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              rows={5}
              placeholder="請輸入你的答案..."
              value={answer}
              onChange={e => setAnswer(e.target.value)}
            />
            <Button
              className="w-full"
              disabled={isSubmitting || !answer.trim()}
              onClick={() => {
                setIsSubmitting(true);
                submitAnswer.mutate({ questionId: currentQ.id, userAnswer: answer });
              }}
            >
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />AI 批改中…</> : '提交答案 → AI 批改'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 pt-2 border-t">
            {/* AI 批改結果 */}
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <p className="text-xs font-semibold text-blue-700 mb-2">🤖 AI 批改結果</p>
              <div className="text-sm text-gray-700 prose prose-sm max-w-none">
                <ReactMarkdown>{feedback}</ReactMarkdown>
              </div>
            </div>

            {/* 標準答案 */}
            {currentQ.hasAnswer && currentQ.answerText && (
              <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                <p className="text-xs font-semibold text-green-700 mb-1">✅ 標準答案</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{currentQ.answerText}</p>
              </div>
            )}

            {/* 你的答案 */}
            <div className="bg-gray-50 rounded-xl p-3 border">
              <p className="text-xs font-semibold text-gray-500 mb-1">📄 你的答案</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{answer}</p>
            </div>

            {/* 操作按鈕 */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNote(!showNote)}
                className="flex items-center gap-1"
              >
                <Bookmark className="w-3.5 h-3.5" />
                {showNote ? '收起筆記' : '收藏筆記'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 text-red-500 border-red-200 hover:bg-red-50"
                onClick={() => addWrong.mutate({ questionId: currentQ.id })}
                disabled={addWrong.isPending}
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                加入錯題本
              </Button>
              <Button
                size="sm"
                className="ml-auto"
                onClick={pickNext}
              >
                下一題 →
              </Button>
            </div>

            {/* 筆記區 */}
            {showNote && (
              <div className="space-y-2">
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  rows={3}
                  placeholder="寫下你的筆記..."
                  value={noteText}
                  onChange={e => { setNoteText(e.target.value); setNoteSaved(false); }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!noteText.trim() || noteSaved || saveNote.isPending}
                  onClick={() => saveNote.mutate({ questionId: currentQ.id, noteText })}
                >
                  {noteSaved ? '✓ 已儲存' : saveNote.isPending ? '儲存中…' : '儲存筆記'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BookQATabWithEssay({
  bookId, qaData, isLoading, onCreditsChange, essayQuestions, essayLoading
}: {
  bookId: number;
  qaData?: { chapters: any[]; qaList: any[]; viewedQAIds?: number[] };
  isLoading: boolean;
  onCreditsChange?: () => void;
  essayQuestions: any[];
  essayLoading: boolean;
}) {
  const [qaSubTab, setQaSubTab] = useState<'lecture' | 'exam'>('lecture');

  return (
    <div className="space-y-3">
      {/* 子 Tab 切換 */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-hidden">
        <button
          onClick={() => setQaSubTab('lecture')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            qaSubTab === 'lecture'
              ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📚 講義精選問答（模擬練習）
        </button>
        <button
          onClick={() => setQaSubTab('exam')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            qaSubTab === 'exam'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📝 歷屆考題簡答 {essayQuestions.length > 0 && <span className="ml-1 text-xs bg-blue-100 text-blue-600 rounded-full px-1.5">{essayQuestions.length}</span>}
        </button>
      </div>

      {qaSubTab === 'lecture' ? (
        <BookQATab bookId={bookId} qaData={qaData} isLoading={isLoading} onCreditsChange={onCreditsChange} />
      ) : (
        <div>
          {essayLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : essayQuestions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">📝</div>
              <p className="text-base font-medium">尚無歷屆考題簡答</p>
              <p className="text-sm mt-1">管理員尚未上傳考古題，或考古題已全部轉為選擇題</p>
            </div>
          ) : (
            <EssayPracticeMode bookId={bookId} questions={essayQuestions} />
          )}
        </div>
      )}
    </div>
  );
}

// ===== 收藏筆記本元件 =====
// 螢光筆顏色定義
const HIGHLIGHT_COLORS = [
  { name: '黃色', value: '#FFE066', label: '🟡' },
  { name: '綠色', value: '#A8F0A0', label: '🟢' },
  { name: '粉紅', value: '#FFB3C6', label: '🩷' },
  { name: '藍色', value: '#A0D4FF', label: '🔵' },
  { name: '橘色', value: '#FFD0A0', label: '🟠' },
];

// 將帶有 <mark> 標籤的 HTML 渲染為 React 元素（安全版）
function HighlightedContent({ html }: { html: string }) {
  return (
    <div
      className="text-sm text-gray-700 leading-relaxed break-words w-full"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// 將純文字 + highlights 陣列轉換為帶 <mark> 的 HTML
function applyHighlights(text: string, highlights: Array<{ start: number; end: number; color: string }>): string {
  if (!highlights || highlights.length === 0) return escapeHtml(text);
  // 排序並合併重疊區間
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  let result = '';
  let pos = 0;
  for (const h of sorted) {
    if (h.start > pos) result += escapeHtml(text.slice(pos, h.start));
    if (h.end > h.start) {
      result += `<mark style="background:${h.color};padding:0 2px;border-radius:2px;">${escapeHtml(text.slice(h.start, h.end))}</mark>`;
    }
    pos = Math.max(pos, h.end);
  }
  if (pos < text.length) result += escapeHtml(text.slice(pos));
  return result;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function SavedNotebook({ bookId }: { bookId: number }) {
  const utils = trpc.useUtils();
  const { data: saved, isLoading } = trpc.smartBookLearning.getSavedMessages.useQuery({ bookId });
  const updateNoteMutation = trpc.smartBookLearning.updateSavedNote.useMutation({
    onSuccess: () => utils.smartBookLearning.getSavedMessages.invalidate({ bookId }),
  });
  const deleteMutation = trpc.smartBookLearning.deleteSavedMessage.useMutation({
    onSuccess: () => {
      utils.smartBookLearning.getSavedMessages.invalidate({ bookId });
      toast.success('已刪除收藏');
    },
  });
  const updateHighlightsMutation = trpc.smartBookLearning.updateHighlights.useMutation({
    onSuccess: () => utils.smartBookLearning.getSavedMessages.invalidate({ bookId }),
  });
  const deleteMultipleMutation = trpc.smartBookLearning.deleteMultipleSavedMessages.useMutation({
    onSuccess: (_data, vars) => {
      utils.smartBookLearning.getSavedMessages.invalidate({ bookId });
      setSelectedIds(new Set());
      setSelectMode(false);
      toast.success(`已刪除 ${vars.ids.length} 筆收藏`);
    },
  });
  const deleteAllMutation = trpc.smartBookLearning.deleteAllSavedMessages.useMutation({
    onSuccess: () => {
      utils.smartBookLearning.getSavedMessages.invalidate({ bookId });
      setSelectedIds(new Set());
      setSelectMode(false);
      toast.success('已清空所有收藏筆記');
    },
  });

  const [editingNote, setEditingNote] = useState<Record<number, string>>({});
  const [savingNote, setSavingNote] = useState<Record<number, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  // 批次選取狀態
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const allIds = (saved || []).map((s: any) => s.id);
  const allSelected = allIds.length > 0 && allIds.every((id: number) => selectedIds.has(id));

  const toggleSelectItem = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(allIds));
  };

  // 螢光筆工具列狀態
  const [colorPicker, setColorPicker] = useState<{
    itemId: number;
    x: number;
    y: number;
    selectionStart: number;
    selectionEnd: number;
    selectedText: string;
  } | null>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // 點擊其他地方關閉顏色選擇器
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setColorPicker(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 處理文字選取
  const handleTextSelect = (itemId: number, plainContent: string) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
      return;
    }
    const selectedText = selection.toString();
    // 計算在純文字中的偏移量
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    // 取得最近的 .highlight-content 容器
    const contentEl = (container.nodeType === Node.TEXT_NODE ? container.parentElement : container as Element)?.closest('.highlight-content') as HTMLElement | null;
    if (!contentEl) return;
    // 計算純文字偏移
    const fullText = contentEl.textContent || '';
    const beforeRange = document.createRange();
    beforeRange.setStart(contentEl, 0);
    beforeRange.setEnd(range.startContainer, range.startOffset);
    const start = beforeRange.toString().length;
    const end = start + selectedText.length;
    // 取得選取範圍的 bounding rect
    const rect = range.getBoundingClientRect();
    const containerRect = contentEl.getBoundingClientRect();
    setColorPicker({
      itemId,
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top - containerRect.top - 8,
      selectionStart: start,
      selectionEnd: end,
      selectedText,
    });
  };

  // 套用螢光筆顏色
  const applyColor = (color: string) => {
    if (!colorPicker) return;
    const { itemId, selectionStart, selectionEnd } = colorPicker;
    const item = (saved || []).find((s: any) => s.id === itemId);
    if (!item) return;
    let existing: Array<{ start: number; end: number; color: string }> = [];
    try { existing = JSON.parse(item.highlights || '[]'); } catch { existing = []; }
    // 移除與新標記重疊的舊標記
    const filtered = existing.filter((h) => h.end <= selectionStart || h.start >= selectionEnd);
    filtered.push({ start: selectionStart, end: selectionEnd, color });
    updateHighlightsMutation.mutate({ id: itemId, highlights: JSON.stringify(filtered) });
    setColorPicker(null);
    window.getSelection()?.removeAllRanges();
    toast.success('螢光筆標記已儲存');
  };

  // 清除所有標記
  const clearHighlights = (itemId: number) => {
    updateHighlightsMutation.mutate({ id: itemId, highlights: '[]' });
    toast.success('已清除所有標記');
  };

  // 按章節分組
  const grouped = (saved || []).reduce((acc: Record<string, any[]>, item: any) => {
    const key = item.chapterTitle || `章節 ${item.chapterId}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  );

  if (!saved || saved.length === 0) return (
    <div className="text-center py-16 text-gray-400">
      <NotebookPen className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p className="text-sm">尚無收藏的內容</p>
      <p className="text-xs mt-1">在對話中點擊 AI 回覆旁的 ⭐ 即可收藏</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 批次操作工具列 */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {!selectMode ? (
            <button
              onClick={() => setSelectMode(true)}
              className="text-xs text-gray-500 hover:text-purple-600 border border-gray-200 hover:border-purple-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
            >
              ☑️ 批次選取
            </button>
          ) : (
            <>
              <button
                onClick={toggleSelectAll}
                className="text-xs text-purple-600 border border-purple-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
              >
                {allSelected ? '取消全選' : '全選'}
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => deleteMultipleMutation.mutate({ ids: Array.from(selectedIds) })}
                  disabled={deleteMultipleMutation.isPending}
                  className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                >
                  {deleteMultipleMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  刪除已選 ({selectedIds.size})
                </button>
              )}
              <button
                onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5"
              >取消</button>
            </>
          )}
        </div>
        {/* 一鍵清空按鈕 */}
        {!showDeleteAllConfirm ? (
          <button
            onClick={() => setShowDeleteAllConfirm(true)}
            className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
          >
            🗑️ 一鍵清空
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-500">確定要刪除全部收藏？</span>
            <button
              onClick={() => deleteAllMutation.mutate({ bookId })}
              disabled={deleteAllMutation.isPending}
              className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg disabled:opacity-50 flex items-center gap-1"
            >
              {deleteAllMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              確定刪除
            </button>
            <button
              onClick={() => setShowDeleteAllConfirm(false)}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
            >取消</button>
          </div>
        )}
      </div>
      {Object.entries(grouped).map(([chapterTitle, items]: [string, any[]]) => (
        <div key={chapterTitle}>
          <h3 className="text-sm font-semibold text-purple-700 mb-3 flex items-center gap-2">
            <BookmarkCheck className="w-4 h-4" />
            {chapterTitle}
            <span className="text-xs text-gray-400 font-normal">({items.length} 則)</span>
          </h3>
          <div className="space-y-3">
            {items.map((item: any) => {
              const noteVal = editingNote[item.id] !== undefined ? editingNote[item.id] : (item.note || '');
              const isDirty = editingNote[item.id] !== undefined && editingNote[item.id] !== (item.note || '');
              // 螢光筆標記資料
              let highlights: Array<{ start: number; end: number; color: string }> = [];
              try { highlights = JSON.parse(item.highlights || '[]'); } catch { highlights = []; }
              const hasHighlights = highlights.length > 0;
              // 純文字內容（用於螢光筆偏移計算），過濾掉 options/answer/complete 代碼塊
              const plainContent = (item.content || '')
                .replace(/```options\n[\s\S]*?\n```/g, '')
                .replace(/```answer\n[\s\S]*?\n```/g, '')
                .replace(/```complete[\s\S]*?```/g, '')
                .replace(/```complete/g, '')
                .trim();
              // 將螢光筆標記套用到純文字
              const highlightedHtml = applyHighlights(plainContent, highlights);
              const isSelected = selectedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`bg-white border rounded-xl overflow-hidden flex gap-2 ${
                    isSelected ? 'border-purple-400 ring-1 ring-purple-300' : 'border-gray-200'
                  }`}
                >
                  {/* 勾選框（批次選取模式） */}
                  {selectMode && (
                    <div className="flex items-start pt-4 pl-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectItem(item.id)}
                        className="w-4 h-4 accent-purple-600 cursor-pointer"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                  {/* AI 回覆內容 */}
                  <div className="px-4 pt-3 pb-2 bg-blue-50 border-b border-blue-100">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs text-blue-500">🤖 AI 回覆</p>
                        </div>
                        {/* AI 回覆內容區域 */}
                        <div className="relative">
                          <div
                            className={`text-sm text-gray-700 leading-relaxed break-words w-full ${
                              expandedItems[item.id] ? '' : 'line-clamp-4 overflow-hidden'
                            }`}
                          >
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                                strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                                ul: ({children}) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                                ol: ({children}) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                                li: ({children}) => <li className="mb-0.5">{children}</li>,
                                code: ({children}) => <code className="bg-gray-100 px-1 rounded text-xs">{children}</code>,
                              }}
                            >{plainContent}</ReactMarkdown>
                          </div>
                          {/* 螢光筆功能暫時關閉 */}
                          {false && colorPicker && colorPicker.itemId === item.id && (
                            <div
                              ref={colorPickerRef}
                              className="absolute z-50 flex items-center gap-1 bg-white border border-gray-200 rounded-full shadow-lg px-2 py-1.5"
                              style={{
                                left: `${colorPicker.x}px`,
                                top: `${colorPicker.y}px`,
                                transform: 'translate(-50%, -100%)',
                              }}
                            >
                              <span className="text-xs text-gray-500 mr-1">螢光筆：</span>
                              {HIGHLIGHT_COLORS.map((c) => (
                                <button
                                  key={c.value}
                                  onClick={() => applyColor(c.value)}
                                  className="w-6 h-6 rounded-full border-2 border-white shadow hover:scale-110 transition-transform"
                                  style={{ background: c.value }}
                                  title={c.name}
                                />
                              ))}
                              <button
                                onClick={() => setColorPicker(null)}
                                className="ml-1 text-xs text-gray-400 hover:text-gray-600 px-1"
                              >✕</button>
                            </div>
                          )}
                        </div>
                        {/* 展開/收合按鈕 */}
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="mt-1.5 text-xs text-blue-400 hover:text-blue-600 flex items-center gap-1"
                        >
                          {expandedItems[item.id] ? (
                            <>▲ 收合</>
                          ) : (
                            <>▼ 展開全文</>
                          )}
                        </button>
                      </div>
                      <button
                        onClick={() => deleteMutation.mutate({ id: item.id })}
                        disabled={deleteMutation.isPending}
                        className="shrink-0 p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                        title="刪除收藏"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(typeof item.createdAt === 'string' && !item.createdAt.endsWith('Z') ? item.createdAt + 'Z' : item.createdAt).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {/* 筆記區 */}
                  <div className="px-4 py-3">
                    <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                      <Pencil className="w-3 h-3" />我的筆記
                    </p>
                    <textarea
                      value={noteVal}
                      onChange={(e) => setEditingNote(prev => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="在這裡輸入你的筆記…"
                      rows={3}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent placeholder-gray-300"
                    />
                    {isDirty && (
                      <div className="flex justify-end mt-1.5 gap-2">
                        <button
                          onClick={() => setEditingNote(prev => { const n = {...prev}; delete n[item.id]; return n; })}
                          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
                        >取消</button>
                        <button
                          onClick={async () => {
                            setSavingNote(prev => ({ ...prev, [item.id]: true }));
                            await updateNoteMutation.mutateAsync({ id: item.id, note: noteVal });
                            setEditingNote(prev => { const n = {...prev}; delete n[item.id]; return n; });
                            setSavingNote(prev => ({ ...prev, [item.id]: false }));
                            toast.success('筆記已儲存');
                          }}
                          disabled={savingNote[item.id]}
                          className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg flex items-center gap-1 disabled:opacity-50"
                        >
                          {savingNote[item.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          儲存
                        </button>
                      </div>
                    )}
                  </div>
                  </div>{/* end flex-1 wrapper */}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== 考古題 Tab 元件 =====
function BookExamTab({ bookId }: { bookId: number }) {
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null);
  const [practiceMode, setPracticeMode] = useState<'list' | 'practice' | 'wrongbook' | 'trend'>('list');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [practiceCount, setPracticeCount] = useState<number | 'all'>(20); // 每次練習題數
  const [practiceQuestions, setPracticeQuestions] = useState<any[]>([]); // 本次練習的題目子集
  const [userAnswer, setUserAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [trendResult, setTrendResult] = useState<string>('');
  const [trendLoading, setTrendLoading] = useState(false);

  const setsQuery = trpc.examSetStudent.listSets.useQuery({ smartBookId: bookId });
  const questionsQuery = trpc.examSetStudent.listQuestions.useQuery(
    { examSetId: selectedSetId! },
    { enabled: !!selectedSetId && (practiceMode === 'practice') }
  );
  const wrongBookQuery = trpc.examSetStudent.getWrongBook.useQuery(
    { smartBookId: bookId },
    { enabled: practiceMode === 'wrongbook' }
  );
  const submitAnswerMutation = trpc.examSetStudent.submitAnswer.useMutation();
  const saveNoteMutation = trpc.examSetStudent.saveNote.useMutation();
  const trendMutation = trpc.examSetStudent.analyzeTrend.useMutation();

  const allQuestions = questionsQuery.data || [];
  // 當 practiceQuestions 已設定（開始練習後）使用子集，否則使用全部
  const questions = practiceQuestions.length > 0 ? practiceQuestions : allQuestions;
  const currentQ = questions[currentQuestionIdx];

  const handleSubmitAnswer = async () => {
    if (!currentQ || !userAnswer.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await submitAnswerMutation.mutateAsync({
        questionId: currentQ.id,
        userAnswer: userAnswer.trim(),
      });
      setAiAnalysis(result.analysis);
      setSubmitted(true);
      if (!result.isCorrect) {
        wrongBookQuery.refetch();
      }
    } catch (e) {
      toast.error('提交失敗，請再試一次');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(i => i + 1);
      setUserAnswer('');
      setSubmitted(false);
      setAiAnalysis('');
    } else {
      toast.success(`🎉 已完成本次 ${questions.length} 道題目！`);
      setPracticeMode('list');
      setSelectedSetId(null);
      setCurrentQuestionIdx(0);
      setPracticeQuestions([]);
    }
  };

  // 考古題集列表
  if (practiceMode === 'list') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">📝 考古題練習</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPracticeMode('trend')}
              className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 border border-purple-200 rounded-lg px-3 py-1.5"
            >
              <span>📊</span> 考點趨勢分析
            </button>
            <button
              onClick={() => setPracticeMode('wrongbook')}
              className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-lg px-3 py-1.5"
            >
              <span>❌</span> 錯題本
            </button>
          </div>
        </div>
        {/* 每次練習題數選擇 */}
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
          <span className="text-sm text-gray-600 font-medium">每次練習：</span>
          {([10, 20, 30] as const).map(n => (
            <button
              key={n}
              onClick={() => setPracticeCount(n)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                practiceCount === n ? 'bg-red-600 text-white' : 'bg-white text-gray-600 border hover:bg-red-50'
              }`}
            >{n} 題</button>
          ))}
          <button
            onClick={() => setPracticeCount('all')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              practiceCount === 'all' ? 'bg-red-600 text-white' : 'bg-white text-gray-600 border hover:bg-red-50'
            }`}
          >全部</button>
        </div>
        {setsQuery.isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : !setsQuery.data?.length ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p>尚未有考古題，請等待老師上傳</p>
          </div>
        ) : (
          <div className="space-y-3">
            {setsQuery.data.map((set: any) => (
              <div key={set.id} className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-800">{set.title}</h4>
                    {set.yearRange && <p className="text-xs text-gray-400 mt-0.5">年份：{set.yearRange}</p>}
                    {set.description && <p className="text-sm text-gray-500 mt-1">{set.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">共 {set.questionCount !== undefined ? set.questionCount : '?'} 題</p>
                  </div>
                  <button
                    onClick={async () => {
                      setSelectedSetId(set.id);
                      setPracticeMode('practice');
                      setCurrentQuestionIdx(0);
                      setPracticeQuestions([]); // 先清空，等 query 載入後再切割
                    }}
                    className="bg-red-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-700 flex-shrink-0 ml-3"
                  >
                    開始練習
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 錯題本
  if (practiceMode === 'wrongbook') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setPracticeMode('list')} className="text-gray-500 hover:text-gray-700">
            ← 返回
          </button>
          <h3 className="text-lg font-bold text-gray-800">❌ 錯題本</h3>
        </div>
        {wrongBookQuery.isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : !wrongBookQuery.data?.length ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🎉</p>
            <p>太棒了！目前沒有錯題</p>
          </div>
        ) : (
          <div className="space-y-4">
            {wrongBookQuery.data.map((item: any) => {
              const q = item.question;
              return (
              <div key={item.id} className="bg-white border border-red-100 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">答錯 {item.wrongCount} 次</span>
                  <span className="text-xs text-gray-400">{q?.questionType === 'choice' ? '選擇題' : '簡答題'}</span>
                </div>
                <p className="text-sm text-gray-800 mb-2 whitespace-pre-wrap">{q?.questionText}</p>
                {q?.questionType === 'choice' && q?.options && (
                  <div className="space-y-1 mb-2">
                    {(typeof q.options === 'string' ? JSON.parse(q.options) : q.options).map((opt: any, i: number) => (
                      <div key={i} className={`text-xs px-2 py-1 rounded ${
                        opt.isCorrect ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-600'
                      }`}>{opt.label}. {opt.text}</div>
                    ))}
                  </div>
                )}
                {q?.answerText && <p className="text-xs text-green-700 bg-green-50 rounded p-2 mb-2">✅ 標準答案：{q.answerText}</p>}
                {/* 筆記 */}
                <div className="mt-2 border-t pt-2">
                  {editingNoteId === item.questionId ? (
                    <div className="space-y-2">
                      <textarea
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        placeholder="寫下你的筆記..."
                        className="w-full text-sm border rounded-lg p-2 min-h-[80px] resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            await saveNoteMutation.mutateAsync({ questionId: item.questionId, noteText });
                            setEditingNoteId(null);
                            wrongBookQuery.refetch();
                            toast.success('筆記已儲存');
                          }}
                          className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg"
                        >儲存</button>
                        <button onClick={() => setEditingNoteId(null)} className="text-xs text-gray-500">取消</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingNoteId(item.questionId); setNoteText(item.note?.noteText || ''); }}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      {item.note?.noteText ? `📝 ${item.note.noteText}` : '＋ 新增筆記'}
                    </button>
                  )}
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>
    );
  }

  // 考點趨勢分析模式
  if (practiceMode === 'trend') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setPracticeMode('list')} className="text-gray-500 hover:text-gray-700">
            ← 返回
          </button>
          <h3 className="text-lg font-bold text-gray-800">📊 考點趨勢分析</h3>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-sm text-gray-600 mb-3">會分析所有考古題集的題目，找出高頻考點、年份分布趨勢，幫助您抓重點複習。</p>
          <button
            onClick={async () => {
              setTrendLoading(true);
              setTrendResult('');
              try {
                const res = await trendMutation.mutateAsync({ smartBookId: bookId });
                setTrendResult(res.analysis);
              } catch (e) {
                toast.error('分析失敗，請再試一次');
              } finally {
                setTrendLoading(false);
              }
            }}
            disabled={trendLoading}
            className="w-full bg-purple-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {trendLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> AI 分析中…</> : '🤖 開始 AI 趨勢分析'}
          </button>
        </div>
        {trendResult && (
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-purple-700 mb-2">📊 分析結果</p>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{trendResult}</div>
          </div>
        )}
      </div>
    );
  }

  // 練習模式 - 載入中狀態
  if (practiceMode === 'practice' && questionsQuery.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // 練習模式 - 載入完成後切割題目
  if (practiceMode === 'practice' && allQuestions.length > 0 && practiceQuestions.length === 0) {
    // 尚未切割，進行切割
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    const sliced = practiceCount === 'all' ? shuffled : shuffled.slice(0, practiceCount as number);
    // 使用 setTimeout 避免在 render 中 setState
    setTimeout(() => setPracticeQuestions(sliced), 0);
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // 練習模式
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => { setPracticeMode('list'); setSelectedSetId(null); setCurrentQuestionIdx(0); setSubmitted(false); setAiAnalysis(''); setPracticeQuestions([]); }} className="text-gray-500 hover:text-gray-700">
          ← 返回
        </button>
        <h3 className="text-lg font-bold text-gray-800">第 {currentQuestionIdx + 1} / {questions.length} 題</h3>
      </div>
      {questionsQuery.isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : !currentQ ? (
        <div className="text-center py-12 text-gray-400">載入中...</div>
      ) : (
        <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
          {/* 題目 */}
          <div>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full mr-2">
              {currentQ.questionType === 'choice' ? '選擇題' : '簡答題'}
              {currentQ.sourceYear ? ` · ${currentQ.sourceYear}` : ''}
              {currentQ.sourceExam ? ` · ${currentQ.sourceExam}` : ''}
            </span>
            <p className="text-sm text-gray-800 mt-2 whitespace-pre-wrap leading-relaxed">{currentQ.questionText}</p>
          </div>
          {/* 選擇題選項 */}
          {currentQ.questionType === 'choice' && currentQ.options && (
            <div className="space-y-2">
              {(typeof currentQ.options === 'string' ? JSON.parse(currentQ.options) : currentQ.options).map((opt: any, i: number) => {
                const isSelected = userAnswer === opt.label;
                const isCorrect = opt.isCorrect;
                let cls = 'border rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ';
                if (submitted) {
                  cls += isCorrect ? 'bg-green-100 border-green-400 text-green-800' :
                    isSelected ? 'bg-red-100 border-red-400 text-red-800' : 'bg-gray-50 text-gray-500';
                } else {
                  cls += isSelected ? 'bg-blue-50 border-blue-400 text-blue-800' : 'bg-gray-50 hover:bg-blue-50 text-gray-700';
                }
                return (
                  <button key={i} className={cls} disabled={submitted} onClick={() => setUserAnswer(opt.label)}>
                    {opt.label}. {opt.text}
                  </button>
                );
              })}
            </div>
          )}
          {/* 簡答題輸入 */}
          {currentQ.questionType === 'essay' && (
            <textarea
              value={userAnswer}
              onChange={e => setUserAnswer(e.target.value)}
              disabled={submitted}
              placeholder="請輸入你的答案..."
              className="w-full border rounded-lg p-3 text-sm min-h-[120px] resize-none"
            />
          )}
          {/* 提交按鈕 */}
          {!submitted && (
            <button
              onClick={handleSubmitAnswer}
              disabled={!userAnswer.trim() || isAnalyzing}
              className="w-full bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> AI 分析中...</> : '提交答案'}
            </button>
          )}
          {/* AI 分析結果 */}
          {submitted && aiAnalysis && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-700 mb-1">🤖 AI 分析</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiAnalysis}</p>
            </div>
          )}
          {/* 標準答案（提交後顯示） */}
          {submitted && currentQ.answerText && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-700 mb-1">✅ 標準答案</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{currentQ.answerText}</p>
            </div>
          )}
          {submitted && currentQ.refPageNos && (
            <p className="text-xs text-gray-400">📖 參考講義頁數：{currentQ.refPageNos}</p>
          )}
          {/* 下一題 */}
          {submitted && (
            <button
              onClick={handleNextQuestion}
              className="w-full bg-gray-800 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-900"
            >
              {currentQuestionIdx < questions.length - 1 ? '下一題 →' : '完成練習 🎉'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ===== 書本詳情頁（章節列表 + 進度儀表板） =====
function BookDetail({
  book,
  onBack,
  onSelectChapter,
  isAdmin = false,
}: {
  book: any;
  onBack: () => void;
  onSelectChapter: (chapter: any) => void;
  isAdmin?: boolean;
}) {
  const { data, isLoading } = trpc.smartBookStudent.getChapters.useQuery({ bookId: book.id });
  const [showProgress, setShowProgress] = useState(false);
  const [activeTab, setActiveTab] = useState<'chapters' | 'notebook' | 'credits' | 'quiz' | 'qa' | 'exam'>('chapters');
  const [quizTabKey, setQuizTabKey] = useState(0); // 每次點精選考題 tab 遞增，強制 BookQuizTab 重新掛載以重置 mode
  const creditsQuery = trpc.smartBookLearning.getCreditHistory.useQuery(
    { bookId: book.id, page: 1, pageSize: 30 },
    { enabled: activeTab === 'credits' }
  );
  const myCreditsQuery = trpc.smartBookLearning.getCredits.useQuery(
    { bookId: book.id },
    { enabled: activeTab === 'credits' }
  );
  const qaQuery = trpc.smartBookStudent.getBookQA.useQuery(
    { bookId: book.id },
    { enabled: activeTab === 'qa' }
  );
  const essayQuery = trpc.examSetStudent.listEssayQuestions.useQuery(
    { smartBookId: book.id },
    { enabled: activeTab === 'qa' }
  );
  const utils = trpc.useUtils();
  const handleQACreditsChange = () => {
    utils.smartBookLearning.getCredits.invalidate({ bookId: book.id });
  };

  return (
    <div className="bg-gray-50">
      {/* 書本封面橫幅 */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Button variant="ghost" className="text-white/80 hover:text-white mb-4 -ml-2" onClick={onBack}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            返回書單
          </Button>
          <div className="flex gap-6 items-start">
            <div className="w-24 h-32 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
              {book.coverImageUrl ? (
                <img src={book.coverImageUrl} alt={book.title} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <BookOpen className="w-10 h-10 text-white/60" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold mb-1">{book.title}</h1>
              {book.author && <p className="text-white/70 text-sm mb-2">{book.author}</p>}
              {book.description && <p className="text-white/80 text-sm line-clamp-3">{book.description}</p>}
              {/* 總頁數已隱藏 */}
            </div>
          </div>
        </div>
      </div>

      {/* Tab 切換列 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
            <button
              onClick={() => setActiveTab('chapters')}
              className={`flex items-center gap-1 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'chapters'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <BookMarked className="w-4 h-4" />
              章節目錄
            </button>
            <button
              onClick={() => { setActiveTab('quiz'); setQuizTabKey(k => k + 1); }}
              className={`flex items-center gap-1 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'quiz'
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="text-base">🎯</span>
              精選考題
            </button>
            <button
              onClick={() => setActiveTab('qa')}
              className={`flex items-center gap-1 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'qa'
                  ? 'border-orange-600 text-orange-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="text-base">💬</span>
              精選簡答
            </button>
            <button
              onClick={() => setActiveTab('exam')}
              className={`flex items-center gap-1 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'exam'
                  ? 'border-red-600 text-red-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="text-base">📝</span>
              考古題
            </button>
            <button
              onClick={() => setActiveTab('notebook')}
              className={`flex items-center gap-1 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'notebook'
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <NotebookPen className="w-4 h-4" />
              📌 收藏筆記本
            </button>
            <button
              onClick={() => setActiveTab('credits')}
              className={`flex items-center gap-1 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'credits'
                  ? 'border-yellow-600 text-yellow-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Coins className="w-4 h-4" />
              💰 我的點數
            </button>
          </div>
        </div>
      </div>

      {/* 內容區 */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {activeTab === 'chapters' ? (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : data?.chapters?.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>此書本尚未設定章節</p>
              </div>
            ) : (
              <ChapterList chapters={data?.chapters || []} onSelectChapter={onSelectChapter} pageOffset={book.pageOffset || 0} isAdmin={isAdmin} />
            )}
          </>
        ) : activeTab === 'credits' ? (
          <div className="space-y-4">
            {/* 點數概覽 */}
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                  <Coins className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-yellow-700 font-medium mb-2">本書可用點數</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-amber-50 rounded-lg px-2 py-1.5 text-center">
                      <p className="text-xs text-amber-600">書本贈點</p>
                      <p className="text-lg font-bold text-amber-700">{myCreditsQuery.isLoading ? '...' : (myCreditsQuery.data?.balance ?? 0)}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg px-2 py-1.5 text-center">
                      <p className="text-xs text-yellow-600">今日點數</p>
                      <p className="text-lg font-bold text-yellow-700">{myCreditsQuery.isLoading ? '...' : (myCreditsQuery.data?.dailyBalance ?? 0)}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg px-2 py-1.5 text-center">
                      <p className="text-xs text-blue-600">永久點數</p>
                      <p className="text-lg font-bold text-blue-700">{myCreditsQuery.isLoading ? '...' : (myCreditsQuery.data?.accountPermanentCredits ?? 0)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* 今日已賺點數進度條 */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">&#127942; 今日已賺點數</span>
                <span className="text-sm font-bold text-orange-600">
                  {myCreditsQuery.isLoading ? '...' : (myCreditsQuery.data?.todayEarned ?? 0)}
                  <span className="text-gray-400 font-normal"> / 100 點</span>
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, ((myCreditsQuery.data?.todayEarned ?? 0) / 100) * 100)}%`,
                    background: (myCreditsQuery.data?.todayEarned ?? 0) >= 100
                      ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                      : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {(myCreditsQuery.data?.todayEarned ?? 0) >= 100
                  ? '今日已達到最高上限！明天再來賺更多點數'
                  : `還可賺 ${100 - (myCreditsQuery.data?.todayEarned ?? 0)} 點！去做模擬考試答對題目賺點`
                }
              </p>
            </div>

            {/* 點數明細列表 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-3">點數變動記錄</h3>
              {creditsQuery.isLoading ? (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : creditsQuery.data?.transactions?.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Coins className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">尚無點數記錄</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {creditsQuery.data?.transactions?.map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between bg-white border rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                          tx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {tx.amount > 0 ? '+' : ''}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{tx.description || ({
                            'first_unlock': '首次解鎖書本贈點',
                            'ask_question': 'AI 問答扣點',
                            'challenge_reward': '挑戰獎勵',
                            'chapter_verify': '章節驗證獎勵',
                            'admin_grant': '管理員贈點',
                            'daily_grant': '每日登入贈點',
                            'qa_view': '查看精選簡答扣點',
                            'quiz_reward': '模擬考試答對獎勵',
                            'chapter_quiz_deduct': '章節精選考題扣點',
                            'mock_exam_deduct': '模擬考試扣點',
                          } as Record<string, string>)[tx.type] || tx.type}</p>
                          <p className="text-xs text-gray-400">{new Date(typeof tx.createdAt === 'string' && !tx.createdAt.endsWith('Z') ? tx.createdAt + 'Z' : tx.createdAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${
                          tx.amount > 0 ? 'text-green-600' : 'text-red-500'
                        }`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </p>
                        <p className="text-xs text-gray-400">餘 {tx.balanceAfter}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'quiz' ? (
          <BookQuizTab key={quizTabKey} bookId={book.id} chapters={data?.chapters || []} />
        ) : activeTab === 'qa' ? (
          <BookQATabWithEssay
            bookId={book.id}
            qaData={qaQuery.data}
            isLoading={qaQuery.isLoading}
            onCreditsChange={handleQACreditsChange}
            essayQuestions={essayQuery.data ?? []}
            essayLoading={essayQuery.isLoading}
          />
        ) : activeTab === 'exam' ? (
          <BookExamTab bookId={book.id} />
        ) : (
          <SavedNotebook bookId={book.id} />
        )}
      </div>

      {/* 進度儀表板 Modal */}
      {showProgress && (
        <ProgressDashboard bookId={book.id} onClose={() => setShowProgress(false)} />
      )}
    </div>
  );
}

// ===== 章節列表元件（支援子主題展開） =====
function ChapterList({ chapters, onSelectChapter, pageOffset = 0, isAdmin = false }: { chapters: any[]; onSelectChapter: (ch: any) => void; pageOffset?: number; isAdmin?: boolean }) {
  const toBookPage = (page: number) => page; // startPage/endPage 已是書本印刷頁碼，不需再減 pageOffset
  const [expandedId, setExpandedId] = useState<number | null>(null);
  // 只顯示主章節（無 parentChapterId）
  const mainChapters = chapters.filter((ch: any) => !ch.parentChapterId);
  const getSubTopics = (chId: number) => chapters.filter((ch: any) => ch.parentChapterId === chId);

  return (
    <div className="space-y-2">
      {mainChapters.map((chapter: any, idx: number) => {
        const subTopics = getSubTopics(chapter.id);
        const hasSubs = subTopics.length > 0;
        const isExpanded = expandedId === chapter.id;
        // 沒有知識點的章節：學生無法進入，管理者可進入但顯示警告
        const chapterHasLessonPoints = hasSubs
          ? subTopics.some((st: any) => st.hasLessonPoints)
          : (chapter.hasLessonPoints ?? false);
        const isLocked = !hasSubs && !chapterHasLessonPoints && !isAdmin;
        const showNoLessonWarning = !hasSubs && !chapterHasLessonPoints && isAdmin;
        return (
          <div key={chapter.id}>
            <div
              className={`w-full bg-white border rounded-xl p-4 text-left transition-all group ${
                hasSubs ? "cursor-default" : isLocked ? "opacity-60 cursor-not-allowed" : "hover:border-blue-400 hover:shadow-sm cursor-pointer"
              } ${isExpanded ? "border-blue-300 shadow-sm" : ""} ${showNoLessonWarning ? "border-orange-300 bg-orange-50" : ""}`}
              onClick={() => {
                if (hasSubs) {
                  setExpandedId(isExpanded ? null : chapter.id);
                } else if (!isLocked) {
                  onSelectChapter(chapter);
                }
              }}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  hasSubs ? "bg-purple-50 group-hover:bg-purple-100" : "bg-blue-50 group-hover:bg-blue-100"
                }`}>
                  <span className={`font-bold text-sm ${hasSubs ? "text-purple-600" : "text-blue-600"}`}>{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm transition-colors ${
                    hasSubs ? "group-hover:text-purple-600" : "group-hover:text-blue-600"
                  }`}>{chapter.title}</p>
                  {hasSubs && (
                    <p className="text-xs text-purple-500 mt-0.5">{subTopics.length} 個子主題，點擊選擇學習內容</p>
                  )}
                  {isLocked && (
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Lock className="w-3 h-3" />尚未開放
                    </p>
                  )}
                  {showNoLessonWarning && (
                    <p className="text-xs text-orange-600 mt-0.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />尚未設定知識點，無法發布
                    </p>
                  )}
                  {!hasSubs && ((chapter as any).lessonTotal > 0 ? (chapter as any).lessonCompleted > 0 : (chapter.progress ?? 0) > 0) && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <Progress value={chapter.progress ?? 0} className="h-1.5 flex-1" />
                      {(chapter as any).lessonTotal > 0 ? (
                        <span className="text-xs text-gray-400 shrink-0">{(chapter as any).lessonCompleted}/{(chapter as any).lessonTotal}</span>
                      ) : (
                        <span className="text-xs text-gray-400 shrink-0">{chapter.progress}%</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!hasSubs && (chapter.progress ?? 0) >= 80 && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {hasSubs ? (
                    <ChevronRight className={`w-4 h-4 text-purple-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
                    </>
                  )}
                </div>
              </div>
            </div>
            {/* 子主題列表 */}
            {hasSubs && isExpanded && (
              <div className="ml-6 mt-1 space-y-1">
                {subTopics.map((st: any) => {
                  const stLocked = !(st.hasLessonPoints ?? false) && !isAdmin;
                  const stWarn = !(st.hasLessonPoints ?? false) && isAdmin;
                  return (
                  <button
                    key={st.id}
                    className={`w-full border rounded-xl p-3 text-left transition-all group ${
                      stLocked
                        ? "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed"
                        : stWarn
                        ? "bg-orange-50 border-orange-200 hover:border-orange-400 hover:shadow-sm"
                        : "bg-purple-50 border-purple-200 hover:border-purple-400 hover:bg-purple-100 hover:shadow-sm"
                    }`}
                    onClick={() => { if (!stLocked) onSelectChapter(st); }}
                    disabled={stLocked}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${stLocked ? "bg-gray-300" : stWarn ? "bg-orange-400" : "bg-purple-400"}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${
                          stLocked ? "text-gray-400" : stWarn ? "text-orange-800" : "text-purple-800 group-hover:text-purple-900"
                        }`}>{st.title}</p>
                        {stLocked && <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Lock className="w-3 h-3" />尚未開放</p>}
                        {stWarn && <p className="text-xs text-orange-600 mt-0.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />尚未設定知識點，無法發布</p>}
                        {(st.progress ?? 0) > 0 && (
                          <div className="mt-1 flex items-center gap-2">
                            <Progress value={st.progress ?? 0} className="h-1 flex-1" />
                            <span className="text-xs text-gray-400 shrink-0">{st.progress}%</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {(st.progress ?? 0) >= 80 && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                        {!stLocked && <ChevronRight className={`w-3.5 h-3.5 ${stWarn ? "text-orange-300 group-hover:text-orange-500" : "text-purple-300 group-hover:text-purple-500"}`} />}
                      </div>
                    </div>
                  </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===== 移除頁碼連結（學生端不顯示 PDF，頁碼僅作純文字）=====
// 直接使用 Streamdown 渲染 Markdown，不需要 parsePageReferences

// ===== 章節學習頁面（引導式 AI 對話） =====
function ChapterLearning({
  book,
  chapter: initialChapter,
  onBack,
  isAdmin = false,
}: {
  book: any;
  chapter: any;
  onBack: () => void;
  isAdmin?: boolean;
}) {
  const [chapter, setChapter] = useState<any>(initialChapter);
  const utils = trpc.useUtils();

  // TTS 語音朗讀
  const { speak, speakEnglish, stop, isSpeaking, speakingIndex, autoSpeak } = useTTS();
  const [messages, setMessages] = useState<Array<{
    role: "user" | "assistant";
    content: string;
    isStreaming?: boolean;
    quickReplies?: Array<{ label: string; value: string; type: string }>;
    isCompletion?: boolean;
  }>>([])
  const [isReviewMode, setIsReviewMode] = useState(false); // 測驗完成後進入複習問答模式
  const [isGuidedMode, setIsGuidedMode] = useState(true); // 引導式學習模式（先講解再出選項題）
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [showAskBtn, setShowAskBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 字級大小設定（用 localStorage 儲存）
  const FONT_SIZE_KEY = "smartbook_font_size";
  const FONT_SIZE_MIN = 12;
  const FONT_SIZE_MAX = 22;
  const FONT_SIZE_DEFAULT = 15;
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem(FONT_SIZE_KEY);
    const parsed = saved ? parseInt(saved, 10) : NaN;
    return isNaN(parsed) ? FONT_SIZE_DEFAULT : Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, parsed));
  });
  // 側欄收合狀態（預設展開）
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // 是否為手機版（< 768px）
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  // 取得書本所有章節（用於側欄目錄）
  const { data: chaptersData, refetch: refetchChapters } = trpc.smartBookStudent.getChapters.useQuery({ bookId: book.id });
  const allChapters = chaptersData?.chapters || [];
  const mainChapters = allChapters.filter((ch: any) => !ch.parentChapterId);
  const getSubTopics = (chId: number) => allChapters.filter((ch: any) => ch.parentChapterId === chId);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  // Q&A 展開狀態： key = chapterId, value = Set of expanded QA index
  const [expandedQA, setExpandedQA] = useState<Record<number, Set<number>>>({});
  // 目前視圖 Q&A 的章節 ID
  const [qaChapterId, setQaChapterId] = useState<number | null>(null);
  const pageOffset = book.pageOffset || 0;

  // ===== 新功能狀態 =====
  // 點數
  const { data: creditData, refetch: refetchCredits } = trpc.smartBookLearning.getCredits.useQuery({ bookId: book.id });
  // 複習模式持久化：載入已完成測驗的章節 ID
  const { data: reviewStatusData, refetch: refetchReviewStatus } = trpc.smartBookLearning.getChapterReviewStatus.useQuery(
    { bookId: book.id },
    { staleTime: 60 * 1000 }
  );
  // 今日學習歷史
  const { data: todayHistory, refetch: refetchTodayHistory } = trpc.smartBookLearning.getTodayLearningHistory.useQuery({ bookId: book.id });
  const [showTodayHistory, setShowTodayHistory] = useState(false);
  // 單元QA
  const [showUnitQA, setShowUnitQA] = useState(true);
  const { data: unitQAList, refetch: refetchUnitQA } = trpc.smartBookLearning.getUnitQAList.useQuery(
    { bookId: book.id, chapterId: chapter.id },
    { staleTime: 60 * 1000 }
  );
  const { data: qaCompletion, refetch: refetchQACompletion } = trpc.smartBookLearning.checkUnitQACompletion.useQuery(
    { bookId: book.id, chapterId: chapter.id },
    { staleTime: 30 * 1000 }
  );
  const [answeredQAs, setAnsweredQAs] = useState<Record<number, { selected: string; isCorrect: boolean; correctAnswer: string; explanation: string | null }>>({});
  const submitUnitQAMutation = trpc.smartBookLearning.submitUnitQAAnswer.useMutation({
    onSuccess: (data, variables) => {
      setAnsweredQAs(prev => ({
        ...prev,
        [variables.qaId]: { selected: variables.selectedAnswer, isCorrect: data.isCorrect, correctAnswer: data.correctAnswer || "", explanation: data.explanation || null },
      }));
      refetchQACompletion();
      if (data.isCorrect) toast.success("✅ 答對了！");
      else toast.error("❌ 答錯了，請翻書再看看");
    },
  });

  // 輸入框鎖定：已移除，直接開放提問（互動學習區塊已移除）
  const hasQuestionQA = false;

  // 閱讀倒數計時器
  const [readingCountdown, setReadingCountdown] = useState<number>(0); // 剩餘秒數，0 表示未啟動
  const [readingPage, setReadingPage] = useState<number | null>(null); // 正在閱讀的頁碼
  const readingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 輸入框鎖定（基礎）：閱讀倒數期間鎖住（引導式學習和複習測驗的鎖定在後面定義）
  const isInputLockedBase = readingCountdown > 0;

  // 啟動閱讀倒數
  const startReadingTimer = (page: number, seconds: number = 120) => {
    if (readingTimerRef.current) clearInterval(readingTimerRef.current);
    setReadingPage(page);
    setReadingCountdown(seconds);
    readingTimerRef.current = setInterval(() => {
      setReadingCountdown(prev => {
        if (prev <= 1) {
          clearInterval(readingTimerRef.current!);
          readingTimerRef.current = null;
          setReadingPage(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 清除倒數計時器
  useEffect(() => {
    return () => {
      if (readingTimerRef.current) clearInterval(readingTimerRef.current);
    };
  }, []);

  // 提問扣點
  const spendCreditMutation = trpc.smartBookLearning.spendCreditForQuestion.useMutation({
    onSuccess: (data) => { refetchCredits(); },
    onError: (err) => { toast.error(err.message); },
  });

  // 問題計數（每 10 問提醒清空）
  const [questionCount, setQuestionCount] = useState(0);
  const [showClearReminder, setShowClearReminder] = useState(false);

  // ===== 引導式學習模式 =====
  // 取得章節已發布的知識點
  const { data: lessonPointsData, isLoading: lessonPointsLoading } = trpc.lessonPointsStudent.getPublished.useQuery(
    { chapterId: chapter.id },
    { staleTime: 60 * 1000, placeholderData: (prev: any) => prev }
  );
  // 對知識點選項做隨機排列（每次載入章節時隨機，避免正確答案固定在第一個）
  const lessonPointsList = useMemo(() => {
    const points = lessonPointsData?.points || [];
    return points.map((p: any) => {
      if (!p.options) return p;
      try {
        let opts: string[] = JSON.parse(p.options);
        if (typeof opts === 'string') opts = JSON.parse(opts);
        if (!Array.isArray(opts) || opts.length === 0) return p;
        const correctIdx = p.correctIndex ?? 0;
        const correctAnswer = opts[correctIdx];
        // Fisher-Yates shuffle
        const shuffled = [...opts];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const newCorrectIndex = shuffled.indexOf(correctAnswer);
        return { ...p, options: JSON.stringify(shuffled), correctIndex: newCorrectIndex };
      } catch { return p; }
    });
  }, [lessonPointsData?.points]);
  const hasLessonPoints = lessonPointsData?.hasLessonPoints ?? false;
  // 取得學生的知識點學習進度
  const { data: lessonProgressData, refetch: refetchLessonProgress } = trpc.lessonPointsStudent.getProgress.useQuery(
    { chapterId: chapter.id },
    { staleTime: 30 * 1000 }
  );
  const completedLessonIds = new Set(lessonProgressData?.completedIds || []);
  // 目前顯示的知識點索引
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  // 是否已回答當前知識點
  const [lessonAnswerState, setLessonAnswerState] = useState<{ answered: boolean; correct: boolean; selectedIndex: number | null }>({ answered: false, correct: false, selectedIndex: null });
  const [pendingOptionIndex, setPendingOptionIndex] = useState<number | null>(null); // 即時視覺反饋：按下瞬間
  const [showHint, setShowHint] = useState(false);
  // 是否已完成所有知識點（進入自由問答）
  const [lessonAllCompleted, setLessonAllCompleted] = useState(false);
  // 三層對話結束機制：聊天鎖定狀態
  const [chatLocked, setChatLocked] = useState(false);
  const [chatLockedReason, setChatLockedReason] = useState<'lesson_complete' | 'force_complete' | null>(null);
  // 標記是否正在清空重置（防止 useEffect 覆蓋清空後的 currentLessonIndex）
  const isResettingRef = useRef(false);
  // 待顯示的完成訊息（等 AI streaming 結束後才插入）
  const pendingAllCompletedRef = useRef(false);
  // 記錄知識點答題
  const recordLessonAnswerMutation = trpc.lessonPointsStudent.recordAnswer.useMutation({
    onSuccess: (data) => {
      refetchLessonProgress();
      // 如果所有知識點已完成，等 AI streaming 結束後再顯示完成訊息
      if (data && (data as any).allCompleted && !lessonAllCompleted) {
        pendingAllCompletedRef.current = true;
      }
    },
  });
  // 恢復引導式學習進度（當 lessonProgressData 載入後）
  useEffect(() => {
    if (!lessonProgressData || !lessonPointsList.length) return;
    // 清空重置期間，不覆蓋 currentLessonIndex
    if (isResettingRef.current) {
      isResettingRef.current = false;
      return;
    }
    const completedIds = new Set(lessonProgressData.completedIds || []);
    // 如果所有知識點都已完成，直接進入自由問答
    const allDone = lessonPointsList.every((p: any) => completedIds.has(p.id));
    if (allDone) {
      setLessonAllCompleted(true);
      return;
    }
    // 找到第一個未完成的知識點
    const firstIncompleteIdx = lessonPointsList.findIndex((p: any) => !completedIds.has(p.id));
    if (firstIncompleteIdx > 0) {
      setCurrentLessonIndex(firstIncompleteIdx);
    }
  }, [lessonProgressData?.completedIds?.length, lessonPointsList.length]);

  // 同步 lessonPointsList 和 completedLessonIds 到 ref（供 onSuccess callback 使用）
  useEffect(() => {
    lessonPointsListRef.current = lessonPointsList;
  }, [lessonPointsList]);

  // 答對後自動朗讀例句（英文語音）
  useEffect(() => {
    if (!lessonAnswerState.answered || !lessonAnswerState.correct) return;
    const point = lessonPointsList[currentLessonIndex];
    if (!point || !(point as any).exampleSentence) return;
    // 延遲 600ms 等「答對了！」動畫完成後再朗讀
    const timer = setTimeout(() => {
      speakEnglish((point as any).exampleSentence);
    }, 600);
    return () => clearTimeout(timer);
  }, [lessonAnswerState.answered, lessonAnswerState.correct]);

  // 題型 B（中文句→選英文）：顯示新知識點時，自動依序朗讀英文選項
  useEffect(() => {
    const point = lessonPointsList[currentLessonIndex];
    if (!point) return;
    if (point.questionType !== 'en') return;
    if (lessonAnswerState.answered) return; // 已作答，不重複朗讀
    const options: string[] = (() => { try { return JSON.parse(point.options || '[]'); } catch { return []; } })();
    if (options.length === 0) return;
    // 延遲 800ms 等卡片渲染完成後再朗讀
    const timer = setTimeout(() => {
      const labels = ['A', 'B', 'C', 'D'];
      const fullText = options.map((opt, i) => `${labels[i]}. ${opt}`).join('... ');
      speakEnglish(fullText);
    }, 800);
    return () => clearTimeout(timer);
  }, [currentLessonIndex, lessonPointsList.length]);
  // 知識點 AI 講解觸發記錄（防止重複觸發）
  const lessonPointTriggeredRef = useRef<Set<string>>(new Set());
  // 標記開場白是否已完成（有知識點時，需等開場白完成後才觸發第一個知識點）
  const [isInitialDone, setIsInitialDone] = useState(false);
  // 開場白畫面控制（無歷史記錄且未完成章節時，先顯示開場白）
  const [showWelcome, setShowWelcome] = useState(false);
  // 用 ref 儲存最新的 lessonPointsList（供 onSuccess callback 使用）
  const lessonPointsListRef = useRef<any[]>([]);

  // 圖片上傳相關 state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [imageEditModal, setImageEditModal] = useState<{ open: boolean; file: File | null; onConfirm: ((f: File) => void) | null }>({
    open: false, file: null, onConfirm: null,
  });
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null); // 裁切後尚未送出的圖片 URL
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null); // 預覽用 base64
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const uploadImageMutation = trpc.smartBookStudent.uploadImage.useMutation({
    onSuccess: (data) => {
      setPendingImageUrl(data.imageUrl);
      setIsUploadingImage(false);
      toast.success('圖片已準備好，可以輸入問題後送出');
    },
    onError: () => {
      setIsUploadingImage(false);
      setPendingImagePreview(null);
      toast.error('圖片上傳失敗，請重試');
    },
  });

  // 處理圖片檔案選取（上傳 or 拍照）
  const handleImageFileSelected = (file: File) => {
    if (file.size > 16 * 1024 * 1024) {
      toast.error('圖片檔案不能超過 16MB');
      return;
    }
    setImageEditModal({
      open: true,
      file,
      onConfirm: async (editedFile: File) => {
        setImageEditModal({ open: false, file: null, onConfirm: null });
        setIsUploadingImage(true);
        // 生成預覽
        const reader = new FileReader();
        reader.onload = (e) => setPendingImagePreview(e.target?.result as string);
        reader.readAsDataURL(editedFile);
        // 上傳到 S3
        const reader2 = new FileReader();
        reader2.onload = (e) => {
          const base64 = (e.target?.result as string).split(',')[1];
          uploadImageMutation.mutate({
            fileData: base64,
            fileName: editedFile.name,
            mimeType: editedFile.type,
          });
        };
        reader2.readAsDataURL(editedFile);
      },
    });
  };

  // 一鍵收藏全部對話
  const saveAllMutation = trpc.smartBookLearning.saveAllMessages.useMutation({
    onSuccess: (data) => {
      toast.success(`已收藏 ${data.saved} 則對話！`);
      utils.smartBookLearning.getSavedMessages.invalidate({ bookId: book.id });
    },
    onError: () => toast.error('收藏失敗，請稍後再試'),
  });

  // 一鍵儲存整個對話到收藏
  const saveFullConversationMutation = trpc.smartBookLearning.saveFullConversation.useMutation({
    onSuccess: (data) => {
      toast.success(`對話已儲存到收藏！標題：${data.title}`);
      utils.smartBookLearning.getSavedMessages.invalidate({ bookId: book.id });
    },
    onError: () => toast.error('儲存失敗，請稍後再試'),
  });

  // 引導式學習完成後的複習測驗狀態
  type ReviewQuizStatus = 'idle' | 'loading' | 'active' | 'done';
  const [reviewQuizStatus, setReviewQuizStatus] = useState<ReviewQuizStatus>('idle');
  const [reviewQuizQuestions, setReviewQuizQuestions] = useState<Array<{
    id: number;
    question: string;
    options: string[];
    correctIndex: number;
    hint: string;
  }>>([]);
  const [reviewQuizCurrentIdx, setReviewQuizCurrentIdx] = useState(0);
  const [reviewQuizAnswers, setReviewQuizAnswers] = useState<Record<number, { selected: number; correct: boolean }>>({});
  const [reviewQuizShowHint, setReviewQuizShowHint] = useState(false);
  const generateReviewQuizMutation = trpc.smartBookLearning.generateReviewQuiz.useMutation({
    onSuccess: (data) => {
      setReviewQuizQuestions(data.questions);
      setReviewQuizCurrentIdx(0);
      setReviewQuizAnswers({});
      setReviewQuizShowHint(false);
      setReviewQuizStatus('active');
    },
    onError: () => {
      toast.error('複習測驗生成失敗，請稍後再試');
      setReviewQuizStatus('idle');
      // 即使出題失敗，也進入自由對話
      setLessonAllCompleted(true);
      setIsReviewMode(true);
    },
  });

  // 題庫題數（用於顯示匯出按鈕）
  const { data: reviewBankCount } = trpc.smartBookLearning.getReviewQuizBankCount.useQuery(
    { bookId: book.id, chapterId: chapter.id },
    { enabled: lessonAllCompleted }
  );

  // 輸入框完整鎖定條件（在 hasLessonPoints、lessonAllCompleted、reviewQuizStatus 宣告後）
  // 引導式學習進行中：鎖住輸入框，學生只能點選 AI 附上的選項
  const lastAiMsg = [...messages].reverse().find(m => m.role === 'assistant' && !m.isStreaming && m.content);
  const lastAiHasOptions = !!(lastAiMsg?.content?.match(/```options\n[\s\S]*?\n```/));
  const isGuidedInputLocked = isGuidedMode && !lessonAllCompleted && !isReviewMode; // 引導學習中鎖住，自由問答才解鎖
  const isInputLocked = isInputLockedBase || isGuidedInputLocked || chatLocked; // chatLocked: 三層對話結束機制

  // 休息提醒
  const [showRestReminder, setShowRestReminder] = useState(false);
  const [restCountdown, setRestCountdown] = useState(0);
  const startSessionMutation = trpc.smartBookLearning.startLearningSession.useMutation();
  const heartbeatMutation = trpc.smartBookLearning.heartbeat.useMutation({
    onSuccess: (data) => {
      if (data.shouldRest && !showRestReminder) setShowRestReminder(true);
    },
  });
  const endSessionMutation = trpc.smartBookLearning.endLearningSession.useMutation();

  // 章節切換驗證（已移除，學生可自由切換章節）

  // 挑戰考題
  const [showChallenge, setShowChallenge] = useState(false);
  const [challengeQuestions, setChallengeQuestions] = useState<any[]>([]);
  const [challengeAnswers, setChallengeAnswers] = useState<Record<number, string>>({});
  const [challengeResult, setChallengeResult] = useState<any>(null);
  // 章節完成測驗（進度達 100% 觸發）
  const [showCompletionQuiz, setShowCompletionQuiz] = useState(false);
  const [completionQuizQuestions, setCompletionQuizQuestions] = useState<any[]>([]);
  const [completionQuizAnswers, setCompletionQuizAnswers] = useState<Record<number, string>>({});
  const [completionQuizResult, setCompletionQuizResult] = useState<any>(null);
  const completionTriggeredRef = useRef<Set<number>>(new Set());
  const { data: challengeConfig } = trpc.smartBookLearning.getChallengeConfig.useQuery({ bookId: book.id });
  const startChallengeMutation = trpc.smartBookLearning.startChallenge.useMutation({
    onSuccess: (data) => {
      setChallengeQuestions(data.questions);
      setChallengeAnswers({});
      setChallengeResult(null);
      setShowChallenge(true);
    },
    onError: (e) => toast.error(e.message),
  });
  const startCompletionQuizMutation = trpc.smartBookLearning.startChallenge.useMutation({
    onSuccess: (data) => {
      setCompletionQuizQuestions(data.questions);
      setCompletionQuizAnswers({});
      setCompletionQuizResult(null);
      setShowCompletionQuiz(true);
    },
    onError: () => {
      // 題目不足時靜默處理，直接顯示「章節學習完成」畫面，不顯示錯誤訊息
      setCompletionQuizQuestions([]);
      setCompletionQuizResult(null);
      setShowCompletionQuiz(true);
    },
    retry: false, // 不重試，避免重試時再次觸發錯誤
  });
  const submitCompletionQuizMutation = trpc.smartBookLearning.submitChallenge.useMutation({
    onSuccess: (data) => {
      setCompletionQuizResult(data);
      refetchCredits();
      refetchChapters();
      refetchReviewStatus(); // 更新複習模式持久化狀態
      // 測驗完成後進入複習模式，AI 定位切換為複習問答
      setIsReviewMode(true);
    },
  });
  const submitChallengeMutation = trpc.smartBookLearning.submitChallenge.useMutation({
    onSuccess: (data) => {
      setChallengeResult(data);
      refetchCredits();
      if (data.isAllCorrect) toast.success(`🏆 全對！獲得 ${data.rewardCredits} 點獎勵！`);
    },
  });

   const changeFontSize = (delta: number) => {
    setFontSize(prev => {
      const next = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, prev + delta));
      localStorage.setItem(FONT_SIZE_KEY, String(next));
      return next;
    });
  };

  // 收藏訊息
  const [savedMsgIds, setSavedMsgIds] = useState<Set<number>>(new Set()); // 用 idx 記錄已收藏
  const saveMessageMutation = trpc.smartBookLearning.saveMessage.useMutation({
    onSuccess: (_, vars) => {
      toast.success('已收藏此回覆 ⭐');
      utils.smartBookLearning.getSavedMessages.invalidate({ bookId: book.id });
    },
    onError: (e) => toast.error(e.message),
  });

  // 清空對話
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // 清空重新學習 mutation
  const clearConversationsMutation = trpc.smartBookStudent.clearConversations.useMutation({
    onSuccess: () => {
      // 重置前端狀態
      isResettingRef.current = true; // 防止 useEffect 覆蓋清空後的 currentLessonIndex
      setSavedMsgIds(new Set());
      setCurrentLessonIndex(0);
      setLessonAllCompleted(false); // 重置完成狀態，確保進度條重新顯示
      setIsReviewMode(false); // 重置複習模式
      setIsInitialDone(false);
      setShowClearConfirm(false);
      setHistoryLoaded(true); // 標記為已處理，避免 useEffect 重複觸發
      setMessages([]); // 清空對話
      // 重新取得知識點進度，然後顯示開場白畫面
      refetchLessonProgress().then(() => {
        refetchChapters();
        setShowWelcome(true); // 顯示開場白畫面，等學生點「開始學習」
        toast.success('已清空紀錄，請點擊「開始學習」重新開始！');
      });
    },
    onError: () => {
      toast.error('清除失敗，請稍後再試');
    },
  });

  // 載入歷史對話記錄
  const { data: historyData, isLoading: historyLoading } = trpc.smartBookStudent.getConversations.useQuery(
    { bookId: book.id, chapterId: chapter.id },
    { staleTime: 0 }
  );
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Q&A
  const { data: qaData, refetch: refetchQA } = trpc.smartBookStudent.getChapterQA.useQuery(
    { bookId: book.id, chapterId: qaChapterId ?? chapter.id },
    { enabled: qaChapterId !== null, staleTime: 5 * 60 * 1000 }
  );

  const updateMessageAnswer = trpc.smartBookStudent.updateMessageAnswer.useMutation();

  const sendMessage = trpc.smartBookStudent.sendMessage.useMutation({
    onSuccess: (data) => {
      setMessages(prev => {
        const newMsgs = [...prev];
        const lastIdx = newMsgs.findLastIndex(m => m.isStreaming);
        if (lastIdx >= 0) newMsgs.splice(lastIdx, 1);
        // 清除前一條 AI 訊息的 quickReplies（只有最新一條顯示按鈕）
        const clearedMsgs = newMsgs.map(m => ({ ...m, quickReplies: undefined }));
        clearedMsgs.push({
          role: "assistant",
          content: data.content,
          quickReplies: (data as any).quickReplies || [],
          dbId: (data as any).assistantMessageId ?? undefined,
        });
        return clearedMsgs;
      });
      setLoading(false);
      // 引導式學習：AI 自己控制教學流程，不需要前端附加知識點
      // 標記開場白完成
      if (!isInitialDone) {
        setIsInitialDone(true);
      }
      // 待顯示完成訊息：AI streaming 結束後才插入，避免在 AI 解析前就出現
      // 當所有知識點已完成（pendingAllCompletedRef.current=true）時，直接觸發完成狀態
      // 並移除 AI 回覆中的選項區塊（最後一個知識點的 prompt 會附上選項，但完成後不應顯示）
      if (pendingAllCompletedRef.current) {
        pendingAllCompletedRef.current = false;
        setTimeout(() => {
          setLessonAllCompleted(true);
          setIsReviewMode(true);
          // 直接將完成訊息附加到 AI 最後一條回覆後面，並移除選項區塊
          setMessages(prev => {
            const msgs = [...prev];
            const lastAiIdx = msgs.findLastIndex(m => m.role === 'assistant' && !m.isStreaming);
            if (lastAiIdx >= 0) {
              // 移除最後一條 AI 回覆中的 options 和 answer 區塊（完成後不應顯示選項）
              const cleanedContent = msgs[lastAiIdx].content
                .replace(/```options\n[\s\S]*?\n```/g, '')
                .replace(/```answer\n[\s\S]*?\n```/g, '')
                .trimEnd();
              msgs[lastAiIdx] = {
                ...msgs[lastAiIdx],
                content: cleanedContent + '\n\n---\n\n🎉 **太棒了！本章節所有知識點都學完了！**\n\n現在進入自由問答模式，有任何問題都可以直接問我，也可以上傳圖片或拍照提問！',
              };
            } else {
              // 如果找不到上一條 AI 回覆，才另開新對話框
              msgs.push({ role: 'assistant' as const, content: '🎉 **太棒了！本章節所有知識點都學完了！**\n\n現在進入自由問答模式，有任何問題都可以直接問我，也可以上傳圖片或拍照提問！' });
            }
            return msgs;
          });
        }, 600);
      }
      // 問題計數：每 10 問提醒清空（只在自由對話模式，引導式學習不觸發）
      if (!isGuidedMode) {
        setQuestionCount(prev => {
          const next = prev + 1;
          if (next > 0 && next % 10 === 0) {
            setShowClearReminder(true);
          }
          return next;
        });
      }
      // 更新章節進度
      refetchChapters();
      // 直接用後端回傳的 newProgress 偵測進度達 100%（避免非同步問題）
      const newProgress = (data as any).newProgress;
      // 引導式學習模式下，進度由知識點完成情況控制（recordLessonAnswerMutation.allCompleted），不由對話次數觸發
      if (
        typeof newProgress === 'number' &&
        newProgress >= 100 &&
        !completionTriggeredRef.current.has(chapter.id) &&
        !isReviewMode &&
        !hasLessonPoints // 引導式學習模式（有知識點）下不觸發測驗彈窗
      ) {
        completionTriggeredRef.current.add(chapter.id);
        // 自由問答模式達到 100% 進度：只顯示完成訊息，不彈出測驗
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant' as const,
            content: `🎉 **恭喜你完成「${chapter.title}」的學習！**\n\n你已經掌握本節所有主要內容，繼續保持！`,
            isCompletion: true,
          },
        ]);
      }
      // 偵測 AI 回應是否包含 complete 訊號（引導式學習已完成）
      // 注意：有知識點列表時，後端已移除 complete 訊號，此處只處理 AI 自主模式
      if (!lessonAllCompleted && !hasLessonPoints && data.content.includes('```complete')) {
        // 延遲 800ms，讓 AI 的最後一條回答先顯示完畢，再顯示完成訊息
        setTimeout(() => {
          setLessonAllCompleted(true);
          setIsReviewMode(true);
          setMessages(prev => [
            ...prev,
            { role: 'assistant' as const, content: '🎉 **太棒了！本章節所有重點都學完了！**\n\n現在進入自由問答模式，有任何問題都可以直接問我，也可以上傳圖片或拍照提問！' },
          ]);
        }, 800);
      }
      // 偵測 AI 回應是否包含翻頁指令，若有則啟動閱讀倒數
      const pageMatch = data.content.match(/請翻到第[\s]*([0-9０-９9]+)[\s]*頁|請閱讀第[\s]*([0-9０-９9]+)[\s]*頁|翻到第[\s]*([0-9０-９9]+)[\s]*頁|翻開.*?第[\s]*([0-9０-９9]+)[\s]*頁/);
      if (pageMatch) {
        const pageStr = pageMatch[1] || pageMatch[2] || pageMatch[3] || pageMatch[4];
        const pageNum = parseInt(pageStr.replace(/[０-９]/g, c => String(c.charCodeAt(0) - 0xFF10)));
        if (!isNaN(pageNum)) {
          startReadingTimer(pageNum, 180); // 3 分鐘
          return; // 倒數期間不肁焦輸入框
        }
      }
      // === 三層對話結束機制：偵測後端回傳的標記 ===
      if ((data as any).lessonComplete) {
        // 第1層：AI 偵測課程完成
        setTimeout(() => {
          setChatLocked(true);
          setChatLockedReason('lesson_complete');
        }, 600);
      } else if ((data as any).forceComplete) {
        // 第3層：30 輪強制鎖定
        setTimeout(() => {
          setChatLocked(true);
          setChatLockedReason('force_complete');
        }, 600);
      }

      // AI 回覆完成後自動聰讀（若開啟）
      if (autoSpeak) {
        setTimeout(() => {
          const plainText = data.content
            .replace(/```[\s\S]*?```/g, '') // 移除 code block
            .replace(/#{1,6}\s+/g, '')
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/\*(.+?)\*/g, '$1')
            .replace(/\n/g, ' ')
            .trim()
            .slice(0, 300); // 只朗讀前 300 字
          if (plainText) speak(plainText);
        }, 300);
      }
      // AI 回覆完成後自動聰焦輸入框
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    onError: (err) => {
      setMessages(prev => {
        const newMsgs = [...prev];
        const lastIdx = newMsgs.findLastIndex(m => m.isStreaming);
        if (lastIdx >= 0) newMsgs.splice(lastIdx, 1);
        return newMsgs;
      });
      toast.error("發生錯誤：" + err.message);
      setLoading(false);
    },
  });

  // 初始化：載入歷史或 AI 主動開場
  useEffect(() => {
    if (historyLoaded) return;
    // 等待 historyData、allChapters、lessonPointsData 都載入完成
    if (historyLoading || historyData === undefined) return;
    if (allChapters.length === 0) return;
    if (lessonPointsLoading) return; // 等待知識點資料載入，確保 hasLessonPoints 正確
    setHistoryLoaded(true);

    // 載入時自動恢復複習模式狀態：用 progress >= 80 判斷（與勾勾顯示一致）
    const currentChapterData = allChapters.find((c: any) => c.id === chapter.id);
    const isCurrentChapterReviewed = (currentChapterData?.progress ?? 0) >= 80;
    if (isCurrentChapterReviewed) setIsReviewMode(true);

    if (historyData && historyData.length > 0) {
      // 有歷史記錄：直接載入，已完成章節在最前加入提示
      setIsInitialDone(true); // 有歷史記錄表示開場白已完成
      const msgs = historyData.map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        dbId: m.id,
        chatAnswered: !!m.chatAnswered, // tinyint 可能回傳字串 "1" 或數字 1，用 !! 統一轉 boolean
      }));
      if (isCurrentChapterReviewed) {
        setMessages([
          { role: "assistant", content: "📚 **已切換為自由發問模式**\n\n你已完成本章節的學習，現在可以自由提問，AI 會直接回答你的問題。" },
          ...msgs,
        ]);
      } else {
        setMessages(msgs);
      }
    } else {
      // 無歷史：已完成章節 → 直接 AI 開場；未完成 → 顯示開場白畫面
      if (isCurrentChapterReviewed) {
        // 已完成章節：直接 AI 開場
        setLoading(true);
        setMessages([
          { role: "assistant", content: "📚 **已切換為自由發問模式**\n\n你已完成本章節的學習，現在可以自由提問，AI 會直接回答你的問題。" },
          { role: "assistant", content: "", isStreaming: true },
        ]);
        sendMessage.mutate({
          bookId: book.id,
          chapterId: chapter.id,
          message: "開始學習",
          isInitial: false,
          isReviewMode: true,
          isGuidedMode: false,
          resumeFromIndex: 0,
        });
      } else {
        // 未完成章節：顯示開場白畫面，等學生點擊「開始學習」再觸發 AI
        setShowWelcome(true);
      }
    }
  }, [historyData, historyLoading, allChapters, historyLoaded, chapter.id, lessonPointsLoading]);

  // 使用者是否正在往上滑（如果是，不要強制滾到底部）
  const isUserScrollingRef = useRef(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      // 距離底部超過 150px 視為使用者在往上看
      isUserScrollingRef.current = distFromBottom > 150;
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const isNewMessage = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;
    // 如果使用者正在往上看歷史訊息，不要強制滾到底部
    if (isUserScrollingRef.current && !isNewMessage) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);



  // 繞過 isInputLocked 的發送（用於引導式學習中選項按鈕呼叫）
  // pointIndexOverride: 傳入特定知識點索引（預設=當前知識點, null=不傳知識點）
  const handleSendBypassLock = async (msg: string, noCredit?: boolean, pointIndexOverride?: number | null) => {
    console.log('[DEBUG] handleSendBypassLock called', { msg, noCredit, pointIndexOverride, loading, hasLessonPoints, lessonAllCompleted, isReviewMode, currentLessonIndex });
    if (!msg.trim()) { console.log('[DEBUG] return: empty msg'); return; }
    if (loading) { console.log('[DEBUG] return: loading'); return; }
    // 學生送出訊息時立即停止 TTS 語音（含中英混讀遞迴）
    stop();
    if (!noCredit) {
      try {
        await spendCreditMutation.mutateAsync({ bookId: book.id });
      } catch {
        return;
      }
    }
    setLoading(true);
    const userMsg = { role: 'user' as const, content: msg };
    setMessages(prev => [
      ...prev.filter(m => !m.isStreaming),
      userMsg,
      { role: 'assistant', content: '', isStreaming: true },
    ]);
    // 引導式學習模式下，傳入當前（或指定）知識點
    // pointIndexOverride === null 表示「所有知識點已完成，不傳知識點」→ isInGuidedNow 必須為 false
    // pointIndexOverride === undefined 表示「傳當前知識點」（預設行為）
    // pointIndexOverride === number 表示「傳指定索引的知識點」
    const pointIdx = (pointIndexOverride !== undefined && pointIndexOverride !== null) ? pointIndexOverride : currentLessonIndex;
    // pointIndexOverride === null 明確表示已完成所有知識點，不進入引導式模式
    // pointIdx 必須在陣列範圍內，否則視為已完成所有知識點
    const isInGuidedNow = pointIndexOverride !== null && hasLessonPoints && !lessonAllCompleted && !isReviewMode && pointIdx < lessonPointsList.length;
    const shouldSendLessonPoint = isInGuidedNow && pointIndexOverride !== null;
    const currentPointForBypass = (shouldSendLessonPoint && lessonPointsList[pointIdx])
      ? lessonPointsList[pointIdx]
      : null;
    // pointIndexOverride === null 時：isInGuidedNow=false（不帶知識點），但仍傳 isGuidedMode:true
    // 讓 server 走「引導式學習完成」的鼓勵 prompt，而非普通對話模式
    const isGuidedModeForSend = isInGuidedNow || (pointIndexOverride === null && hasLessonPoints && !lessonAllCompleted);
    sendMessage.mutate({
      bookId: book.id,
      chapterId: chapter.id,
      message: msg,
      isInitial: false,
      isReviewMode: isReviewMode,
      isGuidedMode: isGuidedModeForSend,
      lessonPointId: currentPointForBypass?.id || undefined,
      lessonPoint: currentPointForBypass ? {
        explanation: currentPointForBypass.explanation || '',
        question: currentPointForBypass.question || undefined,
        options: currentPointForBypass.options || undefined,
        correctIndex: currentPointForBypass.correctIndex ?? 0,
        hint: currentPointForBypass.hint || undefined,
        index: pointIdx,
        total: lessonPointsList.length,
      } : undefined,
    });
  };

  const handleSend = async (msg?: string, noCredit?: boolean, userAnswerCorrect?: boolean) => {
    const text = msg || input.trim();
    // 有圖片時可以空文字（預設訊息）
    if (!text && !pendingImageUrl) return;
    if (loading) return;
    if (isInputLocked) return; // 閱讀倒數期間鎖住
    // 學生送出訊息時立即停止 TTS 語音（含中英混讀遞迴）
    stop();
    // 扣點（引導式學習選項不扣點）
    if (!noCredit) {
      try {
        await spendCreditMutation.mutateAsync({ bookId: book.id });
      } catch {
        return; // 點數不足，已顯示錯誤
      }
    }
    const imageUrl = pendingImageUrl;
    const imagePreview = pendingImagePreview;
    setInput("");
    setPendingImageUrl(null);
    setPendingImagePreview(null);
    setLoading(true);
    setShowAskBtn(false);

    // 如果有圖片，在訊息中附加圖片預覽
    const displayContent = imagePreview
      ? `__IMAGE__${imagePreview}__TEXT__${text || '請幫我解說這張圖表的意義、讀法與考試重點。'}`
      : text;
    const userMsg = { role: "user" as const, content: displayContent };
    setMessages(prev => [
      ...prev.filter(m => !m.isStreaming),
      userMsg,
      { role: "assistant", content: "", isStreaming: true },
    ]);

    // 有知識點列表且尚未完成時，自動帶入當前知識點，讓 AI 走 lessonPointPrompt 路徑
    // 注意：currentLessonIndex 必須在陣列範圍內，否則視為已完成所有知識點
    const isStillInGuidedMode = hasLessonPoints && !lessonAllCompleted && !isReviewMode && currentLessonIndex < lessonPointsList.length;
    const currentPointForSend = isStillInGuidedMode
      ? lessonPointsList[currentLessonIndex]
      : null;
    sendMessage.mutate({
      bookId: book.id,
      chapterId: chapter.id,
      message: text || '請幫我解說這張圖表的意義、讀法與考試重點。',
      isInitial: false,
      isReviewMode: isReviewMode,
      isGuidedMode: isStillInGuidedMode,
      imageUrl: imageUrl || undefined,
      userAnswerCorrect: userAnswerCorrect || undefined,
      lessonPointId: currentPointForSend?.id || undefined,
      lessonPoint: currentPointForSend ? {
        explanation: currentPointForSend.explanation || '',
        question: currentPointForSend.question || undefined,
        options: currentPointForSend.options || undefined,
        correctIndex: currentPointForSend.correctIndex ?? 0,
        hint: currentPointForSend.hint || undefined,
        index: currentLessonIndex,
        total: lessonPointsList.length,
      } : undefined,
    });
  };

  // ===== 引導式學習：處理選項點擊 =====
  const handleLessonOptionClick = (optionIndex: number) => {
    // 點選選項時立即停止 TTS 語音（含中英混讀遞迴）
    stop();
    // 答對後阻擋再點；答錯後允許繼續選擇
    if ((lessonAnswerState.answered && lessonAnswerState.correct) || pendingOptionIndex !== null) return;
    // 答錯後再次點選：先重置狀態再作答
    if (lessonAnswerState.answered && !lessonAnswerState.correct) {
      setLessonAnswerState({ answered: false, correct: false, selectedIndex: null });
    }
    setPendingOptionIndex(optionIndex); // 即時視覺反饋
    const currentPoint = lessonPointsList[currentLessonIndex];
    if (!currentPoint) return;
    const options: string[] = JSON.parse(currentPoint.options || '[]');
    const correctIndex: number = Number(currentPoint.correctIndex ?? 0);
    const isCorrect = optionIndex === correctIndex;
    // 短暫延遲讓使用者看到 pending 視覺反饋，再顯示答題結果
    setTimeout(() => {
      setLessonAnswerState({ answered: true, correct: isCorrect, selectedIndex: optionIndex });
      setPendingOptionIndex(null); // 清除 pending 狀態
    }, 150);
    // 記錄答題
    recordLessonAnswerMutation.mutate({
      bookId: book.id,
      chapterId: chapter.id,
      lessonPointId: currentPoint.id,
      correct: isCorrect,
    });
    // 答對：前進到下一個知識點（allCompleted 由後端 recordAnswer 回傳觸發）
    if (isCorrect) {
      setTimeout(() => {
        const nextIndex = currentLessonIndex + 1;
        if (nextIndex < lessonPointsList.length) {
          setCurrentLessonIndex(nextIndex);
          setLessonAnswerState({ answered: false, correct: false, selectedIndex: null });
          setPendingOptionIndex(null);
          setShowHint(false);
        }
        // 如果 nextIndex >= lessonPointsList.length，不在這裡觸發複習測驗
        // 複習測驗由 recordLessonAnswerMutation.onSuccess 中的 allCompleted 觸發
      }, 1500);
    }
    // 答錯：保持紅色高亮 + 顯示 hint，不自動重置，學生可再次選擇
    // （不做任何自動重置，等學生點其他選項再作答）
  };

  const handleAskSelected = () => {
    const question = `請解釋這段內容：「${selectedText}」`;
    setInput(question);
    setShowAskBtn(false);
    inputRef.current?.focus();
  };

  // 快速回覆按鈕
  const quickReplies = [
    { label: "✅ 懂了，繼續", msg: "我懂了，請繼續講下一個主題" },
    { label: "❓ 再解釋一次", msg: "我不太懂，請再解釋一次，用更簡單的方式" },
    { label: "💡 舉個例子", msg: "請舉一個具體的例子說明" },
    { label: "📝 出題考我", msg: "請出一道題目考考我，測試我的理解" },
    { label: "📋 章節摘要", msg: "請給我這個章節的重點摘要" },
  ];

  // 學習計時：啟動 session 和心跳
  useEffect(() => {
    startSessionMutation.mutate({ bookId: book.id });
    const heartbeat = setInterval(() => {
      heartbeatMutation.mutate({ bookId: book.id });
    }, 60000); // 每分鐘心跳
    return () => {
      clearInterval(heartbeat);
      endSessionMutation.mutate({ bookId: book.id });
    };
  }, [book.id]);

  // 引導式學習：AI 自己控制流程，不需要前端附加知識點選項

  // 休息倒數
  useEffect(() => {
    if (!showRestReminder) return;
    setRestCountdown(300); // 5 分鐘
    const timer = setInterval(() => {
      setRestCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowRestReminder(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showRestReminder]);

  // 進度偵測已移至 sendMessage onSuccess（直接用後端回傳的 newProgress）

  // 切換章節時重置對話（加入章節驗證邏輯）
  const handleSelectChapter = (ch: any, skipVerify = false) => {
    if (ch.id === chapter.id) return;
    // 切換章節時立即停止 TTS 語音
    stop();
    // 切換章節：重置所有狀態，讓 useEffect 自動載入歷史或觸發開場白
    setChapter(ch);
    setMessages([]);
    setAnsweredQAs({});
    setIsReviewMode(false); // 先重置，useEffect 會根據進度自動恢復
    setHistoryLoaded(false); // 重置歷史載入標記，觸發 useEffect 重新執行
    setLessonAllCompleted(false); // 重置知識點完成狀態
    setReviewQuizStatus('idle'); // 重置複習測驗狀態
    setCurrentLessonIndex(0); // 重置知識點索引
    setIsInitialDone(false); // 重置開場白完成標記
    setShowWelcome(false); // 重置開場白畫面
  };

  return (
    <div
      className="flex bg-gray-50 overflow-hidden"
      style={{ height: '100%' }}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        (e.currentTarget as any)._mainTouchStartX = touch.clientX;
        (e.currentTarget as any)._mainTouchStartY = touch.clientY;
      }}
      onTouchEnd={(e) => {
        const startX = (e.currentTarget as any)._mainTouchStartX ?? 0;
        const startY = (e.currentTarget as any)._mainTouchStartY ?? 0;
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const dx = endX - startX;
        const dy = endY - startY;
        // 從左編編右滑超過 60px 且從左編開始（startX < 30）→ 開啟側欄
        if (!sidebarOpen && dx > 60 && Math.abs(dx) > Math.abs(dy) && startX < 30) {
          setSidebarOpen(true);
        }
      }}
    >
      {/* 休息提醒 Overlay */}
      {showRestReminder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <Coffee className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">休息一下！</h2>
            <p className="text-gray-600 mb-1">您已連續學習超過 1 小時</p>
            <p className="text-gray-500 text-sm mb-4">起來動一動，5 分鐘後再回來繼續學習 😊</p>
            <div className="text-3xl font-bold text-amber-500 mb-4">
              {Math.floor(restCountdown / 60)}:{String(restCountdown % 60).padStart(2, '0')}
            </div>
            <p className="text-xs text-gray-400 mb-4">倒數結束後自動解除</p>
            <button
              onClick={() => setShowRestReminder(false)}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              我已休息好了，繼續學習
            </button>
          </div>
        </div>
      )}

      {/* 章節切換驗證已移除 */}

      {/* 挑戰考題 Dialog */}
      {showChallenge && (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 my-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />挑戰考題
              </h3>
              <button onClick={() => setShowChallenge(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {challengeResult ? (
              <div className="text-center">
                {challengeResult.isAllCorrect ? (
                  <>
                    <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-3" />
                    <p className="text-xl font-bold text-green-600 mb-1">🎉 全部答對！</p>
                    <p className="text-gray-600 mb-2">獲得 {challengeResult.rewardCredits} 點獎勵！</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold text-gray-700 mb-1">答題結果</p>
                    <p className="text-gray-500 mb-2">答對 {challengeResult.correctCount}/{challengeResult.totalCount} 題</p>
                  </>
                )}
                <div className="space-y-2 text-left mt-4 max-h-60 overflow-y-auto">
                  {challengeResult.results.map((r: any, idx: number) => (
                    <div key={r.qaId} className={`p-3 rounded-lg text-sm ${r.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <p className="font-medium">{idx + 1}. {r.questionText}</p>
                      <p className={r.isCorrect ? 'text-green-700' : 'text-red-600'}>
                        你的答案：{r.selectedAnswer}　正確答案：{r.correctAnswer}
                      </p>
                      {r.explanation && <p className="text-gray-500 text-xs mt-1">{r.explanation}</p>}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowChallenge(false)}
                  className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                >
                  關閉
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  共 {challengeQuestions.length} 題，全部答對可獲得 {challengeConfig?.rewardCredits || 0} 點獎勵！
                </p>
                <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                  {challengeQuestions.map((q: any, idx: number) => (
                    <div key={q.id} className="border rounded-xl p-4">
                      <p className="text-sm font-medium text-gray-800 mb-1">{idx + 1}. {q.questionText}</p>
                      {/* 頁碼已隱藏，讓學生自行翻書找內容 */}
                      <div className="space-y-1.5">
                        {(Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? (() => { try { return JSON.parse(q.options); } catch { return []; } })() : [])).map((opt: any) => (
                          <button
                            key={opt.label}
                            onClick={() => setChallengeAnswers(prev => ({ ...prev, [q.id]: opt.label }))}
                            className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                              challengeAnswers[q.id] === opt.label
                                ? 'border-blue-500 bg-blue-50 text-blue-800 font-medium'
                                : 'border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            <span className="font-bold mr-2">{opt.label}.</span>{opt.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => submitChallengeMutation.mutate({
                    bookId: book.id,
                    answers: Object.entries(challengeAnswers).map(([qaId, selectedAnswer]) => ({ qaId: parseInt(qaId), selectedAnswer })),
                  })}
                  disabled={Object.keys(challengeAnswers).length < challengeQuestions.length || submitChallengeMutation.isPending}
                  className="mt-4 w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-blue-700"
                >
                  {submitChallengeMutation.isPending ? '提交中...' : `提交答案（${Object.keys(challengeAnswers).length}/${challengeQuestions.length} 題已答）`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {/* 章節完成測驗 Dialog */}
      {showCompletionQuiz && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 my-4">
            {/* 標題 */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="text-xl">🎉</span>
                <span>章節完成小測驗</span>
              </h3>
              <button onClick={() => setShowCompletionQuiz(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {completionQuizResult ? (
              // 測驗結果畫面
              <div className="text-center">
                {completionQuizResult.isAllCorrect ? (
                  <>
                    <div className="text-5xl mb-3">🏆</div>
                    <p className="text-xl font-bold text-green-600 mb-1">全部答對！太厲害了！🌟</p>
                    <p className="text-gray-600 mb-1">獲得 <span className="font-bold text-green-600">{completionQuizResult.rewardCredits} 點</span>永久點數！</p>
                  </>
                ) : (
                  <>
                    <div className="text-5xl mb-3">💪</div>
                    <p className="text-xl font-bold text-blue-600 mb-1">測驗完成！</p>
                    <p className="text-gray-600 mb-1">答對 <span className="font-bold">{completionQuizResult.correctCount}/{completionQuizResult.totalCount}</span> 題，獲得 <span className="font-bold text-blue-600">{completionQuizResult.rewardCredits} 點</span>永久點數！</p>
                    <p className="text-sm text-gray-400 mb-3">下次努力看看全對獎勵！</p>
                  </>
                )}
                {/* 答題明細 */}
                <div className="space-y-2 text-left mt-4 max-h-60 overflow-y-auto">
                  {completionQuizResult.results.map((r: any, idx: number) => (
                    <div key={r.qaId} className={`p-3 rounded-lg text-sm ${r.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <p className="font-medium">{idx + 1}. {r.questionText}</p>
                      <p className={r.isCorrect ? 'text-green-700' : 'text-red-600'}>
                        你的答案：{r.selectedAnswer}　正確答案：{r.correctAnswer}
                      </p>
                      {r.explanation && <p className="text-gray-500 text-xs mt-1">{r.explanation}</p>}
                    </div>
                  ))}
                </div>
                {/* 操作按鈕 */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setShowCompletionQuiz(false)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                  >
                    關閉
                  </button>
                  {/* 繼續下一章節 */}
                  {(() => {
                    const currentIdx = mainChapters.findIndex((ch: any) => ch.id === chapter.id);
                    const subTopicsOfCurrent = allChapters.filter((ch: any) => ch.parentChapterId === chapter.id);
                    // 如果是子主題，找同父章節下一個子主題
                    const parentId = (chapter as any).parentChapterId;
                    let nextChapter: any = null;
                    if (parentId) {
                      const siblings = allChapters.filter((ch: any) => ch.parentChapterId === parentId);
                      const sibIdx = siblings.findIndex((ch: any) => ch.id === chapter.id);
                      if (sibIdx >= 0 && sibIdx < siblings.length - 1) {
                        nextChapter = siblings[sibIdx + 1];
                      } else {
                        // 同層最後一個，找下一個主章節
                        const parentIdx = mainChapters.findIndex((ch: any) => ch.id === parentId);
                        if (parentIdx >= 0 && parentIdx < mainChapters.length - 1) {
                          const nextMain = mainChapters[parentIdx + 1];
                          const nextMainSubs = allChapters.filter((ch: any) => ch.parentChapterId === nextMain.id);
                          nextChapter = nextMainSubs.length > 0 ? nextMainSubs[0] : nextMain;
                        }
                      }
                    } else if (subTopicsOfCurrent.length > 0) {
                      nextChapter = subTopicsOfCurrent[0];
                    } else {
                      if (currentIdx >= 0 && currentIdx < mainChapters.length - 1) {
                        const nextMain = mainChapters[currentIdx + 1];
                        const nextMainSubs = allChapters.filter((ch: any) => ch.parentChapterId === nextMain.id);
                        nextChapter = nextMainSubs.length > 0 ? nextMainSubs[0] : nextMain;
                      }
                    }
                    if (!nextChapter) return null;
                    return (
                      <button
                        onClick={() => {
                          setShowCompletionQuiz(false);
                          handleSelectChapter(nextChapter);
                        }}
                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-1"
                      >
                        繼續下一節 <ChevronRight className="w-4 h-4" />
                      </button>
                    );
                  })()}
                </div>
              </div>
            ) : completionQuizQuestions.length === 0 ? (
              // 無題目時（該章節尚未設置考題）
              <div className="text-center py-6">
                <div className="text-5xl mb-3">🎉</div>
                <p className="text-lg font-bold text-green-600 mb-2">章節學習完成！</p>
                <p className="text-gray-500 text-sm mb-4">本章節尚未設置測驗題目，老師將之後新增。</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCompletionQuiz(false)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                  >
                    關閉
                  </button>
                  {(() => {
                    const parentId = (chapter as any).parentChapterId;
                    let nextChapter: any = null;
                    if (parentId) {
                      const siblings = allChapters.filter((ch: any) => ch.parentChapterId === parentId);
                      const sibIdx = siblings.findIndex((ch: any) => ch.id === chapter.id);
                      if (sibIdx >= 0 && sibIdx < siblings.length - 1) nextChapter = siblings[sibIdx + 1];
                      else {
                        const parentIdx = mainChapters.findIndex((ch: any) => ch.id === parentId);
                        if (parentIdx >= 0 && parentIdx < mainChapters.length - 1) {
                          const nextMain = mainChapters[parentIdx + 1];
                          const nextMainSubs = allChapters.filter((ch: any) => ch.parentChapterId === nextMain.id);
                          nextChapter = nextMainSubs.length > 0 ? nextMainSubs[0] : nextMain;
                        }
                      }
                    } else {
                      const currentIdx = mainChapters.findIndex((ch: any) => ch.id === chapter.id);
                      if (currentIdx >= 0 && currentIdx < mainChapters.length - 1) {
                        const nextMain = mainChapters[currentIdx + 1];
                        const nextMainSubs = allChapters.filter((ch: any) => ch.parentChapterId === nextMain.id);
                        nextChapter = nextMainSubs.length > 0 ? nextMainSubs[0] : nextMain;
                      }
                    }
                    if (!nextChapter) return null;
                    return (
                      <button
                        onClick={() => { setShowCompletionQuiz(false); handleSelectChapter(nextChapter); }}
                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-1"
                      >
                        繼續下一節 <ChevronRight className="w-4 h-4" />
                      </button>
                    );
                  })()}
                </div>
              </div>
            ) : (
              // 測驗題目畫面
              <>
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                  <p className="text-sm text-green-700">📚 章節：{chapter.title}</p>
                  <p className="text-xs text-green-600 mt-1">共 {completionQuizQuestions.length} 題 • 完成得 2 點 • 全對得 5 點</p>
                </div>
                <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                  {completionQuizQuestions.map((q: any, idx: number) => (
                    <div key={q.id} className="border rounded-xl p-4">
                      <p className="text-sm font-medium text-gray-800 mb-2">{idx + 1}. {q.questionText}</p>
                      <div className="space-y-1.5">
                        {(Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? (() => { try { return JSON.parse(q.options); } catch { return []; } })() : [])).map((opt: any) => (
                          <button
                            key={opt.label}
                            onClick={() => setCompletionQuizAnswers(prev => ({ ...prev, [q.id]: opt.label }))}
                            className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                              completionQuizAnswers[q.id] === opt.label
                                ? 'border-green-500 bg-green-50 text-green-800 font-medium'
                                : 'border-gray-200 hover:border-green-300'
                            }`}
                          >
                            <span className="font-bold mr-2">{opt.label}.</span>{opt.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => submitCompletionQuizMutation.mutate({
                    bookId: book.id,
                    answers: Object.entries(completionQuizAnswers).map(([qaId, selectedAnswer]) => ({ qaId: parseInt(qaId), selectedAnswer })),
                  })}
                  disabled={Object.keys(completionQuizAnswers).length < completionQuizQuestions.length || submitCompletionQuizMutation.isPending}
                  className="mt-4 w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-green-700"
                >
                  {submitCompletionQuizMutation.isPending ? '提交中...' : `提交答案（${Object.keys(completionQuizAnswers).length}/${completionQuizQuestions.length} 題已答）`}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 今日學習紀錄 Modal */}
      {showTodayHistory && todayHistory && (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />今日學習紀錄
              </h3>
              <button onClick={() => setShowTodayHistory(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 統計摘要 */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{todayHistory.todayVerifications.length}</p>
                <p className="text-xs text-green-700">驗證章節</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{todayHistory.todayEarned}</p>
                <p className="text-xs text-blue-700">獲得點數</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-orange-600">{todayHistory.todaySpent}</p>
                <p className="text-xs text-orange-700">使用點數</p>
              </div>
            </div>

            {/* 驗證章節列表 */}
            {todayHistory.todayVerifications.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">今日驗證章節</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {todayHistory.todayVerifications.map((v: any) => (
                    <div key={v.id} className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      <span className="text-sm text-gray-700 flex-1">{v.chapterTitle || `章節 ${v.chapterId}`}</span>
                      <span className="text-xs text-gray-400">{new Date(v.verifiedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 點數使用記錄 */}
            {todayHistory.todayTransactions.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">點數明細</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {todayHistory.todayTransactions.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-100">
                      <span className="text-gray-600">{t.description || t.type}</span>
                      <span className={t.amount > 0 ? 'text-green-600 font-medium' : 'text-red-500'}>
                        {t.amount > 0 ? '+' : ''}{t.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowTodayHistory(false)}
              className="mt-4 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              關閉
            </button>
          </div>
        </div>
      )}
      {/* 清空對話確認 Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">確定要重新學習？</h3>
                <p className="text-xs text-red-500 font-medium">此操作不可復原</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <p className="text-xs font-semibold text-red-700 mb-2">將會移除所有學習記錄：</p>
              <ul className="text-xs text-red-600 space-y-1">
                <li>✖ 本章節所有對話記錄</li>
                <li>✖ 知識點答題進度（將從第 1 題重新開始）</li>
                <li>✖ 章節學習進度百分比</li>
              </ul>
              <p className="text-xs text-green-700 mt-2">✔ 收藏的筆記不會受影響</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium"
              >取消</button>
              <button
                onClick={() => {
                  clearConversationsMutation.mutate({ bookId: book.id, chapterId: chapter.id });
                }}
                disabled={clearConversationsMutation.isPending}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >{clearConversationsMutation.isPending ? '清除中...' : '確定重新學習'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 達 10 問提醒清空對話 Dialog */}
      {showClearReminder && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🧠</div>
              <h3 className="font-bold text-gray-800 text-lg">AI 已達最佳回答狀態</h3>
              <p className="text-sm text-gray-500 mt-1">你已提問 {questionCount} 個問題</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <p className="text-sm text-amber-800 leading-relaxed">
                為了保持最佳的回答正確率，建議清空對話後重新開始。
                請先收藏重要對話，再進行清空。
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setMessages([]);
                  setSavedMsgIds(new Set());
                  setQuestionCount(0);
                  setShowClearReminder(false);
                  toast.success('對話已清空，重新開始！');
                }}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium"
              >
                🗑️ 清空對話
              </button>
              <button
                onClick={() => setShowClearReminder(false)}
                className="w-full py-2 text-gray-400 hover:text-gray-600 text-sm"
              >
                稍後再說
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 左側章節目錄側欄 - mobile: fixed drawer，desktop: inline */}
      {/* 遮罩層（手機版側欄開啟時顯示） */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div
        className={`bg-white border-r flex flex-col shrink-0 overflow-hidden transition-all duration-300 ${
          isMobile
            ? sidebarOpen
              ? "fixed left-0 top-16 h-[calc(100dvh-4rem)] z-40 w-72 translate-x-0"
              : "fixed left-0 top-16 h-[calc(100dvh-4rem)] z-40 w-72 -translate-x-full"
            : sidebarOpen
              ? "relative h-full w-72"
              : "relative h-full w-0"
        }`}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          (e.currentTarget as any)._touchStartX = touch.clientX;
          (e.currentTarget as any)._touchStartY = touch.clientY;
        }}
        onTouchEnd={(e) => {
          const startX = (e.currentTarget as any)._touchStartX ?? 0;
          const startY = (e.currentTarget as any)._touchStartY ?? 0;
          const endX = e.changedTouches[0].clientX;
          const endY = e.changedTouches[0].clientY;
          const dx = endX - startX;
          const dy = endY - startY;
          // 向左滑動超過 60px 且水平位移大於垂直位移 → 關閉側欄
          if (dx < -60 && Math.abs(dx) > Math.abs(dy)) {
            setSidebarOpen(false);
          }
        }}
      >
        {/* 側欄標題 */}
        <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-sm text-gray-800">章節目錄</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
        {/* 書名 */}
        <div className="px-4 py-2 bg-blue-50 border-b shrink-0">
          <p className="text-xs text-blue-700 font-medium truncate">{book.title}</p>
        </div>
        {/* 章節列表 */}
        <div className="flex-1 overflow-y-auto py-2">
          {mainChapters.map((ch: any, idx: number) => {
            const subTopics = getSubTopics(ch.id);
            const hasSubs = subTopics.length > 0;
            const isCurrentMain = chapter.id === ch.id;
            const isCurrentSub = subTopics.some((st: any) => st.id === chapter.id);
            const isExpanded = expandedChapters.has(ch.id) || isCurrentSub;
            const displayStart = ch.startPage || null;
            const displayEnd = ch.endPage || null;
            return (
              <div key={ch.id}>
                <button
                  className={`w-full text-left px-4 py-2.5 flex items-start gap-2.5 hover:bg-gray-50 transition-colors ${
                    isCurrentMain ? "bg-blue-50 border-r-2 border-blue-500" : ""
                  }`}
                  onClick={() => {
                    if (hasSubs) {
                      setExpandedChapters(prev => {
                        const next = new Set(prev);
                        if (next.has(ch.id)) next.delete(ch.id); else next.add(ch.id);
                        return next;
                      });
                    } else {
                      handleSelectChapter(ch);
                    }
                  }}
                >
                  <span className={`shrink-0 w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium mt-0.5 ${
                    isCurrentMain || isCurrentSub ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
                  }`}>{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug truncate ${
                      isCurrentMain ? "font-semibold text-blue-700" : "text-gray-700"
                    }`}>{ch.title}</p>
                    {hasSubs && (
                      <p className="text-xs text-purple-500 mt-0.5">{subTopics.length} 個子主題</p>
                    )}
                    {/* 頁碼已隱藏，以標題為主讓學生自行翻書 */}
                  </div>
                  {hasSubs && (
                    <ChevronRight className={`w-3.5 h-3.5 text-gray-400 shrink-0 mt-1 transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`} />
                  )}
                </button>
                {/* 子主題 */}
                {hasSubs && isExpanded && (
                  <div className="bg-gray-50">
                    {subTopics.map((st: any) => {
                      const isCurrent = chapter.id === st.id;
                      const stStart = st.startPage || null;
                      const stEnd = st.endPage || null;
                      const isQAOpen = qaChapterId === st.id;
                      const stQAList = (isQAOpen && qaData) ? qaData : [];
                      return (
                        <div key={st.id}>
                          <div
                            role="button"
                            tabIndex={0}
                            className={`w-full text-left pl-10 pr-4 py-2 flex items-start gap-2 hover:bg-blue-50 transition-colors cursor-pointer ${
                              isCurrent ? "bg-blue-50 border-r-2 border-blue-400" : ""
                            }`}
                            onClick={() => handleSelectChapter(st)}
                            onKeyDown={e => e.key === 'Enter' && handleSelectChapter(st)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs leading-snug ${
                                isCurrent ? "font-semibold text-blue-600" : "text-gray-600"
                              }`}>{st.title}</p>
                              {/* 頁碼已隱藏，以標題為主讓學生自行翻書 */}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {(st.progress ?? 0) >= 80 && !isCurrent && (
                                <span className="text-green-500 text-xs" title="已完成">✓</span>
                              )}
                              {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                              {/* Q&A 按鈕 */}
                              <button
                                className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                                  isQAOpen ? "bg-amber-100 text-amber-700" : "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                                }`}
                                title="知識點"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isQAOpen) {
                                    setQaChapterId(null);
                                  } else {
                                    setQaChapterId(st.id);
                                  }
                                }}
                              >
                                知識點
                              </button>
                            </div>
                          </div>
                          {/* Q&A 手風琴列表 */}
                          {isQAOpen && (
                            <div className="bg-amber-50 border-t border-amber-100">
                              {stQAList.length === 0 ? (
                                <div className="px-4 py-3 text-xs text-gray-400">本節尚無知識點內容</div>
                              ) : (
                                stQAList.map((qa: any, qi: number) => {
                                  const isQExpanded = expandedQA[st.id]?.has(qi) ?? false;
                                  return (
                                    <div key={qa.id} className="border-b border-amber-100 last:border-0">
                                      <button
                                        className="w-full text-left px-4 py-2.5 flex items-start gap-2 hover:bg-amber-100 transition-colors"
                                        onClick={() => {
                                          setExpandedQA(prev => {
                                            const cur = new Set(prev[st.id] ?? []);
                                            if (cur.has(qi)) cur.delete(qi); else cur.add(qi);
                                            return { ...prev, [st.id]: cur };
                                          });
                                        }}
                                      >
                                        <span className="shrink-0 w-4 h-4 rounded-full bg-amber-400 text-white text-xs flex items-center justify-center font-bold mt-0.5">{qi + 1}</span>
                                        <p className="flex-1 text-xs font-medium text-gray-700 leading-snug">{qa.question}</p>
                                        <ChevronRight className={`w-3 h-3 text-amber-500 shrink-0 mt-0.5 transition-transform ${
                                          isQExpanded ? "rotate-90" : ""
                                        }`} />
                                      </button>
                                      {isQExpanded && (
                                        <div className="px-4 pb-3 pt-1 ml-6">
                                          <div className="text-xs text-gray-600 leading-relaxed prose prose-sm max-w-none">
                                            <ReactMarkdown>{qa.answer}</ReactMarkdown>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 右側主區域 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* 頂部標題 */}
      <div className="bg-white border-b px-2 sm:px-4 py-2.5 flex items-center gap-1.5 sm:gap-3 shrink-0 overflow-hidden">
        {/* 側欄展開按鈕（收合時顯示） */}
        <button
          onClick={() => setSidebarOpen(true)}
          className={`p-1.5 rounded hover:bg-gray-100 text-gray-500 shrink-0 transition-opacity ${sidebarOpen ? 'opacity-0 pointer-events-none md:hidden' : 'opacity-100'}`}
          title="展開章節目錄"
          aria-label="展開章節目錄"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          返回
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 truncate">{book.title}</p>
          <h2 className="font-semibold text-sm truncate text-gray-800">{chapter.title}</h2>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* 字級調整 */}
          <div className="flex items-center gap-0.5 border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => changeFontSize(-1)}
              disabled={fontSize <= FONT_SIZE_MIN}
              className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold"
              title="縮小字體"
            >
              A-
            </button>
            <span className="hidden sm:inline px-1.5 text-xs text-gray-400 border-x border-gray-200 select-none min-w-[28px] text-center">{fontSize}</span>
            <button
              onClick={() => changeFontSize(1)}
              disabled={fontSize >= FONT_SIZE_MAX}
              className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold"
              title="放大字體"
            >
              A+
            </button>
          </div>
          <div className="hidden md:flex text-xs text-gray-400 items-center gap-1 ml-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>搭配書本閱讀</span>
          </div>
          {/* 點數顯示 */}
          {creditData !== undefined && (
            <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded-full px-2 py-1" title={`書本贈點：${creditData.balance ?? 0} 點 | 今日點數：${creditData.dailyBalance ?? 0} 點 | 永久點數：${(creditData as any).accountPermanentCredits ?? 0} 點`}>
              <Coins className="w-3 h-3 text-yellow-500" />
              {(creditData.balance ?? 0) > 0 && (
                <span className="text-xs font-bold text-amber-600 hidden sm:inline">贈 {creditData.balance}</span>
              )}
              <span className="text-xs font-medium text-yellow-700">
                {creditData.dailyBalance ?? 0}
              </span>
              {((creditData as any).accountPermanentCredits ?? 0) > 0 && (
                <span className="text-xs text-yellow-500 hidden sm:inline">+{(creditData as any).accountPermanentCredits}</span>
              )}
            </div>
          )}
          {/* 今日學習紀錄按鈕 */}
          {todayHistory && (todayHistory.todayVerifications.length > 0 || todayHistory.todaySpent > 0) && (
            <button
              onClick={() => setShowTodayHistory(true)}
              className="flex items-center gap-1 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
              title="今日學習紀錄"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">今日 {todayHistory.todayVerifications.length} 章節</span>
            </button>
          )}
          {/* 挑戰考題按鈕 - 暫時隱藏 */}
          {/* 清空對話按鈕 */}
          {messages.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
              title="清空重新學習"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">重新學習</span>
            </button>
          )}
        </div>
      </div>

      {/* 單元互動QA面板 - 已移除，直接進入 AI 主動教學 */}
      {false && (unitQAList || []).length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 shrink-0">
          <button
            className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors"
            onClick={() => setShowUnitQA(!showUnitQA)}
          >
            <span className="flex items-center gap-2">
              <BookOpenCheck className="w-4 h-4" />
              單元互動學習
              {qaCompletion && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${qaCompletion.isCompleted ? 'bg-green-100 text-green-700' : 'bg-amber-200 text-amber-700'}`}>
                  {qaCompletion.isCompleted ? '✅ 已完成' : `${qaCompletion.answered}/${qaCompletion.total} 題`}
                </span>
              )}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showUnitQA ? 'rotate-180' : ''}`} />
          </button>
          {showUnitQA && (
            <div className="px-4 pb-4 space-y-3 max-h-96 overflow-y-auto">
              {(unitQAList || []).map((qa: any) => {
                const answered = answeredQAs[qa.id];
                const wasAnswered = qa.isAnswered || !!answered;
                const studentAnswer = answered?.selected || qa.studentAnswer;
                const isCorrect = answered?.isCorrect ?? (qa.isCorrect === 1 ? true : qa.isCorrect === 0 ? false : null);
                const correctAnswer = answered?.correctAnswer || qa.correctAnswer;
                const explanation = answered?.explanation || qa.explanation;

                return (
                  <div key={qa.id} className={`bg-white rounded-xl border p-3 ${
                    qa.qaType === 'case_study' ? 'border-blue-200' :
                    qa.qaType === 'question' ? (wasAnswered ? (isCorrect ? 'border-green-300' : 'border-red-200') : 'border-amber-200') :
                    'border-gray-200'
                  }`}>
                    {/* 頁碼和案例標籤 */}
                    {qa.caseLabel && (
                      <div className="flex items-center gap-2 mb-2">
                        {/* 頁碼已隱藏，以標題為主讓學生自行翻書 */}
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          {qa.caseLabel}
                        </span>
                      </div>
                    )}
                    {/* 顯示文字 */}
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-2">{qa.displayText}</p>

                    {/* 問答題選項 */}
                    {qa.qaType === 'question' && qa.questionText && (
                      <div>
                        <p className="text-sm font-medium text-gray-800 mb-2">❓ {qa.questionText}</p>
                        {!wasAnswered ? (
                          <div className="space-y-1.5">
                            {(qa.options as any[] || []).map((opt: any) => (
                              <button
                                key={opt.label}
                                onClick={() => submitUnitQAMutation.mutate({ qaId: qa.id, selectedAnswer: opt.label })}
                                disabled={submitUnitQAMutation.isPending}
                                className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 text-sm hover:border-blue-400 hover:bg-blue-50 transition-colors active:scale-[0.99]"
                              >
                                <span className="font-bold text-blue-600 mr-2">{opt.label}.</span>{opt.text}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className={`p-2.5 rounded-lg text-sm ${
                            isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                          }`}>
                            <p className={isCorrect ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
                              {isCorrect ? '✅ 答對了！' : `❌ 答錯了，正確答案是 ${correctAnswer}`}
                            </p>
                            {explanation && <p className="text-gray-600 text-xs mt-1">{explanation}</p>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== 引導式學習模式：進度指示列 ===== */}
      {!showWelcome && hasLessonPoints && !lessonAllCompleted && !isReviewMode && (
        <div className="bg-white border-b px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
              <BookOpen className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-700">AI 家教引導學習</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {lessonPointsList.map((p: any, i: number) => {
                const isDone = completedLessonIds.has(p.id);
                const isCurrent = !isDone && i === currentLessonIndex;
                return (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      isDone ? 'w-4 bg-green-400'
                      : isCurrent ? 'w-5 bg-blue-500'
                      : 'w-3 bg-gray-200'
                    }`}
                  />
                );
              })}
            </div>
            <span className="text-xs text-gray-400">{completedLessonIds.size}/{lessonPointsList.length}</span>
          </div>
        </div>
      )}

      {/* 引導式學習完成提示（進入自由問答前的過渡） - 已移除静態卡片 UI */}
      {false && hasLessonPoints && lessonAllCompleted && messages.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-lg font-bold text-gray-800">引導式學習完成！</p>
            <p className="text-sm text-gray-500 mt-1">正在切換到自由問答模式...</p>
          </div>
        </div>
      )}

      {/* 引導式學習模式：保留占位符（已移除静態卡片） */}
      {false && hasLessonPoints && !lessonAllCompleted && !isReviewMode && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6">
            {/* 進度指示 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-700">AI 家教引導學習</span>
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1">
                {currentLessonIndex + 1} / {lessonPointsList.length}
              </span>
            </div>

            {/* 知識點卡片 */}
            {(() => {
              const point = lessonPointsList[currentLessonIndex];
              if (!point) return null;
              const options: string[] = (() => { try { return JSON.parse(point.options || '[]'); } catch { return []; } })();
              const correctIndex: number = point.correctIndex ?? 0;
              const hint: string | null = (point as any).hint || null;
              return (
                <div className="space-y-4">
                  {/* 講解區 */}
                  <div className="bg-white rounded-2xl shadow-sm border px-5 py-4">
                    {point.imageUrl && (
                      <img src={point.imageUrl} alt="知識點圖片" className="w-full max-h-64 object-contain rounded-xl mb-4 border" />
                    )}
                    <div className="prose prose-sm max-w-none leading-relaxed [&_p]:mb-3 [&_strong]:font-semibold" style={{ fontSize: `${fontSize}px` }}>
                      <Streamdown>{point.explanation}</Streamdown>
                    </div>
                  </div>

                  {/* 引導問題 */}
                  {point.question && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4">
                      <p className="text-sm font-medium text-blue-800" style={{ fontSize: `${fontSize}px` }}>{point.question}</p>
                    </div>
                  )}

                  {/* 選項按鈕 */}
                  <div className="space-y-2">
                    {options.map((opt, idx) => {
                      const isSelected = lessonAnswerState.selectedIndex === idx;
                      const isCorrect = idx === correctIndex;
                      const isPending = pendingOptionIndex === idx;
                      let btnClass = 'w-full text-left rounded-xl px-4 py-3 border text-sm font-medium transition-all duration-100 ';
                      if (lessonAnswerState.answered) {
                        if (isSelected && lessonAnswerState.correct) btnClass += 'bg-green-100 border-green-400 text-green-800 cursor-not-allowed';
                        else if (isSelected && !lessonAnswerState.correct) btnClass += 'bg-red-100 border-red-400 text-red-800 cursor-pointer hover:bg-red-50';
                        else if (!lessonAnswerState.correct) btnClass += 'bg-white border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 cursor-pointer';
                      } else if (isPending) {
                        // 即時視覺反饋：按下瞬間顯示藍色選中狀態
                        btnClass += 'bg-blue-100 border-blue-400 text-blue-800 scale-95 opacity-80';
                      } else if (pendingOptionIndex !== null) {
                        // 其他選項在 pending 時變灰
                        btnClass += 'bg-gray-50 border-gray-200 text-gray-400 opacity-50 cursor-not-allowed';
                      } else {
                        btnClass += 'bg-white border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 cursor-pointer active:scale-95 active:bg-blue-100';
                      }
                      return (
                        <button
                          key={idx}
                          className={btnClass}
                          style={{ fontSize: `${fontSize}px` }}
                          onClick={() => handleLessonOptionClick(idx)}
                          disabled={(lessonAnswerState.answered && lessonAnswerState.correct) || pendingOptionIndex !== null}
                        >
                          <span className="font-bold mr-2">{['A', 'B', 'C', 'D'][idx]}.</span>{stripOptionPrefix(opt)}
                          {isPending && !lessonAnswerState.answered && <span className="ml-2 animate-pulse">⏳</span>}
                          {lessonAnswerState.answered && isSelected && lessonAnswerState.correct && <span className="ml-2">✅</span>}
                          {lessonAnswerState.answered && isSelected && !lessonAnswerState.correct && <span className="ml-2">❌</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* 答題回饋 */}
                  {lessonAnswerState.answered && lessonAnswerState.correct && (
                    <div className="space-y-3">
                      <div className="rounded-xl px-4 py-3 text-sm font-medium bg-green-50 border border-green-200 text-green-700">
                        ✅ 答對了！繼續下一個知識點...
                      </div>
                      {/* 題型 A：單字卡（英文 = 中文） */}
                      {point.questionType === 'zh' && point.question && (() => {
                        // 從 question 提取英文單字（格式如「請問『resume』的中文意思是？」）
                        const wordMatch = point.question.match(/[『』「」“”‘’"'《》]([a-zA-Z][a-zA-Z\s\-'.]*)[『』「」“”‘’"'《》]/i);
                        const engWord = wordMatch ? wordMatch[1].trim() : null;
                        // 從 options 中找到正確答案的中文意思
                        const opts: string[] = (() => { try { return JSON.parse(point.options || '[]'); } catch { return []; } })();
                        const correctOpt = opts[point.correctIndex ?? 0] || '';
                        if (!engWord && !correctOpt) return null;
                        return (
                          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl px-5 py-4">
                            <p className="text-xs font-semibold text-indigo-400 mb-3 uppercase tracking-wide">🃏 單字記憶</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  {engWord && (
                                    <>
                                      <span className="text-xl font-bold text-indigo-700">{engWord}</span>
                                      {(point as any).wordPartOfSpeech && (
                                        <span className="text-sm italic text-indigo-400 font-medium">{(point as any).wordPartOfSpeech}</span>
                                      )}
                                      <button
                                        onClick={() => speakEnglish(engWord)}
                                        className="w-7 h-7 rounded-full bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center text-indigo-500 transition-colors text-sm"
                                        title="朜讀單字"
                                      >🔊</button>
                                      <span className="text-lg text-gray-400">=</span>
                                    </>
                                  )}
                                  <span className="text-xl font-bold text-purple-700">{correctOpt}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      {/* 例句區塊：答對後顯示 */}
                      {(point as any).exampleSentence && (
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4">
                          <p className="text-xs font-semibold text-blue-500 mb-2 uppercase tracking-wide">📖 請聽以下例句</p>
                          <div className="flex items-start gap-2">
                            <p className="flex-1 text-blue-900 font-medium leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
                              {(point as any).exampleSentence}
                            </p>
                            <button
                              onClick={() => speakEnglish((point as any).exampleSentence)}
                              className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center text-blue-600 transition-colors"
                              title="朗讀例句"
                            >
                              🔊
                            </button>
                          </div>
                          {(point as any).exampleTranslation && (
                            <p className="text-sm text-blue-600 mt-2 leading-relaxed" style={{ fontSize: `${Math.max(fontSize - 2, 12)}px` }}>
                              {(point as any).exampleTranslation}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {/* 答錯提示：顯示 hint，保持可點選項 */}
                  {lessonAnswerState.answered && !lessonAnswerState.correct && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
                      <p className="font-semibold text-amber-700 mb-1">❌ 這個選項不對，再想想看！</p>
                      <p className="text-amber-600">💡 提示：{hint || '想想看，哪個選項跟講解裡的概念最對應？'}</p>
                    </div>
                  )}
                  {/* 「我還不太懂」按鈕（未答題時顯示） */}
                  {!lessonAnswerState.answered && (
                    <div className="pt-1">
                      {!showHint ? (
                        <button
                          onClick={() => setShowHint(true)}
                          className="text-xs text-gray-400 hover:text-blue-500 underline underline-offset-2 transition-colors"
                        >
                          🤔 我還不太懂，給我一點提示
                        </button>
                      ) : (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
                          <p className="font-medium mb-1">💡 提示：</p>
                          <p>{hint || '想想看，哪個選項跟講解裡的概念最對應？'}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 知識點進度點點：綠色=已答對，藍色=當前，灰色=未完成 */}
                  <div className="flex justify-center gap-1.5 pt-2">
                    {lessonPointsList.map((p: any, i) => {
                      const completedIds = new Set(lessonProgressData?.completedIds || []);
                      const isDone = completedIds.has(p.id);
                      const isCurrent = !isDone && i === currentLessonIndex;
                      return (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full transition-all ${
                            isDone ? 'bg-green-400'
                            : isCurrent ? 'bg-blue-500 w-3'
                            : 'bg-gray-200'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 引導式學習完成提示（進入自由問答前的過渡） */}
      {hasLessonPoints && lessonAllCompleted && messages.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-lg font-bold text-gray-800">引導式學習完成！</p>
            <p className="text-sm text-gray-500 mt-1">正在切換到自由問答模式...</p>
          </div>
        </div>
      )}

      {/* 開場白畫面（無歷史記錄且未完成章節時顯示） */}
      {showWelcome && messages.length === 0 && (
        <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            {/* 內部測試提示（管理者可見） */}
            {isAdmin && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 mb-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">內部測試中</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {hasLessonPoints
                      ? `此章節已設定 ${lessonPointsList.length} 個知識點，可發布。目前為管理者測試畫面。`
                      : '此章節尚未設定知識點，無法發布給學生。請先到知識點管理頁面新增知識點。'}
                  </p>
                </div>
              </div>
            )}
            {/* 書本封面 + 章節資訊 */}
            <div className="bg-white rounded-2xl shadow-sm border p-6 mb-4">
              <div className="flex items-center gap-3 mb-4">
                {book.coverImageUrl ? (
                  <img src={book.coverImageUrl} alt={book.title} className="w-14 h-18 object-contain rounded-lg border shadow-sm" style={{ height: '72px' }} />
                ) : (
                  <div className="w-14 h-18 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg border flex items-center justify-center" style={{ height: '72px' }}>
                    <BookOpen className="w-7 h-7 text-blue-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">{book.title}</p>
                  <h2 className="font-bold text-gray-900 text-base leading-tight">{chapter.title}</h2>
                  {chapter.startPage && chapter.endPage && (
                    <p className="text-xs text-gray-400 mt-1">p.{chapter.startPage} – {chapter.endPage}</p>
                  )}
                </div>
              </div>

              {/* 知識點資訊 */}
              {hasLessonPoints && (
                <div className="bg-blue-50 rounded-xl px-4 py-3 mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpenCheck className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700">AI 引導式學習</span>
                  </div>
                  <p className="text-xs text-blue-600">本章節共有 <strong>{lessonPointsList.length}</strong> 個知識點，AI 家教會逐一引導你學習。</p>
                </div>
              )}

              {/* 學習說明 */}
              <div className="space-y-2 mb-5">
                <div className="flex items-start gap-2">
                  <span className="text-sm shrink-0">💬</span>
                  <p className="text-xs text-gray-600">AI 家教會先講解重點內容，再引導你回答問題。</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm shrink-0">📚</span>
                  <p className="text-xs text-gray-600">學習完成後可自由發問，AI 會直接回答你的問題。</p>
                </div>
              </div>

              {/* 開始學習按鈕 */}
              <button
                onClick={() => {
                  setShowWelcome(false);
                  setLoading(true);
                  setMessages([{ role: 'assistant', content: '', isStreaming: true }]);
                  // 計算知識點進度
                  const resumeIdx = (() => {
                    if (!hasLessonPoints) return 0;
                    if (!lessonProgressData?.completedIds?.length || !lessonPointsList.length) return 0;
                    const completedIds = new Set(lessonProgressData.completedIds);
                    const firstIncomplete = lessonPointsList.findIndex((p: any) => !completedIds.has(p.id));
                    return firstIncomplete > 0 ? firstIncomplete : 0;
                  })();
                  sendMessage.mutate({
                    bookId: book.id,
                    chapterId: chapter.id,
                    message: '開始學習',
                    isInitial: true,
                    isReviewMode: false,
                    isGuidedMode: hasLessonPoints,
                    resumeFromIndex: resumeIdx,
                  });
                }}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                開始學習
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 對話主體（引導式學習模式 + 自由問答模式都顯示） */}
      <div ref={chatContainerRef} className={`flex-1 overflow-y-auto ${showWelcome && messages.length === 0 ? 'hidden' : ''}`}>
        <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mr-3 mt-1">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
              )}
                <div className="flex flex-col gap-2 max-w-[82%]">
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-white border shadow-sm rounded-bl-sm text-gray-800"
                  }`}
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {msg.isStreaming ? (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span style={{ fontSize: `${fontSize}px` }}>AI 家教思考中...</span>
                    </div>
                  ) : msg.role === "assistant" ? (
                    (() => {
                      // 解析 ```options 和 ```answer 代碼塊
                      const optionsMatch = msg.content.match(/```options\n([\s\S]*?)\n```/);
                      const answerMatch = msg.content.match(/```answer\n([\s\S]*?)\n```/);
                      const cleanContent = msg.content
                        .replace(/```options\n[\s\S]*?\n```/g, '')
                        .replace(/```answer\n[\s\S]*?\n```/g, '')
                        .replace(/```complete[\s\S]*?```/g, '')
                        .replace(/```complete/g, '')
                        .trim();
                      let parsedOptions: string[] = [];
                      let correctIdx = -1;
                      if (optionsMatch) {
                        try { parsedOptions = JSON.parse(optionsMatch[1]); } catch {}
                      }
                      if (answerMatch) {
                        correctIdx = parseInt(answerMatch[1].trim(), 10);
                      }
                      // 追蹤此訊息是否已回答（用 idx 作 key）
                      const isAnswered = (msg as any).chatAnswered;
                      const selectedIdx = (msg as any).chatSelectedIdx ?? -1;
                      const wrongIdx = (msg as any).chatWrongIdx ?? -1;
                      const hintText = (msg as any).chatHint || '';
                      const msgDbId = (msg as any).dbId ?? null;
                      // 過濾「不太懂」類型選項，並同步計算過濾後的 correctIdx
                      const confusedKeywords = ['不太懂', '再解釋', '不懂'];
                      const filteredOptions: { opt: string; origIdx: number }[] = parsedOptions
                        .map((opt, i) => ({ opt, origIdx: i }))
                        .filter(({ opt }) => !confusedKeywords.some(k => opt.includes(k)));
                      // correctIdx 在過濾後的新索引
                      const filteredCorrectIdx = filteredOptions.findIndex(({ origIdx }) => origIdx === correctIdx);
                      return (
                        <div>
                          {/* 🌐 已上網查詢標記 */}
                          {cleanContent.includes('🌐 已上網查詢最新資訊') && (
                            <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-600">
                              <span>🌐</span>
                              <span className="font-medium">已自動上網查詢最新資訊</span>
                            </div>
                          )}
                          <div className="prose prose-sm max-w-none leading-relaxed [&_p]:mb-3 [&_ul]:mb-3 [&_ol]:mb-3 [&_li]:mb-1 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_strong]:font-semibold" style={{ fontSize: `${fontSize}px` }}>
                            <Streamdown>{cleanContent}</Streamdown>
                          </div>
                          {filteredOptions.length > 0 && !(lessonAllCompleted && !isAnswered) && (
                            <div className="flex flex-col gap-2 mt-3">
                              {filteredOptions.map(({ opt }, oIdx) => {
                                const isCorrect = oIdx === filteredCorrectIdx;
                                const isSelected = oIdx === selectedIdx;
                                const isWrong = oIdx === wrongIdx;
                                let btnCls = 'text-left text-sm rounded-xl px-4 py-2.5 border font-medium transition-all ';
                                const isOpenEnded = filteredCorrectIdx < 0; // 開放式問題（無標準答案）
                                if (isAnswered) {
                                  if (isSelected && isCorrect) btnCls += 'bg-green-100 border-green-400 text-green-800';
                                  else if (isSelected && isOpenEnded) btnCls += 'bg-blue-100 border-blue-400 text-blue-800'; // 開放式/開場白：藍色
                                  else if (isSelected && !isCorrect) btnCls += 'bg-red-100 border-red-400 text-red-800';
                                  else if (isCorrect) btnCls += 'bg-green-50 border-green-300 text-green-700';
                                  else btnCls += 'bg-gray-50 border-gray-200 text-gray-400 opacity-60';
                                } else if (isWrong) {
                                  // 答錯但未鎖定：紅色標記但保留可點
                                  btnCls += 'bg-red-50 border-red-300 text-red-700 cursor-pointer hover:bg-red-100';
                                } else {
                                  btnCls += 'bg-white border-blue-200 text-blue-800 hover:bg-blue-50 hover:border-blue-400 cursor-pointer';
                                }
                                return (
                                  <button
                                    key={oIdx}
                                    disabled={isAnswered}
                                    className={btnCls}
                                    onClick={() => {
                                      if (isAnswered) return;
                                      // 判斷是否選了「我還不太懂」
                                      const isConfused = opt.includes('不太懂') || opt.includes('再解釋') || opt.includes('不懂');
                                      const isInGuidedMode = hasLessonPoints && !lessonAllCompleted && !isReviewMode;
                                      if (isConfused) {
                                        // 不判斷對錯，直接發送給 AI 讓它重新解釋
                                        // 不設 chatAnswered: true，保留選項可重選
                                        // 傳入當前知識點（重新解釋同一個知識點）
                                        handleSendBypassLock(opt, isInGuidedMode, currentLessonIndex);
                                        return;
                                      }
                                      // 判斷對錯（使用過濾後的 filteredCorrectIdx，避免「不太懂」選項導致索引偏移）
                                      const hasCorrectAnswer = filteredCorrectIdx >= 0;
                                      const isCorrectAnswer = hasCorrectAnswer && oIdx === filteredCorrectIdx;
                                      if (opt === '✅ 開始！') {
                                        // 開場白「✅ 開始！」按鈕：不記錄知識點完成，直接出第一個知識點的題目
                                        if (msgDbId) updateMessageAnswer.mutate({ messageId: msgDbId, chatAnswered: true });
                                        setMessages(prev => [
                                          ...prev.filter(m => !m.isStreaming).map((m, i) => i === idx ? { ...m, chatAnswered: true, chatSelectedIdx: oIdx } : m),
                                          { role: 'assistant' as const, content: '', isStreaming: true },
                                        ]);
                                        setLoading(true);
                                        const firstPoint = isInGuidedMode ? lessonPointsList[currentLessonIndex] : null;
                                        sendMessage.mutate({
                                          bookId: book.id,
                                          chapterId: chapter.id,
                                          message: opt,
                                          isInitial: false,
                                          isStartButton: true, // 開場白結束，直接進入第一個知識點
                                          isReviewMode: false,
                                          isGuidedMode: isInGuidedMode,
                                          lessonPointId: firstPoint?.id || undefined,
                                          lessonPoint: firstPoint ? {
                                            explanation: firstPoint.explanation || '',
                                            question: firstPoint.question || undefined,
                                            options: firstPoint.options || undefined,
                                            correctIndex: firstPoint.correctIndex ?? 0,
                                            hint: firstPoint.hint || undefined,
                                            index: currentLessonIndex,
                                            total: lessonPointsList.length,
                                          } : undefined,
                                        });
                                      } else if (!hasCorrectAnswer) {
                                        // 開放式問題（沒有標準答案）：直接發送給 AI，不顯示對錯
                                        // 開放式問題視為已完成，記錄進度並前進到下一個知識點
                                        let nextPointIdx = currentLessonIndex;
                                        let isOpenLastPoint = false;
                                        if (isInGuidedMode) {
                                          const currentPoint = lessonPointsList[currentLessonIndex];
                                          if (currentPoint) {
                                            recordLessonAnswerMutation.mutate({
                                              bookId: book.id,
                                              chapterId: chapter.id,
                                              lessonPointId: currentPoint.id,
                                              correct: true, // 開放式問題視為已完成
                                            });
                                          }
                                          // 前進到下一個知識點
                                          const nextIdx = currentLessonIndex + 1;
                                          if (nextIdx < lessonPointsList.length) {
                                            setCurrentLessonIndex(nextIdx);
                                            nextPointIdx = nextIdx;
                                          } else {
                                            isOpenLastPoint = true; // 已是最後一個知識點
                                          }
                                        }
                                        if (msgDbId) updateMessageAnswer.mutate({ messageId: msgDbId, chatAnswered: true });
                                        setMessages(prev => [
                                          ...prev.filter(m => !m.isStreaming).map((m, i) => i === idx ? { ...m, chatAnswered: true, chatSelectedIdx: oIdx } : m),
                                          { role: 'assistant' as const, content: '', isStreaming: true },
                                        ]);
                                        setLoading(true);
                                        // 若已是最後一個知識點，不傳 lessonPoint，讓 AI 知道已完成所有知識點
                                        const nextPointForSend = (isInGuidedMode && !isOpenLastPoint && lessonPointsList[nextPointIdx]) ? lessonPointsList[nextPointIdx] : null;
                                        sendMessage.mutate({
                                          bookId: book.id,
                                          chapterId: chapter.id,
                                          message: opt,
                                          isInitial: false,
                                          isReviewMode: false,
                                          // 最後一題保持 isGuidedMode:true，讓 server 走「引導式學習完成」 prompt，而非從對話歷史推斷要繼續教下一個知識點
                                          isGuidedMode: isInGuidedMode, // 保持 isGuidedMode:true，最後一題的 lessonPoint:null 會觸發完成模式
                                          lessonPointId: nextPointForSend?.id || undefined,
                                          lessonPoint: nextPointForSend ? {
                                            explanation: nextPointForSend.explanation || '',
                                            question: nextPointForSend.question || undefined,
                                            options: nextPointForSend.options || undefined,
                                            correctIndex: nextPointForSend.correctIndex ?? 0,
                                            hint: nextPointForSend.hint || undefined,
                                            index: nextPointIdx,
                                            total: lessonPointsList.length,
                                          } : undefined,
                                        });
                                      } else if (isCorrectAnswer) {
                                        if (isInGuidedMode) {
                                          // 引導式學習模式且答對：記錄答題進度，前進到下一個知識點
                                          const currentPoint = lessonPointsList[currentLessonIndex];
                                          if (currentPoint) {
                                            recordLessonAnswerMutation.mutate({
                                              bookId: book.id,
                                              chapterId: chapter.id,
                                              lessonPointId: currentPoint.id,
                                              correct: true,
                                            });
                                          }
                                          // 前進到下一個知識點
                                          const nextIdx = currentLessonIndex + 1;
                                          const isLastPoint = nextIdx >= lessonPointsList.length;
                                          if (!isLastPoint) {
                                            setCurrentLessonIndex(nextIdx);
                                          }
                                          // 鎖定選項 + 發送給 AI（傳入下一個知識點，若已是最後一個則不傳）
                                          if (msgDbId) updateMessageAnswer.mutate({ messageId: msgDbId, chatAnswered: true });
                                          setMessages(prev => [
                                            ...prev.filter(m => !m.isStreaming).map((m, i) => i === idx ? { ...m, chatAnswered: true, chatSelectedIdx: oIdx } : m),
                                            { role: 'assistant' as const, content: '', isStreaming: true },
                                          ]);
                                          setLoading(true);
                                          // 若已是最後一個知識點，傳 isGuidedMode:true + lessonPoint:null
                                          // 讓 AI 進入「引導式學習完成」的鼓勵模式，而非從對話歷史推斷要繼續教下一個知識點
                                          const nextPointForCorrect = isLastPoint ? null : (lessonPointsList[nextIdx] || null);
                                          // 當是最後一個知識點時，立即設定 pendingAllCompletedRef
                                          // 不等待 recordLessonAnswerMutation.onSuccess，避免競爭條件導致完成狀態沒有被正確觸發
                                          if (isLastPoint && !lessonAllCompleted) {
                                            pendingAllCompletedRef.current = true;
                                          }
                                          sendMessage.mutate({
                                            bookId: book.id,
                                            chapterId: chapter.id,
                                            message: opt,
                                            isInitial: false,
                                            isReviewMode: false,
                                            isGuidedMode: true, // 最後一題也保持 isGuidedMode:true，讓 server 走「引導式學習完成」 prompt
                                            userAnswerCorrect: true, // 明確告知 AI 學生剛才答對了上一題
                                            lessonPointId: nextPointForCorrect?.id || undefined,
                                            lessonPoint: nextPointForCorrect ? {
                                              explanation: nextPointForCorrect.explanation || '',
                                              question: nextPointForCorrect.question || undefined,
                                              options: nextPointForCorrect.options || undefined,
                                              correctIndex: nextPointForCorrect.correctIndex ?? 0,
                                              hint: nextPointForCorrect.hint || undefined,
                                              index: nextIdx,
                                              total: lessonPointsList.length,
                                            } : undefined,
                                          });
                                        } else {
                                          // 非引導模式答對：傳入 userAnswerCorrect:true，讓 AI 直接給鼓勵而非重新評判
                                          handleSend(opt, false, true);
                                        }
                                      } else {
                                        // 答錯：只標記選項（不永久鎖定），顯示 hint、保留選項按鈕讓學生再試
                                        setMessages(prev => prev.map((m, i) => i === idx
                                          ? { ...m, chatWrongIdx: oIdx, chatHint: (currentLessonIndex >= 0 && lessonPointsList[currentLessonIndex]?.hint) || '' }
                                          : m
                                        ));
                                        if (isInGuidedMode) {
                                          const currentPoint = lessonPointsList[currentLessonIndex];
                                          if (currentPoint) {
                                            recordLessonAnswerMutation.mutate({
                                              bookId: book.id,
                                              chapterId: chapter.id,
                                              lessonPointId: currentPoint.id,
                                              correct: false,
                                            });
                                          }
                                        }
                                      }
                                    }}
                                  >
                                    {isAnswered && isSelected && filteredCorrectIdx >= 0 && isCorrect && <span className="mr-1">✅</span>}
                                    {isAnswered && isSelected && filteredCorrectIdx >= 0 && !isCorrect && <span className="mr-1">❌</span>}
                                    {isAnswered && isSelected && filteredCorrectIdx < 0 && <span className="mr-1">💬</span>}
                                    {!isAnswered && isWrong && <span className="mr-1">❌</span>}
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {/* 答錯後顯示 hint 提示 */}
                          {!isAnswered && wrongIdx >= 0 && (
                            <div className="mt-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                              💡 <strong>提示：</strong>{hintText || '再回到書中找找看，哪個選項跟講解裡的概念最對應？'}
                            </div>
                          )}
                          {/* pendingLessonPoint 已移除：AI 現在自己控制教學流程，不需要附加知識點選項 */}
                        </div>
                      );
                    })()
                  ) : (
                    // 學生訊息：支援含圖片格式
                    (() => {
                      if (msg.content.startsWith('__IMAGE__') && msg.content.includes('__TEXT__')) {
                        const afterImg = msg.content.slice('__IMAGE__'.length);
                        const textIdx = afterImg.indexOf('__TEXT__');
                        const imgSrc = afterImg.slice(0, textIdx);
                        const textPart = afterImg.slice(textIdx + '__TEXT__'.length);
                        return (
                          <div className="flex flex-col gap-2">
                            <img src={imgSrc} alt="圖表" className="max-h-48 w-auto rounded-lg object-contain" />
                            {textPart && <span style={{ fontSize: `${fontSize}px` }}>{textPart}</span>}
                          </div>
                        );
                      }
                      return <span style={{ fontSize: `${fontSize}px` }}>{msg.content}</span>;
                    })()
                  )}
                </div>
                {/* 收藏按鈕：只在 AI 回覆且不是流式狀態時顯示 */}
                {msg.role === "assistant" && !msg.isStreaming && msg.content && (
                  <div className="flex items-center gap-2 pl-1">
                    {/* TTS 朗讀按鈕 */}
                    <button
                      onClick={() => {
                        const ttsKey = 800000 + idx;
                        if (isSpeaking && speakingIndex === ttsKey) {
                          stop();
                        } else {
                          const cleanContent = msg.content
                            .replace(/```options\n[\s\S]*?\n```/g, '')
                            .replace(/```answer\n[\s\S]*?\n```/g, '')
                            .replace(/```complete[\s\S]*?```/g, '')
                            .replace(/#{1,6}\s+/g, '')
                            .replace(/\*\*(.+?)\*\*/g, '$1')
                            .replace(/\n/g, ' ')
                            .trim();
                          speak(cleanContent, ttsKey);
                        }
                      }}
                      className={`flex items-center gap-1 text-xs rounded-full px-2.5 py-1 transition-colors ${
                        isSpeaking && speakingIndex === 800000 + idx
                          ? 'bg-blue-500 text-white'
                          : 'bg-blue-50 text-blue-500 border border-blue-200 hover:bg-blue-100'
                      }`}
                      title="朗讀此回覆"
                    >
                      {isSpeaking && speakingIndex === 800000 + idx
                        ? <><SpeakingWave className="mr-1" /> 停止</>
                        : '🔊 朗讀'
                      }
                    </button>
                    <button
                      onClick={() => {
                        if (savedMsgIds.has(idx)) return;
                        setSavedMsgIds(prev => new Set([...prev, idx]));
                        saveMessageMutation.mutate({
                          bookId: book.id,
                          chapterId: chapter.id,
                          content: msg.content,
                        });
                      }}
                      disabled={savedMsgIds.has(idx) || saveMessageMutation.isPending}
                      className={`flex items-center gap-1 text-xs rounded-full px-2.5 py-1 transition-colors ${
                        savedMsgIds.has(idx)
                          ? 'bg-yellow-50 text-yellow-600 border border-yellow-200 cursor-default'
                          : 'bg-gray-50 text-gray-400 border border-gray-200 hover:bg-yellow-50 hover:text-yellow-500 hover:border-yellow-200'
                      }`}
                      title={savedMsgIds.has(idx) ? '已收藏' : '收藏此回覆'}
                    >
                      {savedMsgIds.has(idx) ? (
                        <><BookmarkCheck className="w-3 h-3" />已收藏</>
                      ) : (
                        <><Bookmark className="w-3 h-3" />收藏</>
                      )}
                    </button>
                  </div>
                )}
                {/* 快捷回應按鈕：在最後一則 AI 訊息下方顯示 */}
                {/* 引導式學習模式且訊息有 options 區塊（不管是否已答對）：隱藏快捷按鈕，防止跳過知識點 */}
                {/* 已完成引導式學習（lessonAllCompleted 或 isReviewMode）：隱藏引導式學習的快捷按鈕 */}
                {/* 引導式學習緊急救援：AI 沒有輸出 options 代碼塊時，顯示「繼續出題」按鈕讓學生推進 */}
                {msg.role === "assistant" && !msg.isStreaming && idx === messages.length - 1 && !loading && hasLessonPoints && !lessonAllCompleted && !isReviewMode && !msg.content.match(/```options\n[\s\S]*?\n```/) && (
                  <div className="flex flex-wrap gap-2 pl-1 mt-2">
                    <button
                      onClick={() => {
                        // AI 格式錯誤時的救援：重新要求 AI 出這個知識點的題目
                        handleSendBypassLock('請繼續出題', true, currentLessonIndex);
                      }}
                      className="text-xs rounded-full px-3 py-1.5 border font-medium transition-all bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100"
                    >
                      ⚠️ 繼續出題
                    </button>
                  </div>
                )}

              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 學習進度條 - 輸入框上方（開場白畫面時隱藏） */}
      {!showWelcome && (() => {
        const currentChapterData = allChapters.find((ch: any) => ch.id === chapter.id);
        const currentProgress = currentChapterData?.progress ?? chapter.progress ?? 0;
        const parentId = currentChapterData?.parentChapterId;
        const siblings = parentId ? allChapters.filter((ch: any) => ch.parentChapterId === parentId) : [];
        const completedSiblings = siblings.filter((ch: any) => (ch.progress ?? 0) >= 80).length;
        const totalSiblings = siblings.length;
        const subTopicsOfCurrent = allChapters.filter((ch: any) => ch.parentChapterId === chapter.id);
        const completedSubs = subTopicsOfCurrent.filter((ch: any) => (ch.progress ?? 0) >= 80).length;
        const totalSubs = subTopicsOfCurrent.length;
        const showSiblingProgress = totalSiblings > 0;
        const showSubProgress = !showSiblingProgress && totalSubs > 0;
        // 引導式學習模式：進度改用知識點完成比例（而非對話次數）
        const lessonTotal = hasLessonPoints ? lessonPointsList.length : 0;
        // 只計算 completedIds 中同時存在於目前 lessonPointsList 的 ID（防止舊知識點 ID 導致進度超過 100%）
        const validLessonIds = new Set(lessonPointsList.map((p: any) => p.id));
        const lessonCompleted = hasLessonPoints
          ? (lessonProgressData?.completedIds ?? []).filter((id: number) => validLessonIds.has(id)).length
          : 0;
        const lessonProgressValue = lessonTotal > 0 ? Math.round((lessonCompleted / lessonTotal) * 100) : 0;
        const progressValue = hasLessonPoints ? lessonProgressValue : currentProgress;
        const progressLabel = hasLessonPoints
          ? `知識點進度 ${lessonCompleted}/${lessonTotal} 個完成`
          : showSiblingProgress
          ? `同章節進度 ${completedSiblings}/${totalSiblings} 個主題完成`
          : showSubProgress
          ? `本章節 ${completedSubs}/${totalSubs} 個主題完成`
          : `本節學習進度 ${progressValue}%`;
        const progressColor = progressValue >= 80 ? 'bg-green-500' : progressValue >= 40 ? 'bg-blue-500' : 'bg-blue-400';
        const isCompleted = hasLessonPoints ? lessonAllCompleted : progressValue >= 100;
        return (
          <div className={`px-4 pt-2 pb-1 border-t shrink-0 ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}>
            <div className="max-w-4xl mx-auto">
              {isCompleted ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎉</span>
                    <span className="text-xs font-semibold text-green-700">本節學習完成！</span>
                    {isReviewMode && (
                      <span className="text-xs text-purple-700 bg-purple-100 rounded-full px-2 py-0.5">📚 複習問答模式 · 每問 1 點</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-green-600">100%</span>
                    {messages.length > 0 && (
                      <button
                        onClick={() => setShowClearConfirm(true)}
                        className="flex items-center gap-1 text-gray-400 hover:text-gray-600 text-xs rounded-full px-2 py-0.5 hover:bg-gray-100 transition-colors"
                        title="清空對話，重新學習"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>重新學習</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">{progressLabel}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-blue-500">{progressValue}%</span>
                    {messages.length > 0 && (
                      <button
                        onClick={() => setShowClearConfirm(true)}
                        className="flex items-center gap-1 text-gray-400 hover:text-gray-600 text-xs rounded-full px-2 py-0.5 hover:bg-gray-100 transition-colors"
                        title="清空對話，重新學習"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>重新學習</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div className="w-full bg-gray-100 rounded-full h-1 mt-1">
                <div
                  className={`h-1 rounded-full transition-all duration-500 ${progressColor}`}
                  style={{ width: `${Math.min(progressValue, 100)}%` }}
                />
              </div>
            </div>
          </div>
        );
      })()}
      {/* 輸入框（開場白畫面時隱藏） */}
      {!showWelcome && <div className="bg-white px-4 py-3 shrink-0">
        {/* 閱讀倒數計時器 */}
        {readingCountdown > 0 && readingPage && (
          <div className="max-w-4xl mx-auto mb-3">
            <div className="rounded-xl px-4 py-3 flex items-center gap-3 bg-blue-50 border border-blue-200">
              <div className="text-xl shrink-0">📖</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-blue-800">請花一點時間閱讀書本相關內容</p>
                <p className="text-xs text-blue-500 mt-0.5">倒數結束後可繼續發問</p>
              </div>
              <div className="shrink-0 text-center">
                <div className="text-xl font-bold text-blue-700 tabular-nums">
                  {Math.floor(readingCountdown / 60)}:{String(readingCountdown % 60).padStart(2, '0')}
                </div>
                <button
                  onClick={() => {
                    if (readingTimerRef.current) clearInterval(readingTimerRef.current);
                    readingTimerRef.current = null;
                    setReadingCountdown(0);
                    setReadingPage(null);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-600 mt-0.5"
                >
                  跳過
                </button>
              </div>
            </div>
          </div>
        )}
        {/* 複習測驗 UI 已移除 */}
        {/* 完成後：匯出題庫 */}
        {lessonAllCompleted && isReviewMode && (reviewBankCount?.count ?? 0) >= 100 && (
          <div className="max-w-4xl mx-auto mb-2 flex gap-2 flex-wrap">
            <a
              href={`/api/smart-book/export-review-questions?bookId=${book.id}&chapterId=${chapter.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-50 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Download className="w-3 h-3" />
              匯出 Word 題庫（共 {reviewBankCount?.count} 題）
            </a>
          </div>
        )}
        {/* 三層對話結束機制：鎖定提示 UI */}
        {chatLocked && (
          <div className="max-w-4xl mx-auto mb-3">
            <div className={`rounded-xl px-4 py-3 border ${
              chatLockedReason === 'lesson_complete'
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <p className={`text-sm font-medium mb-2.5 ${
                chatLockedReason === 'lesson_complete' ? 'text-green-700' : 'text-amber-700'
              }`}>
                {chatLockedReason === 'lesson_complete'
                  ? '✅ 這個知識點已學習完成！'
                  : '⏰ 本章節學習時間已到，你已經學了很多內容了！'}
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    if (hasLessonPoints && !lessonAllCompleted) {
                      setChatLocked(false);
                      setChatLockedReason(null);
                      setCurrentLessonIndex(prev => Math.min(prev + 1, lessonPointsList.length - 1));
                    } else {
                      setChatLocked(false);
                      setChatLockedReason(null);
                      setIsReviewMode(true);
                    }
                  }}
                  className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
                    chatLockedReason === 'lesson_complete'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  {hasLessonPoints && !lessonAllCompleted ? '➡️ 繼續下一個知識點' : '❓ 繼續發問'}
                </button>
                <button
                  onClick={() => {
                    setChatLocked(false);
                    setChatLockedReason(null);
                  }}
                  className="text-sm px-4 py-2 rounded-lg font-medium bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  🔄 繼續討論此知識點
                </button>
              </div>
            </div>
          </div>
        )}
        {!isInputLocked && creditData !== undefined && (((creditData as any).accountPermanentCredits ?? 0) === 0 && (creditData.dailyBalance ?? 0) === 0 && (creditData.balance ?? 0) === 0) && (
          <div className="max-w-4xl mx-auto mb-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 font-medium">書本贈點已用完，可繼續使用每日點數或永久點數提問</p>
            </div>
          </div>
        )}
        {/* 圖片預覽區 - 只有自由問答模式才顯示 */}
        {isReviewMode && (pendingImagePreview || isUploadingImage) && (
          <div className="max-w-4xl mx-auto mb-2 flex items-center gap-2">
            <div className="relative inline-block">
              {pendingImagePreview && (
                <img src={pendingImagePreview} alt="圖表截圖" className="h-16 w-auto rounded-lg border border-blue-200 object-contain" />
              )}
              {isUploadingImage && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                </div>
              )}
              {pendingImagePreview && !isUploadingImage && (
                <button
                  onClick={() => { setPendingImagePreview(null); setPendingImageUrl(null); }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                >×</button>
              )}
            </div>
            {pendingImageUrl && <span className="text-xs text-green-600">圖片已準備，可輸入問題後送出</span>}
          </div>
        )}
        <div className="max-w-4xl mx-auto flex gap-2 items-end">
          {/* 上傳圖片按鈕 - 只有自由問答模式才顯示 */}
          {isReviewMode && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || isInputLocked || !!pendingImagePreview}
              className="shrink-0 h-10 w-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-500 hover:text-blue-500 transition-colors disabled:opacity-40"
              title="上傳圖表截圖"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
          )}
          {/* 拍照按鈕 - 只有自由問答模式才顯示 */}
          {isReviewMode && (
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={loading || isInputLocked || !!pendingImagePreview}
              className="shrink-0 h-10 w-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-500 hover:text-blue-500 transition-colors disabled:opacity-40"
              title="相機拍照"
            >
              <Camera className="w-4 h-4" />
            </button>
          )}
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
             placeholder={chatLocked ? '請點擊上方按鈕繼續學習' : readingCountdown > 0 ? `請先花一點時間閱讀，倒數結束後可繼續發問...` : isGuidedInputLocked ? '📚 引導學習中，請點選上方選項來回答' : pendingImageUrl ? '輸入問題（或直接送出讓 AI 解說圖表）' : isReviewMode ? `📚 自由問答：可直接發問或上傳圖片（書本贈點 ${creditData?.balance ?? 0} + 今日 ${creditData?.dailyBalance ?? 0} + 永久 ${(creditData as any)?.accountPermanentCredits ?? 0} 點）` : `有問題？隨時發問（書本贈點 ${creditData?.balance ?? 0} + 今日 ${creditData?.dailyBalance ?? 0} + 永久 ${(creditData as any)?.accountPermanentCredits ?? 0} 點）`}
            className={`flex-1 text-sm border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 ${
              isInputLocked ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
            }`}
            disabled={loading || isInputLocked || (creditData !== undefined && ((creditData as any).accountPermanentCredits ?? 0) === 0 && (creditData.dailyBalance ?? 0) === 0 && (creditData.balance ?? 0) === 0)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            onPaste={e => {
              // Ctrl+V 貼上截圖偵測 - 只有自由問答模式才啟用
              if (!isReviewMode) return;
              const items = e.clipboardData?.items;
              if (!items) return;
              for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith('image/')) {
                  e.preventDefault();
                  const file = items[i].getAsFile();
                  if (file) handleImageFileSelected(file);
                  break;
                }
              }
            }}
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={(!input.trim() && !pendingImageUrl) || loading || isInputLocked || (creditData !== undefined && ((creditData as any).accountPermanentCredits ?? 0) === 0 && (creditData.dailyBalance ?? 0) === 0 && (creditData.balance ?? 0) === 0)}
            className="shrink-0 h-10 w-10 rounded-xl"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        {/* 隱藏的檔案選取 input */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFileSelected(f); e.target.value = ''; }} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFileSelected(f); e.target.value = ''; }} />
      </div>}
      {/* 圖片裁切 Modal */}
      <ImageEditModal
        file={imageEditModal.file}
        open={imageEditModal.open}
        onClose={() => setImageEditModal({ open: false, file: null, onConfirm: null })}
        onConfirm={(editedFile) => { if (imageEditModal.onConfirm) imageEditModal.onConfirm(editedFile); }}
      />


      </div>
    </div>
  );
}
// ===== 主元件 ======
export default function SmartBooks() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [view, setView] = useState<"list" | "verify" | "detail" | "chapter">("list");
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<any>(null);

  const enterBookMutation = trpc.smartBookLearning.enterBook.useMutation({
    onSuccess: (data) => {
      if (data.granted && data.credits > 0) {
        toast.success(`🎉 首次解鎖此書！贈送你 ${data.credits} 點，可用來向 AI 提問`);
      }
    },
  });

  const handleSelectBook = (book: any) => {
    setSelectedBook(book);
    // 驗證已移除，直接進入書本
    setView("detail");
    // 觸發首次解鎖贈點（已解鎖過則自動跳過）
    enterBookMutation.mutate({ bookId: book.id });
  };

  if (view === "chapter" && selectedBook && selectedChapter) {
    return (
      <ChapterLearning
        key={selectedChapter.id}
        book={selectedBook}
        chapter={selectedChapter}
        onBack={() => setView("detail")}
        isAdmin={(user as any)?.role === "admin"}
      />
    );
  }

  if (view === "detail" && selectedBook) {
    return (
      <BookDetail
        book={selectedBook}
        onBack={() => {
          utils.smartBookStudent.list.invalidate();
          setView("list");
        }}
        onSelectChapter={(chapter) => {
          setSelectedChapter(chapter);
          setView("chapter");
        }}
        isAdmin={(user as any)?.role === "admin"}
      />
    );
  }

  return <BookList onSelectBook={handleSelectBook} />;
}
