import { useRef, useState } from "react";

export interface MaskRect {
  id: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
}

export function AnswerMaskLayer({
  page,
  masks,
  onAddMask,
  onClearPageMasks
}: {
  page: number;
  masks: Record<number, MaskRect[]>;
  onAddMask: (page: number, rect: MaskRect) => void;
  onClearPageMasks: (page: number) => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState<{
    startX: number;
    startY: number;
    curX: number;
    curY: number;
  } | null>(null);

  const pageMasks = masks[page] ?? [];

  function getRelativePos(e: React.PointerEvent): { x: number; y: number } {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const pos = getRelativePos(e);
    setDrawing({ startX: pos.x, startY: pos.y, curX: pos.x, curY: pos.y });
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drawing) return;
    const pos = getRelativePos(e);
    setDrawing({ ...drawing, curX: pos.x, curY: pos.y });
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!drawing) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    const x = Math.min(drawing.startX, drawing.curX);
    const y = Math.min(drawing.startY, drawing.curY);
    const w = Math.abs(drawing.curX - drawing.startX);
    const h = Math.abs(drawing.curY - drawing.startY);
    if (w > 0.02 && h > 0.01) {
      onAddMask(page, {
        id: `mask-p${page}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        xPct: x,
        yPct: y,
        wPct: w,
        hPct: h
      });
    }
    setDrawing(null);
  }

  const drawingStyle: React.CSSProperties | undefined = drawing
    ? {
        left: `${Math.min(drawing.startX, drawing.curX) * 100}%`,
        top: `${Math.min(drawing.startY, drawing.curY) * 100}%`,
        width: `${Math.abs(drawing.curX - drawing.startX) * 100}%`,
        height: `${Math.abs(drawing.curY - drawing.startY) * 100}%`
      }
    : undefined;

  return (
    <>
      {pageMasks.map((m) => (
        <div
          key={m.id}
          className="answer-mask-block"
          style={{
            left: `${m.xPct * 100}%`,
            top: `${m.yPct * 100}%`,
            width: `${m.wPct * 100}%`,
            height: `${m.hPct * 100}%`
          }}
        />
      ))}

      <div
        ref={overlayRef}
        className="answer-mask-overlay"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrawing(null)}
      >
        {drawingStyle && <div className="answer-mask-drawing" style={drawingStyle} />}
      </div>

      <div className="answer-mask-controls">
        <span className="answer-mask-hint">拖曳選取區域以遮住答案</span>
        {pageMasks.length > 0 && (
          <button
            type="button"
            className="answer-mask-clear-btn"
            onClick={() => onClearPageMasks(page)}
          >
            清除此頁遮罩（{pageMasks.length}）
          </button>
        )}
      </div>
    </>
  );
}
