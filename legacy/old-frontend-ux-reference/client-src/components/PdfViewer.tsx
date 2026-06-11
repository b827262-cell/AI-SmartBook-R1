/**
 * PDF 預覽組件
 * 使用 react-pdf 來顯示 PDF，避免 iframe 被 Chrome 封鎖的問題
 * 透過後端代理 API 繞過 CORS 限制
 * 支援容器自適應寬度、完整頁面顯示、放大縮小
 * 不提供下載、列印、另開新分頁功能
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader2,
  FileText,
  AlertCircle,
  Maximize2,
} from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface WatermarkConfig {
  isEnabled: number;
  textEnabled: number;
  textTemplate: string;
  fontSize: number;
  fontColor: string;
  imageEnabled: number;
  imageUrl: string | null | undefined;
  imageWidth: number;
  imageHeight: number;
  opacity: number;
  rotation: number;
  repeatX: number;
  repeatY: number;
}

interface PdfViewerProps {
  url: string | null | undefined;
  className?: string;
  height?: number | string;
  showToolbar?: boolean;
  onError?: (error: Error) => void;
  /** 外部控制的頁碼（若提供，元件會跟著跳頁） */
  externalPage?: number;
  /** 頁碼變化時通知父層 */
  onPageChange?: (page: number) => void;
  /** 外部控制的縮放比例（若提供，元件會以此為基準） */
  scale?: number;
  /** 浮水印設定 */
  watermark?: WatermarkConfig | null;
  /** 購書憑證編號（用於替換浮水印文字中的 {voucherCode}） */
  voucherCode?: string | null;
}

export default function PdfViewer({
  url,
  className = "",
  height,
  showToolbar = true,
  onError,
  externalPage,
  onPageChange,
  scale: externalScale,
  watermark,
  voucherCode,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [internalScale, setInternalScale] = useState<number>(1.0);
  // 若外部傳入 scale，使用外部的；否則使用內部的
  const scale = externalScale ?? internalScale;
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 容器寬度自適應
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setContainerWidth(w);
      }
    });
    observer.observe(el);
    setContainerWidth(el.clientWidth || 800);
    return () => observer.disconnect();
  }, []);

  // 外部頁碼同步
  useEffect(() => {
    if (externalPage && externalPage !== pageNumber) {
      setPageNumber(externalPage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalPage]);

  // 使用代理 API 來載入 PDF，繞過 CORS 限制
  const proxyUrl = useMemo(() => {
    if (!url) return null;
    if (url.startsWith("/") || url.includes("/api/pdf-proxy")) {
      return url;
    }
    return `/api/pdf-proxy?url=${encodeURIComponent(url)}`;
  }, [url]);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setPageNumber(1);
      setLoading(false);
      setError(null);
    },
    []
  );

  const onDocumentLoadError = useCallback(
    (error: Error) => {
      console.error("PDF 載入錯誤:", error);
      setLoading(false);
      setError("無法載入 PDF 檔案");
      onError?.(error);
    },
    [onError]
  );

  const goToPrevPage = () => {
    const next = Math.max(pageNumber - 1, 1);
    setPageNumber(next);
    onPageChange?.(next);
  };

  const goToNextPage = () => {
    const next = Math.min(pageNumber + 1, numPages);
    setPageNumber(next);
    onPageChange?.(next);
  };

  const zoomIn = () => setInternalScale((prev) => Math.min(prev + 0.25, 3.0));
  const zoomOut = () => setInternalScale((prev) => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setInternalScale(1.0);

  // 計算實際渲染寬度：容器寬度 * scale（留 8px padding 兩側）
  const renderWidth = Math.max(200, (containerWidth - 8) * scale);

  if (!url) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-card/50 rounded-lg border border-border ${className}`}
        style={height ? { height } : { minHeight: 300 }}
      >
        <FileText className="w-12 h-12 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">尚無 PDF 檔案</p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col ${className}`}
      style={height ? { height } : undefined}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 防列印 CSS（@media print 隱藏整個元件） */}
      <style>{`@media print { .pdf-viewer-no-print { display: none !important; } }`}</style>

      {/* 工具列 */}
      {showToolbar && (
        <div className="pdf-viewer-no-print flex items-center justify-between gap-2 px-2 py-1.5 bg-card/50 border border-border rounded-t-lg flex-shrink-0">
          {/* 頁面導航 */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevPage}
              disabled={pageNumber <= 1 || loading}
              className="h-7 w-7"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[70px] text-center">
              {loading ? "載入中..." : `${pageNumber} / ${numPages}`}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextPage}
              disabled={pageNumber >= numPages || loading}
              className="h-7 w-7"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* 縮放控制 */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomOut}
              disabled={scale <= 0.5 || loading}
              className="h-7 w-7"
              title="縮小"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <button
              onClick={resetZoom}
              className="text-xs text-muted-foreground min-w-[44px] text-center hover:text-foreground transition-colors"
              title="點擊重設縮放"
            >
              {Math.round(scale * 100)}%
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomIn}
              disabled={scale >= 3.0 || loading}
              className="h-7 w-7"
              title="放大"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={resetZoom}
              disabled={loading}
              className="h-7 w-7"
              title="適合寬度（重設縮放）"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* PDF 內容區：flex-1 撐滿剩餘高度，overflow-auto 讓放大後可滾動 */}
      <div
        ref={containerRef}
        className={`pdf-viewer-no-print flex-1 overflow-auto bg-muted/20 border border-border relative select-none ${showToolbar ? "rounded-b-lg border-t-0" : "rounded-lg"}`}
        style={{ minHeight: 0 }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* 浮水印層 */}
        {watermark && watermark.isEnabled === 1 && (
          <div
            className="pdf-viewer-no-print absolute inset-0 pointer-events-none overflow-hidden"
            style={{ zIndex: 10 }}
          >
            {Array.from({ length: watermark.repeatY }).map((_, y) =>
              Array.from({ length: watermark.repeatX }).map((_, x) => {
                const displayText = watermark.textEnabled === 1
                  ? watermark.textTemplate.replace('{voucherCode}', voucherCode && voucherCode !== 'SKIP' ? voucherCode : '')
                  : '';
                return (
                  <div
                    key={`wm-${x}-${y}`}
                    style={{
                      position: 'absolute',
                      left: `${(x / watermark.repeatX) * 100 + 50 / watermark.repeatX}%`,
                      top: `${(y / watermark.repeatY) * 100 + 50 / watermark.repeatY}%`,
                      transform: `translate(-50%, -50%) rotate(${watermark.rotation}deg)`,
                      opacity: watermark.opacity / 100,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      userSelect: 'none',
                    }}
                  >
                    {watermark.imageEnabled === 1 && watermark.imageUrl && (
                      <img
                        src={watermark.imageUrl}
                        style={{ width: watermark.imageWidth, height: watermark.imageHeight, objectFit: 'contain' }}
                        alt=""
                        draggable={false}
                      />
                    )}
                    {displayText && (
                      <span
                        style={{
                          fontSize: watermark.fontSize,
                          color: watermark.fontColor,
                          whiteSpace: 'nowrap',
                          fontWeight: 'bold',
                          textShadow: '0 0 2px rgba(255,255,255,0.5)',
                        }}
                      >
                        {displayText}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
        {/* 載入中遮罩 */}
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* 錯誤狀態 */}
        {error && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
            <AlertCircle className="w-12 h-12 mb-2 text-destructive" />
            <p className="mb-2">{error}</p>
            <p className="text-xs text-muted-foreground">請聯繫管理員</p>
          </div>
        )}

        {/* PDF 文件 */}
        {!error && (
          <Document
            file={proxyUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
            error={null}
            className="flex flex-col items-center py-2"
          >
            <Page
              pageNumber={pageNumber}
              width={renderWidth}
              loading={null}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="shadow-lg"
            />
          </Document>
        )}
      </div>
    </div>
  );
}
