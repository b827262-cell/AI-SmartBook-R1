import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Eraser,
  Square,
  Scissors,
  RotateCcw,
  RotateCw,
  FlipVertical2,
  Undo2,
  Check,
  X,
} from "lucide-react";

interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface ImageEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  onConfirm: (blob: Blob) => void;
  title?: string;
}

export function ImageEditorDialog({
  open,
  onOpenChange,
  imageUrl,
  onConfirm,
  title = "圖片預覽",
}: ImageEditorDialogProps) {
  // 編輯功能狀態
  const [isErasing, setIsErasing] = useState(false);
  const [eraserSize, setEraserSize] = useState(20);
  const [editHistory, setEditHistory] = useState<ImageData[]>([]);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // 矩形塗白模式
  const [isRectErasing, setIsRectErasing] = useState(false);
  const [rectSelection, setRectSelection] = useState<SelectionRect | null>(null);
  const [isSelectingRect, setIsSelectingRect] = useState(false);

  // 裁切模式
  const [isCropping, setIsCropping] = useState(false);
  const [cropSelection, setCropSelection] = useState<SelectionRect | null>(null);
  const [isSelectingCrop, setIsSelectingCrop] = useState(false);

  // 當對話框開啟時，載入圖片到 canvas
  useEffect(() => {
    if (open && imageUrl && previewCanvasRef.current) {
      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // 設定 canvas 大小
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        // 儲存初始狀態到歷史記錄
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setEditHistory([imageData]);
      };
      img.src = imageUrl;
    }
  }, [open, imageUrl]);

  // 重置狀態
  useEffect(() => {
    if (!open) {
      setIsErasing(false);
      setIsRectErasing(false);
      setIsCropping(false);
      setRectSelection(null);
      setCropSelection(null);
      setEditHistory([]);
    }
  }, [open]);

  // 儲存當前狀態到歷史記錄
  const saveToHistory = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setEditHistory((prev) => [...prev, imageData]);
  }, []);

  // 復原
  const handleUndo = useCallback(() => {
    if (editHistory.length <= 1) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newHistory = [...editHistory];
    newHistory.pop();
    const previousState = newHistory[newHistory.length - 1];
    
    // 恢復 canvas 大小
    canvas.width = previousState.width;
    canvas.height = previousState.height;
    ctx.putImageData(previousState, 0, 0);
    setEditHistory(newHistory);
  }, [editHistory]);

  // 旋轉處理
  const handleRotate = useCallback(
    (degrees: number) => {
      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return;

      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      tempCtx.putImageData(imageData, 0, 0);

      if (degrees === 90 || degrees === -90) {
        canvas.width = tempCanvas.height;
        canvas.height = tempCanvas.width;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);

      if (degrees === 90 || degrees === -90) {
        ctx.drawImage(tempCanvas, -tempCanvas.width / 2, -tempCanvas.height / 2);
      } else {
        ctx.drawImage(tempCanvas, -canvas.width / 2, -canvas.height / 2);
      }

      ctx.restore();
      saveToHistory();
    },
    [saveToHistory]
  );

  // Canvas 滑鼠事件處理
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      if (isErasing && !isRectErasing) {
        // 筆刷塗白模式
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(x, y, eraserSize, 0, Math.PI * 2);
        ctx.fill();
      } else if (isRectErasing) {
        // 矩形塗白模式
        setIsSelectingRect(true);
        setRectSelection({ startX: x, startY: y, endX: x, endY: y });
      } else if (isCropping) {
        // 裁切模式
        setIsSelectingCrop(true);
        setCropSelection({ startX: x, startY: y, endX: x, endY: y });
      }
    },
    [isErasing, isRectErasing, isCropping, eraserSize]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      if (isErasing && !isRectErasing && e.buttons === 1) {
        // 筆刷塗白模式 - 拖曳
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(x, y, eraserSize, 0, Math.PI * 2);
        ctx.fill();
      } else if (isSelectingRect && rectSelection) {
        // 矩形塗白選取中
        setRectSelection((prev) =>
          prev ? { ...prev, endX: x, endY: y } : null
        );
      } else if (isSelectingCrop && cropSelection) {
        // 裁切選取中
        setCropSelection((prev) =>
          prev ? { ...prev, endX: x, endY: y } : null
        );
      }
    },
    [
      isErasing,
      isRectErasing,
      isSelectingRect,
      rectSelection,
      isSelectingCrop,
      cropSelection,
      eraserSize,
    ]
  );

  const handleCanvasMouseUp = useCallback(() => {
    if (isErasing && !isRectErasing) {
      // 筆刷塗白完成，儲存歷史
      saveToHistory();
    } else if (isSelectingRect && rectSelection) {
      // 矩形塗白完成
      const canvas = previewCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const x = Math.min(rectSelection.startX, rectSelection.endX);
          const y = Math.min(rectSelection.startY, rectSelection.endY);
          const width = Math.abs(rectSelection.endX - rectSelection.startX);
          const height = Math.abs(rectSelection.endY - rectSelection.startY);
          ctx.fillStyle = "white";
          ctx.fillRect(x, y, width, height);
          saveToHistory();
        }
      }
      setIsSelectingRect(false);
      setRectSelection(null);
    } else if (isSelectingCrop) {
      // 裁切選取完成
      setIsSelectingCrop(false);
    }
  }, [
    isErasing,
    isRectErasing,
    isSelectingRect,
    rectSelection,
    isSelectingCrop,
    saveToHistory,
  ]);

  // 確認裁切
  const handleConfirmCropSelection = useCallback(() => {
    if (!cropSelection) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const x = Math.min(cropSelection.startX, cropSelection.endX);
    const y = Math.min(cropSelection.startY, cropSelection.endY);
    const width = Math.abs(cropSelection.endX - cropSelection.startX);
    const height = Math.abs(cropSelection.endY - cropSelection.startY);

    if (width < 10 || height < 10) {
      setCropSelection(null);
      return;
    }

    const imageData = ctx.getImageData(x, y, width, height);
    canvas.width = width;
    canvas.height = height;
    ctx.putImageData(imageData, 0, 0);

    setCropSelection(null);
    setIsCropping(false);
    saveToHistory();
  }, [cropSelection, saveToHistory]);

  // 取消裁切選取
  const handleCancelCropSelection = useCallback(() => {
    setCropSelection(null);
  }, []);

  // 取消預覽
  const handleCancelPreview = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // 確認使用
  const handleConfirmCrop = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onConfirm(blob);
          onOpenChange(false);
        }
      },
      "image/png",
      1.0
    );
  }, [onConfirm, onOpenChange]);

  // 計算矩形選取框樣式
  const getRectSelectionStyle = useCallback(() => {
    if (!rectSelection || !previewCanvasRef.current) return null;
    const canvas = previewCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    const left =
      Math.min(rectSelection.startX, rectSelection.endX) * scaleX;
    const top =
      Math.min(rectSelection.startY, rectSelection.endY) * scaleY;
    const width =
      Math.abs(rectSelection.endX - rectSelection.startX) * scaleX;
    const height =
      Math.abs(rectSelection.endY - rectSelection.startY) * scaleY;

    return { left, top, width, height };
  }, [rectSelection]);

  // 計算裁切選取框樣式
  const getCropSelectionStyle = useCallback(() => {
    if (!cropSelection || !previewCanvasRef.current) return null;
    const canvas = previewCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    const left =
      Math.min(cropSelection.startX, cropSelection.endX) * scaleX;
    const top =
      Math.min(cropSelection.startY, cropSelection.endY) * scaleY;
    const width =
      Math.abs(cropSelection.endX - cropSelection.startX) * scaleX;
    const height =
      Math.abs(cropSelection.endY - cropSelection.startY) * scaleY;

    return { left, top, width, height };
  }, [cropSelection]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 工具列 */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
            {/* 筆刷塗白 */}
            <Button
              variant={isErasing && !isRectErasing ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setIsErasing(!isErasing || isRectErasing);
                setIsRectErasing(false);
                setIsCropping(false);
              }}
              className={
                isErasing && !isRectErasing
                  ? "bg-red-500 hover:bg-red-600"
                  : ""
              }
            >
              <Eraser className="w-4 h-4 mr-1" />
              筆刷塗白
            </Button>

            {/* 矩形塗白 */}
            <Button
              variant={isRectErasing ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setIsRectErasing(!isRectErasing);
                setIsErasing(false);
                setIsCropping(false);
              }}
              className={isRectErasing ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              <Square className="w-4 h-4 mr-1" />
              矩形塗白
            </Button>

            {/* 筆刷大小調整 */}
            {isErasing && !isRectErasing && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">筆刷:</span>
                <Slider
                  value={[eraserSize]}
                  onValueChange={(value) => setEraserSize(value[0])}
                  min={5}
                  max={50}
                  step={5}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground w-8">
                  {eraserSize}px
                </span>
              </div>
            )}

            <div className="border-l border-border h-6 mx-1" />

            {/* 裁切工具 */}
            <Button
              variant={isCropping ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setIsCropping(!isCropping);
                setIsErasing(false);
                setIsRectErasing(false);
                setCropSelection(null);
              }}
              className={isCropping ? "bg-blue-500 hover:bg-blue-600" : ""}
            >
              <Scissors className="w-4 h-4 mr-1" />
              裁切
            </Button>

            <div className="border-l border-border h-6 mx-1" />

            {/* 旋轉工具 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRotate(-90)}
              title="逆時針旋轉 90°"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRotate(90)}
              title="順時針旋轉 90°"
            >
              <RotateCw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRotate(180)}
              title="旋轉 180°"
            >
              <FlipVertical2 className="w-4 h-4" />
            </Button>

            <div className="border-l border-border h-6 mx-1" />

            {/* 復原 */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={editHistory.length <= 1}
            >
              <Undo2 className="w-4 h-4 mr-1" />
              復原
            </Button>
          </div>

          {/* 提示文字 */}
          {isErasing && !isRectErasing && (
            <p className="text-sm text-muted-foreground text-center">
              點擊或拖曳塗白不需要的區域
            </p>
          )}
          {isRectErasing && (
            <p className="text-sm text-muted-foreground text-center">
              框選要塗白的矩形區域
            </p>
          )}
          {isCropping && !cropSelection && (
            <p className="text-sm text-muted-foreground text-center">
              框選要保留的區域
            </p>
          )}
          {isCropping && cropSelection && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelCropSelection}
              >
                <X className="w-4 h-4 mr-1" />
                取消裁切
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleConfirmCropSelection}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Check className="w-4 h-4 mr-1" />
                確認裁切
              </Button>
            </div>
          )}

          {/* 圖片預覽區域 */}
          <div className="relative flex justify-center bg-muted/20 rounded-lg p-4 overflow-auto max-h-[400px]">
            <div className="relative inline-block">
              <canvas
                ref={previewCanvasRef}
                className={`max-w-full h-auto shadow-lg ${
                  isErasing && !isRectErasing
                    ? "cursor-crosshair"
                    : isRectErasing || isCropping
                    ? "cursor-crosshair"
                    : ""
                }`}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />

              {/* 矩形塗白選取框 */}
              {isSelectingRect && rectSelection && getRectSelectionStyle() && (
                <div
                  className="absolute border-2 border-dashed border-orange-500 bg-orange-500/20 pointer-events-none"
                  style={{
                    left: getRectSelectionStyle()!.left,
                    top: getRectSelectionStyle()!.top,
                    width: getRectSelectionStyle()!.width,
                    height: getRectSelectionStyle()!.height,
                  }}
                />
              )}

              {/* 裁切選取框 */}
              {cropSelection && getCropSelectionStyle() && (
                <div
                  className="absolute border-2 border-dashed border-blue-500 bg-blue-500/20 pointer-events-none"
                  style={{
                    left: getCropSelectionStyle()!.left,
                    top: getCropSelectionStyle()!.top,
                    width: getCropSelectionStyle()!.width,
                    height: getCropSelectionStyle()!.height,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancelPreview}>
            取消
          </Button>
          <Button
            onClick={handleConfirmCrop}
            disabled={isCropping && !!cropSelection}
          >
            <Check className="w-4 h-4 mr-2" />
            確認使用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
