import { useAuth } from "@/_core/hooks/useAuth";
import { useTTS } from "@/hooks/useTTS";
import { SpeakingWave } from "@/components/SpeakingWave";
import { NicknameDialog } from "@/components/NicknameDialog";
import { ExternalSearchButtons } from "@/components/ExternalSearchButtons";
import { TextBannerCarousel } from "@/components/TextBannerCarousel";
import { Button } from "@/components/ui/button";
import { AudioWaveform } from "@/components/AudioWaveform";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { Card } from "@/components/ui/card";
import { TypingAnimation } from "@/components/TypingAnimation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { emitDeductCredits } from "@/components/CoinAnimation";
import {
  Camera,
  ChevronRight,
  Cloud,
  FileText,
  Home,
  Loader2,
  Menu,
  MessageSquare,
  Plus,
  PlusCircle,
  RotateCw,
  Search,
  Send,
  Trash2,
  Upload,
  X,
  Check,
  Edit2,
  Lightbulb,
  Target,
  BookOpen,
  Download,
  Info,
  Copy,
  FileDown,
  Brain,
  Coins,
  BarChart3,
  LogOut,
  Lock,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useLocation, useRoute } from "wouter";
import { MarkdownWithMath } from "@/components/MarkdownWithMath";
import { ChoiceMessageRenderer } from "@/components/ChoiceMessageRenderer";
import { ImageEditModal } from "@/components/ImageEditModal";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { normalizeText, hasGarbledSymbols, getNormalizationStats } from "@/lib/textNormalizer";
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

// 偵測 AI 訊息是否包含選擇題（A/B/C/D 選項）
function detectChoiceQuestion(content: string): boolean {
  // 方案一：明確觸發詞（對話中包含「請於下方選項作答」）
  if (/請於下方選項作答/.test(content)) return true;

  // 方案二：模糊匹配——包含 (A)/(B)/(C)/(D) 四個選項格式（不論 AI 最後說了什麼）
  const hasABCD = /[\(（]A[\)）]/.test(content) &&
                  /[\(（]B[\)）]/.test(content) &&
                  /[\(（]C[\)）]/.test(content) &&
                  /[\(（]D[\)）]/.test(content);
  if (!hasABCD) return false;

  // 排除解析回覆：如果包含「正確答案是」、「答對了」、「答錯了」等就是解析回覆
  const isAnalysis = /正確答案是|答對了|✅|答錯了|❌|關鍵說明：|這個選項是|這項選擇|選項分析|選項說明|選項解析|分析各選項|這選是對的|這選是錯的/.test(content);
  if (isAnalysis) return false;

  return true;
}

// 偵測是否為複選題（訊息中含有「複選」、「多選」、「選出所有」等關鍵字）
function detectMultipleChoice(content: string): boolean {
  return /複選|多選|選出所有|以下.*哪些|下列.*哪些|可以選|可選擇多|選擇所有|choose all|select all/i.test(content);
}

// 偵測 AI 訊息結尾是否有「需要詳細解說嗎？」等詢問句，若有則顯示「詳細解說」按鈕
function detectExpandPrompt(content: string): string | null {
  // 常見的 AI 詢問是否需要展開的句型
  const patterns = [
    { re: /需要我詳細解說嗎[？?]?\s*$/, label: '詳細解說' },
    { re: /需要詳細說明嗎[？?]?\s*$/, label: '詳細說明' },
    { re: /想知道更多嗎[？?]?\s*$/, label: '告訴我更多' },
    { re: /要我繼續說明嗎[？?]?\s*$/, label: '繼續說明' },
    { re: /要我解析嗎[？?]?\s*$/, label: '展開解析' },
    { re: /需要我解析嗎[？?]?\s*$/, label: '展開解析' },
    { re: /需要完整解析嗎[？?]?\s*$/, label: '完整解析' },
    { re: /要完整解析嗎[？?]?\s*$/, label: '完整解析' },
    { re: /要我詳細說明嗎[？?]?\s*$/, label: '詳細說明' },
    { re: /需要我進一步說明嗎[？?]?\s*$/, label: '進一步說明' },
    { re: /有沒有更清楚了[？?]?\s*$/, label: '再說明一次' },
    { re: /有沒有更清楚[？?]?\s*$/, label: '再說明一次' },
  ];
  for (const { re, label } of patterns) {
    if (re.test(content.trim())) return label;
  }
  return null;
}

// 偵測是否為「閒聊/問候/引導性」回答（不含實質知識解說，不顯示引導快捷鍵）
function isSmallTalkReply(content: string): boolean {
  // 字數太短（< 20字）通常是問候或引導
  if (content.replace(/\s/g, '').length < 20) return true;
  // 含有邀請提問的句型，且沒有解釋性內容
  const invitePatterns = /你有什麼.*想問|有什麼.*問題|盡管提出來|隨時可以問|有問題.*告訴我|什麼問題都可以|歡迎提問|請問吧|說說看|告訴我你想/i;
  const hasSubstance = /定義|原因|因為|所以|例如|舉例|根據|法条|條文|規定|理論|概念|分析|解釋|說明|包含|分為|分成|步驟|方法|重點|考點|學習|考試|考驗|法律|法源|法規|法律條文/i;
  if (invitePatterns.test(content) && !hasSubstance.test(content)) return true;
  return false;
}

// 根據 AI 最後回答的內容，動態產生對應的引導快捷鍵
function getContextualQuickActions(content: string): { label: string; msg: string }[] {
  // 情境0：AI 拒絕回答（超出學習範圍）
  const isRejection = /超出我的學習輔助範圍|超出我能回答的學習範圍|這個問題超出|不在我的服務範圍|我是專門幫你備考|我是專門協助學習考試/i.test(content);
  if (isRejection) {
    return [
      { label: '問學科問題', msg: '我想問一個學科相關的問題' },
      { label: '問法律問題', msg: '我想了解一個法律概念' },
      { label: '問考試重點', msg: '幫我整理一個科目的考試重點' },
      { label: '出一題練習', msg: '請出一題考古題讓我練習' },
    ];
  }

  // 情境1：解析選擇題答案（答對/答錯）
  const isAnswerFeedback = /你答對|你答錯|答對了|答錯了|正確答案是|解析給你|解析如下|詳細解析|不對喔|你選了\(|你選擇了/i.test(content);
  if (isAnswerFeedback) {
    return [
      { label: '再出一題 ➡️', msg: '請再出一題這個主題的選擇題考古題' },
      { label: '還有哪些考點？', msg: '關於剛才這個考點，還有哪些常考的延伸題型我需要知道？' },
      { label: '幫我整理考點', msg: '幫我整理剛才這個主題的核心考點和記憶技巧' },
    ];
  }

  // 情境2：比較兩個概念
  const isComparison = /vs|差別|比較|區別|不同之處|差異|對比|相較/i.test(content);
  if (isComparison) {
    return [
      { label: '幫我做個比較表', msg: '關於剛才比較的概念，能幫我做一個簡單的比較表格嗎？' },
      { label: '哪個比較常考？', msg: '剛才比較的這兩個概念，哪個在考試中比較常考？有什麼常見的考法？' },
      { label: '我想練習一題', msg: '請出一題關於剛才比較概念的選擇題考古題讓我練習' },
    ];
  }

  // 情境3：法條/條文
  const isLawArticle = /第[\d一二三四五六七八九十百]+條|法條|民法|刑法|行政法|憲法|法律規定|條文|立法|修法/i.test(content);
  if (isLawArticle) {
    return [
      { label: '這條怎麼記？', msg: '關於剛才的法條，有什麼好記的方法或口訣嗎？' },
      { label: '實務上怎麼用？', msg: '剛才的法條在實務上有哪些常見的應用情境？' },
      { label: '我想練習一題', msg: '請出一題關於剛才法條的選擇題考古題讓我練習' },
      { label: '還有相關法條嗎？', msg: '還有哪些相關的法條或例外規定需要一起記？' },
    ];
  }

  // 情境4：預設（解釋概念/理論）
  return [
    { label: '舉個例子', msg: '關於剛才說的內容，能舉一個具體的例子幫我理解嗎？' },
    { label: '來個測驗', msg: '請出一題關於剛才這個主題的選擇題讓我練習' },
  ];
}

// 收藏解說按鈕元件
function SaveAnswerButton({ messageId, content, conversationId }: { messageId: number; content: string; conversationId: number | null }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const saveMutation = trpc.savedAnswers.save.useMutation({
    onSuccess: (data) => {
      setSaved(true);
      setSavedId(data.id);
      // 讓解說收藏清單快取失效，下次切換 Tab 會重新查詢
      utils.savedAnswers.list.invalidate();
    },
  });
  const unsaveMutation = trpc.savedAnswers.unsave.useMutation({
    onSuccess: () => {
      setSaved(false);
      setSavedId(null);
      utils.savedAnswers.list.invalidate();
    },
  });

  if (!user) return null;

  const handleToggle = () => {
    if (saved && savedId) {
      unsaveMutation.mutate({ id: savedId });
    } else {
      saveMutation.mutate({
        lectureTeacherId: 1, // 預設使用 1，Chat 頁面不綁定特定老師
        question: `[對話 ${conversationId ?? ''}] 訊息 ${messageId}`,
        answer: content,
      });
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={saveMutation.isPending || unsaveMutation.isPending}
      className={`px-3 h-8 rounded-full border text-xs font-medium transition-all ${
        saved
          ? 'bg-yellow-50 text-yellow-600 border-yellow-300 hover:bg-yellow-100'
          : 'bg-muted text-muted-foreground border-border hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-300'
      }`}
    >
      {saved ? '⭐ 已收藏' : '☆ 收藏解說'}
    </button>
  );
}

// 我的筆記面板元件
function SavedNotesPanel() {
  const { user } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // 搜尋防抖
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const savedAnswersQuery = trpc.savedAnswers.list.useQuery({
    search: debouncedSearch || undefined,
    subject: activeSubject || undefined,
  });
  const utils = trpc.useUtils();
  const unsaveMutation = trpc.savedAnswers.unsave.useMutation({
    onSuccess: () => {
      savedAnswersQuery.refetch();
      utils.savedAnswers.list.invalidate();
    },
  });
  const unsaveManyMutation = trpc.savedAnswers.unsaveMany.useMutation({
    onSuccess: () => {
      savedAnswersQuery.refetch();
      utils.savedAnswers.list.invalidate();
      setSelectedIds([]);
      setBatchMode(false);
    },
  });
  const [selectedItem, setSelectedItem] = useState<{ id: number; answer: string; createdAt: string } | null>(null);
  // 查詢是否允許學生匯出 Word
  const exportWordQuery = trpc.featureToggles.getStudentExportWord.useQuery();
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const allIds = savedAnswersQuery.data?.items?.map(i => i.id) ?? [];
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.includes(id));
  const allSubjects = savedAnswersQuery.data?.allSubjects ?? [];

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(allIds);
  };

  return (
    <div className="flex-1 overflow-y-auto min-h-0" style={{WebkitOverflowScrolling: 'touch'}}>
      <div className="p-3">
        {/* 搜尋框 */}
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="搜尋收藏內容..."
            className="w-full pl-7 pr-7 py-1.5 text-xs bg-muted/50 border border-border rounded-md outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 科目標籤篩選 */}
        {allSubjects.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            <button
              onClick={() => setActiveSubject(null)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                activeSubject === null
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              全部
            </button>
            {allSubjects.map(subject => (
              <button
                key={subject}
                onClick={() => setActiveSubject(activeSubject === subject ? null : subject)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  activeSubject === subject
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'
                }`}
              >
                {subject}
              </button>
            ))}
          </div>
        )}

        {/* 頂部工具列 */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">
            {activeSubject || debouncedSearch
              ? `找到 ${savedAnswersQuery.data?.total ?? 0} 則`
              : `已收藏 ${savedAnswersQuery.data?.total ?? 0} 則解說`
            }
          </p>
          {!batchMode ? (
            <button
              onClick={() => setBatchMode(true)}
              className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 transition-colors"
            >
              批量管理
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectAll}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {allSelected ? '取消全選' : '全選'}
              </button>
              <button
                onClick={() => {
                  if (selectedIds.length > 0) unsaveManyMutation.mutate({ ids: selectedIds });
                }}
                disabled={selectedIds.length === 0 || unsaveManyMutation.isPending}
                className="text-xs text-destructive hover:underline disabled:opacity-40 transition-colors"
              >
                刪除({selectedIds.length})
              </button>
              <button
                onClick={() => { setBatchMode(false); setSelectedIds([]); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                取消
              </button>
            </div>
          )}
        </div>

        {savedAnswersQuery.isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : savedAnswersQuery.isError ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-sm text-destructive">載入失敗，請重試</p>
            <button onClick={() => savedAnswersQuery.refetch()} className="text-xs text-primary underline mt-2">重新載入</button>
          </div>
        ) : savedAnswersQuery.data?.items && savedAnswersQuery.data.items.length > 0 ? (
          <div className="space-y-2">
            {savedAnswersQuery.data.items.map((item) => (
              <div
                key={item.id}
                className={`border rounded-lg p-3 bg-card transition-colors ${
                  batchMode
                    ? selectedIds.includes(item.id)
                      ? 'border-primary bg-primary/5 cursor-pointer'
                      : 'border-border cursor-pointer hover:bg-accent/30'
                    : 'border-border cursor-pointer hover:bg-accent/50'
                }`}
                onClick={() => {
                  if (batchMode) {
                    toggleSelect(item.id);
                  } else {
                    setSelectedItem({ id: item.id, answer: item.answer, createdAt: item.createdAt });
                  }
                }}
              >
                <div className="flex items-start gap-2 mb-1">
                  {batchMode && (
                    <div className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center ${
                      selectedIds.includes(item.id) ? 'bg-primary border-primary' : 'border-border'
                    }`}>
                      {selectedIds.includes(item.id) && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                    <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString('zh-TW')}</p>
                    {item.subject && (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{item.subject}</span>
                    )}
                  </div>
                  {!batchMode && (
                    <button
                      onClick={(e) => { e.stopPropagation(); unsaveMutation.mutate({ id: item.id }); }}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                    >
                      移除
                    </button>
                  )}
                </div>
                <p className="text-xs text-foreground line-clamp-3 leading-relaxed">{item.answer.replace(/#{1,6}\s+/g, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/`{1,3}[^`]*`{1,3}/g, '').replace(/^[-*>]\s+/gm, '').replace(/\n+/g, ' ').trim().slice(0, 120)}{item.answer.replace(/#{1,6}\s+/g, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/`{1,3}[^`]*`{1,3}/g, '').replace(/^[-*>]\s+/gm, '').replace(/\n+/g, ' ').trim().length > 120 ? '...' : ''}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-2xl mb-2">📌</p>
            {debouncedSearch || activeSubject ? (
              <>
                <p className="text-sm text-muted-foreground">找不到相關收藏</p>
                <p className="text-xs text-muted-foreground mt-1">試試其他搜尋關鍵字</p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">還沒有收藏的解說</p>
                <p className="text-xs text-muted-foreground mt-1">在對話中點「☆ 收藏這個解說」即可儲存</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* 完整解說 Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => { if (!open) setSelectedItem(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">
              📌 解說收藏
              {selectedItem && <span className="ml-2 text-xs text-muted-foreground font-normal">{new Date(selectedItem.createdAt).toLocaleDateString('zh-TW')}</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {selectedItem && <MarkdownWithMath>{selectedItem.answer}</MarkdownWithMath>}
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <button
              onClick={() => {
                if (selectedItem) {
                  unsaveMutation.mutate({ id: selectedItem.id });
                  setSelectedItem(null);
                }
              }}
              className="text-xs text-destructive hover:underline"
            >
              移除收藏
            </button>
            <div className="flex items-center gap-2">
              {(exportWordQuery.data?.enabled || user?.role === 'admin') && (
                <button
                  onClick={async () => {
                    if (!selectedItem) return;
                    try {
                      const res = await fetch('/api/export-word', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ markdown: selectedItem.answer }),
                        credentials: 'include',
                      });
                      if (!res.ok) throw new Error('匯出失敗');
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `收藏解說_${new Date().toLocaleDateString('zh-TW').replace(/\//g, '-')}.docx`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success('已匯出 Word 檔');
                    } catch (e) {
                      toast.error('匯出失敗，請稍後再試');
                    }
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent transition-colors"
                >
                  <FileDown className="w-3 h-3" />
                  <span>匯出 Word</span>
                </button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [, params] = useRoute("/chat/:id");
  const conversationId = params?.id ? parseInt(params.id) : null;
  // 防止自動創建對話重複觸發的 ref
  const isAutoCreatingRef = useRef(false);

  // 讀取 URL query string 中的 chatStyle 參數（從首頁卡片帶入）
  const urlChatStyle = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const s = searchParams.get('style');
    const valid = ['brother_kind','brother_strict','brother_funny','sister_kind','sister_strict','sister_funny'];
    return (s && valid.includes(s)) ? s as 'brother_kind'|'brother_strict'|'brother_funny'|'sister_kind'|'sister_strict'|'sister_funny' : null;
  }, [location]);

  const [message, setMessage] = useState("");
  // TTS 語音朗讀
  const { speak, stop, isSpeaking, speakingIndex, autoSpeak } = useTTS();
  // AI 模型由後台控制，前端只讀取顯示用（公開讀取，不需要管理員權限）
  const { data: activeModelSetting } = trpc.settings.getActiveModel.useQuery(undefined, { staleTime: 30000 });
  const activeModel = activeModelSetting || 'gemma4';
  const [teachingMode, setTeachingMode] = useState<"direct" | "socratic">("direct");
  // 對話風格：學長/學姊 × 親切/嚴格/幽默 共6種組合
  type ChatStyle = 'brother_kind' | 'brother_strict' | 'brother_funny' | 'sister_kind' | 'sister_strict' | 'sister_funny';
  const [chatStyle, setChatStyle] = useState<ChatStyle>(urlChatStyle ?? 'sister_kind');

  // 頭像圖片 map（全域共用，避免重複定義）
  // 全身/半身圖（空白頁顯示用）
  const avatarMap: Record<string, string> = useMemo(() => ({
    sister_kind:    'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/sister_kind_nobg_dc89bc41.png',
    sister_strict:  'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/new_sister_strict_8db6e4b1.png',
    sister_funny:   'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/new_sister_funny_200f415a.png',
    brother_kind:   'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/new_brother_kind_ce1ec807.png',
    brother_strict: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/new_brother_strict_635ef3e4.png',
    brother_funny:  'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/new_brother_funny_f92b620d.png',
  }), []);
  // 情緒表情圖（對話頭像用）— 六種風格各有完整五種情緒
  type EmotionKey = 'happy' | 'excited' | 'serious' | 'thinking' | 'confused';
  const emotionAvatarMap: Record<string, Record<EmotionKey, string>> = useMemo(() => ({
    sister_kind: {
      happy:    'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_sister_kind_happy-VdmDbUKzeb9y5W7BYTajKs.png',
      excited:  'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_sister_kind_excited-AD3qZBC6ti7tUmJ4AqsfsX.png',
      serious:  'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_sister_kind_serious-7hXA2n6Bm52iQZV8YHaMX6.png',
      thinking: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_sister_kind_thinking-WiwTyBV3QuFq2gfTVYnE3m.png',
      confused: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_sister_kind_confused-7oxVW65pmCtKMaMPeAxBzu.png',
    },
    sister_strict: {
      happy:    'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_sister_strict_happy-abomwVKzKU6rXE67kXPNeh.png',
      excited:  'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_sister_strict_excited-k5KKVQFK9dceDET5FMQAdy.png',
      serious:  'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_sister_strict_serious-bv2FEx5fokRQ2ydjSQWkb5.png',
      thinking: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/sister_strict_thinking_new_84c07dd4.png',
      confused: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/sister_strict_confused_new_a17b7432.png',
    },
    sister_funny: {
      happy:    'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_sister_funny_happy-4xV9CqeMESnuTPVEuQCuqc.png',
      excited:  'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_sister_funny_excited-gnCetDjhyU2tTyfXkqDfWX.png',
      serious:  'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_sister_funny_serious-DUqLexWDBwaBC2uZv2aoDQ.png',
      thinking: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_sister_funny_thinking-Lo96nyVKgdwHPtDp6N2SPj.png',
      confused: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_sister_funny_confused-U3JPwX2eZHjBnTBxS7sUqr.png',
    },
    brother_kind: {
      happy:    'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_brother_kind_happy-EVGs5NoFBNfC33rFefeC9S.png',
      excited:  'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_brother_kind_excited-FT5WX4R9kzE6wc3TzNBQSX.png',
      serious:  'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_brother_kind_serious-Yg8cUC8vUsACTBbA57Bdui.png',
      thinking: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_brother_kind_thinking-cqQRCfZeSviUqFZVzpa8BK.png',
      confused: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_brother_kind_confused-jf2DgqHjyYfbVjKWobXoqD.png',
    },
    brother_strict: {
      happy:    'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_brother_strict_happy-bdnTUKRaHzgh6Zzw4euv38.png',
      excited:  'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_brother_strict_excited-n72cuTeNbvQ8r2sDkN4mHn.png',
      serious:  'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_brother_strict_serious-aWWTw7mFgS7b4XLQEkaJH8.png',
      thinking: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_brother_strict_thinking-W2We39upTEwu4Rr3eqsz7C.png',
      confused: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_brother_strict_confused-5uzooJoq9QrYmTcit5K5Pp.png',
    },
    brother_funny: {
      happy:    'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_brother_funny_happy-NEChacVXwh2FnHVV6RRkab.png',
      excited:  'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_brother_funny_excited-LfM9Nik4faofxHYLG6qerf.png',
      serious:  'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_brother_funny_serious-NsCqxZKKX6FHgpfTKWk5VV.png',
      thinking: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_brother_funny_thinking-jyQPwagm5dnZVkJP53A4YM.png',
      confused: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663151580849/hA3j4EwQxarQLg5a4HQRR2/emotion_brother_funny_confused-hDzt6Tnauqk3TQjdR52mjw.png',
    },
  }), []);
  // 根據 AI 回覆內容判斷情緒 key
  const getEmotionKey = (content: string): EmotionKey => {
    if (!content) return 'happy';
    const text = content;
    if (/注意|錯誤|不對|不正確|重要|必須|千萬|警告|小心|避免/.test(text)) return 'serious';
    if (/很好|太棒|正確|對了|答對|優秀|加油|繼續|不錯|厲害|做到了|完美/.test(text)) return 'excited';
    if (/哈哈|哈！|笑|其實很簡單|說個|好玩|有趣|輕鬆/.test(text)) return 'excited';
    if (/讓我|首先|因為|所以|解釋|說明|分析|理解|概念|原理|步驟/.test(text)) return 'thinking';
    if (/不確定|可能|也許|或許|嗯|這個問題|有點/.test(text)) return 'confused';
    return 'happy';
  };
  // 取得對話頭像圖片（有情緒圖則用情緒圖，否則用全身圖）
  const getEmotionAvatar = (style: string, content: string): string => {
    const emotionKey = getEmotionKey(content);
    if (emotionAvatarMap[style]) {
      return emotionAvatarMap[style][emotionKey];
    }
    return avatarMap[style] || avatarMap['sister_kind'];
  };
  const chatStyleInitialized = useRef(false);
  const [hintLevel, setHintLevel] = useState<"none" | "subtle" | "medium" | "detailed">("none");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFileIds, setUploadedFileIds] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{fileId: number; fileUrl: string; fileName: string; mimeType: string}>>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  // 錄音功能已移除，統一使用 VoiceRecorder 組件
  // 左側欄預設收起，需要時再手動打開
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'history' | 'notes'>('history');
  const [imageRotations, setImageRotations] = useState<Record<string, number>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<number | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<Set<number>>(new Set());
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [editingConversationId, setEditingConversationId] = useState<number | null>(null);
  // 開新對話前的前一對話額度警示彈窗
  // 5 題限制已移除，相關 state 已清除
  const [editingTitle, setEditingTitle] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [streamingMessage, setStreamingMessage] = useState<string>(""); // 串流回應的訊息
  const [isStreaming, setIsStreaming] = useState(false); // 是否正在串流
  const [showNicknameDialog, setShowNicknameDialog] = useState(false); // 是否顯示昵稱對話框
  const [showUploadRulesDialog, setShowUploadRulesDialog] = useState(false); // 上傳規則彈窗
  const [showToolMenu, setShowToolMenu] = useState(false); // + 工具選單
  const [knowledgeSources, setKnowledgeSources] = useState<string[]>([]); // RAG 來源標籤（六法法條/考題/知識庫）
  const [isUserAtBottom, setIsUserAtBottom] = useState(true); // 用戶是否在底部
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]); // 選擇題已選項目
  // 已作答的 AI 訊息 ID（用於鎖住泡泡內的選項按鈕）
  const [answeredMsgIds, setAnsweredMsgIds] = useState<Set<number>>(new Set());
  // 已選的選項（msgId -> optionKey）
  const [msgSelectedOptions, setMsgSelectedOptions] = useState<Record<number, string>>({});
  // 題庫題目來源標籤（顯示在 AI 出題訊息下方）
  const [currentQuestionSource, setCurrentQuestionSource] = useState<string | null>(null);
  // 本次練習答題統計
  const [sessionStats, setSessionStats] = useState({ total: 0, correct: 0 });
  // 偵測 AI 解析訊息（含答對/答錯關鍵字），用於顯示「繼續出題」按鈕
  const isAnswerFeedback = (content: string) =>
    /你答對|你答錯|答對了|答錯了|正確答案是|解析給你|解析如下|詳細解析|非常棒|加油|繼續加油|對了！|不對喔|你選了\(|你選擇了/i.test(content);
  const [multiQuestionDialog, setMultiQuestionDialog] = useState<{
    open: boolean;
    questionCount: number;
    pointsToDeduct: number;
    onConfirm: () => void;
  }>({ open: false, questionCount: 1, pointsToDeduct: 2, onConfirm: () => {} });

  // 圖片編輯彈窗狀態
  const [imageEditModal, setImageEditModal] = useState<{
    open: boolean;
    file: File | null;
    onConfirm: ((editedFile: File) => void) | null;
  }>({ open: false, file: null, onConfirm: null });

  // 辨識確認對話框狀態
  const [recognitionConfirmDialog, setRecognitionConfirmDialog] = useState<{
    open: boolean;
    imageUrl: string;
    extractedText: string;
    originalQuestion: string;
    isLoading: boolean;
    attachments: Array<{fileId: number; fileUrl: string; fileName: string; mimeType: string}>;
    questionCount: number;
  }>({
    open: false,
    imageUrl: "",
    extractedText: "",
    originalQuestion: "",
    isLoading: false,
    attachments: [],
    questionCount: 1,
  });
  const [recognitionEditText, setRecognitionEditText] = useState("");

  // 網路搜尋確認對話框狀態
  const [webSearchConfirmDialog, setWebSearchConfirmDialog] = useState<{
    open: boolean;
    reason: string;
    balance: number;
    isAdmin: boolean;
    pendingParams: Parameters<typeof sendMessageWithStream>[0] | null;
  }>({
    open: false,
    reason: '',
    balance: 0,
    isAdmin: false,
    pendingParams: null,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);  
  
  // 旋轉圖片
  const rotateImage = (imageKey: string) => {
    setImageRotations(prev => ({
      ...prev,
      [imageKey]: ((prev[imageKey] || 0) + 90) % 360
    }));
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 查詢
  const conversationsQuery = trpc.conversation.list.useQuery({ limit: 50 });
  // 批次查詢所有對話的用戶訊息數（供歷史列表顯示剩餘題數）
  const convIds = useMemo(
    () => conversationsQuery.data?.map(c => c.id) ?? [],
    [conversationsQuery.data]
  );
  const batchUserMsgCountsQuery = trpc.conversation.getBatchUserMsgCounts.useQuery(
    { conversationIds: convIds },
    { enabled: convIds.length > 0 }
  );
  const conversationQuery = trpc.conversation.getById.useQuery(
    { id: conversationId! },
    {
      enabled: !!conversationId,
      retry: false,
    }
  );
  // 當對話不存在或無權限時（例如已刪除），自動跳轉到首頁
  useEffect(() => {
    if (conversationQuery.error && conversationId) {
      const msg = conversationQuery.error.message || '';
      if (msg.includes('Unauthorized') || msg.includes('not found') || msg.includes('Not Found')) {
        setLocation('/');
      }
    }
  }, [conversationQuery.error, conversationId]);
  const messagesQuery = trpc.message.list.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId, retry: false }
  );
  const usageStatsQuery = trpc.usage.getTodayStats.useQuery(undefined, {
    refetchInterval: 10000, // 每 10 秒重新獲取
  });
  // 整合導覽列：點數查詢
  const creditsQuery = trpc.credits.getBalance.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30000,
  });
  // 整合導覽列：功能開關
  const featureTogglesQuery = trpc.featureToggles.getAll.useQuery(undefined, {
    staleTime: 0, gcTime: 0, refetchOnMount: 'always',
  });
  const studentPortalEnabled = featureTogglesQuery.data?.toggles?.student_portal === true || user?.role === 'admin';
  // 登出
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = '/'; },
  });
  // 查詢是否允許學生匯出 Word
  const exportWordEnabledQuery = trpc.featureToggles.getStudentExportWord.useQuery();

  // 突變
  const utils = trpc.useUtils();
  const createConversationMutation = trpc.conversation.create.useMutation({
    onSuccess: () => {
      // 顯示扣點 Toast 通知
      toast.success('已開啟新對話', { duration: 3000 });
      // 觸發金幣飛走動畫 + 即時更新點數
      emitDeductCredits(1);
    },
    onError: (error) => {
      if (error.message.includes('Unauthorized') || error.message.includes('Please login') || error.message.includes('UNAUTHORIZED')) {
        toast.error('登入已過期，請重新整理頁面後再試', { duration: 6000 });
      } else {
        toast.error('建立對話失敗：' + error.message, { duration: 5000 });
      }
    },
  });
  const [referencedPdfs, setReferencedPdfs] = useState<Array<{ id: number; title: string; category: string; pageNumber?: number }>>([]);
  
  const sendMessageMutation = trpc.message.send.useMutation({
    onSuccess: async (data) => {
      // 儲存參考講義資訊
      if (data.referencedPdfs && data.referencedPdfs.length > 0) {
        setReferencedPdfs(data.referencedPdfs);
      } else {
        setReferencedPdfs([]);
      }
      // 重新獲取使用統計
      usageStatsQuery.refetch();
    },
    onError: (error) => {
      // 如果是達到限制的錯誤，顯示特殊提示
      if (error.message.includes("已達到今日對話次數上限")) {
        toast.error(error.message, { duration: 5000 });
        // 重新獲取使用統計
        usageStatsQuery.refetch();
      } else {
        toast.error("發送訊息失敗：" + error.message);
      }
      // 錯誤時移除樂觀更新的訊息
      utils.message.list.invalidate({ conversationId: conversationId! });
    },
  });
  const uploadFileMutation = trpc.conversation.uploadFile.useMutation();
  const transcribeMutation = trpc.voice.transcribe.useMutation();
  const analyzeImageMutation = trpc.imageQuality.analyzeImage.useMutation();
  const extractImageTextMutation = trpc.extractImageText.useMutation();
  const deleteConversationMutation = trpc.conversation.delete.useMutation({
    onSuccess: () => {
      utils.conversation.list.invalidate();
      toast.success("對話已刪除");
      // 如果刪除的是當前對話，跳轉到首頁
      if (conversationToDelete === conversationId) {
        setLocation("/");
      }
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    },
    onError: (error) => {
      toast.error("刪除失敗：" + error.message);
    },
  });
  const updateTitleMutation = trpc.conversation.updateTitle.useMutation({
    onSuccess: () => {
      utils.conversation.list.invalidate();
      toast.success("對話標題已更新");
    },
    onError: (error) => {
      toast.error("更新失敗：" + error.message);
    },
  });
  const updateNicknameMutation = trpc.auth.updateNickname.useMutation({
    onSuccess: (data) => {
      utils.auth.me.invalidate(); // 重新獲取用戶資料
      toast.success(`歡迎，${data.nickname}！讓我們一起開始學習之旅。`);
      setShowNicknameDialog(false);
    },
    onError: (error) => {
      toast.error("儲存暱稱失敗：" + error.message);
    },
  });
  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
    },
  });
  // const transcribeMutation = trpc.voice.transcribe.useMutation({
  //   onSuccess: (result: any) => {
  //     setMessage((prev) => prev + (prev ? ' ' : '') + result.text);
  //     toast.success('語音轉文字完成');
  //   },
  //   onError: (error: any) => {
  //     console.error('Transcription error:', error);
  //     toast.error('語音轉文字失敗，請再試一次');
  //   },
  // });

  // 檢查用戶是否有暱稱，如果沒有則顯示對話框
  useEffect(() => {
    if (user && !user.nickname) {
      setShowNicknameDialog(true);
    }
    // 從用戶設定讀取對話風格（URL style 參數優先，其次才是 profile 的 chatStyle）
    if (user && !chatStyleInitialized.current) {
      if (urlChatStyle) {
        // 首頁卡片帶入的風格最優先
        setChatStyle(urlChatStyle);
      } else if ((user as any).chatStyle) {
        // 其次使用 profile 儲存的上次選擇
        setChatStyle((user as any).chatStyle as ChatStyle);
      }
      chatStyleInitialized.current = true;
    }
  }, [user]);

  // 進入 /chat 路由時，不自動建立新對話，改為顯示歷史對話列表
  // 用戶可從歷史列表選擇繼續，或點「開新對話」按鈕

  // 當 conversationId 變化時，同步更新 chatStyle（確保切換歷史對話時頭像跟著更新）
  useEffect(() => {
    if (conversationId && conversationQuery.data) {
      const convStyle = (conversationQuery.data as any).chatStyle;
      if (convStyle) {
        setChatStyle(convStyle as ChatStyle);
      }
    }
  }, [conversationId, conversationQuery.data]);

  // 當 conversationId 變化時，自動聰焦輸入框
  useEffect(() => {
    if (conversationId) {
      // 等待路由更新後自動聰焦輸入框
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [conversationId]);

  // 監聽滾動事件，判斷用戶是否在底部
  useEffect(() => {
    const chatArea = chatAreaRef.current;
    if (!chatArea) return;

    const handleScroll = () => {
      const { scrollHeight, scrollTop, clientHeight } = chatArea;
      // 如果距離底部小於 100px，認為在底部
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsUserAtBottom(isAtBottom);
    };

    chatArea.addEventListener('scroll', handleScroll);
    return () => chatArea.removeEventListener('scroll', handleScroll);
  }, []);

  // 自動滾動到最新訊息（僅當訊息數量改變且用戶在底部時）
  const prevMessageCountRef = useRef<number>(0);
  useEffect(() => {
    const currentMessageCount = messagesQuery.data?.length || 0;
    if (currentMessageCount > prevMessageCountRef.current && isUserAtBottom) {
      // 只有當有新訊息且用戶在底部時才滾動
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100); // 稍微延遲，等待 DOM 更新
    }
    prevMessageCountRef.current = currentMessageCount;
  }, [messagesQuery.data?.length, isUserAtBottom]);

  // 當 AI 開始思考時，自動捲動到底部（顯示載入動畫），但只在用戶在底部時
  useEffect(() => {
    if (sendMessageMutation.isPending && isUserAtBottom) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [sendMessageMutation.isPending, isUserAtBottom]);

  // 檢查 localStorage 中是否有從考試練習頁面傳來的題目
  useEffect(() => {
    const questionPrompt = localStorage.getItem('aiQuestionPrompt');
    if (questionPrompt && user) {
      // 設定輸入框的內容
      setMessage(questionPrompt);
      // 清除 localStorage
      localStorage.removeItem('aiQuestionPrompt');
      
      // 延遲一下自動發送，讓用戶看到內容
      setTimeout(async () => {
        // 如果沒有當前對話，先創建一個
        if (!conversationId) {
          try {
            const newConv = await createConversationMutation.mutateAsync({
              title: "學習建議請求",
            });
            // 跳轉到新對話
            setLocation(`/chat/${newConv.id}`);
            // 等待路由更新後再發送
            setTimeout(() => {
              handleSendMessage(questionPrompt);
            }, 300);
          } catch (error) {
            toast.error("創建對話失敗");
          }
        } else {
          handleSendMessage(questionPrompt);
        }
      }, 500);
    }
  }, [user]);

  // 貼上圖片處理
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf("image") !== -1) {
          const file = item.getAsFile();
          if (file) {
            handleFileUpload([file]);
            toast.success("圖片已貼上");
          }
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [conversationId]);

  // 監聽 Navbar 觸發的側邊欄開啟事件
  useEffect(() => {
    const handleOpenSidebar = () => setSidebarOpen(true);
    window.addEventListener('openChatSidebar', handleOpenSidebar);
    return () => window.removeEventListener('openChatSidebar', handleOpenSidebar);
  }, []);
  // 拖放處理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  // 建立新對話
  // 實際建立新對話的內部函式
  const doCreateNewConversation = async () => {
    try {
      const result = await createConversationMutation.mutateAsync({ chatStyle });
      setLocation(`/chat/${result.conversationId}`);
      conversationsQuery.refetch();
      setSidebarOpen(false);
      setTeachingMode("direct");
      setHintLevel("none");
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    } catch (error) {
      toast.error("建立對話失敗");
    }
  };

  const handleNewConversation = async () => {
    // 直接建立新對話，不再限制問題數
    if (!conversationId) {
      // 未開始對話，直接建立
      await doCreateNewConversation();
      return;
    }

    // 直接用前端已載入的訊息計算當前對話問題數（排除 ABCD 作答）
    const currentUserMsgCount = messagesQuery.data
      ? messagesQuery.data.filter(m => m.role === 'user' && !String(m.content).startsWith('我選 (')).length
      : 0;

    if (currentUserMsgCount === 0) {
      // 當前對話是空的，不允許再開新對話
      toast.error('目前對話還沒問任何問題，請先在這裡發問！', { duration: 3000 });
      return;
    }

    await doCreateNewConversation();
  };

  // 上傳檔案
  const handleFileUpload = async (files: File[]) => {
    // 如果沒有 conversationId，先自動建立對話再上傳（避免競態條件）
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      try {
        const result = await createConversationMutation.mutateAsync({ chatStyle: chatStyle || undefined });
        activeConversationId = result.conversationId;
        setLocation(`/chat/${activeConversationId}`);
        conversationsQuery.refetch();
      } catch (error) {
        toast.error("建立對話失敗，請重試");
        return;
      }
    }

    // 只支援圖片上傳，過濾掉非圖片檔案
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const nonImageFiles = files.filter(f => !f.type.startsWith('image/'));
    
    if (nonImageFiles.length > 0) {
      toast.error("目前只支援圖片上傳，暫不支援文件檔案", { duration: 4000 });
      return;
    }
    
    // 檢查圖片數量限制（最多 1 張）
    const currentImageCount = selectedFiles.filter(f => f.type.startsWith('image/')).length;
    const totalImageCount = currentImageCount + imageFiles.length;
    
    if (currentImageCount >= 1) {
      toast.error("每次只能上傳 1 張圖片，請分次提問💡", { duration: 4000 });
      return;
    }
    if (totalImageCount > 1) {
      toast.error("每次只能上傳 1 張圖片，請分次提問💡", { duration: 4000 });
      return;
    }

    // 圖片上傳時不扣點，扣點在發送訊息時進行（避免上傳後取消造成白扣點）

    // 檢查檔案大小（限制16MB）
    const maxSize = 16 * 1024 * 1024;
    const oversizedFiles = files.filter((f) => f.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast.error(`檔案 ${oversizedFiles[0].name} 超過16MB限制`);
      return;
    }

    // 前端檔案類型和限制檢查
    for (const file of files) {
      const fileName = file.name.toLowerCase();
      const fileType = file.type;
      const fileSize = file.size;

      // 檢查檔案類型（只支援圖片）
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp'
      ];
      
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
      const hasValidType = allowedTypes.includes(fileType);

      if (!hasValidExtension && !hasValidType) {
        toast.error(
          `不支援的檔案類型：${file.name}\n\n` +
          `目前只支援圖片格式：JPG, PNG, GIF, WebP\n\n` +
          `💡 提示：請截圖或拍照上傳您的問題`,
          { duration: 6000 }
        );
        return;
      }

      // 圖片檔案不需要額外檢查
    }

    // 圖片上傳：先開啟裁切彈窗，用戶確認後再上傳
    const imageFile = files[0]; // 每次只處理一張圖片
    setImageEditModal({
      open: true,
      file: imageFile,
      onConfirm: async (editedFile: File) => {
        setImageEditModal({ open: false, file: null, onConfirm: null });
        setIsUploadingFiles(true);
        // 裁切確認後直接上傳並進入辨識流程，不加入輸入框
        try {
          await new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
              try {
                const base64Data = e.target?.result as string;
                const base64 = base64Data.split(",")[1];
                const result = await uploadFileMutation.mutateAsync({
                  conversationId: activeConversationId!,
                  fileData: base64,
                  fileName: editedFile.name,
                  mimeType: editedFile.type,
                });
                const uploadedFile = {
                  fileId: Number(result.fileId),
                  fileUrl: result.fileUrl,
                  fileName: editedFile.name,
                  mimeType: editedFile.type,
                };
                // 直接觸發辨識確認對話框，不加入 uploadedFiles
                setRecognitionConfirmDialog({
                  open: true,
                  imageUrl: result.fileUrl,
                  extractedText: "",
                  originalQuestion: message,
                  isLoading: true,
                  attachments: [uploadedFile],
                  questionCount: 1,
                });
                setRecognitionEditText("");
                // 開始辨識
                extractImageTextMutation.mutateAsync({ imageUrl: result.fileUrl })
                  .then((textResult) => {
                    const extractedText = textResult.extractedText || "（無法辨識圖片內容，請手動輸入題目）";
                    setRecognitionConfirmDialog(prev => ({ ...prev, extractedText, isLoading: false }));
                    setRecognitionEditText(extractedText);
                  })
                  .catch(() => {
                    setRecognitionConfirmDialog(prev => ({ ...prev, extractedText: "（辨識失敗，請手動輸入題目）", isLoading: false }));
                    setRecognitionEditText("");
                  });
                resolve();
              } catch (error) {
                toast.error(`圖片上傳失敗`);
                reject(error);
              }
            };
            reader.onerror = () => {
              toast.error(`圖片讀取失敗`);
              reject(new Error('File read error'));
            };
            reader.readAsDataURL(editedFile);
          });
        } catch (error) {
          console.error('檔案上傳錯誤:', error);
        } finally {
          setIsUploadingFiles(false);
        }
      },
    });
  };

  // 相機拍照
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(Array.from(files));
    }
  };

  // 匯出 HTML
  const exportHtmlMutation = trpc.conversation.exportToHtml.useMutation({
    onSuccess: (data) => {
      // 下載 HTML
      window.open(data.htmlUrl, "_blank");
      toast.success("對話已匯出為 HTML，可以在瀏覽器中查看或列印為 PDF");
    },
    onError: (error) => {
      toast.error(`匯出失敗: ${error.message}`);
    },
  });

  const handleExportPdf = (convId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 防止觸發對話切換
    toast.info("正在生成 HTML，請稍候...");
    exportHtmlMutation.mutate({ conversationId: convId });
  };

  // 刪除對話
  const handleDeleteClick = (convId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 防止觸發對話切換
    setConversationToDelete(convId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (conversationToDelete) {
      deleteConversationMutation.mutate({ id: conversationToDelete });
    }
  };

  // 批量刪除
  const toggleBatchMode = () => {
    setBatchMode(!batchMode);
    setSelectedConversations(new Set());
  };

  const toggleConversationSelection = (convId: number) => {
    const newSelected = new Set(selectedConversations);
    if (newSelected.has(convId)) {
      newSelected.delete(convId);
    } else {
      newSelected.add(convId);
    }
    setSelectedConversations(newSelected);
  };

  const selectAllConversations = () => {
    if (filteredConversations) {
      const allIds = new Set(filteredConversations.map(c => c.id));
      setSelectedConversations(allIds);
    }
  };

  const handleBatchDelete = () => {
    if (selectedConversations.size > 0) {
      setBatchDeleteDialogOpen(true);
    }
  };

  const handleConfirmBatchDelete = async () => {
    const idsToDelete = Array.from(selectedConversations);
    for (const id of idsToDelete) {
      await deleteConversationMutation.mutateAsync({ id });
    }
    setBatchDeleteDialogOpen(false);
    setBatchMode(false);
    setSelectedConversations(new Set());
    toast.success(`已刪除 ${idsToDelete.length} 個對話`);
  };

  // 重命名對話
  const handleEditClick = (convId: number, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConversationId(convId);
    setEditingTitle(currentTitle);
  };

  const handleSaveTitle = async (convId: number) => {
    if (editingTitle.trim()) {
      await updateTitleMutation.mutateAsync({ id: convId, title: editingTitle.trim() });
      setEditingConversationId(null);
      setEditingTitle("");
    }
  };

  const handleCancelEdit = () => {
    setEditingConversationId(null);
    setEditingTitle("");
  };

  // 錄音功能已移除，統一使用 VoiceRecorder 組件

  // 語音轉文字
  const handleAudioTranscription = async (audioBlob: Blob) => {
    try {
      toast.info('正在轉換語音為文字...');
      
      // 將 audio blob 轉換為 base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        const base64 = base64Data.split(',')[1];

        // 使用 tRPC mutation 進行語音識別
        const result = await transcribeMutation.mutateAsync({
          audioBase64: base64,
          filename: `recording-${Date.now()}.webm`,
        });
        
        if (result.success) {
          // 將識別的文字填入輸入框
          setMessage(result.text);
          toast.success('語音轉文字完成');
        } else {
          toast.error('語音識別失敗');
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Error handling audio:', error);
      toast.error('處理語音檔案失敗');
    }
  };

  // 發送訊息（串流模式）
  const sendMessageWithStream = async (params: {
    conversationId: number;
    content: string;
    aiModel: string;
    teachingMode: string;
    chatStyle?: string;
    hintLevel?: string;
    attachments?: Array<{ fileId: number; fileName: string; fileUrl: string; mimeType: string }>;
    imageQuestionCount?: number;
    forceWebSearch?: boolean;
    extraPointCost?: number;
    extraPointReason?: string;
  }) => {
    // isStreaming 已在 handleSendMessage 中設置，此處不需要重複設置

    try {
      const response = await fetch("/api/stream/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No reader available");
      }

      let accumulatedMessage = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
              if (data === "[DONE]") {
              // 清空選擇題已選項目（新訊息到來後重置）
              setSelectedChoices([]);
              // 立即關閉串流狀態，讓快捷按鈕立刻顯示
              // streamingMessage 暂不清空，避免畫面閃綹
              setIsStreaming(false);
              // 清空知識庫來源
              setKnowledgeSources([]);
              // AI 回覆完成後自動朗讀（若開啟）
              if (autoSpeak && accumulatedMessage) {
                setTimeout(() => {
                  const plainText = accumulatedMessage
                    .replace(/```[\s\S]*?```/g, '')
                    .replace(/#{1,6}\s+/g, '')
                    .replace(/\*\*(.+?)\*\*/g, '$1')
                    .replace(/\*(.+?)\*/g, '$1')
                    .replace(/\n/g, ' ')
                    .trim()
                    .slice(0, 300);
                  if (plainText) speak(plainText);
                }, 300);
              }
              // 背景執行 refetch，完成後再清空 streamingMessage
              messagesQuery.refetch().then(() => {
                setStreamingMessage("");
              });
              conversationsQuery.refetch();
              usageStatsQuery.refetch();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulatedMessage += parsed.content;
                setStreamingMessage(accumulatedMessage);
                // 自動滾動到底部（只在用戶在底部時，用 scrollTop 避免 smooth 動畫衝突）
                if (isUserAtBottom) {
                  requestAnimationFrame(() => {
                    const chatArea = chatAreaRef.current;
                    if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
                  });
                }
              }
              if (parsed.off_topic === true) {
                // 非課業相關：後端已將引導訊息儲存到資料庫
                // 等待 [DONE] 訊號後 refetch 就能顯示，不需要手動設置 streamingMessage
                // 不提前 return，讓流程繼續到 [DONE]
              }
              if (parsed.need_web_search === true) {
                // 無論管理員或學員，一律婉拒回答，不彈確認框也不扣點
                const refuseMsg = parsed.reason
                  ? `抗歉！這個問題需要搜尋網路才能回答（${parsed.reason}）。目前系統不支援即時網路搜尋，建議您自行搜尋相關資料，或提問其他學科問題！`
                  : `抗歉！這個問題需要搜尋網路才能回答，目前系統不支援即時網路搜尋。建議您自行搜尋相關資料，或提問其他學科問題！`;
                setStreamingMessage(refuseMsg);
                setIsStreaming(false);
                await messagesQuery.refetch();
                setStreamingMessage("");
                return;
              }
              if (parsed.referencedPdfs) {
                setReferencedPdfs(parsed.referencedPdfs);
              }
              if (parsed.sources) {
                setKnowledgeSources(parsed.sources);
              }
              // 題庫題目來源標籤
              if (parsed.questionSource) {
                setCurrentQuestionSource(parsed.questionSource);
              }
              // 答題統計：收到 isCorrect 時更新統計
              if (parsed.isCorrect !== undefined) {
                setSessionStats(prev => ({
                  total: prev.total + 1,
                  correct: prev.correct + (parsed.isCorrect ? 1 : 0),
                }));
              }
              if (parsed.credits_deducted !== undefined) {
                // 扣點通知：即時 refetch 點數顯示，並彈出 Toast
                creditsQuery.refetch();
                const deductedAmt = parsed.credits_deducted;
                const newBal = parsed.new_balance;
                const reason = (parsed.deduct_reason || '圖片問答').replace('服務', '');
                toast.success(`💳 已扣除 ${deductedAmt} 點（${reason || '圖片問答'}），剩餘 ${newBal} 點`, { duration: 3000 });
              }
              if (parsed.error) {
                // 錯誤時：保留樂觀更新的用戶訊息，不要 refetch（避免用戶訊息消失）
                // 直接在 streamingMessage 顯示錯誤內容，讓用戶看到回覆
                const errorMsg = parsed.error;
                setStreamingMessage(errorMsg);
                // 等待一秒後再 refetch，此時後端應已儲存錯誤訊息
                setTimeout(async () => {
                  await messagesQuery.refetch();
                  setIsStreaming(false);
                  setStreamingMessage("");
                }, 1500);
                return;
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Stream error:", error);
      toast.error("串流回應失敗，請重試");
      setIsStreaming(false);
      setStreamingMessage("");
    }
  };

  // 發送訊息
  const handleSendMessage = async (customMessage?: string) => {
    // 防重複：串流進行中不允許再次發送
    if (isStreaming) {
      return;
    }
    // 學生送出訊息時立即中斷朗讀
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      stop();
    }
    // 如果有自訂訊息，直接使用；否則使用輸入框的內容
    const messageToSend = customMessage !== undefined ? customMessage : message;
    
    // 驗證：至少要有文字或圖片
    if (!messageToSend.trim() && selectedFiles.length === 0) {
      toast.error("請輸入訊息或上傳圖片");
      return;
    }
    
    // 字數限制：超過 1000 字元時阻止送出
    const MAX_CHARS = 1000;
    if (messageToSend.trim().length > MAX_CHARS) {
      toast.error(`訊息過長（${messageToSend.trim().length} 字元），請縮短至 ${MAX_CHARS} 字元以內再送出`, {
        duration: 5000,
      });
      return;
    }
    // 如果沒有 conversationId，先自動建立對話再發送（避免競態條件）
    if (!conversationId) {
      try {
        const result = await createConversationMutation.mutateAsync({ chatStyle: chatStyle || undefined });
        const newConvId = result.conversationId;
        setLocation(`/chat/${newConvId}`);
        conversationsQuery.refetch();
        // 直接用新的 conversationId 發送，不用等待路由更新（避免競態條件造成重複建立對話）
        doSendMessage(messageToSend.trim() || (selectedFiles.length > 0 ? "請幫我看看這張圖片" : ""), uploadedFiles, undefined, undefined, undefined, newConvId);
      } catch (error) {
        toast.error("建立對話失敗，請重試");
      }
      return;
    }

    // 如果只有圖片沒有文字，使用預設文字
    let content = messageToSend.trim() || (selectedFiles.length > 0 ? "請幫我看看這張圖片" : "");
    
    // 檢查是否包含亂碼符號，如果有則自動轉換
    if (hasGarbledSymbols(content)) {
      const stats = getNormalizationStats(content);
      content = normalizeText(content);
      toast.success(`已自動轉換 ${stats.replacementCount} 個亂碼選項標記`);
    }
    const attachments = uploadedFiles;

    // 圖片辨識確認流程：如果有圖片，先辨識圖片文字再讓同學確認（限制一張圖片）
    const imageAttachments = attachments.filter(a => a.mimeType?.startsWith('image/'));
    if (imageAttachments.length > 0) {
      // 限制只使用第一張圖片
      const firstImage = imageAttachments[0];
      const firstImageUrl = firstImage.fileUrl;
      // 非圖片附件保留，圖片只保留第一張
      const nonImageAttachments = attachments.filter(a => !a.mimeType?.startsWith('image/'));
      const limitedAttachments = [firstImage, ...nonImageAttachments];
      
      // 開啟辨識確認對話框，先顯示載入中
      setRecognitionConfirmDialog({
        open: true,
        imageUrl: firstImageUrl,
        extractedText: "",
        originalQuestion: content,
        isLoading: true,
        attachments: limitedAttachments,
        questionCount: 1,
      });
      setRecognitionEditText("");

      // 辨識圖片文字
      try {
        const textResult = await extractImageTextMutation.mutateAsync({ imageUrl: firstImageUrl });
        const extractedText = textResult.extractedText || "（無法辨識圖片內容，請手動輸入題目）";
        setRecognitionConfirmDialog(prev => ({ ...prev, extractedText, isLoading: false }));
        setRecognitionEditText(extractedText);
      } catch {
        setRecognitionConfirmDialog(prev => ({ ...prev, extractedText: "（辨識失敗，請手動輸入題目）", isLoading: false }));
        setRecognitionEditText("");
      }
      return; // 等待用戶從對話框確認後再送出
    }

    doSendMessage(content, attachments);
  };

  // 實際發送訊息的內部函數
  const doSendMessage = async (content: string, attachments: Array<{fileId: number; fileUrl: string; fileName: string; mimeType: string}>, imageQuestionCount?: number, extraPointCost?: number, extraPointReason?: string, overrideConversationId?: number) => {
    const activeConvId = overrideConversationId ?? conversationId;
    // 樂觀更新：立即顯示用戶訊息
    const optimisticUserMessage = {
      id: Date.now(), // 臨時 ID
      conversationId: activeConvId,
      role: 'user' as const,
      content,
      createdAt: new Date(),
      attachments: attachments.map(a => ({
        id: a.fileId,
        messageId: Date.now(),
        fileUrl: a.fileUrl,
        fileName: a.fileName,
        mimeType: a.mimeType,
        createdAt: new Date(),
      })),
    };

    // 立即更新本地訊息列表
    utils.message.list.setData(
      { conversationId: activeConvId },
      (old) => old ? [...old, optimisticUserMessage] : [optimisticUserMessage]
    );

    // 提前設置 isStreaming 為 true，確保載入動畫立即顯示
    setIsStreaming(true);
    setStreamingMessage("");

    // 清空輸入框和附件
    setMessage("");
    setSelectedFiles([]);
    setUploadedFileIds([]);
    setUploadedFiles([]);

    try {
      // 使用串流模式發送訊息
      await sendMessageWithStream({
        conversationId: activeConvId,
        content,
        aiModel: activeModel,
        teachingMode,
        chatStyle,
        hintLevel: hintLevel !== "none" ? hintLevel : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        imageQuestionCount: imageQuestionCount,
        extraPointCost: extraPointCost,
        extraPointReason: extraPointReason,
      });

      // 重置提示級別
      setHintLevel("none");
    } catch (error) {
      toast.error("發送訊息失敗");
      // 錯誤時重新獲取訊息列表
      messagesQuery.refetch();
    }
  };

  // 搜尋對話
  const filteredConversations = conversationsQuery.data?.filter((conv) =>
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 登入檢查：未登入時跳轉到登入頁面
  useEffect(() => {
    if (!user) {
      // 跳轉到 Manus OAuth 登入頁面
      window.location.href = getLoginUrl();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">正在跳轉到登入頁面...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-background" style={{height: '100dvh'}}>
      {/* 遮罩層（全平台） */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* 側邊欄（全平台可收合） */}
      <div className={`w-80 border-r border-border flex flex-col bg-background fixed top-0 bottom-0 left-0 z-50 transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* 側邊欄標題 */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">iBrain智能助教</h2>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
                <Home className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {/* Tab 切換：歷史對話 / 我的筆記 */}
          <div className="flex gap-1 mt-3 bg-muted rounded-lg p-1">
            <button
              onClick={() => setSidebarTab('history')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-sm font-medium transition-all ${
                sidebarTab === 'history'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              歷史對話
            </button>
            <button
              onClick={() => setSidebarTab('notes')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-sm font-medium transition-all ${
                sidebarTab === 'notes'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              📌 解說收藏
            </button>
          </div>
        </div>

        {/* 歷史對話 Tab 內容 */}
        {sidebarTab === 'history' && (<>
        {/* 搜尋框 */}
        <div className="p-4 border-b border-border">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜尋對話..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {/* 批量操作按鈕 */}
          <div className="flex gap-2">
            <Button
              variant={batchMode ? "secondary" : "outline"}
              size="sm"
              onClick={toggleBatchMode}
              className="flex-1"
            >
              {batchMode ? "取消選擇" : "批量管理"}
            </Button>
            {batchMode && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllConversations}
                  disabled={!filteredConversations || filteredConversations.length === 0}
                >
                  全選
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBatchDelete}
                  disabled={selectedConversations.size === 0}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  刪除 ({selectedConversations.size})
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 對話列表 */}
        <div className="flex-1 overflow-y-auto min-h-0" style={{WebkitOverflowScrolling: 'touch'}}>
          {conversationsQuery.isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredConversations && filteredConversations.length > 0 ? (
            <div className="p-2">
              {filteredConversations.map((conv) => (
                <div key={conv.id} className="relative group flex items-start gap-2 mb-1">
                  {/* 批量選擇 checkbox */}
                  {batchMode && (
                    <div className="pt-3">
                      <Checkbox
                        checked={selectedConversations.has(conv.id)}
                        onCheckedChange={() => toggleConversationSelection(conv.id)}
                      />
                    </div>
                  )}
                  
                  {/* 對話內容 */}
                  <div className="flex-1 relative">
                    <Button
                      variant={conversationId === conv.id ? "secondary" : "ghost"}
                      className="w-full justify-start h-auto py-3 pr-20 min-h-[3rem]"
                      onClick={() => !batchMode && setLocation(`/chat/${conv.id}`)}
                      disabled={batchMode}
                    >
                      {/* 助教頭像 */}
                      {(() => {
                        const sidebarStyle = (conv as any).chatStyle || 'brother_kind';
                        const sidebarStyleNames: Record<string, string> = {
                          brother_kind: '親切學長', brother_strict: '嚴格學長', brother_funny: '幽默學長',
                          sister_kind: '親切學姊', sister_strict: '嚴格學姊', sister_funny: '幽默學姊',
                        };
                        return (
                          <img
                            src={avatarMap[sidebarStyle] || avatarMap['brother_kind']}
                            alt={sidebarStyleNames[sidebarStyle] || '學長'}
                            className="w-7 h-7 rounded-full object-cover object-top flex-shrink-0 mr-2 mt-0.5 bg-white border border-border/50"
                          />
                        );
                      })()}
                      <div className="flex-1 text-left min-w-0">
                        {editingConversationId === conv.id ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              className="h-7 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveTitle(conv.id);
                                } else if (e.key === "Escape") {
                                  handleCancelEdit();
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <>
                            {(() => {
                              const sidebarStyle2 = (conv as any).chatStyle || 'brother_kind';
                              const sidebarStyleNames2: Record<string, string> = {
                                brother_kind: '親切學長', brother_strict: '嚴格學長', brother_funny: '幽默學長',
                                sister_kind: '親切學姊', sister_strict: '嚴格學姊', sister_funny: '幽默學姊',
                              };
                              return <span className="text-xs text-primary font-medium block leading-tight">{sidebarStyleNames2[sidebarStyle2] || '學長'}</span>;
                            })()}
                            <p className="text-sm font-medium whitespace-normal break-words">{conv.title || "未命名對話"}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-muted-foreground" title={`建立：${new Date((conv.createdAt || '').endsWith('Z') ? conv.createdAt : conv.createdAt + 'Z').toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}`}>
                                {new Date((conv.lastMessageAt || '').endsWith('Z') ? conv.lastMessageAt : conv.lastMessageAt + 'Z').toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
                              </p>
                              {(() => {
                                const msgCount = batchUserMsgCountsQuery.data?.[conv.id] ?? 0;
                                const remaining = Math.max(0, 5 - msgCount);
                                if (remaining === 0) return (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium flex-shrink-0">已用完</span>
                                );
                                return (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                    remaining <= 1 ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-500'
                                  }`}>剩 {remaining} 題</span>
                                );
                              })()}
                            </div>
                          </>
                        )}
                      </div>
                    </Button>
                    
                    {/* 操作按鈕 */}
                    {!batchMode && (
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                        {editingConversationId === conv.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-green-500/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveTitle(conv.id);
                              }}
                              title="保存"
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-muted"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelEdit();
                              }}
                              title="取消"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-blue-500/10"
                              onClick={(e) => handleEditClick(conv.id, conv.title || "新對話", e)}
                              title="重命名"
                            >
                              <Edit2 className="w-4 h-4 text-blue-600" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-destructive/10"
                              onClick={(e) => handleDeleteClick(conv.id, e)}
                              title="刪除對話"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">還沒有對話記錄</p>
            </div>
          )}
        </div>
        </>)}
        {/* 我的筆記 Tab 內容 */}
        {sidebarTab === 'notes' && (
          <SavedNotesPanel />
        )}

      </div>
      {/* 對話區域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 文字輪播 Banner - 暫時隱藏 */}
        {/* <div className="flex-shrink-0 z-30 bg-background border-b border-border">
          <TextBannerCarousel />
        </div> */}
        
        {conversationId ? (
          <>
            {/* 整合導覽列：漢堡 + 對話標題 + 助教選擇 + 導覽 + Logo + 點數 + 用戶選單 */}
            <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur">
            <div className="max-w-4xl mx-auto px-3 py-2 flex items-center gap-2">
              {/* 漢堡選單 */}
              <Button 
                variant="ghost" 
                size="icon"
                className="flex-shrink-0 h-8 w-8"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-4 h-4" />
              </Button>
              {/* 對話標題 */}
              <div className="min-w-0" style={{maxWidth: '160px'}}>
                <h1 className="text-sm font-semibold truncate">{conversationQuery.data?.title || "歷史對話"}</h1>
              </div>
              {/* 助教選擇（精簡版） */}
              {(() => {
                const hasMessages = (messagesQuery.data?.length || 0) > 0;
                return (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <select
                      value={chatStyle}
                      disabled={hasMessages}
                      onChange={(e) => {
                        const val = e.target.value as ChatStyle;
                        setChatStyle(val);
                        updateProfileMutation.mutate({ chatStyle: val });
                      }}
                      title={hasMessages ? '對話進行中無法切換助教，請開新對話來切換' : '選擇 AI 助教風格'}
                      className={cn(
                        'text-xs border border-border rounded-md px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-7',
                        hasMessages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      )}
                    >
                      <option value="sister_kind">👩‍🎓 親切學姊</option>
                      <option value="sister_strict">👩‍🎓 嚴格學姊</option>
                      <option value="sister_funny">👩‍🎓 幽默學姊</option>
                      <option value="brother_kind">🎓 親切學長</option>
                      <option value="brother_strict">🎓 嚴格學長</option>
                      <option value="brother_funny">🎓 幽默學長</option>
                    </select>
                    {hasMessages && (
                      <button
                        title="已鎖定助教，開新對話可解鎖"
                        className="text-amber-500 hover:text-amber-600 flex-shrink-0"
                        onClick={handleNewConversation}
                        disabled={createConversationMutation.isPending}
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={handleNewConversation}
                      disabled={createConversationMutation.isPending}
                      title="開新對話"
                      className="h-7 text-xs text-primary border border-primary rounded-md px-2 hover:bg-primary hover:text-primary-foreground whitespace-nowrap disabled:opacity-50 flex items-center gap-1"
                    >
                      {createConversationMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      <span className="hidden sm:inline">新對話</span>
                    </button>
                  </div>
                );
              })()}
              {/* 彈性空間 */}
              <div className="flex-1" />
              {/* 分隔線 */}
              <div className="w-px h-4 bg-border flex-shrink-0" />
              {/* 右側：導覽 + Logo + 點數 + 匯出 + 用戶選單 */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Logo （首頁左邊） */}
                <button
                  onClick={() => setLocation('/')}
                  className="flex items-center gap-1.5 font-bold text-sm hover:opacity-80 transition-opacity flex-shrink-0 mr-1"
                >
                  <Brain className="w-4 h-4 text-primary" />
                  <span className="hidden sm:inline">iBrain 智匯</span>
                </button>
                {/* 首頁 */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 gap-1"
                  onClick={() => setLocation('/')}
                  title="首頁"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span className="hidden md:inline text-xs">首頁</span>
                </Button>
                {/* 智能專區 */}
                {studentPortalEnabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 gap-1"
                    onClick={() => setLocation('/student')}
                    title="智能專區"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span className="hidden md:inline text-xs">智能專區</span>
                  </Button>
                )}
                {/* 點數 */}
                {user && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full text-xs font-semibold hover:bg-primary/20 transition-colors cursor-pointer">
                        <Coins className="w-3 h-3 text-primary" />
                        <span>{creditsQuery.data?.balance ?? 0}</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel className="text-xs font-semibold">點數明細</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">永久點數</span>
                          <span className="font-semibold">{creditsQuery.data?.permanentCredits ?? 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">每日點數</span>
                          <span className="font-semibold">{creditsQuery.data?.dailyCredits ?? 0}</span>
                        </div>
                        <DropdownMenuSeparator />
                        <div className="flex justify-between">
                          <span className="font-semibold">總點數</span>
                          <span className="font-bold text-primary">{creditsQuery.data?.balance ?? 0}</span>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setLocation('/credits-history')} className="text-xs cursor-pointer">
                        📊 查看點數歷史
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {/* 用戶選單 */}
                {user && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>
                        <div className="flex flex-col">
                          <span>{user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {user.role === 'admin' ? '管理員' : '學生'}
                          </span>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {user.role === 'admin' && (
                        <DropdownMenuItem onClick={() => setLocation('/admin')}>
                          管理後台
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => logoutMutation.mutate()}
                        className="text-destructive"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        登出
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            </div>

            {/* 訊息列表 */}
            <div
              ref={chatAreaRef}
              className={`flex-1 overflow-y-auto overflow-x-hidden relative ${isDragging ? "bg-primary/5" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary z-10">
                  <div className="text-center">
                    <Upload className="w-16 h-16 mx-auto mb-4 text-primary" />
                    <p className="text-lg font-semibold">拖放檔案到這裡</p>
                    <p className="text-sm text-muted-foreground">支援圖片、PDF、Word、TXT</p>
                  </div>
                </div>
              )}

              <div className="h-full p-4">
                {messagesQuery.isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : messagesQuery.data && messagesQuery.data.length > 0 ? (
                  <div className="space-y-4 max-w-4xl mx-auto">
                    {messagesQuery.data.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {/* AI 左側小頭像 */}
                        {msg.role === "assistant" && (
                          <div className="flex-shrink-0 flex flex-col items-center gap-0.5 mb-1">
                            <div className="relative">
                              <img
                                 src={getEmotionAvatar(chatStyle, msg.content)}
                                 alt="AI"
                                 className="w-14 h-14 rounded-full object-cover object-top border-2 border-primary/20 shadow-sm bg-white"
                               />
                            </div>
                          </div>
                        )}
                        <div className="flex flex-col gap-1 max-w-[82%] min-w-0">
                          {/* 用戶昵稱標簽 */}
                          {msg.role === "user" && (
                            <div className="flex justify-end">
                              <span className="text-xs text-muted-foreground px-2">
                                {user?.name || "學習者"}
                              </span>
                            </div>
                          )}
                          <Card
                            className={`overflow-hidden ${
                              msg.role === "user"
                                ? "text-white"
                                : "text-black"
                            }`} style={{
                              padding: '16px 20px 20px 20px',
                              borderRadius: '19px',
                              backgroundColor: msg.role === "user" ? '#5a7daa' : '#e8e9eb',
                            }}
                          >
                            <div className="flex items-start gap-2 mb-2">
                              {msg.role === "assistant" && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Cloud className="w-3 h-3" />
                                  <span>{chatStyle.startsWith('brother') ? '學長' : '學姊'}</span>
                                  {isSpeaking && speakingIndex === messagesQuery.data?.findIndex(m => m.id === msg.id) && (
                                    <SpeakingWave className="ml-1" />
                                  )}
                                </div>
                              )}
                            </div>
                          {/* 附件預覽（圖片） */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {msg.attachments.map((att, idx) => {
                                const isImage = att.mimeType?.startsWith('image/');
                                const imageKey = `${msg.id}-${idx}`;
                                const rotation = imageRotations[imageKey] || 0;
                                return isImage && att.fileUrl ? (
                                  <div key={idx} className="relative group">
                                    <div className="relative inline-block">
                                      <img 
                                        src={att.fileUrl} 
                                        alt={att.fileName}
                                        className="max-w-full max-h-64 rounded-lg border border-border cursor-pointer hover:opacity-90 transition-all"
                                        style={{ transform: `rotate(${rotation}deg)` }}
                                        onClick={() => window.open(att.fileUrl, '_blank')}
                                      />
                                      <Button
                                        size="icon"
                                        variant="secondary"
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          rotateImage(imageKey);
                                        }}
                                      >
                                        <RotateCw className="w-4 h-4" />
                                      </Button>
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                      <FileText className="w-3 h-3" />
                                      <span style={{color: msg.role === 'user' ? '#d6d6d6' : '#555555'}}>{att.fileName}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div key={idx} className="flex items-center gap-2 text-xs">
                                    <FileText className="w-3 h-3" />
                                    <span>{att.fileName}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {msg.role === "assistant" ? (
                            <ChoiceMessageRenderer
                              content={msg.content}
                              isUserMessage={false}
                              hasAnswered={answeredMsgIds.has(msg.id)}
                              selectedOption={msgSelectedOptions[msg.id] ?? null}
                              onSelectOption={(optionKey, _fullText) => {
                                // 鎖住這則訊息的選項
                                setAnsweredMsgIds(prev => new Set([...prev, msg.id]));
                                setMsgSelectedOptions(prev => ({ ...prev, [msg.id]: optionKey }));
                                // 送出作答
                                setSelectedChoices([]);
                                handleSendMessage(`我選 (${optionKey})`);
                              }}
                            />
                          ) : (
                            <MarkdownWithMath isUserMessage={true}>{msg.content}</MarkdownWithMath>
                          )}
                          
                          {/* 參考講義（僅管理員可見） */}
                          {msg.role === "assistant" && 
                           messagesQuery.data && 
                           msg.id === messagesQuery.data[messagesQuery.data.length - 1]?.id && 
                           referencedPdfs.length > 0 && 
                           user?.role === "admin" && (
                            <div className="mt-4 pt-4 border-t border-border">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-muted-foreground">參考講義</span>
                              </div>
                              <div className="space-y-2">
                                {referencedPdfs.map((pdf) => (
                                   <div
                                    key={`${pdf.id}-${pdf.pageNumber || 0}`}
                                    onClick={() => setLocation(`/pdf/${pdf.id}${pdf.pageNumber ? `?page=${pdf.pageNumber}` : ''}`)}
                                    className="block p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors cursor-pointer"
                                  >
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-primary" />
                                      <span className="text-sm font-medium">{pdf.title}</span>
                                      {pdf.pageNumber && (
                                        <span className="text-xs font-semibold text-primary">第 {pdf.pageNumber} 頁</span>
                                      )}
                                      <span className="text-xs text-muted-foreground">({pdf.category})</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          </Card>
                          {/* 匯出 Word / 收藏：每則 AI 訊息都顯示 */}
                          {msg.role === "assistant" && !isStreaming && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {(exportWordEnabledQuery.data?.enabled || user?.role === 'admin') && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const res = await fetch('/api/export-word', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ markdown: msg.content }),
                                        credentials: 'include',
                                      });
                                      if (!res.ok) throw new Error('匯出失敗');
                                      const blob = await res.blob();
                                      const url = URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = `AI回答_${new Date().toLocaleDateString('zh-TW').replace(/\//g, '-')}.docx`;
                                      a.click();
                                      URL.revokeObjectURL(url);
                                      toast.success('已匯出 Word 檔');
                                    } catch (e) {
                                      toast.error('匯出失敗，請稍後再試');
                                    }
                                  }}
                                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent transition-colors"
                                  title="匯出 Word"
                                >
                                  <FileDown className="w-3 h-3" />
                                  <span>匯出 Word</span>
                                </button>
                              )}
                            </div>
                          )}
                          {/* 選擇題作答已整合到泡泡內的 ChoiceMessageRenderer，此處不再顯示外部按鈕 */}
                          {/* 展開說明按鈕：當 AI 訊息結尾含有詢問句時顯示 */}
                          {/* AI 訊息泡泡下方快捷按鈕：詳細解說、舉個實例、來個測驗、收藏解說（達上限後隱藏） */}
                          {msg.role === "assistant" &&
                           !isStreaming &&
                           messagesQuery.data &&
                           msg.id === messagesQuery.data[messagesQuery.data.length - 1]?.id &&
                           !detectChoiceQuestion(msg.content) && !isSmallTalkReply(msg.content) &&
                           messagesQuery.data.filter(m => m.role === 'user' && !String(m.content).startsWith('我選 (')).length < 5 && (() => {
                            // 只看緊鄰的前一則 user 訊息是否有圖片（避免帶入舊對話的圖片）
                            // 若中間已有純文字 user 訊息，則不帶圖片
                            const msgIdx = messagesQuery.data.findIndex(m => m.id === msg.id);
                            let lastImgs: Array<{fileId: number; fileUrl: string; fileName: string; mimeType: string}> = [];
                            // 找到緊鄰的前一則 user 訊息（直接前一則，不跳過）
                            if (msgIdx > 0) {
                              const prevMsg = messagesQuery.data[msgIdx - 1];
                              if (prevMsg && prevMsg.role === 'user') {
                                const imgs = (prevMsg.attachments as Array<{fileId: number; fileUrl: string; fileName: string; mimeType: string}> | null)
                                  ?.filter(a => a.mimeType?.startsWith('image/')) ?? [];
                                if (imgs.length > 0) { lastImgs = imgs; }
                              }
                            }
                            const hasImg = lastImgs.length > 0;
                            // 將最近圖片轉為 doSendMessage 可用的附件格式
                            const lastImgAttachments = lastImgs.map(a => ({ fileId: a.fileId, fileUrl: a.fileUrl, fileName: a.fileName, mimeType: a.mimeType }));
                            return (
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {/* 詳細解說（-1點） */}
                                <button
                                  onClick={() => doSendMessage(
                                    hasImg ? '請根據這張圖片，詳細解說相關的知識內容' : '請詳細解說剛才的內容',
                                    hasImg ? lastImgAttachments : [],
                                    undefined, 1, '詳細解說服務'
                                  )}
                                  className="flex items-center gap-1 px-3 h-7 rounded-full bg-muted text-muted-foreground border border-border text-xs font-medium hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:hover:bg-blue-950/30 dark:hover:text-blue-400 transition-all"
                                >
                                  <span>📚</span><span>詳細解說</span>
                                </button>
                                {/* 舉個實例（-1點） */}
                                <button
                                  onClick={() => doSendMessage(
                                    hasImg ? '請根據這張圖片的主題，舉一個具體的例子幫我理解' : '能舉一個具體的例子幫我理解剛才說的內容嗎？',
                                    hasImg ? lastImgAttachments : [],
                                    undefined, 1, '舉個實例服務'
                                  )}
                                  className="flex items-center gap-1 px-3 h-7 rounded-full bg-muted text-muted-foreground border border-border text-xs font-medium hover:bg-green-50 hover:text-green-600 hover:border-green-300 dark:hover:bg-green-950/30 dark:hover:text-green-400 transition-all"
                                >
                                  <span>📌</span><span>舉個實例</span>
                                </button>
                                {/* 來個測驗（-1點） */}
                                <button
                                  onClick={() => {
                                    const testMsg = hasImg
                                      ? '請根據這張圖片的題目主題，出一題新的延伸選擇題讓我練習（不要出原題）'
                                      : '請出一題關於剛才這個主題的選擇題讓我練習';
                                    doSendMessage(testMsg, hasImg ? lastImgAttachments : [], undefined, 1, '來個測驗服務');
                                  }}
                                  className="flex items-center gap-1 px-3 h-7 rounded-full bg-muted text-muted-foreground border border-border text-xs font-medium hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 dark:hover:bg-orange-950/30 dark:hover:text-orange-400 transition-all"
                                >
                                  <span>📝</span><span>來個測驗</span>
                                </button>
                                {/* 收藏解說 */}
                                <SaveAnswerButton
                                  messageId={msg.id}
                                  content={msg.content}
                                  conversationId={conversationId}
                                />
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ))}
                    
                    {/* 串流訊息顯示（串流中，或串流剛結束但 refetch 尚未完成） */}
                    {streamingMessage && (
                      <div className="flex justify-start gap-2">
                        <div className="flex-shrink-0 flex flex-col items-center gap-0.5 mb-1">
                          <div className="relative">
                            <img
                              src={avatarMap[chatStyle] || avatarMap['sister_kind']}
                              alt="AI"
                              className="w-14 h-14 rounded-full object-cover object-top border-2 border-primary/20 shadow-sm bg-white"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 max-w-[82%] min-w-0">
                          <Card className="bg-muted" style={{padding: '16px 20px 20px 20px', borderRadius: '19px'}}>
                            <div className="flex items-start gap-2 mb-2">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Cloud className="w-3 h-3" />
                                <span>{chatStyle.startsWith('brother') ? '學長' : '學姊'}</span>
                              </div>
                            </div>
                            <MarkdownWithMath>{streamingMessage}</MarkdownWithMath>
                            {/* 串流中顯示打字機游標；串流結束後不顯示 */}
                            {isStreaming && <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />}
                            
                            {/* RAG 來源顯示（六法法條/考題/知識庫） */}
                            {knowledgeSources.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-border/50">
                                <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" />
                                  <span>參考來源：</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {knowledgeSources.map((label, index) => (
                                    <span key={index} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground border border-border/50">
                                      {label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </Card>
                          {/* 串流結束後立即顯示快捷按鈕（refetch 尚未完成時用 streamingMessage 内容） */}
                          {!isStreaming && !detectChoiceQuestion(streamingMessage) && !isSmallTalkReply(streamingMessage) &&
                           messagesQuery.data && messagesQuery.data.filter(m => m.role === 'user' && !String(m.content).startsWith('我選 (')).length < 5 && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => doSendMessage('請詳細解說剛才的內容', [], undefined, 1, '詳細解說服務')}
                                className="flex items-center gap-1 px-3 h-7 rounded-full bg-muted text-muted-foreground border border-border text-xs font-medium hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all"
                              >
                                <span>📚</span><span>詳細解說</span>
                              </button>
                              <button
                                onClick={() => doSendMessage('能舉一個具體的例子幫我理解剛才說的內容嗎？', [], undefined, 1, '舉個實例服務')}
                                className="flex items-center gap-1 px-3 h-7 rounded-full bg-muted text-muted-foreground border border-border text-xs font-medium hover:bg-green-50 hover:text-green-600 hover:border-green-300 transition-all"
                              >
                                <span>📌</span><span>舉個實例</span>
                              </button>
                              <button
                                onClick={() => doSendMessage('請出一題關於剛才這個主題的選擇題讓我練習', [], undefined, 1, '來個測驗服務')}
                                className="flex items-center gap-1 px-3 h-7 rounded-full bg-muted text-muted-foreground border border-border text-xs font-medium hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 transition-all"
                              >
                                <span>📝</span><span>來個測驗</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* AI 正在思考的載入動畫（在串流開始前顯示） */}
                    {isStreaming && !streamingMessage && (
                      <div className="flex justify-start gap-2">
                        <div className="flex-shrink-0 flex flex-col items-center gap-0.5 mb-1">
                          <div className="relative">
                            <img
                              src={avatarMap[chatStyle] || avatarMap['sister_kind']}
                              alt="AI"
                              className="w-14 h-14 rounded-full object-cover object-top border-2 border-primary/20 shadow-sm bg-white"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 max-w-[82%] min-w-0">
                          <Card className="bg-muted" style={{padding: '16px 20px 20px 20px', borderRadius: '19px'}}>
                            <div className="flex items-start gap-2 mb-2">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Cloud className="w-3 h-3" />
                                <span>{chatStyle.startsWith('brother') ? '學長' : '學姊'}</span>
                              </div>
                            </div>
                            <TypingAnimation />
                          </Card>
                        </div>
                      </div>
                    )}
                    
                    {/* 5 題限制已移除 */}

                    {/* 滚動到底部按鈕（當用戶向上滚動時顯示） */}
                    {!isUserAtBottom && (
                      <div className="fixed bottom-24 right-8 z-40">
                        <Button
                          size="icon"
                          className="rounded-full shadow-lg"
                          onClick={() => {
                            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                            setIsUserAtBottom(true);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <path d="m6 9 6 6 6-6"/>
                          </svg>
                        </Button>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    {/* 六種風格各自對應不同的學長/學姊圖案（使用全域 avatarMap） */}
                    <img
                      src={avatarMap[chatStyle] || avatarMap['sister_kind']}
                      alt={chatStyle.startsWith('brother') ? '學長' : '學姊'}
                      className="w-52 h-60 sm:w-64 sm:h-72 object-contain object-top mb-3 drop-shadow-md"
                    />
                    <h3 className="text-lg font-semibold mb-1">
                      {chatStyle.startsWith('brother') ? '學長' : '學姊'}在線上，隨時幫你解題！
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xs mb-4 italic leading-relaxed">
                      {({
                        sister_kind:    <>「不管多難的題目，<br/>我都陪你一步一步拆解清楚～」</>,
                        sister_strict:  <>「基礎不穩，什麼都是空談。<br/>跟我來，從根本打好。」</>,
                        sister_funny:   <>「讀書嘛，苦中作樂才撐得住！<br/>我來負責讓你笑著學。」</>,
                        brother_kind:   <>「嘿！有什麼不懂的直接問我，<br/>我們一起搞定它！」</>,
                        brother_strict: <>「想進步就得認真，<br/>我不會放水，但你一定學得會。」</>,
                        brother_funny:  <>「我保證讓你笑著把題目搞懂，<br/>笑完還是要寫喔！」</>,
                      } as Record<string, React.ReactNode>)[chatStyle]}
                    </p>

                    {/* 上傳圖片規則說明 - 已移至輸入框旁的規則按鈕 */}

                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>💡 支援拖放檔案</span>
                      <span>📋 Ctrl+V 貼上圖片</span>
                      <span>📸 相機拍照</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </>
        ) : (
          // 沒有選擇對話時，顯示歷史對話列表
          <div className="flex-1 flex flex-col overflow-hidden">            {/* 整合導覽列： Logo + 歷史對話 + 導覽 + 點數 + 用戶選單 */}
            <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur">
            <div className="max-w-4xl mx-auto px-3 py-2 flex items-center gap-2">
              {/* Logo */}
              <button
                onClick={() => setLocation('/')}
                className="flex items-center gap-1.5 font-bold text-sm hover:opacity-80 transition-opacity flex-shrink-0"
              >
                <Brain className="w-4 h-4 text-primary" />
                <span className="hidden sm:inline">iBrain 智匯</span>
              </button>
              {/* 分隔線 */}
              <div className="w-px h-4 bg-border flex-shrink-0" />
              {/* 歷史對話標題 */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MessageSquare className="w-4 h-4 text-primary flex-shrink-0" />
                <h2 className="text-sm font-semibold">歷史對話</h2>
                {conversationsQuery.data && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {conversationsQuery.data.length} 則
                  </span>
                )}
              </div>
              {/* 右側：導覽 + 點數 + 開新對話 + 用戶選單 */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 gap-1"
                  onClick={() => setLocation('/')}
                  title="首頁"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span className="hidden md:inline text-xs">首頁</span>
                </Button>
                {studentPortalEnabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 gap-1"
                    onClick={() => setLocation('/student')}
                    title="智能專區"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span className="hidden md:inline text-xs">智能專區</span>
                  </Button>
                )}
                {user && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full text-xs font-semibold hover:bg-primary/20 transition-colors cursor-pointer">
                        <Coins className="w-3 h-3 text-primary" />
                        <span>{creditsQuery.data?.balance ?? 0}</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel className="text-xs font-semibold">點數明細</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">永久點數</span>
                          <span className="font-semibold">{creditsQuery.data?.permanentCredits ?? 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">每日點數</span>
                          <span className="font-semibold">{creditsQuery.data?.dailyCredits ?? 0}</span>
                        </div>
                        <DropdownMenuSeparator />
                        <div className="flex justify-between">
                          <span className="font-semibold">總點數</span>
                          <span className="font-bold text-primary">{creditsQuery.data?.balance ?? 0}</span>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setLocation('/credits-history')} className="text-xs cursor-pointer">
                        📊 查看點數歷史
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button
                  onClick={handleNewConversation}
                  disabled={createConversationMutation.isPending}
                  size="sm"
                  className="h-7 gap-1"
                >
                  {createConversationMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">開新對話</span>
                </Button>
                {user && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>
                        <div className="flex flex-col">
                          <span>{user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {user.role === 'admin' ? '管理員' : '學生'}
                          </span>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {user.role === 'admin' && (
                        <DropdownMenuItem onClick={() => setLocation('/admin')}>
                          管理後台
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => logoutMutation.mutate()}
                        className="text-destructive"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        登出
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            </div>

            {/* 對話列表 */}
            <div className="flex-1 overflow-y-auto p-4">
              {conversationsQuery.isLoading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">載入中...</p>
                </div>
              ) : conversationsQuery.data && conversationsQuery.data.length > 0 ? (
                <div className="space-y-2 max-w-2xl mx-auto">
                  {conversationsQuery.data.map((conv) => {
                    // 優先使用對話自己的 chatStyle，如果沒有則 fallback 到用戶 profile 的風格，再 fallback 到 sister_kind
                    const convStyle = (conv as any).chatStyle || (user as any)?.chatStyle || 'sister_kind';
                    const styleNameMap: Record<string, string> = {
                      brother_kind: '親切學長',
                      brother_strict: '嚴格學長',
                      brother_funny: '幽默學長',
                      sister_kind: '親切學姊',
                      sister_strict: '嚴格學姊',
                      sister_funny: '幽默學姊',
                    };
                    const convAvatarUrl = avatarMap[convStyle] || avatarMap['brother_kind'];
                    const convStyleName = styleNameMap[convStyle] || '學長';
                    return (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setLocation(`/chat/${conv.id}`);
                      }}
                      className="w-full text-left p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-accent/50 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={convAvatarUrl}
                          alt={convStyleName}
                          className="w-10 h-10 rounded-full object-cover object-top flex-shrink-0 bg-white border border-border"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs text-primary font-medium">{convStyleName}</span>
                          </div>
                          <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                            {conv.title || '新對話'}
                          </p>
                          {conv.updatedAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(conv.updatedAt).toLocaleString('zh-TW', {
                                month: 'numeric',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0 mt-0.5 transition-colors" />
                      </div>
                    </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-60 gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">還沒有對話記錄</h3>
                    <p className="text-sm text-muted-foreground">點擊「開新對話」開始與學長對話吧！</p>
                  </div>
                  <Button onClick={handleNewConversation} disabled={createConversationMutation.isPending} className="gap-2">
                    {createConversationMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    開始第一對話
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 輸入區域（固定在底部，沒有對話時隱藏） */}
        {conversationId && <div className="flex-shrink-0 border-t border-border p-4 bg-background z-30" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          <div className="max-w-4xl mx-auto">
          {/* 圖片上傳提示（有圖片時顯示） */}
          {selectedFiles.some(f => f.type.startsWith('image/')) && (
            <div className="mb-2 flex items-start gap-1.5 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <span className="mt-0.5 flex-shrink-0">📸</span>
              <span><strong>拍照小技巧</strong>：一次只拍一題且內容清晰，辨識精準度會更高。若一張圖片包含多題，可能導致答案錯誤。</span>
            </div>
          )}
          {/* 圖片預覽區域 */}
          {selectedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => {
                const isImage = file.type.startsWith('image/');
                const fileUrl = URL.createObjectURL(file);
                
                return (
                  <div key={index} className="relative group">
                    {isImage ? (
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-primary shadow-md">
                        <img
                          src={fileUrl}
                          alt={file.name}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setPreviewImage(fileUrl)}
                        />
                        <button
                  onClick={() => {
                    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
                    setUploadedFileIds(uploadedFileIds.filter((_, i) => i !== index));
                    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
                  }}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="刪除"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-primary flex items-center justify-center bg-muted shadow-md">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                        <button
                          onClick={() => {
                            setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                            setUploadedFileIds(prev => prev.filter((_, i) => i !== index));
                          }}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="刪除"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          {/* 外部資源搜尋按鈕 - 暫時隱藏 */}
           {/* <ExternalSearchButtons /> */}




          {/* 問題進度顯示已移除（無限題數） */}

          {/* 輸入區一行布局：+ 在左、輸入框在中、發送在右 */}
          <div className="flex items-end gap-2 mb-2">
            {/* + 工具按鈕：已有圖片時隱藏，避免重複上傳 */}
            {selectedFiles.filter(f => f.type.startsWith('image/')).length === 0 && (
            <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowToolMenu(prev => !prev)}
                  title="工具選單"
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center transition-colors border border-border',
                    showToolMenu ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted text-muted-foreground'
                  )}
                >
                  {showToolMenu ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
                {/* 展開選單 */}
                {showToolMenu && (
                  <div className="absolute bottom-full left-0 mb-2 bg-background border border-border rounded-xl shadow-lg py-1 min-w-[140px] z-50">
                  {/* 上傳圖片 */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted text-left"
                    onClick={() => { fileInputRef.current?.click(); setShowToolMenu(false); }}
                  >
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span>上傳圖片</span>
                  </button>
                  {/* 相機拍照 */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted text-left"
                    onClick={() => { cameraInputRef.current?.click(); setShowToolMenu(false); }}
                  >
                    <Camera className="w-4 h-4 text-muted-foreground" />
                    <span>相機拍照</span>
                  </button>
                  {/* 語音輸入 - 已隱藏 */}
                </div>
              )}
            </div>
            )}

            {/* 輸入框 - 中間 */}
            <div className="flex-1 border border-border rounded-xl bg-background focus-within:ring-1 focus-within:ring-primary">
              <Textarea
                ref={textareaRef}
                placeholder={isUploadingFiles ? "檔案上傳中，請稍候..." : "輸入訊息... (Ctrl+V可貼上圖片)"}
                value={message}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  setMessage(e.target.value);
                  // 先重置高度再重新計算，避免擴大後無法縮回
                  e.target.style.height = 'auto';
                  if (e.target.value === '') {
                    e.target.style.height = '40px';
                  } else {
                    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                  }
                }}
                onClick={(e: React.MouseEvent<HTMLTextAreaElement>) => {
                  // 點擊時重新計算高度，避免殘留擴大狀態
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  if (el.value === '') {
                    el.style.height = '40px';
                  } else {
                    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
                  }
                }}
                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={sendMessageMutation.isPending || isUploadingFiles}
                className="w-full min-h-[40px] max-h-[200px] resize-none border-0 shadow-none focus-visible:ring-0 rounded-xl px-3 py-2.5"
                rows={1}
              />
            </div>

            {/* 發送按鈕 - 右側 */}
            <button
              onClick={() => handleSendMessage()}
              disabled={sendMessageMutation.isPending || (!message.trim() && selectedFiles.length === 0) || isUploadingFiles}
              title={isUploadingFiles ? "檔案上傳中，請稍候..." : "發送訊息"}
              className={cn(
                'w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center transition-colors',
                sendMessageMutation.isPending || (!message.trim() && selectedFiles.length === 0) || isUploadingFiles
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          {/* 輸入框下方按鈕區：提問規則 + 引導教學 + 動態快捷按鈕 */}
          {(() => {
            // 取得最後一則 AI 訊息
            const lastAIMsg = messagesQuery.data?.filter(m => m.role === 'assistant').slice(-1)[0];
            const lastAIContent = lastAIMsg?.content || '';
            const hasMessages = (messagesQuery.data?.length ?? 0) > 0;
            // 偵測展開說明按鈕
            const expandLabel = lastAIContent ? detectExpandPrompt(lastAIContent) : null;
            // 偵測是否顯示快捷按鈕（不是選擇題、不是閒聊、有內容）
            const showQuickActions = hasMessages && lastAIContent && !detectChoiceQuestion(lastAIContent) && !isSmallTalkReply(lastAIContent) && !expandLabel;
            // 取得前一則 user 訊息的圖片附件
            const lastAIMsgIndex = messagesQuery.data ? messagesQuery.data.findIndex(m => m.id === lastAIMsg?.id) : -1;
            const prevUserMsg = lastAIMsgIndex > 0 ? messagesQuery.data![lastAIMsgIndex - 1] : null;
            const prevImageAttachments = (prevUserMsg?.attachments as Array<{fileId: number; fileUrl: string; fileName: string; mimeType: string}> | null)
              ?.filter(a => a.mimeType?.startsWith('image/')) ?? [];
            const hasImage = prevImageAttachments.length > 0;
            return (
              <div className="mt-1 pb-0.5">
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={() => setShowUploadRulesDialog(true)}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                  >
                    <Info className="w-3 h-3" />
                    <span>提問規則</span>
                  </button>
                  {/* 模型標籤已移除，不對外顯示使用哪個模型 */}
                </div>
              </div>
            );
          })()}
          </div>
        </div>}
      </div>

      {/* 刪除確認對話框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除對話</AlertDialogTitle>
            <AlertDialogDescription>
              此操作無法復原。刪除後，此對話的所有訊息都將永久刪除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量刪除確認對話框 */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認批量刪除</AlertDialogTitle>
            <AlertDialogDescription>
              您即將刪除 {selectedConversations.size} 個對話。此操作無法復原，所有選中對話的訊息都將永久刪除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBatchDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              刪除 {selectedConversations.size} 個對話
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 開新對話前的前一對話未問完警告彈窗 */}
      {/* 5 題限制已移除 */}

      {/* 圖片預覽 Dialog */}
      <Dialog open={previewImage !== null} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>圖片預覽</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex items-center justify-center p-4">
              <img 
                src={previewImage} 
                alt="預覽" 
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 圖片多題確認對話框 */}
      <AlertDialog open={multiQuestionDialog.open} onOpenChange={(open) => setMultiQuestionDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>圖片包含多題確認</AlertDialogTitle>
            <AlertDialogDescription>
              偵測到這張圖片包含 <strong>{multiQuestionDialog.questionCount} 道完整題目</strong>，
              發送將扣除 <strong>{multiQuestionDialog.pointsToDeduct} 點</strong>（每題 1 點）。
              是否確認發送？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMultiQuestionDialog(prev => ({ ...prev, open: false }))}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={multiQuestionDialog.onConfirm} className="bg-primary text-primary-foreground">
              確認發送（扣 {multiQuestionDialog.pointsToDeduct} 點）
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 圖片辨識確認對話框 */}
      <Dialog
        open={recognitionConfirmDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setRecognitionConfirmDialog(prev => ({ ...prev, open: false }));
            // 關閉對話框時（含點 X、Escape、取消）清除輸入框圖片
            setSelectedFiles([]);
            setUploadedFileIds([]);
            setUploadedFiles([]);
          }
        }}
      >
        <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <span>📝 請確認辨識內容</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {/* 上方：圖片預覽 + 全螢幕按鈕 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">上傳的圖片</label>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border hover:bg-muted"
                  onClick={() => {
                    const img = recognitionConfirmDialog.imageUrl;
                    const w = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
                    if (w) {
                      w.document.write(`<html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${img}" style="max-width:100%;max-height:100vh;object-fit:contain" /></body></html>`);
                      w.document.close();
                    }
                  }}
                >
                  <span>⛶</span> 全螢幕核對
                </button>
              </div>
              <img
                src={recognitionConfirmDialog.imageUrl}
                alt="上傳的圖片"
                className="w-full max-h-52 object-contain rounded-lg border border-border bg-muted"
              />
              {recognitionConfirmDialog.isLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>正在辨識圖片內容，請稍候...</span>
                </div>
              )}
            </div>

            {/* 下方：辨識文字和問題 */}
            <div>
              <label className="text-sm font-medium mb-1 block">辨識的題目內容（可直接修改）</label>
              {recognitionConfirmDialog.isLoading ? (
                <div className="h-28 rounded-md border border-border bg-muted animate-pulse" />
              ) : (
                <>
                  {/* 多題偵測提醒 */}
                  {(() => {
                    const text = recognitionEditText;
                    // 偵測多題：題號模式（1. 2. 或 （一）（二） 或多個問號）
                    const hasNumberedItems = /[\n\r]\s*[2-9]\s*[.、．]/.test(text);
                    const hasBracketedItems = /（[二三四五六七八九]）|\([二三四五六七八九]\)/.test(text);
                    const questionMarkCount = (text.match(/？|\?/g) || []).length;
                    const isMultiQuestion = hasNumberedItems || hasBracketedItems || questionMarkCount >= 2;
                    return isMultiQuestion ? (
                      <div className="flex items-start gap-2 p-2 mb-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                        <span className="text-base leading-none mt-0.5">⚠️</span>
                        <span>偵測到圖片可能包含<strong>多道題目</strong>，建議只保留一題再送出，助教辨識會更準確！請在下方文字框中刪除多餘的題目內容。</span>
                      </div>
                    ) : null;
                  })()}
                  <Textarea
                    value={recognitionEditText}
                    onChange={(e) => setRecognitionEditText(e.target.value)}
                    className="min-h-[112px] max-h-[200px] text-sm font-mono"
                    placeholder="辨識內容將顯示在這裡..."
                  />
                </>
              )}
            </div>
            <div>
              <div className="flex items-center mb-1">
                <label className="text-sm font-medium">您的問題（可修改）</label>
              </div>
              <Textarea
                value={recognitionConfirmDialog.originalQuestion === "請幫我看看這張圖片" ? "" : recognitionConfirmDialog.originalQuestion}
                onChange={(e) =>
                  setRecognitionConfirmDialog(prev => ({ ...prev, originalQuestion: e.target.value }))
                }
                className="min-h-[56px] text-sm"
                placeholder="直接輸入您的問題…"
              />
            </div>



          </div>
          {/* 按鈕區 - 固定在底部，不隨內容捲動 */}
          <div className="flex justify-end gap-2 pt-3 border-t border-border flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => {
                  setRecognitionConfirmDialog(prev => ({ ...prev, open: false }));
                  // 取消時清除輸入框中的圖片
                  setSelectedFiles([]);
                  setUploadedFileIds([]);
                  setUploadedFiles([]);
                }}
              >
                取消
              </Button>
              <Button
                disabled={recognitionConfirmDialog.isLoading}
                onClick={() => {
                  setRecognitionConfirmDialog(prev => ({ ...prev, open: false }));
                  const userQuestion = recognitionConfirmDialog.originalQuestion && recognitionConfirmDialog.originalQuestion !== "請幫我看看這張圖片"
                    ? recognitionConfirmDialog.originalQuestion
                    : "";
                  const recognizedText = recognitionEditText.trim() ? `\n\n[題目內容]\n${recognitionEditText.trim()}` : "";
                  const baseContent = [userQuestion, recognizedText].filter(Boolean).join("") || "請幫我看看這張圖片";
                  const finalContent = baseContent;
                  doSendMessage(finalContent, recognitionConfirmDialog.attachments, 1);
                }}
              >
                確認送出
              </Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* 暗稱詢問對話框 */}
      {/* 上傳規則彈窗 */}
      <Dialog open={showUploadRulesDialog} onOpenChange={setShowUploadRulesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <span>📝</span> 提問規則
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm overflow-y-auto max-h-[70vh]">

            {activeModel === 'gemma4' ? (
              /* === Gemma4 版提問規則 === */
              <>
                {/* 免費無限提問 */}
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
                  <p className="font-semibold text-green-800 dark:text-green-200 mb-2">🎉 免費無限提問</p>
                  <ul className="space-y-1 text-green-700 dark:text-green-300">
                    <li>• 目前全程免費使用</li>
                    <li>• <strong>純文字、圖片、延伸服務</strong>均不扣點</li>
                    <li>• <strong>問題數量無限制</strong>，想問幾個問幾個</li>
                  </ul>
                </div>

                {/* 拍照與上傳準則 */}
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                  <p className="font-semibold text-amber-800 dark:text-amber-200 mb-2">📷 拍照與上傳準則</p>
                  <ul className="space-y-1.5 text-amber-700 dark:text-amber-300">
                    <li className="flex items-start gap-1.5"><span>•</span><span><strong>單圖單題</strong>：每次上傳 1 張圖片，且圖中僅含 1 個題目，辨識精準</span></li>
                    <li className="flex items-start gap-1.5"><span>•</span><span><strong>清晰呼現</strong>：請確保文字清晰、不歪斜，避免反光或模糊</span></li>
                    <li className="flex items-start gap-1.5"><span>•</span><span><strong>善用截圖</strong>：轉貼（Ctrl+V）或截圖效果比翹拍更好</span></li>
                  </ul>
                </div>

                {/* 模型說明已移除 */}
              </>
            ) : (
              /* === Manus AI 版提問規則 === */
              <>
                {/* 點數使用攻略 */}
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                  <p className="font-semibold text-blue-800 dark:text-blue-200 mb-2">💰 點數使用攻略</p>
                  <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                    <li>• <strong>開新對話</strong>：扣 1 點</li>
                    <li>• <strong>對話中傳圖片</strong>：每張圖片扣 1 點</li>
                    <li>• <strong>純文字提問</strong>：不消耗點數</li>
                    <li>• <strong>延伸服務</strong>：詳細解說、舉個實例、來個測驗 免費</li>
                    <li>• <strong>點數重置</strong>：每日 00:00 重新發放</li>
                  </ul>
                </div>

                {/* 拍照與上傳準則 */}
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                  <p className="font-semibold text-amber-800 dark:text-amber-200 mb-2">📷 拍照與上傳準則</p>
                  <ul className="space-y-1.5 text-amber-700 dark:text-amber-300">
                    <li className="flex items-start gap-1.5"><span>•</span><span><strong>單圖單題</strong>：每次上傳 1 張圖片，且圖中僅含 1 個題目，辨識精準</span></li>
                    <li className="flex items-start gap-1.5"><span>•</span><span><strong>清晰呼現</strong>：請確保文字清晰、不歪斜，避免反光或模糊</span></li>
                    <li className="flex items-start gap-1.5"><span>•</span><span><strong>善用截圖</strong>：轉貼（Ctrl+V）或截圖效果比翹拍更好</span></li>
                  </ul>
                </div>

                {/* 讓 AI 更聰明的小技巧 */}
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
                  <p className="font-semibold text-green-800 dark:text-green-200 mb-2">💡 讓 AI 更聰明的小技巧</p>
                  <ul className="space-y-1.5 text-green-700 dark:text-green-300">
                    <li className="flex items-start gap-1.5"><span>•</span><span><strong>框選重點</strong>：讓題目填満畫面，減少多餘的空白背景</span></li>
                    <li className="flex items-start gap-1.5"><span>•</span><span><strong>光線充足</strong>：在明亮環境下拍攝，避免陰影或逆光</span></li>
                    <li className="flex items-start gap-1.5"><span>•</span><span><strong>善用截圖</strong>：轉貼（Ctrl+V）或截圖的效果比翹拍更好</span></li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <NicknameDialog
        open={showNicknameDialog}
        onNicknameSet={(nickname, gender) => {
          updateNicknameMutation.mutate({ nickname });
          if (gender) {
            updateProfileMutation.mutate({ gender });
          }
        }}
        isLoading={updateNicknameMutation.isPending}
      />

      {/* 隱藏的檔案上傳 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.txt"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) {
            handleFileUpload(files);
          }
          // 清空 input 以便再次上傳相同檔案
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* 隱藏的相機拍照 input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) {
            handleFileUpload(files);
          }
          // 清空 input 以便再次拍照
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* 圖片裁切彈窗 */}
      <ImageEditModal
        file={imageEditModal.file}
        open={imageEditModal.open}
        onClose={() => setImageEditModal({ open: false, file: null, onConfirm: null })}
        onConfirm={(editedFile) => {
          if (imageEditModal.onConfirm) imageEditModal.onConfirm(editedFile);
        }}
      />

      {/* 網路搜尋確認對話框 */}
      <AlertDialog
        open={webSearchConfirmDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setWebSearchConfirmDialog(prev => ({ ...prev, open: false, pendingParams: null }));
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🌐 需要搜尋網路</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  AI 助教判斷這個問題需要搜尋網路才能給出準確答案。
                </p>
                {webSearchConfirmDialog.reason && (
                  <div className="rounded-md bg-muted px-3 py-2 text-sm">
                    💡 {webSearchConfirmDialog.reason}
                  </div>
                )}
                {webSearchConfirmDialog.isAdmin ? (
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    ✅ 管理員免費，不扣點。
                  </p>
                ) : (
                  <p className="text-sm">
                    此次搜尋將扣除 <strong>1 點</strong>，目前餘額 <strong>{webSearchConfirmDialog.balance} 點</strong>。
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setWebSearchConfirmDialog(prev => ({ ...prev, open: false, pendingParams: null }));
              }}
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const pending = webSearchConfirmDialog.pendingParams;
                setWebSearchConfirmDialog(prev => ({ ...prev, open: false, pendingParams: null }));
                if (pending) {
                  setIsStreaming(true);
                  setStreamingMessage("");
                  await sendMessageWithStream(pending);
                }
              }}
            >
              確認搜尋
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
