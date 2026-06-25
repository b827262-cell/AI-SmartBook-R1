import { useEffect, useRef, useState, type PointerEvent } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
// Vite resolves this to a hashed worker asset URL at build time.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const WATERMARK_TILES = Array.from({ length: 8 }, (_, i) => i);
type PenPoint = { x: number; y: number };
type PenStroke = { color: string; width: number; points: PenPoint[] };
// Cap the canvas backing-store so very high zoom does not hit browser limits.
// Lowered to 16M for safer mobile rendering.
const MAX_CANVAS_PIXELS = 16_777_216;

/** Android Chrome/Samsung can fail to composite a live PDF.js canvas in this
 * layout; we render a stable <img> snapshot of it there instead. */
function isAndroidMobile(): boolean {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}

/**
 * Renders the protected PDF blob with PDF.js onto a <canvas>. Page navigation
 * and zoom are deterministic here (we choose which page to render and the
 * viewport scale), unlike the browser-native iframe whose #page/#zoom fragment
 * Chromium applies inconsistently. The protected blob never becomes a URL: we
 * read its bytes in-memory and hand them to PDF.js.
 */
export function ProtectedPdfViewer({
  blob,
  page,
  zoom,
  watermarkText,
  selectable = false,
  penEnabled = false,
  penMode = false,
  penWidth,
  penColor,
  onPageCount,
  onError,
  onSelectedText,
  onPageHasText
}: {
  blob: Blob;
  page: number;
  zoom: number;
  watermarkText: string;
  selectable?: boolean;
  penEnabled?: boolean;
  penMode?: boolean;
  penWidth?: number;
  penColor?: string;
  onPageCount?: (count: number) => void;
  onError?: (message: string) => void;
  onSelectedText?: (text: string) => void;
  onPageHasText?: (hasText: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const penCanvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const textLayerTaskRef = useRef<{ cancel: () => void } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const penStrokeMapRef = useRef<Record<number, PenStroke[]>>({});
  const currentPenStrokeRef = useRef<PenStroke | null>(null);
  const isDrawingPenRef = useRef(false);
  const [containerWidth, setContainerWidth] = useState(-1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [textLayerError, setTextLayerError] = useState(false);
  // Android-only snapshot of the rendered canvas, shown as a stable <img>.
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const snapshotUrlRef = useRef<string | null>(null);

  function clearSnapshotUrl() {
    if (snapshotUrlRef.current) {
      URL.revokeObjectURL(snapshotUrlRef.current);
      snapshotUrlRef.current = null;
    }
    setSnapshotUrl(null);
  }

  // Revoke any outstanding snapshot object URL on unmount.
  useEffect(() => {
    return () => {
      if (snapshotUrlRef.current) {
        URL.revokeObjectURL(snapshotUrlRef.current);
        snapshotUrlRef.current = null;
      }
    };
  }, []);

  function clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
  }

  function penScale(): number {
    return Math.min(2, window.devicePixelRatio || 1);
  }

  function ensurePenCanvasPageSpace() {
    const canvas = penCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const dpr = penScale();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${Math.floor(rect.width)}px`;
    canvas.style.height = `${Math.floor(rect.height)}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
  }

  function drawSegment(
    ctx: CanvasRenderingContext2D,
    rect: DOMRect,
    from: PenPoint,
    to: PenPoint,
    stroke: PenStroke
  ) {
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x * rect.width, from.y * rect.height);
    ctx.lineTo(to.x * rect.width, to.y * rect.height);
    ctx.stroke();
  }

  function drawPenStroke(ctx: CanvasRenderingContext2D, rect: DOMRect, stroke: PenStroke) {
    const points = stroke.points;
    if (points.length === 0) return;
    if (points.length === 1) {
      const point = points[0];
      const x0 = point.x * rect.width;
      const y0 = point.y * rect.height;
      ctx.fillStyle = stroke.color;
      ctx.beginPath();
      ctx.arc(x0, y0, Math.max(0.5, stroke.width / 2), 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      ctx.moveTo(a.x * rect.width, a.y * rect.height);
      ctx.lineTo(b.x * rect.width, b.y * rect.height);
    }
    ctx.stroke();
  }

  function redrawPenForPage(pageNumber: number) {
    const canvas = penCanvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!canvas || !rect || rect.width <= 0 || rect.height <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pageStrokes = penStrokeMapRef.current[pageNumber];

    ensurePenCanvasPageSpace();
    if (!pageStrokes || pageStrokes.length === 0) return;

    ctx.setTransform(penScale(), 0, 0, penScale(), 0, 0);
    for (const stroke of pageStrokes) {
      drawPenStroke(ctx, rect, stroke);
    }
  }

  function pointFromEvent(event: PointerEvent<HTMLCanvasElement>): PenPoint {
    const canvas = penCanvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return { x: 0, y: 0 };
    }
    return {
      x: clamp01((event.clientX - rect.left) / rect.width),
      y: clamp01((event.clientY - rect.top) / rect.height)
    };
  }

  function onPenPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!penEnabled || !penMode) return;
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    const stroke: PenStroke = {
      color: penColor ?? "#1f2937",
      width: penWidth ?? 4,
      points: [point]
    };
    const list = penStrokeMapRef.current[page] ?? [];
    list.push(stroke);
    penStrokeMapRef.current[page] = list;
    currentPenStrokeRef.current = stroke;
    isDrawingPenRef.current = true;
    ensurePenCanvasPageSpace();
    const rect = penCanvasRef.current?.getBoundingClientRect();
    const ctx = penCanvasRef.current?.getContext("2d");
    if (ctx && rect) {
      ctx.setTransform(penScale(), 0, 0, penScale(), 0, 0);
      drawPenStroke(ctx, rect, stroke);
    }
  }

  function onPenPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!penEnabled || !penMode || !isDrawingPenRef.current || !currentPenStrokeRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const next = pointFromEvent(event);
    const stroke = currentPenStrokeRef.current;
    const prev = stroke.points[stroke.points.length - 1];
    if (prev?.x === next.x && prev?.y === next.y) return;
    stroke.points.push(next);
    const rect = penCanvasRef.current?.getBoundingClientRect();
    const ctx = penCanvasRef.current?.getContext("2d");
    if (!ctx || !rect) return;
    ctx.setTransform(penScale(), 0, 0, penScale(), 0, 0);
    drawSegment(ctx, rect, prev, next, stroke);
  }

  function onPenPointerUp(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingPenRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    isDrawingPenRef.current = false;
    currentPenStrokeRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onPenPointerCancel(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingPenRef.current) return;
    onPenPointerUp(event);
  }

  // Measure container width to avoid calculating/rendering before layout is ready.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load (and reload) the document whenever the protected blob changes.
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setMessage("");
    (async () => {
      try {
        const data = new Uint8Array(await blob.arrayBuffer());
        const doc = await pdfjsLib.getDocument({ data }).promise;
        if (cancelled) {
          void doc.destroy();
          return;
        }
        docRef.current = doc;
        onPageCount?.(doc.numPages);
        setStatus("ready");
      } catch (err: any) {
        if (err?.name === "RenderingCancelledException") return;
        console.error("[PdfViewer] PDF render error:", err);
        const msg = `無法載入 PDF 或渲染失敗：${err?.message || String(err)}`;
        setMessage(msg);
        setStatus("error");
        onError?.(msg);
      }
    })();
    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      const doc = docRef.current;
      docRef.current = null;
      if (doc) void doc.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob]);

  useEffect(() => {
    if (status !== "ready" || !penEnabled) return;
    const timer = requestAnimationFrame(() => {
      redrawPenForPage(page);
    });
    return () => cancelAnimationFrame(timer);
  }, [status, page, containerWidth, zoom, penEnabled, penMode]);

  // Abort ongoing stroke if pen drawing is turned off.
  useEffect(() => {
    if (penEnabled && penMode) return;
    isDrawingPenRef.current = false;
    currentPenStrokeRef.current = null;
  }, [penEnabled, penMode]);

  // Render the current page at the current zoom. Re-runs on page/zoom change.
  // Render the current page onto the canvas when ready.
  useEffect(() => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || status !== "ready" || containerWidth === 0) return;

    setTextLayerError(false);
    // Drop the previous page's snapshot before re-rendering.
    clearSnapshotUrl();
    let cancelled = false;
    (async () => {
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }
        const targetPage = Math.min(Math.max(Math.trunc(page) || 1, 1), doc.numPages);
        const pdfPage = await doc.getPage(targetPage);
        if (cancelled) return;

        const viewport = pdfPage.getViewport({ scale: zoom / 100 });
        const isAndroid = /Android/i.test(navigator.userAgent);
        // Clamp DPR to 1.5 max on Android to prevent Canvas memory crashes.
        const maxDpr = isAndroid ? 1.5 : 2;
        let outputScale = Math.min(window.devicePixelRatio || 1, maxDpr);
        const area = viewport.width * viewport.height * outputScale * outputScale;
        if (area > MAX_CANVAS_PIXELS) {
          outputScale = Math.max(1, Math.sqrt(MAX_CANVAS_PIXELS / (viewport.width * viewport.height)));
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          console.error("[PdfViewer] Failed to get 2D context");
          return;
        }
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const task = pdfPage.render({
          canvas,
          canvasContext: ctx,
          viewport,
          transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined
        });
        renderTaskRef.current = task;
        await task.promise;
        renderTaskRef.current = null;

        // Android compositor fallback: snapshot the freshly rendered canvas to a
        // PNG blob and display it as a stable <img>. Desktop keeps the live canvas.
        if (isAndroidMobile()) {
          canvas.toBlob((snapshot) => {
            if (cancelled || !snapshot) return;
            clearSnapshotUrl();
            const url = URL.createObjectURL(snapshot);
            snapshotUrlRef.current = url;
            setSnapshotUrl(url);
          }, "image/png");
        }

        // Selectable text layer overlaid on the canvas (for copy / notes / AI).
        // Failure here must not break rendering — the page still displays.
        const textLayerDiv = textLayerRef.current;
        if (textLayerDiv) {
          if (textLayerTaskRef.current) {
            textLayerTaskRef.current.cancel();
            textLayerTaskRef.current = null;
          }
          textLayerDiv.replaceChildren();
          textLayerDiv.style.setProperty("--scale-factor", String(zoom / 100));
          try {
            const textContent = await pdfPage.getTextContent();
            if (cancelled) return;
            const textLayer = new pdfjsLib.TextLayer({
              textContentSource: textContent,
              container: textLayerDiv,
              viewport
            });
            textLayerTaskRef.current = textLayer;
            await textLayer.render();
            onPageHasText?.(textContent.items.length > 0);
          } catch {
            if (!cancelled) setTextLayerError(true);
            onPageHasText?.(false);
          }
        }
        redrawPenForPage(targetPage);
      } catch (err) {
        // A cancelled render (page/zoom changed mid-render) is expected; ignore.
        const name = err instanceof Error ? err.name : "";
        if (name !== "RenderingCancelledException" && !cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setMessage(msg);
          setStatus("error");
          onError?.(msg);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      if (textLayerTaskRef.current) {
        textLayerTaskRef.current.cancel();
        textLayerTaskRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page, zoom, containerWidth]);

  // Report the current selection text when selection mode is active.
  function reportSelection() {
    if (!selectable) return;
    onSelectedText?.((window.getSelection()?.toString() ?? "").trim());
  }

  return (
    <div className="pdf-canvas-frame" ref={containerRef}>
      <div className="pdf-canvas-scroll">
        {status === "loading" && (
          <p className="muted pdf-canvas-status">Rendering protected PDF…</p>
        )}
        {status === "error" && (
          <p className="error-text pdf-canvas-status">{message}</p>
        )}
        {textLayerError && (
          <p className="error-text pdf-canvas-status" style={{ position: "absolute", zIndex: 10, top: 16 }}>
            此裝置目前無法啟用文字選取，但仍可閱讀 PDF。
          </p>
        )}
        <div
          className={`pdf-page-stack ${status === "ready" ? "" : "is-hidden"} ${
            snapshotUrl ? "has-snapshot" : ""
          }`.trim()}
        >
          <canvas ref={canvasRef} className="pdf-canvas" />
          {snapshotUrl && (
            <img
              className="pdf-canvas-snapshot"
              src={snapshotUrl}
              alt="PDF page"
              aria-hidden="true"
            />
          )}
          <div
            ref={textLayerRef}
            className={`pdf-text-layer ${selectable ? "selectable" : ""}`}
            onMouseUp={reportSelection}
            onPointerUp={reportSelection}
          />
          <canvas
            ref={penCanvasRef}
            className={`pdf-pen-overlay ${penEnabled && penMode ? "is-enabled" : ""}`}
            onPointerDown={onPenPointerDown}
            onPointerMove={onPenPointerMove}
            onPointerUp={onPenPointerUp}
            onPointerCancel={onPenPointerCancel}
          />
        </div>
      </div>
      <div className="student-pdf-watermark" aria-hidden="true">
        {WATERMARK_TILES.map((tile) => (
          <span key={tile} className="student-pdf-watermark-item">
            {watermarkText}
          </span>
        ))}
      </div>
    </div>
  );
}
