/**
 * ImageEditorModal - 手機優先設計
 * 全螢幕圖片編輯器：裁切 + 旋轉
 * 頂部：標題 + 取消
 * 中間：圖片（限制高度，確保按鈕可見）
 * 底部：工具按鈕（旋轉、裁切、確認）
 */
import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { RotateCcw, RotateCw, Crop as CropIcon, Check, X } from "lucide-react";

interface ImageEditorModalProps {
  src: string;
  onConfirm: (editedBase64: string) => void;
  onCancel: () => void;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 85 }, mediaWidth / mediaHeight, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

export default function ImageEditorModal({ src, onConfirm, onCancel }: ImageEditorModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [rotation, setRotation] = useState(0);
  const [isCropMode, setIsCropMode] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height));
  }, []);

  const rotate = (delta: number) => {
    setRotation((prev) => (prev + delta + 360) % 360);
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  const applyAndConfirm = useCallback(() => {
    const image = imgRef.current;
    if (!image) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rad = (rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const rotW = image.naturalWidth * cos + image.naturalHeight * sin;
    const rotH = image.naturalWidth * sin + image.naturalHeight * cos;

    const rotCanvas = document.createElement("canvas");
    rotCanvas.width = rotW;
    rotCanvas.height = rotH;
    const rotCtx = rotCanvas.getContext("2d");
    if (!rotCtx) return;
    rotCtx.translate(rotW / 2, rotH / 2);
    rotCtx.rotate(rad);
    rotCtx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

    if (completedCrop && isCropMode && completedCrop.width > 0 && completedCrop.height > 0) {
      const displayRotW = image.width * cos + image.height * sin;
      const displayRotH = image.width * sin + image.height * cos;
      const rotScaleX = rotW / displayRotW;
      const rotScaleY = rotH / displayRotH;

      const cropX = completedCrop.x * rotScaleX;
      const cropY = completedCrop.y * rotScaleY;
      const cropWidth = completedCrop.width * rotScaleX;
      const cropHeight = completedCrop.height * rotScaleY;

      canvas.width = cropWidth;
      canvas.height = cropHeight;
      ctx.drawImage(rotCanvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    } else {
      canvas.width = rotW;
      canvas.height = rotH;
      ctx.drawImage(rotCanvas, 0, 0);
    }

    // 自動壓縮：限制最大邊長 1920px，加快 OCR 速度
    const MAX_PX = 1920;
    const finalW = canvas.width;
    const finalH = canvas.height;
    let outputBase64: string;
    if (finalW > MAX_PX || finalH > MAX_PX) {
      const scale = MAX_PX / Math.max(finalW, finalH);
      const compressCanvas = document.createElement("canvas");
      compressCanvas.width = Math.round(finalW * scale);
      compressCanvas.height = Math.round(finalH * scale);
      const compressCtx = compressCanvas.getContext("2d");
      if (compressCtx) {
        compressCtx.drawImage(canvas, 0, 0, compressCanvas.width, compressCanvas.height);
        outputBase64 = compressCanvas.toDataURL("image/jpeg", 0.85);
      } else {
        outputBase64 = canvas.toDataURL("image/jpeg", 0.85);
      }
    } else {
      outputBase64 = canvas.toDataURL("image/jpeg", 0.88);
    }
    onConfirm(outputBase64);
  }, [completedCrop, rotation, isCropMode, onConfirm]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* ── 頂部：標題 + 取消 ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-black border-b border-white/10 flex-shrink-0">
        <span className="text-white font-semibold text-base">圖片編輯</span>
        <button
          onClick={onCancel}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* ── 中間：圖片區域（限高，確保底部按鈕可見）── */}
      <div
        className="flex-1 overflow-auto flex items-center justify-center bg-black/95"
        style={{ minHeight: 0 }}
      >
        {isCropMode ? (
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            style={{ maxWidth: "100%", maxHeight: "100%" }}
          >
            <img
              ref={imgRef}
              src={src}
              alt="編輯圖片"
              onLoad={onImageLoad}
              style={{
                transform: `rotate(${rotation}deg)`,
                maxWidth: "100vw",
                maxHeight: "calc(100vh - 180px)",
                objectFit: "contain",
                display: "block",
              }}
            />
          </ReactCrop>
        ) : (
          <img
            ref={imgRef}
            src={src}
            alt="編輯圖片"
            style={{
              transform: `rotate(${rotation}deg)`,
              maxWidth: "100vw",
              maxHeight: "calc(100vh - 180px)",
              objectFit: "contain",
              display: "block",
            }}
          />
        )}
      </div>

      {/* ── 底部：工具按鈕（固定，不會被圖片遮住）── */}
      <div className="flex-shrink-0 bg-black border-t border-white/10">
        {/* 提示文字 */}
        <p className="text-white/40 text-xs text-center pt-2 px-4">
          {isCropMode ? "拖曳選取要保留的區域" : "旋轉或裁切後點「確認使用」"}
        </p>

        {/* 按鈕列 */}
        <div className="flex items-center justify-around px-4 py-3 gap-2">
          {/* 向左旋轉 */}
          <button
            onClick={() => rotate(-90)}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-white/10 active:bg-white/20 min-w-[64px]"
          >
            <RotateCcw className="w-6 h-6 text-white" />
            <span className="text-white text-xs">向左</span>
          </button>

          {/* 向右旋轉 */}
          <button
            onClick={() => rotate(90)}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-white/10 active:bg-white/20 min-w-[64px]"
          >
            <RotateCw className="w-6 h-6 text-white" />
            <span className="text-white text-xs">向右</span>
          </button>

          {/* 裁切模式 */}
          <button
            onClick={() => setIsCropMode(!isCropMode)}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl min-w-[64px] ${
              isCropMode ? "bg-primary" : "bg-white/10 active:bg-white/20"
            }`}
          >
            <CropIcon className="w-6 h-6 text-white" />
            <span className="text-white text-xs">{isCropMode ? "取消裁切" : "裁切"}</span>
          </button>

          {/* 確認使用 */}
          <button
            onClick={applyAndConfirm}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-primary active:bg-primary/80 min-w-[64px]"
          >
            <Check className="w-6 h-6 text-white" />
            <span className="text-white text-xs font-semibold">確認</span>
          </button>
        </div>
      </div>
    </div>
  );
}
