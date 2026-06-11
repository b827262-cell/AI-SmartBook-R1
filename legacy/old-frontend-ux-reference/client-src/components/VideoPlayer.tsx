/**
 * VideoPlayer - 通用影片播放器
 * 支援四種格式：
 *   1. YouTube (youtube.com / youtu.be)
 *   2. HLS 串流 (.m3u8) - 如 ibrain CloudFront（透過後端 proxy 解決 Referer 限制）
 *   3. ibrain 網頁連結 (ibrain.com.tw / .aspx) - 後端解析 → proxy HLS
 *   4. 一般 MP4 直連
 *
 * 使用方式：
 *   <VideoPlayer url={videoUrl} seekTo={seekSec} onTimeUpdate={setSec} />
 */

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import Hls from "hls.js";
import { trpc } from "@/lib/trpc";

interface VideoPlayerProps {
  /** 影片 URL：YouTube 連結、ibrain 網頁連結、.m3u8 HLS URL 或 .mp4 直連 */
  url: string;
  /** 跳轉到指定秒數（改變此値即觸發跳轉）。用 { sec, ts } 結構確保重複跳轉同一秒數時也能觸發 */
  seekTo?: { sec: number; ts: number };
  /** 播放時間更新回呼（秒） */
  onTimeUpdate?: (sec: number) => void;
  /** 影片播放完成回呼 */
  onEnded?: () => void;
  /** 播放速度（0.5 ~ 2.0） */
  playbackRate?: number;
  className?: string;
}

export interface VideoPlayerHandle {
  /** 擷取當前影片畫面，回傳 dataUrl（PNG），失敗時回傳 null */
  captureFrame: () => string | null;
  /** 暫停影片 */
  pause: () => void;
  /** 播放影片 */
  play: () => void;
  /** 設定播放速度（0.5 ~ 2.0） */
  setPlaybackRate: (rate: number) => void;
}

// ---- 判斷影片類型 ----
function detectVideoType(url: string): "youtube" | "hls" | "mp4" | "ibrain" | "unknown" {
  const value = url.trim();
  if (!value) return "unknown";
  const lower = value.toLowerCase();
  if (getYouTubeVideoId(value)) return "youtube";
  if (lower.includes(".m3u8")) return "hls";
  // ibrain 網頁連結（需後端解析）
  if (lower.includes("ibrain.com.tw") || (lower.includes(".aspx") && !lower.includes(".m3u8"))) return "ibrain";
  // CloudFront 但沒有 .m3u8 → 嘗試 HLS
  if (lower.includes("cloudfront.net")) return "hls";
  if (lower.includes(".mp4") || lower.includes(".webm") || lower.includes(".ogg")) return "mp4";
  return "mp4"; // 預設嘗試 mp4
}

// ---- 將 HLS URL 轉換為後端 proxy URL（解決 Referer 限制）----
function toProxyUrl(hlsUrl: string): string {
  // 只對 cloudfront.net 或 ibrain 相關的 URL 使用 proxy
  const lower = hlsUrl.toLowerCase();
  if (lower.includes("cloudfront.net") || lower.includes("ibrain.com.tw")) {
    return `/api/hls-proxy?url=${encodeURIComponent(hlsUrl)}`;
  }
  return hlsUrl;
}

// ---- 取得 YouTube video ID ----
function getYouTubeVideoId(input: string): string | null {
  const value = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;

  try {
    const u = new URL(value);
    const hostname = u.hostname.replace(/^www\./, "").toLowerCase();

    if (hostname === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0] || "";
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v") || "";
        return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
      }

      const embedMatch = u.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})/);
      if (embedMatch) return embedMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

// ---- 取得 YouTube embed URL ----
function getYouTubeEmbedUrl(url: string): string {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

const VideoPlayer = forwardRef(function VideoPlayer(
  { url, seekTo, onTimeUpdate, onEnded, playbackRate, className }: VideoPlayerProps,
  ref: React.Ref<VideoPlayerHandle>
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 暴露 captureFrame 和 pause 方法給父元件
  useImperativeHandle(ref, () => ({
    captureFrame: () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return null;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/png");
      } catch {
        return null;
      }
    },
    pause: () => {
      videoRef.current?.pause();
    },
    play: () => {
      videoRef.current?.play().catch(() => {});
    },
    setPlaybackRate: (rate: number) => {
      if (videoRef.current) videoRef.current.playbackRate = rate;
    },
  }));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // 待執行的跳轉秒數（影片尚未載入完成時先存起來）
  const pendingSeekRef = useRef<number | undefined>(undefined);

  // ibrain URL 解析（後端解析網頁取得 HLS URL）
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const resolveVideoUrl = trpc.videoCourseAdmin.resolveVideoUrl.useMutation({
    onSuccess: (data) => {
      setResolvedUrl(data.resolvedUrl);
      setResolveError(null);
    },
    onError: (err) => {
      setResolveError(err.message);
      setLoading(false);
    },
  });

  const rawType = detectVideoType(url);
  // 如果是 ibrain，等待解析後再決定播放 URL 和類型
  const effectiveUrl = rawType === "ibrain" ? (resolvedUrl ?? null) : url;
  const effectiveType = rawType === "ibrain"
    ? (resolvedUrl ? detectVideoType(resolvedUrl) : "ibrain")
    : rawType;

  // ---- 觸發 ibrain URL 解析 ----
  useEffect(() => {
    if (rawType !== "ibrain") return;
    setResolvedUrl(null);
    setResolveError(null);
    setLoading(true);
    resolveVideoUrl.mutate({ url });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // ---- HLS / MP4 播放器初始化 ----
  useEffect(() => {
    if (effectiveType === "youtube" || effectiveType === "ibrain" || !effectiveUrl) return;
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    setLoading(true);

    // 清除舊的 HLS 實例
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (effectiveType === "hls") {
      // 使用後端 proxy URL 解決 Referer 限制
      const proxyUrl = toProxyUrl(effectiveUrl);

      if (Hls.isSupported()) {
        const hls = new Hls({
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
        });
        hls.loadSource(proxyUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false);
          video.play().catch(() => {});
        });
        // 用 canplay 事件確保影片可播放後再執行 pending seek
        video.addEventListener('canplay', () => {
          if (pendingSeekRef.current !== undefined) {
            video.currentTime = pendingSeekRef.current;
            pendingSeekRef.current = undefined;
          }
        }, { once: true });
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (data.fatal) {
            setError(`HLS 串流錯誤：${data.details}`);
            setLoading(false);
          }
        });
        hlsRef.current = hls;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari 原生支援 HLS
        video.src = proxyUrl;
        video.addEventListener("loadedmetadata", () => setLoading(false));
        video.play().catch(() => {});
      } else {
        setError("您的瀏覽器不支援 HLS 串流，請使用 Chrome 或 Firefox");
        setLoading(false);
      }
    } else {
      // MP4 直連
      video.src = effectiveUrl;
      video.addEventListener("loadedmetadata", () => {
        setLoading(false);
      }, { once: true });
      // 用 canplay 事件確保影片可播放後再執行 pending seek
      video.addEventListener('canplay', () => {
        if (pendingSeekRef.current !== undefined) {
          video.currentTime = pendingSeekRef.current;
          video.play().catch(() => {});
          pendingSeekRef.current = undefined;
        }
      }, { once: true });
      video.addEventListener("error", () => {
        setError("影片載入失敗，請確認連結是否正確");
        setLoading(false);
      }, { once: true });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [effectiveUrl, effectiveType]);

  // ---- 時間跳轉（seekTo.ts 改變時觸發） ----
  useEffect(() => {
    if (!seekTo) return;
    const sec = seekTo.sec;
    if (effectiveType === "youtube") {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "seekTo", args: [sec, true] }),
        "*"
      );
    } else {
      const video = videoRef.current;
      if (video) {
        if (video.readyState >= 1) {
          // 影片已載入元資料，可以直接跳轉
          video.currentTime = sec;
          video.play().catch(() => {});
        } else {
          // 影片尚未載入，先存起來，等 canplay 後再跳轉
          pendingSeekRef.current = sec;
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekTo?.ts, effectiveType]);

  // ---- 時間更新回呼 ----
  useEffect(() => {
    if (effectiveType === "youtube" || !onTimeUpdate) return;
    const video = videoRef.current;
    if (!video) return;
    const handler = () => onTimeUpdate(Math.floor(video.currentTime));
    video.addEventListener("timeupdate", handler);
    return () => video.removeEventListener("timeupdate", handler);
  }, [effectiveType, onTimeUpdate]);

  // ---- 播放速度同步 ----
  useEffect(() => {
    if (videoRef.current && playbackRate) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg text-gray-400 text-sm ${className ?? "aspect-video"}`}>
        No video configured
      </div>
    );
  }

  // ---- ibrain 解析中 ----
  if (rawType === "ibrain" && !resolvedUrl && !resolveError) {
    return (
      <div className={`flex items-center justify-center bg-black rounded-lg ${className ?? "aspect-video"}`}>
        <div className="flex flex-col items-center gap-2 text-white text-sm">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>正在解析影片連結...</span>
        </div>
      </div>
    );
  }

  // ---- ibrain 解析失敗 ----
  if (rawType === "ibrain" && resolveError) {
    return (
      <div className={`flex items-center justify-center bg-black/90 rounded-lg p-4 ${className ?? "aspect-video"}`}>
        <div className="text-center text-white">
          <p className="text-red-400 font-medium mb-1">⚠️ 無法解析影片連結</p>
          <p className="text-sm text-gray-300">{resolveError}</p>
          <p className="text-xs text-gray-400 mt-2">請在編輯單元中手動填入 HLS URL</p>
        </div>
      </div>
    );
  }

  // ---- YouTube ----
  if (effectiveType === "youtube" && effectiveUrl) {
    return (
      <div className={`relative ${className ?? "aspect-video"}`}>
        <iframe
          ref={iframeRef}
          src={getYouTubeEmbedUrl(effectiveUrl)}
          className="w-full h-full rounded-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title="YouTube 影片"
        />
      </div>
    );
  }

  // ---- HLS / MP4 ----
  return (
    <div className={`relative bg-black rounded-lg overflow-visible ${className ?? "aspect-video"}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="flex flex-col items-center gap-2 text-white text-sm">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>載入中...</span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10 p-4">
          <div className="text-center text-white">
            <p className="text-red-400 font-medium mb-1">⚠️ 播放失敗</p>
            <p className="text-sm text-gray-300">{error}</p>
          </div>
        </div>
      )}
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        controlsList="nodownload"
        playsInline
        onTimeUpdate={() => {
          if (onTimeUpdate && videoRef.current) {
            onTimeUpdate(Math.floor(videoRef.current.currentTime));
          }
        }}
        onLoadedMetadata={() => {
          setLoading(false);
          const video = videoRef.current;
          if (video && playbackRate) video.playbackRate = playbackRate;
        }}
        onCanPlay={() => {
          const video = videoRef.current;
          if (video && pendingSeekRef.current !== undefined) {
            video.currentTime = pendingSeekRef.current;
            video.play().catch(() => {});
            pendingSeekRef.current = undefined;
          }
        }}
        onEnded={() => onEnded?.()}
        onError={() => {
          setError("影片載入失敗，請確認連結是否正確");
          setLoading(false);
        }}
      />
    </div>
  );
});

export default VideoPlayer;
