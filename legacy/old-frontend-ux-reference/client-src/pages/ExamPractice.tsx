/**
 * 前台考試練題頁面
 * 支援歷屆考題練習、計時、標記、練錯題功能
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Clock,
  Star,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Flag,
  RotateCcw,
  Send,
  BookOpen,
  Target,
  Trophy,
  ArrowLeft,
  MessageCircle,
  Bookmark,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { RichTextRenderer } from "@/components/RichTextRenderer";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { cleanMarkdown } from "@/lib/markdownCleaner";
import { Copy, Check, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ViewMode = "select" | "exam" | "result";

interface Question {
  id: number;
  questionNumber: number;
  questionNumberInPdf?: string | null;
  questionType: "single" | "multiple";
  questionText: string;
  stemImage?: string | null;
  optionA?: string | null;
  optionB?: string | null;
  optionC?: string | null;
  optionD?: string | null;
  optionE?: string | null;
  optionAImage?: string | null;
  optionBImage?: string | null;
  optionCImage?: string | null;
  optionDImage?: string | null;
  optionEImage?: string | null;
  correctAnswer: string | null;
  explanation?: string | null;
  questionAnalysis?: string | null;
  keyPoints?: string | null;
}

// 題型標籤對應（只保留選擇題）
const questionTypeLabels: Record<string, string> = {
  single: "單選題",
  multiple: "複選題",
};

const questionTypeColors: Record<string, string> = {
  single: "bg-blue-500/10 text-blue-400",
  multiple: "bg-purple-500/10 text-purple-400",
};

interface UserAnswerState {
  questionId: number;
  answer: string;
  isMarked: boolean;
}

export default function Practice() {
  const { user, isAuthenticated } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("select");
  const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Map<number, UserAnswerState>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState(3600); // 60 minutes
  const [practiceRecordId, setPracticeRecordId] = useState<number | null>(null);
  const [showAnswerCard, setShowAnswerCard] = useState(true);
  const [isExamStarted, setIsExamStarted] = useState(false); // 是否已開始作答
  
  // 容器 ref，用於自動聚焦以啟用快速鍵
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 搜尋關鍵字（即時搜尋）
  const [searchKeyword, setSearchKeyword] = useState("");
  
  // 分類篩選（free, paid, class_only, all）
  const [categoryFilter, setCategoryFilter] = useState<"all" | "free" | "paid" | "class_only">("all");
  
  // 清除篩選
  const clearFilters = () => {
    setSearchKeyword("");
    setCategoryFilter("all");
  };
  
  // AI 對話狀態
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiDialogQuestionId, setAiDialogQuestionId] = useState<number | null>(null);
  
  // 扣點確認對話框狀態
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [pendingExamId, setPendingExamId] = useState<number | null>(null);
  const [aiUserInput, setAiUserInput] = useState("");
  const [aiMessages, setAiMessages] = useState<Array<{ role: "user" | "assistant"; content: string; timestamp: number }>>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 清理 Markdown 符號並保留段落結構
  const cleanMarkdownHeadings = (content: string): string => {
    return content
      .replace(/^#{1,6}\s+/gm, '') // 移除行首的 # 符號
      .replace(/\*\*([^*]+)\*\*/g, '$1') // 移除粗體 Markdown 符號
      .replace(/\*([^*]+)\*/g, '$1') // 移除斜體 Markdown 符號
      .replace(/^[-*+]\s+/gm, '• ') // 將 Markdown 列表符號轉換為點號
      .replace(/\n{3,}/g, '\n\n'); // 將多個換行減少為最多兩個
  };
  
  // 對話紀錄搜尋狀態
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [searchConversationKeyword, setSearchConversationKeyword] = useState("");
  const [searchTimeRange, setSearchTimeRange] = useState<"7days" | "30days" | "all">("all");
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  
  // 獲取 tRPC utils（用於在事件處理函數中調用 API）
  const utils = trpc.useUtils();

  // 取得所有試卷列表（不限制 status）
  const { data: papers, isLoading: isLoadingPapers } = trpc.practiceExams.list.useQuery({});
  
  // 搜尋對話紀錄
  const { data: conversationSearchResults, isLoading: isSearchingConversations } = trpc.questionLearning.searchConversations.useQuery(
    {
      keyword: searchConversationKeyword || undefined,
      paperId: selectedPaperId || undefined,
      timeRange: searchTimeRange,
      limit: 50,
    },
    { enabled: showSearchDialog }
  );

  // 從試卷標題中提取科目名稱（最後一個 " - " 後面的內容）
  const extractSubject = (title: string): string => {
    const parts = title.split(" - ");
    return parts.length > 1 ? parts[parts.length - 1] : title;
  };

  // 取得所有不重複的年度
  const availableYears = papers
    ? Array.from(new Set(papers.map((p) => p.year).filter((y): y is number => y !== null))).sort((a, b) => b - a)
    : [];

  // 取得所有不重複的科目
  const availableSubjects = papers
    ? Array.from(new Set(papers.map((p) => extractSubject(p.title)))).sort()
    : [];

  // 篩選後的試卷列表（即時搜尋）
  const filteredPapers = papers?.filter((paper) => {
    // 分類篩選
    if (categoryFilter !== "all") {
      const accessType = (paper as any)?.accessType;
      const isPurchased = (paper as any)?.isPurchased || false;
      
      // 免費區：只顯示原本就是免費的考卷（不包括已購買的付費考卷）
      if (categoryFilter === "free") {
        if (accessType !== "free" || isPurchased) {
          return false;
        }
      } else {
        // 付費區和班內生區：正常篩選
        if (accessType !== categoryFilter) {
          return false;
        }
      }
    }
    
    // 關鍵字搜尋（搜尋標題、分類、科目、年度）
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      const title = paper.title.toLowerCase();
      const category = (paper.category || "").toLowerCase();
      const subject = (paper.subject || "").toLowerCase();
      const year = paper.year ? paper.year.toString() : "";
      
      if (!title.includes(keyword) && !category.includes(keyword) && !subject.includes(keyword) && !year.includes(keyword)) {
        return false;
      }
    }
    return true;
  });

  // 取得選中試卷的題目
  const { data: allQuestions } = trpc.practiceExams.getQuestions.useQuery(
    { practiceExamId: selectedPaperId! },
    { enabled: !!selectedPaperId }
  );
  
  // 調試：打印 selectedPaperId 和 allQuestions
  useEffect(() => {
    console.log("[ExamPractice] selectedPaperId:", selectedPaperId);
    console.log("[ExamPractice] allQuestions:", allQuestions);
  }, [selectedPaperId, allQuestions]);

  // 使用全部題目（後端已過濾只保留選擇題）
  const questions = allQuestions;



  // 檢查是否已購買考卷
  const checkPurchase = trpc.practiceExams.checkPurchase.useQuery(
    { practiceExamId: pendingExamId! },
    { enabled: !!pendingExamId && showPurchaseDialog }
  );

  // 已購買的考卷會在後端自動調整為免費，不需要單獨查詢

  // 購買考卷（扣點）
  const purchaseExam = trpc.practiceExams.purchaseExam.useMutation({
    onSuccess: (data) => {
      // 如果是已購買的考卷，直接進入考試
      if ((data as any).alreadyPurchased) {
        toast.info('正在進入考試...');
      } else {
        toast.success(`購買成功！剩餘點數：${data.remainingCredits}`);
      }
      
      setShowPurchaseDialog(false);
      if (pendingExamId) {
        handleStartExamAfterPurchase(pendingExamId);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // 開始測驗
  const startTest = trpc.practiceExams.start.useMutation({
    onSuccess: (data) => {
      setPracticeRecordId(data.recordId);
    },
  });

  // 提交答案
  const submitAnswer = trpc.practiceExams.submitAnswer.useMutation();

  // 完成測驗
  const completeTest = trpc.practiceExams.complete.useMutation();

  // 原本的原生事件綁定已移除，現在直接使用 onClick 事件

  // 計時器（只有在開始作答後才計時）
  useEffect(() => {
    if (viewMode !== "exam" || !isExamStarted) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [viewMode, isExamStarted]);

  // 鍵盤快捷鍵（只有在開始作答後才啟用）
  useEffect(() => {
    if (viewMode !== "exam" || !isExamStarted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果用戶正在輸入文字，不處理快捷鍵
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      // 左右鍵：切換上下題
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePreviousQuestion();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextQuestion();
      }
      // 1-5：快速選擇 A-E 選項
      else if (["1", "2", "3", "4", "5"].includes(e.key)) {
        e.preventDefault();
        const optionMap: Record<string, string> = { "1": "A", "2": "B", "3": "C", "4": "D", "5": "E" };
        const option = optionMap[e.key];
        if (currentQuestion && (currentQuestion.questionType === "single" || currentQuestion.questionType === "multiple")) {
          handleSelectAnswer(currentQuestion.id, option);
        }
      }
      // M：標記題目
      else if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        if (currentQuestion) {
          handleToggleMark(currentQuestion.id);
        }
      }
      // R：清除答案（重作）
      else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        if (currentQuestion) {
          handleSelectAnswer(currentQuestion.id, "");
          toast.success("已清除答案");
        }
      }
      // G：跳到下一個標記題
      else if (e.key.toLowerCase() === "g") {
        e.preventDefault();
        handleGoToNextMarked();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, isExamStarted, currentQuestionIndex, userAnswers]);

  // 頁面載入時自動聚焦，啟用快速鍵
  useEffect(() => {
    if (viewMode === "exam" && containerRef.current) {
      // 使用 setTimeout 確保元素已完全渲染
      const timer = setTimeout(() => {
        containerRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [viewMode]);

  // 格式化時間
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 發送 AI 訊息
  const askQuestionMutation = trpc.questionLearning.askQuestion.useMutation();
  
  // 清除對話記錄
  const clearConversationMutation = trpc.questionLearning.clearConversation.useMutation();
  
  // 保存對話記錄
  const saveConversationMutation = trpc.questionLearning.saveConversation.useMutation();
  
  // 複製訊息內容
  const handleCopyMessage = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      toast.success("已複製到剪貼簿");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      toast.error("複製失敗");
    }
  };
  
  // 自動滾動到最新訊息
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [aiMessages, isAiLoading]);
  
  // 清理 AI 回答內容，移除 HTML 標籤並優化格式
  const cleanAIResponse = (content: string): string => {
    let cleaned = content;
    
    // 移除所有 HTML 標籤
    cleaned = cleaned.replace(/<\/?[^>]+(>|$)/g, '');
    
    // 移除多餘的星號（但保留 Markdown 格式）
    // 保留 ** 和 * 用於 Markdown
    
    // 在選項分析前後添加換行，讓內容更易讀
    cleaned = cleaned.replace(/（選項 ([A-E])）/g, '\n\n**（選項 $1）**\n');
    cleaned = cleaned.replace(/•\s*選項 ([A-E])/g, '\n\n**• 選項 $1**\n');
    
    return cleaned.trim();
  };
  
  const handleSendAIMessage = async (questionId: number, message: string) => {
    if (!message.trim()) return;
    
    setIsAiLoading(true);
    
    // 添加用戶訊息到界面
    const userMessage = {
      role: "user" as const,
      content: message,
      timestamp: Date.now(),
    };
    setAiMessages(prev => [...prev, userMessage]);
    setAiUserInput("");
    
    try {
      // 將對話歷史轉換為後端需要的格式（移除 timestamp）
      const conversationHistory = aiMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await askQuestionMutation.mutateAsync({
        questionId,
        userMessage: message,
        conversationHistory, // 傳遞對話歷史
      });
      
      // 調試信息：檢查返回值
      console.log('AI 回答返回值:', response);
      
      // 顯示扣點成功提示
      if (response.creditsDeducted) {
        toast.success(`已扣除 ${response.creditsDeducted} 點`);
      } else {
        // 如果沒有 creditsDeducted 字段，也顯示默認提示
        toast.success('已扣除 1 點');
      }
      
      // 清理 AI 回答內容
      const cleanedContent = cleanAIResponse(response.aiMessage);
      
      // 添加 AI 訊息到界面
      const aiMessage = {
        role: "assistant" as const,
        content: cleanedContent,
        timestamp: Date.now(),
      };
      setAiMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('發送訊息失敗:', error);
      
      // 檢查是否是 401 未登入錯誤
      if (error?.data?.code === 'UNAUTHORIZED' || error?.message?.includes('login')) {
        toast.error('請先登入後再使用 AI 學習助教');
        // 移除用戶添加的訊息，因為發送失敗
        setAiMessages(prev => prev.slice(0, -1));
      } else {
        toast.error('發送訊息失敗，請稍後再試');
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  // 保存對話記錄
  const handleSaveConversation = async (questionId: number) => {
    try {
      // 將 aiMessages 轉換為後端需要的格式（移除 timestamp）
      const messages = aiMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      await saveConversationMutation.mutateAsync({
        questionId,
        messages,
      });

      toast.success('✅ 對話已保存');
    } catch (error: any) {
      console.error('保存對話失敗:', error);
      toast.error('保存對話失敗，請稍後再試');
    }
  };

  // 清理 HTML 標籤並提取圖片 URL
  const cleanHtmlAndExtractImages = (html: string): { text: string; images: string[] } => {
    if (!html) return { text: '', images: [] };
    
    // 提取圖片 URL
    const images: string[] = [];
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      images.push(match[1]);
    }
    
    // 移除所有 HTML 標籤並保留換行
    const text = html
      .replace(/<br\s*\/?>/gi, '\n') // 將 <br> 轉換為換行
      .replace(/<\/p>/gi, '\n') // 將 </p> 轉換為換行
      .replace(/<[^>]+>/g, '') // 移除所有 HTML 標籤
      .replace(/&nbsp;/g, ' ') // 替換非斷空格
      .replace(/&lt;/g, '<') // 解碼 HTML 實體
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/^[#*\-]+\s*/gm, '') // 移除行首的 Markdown 符號（#, *, -）
      .replace(/\*\*([^*]+)\*\*/g, '$1') // 移除粗體 Markdown 符號
      .replace(/\*([^*]+)\*/g, '$1') // 移除斜體 Markdown 符號
      .replace(/\n{3,}/g, '\n\n') // 將多個換行減少為最多兩個
      .trim();
    
    return { text, images };
  };

  // 清除對話記錄
  const handleClearConversation = async () => {
    if (!aiDialogQuestionId) return;
    
    // 顯示確認對話框
    if (!confirm('確定要清除這個題目的所有對話記錄嗎？此操作無法復原。')) {
      return;
    }
    
    try {
      await clearConversationMutation.mutateAsync({
        questionId: aiDialogQuestionId,
      });
      
      // 清空前端對話列表
      setAiMessages([]);
      toast.success('已清除歷史記錄');
    } catch (error: any) {
      console.error('清除對話記錄失敗:', error);
      toast.error('清除失敗，請稍後再試');
    }
  };

  // 詢問 AI
  const handleAskAI = async (question: any, userAnswer: UserAnswerState | undefined) => {
    setAiDialogQuestionId(question.id);
    setShowAIDialog(true);
    setAiMessages([]); // 清空訊息列表
    
    // 加載歷史對話記錄
    try {
      // 使用組件頂層的 utils 對象調用 API
      const conversation = await utils.client.questionLearning.getConversation.query({
        questionId: question.id,
      });
      
      if (conversation.exists) {
        // 檢查歷史對話中的第一個訊息，看是否包含用戶答案
        const firstMessage = conversation.messages[0];
        const currentUserAnswerText = userAnswer?.answer || '未作答';
        
        // 如果歷史對話中的答案與當前答案不同，清除舊對話並生成新的
        const isAnswerChanged = firstMessage && 
          firstMessage.role === 'user' && 
          !firstMessage.content.includes(currentUserAnswerText);
        
        if (isAnswerChanged) {
          // 答案改變了，清除舊對話
          console.log('答案改變，清除舊對話並生成新的預設問題');
          setAiMessages([]);
          
          // 生成新的預設問題
          let userAnswerText = userAnswer?.answer || '未作答';
          if (userAnswer?.answer) {
            const optionKey = userAnswer.answer;
            const optionMap: Record<string, string | null | undefined> = {
              'A': question.optionA,
              'B': question.optionB,
              'C': question.optionC,
              'D': question.optionD,
              'E': question.optionE,
            };
            const optionValue = optionMap[optionKey];
            if (optionValue) {
              userAnswerText = `${optionKey} (${optionValue})`;
            }
          }
          const defaultQuestion = `請幫我分析這道題目，我的答案是 ${userAnswerText}，請提供學習建議和解題思路。`;
          await handleSendAIMessage(question.id, defaultQuestion);
        } else {
          // 答案沒有改變，載入歷史對話
          const cleanedMessages = conversation.messages.map(msg => {
            if (msg.role === 'assistant') {
              return {
                ...msg,
                content: cleanAIResponse(msg.content),
              };
            }
            return msg;
          });
          setAiMessages(cleanedMessages);
        }
      } else {
        setAiMessages([]);
        // 如果沒有歷史記錄，自動發送預設問題
        // 將選項代號轉換為完整的選項文字
        let userAnswerText = userAnswer?.answer || '未作答';
        if (userAnswer?.answer) {
          const optionKey = userAnswer.answer;
          // 從 optionA/B/C/D/E 欄位中取得對應的選項文字
          const optionMap: Record<string, string | null | undefined> = {
            'A': question.optionA,
            'B': question.optionB,
            'C': question.optionC,
            'D': question.optionD,
            'E': question.optionE,
          };
          const optionValue = optionMap[optionKey];
          if (optionValue) {
            userAnswerText = `${optionKey} (${optionValue})`;
          }
        }
        const defaultQuestion = `請幫我分析這道題目，我的答案是 ${userAnswerText}，請提供學習建議和解題思路。`;
        await handleSendAIMessage(question.id, defaultQuestion);
      }
    } catch (error: any) {
      console.error('加載對話記錄失敗:', error);
      
      // 檢查是否是 401 未登入錯誤
      if (error?.data?.code === 'UNAUTHORIZED' || error?.message?.includes('login')) {
        toast.error('請先登入後再使用 AI 學習助教');
        setShowAIDialog(false); // 關閉對話框
      } else {
        toast.error('加載對話記錄失敗，請稍後再試');
        setAiMessages([]); // 清空訊息列表
      }
    }
  };

  // 確認購買
  const handleConfirmPurchase = () => {
    alert('👍 handleConfirmPurchase 被調用！');
    console.log('[購買] handleConfirmPurchase 被調用');
    
    if (!pendingExamId) {
      console.error('[購買] pendingExamId 是null！');
      alert('❌ pendingExamId 是 null');
      return;
    }
    
    console.log('[購買] 開始購買，pendingExamId:', pendingExamId);
    alert(`🛒 開始購買，ID: ${pendingExamId}`);
    purchaseExam.mutate({ practiceExamId: pendingExamId });
  };

  // 開始考試
  const handleStartExam = async (paperId: number) => {
    console.log('[考試] handleStartExam 被調用，paperId:', paperId);
    const selectedPaper = papers?.find(p => p.id === paperId);
    
    // 檢查訪問類型
    const accessType = (selectedPaper as any)?.accessType;
    const isPurchased = (selectedPaper as any)?.isPurchased || false;
    const requiredCredits = (selectedPaper as any)?.requiredCredits || 0;
    const totalCredits = (user?.credits || 0) + (user?.permanentCredits || 0);

    // 如果是付費考卷，且用戶已登入，且未購買，顯示購買確認對話框
    if (accessType === 'paid' && isAuthenticated && !isPurchased) {
      // 檢查點數是否足夠
      if (totalCredits < requiredCredits) {
        toast.error(`點數不足！需要 ${requiredCredits} 點，您只有 ${totalCredits} 點`);
        return;
      }
      
      // 顯示購買確認對話框
      setPendingExamId(paperId);
      setShowPurchaseDialog(true);
      return;
    }

    // 班內生專用考卷目前沒有限制條件，未來會根據學員編號進行判斷
    // TODO: 未來根據學員編號判斷是否為班內生
    // if (accessType === 'class_only' && user?.studentType !== 'class_student') {
    //   toast.error('這是班內生專屬考卷，只有班內生可以存取');
    //   return;
    // }

    // 直接開始考試（免費或已購買）
    handleStartExamAfterPurchase(paperId);
  };

  // 購買後開始考試
  const handleStartExamAfterPurchase = async (paperId: number) => {
    setSelectedPaperId(paperId);
    setViewMode("exam");
    setCurrentQuestionIndex(0);
    setUserAnswers(new Map());
    setTimeRemaining(3600);
    setIsExamStarted(false); // 進入準備畫面，尚未開始作答

    if (isAuthenticated) {
      const selectedPaper = papers?.find(p => p.id === paperId);
      const totalScore = selectedPaper?.totalQuestions || 100;
      await startTest.mutateAsync({ practiceExamId: paperId, totalScore });
    }
  };

  // 開始作答
  const handleBeginExam = () => {
    setIsExamStarted(true);
    // 自動聚焦到容器，啟用快速鍵
    setTimeout(() => {
      containerRef.current?.focus();
    }, 100);
  };

  // 選擇答案
  const handleSelectAnswer = (questionId: number, answer: string) => {
    setUserAnswers((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(questionId);
      newMap.set(questionId, {
        questionId,
        answer,
        isMarked: existing?.isMarked ?? false,
      });
      return newMap;
    });

    // 提交答案到後端
    if (practiceRecordId) {
      submitAnswer.mutate({
        practiceRecordId,
        questionId,
        userAnswer: answer,
        isMarked: userAnswers.get(questionId)?.isMarked ?? false,
      });
    }
  };

  // 上一題
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // 下一題
  const handleNextQuestion = () => {
    if (questions && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // 標記題目（切換）
  const handleToggleMark = (questionId: number) => {
    setUserAnswers((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(questionId);
      const newIsMarked = !existing?.isMarked;
      newMap.set(questionId, {
        questionId,
        answer: existing?.answer ?? "",
        isMarked: newIsMarked,
      });
      
      // 同步到後端
      if (practiceRecordId) {
        submitAnswer.mutate({
          practiceRecordId,
          questionId,
          userAnswer: existing?.answer ?? "",
          isMarked: newIsMarked,
        });
      }
      
      toast.success(newIsMarked ? "已標記" : "取消標記");
      return newMap;
    });
  };

  // 跳到下一個標記題
  const handleGoToNextMarked = () => {
    if (!questions) return;
    
    // 從當前題目的下一題開始搜尋
    for (let i = currentQuestionIndex + 1; i < questions.length; i++) {
      if (userAnswers.get(questions[i].id)?.isMarked) {
        setCurrentQuestionIndex(i);
        toast.success(`跳到第 ${i + 1} 題（標記題）`);
        return;
      }
    }
    
    // 如果沒有找到，從頭開始搜尋
    for (let i = 0; i <= currentQuestionIndex; i++) {
      if (userAnswers.get(questions[i].id)?.isMarked) {
        setCurrentQuestionIndex(i);
        toast.success(`跳到第 ${i + 1} 題（標記題）`);
        return;
      }
    }
    
    toast.info("沒有標記的題目");
  };

  // 標記題目（舊版，保留兼容）
  const handleMarkQuestion = (questionId: number) => {
    setUserAnswers((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(questionId);
      const newIsMarked = !existing?.isMarked;
      newMap.set(questionId, {
        questionId,
        answer: existing?.answer ?? "",
        isMarked: newIsMarked,
      });
      
      // 同步到後端
      if (practiceRecordId) {
        submitAnswer.mutate({
          practiceRecordId,
          questionId,
          userAnswer: existing?.answer ?? "",
          isMarked: newIsMarked,
        });
      }
      
      return newMap;
    });
  };

  // 提交考試
  const handleSubmitExam = async () => {
    if (practiceRecordId) {
      await completeTest.mutateAsync({ recordId: practiceRecordId });
    }
    setViewMode("result");
  };

  // 計算成績
  const calculateScore = () => {
    if (!questions) return { correct: 0, wrong: 0, unanswered: 0, score: 0 };

    let correct = 0;
    let wrong = 0;
    let unanswered = 0;

    questions.forEach((q) => {
      const userAnswer = userAnswers.get(q.id);
      if (!userAnswer?.answer) {
        unanswered++;
      } else if (userAnswer.answer === q.correctAnswer) {
        correct++;
      } else {
        wrong++;
      }
    });

    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    return { correct, wrong, unanswered, score };
  };

  const currentQuestion = questions?.[currentQuestionIndex];
  const currentAnswer = currentQuestion ? userAnswers.get(currentQuestion.id) : null;

  return (
    <div className="min-h-screen bg-white">
        <AnimatePresence mode="wait">
          {/* 選擇試卷 */}
          {viewMode === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="py-8 px-6 lg:px-12"
            >
              <div className="max-w-4xl mx-auto">
                {/* 返回首頁按鈕 */}
                <button
                  onClick={() => window.location.href = '/student'}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>返回學員專區</span>
                </button>
                
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
                      考試練題
                    </h1>
                    <p className="text-muted-foreground">
                      選擇一份試卷開始練習
                    </p>
                  </div>
                {/* 查看對話紀錄按鈕已移至 StudentPortal 頁面 */}
                </div>

                {/* 分類卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {/* 歷屆考古題（免費） */}
                  <button
                    onClick={() => setCategoryFilter(categoryFilter === "free" ? "all" : "free")}
                    className={`p-6 rounded-xl border-2 transition-all text-left ${
                      categoryFilter === "free"
                        ? "border-green-500 bg-green-500/10"
                        : "border-border bg-card/50 hover:border-green-500/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">📚</span>
                      <h3 className="text-lg font-semibold text-foreground">歷屆考古題</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">免費練習，無限次數</p>
                    <div className="mt-3 text-xs text-green-600 font-medium">
                      {papers?.filter(p => {
                        const accessType = (p as any)?.accessType;
                        const isPurchased = (p as any)?.isPurchased || false;
                        return accessType === "free" && !isPurchased;
                      }).length || 0} 份考卷
                    </div>
                  </button>

                  {/* 精選考題（付費） */}
                  <button
                    onClick={() => setCategoryFilter(categoryFilter === "paid" ? "all" : "paid")}
                    className={`p-6 rounded-xl border-2 transition-all text-left ${
                      categoryFilter === "paid"
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-border bg-card/50 hover:border-orange-500/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">⭐</span>
                      <h3 className="text-lg font-semibold text-foreground">精選考題</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">高品質題庫，需要點數</p>
                    <div className="mt-3 text-xs text-orange-600 font-medium">
                      {papers?.filter(p => (p as any)?.accessType === "paid").length || 0} 份考卷
                    </div>
                  </button>

                  {/* 班內生專用 */}
                  <button
                    onClick={() => setCategoryFilter(categoryFilter === "class_only" ? "all" : "class_only")}
                    className={`p-6 rounded-xl border-2 transition-all text-left ${
                      categoryFilter === "class_only"
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-border bg-card/50 hover:border-blue-500/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">🎓</span>
                      <h3 className="text-lg font-semibold text-foreground">班內生專用</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">僅限班內生學員使用</p>
                    <div className="mt-3 text-xs text-blue-600 font-medium">
                      {papers?.filter(p => (p as any)?.accessType === "class_only").length || 0} 份考卷
                    </div>
                  </button>
                </div>

                {/* 搜尋框 */}
                <div className="flex flex-col gap-4 mb-8 p-4 rounded-xl bg-card/50 border border-border">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="搜尋考試名稱、年度、科目..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {searchKeyword && (
                      <button
                        onClick={clearFilters}
                        className="px-6 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors font-medium"
                      >
                        清除篩選
                      </button>
                    )}
                  </div>
                  
                  {/* 篩選結果統計 */}
                  {filteredPapers && (
                    <div className="text-sm text-muted-foreground">
                      找到 {filteredPapers.length} 份試卷
                    </div>
                  )}
                </div>

                {isLoadingPapers ? (
                  // 載入狀態：顯示骨架屏
                  <div className="grid gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-6 rounded-xl bg-card border border-border animate-pulse">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="h-6 bg-muted rounded w-3/4 mb-3"></div>
                            <div className="flex items-center gap-4">
                              <div className="h-4 bg-muted rounded w-20"></div>
                              <div className="h-4 bg-muted rounded w-24"></div>
                              <div className="h-4 bg-muted rounded w-16"></div>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <div className="h-6 bg-muted rounded-full w-24"></div>
                            </div>
                          </div>
                          <div className="h-10 w-24 bg-muted rounded-md"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredPapers && filteredPapers.length > 0 ? (
                  <div className="grid gap-4">
                    {filteredPapers.map((paper) => (
                      <div
                        key={paper.id}
                        className={`p-6 rounded-xl bg-card border transition-all group ${
                          (paper as any).isPurchased
                            ? 'border-green-500/50 bg-green-50/5 hover:border-green-500'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                              {paper.title}
                            </h3>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-4 h-4" />
                                {paper.totalQuestions || 0} 題
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {paper.timeLimit || 60} 分鐘
                              </span>
                              {paper.year && (
                                <span className="flex items-center gap-1">
                                  <Target className="w-4 h-4" />
                                  {paper.year} 年
                                </span>
                              )}
                            </div>
                            {/* 訪問類型標籤 */}
                            <div className="mt-3 flex items-center gap-2">
                              {/* 已購買徽章 */}
                              {(paper as any).isPurchased && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 text-green-600 text-sm font-medium border border-green-500/30">
                                  ✅ 已購買
                                </span>
                              )}
                              {(paper as any).accessType === 'paid' && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-sm font-medium">
                                  💰 付費（需 {(paper as any).requiredCredits || 0} 點）
                                </span>
                              )}
                              {(paper as any).accessType === 'class_only' && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-sm font-medium">
                                  🎓 班內生
                                </span>
                              )}
                              {!(paper as any).accessType && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-500/10 text-gray-500 text-sm font-medium">
                                  ❓ 尚未設定
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleStartExam(paper.id)}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                          >
                            開始練習
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg">尚無可用的試卷</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      請先至後台上架試卷
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 考試介面 */}
          {viewMode === "exam" && (
            <motion.div
              key="exam"
              ref={containerRef}
              tabIndex={-1}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-screen flex flex-col outline-none"
            >
              {/* 載入狀態檢查 */}
              {!questions ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4 animate-spin" />
                    <p className="text-muted-foreground text-lg">載入題目中...</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      selectedPaperId: {selectedPaperId}, allQuestions: {allQuestions ? allQuestions.length : 'null'}
                    </p>
                  </div>
                </div>
              ) : questions.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                    <p className="text-foreground text-lg">此考卷沒有題目</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      請聯繫管理員添加題目
                    </p>
                    <button
                      onClick={() => setViewMode("select")}
                      className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      返回列表
                    </button>
                  </div>
                </div>
              ) : !isExamStarted ? (
                // 準備畫面：顯示考試資訊和「開始作答」按鈕
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="max-w-2xl w-full">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-card border border-border rounded-2xl p-8 space-y-6"
                    >
                      {/* 標題 */}
                      <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                          <BookOpen className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground">
                          {papers?.find(p => p.id === selectedPaperId)?.title}
                        </h2>
                        <p className="text-muted-foreground">準備好了嗎？點擊下方按鈕開始作答！</p>
                      </div>

                      {/* 考試資訊 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-background border border-border">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Target className="w-4 h-4" />
                            <span className="text-sm">題目數量</span>
                          </div>
                          <p className="text-2xl font-bold text-foreground">{questions.length} 題</p>
                        </div>
                        <div className="p-4 rounded-xl bg-background border border-border">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">考試時間</span>
                          </div>
                          <p className="text-2xl font-bold text-foreground">{formatTime(timeRemaining)}</p>
                        </div>
                      </div>

                      {/* 題型分布 */}
                      <div className="p-4 rounded-xl bg-background border border-border">
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">題型分布</h3>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(
                            questions.reduce((acc, q) => {
                              acc[q.questionType] = (acc[q.questionType] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)
                          ).map(([type, count]) => (
                            <div
                              key={type}
                              className={`px-3 py-1.5 rounded-full text-sm ${questionTypeColors[type] || "bg-primary/10 text-primary"}`}
                            >
                              {questionTypeLabels[type] || type} × {count}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 快速鍵提示 */}
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <h3 className="text-sm font-medium text-foreground mb-2">⌨️ 快速鍵提示</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div>← / → 上一題 / 下一題</div>
                          <div>M 標記題目</div>
                          <div>G 跳到標記題</div>
                          <div>R 清除答案</div>
                          <div>1-5 快速選擇 A-E</div>
                        </div>
                      </div>

                      {/* 開始作答按鈕 */}
                      <button
                        onClick={handleBeginExam}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-lg font-semibold shadow-lg hover:shadow-xl"
                      >
                        <Trophy className="w-6 h-6" />
                        開始作答
                      </button>
                    </motion.div>
                  </div>
                </div>
              ) : (
                <>
              {/* 頂部工具列 */}
              <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setViewMode("select")}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    返回
                  </button>
                  <span className="text-sm text-muted-foreground">
                    📝 目前以選擇題練習為主
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    timeRemaining < 300 ? "bg-red-500/10 text-red-400" : "bg-card"
                  }`}>
                    <Clock className="w-5 h-5" />
                    <span className="font-mono text-lg">{formatTime(timeRemaining)}</span>
                  </div>
                  <button
                    onClick={handleSubmitExam}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    交卷
                  </button>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* 左側答案卡 */}
                {showAnswerCard && (
                  <div className="w-64 bg-card border-r border-border p-4 overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-foreground">答案卡</h3>
                      <button
                        onClick={() => setShowAnswerCard(false)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        收起
                      </button>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {questions.map((q, index) => {
                        const answer = userAnswers.get(q.id);
                        const isAnswered = !!answer?.answer;
                        const isMarked = answer?.isMarked;
                        const isCurrent = index === currentQuestionIndex;

                        return (
                          <button
                            key={q.id}
                            onClick={() => setCurrentQuestionIndex(index)}
                            className={`relative w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                              isCurrent
                                ? "bg-primary text-primary-foreground"
                                : isAnswered
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                : "bg-card border border-border text-muted-foreground hover:border-primary/50"
                            }`}
                          >
                            {q.questionNumber}
                            {isMarked && (
                              <Star className="absolute -top-1 -right-1 w-3 h-3 text-amber-400 fill-amber-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-6 space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500/30" />
                        <span>已作答</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-card border border-border" />
                        <span>未作答</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span>已標記</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 答案卡展開按鈕（當答案卡收起時顯示） */}
                {!showAnswerCard && (
                  <button
                    onClick={() => setShowAnswerCard(true)}
                    className="fixed left-0 top-1/2 -translate-y-1/2 z-10 px-2 py-4 bg-primary text-primary-foreground rounded-r-lg shadow-lg hover:bg-primary/90 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}

                {/* 右側題目區 */}
                <div className="flex-1 overflow-y-auto p-6 lg:p-12">
                  {currentQuestion && (
                    <div className="max-w-3xl mx-auto">
                      {/* 題號與標記 */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-foreground">
                            第 {currentQuestion.questionNumber} 題
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${questionTypeColors[currentQuestion.questionType] || "bg-primary/10 text-primary"}`}>
                            {questionTypeLabels[currentQuestion.questionType] || "單選題"}
                          </span>
                        </div>
                        <button
                          onClick={() => handleMarkQuestion(currentQuestion.id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                            currentAnswer?.isMarked
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-card border border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Star className={`w-4 h-4 ${currentAnswer?.isMarked ? "fill-amber-400" : ""}`} />
                          <span>
                            {currentAnswer?.isMarked ? "已標記" : "標記"} <span className="text-xs text-muted-foreground">(M)</span>
                          </span>
                        </button>
                      </div>

                      {/* 題幹 */}
                      <div className="p-6 rounded-xl bg-card/50 border border-border mb-6">
                        <RichTextRenderer 
                          content={currentQuestion.questionText} 
                          className="text-lg text-foreground leading-relaxed"
                        />
                        {/* 題目圖片 */}
                        {currentQuestion.stemImage && (
                          <div className="mt-4">
                            <img 
                              src={currentQuestion.stemImage} 
                              alt="題目圖片" 
                              className="max-w-full h-auto rounded-lg border border-border"
                              style={{ maxHeight: '400px' }}
                            />
                          </div>
                        )}
                      </div>

                      {/* 選項（僅選擇題顯示） */}
                      {(currentQuestion.questionType === "single" || currentQuestion.questionType === "multiple") && (
                        <div className="space-y-3">
                          {[
                            { key: 'A', value: currentQuestion.optionA, image: currentQuestion.optionAImage },
                            { key: 'B', value: currentQuestion.optionB, image: currentQuestion.optionBImage },
                            { key: 'C', value: currentQuestion.optionC, image: currentQuestion.optionCImage },
                            { key: 'D', value: currentQuestion.optionD, image: currentQuestion.optionDImage },
                            { key: 'E', value: currentQuestion.optionE, image: currentQuestion.optionEImage },
                          ].filter(({ value }) => !!value).map(({ key, value, image }) => {
                            const isSelected = currentAnswer?.answer?.includes(key);

                            return (
                              <button
                                key={key}
                                onClick={() => {
                                  if (currentQuestion.questionType === "multiple") {
                                    // 複選題：切換選項
                                    const currentAnswerStr = currentAnswer?.answer || "";
                                    const newAnswer = currentAnswerStr.includes(key)
                                      ? currentAnswerStr.replace(key, "")
                                      : currentAnswerStr + key;
                                    handleSelectAnswer(currentQuestion.id, newAnswer.split("").sort().join(""));
                                  } else {
                                    handleSelectAnswer(currentQuestion.id, key);
                                  }
                                }}
                                className={`w-full text-left p-4 rounded-xl border transition-all ${
                                  isSelected
                                    ? "bg-primary/10 border-primary text-foreground"
                                    : "bg-card border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-background border border-border font-semibold flex-shrink-0">
                                    {key}
                                  </span>
                                  <div className="flex-1">
                                    <RichTextRenderer content={value} />
                                    {/* 選項圖片 */}
                                    {image && (
                                      <img 
                                        src={image} 
                                        alt={`選項 ${key} 圖片`}
                                        className="mt-2 max-w-full h-auto rounded-lg border border-border"
                                        style={{ maxHeight: '200px' }}
                                      />
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}



                      {/* 導航按鈕 */}
                      <div className="flex items-center justify-between mt-8">
                        <button
                          onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                          disabled={currentQuestionIndex === 0}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-foreground hover:bg-card/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-5 h-5" />
                          <span>上一題 <span className="text-xs text-muted-foreground">(←)</span></span>
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const markedIndex = questions.findIndex(
                                (q, i) => i > currentQuestionIndex && userAnswers.get(q.id)?.isMarked
                              );
                              if (markedIndex !== -1) {
                                setCurrentQuestionIndex(markedIndex);
                              } else {
                                toast.info("沒有更多標記題目");
                              }
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Flag className="w-4 h-4" />
                            <span>到標記題 <span className="text-xs text-muted-foreground">(G)</span></span>
                          </button>
                          <button
                            onClick={() => {
                              setUserAnswers((prev) => {
                                const newMap = new Map(prev);
                                newMap.delete(currentQuestion.id);
                                return newMap;
                              });
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>重做 <span className="text-xs text-muted-foreground">(R)</span></span>
                          </button>
                        </div>
                        <button
                          onClick={() =>
                            setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))
                          }
                          disabled={currentQuestionIndex === questions.length - 1}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span>下一題 <span className="text-xs opacity-80">(→)</span></span>
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </>
              )}
            </motion.div>
          )}

          {/* 結果頁面 */}
          {viewMode === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="py-12 px-6 lg:px-12"
            >
              <div className="max-w-4xl mx-auto">
                {/* 成績統計 */}
                <div className="text-center mb-12">
                  <Trophy className="w-20 h-20 text-amber-400 mx-auto mb-6" />
                  <h1 className="text-3xl font-bold text-foreground mb-4">測驗完成！</h1>

                  {(() => {
                    const totalQuestions = questions?.length || 0;
                    const answered = Array.from(userAnswers.values()).filter(a => a.answer).length;
                    const unanswered = totalQuestions - answered;
                    const marked = Array.from(userAnswers.values()).filter(a => a.isMarked).length;
                    
                    return (
                      <>
                        <p className="text-muted-foreground mb-8">練習完成！以下是您的作答統計</p>

                        <div className="grid grid-cols-3 gap-4 mb-8">
                          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                            <CheckCircle2 className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-blue-400">{answered}</p>
                            <p className="text-sm text-muted-foreground">已作答</p>
                          </div>
                          <div className="p-4 rounded-xl bg-gray-500/10 border border-gray-500/30">
                            <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-gray-400">{unanswered}</p>
                            <p className="text-sm text-muted-foreground">未作答</p>
                          </div>
                          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                            <Bookmark className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-amber-400">{marked}</p>
                            <p className="text-sm text-muted-foreground">標記題數</p>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  <div className="flex items-center justify-center gap-4 mb-12">
                    <button
                      onClick={() => setViewMode("select")}
                      className="flex items-center gap-2 px-6 py-3 rounded-lg bg-card border border-border text-foreground hover:bg-card/80 transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      返回列表
                    </button>
                    <button
                      onClick={() => {
                        if (selectedPaperId) {
                          handleStartExam(selectedPaperId);
                        }
                      }}
                      className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <RotateCcw className="w-5 h-5" />
                      再做一次
                    </button>
                  </div>
                </div>

                {/* 標記題目列表 */}
                {(() => {
                  const markedQuestionsList = questions?.filter(q => userAnswers.get(q.id)?.isMarked) || [];

                  if (markedQuestionsList.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <Bookmark className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-xl font-semibold text-foreground">沒有標記的題目</p>
                        <p className="text-sm text-muted-foreground mt-2">在練習時按 M 鍵可以標記重要的題目</p>
                      </div>
                    );
                  }

                  return (
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-6">標記題目（{markedQuestionsList.length} 題）</h2>
                      <div className="space-y-6">
                        {markedQuestionsList.map((q, index) => {
                          const userAnswer = userAnswers.get(q.id);
                          return (
                            <div key={q.id} className="p-6 rounded-xl bg-card border border-border">
                              {/* 題目標題 */}
                              <div className="flex items-center gap-3 mb-4">
                                <span className="text-lg font-semibold text-foreground">第 {q.questionNumber} 題</span>
                                <span className={`px-2 py-1 rounded-full text-xs ${questionTypeColors[q.questionType] || "bg-primary/10 text-primary"}`}>
                                  {questionTypeLabels[q.questionType] || "單選題"}
                                </span>
                              </div>

                              {/* 題目內容 */}
                              <div className="mb-4">
                                <RichTextRenderer 
                                  content={q.questionText} 
                                  className="text-foreground"
                                />
                                {q.stemImage && (
                                  <div className="mt-4">
                                    <img 
                                      src={q.stemImage} 
                                      alt="題目圖片" 
                                      className="max-w-full h-auto rounded-lg border border-border"
                                      style={{ maxHeight: '300px' }}
                                    />
                                  </div>
                                )}
                              </div>

                              {/* 選項 */}
                              {(q.questionType === "single" || q.questionType === "multiple") && (
                                <div className="space-y-2 mb-4">
                                  {[
                                    { key: 'A', value: q.optionA },
                                    { key: 'B', value: q.optionB },
                                    { key: 'C', value: q.optionC },
                                    { key: 'D', value: q.optionD },
                                    { key: 'E', value: q.optionE },
                                  ].filter(({ value }) => !!value).map(({ key, value }) => {
                                    const isUserAnswer = userAnswer?.answer?.includes(key);
                                    const isCorrectAnswer = q.correctAnswer?.includes(key);
                                    
                                    return (
                                      <div
                                        key={key}
                                        className={`p-3 rounded-lg border ${
                                          isCorrectAnswer
                                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                            : isUserAnswer
                                            ? "bg-red-500/10 border-red-500/30 text-red-400"
                                            : "bg-card border-border text-muted-foreground"
                                        }`}
                                      >
                                        <div className="flex items-start gap-3">
                                          <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-background border border-border font-semibold flex-shrink-0">
                                            {key}
                                          </span>
                                          <RichTextRenderer 
                                            content={value || ''} 
                                            className="flex-1"
                                          />
                                          {isCorrectAnswer && (
                                            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                          )}
                                          {isUserAnswer && !isCorrectAnswer && (
                                            <XCircle className="w-5 h-5 flex-shrink-0" />
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* 答案資訊 */}
                              <div className="p-4 rounded-lg bg-background/50 mb-4">
                                <p className="text-sm text-muted-foreground mb-1">你的答案</p>
                                <p className="text-lg font-semibold text-foreground">{userAnswer?.answer || "未作答"}</p>
                              </div>

                              {/* 解析 */}
                              {q.explanation && (
                                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 mb-4">
                                  <p className="text-sm font-semibold text-blue-400 mb-2">解析</p>
                                  <RichTextRenderer 
                                    content={q.explanation} 
                                    className="text-sm text-muted-foreground"
                                  />
                                </div>
                              )}

                              {/* 詢問 AI 按鈕 */}
                              <button
                                onClick={() => {
                                  if (window.confirm('確定要詢問 AI 學習建議嗎？\n\n此操作將扣除 1 點。')) {
                                    handleAskAI(q, userAnswer);
                                  }
                                }}
                                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                              >
                                <MessageCircle className="w-5 h-5" />
                                詢問 AI 學習建議（扣 1 點）
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* AI 對話框 */}
        {showAIDialog && aiDialogQuestionId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
              {/* 對話框標題 */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">AI 學習助教</h3>
                <div className="flex items-center gap-2">
                  {/* 清除歷史記錄按鈕 */}
                  {aiMessages.length > 0 && (
                    <button
                      onClick={handleClearConversation}
                      className="text-muted-foreground hover:text-destructive transition-colors p-2 hover:bg-destructive/10 rounded-lg"
                      title="清除歷史記錄"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  {/* 關閉按鈕 */}
                  <button
                    onClick={() => {
                      setShowAIDialog(false);
                      setAiDialogQuestionId(null);
                      setAiMessages([]);
                      setAiUserInput("");
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* 題目資訊區塊 */}
              {(() => {
                const question = questions.find(q => q.id === aiDialogQuestionId);
                if (!question) return null;
                
                // 清理題目文字並提取圖片
                const { text: questionText, images: questionImages } = cleanHtmlAndExtractImages(question.questionText || '');
                
                // 將 optionA/B/C/D/E 轉換為 options 陣列，並清理 HTML 標籤
                const options = [
                  { label: 'A', text: question.optionA, image: question.optionAImage },
                  { label: 'B', text: question.optionB, image: question.optionBImage },
                  { label: 'C', text: question.optionC, image: question.optionCImage },
                  { label: 'D', text: question.optionD, image: question.optionDImage },
                  { label: 'E', text: question.optionE, image: question.optionEImage },
                ].filter(opt => opt.text).map(opt => ({
                  ...opt,
                  cleanText: cleanHtmlAndExtractImages(opt.text || '').text,
                  images: cleanHtmlAndExtractImages(opt.text || '').images,
                }));
                
                return (
                  <div className="p-4 bg-muted/30 border-b border-border">
                    <div className="space-y-2">
                      {/* 題號和題型 */}
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-semibold text-primary">
                          第 {question.questionNumberInPdf || question.questionNumber} 題
                          {question.questionNumberInPdf && question.questionNumberInPdf !== question.questionNumber.toString() && (
                            <span className="text-xs text-muted-foreground ml-1">(練習編號: {question.questionNumber})</span>
                          )}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {question.questionType === 'single' ? '單選題' : '複選題'}
                        </span>
                      </div>
                      
                      {/* 題目 */}
                      <div className="text-sm text-foreground">
                        <span className="font-medium">題目：</span>
                        <span>{questionText}</span>
                      </div>
                      
                      {/* 題目圖片（優先顯示 stemImage，如果沒有則顯示從 HTML 提取的圖片） */}
                      {(question.stemImage || questionImages.length > 0) && (
                        <div className="mt-2 space-y-2">
                          {question.stemImage && (
                            <img 
                              src={question.stemImage} 
                              alt="題目圖片" 
                              className="max-w-full h-auto rounded-lg border border-border"
                            />
                          )}
                          {!question.stemImage && questionImages.map((imgUrl, idx) => (
                            <img 
                              key={idx}
                              src={imgUrl} 
                              alt={`題目圖片 ${idx + 1}`} 
                              className="max-w-full h-auto rounded-lg border border-border"
                            />
                          ))}
                        </div>
                      )}
                      
                      {/* 選項 */}
                      {options.length > 0 && (
                        <div className="space-y-2">
                          {options.map((option) => {
                            return (
                              <div key={option.label} className="text-sm text-muted-foreground">
                                <div className="flex items-start gap-2">
                                  <span className="font-medium min-w-[20px]">{option.label}.</span>
                                  <span className="whitespace-pre-wrap break-words">{option.cleanText}</span>
                                </div>
                                {/* 顯示選項圖片（優先顯示 image 欄位,如果沒有則顯示從 HTML 提取的圖片） */}
                                {(option.image || option.images.length > 0) && (
                                  <div className="ml-6 mt-1 space-y-1">
                                    {option.image && (
                                      <img 
                                        src={option.image as string} 
                                        alt={`選項 ${option.label} 圖片`} 
                                        className="max-w-full h-auto rounded border border-border"
                                      />
                                    )}
                                    {!option.image && option.images.map((imgUrl, imgIdx) => (
                                      <img 
                                        key={imgIdx}
                                        src={imgUrl} 
                                        alt={`選項 ${option.label} 圖片 ${imgIdx + 1}`} 
                                        className="max-w-full h-auto rounded border border-border"
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* 對話記錄 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {aiMessages.length === 0 && !isAiLoading && (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>正在加載對話記錄...</p>
                  </div>
                )}
                
                {aiMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg relative group ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {/* 內容區塊 */}
                      <div className="max-w-none">
                        {msg.role === "assistant" ? (
                          <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-p:my-3 prose-headings:mt-6 prose-headings:mb-3 prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-strong:text-gray-900 prose-strong:font-semibold prose-p:text-gray-800">
                            <MarkdownRenderer>{cleanMarkdown(msg.content)}</MarkdownRenderer>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        )}
                      </div>
                      
                      {/* 時間戳記、複製按鈕和請詳解按鈕 */}
                      <div className="flex items-center justify-between mt-2 gap-2">
                        <div className="text-xs opacity-70">
                          {new Date(msg.timestamp).toLocaleTimeString('zh-TW', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* 請詳解按鈕（只顯示在 AI 回答上，且是最後一則回答） */}
                          {msg.role === "assistant" && index === aiMessages.length - 1 && !isAiLoading && (
                            <button
                              onClick={() => {
                                setAiUserInput("請詳細說明上述分析，包括各選項的優缺點和延伸知識。");
                                handleSendAIMessage(aiDialogQuestionId, "請詳細說明上述分析，包括各選項的優缺點和延伸知識。");
                              }}
                              className="px-3 py-1 text-xs bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
                              title="請求更詳細的說明"
                            >
                              💡 請詳解
                            </button>
                          )}
                          
                          {/* 複製按鈕（只顯示在 AI 回答上） */}
                          {msg.role === "assistant" && (
                            <button
                              onClick={() => handleCopyMessage(msg.content, index)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/20 rounded"
                              title="複製內容"
                            >
                              {copiedIndex === index ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isAiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 自動滾動到最新訊息的參考點 */}
                <div ref={messagesEndRef} />
              </div>

              {/* 輸入框 */}
              <div className="p-4 border-t border-border">
                {/* 快捷按鈕組 */}
                <div className="mb-3">
                  <button
                    onClick={() => aiDialogQuestionId && handleSendAIMessage(aiDialogQuestionId, '請提供一個類似的例題，幫助我更好地理解這個知識點')}
                    disabled={isAiLoading}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2 text-sm font-medium"
                  >
                    <Sparkles className="w-4 h-4" />
                    出類似題
                  </button>
                </div>
                
                <div className="space-y-2 mb-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiUserInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 1000) {
                          setAiUserInput(value);
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && aiDialogQuestionId) {
                          e.preventDefault();
                          handleSendAIMessage(aiDialogQuestionId, aiUserInput);
                        }
                      }}
                      placeholder="繼續問問題..."
                      className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isAiLoading}
                    />
                    <button
                      onClick={() => aiDialogQuestionId && handleSendAIMessage(aiDialogQuestionId, aiUserInput)}
                      disabled={isAiLoading || !aiUserInput.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      發送
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <span className={`text-xs ${
                      aiUserInput.length > 900 ? 'text-red-500' : 'text-gray-500'
                    }`}>
                      {aiUserInput.length} / 1000 字
                    </span>
                  </div>
                </div>
                
                {/* 保存對話按鈕 */}
                {aiMessages.length > 0 && (
                  <button
                    onClick={() => aiDialogQuestionId && handleSaveConversation(aiDialogQuestionId)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Bookmark className="w-4 h-4" />
                    💾 保存此次對話
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* 對話紀錄搜尋 Dialog */}
        {showSearchDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
              {/* Dialog 標題 */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">💬 歷史對話紀錄</h2>
                <button
                  onClick={() => {
                    setShowSearchDialog(false);
                    setSelectedConversation(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* 搜尋和篩選 */}
              <div className="p-4 border-b border-border space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="搜尋題目或對話內容..."
                    value={searchConversationKeyword}
                    onChange={(e) => setSearchConversationKeyword(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSearchTimeRange("7days")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      searchTimeRange === "7days"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    最近 7 天
                  </button>
                  <button
                    onClick={() => setSearchTimeRange("30days")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      searchTimeRange === "30days"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    最近 30 天
                  </button>
                  <button
                    onClick={() => setSearchTimeRange("all")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      searchTimeRange === "all"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    全部
                  </button>
                </div>
              </div>
              
              {/* 搜尋結果 */}
              <div className="flex-1 overflow-y-auto p-4">
                {isSearchingConversations ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">搜尋中...</p>
                  </div>
                ) : conversationSearchResults && conversationSearchResults.length > 0 ? (
                  <div className="space-y-3">
                    {conversationSearchResults.map((conv) => (
                      <div
                        key={conv.id}
                        className="p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-all cursor-pointer"
                        onClick={() => setSelectedConversation(conv)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground mb-1">
                              第 {conv.questionNumber} 題
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {conv.questionText}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>💬 {conv.messageCount} 則對話</span>
                              <span>🕒 {new Date(conv.lastMessageTime).toLocaleDateString('zh-TW')}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">沒有找到對話紀錄</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* 對話詳情 Dialog */}
        {selectedConversation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
              {/* Dialog 標題 */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">第 {selectedConversation.questionNumber} 題</h2>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{selectedConversation.questionText}</p>
                </div>
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* 對話內容 */}
              <div className="flex-1 overflow-y-auto p-4">
                <p className="text-sm text-muted-foreground mb-4">正在加載對話詳情...</p>
              </div>
              
              {/* 繼續對話按鈕 */}
              <div className="p-4 border-t border-border">
                <button
                  onClick={() => {
                    setSelectedConversation(null);
                    setShowSearchDialog(false);
                    // TODO: 跳轉到題目並打開 AI 對話框
                    toast.info('此功能正在開發中...');
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold transition-all duration-200"
                >
                  💬 繼續對話
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 扣點確認對話框 - 使用 shadcn/ui Dialog 組件 */}
        <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl">確認購買考卷</DialogTitle>
              <DialogDescription className="sr-only">
                確認購買考卷並扣除點數
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {(() => {
                const selectedPaper = papers?.find(p => p.id === pendingExamId);
                const requiredCredits = (selectedPaper as any)?.requiredCredits || 0;
                const totalCredits = (user?.credits || 0) + (user?.permanentCredits || 0);

                return (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">考卷名稱</p>
                      <p className="text-lg font-semibold">{selectedPaper?.title}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">所需點數</p>
                        <p className="text-lg font-semibold text-orange-500">{requiredCredits} 點</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">您的點數</p>
                        <p className="text-lg font-semibold text-blue-500">{totalCredits} 點</p>
                      </div>
                    </div>
                    
                    {totalCredits < requiredCredits && (
                      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                        <p className="text-red-500 font-semibold text-sm">⚠️ 點數不足，無法購買！</p>
                      </div>
                    )}
                    
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-sm text-muted-foreground">
                        💡 購買後將扣除 <span className="font-semibold text-foreground">{requiredCredits}</span> 點，一旦購買就可以無限次練習這個考卷。
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
            
            {/* 按鈕區域 - 不使用 DialogFooter */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2 pt-4">
              {/* 將確認購買按鈕移到前面 */}
              <button
                type="button"
                onClick={() => {
                  alert('👍 確認購買按鈕被點擊！');
                  console.log('[購買] 按鈕被點擊，pendingExamId:', pendingExamId);
                  
                  if (pendingExamId) {
                    purchaseExam.mutate({ practiceExamId: pendingExamId });
                  }
                }}
                disabled={purchaseExam.isPending}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {purchaseExam.isPending ? '處理中...' : '確認購買'}
              </button>
              <button
                type="button"
                onClick={() => {
                  alert('👍 取消按鈕被點擊！');
                  setShowPurchaseDialog(false);
                  setPendingExamId(null);
                }}
                className="px-4 py-2 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground font-semibold transition-all duration-200"
              >
                取消
              </button>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
}
