/**
 * 圖片裁切對話框
 * 用於處理剪貼簿貼上的圖片，提供裁切、旋轉、塗白、移除浮水印等編輯功能
 */

import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RotateCw, Crop, Eraser, Droplet, Undo, Redo, Pipette } from 'lucide-react';
import { toast } from 'sonner';

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onConfirm: (croppedImageBlob: Blob) => void;
}

type EditMode = 'none' | 'crop' | 'paint' | 'watermark' | 'colorPicker';

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ImageCropDialog({
  open,
  onOpenChange,
  imageUrl,
  onConfirm,
}: ImageCropDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [rotation, setRotation] = useState(0);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [paintBrushSize, setPaintBrushSize] = useState(20);
  const [watermarkThreshold, setWatermarkThreshold] = useState(200);
  const [selectedColor, setSelectedColor] = useState<{ r: number; g: number; b: number } | null>(null);
  const [colorTolerance, setColorTolerance] = useState(30);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 載入圖片
  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      setRotation(0);
      setCropRect(null);
      setEditMode('none');
      setHistory([]);
      setHistoryIndex(-1);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // 繪製畫布
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 根據旋轉角度調整畫布尺寸
    const rotationRad = (rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rotationRad));
    const sin = Math.abs(Math.sin(rotationRad));
    const newWidth = image.width * cos + image.height * sin;
    const newHeight = image.width * sin + image.height * cos;

    canvas.width = newWidth;
    canvas.height = newHeight;

    // 清空畫布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 旋轉並繪製圖片
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rotationRad);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.restore();

    // 如果是第一次繪製，保存到歷史記錄
    if (history.length === 0) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([imageData]);
      setHistoryIndex(0);
    }

    // 繪製裁切框
    if (editMode === 'crop' && cropRect) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
      ctx.setLineDash([]);
    }
  }, [image, rotation, cropRect, editMode]);

  // 保存當前狀態到歷史記錄
  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // 撤銷
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.putImageData(history[historyIndex - 1], 0, 0);
      }
    }
  };

  // 重做
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.putImageData(history[historyIndex + 1], 0, 0);
      }
    }
  };

  // 旋轉圖片
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    setCropRect(null);
  };

  // 開始裁切
  const handleStartCrop = () => {
    setEditMode(editMode === 'crop' ? 'none' : 'crop');
    setCropRect(null);
  };

  // 開始塗白
  const handleStartPaint = () => {
    setEditMode(editMode === 'paint' ? 'none' : 'paint');
  };

  // 開始移除浮水印
  const handleStartWatermark = () => {
    setEditMode(editMode === 'watermark' ? 'none' : 'watermark');
  };

  // 應用移除浮水印
  const handleApplyWatermark = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;

      if (brightness > watermarkThreshold) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    saveToHistory();
    toast.success('已移除浮水印');
  };

  // 應用顏色移除：將相似顏色變成白色
  const applyColorRemoval = () => {
    if (!selectedColor) {
      toast.error('請先點擊圖片選擇要移除的顏色');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // 計算顏色相似度（歐幾里得距離）
    const colorDistance = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) => {
      return Math.sqrt(
        Math.pow(r1 - r2, 2) +
        Math.pow(g1 - g2, 2) +
        Math.pow(b1 - b2, 2)
      );
    };

    let removedPixels = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const distance = colorDistance(r, g, b, selectedColor.r, selectedColor.g, selectedColor.b);

      // 如果顏色距離小於容差，則變成白色
      if (distance <= colorTolerance) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        removedPixels++;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    saveToHistory();
    toast.success(`已移除 ${Math.floor(removedPixels / 4)} 個相似像素`);
  };

  // 滑鼠按下
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (editMode === 'colorPicker') {
      // 顏色選擇器模式：吸取顏色
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imageData = ctx.getImageData(x, y, 1, 1);
      const pixel = imageData.data;
      const color = { r: pixel[0], g: pixel[1], b: pixel[2] };
      setSelectedColor(color);
      toast.success(`已選中顏色: RGB(${color.r}, ${color.g}, ${color.b})`);
      return;
    }

    setIsDragging(true);
    setDragStart({ x, y });

    if (editMode === 'crop') {
      setCropRect({ x, y, width: 0, height: 0 });
    }
  };

  // 滑鼠移動
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (editMode === 'crop' && cropRect) {
      setCropRect({
        ...cropRect,
        width: x - dragStart.x,
        height: y - dragStart.y,
      });
    } else if (editMode === 'paint') {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(x, y, paintBrushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // 滑鼠放開
  const handleMouseUp = () => {
    if (isDragging && editMode === 'paint') {
      saveToHistory();
    }
    setIsDragging(false);
  };

  // 確認裁切
  const handleConfirmCrop = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let finalCanvas = canvas;

    // 如果有裁切框，執行裁切
    if (cropRect && cropRect.width > 0 && cropRect.height > 0) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = Math.abs(cropRect.width);
      croppedCanvas.height = Math.abs(cropRect.height);
      const croppedCtx = croppedCanvas.getContext('2d');
      if (!croppedCtx) return;

      const sourceX = cropRect.width < 0 ? cropRect.x + cropRect.width : cropRect.x;
      const sourceY = cropRect.height < 0 ? cropRect.y + cropRect.height : cropRect.y;

      croppedCtx.drawImage(
        canvas,
        sourceX,
        sourceY,
        Math.abs(cropRect.width),
        Math.abs(cropRect.height),
        0,
        0,
        Math.abs(cropRect.width),
        Math.abs(cropRect.height)
      );

      finalCanvas = croppedCanvas;
    }

    // 轉換為 Blob
    finalCanvas.toBlob((blob) => {
      if (blob) {
        onConfirm(blob);
        onOpenChange(false);
      }
    }, 'image/png');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>編輯圖片</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 工具列 */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant={editMode === 'crop' ? 'default' : 'outline'}
              onClick={handleStartCrop}
            >
              <Crop className="w-4 h-4 mr-1" />
              裁切
            </Button>
            <Button size="sm" variant="outline" onClick={handleRotate}>
              <RotateCw className="w-4 h-4 mr-1" />
              旋轉
            </Button>
            <Button
              size="sm"
              variant={editMode === 'paint' ? 'default' : 'outline'}
              onClick={handleStartPaint}
            >
              <Eraser className="w-4 h-4 mr-1" />
              塗白
            </Button>
            <Button
              size="sm"
              variant={editMode === 'watermark' ? 'default' : 'outline'}
              onClick={handleStartWatermark}
            >
              <Droplet className="w-4 h-4 mr-1" />
              移除浮水印
            </Button>
            <Button
              size="sm"
              variant={editMode === 'colorPicker' ? 'default' : 'outline'}
              onClick={() => {
                setEditMode(editMode === 'colorPicker' ? 'none' : 'colorPicker');
                if (editMode !== 'colorPicker') {
                  setSelectedColor(null);
                }
              }}
            >
              <Pipette className="w-4 h-4 mr-1" />
              吸取顏色
            </Button>
            <div className="h-6 w-px bg-border" />
            <Button
              size="sm"
              variant="outline"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
            >
              <Undo className="w-4 h-4 mr-1" />
              撤銷
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
            >
              <Redo className="w-4 h-4 mr-1" />
              重做
            </Button>
          </div>

          {/* 工具設定 */}
          {editMode === 'paint' && (
            <div className="flex items-center gap-4">
              <span className="text-sm">筆刷大小：</span>
              <Slider
                value={[paintBrushSize]}
                onValueChange={(value) => setPaintBrushSize(value[0])}
                min={5}
                max={50}
                step={1}
                className="w-48"
              />
              <span className="text-sm">{paintBrushSize}px</span>
            </div>
          )}

          {editMode === 'watermark' && (
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <span className="text-sm">亮度閾值：</span>
                <Slider
                  value={[watermarkThreshold]}
                  onValueChange={(value) => setWatermarkThreshold(value[0])}
                  min={100}
                  max={240}
                  step={1}
                  className="w-48"
                />
                <span className="text-sm">{watermarkThreshold}</span>
              </div>
              <Button size="sm" onClick={handleApplyWatermark}>
                應用移除浮水印
              </Button>
            </div>
          )}

          {/* 畫布 */}
          <div className="border rounded-lg overflow-auto bg-gray-50 flex items-center justify-center p-4">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="max-w-full max-h-[60vh] cursor-crosshair"
            />
          </div>

          {/* 顏色選擇器控制 */}
          {editMode === 'colorPicker' && (
            <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm">容差值：</span>
                <Slider
                  value={[colorTolerance]}
                  onValueChange={(value) => setColorTolerance(value[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="w-48"
                />
                <span className="text-sm">{colorTolerance}</span>
              </div>
              {selectedColor && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">已選顏色：</span>
                    <div
                      className="w-8 h-8 border-2 border-gray-300 rounded"
                      style={{ backgroundColor: `rgb(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b})` }}
                    />
                    <span className="text-xs text-gray-600">
                      RGB({selectedColor.r}, {selectedColor.g}, {selectedColor.b})
                    </span>
                  </div>
                  <Button size="sm" onClick={applyColorRemoval}>
                    應用移除
                  </Button>
                </>
              )}
            </div>
          )}

          {/* 提示 */}
          {editMode === 'crop' && (
            <p className="text-sm text-muted-foreground">
              在圖片上拖曳以選擇裁切區域
            </p>
          )}
          {editMode === 'paint' && (
            <p className="text-sm text-muted-foreground">
              在圖片上拖曳以塗白不需要的內容
            </p>
          )}
          {editMode === 'watermark' && (
            <p className="text-sm text-muted-foreground">
              調整亮度閾值，然後點擊「應用移除浮水印」
            </p>
          )}
          {editMode === 'colorPicker' && (
            <p className="text-sm text-muted-foreground">
              點擊圖片上的浮水印顏色，調整容差值，然後點擊「應用移除」
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirmCrop}>確認使用</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
