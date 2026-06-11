/**
 * PDF 閱讀器組件
 * 功能：PDF 載入、頁面導航、縮放控制
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  Loader2,
} from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface PdfViewerProps {
  url: string;
  height?: string;
  showToolbar?: boolean;
  pageNumber?: number;
  onPageChange?: (page: number) => void;
  onNumPagesChange?: (numPages: number) => void;
  scale?: number;
  onScaleChange?: (scale: number) => void;
}

export default function PdfViewerWithCrop({
  url,
  height = "600px",
  showToolbar = true,
  pageNumber: externalPageNumber,
  onPageChange,
  onNumPagesChange,
  scale: externalScale,
  onScaleChange,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [internalPageNumber, setInternalPageNumber] = useState<number>(1);
  const [internalScale, setInternalScale] = useState<number>(1.3);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use external pageNumber if provided, otherwise use internal state
  const pageNumber = externalPageNumber !== undefined ? externalPageNumber : internalPageNumber;
  const setPageNumber = onPageChange || setInternalPageNumber;
  
  // Use external scale if provided, otherwise use internal state
  const scale = externalScale !== undefined ? externalScale : internalScale;
  const setScale = onScaleChange || setInternalScale;
  const containerRef = useRef<HTMLDivElement>(null);

  // 鍵盤快速鍵：左右鍵翻頁，+/- 鍵縮放
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // 若焦點在輸入框/textarea/contenteditable 內，不攔截
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isEditable = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable;
      if (isEditable) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setPageNumber((prev) => Math.max(prev - 1, 1));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setPageNumber((prev) => Math.min(prev + 1, numPages));
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setScale((prev) => Math.min(prev + 0.1, 3.0));
      } else if (e.key === '-') {
        e.preventDefault();
        setScale((prev) => Math.max(prev - 0.1, 0.5));
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numPages, setPageNumber, setScale]);

  // 使用 useMemo 穩定 file prop 的引用
  // 透過後端代理載入 PDF，繞過 CORS 限制
  // base64 data URI 不走代理（避免 414 URI Too Long）
  const proxiedUrl = useMemo(() => {
    if (!url) return url;
    if (url.startsWith('data:')) return url; // base64 直接使用
    if (url.startsWith('/') || url.includes('/api/pdf-proxy')) return url;
    return `/api/pdf-proxy?url=${encodeURIComponent(url)}`;
  }, [url]);
  const fileConfig = useMemo(() => ({
    url: proxiedUrl,
    withCredentials: false,
  }), [proxiedUrl]);

  // PDF.js options（必須在頂層呼叫 useMemo，不能放在 JSX 屬性中）
  const pdfOptions = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  }), []);

  // PDF 載入成功
  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    if (onNumPagesChange) {
      onNumPagesChange(numPages);
    }
    setLoading(false);
    setError(null);
  }

  // PDF 載入失敗
  function onDocumentLoadError(error: Error) {
    console.error("PDF 載入失敗:", error);
    console.error("PDF URL:", url);
    setError(`PDF 載入失敗：${error.message}`);
    setLoading(false);
  }

  // 頁面導航
  function goToPrevPage() {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  }

  function goToNextPage() {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  }

  // 縮放控制
  function zoomIn() {
    setScale((prev) => Math.min(prev + 0.1, 3.0));
  }

  function zoomOut() {
    setScale((prev) => Math.max(prev - 0.1, 0.5));
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 工具列 */}
      {showToolbar && (
        <div className="flex items-center justify-between gap-2 p-3 bg-card border-b border-border">
          {/* 左側：頁面導航 */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevPage}
              disabled={pageNumber <= 1 || loading}
              className="h-9 w-9"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[100px] text-center">
              {loading ? "載入中..." : `${pageNumber} / ${numPages}`}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextPage}
              disabled={pageNumber >= numPages || loading}
              className="h-9 w-9"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* 中間：縮放控制 */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomOut}
              disabled={scale <= 0.5 || loading}
              className="h-9 w-9"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomIn}
              disabled={scale >= 3.0 || loading}
              className="h-9 w-9"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          {/* 右側：在新分頁開啟 */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(url, "_blank")}
              disabled={!url}
              className="h-9 w-9"
              title="在新分頁開啟"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 獨立工具列 - 當 showToolbar 為 false 時顯示頁面導航和縮放控制 */}
      {!showToolbar && (
        <div className="flex items-center justify-between gap-2 p-2 bg-card/50 border border-border rounded-t-lg">
          {/* 左側：頁面導航 */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevPage}
              disabled={pageNumber <= 1 || loading}
              className="h-8 w-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[80px] text-center">
              {loading ? "載入中..." : `${pageNumber} / ${numPages}`}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextPage}
              disabled={pageNumber >= numPages || loading}
              className="h-8 w-8"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            
            {/* 縮放控制 */}
            <div className="border-l border-border h-6 mx-2" />
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomOut}
              disabled={scale <= 0.5 || loading}
              className="h-8 w-8"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[50px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomIn}
              disabled={scale >= 3.0 || loading}
              className="h-8 w-8"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
          
          {/* 右側：在新分頁開啟 */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(url, "_blank")}
              disabled={!url}
              className="h-8 w-8"
              title="在新分頁開啟"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* PDF 內容 */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-auto bg-muted/20 border border-border ${showToolbar ? "rounded-b-lg border-t-0" : "rounded-lg"}`}
        style={{ minHeight: 0 }}
      >
        {loading && !error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">載入 PDF 中...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        )}

        {!error && (
          <div className="flex justify-center p-4">
            <Document
              file={fileConfig}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              }
              options={pdfOptions}
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={false}
                className="shadow-lg"
              />
            </Document>
          </div>
        )}
      </div>
    </div>
  );
}
