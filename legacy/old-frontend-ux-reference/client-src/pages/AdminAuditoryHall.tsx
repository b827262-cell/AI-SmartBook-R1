/**
 * 管理員試聽館管理頁面
 * 管理員可以新增、編輯、刪除播放清單
 * 支援上傳音檔（mp3/wav/m4a）或 SRT 字幕檔，自動生成 AI 摘要
 * 縮圖支援：截圖貼上、拖放上傳、點擊選擇、自動從 YouTube 抓取
 */
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus, Edit, Trash2, Upload, Sparkles, Headphones,
  Loader2, Music, FileText, CheckCircle2, ExternalLink,
  Image, X, RefreshCw, ClipboardPaste
} from "lucide-react";

// 從 YouTube URL 取得嵌入用 embed URL
function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  // 播放清單 URL
  const listMatch = url.match(/[?&]list=([\w-]+)/);
  if (listMatch) {
    // 播放清單：嵌入第一筆影片
    const videoMatch = url.match(/[?&]v=([\w-]+)/);
    if (videoMatch) {
      return `https://www.youtube.com/embed/${videoMatch[1]}?list=${listMatch[1]}`;
    }
    return `https://www.youtube.com/embed/videoseries?list=${listMatch[1]}`;
  }
  // 單一影片 URL
  const shortMatch = url.match(/youtu\.be\/([\w-]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  const longMatch = url.match(/[?&]v=([\w-]+)/);
  if (longMatch) return `https://www.youtube.com/embed/${longMatch[1]}`;
  return null;
}

// YouTube 影片預覽元件
function YouTubePreview({ url }: { url: string }) {
  const embedUrl = getYouTubeEmbedUrl(url);
  if (!embedUrl) return null;
  return (
    <div className="mt-2 rounded-lg overflow-hidden border bg-black" style={{ aspectRatio: '16/9' }}>
      <iframe
        src={embedUrl}
        title="YouTube 影片預覽"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  );
}

type Playlist = {
  id: number;
  title: string;
  description?: string;
  youtube_playlist_url: string;
  youtube_playlist_id: string;
  thumbnail_url?: string;
  category?: string;
  sort_order: number;
  is_active: number;
  transcript_text?: string;
  ai_summary?: string;
  created_at: string;
};

// ─── 縮圖上傳元件 ───────────────────────────────────────────────────────────
interface ThumbnailUploaderProps {
  value: string;
  onChange: (url: string) => void;
  youtubePlaylistUrl?: string;
  uploadToS3: (params: { fileData: string; fileName: string; mimeType: string }) => Promise<{ url: string }>;
}

function ThumbnailUploader({ value, onChange, youtubePlaylistUrl, uploadToS3 }: ThumbnailUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // 上傳圖片到 S3 並取得 URL
  const uploadImage = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("請選擇圖片檔案");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("圖片大小不能超過 5MB");
      return;
    }
    setIsUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const ext = file.name.split(".").pop() || "jpg";
      const { url } = await uploadToS3({
        fileData: base64,
        fileName: `thumbnail-${Date.now()}.${ext}`,
        mimeType: file.type,
      });
      onChange(url);
      toast.success("縮圖已上傳");
    } catch (err) {
      toast.error("縮圖上傳失敗");
    } finally {
      setIsUploading(false);
    }
  }, [uploadToS3, onChange]);

  // 從剪貼簿貼上圖片（Ctrl+V）
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) uploadImage(file);
        break;
      }
    }
  }, [uploadImage]);

  // 監聽全域貼上事件（當 dropzone 在 focus 時）
  useEffect(() => {
    const zone = dropZoneRef.current;
    if (!zone) return;
    zone.addEventListener("paste", handlePaste as EventListener);
    return () => zone.removeEventListener("paste", handlePaste as EventListener);
  }, [handlePaste]);

  // 也監聽 document 的 paste（當對話框開啟時）
  useEffect(() => {
    document.addEventListener("paste", handlePaste as EventListener);
    return () => document.removeEventListener("paste", handlePaste as EventListener);
  }, [handlePaste]);

  // 拖放處理
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadImage(file);
  }, [uploadImage]);

  // 自動從 YouTube 抓取縮圖
  const fetchYoutubeThumbnail = async () => {
    if (!youtubePlaylistUrl) {
      toast.error("請先填入 YouTube 影片網址");
      return;
    }
    setIsFetching(true);
    try {
      // 策略：有 videoId 直接用固定 URL（最可靠），純播放清單用 oEmbed
      let videoId = "";
      let playlistId = "";
      try {
        const urlObj = new URL(youtubePlaylistUrl);
        videoId = urlObj.searchParams.get("v") || "";
        playlistId = urlObj.searchParams.get("list") || "";
      } catch {}
      if (!videoId) {
        const sm = youtubePlaylistUrl.match(/youtu\.be\/([\w-]+)/);
        if (sm) videoId = sm[1];
      }
      if (!videoId && !playlistId) {
        toast.error("無法解析 YouTube 影片 ID");
        return;
      }

      let thumbnailUrl = "";
      if (videoId) {
        // 有 videoId：直接用 YouTube 固定縮圖 URL（不需要 API，100% 可靠）
        thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      } else {
        // 純播放清單：嘗試 YouTube oEmbed API
        try {
          const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubePlaylistUrl)}&format=json`;
          const res = await fetch(oembedUrl);
          if (res.ok) {
            const data = await res.json();
            if (data.thumbnail_url) thumbnailUrl = data.thumbnail_url;
          }
        } catch {}
        // fallback：用 playlistId 構造
        if (!thumbnailUrl) {
          thumbnailUrl = `https://img.youtube.com/vi/${playlistId}/hqdefault.jpg`;
        }
      }

      onChange(thumbnailUrl);
      toast.success("縮圖已自動填入，如不正確請手動上傳");
    } catch (err) {
      toast.error("自動抓取縮圖失敗");
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">縮圖</label>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={fetchYoutubeThumbnail}
            disabled={isFetching}
          >
            {isFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            自動抓取
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-destructive"
              onClick={() => onChange("")}
            >
              <X className="w-3 h-3" />
              清除
            </Button>
          )}
        </div>
      </div>

      {/* 拖放/貼上區域 */}
      <div
        ref={dropZoneRef}
        tabIndex={0}
        className={`relative border-2 border-dashed rounded-lg transition-colors cursor-pointer outline-none
          ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"}
          ${value ? "p-1" : "p-4"}`}
        onClick={() => imgInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">上傳中...</p>
          </div>
        ) : value ? (
          <div className="relative">
            <img
              src={value}
              alt="縮圖預覽"
              className="w-full h-32 object-cover rounded"
              onError={e => {
                (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60'%3E%3Crect width='100' height='60' fill='%23f0f0f0'/%3E%3Ctext x='50' y='35' text-anchor='middle' fill='%23999' font-size='12'%3E圖片載入失敗%3C/text%3E%3C/svg%3E";
              }}
            />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors rounded flex items-center justify-center opacity-0 hover:opacity-100">
              <p className="text-white text-xs font-medium">點擊更換</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <Image className="w-8 h-8 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">點擊選擇 / 拖放圖片</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                <ClipboardPaste className="w-3 h-3" />
                或直接 Ctrl+V 貼上截圖
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 手動輸入 URL */}
      <Input
        placeholder="或直接貼上圖片網址"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-xs h-8"
      />

      <input
        ref={imgInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) uploadImage(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ─── 字幕審核 Tab ──────────────────────────────────────────────────────────────

function SubtitleReviewTab() {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [page, setPage] = useState(1);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  // 可編輯 Dialog 狀態
  const [approveDialogItem, setApproveDialogItem] = useState<any | null>(null);
  const [editedText, setEditedText] = useState("");
  const utils = trpc.useUtils();

  const { data, isLoading, refetch } = trpc.auditoryHall.adminGetSubtitleRequests.useQuery(
    { status: statusFilter, page, pageSize: 20 },
    { refetchOnWindowFocus: false }
  );

  const approveMutation = trpc.auditoryHall.adminApproveSubtitle.useMutation({
    onSuccess: () => {
      toast.success("已審核通過，字幕已覆蓋");
      refetch();
      setApproveDialogItem(null);
      setEditedText("");
    },
    onError: (err) => toast.error(err.message || "審核失敗"),
  });
  const rejectMutation = trpc.auditoryHall.adminRejectSubtitle.useMutation({
    onSuccess: () => { toast.success("已拒絕申請"); refetch(); setReviewingId(null); setReviewNote(""); },
    onError: (err) => toast.error(err.message || "操作失敗"),
  });
  const batchApproveMutation = trpc.auditoryHall.adminBatchApproveSubtitle.useMutation({
    onSuccess: (d) => { toast.success(`已批次通過 ${d.count} 筆`); refetch(); },
    onError: (err) => toast.error(err.message || "批次操作失敗"),
  });

  const items: any[] = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">字幕校正審核</h2>
        <p className="text-sm text-muted-foreground">學生提交的字幕校正申請，審核通過後將正式覆蓋所有人的字幕</p>
      </div>
      {/* 狀態篩選 */}
      <div className="flex gap-2">
        {(['pending','approved','rejected'] as const).map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              statusFilter === s
                ? s === 'pending' ? 'bg-orange-500 text-white' : s === 'approved' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {s === 'pending' ? '待審核' : s === 'approved' ? '已通過' : '已拒絕'}
            {s === 'pending' && total > 0 && statusFilter === 'pending' && (
              <span className="ml-1 bg-white/20 rounded-full px-1.5 text-xs">{total}</span>
            )}
          </button>
        ))}
        {statusFilter === 'pending' && items.length > 0 && (
          <button
            onClick={() => batchApproveMutation.mutate({ requestIds: items.map((i: any) => i.id) })}
            disabled={batchApproveMutation.isPending}
            className="ml-auto px-3 py-1 rounded-full text-sm font-medium bg-green-600 text-white hover:bg-green-500 disabled:opacity-50"
          >
            {batchApproveMutation.isPending ? "處理中..." : `全部通過 (${items.length})`}
          </button>
        )}
      </div>
      {/* 列表 */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !items.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p>目前沒有{statusFilter === 'pending' ? '待審核' : statusFilter === 'approved' ? '已通過' : '已拒絕'}的字幕校正申請</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item: any) => (
            <div key={item.id} className="border rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{item.playlist_title || `播放清單 #${item.playlist_id}`}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{item.timestamp}</span>
                    <span className="text-xs text-muted-foreground">by {item.student_name || '未知學生'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      item.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                      item.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>{item.status === 'pending' ? '待審核' : item.status === 'approved' ? '已通過' : '已拒絕'}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="bg-red-50 dark:bg-red-950/30 rounded p-2">
                      <p className="text-xs text-muted-foreground mb-1">原始字幕</p>
                      <p className="text-sm">{item.original_text}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950/30 rounded p-2">
                      <p className="text-xs text-muted-foreground mb-1">校正後</p>
                      <p className="text-sm font-medium">{item.corrected_text}</p>
                    </div>
                  </div>
                  {item.reason && <p className="text-xs text-muted-foreground mt-1">理由：{item.reason}</p>}
                  {item.review_note && <p className="text-xs text-muted-foreground mt-1">審核備注：{item.review_note}</p>}
                </div>
                {item.status === 'pending' && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => { setApproveDialogItem(item); setEditedText(item.corrected_text || ''); }}
                      className="px-3 py-1 text-xs bg-green-600 hover:bg-green-500 text-white rounded font-medium"
                    >審核</button>
                    <button
                      onClick={() => setReviewingId(reviewingId === item.id ? null : item.id)}
                      className="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded font-medium"
                    >拒絕</button>
                  </div>
                )}
              </div>
              {reviewingId === item.id && (
                <div className="flex gap-2 items-center pt-1 border-t">
                  <input
                    className="flex-1 text-sm border rounded px-2 py-1 bg-background"
                    placeholder="拒絕理由（選填）"
                    value={reviewNote}
                    onChange={e => setReviewNote(e.target.value)}
                  />
                  <button
                    onClick={() => rejectMutation.mutate({ requestId: item.id, reviewNote })}
                    disabled={rejectMutation.isPending}
                    className="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded font-medium disabled:opacity-50"
                  >{rejectMutation.isPending ? '處理中...' : '確認拒絕'}</button>
                  <button onClick={() => setReviewingId(null)} className="px-2 py-1 text-xs text-muted-foreground">取消</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {/* 分頁 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="px-3 py-1 text-sm border rounded disabled:opacity-40">上一頁</button>
          <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} className="px-3 py-1 text-sm border rounded disabled:opacity-40">下一頁</button>
        </div>
      )}
      {/* 可編輯審核 Dialog */}
      <Dialog open={!!approveDialogItem} onOpenChange={(open) => { if (!open) { setApproveDialogItem(null); setEditedText(''); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>字幕校正審核</DialogTitle>
          </DialogHeader>
          {approveDialogItem && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{approveDialogItem.playlist_title || `播放清單 #${approveDialogItem.playlist_id}`}</span>
                <span className="font-mono text-blue-500 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded text-xs">{approveDialogItem.timestamp}</span>
                <span className="text-muted-foreground text-xs">by {approveDialogItem.student_name || '未知學生'}</span>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 rounded p-3">
                <p className="text-xs text-muted-foreground mb-1 font-semibold">原始字幕</p>
                <p className="text-sm">{approveDialogItem.original_text}</p>
              </div>
              <div>
                <p className="text-xs text-green-700 mb-1 font-semibold">校正內容（可直接修改）</p>
                <textarea
                  className="w-full border border-green-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none bg-background"
                  rows={3}
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  placeholder="學生校正版，可在此直接修改"
                />
              </div>
              {approveDialogItem.reason && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">校正理由：</span>{approveDialogItem.reason}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setApproveDialogItem(null); setEditedText(''); }}>取消</Button>
            <Button
              onClick={() => approveMutation.mutate({
                requestId: approveDialogItem?.id as number,
                finalText: editedText.trim() || approveDialogItem?.corrected_text,
              })}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {approveMutation.isPending ? '更新中...' : '校正通過，正式覆蓋字幕'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── 主頁面 ────────────────────────────────────────────────────────────────────────────────

export default function AdminAuditoryHall() {
  const [activeTab, setActiveTab] = useState<'playlists' | 'subtitle_review'>('playlists');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTranscriptDialogOpen, setIsTranscriptDialogOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0~100
  const [uploadStatus, setUploadStatus] = useState(""); // 狀態文字
  // 字幕行編輯狀態
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
  const [editingLineText, setEditingLineText] = useState("");
  const [highlightedLineIndex, setHighlightedLineIndex] = useState<number | null>(null);
  // AI 校正字幕狀態
  const [isAiCorrecting, setIsAiCorrecting] = useState(false);
  const [correctedLines, setCorrectedLines] = useState<string[]>([]);
  const [editingCorrectedIndex, setEditingCorrectedIndex] = useState<number | null>(null);
  const [editingCorrectedText, setEditingCorrectedText] = useState("");
  const [isCorrectionDialogOpen, setIsCorrectionDialogOpen] = useState(false);
  const [correctionPlaylistId, setCorrectionPlaylistId] = useState<number | null>(null);
  const [showDiffOnly, setShowDiffOnly] = useState(false);
  const [showTypoOnly, setShowTypoOnly] = useState(false);
  const [showPreviewPlayer, setShowPreviewPlayer] = useState(true);
  const ytPlayerRef = useRef<any>(null);
  const ytIframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 時間碼轉秒數（HH:MM:SS 或 MM:SS）
  const tsToSeconds = (ts: string): number => {
    const clean = ts.replace(/[\[\]]/g, '').trim();
    const parts = clean.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  };

  // 點擊時間碼跳轉 YouTube 播放器
  const seekYouTube = (ts: string) => {
    const secs = tsToSeconds(ts);
    if (ytIframeRef.current) {
      // 透過 postMessage 控制 YouTube IFrame
      ytIframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [secs, true] }),
        '*'
      );
      ytIframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
        '*'
      );
    }
  };

  // 表單狀態
  const [form, setForm] = useState({
    title: "",
    description: "",
    youtubePlaylistUrl: "",
    category: "",
    thumbnailUrl: "",
    sortOrder: 0,
  });

  // 取得播放清單（管理員看全部，包含非 active）
  const { data: playlists, isLoading, refetch } = trpc.auditoryHall.listPlaylists.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // 新增播放清單
  const addMutation = trpc.auditoryHall.addPlaylist.useMutation({
    onSuccess: () => {
      toast.success("播放清單已新增");
      setIsAddDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (err) => toast.error(err.message || "新增失敗"),
  });

  // 更新播放清單
  const updateMutation = trpc.auditoryHall.updatePlaylist.useMutation({
    onSuccess: () => {
      toast.success("播放清單已更新");
      setIsEditDialogOpen(false);
      refetch();
    },
    onError: (err) => toast.error(err.message || "更新失敗"),
  });

  // 刪除播放清單
  const deleteMutation = trpc.auditoryHall.deletePlaylist.useMutation({
    onSuccess: () => {
      toast.success("播放清單已刪除");
      refetch();
    },
    onError: (err) => toast.error(err.message || "刪除失敗"),
  });

  // 上傳檔案到 S3（小檔案直接用）
  const uploadToS3Mutation = trpc.auditoryHall.uploadFileToS3.useMutation({
    onError: (err) => toast.error(err.message || "上傳失敗"),
  });

  // 分片上傳 API
  const uploadChunkMutation = trpc.auditoryHall.uploadChunk.useMutation();
  const mergeChunksMutation = trpc.auditoryHall.mergeChunks.useMutation();

  // 更新單行字幕
  const updateLineMutation = trpc.auditoryHall.updateTranscriptLine.useMutation({
    onSuccess: (data) => {
      toast.success("字幕已更新");
      setEditingLineIndex(null);
      // 更新本地 selectedPlaylist
      if (selectedPlaylist) {
        const lines = (selectedPlaylist.transcript_text || '').split('\n');
        if (editingLineIndex !== null) lines[editingLineIndex] = data.updatedLine;
        setSelectedPlaylist({ ...selectedPlaylist, transcript_text: lines.join('\n') });
      }
      refetch();
    },
    onError: (err) => toast.error(err.message || "更新失敗"),
  });

  // 上傳字幕/音檔並生成 AI 摘要
  const uploadTranscriptMutation = trpc.auditoryHall.uploadTranscript.useMutation({
    onSuccess: (data) => {
      toast.success(`AI 摘要已生成！字幕長度：${data.transcriptLength} 字，摘要長度：${data.summaryLength} 字`);
      setIsTranscriptDialogOpen(false);
      refetch();
    },
    onError: (err) => toast.error(err.message || "生成摘要失敗"),
  });

  const regenerateAiSummaryMutation = trpc.auditoryHall.regenerateAiSummary.useMutation({
    onSuccess: () => {
      toast.success("AI 摘要已重新生成！");
      refetch();
    },
    onError: (err) => toast.error(err.message || "重新生成失敗"),
  });

  // AI 校正字幕
  const aiCorrectMutation = trpc.auditoryHall.aiCorrectTranscript.useMutation({
    onSuccess: (data) => {
      toast.success(`AI 校正完成！共 ${data.lineCount} 行，請對照檢查並手動修正`);
      setIsAiCorrecting(false);
      // 重新查詢校正版
      if (correctionPlaylistId) {
        getCorrectedQuery.refetch();
      }
    },
    onError: (err) => {
      toast.error(err.message || "AI 校正失敗");
      setIsAiCorrecting(false);
    },
  });

  // 儲存手動校正字幕
  const saveCorrectedMutation = trpc.auditoryHall.saveCorrectedTranscript.useMutation({
    onSuccess: () => {
      toast.success("校正版字幕已儲存");
      setEditingCorrectedIndex(null);
    },
    onError: (err) => toast.error(err.message || "儲存失敗"),
  });

  // 將校正版覆蓋原始字幕
  const applyCorrectedMutation = trpc.auditoryHall.applyCorrectedTranscript.useMutation({
    onSuccess: () => {
      toast.success("校正版字幕已覆蓋原始字幕！");
      setIsCorrectionDialogOpen(false);
      refetch();
    },
    onError: (err) => toast.error(err.message || "覆蓋失敗"),
  });

  // 取得校正版字幕
  const getCorrectedQuery = trpc.auditoryHall.getCorrectedTranscript.useQuery(
    { playlistId: correctionPlaylistId ?? 0 },
    {
      enabled: isCorrectionDialogOpen && correctionPlaylistId !== null,
      refetchOnWindowFocus: false,
    }
  );

  // 當校正版資料載入後，同步到 correctedLines state
  // 依賴 correctionPlaylistId 確保切換課程時也重新同步
  useEffect(() => {
    if (getCorrectedQuery.data?.correctedText) {
      setCorrectedLines(getCorrectedQuery.data.correctedText.split('\n').filter((l: string) => l.trim()));
    } else if (getCorrectedQuery.data && !getCorrectedQuery.data.correctedText) {
      // 資料庫沒有校正版，清空
      setCorrectedLines([]);
    }
  }, [getCorrectedQuery.data, correctionPlaylistId]);

  // 開啟 AI 校正對話框
  const openCorrectionDialog = (playlist: Playlist) => {
    // 切換到不同課程時才清空，同一課程重新開啟保留校正結果
    if (correctionPlaylistId !== playlist.id) {
      setCorrectedLines([]);
    }
    setCorrectionPlaylistId(playlist.id);
    setEditingCorrectedIndex(null);
    setIsCorrectionDialogOpen(true);
  };

  const resetForm = () => {
    setForm({ title: "", description: "", youtubePlaylistUrl: "", category: "", thumbnailUrl: "", sortOrder: 0 });
  };

  const handleAdd = () => {
    if (!form.title.trim()) { toast.error("請輸入標題"); return; }
    if (!form.youtubePlaylistUrl.trim()) { toast.error("請輸入 YouTube 播放清單網址"); return; }
    addMutation.mutate({
      title: form.title,
      description: form.description || undefined,
      youtubePlaylistUrl: form.youtubePlaylistUrl,
      category: form.category || undefined,
      thumbnailUrl: form.thumbnailUrl || undefined,
      sortOrder: form.sortOrder,
    });
  };

  const handleEdit = () => {
    if (!selectedPlaylist) return;
    if (!form.title.trim()) { toast.error("請輸入標題"); return; }
    updateMutation.mutate({
      id: selectedPlaylist.id,
      title: form.title,
      description: form.description || undefined,
      youtubePlaylistUrl: form.youtubePlaylistUrl || undefined,
      category: form.category || undefined,
      thumbnailUrl: form.thumbnailUrl || undefined,
      sortOrder: form.sortOrder,
    });
  };

  const handleDelete = (playlist: Playlist) => {
    if (!confirm(`確定要刪除「${playlist.title}」嗎？`)) return;
    deleteMutation.mutate({ id: playlist.id });
  };

  const openEditDialog = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setForm({
      title: playlist.title,
      description: playlist.description || "",
      youtubePlaylistUrl: playlist.youtube_playlist_url,
      category: playlist.category || "",
      thumbnailUrl: playlist.thumbnail_url || "",
      sortOrder: playlist.sort_order,
    });
    setIsEditDialogOpen(true);
  };

  const openTranscriptDialog = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setIsTranscriptDialogOpen(true);
  };

  // 處理字幕/音檔上傳（支援分片上傳，無檔案大小限制）
  const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB 每片

  const handleFileUpload = async (file: File) => {
    if (!selectedPlaylist) return;
    const isAudio = /\.(mp3|wav|m4a|ogg|webm|mp4)$/i.test(file.name);
    const isSrt = /\.srt$/i.test(file.name);
    if (!isAudio && !isSrt) {
      toast.error("請上傳音檔（mp3/wav/m4a/m4a）或 SRT 字幕檔");
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus("準備中...");
    try {
      const mimeType = file.type || (isAudio ? "audio/mpeg" : "text/plain");
      let fileUrl = "";

      if (file.size <= CHUNK_SIZE) {
        // 小檔案：直接上傳
        setUploadStatus("上傳中...");
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const result = await uploadToS3Mutation.mutateAsync({
          fileData: base64,
          fileName: file.name,
          mimeType,
        });
        fileUrl = result.url;
        setUploadProgress(80);
      } else {
        // 大檔案：分片上傳
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const uploadId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
        setUploadStatus(`分片上傳中（共 ${totalChunks} 片，檔案 ${fileSizeMB}MB）`);

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunkBlob = file.slice(start, end);

          const chunkBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(chunkBlob);
          });

          await uploadChunkMutation.mutateAsync({
            uploadId,
            chunkIndex: i,
            totalChunks,
            chunkData: chunkBase64,
            fileName: file.name,
            mimeType,
          });

          const progress = Math.round(((i + 1) / totalChunks) * 70);
          setUploadProgress(progress);
          setUploadStatus(`分片上傳中... ${i + 1}/${totalChunks}`);
        }

        setUploadStatus("合併分片並上傳 S3...");
        setUploadProgress(75);
        const mergeResult = await mergeChunksMutation.mutateAsync({
          uploadId,
          totalChunks,
          fileName: file.name,
          mimeType,
        });
        fileUrl = mergeResult.url;
        setUploadProgress(80);
      }

      setUploadStatus("正在生成 AI 摘要（這可能需要 1~3 分鐘）...");
      await uploadTranscriptMutation.mutateAsync({
        playlistId: selectedPlaylist.id,
        type: isAudio ? "audio" : "srt",
        fileUrl,
        fileName: file.name,
      });
      setUploadProgress(100);
    } catch (err) {
      console.error(err);
      setUploadStatus("上傳失敗");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus("");
    }
  };

  // S3 上傳函數（傳給 ThumbnailUploader）
  const handleUploadToS3 = async (params: { fileData: string; fileName: string; mimeType: string }) => {
    return uploadToS3Mutation.mutateAsync(params);
  };

  return (
    <div className="p-6 space-y-6">
      {/* 標題 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Headphones className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">試聽館管理</h1>
            <p className="text-sm text-muted-foreground">管理 YouTube 播放清單，上傳字幕生成 AI 摘要</p>
          </div>
        </div>
        {activeTab === 'playlists' && (
          <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            新增播放清單
          </Button>
        )}
      </div>

      {/* Tab 切換 */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab('playlists')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'playlists' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >播放清單管理</button>
        <button
          onClick={() => setActiveTab('subtitle_review')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'subtitle_review' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >字幕審核</button>
      </div>

      {activeTab === 'subtitle_review' && <SubtitleReviewTab />}

      {activeTab === 'playlists' && (
        <>
      {/* 播放清單列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !playlists?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <Headphones className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>尚無播放清單，點擊「新增播放清單」開始建立</p>
        </div>
      ) : (
        <div className="space-y-3">
          {playlists.map((playlist: Playlist) => (
            <div key={playlist.id} className="border rounded-xl p-4 flex gap-4 items-start">
              {/* 縮圖 */}
              <div className="w-20 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                {playlist.thumbnail_url ? (
                  <img
                    src={playlist.thumbnail_url}
                    alt={playlist.title}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Headphones className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              {/* 資訊 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-sm">{playlist.title}</h3>
                    {playlist.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{playlist.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {playlist.category && (
                        <Badge variant="secondary" className="text-xs">{playlist.category}</Badge>
                      )}
                      {playlist.ai_summary ? (
                        <Badge variant="outline" className="text-xs gap-1 text-primary border-primary/30">
                          <Sparkles className="w-3 h-3" />
                          已有 AI 摘要
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">尚無摘要</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">排序 {playlist.sort_order}</span>
                    </div>
                  </div>
                  {/* 操作按鈕 */}
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7"
                      onClick={() => window.open(playlist.youtube_playlist_url, "_blank")}
                      title="開啟 YouTube"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7"
                      onClick={() => openTranscriptDialog(playlist)}
                      title="上傳字幕/音檔"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </Button>
                    {playlist.transcript_text && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-primary hover:text-primary"
                        onClick={() => openCorrectionDialog(playlist)}
                        title="AI 校正字幕"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7"
                      onClick={() => openEditDialog(playlist)}
                      title="編輯"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(playlist)}
                      title="刪除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新增對話框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新增播放清單</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">標題 *</label>
              <Input
                placeholder="例如：高中數學微積分入門"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">說明</label>
              <Textarea
                placeholder="播放清單的簡短說明..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">YouTube 影片網址 *</label>
              <Input
                placeholder="https://www.youtube.com/playlist?list=PLxxxxxx 或 https://youtu.be/VIDEO_ID"
                value={form.youtubePlaylistUrl}
                onChange={e => setForm(f => ({ ...f, youtubePlaylistUrl: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                支援播放清單網址（list=）或單一影片網址（v= 或 youtu.be/）
              </p>
              {/* YouTube 影片預覽 */}
              {form.youtubePlaylistUrl && getYouTubeEmbedUrl(form.youtubePlaylistUrl) && (
                <YouTubePreview url={form.youtubePlaylistUrl} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">分類</label>
                <Input
                  placeholder="例如：數學、英文、物理"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">排序</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.sortOrder}
                  onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            {/* 縮圖上傳元件 */}
            <ThumbnailUploader
              value={form.thumbnailUrl}
              onChange={url => setForm(f => ({ ...f, thumbnailUrl: url }))}
              youtubePlaylistUrl={form.youtubePlaylistUrl}
              uploadToS3={handleUploadToS3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>取消</Button>
            <Button onClick={handleAdd} disabled={addMutation.isPending}>
              {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              新增
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編輯對話框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>編輯播放清單</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">標題 *</label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">說明</label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">YouTube 影片網址</label>
              <Input
                placeholder="https://www.youtube.com/playlist?list=PLxxxxxx 或 https://youtu.be/VIDEO_ID"
                value={form.youtubePlaylistUrl}
                onChange={e => setForm(f => ({ ...f, youtubePlaylistUrl: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                支援播放清單網址（list=）或單一影片網址（v= 或 youtu.be/）
              </p>
              {/* YouTube 影片預覽 */}
              {form.youtubePlaylistUrl && getYouTubeEmbedUrl(form.youtubePlaylistUrl) && (
                <YouTubePreview url={form.youtubePlaylistUrl} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">分類</label>
                <Input
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">排序</label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            {/* 縮圖上傳元件 */}
            <ThumbnailUploader
              value={form.thumbnailUrl}
              onChange={url => setForm(f => ({ ...f, thumbnailUrl: url }))}
              youtubePlaylistUrl={form.youtubePlaylistUrl}
              uploadToS3={handleUploadToS3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>取消</Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              儲存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 上傳字幕/音檔對話框 */}
      <Dialog open={isTranscriptDialogOpen} onOpenChange={setIsTranscriptDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>上傳字幕 / 音檔</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              為「<strong>{selectedPlaylist?.title}</strong>」上傳字幕或音檔，系統將自動生成 AI 摘要。
            </p>
            {selectedPlaylist?.ai_summary && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-primary">此播放清單已有 AI 摘要，重新上傳將覆蓋現有摘要。</p>
              </div>
            )}
            <div className="space-y-3">
              <div
                className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => !isUploading && fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file && !isUploading) handleFileUpload(file);
                }}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm font-medium">{uploadStatus || "處理中..."}</p>
                    {uploadProgress > 0 && (
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                    {uploadProgress > 0 && (
                      <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium">點擊選擇 / 拖放檔案</p>
                    <p className="text-xs text-muted-foreground">支援音檔（mp3/wav/m4a/mp4）或 SRT 字幕檔</p>
                    <p className="text-xs text-primary/70 font-medium">大檔案自動分片上傳，無大小限制</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.m4a,.ogg,.webm,.mp4,.srt"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-xs font-medium flex items-center gap-1">
                <Music className="w-3 h-3" />
                音檔（mp3/wav/m4a，最大 200MB）
              </p>
              <p className="text-xs text-muted-foreground pl-4">自動使用 Whisper 語音轉文字，再生成 AI 摘要</p>
              <p className="text-xs font-medium flex items-center gap-1 mt-2">
                <FileText className="w-3 h-3" />
                SRT 字幕檔
              </p>
              <p className="text-xs text-muted-foreground pl-4">解析字幕文字，再生成 AI 摘要</p>
            </div>

            {/* 字幕預覽區塊 */}
            {selectedPlaylist?.transcript_text && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-primary" />
                    Whisper 轉錄字幕
                    <span className="text-xs text-muted-foreground font-normal">
                      （狀態：已完成 {selectedPlaylist.transcript_text.split('\n').length} 行）
                    </span>
                  </p>
                  {selectedPlaylist.ai_summary && (
                    <Badge variant="outline" className="text-xs gap-1 text-primary border-primary/30">
                      <Sparkles className="w-3 h-3" />
                      AI 摘要已生成
                    </Badge>
                  )}
                </div>
                <div className="border rounded-lg bg-muted/30 p-3 max-h-64 overflow-y-auto font-mono text-xs leading-relaxed space-y-0.5">
                  {selectedPlaylist.transcript_text.split('\n').map((line, i) => (
                    <div key={i} className="flex gap-2">
                      {line.startsWith('[') && (
                        <span className="text-primary/70 shrink-0 w-20">{line.match(/\[([^\]]+)\]/)?.[1] || ''}</span>
                      )}
                      <span className="text-foreground/80">{line.replace(/^\[[^\]]+\]\s*/, '')}</span>
                    </div>
                  ))}

                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-primary" />
                      AI 摘要
                      {selectedPlaylist.ai_summary && (
                        <span className="text-xs text-green-600 font-normal">(已生成)</span>
                      )}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 text-primary border-primary/40 hover:bg-primary/10"
                      disabled={regenerateAiSummaryMutation.isPending || !selectedPlaylist.transcript_text}
                      onClick={() => regenerateAiSummaryMutation.mutate({ playlistId: selectedPlaylist.id })}
                    >
                      {regenerateAiSummaryMutation.isPending ? (
                        <><svg className="w-3 h-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>生成中...</>
                      ) : (
                        <><Sparkles className="w-3 h-3" />重新生成 AI 摘要</>
                      )}
                    </Button>
                  </div>
                  {selectedPlaylist.ai_summary ? (
                    <div className="border rounded-lg bg-primary/5 p-3 max-h-48 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap">
                      {selectedPlaylist.ai_summary}
                    </div>
                  ) : (
                    <div className="border rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground text-center">
                      {selectedPlaylist.transcript_text ? '尚未生成 AI 摘要，請點擊「重新生成」' : '請先上傳字幕再生成摘要'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTranscriptDialogOpen(false)} disabled={isUploading}>
              關閉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI 校正字幕對話框 */}
      <Dialog open={isCorrectionDialogOpen} onOpenChange={(open) => {
        if (!open) { setIsCorrectionDialogOpen(false); setEditingCorrectedIndex(null); }
      }}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI 校正字幕
              <div className="flex-1" />
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setIsCorrectionDialogOpen(false)}>關閉</Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col gap-2 pt-1">
            {/* YouTube 預覽播放器 */}
            {(() => {
              const playlist = playlists?.find((p: any) => p.id === correctionPlaylistId);
              const ytUrl = playlist?.youtube_playlist_url || '';
              // 取得 videoId 或 playlistId
              let videoId = '';
              let playlistId2 = '';
              try {
                const u = new URL(ytUrl);
                videoId = u.searchParams.get('v') || '';
                playlistId2 = u.searchParams.get('list') || '';
              } catch {}
              if (!videoId) { const m = ytUrl.match(/youtu\.be\/([\w-]+)/); if (m) videoId = m[1]; }
              const embedBase = videoId
                ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1${playlistId2 ? `&list=${playlistId2}` : ''}`
                : playlistId2
                ? `https://www.youtube.com/embed/videoseries?list=${playlistId2}&enablejsapi=1`
                : null;
              if (!embedBase) return null;
              return (
                <div className="flex flex-col gap-1" style={{ flexShrink: 0 }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">影片預覽</span>
                    <button
                      type="button"
                      className="text-xs text-primary underline"
                      onClick={() => setShowPreviewPlayer(v => !v)}
                    >{showPreviewPlayer ? '收起' : '展開'}</button>
                  </div>
                  {showPreviewPlayer && (
                    <div className="rounded-lg overflow-hidden border bg-black" style={{ height: 140 }}>
                      <iframe
                        ref={ytIframeRef}
                        src={embedBase}
                        title="YouTube 預覽"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full"
                        style={{ height: 140 }}
                      />
                    </div>
                  )}
                </div>
              );
            })()}
            {/* 操作列：完全垂直堆疊，每行獨立 */}
            <div className="flex flex-col gap-2" style={{ flexShrink: 0 }}>
              {/* 第一行： AI 自動校正按鈕 */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={isAiCorrecting || getCorrectedQuery.isLoading}
                  onClick={() => {
                    if (!correctionPlaylistId) return;
                    setIsAiCorrecting(true);
                    aiCorrectMutation.mutate({ playlistId: correctionPlaylistId });
                  }}
                >
                  {isAiCorrecting ? (
                    <><svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>AI 校正中...</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" />AI 自動校正</>
                  )}
                </Button>
                {correctedLines.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-green-700 border-green-600 hover:bg-green-50"
                    disabled={applyCorrectedMutation.isPending}
                    onClick={() => {
                      if (!correctionPlaylistId) return;
                      if (confirm('確定要將校正版覆蓋原始字幕嗎？此操作不可復原。')) {
                        applyCorrectedMutation.mutate({ playlistId: correctionPlaylistId });
                      }
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    覆蓋原始字幕
                  </Button>
                )}
                {correctedLines.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-blue-700 border-blue-500 hover:bg-blue-50"
                    onClick={() => {
                      // 將 correctedLines 轉換為標準 SRT 格式
                      // 格式：[HH:MM:SS] 文字 → SRT 序號 + 時間軸 + 文字
                      let srtContent = '';
                      let idx = 1;
                      correctedLines.forEach((line) => {
                        const tsMatch = line.match(/^\[(\d{2}):(\d{2}):(\d{2})\]\s*/);
                        if (!tsMatch) return;
                        const text = line.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '').trim();
                        if (!text) return;
                        const [, hh, mm, ss] = tsMatch;
                        const startSec = parseInt(hh) * 3600 + parseInt(mm) * 60 + parseInt(ss);
                        // 結束時間預設加 3 秒
                        const endSec = startSec + 3;
                        const fmtTime = (s: number) => {
                          const h = Math.floor(s / 3600).toString().padStart(2, '0');
                          const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
                          const sec = (s % 60).toString().padStart(2, '0');
                          return `${h}:${m}:${sec},000`;
                        };
                        srtContent += `${idx}\n${fmtTime(startSec)} --> ${fmtTime(endSec)}\n${text}\n\n`;
                        idx++;
                      });
                      // 取得播放清單標題作為檔名
                      const playlist = playlists?.find((p: any) => p.id === correctionPlaylistId);
                      const fileName = `${playlist?.title || '校正字幕'}_校正版.srt`;
                      // 建立下載
                      const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = fileName;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    下載 SRT
                  </Button>
                )}
              </div>
              {/* 第二行：勾選過濾（有校正結果時才顯示） */}
              {correctedLines.length > 0 && (
                <div className="flex items-center gap-6 py-2 px-3 bg-muted/40 rounded-md border text-xs" style={{ flexShrink: 0 }}>
                  <label className="flex items-center gap-2 cursor-pointer" style={{ userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={showDiffOnly}
                      onChange={e => { setShowDiffOnly(e.target.checked); if (e.target.checked) setShowTypoOnly(false); }}
                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#2563eb', flexShrink: 0 }}
                    />
                    <span className="whitespace-nowrap">只顯示有改動的行</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer" style={{ userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={showTypoOnly}
                      onChange={e => { setShowTypoOnly(e.target.checked); if (e.target.checked) setShowDiffOnly(false); }}
                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#ea580c', flexShrink: 0 }}
                    />
                    <span className="text-orange-600 font-medium whitespace-nowrap">只顯示錯別字修正</span>
                  </label>
                  <span className="text-muted-foreground ml-auto whitespace-nowrap">共 {correctedLines.length} 行</span>
                </div>
              )}
            </div>
            {/* 表頭 */}
            {correctedLines.length > 0 && (
              <div className="grid grid-cols-[20px_80px_1fr_1fr] gap-x-3 px-2 pb-1 border-b">
                <span></span>
                <span className="text-xs font-medium text-muted-foreground">時間碼</span>
                <span className="text-xs font-medium text-muted-foreground">原始字幕</span>
                <span className="text-xs font-medium text-primary">AI 校正版（點擊可修改）</span>
              </div>
            )}
            {/* 單一捲軸對比列表 */}
            {getCorrectedQuery.isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />載入中...
              </div>
            ) : (
              <div className="flex-1 border rounded-lg overflow-y-auto font-mono text-xs">
                {correctedLines.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-center py-12">
                    {isAiCorrecting ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" />AI 校正中，請稍候...</>
                    ) : (
                      <span>點擊「AI 自動校正」開始校正<br/><span className="text-xs text-muted-foreground/60">校正完成後可對照左右內容，點擊右側可手動修改</span></span>
                    )}
                  </div>
                ) : (() => {
                  const playlist = playlists?.find((p: any) => p.id === correctionPlaylistId);
                  const origLines = (playlist?.transcript_text || '').split('\n').filter((l: string) => l.trim());
                  const maxLen = Math.max(origLines.length, correctedLines.length);
                  const stripPunct2 = (s: string) => s.replace(/[，。！？、；：「」『』【】《》〈〉（）…—～·\s.,!?;:"'()\[\]{}]/g, '');
                  // 預先計算是否有符合過濾條件的行
                  const hasVisibleRows = Array.from({ length: maxLen }).some((_, i) => {
                    const origLine = origLines[i] || '';
                    const corrLine = correctedLines[i] || '';
                    const origText = origLine.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '');
                    const corrText = corrLine.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '');
                    const isDiff = origText !== corrText;
                    const isTypo = isDiff && stripPunct2(origText) !== stripPunct2(corrText);
                    if (showDiffOnly && !isDiff) return false;
                    if (showTypoOnly && !isTypo) return false;
                    return true;
                  });
                  if (!hasVisibleRows) {
                    return (
                      <div className="flex flex-col items-center justify-center h-full text-center py-12 gap-2">
                        <span className="text-2xl">✅</span>
                        {showTypoOnly ? (
                          <>
                            <span className="text-green-600 font-medium">此影片無錯別字修正</span>
                            <span className="text-xs text-muted-foreground">所有改動均為標點符號調整，文字內容完全正確</span>
                          </>
                        ) : showDiffOnly ? (
                          <>
                            <span className="text-muted-foreground font-medium">原始字幕與校正版完全相同</span>
                            <span className="text-xs text-muted-foreground">無任何改動</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">無資料</span>
                        )}
                      </div>
                    );
                  }
                  return Array.from({ length: maxLen }, (_, i) => {
                    const origLine = origLines[i] || '';
                    const corrLine = correctedLines[i] || '';
                    const ts = origLine.match(/^(\[\d{2}:\d{2}:\d{2}\]\s*)/)?.[1] ||
                               corrLine.match(/^(\[\d{2}:\d{2}:\d{2}\]\s*)/)?.[1] || '';
                    const origText = origLine.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '');
                    const corrText = corrLine.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '');
                    const isDiff = origText !== corrText;
                    // 判斷是否為錯別字修正（移除標點後文字仍不同）
                    const stripPunct = (s: string) => s.replace(/[，。！？、；：「」『』【】《》〈〉（）…—～·\s.,!?;:"'()\[\]{}]/g, '');
                    const isTypo = isDiff && stripPunct(origText) !== stripPunct(corrText);
                    if (showDiffOnly && !isDiff) return null;
                    if (showTypoOnly && !isTypo) return null;
                    return (
                      <div
                        key={i}
                        className={`grid grid-cols-[20px_80px_1fr_1fr] gap-x-3 px-2 py-1.5 border-b last:border-0 ${
                          isTypo ? 'bg-orange-50 dark:bg-orange-950/20' : isDiff ? 'bg-yellow-50 dark:bg-yellow-950/20' : 'hover:bg-muted/30'
                        }`}
                      >
                        {/* 類型標記 */}
                        <span className="shrink-0 pt-0.5 text-center" title={isTypo ? '錯別字修正' : isDiff ? '純加標點' : ''}>
                          {isTypo ? <span className="text-orange-500 text-[10px] font-bold leading-none">T</span> : isDiff ? <span className="text-yellow-500 text-[10px] leading-none">·</span> : null}
                        </span>
                        {/* 時間碼（可點擊跳轉播放） */}
                        <button
                          type="button"
                          className="text-primary/70 shrink-0 pt-0.5 text-left hover:text-primary hover:underline cursor-pointer text-xs font-mono"
                          title="點擊跳轉到此時間點播放"
                          onClick={() => { seekYouTube(ts); if (!showPreviewPlayer) setShowPreviewPlayer(true); }}
                        >{ts.replace(/[\[\]]/g, '').trim()}</button>
                        {/* 原始字幕 */}
                        <span className={`leading-relaxed ${
                          isTypo ? 'text-orange-700 dark:text-orange-400 line-through' :
                          isDiff ? 'text-red-600 dark:text-red-400' : 'text-foreground/70'
                        }`}>
                          {origText}
                        </span>
                        {/* AI 校正版（可點擊編輯） */}
                        <div
                          className={`leading-relaxed cursor-pointer rounded px-1 -mx-1 ${
                            editingCorrectedIndex === i
                              ? 'ring-1 ring-primary bg-primary/5'
                              : isTypo
                              ? 'text-orange-700 dark:text-orange-400 font-bold hover:bg-orange-50'
                              : isDiff
                              ? 'text-green-700 dark:text-green-400 font-medium hover:bg-green-50'
                              : 'text-foreground/70 hover:bg-muted/50'
                          }`}
                          onClick={() => {
                            if (editingCorrectedIndex === i) return;
                            setEditingCorrectedIndex(i);
                            setEditingCorrectedText(corrText);
                          }}
                        >
                          {editingCorrectedIndex === i ? (
                            <input
                              autoFocus
                              className="w-full bg-transparent outline-none text-xs text-foreground"
                              value={editingCorrectedText}
                              onChange={e => setEditingCorrectedText(e.target.value)}
                              onBlur={() => {
                                const newLines = [...correctedLines];
                                newLines[i] = ts + editingCorrectedText;
                                setCorrectedLines(newLines);
                                setEditingCorrectedIndex(null);
                                if (correctionPlaylistId) {
                                  saveCorrectedMutation.mutate({
                                    playlistId: correctionPlaylistId,
                                    correctedText: newLines.join('\n'),
                                  });
                                }
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                if (e.key === 'Escape') setEditingCorrectedIndex(null);
                              }}
                            />
                          ) : corrText}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}
