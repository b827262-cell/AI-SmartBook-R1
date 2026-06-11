import { useState, useEffect, useRef } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Send, 
  Trash2, 
  BookOpen,
  Loader2,
  FileText,
  RefreshCw,
  Zap,
  ShoppingCart,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { cleanMarkdown } from "@/lib/markdownCleaner";

// 移除 HTML 標籤的函數
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

// 每段對話最大輪數（問答各算一輪）
const MAX_ROUNDS_PER_SEGMENT = 10;

interface ChatMessage {
  role: "user" | "assistant" | "segment_break";
  content: string;
  segmentIndex?: number;
  suggestions?: string[];
  sources?: Array<{
    documentTitle: string;
    chunkIndex: number;
    chunkText: string;
    similarity: number;
  }>;
}

// 開場白建議按鈕（首次進入時顯示）
const WELCOME_SUGGESTIONS = [
  "這個類科的核心概念是什麼？",
  "有哪些重要的考試重點？",
  "可以從哪個主題開始學習？",
];

export function KnowledgeLearningChat() {
  const [, params] = useRoute("/student/knowledge-learning/:categoryId");
  const categoryId = params?.categoryId || "";
  
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [dailyPointsUsed, setDailyPointsUsed] = useState(0);
  const [dailyPointsLimit, setDailyPointsLimit] = useState(50);
  const [isOverLimit, setIsOverLimit] = useState(false);
  const [currentSegmentRounds, setCurrentSegmentRounds] = useState(0);
  const [showSegmentPrompt, setShowSegmentPrompt] = useState(false);
  // 最新一則 AI 回答的建議按鈕
  const [latestSuggestions, setLatestSuggestions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 獲取或創建會話（使用 categoryId）
  const { data: sessionData, isLoading: isLoadingSession } = 
    trpc.knowledgeLearning.getOrCreateSession.useQuery(
      { category: categoryId, categoryId: Number(categoryId) || undefined },
      { enabled: !!categoryId }
    );

  // AI 對話 mutation
  const chatMutation = trpc.knowledgeLearning.chat.useMutation({
    onSuccess: (data) => {
      // 添加 AI 回答到訊息列表
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.message,
        sources: data.sources,
        suggestions: data.suggestions || [],
      }]);
      
      // 更新最新建議按鈕
      setLatestSuggestions(data.suggestions || []);
      
      // 更新點數狀態
      if (data.dailyPointsUsed !== undefined) {
        setDailyPointsUsed(data.dailyPointsUsed);
        setDailyPointsLimit(data.dailyPointsLimit);
        setIsOverLimit(data.isOverLimit);
      }
      
      // 更新本段輪數，到達上限時靜默自動開新段
      setCurrentSegmentRounds(prev => {
        const newRounds = prev + 1;
        if (newRounds >= MAX_ROUNDS_PER_SEGMENT && sessionId) {
          // 靜默自動開新段，學生完全感覺不到
          setTimeout(() => {
            newSegmentMutation.mutate({ sessionId });
          }, 500);
        }
        return newRounds;
      });
    },
  });

  // 開啟新段對話 mutation（靜默模式：不在對話中顯示分隔線）
  const newSegmentMutation = trpc.knowledgeLearning.newSegment.useMutation({
    onSuccess: () => {
      // 靜默重置輪數，學生完全感覺不到
      setCurrentSegmentRounds(0);
      setShowSegmentPrompt(false);
    },
  });

  // 清除會話 mutation
  const clearMutation = trpc.knowledgeLearning.clearSession.useMutation({
    onSuccess: () => {
      setMessages([]);
      setCurrentSegmentRounds(0);
      setShowSegmentPrompt(false);
      setDailyPointsUsed(0);
      setIsOverLimit(false);
      setLatestSuggestions([]);
    },
  });

  // 載入會話歷史
  useEffect(() => {
    if (sessionData?.session && sessionData?.messages) {
      setSessionId(sessionData.session.id);
      
      const formattedMessages: ChatMessage[] = sessionData.messages
        .filter((msg: any) => msg.role !== "system" || msg.content.startsWith("__SEGMENT_BREAK__"))
        .map((msg: any) => {
          if (msg.role === "system" && msg.content.startsWith("__SEGMENT_BREAK__")) {
            const segIdx = parseInt(msg.content.replace("__SEGMENT_BREAK__", "")) || 2;
            return {
              role: "segment_break" as const,
              content: msg.content,
              segmentIndex: segIdx,
            };
          }
          return {
            role: msg.role as "user" | "assistant",
            content: msg.content,
            sources: msg.sources ? JSON.parse(msg.sources) : undefined,
          };
        });
      
      setMessages(formattedMessages);
      
      if (sessionData.dailyPointsUsed !== undefined) {
        setDailyPointsUsed(sessionData.dailyPointsUsed);
        setDailyPointsLimit(sessionData.dailyPointsLimit);
        setIsOverLimit(sessionData.isOverLimit);
      }
      
      let roundsInCurrentSegment = 0;
      for (let i = formattedMessages.length - 1; i >= 0; i--) {
        if (formattedMessages[i].role === "segment_break") break;
        if (formattedMessages[i].role === "assistant") roundsInCurrentSegment++;
      }
      setCurrentSegmentRounds(roundsInCurrentSegment);
      if (roundsInCurrentSegment >= MAX_ROUNDS_PER_SEGMENT) {
        setShowSegmentPrompt(true);
      }
    }
  }, [sessionData]);

  // 自動滚動到底部並將焦點移回輸入框
  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    // AI 回答完成後，將焦點移回輸入框
    if (!chatMutation.isPending) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, latestSuggestions, chatMutation.isPending]);

  // 發送訊息
  const handleSend = (customMessage?: string, isInteraction?: boolean) => {
    const msgToSend = customMessage || message;
    if (!msgToSend.trim() || !sessionId) return;

    // 清除建議按鈕（發送後等待新的建議）
    setLatestSuggestions([]);

    setMessages(prev => [...prev, {
      role: "user",
      content: msgToSend,
    }]);

    chatMutation.mutate({
      sessionId,
      category: categoryId,
      categoryId: Number(categoryId) || undefined,
      message: msgToSend,
      learnedTopics: learnedTopics.length > 0 ? learnedTopics : undefined,
      isInteraction: isInteraction || false,
    });

    if (!customMessage) setMessage("");
  };

  const handleNewSegment = () => {
    if (!sessionId) return;
    newSegmentMutation.mutate({ sessionId });
  };

  const handleClear = () => {
    if (!sessionId) return;
    if (!confirm("確定要清除所有對話記錄嗎？")) return;
    clearMutation.mutate({ sessionId });
  };

  // 獲取分類資訊
  const { data: categoriesData } = trpc.knowledgeLearning.listCategories.useQuery();
  const categoryData = categoriesData?.categories.find((c: any) => String(c.id) === categoryId);

  // 獲取已學主題列表
  const { data: learnedTopicsData, refetch: refetchLearnedTopics } = trpc.knowledgeLearning.getLearnedTopics.useQuery(
    { categoryId: Number(categoryId) },
    { enabled: !!categoryId && !!Number(categoryId) }
  );
  const learnedTopics = learnedTopicsData?.topics || [];

  // 標記主題已學 mutation
  const markTopicLearnedMutation = trpc.knowledgeLearning.markTopicLearned.useMutation({
    onSuccess: () => { refetchLearnedTopics(); },
  });

  // 是否為全新對話（沒有任何訊息）
  const isEmptyChat = messages.length === 0;
  // 顯示的建議按鈕：全新對話時顯示開場白建議，有回答後顯示 AI 建議
  const displaySuggestions = isEmptyChat && !chatMutation.isPending
    ? WELCOME_SUGGESTIONS
    : latestSuggestions;

  const pointsPercent = dailyPointsLimit > 0 ? Math.min((dailyPointsUsed / dailyPointsLimit) * 100, 100) : 0;
  const pointsColor = pointsPercent >= 100 ? "bg-red-500" : pointsPercent >= 80 ? "bg-orange-400" : "bg-primary";

  if (isLoadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 頁面標題（固定在頂部） */}
      <div className="sticky top-0 z-10 border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/student/knowledge-learning">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回類科列表
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: categoryData?.color || "#3b82f6" }}
                />
                <div>
                  <h1 className="text-xl font-bold">
                    {categoryData?.displayName || categoryData?.name || "知識庫學習"}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    AI 引導式學習 · {messages.filter(m => m.role !== "segment_break").length} 則對話
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* 點數進度條 */}
              <div className="flex items-center gap-2 min-w-[200px]">
                <Zap className="w-4 h-4 text-yellow-500 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">今日學習點數</span>
                    <span className={`text-xs font-medium ${isOverLimit ? "text-red-500" : "text-foreground"}`}>
                      {dailyPointsUsed} / {dailyPointsLimit}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pointsColor}`}
                      style={{ width: `${pointsPercent}%` }}
                    />
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={messages.length === 0 || clearMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                清除對話
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 點數用完提示橫幅 */}
      {isOverLimit && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-3">
          <div className="container flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-700">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">今日學習已達上限，明天繼續或購買點數</span>
              <span className="text-xs text-orange-500">（當前對話仍可繼續完成）</span>
            </div>
            <Button size="sm" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100">
              <ShoppingCart className="w-4 h-4 mr-1" />
              購買點數
            </Button>
          </div>
        </div>
      )}

      {/* 對話區域（整頁捲動） */}
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-4 pb-2">
          <Card>
            <CardContent className="p-0">
              {/* 訊息列表 */}
              <div className="p-6" ref={scrollRef}>
              {/* 開場白（全新對話時顯示） */}
              {isEmptyChat && (
                <div className="flex justify-start mb-6">
                  <div className="max-w-[80%] space-y-3">
                    <div className="bg-muted rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">iBrain 智匯</span>
                      </div>
                      {learnedTopics.length > 0 ? (
                        <p className="text-sm leading-relaxed">
                          🎉 歡迎回來！你上次學到了「<strong>{learnedTopics[learnedTopics.length - 1]}</strong>」。
                          <br /><br />
                          今天要繼續深入，還是探索「<strong>{categoryData?.displayName || categoryData?.name || "這個類科"}</strong>」的其他主題？下方有建議，或直接輸入你想學的內容 👇
                        </p>
                      ) : (
                        <p className="text-sm leading-relaxed">
                          你好！我是 iBrain 智匯，專門協助你學習「<strong>{categoryData?.displayName || categoryData?.name || "這個類科"}</strong>」的知識。
                          <br /><br />
                          你可以直接輸入問題，或點選下方的建議主題開始學習 👇
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 訊息列表 */}
              {messages.length > 0 && (
                <div className="space-y-6">
                  {messages.map((msg, index) => {
                    if (msg.role === "segment_break") {
                      return (
                        <div key={index} className="flex items-center gap-4 py-2">
                          <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                          <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">
                            第 {msg.segmentIndex} 段學習
                          </Badge>
                          <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                        </div>
                      );
                    }
                    
                    return (
                      <div
                        key={index}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground rounded-lg p-4"
                              : "space-y-3"
                          }`}
                        >
                          {msg.role === "user" ? (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          ) : (
                            <>
                              <div className="bg-muted rounded-lg p-4">
                                {(() => {
                                  const DETAIL_HINT = "📖 需要詳細解說嗎？";
                                  const hasDetailHint = msg.content.includes(DETAIL_HINT);
                                  const cleanedContent = hasDetailHint
                                    ? msg.content.replace(DETAIL_HINT, "").trimEnd()
                                    : msg.content;
                                  return (
                                    <>
                                      <MarkdownRenderer>{cleanMarkdown(cleanMarkdown(cleanedContent))}</MarkdownRenderer>
                                      {hasDetailHint && (
                                        <div className="mt-3 pt-3 border-t border-border">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-primary border-primary hover:bg-primary hover:text-primary-foreground"
                                            disabled={chatMutation.isPending}
                                            onClick={() => handleSend("請對上一個問題給我詳細解說")}
                                          >
                                            📖 詳細解說
                                          </Button>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                              
                              {/* 來源標註 */}
                              {msg.sources && msg.sources.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">📚 參考來源：</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {msg.sources.map((source, sourceIndex) => (
                                      <div key={sourceIndex} className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                                        <FileText className="w-3 h-3 shrink-0" />
                                        <span className="font-medium text-foreground/70">[來源 {sourceIndex + 1}]</span>
                                        <span>{source.documentTitle}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* 載入中指示器 */}
                  {chatMutation.isPending && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-4">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    </div>
                  )}
                  
                  {/* 達到段落上限提示 */}

                </div>
              )}

              {/* 建議按鈕區域（開場白 or AI 回答後的下一步建議） */}
              {displaySuggestions.length > 0 && !chatMutation.isPending && (
                <div className={`${messages.length > 0 ? "mt-4" : "mt-2"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs text-muted-foreground font-medium">
                      {isEmptyChat ? "建議從這裡開始" : "繼續深入學習"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {displaySuggestions.map((suggestion, idx) => {
                      const isLearned = learnedTopics.includes(suggestion);
                      // 小節式互動按鈕樣式：根據內容判斷按鈕類型
                      const isConfirmBtn = suggestion.includes('我懂了') || suggestion.includes('繼續下一個');
                      const isRetryBtn = suggestion.includes('不太懂') || suggestion.includes('再解釋');
                      const isQuizBtn = suggestion.includes('出題') || suggestion.includes('考考我');
                      const btnStyle = isConfirmBtn
                        ? 'border-green-400 bg-green-50 text-green-800 hover:bg-green-100'
                        : isRetryBtn
                        ? 'border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100'
                        : isQuizBtn
                        ? 'border-blue-400 bg-blue-50 text-blue-800 hover:bg-blue-100'
                        : isLearned
                        ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                        : 'border-border bg-card text-foreground hover:bg-primary/5 hover:border-primary/40';
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            // 標記為已學（只標記非固定互動按鈕的主題）
                            if (!isLearned && !isConfirmBtn && !isRetryBtn && !isQuizBtn && Number(categoryId)) {
                              markTopicLearnedMutation.mutate({
                                categoryId: Number(categoryId),
                                topic: suggestion,
                              });
                            }
                            // 互動按鈕（我懂了/再解釋/出題）不走快取
                            const isInteractionBtn = isConfirmBtn || isRetryBtn || isQuizBtn;
                            handleSend(suggestion, isInteractionBtn);
                          }}
                          disabled={chatMutation.isPending}
                          className={`flex items-center gap-2 text-left px-3 py-2.5 rounded-lg border transition-colors text-sm font-medium group disabled:opacity-50 disabled:cursor-not-allowed ${btnStyle}`}
                        >
                          <span className="flex-1">{suggestion}</span>
                          {isLearned && !isConfirmBtn && !isRetryBtn && !isQuizBtn && (
                            <span className="text-xs text-green-500 shrink-0">已學</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            </CardContent>
          </Card>
        </div>
      </div>

      {/* 輸入區域（sticky 固定在底部） */}
      <div className="sticky bottom-0 z-10 border-t bg-card">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {currentSegmentRounds > 0 && currentSegmentRounds < MAX_ROUNDS_PER_SEGMENT && (
            <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
              <span>本段對話：{currentSegmentRounds} / {MAX_ROUNDS_PER_SEGMENT} 輪</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={handleNewSegment}
                disabled={newSegmentMutation.isPending}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                提前開啟新段
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder={isOverLimit ? "今日點數已用完，仍可繼續當前對話..." : "輸入您的問題，或點選上方建議..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              ref={inputRef}
              disabled={chatMutation.isPending}
            />
            <Button
              onClick={() => handleSend()}
              disabled={!message.trim() || chatMutation.isPending}
            >
              {chatMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
