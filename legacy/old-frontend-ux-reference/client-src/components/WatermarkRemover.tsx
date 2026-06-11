import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Download, Sparkles, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface WatermarkRemoverProps {
  imageUrl: string;
  onSave: (editedImageUrl: string) => void;
}

export default function WatermarkRemover({ imageUrl, onSave }: WatermarkRemoverProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [threshold, setThreshold] = useState<number>(200);
  const [isProcessing, setIsProcessing] = useState(false);

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
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
        }
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // 自動去除浮水印（簡單版本）
  const autoRemoveWatermark = () => {
    if (!canvasRef.current || !originalImage) return;

    setIsProcessing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsProcessing(false);
      return;
    }

    // 重新繪製原始圖片
    ctx.drawImage(originalImage, 0, 0);

    // 獲取圖片數據
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // 簡單的浮水印去除算法：將接近白色或半透明的像素變為白色
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;

      // 如果像素亮度高於閾值，將其變為白色
      if (brightness > threshold) {
        data[i] = 255;     // R
        data[i + 1] = 255; // G
        data[i + 2] = 255; // B
        data[i + 3] = 255; // A
      }
    }

    // 將處理後的數據寫回 Canvas
    ctx.putImageData(imageData, 0, 0);
    
    setIsProcessing(false);
    toast.success('浮水印去除完成！');
  };

  // 重置
  const handleReset = () => {
    if (!canvasRef.current || !originalImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(originalImage, 0, 0);
    toast.info('已重置為原始圖片');
  };

  // 儲存
  const handleSave = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const editedImageUrl = canvas.toDataURL('image/png');
    onSave(editedImageUrl);
  };

  // 打開 Nano Banana Pro
  const openNanoBananaPro = () => {
    window.open('https://nanobanana.pro', '_blank');
    toast.info('已在新分頁中打開 Nano Banana Pro');
  };

  // 下載當前圖片
  const downloadImage = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'page_for_watermark_removal.png';
    link.click();
    toast.success('圖片已下載');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 工具列 */}
      <Card className="p-4">
        <h4 className="font-semibold mb-3">去除浮水印工具</h4>
        
        {/* 閾值調整 */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">
            亮度閾值：{threshold}
          </label>
          <Slider
            value={[threshold]}
            onValueChange={(value) => setThreshold(value[0])}
            min={150}
            max={250}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            調整閾值以控制去除浮水印的強度（值越低，去除越多）
          </p>
        </div>

        {/* 按鈕組 */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={autoRemoveWatermark}
            disabled={isProcessing}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="w-4 h-4 mr-1" />
            {isProcessing ? '處理中...' : '自動去除'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
          >
            重置
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadImage}
          >
            <Download className="w-4 h-4 mr-1" />
            下載圖片
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openNanoBananaPro}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            使用 Nano Banana Pro
          </Button>
        </div>

        {/* 提示 */}
        <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
          <p className="font-medium mb-1">💡 使用提示：</p>
          <ul className="list-disc list-inside space-y-1">
            <li>調整亮度閾值後點擊「自動去除」</li>
            <li>如果效果不理想，可以下載圖片並使用 Nano Banana Pro 進行進階處理</li>
            <li>Nano Banana Pro 提供更強大的 AI 去浮水印功能</li>
          </ul>
        </div>
      </Card>

      {/* Canvas */}
      <div className="border rounded-lg overflow-hidden bg-gray-100">
        <canvas
          ref={canvasRef}
          className="w-full h-auto"
          style={{ maxHeight: '60vh' }}
        />
      </div>

      {/* 儲存按鈕 */}
      <Button
        variant="default"
        size="lg"
        onClick={handleSave}
        className="bg-green-600 hover:bg-green-700 w-full"
      >
        <Download className="w-4 h-4 mr-2" />
        儲存編輯
      </Button>
    </div>
  );
}
