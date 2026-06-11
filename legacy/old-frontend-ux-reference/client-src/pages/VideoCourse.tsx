import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft,
  MessageCircleQuestion,
  CheckCircle2,
  Clock,
  BookOpen,
  Video,
  Loader2,
  Send,
  Camera,
  X,
  ImageIcon,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { useLocation } from "wouter";
import VideoPlayer, { type VideoPlayerHandle } from "@/components/VideoPlayer";

type View = "courses" | "course-detail" | "unit-player";

// ==================== 圖片裁切元件 ====================
function ImageCropper({
  src,
  onConfirm,
  onCancel,
}: {
  src: string;
  onConfirm: (croppedDataUrl: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [crop, setCrop] = useState({ x: 20, y: 20, w: 260, h: 160 });
  const [dragging, setDragging] = useState<null | { type: string; startX: number; startY: number; origCrop: typeof crop }>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      // 全螢幕模式：取得容器實際寬度，最大不超過可用寬度
      const containerW = containerRef.current?.parentElement?.clientWidth || window.innerWidth * 0.9;
      const containerH = (window.innerHeight - 200); // 減去標題列和按鈕區高度
      const scaleW = containerW / img.naturalWidth;
      const scaleH = containerH / img.naturalHeight;
      const scale = Math.min(scaleW, scaleH, 1); // 不超過原始大小
      const dispW = Math.round(img.naturalWidth * scale);
      const dispH = Math.round(img.naturalHeight * scale);
      setImgSize({ w: dispW, h: dispH });
      setCrop({ x: Math.round(dispW * 0.05), y: Math.round(dispH * 0.05), w: Math.round(dispW * 0.9), h: Math.round(dispH * 0.9) });
    };
    img.src = src;
  }, [src]);

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const getHandle = (mx: number, my: number) => {
    const { x, y, w, h } = crop;
    const r = 10;
    if (Math.abs(mx - x) < r && Math.abs(my - y) < r) return "tl";
    if (Math.abs(mx - (x + w)) < r && Math.abs(my - y) < r) return "tr";
    if (Math.abs(mx - x) < r && Math.abs(my - (y + h)) < r) return "bl";
    if (Math.abs(mx - (x + w)) < r && Math.abs(my - (y + h)) < r) return "br";
    if (mx > x && mx < x + w && my > y && my < y + h) return "move";
    return null;
  };

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const handle = getHandle(mx, my);
    if (handle) {
      e.preventDefault();
      setDragging({ type: handle, startX: mx, startY: my, origCrop: { ...crop } });
    }
  }, [crop]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const dx = mx - dragging.startX;
    const dy = my - dragging.startY;
    const { x, y, w, h } = dragging.origCrop;
    const minSize = 30;
    if (dragging.type === "move") {
      setCrop({
        x: clamp(x + dx, 0, imgSize.w - w),
        y: clamp(y + dy, 0, imgSize.h - h),
        w, h,
      });
    } else if (dragging.type === "tl") {
      const nx = clamp(x + dx, 0, x + w - minSize);
      const ny = clamp(y + dy, 0, y + h - minSize);
      setCrop({ x: nx, y: ny, w: x + w - nx, h: y + h - ny });
    } else if (dragging.type === "tr") {
      const ny = clamp(y + dy, 0, y + h - minSize);
      setCrop({ x, y: ny, w: clamp(w + dx, minSize, imgSize.w - x), h: y + h - ny });
    } else if (dragging.type === "bl") {
      const nx = clamp(x + dx, 0, x + w - minSize);
      setCrop({ x: nx, y, w: x + w - nx, h: clamp(h + dy, minSize, imgSize.h - y) });
    } else if (dragging.type === "br") {
      setCrop({ x, y, w: clamp(w + dx, minSize, imgSize.w - x), h: clamp(h + dy, minSize, imgSize.h - y) });
    }
  }, [dragging, imgSize]);

  const onMouseUp = useCallback(() => setDragging(null), []);

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img || !imgSize.w) return;
    const scaleX = img.naturalWidth / imgSize.w;
    const scaleY = img.naturalHeight / imgSize.h;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(crop.w * scaleX);
    canvas.height = Math.round(crop.h * scaleY);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, crop.x * scaleX, crop.y * scaleY, crop.w * scaleX, crop.h * scaleY, 0, 0, canvas.width, canvas.height);
    onConfirm(canvas.toDataURL("image/png"));
  };

  const { x, y, w, h } = crop;
  const handles = [
    { id: "tl", cx: x, cy: y },
    { id: "tr", cx: x + w, cy: y },
    { id: "bl", cx: x, cy: y + h },
    { id: "br", cx: x + w, cy: y + h },
  ];

  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-3 p-4">
      <p className="text-sm text-gray-600 shrink-0">拖曳裁切框調整範圍，確認後送出</p>
      <div
        ref={containerRef}
        className="relative select-none overflow-hidden rounded-lg border border-gray-300 bg-gray-100 shrink-0"
        style={{ width: imgSize.w || "100%", height: imgSize.h || 400, cursor: dragging ? "grabbing" : "crosshair" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <img ref={imgRef} src={src} alt="截圖" style={{ width: "100%", height: imgSize.h, display: "block", userSelect: "none", pointerEvents: "none" }} />
        {/* 暗色遮罩 */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: imgSize.w, height: imgSize.h }}
          viewBox={`0 0 ${imgSize.w} ${imgSize.h}`}
        >
          <defs>
            <mask id="crop-mask">
              <rect width={imgSize.w} height={imgSize.h} fill="white" />
              <rect x={x} y={y} width={w} height={h} fill="black" />
            </mask>
          </defs>
          <rect width={imgSize.w} height={imgSize.h} fill="rgba(0,0,0,0.45)" mask="url(#crop-mask)" />
          <rect x={x} y={y} width={w} height={h} fill="none" stroke="#f97316" strokeWidth={2} />
          {handles.map(hd => (
            <rect key={hd.id} x={hd.cx - 6} y={hd.cy - 6} width={12} height={12} fill="#f97316" rx={2} />
          ))}
        </svg>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={handleConfirm}>
          確認裁切
        </Button>
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          取消
        </Button>
      </div>
    </div>
  );
}

function secToDisplay(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function parseSRT(srtContent: string) {
  const blocks = srtContent.trim().replace(/\r\n/g, "\n").split(/\n\n+/);
  const entries: { startSec: number; endSec: number; text: string }[] = [];
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 3) continue;
    const timeLine = lines[1];
    const match = timeLine.match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    );
    if (!match) continue;
    const startSec = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
    const endSec = parseInt(match[5]) * 3600 + parseInt(match[6]) * 60 + parseInt(match[7]);
    const text = lines.slice(2).join(" ").trim();
    entries.push({ startSec, endSec, text });
  }
  return entries;
}

// ==================== 知識點卡片（含 QA 展開）====================
function KnowledgePointCard({
  kp, idx, isActive, isCompleted, qaList, onSeek
}: {
  kp: { id: number; title: string; summary?: string | null; startSec: number; endSec: number };
  idx: number;
  isActive: boolean;
  isCompleted: boolean;
  qaList: { id: number; questionText: string; referenceAnswer?: string | null }[];
  onSeek: () => void;
}) {
  const [expandedQA, setExpandedQA] = useState<number | null>(null);
  const [showQA, setShowQA] = useState(false);
  return (
    <div className={`rounded-xl border transition-all ${
      isActive ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-gray-50 border-gray-200'
    }`}>
      <button
        onClick={onSeek}
        className="w-full text-left p-3"
      >
        <div className="flex items-start gap-2">
          <div className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold shrink-0 mt-0.5 ${
            isActive ? 'bg-blue-500 text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : idx + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className={`font-medium text-xs leading-snug ${isActive ? 'text-blue-700' : 'text-gray-800'}`}>
                {kp.title}
              </p>
              {isActive && (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 shrink-0 text-xs px-1 py-0 ml-auto">▶</Badge>
              )}
            </div>
            {kp.summary && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-3 leading-relaxed">{kp.summary}</p>
            )}
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{secToDisplay(kp.startSec)} — {secToDisplay(kp.endSec)}</span>
            </div>
          </div>
        </div>
      </button>
      {/* QA 按鈕 + 展開列表 */}
      {qaList.length > 0 && (
        <div className="border-t border-gray-200">
          <button
            onClick={e => { e.stopPropagation(); setShowQA(!showQA); setExpandedQA(null); }}
            className="w-full flex items-center justify-between px-3 py-1.5 bg-amber-50 hover:bg-amber-100 transition-colors"
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
              <span className="bg-amber-500 text-white rounded px-1 py-0.5 text-xs font-bold">Q&amp;A</span>
            </span>
            <span className="text-amber-500 text-xs">{showQA ? '▲' : '▼'}</span>
          </button>
          {showQA && (
            <div className="px-3 pb-2 pt-1 space-y-1 bg-amber-50/50">
              {qaList.map((qa, qIdx) => (
                <div key={qa.id} className="rounded-lg overflow-hidden border border-amber-100">
                  <button
                    onClick={e => { e.stopPropagation(); setExpandedQA(expandedQA === qa.id ? null : qa.id); }}
                    className="w-full text-left flex items-start gap-1.5 py-1.5 px-2 hover:bg-amber-50 transition-colors"
                  >
                    <span className="bg-orange-500 text-white font-bold text-xs shrink-0 rounded px-1 py-0.5 mt-0.5">Q{qIdx + 1}</span>
                    <span className="text-xs text-gray-700 leading-snug flex-1">{qa.questionText}</span>
                    <span className="text-amber-400 text-xs shrink-0 mt-0.5">{expandedQA === qa.id ? '▲' : '▼'}</span>
                  </button>
                  {expandedQA === qa.id && qa.referenceAnswer && (
                    <div className="mx-2 mb-1.5 px-2 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="bg-blue-500 text-white font-bold text-xs rounded px-1 py-0.5">A</span>
                      <span className="text-xs text-gray-700 ml-1.5 leading-relaxed">{qa.referenceAnswer}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== 影片播放器元件 ====================
function UnitPlayer({ unitId, onBack, onNextUnit, initialTimeSec }: { unitId: number; onBack: () => void; onNextUnit?: () => void; initialTimeSec?: number }) {
  const { data: unit } = trpc.videoCourseStudent.getUnit.useQuery({ unitId });
  const saveProgress = trpc.videoCourseStudent.saveProgress.useMutation();
  const askQuestion = trpc.videoCourseStudent.askQuestion.useMutation();
  const uploadImageMutation = trpc.storage.uploadImage.useMutation();
  const saveQAMutation = trpc.videoCourseStudent.saveQA.useMutation();
  const uploadQAImageMutation = trpc.videoCourseStudent.uploadQAImage.useMutation();
  const { data: savedQAList, refetch: refetchSavedQA } = trpc.videoCourseStudent.listSavedQA.useQuery({ unitId }, { enabled: !!unitId });
  const deleteSavedQAMutation = trpc.videoCourseStudent.deleteSavedQA.useMutation();
  const { data: randomQuizData, refetch: refetchQuiz } = trpc.videoCourseQuestion.getRandomQuiz.useQuery(
    { unitId, count: 5 },
    { enabled: false } // 只在點擊小測驗時手動觸發
  );

  const [currentSec, setCurrentSec] = useState(0);
  const [showQuestion, setShowQuestion] = useState(false);
  const [questionMode, setQuestionMode] = useState<"text" | "screenshot">("text"); // 區分兩種模式
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [pastedImage, setPastedImage] = useState<{ dataUrl: string; file: File } | null>(null);
  const [croppingImage, setCroppingImage] = useState<string | null>(null); // 待裁切的原始圖
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null); // 截圖模式：裁切後的截圖（始終保留）
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [subtitleFontSize, setSubtitleFontSize] = useState(16); // px
  const [isSaved, setIsSaved] = useState(false); // 是否已收藏
  const [lastImageUrl, setLastImageUrl] = useState<string | undefined>(undefined); // 最後一次問題的截圖 URL
  const [lastQuestion, setLastQuestion] = useState(""); // 最後一次送出的問題文字
  const [showSavedQA, setShowSavedQA] = useState(false); // 收藏查詢面板
  // 左右分欄寬度比例 (知識點側欄 : 影片區)
  const [splitRatio, setSplitRatio] = useState<"3:7" | "1:1" | "7:3">(
    () => (localStorage.getItem('videoCourse_splitRatio') as "3:7" | "1:1" | "7:3") || "1:1"
  );
  const handleSplitRatio = (r: "3:7" | "1:1" | "7:3") => {
    setSplitRatio(r);
    localStorage.setItem('videoCourse_splitRatio', r);
  };
  const playerRef = useRef<HTMLIFrameElement>(null);
  const videoPlayerRef = useRef<VideoPlayerHandle>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const progressSaved = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // VideoPlayer seekTo state（用 { sec, ts } 確保重複跳轉同一秒數時也能觸發）
  const [videoSeekTo, setVideoSeekTo] = useState<{ sec: number; ts: number } | undefined>(undefined);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(
    () => parseFloat(localStorage.getItem('videoCourse_playbackRate') || '1')
  );
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // 自訂全螢幕（讓右側影片+字幕一起全螢幕）
  const toggleFullscreen = useCallback(() => {
    const el = rightPanelRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // 監聽全螢幕變化
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // 解析字幕（subtitlesEnabled === 0 時不顯示）
  const subtitlesEnabled = unit?.subtitlesEnabled !== 0; // 預設開啟（null/undefined/1 都視為開啟）
  const subtitles = (subtitlesEnabled && unit?.correctedSrt) ? parseSRT(unit.correctedSrt) : [];
  const currentSubtitle = subtitles.find(s => currentSec >= s.startSec && currentSec <= s.endSec);

  // 跳轉到知識點時間（通用，支援 YouTube / HLS / MP4）
  const seekTo = useCallback((sec: number) => {
    setVideoSeekTo({ sec, ts: Date.now() });
  }, []);

  // 初始跳轉（從智能筆記點擊時間點跳轉過來）
  useEffect(() => {
    if (initialTimeSec !== undefined && unit) {
      const timer = setTimeout(() => {
        seekTo(initialTimeSec);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [unit?.id, initialTimeSec]);

  // 暫停影片
  const pauseVideo = useCallback(() => {
    videoPlayerRef.current?.pause();
  }, []);

  // 儲存進度（離開時）
  useEffect(() => {
    return () => {
      if (unit && currentSec > 0 && !progressSaved.current) {
        saveProgress.mutate({ unitId, lastPositionSec: currentSec });
      }
    };
  }, [unit, currentSec, unitId]);

  // 我有問題（文字 + 可選圖片）
  const handleAskQuestion = () => {
    pauseVideo();
    setQuestionMode("text");
    setShowQuestion(true);
    setAnswer("");
    setPastedImage(null);
    setCroppingImage(null);
    setScreenshotDataUrl(null);
  };

  // 截圖發問（自動擷取影片畫面）
  const handleScreenshotQuestion = () => {
    pauseVideo();
    setQuestionMode("screenshot");
    setShowQuestion(true);
    setAnswer("");
    setPastedImage(null);
    setCroppingImage(null);
    setScreenshotDataUrl(null);
    // 嘗試自動擷取當前影片畫面
    setTimeout(() => {
      const dataUrl = videoPlayerRef.current?.captureFrame();
      if (dataUrl) {
        setCroppingImage(dataUrl); // 直接進入裁切模式
      }
    }, 100); // 等影片暫停後再截圖
  };

  // 處理貼上圖片（Ctrl+V）
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          if (questionMode === "screenshot") {
            // 截圖模式：貼上的圖進裁切流程
            setCroppingImage(dataUrl);
          } else {
            // 文字模式：貼上的圖直接當附圖
            const byteString = atob(dataUrl.split(",")[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
            const f = new File([ab], `paste-${Date.now()}.png`, { type: "image/png" });
            setPastedImage({ dataUrl, file: f });
          }
        };
        reader.readAsDataURL(file);
        e.preventDefault();
        break;
      }
    }
  }, [questionMode]);

  // 送出問題
  const submitQuestion = async () => {
    // 截圖模式：需有截圖（問題文字可選填）
    // 文字模式：需有問題文字（圖片可選）
    if (questionMode === "screenshot") {
      if (!screenshotDataUrl) return;
    } else {
      if (!question.trim() && !pastedImage) return;
    }

    let imageUrl: string | undefined;

    if (questionMode === "screenshot" && screenshotDataUrl) {
      // 截圖模式：直接用 base64 dataUrl，不上傳 S3
      imageUrl = screenshotDataUrl;
    } else if (questionMode === "text" && pastedImage) {
      // 文字模式有附圖：上傳到 S3
      setIsUploadingImage(true);
      try {
        const base64Data = pastedImage.dataUrl.split(",")[1];
        const contentType = pastedImage.dataUrl.split(";")[0].replace("data:", "");
        const result = await uploadImageMutation.mutateAsync({
          filename: `question-img-${Date.now()}.png`,
          contentType,
          base64Data,
        });
        imageUrl = result.url;
      } catch {
        imageUrl = pastedImage.dataUrl;
      } finally {
        setIsUploadingImage(false);
      }
    }

    const questionText = question.trim() || (questionMode === "screenshot" ? "請看這張截圖，幫我解釋圖中的內容" : "");

    const resp = await askQuestion.mutateAsync({
      unitId,
      currentSec,
      question: questionText,
      imageUrl,
    });
    setAnswer(resp.answer);
    // 截圖模式：lastImageUrl 存 screenshotDataUrl（不存 S3 url，縮圖用 dataUrl）
    setLastImageUrl(questionMode === "screenshot" ? screenshotDataUrl ?? undefined : imageUrl);
    setLastQuestion(questionText);
    setQuestion("");
    // 截圖模式不清除 screenshotDataUrl，讓截圖保留在上方
    if (questionMode === "text") setPastedImage(null);
  };

  if (!unit) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#030712', overflow: 'hidden' }}>
      {/* 頂部導覽 */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800">
        <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> 返回
        </Button>
        <h1 className="text-white font-semibold text-sm flex-1 truncate">{unit.title}</h1>
        {/* 左右分欄比例切換 */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-gray-500 text-xs">版面</span>
          {(["3:7", "1:1", "7:3"] as const).map(r => (
            <button
              key={r}
              onClick={() => handleSplitRatio(r)}
              title={r === "3:7" ? "知識點較寬" : r === "1:1" ? "均等" : "影片較寬"}
              className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                splitRatio === r
                  ? "bg-blue-500 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >{r}</button>
          ))}
        </div>


        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
            onClick={() => { setShowSavedQA(true); refetchSavedQA(); }}
          >
            📑 我的收藏{savedQAList && savedQAList.length > 0 ? ` (${savedQAList.length})` : ''}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
            onClick={handleScreenshotQuestion}
          >
            <Camera className="w-4 h-4 mr-1" /> 截圖發問
          </Button>
          <Button
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleAskQuestion}
          >
            <MessageCircleQuestion className="w-4 h-4 mr-1" /> 我有問題
          </Button>
        </div>
      </div>

      {/* 主體：左右分欄（左欄知識點獨立，右側影片+字幕垂直堆疊） */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'row',
          overflow: 'visible'
        }}
      >

        {/* 左側知識點側欄（獨立捲動，不被右側影響） */}
        <div
          style={{
            flexShrink: 0,
            width: splitRatio === "3:7" ? "30%" : splitRatio === "1:1" ? "50%" : "70%",
            transition: 'width 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: '#fff',
            borderRight: '1px solid #e5e7eb'
          }}
        >
          <div className="px-4 pt-4 pb-2 border-b border-gray-100" style={{ flexShrink: 0 }}>
            <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4 text-blue-500" />
              知識點
              {unit.knowledgePoints?.length ? (
                <span className="ml-auto text-xs text-gray-400 font-normal">{unit.knowledgePoints.length} 個</span>
              ) : null}
            </h2>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px', paddingBottom: '24px' }}>
          {!unit.knowledgePoints?.length ? (
            <p className="text-gray-400 text-sm text-center py-6">尚未生成知識點</p>
          ) : (
            <div className="space-y-2">
              {(() => {
                const kps = unit.knowledgePoints!;
                let activeIdx = -1;
                let minDist = Infinity;
                kps.forEach((kp, i) => {
                  if (currentSec >= kp.startSec && currentSec <= kp.endSec) {
                    const dist = Math.abs(currentSec - kp.startSec);
                    if (dist < minDist) { minDist = dist; activeIdx = i; }
                  }
                });
                if (activeIdx === -1) {
                  for (let i = kps.length - 1; i >= 0; i--) {
                    if (kps[i].startSec <= currentSec) { activeIdx = i; break; }
                  }
                }
                // 取得此單元的 QA 列表
                const qaList = (unit as any).qaList ?? [];
                const kpCount = kps.length;
                return kps.map((kp, idx) => {
                  const isActive = idx === activeIdx;
                  const isCompleted = unit.completedPointIds?.includes(kp.id);
                  // 每個知識點都顯示全部 QA
                  const kpQAs = qaList;
                  return (
                    <KnowledgePointCard
                      key={kp.id}
                      kp={kp}
                      idx={idx}
                      isActive={isActive}
                      isCompleted={isCompleted}
                      qaList={kpQAs}
                      onSeek={() => { seekTo(kp.startSec); setCurrentSec(kp.startSec); }}
                    />
                  );
                });
              })()}
            </div>
          )}
          </div>
        </div>

        {/* 右側：影片 + 字幕（垂直 flex，影片 flex-1，字幕固定 56px） */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'visible'
          }}
        >

        {/* 影片播放器（占滿右側，字幕疊加在影片底部） */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            background: '#000',
            overflow: 'visible',
            position: 'relative',
            paddingBottom: '44px'  /* 為 video controls 進度條預留空間，避免被容器截斷 */
          }}
        >
          {unit.videoUrl ? (
            <VideoPlayer
              ref={videoPlayerRef}
              url={unit.videoUrl}
              seekTo={videoSeekTo}
              onTimeUpdate={setCurrentSec}
              playbackRate={playbackRate}
              onEnded={() => setShowEndDialog(true)}
              className="w-full h-full"
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Video className="w-12 h-12 text-gray-500" />
            </div>
          )}

          {/* 字幕疊加層（影片底部 YT 工具列上方） */}
          <div
            style={{
              position: 'absolute',
              bottom: '56px',   /* 往上移，避開 video controls 進度條拖曳區域 */
              left: 0,
              right: 0,
              background: 'rgba(0,0,0,0.72)',
              padding: '6px 48px 6px 16px',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              zIndex: 10
            }}
          >
            <div
              style={{
                flex: 1,
                color: '#fff',
                textAlign: 'center',
                fontSize: `${subtitleFontSize}px`,
                lineHeight: 1.6,
                textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}
            >
              {currentSubtitle?.text ?? ""}
            </div>
          </div>

          {/* 倍速切換按鈕（右下角，字幕大小按鈕上方） */}
          <div
            style={{
              position: 'absolute',
              bottom: '136px',   /* 字幕大小按鈕 bottom:100px + 按鈕高度約30px + 間距6px */
              right: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              zIndex: 11,
              pointerEvents: 'auto'
            }}
          >
            <span style={{ color: '#9ca3af', fontSize: 10, marginRight: 2 }}>速度</span>
            {([0.75, 1, 1.25, 1.5, 2] as const).map(rate => (
              <button
                key={rate}
                onClick={() => {
                  setPlaybackRate(rate);
                  localStorage.setItem('videoCourse_playbackRate', String(rate));
                  videoPlayerRef.current?.setPlaybackRate(rate);
                }}
                style={{
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontFamily: 'monospace',
                  border: 'none',
                  cursor: 'pointer',
                  background: playbackRate === rate ? '#f97316' : 'rgba(55,65,81,0.85)',
                  color: playbackRate === rate ? '#fff' : '#d1d5db',
                  fontWeight: playbackRate === rate ? 700 : 400,
                }}
              >{rate}x</button>
            ))}
          </div>

          {/* 字幕大小調整按鈕（右下角，影片底部工具列上方） */}
          <div
            style={{
              position: 'absolute',
              bottom: '100px',   /* 往上移，避開 video controls 進度條拖曳區域 */
              right: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              zIndex: 11,
              pointerEvents: 'auto'
            }}
          >
            <button
              onClick={() => setSubtitleFontSize(s => Math.max(10, s - 2))}
              style={{ width: 22, height: 22, borderRadius: 4, background: 'rgba(55,65,81,0.85)', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
            >－</button>
            <span style={{ color: '#d1d5db', fontSize: 11, width: 28, textAlign: 'center' }}>{subtitleFontSize}</span>
            <button
              onClick={() => setSubtitleFontSize(s => Math.min(32, s + 2))}
              style={{ width: 22, height: 22, borderRadius: 4, background: 'rgba(55,65,81,0.85)', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
            >＋</button>
          </div>
        </div>

        </div>{/* 右側影片+字幕結束 */}

      </div>{/* 主體左右分欄結束 */}

      {/* 舊的知識點列表佔位（已移至左側欄，此處保留空 div 以維持 DOM 結構） */}
      <div className="hidden">
        <div className="p-4">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            知識點
          </h2>
          {!unit.knowledgePoints?.length ? (
            <p className="text-gray-400 text-sm text-center py-6">尚未生成知識點</p>
          ) : (
            <div className="space-y-2">
              {(() => {
                // 只選出最接近當前時間的單一知識點作為播放中
                const kps = unit.knowledgePoints!;
                let activeIdx = -1;
                let minDist = Infinity;
                kps.forEach((kp, i) => {
                  if (currentSec >= kp.startSec && currentSec <= kp.endSec) {
                    const dist = Math.abs(currentSec - kp.startSec);
                    if (dist < minDist) { minDist = dist; activeIdx = i; }
                  }
                });
                // 若沒有包含當前時間的知識點，找最後一個 startSec <= currentSec 的
                if (activeIdx === -1) {
                  for (let i = kps.length - 1; i >= 0; i--) {
                    if (kps[i].startSec <= currentSec) { activeIdx = i; break; }
                  }
                }
                return kps.map((kp, idx) => {
                const isActive = idx === activeIdx;
                const isCompleted = unit.completedPointIds?.includes(kp.id);
                return (
                  <button
                    key={kp.id}
                    onClick={() => { seekTo(kp.startSec); setCurrentSec(kp.startSec); }}
                    className={`w-full text-left rounded-xl p-3 transition-all border ${
                      isActive
                        ? "bg-blue-50 border-blue-300 shadow-sm"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 mt-0.5 ${
                        isActive ? "bg-blue-500 text-white" : isCompleted ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
                      }`}>
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${isActive ? "text-blue-700" : "text-gray-800"}`}>
                          {kp.title}
                        </p>
                        {kp.summary && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{kp.summary}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>{secToDisplay(kp.startSec)} — {secToDisplay(kp.endSec)}</span>
                        </div>
                      </div>
                      {isActive && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 shrink-0 text-xs">播放中</Badge>
                      )}
                    </div>
                  </button>
                );
              });
              })()}
            </div>
          )}
        </div>
      </div>

      {/* 問答 Dialog */}
      <Dialog open={showQuestion} onOpenChange={(open) => {
        setShowQuestion(open);
        if (!open) {
          setAnswer("");
          setPastedImage(null);
          setCroppingImage(null);
          setScreenshotDataUrl(null);
          setIsSaved(false);
          setLastImageUrl(undefined);
          setLastQuestion("");
          setQuestion("");
          // 關閉 Dialog 後自動恢復影片播放
          videoPlayerRef.current?.play();
        }
      }}>
        <DialogContent
          className="rounded-none p-0 flex flex-col border-0"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', maxWidth: '100vw', maxHeight: '100vh', transform: 'none', translate: 'none' }}
          onPaste={handlePaste}
        >
          <DialogTitle className="sr-only">{questionMode === "screenshot" ? "截圖發問" : "我有問題"}</DialogTitle>
          {/* 全螢幕標題列 */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircleQuestion className="w-5 h-5 text-orange-500" />
              <span className="font-semibold text-gray-800">{questionMode === "screenshot" ? "截圖發問" : "我有問題"}</span>
              <span className="text-xs text-orange-600 bg-orange-50 rounded px-2 py-0.5 ml-1">
                影片暫停於 {secToDisplay(currentSec)}
              </span>
            </div>
          </div>

          {/* 全螢幕主體 */}
          <div className="flex flex-1 min-h-0 overflow-hidden">

            {/* ===== 截圖模式：左右並排 ===== */}
            {questionMode === "screenshot" && (
              <>
                {/* 裁切中：全寬顯示 */}
                {croppingImage && (
                  <div className="flex-1 flex items-center justify-center w-full h-full">
                    <ImageCropper
                      src={croppingImage}
                      onConfirm={(cropped) => {
                        setScreenshotDataUrl(cropped);
                        setCroppingImage(null);
                      }}
                      onCancel={() => {
                        setCroppingImage(null);
                        setShowQuestion(false);
                        setScreenshotDataUrl(null);
                        setAnswer("");
                        setQuestion("");
                        videoPlayerRef.current?.play();
                      }}
                    />
                  </div>
                )}

                {/* 截圖載入中 */}
                {!croppingImage && !screenshotDataUrl && (
                  <div className="flex-1 flex items-center justify-center">
                    <div
                      className="border-2 border-dashed border-orange-200 rounded-xl p-10 text-center text-gray-400 text-sm cursor-pointer hover:border-orange-400 hover:text-orange-500 transition-colors max-w-md"
                      onClick={() => toast.info("請截圖後按 Ctrl+V 貼上，或等待自動截圖載入")}
                    >
                      <Camera className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p className="font-medium text-gray-500 text-base">影片截圖載入中...</p>
                      <p className="text-xs mt-2 text-gray-300">或手動截圖後按 <kbd className="bg-gray-100 border border-gray-300 rounded px-1 text-xs">Ctrl+V</kbd> 貼上</p>
                    </div>
                  </div>
                )}

                {/* 左側：截圖預覽 ＋ 輸入框 */}
                {!croppingImage && screenshotDataUrl && (
                  <div className="w-1/2 flex flex-col border-r border-gray-200 bg-gray-50">
                    <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img
                          src={screenshotDataUrl}
                          alt="截圖"
                          className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                        />
                        <button
                          onClick={() => { setCroppingImage(screenshotDataUrl); setScreenshotDataUrl(null); setAnswer(""); }}
                          className="absolute top-2 right-2 bg-orange-500/80 text-white rounded-full px-2 py-0.5 text-xs hover:bg-orange-600"
                        >
                          重新裁切
                        </button>
                      </div>
                    </div>
                    {/* 輸入框固定在左側底部 */}
                    <div className="p-4 border-t border-gray-200 bg-white shrink-0">
                      <Textarea
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                        placeholder={answer ? "繼續針對此截圖追問..." : "可補充說明（選填），或直接送出讓 AI 解釋截圖..."}
                        rows={3}
                        className="resize-none text-sm"
                        onKeyDown={e => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            submitQuestion();
                          }
                        }}
                      />
                      <Button
                        className="w-full mt-2"
                        onClick={submitQuestion}
                        disabled={askQuestion.isPending}
                      >
                        {askQuestion.isPending ? (
                          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> AI 思考中...</>
                        ) : (
                          <><Send className="w-4 h-4 mr-2" /> {answer ? "繼續追問" : "送出問題"}</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* 右側：AI 回答 */}
                {!croppingImage && screenshotDataUrl && (
                  <div className="w-1/2 flex flex-col bg-white">
                    <div className="flex-1 overflow-y-auto p-6">
                      {answer ? (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-semibold text-blue-700">AI 回答：</p>
                            <button
                              onClick={async () => {
                                if (isSaved) return;
                                // 若截圖是 base64 dataUrl，先上傳到 S3 取得真正 URL
                                let finalScreenshotUrl = lastImageUrl;
                                if (lastImageUrl && lastImageUrl.startsWith('data:')) {
                                  try {
                                    const base64Data = lastImageUrl.replace(/^data:\w+\/\w+;base64,/, '');
                                    const ext = lastImageUrl.match(/data:image\/(\w+);/)?.[1] || 'jpg';
                                    const uploadResult = await uploadQAImageMutation.mutateAsync({
                                      filename: `screenshot.${ext}`,
                                      contentType: `image/${ext}`,
                                      base64Data,
                                    });
                                    finalScreenshotUrl = uploadResult.url;
                                  } catch (e) {
                                    // 上傳失敗就不存截圖 URL
                                    finalScreenshotUrl = undefined;
                                  }
                                }
                                await saveQAMutation.mutateAsync({
                                  unitId,
                                  unitTitle: unit?.title ?? "",
                                  videoTimeSec: currentSec,
                                  questionText: lastQuestion || "截圖問答",
                                  aiAnswer: answer,
                                  screenshotUrl: finalScreenshotUrl,
                                });
                                setIsSaved(true);
                                refetchSavedQA();
                                toast.success("已收藏此問答！");
                              }}
                              disabled={isSaved || saveQAMutation.isPending}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: isSaved ? 'default' : 'pointer',
                                background: isSaved ? '#d1fae5' : '#eff6ff',
                                color: isSaved ? '#065f46' : '#1d4ed8',
                                border: `1px solid ${isSaved ? '#6ee7b7' : '#93c5fd'}`,
                                fontWeight: 500
                              }}
                            >
                              {isSaved ? '★ 已收藏' : '☆ 收藏此問答'}
                            </button>
                          </div>
                          <div className="text-sm text-gray-800 leading-relaxed">
                            <Streamdown>{answer}</Streamdown>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                          <MessageCircleQuestion className="w-12 h-12 mb-3 opacity-30" />
                          <p className="text-sm">送出問題後，AI 回答將顯示在這裡</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ===== 文字模式（我有問題）===== */}
            {questionMode === "text" && (
              <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full p-6 overflow-y-auto">
                {/* 附圖預覽 */}
                {pastedImage && (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 mb-4">
                    <img src={pastedImage.dataUrl} alt="附圖" className="w-full max-h-48 object-contain bg-gray-50" />
                    <button
                      onClick={() => setPastedImage(null)}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {answer ? (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-blue-700">AI 回答：</p>
                      <button
                        onClick={async () => {
                          if (isSaved) return;
                          // 若截圖是 base64 dataUrl，先上傳到 S3 取得真正 URL
                          let finalScreenshotUrl2 = lastImageUrl;
                          if (lastImageUrl && lastImageUrl.startsWith('data:')) {
                            try {
                              const base64Data2 = lastImageUrl.replace(/^data:\w+\/\w+;base64,/, '');
                              const ext2 = lastImageUrl.match(/data:image\/(\w+);/)?.[1] || 'jpg';
                              const uploadResult2 = await uploadQAImageMutation.mutateAsync({
                                filename: `screenshot.${ext2}`,
                                contentType: `image/${ext2}`,
                                base64Data: base64Data2,
                              });
                              finalScreenshotUrl2 = uploadResult2.url;
                            } catch (e) {
                              finalScreenshotUrl2 = undefined;
                            }
                          }
                          await saveQAMutation.mutateAsync({
                            unitId,
                            unitTitle: unit?.title ?? "",
                            videoTimeSec: currentSec,
                            questionText: lastQuestion || question || "問答記錄",
                            aiAnswer: answer,
                            screenshotUrl: finalScreenshotUrl2,
                          });
                          setIsSaved(true);
                          refetchSavedQA();
                          toast.success("已收藏此問答！");
                        }}
                        disabled={isSaved || saveQAMutation.isPending}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: isSaved ? 'default' : 'pointer',
                          background: isSaved ? '#d1fae5' : '#eff6ff',
                          color: isSaved ? '#065f46' : '#1d4ed8',
                          border: `1px solid ${isSaved ? '#6ee7b7' : '#93c5fd'}`,
                          fontWeight: 500
                        }}
                      >
                        {isSaved ? '★ 已收藏' : '☆ 收藏此問答'}
                      </button>
                    </div>
                    <div className="text-sm text-gray-800 leading-relaxed overflow-y-auto" style={{ maxHeight: "340px" }}>
                      <Streamdown>{answer}</Streamdown>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* 上傳圖片按鈕 + 輸入框 */}
                    <div className="flex items-center gap-2 mb-2">
                      <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer hover:text-orange-500 transition-colors">
                        <ImageIcon className="w-4 h-4" />
                        上傳圖片
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setPastedImage({ dataUrl: ev.target?.result as string, file });
                            };
                            reader.readAsDataURL(file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <span className="text-xs text-gray-300">或 Ctrl+V 貼上圖片</span>
                    </div>
                    <Textarea
                      value={question}
                      onChange={e => setQuestion(e.target.value)}
                      placeholder={pastedImage ? "可補充說明（選填），或直接送出讓 AI 解釋圖片..." : "請輸入你的問題..."}
                      rows={3}
                      className="resize-none"
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          submitQuestion();
                        }
                      }}
                    />
                    <Button
                      className="w-full mt-3"
                      onClick={submitQuestion}
                      disabled={(!question.trim() && !pastedImage) || askQuestion.isPending || isUploadingImage}
                    >
                      {askQuestion.isPending || isUploadingImage ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {isUploadingImage ? "上傳圖片中..." : "AI 思考中..."}</>
                      ) : (
                        <><Send className="w-4 h-4 mr-2" /> 送出問題</>
                      )}
                    </Button>
                  </div>
                )}
                {answer && (
                  <Button variant="outline" className="w-full mt-3" onClick={() => { setAnswer(""); setPastedImage(null); setIsSaved(false); setLastImageUrl(undefined); setLastQuestion(""); }}>
                    再問一個問題
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 收藏問答 Dialog */}
      <Dialog open={showSavedQA} onOpenChange={setShowSavedQA}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              📑 收藏的問答
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!savedQAList || savedQAList.length === 0 ? (
              <p className="text-center text-gray-400 py-8">還沒有收藏任何問答</p>
            ) : (
              savedQAList.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        setShowSavedQA(false);
                        seekTo(item.videoTimeSec);
                        setCurrentSec(item.videoTimeSec);
                        toast.success(`已跳轉到 ${secToDisplay(item.videoTimeSec)}`);
                      }}
                      className="text-xs text-orange-600 font-medium bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded cursor-pointer transition-colors"
                      title="點擊跳轉到此時間點"
                    >
                      ▶ {secToDisplay(item.videoTimeSec)}
                    </button>
                    <button
                      onClick={async () => {
                        await deleteSavedQAMutation.mutateAsync({ id: item.id });
                        refetchSavedQA();
                        toast.success("已刪除收藏");
                      }}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      刪除
                    </button>
                  </div>
                  {/* 截圖縮圖（若有）*/}
                  {item.screenshotUrl && (
                    <div className="mt-1 mb-1">
                      <img
                        src={item.screenshotUrl}
                        alt="問題截圖"
                        className="rounded-lg border border-gray-200 object-contain bg-gray-50 cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ maxHeight: 120, maxWidth: '100%' }}
                        onClick={() => window.open(item.screenshotUrl!, '_blank')}
                        title="點擊查看原圖"
                      />
                    </div>
                  )}
                  <p className="text-sm font-medium text-gray-800">🙋 {item.questionText}</p>
                  <div className="text-sm text-gray-600 bg-blue-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <Streamdown>{item.aiAnswer}</Streamdown>
                  </div>
                  <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 播放完成 Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              ✅ 完成此單元！
            </DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 text-sm">恭喜你看完「{unit?.title}」，接下來要做什麼？</p>
          <div className="flex flex-col gap-3 mt-2">
            {onNextUnit && (
              <Button
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => { setShowEndDialog(false); onNextUnit(); }}
              >
                ▶ 繼續看下一個影片
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full border-orange-300 text-orange-600 hover:bg-orange-50"
              onClick={async () => {
                setShowEndDialog(false);
                setQuizAnswers({});
                setQuizSubmitted(false);
                setQuizQuestions([]);
                const result = await refetchQuiz();
                const qs = result.data ?? [];
                if (qs.length === 0) {
                  toast.info('此單元尚未出選擇題，請先請老師出題！');
                  return;
                }
                setQuizQuestions(qs);
                setShowQuiz(true);
              }}
            >
              📝 來個選擇題小測驗（5 題）
            </Button>
            <Button
              variant="ghost"
              className="w-full text-gray-500"
              onClick={() => { setShowEndDialog(false); onBack(); }}
            >
              返回單元列表
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== 選擇題小測驗 Dialog ===== */}
      <Dialog open={showQuiz} onOpenChange={(open) => {
        if (!open) { setShowQuiz(false); setQuizSubmitted(false); }
      }}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              📝 選擇題小測驗
            </DialogTitle>
          </DialogHeader>
          {quizSubmitted ? (
            // 成績頁
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="text-4xl font-bold text-orange-500">
                  {quizQuestions.filter((q, i) => quizAnswers[i] === q.correctAnswer).length} / {quizQuestions.length}
                </div>
                <p className="text-gray-500 mt-1">答對題數</p>
              </div>
              {quizQuestions.map((q, i) => {
                const isCorrect = quizAnswers[i] === q.correctAnswer;
                return (
                  <div key={q.id} className={`rounded-lg p-4 border-2 ${isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                    <p className="font-medium text-sm mb-2">{i + 1}. {q.questionText}</p>
                    {['A', 'B', 'C', 'D'].map(opt => {
                      const val = q[`option${opt}` as keyof typeof q] as string | null;
                      if (!val) return null;
                      const isMyAnswer = quizAnswers[i] === opt;
                      const isAnswer = q.correctAnswer === opt;
                      return (
                        <div key={opt} className={`text-sm px-3 py-1 rounded mt-1 ${
                          isAnswer ? 'bg-green-200 font-semibold' : isMyAnswer ? 'bg-red-200' : 'bg-white'
                        }`}>
                          {opt}. {val} {isAnswer ? '✅' : isMyAnswer ? '❌' : ''}
                        </div>
                      );
                    })}
                    {q.explanation && <p className="text-xs text-gray-600 mt-2 border-t pt-2">解析：{q.explanation}</p>}
                  </div>
                );
              })}
              <div className="flex gap-3 pt-2">
                <Button className="flex-1" onClick={() => { setQuizAnswers({}); setQuizSubmitted(false); }}>再做一次</Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowQuiz(false)}>關閉</Button>
              </div>
            </div>
          ) : (
            // 作答頁
            <div className="space-y-5">
              {quizQuestions.map((q, i) => (
                <div key={q.id} className="border rounded-lg p-4">
                  <p className="font-medium text-sm mb-3">{i + 1}. {q.questionText}</p>
                  <div className="space-y-2">
                    {(['A', 'B', 'C', 'D'] as const).map(opt => {
                      const val = q[`option${opt}` as keyof typeof q] as string | null;
                      if (!val) return null;
                      return (
                        <label key={opt} className={`flex items-center gap-2 cursor-pointer rounded-lg px-3 py-2 border transition-colors ${
                          quizAnswers[i] === opt ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}>
                          <input
                            type="radio"
                            name={`q-${i}`}
                            value={opt}
                            checked={quizAnswers[i] === opt}
                            onChange={() => setQuizAnswers(prev => ({ ...prev, [i]: opt }))}
                            className="accent-orange-500"
                          />
                          <span className="text-sm">{opt}. {val}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={Object.keys(quizAnswers).length < quizQuestions.length}
                  onClick={() => setQuizSubmitted(true)}
                >
                  {Object.keys(quizAnswers).length < quizQuestions.length
                    ? `還有 ${quizQuestions.length - Object.keys(quizAnswers).length} 題未作答`
                    : '提交答案'}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowQuiz(false)}>取消</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 課程詳情（單元列表）====================
function CourseDetail({
  courseId,
  onBack,
  onSelectUnit,
}: {
  courseId: number;
  onBack: () => void;
  onSelectUnit: (unitId: number, unitIds: number[]) => void;
}) {
  const { data: course } = trpc.videoCourseStudent.getCourse.useQuery({ courseId });

  if (!course) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> 返回
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{course.title}</h1>
          {course.description && <p className="text-gray-500 text-sm">{course.description}</p>}
        </div>
      </div>

      {!course.units?.length ? (
        <div className="text-center py-16 text-gray-400">
          <Video className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>此課程尚未加入任何單元</p>
        </div>
      ) : (
        <div className="space-y-3">
          {course.units.map((unit, idx) => {
            const totalPoints = unit.knowledgePoints?.length ?? 0;
            const completedPoints = unit.completedPointIds?.length ?? 0;
            const progress = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;
            return (
              <button
                key={unit.id}
                onClick={() => onSelectUnit(unit.id, course.units!.map((u: any) => u.id))}
                className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold text-sm shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{unit.title}</p>
                    {totalPoints > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>{completedPoints}/{totalPoints} 知識點</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <ChevronLeft className="w-4 h-4 text-gray-400 rotate-180 shrink-0 mt-1" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================== 可嵌入版本（用於 TutorChat 分頁）====================
export function VideoCourseEmbedded({ subjectId, jumpTo, onJumpConsumed }: { subjectId?: number; jumpTo?: { unitId: number; timeSec: number } | null; onJumpConsumed?: () => void }) {
  const { data: courses, isLoading } = trpc.videoCourseStudent.listCourses.useQuery(
    subjectId ? { subjectId } : undefined
  );
  const [view, setView] = useState<View>("courses");
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [courseUnitIds, setCourseUnitIds] = useState<number[]>([]);
  const [jumpTimeSec, setJumpTimeSec] = useState<number | undefined>(undefined);

  // 當 jumpTo 改變時，自動切換到播放 view
  useEffect(() => {
    if (jumpTo) {
      setSelectedUnitId(jumpTo.unitId);
      setJumpTimeSec(jumpTo.timeSec);
      setView('unit-player');
      // 跳轉完成後通知父元件清除 jumpTo
      if (onJumpConsumed) onJumpConsumed();
    }
  }, [jumpTo?.unitId, jumpTo?.timeSec]);

  const handleSelectUnit = (unitId: number, unitIds: number[]) => {
    setSelectedUnitId(unitId);
    setCourseUnitIds(unitIds);
    setView("unit-player");
  };

  const handleNextUnit = () => {
    if (!selectedUnitId || !courseUnitIds.length) return;
    const idx = courseUnitIds.indexOf(selectedUnitId);
    if (idx >= 0 && idx < courseUnitIds.length - 1) {
      setSelectedUnitId(courseUnitIds[idx + 1]);
    }
  };

  const hasNextUnit = selectedUnitId && courseUnitIds.length > 0
    ? courseUnitIds.indexOf(selectedUnitId) < courseUnitIds.length - 1
    : false;

  if (view === "unit-player" && selectedUnitId) {
    return (
      <UnitPlayer
        unitId={selectedUnitId}
        onBack={() => { setView("course-detail"); setJumpTimeSec(undefined); }}
        onNextUnit={hasNextUnit ? handleNextUnit : undefined}
        initialTimeSec={jumpTimeSec}
      />
    );
  }

  if (view === "course-detail" && selectedCourseId) {
    return (
      <CourseDetail
        courseId={selectedCourseId}
        onBack={() => setView("courses")}
        onSelectUnit={(unitId, unitIds) => handleSelectUnit(unitId, unitIds)}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="p-4 max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-1">智能函授</h1>
        <p className="text-gray-500 text-sm mb-4">AI 輔助影音課程，邊看邊學</p>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : !courses?.length ? (
          <div className="text-center py-20 text-gray-400">
            <Video className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>目前沒有可用的課程</p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course) => (
              <button
                key={course.id}
                onClick={() => { setSelectedCourseId(course.id); setView("course-detail"); }}
                className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Video className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{course.title}</p>
                    {course.description && <p className="text-sm text-gray-500 truncate">{course.description}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{course.unitCount ?? 0} 個單元</p>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-gray-400 rotate-180 shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== 課程列表 ====================
export default function VideoCourse() {
  const { data: courses, isLoading } = trpc.videoCourseStudent.listCourses.useQuery();
  const [view, setView] = useState<View>("courses");
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [courseUnitIds, setCourseUnitIds] = useState<number[]>([]);
  const [, navigate] = useLocation();

  const handleSelectUnit = (unitId: number, unitIds: number[]) => {
    setSelectedUnitId(unitId);
    setCourseUnitIds(unitIds);
    setView("unit-player");
  };

  const handleNextUnit = () => {
    if (!selectedUnitId || !courseUnitIds.length) return;
    const idx = courseUnitIds.indexOf(selectedUnitId);
    if (idx >= 0 && idx < courseUnitIds.length - 1) {
      setSelectedUnitId(courseUnitIds[idx + 1]);
    }
  };

  const hasNextUnit = selectedUnitId && courseUnitIds.length > 0
    ? courseUnitIds.indexOf(selectedUnitId) < courseUnitIds.length - 1
    : false;

  if (view === "unit-player" && selectedUnitId) {
    return (
      <UnitPlayer
        unitId={selectedUnitId}
        onBack={() => { setView("course-detail"); setJumpTimeSec(undefined); }}
        onNextUnit={hasNextUnit ? handleNextUnit : undefined}
        initialTimeSec={jumpTimeSec}
      />
    );
  }

  if (view === "course-detail" && selectedCourseId) {
    return (
      <CourseDetail
        courseId={selectedCourseId}
        onBack={() => setView("courses")}
        onSelectUnit={(unitId, unitIds) => handleSelectUnit(unitId, unitIds)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">智能函授</h1>
      <p className="text-gray-500 text-sm mb-6">AI 輔助影音課程，邊看邊學</p>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : !courses?.length ? (
        <div className="text-center py-20 text-gray-400">
          <Video className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>目前沒有可用的課程</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <button
              key={course.id}
              onClick={() => { setSelectedCourseId(course.id); setView("course-detail"); }}
              className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Video className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{course.title}</p>
                  {course.description && <p className="text-sm text-gray-500 truncate">{course.description}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{course.unitCount ?? 0} 個單元</p>
                </div>
                <ChevronLeft className="w-4 h-4 text-gray-400 rotate-180 shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
