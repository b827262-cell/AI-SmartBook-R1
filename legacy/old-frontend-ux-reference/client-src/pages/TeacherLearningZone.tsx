import React, { useState, useEffect, useRef, useMemo } from "react";
import { Streamdown } from "streamdown";
import { useRoute, Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BookOpen, 
  Send, 
  Loader2,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Trash2,
  Star,
  Bookmark,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ======= 小測驗資料型別 =======
type QuizQuestion = {
  id: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
};

type QuizFullQuestion = QuizQuestion & {
  answer: string;
  explanation: string;
};

type QuizData = {
  questions: QuizQuestion[];
  fullData: QuizFullQuestion[];
};

// ======= 互動式測驗元件 =======
function QuizWidget({ quizData }: { quizData: QuizData }) {
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = quizData.questions.length > 0 &&
    quizData.questions.every(q => selected[q.id] !== undefined);

  const handleSelect = (qId: number, opt: string) => {
    if (submitted) return;
    setSelected(prev => ({ ...prev, [qId]: opt }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const correctCount = submitted
    ? quizData.fullData.filter(q => selected[q.id] === q.answer).length
    : 0;

  return (
    <div className="space-y-5">
      {quizData.questions.map((q, qi) => {
        const full = quizData.fullData.find(f => f.id === q.id);
        const userAns = selected[q.id];
        const isCorrect = submitted && full && userAns === full.answer;
        const isWrong = submitted && full && userAns && userAns !== full.answer;

        return (
          <div key={q.id} className="border rounded-lg p-3 bg-white">
            <p className="text-sm font-semibold text-gray-800 mb-3">
              第 {qi + 1} 題：{q.question}
            </p>
            <div className="space-y-2">
              {(["A", "B", "C", "D"] as const).map(opt => {
                const isSelected = userAns === opt;
                const isCorrectOpt = submitted && full && full.answer === opt;
                const isWrongOpt = submitted && isSelected && !isCorrectOpt;

                let btnClass = "w-full text-left text-sm px-3 py-2 rounded border transition-colors ";
                if (!submitted) {
                  btnClass += isSelected
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-blue-300 hover:bg-blue-50";
                } else {
                  if (isCorrectOpt) {
                    btnClass += "border-green-500 bg-green-50 text-green-700 font-semibold";
                  } else if (isWrongOpt) {
                    btnClass += "border-red-400 bg-red-50 text-red-600";
                  } else {
                    btnClass += "border-gray-200 text-gray-500";
                  }
                }

                return (
                  <button
                    key={opt}
                    className={btnClass}
                    onClick={() => handleSelect(q.id, opt)}
                    disabled={submitted}
                  >
                    <span className="font-semibold mr-2">{opt}.</span>
                    {q.options[opt]}
                    {submitted && isCorrectOpt && (
                      <CheckCircle2 className="inline h-4 w-4 ml-2 text-green-600" />
                    )}
                    {submitted && isWrongOpt && (
                      <XCircle className="inline h-4 w-4 ml-2 text-red-500" />
                    )}
                  </button>
                );
              })}
            </div>
            {/* 解析（提交後顯示） */}
            {submitted && full && (
              <div className={`mt-3 p-2 rounded text-xs ${isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                <span className="font-semibold">
                  {isCorrect ? "✅ 答對了！" : `❌ 答錯了，正確答案是 ${full.answer}`}
                </span>
                <p className="mt-1 text-gray-700">{full.explanation}</p>
              </div>
            )}
          </div>
        );
      })}

      {/* 提交按鈕 */}
      {!submitted && (
        <Button
          className="w-full"
          disabled={!allAnswered}
          onClick={handleSubmit}
        >
          {allAnswered ? "提交答案" : `還有 ${quizData.questions.filter(q => selected[q.id] === undefined).length} 題未作答`}
        </Button>
      )}

      {/* 成績 */}
      {submitted && (
        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-lg font-bold text-blue-700">
            得分：{correctCount} / {quizData.questions.length}
          </p>
          <p className="text-sm text-blue-600 mt-1">
            {correctCount === quizData.questions.length
              ? "全部答對！太棒了！"
              : correctCount >= quizData.questions.length / 2
              ? "不錯！繼續加油！"
              : "再複習一下教材，下次一定更好！"}
          </p>
        </div>
      )}
    </div>
  );
}

// ======= AI 摘要清單元件 =======
function SummaryList({
  summaries,
  seekToTime,
  timestampToSeconds,
  setShowVideoPanel,
  onSectionAsk,
}: {
  summaries: any[];
  seekToTime: (t: number) => void;
  timestampToSeconds: (ts: string) => number;
  setShowVideoPanel: (v: boolean) => void;
  onSectionAsk: (sectionId: number, title: string, content: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 mb-2">點擊「▶ 跳到此處」可跳轉影片時間點</p>
      {summaries.map((s: any, i: number) => (
        <div key={i} className="bg-white border rounded-lg p-2.5">
          {/* 第一行：跳轉按鈕 + 標題 */}
          <div className="flex gap-2 items-center mb-1.5">
            <button
              className="text-blue-500 text-xs font-mono shrink-0 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded px-1.5 py-0.5 whitespace-nowrap"
              title={`跳到影片 ${s.timestamp}`}
              onClick={() => { seekToTime(timestampToSeconds(s.timestamp)); setShowVideoPanel(true); }}
            >▶ {s.timestamp}</button>
            <p className="flex-1 text-xs font-semibold text-gray-800">{s.title}</p>
          </div>
          {/* 摘要內容：直接全幅顯示 */}
          <p className="text-xs text-gray-600 leading-relaxed">{s.content}</p>
          {/* 帶入提問框按鈕 */}
          <div className="mt-2 pt-2 border-t flex justify-end">
            <button
              className="text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded border border-blue-200"
              onClick={() => {
                onSectionAsk(i, s.title, s.content);
              }}
            >帶入提問框</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ======= 主要型別 =======
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  image?: string; // base64 截圖
  quizData?: QuizData;
  sources?: Array<{ materialTitle: string; chapterTitle: string; content: string }>;
  savedId?: number | null;
};

export default function TeacherLearningZone() {
  const [, params] = useRoute("/teacher-learning-zone/:teacherId");
  const teacherId = params?.teacherId ? parseInt(params.teacherId) : null;
  const [location] = useLocation();
  // 解析 URL query string 中的 courseId
  const courseId = useMemo(() => {
    const search = window.location.search;
    const match = search.match(/[?&]courseId=(\d+)/);
    return match ? parseInt(match[1]) : null;
  }, [location]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [expandedMaterialIds, setExpandedMaterialIds] = useState<number[]>([]);
  const [currentHotQuestionIndex, setCurrentHotQuestionIndex] = useState(0);
  const [showSavedAnswers, setShowSavedAnswers] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  // 截圖貼上相關 state
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  // 帶入提問框的章節資訊 state
  const [activeSectionId, setActiveSectionId] = useState<number | undefined>(undefined);
  const [activeSectionTitle, setActiveSectionTitle] = useState<string | undefined>(undefined);
  const [activeSectionContent, setActiveSectionContent] = useState<string | undefined>(undefined);
  // 影片相關 state
  const [activeVideoMaterialId, setActiveVideoMaterialId] = useState<number | null>(null);
  const [showVideoPanel, setShowVideoPanel] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [currentSubtitleIndexState, setCurrentSubtitleIndexState] = useState(-1); // 只有字幕行切換時才更新，減少 re-render
  const ytCurrentSecRef = useRef(0); // 不觸發 re-render
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [ytCurrentSec, setYtCurrentSec] = useState(0); // 保留相容，不再使用
  const parsedTranscriptLinesRef = useRef<Array<{ seconds: number; text: string; timestamp: string; lineIndex: number; originalText: string }>>([]);
  const prevSubtitleIndexForTimerRef = useRef<number>(-1);
  const [showSubtitles, setShowSubtitles] = useState(true); // 是否顯示字幕
  // 版面切換模式：1=3:7（影片小）, 2=5:5（各半）, 3=影+字（影片大+字幕）, 4=全螢幕, 5=純對話
  const [layoutMode, setLayoutMode] = useState<1|2|3|5>(() => {
    // 從 localStorage 恢復上次選擇的比例模式
    const saved = localStorage.getItem('teacherLearningZone_layoutMode');
    const parsed = saved ? parseInt(saved) : NaN;
    return ([1, 2, 3] as const).includes(parsed as 1|2|3) ? (parsed as 1|2|3) : 1;
  });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  // 用戶手動捲動字幕時，暫停自動捲動
  const userScrollingRef = useRef<boolean>(false);
  const scrollPauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // YouTube IFrame Player API
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ytPlayerRef = useRef<any>(null);
  const ytPlayerContainerRef = useRef<HTMLDivElement>(null);
  // HTML5 video player ref（非 YouTube 影片使用）
  const html5VideoRef = useRef<HTMLVideoElement>(null);

  // 判斷是否為 YouTube 連結
  const isYouTubeUrl = (url: string): boolean => {
    return /youtube\.com|youtu\.be/.test(url);
  };
  // 左側欄 Tab state（QA / AI摘要）
  const [leftTabIndex, setLeftTabIndex] = useState<0 | 1>(0); // 0=QA, 1=AI摘要

  // 可拖拉分割線 state（中間影片欄寬度百分比，預設 55%）
  const [splitPercent, setSplitPercent] = useState(55);
  const isDraggingRef = useRef(false);
  const dragContainerRef = useRef<HTMLDivElement>(null);

  // 字幕校對相關 state
  const [editingSubtitleIndex, setEditingSubtitleIndex] = useState<number | null>(null);
  const [editingSubtitleText, setEditingSubtitleText] = useState('');
  const [submitReason, setSubmitReason] = useState('');
  const [showSubmitDialog, setShowSubmitDialog] = useState<number | null>(null); // 顯示提交審核對話框的行索引
  const [pendingSubtitleLines, setPendingSubtitleLines] = useState<Set<number>>(new Set()); // 已送審待審核的行索引
  // 管理者直接覆蓋字幕後的本地覆蓋記錄（lineIndex -> 覆蓋後的完整行文字）
  const [localTranscriptOverrides, setLocalTranscriptOverrides] = useState<Record<number, string>>({});

  // 從 YouTube URL 取得 video ID
  const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\.\w-]{11})/);
    return match ? match[1] : null;
  };

  // 將 [HH:MM:SS] 或 [MM:SS] 轉成秒數
  const timestampToSeconds = (ts: string): number => {
    const parts = ts.replace(/[\[\]]/g, '').split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  };

  // 影片跳轉到指定時間並自動播放
  const seekToTime = (secs: number) => {
    setVideoCurrentTime(secs);
    // HTML5 video 跳轉
    if (html5VideoRef.current) {
      html5VideoRef.current.currentTime = secs;
      html5VideoRef.current.play().catch(() => {});
      return;
    }
    // YouTube IFrame API 跳轉
    if (ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(secs, true);
      ytPlayerRef.current.playVideo?.();
    } else if (iframeRef.current?.contentWindow) {
      // fallback: postMessage
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [secs, true] }), '*'
      );
      setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*'
        );
      }, 300);
    }
  };

  // 截圖貼上事件監聽
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            if (file.size > 5 * 1024 * 1024) {
              toast.error('圖片大小不能超過 5MB');
              return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
              setPastedImage(event.target?.result as string);
              toast.success('截圖已貼上！可以開始提問');
            };
            reader.readAsDataURL(file);
          }
        }
      }
    }
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // 拖拉分割線事件處理
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !dragContainerRef.current) return;
      const rect = dragContainerRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.min(75, Math.max(30, percent)));
    };
    const onMouseUp = () => { isDraggingRef.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

  const { data: teacher, isLoading: teacherLoading } = trpc.lectureTeachers.getById.useQuery(
    { id: teacherId! },
    { enabled: !!teacherId }
  );

  const { data: materials } = trpc.teacherMaterials.list.useQuery(
    courseId ? { teacherId: teacherId!, courseId } : { teacherId: teacherId! },
    { enabled: !!teacherId }
  );

  // 已購課課程（必須在所有條件式 return 之前呼叫）
  const { data: myEnrollments } = trpc.lectureCourses.getMyEnrollments.useQuery();

  const { data: faqData, isLoading: faqsLoading } = trpc.materialContents.getFAQsByTeacher.useQuery(
    courseId ? { teacherId: teacherId!, courseId } : { teacherId: teacherId! },
    { enabled: !!teacherId }
  );

  const { data: savedAnswersData, refetch: refetchSaved } = trpc.savedAnswers.list.useQuery(
    { lectureTeacherId: teacherId! },
    { enabled: !!teacherId }
  );

  // 影片資料
  const { data: activeVideoData } = trpc.teacherMaterials.getVideoData.useQuery(
    { id: activeVideoMaterialId! },
    { enabled: !!activeVideoMaterialId }
  );

  // ===== 影片進度記憶 =====
  // 儲存進度到 localStorage
  const saveVideoProgress = (materialId: number, seconds: number) => {
    if (!materialId || seconds < 5) return; // 少於 5 秒不存（避免存到片頭）
    try {
      localStorage.setItem(`video_progress_${materialId}`, String(Math.floor(seconds)));
    } catch {}
  };

  // 讀取上次進度
  const loadVideoProgress = (materialId: number): number => {
    try {
      const saved = localStorage.getItem(`video_progress_${materialId}`);
      return saved ? parseInt(saved, 10) : 0;
    } catch { return 0; }
  };

  // 當切換影片時，讀取上次進度並跳轉
  useEffect(() => {
    if (!activeVideoMaterialId) return;
    const savedTime = loadVideoProgress(activeVideoMaterialId);
    if (savedTime > 0) {
      setVideoCurrentTime(savedTime);
    } else {
      setVideoCurrentTime(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVideoMaterialId]);

  // YouTube IFrame Player API：初始化 YT.Player 並每 1000ms 輸詢 getCurrentTime
  useEffect(() => {
    if (!showVideoPanel || !activeVideoData?.videoUrl) return;
    // 非 YouTube 連結不初始化 YT.Player
    if (!isYouTubeUrl(activeVideoData.videoUrl)) return;
    const videoId = getYouTubeVideoId(activeVideoData.videoUrl || '');
    if (!videoId) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    let saveTimer: ReturnType<typeof setInterval> | null = null;

    const initPlayer = () => {
      if (!ytPlayerContainerRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const YT = typeof window !== "undefined" ? (window as any).YT : undefined;
      if (!YT || !YT.Player) return;

      // 銷毀舊的 player
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }

      // 讀取上次進度
      const savedTime = activeVideoMaterialId ? loadVideoProgress(activeVideoMaterialId) : 0;

      ytPlayerRef.current = new YT.Player(ytPlayerContainerRef.current, {
        videoId,
        playerVars: {
          start: savedTime || videoCurrentTime,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            // 每 1000ms 輪詢一次播放時間，只有字幕行切換時才觸發 re-render
            timer = setInterval(() => {
              try {
                const t = ytPlayerRef.current?.getCurrentTime?.();
                if (typeof t !== 'number') return;
                const sec = Math.floor(t);
                ytCurrentSecRef.current = sec;
                // 計算當前字幕行
                const lines = parsedTranscriptLinesRef.current;
                if (!lines.length) return;
                let idx = 0;
                for (let i = 0; i < lines.length; i++) {
                  if (lines[i].seconds <= sec) idx = i;
                  else break;
                }
                // 只有字幕行真的切換時才觸發 re-render
                if (idx !== prevSubtitleIndexForTimerRef.current) {
                  prevSubtitleIndexForTimerRef.current = idx;
                  setCurrentSubtitleIndexState(idx);
                }
              } catch {}
            }, 1000);

            // 每 5 秒儲存一次進度
            saveTimer = setInterval(() => {
              try {
                const t = ytPlayerRef.current?.getCurrentTime?.();
                if (typeof t === 'number' && activeVideoMaterialId) {
                  saveVideoProgress(activeVideoMaterialId, t);
                }
              } catch {}
            }, 5000);
          },
        },
      });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== "undefined" && (window as any).YT?.Player) {
      initPlayer();
    } else {
      if (typeof window === "undefined") return;
      if (!(window as any)._ytApiLoading) {
        (window as any)._ytApiLoading = true;
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
      // 等待 YouTube API 載入完成
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prev = (window as any).onYouTubeIframeAPIReady;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        initPlayer();
      };
    }

    return () => {
      if (timer) clearInterval(timer);
      if (saveTimer) clearInterval(saveTimer);
      // 離開時儲存最後進度
      try {
        const t = ytPlayerRef.current?.getCurrentTime?.();
        if (typeof t === 'number' && activeVideoMaterialId) {
          saveVideoProgress(activeVideoMaterialId, t);
        }
      } catch {}
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showVideoPanel, activeVideoData?.videoUrl]);

  // HTML5 video 字幕同步：監聽 ontimeupdate 事件
  useEffect(() => {
    if (!showVideoPanel || !activeVideoData?.videoUrl) return;
    if (isYouTubeUrl(activeVideoData.videoUrl)) return; // YouTube 由 YT.Player 處理

    const video = html5VideoRef.current;
    if (!video) return;

    let lastSavedSec = -1;
    const handleTimeUpdate = () => {
      const sec = Math.floor(video.currentTime);
      ytCurrentSecRef.current = sec;
      // 每 5 秒儲存一次進度
      if (activeVideoMaterialId && sec > 0 && sec !== lastSavedSec && sec % 5 === 0) {
        lastSavedSec = sec;
        saveVideoProgress(activeVideoMaterialId, sec);
      }
      const lines = parsedTranscriptLinesRef.current;
      if (!lines.length) return;
      let idx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].seconds <= sec) idx = i;
        else break;
      }
      if (idx !== prevSubtitleIndexForTimerRef.current) {
        prevSubtitleIndexForTimerRef.current = idx;
        setCurrentSubtitleIndexState(idx);
      }
    };

    // 設定起始進度
    if (activeVideoMaterialId) {
      const savedTime = loadVideoProgress(activeVideoMaterialId);
      if (savedTime > 0) {
        video.currentTime = savedTime;
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      // 離開時儲存最後進度
      if (activeVideoMaterialId && video.currentTime > 5) {
        saveVideoProgress(activeVideoMaterialId, video.currentTime);
      }
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showVideoPanel, activeVideoData?.videoUrl]);

  // 字幕個人校正資料
  const { data: myEditsData, refetch: refetchMyEdits } = trpc.transcriptCorrections.getMyEdits.useQuery(
    { materialId: activeVideoMaterialId! },
    { enabled: !!activeVideoMaterialId }
  );
  // 建立 lineIndex -> correctedText 的 map
  const myEditsMap = React.useMemo(() => {
    const map: Record<number, string> = {};
    if (myEditsData) {
      for (const edit of myEditsData as any[]) {
        map[edit.line_index] = edit.corrected_text;
      }
    }
    return map;
  }, [myEditsData]);

  // 查詢所有 pending 送審行（其他同學送審中）
  const { data: pendingLinesData } = trpc.transcriptCorrections.getPendingLines.useQuery(
    { materialId: activeVideoMaterialId! },
    { enabled: !!activeVideoMaterialId, refetchInterval: 30000 }
  );
  const pendingLinesMap = React.useMemo(() => {
    const map: Record<number, string> = {};
    if (pendingLinesData?.lines) {
      for (const l of pendingLinesData.lines) {
        map[l.lineIndex] = l.correctedText;
      }
    }
    return map;
  }, [pendingLinesData]);
  const allPendingLines = React.useMemo(() => {
    const merged = new Set(pendingSubtitleLines);
    if (pendingLinesData?.lines) {
      for (const l of pendingLinesData.lines) merged.add(l.lineIndex);
    }
    return merged;
  }, [pendingSubtitleLines, pendingLinesData]);

  // 查詢已審核通過的行（顯示「已訂正」標籤）
  const { data: approvedLinesData } = trpc.transcriptCorrections.getApprovedLines.useQuery(
    { materialId: activeVideoMaterialId! },
    { enabled: !!activeVideoMaterialId, refetchInterval: 60000 }
  );
  const approvedLinesMap = React.useMemo(() => {
    const map: Record<number, boolean> = {};
    if (approvedLinesData?.lines) {
      for (const l of approvedLinesData.lines) map[l.lineIndex] = true;
    }
    return map;
  }, [approvedLinesData]);

  // 管理者身份
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // 管理者直接覆蓋教材字幕 mutation
  const adminOverwriteMutation = trpc.transcriptCorrections.adminOverwriteLine.useMutation({
    onSuccess: (data) => {
      setEditingSubtitleIndex(null);
      toast.success('字幕已直接覆蓋更新');
      // 即時更新本地字幕顯示，不需重新載入頁面
      if (data?.lineIndex !== undefined && data?.updatedLine !== undefined) {
        setLocalTranscriptOverrides(prev => ({
          ...prev,
          [data.lineIndex]: data.updatedLine,
        }));
      }
    },
    onError: (err) => toast.error(err.message || '覆蓋失敗'),
  });

  const savePersonalEditMutation = trpc.transcriptCorrections.savePersonalEdit.useMutation({
    onSuccess: () => { refetchMyEdits(); toast.success('個人校正已儲存'); },
    onError: () => toast.error('儲存失敗'),
  });

  const submitCorrectionMutation = trpc.transcriptCorrections.submitCorrectionRequest.useMutation({
    onSuccess: (_data, variables) => {
      setShowSubmitDialog(null);
      setSubmitReason('');
      setEditingSubtitleIndex(null);
      // 鎖定該行，禁止再次送審
      setPendingSubtitleLines(prev => new Set([...prev, variables.lineIndex]));
      toast.success('已提交審核，感謝您的貢獻！');
    },
    onError: (err) => {
      if (err.message?.includes('已有待審核')) {
        toast.error('此行字幕已有同學送審，請等待審核完成');
      } else {
        toast.error('提交失敗，請稍後再試');
      }
    },
  });

  // 解析逐字稿為帶時間點的行陣列
  const parsedTranscriptLines = React.useMemo(() => {
    if (!activeVideoData?.transcript) return [];
    const lines = activeVideoData.transcript.split('\n').filter(l => l.trim());
    const result = lines.map((line, lineIndex) => {
      // 如果管理者已覆蓋此行，使用覆蓋後的文字
      const overriddenLine = localTranscriptOverrides[lineIndex] !== undefined
        ? localTranscriptOverrides[lineIndex]
        : line;
      const match = overriddenLine.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*(.*)$/);
      if (match) {
        return { seconds: timestampToSeconds(`[${match[1]}]`), text: match[2], timestamp: `[${match[1]}]`, lineIndex, originalText: match[2] };
      }
      return null;
    }).filter(Boolean) as Array<{ seconds: number; text: string; timestamp: string; lineIndex: number; originalText: string }>;
    // 同步更新 ref，供輪詢計算使用（避免關閉問題）
    parsedTranscriptLinesRef.current = result;
    // 重置字幕行記錄
    prevSubtitleIndexForTimerRef.current = -1;
    return result;
  }, [activeVideoData?.transcript, localTranscriptOverrides]);

  // 當前字幕高亮行索引（由輪詢計算後經 setCurrentSubtitleIndexState 更新）
  const currentSubtitleIndex = currentSubtitleIndexState;

  // 字幕初始化：字幕資料載入後自動捲到頂端
  // 用 setTimeout 確保 DOM 渲染完成後再置頂
  useEffect(() => {
    if (parsedTranscriptLines.length > 0) {
      const t = setTimeout(() => {
        if (subtitleRef.current) subtitleRef.current.scrollTop = 0;
      }, 50);
      return () => clearTimeout(t);
    }
  }, [parsedTranscriptLines]);

  // 字幕展開時也置頂
  useEffect(() => {
    if (showSubtitles) {
      const t = setTimeout(() => {
        if (subtitleRef.current) subtitleRef.current.scrollTop = 0;
      }, 50);
      return () => clearTimeout(t);
    }
  }, [showSubtitles]);

  // 字幕捲軸邏輯：
  // 1. 正常播放：高亮在可見區內不動；高亮到達最底行時，容器往上推一行（KTV）
  // 2. 用戶手動拉動後放開：將高亮行捲回最頂端，繼續 KTV 效果
  const prevSubtitleIndexRef = useRef<number>(-1);
  // 用戶是否正在手動拉動（還沒放開）
  const isUserDraggingRef = useRef<boolean>(false);
  // 放開後需要重置回頂端的標記
  const needResetToTopRef = useRef<boolean>(false);

  useEffect(() => {
    // 只有高亮行真的切換到新的一行時才觸發捲動
    if (currentSubtitleIndex === prevSubtitleIndexRef.current) return;
    prevSubtitleIndexRef.current = currentSubtitleIndex;

    if (currentSubtitleIndex < 0 || !subtitleRef.current) return;
    const container = subtitleRef.current;
    const el = container.querySelector(`[data-idx="${currentSubtitleIndex}"]`) as HTMLElement;
    if (!el) return;

    const containerScrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const elTop = el.offsetTop;
    const elHeight = el.offsetHeight;
    const elBottom = elTop + elHeight;
    const visibleBottom = containerScrollTop + containerHeight;

    // 用戶手動拉動放開後：將高亮行捲回頂端（頂端對齊）
    if (needResetToTopRef.current) {
      needResetToTopRef.current = false;
      container.scrollTop = elTop;
      return;
    }

    // 高亮在可見區內：不捲動（KTV 效果：等到走到底部才推）
    if (elBottom <= visibleBottom && elTop >= containerScrollTop) {
      return;
    }

    // 高亮超出可見區底部：往上推一個容器高度（等同按一下視窗往下捲動）
    if (elBottom > visibleBottom) {
      container.scrollTop = containerScrollTop + containerHeight;
    }
    // 高亮在可見區上方（手動往上拉後時間點跟上）：捲回頂端
    else if (elTop < containerScrollTop) {
      container.scrollTop = elTop;
    }
  }, [currentSubtitleIndex]);

  // 輪詢查詢待審字幕狀態，審核後自動解鎖
  useEffect(() => {
    if (!activeVideoMaterialId || pendingSubtitleLines.size === 0) return;
    const interval = setInterval(async () => {
      try {
        const lineIndexes = Array.from(pendingSubtitleLines);
        // 直接呼叫 tRPC 查詢（使用 fetch 避免 hook 限制）
        const res = await fetch(`/api/trpc/transcriptCorrections.getCorrectionStatus?input=${encodeURIComponent(JSON.stringify({ materialId: activeVideoMaterialId, lineIndexes }))}`, {
          credentials: 'include',
        });
        if (!res.ok) return;
        const json = await res.json();
        const statuses: Record<number, string> = json?.result?.data?.statuses || {};
        // 移除已審核（approved 或 rejected）的行
        const toUnlock = lineIndexes.filter(idx => statuses[idx] === 'approved' || statuses[idx] === 'rejected');
        if (toUnlock.length > 0) {
          setPendingSubtitleLines(prev => {
            const next = new Set(prev);
            toUnlock.forEach(idx => next.delete(idx));
            return next;
          });
        }
      } catch {}
    }, 15000); // 每 15 秒輪詢一次
    return () => clearInterval(interval);
  }, [activeVideoMaterialId, pendingSubtitleLines]);

  // 解析 AI 摘要
  const parsedSummary = activeVideoData?.videoSummary
    ? (() => { try { return JSON.parse(activeVideoData.videoSummary); } catch { return null; } })()
    : null;

  useEffect(() => {
    if (!faqData?.topFAQs || faqData.topFAQs.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentHotQuestionIndex((prev) =>
        prev === faqData.topFAQs.length - 1 ? 0 : prev + 1
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [faqData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // 判斷當前課程是否已解鎖
  const currentCourseEnrollment = courseId ? myEnrollments?.find(e => e.courseId === courseId) : null;
  // 限班內生課程：檢查 sessionStorage 中是否已驗證
  const isClassVerified = courseId ? (() => {
    try {
      const verifiedCourses: string[] = JSON.parse(sessionStorage.getItem('class_verified_courses') || '[]');
      return verifiedCourses.includes(String(courseId));
    } catch { return false; }
  })() : false;
  const isCourseUnlocked = !courseId || isClassVerified || (currentCourseEnrollment?.isUnlocked === true);

  // 如果有 courseId：已解鎖課程顯示全部章節；未解鎖只顯示試閱章節（isReleased=1）
  const filteredMaterials = materials?.filter((material) => {
    // 搜尋過濾
    const matchSearch = material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    // 已解鎖課程：顯示全部章節；未解鎖：只顯示試閱章節
    const matchReleased = !courseId || isCourseUnlocked || material.isReleased === 1;
    return matchSearch && matchReleased;
  });

  const toggleExpand = (materialId: number) => {
    setExpandedMaterialIds((prev) =>
      prev.includes(materialId)
        ? prev.filter((id) => id !== materialId)
        : [...prev, materialId]
    );
  };

  const chatMutation = trpc.materialContents.chat.useMutation();

  const clearConversationMutation = trpc.materialContents.clearConversation.useMutation({
    onSuccess: () => {
      setChatHistory([]);
      toast.success("對話記錄已清除");
    },
    onError: () => {
      toast.error("清除失敗，請稍後再試");
    }
  });

  const saveAnswerMutation = trpc.savedAnswers.save.useMutation({
    onSuccess: (data, variables) => {
      setChatHistory(prev => {
        const newHistory = [...prev];
        const idx = newHistory.findIndex(
          (msg, i) => msg.role === "assistant" &&
          i > 0 &&
          newHistory[i-1].role === "user" &&
          newHistory[i-1].content === variables.question
        );
        if (idx >= 0) {
          newHistory[idx] = { ...newHistory[idx], savedId: data.id };
        }
        return newHistory;
      });
      refetchSaved();
      toast.success("已收藏此回答");
    },
    onError: () => {
      toast.error("收藏失敗，請稍後再試");
    }
  });

  const unsaveAnswerMutation = trpc.savedAnswers.unsave.useMutation({
    onSuccess: (_, variables) => {
      setChatHistory(prev =>
        prev.map(msg =>
          msg.savedId === variables.id ? { ...msg, savedId: null } : msg
        )
      );
      refetchSaved();
      toast.success("已取消收藏");
    },
    onError: () => {
      toast.error("取消收藏失敗，請稍後再試");
    }
  });

  // 帶入提問框：將章節摘要內容貼入輸入框，後面加上請說明詞
  const handleSectionAsk = (sectionId: number, title: string, content: string) => {
    setActiveSectionId(sectionId);
    setActiveSectionTitle(title);
    setActiveSectionContent(content);
    setMessage(`${content}請說明這段話的重點`);
  };

  // 核心發送函式（可傳入自訂訊息，不依賴 input state）
  const sendMessage = async (msgText: string, imageData?: string | null) => {
    if (!msgText.trim() && !imageData) return;
    if (!teacherId || chatMutation.isPending) return;

    const finalText = msgText.trim() || '請幫我解釋這張截圖的內容';
    
    // 帶入提問框模式：將章節內容加入系統 prompt
    const currentSectionId = activeSectionId;
    const currentSectionTitle = activeSectionTitle;
    const currentSectionContent = activeSectionContent;
    // 發送後清除章節資訊（只用一次）
    setActiveSectionId(undefined);
    setActiveSectionTitle(undefined);
    setActiveSectionContent(undefined);
    
    setChatHistory((prev) => [
      ...prev,
      { role: "user", content: finalText, image: imageData || undefined }
    ]);

    // 帶入提問框模式： finalText 已包含摘要內容+請說明詞，直接傳送即可
    const messageWithContext = finalText;

    // 將目前對話歷史傳入後端，讓 AI 能针對上一輪回答繼續對話
    // 排除 __QUIZ__ 和空內容，只取最近 10 輪避免 token 過多
    const currentHistory = chatHistory
      .filter(m => (m.role === 'user' || m.role === 'assistant') && m.content && m.content !== '__QUIZ__')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: typeof m.content === 'string' ? m.content : '' }))
      .slice(-20); // 最近 20 條（即 10 輪對話）

    try {
      const response = await chatMutation.mutateAsync({
        teacherId,
        materialIds: selectedMaterialIds.length > 0 ? selectedMaterialIds : undefined,
        message: messageWithContext,
        image: imageData || undefined,
        conversationHistory: currentHistory.length > 0 ? currentHistory : undefined,
      });

      const rawAnswer = response.answer;

      // 偵測是否為小測驗
      if (rawAnswer.startsWith("__QUIZ__")) {
        try {
          const quizJson = rawAnswer.slice("__QUIZ__".length);
          const quizData: QuizData = JSON.parse(quizJson);
          setChatHistory((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "__QUIZ__",
              quizData,
              sources: response.sources,
              savedId: null,
            }
          ]);
        } catch (e) {
          setChatHistory((prev) => [
            ...prev,
            { role: "assistant", content: "測驗資料解析失敗，請再試一次。", savedId: null }
          ]);
        }
      } else {
        setChatHistory((prev) => [
          ...prev,
          {
            role: "assistant",
            content: rawAnswer,
            sources: response.sources,
            savedId: null,
          }
        ]);
      }
      // AI 回覆完成後，自動 focus 輸入框
      setTimeout(() => chatInputRef.current?.focus(), 100);
    } catch (error) {
      console.error("對話錯誤:", error);
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "抱歉，發生錯誤。請稍後再試。",
          savedId: null
        }
      ]);
      setTimeout(() => chatInputRef.current?.focus(), 100);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() && !pastedImage) return;
    const text = message;
    const img = pastedImage;
    setMessage("");
    setPastedImage(null);
    await sendMessage(text, img);
  };

  const handleSaveAnswer = (msgIndex: number) => {
    if (!teacherId) return;
    const assistantMsg = chatHistory[msgIndex];
    const userMsg = msgIndex > 0 ? chatHistory[msgIndex - 1] : null;
    if (!assistantMsg || assistantMsg.role !== "assistant") return;
    setSavingIndex(msgIndex);
    saveAnswerMutation.mutate({
      lectureTeacherId: teacherId,
      question: userMsg?.content || "",
      answer: assistantMsg.content,
    }, {
      onSettled: () => setSavingIndex(null)
    });
  };

  const handleUnsaveAnswer = (msgIndex: number) => {
    const assistantMsg = chatHistory[msgIndex];
    if (!assistantMsg?.savedId) return;
    unsaveAnswerMutation.mutate({ id: assistantMsg.savedId });
  };

  if (teacherLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">找不到老師資訊</p>
      </div>
    );
  }

  const subjectName = teacher.subjects?.[0]?.name || "課程";
  // 從已購課課程中找到課程名稱（myEnrollments 已在上方宣告）
  const currentCourseName = courseId ? myEnrollments?.find(e => e.courseId === courseId)?.courseName : null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 頂部標題 */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 flex-wrap">
            <BookOpen className="h-6 w-6 text-blue-600" />
            {currentCourseName ? currentCourseName : `${subjectName}(${teacher.name})`} - 學習專區
            {courseId && !isCourseUnlocked && (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-orange-700 bg-orange-100 border border-orange-300 px-2 py-0.5 rounded-full">
                👁️ 試閱中
              </span>
            )}
          </h1>
          <Link href="/teacher-material-learning">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              回教材QA專區
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          基於講義內容的智能學習助手
        </p>
      </div>

      {/* 主要內容區（左右分欄） */}
      <div className="flex-1 flex" style={{ minHeight: 0 }}>
        {/* 左側收起按鈕（左側欄收起時顯示） */}
        {sidebarCollapsed && (
          <div style={{ position: 'sticky', top: 0, height: '100vh', zIndex: 10 }} className="flex flex-col items-center pt-4 border-r bg-gray-50 w-10">
            <button
              className="text-gray-400 hover:text-blue-600 p-1 rounded"
              title="展開左側欄"
              onClick={() => setSidebarCollapsed(false)}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
        {/* 左側：常見問題 + AI摘要 Tab */}
        <div className={`border-r bg-gray-50 flex flex-col transition-all duration-200 ${sidebarCollapsed ? 'hidden' : 'w-80'}`} style={{ position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
          <div className="px-3 pt-3 pb-0 border-b">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-1">
                <button
                  className={`px-3 py-1.5 text-sm font-medium rounded-t border-b-2 transition-colors ${
                    leftTabIndex === 0 ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => { setLeftTabIndex(0); setShowSavedAnswers(false); }}
                >常見問題</button>
                <button
                  className={`px-3 py-1.5 text-sm font-medium rounded-t border-b-2 transition-colors ${
                    leftTabIndex === 1 ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setLeftTabIndex(1)}
                >🎓 AI摘要</button>
              </div>
              <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`flex items-center gap-1 text-xs ${showSavedAnswers ? 'text-yellow-600' : 'text-gray-500'}`}
                    onClick={() => { setLeftTabIndex(0); setShowSavedAnswers(true); }}
                  >
                    <Bookmark className="h-4 w-4" />
                    收藏
                    {savedAnswersData && savedAnswersData.total > 0 && (
                      <span className="bg-yellow-100 text-yellow-700 text-xs rounded-full px-1.5 py-0.5 font-semibold">
                        {savedAnswersData.total}
                      </span>
                    )}
                  </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-blue-600 h-7 w-7 p-0"
                  title="收起左側欄"
                  onClick={() => setSidebarCollapsed(true)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {leftTabIndex === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {showSavedAnswers ? "點擊問題重新查看收藏的回答" : "點擊問題快速獲得答案"}
              </p>
            )}
          </div>

          {leftTabIndex === 0 && showSavedAnswers && (
            <ScrollArea className="flex-1 h-0 px-4 pt-3">
              {savedAnswersData && savedAnswersData.items.length > 0 ? (
                <div className="space-y-2 pb-4">
                  {savedAnswersData.items.map((item) => (
                    <div
                      key={item.id}
                      className="border rounded-lg bg-white p-3 cursor-pointer hover:bg-yellow-50 transition-colors"
                      onClick={() => {
                        setChatHistory((prev) => [
                          ...prev,
                          { role: "user", content: item.question },
                          { role: "assistant", content: item.answer, savedId: item.id }
                        ]);
                        setShowSavedAnswers(false);
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <Star className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-700 line-clamp-2">{item.question}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 ml-5">
                        {new Date(item.createdAt).toLocaleDateString('zh-TW')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Star className="h-10 w-10 text-gray-200 mb-2" />
                  <p className="text-sm text-muted-foreground">尚無收藏</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    點擊 AI 回覆旁的星星圖示來收藏
                  </p>
                </div>
              )}
            </ScrollArea>
          )}
          {leftTabIndex === 0 && !showSavedAnswers && (
            <ScrollArea className="flex-1 h-0 px-4 pt-3">
              {faqsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : faqData && faqData.materials.length > 0 ? (
                <div className="space-y-3 pb-4">
                  {false && faqData.topFAQs && faqData.topFAQs.length > 0 && (
                    <div className="border rounded-lg bg-white p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-orange-600">🔥 熱門問題</p>
                        <div className="flex items-center gap-1">
                          <button
                            className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                            onClick={() => setCurrentHotQuestionIndex(prev => prev === 0 ? faqData.topFAQs.length - 1 : prev - 1)}
                          >
                            <ChevronRight className="h-3 w-3 rotate-180" />
                          </button>
                          <span className="text-xs text-gray-400">{currentHotQuestionIndex + 1}/{faqData.topFAQs.length}</span>
                          <button
                            className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                            onClick={() => setCurrentHotQuestionIndex(prev => prev === faqData.topFAQs.length - 1 ? 0 : prev + 1)}
                          >
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div
                        className="p-2 bg-orange-50 rounded cursor-pointer hover:bg-orange-100 transition-colors"
                        onClick={() => {
                          const faq = faqData.topFAQs[currentHotQuestionIndex];
                          setChatHistory((prev) => [
                            ...prev,
                            { role: "user", content: faq.question },
                            { role: "assistant", content: faq.answer, savedId: null }
                          ]);
                        }}
                      >
                        <p className="text-sm text-gray-800">{faqData.topFAQs[currentHotQuestionIndex]?.question}</p>
                      </div>
                      <div className="flex justify-center gap-1 mt-2">
                        {faqData.topFAQs.map((_, i) => (
                          <button
                            key={i}
                            className={`rounded-full transition-all ${i === currentHotQuestionIndex ? 'w-4 h-1.5 bg-orange-500' : 'w-1.5 h-1.5 bg-gray-300'}`}
                            onClick={() => setCurrentHotQuestionIndex(i)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {faqData.materials.map((item) => (
                    <div key={item.material.id} className="border rounded-lg bg-white">
                      <div
                        className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          toggleExpand(item.material.id);
                          // 若有影片，自動設定為主動影片
                          if (item.material.videoUrl) {
                            setActiveVideoMaterialId(item.material.id);
                            setShowVideoPanel(true);
                            // 若目前是純對話模式，切換回 3:7 模式
                            if (layoutMode === 5) setLayoutMode(1);
                          } else {
                            // 沒有影片的章節，自動切換到純對話模式，並清除影片資料
                            setLayoutMode(5);
                            setShowVideoPanel(false);
                            setActiveVideoMaterialId(null);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <BookOpen className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <span className="text-sm font-medium break-words leading-snug">{item.material.title}</span>
                          {item.material.videoUrl && (
                            <span className="text-blue-400 text-xs" title="此章節有影片">🎬</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs">
                            {item.count > 0 ? (
                              <span className="text-green-600 font-semibold">✅ {item.count}則</span>
                            ) : (
                              <span className="text-orange-600">⚠️ 未生成</span>
                            )}
                          </span>
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${
                              expandedMaterialIds.includes(item.material.id) ? 'rotate-90' : ''
                            }`}
                          />
                        </div>
                      </div>

                      {expandedMaterialIds.includes(item.material.id) && item.faqs.length > 0 && (
                        <div className="border-t px-3 py-2 space-y-2">
                          {item.faqs.map((faq, index) => (
                            <div
                              key={faq.id}
                              className="p-2 bg-gray-50 rounded hover:bg-blue-50 cursor-pointer transition-colors"
                              onClick={() => {
                                setChatHistory((prev) => [
                                  ...prev,
                                  { role: "user", content: faq.question },
                                  { role: "assistant", content: faq.answer, savedId: null }
                                ]);
                              }}
                            >
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-semibold text-blue-600 mt-0.5">Q{index + 1}</span>
                                <p className="text-xs flex-1">{faq.question}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-300 mb-2" />
                  <p className="text-sm text-muted-foreground">暫無常見問題</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    請到講義管理頁面點擊 ✨ 按鈕生成
                  </p>
                </div>
              )}
            </ScrollArea>
          )}
          {leftTabIndex === 1 && (
            /* Tab 1: AI摘要 */
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {!activeVideoData ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span className="text-3xl mb-3">🎓</span>
                  <p className="text-sm text-gray-500">請點擊左側有 🎥 圖示的章節</p>
                  <p className="text-xs text-gray-400 mt-1">開啟影片後即可查看 AI 摘要</p>
                </div>
              ) : !parsedSummary?.summaries?.length ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span className="text-3xl mb-3">📝</span>
                  <p className="text-sm text-gray-500">尚未生成摘要</p>
                  <p className="text-xs text-gray-400 mt-1">請到後台講義管理 → 影片管理觸發生成</p>
                </div>
              ) : (
                <SummaryList summaries={parsedSummary.summaries} seekToTime={seekToTime} timestampToSeconds={timestampToSeconds} setShowVideoPanel={setShowVideoPanel} onSectionAsk={handleSectionAsk} />
              )}
            </div>
          )}
        </div>

        {/* 右側：影片欄 + 對話欄（水平並排） */}
        <div className="flex-1 flex flex-row bg-white" style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', minWidth: 0 }}>

          {/* 影片欄（左側）：標題列 + 影片 + 字幕 */}
          {showVideoPanel && activeVideoData && (
            <div
              className="bg-gray-900 text-white flex-shrink-0 flex flex-col"
              style={{
                width: layoutMode === 5 ? '0%' :
                       layoutMode === 3 ? '70%' :
                       layoutMode === 2 ? '50%' : '35%',
                display: layoutMode === 5 ? 'none' : undefined,
                overflow: 'hidden',
                height: '100%',
              }}
            >
              {/* 第一行：章節名稱 */}
              <div className="flex items-center justify-between px-3 pt-1.5 pb-0.5">
                <span className="text-sm font-medium flex items-center gap-2 truncate">
                  🎬 {activeVideoData.title || '影片課程'}
                </span>
              </div>
              {/* 第二行：版面切換按鈕 */}
              <div className="flex items-center gap-1 px-3 pb-1.5">
                {([1,2,3] as const).map((mode) => {
                  const labels: Record<number, string> = { 1: '3:7', 2: '1:1', 3: '7:3' };
                  const hints: Record<number, string> = { 1: '邊上課邊對話', 2: '影片與對話各半', 3: '影片加字幕為主 (7:3)' };
                  return (
                    <button
                      key={mode}
                      title={hints[mode]}
                      className={`text-xs px-2 py-0.5 rounded transition-colors ${
                        layoutMode === mode
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                      onClick={() => {
                        setLayoutMode(mode);
                        // 儲存選擇的比例模式到 localStorage
                        localStorage.setItem('teacherLearningZone_layoutMode', String(mode));
                      }}
                    >{labels[mode]}</button>
                  );
                })}

              </div>
              {/* 影片內容區塊 */}
              <div ref={dragContainerRef} className="flex-1 flex flex-col">
                  {(() => {
                    if (!activeVideoData.videoUrl) {
                      return (
                        <div className="flex items-center justify-center bg-gray-800" style={{ width: '100%', aspectRatio: '16/9' }}>
                          <p className="text-gray-400 text-sm">影片連結無效</p>
                        </div>
                      );
                    }
                    // YouTube 連結：用 YT.Player IFrame API
                    if (isYouTubeUrl(activeVideoData.videoUrl)) {
                      return (
                        <div style={{ width: '100%', aspectRatio: '16/9' }}>
                          {/* YT.Player 會自動在此 div 裡建立 iframe */}
                          <div
                            ref={ytPlayerContainerRef}
                            id="yt-player-container"
                            style={{ width: '100%', height: '100%' }}
                          />
                        </div>
                      );
                    }
                    // 其他連結（MP4、HLS 等）：用 HTML5 video 標籤
                    return (
                      <div style={{ width: '100%', aspectRatio: '16/9', background: '#000' }}>
                        <video
                          ref={html5VideoRef}
                          src={activeVideoData.videoUrl}
                          controls
                          style={{ width: '100%', height: '100%' }}
                          onError={() => {}}
                        >
                          您的瀏覽器不支援 HTML5 影片播放。
                        </video>
                      </div>
                    );
                  })()}
                  {/* 同步字幕區塊（全螢幕模式不顯示） */}
                  {parsedTranscriptLines.length > 0 && (
                    <div className="bg-gray-900 border-t border-gray-700" style={{ width: '100%' }}>
                      <div className="flex items-center px-2 py-1">
                        <span className="text-xs text-gray-400">📝 字幕</span>
                      </div>
                      <div className="px-3 pb-3">
                          {(() => {
                            const line = parsedTranscriptLines[currentSubtitleIndex];
                            if (!line) return (
                              <p className="text-gray-500 text-sm text-center py-2">等待播放...</p>
                            );
                            const myEdit = myEditsMap[line.lineIndex];
                            const pendingCorrected = pendingLinesMap[line.lineIndex];
                            // 優先順序： pending 校正 > 個人校正 > 原始字幕
                            const displayText = pendingCorrected ?? myEdit ?? line.text;
                            const isPendingLocked = allPendingLines.has(line.lineIndex);
                            const isEditing = !isPendingLocked && editingSubtitleIndex === currentSubtitleIndex;
                            if (isEditing) {
                              return (
                                <div className="flex flex-col gap-1">
                                  <input
                                    className="w-full bg-gray-700 text-white text-sm rounded px-2 py-1 border border-blue-500 outline-none"
                                    value={editingSubtitleText}
                                    onChange={e => setEditingSubtitleText(e.target.value)}
                                    autoFocus
                                    onKeyDown={e => { if (e.key === 'Escape') setEditingSubtitleIndex(null); }}
                                  />
                                  <div className="flex gap-1 justify-end">
                                    <button className="text-[10px] text-gray-400 hover:text-gray-200 px-1" onClick={() => setEditingSubtitleIndex(null)}>取消</button>
                                    {isAdmin ? (
                                      <button
                                        className="text-[10px] bg-green-600 hover:bg-green-500 text-white px-2 py-0.5 rounded"
                                        disabled={adminOverwriteMutation.isPending}
                                        onClick={() => {
                                          if (!activeVideoMaterialId) return;
                                          adminOverwriteMutation.mutate({
                                            materialId: activeVideoMaterialId,
                                            lineIndex: line.lineIndex,
                                            newText: editingSubtitleText,
                                          });
                                        }}
                                      >{adminOverwriteMutation.isPending ? '覆蓋中...' : '直接覆蓋字幕'}</button>
                                    ) : (
                                      <>
                                        <button
                                          className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded"
                                          onClick={() => {
                                            if (!activeVideoMaterialId) return;
                                            savePersonalEditMutation.mutate({
                                              materialId: activeVideoMaterialId,
                                              lineIndex: line.lineIndex,
                                              timestamp: line.timestamp,
                                              originalText: line.originalText,
                                              correctedText: editingSubtitleText,
                                            });
                                            setEditingSubtitleIndex(null);
                                          }}
                                        >儲存個人版本</button>
                                        <button
                                          className="text-[10px] bg-orange-600 hover:bg-orange-500 text-white px-2 py-0.5 rounded"
                                          onClick={() => setShowSubmitDialog(currentSubtitleIndex)}
                                        >提交審核</button>
                                      </>
                                    )}
                                  </div>
                                  {showSubmitDialog === currentSubtitleIndex && (
                                    <div className="bg-gray-700 rounded p-2 border border-orange-500">
                                      <p className="text-[10px] text-orange-300 mb-1">提交給管理者審核，通過後將覆蓋所有人的字幕</p>
                                      <input
                                        className="w-full bg-gray-600 text-white text-xs rounded px-1 py-0.5 border border-gray-500 outline-none mb-1"
                                        placeholder="校正理由（選填）"
                                        value={submitReason}
                                        onChange={e => setSubmitReason(e.target.value)}
                                      />
                                      <div className="flex gap-1 justify-end">
                                        <button className="text-[10px] text-gray-400 hover:text-gray-200 px-1" onClick={() => setShowSubmitDialog(null)}>取消</button>
                                        <button
                                          className="text-[10px] bg-orange-600 hover:bg-orange-500 text-white px-2 py-0.5 rounded"
                                          onClick={() => {
                                            if (!activeVideoMaterialId) return;
                                            submitCorrectionMutation.mutate({
                                              materialId: activeVideoMaterialId,
                                              lineIndex: line.lineIndex,
                                              timestamp: line.timestamp,
                                              originalText: line.originalText,
                                              correctedText: editingSubtitleText || displayText,
                                              reason: submitReason,
                                            });
                                          }}
                                          disabled={submitCorrectionMutation.isPending}
                                        >{submitCorrectionMutation.isPending ? '提交中...' : '確認提交'}</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <div className="flex items-center gap-2 px-1">
                                <p className="text-yellow-300 text-base font-bold leading-relaxed select-none flex-1 text-center">
                                  {displayText}
                                  {pendingCorrected && <span className="ml-1 text-[10px] text-orange-400">[審核中]</span>}
                                  {!pendingCorrected && approvedLinesMap[line.lineIndex] && <span className="ml-1 text-[10px] text-emerald-400">[已訂正]</span>}
                                  {!pendingCorrected && !approvedLinesMap[line.lineIndex] && myEdit && <span className="ml-1 text-[10px] text-green-400">[已校正]</span>}
                                </p>
                                {isPendingLocked ? (
                                  <div className="flex-shrink-0 flex flex-col items-center text-orange-400 cursor-not-allowed" title="此行字幕已送審，待審核中">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                    <span className="text-[9px] mt-0.5">審核中</span>
                                  </div>
                                ) : (
                                <button
                                  title="更正字幕（過審送 1 點）"
                                  className="flex-shrink-0 flex flex-col items-center text-gray-400 hover:text-yellow-300 transition-colors"
                                  onClick={() => {
                                    if (ytPlayerRef.current?.pauseVideo) ytPlayerRef.current.pauseVideo();
                                    setEditingSubtitleIndex(currentSubtitleIndex);
                                    setEditingSubtitleText(displayText);
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                  </svg>
                                  <span className="text-[9px] mt-0.5">更正</span>
                                  <span className="text-[10px] text-yellow-400 font-semibold leading-tight whitespace-nowrap">★過審送 1點</span>
                                </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                  )}
                </div>
              </div>
          )}
          {/* 影片展開按鈕（已有影片但面板收起時） */}
          {!showVideoPanel && activeVideoData?.videoUrl && (
            <div className="border-b px-4 py-1.5 bg-gray-50 flex items-center gap-2">
              <span className="text-xs text-gray-500">🎬 此章節有影片課程</span>
              <button
                className="text-xs text-blue-500 hover:underline"
                onClick={() => setShowVideoPanel(true)}
              >展開播放器 ▼</button>
            </div>
          )}

          {/* 對話欄（右側）：標題列 + 訊息區 + 輸入框 */}
          <div
            className="flex-1 flex flex-col min-w-0 bg-white"
            style={{ overflow: 'hidden' }}
          >
          {/* 對話區標題列（含清除按鈕） */}
          <div className="border-b px-4 py-2 flex items-center justify-between bg-white flex-shrink-0">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              對話記錄
              {chatHistory.length > 0 && (
                <span className="text-xs text-gray-400">（{Math.floor(chatHistory.length / 2)} 則對話）</span>
              )}
            </span>
            {chatHistory.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 h-7 px-2 gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="text-xs">清除對話</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>確認清除對話？</AlertDialogTitle>
                    <AlertDialogDescription>
                      這將清除您與此老師的所有對話記錄，此操作無法復原。
                      收藏的回答不受影響。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-500 hover:bg-red-600"
                      onClick={() => clearConversationMutation.mutate({ teacherId: teacherId! })}
                    >
                      確認清除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* 輸入區（移到上方，永遠可見） */}
          <div className="border-b-2 border-blue-200 p-3 bg-blue-50 space-y-2 flex-shrink-0">
            {/* 快捷按鈕 */}
            <div className="grid grid-cols-4 gap-1.5">
              {(() => {
                const lastAiMsg = [...chatHistory].reverse().find(
                  m => m.role === "assistant" && m.content && m.content !== "__QUIZ__"
                );
                const lastTopic = lastAiMsg
                  ? lastAiMsg.content.replace(/\n|\r/g, " ").trim().slice(0, 80)
                  : "";
                const topicSuffix = lastTopic
                  ? `（針對剛才說明的內容：「${lastTopic}${lastTopic.length >= 80 ? "..." : ""}」）`
                  : "";
                return [
                  { label: "來個小測驗", msg: `來個小測驗${topicSuffix}` },
                  { label: "舉個實例", msg: `舉個實例${topicSuffix}` },
                  { label: "深入解釋", msg: `深入解釋${topicSuffix}` },
                  { label: "相關概念", msg: `相關概念${topicSuffix}` },
                ].map(({ label, msg: quickMsg }) => (
                  <Button
                    key={label}
                    variant="outline"
                    size="sm"
                    className="justify-center text-xs h-7 px-1"
                    disabled={chatMutation.isPending}
                    onClick={() => sendMessage(quickMsg)}
                  >
                    {chatMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : label}
                  </Button>
                ));
              })()}
            </div>
            {/* 截圖預覽 */}
            {pastedImage && (
              <div className="mb-1 relative inline-block">
                <img src={pastedImage} alt="貼上的截圖" className="max-h-20 rounded border border-gray-300 object-contain" />
                <button className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600" onClick={() => setPastedImage(null)} title="移除截圖">×</button>
              </div>
            )}
            {/* 輸入框 */}
            <div className="flex gap-2 items-end">
              <Textarea
                ref={chatInputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="輸入問題或貼上截圖（Ctrl+V）…按 Enter 發送，Shift+Enter 換行"
                disabled={chatMutation.isPending}
                className="flex-1 resize-none min-h-[44px] max-h-[120px] border-2 border-blue-300 focus:border-blue-500 bg-white text-gray-800 placeholder:text-gray-400 rounded-lg shadow-sm"
                rows={1}
              />
              <Button
                onClick={handleSendMessage}
                disabled={(!message.trim() && !pastedImage) || chatMutation.isPending}
                className="shrink-0"
              >
                {chatMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-blue-500 font-medium">📸 可截圖影片板書後貼上（Ctrl+V）直接提問！</p>
          </div>

          {/* 對話記錄 */}
          <ScrollArea className="flex-1 p-4" style={{ minHeight: '200px' }}>
            {chatHistory.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <p className="text-sm text-gray-400">還沒有對話記錄</p>
              </div>
            ) : (
              <div className="space-y-4">
                {chatHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[85%] ${msg.role === "assistant" ? "w-full" : ""}`}>
                      {/* 小測驗：特殊渲染 */}
                      {msg.role === "assistant" && msg.quizData ? (
                        <div className="bg-gray-50 border rounded-xl p-4">
                          <p className="text-sm font-bold text-blue-700 mb-4">📝 來個小測驗！請作答以下 {msg.quizData.questions.length} 道題目：</p>
                          <QuizWidget quizData={msg.quizData} />
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs font-semibold text-gray-500 mb-1">出題來源：</p>
                              {msg.sources.map((source, idx) => (
                                <div key={idx} className="text-xs text-gray-400">
                                  {source.materialTitle} - {source.chapterTitle}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* 一般訊息 */
                        <div
                          className={`rounded-lg px-4 py-3 ${
                            msg.role === "user"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          {msg.image && (
                            <img
                              src={msg.image}
                              alt="截圖"
                              className="max-h-40 rounded mb-2 object-contain"
                            />
                          )}
                          {msg.role === "assistant" ? (
                            <div className="text-sm prose prose-sm max-w-none">
                              <Streamdown>{msg.content}</Streamdown>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          )}
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs font-semibold mb-2">參考來源：</p>
                              {msg.sources.map((source, idx) => (
                                <div key={idx} className="text-xs mb-1">
                                  <span className="font-medium">{source.materialTitle}</span>
                                  {source.chapterTitle && (
                                    <span className="text-gray-600"> - {source.chapterTitle}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* AI 回覆下方的收藏按鈕（一般訊息才顯示） */}
                      {msg.role === "assistant" && !msg.quizData && (
                        <div className="flex items-center gap-2 mt-1 ml-1">
                          {msg.savedId ? (
                            <button
                              className="flex items-center gap-1 text-xs text-yellow-600 hover:text-yellow-700"
                              onClick={() => handleUnsaveAnswer(index)}
                              disabled={unsaveAnswerMutation.isPending}
                            >
                              <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                              已收藏
                            </button>
                          ) : (
                            <button
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-yellow-600 transition-colors"
                              onClick={() => handleSaveAnswer(index)}
                              disabled={savingIndex === index || saveAnswerMutation.isPending}
                            >
                              {savingIndex === index ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Star className="h-3.5 w-3.5" />
                              )}
                              收藏回答
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {/* AI 思考動畫：在等待回覆時顯示 */}
                {chatMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-5 py-3.5 shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="block w-2.5 h-2.5 rounded-full bg-blue-500"
                          style={{ animation: 'thinkingBounce 1.2s ease-in-out infinite', animationDelay: '0ms' }}
                        />
                        <span
                          className="block w-2.5 h-2.5 rounded-full bg-blue-400"
                          style={{ animation: 'thinkingBounce 1.2s ease-in-out infinite', animationDelay: '200ms' }}
                        />
                        <span
                          className="block w-2.5 h-2.5 rounded-full bg-blue-300"
                          style={{ animation: 'thinkingBounce 1.2s ease-in-out infinite', animationDelay: '400ms' }}
                        />
                      </div>
                      <span className="text-sm text-gray-500 font-medium">AI 思考中…</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </ScrollArea>

          </div> {/* 關閉對話欄容器 */}
        </div>
      </div>
    </div>
  );
}
