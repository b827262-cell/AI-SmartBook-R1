import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Upload, Trash2, FileText, Search, Settings, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { QuestionPreviewDialog } from "@/components/QuestionPreviewDialog";
import { ExtractConfigDialog } from "@/components/ExtractConfigDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CloudKnowledgeBaseConfig } from "@/components/CloudKnowledgeBaseConfig";
import { VectorIndexManagement } from "@/components/VectorIndexManagement";

export function KnowledgeBase() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("pdf-management");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string>("");
  const [uploadPdfType, setUploadPdfType] = useState<string>("book"); // 預設為知識庫
  const [uploadHasQuestions, setUploadHasQuestions] = useState<boolean>(false); // 是否包含考題
  const [uploadSource, setUploadSource] = useState<string>("manual_upload_knowledge"); // 來源
  const [uploadSourceCategory, setUploadSourceCategory] = useState<string>(""); // 來源分類
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: { status: 'pending' | 'uploading' | 'success' | 'error', progress?: number, message?: string } }>({});
  const [keepOriginalPdf, setKeepOriginalPdf] = useState<boolean>(true); // 預設保留原始 PDF
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [selectedPdfIds, setSelectedPdfIds] = useState<Set<number>>(new Set());
  const [isBatchExtracting, setIsBatchExtracting] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    currentPdfName?: string;
    status: 'idle' | 'processing' | 'completed' | 'failed';
  }>({ current: 0, total: 0, status: 'idle' });
  const [extractingPdfIds, setExtractingPdfIds] = useState<Set<number>>(new Set()); // 追蹤正在拆解的 PDF ID
  const [isPageRangeDialogOpen, setIsPageRangeDialogOpen] = useState(false);
  const [selectedPdfForExtract, setSelectedPdfForExtract] = useState<any>(null);
  const [extractPageRange, setExtractPageRange] = useState<{ mode: 'all' | 'range', startPage: number, endPage: number }>({ mode: 'all', startPage: 1, endPage: 1 });
  
  // 批次操作歷史記錄
  interface BatchOperationHistory {
    id: string;
    type: 'extract' | 'delete';
    timestamp: Date;
    totalCount: number;
    successCount: number;
    failureCount: number;
    successList: string[];
    failureList: { name: string; error: string }[];
  }
  const [operationHistory, setOperationHistory] = useState<BatchOperationHistory[]>([]);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isExtractConfigDialogOpen, setIsExtractConfigDialogOpen] = useState(false);
  const [isAutoExtracting, setIsAutoExtracting] = useState(false); // 標記是否為自動拆解
  const [testSearchKeyword, setTestSearchKeyword] = useState(""); // 測試搜尋關鍵字
  const [testSearchResults, setTestSearchResults] = useState<any[]>([]); // 測試搜尋結果

  // 獲取 PDF 列表（只顯示知識庫類型）
  const { data: pdfs, isLoading, refetch } = trpc.knowledgeBase.list.useQuery({
    type: "knowledge",
    category: selectedCategory,
  }, {
    enabled: !isSearchMode,
  });

  // 搜索 PDF
  const { data: searchResults, isLoading: isSearching } = trpc.knowledgeBase.search.useQuery({
    keyword: searchKeyword,
  }, {
    enabled: isSearchMode && searchKeyword.length > 0,
  });

  // 獲取啟用的類科列表
  const { data: categories } = trpc.knowledgeBase.getActiveCategories.useQuery();

  // 分類載入後，自動選第一個分類（如果目前未選擇）
  useEffect(() => {
    if (categories && categories.length > 0 && !uploadCategory) {
      setUploadCategory(categories[0].name);
    }
  }, [categories]);

  // 上傳 PDF mutation
  const uploadPdfMutation = trpc.knowledgeBase.uploadPdf.useMutation({
    onSuccess: (data) => {
      const isKnowledge = uploadPdfType === 'book' || uploadPdfType === 'handout';
      if (isKnowledge) {
        toast.success("上傳成功！正在自動建立知識庫索引，請稍候...", { duration: 4000 });
      } else {
        toast.success("上傳成功！正在自動提取分頁...");
      }
      refetch();
      
      // 上傳成功後自動觸發提取分頁
      if (data && data.id) {
        batchExtractAllMutation.mutate({ pdfIds: [data.id] });
      }
    },
    onError: (error) => {
      toast.error(`上傳失敗：${error.message}`);
    },
  });

  // 刪除 PDF mutation
  const deletePdfMutation = trpc.knowledgeBase.delete.useMutation({
    onSuccess: () => {
      toast.success("刪除成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  // 拆解考題 mutation
  const extractQuestionsMutation = trpc.knowledgeBase.extractQuestions.useMutation({
    onSuccess: (data) => {
      console.log('[extractQuestions] API 返回数据：', data);
      console.log('[extractQuestions] pdfInfo:', data.pdfInfo);
      console.log('[extractQuestions] previewQuestions 数量:', data.previewQuestions?.length);
      console.log('[extractQuestions] validationSummary:', data.validationSummary);
      
      // 如果是自動拆解，直接保存，不顯示預覽
      if (isAutoExtracting) {
        setIsAutoExtracting(false);
        // 自動保存拆解的考題
        if (data.previewQuestions && data.previewQuestions.length > 0) {
          saveExtractedQuestionsMutation.mutate({
            pdfId: data.pdfInfo.id,
            questions: data.previewQuestions,
          });
        } else {
          toast.info("拆解完成，但未識別到考題");
          refetch();
        }
      } else {
        // 手動拆解，顯示預覽對話框
        setPreviewData(data);
        setIsPreviewDialogOpen(true);
        toast.success(data.message);
      }
    },
    onError: (error) => {
      console.error('[extractQuestions] 错误：', error);
      setIsAutoExtracting(false);
      toast.error(`拆解失敗：${error.message}`);
    },
  });

  // 建立向量索引 mutation
  const buildKnowledgeIndexMutation = trpc.knowledgeBase.buildKnowledgeIndex.useMutation({
    onSuccess: (data) => {
      if (data.errorCount > 0) {
        toast.warning(`向量索引建立完成！成功: ${data.successCount}，失敗: ${data.errorCount}`);
        data.errors.forEach(e => console.warn('[buildKnowledgeIndex]', e));
      } else {
        toast.success(`✅ 索引建立完成！共 ${data.successCount} 筆資料已建立向量索引，可以開始學習了！`, { duration: 5000 });
      }
      refetch();
    },
    onError: (error) => {
      toast.error(`建立向量索引失敗：${error.message}`);
    },
  });

  // 批次刪除 mutation
  const batchDeleteMutation = trpc.knowledgeBase.batchDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`成功刪除 ${data.count} 個 PDF`);
      setSelectedPdfIds(new Set());
      refetch();
    },
    onError: (error) => {
      toast.error(`批次刪除失敗：${error.message}`);
    },
  });

  // 批次重新解析 mutation
  const batchReparseMutation = trpc.knowledgeBase.batchReparse.useMutation({
    onSuccess: (data) => {
      toast.success(`批次解析完成：成功 ${data.successCount} 個，失敗 ${data.failCount} 個`);
      // 顯示詳細結果
      data.results.forEach((result) => {
        if (result.success) {
          const methodText = result.method === 'llm' ? 'LLM' : result.method === 'pdfjs' ? 'pdfjs' : result.method === 'ocr' ? 'OCR' : result.method === 'hybrid' ? '混合' : '未知';
          console.log(`PDF ${result.id}: 成功 (${result.pageCount} 頁, ${methodText})`);
          if (result.warnings && result.warnings.length > 0) {
            console.warn(`PDF ${result.id} 警告:`, result.warnings);
          }
        } else {
          console.error(`PDF ${result.id}: 失敗 - ${result.error}`);
        }
      });
      setSelectedPdfIds(new Set());
      refetch();
    },
    onError: (error) => {
      toast.error(`批次重新解析失敗：${error.message}`);
    },
  });

  // 解析 PDF 內容 mutation
  const parsePdfContentMutation = trpc.knowledgeBase.parsePdfContent.useMutation({
    onSuccess: (data) => {
      const methodText = data.method === 'llm' ? 'LLM Vision' : data.method === 'pdfjs' ? 'pdfjs-dist' : data.method === 'ocr' ? 'OCR' : data.method === 'hybrid' ? '混合方法' : '未知';
      toast.success(`解析成功，共 ${data.pageCount} 頁（使用 ${methodText}）`);
      if (data.warnings && data.warnings.length > 0) {
        toast.warning(`警告：${data.warnings.join(', ')}`);
      }
      refetch();
    },
    onError: (error) => {
      toast.error(`解析失敗：${error.message}`);
      refetch();
    },
  });

  // 批次提取分頁 mutation
  const batchExtractAllMutation = trpc.knowledgeBase.batchExtractPdfPages.useMutation({
    onSuccess: (data) => {
      if (data.errorCount > 0) {
        toast.warning(
          `批次提取完成！\n成功: ${data.successCount}, 跳過: ${data.skippedCount}, 失敗: ${data.errorCount}`,
          { duration: 5000 }
        );
        if (data.errors.length > 0) {
          console.error("批次提取錯誤:", data.errors);
        }
      } else {
        toast.success(data.message);
      }
      refetch();
    },
    onError: (error) => {
      toast.error(`批次提取失敗：${error.message}`);
    },
  });

  // 處理批量檔案上傳
  const handleBatchUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const subject = formData.get("subject") as string;
    const description = formData.get("description") as string;
    const tagsInput = formData.get("tags") as string;
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];

    if (!uploadCategory) {
      toast.error("請選擇分類");
      return;
    }

    if (selectedFiles.length === 0) {
      toast.error("請選擇檔案");
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // 逐個上傳檔案
    for (const file of selectedFiles) {
      // 跳過已成功上傳的檔案
      if (uploadProgress[file.name]?.status === 'success') {
        successCount++;
        continue;
      }

      try {
        // 檢查檔案大小（限制 300MB）
        if (file.size > 300 * 1024 * 1024) {
          throw new Error('檔案大小超過 300MB 限制');
        }

        // 檢查檔案類型
        const isWordFile = file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx');
        if (!file.name.toLowerCase().endsWith('.pdf') && !isWordFile) {
          throw new Error('只支援 PDF 或 Word 格式（.pdf / .doc / .docx）');
        }

        // 更新狀態為上傳中（階段 1：讀取檔案）
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { status: 'uploading', progress: 10, message: '讀取檔案...' }
        }));

        // 讀取檔案為 Base64
        const arrayBuffer = await file.arrayBuffer();
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { status: 'uploading', progress: 30, message: isWordFile ? 'Word 準備轉換...' : '準備上傳...' }
        }));

        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const fileBuffer = btoa(binary);
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { status: 'uploading', progress: 50, message: isWordFile ? '上傳到雲端（Word 轉 PDF 中）...' : '上傳到雲端...' }
        }));

        // 階段 3：後端處理（S3 上傳 + PDF 解析）
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { status: 'uploading', progress: 70, message: isWordFile ? 'Word 轉 PDF 並解析中...' : '後端解析中...' }
        }));
        console.log('[Frontend] Calling uploadPdfMutation.mutateAsync...');
        // Word 檔案的標題移除 .doc/.docx 副檔名
        const fileTitle = file.name.replace(/\.(pdf|docx?|doc)$/i, '');
        const result = await uploadPdfMutation.mutateAsync({
          title: fileTitle,
          pdfType: uploadPdfType as "exam" | "book" | "handout", // PDF 類型
          hasQuestions: uploadHasQuestions, // 是否包含考題
          source: uploadSource as "manual_upload_exam" | "exam_gov_crawler" | "school_crawler" | "manual_upload_knowledge" | "mocat_knowledge" | "mocat_judgment" | "higher_edu" | "ebook" | "lecture_notes", // 來源
          sourceCategory: uploadSourceCategory || undefined, // 來源分類
          category: uploadCategory,
          subject: subject || undefined,
          description: description || undefined,
          tags: tags.length > 0 ? JSON.stringify(tags) : undefined, // 標籤
          fileName: file.name,
          fileUrl: "", // 後端會生成
          fileKey: `knowledge-base/${Date.now()}-${file.name}`,
          fileSize: file.size,
          fileBuffer,
          keepOriginalPdf, // 傳遞保留原始 PDF 選項
        });
        console.log('[Frontend] uploadPdfMutation.mutateAsync completed:', result);
        
        // 更新狀態為成功（100%）
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { status: 'success', progress: 100, message: '上傳完成！' }
        }));
        successCount++;
      } catch (error) {
        console.error(`[KnowledgeBase] Upload error for ${file.name}:`, error);
        console.error(`[KnowledgeBase] Error details:`, JSON.stringify(error, null, 2));
        
        // 提取詳細的錯誤訊息
        let errorMessage = '未知錯誤';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null && 'message' in error) {
          errorMessage = String((error as any).message);
        }
        // Word 轉換失敗的友善提示
        const isWordFile = file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx');
        if (isWordFile && (errorMessage.includes('Word') || errorMessage.includes('LibreOffice') || errorMessage.includes('convert'))) {
          errorMessage = 'Word 轉換失敗！建議先在 Word 中另存為 PDF 再上傳';
        }
        
        // 更新狀態為失敗
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { status: 'error', message: errorMessage }
        }));
        errorCount++;
      }
    }

    // 顯示結果
    if (successCount > 0) {
      toast.success(`成功上傳 ${successCount} 個檔案`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} 個檔案上傳失敗`);
    }

    // 上傳完成後，重置檔案選擇和進度，但保持對話框開啟
    setSelectedFiles([]);
    setUploadProgress({});
    refetch();
    
    // 不關閉對話框，讓用戶可以繼續上傳更多檔案
    // setIsUploadDialogOpen(false);
  };

  // 處理刪除
  const handleDelete = (id: number) => {
    if (confirm("確定要刪除這個 PDF 嗎？")) {
      deletePdfMutation.mutate({ id });
    }
  };

  // 測試搜尋 query（預設禁用，手動觸發）
  const testSearchQuery = trpc.questionBank.searchQuestions.useQuery(
    { keyword: testSearchKeyword },
    { enabled: false } // 預設禁用，手動觸發
  );

  // 處理搜尋結果
  useEffect(() => {
    if (testSearchQuery.data) {
      setTestSearchResults(testSearchQuery.data);
      toast.success(`搜尋到 ${testSearchQuery.data.length} 道考題`);
    }
    if (testSearchQuery.error) {
      toast.error(`搜尋失敗：${testSearchQuery.error.message}`);
    }
  }, [testSearchQuery.data, testSearchQuery.error]);

  // 測試搜尋功能：手動觸發
  const handleTestSearch = () => {
    if (!testSearchKeyword.trim()) {
      toast.error("請輸入搜尋關鍵字");
      return;
    }
    // 使用 refetch 手動觸發搜尋
    testSearchQuery.refetch();
  };

  // 保存拆解的題目 mutation
  const saveExtractedQuestionsMutation = trpc.knowledgeBase.saveExtractedQuestions.useMutation({
    onSuccess: (data) => {
      console.log('[saveExtractedQuestions] 保存成功:', data);
      toast.success(`自動拆解完成！已保存 ${data.questionsSaved} 道考題`);
      refetch(); // 重新獲取 PDF 列表
    },
    onError: (error) => {
      console.error('[saveExtractedQuestions] 保存失敗:', error);
      toast.error(`保存考題失敗：${error.message}`);
    },
  });

  // 批次拂解 mutation
  const batchExtractQuestionsMutation = trpc.knowledgeBase.batchExtractQuestions.useMutation({
    onSuccess: async (data) => {
      console.log('[batchExtractQuestions] API 返回数据：', data);
      console.log('[batchExtractQuestions] pdfInfos:', data.pdfInfos);
      console.log('[batchExtractQuestions] previewQuestions 数量:', data.previewQuestions?.length);

      if (data.success && data.previewQuestions && data.previewQuestions.length > 0) {
        // 顯示詳細統計
        const summary = data.validationSummary;
        const statsMessage = `✅ 成功拂解：${summary.valid} 題 | ⚠️ 需審核：${summary.needsReview} 題 | ❌ 不完整：${summary.incomplete} 題`;
        toast.success(`批次拂解完成！\n${statsMessage}`, {
          duration: 5000,
        });
        
        // 如果有失敗的 PDF，顯示額外提示
        if (data.failureCount && data.failureCount > 0) {
          setTimeout(() => {
            toast.error(`${data.failureCount} 個 PDF 處理失敗，請檢查檔案格式或內容`);
          }, 1000);
        }
        
        // 按 PDF 分組題目
        const questionsByPdf = new Map<number, any[]>();
        data.previewQuestions.forEach((q: any) => {
          if (!questionsByPdf.has(q.pdfId)) {
            questionsByPdf.set(q.pdfId, []);
          }
          questionsByPdf.get(q.pdfId)!.push(q);
        });
        
        // 逐個 PDF 保存題目
        toast.info(`正在保存題目到數據庫...`);
        let savedCount = 0;
        let failedCount = 0;
        
        for (const [pdfId, questions] of Array.from(questionsByPdf.entries())) {
          try {
            await saveExtractedQuestionsMutation.mutateAsync({
              pdfId,
              questions: questions.map((q: any) => ({
                number: q.number,
                question: q.question,
                type: q.type,
                score: q.score,
                optionA: q.optionA,
                optionB: q.optionB,
                optionC: q.optionC,
                optionD: q.optionD,
                correctAnswer: q.correctAnswer,
                hasImage: q.hasImage,
                imageDescription: q.imageDescription,
                isGroupQuestion: q.isGroupQuestion,
                groupStem: q.groupStem,
                requiresDrawing: q.requiresDrawing,
                validationStatus: q.validationStatus,
                validationIssues: q.validationIssues,
                validationWarnings: q.validationWarnings,
                category: q.category,
                questionAnalysis: q.questionAnalysis || "",
                keyPoints: q.keyPoints || "",
                explanation: q.explanation || "",
              })),
            });
            savedCount++;
          } catch (error) {
            console.error(`[batchExtractQuestions] 保存 PDF ${pdfId} 的題目失敗:`, error);
            failedCount++;
          }
        }
        
        // 顯示最終結果
        if (failedCount === 0) {
          toast.success(`✅ 成功保存 ${savedCount} 個 PDF 的題目！`);
        } else {
          toast.warning(`部分成功：${savedCount} 個 PDF 保存成功，${failedCount} 個失敗`);
        }
        
        // 刷新列表
        refetch();
      }
      
      setIsBatchExtracting(false);
      setBatchProgress({ current: 0, total: 0, status: 'idle' });
      setExtractingPdfIds(new Set());
      
      // 添加到歷史記錄
      if (data.totalCount && data.totalCount > 0) {
        const successList = data.pdfInfos?.map((info: any) => info.title) || [];
        const failureList = data.failedPdfs?.map((pdf: any) => ({
          name: pdf.name,
          error: pdf.error,
        })) || [];
        
        const historyEntry: BatchOperationHistory = {
          id: Date.now().toString(),
          type: 'extract',
          timestamp: new Date(),
          totalCount: data.totalCount,
          successCount: data.successCount || 0,
          failureCount: data.failureCount || 0,
          successList,
          failureList,
        };
        setOperationHistory(prev => [historyEntry, ...prev]);
      }
    },
    onError: (error) => {
      toast.error(`批次拆解失敗：${error.message}`);
      setIsBatchExtracting(false);
      setBatchProgress({ current: 0, total: 0, status: 'idle' });
      setExtractingPdfIds(new Set()); // 清除正在拆解的 PDF ID
    },
  });

  // 批次拆解
  const handleBatchExtract = async () => {
    if (selectedPdfIds.size === 0) {
      toast.error("請選擇至少一個 PDF");
      return;
    }

    // 顯示配置對話框
    setIsExtractConfigDialogOpen(true);
  };

  // 確認拆解配置後執行
  const handleConfirmExtract = (config: { pageRange?: { start?: number; end?: number }, skipExtracted?: boolean }) => {
    const pdfsToExtract = Array.from(selectedPdfIds);

    setIsBatchExtracting(true);
    setBatchProgress({ current: 0, total: pdfsToExtract.length, status: 'processing' });
    // 添加正在拆解的 PDF ID
    setExtractingPdfIds(new Set(pdfsToExtract));
    
    // 模擬進度更新（實際應該從後端接收進度）
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      if (currentProgress < pdfsToExtract.length && isBatchExtracting) {
        currentProgress++;
        setBatchProgress({ current: currentProgress, total: pdfsToExtract.length, status: 'processing' });
      } else {
        clearInterval(progressInterval);
      }
    }, 10000); // 每 10 秒更新一次進度

    batchExtractQuestionsMutation.mutate({ 
      pdfIds: pdfsToExtract,
      pageRange: config.pageRange,
    });
  };

  // 批次提取所有 PDF 分頁
  const handleBatchExtractAll = () => {
    if (!confirm("將提取所有 PDF 的分頁內容，已提取的將被跳過。\n\n此操作可能需要幾分鐘，確定繼續？")) {
      return;
    }
    batchExtractAllMutation.mutate();
  };

  // 批次刪除
  const handleBatchDelete = async () => {
    if (selectedPdfIds.size === 0) {
      toast.error("請選擇至少一個 PDF");
      return;
    }

    if (!confirm(`確定要刪除選中的 ${selectedPdfIds.size} 個 PDF 嗎？`)) {
      return;
    }

    const pdfsToDelete = Array.from(selectedPdfIds);
    const pdfMap = new Map(displayPdfs?.filter(p => p && p.id).map(p => [p.id, p.title]) || []);
    
    let successCount = 0;
    let errorCount = 0;
    const successList: string[] = [];
    const failureList: { name: string; error: string }[] = [];

    // 設置進度條
    setBatchProgress({ current: 0, total: pdfsToDelete.length, status: 'processing' });

    for (let i = 0; i < pdfsToDelete.length; i++) {
      const pdfId = pdfsToDelete[i];
      const pdfName = pdfMap.get(pdfId) || `PDF ${pdfId}`;
      
      // 更新當前處理的 PDF
      setBatchProgress({ 
        current: i, 
        total: pdfsToDelete.length, 
        currentPdfName: pdfName,
        status: 'processing' 
      });

      try {
        await deletePdfMutation.mutateAsync({ id: pdfId });
        successCount++;
        successList.push(pdfName);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知錯誤';
        console.error(`PDF ${pdfId} 刪除失敗:`, error);
        errorCount++;
        failureList.push({ name: pdfName, error: errorMessage });
      }
    }

    // 完成後重置進度條
    setBatchProgress({ current: 0, total: 0, status: 'idle' });

    // 顯示結果摘要
    if (successCount > 0 && errorCount === 0) {
      toast.success(`成功刪除 ${successCount} 個 PDF`);
    } else if (successCount > 0 && errorCount > 0) {
      toast.info(`成功刪除 ${successCount} 個，${errorCount} 個失敗`);
    } else if (errorCount > 0) {
      toast.error(`所有 PDF 刪除失敗`);
    }

    // 將結果添加到歷史記錄
    const historyEntry: BatchOperationHistory = {
      id: Date.now().toString(),
      type: 'delete',
      timestamp: new Date(),
      totalCount: pdfsToDelete.length,
      successCount,
      failureCount: errorCount,
      successList,
      failureList,
    };
    setOperationHistory(prev => [historyEntry, ...prev]);

    setSelectedPdfIds(new Set());
    refetch();
  };

  // 顯示的 PDF 列表（搜索模式或一般模式）
  const displayPdfs = isSearchMode ? searchResults : pdfs;
  const displayLoading = isSearchMode ? isSearching : isLoading;

  return (
    <>
      
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">知識庫管理</h1>
            <p className="text-muted-foreground mt-2">
              管理 PDF 教材和雲端知識庫上傳
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="pdf-management">PDF 管理</TabsTrigger>
            <TabsTrigger value="cloud-config">雲端設定</TabsTrigger>
            <TabsTrigger value="vector-index">向量索引管理</TabsTrigger>
          </TabsList>

          <TabsContent value="pdf-management" className="space-y-6">
            <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setLocation("/admin/pdf-categories")}>
            <Settings className="mr-2 h-4 w-4" />
            類科管理
          </Button>
          
          {/* 操作歷史按鈕 */}
          <Button 
            variant="outline" 
            onClick={() => setIsHistoryDialogOpen(true)}
            className="relative"
          >
            <FileText className="mr-2 h-4 w-4" />
            操作歷史
            {operationHistory.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                {operationHistory.length}
              </span>
            )}
          </Button>
          
          {/* 批次處理流程按鈕 */}
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-xs text-blue-700 font-medium">批次處理：</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleBatchExtractAll}
              disabled={
                batchExtractAllMutation.isPending || 
                isBatchExtracting || 
                (displayPdfs && displayPdfs.length > 0 && displayPdfs.every(pdf => pdf && (pdf as any).pagesExtracted > 0))
              }
              className="h-8"
              title={
                displayPdfs && displayPdfs.length > 0 && displayPdfs.every(pdf => pdf && (pdf as any).pagesExtracted > 0)
                  ? "✓ 所有 PDF 已提取分頁"
                  : "建立 RAG 知識庫：將 PDF 拆成單獨的頁面，供 AI 檢索引用（適用於電子書、講義等參考資料）"
              }
            >
              <FileText className="mr-1 h-3 w-3" />
              {batchExtractAllMutation.isPending ? "提取中..." : 
               displayPdfs && displayPdfs.length > 0 && displayPdfs.every(pdf => pdf && (pdf as any).pagesExtracted > 0) ? 
               "1. ✓ 已完成" : "1. 提取分頁"}
            </Button>
            <span className="text-blue-400">→</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (!displayPdfs) return;
                const pdfIds = displayPdfs.filter(pdf => pdf && pdf.id).map(pdf => pdf.id);
                if (pdfIds.length === 0) {
                  toast.error("沒有可建立索引的 PDF");
                  return;
                }
                buildKnowledgeIndexMutation.mutate({ pdfIds });
              }}
              disabled={buildKnowledgeIndexMutation.isPending || batchExtractAllMutation.isPending}
              className="h-8"
              title="將 PDF 內容建立向量索引，供 AI 在智能課堂中搜尋引用"
            >
              <FileText className="mr-1 h-3 w-3" />
              {buildKnowledgeIndexMutation.isPending ? "建立中..." : "2. 建立向量索引"}
            </Button>
          </div>
          
          {/* 批次操作進度條 */}
          {batchProgress.status === 'processing' && batchProgress.total > 0 && (
            <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">
                  {batchProgress.currentPdfName ? 
                    `正在處理：${batchProgress.currentPdfName}` : 
                    '正在處理...'}
                </span>
                <span className="text-sm text-blue-700">
                  {batchProgress.current}/{batchProgress.total}
                </span>
              </div>
              <Progress 
                value={(batchProgress.current / batchProgress.total) * 100} 
                className="h-2"
              />
            </div>
          )}
          
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
              <Upload className="mr-2 h-4 w-4" />
              上傳 PDF
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>上傳 PDF 到知識庫</DialogTitle>
                <DialogDescription>
                  支援批量上傳多個 PDF 檔案，系統將自動處理
                </DialogDescription>
            </DialogHeader>
            <form id="upload-form" onSubmit={handleBatchUpload} className="flex flex-col flex-1 overflow-hidden">
              <div className="grid gap-4 py-4 overflow-y-auto flex-1">

                {/* 來源選項 */}
                <div className="grid gap-2">
                  <Label htmlFor="source">來源 *</Label>
                  <Select value={uploadSource} onValueChange={setUploadSource}>
                    <SelectTrigger>
                      <SelectValue placeholder="選擇來源" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual_upload_knowledge">📝 手動上傳</SelectItem>
                      <SelectItem value="mocat_knowledge">📚 月旦知識庫</SelectItem>
                      <SelectItem value="mocat_judgment">⚖️ 月旦裁判庫</SelectItem>
                      <SelectItem value="higher_edu">🎓 高等教育</SelectItem>
                      <SelectItem value="ebook">📚 電子書</SelectItem>
                      <SelectItem value="lecture_notes">📄 電子講義</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 來源分類（可選） */}
                <div className="grid gap-2">
                  <Label htmlFor="sourceCategory">來源分類（可選）</Label>
                  <Input
                    id="sourceCategory"
                    placeholder="例：裁判資料、期刊、法律論文等"
                    value={uploadSourceCategory}
                    onChange={(e) => setUploadSourceCategory(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    可以更細緻地區分來源類型，例如「裁判資料」、「期刊」等
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="pdfType">PDF 類型 *</Label>
                  <Select value={uploadPdfType} onValueChange={setUploadPdfType}>
                    <SelectTrigger>
                      <SelectValue placeholder="選擇 PDF 類型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="book">📚 電子書（教科書、參考書）</SelectItem>
                      <SelectItem value="handout">📄 講義（上課筆記、重點整理）</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <p className="text-xs text-muted-foreground">
                    • 電子書/講義：上傳後可在下方點擊「建立向量索引」，供 AI 在智能課堂中搜尋引用
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">分類 *</Label>
                  <Select value={uploadCategory} onValueChange={setUploadCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="選擇分類" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories && categories.length > 0 ? (
                        categories.filter((cat: any) => cat && cat.id && cat.name).map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.displayName || cat.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="other">其他</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="subject">科目</Label>
                  <Input id="subject" name="subject" placeholder="例如：民法總則" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">描述</Label>
                  <Textarea id="description" name="description" placeholder="簡短描述這份教材..." />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tags">標籤（用於對話框搜尋）</Label>
                  <Input 
                    id="tags" 
                    name="tags" 
                    placeholder="例如：民法,刑法,行政法（以逗號分隔）" 
                  />
                  <p className="text-xs text-muted-foreground">
                    添加標籤後，學生可以在對話框中點擊「補充講義」按鈕，選擇標籤範圍進行搜尋
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="keepOriginalPdf"
                    checked={keepOriginalPdf}
                    onChange={(e) => setKeepOriginalPdf(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="keepOriginalPdf" className="cursor-pointer">
                    保留原始 PDF（可查看原始檔案和比對編輯）
                  </Label>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="file">PDF / Word 檔案 *</Label>
                  <Input 
                    id="file" 
                    name="file" 
                    type="file" 
                    accept=".pdf,.doc,.docx" 
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setSelectedFiles(files);
                      // 初始化上傳進度
                      const progress: any = {};
                      files.forEach(file => {
                        progress[file.name] = { status: 'pending' };
                      });
                      setUploadProgress(progress);
                    }}
                    required 
                  />
                  {selectedFiles.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-muted-foreground">已選擇 {selectedFiles.length} 個檔案</p>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {selectedFiles.map((file, index) => {
                          const progress = uploadProgress[file.name];
                          return (
                            <div key={index} className="p-2 bg-muted rounded space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="truncate flex-1">{file.name}</span>
                                <span className="text-muted-foreground ml-2">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                              </div>
                              
                              {progress && (
                                <div className="space-y-1">
                                  {/* 狀態標籤 */}
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-xs ${
                                      progress.status === 'success' ? 'bg-green-100 text-green-700' :
                                      progress.status === 'error' ? 'bg-red-100 text-red-700' :
                                      progress.status === 'uploading' ? 'bg-blue-100 text-blue-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {progress.status === 'success' ? '✓ 成功' :
                                       progress.status === 'error' ? '✗ 失敗' :
                                       progress.status === 'uploading' ? `上傳中 ${progress.progress || 0}%` :
                                       '等待中'}
                                    </span>
                                    
                                    {/* 重試按鈕 */}
                                    {progress.status === 'error' && (
                                      <button
                                        onClick={async () => {
                                          // 重置狀態並重新上傳
                                          setUploadProgress(prev => ({
                                            ...prev,
                                            [file.name]: { status: 'pending' }
                                          }));
                                          // 觸發重新上傳
                                          const form = document.getElementById('upload-form') as HTMLFormElement;
                                          if (form) {
                                            await handleBatchUpload({ preventDefault: () => {}, currentTarget: form } as any);
                                          }
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                                      >
                                        重試
                                      </button>
                                    )}
                                  </div>
                                  
                                  {/* 進度條 */}
                                  {progress.status === 'uploading' && progress.progress !== undefined && (
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-xs text-gray-500">
                                        <span>{(progress as any).message || '上傳中...'}</span>
                                        <span>{progress.progress}%</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div 
                                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                                          style={{ width: `${progress.progress}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* 錯誤訊息 */}
                                  {progress.status === 'error' && progress.message && (
                                    <p className="text-xs text-red-600">{progress.message}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={uploadPdfMutation.isPending}>
                  {uploadPdfMutation.isPending ? "上傳中..." : "上傳"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 搜尋和篩選 */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋 PDF 內容..."
            value={searchKeyword}
            onChange={(e) => {
              const value = e.target.value;
              setSearchKeyword(value);
              setIsSearchMode(value.length > 0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchKeyword.length > 0) {
                setIsSearchMode(true);
              }
            }}
            className="pl-10"
          />
          {searchKeyword && (
            <button
              onClick={() => {
                setSearchKeyword("");
                setIsSearchMode(false);
              }}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          )}
        </div>
        <Select value={selectedCategory ?? "all"} onValueChange={(value) => setSelectedCategory(value === "all" ? undefined : value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="所有分類" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有分類</SelectItem>
            {categories && categories.length > 0 ? (
              categories.filter((cat: any) => cat && cat.id && cat.name).map((cat: any) => (
                <SelectItem key={cat.id} value={cat.name}>
                  {cat.displayName || cat.name}
                </SelectItem>
              ))
            ) : null}
          </SelectContent>
        </Select>
      </div>

      {/* 批次刪除按鈕（保留此功能） */}
      {selectedPdfIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-sm font-medium text-red-900">已選擇 {selectedPdfIds.size} 個 PDF</span>
          <div className="flex-1" />
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              const pdfIds = Array.from(selectedPdfIds);
              if (pdfIds.length === 0) return;
              buildKnowledgeIndexMutation.mutate({ pdfIds });
            }}
            disabled={buildKnowledgeIndexMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {buildKnowledgeIndexMutation.isPending ? "建立中..." : "批次建立向量索引"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBatchDelete}
            disabled={deletePdfMutation.isPending}
            className="text-red-600 hover:text-red-700 hover:bg-red-100"
          >
            批次刪除
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedPdfIds(new Set())}
          >
            取消選擇
          </Button>
        </div>
      )}



      {/* PDF 列表 */}
      {displayLoading ? (
        <div className="text-center py-12">載入中...</div>
      ) : displayPdfs && displayPdfs.length > 0 ? (
        <div className="space-y-2">
          {/* 表頭 */}
          <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-lg text-sm font-medium text-muted-foreground">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={displayPdfs.every(p => p && p.id && selectedPdfIds.has(p.id)) && displayPdfs.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedPdfIds(new Set(displayPdfs.filter(p => p && p.id).map(p => p.id)));
                  } else {
                    setSelectedPdfIds(new Set());
                  }
                }}
                title="全選/取消全選"
              />
            </div>
            <div className="flex-1 min-w-0">標題</div>
            <div className="w-24">類科</div>
            <div className="w-16 text-center">頁數</div>
            <div className="w-20 text-center">檔案大小</div>
            <div className="w-32 text-center">解析狀態</div>
            <div className="w-32 text-center">向量索引</div>
            <div className="w-48 text-center">操作</div>
          </div>

          {/* 列表項目 */}
          {displayPdfs.filter(pdf => pdf && pdf.id).map((pdf) => (
            <div key={pdf.id} className="flex items-center gap-3 px-4 py-3 bg-card rounded-lg border hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={selectedPdfIds.has(pdf.id)}
                  onChange={(e) => {
                    const newSelected = new Set(selectedPdfIds);
                    if (e.target.checked) {
                      newSelected.add(pdf.id);
                    } else {
                      newSelected.delete(pdf.id);
                    }
                    setSelectedPdfIds(newSelected);
                  }}
                  title="選擇此 PDF"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-medium truncate">{pdf.title}</div>
                  {/* PDF 類型標籤 */}
                  {(pdf as any).pdfType === 'exam' ? (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full whitespace-nowrap">
                      📝 考題
                    </span>
                  ) : (pdf as any).pdfType === 'book' ? (
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full whitespace-nowrap">
                      📚 電子書
                    </span>
                  ) : (pdf as any).pdfType === 'handout' ? (
                    <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full whitespace-nowrap">
                      📄 講義
                    </span>
                  ) : null}
                  {/* 包含考題標記 */}
                  {(pdf as any).pdfType !== 'exam' && (pdf as any).hasQuestions === 1 && (
                    <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full whitespace-nowrap">
                      +題目
                    </span>
                  )}
                </div>
                {pdf.subject && <div className="text-xs text-muted-foreground truncate">{pdf.subject}</div>}
              </div>
            <div className="w-24 text-sm truncate">{pdf.category}</div>
            <div className="w-16 text-sm text-center">{pdf.pageCount || "-"}</div>
            <div className="w-20 text-sm text-center">
              {pdf.fileSize ? `${(pdf.fileSize / 1024 / 1024).toFixed(1)}MB` : "-"}
            </div>
            <div className="w-32 text-center">
              {pdf.status === "pending" ? (
                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">未解析</span>
              ) : pdf.status === "processing" ? (
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">解析中...</span>
              ) : pdf.status === "completed" ? (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">已解析</span>
              ) : (
                <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">解析失敗</span>
              )}
            </div>
            <div className="w-32 text-center">
                {(pdf as any).hasVectorIndex ? (
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                    ✓ 已建立
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded">未建立</span>
                )}
              </div>
            <div className="w-48 flex items-center justify-center gap-1">
              {pdf.status === "pending" || pdf.status === "failed" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toast.info(`正在解析「${pdf.title}」...`);
                    parsePdfContentMutation.mutate({ id: pdf.id });
                  }}
                  disabled={parsePdfContentMutation.isPending}
                  title="解析 PDF 內容"
                >
                  {parsePdfContentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 mr-1" />
                  )}
                  {parsePdfContentMutation.isPending ? "解析中..." : "解析"}
                </Button>
              ) : null}
              {/* 建立向量索引按鈕（已提取分頁且尚未建立索引時顯示） */}
              {pdf.status === "completed" && !(pdf as any).hasVectorIndex && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    buildKnowledgeIndexMutation.mutate({ pdfIds: [pdf.id] });
                  }}
                  disabled={buildKnowledgeIndexMutation.isPending}
                  title="將此 PDF 內容建立向量索引，供 AI 在智能課堂中搜尋引用"
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  {buildKnowledgeIndexMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Settings className="w-4 h-4 mr-1" />
                  )}
                  {buildKnowledgeIndexMutation.isPending ? "建立中..." : "建立索引"}
                </Button>
              )}
              {/* 查看內容按鈕 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // 記錄返回路徑，以便題目編輯頁面知道要返回哪裡
                  sessionStorage.setItem('questionEditorReturnPath', '/admin/knowledge-base');
                  setLocation(`/admin/question-editor/${pdf.id}`);
                }}
                disabled={pdf.status === "pending" || extractingPdfIds.has(pdf.id)}
                title={
                  extractingPdfIds.has(pdf.id) ? "拆解中，請稍後" :
                  pdf.status === "pending" ? "請先解析 PDF" : "查看內容"
                }
              >
                <FileText className="w-4 h-4" />
              </Button>
              {/* 刪除按鈕 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(pdf.id)}
                disabled={deletePdfMutation.isPending || extractingPdfIds.has(pdf.id)}
                title={
                  extractingPdfIds.has(pdf.id) ? "拆解中，請稍後" :
                  deletePdfMutation.isPending ? "刪除中..." : "刪除"
                }
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">尚無 PDF 資料</p>
            <p className="text-sm text-muted-foreground mt-2">
              點擊上方「上傳 PDF」按鈕開始添加教材
            </p>
          </CardContent>
        </Card>
      )}

      {/* 題目預覽對話框 */}
      {previewData && previewData.pdfInfo && previewData.previewQuestions && previewData.previewQuestions.length > 0 && (
        <QuestionPreviewDialog
          open={isPreviewDialogOpen}
          onOpenChange={setIsPreviewDialogOpen}
          previewQuestions={previewData.previewQuestions}
          validationSummary={previewData.validationSummary}
          pdfId={previewData.pdfInfo.id}
          pdfTitle={previewData.pdfInfo.title}
          onSaveSuccess={() => {
            refetch();
            setPreviewData(null);
          }}
        />
      )}

      {/* 拆解配置對話框 */}
      <ExtractConfigDialog
        open={isExtractConfigDialogOpen}
        onOpenChange={setIsExtractConfigDialogOpen}
        onConfirm={handleConfirmExtract}
      />

      {/* 操作歷史對話框 */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>批次操作歷史</DialogTitle>
            <DialogDescription>
              查看批次拆解和批次刪除的歷史記錄
            </DialogDescription>
          </DialogHeader>
          
          {operationHistory.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              尚無操作歷史記錄
            </div>
          ) : (
            <div className="space-y-4">
              {operationHistory.map((history) => (
                <Card key={history.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">
                          {history.type === 'delete' ? '批次刪除' : '批次拆解'}
                        </CardTitle>
                        <span className="text-sm text-muted-foreground">
                          {history.timestamp.toLocaleString('zh-TW', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-600">
                          成功: {history.successCount}
                        </span>
                        {history.failureCount > 0 && (
                          <span className="text-red-600">
                            失敗: {history.failureCount}
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          總計: {history.totalCount}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* 成功列表 */}
                    {history.successList.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-green-600 mb-2">
                          成功 ({history.successList.length})
                        </h4>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {history.successList.slice(0, 5).map((name, idx) => (
                            <div key={idx}>• {name}</div>
                          ))}
                          {history.successList.length > 5 && (
                            <div className="text-xs text-muted-foreground">
                              ... 及其他 {history.successList.length - 5} 個
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* 失敗列表 */}
                    {history.failureList.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-red-600 mb-2">
                          失敗 ({history.failureList.length})
                        </h4>
                        <div className="text-sm space-y-2">
                          {history.failureList.map((item, idx) => (
                            <div key={idx} className="p-2 bg-red-50 rounded">
                              <div className="font-medium text-red-900">{item.name}</div>
                              <div className="text-xs text-red-600 mt-1">{item.error}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 頁面範圍選擇對話框 */}
      <Dialog open={isPageRangeDialogOpen} onOpenChange={setIsPageRangeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>選擇拆解範圍</DialogTitle>
            <DialogDescription>
              請選擇要拆解的頁面範圍，或拆解所有頁面
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedPdfForExtract && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-900">{selectedPdfForExtract.title}</p>
                <p className="text-xs text-blue-700 mt-1">總頁數：{(selectedPdfForExtract as any).pageCount || '未知'} 頁</p>
              </div>
            )}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="mode-all"
                  checked={extractPageRange.mode === 'all'}
                  onChange={() => setExtractPageRange(prev => ({ ...prev, mode: 'all' }))}
                  className="w-4 h-4"
                />
                <Label htmlFor="mode-all" className="cursor-pointer">
                  拆解所有頁面
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="mode-range"
                  checked={extractPageRange.mode === 'range'}
                  onChange={() => setExtractPageRange(prev => ({ ...prev, mode: 'range' }))}
                  className="w-4 h-4"
                />
                <Label htmlFor="mode-range" className="cursor-pointer">
                  指定頁面範圍
                </Label>
              </div>
              {extractPageRange.mode === 'range' && (
                <div className="ml-6 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label htmlFor="startPage" className="text-xs">起始頁</Label>
                      <Input
                        id="startPage"
                        type="number"
                        min={1}
                        max={(selectedPdfForExtract as any)?.pageCount || 1}
                        value={extractPageRange.startPage}
                        onChange={(e) => setExtractPageRange(prev => ({ ...prev, startPage: parseInt(e.target.value) || 1 }))}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="endPage" className="text-xs">結束頁</Label>
                      <Input
                        id="endPage"
                        type="number"
                        min={extractPageRange.startPage}
                        max={(selectedPdfForExtract as any)?.pageCount || 1}
                        value={extractPageRange.endPage}
                        onChange={(e) => setExtractPageRange(prev => ({ ...prev, endPage: parseInt(e.target.value) || 1 }))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    將拆解第 {extractPageRange.startPage} 頁到第 {extractPageRange.endPage} 頁（共 {extractPageRange.endPage - extractPageRange.startPage + 1} 頁）
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPageRangeDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                if (!selectedPdfForExtract) return;
                
                // 驗證頁面範圍
                if (extractPageRange.mode === 'range') {
                  if (extractPageRange.startPage > extractPageRange.endPage) {
                    toast.error('起始頁不能大於結束頁');
                    return;
                  }
                  if (extractPageRange.startPage < 1 || extractPageRange.endPage > ((selectedPdfForExtract as any).pageCount || 1)) {
                    toast.error('頁面範圍超出 PDF 總頁數');
                    return;
                  }
                }
                
                const extractParams: any = { pdfId: selectedPdfForExtract.id };
                if (extractPageRange.mode === 'range') {
                  extractParams.pageRange = {
                    start: extractPageRange.startPage,
                    end: extractPageRange.endPage,
                  };
                  toast.info(`正在拆解「${selectedPdfForExtract.title}」的第 ${extractPageRange.startPage}-${extractPageRange.endPage} 頁，請稍候...`);
                } else {
                  toast.info(`正在拆解「${selectedPdfForExtract.title}」的所有頁面，請稍候...`);
                }
                
                extractQuestionsMutation.mutate(extractParams);
                setIsPageRangeDialogOpen(false);
              }}
              disabled={extractQuestionsMutation.isPending}
            >
              {extractQuestionsMutation.isPending ? '拆解中...' : '開始拆解'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          </TabsContent>

          <TabsContent value="cloud-config">
            <CloudKnowledgeBaseConfig />
          </TabsContent>

          <TabsContent value="vector-index">
            <VectorIndexManagement />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
