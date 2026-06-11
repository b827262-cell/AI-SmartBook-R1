import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Send, CheckCircle, BookOpen, Loader2, FileQuestion, Volume2, VolumeX, Settings2, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTTS, getTTSSettings, splitByLanguage } from "@/hooks/useTTS";
import { SpeakingWave } from "@/components/SpeakingWave";
import { toast } from "sonner";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { cleanMarkdown } from "@/lib/markdownCleaner";

export default function ChapterLearning() {
  const params = useParams();
  const [, setLocation] = useLocation();
  
  const categoryId = parseInt(params.categoryId || "0");
  const chapterIndex = parseInt(params.chapterIndex || "0");
  const chapterTitle = decodeURIComponent(params.chapterTitle || "");
  
  const [message, setMessage] = useState("");
  const [conversationHistory, setConversationHistory] = useState<Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    sources?: Array<{
      documentTitle: string;
      chunkText: string;
    }>;
  }>>([]);
  const [progressId, setProgressId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // TTS 語音設定（從 localStorage 讀取）
  const [ttsVoiceName, setTtsVoiceName] = useState<string>(() => localStorage.getItem('tts_voice') || 'auto');
  const [ttsRate, setTtsRate] = useState<number>(() => parseFloat(localStorage.getItem('tts_rate') || '1.1'));
  const [showTtsSettings, setShowTtsSettings] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // 載入可用語音列表
  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis?.getVoices() || [];
      const zhVoices = v.filter(voice => voice.lang.startsWith('zh'));
      setAvailableVoices(zhVoices);
    };
    loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // 儲存語音設定到 localStorage
  const saveTtsSettings = (voiceName: string, rate: number) => {
    localStorage.setItem('tts_voice', voiceName);
    localStorage.setItem('tts_rate', rate.toString());
    setTtsVoiceName(voiceName);
    setTtsRate(rate);
  };

  const { speak, stop, isSpeaking, speakingIndex } = useTTS("親切學姐");

  // 自訂語音播放函式（支援中英混讀）
  const isCancelledRef = useRef(false);
  const speakCustom = useCallback((text: string, _index?: number) => {
    if (!('speechSynthesis' in window) || !text.trim()) return;
    window.speechSynthesis.cancel();
    isCancelledRef.current = false;

    const voices = window.speechSynthesis.getVoices();
    // 中文語音：依用戶設定或預設 Yating
    const getZhVoice = () => {
      if (ttsVoiceName !== 'auto') {
        const v = voices.find(v => v.name === ttsVoiceName);
        if (v) return v;
      }
      return voices.find(v => v.name.includes('Yating') || v.name.includes('Google 國語') || v.lang === 'zh-TW')
        || voices.find(v => v.lang.startsWith('zh')) || null;
    };
    // 英文語音：Google US English 優先
    const getEnVoice = () =>
      voices.find(v => v.name.includes('Google US English'))
      || voices.find(v => v.name.includes('Google UK English'))
      || voices.find(v => v.lang === 'en-US')
      || voices.find(v => v.lang.startsWith('en')) || null;

    const segments = splitByLanguage(text);
    let idx = 0;
    const playNext = () => {
      if (isCancelledRef.current || idx >= segments.length) return;
      const seg = segments[idx++];
      const utterance = new SpeechSynthesisUtterance(seg.text);
      utterance.rate = ttsRate;
      utterance.pitch = 1.0;
      if (seg.lang === 'en') {
        utterance.lang = 'en-US';
        const v = getEnVoice();
        if (v) utterance.voice = v;
      } else {
        utterance.lang = 'zh-TW';
        const v = getZhVoice();
        if (v) utterance.voice = v;
      }
      utterance.onend = playNext;
      utterance.onerror = (e) => { if (e.error !== 'interrupted') playNext(); };
      window.speechSynthesis.speak(utterance);
    };
    playNext();
  }, [ttsVoiceName, ttsRate]);
  
  // 查詢學習進度
  const { data: learningProgressData } = trpc.knowledgeLearning.getLearningProgress.useQuery(
    { categoryId },
    { enabled: !!categoryId && isInitializing }
  );
  
  // 開始學習章節
  const startChapterMutation = trpc.knowledgeLearning.startChapterLearning.useMutation({
    onSuccess: (data) => {
      setProgressId(data.progressId);
      setConversationHistory([{
        role: "assistant",
        content: data.openingMessage,
        timestamp: Date.now(),
      }]);
      setIsInitializing(false);
      // 自動朗讀開場白（取前 100 字）
      setTimeout(() => {
        const shortText = data.openingMessage.replace(/[#*`>\[\]]/g, "").slice(0, 100);
        speak(shortText, 0);
      }, 600);
    },
    onError: (error) => {
      alert(`錯誤：${error.message}`);
      setIsInitializing(false);
    },
  });
  
  // 繼續對話
  const continueMutation = trpc.knowledgeLearning.continueDialogue.useMutation({
    onSuccess: (data) => {
      setConversationHistory(prev => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          timestamp: Date.now(),
          sources: data.sources,
        },
      ]);
      setIsLoading(false);
      // AI 回答完成後自動朗讀（若開啟）
      const ttsSettings = getTTSSettings();
      if (ttsSettings.autoSpeak) {
        setTimeout(() => {
          const plainText = data.message.replace(/[#*`>\[\]]/g, "").trim();
          if (plainText) speakCustom(plainText);
        }, 300);
      }
      // AI 回答完成後自動聰焦輸入框
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    },
    onError: (error) => {
      toast.error(`錯誤：${error.message}`);
      setIsLoading(false);
    },
  });
  
  // 更新學習狀態
  const updateStatusMutation = trpc.knowledgeLearning.updateLearningStatus.useMutation({
    onSuccess: (data) => {
      toast.success("章節已標記為完成！");
      // 返回引導學習頁面
      setLocation(`/student/guided-learning/${categoryId}`);
    },
    onError: (error) => {
      toast.error(`錯誤：${error.message}`);
    },
  });
  
  // 進入頁面時載入或開始學習
  useEffect(() => {
    if (!categoryId || chapterIndex < 0 || !chapterTitle || !isInitializing) return;
    
    // 等待 learningProgressData 載入完成
    if (learningProgressData === undefined) return;
    
    // 查找是否有現有的學習進度
    const existingProgress = learningProgressData.progress.find(
      p => p.chapterIndex === chapterIndex
    );
    
    if (existingProgress && existingProgress.conversationData) {
      // 載入現有的對話歷史
      try {
        // conversationData 已經是 JavaScript 對象，不需要 JSON.parse
        const conversationData = existingProgress.conversationData as any;
        const history = Array.isArray(conversationData) ? conversationData : [];
        
        if (history.length > 0) {
          // 有對話歷史，直接載入
          setProgressId(existingProgress.id);
          setConversationHistory(history);
          setIsInitializing(false);
        } else {
          // conversationData 是空陣列，重新呼叫 AI 生成開場訊息
          startChapterMutation.mutate({ categoryId, chapterIndex, chapterTitle });
        }
      } catch (error) {
        console.error("載入對話數據失敗：", error);
        // 如果載入失敗，就重新開始
        startChapterMutation.mutate({ categoryId, chapterIndex, chapterTitle });
      }
    } else {
      // 沒有現有進度，開始新的學習
      startChapterMutation.mutate({ categoryId, chapterIndex, chapterTitle });
    }
  }, [categoryId, chapterIndex, chapterTitle, learningProgressData, isInitializing]);
  
  // 自動滾動到最新訊息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationHistory]);
  
  // 發送訊息
  const handleSendMessage = async () => {
    if (!message.trim() || !progressId || isLoading) return;
    
    // 學生送出訊息時立即中斷朗讀
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    // 添加用戶訊息到對話歷史
    setConversationHistory(prev => [
      ...prev,
      {
        role: "user",
        content: message,
        timestamp: Date.now(),
      },
    ]);
    
    setIsLoading(true);
    
    // 調用 API
    continueMutation.mutate({
      progressId,
      categoryId,
      message,
    });
    
    // 清空輸入
    setMessage('');
  };
  
  // 完成章節
  const handleCompleteChapter = () => {
    if (!progressId) return;
    
    updateStatusMutation.mutate({
      progressId,
      status: "completed",
    });
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 頁首 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/student/guided-learning/${categoryId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回學習路徑
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">第 {chapterIndex + 1} 章</h1>
              <p className="text-sm text-gray-600">{chapterTitle}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation(`/student/knowledge-learning/quiz/${categoryId}/${chapterIndex}/${encodeURIComponent(chapterTitle)}`)}
            >
              <FileQuestion className="h-4 w-4 mr-2" />
              練習測驗
            </Button>
            <Button
              onClick={handleCompleteChapter}
              disabled={updateStatusMutation.isPending || !progressId}
              size="sm"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {updateStatusMutation.isPending ? "處理中..." : "完成章節"}
            </Button>
          </div>
        </div>
        
        {/* 對話區域 */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold">AI 引導學習</h2>
            </div>
            {/* 語音設定按鈕 */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTtsSettings(v => !v)}
                className="flex items-center gap-1.5 text-gray-600 border-gray-300"
              >
                <Volume2 className="h-4 w-4" />
                <span className="text-xs">語音設定</span>
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
              {/* 語音設定面板 */}
              {showTtsSettings && (
                <div className="absolute right-0 top-10 z-50 w-80 bg-white border border-gray-200 rounded-xl shadow-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">🔊 語音設定</h3>
                    <button onClick={() => setShowTtsSettings(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {/* 語音選擇 */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">語音</label>
                    <Select value={ttsVoiceName} onValueChange={(v) => saveTtsSettings(v, ttsRate)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="自動選擇" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">自動選擇（中文語音）</SelectItem>
                        {availableVoices.map(v => (
                          <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* 語速調整 */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-xs font-medium text-gray-600">語速</label>
                      <span className="text-xs font-bold text-blue-600">{ttsRate.toFixed(1)}x</span>
                    </div>
                    <Slider
                      min={0.5} max={2.0} step={0.1}
                      value={[ttsRate]}
                      onValueChange={([v]) => saveTtsSettings(ttsVoiceName, v)}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>慢 0.5x</span><span>正常 1.0x</span><span>快 2.0x</span>
                    </div>
                  </div>
                  {/* 試聽按鈕 */}
                  <Button
                    size="sm" variant="outline" className="w-full text-xs"
                    onClick={() => speakCustom('你好！我是 AI 學習助教，很高興能幫助你學習！')}
                  >
                    🔊 試聽效果
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* 對話歷史 */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto mb-4">
            {conversationHistory.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none">
                      <MarkdownRenderer>{cleanMarkdown(cleanMarkdown(msg.content))}</MarkdownRenderer>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                  
                  {/* 來源標註 */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <p className="text-xs font-semibold mb-2">📚 參考來源：</p>
                      {msg.sources.map((source, idx) => (
                        <div key={idx} className="text-xs mb-2 p-2 bg-white rounded">
                          <p className="font-medium">[來源 {idx + 1}] {source.documentTitle}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs opacity-70">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                    {msg.role === "assistant" && (
                      <button
                        onClick={() => {
                          if (isSpeaking && speakingIndex === index) {
                            stop();
                          } else {
                            const plainText = msg.content.replace(/[#*`>\[\]]/g, "").slice(0, 400);
                            speakCustom(plainText, index);
                          }
                        }}
                        className={`ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          isSpeaking && speakingIndex === index
                            ? "bg-blue-500 text-white shadow-md"
                            : "bg-gray-200 text-gray-600 hover:bg-blue-100 hover:text-blue-700"
                        }`}
                        title={isSpeaking && speakingIndex === index ? "停止朗讀" : "朗讀此段"}
                      >
                        {isSpeaking && speakingIndex === index
                          ? <><SpeakingWave className="mr-0.5" />停止</>
                          : <><Volume2 className="h-3.5 w-3.5" />朗讀</>}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* 初始化中：AI 正在準備開場訊息 */}
            {isInitializing && (
              <div className="flex justify-start">
                <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 flex items-center gap-3 max-w-[80%]">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm text-blue-600 font-medium">AI 正在準備學習引導，請稍候...</span>
                </div>
              </div>
            )}

            {/* 對話中思考動畫 */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 border border-gray-200 rounded-2xl px-5 py-4 flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm text-gray-500">AI 思考中...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* 輸入框 */}
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= 1000) {
                  setMessage(value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="輸入你的回答或問題..."
              className="flex-1 min-h-[80px]"
              disabled={isLoading || !progressId}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading || !progressId}
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500">
              💡 提示：按 Enter 發送，Shift + Enter 換行
            </p>
            <span className={`text-xs ${
              message.length > 900 ? 'text-red-500' : 'text-gray-500'
            }`}>
              {message.length} / 1000 字
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
