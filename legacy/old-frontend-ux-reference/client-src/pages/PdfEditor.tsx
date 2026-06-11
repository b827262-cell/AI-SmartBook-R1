import { useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import ImageEditDialog from '@/components/ImageEditDialog';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfEditor() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [scale, setScale] = useState<number>(1.0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 處理 PDF 上傳
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setSelectedPage(null);
      toast.success('PDF 上傳成功！');
    } else {
      toast.error('請上傳 PDF 檔案');
    }
  };

  // PDF 載入完成
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    toast.success(`PDF 載入成功！共 ${numPages} 頁`);
  };

  // 點擊頁面 - 開啟編輯對話框
  const handlePageClick = (pageNum: number) => {
    setSelectedPage(pageNum);
  };

  // 重置
  const handleReset = () => {
    setPdfFile(null);
    setPdfUrl(null);
    setNumPages(0);
    setSelectedPage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="container mx-auto max-w-7xl">
        {/* 標題區 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📄 PDF 拆圖編輯</h1>
          <p className="text-gray-600">
            上傳 PDF 檔案，點擊頁面進行編輯，確認後自動複製到剪貼簿，可直接貼上
          </p>
        </div>

        {/* 上傳區 */}
        {!pdfFile && (
          <Card className="p-12 border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors">
            <div className="flex flex-col items-center justify-center">
              <Upload className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                上傳 PDF 檔案
              </h3>
              <p className="text-gray-500 mb-4">
                支援 PDF 格式，檔案大小限制 50MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="w-5 h-5 mr-2" />
                選擇檔案
              </Button>
            </div>
          </Card>
        )}

        {/* PDF 預覽區 */}
        {pdfFile && pdfUrl && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">PDF 預覽</h3>
                <p className="text-sm text-gray-600">
                  共 {numPages} 頁 · 點擊任一頁面開始編輯
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                >
                  縮小
                </Button>
                <span className="text-sm text-gray-600 min-w-[60px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScale(Math.min(2.0, scale + 0.1))}
                >
                  放大
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 使用說明 */}
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">📖 使用說明</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>點擊任一頁面開啟圖片編輯對話框</li>
                <li>使用塗白、裁切、旋轉工具編輯圖片</li>
                <li>點擊「確認使用」自動複製到剪貼簿</li>
                <li>在題目編輯器中按 Ctrl+V 直接貼上</li>
              </ol>
            </div>

            {/* PDF 頁面網格 */}
            <div className="grid grid-cols-4 gap-4 max-h-[calc(100vh-300px)] overflow-y-auto">
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                }
              >
                {Array.from({ length: numPages }, (_, index) => index + 1).map((pageNum) => (
                  <div
                    key={pageNum}
                    className="relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all hover:border-blue-500 hover:shadow-lg"
                    onClick={() => handlePageClick(pageNum)}
                  >
                    <Page
                      pageNumber={pageNum}
                      scale={scale * 0.3}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                    <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                      第 {pageNum} 頁
                    </div>
                    <div className="absolute inset-0 bg-blue-500/0 hover:bg-blue-500/10 transition-colors flex items-center justify-center">
                      <div className="opacity-0 hover:opacity-100 transition-opacity bg-blue-600 text-white px-4 py-2 rounded-lg font-medium">
                        點擊編輯
                      </div>
                    </div>
                  </div>
                ))}
              </Document>
            </div>
          </Card>
        )}

        {/* 圖片編輯對話框 */}
        {selectedPage !== null && pdfUrl && (
          <ImageEditDialog
            open={selectedPage !== null}
            onOpenChange={(open) => {
              if (!open) setSelectedPage(null);
            }}
            imageUrl={`${pdfUrl}#page=${selectedPage}`}
            pageNumber={selectedPage}
          />
        )}
      </div>
    </div>
  );
}
