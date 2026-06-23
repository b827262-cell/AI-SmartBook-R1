import { useEffect, useRef, useState } from "react";

interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

function toClientRect(rect: SelectionRect): DOMRect {
  const left = Math.min(rect.startX, rect.endX);
  const top = Math.min(rect.startY, rect.endY);
  const width = Math.abs(rect.endX - rect.startX);
  const height = Math.abs(rect.endY - rect.startY);
  return new DOMRect(left, top, width, height);
}

const MIN_CAPTURE_PX = 10;

export function ScreenshotSelectionOverlay({
  active,
  onCapture,
  onCancel
}: {
  active: boolean;
  onCapture: (rect: DOMRect) => void;
  onCancel: () => void;
}) {
  const [selecting, setSelecting] = useState(false);
  const [rect, setRect] = useState<SelectionRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset on deactivate
  useEffect(() => {
    if (!active) {
      setSelecting(false);
      setRect(null);
    }
  }, [active]);

  // Keyboard cancel
  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onCancel]);

  function onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    setSelecting(true);
    setRect({ startX: e.clientX, startY: e.clientY, endX: e.clientX, endY: e.clientY });
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!selecting || !rect) return;
    setRect((prev) => prev ? { ...prev, endX: e.clientX, endY: e.clientY } : prev);
  }

  function onMouseUp(e: React.MouseEvent) {
    if (!selecting || !rect) return;
    setSelecting(false);
    const finalRect = toClientRect({ ...rect, endX: e.clientX, endY: e.clientY });
    if (finalRect.width < MIN_CAPTURE_PX || finalRect.height < MIN_CAPTURE_PX) {
      setRect(null);
      return;
    }
    onCapture(finalRect);
    setRect(null);
  }

  if (!active) return null;

  const boxStyle = rect
    ? {
        left: Math.min(rect.startX, rect.endX),
        top: Math.min(rect.startY, rect.endY),
        width: Math.abs(rect.endX - rect.startX),
        height: Math.abs(rect.endY - rect.startY)
      }
    : null;

  return (
    <div
      ref={overlayRef}
      className="screenshot-overlay"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      <span className="screenshot-overlay-hint">
        {selecting ? "放開滑鼠完成截圖" : "拖曳選取要截圖的區域　Esc 取消"}
      </span>

      {boxStyle && (
        <div className="screenshot-selection-box" style={boxStyle}>
          <span className="screenshot-handle tl" />
          <span className="screenshot-handle tr" />
          <span className="screenshot-handle bl" />
          <span className="screenshot-handle br" />
        </div>
      )}
    </div>
  );
}
