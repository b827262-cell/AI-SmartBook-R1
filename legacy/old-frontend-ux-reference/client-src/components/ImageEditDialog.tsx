import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Eraser, Crop, RotateCw, Check, X, Undo, Redo } from 'lucide-react';
import { toast } from 'sonner';

interface ImageEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  pageNumber: number;
  onConfirm?: (imageDataUrl: string) => void; // 新增：確認後回傳圖片 Data URL
}

type Tool = 'whiteout' | 'crop' | null;

interface DrawAction {
  type: 'whiteout';
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ImageEditDialog({
  open,
  onOpenChange,
  imageUrl,
  pageNumber,
  onConfirm,
}: ImageEditDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [brushSize, setBrushSize] = useState<number>(20);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [drawHistory, setDrawHistory] = useState<DrawAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // 載入圖片
  useEffect(() => {
    if (!open || !imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImage(img);
      redrawCanvas(img, rotation, []);
    };
    img.src = imageUrl;
  }, [open, imageUrl]);

  // 重繪 Canvas
  const redrawCanvas = (
    img: HTMLImageElement,
    rot: number,
    actions: DrawAction[]
  ) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 設定 Canvas 尺寸
    if (rot === 90 || rot === 270) {
      canvas.width = img.height;
      canvas.height = img.width;
    } else {
      canvas.width = img.width;
      canvas.height = img.height;
    }

    // 清空 Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 旋轉並繪製圖片
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    // 應用所有編輯動作
    actions.forEach((action) => {
      if (action.type === 'whiteout') {
        ctx.fillStyle = 'white';
        ctx.fillRect(action.x, action.y, action.width, action.height);
      }
    });
  };

  // 旋轉圖片
  const handleRotate = () => {
    if (!originalImage) return;
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    const currentActions = drawHistory.slice(0, historyIndex + 1);
    redrawCanvas(originalImage, newRotation, currentActions);
  };

  // 撤銷
  const handleUndo = () => {
    if (historyIndex < 0 || !originalImage) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    const actions = drawHistory.slice(0, newIndex + 1);
    redrawCanvas(originalImage, rotation, actions);
  };

  // 重做
  const handleRedo = () => {
    if (historyIndex >= drawHistory.length - 1 || !originalImage) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    const actions = drawHistory.slice(0, newIndex + 1);
    redrawCanvas(originalImage, rotation, actions);
  };

  // Canvas 滑鼠事件
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeTool || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDrawing(true);
    setStartPos({ x, y });

    if (activeTool === 'whiteout') {
      // 開始繪製白色矩形
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(x - brushSize / 2, y - brushSize / 2, brushSize, brushSize);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !activeTool || !canvasRef.current || !startPos) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (activeTool === 'whiteout') {
      // 繼續繪製白色矩形
      ctx.fillStyle = 'white';
      ctx.fillRect(x - brushSize / 2, y - brushSize / 2, brushSize, brushSize);
    } else if (activeTool === 'crop') {
      // 繪製裁切框（虛線）
      if (!originalImage) return;
      redrawCanvas(originalImage, rotation, drawHistory.slice(0, historyIndex + 1));
      
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        startPos.x,
        startPos.y,
        x - startPos.x,
        y - startPos.y
      );
      ctx.setLineDash([]);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !activeTool || !canvasRef.current || !startPos) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (activeTool === 'whiteout') {
      // 記錄塗白動作
      const action: DrawAction = {
        type: 'whiteout',
        x: Math.min(startPos.x, x) - brushSize / 2,
        y: Math.min(startPos.y, y) - brushSize / 2,
        width: Math.abs(x - startPos.x) + brushSize,
        height: Math.abs(y - startPos.y) + brushSize,
      };
      const newHistory = [...drawHistory.slice(0, historyIndex + 1), action];
      setDrawHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }

    setIsDrawing(false);
    setStartPos(null);
  };

  // 確認使用
  const handleConfirm = async () => {
    if (!canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      
      // 如果有 onConfirm 回調，則回傳圖片 Data URL
      if (onConfirm) {
        const dataUrl = canvas.toDataURL('image/png');
        onConfirm(dataUrl);
        onOpenChange(false);
        return;
      }
      
      // 否則複製到剪貼簿（舊行為）
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error('無法生成圖片');
          return;
        }

        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob,
            }),
          ]);
          toast.success('✅ 圖片已複製到剪貼簿！可直接按 Ctrl+V 貼上');
          onOpenChange(false);
        } catch (err) {
          console.error('複製到剪貼簿失敗:', err);
          toast.error('複製到剪貼簿失敗，請使用下載功能');
        }
      }, 'image/png');
    } catch (error) {
      console.error('處理圖片失敗:', error);
      toast.error('處理圖片失敗');
    }
  };

  // 重置
  const handleReset = () => {
    if (!originalImage) return;
    setRotation(0);
    setDrawHistory([]);
    setHistoryIndex(-1);
    setActiveTool(null);
    redrawCanvas(originalImage, 0, []);
    toast.info('已重置為原始圖片');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>圖片預覽 - 第 {pageNumber} 頁</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4">
          {/* 左側工具欄 */}
          <div className="w-48 flex-shrink-0 space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">編輯工具</h4>
              <Button
                variant={activeTool === 'whiteout' ? 'default' : 'outline'}
                size="sm"
                className="w-full justify-start"
                onClick={() => setActiveTool(activeTool === 'whiteout' ? null : 'whiteout')}
              >
                <Eraser className="w-4 h-4 mr-2" />
                塗白
              </Button>
              <Button
                variant={activeTool === 'crop' ? 'default' : 'outline'}
                size="sm"
                className="w-full justify-start"
                onClick={() => setActiveTool(activeTool === 'crop' ? null : 'crop')}
              >
                <Crop className="w-4 h-4 mr-2" />
                裁切
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleRotate}
              >
                <RotateCw className="w-4 h-4 mr-2" />
                旋轉 90°
              </Button>
            </div>

            {activeTool === 'whiteout' && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">筆刷大小</h4>
                <Slider
                  value={[brushSize]}
                  onValueChange={(value) => setBrushSize(value[0])}
                  min={10}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-gray-500">{brushSize}px</p>
              </div>
            )}

            <div className="space-y-2 border-t pt-4">
              <h4 className="font-semibold text-sm">操作</h4>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleUndo}
                disabled={historyIndex < 0}
              >
                <Undo className="w-4 h-4 mr-2" />
                撤銷
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleRedo}
                disabled={historyIndex >= drawHistory.length - 1}
              >
                <Redo className="w-4 h-4 mr-2" />
                重做
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleReset}
              >
                <X className="w-4 h-4 mr-2" />
                重置
              </Button>
            </div>

            <div className="border-t pt-4">
              <Button
                variant="default"
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={handleConfirm}
              >
                <Check className="w-4 h-4 mr-2" />
                確認使用
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                點擊後將自動複製到剪貼簿
              </p>
            </div>
          </div>

          {/* 右側 Canvas */}
          <div className="flex-1 border rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-[70vh] cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => {
                if (isDrawing) {
                  setIsDrawing(false);
                  setStartPos(null);
                }
              }}
            />
          </div>
        </div>

        {/* 提示 */}
        {activeTool && (
          <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
            {activeTool === 'whiteout' && '💡 按住滑鼠左鍵拖曳以塗白區域'}
            {activeTool === 'crop' && '💡 按住滑鼠左鍵拖曳以選擇裁切區域'}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
