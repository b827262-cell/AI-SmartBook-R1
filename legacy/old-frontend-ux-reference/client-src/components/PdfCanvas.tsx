import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Undo, Redo, Download } from 'lucide-react';

interface PdfCanvasProps {
  imageUrl: string;
  pageNumber: number;
  tool: 'whiteout' | 'crop' | null;
  onSave: (editedImageUrl: string) => void;
}

interface DrawAction {
  type: 'whiteout' | 'crop';
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function PdfCanvas({ imageUrl, pageNumber, tool, onSave }: PdfCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [actions, setActions] = useState<DrawAction[]>([]);
  const [redoStack, setRedoStack] = useState<DrawAction[]>([]);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);

  // 載入圖片
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImage(img);
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.width = img.width;
        canvas.height = img.height;
        redrawCanvas(img, actions);
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // 重繪 Canvas
  const redrawCanvas = (img: HTMLImageElement, actionList: DrawAction[]) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空畫布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 繪製原始圖片
    ctx.drawImage(img, 0, 0);

    // 應用所有動作
    actionList.forEach(action => {
      if (action.type === 'whiteout') {
        ctx.fillStyle = 'white';
        ctx.fillRect(action.x, action.y, action.width, action.height);
      }
    });
  };

  // 重繪（包含當前動作）
  useEffect(() => {
    if (originalImage) {
      redrawCanvas(originalImage, actions);
    }
  }, [actions, originalImage]);

  // 開始繪製
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!tool || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentPos({ x, y });
  };

  // 繪製中
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos || !canvasRef.current || !originalImage) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setCurrentPos({ x, y });

    // 重繪畫布並顯示當前選擇區域
    redrawCanvas(originalImage, actions);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = x - startPos.x;
    const height = y - startPos.y;

    if (tool === 'whiteout') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(startPos.x, startPos.y, width, height);
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.strokeRect(startPos.x, startPos.y, width, height);
    } else if (tool === 'crop') {
      ctx.strokeStyle = 'blue';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(startPos.x, startPos.y, width, height);
      ctx.setLineDash([]);
    }
  };

  // 結束繪製
  const handleMouseUp = () => {
    if (!isDrawing || !startPos || !currentPos || !tool) return;

    const width = currentPos.x - startPos.x;
    const height = currentPos.y - startPos.y;

    // 只有當寬高都大於 5 像素時才記錄動作
    if (Math.abs(width) > 5 && Math.abs(height) > 5) {
      const newAction: DrawAction = {
        type: tool,
        x: Math.min(startPos.x, currentPos.x),
        y: Math.min(startPos.y, currentPos.y),
        width: Math.abs(width),
        height: Math.abs(height),
      };

      setActions([...actions, newAction]);
      setRedoStack([]); // 清空重做堆疊
    }

    setIsDrawing(false);
    setStartPos(null);
    setCurrentPos(null);
  };

  // 撤銷
  const handleUndo = () => {
    if (actions.length === 0) return;
    
    const lastAction = actions[actions.length - 1];
    setActions(actions.slice(0, -1));
    setRedoStack([...redoStack, lastAction]);
  };

  // 重做
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    
    const action = redoStack[redoStack.length - 1];
    setActions([...actions, action]);
    setRedoStack(redoStack.slice(0, -1));
  };

  // 儲存
  const handleSave = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const editedImageUrl = canvas.toDataURL('image/png');
    onSave(editedImageUrl);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 工具列 */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleUndo}
          disabled={actions.length === 0}
        >
          <Undo className="w-4 h-4 mr-1" />
          撤銷
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRedo}
          disabled={redoStack.length === 0}
        >
          <Redo className="w-4 h-4 mr-1" />
          重做
        </Button>
        <div className="flex-1" />
        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          className="bg-green-600 hover:bg-green-700"
        >
          <Download className="w-4 h-4 mr-1" />
          儲存編輯
        </Button>
      </div>

      {/* Canvas */}
      <div className="border rounded-lg overflow-hidden bg-gray-100">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-auto cursor-crosshair"
          style={{ maxHeight: '70vh' }}
        />
      </div>

      {/* 提示 */}
      {tool && (
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          {tool === 'whiteout' && '💡 拖曳滑鼠選擇要塗白的區域'}
          {tool === 'crop' && '💡 拖曳滑鼠選擇要裁切的區域'}
        </div>
      )}
    </div>
  );
}
