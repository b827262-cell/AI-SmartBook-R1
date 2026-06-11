import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Brain, MessageSquare, HelpCircle, X, MessageCircle, Volume2, VolumeX } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { emitDeductCredits } from "@/components/CoinAnimation";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { cleanMarkdown } from "@/lib/markdownCleaner";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { getTTSSettings, saveTTSSettings, unlockSpeech } from "@/hooks/useTTS";

const guideContent = `
# 👋 歡迎使用 iBrain 智匯

**iBrain 智匯**是一個專注於大學以上高等教育的智能學習平台，整合 AI 智能、知識庫、學習資源與考試備考，幫助大學生、研究生、博士生更有效率地學習和研究。

---

## ✨ 系統亮點

### 🤖 AI 智能助教
- **簡潔直接的回答風格**：不再有冗長的開場白，直接進入正題，節省您的時間
- **樂觀更新機制**：用戶輸入訊息後立即顯示，不需等待，使用體驗更流暢
- **平滑串流回應**：回答完成後平滑過渡，不會有閃爛現象

### 🎯 考試練題系統
- **精簡的交互設計**：移除不必要的按鈕，只保留「出類似題」功能，讓介面更清爽
- **寬大易讀的對話框**：支援 Markdown 格式，讓學習內容更清晰
- **智能學習建議**：根據您的答題情況，AI 會提供個人化的學習建議

### 📚 智能解題
- **互動式學習**：左側 PDF 閱讀器，右側 AI 對話框，隨時提問
- **截圖快速提問**：截取 PDF 內容直接請教 AI，學習更高效

---

## 📚 主要功能

### 1️⃣ 智能對話

**功能介紹：**
- 使用 AI 助教進行問答，支援文字和圖片輸入
- 可以上傳截圖或照片，讓 AI 識別題目並提供解答
- 支援多輪對話，可以持續追問

**使用步驟：**
1. 點擊首頁的「立即開始」按鈕，進入對話頁面
2. 在輸入框中輸入問題，或點擊左下角的上傳按鈕（向上箭頭圖示）
3. 按下 Enter 或點擊發送按鈕，AI 會立即回答
4. 可以繼續追問，進行多輪對話

---

🚀 **立即開始使用 iBrain 智匯，讓學習更輕鬆！**
`;

// 六位助教資料
type ChatStyle = 'brother_kind' | 'brother_strict' | 'brother_funny' | 'sister_kind' | 'sister_strict' | 'sister_funny';

const TUTORS: {
  style: ChatStyle;
  name: string;
  tag: string;
  desc: string;
  avatar: string;
  color: string;
}[] = [
  {
    style: 'brother_kind',
    name: '親切學長',
    tag: '🎓',
    desc: '耐心解說，循序漸進',
    avatar: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/new_brother_kind_ce1ec807.png',
    color: 'from-blue-50 to-blue-100 border-blue-200 hover:border-blue-400',
  },
  {
    style: 'brother_strict',
    name: '嚴格學長',
    tag: '🎓',
    desc: '要求精確，邏輯嚴謹',
    avatar: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/new_brother_strict_635ef3e4.png',
    color: 'from-slate-50 to-slate-100 border-slate-200 hover:border-slate-400',
  },
  {
    style: 'brother_funny',
    name: '幽默學長',
    tag: '🎓',
    desc: '輕鬆有趣，記憶深刻',
    avatar: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/new_brother_funny_f92b620d.png',
    color: 'from-yellow-50 to-yellow-100 border-yellow-200 hover:border-yellow-400',
  },
  {
    style: 'sister_kind',
    name: '親切學姊',
    tag: '👩‍🎓',
    desc: '溫柔鼓勵，貼心引導',
    avatar: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/sister_kind_nobg_dc89bc41.png',
    color: 'from-pink-50 to-pink-100 border-pink-200 hover:border-pink-400',
  },
  {
    style: 'sister_strict',
    name: '嚴格學姊',
    tag: '👩‍🎓',
    desc: '嚴謹求精，絕不模糊',
    avatar: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/new_sister_strict_8db6e4b1.png',
    color: 'from-purple-50 to-purple-100 border-purple-200 hover:border-purple-400',
  },
  {
    style: 'sister_funny',
    name: '幽默學姊',
    tag: '👩‍🎓',
    desc: '輕鬆自然，就是學習',
    avatar: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/new_sister_funny_200f415a.png',
    color: 'from-orange-50 to-orange-100 border-orange-200 hover:border-orange-400',
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const createConversationMutation = trpc.conversation.create.useMutation();
  const updateProfileMutation = trpc.auth.updateProfile.useMutation();
  const [showGuide, setShowGuide] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<ChatStyle | null>(null);
  const [startingStyle, setStartingStyle] = useState<ChatStyle | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  // 確認框狀態
  const [pendingStyle, setPendingStyle] = useState<ChatStyle | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // 朗讀開關狀態
  const [autoSpeak, setAutoSpeak] = useState(() => getTTSSettings().autoSpeak);

  // 監聽其他元件（如 Navbar）修改設定時同步更新
  useEffect(() => {
    const handler = (e: Event) => {
      setAutoSpeak((e as CustomEvent).detail?.autoSpeak ?? false);
    };
    window.addEventListener('tts-settings-changed', handler);
    return () => window.removeEventListener('tts-settings-changed', handler);
  }, []);

  const handleToggleAutoSpeak = () => {
    // 解鎖語音（需要用戶互動）
    unlockSpeech();
    const next = !autoSpeak;
    setAutoSpeak(next);
    saveTTSSettings({ autoSpeak: next });
    toast.success(next ? '🔊 自動朗讀已開啟，AI 回覆後自動播放' : '🔇 自動朗讀已關閉', { duration: 2000 });
  };

  const utils = trpc.useUtils();

  // 讀取目前 AI 模型設定（決定是否免費）
  const { data: aiModelSetting } = trpc.settings.get.useQuery({ key: 'ai_model' });
  const isLocalModel = !aiModelSetting || aiModelSetting === 'gemma4';

  // 一次查詢所有助教的進行中對話（首頁載入時查詢）
  const { data: allActiveConvs, refetch: refetchAllActive } = trpc.conversation.getAllActiveByStyle.useQuery(undefined, {
    staleTime: 0, // 每次進入首頁都重新查詢
    refetchOnWindowFocus: true,
  });

  // 返回首頁時強制重新查詢剩餘題數（不依賴窗口焦點）
  useEffect(() => {
    if (location === '/') {
      refetchAllActive();
    }
  }, [location]);

  // 點選助教卡片 → 查詢是否有舊對話，有則直接進入，沒有則彈出確認框
  const handleSelectTutor = async (style: ChatStyle) => {
    // 防止重複點擊（已在處理中則忽略）
    if (startingStyle) return;
    setSelectedStyle(style);
    setStartingStyle(style);
    try {
      // 先更新 profile 記住選擇（背景執行，不需等待）
      updateProfileMutation.mutate({ chatStyle: style });

      // 即時查詢相同風格且未滿 5 題的對話（強制跳過快取，確保拿到最新資料）
      await utils.conversation.getActiveByStyle.invalidate({ style });
      const activeConv = await utils.conversation.getActiveByStyle.fetch({ style });
      if (activeConv) {
        // 繼續舊對話，不扣點，直接進入
        setLocation(`/chat/${activeConv.id}?style=${style}`);
        setStartingStyle(null);
        return;
      }

      // 沒有可繼續的對話 → 彈出確認框 + 觸發金幣動畫
      setStartingStyle(null);
      setPendingStyle(style);
      setConfirmOpen(true);
      emitDeductCredits(3); // 三枚金幣飛走動畫
    } catch (error) {
      toast.error("進入對話失敗，請稍後再試");
      setStartingStyle(null);
    }
  };

  // 確認框按下「確認開始」→ 真正開新對話
  const handleConfirmStart = async () => {
    if (!pendingStyle) return;
    if (createConversationMutation.isPending) return; // 防止重複點擊
    const style = pendingStyle;
    setConfirmOpen(false);
    setPendingStyle(null);
    setStartingStyle(style);
    try {
      const newConv = await createConversationMutation.mutateAsync({ chatStyle: style });
      // 建立新對話後清除快取，下次點擊才能正確找到這個新對話
      await utils.conversation.getActiveByStyle.invalidate({ style });
      await utils.conversation.getAllActiveByStyle.invalidate();
      toast.success(isLocalModel ? '已開啟新對話，目前免費無限提問！' : '已開啟新對話（扣 1 點）', { duration: 3000 });
      setLocation(`/chat/${newConv.conversationId}?style=${style}`);
      setStartingStyle(null);
    } catch (error) {
      toast.error("進入對話失敗，請稍後再試");
      setStartingStyle(null);
    }
  };

  // 點「立即開始」→ 使用預設親切學姊
  const handleStartChat = async () => {
    try {
      const result = await createConversationMutation.mutateAsync({});
      setLocation(`/chat/${result.conversationId}`);
    } catch (error) {
      toast.error("創建對話失敗，請稍後再試");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const brothers = TUTORS.filter(t => t.style.startsWith('brother'));
  const sisters = TUTORS.filter(t => t.style.startsWith('sister'));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted overflow-x-hidden">

      {/* 主要內容 */}
      <main className="container mx-auto px-4 py-6">
        {/* Hero區域 */}
        <div className="text-center mb-6">
          {/* Logo + 標題同排 */}
          <div className="inline-flex items-center justify-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold">
              iBrain 智匯
            </h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            您的24小時隨身助教，快速解決您80%的課業問題
          </p>

          {/* 朗讀開關 */}
          <div className="flex justify-center mt-3">
            <button
              onClick={handleToggleAutoSpeak}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                autoSpeak
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-primary'
              }`}
            >
              {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {autoSpeak ? 'AI 自動朗讀：開啟中' : 'AI 自動朗讀：關閉'}
            </button>
          </div>
        </div>

        {/* 助教選擇區 */}
        <div className="max-w-3xl mx-auto mb-8">

          {/* 學長排（上） */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            {brothers.map((tutor) => (
              <TutorCard
                key={tutor.style}
                tutor={tutor}
                isSelected={selectedStyle === tutor.style}
                isLoading={startingStyle === tutor.style}
                activeConvInfo={allActiveConvs?.[tutor.style]}
                onClick={() => handleSelectTutor(tutor.style)}
              />
            ))}
          </div>

          {/* 學姊排（下） */}
          <div className="grid grid-cols-3 gap-3">
            {sisters.map((tutor) => (
              <TutorCard
                key={tutor.style}
                tutor={tutor}
                isSelected={selectedStyle === tutor.style}
                isLoading={startingStyle === tutor.style}
                activeConvInfo={allActiveConvs?.[tutor.style]}
                onClick={() => handleSelectTutor(tutor.style)}
              />
            ))}
          </div>
        </div>

        {/* 立即開始按鈕 - 已隱藏 */}
        {/* <div className="flex items-center justify-center mb-4">
          <Button
            size="lg"
            variant="outline"
            onClick={handleStartChat}
            disabled={createConversationMutation.isPending || !!startingStyle}
            className="gap-2"
          >
            <MessageSquare className="w-5 h-5" />
            立即開始（預設親切學姊）
          </Button>
        </div> */}

        {/* 使用流程 */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-base font-bold text-center mb-3 text-muted-foreground">簡單三步驟</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-base font-bold mx-auto mb-1.5">
                1
              </div>
              <h4 className="text-xs font-semibold mb-0.5">選擇助教(三種性格)</h4>
              <p className="text-[11px] text-muted-foreground leading-tight">
                點選喜歡的風格
              </p>
            </div>

            <div className="text-center">
              <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-base font-bold mx-auto mb-1.5">
                2
              </div>
              <h4 className="text-xs font-semibold mb-0.5">輸入問題(如聊天般)</h4>
              <p className="text-[11px] text-muted-foreground leading-tight">
                文字或上傳圖片
              </p>
            </div>

            <div className="text-center">
              <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-base font-bold mx-auto mb-1.5">
                3
              </div>
              <h4 className="text-xs font-semibold mb-0.5">獲得解答(生動口氣)</h4>
              <p className="text-[11px] text-muted-foreground leading-tight">
                學長姊詳細解說
              </p>
            </div>
          </div>
        </div>

        {/* 意見回饋按鈕 */}
        {user && (
          <div className="flex justify-center mt-4 mb-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFeedbackOpen(true)}
              className="gap-2 text-muted-foreground"
            >
              <MessageCircle className="w-4 h-4" />
              意見回饋
            </Button>
          </div>
        )}
      </main>

      {/* 開新對話確認框 */}
      {confirmOpen && pendingStyle && (() => {
        const tutor = TUTORS.find(t => t.style === pendingStyle);
        return (
          <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 pb-8 px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in slide-in-from-bottom-4 duration-300">
              {/* 助教頭像 + 名稱 */}
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={tutor?.avatar}
                  alt={tutor?.name}
                  className="w-16 h-16 object-contain"
                />
                <div>
                  <div className="font-bold text-lg">{tutor?.tag} {tutor?.name}</div>
                  <div className="text-sm text-muted-foreground">{tutor?.desc}</div>
                </div>
              </div>
              {/* 確認文字 */}
              <p className="text-sm text-foreground mb-1">
                {isLocalModel ? (
                  <>🎉 目前免費使用，<span className="font-bold text-green-600">不扣點數</span>，問題數量無限制。</>
                ) : (
                  <>💳 開啟新對話將扣除 <span className="font-bold text-orange-600">1 點</span>，問題數量無限制。</>
                )}
              </p>
              <p className="text-xs text-muted-foreground mb-5">💡 已有未完成的對話會自動繼續。</p>
              {/* 按鈕區 */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setConfirmOpen(false); setPendingStyle(null); setSelectedStyle(null); }}
                >
                  取消
                </Button>
                <Button
                  className="flex-1 bg-primary text-primary-foreground"
                  onClick={handleConfirmStart}
                  disabled={createConversationMutation.isPending}
                >
                  {createConversationMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      開啟中...
                    </span>
                  ) : '🚀 確認開始'}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 操作說明對話框 */}
      {showGuide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-primary" />
                iBrain 智匯 - 操作說明
              </h3>
              <button
                onClick={() => setShowGuide(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-sm max-w-none">
                <MarkdownRenderer>{cleanMarkdown(guideContent)}</MarkdownRenderer>
              </div>
            </div>
            <div className="p-6 border-t border-border">
              <Button className="w-full" onClick={() => setShowGuide(false)}>
                我知道了
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 頁尾 */}
      <footer className="border-t border-border mt-2">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          <p>AI學長姊的回答可能會有錯誤，有任何問題，請於意見回饋留下您寶貴的意見。謝謝!</p>
        </div>
      </footer>
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  );
}

// ── 助教卡片元件 ─────────────────────────────────────────────
function TutorCard({
  tutor,
  isSelected,
  isLoading,
  activeConvInfo,
  onClick,
}: {
  tutor: typeof TUTORS[number];
  isSelected: boolean;
  isLoading: boolean;
  activeConvInfo?: { id: number; userMsgCount: number };
  onClick: () => void;
}) {
  const hasActiveConv = !!activeConvInfo;
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`
        relative flex flex-col items-center rounded-xl border-2 bg-gradient-to-b p-2 pt-3
        transition-all duration-150 cursor-pointer select-none
        ${tutor.color}
        ${isSelected ? 'ring-2 ring-primary ring-offset-1 scale-105 shadow-lg' : 'hover:scale-105 hover:shadow-md active:scale-95'}
        ${isLoading ? 'opacity-70 cursor-wait' : ''}
      `}
      aria-label={`選擇${tutor.name}`}
    >
      {/* 進行中標記（已移除剩餘題數顯示） */}

      {/* 助教縮圖 */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center overflow-hidden">
        <img
          src={tutor.avatar}
          alt={tutor.name}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>

      {/* 名稱 */}
      <span className="mt-1 text-xs sm:text-sm font-semibold text-foreground leading-tight text-center">
        {tutor.tag} {tutor.name}
      </span>

      {/* 說明文字：有進行中對話則顯示副標題，否則顯示預設描述 */}
      <span className="mt-0.5 text-[10px] sm:text-xs text-center leading-tight">
        {hasActiveConv
          ? <span className="font-semibold" style={{color: '#3e53bb'}}>進行中，點擊繼續</span>
          : <span className="text-muted-foreground">{tutor.desc}</span>
        }
      </span>

      {/* 載入中指示 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </button>
  );
}