import { useCallback, useEffect, useRef, useState } from "react";

interface Rect { x: number; y: number; w: number; h: number }

interface PdfCropOverlayProps {
  /** Called with a data URL of the cropped/full-page image, or undefined if capture failed. */
  onConfirm: (dataUrl: string | undefined) => void;
  onCancel: () => void;
}

/** Attempts to capture a rect from the nearest PDF canvas in the DOM. */
function captureCanvasRect(rect: Rect | null, containerEl: HTMLElement | null): string | undefined {
  const canvas = (containerEl ?? document).querySelector<HTMLCanvasElement>(".pdf-canvas-frame canvas");
  if (!canvas) return undefined;
  try {
    if (!rect || rect.w < 4 || rect.h < 4) {
      return canvas.toDataURL("image/png");
    }
    const scaleX = canvas.width / canvas.offsetWidth;
    const scaleY = canvas.height / canvas.offsetHeight;
    const cx = rect.x * scaleX;
    const cy = rect.y * scaleY;
    const cw = rect.w * scaleX;
    const ch = rect.h * scaleY;
    const tmp = document.createElement("canvas");
    tmp.width = Math.round(cw);
    tmp.height = Math.round(ch);
    const ctx = tmp.getContext("2d");
    if (!ctx) return canvas.toDataURL("image/png");
    ctx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
    return tmp.toDataURL("image/png");
  } catch {
    return undefined;
  }
}

export function PdfCropOverlay({ onConfirm, onCancel }: PdfCropOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [cropRect, setCropRect] = useState<Rect | null>(null);
  const isDragging = useRef(false);

  const getRelativePos = useCallback((e: PointerEvent | React.PointerEvent, el: HTMLElement) => {
    const bounds = el.getBoundingClientRect();
    return { x: e.clientX - bounds.left, y: e.clientY - bounds.top };
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!overlayRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true;
    const pos = getRelativePos(e, overlayRef.current);
    setDragStart(pos);
    setCropRect(null);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current || !dragStart || !overlayRef.current) return;
    const pos = getRelativePos(e, overlayRef.current);
    setCropRect({
      x: Math.min(dragStart.x, pos.x),
      y: Math.min(dragStart.y, pos.y),
      w: Math.abs(pos.x - dragStart.x),
      h: Math.abs(pos.y - dragStart.y)
    });
  }

  function onPointerUp() {
    isDragging.current = false;
    setDragStart(null);
  }

  // ESC to cancel
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCancel(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function handleFullPage() {
    const dataUrl = captureCanvasRect(null, overlayRef.current);
    onConfirm(dataUrl);
  }

  function handleCropConfirm() {
    const dataUrl = captureCanvasRect(cropRect, overlayRef.current);
    onConfirm(dataUrl);
  }

  const hasCrop = cropRect && cropRect.w > 4 && cropRect.h > 4;

  return (
    <div
      ref={overlayRef}
      className="pdf-crop-overlay"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="presentation"
      aria-label="截圖選取區域"
    >
      {/* Instruction bar — doesn't intercept pointer events on the crop area */}
      <div className="pdf-crop-toolbar" onPointerDown={(e) => e.stopPropagation()}>
        <span className="pdf-crop-hint">拖曳選取截圖區域</span>
        <button type="button" className="pdf-crop-btn" onClick={handleFullPage}>
          整頁截圖
        </button>
        {hasCrop && (
          <button type="button" className="pdf-crop-btn pdf-crop-btn-confirm" onClick={handleCropConfirm}>
            截圖選取區
          </button>
        )}
        <button type="button" className="pdf-crop-btn pdf-crop-btn-cancel" onClick={onCancel}>
          取消
        </button>
      </div>

      {/* Orange selection rectangle */}
      {hasCrop && cropRect && (
        <div
          className="pdf-crop-rect"
          style={{ left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h }}
          onPointerDown={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}
