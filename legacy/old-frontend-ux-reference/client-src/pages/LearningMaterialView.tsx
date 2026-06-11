/**
 * PDF 學習頁面（分割畫面）
 * 左側：「📋 題目清單 / 📄 PDF原檔」切換 tab
 * 右側：AI 學習助教對話框（支援貼上圖片、快捷按鈕）
 */

import { useState, useRef, useEffect, useMemo } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ChevronLeft,
  Send,
  HelpCircle,
  BookOpen,
  Image as ImageIcon,
  Save,
  Settings,
  Trash2,
  Loader2,
  ClipboardList,
  FileText,
  PanelLeft,
  Columns2,
  PanelRight,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { cleanMarkdown } from "@/lib/markdownCleaner";
import PdfViewerWithCrop from "@/components/PdfViewerWithCrop";
import { ImageEditModal } from "@/components/ImageEditModal";
import QuestionPanel, { ExtractedQuestion } from "@/components/QuestionPanel";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface Message {
  role: "user" | "assistant";
  content: string;
  displayContent?: string; // 顯示給學生看的文字（隱藏 prompt 指令）
  image?: string; // Base64 圖片（相容舊格式）
  images?: string[]; // 多張 Base64 圖片
  isDetailRequest?: boolean; // 標記此訊息是詳解請求，對應的回應不顯示詳解按鈕
  solutionImages?: string[]; // 老師解析圖（AI 解題後附加）
}

export default function LearningMaterialView() {
  const [, params] = useRoute("/learning/:id");
  const materialId = params?.id ? parseInt(params.id) : 0;

  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  // 左側 tab 切換：'questions' 或 'pdf'
  const [leftTab, setLeftTab] = useState<'questions' | 'pdf'>('pdf');

  // 版面模式：'left'=左側全螢幕, 'split'=分割, 'right'=右側全螢幕
  const [layoutMode, setLayoutMode] = useState<'left' | 'split' | 'right'>('split');

  // AI 回應設定
  const [responseMode, setResponseMode] = useState<'streaming' | 'complete'>(() => {
    return (localStorage.getItem('aiResponseMode') as 'streaming' | 'complete') || 'streaming';
  });
  const [streamingSpeed, setStreamingSpeed] = useState<'slow' | 'normal' | 'fast'>(() => {
    return (localStorage.getItem('aiStreamingSpeed') as 'slow' | 'normal' | 'fast') || 'normal';
  });
  const [showSettings, setShowSettings] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pastedImages, setPastedImages] = useState<string[]>([]); // 支援多張圖片
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 防止 unmount 後繼續更新 state（返回頁面時串流仍在跑）
  const isMountedRef = useRef(true);
  // 防止 conversationData refetch 後覆蓋已有的 messages
  const messagesLoadedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; setIsStreaming(false); };
  }, []);

  // 處理檔案上傳圖片
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (pastedImages.length >= 3) {
      toast.error('最多只能加入 3 張圖片');
      e.target.value = '';
      return;
    }
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      e.target.value = '';
      return;
    }
    setPendingCropFile(file);
    setCropDialogOpen(true);
    e.target.value = '';
  }

  // 獲取智能解題詳情（staleTime: 0 確保每次進入頁面都重新取得最新資料）
  const { data: materialData } = trpc.learningMaterials.getById.useQuery(
    { id: materialId },
    { staleTime: 0, refetchOnWindowFocus: true }
  );

  // 獲取 PDF 代理數據（解決 CORS 問題）
  const { data: pdfProxyData } = trpc.learningMaterials.getPdfProxy.useQuery(
    { materialId },
    { enabled: !!materialId }
  );

  // 將 Base64 轉換為 Data URL（使用 useMemo 優化性能）
  const pdfDataUrl = useMemo(() => {
    if (!pdfProxyData?.base64) return null;
    return `data:${pdfProxyData.mimeType};base64,${pdfProxyData.base64}`;
  }, [pdfProxyData?.base64, pdfProxyData?.mimeType]);

  // 獲取對話記錄
  const { data: conversationData } = trpc.learningMaterials.getConversation.useQuery(
    { materialId },
    { staleTime: Infinity, refetchOnWindowFocus: false }
  );

  // 保存對話記錄 mutation
  const saveConversationMutation = trpc.learningMaterials.saveConversation.useMutation({
    onSuccess: (data, variables, context) => {
      if ((context as any)?.showToast !== false) {
        toast.success("對話記錄已保存");
      }
    },
    onError: (error) => {
      toast.error(`保存失敗：${error.message}`);
    },
  });

  // 閱讀進度
  const { data: readingProgressData } = trpc.learningMaterials.getReadingProgress.useQuery(
    { materialId },
    { enabled: !!materialId }
  );
  const saveReadingProgressMutation = trpc.learningMaterials.saveReadingProgress.useMutation();

  // 載入上次閱讀頁數
  useEffect(() => {
    if (readingProgressData?.lastPage && readingProgressData.lastPage > 1) {
      setPageNumber(readingProgressData.lastPage);
    }
  }, [readingProgressData?.lastPage]);

  // AI 對話 mutation
  const chatMutation = trpc.learningMaterials.chat.useMutation();

  // 扣點版 AI 對話 mutation
  const chatWithPointsMutation = trpc.learningMaterials.chatWithPoints.useMutation({
    onError: (error) => {
      if (error.message.includes("點數不足")) {
        toast.error("點數不足，無法使用此功能（需要至少 1 點）");
      } else {
        toast.error(error.message || "發送失敗，請再試一次");
      }
    },
  });

  // 載入對話記錄（只載入一次，防止 refetch 後覆蓋已有的 messages）
  useEffect(() => {
    if (conversationData?.conversation && !messagesLoadedRef.current) {
      const savedMessages = conversationData.conversation.conversationData as Message[];
      if (savedMessages && Array.isArray(savedMessages)) {
        messagesLoadedRef.current = true;
        setMessages(savedMessages);
      }
    }
  }, [conversationData]);

  // 自動滾動到最新訊息
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // 有題目時預設顯示題目清單
  useEffect(() => {
    const questions = materialData?.extractedQuestions || materialData?.material?.extractedQuestions;
    if (questions && Array.isArray(questions) && (questions as ExtractedQuestion[]).length > 0) {
      setLeftTab('questions');
    }
  }, [materialData]);

  // 處理翻頁
  function goToPrevPage() {
    setPageNumber((prev) => {
      const next = Math.max(prev - 1, 1);
      if (next !== prev && materialId) {
        saveReadingProgressMutation.mutate({ materialId, lastPage: next });
      }
      return next;
    });
  }

  function goToNextPage() {
    setPageNumber((prev) => {
      const next = Math.min(prev + 1, numPages);
      if (next !== prev && materialId) {
        saveReadingProgressMutation.mutate({ materialId, lastPage: next });
      }
      return next;
    });
  }

  // 處理縮放
  function zoomIn() {
    setScale((prev) => Math.min(prev + 0.1, 3.0));
  }

  function zoomOut() {
    setScale((prev) => Math.max(prev - 0.1, 0.5));
  }

  // 處理鍵盤事件
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        goToPrevPage();
      } else if (e.key === "ArrowRight") {
        goToNextPage();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-") {
        e.preventDefault();
        zoomOut();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pageNumber, numPages, scale]);

  // 處理貼上圖片
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string;
              if (pastedImages.length >= 3) {
                toast.error("最多只能貼上 3 張圖片");
                return;
              }
              fetch(dataUrl).then(r => r.blob()).then(blob => {
                const f = new File([blob], 'paste.png', { type: blob.type || 'image/png' });
                setPendingCropFile(f);
                setCropDialogOpen(true);
              });
            };
            reader.readAsDataURL(file);
          }
        }
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // 發送訊息（扣點版）
  async function sendMessageWithPoints(
    messageText: string,
    buttonType: "detailed" | "extended" | "knowledge"
  ) {
    if (!messageText.trim() && pastedImages.length === 0) return;

    const userMessage: Message = {
      role: "user",
      content: messageText.trim(),
      images: pastedImages.length > 0 ? [...pastedImages] : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setPastedImages([]);
    setIsStreaming(true);

    try {
      const response = await chatWithPointsMutation.mutateAsync({
        materialId,
        message: userMessage.content,
        images: userMessage.images,
        conversationHistory: messages,
        buttonType,
      });

      toast.success("已扣除 1 點");

      if (responseMode === 'streaming') {
        let currentContent = "";
        const assistantMessage: Message = { role: "assistant", content: "" };
        if (isMountedRef.current) setMessages((prev) => [...prev, assistantMessage]);
        const speed = streamingSpeed === 'slow' ? 50 : streamingSpeed === 'fast' ? 10 : 30;
        for (const char of response.response) {
          if (!isMountedRef.current) break;
          currentContent += char;
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { ...assistantMessage, content: currentContent };
            return newMessages;
          });
          await new Promise((resolve) => setTimeout(resolve, speed));
        }
      } else {
        if (isMountedRef.current) setMessages((prev) => [...prev, { role: "assistant", content: response.response }]);
      }

      if (isMountedRef.current) {
        setTimeout(() => {
          saveConversationMutation.mutate({
            materialId,
            pageNumber,
            conversationData: [...messages, userMessage, { role: "assistant", content: response.response }],
          }, { context: { showToast: false } });
        }, 500);
      }
    } catch (error: any) {
      // 錯誤已由 onError 處理
    } finally {
      // 不受 isMountedRef 限制，確保 isStreaming 一定被重置
      setIsStreaming(false);
      if (isMountedRef.current) {
        setTimeout(() => { textareaRef.current?.focus(); }, 100);
      }
    }
  }

  // 發送訊息
  async function sendMessage(overrideText?: string, isDetailRequest?: boolean, pendingSolutionImages?: string[], displayContent?: string) {
    const text = overrideText ?? input.trim();
    if (!text && pastedImages.length === 0) {
      toast.error("請輸入問題或貼上圖片");
      return;
    }

    // 學生送出訊息時立即中斷朗讀
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    const userMessage: Message = {
      role: "user",
      content: text,
      displayContent: displayContent, // 顯示給學生看的文字（隱藏 prompt 指令）
      images: pastedImages.length > 0 ? [...pastedImages] : undefined,
      isDetailRequest: isDetailRequest || false,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setPastedImages([]);
    setIsStreaming(true);

    try {
      // 合併使用者貼圖和老師解答圖片（pendingSolutionImages）一起傳給 LLM
      const allSendImages = [
        ...(userMessage.images || []),
        ...(pendingSolutionImages || []),
      ];
      const response = await chatMutation.mutateAsync({
        materialId,
        message: userMessage.content,
        images: allSendImages.length > 0 ? allSendImages : undefined,
        conversationHistory: messages,
      });

       if (responseMode === 'streaming') {
        let currentContent = "";
        const assistantMessage: Message = { role: "assistant", content: "", solutionImages: pendingSolutionImages };
        if (isMountedRef.current) setMessages((prev) => [...prev, assistantMessage]);
        const speed = streamingSpeed === 'slow' ? 50 : streamingSpeed === 'fast' ? 10 : 30;
        for (const char of response.response) {
          if (!isMountedRef.current) break;
          currentContent += char;
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { ...assistantMessage, content: currentContent };
            return newMessages;
          });
          await new Promise((resolve) => setTimeout(resolve, speed));
        }
      } else {
        if (isMountedRef.current) {
          const assistantMessage: Message = { role: "assistant", content: response.response, solutionImages: pendingSolutionImages };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      }
      if (isMountedRef.current) {
        setTimeout(() => {
          saveConversationMutation.mutate({
            materialId,
            pageNumber,
            conversationData: [...messages, userMessage, { role: "assistant", content: response.response }],
          }, { context: { showToast: false } });
        }, 500);
      }
    } catch (error: any) {
      if (isMountedRef.current) toast.error(error.message || "發送失敗，請再試一次");
    } finally {
      // 不受 isMountedRef 限制，確保 isStreaming 一定被重置
      setIsStreaming(false);
      if (isMountedRef.current) {
        setTimeout(() => { textareaRef.current?.focus(); }, 100);
      }
    }
  }

  // 保存對話記錄
  function saveConversation() {
    saveConversationMutation.mutate({
      materialId,
      pageNumber,
      conversationData: messages,
    });
  }

  // 取得題目清單
  const extractedQuestions = (materialData?.extractedQuestions || materialData?.material?.extractedQuestions) as ExtractedQuestion[] | undefined;
  const hasQuestions = extractedQuestions && Array.isArray(extractedQuestions) && extractedQuestions.length > 0;

  // 作答歷史：載入資料庫中儲存的作答記錄
  const { data: attemptsData } = trpc.learningMaterials.getQuestionAttempts.useQuery(
    { materialId },
    { enabled: !!materialId }
  );
  const saveAttemptMutation = trpc.learningMaterials.saveQuestionAttempt.useMutation();

  if (!materialData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col bg-background"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
    >
      {/* 頂部導航列 */}
      <div className="border-b bg-card px-4 py-3 flex items-center justify-between sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
          <h1 className="text-lg font-semibold truncate max-w-[300px]">{materialData.material.title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* 清除對話 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm('確定要清除所有對話記錄嗎？')) {
                setMessages([]);
                toast.success('對話記錄已清除');
              }
            }}
            title="清除對話"
            disabled={messages.length === 0}
          >
            <Trash2 className="w-4 h-4" />
          </Button>

          {/* 保存對話 */}
          <Button
            variant="outline"
            size="sm"
            onClick={saveConversation}
            title="保存對話記錄"
            disabled={messages.length === 0 || saveConversationMutation.isPending}
          >
            <Save className="w-4 h-4" />
          </Button>

          {/* 分隔線 */}
          <div className="h-6 w-px bg-border" />

          {/* 版面切換按鈕 */}
          <div className="flex items-center border rounded-md overflow-hidden">
            <button
              onClick={() => setLayoutMode('left')}
              className={`px-2 py-1.5 transition-colors ${
                layoutMode === 'left' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
              }`}
              title="左側全螢幕（題目）"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayoutMode('split')}
              className={`px-2 py-1.5 transition-colors border-x ${
                layoutMode === 'split' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
              }`}
              title="分割畫面"
            >
              <Columns2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayoutMode('right')}
              className={`px-2 py-1.5 transition-colors ${
                layoutMode === 'right' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
              }`}
              title="右側全螢幕（AI）"
            >
              <PanelRight className="w-4 h-4" />
            </button>
          </div>

          {/* AI 回應設定 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4 mr-1" />
            設定
          </Button>
        </div>
      </div>

      {/* AI 回應設定面板 */}
      {showSettings && (
        <div className="border-b bg-muted/30 px-4 py-3 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">回應模式：</span>
              <Button
                variant={responseMode === 'streaming' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setResponseMode('streaming');
                  localStorage.setItem('aiResponseMode', 'streaming');
                }}
              >
                流式輸出
              </Button>
              <Button
                variant={responseMode === 'complete' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setResponseMode('complete');
                  localStorage.setItem('aiResponseMode', 'complete');
                }}
              >
                完整輸出
              </Button>
            </div>

            {responseMode === 'streaming' && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">輸出速度：</span>
                <Button
                  variant={streamingSpeed === 'slow' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStreamingSpeed('slow');
                    localStorage.setItem('aiStreamingSpeed', 'slow');
                  }}
                >
                  慢速
                </Button>
                <Button
                  variant={streamingSpeed === 'normal' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStreamingSpeed('normal');
                    localStorage.setItem('aiStreamingSpeed', 'normal');
                  }}
                >
                  正常
                </Button>
                <Button
                  variant={streamingSpeed === 'fast' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStreamingSpeed('fast');
                    localStorage.setItem('aiStreamingSpeed', 'fast');
                  }}
                >
                  快速
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 主要內容區域：左側 + 右側 */}
      <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>

        {/* ===== 左側面板 ===== */}
        <div className={`flex flex-col border-r min-h-0 transition-all duration-300 ${
          layoutMode === 'left' ? 'flex-1' :
          layoutMode === 'right' ? 'hidden' :
          'w-1/2'
        }`}>

          {/* 左側 Tab 切換按鈕 */}
          <div className="border-b bg-card shrink-0 flex">
            <button
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                leftTab === 'questions'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              onClick={() => setLeftTab('questions')}
            >
              <ClipboardList className="w-4 h-4" />
              題目清單
              {hasQuestions && (
                <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                  {extractedQuestions!.length}
                </span>
              )}
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                leftTab === 'pdf'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              onClick={() => setLeftTab('pdf')}
            >
              <FileText className="w-4 h-4" />
              PDF 原檔
            </button>
          </div>

          {/* 左側內容 */}
          <div className="flex-1 overflow-hidden min-h-0">

            {/* 題目清單 */}
            {leftTab === 'questions' && (
              <div className="h-full overflow-y-auto">
                {hasQuestions ? (
                  <QuestionPanel
                    questions={extractedQuestions!}
                    materialId={materialId}
                    onAskAI={(prompt, imageBase64, solutionImages, cachedAnswer, displayContent) => {
                      if (cachedAnswer) {
                        // 後台已預生成的快取答案，直接顯示，不消耗 token
                        const userMsg = { role: 'user' as const, content: prompt, displayContent: displayContent ?? '🤖 AI 解題' };
                        const assistantMsg = { role: 'assistant' as const, content: cachedAnswer, solutionImages };
                        setMessages((prev) => [...prev, userMsg, assistantMsg]);
                        return;
                      }
                      if (imageBase64) {
                        setPastedImages([imageBase64]);
                        setTimeout(() => sendMessage(prompt, false, solutionImages, displayContent ?? '🤖 AI 解題'), 100);
                      } else {
                        sendMessage(prompt, false, solutionImages, displayContent ?? '🤖 AI 解題');
                      }
                    }}
                    isAILoading={isStreaming}
                    savedAttempts={attemptsData?.attempts}
                    onSaveAttempt={(attempt) => saveAttemptMutation.mutate({ materialId, ...attempt })}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <ClipboardList className="w-16 h-16 text-muted-foreground/30 mb-4" />
                    <h3 className="font-semibold text-muted-foreground mb-2">尚無題目清單</h3>
                    <p className="text-sm text-muted-foreground">
                      上傳 Word 檔（.docx）時系統會自動提取題目清單
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* PDF 原檔 */}
            {leftTab === 'pdf' && (
              <div className="h-full flex flex-col">
                {/* PDF 工具提示列 */}
                <div className="border-b bg-muted/20 px-3 py-1.5 shrink-0">
                  <p className="text-xs text-muted-foreground">
                    💡 純文字題目：直接框選文字複製貼上 | 含圖形題目：Win + Shift + S 截圖後貼上
                  </p>
                </div>
                <div className="flex-1 overflow-hidden">
                  {pdfDataUrl ? (
                    <PdfViewerWithCrop
                      url={pdfDataUrl}
                      height="100%"
                      showToolbar={false}
                      pageNumber={pageNumber}
                      onPageChange={setPageNumber}
                      onNumPagesChange={setNumPages}
                      scale={scale}
                      onScaleChange={setScale}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="ml-2 text-gray-600">載入 PDF 中...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ===== 右側：AI 對話框 ===== */}
        <div className={`flex flex-col bg-background min-h-0 transition-all duration-300 ${
          layoutMode === 'right' ? 'flex-1' :
          layoutMode === 'left' ? 'hidden' :
          'w-1/2'
        }`}>

          {/* 對話標題 */}
          <div className="border-b bg-card px-4 py-3 shrink-0">
            <h2 className="font-semibold flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              AI 學習助教
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              📌 對話記錄會自動保存，但將於 2 個月後自動清除，請及時備份重要內容。
            </p>
          </div>

          {/* 對話訊息區域 */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.length === 0 ? (
              <Card className="p-6 text-center">
                <div className="text-4xl mb-3">✏️</div>
                <h3 className="font-semibold mb-2">請先試著作答！</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  點擊左側題目展開後，先自己思考並作答，送出後再查看解析。
                </p>
                <div className="text-left bg-muted/50 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-foreground">作答方式：</p>
                  <ul className="text-xs text-muted-foreground space-y-1.5">
                    <li>• <span className="text-blue-600 font-medium">選擇題</span>：點選 A/B/C/D 選項後送出</li>
                    <li>• <span className="text-green-600 font-medium">簡答題</span>：輸入文字答案後送出</li>
                    <li>• <span className="text-orange-600 font-medium">畫圖題</span>：拍照上傳後送出</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                    送出後可使用「AI 解題」、「老師解答」、「差異比較」功能
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  也可直接在下方輸入問題，或貼上截圖（Ctrl+V）
                </p>
              </Card>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <Card
                    className={`max-w-[85%] min-w-0 overflow-hidden p-4 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {/* 相容舊格式單張圖片 */}
                    {msg.image && !msg.images && (
                      <img src={msg.image} alt="用戶上傳" className="max-w-full rounded mb-2" />
                    )}
                    {/* 新格式多張圖片 */}
                    {msg.images && msg.images.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {msg.images.map((imgSrc, imgIdx) => (
                          <img
                            key={imgIdx}
                            src={imgSrc}
                            alt={`用戶上傳 ${imgIdx + 1}`}
                            className="max-h-40 max-w-[180px] rounded border object-contain"
                          />
                        ))}
                      </div>
                    )}
                    {msg.role === "assistant" ? (
                      <>
                        {msg.content.includes('[詳細解說]') && !messages[index - 1]?.isDetailRequest ? (
                          <>
                            <MarkdownRenderer>
                              {cleanMarkdown(cleanMarkdown(
                                msg.content.split('\n\n---\n📖 **[詳細解說]**')[0]
                              ))}
                            </MarkdownRenderer>
                            <button
                              className="mt-3 px-3 py-1.5 text-sm rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                              onClick={() => {
                                if (!isStreaming) {
                                  sendMessage('請提供詳細解說，包含原理、步驟、範例。', true);
                                }
                              }}
                              disabled={isStreaming}
                            >
                              📖 詳細解說
                            </button>
                          </>
                        ) : (
                          <MarkdownRenderer>{cleanMarkdown(cleanMarkdown(msg.content))}</MarkdownRenderer>
                        )}
                        {/* 老師解析圖（AI 解題後附加） */}
                        {msg.solutionImages && msg.solutionImages.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-amber-200">
                            <p className="text-xs font-semibold text-amber-700 mb-2">👨‍🏫 老師解析圖</p>
                            <div className="flex flex-wrap gap-2">
                              {msg.solutionImages.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                  <img src={url} alt={`老師解析圖${i + 1}`} className="max-h-56 rounded border object-contain cursor-zoom-in hover:opacity-90 transition-opacity" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.displayContent ?? msg.content}</p>
                    )}
                  </Card>
                </div>
              ))
            )}

            {/* AI 思考中動畫：只在 streaming 且最後一條訊息是空的（尚未開始輸出）時顯示 */}
            {isStreaming && (messages.length === 0 || messages[messages.length - 1]?.content === '' || messages[messages.length - 1]?.role !== 'assistant') && (
              <div className="flex justify-start">
                <Card className="max-w-[85%] p-4 bg-muted">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">AI 思考中...</span>
                  </div>
                </Card>
              </div>
            )}

            <div />
          </div>

          {/* 快捷按鈕 */}
          <div className="border-t bg-card px-4 py-2 flex flex-wrap gap-2 items-center shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => sendMessage("請提供詳細、深入的說明，包含原理、步驟、範例。")}
              disabled={isStreaming}
            >
              <HelpCircle className="w-4 h-4 mr-1" />
              詳細說明
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => sendMessage("請提供相關的延伸智能解題和參考資源。")}
              disabled={isStreaming}
            >
              <BookOpen className="w-4 h-4 mr-1" />
              延伸學習
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => sendMessage("請幫我建立這個知識點的學習筆記。")}
              disabled={isStreaming}
            >
              <Save className="w-4 h-4 mr-1" />
              知識點建立
            </Button>
          </div>

          {/* 輸入框 */}
          <div className="border-t bg-card p-4 shrink-0">
            {/* 隱藏的檔案選取器 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />

            {pastedImages.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {pastedImages.map((img, idx) => (
                  <div key={idx} className="relative inline-block">
                    <img
                      src={img}
                      alt={`貼上的圖片 ${idx + 1}`}
                      className="max-h-28 max-w-[140px] rounded border object-contain"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-5 w-5"
                      onClick={() => setPastedImages((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <span className="text-xs font-bold">×</span>
                    </Button>
                    <span className="absolute bottom-0 left-0 right-0 text-center text-xs bg-black/50 text-white rounded-b">
                      {idx + 1}/{pastedImages.length}
                    </span>
                  </div>
                ))}
                {pastedImages.length < 3 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center h-28 w-20 border-2 border-dashed border-muted-foreground/30 rounded text-xs text-muted-foreground text-center p-1 hover:border-primary hover:text-primary transition-colors"
                  >
                    <ImageIcon className="w-5 h-5 mb-1" />
                    加入第 {pastedImages.length + 1} 張
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="輸入問題或貼上截圖（Ctrl+V）..."
                className="flex-1 resize-none"
                rows={3}
                disabled={isStreaming}
              />
              <div className="flex flex-col gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-10"
                  title="上傳圖片"
                  disabled={isStreaming || pastedImages.length >= 3}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => sendMessage()}
                  disabled={isStreaming || (!input.trim() && pastedImages.length === 0)}
                  size="icon"
                  className="flex-1 w-10"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-muted-foreground">
                💡 純文字題目：直接從 PDF 框選文字複製貼上 | 含圖形題目：截圖後貼上（Ctrl+V）或點擊 📷 上傳
              </p>
            </div>
          </div>

        </div>
        {/* ===== 右側結束 ===== */}

      </div>

      {/* 圖片裁切對話框 */}
      <ImageEditModal
        file={pendingCropFile}
        open={cropDialogOpen}
        onClose={() => {
          setCropDialogOpen(false);
          setPendingCropFile(null);
        }}
        onConfirm={(editedFile) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const base64 = ev.target?.result as string;
            if (base64) {
              setPastedImages((prev) => {
                if (prev.length >= 3) return prev;
                const next = [...prev, base64];
                toast.success(`圖片已加入（${next.length}/3）`);
                return next;
              });
            }
          };
          reader.readAsDataURL(editedFile);
          setCropDialogOpen(false);
          setPendingCropFile(null);
        }}
      />
    </div>
  );
}
