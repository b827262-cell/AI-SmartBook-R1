import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
// Vite resolves this to a hashed worker asset URL at build time.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const WATERMARK_TILES = Array.from({ length: 8 }, (_, i) => i);
// Cap the canvas backing-store so very high zoom does not hit browser limits.
const MAX_CANVAS_PIXELS = 24_000_000;

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
  onPageCount?: (count: number) => void;
  onError?: (message: string) => void;
  onSelectedText?: (text: string) => void;
  onPageHasText?: (hasText: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const textLayerTaskRef = useRef<{ cancel: () => void } | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

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
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
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

  // Render the current page at the current zoom. Re-runs on page/zoom change.
  useEffect(() => {
    if (status !== "ready") return;
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas) return;

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
        let outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const area = viewport.width * viewport.height * outputScale * outputScale;
        if (area > MAX_CANVAS_PIXELS) {
          outputScale = Math.max(1, Math.sqrt(MAX_CANVAS_PIXELS / (viewport.width * viewport.height)));
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
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
            onPageHasText?.(false);
          }
        }
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
  }, [status, page, zoom]);

  // Report the current selection text when selection mode is active.
  function reportSelection() {
    if (!selectable) return;
    onSelectedText?.((window.getSelection()?.toString() ?? "").trim());
  }

  return (
    <div className="pdf-canvas-frame">
      <div className="pdf-canvas-scroll">
        {status === "loading" && (
          <p className="muted pdf-canvas-status">Rendering protected PDF…</p>
        )}
        {status === "error" && (
          <p className="error-text pdf-canvas-status">{message}</p>
        )}
        <div className={`pdf-page-stack ${status === "ready" ? "" : "is-hidden"}`}>
          <canvas ref={canvasRef} className="pdf-canvas" />
          <div
            ref={textLayerRef}
            className={`pdf-text-layer ${selectable ? "selectable" : ""}`}
            onMouseUp={reportSelection}
            onPointerUp={reportSelection}
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
