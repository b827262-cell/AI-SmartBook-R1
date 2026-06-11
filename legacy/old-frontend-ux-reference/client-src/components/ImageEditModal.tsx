/**
 * ImageEditModal - 圖片裁切與旋轉
 * 圖片載入後直接顯示裁切框，可拖移位置或用四角控制點調整大小
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCcw, RotateCw, Check, X } from "lucide-react";

interface ImageEditModalProps {
  file: File | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (editedFile: File) => void;
}

interface CropBox {
  x: number; // 0~1 relative to display image
  y: number;
  w: number;
  h: number;
}

const HANDLE_R = 8; // 四角控制點半徑 px
const MIN_CROP = 0.05;
type DragMode = "move" | "nw" | "ne" | "sw" | "se" | null;

export function ImageEditModal({ file, open, onClose, onConfirm }: ImageEditModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>("");
  const [rotation, setRotation] = useState(0);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const [imgOffset, setImgOffset] = useState({ left: 0, top: 0 });
  const [crop, setCrop] = useState<CropBox>({ x: 0, y: 0, w: 1, h: 1 });

  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    startCrop: CropBox;
  } | null>(null);

  // 載入圖片
  useEffect(() => {
    if (!file || !open) return;
    setImgLoaded(false);
    setRotation(0);
    setCrop({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, open]);

  // 計算顯示尺寸
  const computeDisplaySize = useCallback(() => {
    const el = containerRef.current;
    const img = imgRef.current;
    if (!el || !img) return;
    const maxW = el.clientWidth - 8;
    const maxH = el.clientHeight - 8;
    const swapped = rotation % 180 !== 0;
    const srcW = swapped ? img.naturalHeight : img.naturalWidth;
    const srcH = swapped ? img.naturalWidth : img.naturalHeight;
    const scale = Math.min(maxW / srcW, maxH / srcH, 1);
    const w = Math.round(srcW * scale);
    const h = Math.round(srcH * scale);
    setDisplaySize({ w, h });
    // 圖片在容器中的偏移（置中）
    setImgOffset({
      left: Math.round((el.clientWidth - w) / 2),
      top: Math.round((el.clientHeight - h) / 2),
    });
  }, [rotation]);

  useEffect(() => {
    if (imgLoaded) {
      // 等 DOM 更新後再計算
      setTimeout(computeDisplaySize, 50);
    }
  }, [imgLoaded, computeDisplaySize]);

  useEffect(() => {
    window.addEventListener("resize", computeDisplaySize);
    return () => window.removeEventListener("resize", computeDisplaySize);
  }, [computeDisplaySize]);

  // 使用 ResizeObserver 監聽容器大小變化（flex-1 容器高度可能在 Dialog 動畫後才確定）
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (imgLoaded) computeDisplaySize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [imgLoaded, computeDisplaySize]);

  // 取得相對於圖片的座標（比例）
  const getPropPos = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el || !displaySize.w) return null;
    const rect = el.getBoundingClientRect();
    const x = (clientX - rect.left - imgOffset.left) / displaySize.w;
    const y = (clientY - rect.top - imgOffset.top) / displaySize.h;
    return { x, y };
  };

  const getHitMode = (px: number, py: number): DragMode => {
    const { x, y, w, h } = crop;
    const hr = HANDLE_R / displaySize.w;
    const hry = HANDLE_R / displaySize.h;
    if (Math.abs(px - x) < hr * 2 && Math.abs(py - y) < hry * 2) return "nw";
    if (Math.abs(px - (x + w)) < hr * 2 && Math.abs(py - y) < hry * 2) return "ne";
    if (Math.abs(px - x) < hr * 2 && Math.abs(py - (y + h)) < hry * 2) return "sw";
    if (Math.abs(px - (x + w)) < hr * 2 && Math.abs(py - (y + h)) < hry * 2) return "se";
    if (px > x && px < x + w && py > y && py < y + h) return "move";
    return null;
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const pos = getPropPos(clientX, clientY);
    if (!pos) return;
    const mode = getHitMode(pos.x, pos.y);
    if (!mode) return;
    dragRef.current = { mode, startX: pos.x, startY: pos.y, startCrop: { ...crop } };
  };

  const handlePointerMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragRef.current) return;
    e.preventDefault();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const pos = getPropPos(clientX, clientY);
    if (!pos) return;

    const dx = pos.x - dragRef.current.startX;
    const dy = pos.y - dragRef.current.startY;
    const sc = dragRef.current.startCrop;
    const mode = dragRef.current.mode;

    setCrop(() => {
      let nx = sc.x, ny = sc.y, nw = sc.w, nh = sc.h;
      if (mode === "move") {
        nx = Math.max(0, Math.min(1 - sc.w, sc.x + dx));
        ny = Math.max(0, Math.min(1 - sc.h, sc.y + dy));
      } else if (mode === "nw") {
        nx = Math.max(0, Math.min(sc.x + sc.w - MIN_CROP, sc.x + dx));
        ny = Math.max(0, Math.min(sc.y + sc.h - MIN_CROP, sc.y + dy));
        nw = sc.x + sc.w - nx;
        nh = sc.y + sc.h - ny;
      } else if (mode === "ne") {
        ny = Math.max(0, Math.min(sc.y + sc.h - MIN_CROP, sc.y + dy));
        nw = Math.max(MIN_CROP, Math.min(1 - sc.x, sc.w + dx));
        nh = sc.y + sc.h - ny;
      } else if (mode === "sw") {
        nx = Math.max(0, Math.min(sc.x + sc.w - MIN_CROP, sc.x + dx));
        nw = sc.x + sc.w - nx;
        nh = Math.max(MIN_CROP, Math.min(1 - sc.y, sc.h + dy));
      } else if (mode === "se") {
        nw = Math.max(MIN_CROP, Math.min(1 - sc.x, sc.w + dx));
        nh = Math.max(MIN_CROP, Math.min(1 - sc.y, sc.h + dy));
      }
      return { x: nx, y: ny, w: nw, h: nh };
    });
  }, [displaySize, imgOffset]);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchmove", handlePointerMove, { passive: false });
    window.addEventListener("touchend", handlePointerUp);
    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  // 確認裁切
  const handleConfirm = () => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const swapped = rotation % 180 !== 0;
    const srcW = swapped ? img.naturalHeight : img.naturalWidth;
    const srcH = swapped ? img.naturalWidth : img.naturalHeight;

    // 先旋轉整張圖
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = srcW;
    tempCanvas.height = srcH;
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.save();
    tempCtx.translate(srcW / 2, srcH / 2);
    tempCtx.rotate((rotation * Math.PI) / 180);
    if (rotation % 180 === 0) {
      tempCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    } else {
      tempCtx.drawImage(img, -img.naturalHeight / 2, -img.naturalWidth / 2);
    }
    tempCtx.restore();

    // 裁切
    const cropX = Math.round(crop.x * srcW);
    const cropY = Math.round(crop.y * srcH);
    const cropW = Math.round(crop.w * srcW);
    const cropH = Math.round(crop.h * srcH);
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(tempCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const editedFile = new File([blob], file?.name || "cropped.png", { type: "image/png" });
      onConfirm(editedFile);
    }, "image/png");
  };

  // 游標樣式
  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getPropPos(e.clientX, e.clientY);
    if (!pos || !containerRef.current) return;
    const mode = getHitMode(pos.x, pos.y);
    const cursors: Record<string, string> = {
      move: "move", nw: "nw-resize", ne: "ne-resize", sw: "sw-resize", se: "se-resize"
    };
    containerRef.current.style.cursor = mode ? (cursors[mode] || "default") : "default";
  };

  const dw = displaySize.w;
  const dh = displaySize.h;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 pt-4 pb-2 shrink-0">
          <DialogTitle className="text-base font-semibold">裁切圖片</DialogTitle>
        </DialogHeader>

        {/* 旋轉工具列 */}
        <div className="flex items-center gap-2 px-5 pb-2 border-b shrink-0">
          <span className="text-xs text-muted-foreground">旋轉：</span>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2" onClick={() => { setRotation(r => (r - 90 + 360) % 360); setTimeout(computeDisplaySize, 50); }}>
            <RotateCcw className="w-3.5 h-3.5" />逆時針 90°
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2" onClick={() => { setRotation(r => (r + 90) % 360); setTimeout(computeDisplaySize, 50); }}>
            <RotateCw className="w-3.5 h-3.5" />順時針 90°
          </Button>
          <span className="text-xs text-muted-foreground ml-1">{rotation}°</span>
          <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto" onClick={() => setCrop({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 })}>
            重置
          </Button>
        </div>

        {/* 圖片裁切區 */}
        <div className="px-5 pt-3 pb-2 flex flex-col flex-1 min-h-0">
          <div
            ref={containerRef}
            className="relative bg-neutral-900 rounded-lg overflow-hidden select-none flex-1"
            style={{ minHeight: 0 }}
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { if (containerRef.current) containerRef.current.style.cursor = "default"; }}
          >
            {imgLoaded && imgSrc && dw > 0 ? (
              <>
                {/* 圖片 */}
                <img
                  src={imgSrc}
                  alt="裁切預覽"
                  style={{
                    position: "absolute",
                    left: imgOffset.left,
                    top: imgOffset.top,
                    width: dw,
                    height: dh,
                    transform: `rotate(${rotation}deg)`,
                    objectFit: "contain",
                    userSelect: "none",
                    pointerEvents: "none",
                    display: "block",
                  }}
                  draggable={false}
                />

                {/* SVG 遮罩 + 裁切框 */}
                <svg
                  style={{
                    position: "absolute",
                    left: imgOffset.left,
                    top: imgOffset.top,
                    width: dw,
                    height: dh,
                    pointerEvents: "none",
                  }}
                >
                  {/* 暗色遮罩四塊 */}
                  <rect x={0} y={0} width={dw} height={crop.y * dh} fill="rgba(0,0,0,0.55)" />
                  <rect x={0} y={(crop.y + crop.h) * dh} width={dw} height={(1 - crop.y - crop.h) * dh} fill="rgba(0,0,0,0.55)" />
                  <rect x={0} y={crop.y * dh} width={crop.x * dw} height={crop.h * dh} fill="rgba(0,0,0,0.55)" />
                  <rect x={(crop.x + crop.w) * dw} y={crop.y * dh} width={(1 - crop.x - crop.w) * dw} height={crop.h * dh} fill="rgba(0,0,0,0.55)" />

                  {/* 裁切框邊框 */}
                  <rect
                    x={crop.x * dw} y={crop.y * dh}
                    width={crop.w * dw} height={crop.h * dh}
                    fill="none" stroke="white" strokeWidth={1.5}
                  />

                  {/* 三等分輔助線 */}
                  {[1/3, 2/3].map((t, i) => (
                    <g key={i}>
                      <line
                        x1={crop.x * dw + crop.w * dw * t} y1={crop.y * dh}
                        x2={crop.x * dw + crop.w * dw * t} y2={(crop.y + crop.h) * dh}
                        stroke="rgba(255,255,255,0.25)" strokeWidth={0.8}
                      />
                      <line
                        x1={crop.x * dw} y1={crop.y * dh + crop.h * dh * t}
                        x2={(crop.x + crop.w) * dw} y2={crop.y * dh + crop.h * dh * t}
                        stroke="rgba(255,255,255,0.25)" strokeWidth={0.8}
                      />
                    </g>
                  ))}

                  {/* 四角控制點 */}
                  {[
                    { cx: crop.x * dw, cy: crop.y * dh },
                    { cx: (crop.x + crop.w) * dw, cy: crop.y * dh },
                    { cx: crop.x * dw, cy: (crop.y + crop.h) * dh },
                    { cx: (crop.x + crop.w) * dw, cy: (crop.y + crop.h) * dh },
                  ].map((pt, i) => (
                    <circle key={i} cx={pt.cx} cy={pt.cy} r={HANDLE_R} fill="white" stroke="rgba(0,0,0,0.25)" strokeWidth={1.5} />
                  ))}
                </svg>

                {/* 裁切尺寸提示 */}
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded pointer-events-none">
                  {Math.round(crop.w * (imgRef.current?.naturalWidth || 0))} × {Math.round(crop.h * (imgRef.current?.naturalHeight || 0))} px
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-white/40 text-sm">載入圖片中...</div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">拖移框內可移動位置；拖移四角白點可調整大小</p>
        </div>

        {/* 隱藏 canvas */}
        <canvas ref={canvasRef} className="hidden" />

        <DialogFooter className="px-5 pb-4 gap-2 shrink-0">
          <Button variant="outline" onClick={onClose} className="gap-1">
            <X className="w-4 h-4" />取消
          </Button>
          <Button onClick={handleConfirm} disabled={!imgLoaded} className="gap-1">
            <Check className="w-4 h-4" />確認裁切
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
