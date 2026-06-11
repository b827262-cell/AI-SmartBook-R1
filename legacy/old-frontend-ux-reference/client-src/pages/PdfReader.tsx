import { useParams } from "wouter";
import { useSearch } from "wouter/use-browser-location";
import PdfViewer from "@/components/PdfViewer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function PdfReader() {
  const params = useParams();
  const search = useSearch();
  const [, setLocation] = useLocation();
  
  const pdfId = parseInt(params.id || "0");
  const urlParams = new URLSearchParams(search);
  const initialPage = parseInt(urlParams.get("page") || "1");

  // 查詢 PDF 信息
  const { data: pdf, isLoading, error } = trpc.knowledgeBase.getById.useQuery(
    { id: pdfId },
    { enabled: !!pdfId && !isNaN(pdfId) }
  );

  if (!pdfId || isNaN(pdfId)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-muted-foreground">無效的 PDF ID</p>
          <Button className="mt-4" onClick={() => setLocation("/knowledge-base")}>
            返回知識庫
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">載入中...</span>
        </div>
      </div>
    );
  }

  if (error || !pdf) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-muted-foreground">找不到 PDF</p>
          <Button className="mt-4" onClick={() => setLocation("/knowledge-base")}>
            返回知識庫
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* 返回按鈕 */}
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>

        {/* PDF 標題 */}
        <h1 className="text-2xl font-bold mb-4">{pdf.title}</h1>

        {/* PDF 閱讀器 */}
        <PdfViewer url={pdf.fileUrl} />
      </div>
    </div>
  );
}
