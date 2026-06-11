import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Send, BookOpen, Scale, Quote, Brain, Bookmark } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { cleanMarkdown } from "@/lib/markdownCleaner";
import { HighlightText } from "@/components/HighlightText";
import { toast } from "sonner";
import { useTTS, convertLawNumbersToChinese, getTTSSettings } from "@/hooks/useTTS";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type QuotedArticle = {
  lawName: string;
  articleNo: string;
  content: string;
};

export default function LawLearning() {
  const { speak, stop, isSpeaking, speakingIndex, autoSpeak } = useTTS();

  const [selectedLaw, setSelectedLaw] = useState("全部法規"); // 搜尋區的法律選擇
  const [chatLaw, setChatLaw] = useState("全部法規"); // AI 對話區的法律選擇
  const [searchKeyword, setSearchKeyword] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizData, setQuizData] = useState<any>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [quotedArticles, setQuotedArticles] = useState<QuotedArticle[]>([]);
  const [quizDifficulty, setQuizDifficulty] = useState<"basic" | "advanced" | "comprehensive">("basic"); // 測驗難度
  const [showDifficultyDialog, setShowDifficultyDialog] = useState(false); // 難度選擇對話框
  const [showAllArticles, setShowAllArticles] = useState(false); // 是否顯示全部條文
  const [allArticlesPage, setAllArticlesPage] = useState(1); // 分頁頁碼

  // 獲取法律列表
  const { data: lawsData } = trpc.lawLearning.listLaws.useQuery();

  // 列出全部條文
  const allArticlesQuery = trpc.lawLearning.getAllArticles.useQuery(
    { lawName: selectedLaw, page: allArticlesPage, pageSize: 100 },
    { enabled: showAllArticles && selectedLaw !== '全部法規' }
  );
  // 過濾掉「全部法規」（如果資料庫中有的話），因為我們會手動添加
  const laws = (lawsData?.laws || []).filter(law => law !== '全部法規');

  // 搜尋法條
  const searchMutation = trpc.lawLearning.searchArticles.useQuery(
    {
      lawName: selectedLaw,
      keyword: searchKeyword,
      limit: 50,  // 增加 limit 確保跨法搜尋時能返回不同法規的條文
    },
    {
      enabled: searchKeyword.length > 0,
    }
  );

  // 載入對話歷史
  const { data: historyData } = trpc.lawLearning.loadHistory.useQuery(
    { lawName: chatLaw },
    {
      enabled: chatLaw !== "全部法規",
      onSuccess: (data) => {
        if (data.conversationData && data.conversationData.length > 0) {
          setConversationHistory(data.conversationData);
        }
      },
    }
  );

  // 保存對話歷史
  const saveHistoryMutation = trpc.lawLearning.saveHistory.useMutation();

  // 收藏法條
  const bookmarkMutation = trpc.lawLearning.bookmarkArticle.useMutation({
    onSuccess: () => {
      alert("收藏成功！");
    },
    onError: (error) => {
      alert(error.message || "收藏失敗！");
    },
  });

  // 引導式教學對話
  const chatMutation = trpc.lawLearning.chat.useMutation({
    onSuccess: (data) => {
      const newHistory = [
        ...conversationHistory,
        { role: "user" as const, content: userMessage },
        { role: "assistant" as const, content: data.message },
      ];
      setConversationHistory(newHistory);
      setCurrentAssistantMessage(data.message);
      setUserMessage("");
      
      // 保存對話歷史（如果不是「全部法規」）
      if (chatLaw !== "全部法規") {
        saveHistoryMutation.mutate({
          lawName: chatLaw,
          conversationData: newHistory,
        });
      }
      
      // 自動滾動到最新訊息
      setTimeout(() => {
        if (scrollAreaRef.current) {
          const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }
        }
      }, 100);

      // 自動朗讀 AI 回覆
      if (getTTSSettings().autoSpeak && data.message) {
        setTimeout(() => {
          const plain = data.message
            .replace(/```[\s\S]*?```/g, '')
            .replace(/[#*`>~_]/g, '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .trim()
            .slice(0, 300);
          if (plain) speak(plain);
        }, 300);
      }
    },
  });

  // 生成測驗
  const generateQuizMutation = trpc.lawLearning.generateQuiz.useMutation({
    onSuccess: (data) => {
      setQuizData(data);
      setQuizOpen(true);
      setUserAnswers({});
      setShowResults(false);
    },
  });

  // 記錄錯題
  const recordMistakeMutation = trpc.lawLearning.recordMistake.useMutation({
    onSuccess: (data) => {
      console.log("✅ 錯題記錄成功:", data);
    },
    onError: (error) => {
      console.error("❌ 錯題記錄失敗:", error);
    },
  });

  const handleSendMessage = () => {
    if (!userMessage.trim()) return;

    // 學生送出訊息時立即中斷朗讀
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();

    chatMutation.mutate({
      lawName: chatLaw, // 使用 AI 對話區的法律選擇
      userMessage,
      conversationHistory,
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Scale className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">六法全書 - 引導式學習</h1>
            </div>
            <p className="text-muted-foreground">
              透過 AI 引導式教學，深入理解法律條文的意義和應用
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => window.location.href = "/student/my-bookmarks"}
          >
            <Bookmark className="w-4 h-4 mr-2" />
            我的收藏
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start lg:sticky-right">
        {/* 左側：法條搜尋 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              法條搜尋
            </CardTitle>
            <CardDescription>
              輸入關鍵字搜尋相關法條
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* 法律選擇 */}
              <div className="bg-accent/30 p-4 rounded-lg border">
                <label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  步驟 1：選擇法規範圍
                </label>
                <select
                  value={selectedLaw}
                  onChange={(e) => {
                    setSelectedLaw(e.target.value);
                    setShowAllArticles(false);
                    setAllArticlesPage(1);
                  }}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="全部法規">全部法規（搜尋所有法律）</option>
                  {laws.map((law) => (
                    <option key={law} value={law}>{law}</option>
                  ))}
                </select>
                {selectedLaw !== '全部法規' && (
                  <Button
                    variant={showAllArticles ? 'default' : 'outline'}
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => {
                      setShowAllArticles(!showAllArticles);
                      setAllArticlesPage(1);
                    }}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    {showAllArticles ? '關閉全部條文' : `列出「${selectedLaw}」全部條文`}
                  </Button>
                )}
              </div>

              {/* 搜尋輸入 */}
              <div className="bg-accent/30 p-4 rounded-lg border">
                <label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  步驟 2：輸入搜尋關鍵字
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="例如：契約、所有權、繼承、第 35 條..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        searchMutation.refetch();
                      }
                    }}
                    className="bg-background"
                  />
                  <Button
                    onClick={() => searchMutation.refetch()}
                    disabled={!searchKeyword.trim()}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  提示：可搜尋條文內容、條號（例如：第 35 條）或章節名稱
                </p>
              </div>

              {/* 搜尋結果 / 全部條文 */}
              <div>
                <div className="mb-3">
                  <label className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4" />
                    {showAllArticles ? `${selectedLaw} 全部條文` : '搜尋結果'}
                  </label>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>「說明」：請 AI 解釋法條</div>
                    <div>「引用」：將法條加入對話框</div>
                    <div>「收藏」：儲存到我的收藏</div>
                  </div>
                </div>
                <ScrollArea className="h-[520px] border rounded-md p-4">
                  {/* 全部條文模式 */}
                  {showAllArticles && (
                    <>
                      {allArticlesQuery.isLoading && (
                        <p className="text-muted-foreground text-center py-8">載入條文中...</p>
                      )}
                      {allArticlesQuery.data && allArticlesQuery.data.articles.length === 0 && (
                        <p className="text-muted-foreground text-center py-8">該法規尚無條文資料</p>
                      )}
                      {allArticlesQuery.data && allArticlesQuery.data.articles.length > 0 && (
                        <div className="space-y-3">
                          {allArticlesQuery.data.articles.map((article) => (
                            <div key={article.id} className="p-3 border rounded-md hover:bg-accent transition-colors">
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex-1">
                                  <div className="font-semibold text-primary mb-1">{article.articleNo}</div>
                                  {article.chapter && (
                                    <div className="text-xs text-muted-foreground mb-1">{article.book} {article.chapter}</div>
                                  )}
                                  <div className="text-sm whitespace-pre-wrap">{article.content}</div>
                                </div>
                                <div className="flex flex-col gap-1 shrink-0">
                                  <Button size="sm" variant="outline" onClick={() => {
                                    const ttsKey = article.id * 100;
                                    if (isSpeaking && speakingIndex === ttsKey) {
                                      stop();
                                    } else {
                                      speak(convertLawNumbersToChinese(`${article.lawName}${article.articleNo}。${article.content}`), ttsKey);
                                    }
                                  }} className={isSpeaking && speakingIndex === article.id * 100 ? 'bg-blue-500 text-white' : ''}>
                                    {isSpeaking && speakingIndex === article.id * 100 ? '⏹ 停止' : '🔊 朗讀'}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => {
                                    const fullMessage = `請說明${article.lawName}${article.articleNo}的內容和應用。\n\n條文內容：\n${article.content}`;
                                    setUserMessage(fullMessage);
                                  }}>說明</Button>
                                  <Button size="sm" variant="outline" onClick={() => {
                                    if (quotedArticles.length >= 2) { alert('最多只能引用 2 個法條！'); return; }
                                    if (quotedArticles.some(q => q.lawName === article.lawName && q.articleNo === article.articleNo)) { alert('已引用過了！'); return; }
                                    setQuotedArticles([...quotedArticles, { lawName: article.lawName, articleNo: article.articleNo, content: article.content }]);
                                  }}>引用</Button>
                                  <Button size="sm" variant="outline" onClick={() => {
                                    bookmarkMutation.mutate({ lawName: article.lawName, articleNo: article.articleNo, content: article.content });
                                  }}>收藏</Button>
                                </div>
                              </div>
                            </div>
                          ))}
                          {/* 分頁按鈕 */}
                          <div className="flex justify-center gap-2 pt-2">
                            <Button size="sm" variant="outline" disabled={allArticlesPage === 1} onClick={() => setAllArticlesPage(p => p - 1)}>上一頁</Button>
                            <span className="text-sm text-muted-foreground self-center">第 {allArticlesPage} 頁</span>
                            <Button size="sm" variant="outline" disabled={(allArticlesQuery.data?.articles.length ?? 0) < 100} onClick={() => setAllArticlesPage(p => p + 1)}>下一頁</Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {/* 搜尋結果模式 */}
                  {!showAllArticles && searchMutation.isLoading && (
                    <p className="text-muted-foreground text-center py-8">
                      搜尋中...
                    </p>
                  )}
                  {!showAllArticles && searchMutation.data && searchMutation.data.articles.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      找不到相關法條
                    </p>
                  )}
                  {!showAllArticles && searchMutation.data && searchMutation.data.articles.length > 0 && (
                    <div className="space-y-4">
                      {searchMutation.data.articles.map((article) => (
                        <div
                          key={article.id}
                          className="p-3 border rounded-md hover:bg-accent transition-colors"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <div className="font-semibold text-primary mb-1">
                                {selectedLaw === '全部法規' ? `${article.lawName} ${article.articleNo}` : article.articleNo}
                              </div>
                              {article.chapter && (
                                <div className="text-xs text-muted-foreground mb-2">
                                  {article.book} {article.chapter}
                                </div>
                              )}
                              <div className="text-sm">
                                <HighlightText text={article.content} highlight={searchKeyword} />
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const ttsKey = article.id * 100 + 1;
                                  if (isSpeaking && speakingIndex === ttsKey) {
                                    stop();
                                  } else {
                                    speak(convertLawNumbersToChinese(`${article.lawName}${article.articleNo}。${article.content}`), ttsKey);
                                  }
                                }}
                                className={isSpeaking && speakingIndex === article.id * 100 + 1 ? 'bg-blue-500 text-white' : ''}
                              >
                                {isSpeaking && speakingIndex === article.id * 100 + 1 ? '⏹ 停止' : '🔊 朗讀'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const fullMessage = `請說明${article.lawName}${article.articleNo}的內容和應用。\n\n條文內容：\n${article.content}\n\n請完整解釋條文中的所有概念，如果需要可以參考相關法條進行說明。`;
                                  setUserMessage(fullMessage);
                                }}
                              >
                                說明
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // 限制最多引用2個法條
                                  if (quotedArticles.length >= 2) {
                                    alert("最多只能引用2個法條進行比較！請先清除已引用的法條。");
                                    return;
                                  }
                                  // 檢查是否已經引用過這個法條
                                  const alreadyQuoted = quotedArticles.some(
                                    (q) => q.lawName === article.lawName && q.articleNo === article.articleNo
                                  );
                                  if (alreadyQuoted) {
                                    alert("這個法條已經引用過了！");
                                    return;
                                  }
                                  // 添加到引用清單
                                  setQuotedArticles([
                                    ...quotedArticles,
                                    {
                                      lawName: article.lawName,
                                      articleNo: article.articleNo,
                                      content: article.content,
                                    },
                                  ]);
                                }}
                              >
                                引用 {quotedArticles.length > 0 && `(${quotedArticles.length}/2)`}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  bookmarkMutation.mutate({
                                    lawName: article.lawName,
                                    articleNo: article.articleNo,
                                    content: article.content,
                                  });
                                }}
                              >
                                收藏
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 右側：引導式教學對話 */}
        <Card className="lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle>AI 引導式教學</CardTitle>
            <CardDescription>
              提出問題，AI 會引導您理解法律條文
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* AI 對話區的法律選擇器 */}
              <div>
                <label className="text-sm font-medium mb-2 block">對話範圍（選擇 AI 回答時參考的法律）</label>
                <select
                  value={chatLaw}
                  onChange={(e) => setChatLaw(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="全部法規">全部法規</option>
                  {laws.map((law) => (
                    <option key={law} value={law}>{law}</option>
                  ))}
                </select>
              </div>
              {/* 對話歷史 */}
              <ScrollArea ref={scrollAreaRef} className="h-[calc(100vh-380px)] min-h-[400px] border rounded-md p-4">
                {conversationHistory.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="mb-4">👋 歡迎來到六法全書引導式學習！</p>
                    <p className="text-sm">
                      您可以：
                      <br />
                      • 搜尋法條並點擊查看
                      <br />
                      • 直接提問法律問題
                      <br />
                      • 請 AI 解釋特定法條
                      <br />• 討論實際案例的法律適用
                    </p>
                  </div>
                )}
                {conversationHistory.map((msg, index) => {
                  const assistantMsgIndex = conversationHistory
                    .slice(0, index + 1)
                    .filter(m => m.role === 'assistant').length - 1;
                  const chatTtsKey = 900000 + assistantMsgIndex;
                  return (
                  <div
                    key={index}
                    className={`mb-4 ${
                      msg.role === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    <div
                      className={`inline-block max-w-[80%] p-3 rounded-lg ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div>
                          <MarkdownRenderer>{cleanMarkdown(cleanMarkdown(msg.content))}</MarkdownRenderer>
                          <div className="mt-1 flex justify-end">
                            <button
                              onClick={() => {
                                if (isSpeaking && speakingIndex === chatTtsKey) {
                                  stop();
                                } else {
                                  const plain = msg.content
                                    .replace(/#{1,6}\s+/g, '')
                                    .replace(/\*\*(.+?)\*\*/g, '$1')
                                    .replace(/\n/g, ' ')
                                    .trim();
                                  speak(plain, chatTtsKey);
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full transition-colors ${
                                isSpeaking && speakingIndex === chatTtsKey
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              }`}
                            >
                              {isSpeaking && speakingIndex === chatTtsKey ? '⏹ 停止' : '🔊 朗讀'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                  );
                })}
                {chatMutation.isPending && (
                  <div className="text-left mb-4">
                    <div className="inline-block max-w-[80%] p-3 rounded-lg bg-muted">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <p className="text-muted-foreground">AI 正在思考...</p>
                      </div>
                    </div>
                  </div>
                )}
              </ScrollArea>

              {/* 已引用的法條 */}
              {quotedArticles.length > 0 && (
                <div className="border rounded-md p-3 bg-muted/50">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium">已引用的法條 ({quotedArticles.length}/2)</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setQuotedArticles([])}
                    >
                      清除全部
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {quotedArticles.map((article, index) => (
                      <div key={index} className="flex justify-between items-start gap-2 text-sm p-2 bg-background rounded">
                        <div className="flex-1">
                          <p className="font-semibold text-primary">{article.lawName}{article.articleNo}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{article.content}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setQuotedArticles(quotedArticles.filter((_, i) => i !== index));
                          }}
                        >
                          移除
                        </Button>
                      </div>
                    ))}
                  </div>
                  {quotedArticles.length === 2 && (
                    <Button
                      className="w-full mt-2"
                      variant="default"
                      onClick={() => {
                        const comparisonMessage = `請比較以下兩個法條的差異：\n\n第一個法條：${quotedArticles[0].lawName}${quotedArticles[0].articleNo}\n${quotedArticles[0].content}\n\n第二個法條：${quotedArticles[1].lawName}${quotedArticles[1].articleNo}\n${quotedArticles[1].content}\n\n請說明這兩個法條有何差異？`;
                        setUserMessage(comparisonMessage);
                        setQuotedArticles([]);
                      }}
                    >
                      <Scale className="h-4 w-4 mr-2" />
                      比較這兩個法條
                    </Button>
                  )}
                </div>
              )}

              {/* 輸入區域 */}
              <div className="space-y-2">
                <Textarea
                  placeholder="輸入您的問題或想討論的法律議題..."
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={5}
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    
                  </p>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!userMessage.trim() || chatMutation.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    發送
                  </Button>
                </div>
              </div>

              {/* 快捷按鈕 */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setUserMessage("請介紹民法的基本架構和重要概念")
                  }
                >
                  介紹民法
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUserMessage("什麼是契約？")}
                >
                  什麼是契約
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUserMessage("請說明所有權的概念")}
                >
                  所有權概念
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDifficultyDialog(true)}
                  disabled={generateQuizMutation.isPending}
                >
                  <Brain className="h-4 w-4 mr-1" />
                  生成測驗
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 測驗對話框 */}
      <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
                <DialogTitle>法律小測驗</DialogTitle>
            <DialogDescription>
              測試你對 {chatLaw} 的理解程度
            </DialogDescription>
          </DialogHeader>
          {quizData && (
            <div className="space-y-6 mt-4">
              {quizData.questions.map((q: any, index: number) => (
                <div key={index} className="space-y-3">
                  <h3 className="font-semibold">
                    {index + 1}. {q.question}
                  </h3>
                  <RadioGroup
                    value={userAnswers[index] || ""}
                    onValueChange={(value) => {
                      setUserAnswers((prev) => ({
                        ...prev,
                        [index]: value,
                      }));
                    }}
                    disabled={showResults}
                  >
                    {q.options.map((option: string, optIndex: number) => {
                      const optionLetter = option.charAt(0);
                      const isCorrect = optionLetter === q.correctAnswer;
                      const isSelected = userAnswers[index] === optionLetter;
                      return (
                        <div
                          key={optIndex}
                          className={`flex items-center space-x-2 p-2 rounded ${
                            showResults
                              ? isCorrect
                                ? "bg-green-100 dark:bg-green-900"
                                : isSelected
                                ? "bg-red-100 dark:bg-red-900"
                                : ""
                              : ""
                          }`}
                        >
                          <RadioGroupItem
                            value={optionLetter}
                            id={`q${index}-opt${optIndex}`}
                          />
                          <Label htmlFor={`q${index}-opt${optIndex}`}>
                            {option}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                  {showResults && (
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <p className="text-sm font-semibold mb-1">解釋：</p>
                      <p className="text-sm">{q.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex justify-end gap-2">
                {!showResults ? (
                  <Button
                    onClick={() => {
                      // 自動記錄答錯的題目
                      let mistakeCount = 0;
                      quizData.questions.forEach((q: any, index: number) => {
                        const userAnswer = userAnswers[index];
                        if (userAnswer && userAnswer !== q.correctAnswer) {
                          mistakeCount++;
                          recordMistakeMutation.mutate({
                            lawName: chatLaw,
                            difficulty: quizDifficulty,
                            question: q.question,
                            options: q.options,
                            correctAnswer: q.correctAnswer,
                            userAnswer: userAnswer,
                            explanation: q.explanation,
                          });
                        }
                      });
                      
                      if (mistakeCount > 0) {
                        toast.success(`已將 ${mistakeCount} 題錯題記錄到錯題本`);
                      }
                      
                      // 最後才顯示結果
                      setShowResults(true);
                    }}
                    disabled={Object.keys(userAnswers).length !== quizData.questions.length}
                  >
                    提交答案
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setQuizOpen(false);
                      setQuizData(null);
                      setUserAnswers({});
                      setShowResults(false);
                    }}
                  >
                    關閉
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 難度選擇對話框 */}
      <Dialog open={showDifficultyDialog} onOpenChange={setShowDifficultyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>選擇測驗難度</DialogTitle>
            <DialogDescription>
              請選擇適合您的學習程度的難度級別
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <RadioGroup value={quizDifficulty} onValueChange={(value: any) => setQuizDifficulty(value)}>
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                <RadioGroupItem value="basic" id="basic" />
                <Label htmlFor="basic" className="flex-1 cursor-pointer">
                  <div className="font-medium">📚 基礎題目</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    主要考查對法條文義的理解和記憶，題目直接明確，選項差異明顯。
                  </div>
                </Label>
              </div>
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                <RadioGroupItem value="advanced" id="advanced" />
                <Label htmlFor="advanced" className="flex-1 cursor-pointer">
                  <div className="font-medium">🎯 進階題目</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    考查對法條的深入理解和應用，需要分析比較不同法條或概念，選項有一定迷惑性。
                  </div>
                </Label>
              </div>
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                <RadioGroupItem value="comprehensive" id="comprehensive" />
                <Label htmlFor="comprehensive" className="flex-1 cursor-pointer">
                  <div className="font-medium">💡 綜合應用題目</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    考查對多個法條的綜合運用和實務判斷，需要結合實際案例或情境，選項高度相似且有迷惑性。
                  </div>
                </Label>
              </div>
            </RadioGroup>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowDifficultyDialog(false)}>
                取消
              </Button>
              <Button
                onClick={() => {
                  setShowDifficultyDialog(false);
                  generateQuizMutation.mutate({
                    lawName: chatLaw,
                    conversationHistory: conversationHistory.length > 0 
                      ? conversationHistory 
                      : undefined,
                    difficulty: quizDifficulty,
                  });
                }}
                disabled={generateQuizMutation.isPending}
              >
                {generateQuizMutation.isPending ? "生成中..." : "開始測驗"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
