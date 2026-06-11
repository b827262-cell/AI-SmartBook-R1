/**
 * 試聽館頁面
 * 首頁：顯示播放清單卡片列表
 * 播放頁面：完全比照教材學習區版型
 *   - 左側：固定寬度 AI 摘要欄（帶時間點跳轉 + 帶入提問框）
 *   - 右側剩餘空間：影片欄 + AI 對話欄（3:7 / 1:1 / 7:3 切換）
 *     - 3:7 = 影片30% 對話70%
 *     - 1:1 = 影片50% 對話50%
 *     - 7:3 = 影片70% 對話30%
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send, Loader2, Headphones,
  Play, Sparkles, ArrowLeft,
  ChevronLeft, ChevronRight, MessageSquare, Trash2, Search, X,
} from "lucide-react";
import { toast } from "sonner";

import { MarkdownRenderer } from "@/components/MarkdownRenderer";
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

type Message = { role: "user" | "assistant"; content: string; image?: string };

// 從 YouTube URL 取得 playlist ID 或 video ID
function getYouTubePlaylistId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/[?&]list=([\w-]+)/);
  return match ? match[1] : null;
}

// 從 YouTube URL 取得 video ID（用於單一影片）
function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  // youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([\w-]+)/);
  if (shortMatch) return shortMatch[1];
  // youtube.com/watch?v=VIDEO_ID
  const longMatch = url.match(/[?&]v=([\w-]+)/);
  if (longMatch) return longMatch[1];
  // youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/\/embed\/([\w-]+)/);
  if (embedMatch) return embedMatch[1];
  return null;
}

// 將 [HH:MM:SS] 時間戳轉為秒數
function timestampToSeconds(ts: string): number {
  const match = ts.match(/\[?(\d{2}):(\d{2}):(\d{2})\]?/);
  if (!match) return 0;
  return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
}

// ======= AI 摘要清單元件（完全複製教材版） =======
function SummaryList({
  summaries,
  seekToTime,
  onSectionAsk,
}: {
  summaries: Array<{ timestamp: string; title: string; content: string }>;
  seekToTime: (t: number) => void;
  onSectionAsk: (sectionId: number, title: string, content: string) => void;
}) {
  return (
    <div className="space-y-2">

      {summaries.map((s, i) => (
        <div key={i} className="bg-white border rounded-lg p-2.5">
          {/* 第一行：跳轉按鈕 + 標題 */}
          <div className="flex gap-2 items-center mb-1.5">
            <button
              className="text-blue-500 text-xs font-mono shrink-0 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded px-1.5 py-0.5 whitespace-nowrap"
              title={`跳到影片 ${s.timestamp}`}
              onClick={() => seekToTime(timestampToSeconds(s.timestamp))}
            >▶ {s.timestamp}</button>
            <p className="flex-1 text-xs font-semibold text-gray-800">{s.title}</p>
          </div>
          {/* 摘要內容 */}
          <p className="text-xs text-gray-600 leading-relaxed">{s.content}</p>
          {/* 帶入提問框按鈕 */}
          <div className="mt-2 pt-2 border-t flex justify-end">
            <button
              className="text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded border border-blue-200"
              onClick={() => onSectionAsk(i, s.title, s.content)}
            >帶入提問框</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// 解析純文字摘要為帶時間點的段落陣列
function parsePlainTextSummary(text: string): Array<{ timestamp: string; title: string; content: string }> {
  if (!text) return [];

  // 1. 先嘗試 JSON 格式（新格式）
  try {
    const parsed = JSON.parse(text);
    if (parsed?.summaries?.length) return parsed.summaries;
  } catch {}

  // 2. 嘗試 Markdown 格式：**標題** 後接內容，帶或不帶時間戳
  const mdSections: Array<{ timestamp: string; title: string; content: string }> = [];
  const mdLines = text.split("\n");
  let mdCurrent: { timestamp: string; title: string; lines: string[] } | null = null;
  let hasMdTitle = false;
  for (const line of mdLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '---' || trimmed === '***') continue;
    // 標題行：**文字** 或 ### 文字
    const boldMatch = trimmed.match(/^\*{1,2}([^*]+)\*{1,2}\s*$/);
    const headMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
    const titleText = boldMatch?.[1]?.trim() || headMatch?.[1]?.trim();
    // 時間戳行：[HH:MM:SS]
    const tsMatch = trimmed.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*(.*)$/);

    if (titleText && titleText.length <= 30) {
      hasMdTitle = true;
      if (mdCurrent) mdSections.push({ timestamp: mdCurrent.timestamp, title: mdCurrent.title, content: mdCurrent.lines.join(' ').trim() });
      mdCurrent = { timestamp: '[00:00:00]', title: titleText, lines: [] };
    } else if (tsMatch) {
      const rest = tsMatch[2].trim();
      if (mdCurrent) {
        // 時間戳在標題內容中，更新時間戳
        if (mdCurrent.timestamp === '[00:00:00]' && !mdCurrent.lines.length) {
          mdCurrent.timestamp = `[${tsMatch[1]}]`;
          if (rest) mdCurrent.lines.push(rest);
        } else {
          mdSections.push({ timestamp: mdCurrent.timestamp, title: mdCurrent.title, content: mdCurrent.lines.join(' ').trim() });
          const dotIdx = rest.indexOf('。'); const colonIdx = rest.indexOf('：');
          const splitIdx = dotIdx > 0 && dotIdx < 20 ? dotIdx + 1 : (colonIdx > 0 && colonIdx < 20 ? colonIdx + 1 : -1);
          const title = splitIdx > 0 ? rest.slice(0, splitIdx) : (rest.slice(0, 20) || `段落 ${mdSections.length + 1}`);
          mdCurrent = { timestamp: `[${tsMatch[1]}]`, title, lines: splitIdx > 0 ? [rest.slice(splitIdx).trim()] : (rest ? [rest] : []) };
        }
      } else {
        const dotIdx = rest.indexOf('。'); const colonIdx = rest.indexOf('：');
        const splitIdx = dotIdx > 0 && dotIdx < 20 ? dotIdx + 1 : (colonIdx > 0 && colonIdx < 20 ? colonIdx + 1 : -1);
        const title = splitIdx > 0 ? rest.slice(0, splitIdx) : (rest.slice(0, 20) || `段落 ${mdSections.length + 1}`);
        mdCurrent = { timestamp: `[${tsMatch[1]}]`, title, lines: splitIdx > 0 ? [rest.slice(splitIdx).trim()] : (rest ? [rest] : []) };
      }
    } else if (mdCurrent) {
      // 移除 Markdown 特殊字元（*, #, -, 》等）
      const cleaned = trimmed.replace(/^[-*#>]+\s*/, '').replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1');
      if (cleaned) mdCurrent.lines.push(cleaned);
    }
  }
  if (mdCurrent) mdSections.push({ timestamp: mdCurrent.timestamp, title: mdCurrent.title, content: mdCurrent.lines.join(' ').trim() });

  // 如果有 Markdown 標題或時間戳段落，回傳
  if (hasMdTitle || mdSections.some(s => s.timestamp !== '[00:00:00]')) {
    return mdSections.filter(s => s.title || s.content);
  }

  // 3. 純文字格式：按 [HH:MM:SS] 時間戳分段
  const lines = text.split("\n");
  const result: Array<{ timestamp: string; title: string; content: string }> = [];
  let current: { timestamp: string; title: string; lines: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const tsMatch = trimmed.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*(.*)$/);
    if (tsMatch) {
      if (current) result.push({ timestamp: current.timestamp, title: current.title, content: current.lines.join(" ").trim() });
      const rest = tsMatch[2].trim();
      const dotIdx = rest.indexOf("。"); const colonIdx = rest.indexOf("：");
      const splitIdx = dotIdx > 0 && dotIdx < 20 ? dotIdx + 1 : (colonIdx > 0 && colonIdx < 20 ? colonIdx + 1 : -1);
      const title = splitIdx > 0 ? rest.slice(0, splitIdx) : (rest.slice(0, 20) || `段落 ${result.length + 1}`);
      const content = splitIdx > 0 ? rest.slice(splitIdx).trim() : rest;
      current = { timestamp: `[${tsMatch[1]}]`, title, lines: content ? [content] : [] };
    } else if (current) {
      current.lines.push(trimmed);
    } else if (trimmed.length > 10) {
      result.push({ timestamp: "[00:00:00]", title: trimmed.slice(0, 20) + (trimmed.length > 20 ? "…" : ""), content: trimmed });
    }
  }
  if (current) result.push({ timestamp: current.timestamp, title: current.title, content: current.lines.join(" ").trim() });
  return result;
}

// ==================== 播放清單卡片 ====================
// 從 YouTube URL 自動提取縮圖 URL
function getYouTubeThumbnailFromUrl(url: string): string | null {
  if (!url) return null;
  // 先嘗試取得 video ID（單一影片）
  const videoId = getYouTubeVideoId(url);
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  // 播放清單無法直接取得縮圖，回傳 null
  return null;
}

function PlaylistCard({
  playlist,
  onClick,
}: {
  playlist: any;
  onClick: () => void;
}) {
  // 優先使用資料庫中的縮圖，其次從 YouTube URL 自動提取
  const videoUrl = playlist.youtube_playlist_url || playlist.youtubePlaylistUrl || "";
  const thumbnailUrl =
    playlist.thumbnail_url ||
    playlist.thumbnailUrl ||
    getYouTubeThumbnailFromUrl(videoUrl);
  const hasAiSummary = !!(playlist.ai_summary || playlist.aiSummary);

  return (
    <div
      className="group bg-card border rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/40"
      onClick={onClick}
    >
      <div className="relative bg-muted overflow-hidden" style={{ paddingTop: "56.25%" }}>
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={playlist.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/20">
            <Headphones className="w-12 h-12 text-primary/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
            <Play className="w-5 h-5 text-primary ml-0.5" />
          </div>
        </div>
        {hasAiSummary && (
          <div className="absolute top-2 right-2">
            <span className="bg-primary/90 text-primary-foreground text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI 摘要
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          {playlist.title}
        </h3>
        {playlist.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{playlist.description}</p>
        )}
        <div className="flex items-center justify-between">
          {playlist.category && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">
              {playlist.category}
            </span>
          )}
          <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
            <Play className="w-3 h-3" />
            播放清單
          </span>
        </div>
      </div>
    </div>
  );
}

// ==================== 播放頁面（完全複製教材學習區版型）====================
function PlaylistPlayer({
  playlist,
  onBack,
}: {
  playlist: any;
  onBack: () => void;
}) {
  const playlistId = playlist.id as number;
  const videoUrl = playlist.youtube_playlist_url || playlist.youtubePlaylistUrl || "";
  const ytPlaylistId = getYouTubePlaylistId(videoUrl);
  const ytVideoId = getYouTubeVideoId(videoUrl);
  const aiSummaryRaw = playlist.ai_summary || playlist.aiSummary || "";
  const transcriptText = playlist.transcript_text || playlist.transcriptText || "";

  // ---- 版面狀態（1=3:7, 2=1:1, 3=7:3）----
  // 3:7 = 影片30% 對詡70%；1:1 = 影片50% 對詡50%；7:3 = 影片70% 對詡30%
  const [layoutMode, setLayoutMode] = useState<1 | 2 | 3>(() => {
    // 從 localStorage 恢復上次選擇的比例模式
    const saved = localStorage.getItem('auditoryHall_layoutMode');
    const parsed = saved ? parseInt(saved) : NaN;
    return ([1, 2, 3] as const).includes(parsed as 1|2|3) ? (parsed as 1|2|3) : 1;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ---- 對話狀態 ----
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // ---- 字幕狀態 ----
  const [currentSubtitleIndexState, setCurrentSubtitleIndexState] = useState(-1);
  const prevSubtitleIndexRef = useRef<number>(-1);

  // ---- 字幕編輯狀態 ----
  const [editingSubtitleIndex, setEditingSubtitleIndex] = useState<number | null>(null);
  const [editingSubtitleText, setEditingSubtitleText] = useState("");
  const [showSubmitDialog, setShowSubmitDialog] = useState<number | null>(null);
  const [submitReason, setSubmitReason] = useState("");
  const [pendingSubtitleLines, setPendingSubtitleLines] = useState<Set<number>>(new Set());
  // pending 送審行的校正文字 map（lineIndex -> correctedText）
  const [pendingCorrectedTexts, setPendingCorrectedTexts] = useState<Record<number, string>>({});
  // 管理者直接覆蓋字幕後的本地覆蓋記錄（lineIndex -> 覆蓋後的完整行文字）
  const [localTranscriptOverrides, setLocalTranscriptOverrides] = useState<Record<number, string>>({});

  // ---- 管理者身份 ----
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // ---- YT Player ----
  const ytPlayerRef = useRef<any>(null);
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const ytTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasRestoredProgress = useRef(false);
  const watchProgressRef = useRef<number>(0); // 用於 closure 內取得最新進度値

  // ---- 播放進度記錄 API ----
  const { data: watchProgressData } = trpc.auditoryHall.getWatchProgress.useQuery(
    { playlistId: playlistId! },
    { enabled: !!playlistId && !!user, staleTime: 0 }
  );
  const saveWatchProgressMutation = trpc.auditoryHall.saveWatchProgress.useMutation();

  // 同步 watchProgressData 到 ref，並在資料載入後嘗試恢復進度
  useEffect(() => {
    if (watchProgressData?.lastPosition !== undefined) {
      watchProgressRef.current = watchProgressData.lastPosition;
      // 若 player 已存在且進度尚未恢復，則現在恢復
      if (!hasRestoredProgress.current && ytPlayerRef.current?.seekTo) {
        const lastPos = watchProgressData.lastPosition;
        if (lastPos > 5) {
          hasRestoredProgress.current = true;
          setTimeout(() => {
            try {
              ytPlayerRef.current?.seekTo?.(lastPos, true);
              const mm = Math.floor(lastPos / 60).toString().padStart(2, '0');
              const ss = (lastPos % 60).toString().padStart(2, '0');
              toast.info(`已從上次觀看位置繼續播放（${mm}:${ss}）`);
            } catch {}
          }, 500);
        }
      }
    }
  }, [watchProgressData]);

  // ---- Mutations ----
  const chatMutation = trpc.auditoryHall.chat.useMutation();

  // 字幕個人校正（試聽館獨立 API）
  const { data: myEditsData, refetch: refetchMyEdits } = trpc.auditoryHall.getMySubtitleEdits.useQuery(
    { playlistId: playlistId! },
    { enabled: !!playlistId }
  );
  const myEditsMap = useMemo(() => {
    const map: Record<number, string> = {};
    if (myEditsData) {
      for (const edit of myEditsData as any[]) {
        map[edit.line_index] = edit.corrected_text;
      }
    }
    return map;
  }, [myEditsData]);

  // 查詢所有 pending 送審行（其他同學送審中）
  const { data: pendingLinesData } = trpc.auditoryHall.getPendingSubtitleLines.useQuery(
    { playlistId: playlistId! },
    { enabled: !!playlistId, refetchInterval: 30000 }
  );
  // 將後端 pending 行合併到 state
  const pendingLinesMap = useMemo(() => {
    const map: Record<number, string> = {};
    if (pendingLinesData?.lines) {
      for (const l of pendingLinesData.lines) {
        map[l.lineIndex] = l.correctedText;
      }
    }
    return map;
  }, [pendingLinesData]);
  // 合併自己送審的 + 後端已有的 pending 行
  const allPendingLines = useMemo(() => {
    const merged = new Set(pendingSubtitleLines);
    if (pendingLinesData?.lines) {
      for (const l of pendingLinesData.lines) merged.add(l.lineIndex);
    }
    return merged;
  }, [pendingSubtitleLines, pendingLinesData]);

  // 查詢已審核通過的行（顯示「已訂正」標籤）
  const { data: approvedLinesData } = trpc.auditoryHall.getApprovedSubtitleLines.useQuery(
    { playlistId: playlistId! },
    { enabled: !!playlistId, refetchInterval: 60000 }
  );
  const approvedLinesSet = useMemo(() => {
    const s = new Set<number>();
    if (approvedLinesData?.lines) {
      for (const l of approvedLinesData.lines) s.add(l.lineIndex);
    }
    return s;
  }, [approvedLinesData]);

  // 管理者直接覆蓋字幕 mutation
  const adminOverwriteMutation = trpc.auditoryHall.adminOverwriteSubtitleLine.useMutation({
    onSuccess: (data) => {
      setEditingSubtitleIndex(null);
      toast.success("字幕已直接覆蓋更新");
      // 即時更新本地字幕顯示，不需重新載入頁面
      if (data?.lineIndex !== undefined && data?.updatedLine !== undefined) {
        setLocalTranscriptOverrides(prev => ({
          ...prev,
          [data.lineIndex]: data.updatedLine,
        }));
      }
    },
    onError: (err) => toast.error(err.message || "覆蓋失敗"),
  });

  const savePersonalEditMutation = trpc.auditoryHall.savePersonalSubtitleEdit.useMutation({
    onSuccess: () => { refetchMyEdits(); toast.success("個人校正已儲存"); },
    onError: () => toast.error("儲存失敗"),
  });

  const submitCorrectionMutation = trpc.auditoryHall.submitSubtitleCorrection.useMutation({
    onSuccess: (_data, variables) => {
      setShowSubmitDialog(null);
      setSubmitReason("");
      setEditingSubtitleIndex(null);
      setPendingSubtitleLines(prev => new Set([...prev, variables.lineIndex]));
      toast.success("已提交審核，感謝您的貢獻！");
    },
    onError: (err) => {
      if (err.message?.includes("已有待審核")) {
        toast.error("此行字幕已有同學送審，請等待審核完成");
      } else {
        toast.error("提交失敗，請稍後再試");
      }
    },
  });

  // ---- 解析字幕行 ----
  const parsedTranscriptLines = useMemo(() => {
    if (!transcriptText) return [];
    return transcriptText.split("\n")
      .filter((l: string) => l.trim())
      .map((line: string, lineIndex: number) => {
        // 如果管理者已覆蓋此行，使用覆蓋後的文字
        const overriddenLine = localTranscriptOverrides[lineIndex] !== undefined
          ? localTranscriptOverrides[lineIndex]
          : line;
        const match = overriddenLine.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*(.*)$/);
        if (!match) return null;
        return {
          seconds: timestampToSeconds(`[${match[1]}]`),
          text: match[2],
          timestamp: `[${match[1]}]`,
          lineIndex,
          originalText: match[2],
        };
      })
      .filter(Boolean) as Array<{ seconds: number; text: string; timestamp: string; lineIndex: number; originalText: string }>;
  }, [transcriptText, localTranscriptOverrides]);

  // ---- 解析 AI 摘要 ----
  const summaryItems = useMemo(() => parsePlainTextSummary(aiSummaryRaw), [aiSummaryRaw]);

  // ---- 跳轉影片時間點 ----
  const seekToTime = useCallback((seconds: number) => {
    if (ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(seconds, true);
      // 跳轉後自動播放
      setTimeout(() => {
        if (ytPlayerRef.current?.playVideo) {
          ytPlayerRef.current.playVideo();
        }
      }, 100);
    }
  }, []);

  // ---- 初始化 YT Player ----
  const initYTPlayer = useCallback(() => {
    const hasVideo = ytPlaylistId || ytVideoId;
    if (!hasVideo || !ytContainerRef.current) return;

    const loadPlayer = () => {
      if (!ytContainerRef.current) return;
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
      if (ytTimerRef.current) { clearInterval(ytTimerRef.current); ytTimerRef.current = null; }

      const YT = typeof window !== "undefined" ? (window as any).YT : undefined;
      if (!YT?.Player) return;

      // 根據 URL 類型决定 playerVars
      const playerVars: Record<string, any> = { autoplay: 0, rel: 0, modestbranding: 1 };
      if (ytPlaylistId) {
        playerVars.listType = "playlist";
        playerVars.list = ytPlaylistId;
      }

      ytPlayerRef.current = new YT.Player(ytContainerRef.current, {
        videoId: ytVideoId || undefined,
        playerVars,
        events: {
          onReady: () => {
            // 字幕同步 timer
            ytTimerRef.current = setInterval(() => {
              try {
                const t = ytPlayerRef.current?.getCurrentTime?.();
                if (typeof t !== "number") return;
                const sec = Math.floor(t);
                const lines = parsedTranscriptLines;
                if (!lines.length) return;
                let idx = 0;
                for (let i = 0; i < lines.length; i++) {
                  if (lines[i].seconds <= sec) idx = i;
                  else break;
                }
                if (idx !== prevSubtitleIndexRef.current) {
                  prevSubtitleIndexRef.current = idx;
                  setCurrentSubtitleIndexState(idx);
                }
              } catch {}
            }, 500);

            // 恢復上次播放進度（只執行一次）
            if (!hasRestoredProgress.current) {
              hasRestoredProgress.current = true;
              const lastPos = watchProgressRef.current;
              if (lastPos > 5) {
                setTimeout(() => {
                  try {
                    ytPlayerRef.current?.seekTo?.(lastPos, true);
                    const mm = Math.floor(lastPos / 60).toString().padStart(2, '0');
                    const ss = (lastPos % 60).toString().padStart(2, '0');
                    toast.info(`已從上次觀看位置繼續播放（${mm}:${ss}）`);
                  } catch {}
                }, 1200);
              }
            }

            // 定期儲存播放進度（每 10 秒）
            if (progressSaveTimerRef.current) clearInterval(progressSaveTimerRef.current);
            progressSaveTimerRef.current = setInterval(() => {
              try {
                const t = ytPlayerRef.current?.getCurrentTime?.();
                const state = ytPlayerRef.current?.getPlayerState?.();
                // 播放中（state === 1）才儲存
                if (typeof t === 'number' && t > 0 && state === 1) {
                  saveWatchProgressMutation.mutate({
                    playlistId: playlistId!,
                    lastPosition: Math.floor(t),
                  });
                }
              } catch {}
            }, 10000);
          },
          onError: (e: any) => {
            console.error("YouTube Player Error:", e.data);
          },
        },
      });
    };

    if (typeof window !== "undefined" && (window as any).YT?.Player) {
      loadPlayer();
    } else {
      if (typeof window === "undefined") return;
      if (!(window as any)._ytApiLoading) {
        (window as any)._ytApiLoading = true;
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
      const prev = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        loadPlayer();
      };
    }
  }, [ytPlaylistId, ytVideoId, parsedTranscriptLines]);

  useEffect(() => {
    initYTPlayer();
    return () => {
      if (ytTimerRef.current) { clearInterval(ytTimerRef.current); ytTimerRef.current = null; }
      if (progressSaveTimerRef.current) { clearInterval(progressSaveTimerRef.current); progressSaveTimerRef.current = null; }
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytPlaylistId, ytVideoId]);

  // ---- 截圖貼上 ----
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;
          const reader = new FileReader();
          reader.onload = (ev) => setPastedImage(ev.target?.result as string);
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // ---- 自動滾動對話 ----
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---- 帶入提問框的章節資訊 state ----
  const [activeSectionId, setActiveSectionId] = useState<number | undefined>(undefined);
  const [activeSectionTitle, setActiveSectionTitle] = useState<string | undefined>(undefined);
  const [activeSectionContent, setActiveSectionContent] = useState<string | undefined>(undefined);

  // ---- 帶入提問框：將章節摘要內容貼入輸入框，後面加上請說明詞 ----
  const handleSectionAsk = (sectionId: number, title: string, content: string) => {
    setActiveSectionId(sectionId);
    setActiveSectionTitle(title);
    setActiveSectionContent(content);
    // 將摘要內容貼入輸入框，後面加上請說明詞
    setMessage(`${content}請說明這段話的重點`);
  };

  // ---- 發送訊息 ----
  const sendMessage = async (customMessage?: string, customImage?: string | null) => {
    const msg = (customMessage || message).trim();
    const imageToUse = customImage !== undefined ? customImage : pastedImage;
    if (!msg && !imageToUse) return;
    if (chatMutation.isPending) return;

    const userContent = msg || "[截圖]";
    // 發送後清除帶入提問框的章節資訊（只用一次）
    const currentSectionId = activeSectionId;
    const currentSectionTitle = activeSectionTitle;
    const currentSectionContent = activeSectionContent;
    setMessage("");
    setPastedImage(null);
    setActiveSectionId(undefined);
    setActiveSectionTitle(undefined);
    setActiveSectionContent(undefined);

    const currentPastedImage = imageToUse || undefined;
    const userMsg: Message = { role: "user", content: userContent, image: currentPastedImage };
    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);

    try {
      const result = await chatMutation.mutateAsync({
        videoUrl: videoUrl || "https://www.youtube.com",
        videoTitle: playlist.title || "課程影片",
        message: userContent,
        image: currentPastedImage,         // 圖片模式
        aiSummary: currentSectionId !== undefined ? undefined : (aiSummaryRaw || undefined), // 帶入提問框模式不傳 aiSummary
        transcriptText: currentSectionId !== undefined ? undefined : (transcriptText || undefined),
        sectionId: currentSectionId,
        sectionTitle: currentSectionTitle,
        sectionContent: currentSectionContent,
        conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
      });
      setMessages(prev => [...prev, { role: "assistant", content: result.response }]);
      // AI 回覆完成後，自動 focus 輸入框
      setTimeout(() => chatInputRef.current?.focus(), 100);
    } catch (err: any) {
      toast.error(err?.message || "發送失敗，請再試一次");
      setMessages(prev => prev.slice(0, -1));
      setTimeout(() => chatInputRef.current?.focus(), 100);
    }
  };

  const handleSendMessage = () => sendMessage();

  // ---- 版面寬度計算（左側固定 240px，右側剩餘按比例分） ----
  // layoutMode: 1=3:7(影片30%對話70%), 2=1:1(各50%), 3=7:3(影片70%對話30%)
  const videoFlex = layoutMode === 1 ? "3" : layoutMode === 2 ? "1" : "7";
  const chatFlex  = layoutMode === 1 ? "7" : layoutMode === 2 ? "1" : "3";

  const currentSubtitleIndex = currentSubtitleIndexState;

  return (
    <div className="flex" style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>

      {/* ===== 左側：固定寬度 AI 摘要欄 ===== */}
      {sidebarCollapsed ? (
        /* 收起狀態：只顯示展開按鈕 */
        <div className="flex flex-col items-center pt-4 border-r bg-gray-50 w-10 flex-shrink-0">
          <button
            className="text-gray-400 hover:text-blue-600 p-1 rounded"
            title="展開左側欄"
            onClick={() => setSidebarCollapsed(false)}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div
          className="border-r bg-gray-50 flex flex-col flex-shrink-0"
          style={{ width: "280px", height: "100%", overflow: "hidden" }}
        >
          {/* 標題列 */}
          <div className="px-3 pt-3 pb-0 border-b flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <button
                className="px-3 py-1.5 text-sm font-medium rounded-t border-b-2 border-blue-600 text-blue-600"
              >🎓 AI摘要</button>
              <button
                className="text-gray-400 hover:text-blue-600 h-7 w-7 p-0 flex items-center justify-center rounded"
                title="收起左側欄"
                onClick={() => setSidebarCollapsed(true)}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              點擊「▶ 跳到此處」可跳轉影片時間點
            </p>
          </div>

          {/* 摘要內容 */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {!summaryItems.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="text-3xl mb-3">📝</span>
                <p className="text-sm text-gray-500">尚未生成摘要</p>
                <p className="text-xs text-gray-400 mt-1">請到後台試聽館管理上傳字幕生成</p>
              </div>
            ) : (
              <SummaryList
                summaries={summaryItems}
                seekToTime={seekToTime}
                onSectionAsk={handleSectionAsk}
              />
            )}
          </div>
        </div>
      )}

      {/* ===== 右側：影片欄 + 對話欄（flex，按比例分） ===== */}
      <div className="flex-1 flex flex-row" style={{ height: "100%", overflow: "hidden", minWidth: 0 }}>

        {/* ===== 影片欄 ===== */}
        <div
          className="bg-gray-900 text-white flex-shrink-0 flex flex-col"
          style={{ flex: videoFlex, overflow: "hidden", height: "100%" }}
        >
          {/* 第一行：標題 + 返回按鈕 */}
          <div className="flex items-center justify-between px-3 pt-1.5 pb-0.5 flex-shrink-0">
            <span className="text-sm font-medium flex items-center gap-2 truncate">
              <button
                className="text-gray-400 hover:text-white"
                onClick={onBack}
                title="返回播放清單"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              🎬 {playlist.title || "試聽館"}
            </span>
          </div>

          {/* 第二行：版面切換按鈕（3:7 / 1:1 / 7:3） */}
          <div className="flex items-center gap-1 px-3 pb-1.5 flex-shrink-0">
            {([1, 2, 3] as const).map((mode) => {
              const labels: Record<number, string> = { 1: "3:7", 2: "1:1", 3: "7:3" };
              const hints: Record<number, string> = {
                1: "邊上課邊對話（影片30% 對話70%）",
                2: "影片與對話各半",
                3: "影片為主（影片70% 對話30%）",
              };
              return (
                <button
                  key={mode}
                  title={hints[mode]}
                  className={`text-xs px-2 py-0.5 rounded transition-colors ${
                    layoutMode === mode
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                  onClick={() => {
                    setLayoutMode(mode);
                    // 儲存選擇的比例模式到 localStorage
                    localStorage.setItem('auditoryHall_layoutMode', String(mode));
                  }}
                >
                  {labels[mode]}
                </button>
              );
            })}
          </div>

          {/* 影片播放器 */}
          <div style={{ width: "100%", aspectRatio: "16/9", flexShrink: 0 }}>
            {(ytPlaylistId || ytVideoId) ? (
              <div
                ref={ytContainerRef}
                id="yt-auditory-player"
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <div className="text-center text-gray-400">
                  <Headphones className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">無效的影片連結</p>
                  {videoUrl && <p className="text-xs mt-1 opacity-60">{videoUrl}</p>}
                </div>
              </div>
            )}
          </div>

          {/* 字幕區塊（一次一行） */}
          {parsedTranscriptLines.length > 0 && (
            <div className="bg-gray-900 border-t border-gray-700 flex-shrink-0">
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
                  // 優先順序：對對對對 pending 校正 > 個人校正 > 原始字幕
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
                          onKeyDown={e => { if (e.key === "Escape") { setEditingSubtitleIndex(null); setShowSubmitDialog(null); } }}
                        />
                        <div className="flex gap-1 justify-end">
                          <button
                            className="text-[10px] text-gray-400 hover:text-gray-200 px-1"
                            onClick={() => { setEditingSubtitleIndex(null); setShowSubmitDialog(null); }}
                          >取消</button>
                          {isAdmin ? (
                            <button
                              className="text-[10px] bg-green-600 hover:bg-green-500 text-white px-2 py-0.5 rounded"
                              disabled={adminOverwriteMutation.isPending}
                              onClick={() => {
                                adminOverwriteMutation.mutate({
                                  playlistId: playlistId!,
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
                                  savePersonalEditMutation.mutate({
                                    playlistId: playlistId!,
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
                              <button
                                className="text-[10px] text-gray-400 hover:text-gray-200 px-1"
                                onClick={() => setShowSubmitDialog(null)}
                              >取消</button>
                              <button
                                className="text-[10px] bg-orange-600 hover:bg-orange-500 text-white px-2 py-0.5 rounded"
                                onClick={() => {
                                  submitCorrectionMutation.mutate({
                                    playlistId: playlistId!,
                                    lineIndex: line.lineIndex,
                                    timestamp: line.timestamp,
                                    originalText: line.originalText,
                                    correctedText: editingSubtitleText || displayText,
                                    reason: submitReason,
                                  });
                                }}
                                disabled={submitCorrectionMutation.isPending}
                              >
                                {submitCorrectionMutation.isPending ? "提交中..." : "確認提交"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // 顯示模式
                  return (
                    <div className="flex items-center gap-2 px-1">
                      <p className="text-yellow-300 text-base font-bold leading-relaxed select-none flex-1 text-center">
                        {displayText}
                        {pendingCorrected && <span className="ml-1 text-[10px] text-orange-400">[審核中]</span>}
                        {!pendingCorrected && approvedLinesSet.has(line.lineIndex) && <span className="ml-1 text-[10px] text-emerald-400">[已訂正]</span>}
                        {!pendingCorrected && !approvedLinesSet.has(line.lineIndex) && myEdit && <span className="ml-1 text-[10px] text-green-400">[已校正]</span>}
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
                          className="flex-shrink-0 flex flex-col items-center text-gray-400 hover:text-yellow-300 transition-colors group"
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

          {/* 課程說明文字（字幕下方，可滾動，URL 可點擊） */}
          {playlist.description && (
            <div className="bg-gray-800 border-t border-gray-700 flex-1 overflow-y-auto">
              <div className="px-3 py-2">
                <p className="text-xs text-gray-400 mb-1">📋 課程說明</p>
                <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                  {playlist.description.split(/(https?:\/\/[^\s]+)/g).map((part: string, i: number) =>
                    /^https?:\/\//.test(part) ? (
                      <a key={i} href={part} target="_blank" rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline break-all">
                        {part}
                      </a>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== AI 對話欄 ===== */}
        <div
          className="flex flex-col bg-white min-w-0"
          style={{ flex: chatFlex, overflow: "hidden", height: "100%" }}
        >
          {/* 對話區標題列 */}
          <div className="border-b px-4 py-2 flex items-center justify-between bg-white flex-shrink-0">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              AI 助教對話
              {messages.length > 0 && (
                <span className="text-xs text-gray-400">（{Math.floor(messages.length / 2)} 則對話）</span>
              )}
            </span>
            {messages.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-500 hover:bg-red-50 h-7 px-2 gap-1">
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="text-xs">清除對話</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>確認清除對話？</AlertDialogTitle>
                    <AlertDialogDescription>這將清除所有對話記錄，此操作無法復原。</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={() => setMessages([])}>確認清除</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* 輸入區（固定在上方，與教材一致） */}
          <div className="border-b-2 border-blue-200 p-3 bg-blue-50 space-y-2 flex-shrink-0">
            {/* 快捷按鈕 */}
            <div className="grid grid-cols-4 gap-1.5">
              {(() => {
                const lastAiMsg = [...messages].reverse().find(m => m.role === "assistant");
                const lastTopic = lastAiMsg ? lastAiMsg.content.replace(/\n|\r/g, " ").trim().slice(0, 80) : "";
                const topicSuffix = lastTopic ? `（針對剛才說明的內容：「${lastTopic}${lastTopic.length >= 80 ? "..." : ""}」）` : "";
                // 找對話中最近一張圖片
                const lastImgMsg = [...messages].reverse().find(m => m.role === 'user' && m.image);
                const lastImg = lastImgMsg?.image || null;
                return [
                  { label: "來個小測驗", msg: lastImg ? `請根據這張圖片的題目主題，出一題新的延伸選擇題讓我練習（不要出原題）` : `來個小測驗${topicSuffix}` },
                  { label: "舉個實例",   msg: lastImg ? `請根據這張圖片的主題，舉一個具體的例子幫我理解` : `舉個實例${topicSuffix}` },
                  { label: "深入解釋",   msg: lastImg ? `請根據這張圖片，深入解釋相關的知識內容` : `深入解釋${topicSuffix}` },
                  { label: "相關概念",   msg: lastImg ? `請根據這張圖片的內容，說明相關的重要概念` : `相關概念${topicSuffix}` },
                ].map(({ label, msg: quickMsg }) => (
                  <Button
                    key={label}
                    variant="outline"
                    size="sm"
                    className="justify-center text-xs h-7 px-1"
                    disabled={chatMutation.isPending}
                    onClick={() => {
                      // 直接將圖片傳入 sendMessage，不依賴非同步 state
                      sendMessage(quickMsg, lastImg);
                    }}
                  >
                    {chatMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : label}
                  </Button>
                ));
              })()}
            </div>

            {/* 截圖預覽（大預覽圖 + 快速提問按鈕） */}
            {pastedImage && (
              <div className="mb-2 bg-blue-50 border border-blue-200 rounded-lg p-2">
                <div className="flex gap-3 items-start">
                  {/* 截圖縮圖 */}
                  <div className="relative shrink-0">
                    <img
                      src={pastedImage}
                      alt="貼上的截圖"
                      className="max-h-32 max-w-[180px] rounded border border-gray-300 object-contain cursor-pointer"
                      onClick={() => window.open(pastedImage!, '_blank')}
                      title="點擊放大查看"
                    />
                    <button
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 shadow"
                      onClick={() => setPastedImage(null)}
                      title="移除截圖"
                    >×</button>
                  </div>
                  {/* 右側快速提問按鈕 */}
                  <div className="flex flex-col gap-1.5 flex-1">
                    <p className="text-xs text-blue-700 font-medium">📸 截圖已貼上！可以開始提問</p>
                    <button
                      className="text-left text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 font-medium transition-colors"
                      onClick={() => sendMessage('請幫我解釋這張截圖的內容')}
                      disabled={chatMutation.isPending}
                    >
                      請幫我解釋這張截圖的內容
                    </button>
                    <button
                      className="text-left text-xs bg-white hover:bg-blue-50 text-blue-700 rounded-lg px-3 py-1.5 border border-blue-200 transition-colors"
                      onClick={() => sendMessage('這張截圖的重點是什麼？請幫我整理成筆記')}
                      disabled={chatMutation.isPending}
                    >
                      整理成筆記
                    </button>
                    <button
                      className="text-left text-xs bg-white hover:bg-blue-50 text-blue-700 rounded-lg px-3 py-1.5 border border-blue-200 transition-colors"
                      onClick={() => sendMessage('這張截圖的內容可能出什麼考題？')}
                      disabled={chatMutation.isPending}
                    >
                      可能出什麼考題？
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 輸入框 */}
            <div className="flex gap-2 items-end">
              <Textarea
                ref={chatInputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
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
                {chatMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-blue-500 font-medium">📸 可截圖影片板書後貼上（Ctrl+V）直接提問！</p>
          </div>

          {/* 對話記錄（可滾動，占滿剩餘空間） */}
          <ScrollArea className="flex-1 p-4" style={{ minHeight: '200px' }}>
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center py-12">
                <div>
                  <MessageSquare className="w-10 h-10 mx-auto text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">還沒有對話記錄</p>
                  <p className="text-xs text-gray-400 mt-1">有任何問題都可以問 AI 助教 😊</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] ${msg.role === "assistant" ? "w-full" : ""}`}>
                      <div className={`rounded-lg px-4 py-3 ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"}`}>
                        {msg.role === "assistant" ? (
                          <MarkdownRenderer>{msg.content}</MarkdownRenderer>
                        ) : (
                          <div>
                            {msg.image && (
                              <img
                                src={msg.image}
                                alt="截圖"
                                className="max-h-40 max-w-full rounded mb-2 object-contain cursor-pointer border border-blue-400"
                                onClick={() => window.open(msg.image!, '_blank')}
                                title="點擊放大查看"
                              />
                            )}
                            {msg.content !== "[截圖]" && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {/* AI 思考動畫 */}
                {chatMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-5 py-3.5 shadow-sm">
                      <div className="flex items-center gap-1.5">
                        {[0, 200, 400].map((delay) => (
                          <span
                            key={delay}
                            className="block w-2.5 h-2.5 rounded-full bg-blue-500"
                            style={{ animation: "thinkingBounce 1.2s ease-in-out infinite", animationDelay: `${delay}ms` }}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-500 font-medium">AI 思考中…</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

// ==================== 主頁面（播放清單列表）====================
export default function AuditoryHall() {
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { data: playlists, isLoading } = trpc.auditoryHall.listPlaylists.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const categories = Array.from(
    new Set((playlists || []).map((p: any) => p.category).filter(Boolean))
  ) as string[];

  const filteredPlaylists = (playlists || []).filter((p: any) => {
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q ||
      (p.title || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  if (selectedPlaylist) {
    return (
      <div style={{ height: "100vh", overflow: "hidden" }}>
        <PlaylistPlayer
          playlist={selectedPlaylist}
          onBack={() => setSelectedPlaylist(null)}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="px-6 py-4 border-b bg-card sticky top-0 z-10">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Headphones className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">試聽館</h1>
              <p className="text-xs text-muted-foreground">精選課程播放清單，搭配 AI 助教互動學習</p>
            </div>
          </div>
          {/* 關鍵字搜尋框 */}
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜尋課程名稱..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        {/* 分類筛選按鈕 */}
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={categoryFilter === "all" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setCategoryFilter("all")}
            >全部</Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setCategoryFilter(cat)}
              >{cat}</Button>
            ))}
          </div>
        )}
      </div>

      <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPlaylists.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Headphones className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium mb-1">尚無播放清單</p>
              <p className="text-sm">管理員可在後台新增 YouTube 播放清單</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPlaylists.map((playlist: any) => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onClick={() => setSelectedPlaylist(playlist)}
                />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
