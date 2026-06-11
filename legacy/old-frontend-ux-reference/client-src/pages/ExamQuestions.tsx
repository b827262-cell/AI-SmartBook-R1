import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Upload, Search, Trash2, FileText, Loader2, CheckCircle2, XCircle, Cloud, FolderOpen, Coins, Database, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import { QuestionPreviewDialog } from "@/components/QuestionPreviewDialog";
import { ExtractConfigDialog } from "@/components/ExtractConfigDialog";

export default function ExamQuestions() {
  const { user } = useAuth();
  const trpcUtils = trpc.useUtils();
  
  // 調試：檢查用戶資訊
  useEffect(() => {
    console.log('Current user:', user);
    console.log('User role:', user?.role);
  }, [user]);
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReviewStatus, setSelectedReviewStatus] = useState<string>("all");
  const [selectedExtractStatus, setSelectedExtractStatus] = useState<string>("all");
  const [selectedAccessType, setSelectedAccessType] = useState<string>("all");
  const [selectedSourceOrigin, setSelectedSourceOrigin] = useState<string>("all"); // 來源篩選
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedPdfIds, setSelectedPdfIds] = useState<Set<number>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: { status: 'pending' | 'uploading' | 'success' | 'error', progress?: number, message?: string } }>({});
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadSource, setUploadSource] = useState("manual_upload_exam");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isExtractConfigDialogOpen, setIsExtractConfigDialogOpen] = useState(false);
  const [extractingPdfIds, setExtractingPdfIds] = useState<Set<number>>(new Set());
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPdf, setEditingPdf] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editSource, setEditSource] = useState("");
  const [editSourceCategory, setEditSourceCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [autoExtractInfo, setAutoExtractInfo] = useState(true); // 預設啟用自動提取
  const [uploadMode, setUploadMode] = useState<'single' | 'pair'>('single'); // 上傳模式（單一/配對）
  const [pdfType, setPdfType] = useState<'exam' | 'answer'>('exam'); // PDF 類型（試卷/答案）
  const [relatedExamPdfId, setRelatedExamPdfId] = useState<number | null>(null); // 關聯的試卷 ID
  const [examPdfList, setExamPdfList] = useState<Array<{ id: number; title: string }>>([]); // 試卷列表
  const [examPdfFile, setExamPdfFile] = useState<File | null>(null); // 試卷 PDF 檔案（配對模式）
  const [answerPdfFile, setAnswerPdfFile] = useState<File | null>(null); // 答案 PDF 檔案（配對模式）

  // Google Drive 相關狀態
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [isGoogleDriveDialogOpen, setIsGoogleDriveDialogOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [selectedFolderName, setSelectedFolderName] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<any[]>([]);
  const [isAccessTypeDialogOpen, setIsAccessTypeDialogOpen] = useState(false);
  const [accessType, setAccessType] = useState<"free" | "paid" | "class_only">("free");
  const [requiredCredits, setRequiredCredits] = useState(1);
  const [isEditAccessDialogOpen, setIsEditAccessDialogOpen] = useState(false);
  const [editingAccessPdf, setEditingAccessPdf] = useState<any>(null);
  const [editAccessType, setEditAccessType] = useState<"free" | "paid" | "class_only">("free");
  const [editPointsRequired, setEditPointsRequired] = useState(1);

  // 從智能題庫匯入相關狀態
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedImportIds, setSelectedImportIds] = useState<Set<number>>(new Set());
  const [importSearchQuery, setImportSearchQuery] = useState("");
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [showBatchExtractConfirm, setShowBatchExtractConfirm] = useState(false);
  const [importedPdfIds, setImportedPdfIds] = useState<number[]>([]);
  const [importJobId, setImportJobId] = useState<string | null>(null);
  // 拖曳相關
  const [dialogPos, setDialogPos] = useState<{ x: number; y: number } | null>(null);
  const dragState = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

  // 批次拆解 jobId（非同步背景任務）
  const [batchExtractJobId, setBatchExtractJobId] = useState<string | null>(null);
  // 循序批次拆解進度
  const [seqBatchProgress, setSeqBatchProgress] = useState<{ current: number; total: number; currentTitle: string; isRunning: boolean } | null>(null);

  // 申論題警告對話框
  const [isEssayWarningOpen, setIsEssayWarningOpen] = useState(false);
  // 匯入對話框：是否顯示申論題項目
  const [showEssayItems, setShowEssayItems] = useState(false);
  // 申論題匯入進度
  const [essayImportProgress, setEssayImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [essayWarningMessage, setEssayWarningMessage] = useState("");
  const [pendingExtractPdfId, setPendingExtractPdfId] = useState<number | null>(null);

  // 獲取啟用的類科列表
  const { data: categories } = trpc.knowledgeBase.getActiveCategories.useQuery();

  // 批次拆解進度輯詢（每 3 科輯詢一次）
  const { data: batchExtractProgress } = trpc.knowledgeBase.getBatchExtractProgress.useQuery(
    { jobId: batchExtractJobId! },
    {
      enabled: !!batchExtractJobId,
      refetchInterval: (data) => {
        // 如果完成則停止輯詢
        if (data?.state?.data?.done) return false;
        return 3000; // 每 3 科輯詢一次
      },
    }
  );

  // 監聴批次拆解進度
  useEffect(() => {
    if (!batchExtractProgress) return;
    if (batchExtractProgress.done) {
      // 完成！顯示結果
      toast.dismiss('batch-extract-progress');
      toast.success(`✅ ${batchExtractProgress.message}`, { duration: 5000 });
      if (batchExtractProgress.results && batchExtractProgress.results.length > 0) {
        const successResults = batchExtractProgress.results.filter((r: any) => r.success);
        const failureResults = batchExtractProgress.results.filter((r: any) => !r.success);
        if (successResults.length > 0) {
          const successMessage = successResults.map((r: any) => `✅ ${r.pdfTitle}: ${r.questionsCount} 道題目`).join('\n');
          setTimeout(() => toast.info(`成功詳情：\n${successMessage}`, { duration: 8000 }), 1000);
        }
        if (failureResults.length > 0) {
          const failureMessage = failureResults.map((r: any) => `❌ ${r.pdfTitle}: ${r.error}`).join('\n');
          setTimeout(() => toast.error(`失敗詳情：\n${failureMessage}`, { duration: 8000 }), 2000);
        }
      }
      setBatchExtractJobId(null);
      setSelectedPdfIds(new Set());
      setExtractingPdfIds(new Set());
      refetchPdfs();
    } else if (batchExtractProgress.found) {
      // 進行中，更新進度提示
      toast.loading(
        `批次拆解中... ${batchExtractProgress.current}/${batchExtractProgress.total} 已儲存 ${batchExtractProgress.totalQuestionsSaved} 道題目`,
        { id: 'batch-extract-progress' }
      );
    }
  }, [batchExtractProgress]);

  // Google Drive API
  const { data: authUrlData } = trpc.googleDrive.getAuthUrl.useQuery();
  const { data: foldersData } = trpc.googleDrive.listFolders.useQuery(
    { accessToken },
    { enabled: !!accessToken }
  );
  const { data: filesData } = trpc.googleDrive.listPdfFiles.useQuery(
    { accessToken, folderId: selectedFolderId },
    { enabled: !!accessToken && !!selectedFolderId }
  );
  const handleCallbackMutation = trpc.googleDrive.handleCallback.useMutation({
    onSuccess: (result) => {
      setAccessToken(result.accessToken);
      setRefreshToken(result.refreshToken);
      toast.success("成功連接 Google Drive！");
      window.history.replaceState({}, document.title, window.location.pathname);
    },
    onError: (error) => {
      toast.error(`連接失敗：${error.message}`);
    },
  });
  const syncNowMutation = trpc.googleDrive.syncNow.useMutation({
    onSuccess: (data) => {
      toast.success(`同步完成！成功 ${data.successCount} 個，失敗 ${data.errorCount} 個`);
      setSyncResults(data.results);
      setIsSyncing(false);
      refetchPdfs();
      setIsGoogleDriveDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`同步失敗：${error.message}`);
      setIsSyncing(false);
    },
  });

  // 處理 OAuth 回調（透過 postMessage）
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 檢查訊息來源（安全性考量）
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'google-drive-auth-success') {
        setAccessToken(event.data.accessToken);
        setRefreshToken(event.data.refreshToken || '');
        toast.success("成功連接 Google Drive！");
      } else if (event.data.type === 'google-drive-auth-error') {
        toast.error(`連接失敗：${event.data.error}`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 連接 Google Drive（使用彈出視窗）
  const handleConnectGoogleDrive = () => {
    if (authUrlData?.url) {
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        authUrlData.url,
        'Google Drive Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    }
  };

  const handleOpenPdf = async (pdf: any) => {
    const fileReference = pdf.fileKey || pdf.fileUrl || pdf.originalPdfKey || pdf.originalPdfUrl;
    if (!fileReference) {
      toast.error("找不到 PDF 檔案位置");
      return;
    }

    try {
      const access = await trpcUtils.knowledgeBase.getFileAccessUrl.fetch({ fileKey: fileReference });
      window.open(access.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知錯誤";
      toast.error(`開啟 PDF 失敗：${message}`);
    }
  };

  // 立即執行同步
  const handleSyncNow = () => {
    if (!selectedFolderId) {
      toast.error("請先選擇資料夾");
      return;
    }
    setIsSyncing(true);
    setSyncResults([]);
    syncNowMutation.mutate({
      accessToken,
      folderId: selectedFolderId,
      category: uploadCategory || "exam",
    });
  };

  // 查詢考題列表
  const { data: pdfs = [], refetch: refetchPdfs, isLoading, error } = trpc.knowledgeBase.list.useQuery({
    type: "exam",
    category: selectedCategory === "all" ? undefined : selectedCategory,
  });

  // 添加錯誤日誌
  useEffect(() => {
    if (error) {
      console.error('Failed to fetch PDFs:', error);
    }
  }, [error]);

  // 當上傳對話框開啟時，獲取試卷列表
  useEffect(() => {
    if (isUploadDialogOpen && pdfType === 'answer') {
      // 獲取所有試卷類型的 PDF
      const examPdfs = pdfs.filter(pdf => pdf.pdfType === 'exam').map(pdf => ({
        id: pdf.id,
        title: pdf.title
      }));
      setExamPdfList(examPdfs);
    }
  }, [isUploadDialogOpen, pdfType, pdfs]);

  // 匯入申論題到申論題管理
  const importEssayMutation = trpc.aiSources.importEssayToManagement.useMutation({
    onSuccess: (data) => {
      setEssayImportProgress(null);
      if (data.totalEssays > 0) {
        toast.success(`申論題匯入完成！共 ${data.totalEssays} 題申論題已存入申論題管理`);
      } else {
        toast.info(`已處理 ${data.successCount} 筆素材，未偵測到申論題（可能全為選擇題）`);
      }
      if (data.failCount > 0) {
        toast.error(`${data.failCount} 筆素材處理失敗`);
      }
      setIsImportDialogOpen(false);
      setSelectedImportIds(new Set());
    },
    onError: (error) => {
      setEssayImportProgress(null);
      toast.error(`申論題匯入失敗：${error.message}`);
    },
  });

  // 輸詢考題列表（用於獲取審核狀態）
  const { data: allQuestions = [] } = trpc.questionBank.listQuestions.useQuery({});

  // 過濾考題（搜索 + 審核狀態）
  const filteredPdfs = useMemo(() => {
    let result = pdfs;

    // 按搜索關鍵字過濾（支援多關鍵字搜尋）
    if (searchQuery) {
      const keywords = searchQuery.toLowerCase().split(' ').filter(k => k.trim());
      result = result.filter((pdf) => {
        const searchableText = [
          pdf.title,
          pdf.category || '',
          pdf.subject || '',
          pdf.sourceCategory || ''
        ].join(' ').toLowerCase();
        
        // 所有關鍵字都必須匹配
        return keywords.every(keyword => searchableText.includes(keyword));
      });
    }

    // 按審核狀態過濾（使用 reviewStats）
    if (selectedReviewStatus !== "all") {
      result = result.filter((pdf) => {
        const reviewStats = (pdf as any).reviewStats;
        if (!reviewStats) return false;
        
        // 根據選擇的審核狀態篩選
        if (selectedReviewStatus === "pending") {
          return reviewStats.pending > 0;
        } else if (selectedReviewStatus === "approved") {
          return reviewStats.approved > 0;
        } else if (selectedReviewStatus === "rejected") {
          return reviewStats.rejected > 0;
        }
        return false;
      });
    }

    // 按拆解狀態過濾
    if (selectedExtractStatus !== "all") {
      // 獲取所有已拆解的 PDF ID（存在於 questions 表中）
      const extractedPdfIds = new Set(
        allQuestions
          .map((q) => q.pdfId)
          .filter((id): id is number => id !== null)
      );
      
      if (selectedExtractStatus === "extracted") {
        // 已拆解：只顯示已拆解的 PDF
        result = result.filter((pdf) => extractedPdfIds.has(pdf.id));
      } else if (selectedExtractStatus === "not_extracted") {
        // 未拆解：只顯示未拆解的 PDF
        result = result.filter((pdf) => !extractedPdfIds.has(pdf.id));
      }
    }

    // 按訪問類型過濾
    if (selectedAccessType !== "all") {
      result = result.filter((pdf) => {
        const pdfAccessType = (pdf as any).accessType;
        
        if (selectedAccessType === "not_set") {
          // 尚未設定：accessType 為 null 或 undefined
          return !pdfAccessType;
        } else {
          // 免費、付費、班內生：accessType 匹配
          return pdfAccessType === selectedAccessType;
        }
      });
    }

    // 按來源過濾
    if (selectedSourceOrigin !== "all") {
      result = result.filter((pdf) => {
        const source = (pdf as any).source || '';
        if (selectedSourceOrigin === "goldensun_sync") {
          // 智能題庫同步：source 為 exam_gov_crawler 或 uploadSource 為 goldensun
          return source === 'exam_gov_crawler' || source.includes('goldensun');
        } else if (selectedSourceOrigin === "manual") {
          // 手動上傳
          return source === 'manual_upload_exam' || source === 'manual_upload_knowledge';
        }
        return true;
      });
    }

    return result;
  }, [pdfs, searchQuery, selectedReviewStatus, selectedExtractStatus, selectedAccessType, selectedSourceOrigin, allQuestions]);

  // 上傳 PDF mutation
  const uploadPdfMutation = trpc.knowledgeBase.uploadPdf.useMutation({
    onSuccess: (data) => {
      toast.success("上傳成功，正在自動拆解題目...");
      refetchPdfs();
    },
    onError: (error) => {
      toast.error(`上傳失敗：${error.message}`);
      console.error('[Upload Error]', error);
    },
  });

  // 刪除 PDF mutation
  const deletePdfMutation = trpc.knowledgeBase.delete.useMutation({
    onSuccess: () => {
      toast.success("刪除成功");
      refetchPdfs();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  // 更新 PDF mutation
  const updatePdfMutation = trpc.knowledgeBase.updatePdf.useMutation({
    onSuccess: () => {
      toast.success("更新成功");
      setIsEditDialogOpen(false);
      setEditingPdf(null);
      refetchPdfs();
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  // 拆解考題 mutation
  const extractQuestionsMutation = trpc.knowledgeBase.extractQuestions.useMutation({
    onSuccess: (data: any) => {
      console.log('[extractQuestions] 拆解成功:', data);
      
      // 檢查是否有申論題警告
      if (data?.warning === 'essay_dominated') {
        setEssayWarningMessage(data.warningMessage || '此 PDF 主要為申論題，是否仍要繼續拆解？');
        setIsEssayWarningOpen(true);
        // 移除正在拆解的標記
        setExtractingPdfIds(prev => {
          const newSet = new Set(prev);
          if (pendingExtractPdfId) newSet.delete(pendingExtractPdfId);
          return newSet;
        });
        return;
      }
      
      // 顯示統計
      const summary = data?.validationSummary;
      if (summary) {
        const statsMessage = `✅ 成功：${summary.valid} 題 | ⚠️ 需審核：${summary.needsReview} 題 | ❌ 不完整：${summary.incomplete} 題`;
        toast.success(`拆解完成！\n${statsMessage}`, { duration: 5000 });
      }
      
      // 設置預覽數據
      setPreviewData(data);
      setIsPreviewDialogOpen(true);
      
      // 移除正在拆解的標記
      setExtractingPdfIds(prev => {
        const newSet = new Set(prev);
        if (data?.pdfInfo?.id) {
          newSet.delete(data.pdfInfo.id);
        }
        return newSet;
      });
      
      refetchPdfs();
    },
    onError: (error) => {
      console.error('[extractQuestions] 拆解失敗:', error);
      toast.error(`拆解失敗：${error.message}`);
      setExtractingPdfIds(new Set());
    },
  });

  // 批次審核通過 mutation
  const batchApproveMutation = trpc.questionBank.batchApproveQuestions.useMutation({
    onSuccess: (data) => {
      toast.success(`批次審核通過成功：${data.count} 道題目`);
      setSelectedPdfIds(new Set());
      refetchPdfs();
    },
    onError: (error) => {
      toast.error(`批次審核失敗：${error.message}`);
    },
  });

  // 批次駁回 mutation
  const batchRejectMutation = trpc.questionBank.batchRejectQuestions.useMutation({
    onSuccess: (data) => {
      toast.success(`批次駁回成功：${data.count} 道題目`);
      setSelectedPdfIds(new Set());
      refetchPdfs();
    },
    onError: (error) => {
      toast.error(`批次駁回失敗：${error.message}`);
    },
  });

  // 批次設定扣點 mutation
  const batchUpdateAccessTypeMutation = trpc.questionBankManagement.batchUpdateAccessType.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setSelectedPdfIds(new Set());
      setIsAccessTypeDialogOpen(false);
      refetchPdfs();
    },
    onError: (error) => {
      toast.error(`批次設定失敗：${error.message}`);
    },
  });

  // 同步拆解單個 PDF mutation（循序批次用）
  const extractAndSaveSinglePdfMutation = trpc.knowledgeBase.extractAndSaveSinglePdf.useMutation();

  // 一鍵批次拆解並儲存 mutation
  const batchExtractAndSaveMutation = trpc.knowledgeBase.batchExtractAndSaveQuestions.useMutation({
    onSuccess: (data) => {
      console.log('[batchExtractAndSaveQuestions] 批次拆解已開始:', data);
      // 從回傳的 jobId 開始輯詢進度
      if (data.jobId) {
        setBatchExtractJobId(data.jobId);
        toast.loading(`批次拆解已開始，背景處理中...`, { id: 'batch-extract-progress' });
      }
    },
    onError: (error) => {
      console.error('[batchExtractAndSaveQuestions] 批次拆解失敗:', error);
      toast.dismiss('batch-extract-progress');
      toast.error(`❗ 批次拆解失敗：${error.message}`);
      setExtractingPdfIds(new Set());
    },
  });

  // 批次拆解 mutation
  const batchExtractQuestionsMutation = trpc.knowledgeBase.batchExtractQuestions.useMutation({
    onSuccess: async (data) => {
      console.log('[batchExtractQuestions] 批次拆解完成:', data);
      
      // 顯示統計
      const summary = data.validationSummary;
      const statsMessage = `✅ 成功：${summary.valid} 題 | ⚠️ 需審核：${summary.needsReview} 題 | ❌ 不完整：${summary.incomplete} 題`;
      toast.success(`批次拆解完成！\n${statsMessage}`, { duration: 5000 });
      
      if (data.failureCount && data.failureCount > 0) {
        setTimeout(() => {
          toast.error(`${data.failureCount} 個 PDF 處理失敗，請檢查檔案格式或內容`);
        }, 1000);
      }
      
      // 按 PDF 分組題目並自動保存
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
      refetchPdfs();
      
      // 清理狀態
      setExtractingPdfIds(new Set());
      setSelectedPdfIds(new Set());
    },
    onError: (error) => {
      console.error('[batchExtractQuestions] 批次拆解失敗:', error);
      toast.error(`批次拆解失敗：${error.message}`);
      setExtractingPdfIds(new Set());
    },
  });

  // 批次重新解析 PDF 文字 mutation
  const batchReparseMutation = trpc.knowledgeBase.batchReparse.useMutation({
    onSuccess: (data) => {
      toast.dismiss('batch-reparse-progress');
      toast.success(`重新解析完成！${data.successCount} 個成功，${data.failCount} 個失敗`, { duration: 5000 });
      setSelectedPdfIds(new Set());
      refetchPdfs();
    },
    onError: (error) => {
      toast.dismiss('batch-reparse-progress');
      toast.error(`重新解析失敗：${error.message}`);
    },
  });

  // 保存拆解的題目 mutation
  const saveExtractedQuestionsMutation = trpc.knowledgeBase.saveExtractedQuestions.useMutation({
    onSuccess: (data) => {
      console.log('[saveExtractedQuestions] 保存成功:', data);
    },
    onError: (error) => {
      console.error('[saveExtractedQuestions] 保存失敗:', error);
    },
  });

  // 處理上傳
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 檢查不同模式的檔案選擇
    if (uploadMode === 'single' && selectedFiles.length === 0) {
      toast.error("請選擇至少一個 PDF 文件");
      return;
    }
    
    if (uploadMode === 'pair' && (!examPdfFile || !answerPdfFile)) {
      toast.error("請同時選擇試卷和答案 PDF");
      return;
    }

    // 檔案大小驗證（16MB 限制）
    const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB
    
    if (uploadMode === 'single') {
      const oversizedFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE);
      if (oversizedFiles.length > 0) {
        toast.error(`以下檔案超過 16MB 限制：${oversizedFiles.map(f => f.name).join(', ')}`);
        return;
      }
    } else if (uploadMode === 'pair') {
      if (examPdfFile && examPdfFile.size > MAX_FILE_SIZE) {
        toast.error(`試卷 PDF 超過 16MB 限制：${examPdfFile.name}`);
        return;
      }
      if (answerPdfFile && answerPdfFile.size > MAX_FILE_SIZE) {
        toast.error(`答案 PDF 超過 16MB 限制：${answerPdfFile.name}`);
        return;
      }
    }

    // 限制上傳數量（只在單一模式下檢查）
    if (uploadMode === 'single' && selectedFiles.length > 50) {
      toast.error("批次上傳上限 50 個檔案，請使用 Google Drive 自動化功能處理大量檔案");
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // 配對上傳模式：先上傳試卷，再上傳答案並關聯
    if (uploadMode === 'pair') {
      try {
        // 上傳試卷
        const examFile = examPdfFile!;
        setUploadProgress(prev => ({
          ...prev,
          [examFile.name]: { status: 'uploading', progress: 0 }
        }));

        const examArrayBuffer = await examFile.arrayBuffer();
        const examBytes = new Uint8Array(examArrayBuffer);
        let examBinary = '';
        for (let i = 0; i < examBytes.byteLength; i++) {
          examBinary += String.fromCharCode(examBytes[i]);
        }
        const examFileBuffer = btoa(examBinary);
        
        setUploadProgress(prev => ({
          ...prev,
          [examFile.name]: { status: 'uploading', progress: 30 }
        }));

        const examFileNameWithoutExt = examFile.name.replace('.pdf', '');
        
        const examResult = await uploadPdfMutation.mutateAsync({
          title: examFileNameWithoutExt,
          pdfType: 'exam',
          hasQuestions: true,
          source: "manual_upload_exam",
          category: uploadCategory || "exam",
          subject: subject || undefined,
          description: description || undefined,
          fileName: examFile.name,
          fileUrl: "",
          fileKey: `exam-questions/${Date.now()}-${examFile.name}`,
          fileSize: examFile.size,
          fileBuffer: examFileBuffer,
          keepOriginalPdf: true,
          autoExtractInfo,
        });
        
        setUploadProgress(prev => ({
          ...prev,
          [examFile.name]: { status: 'success', progress: 100 }
        }));
        successCount++;

        // 上傳答案並關聯到試卷
        const answerFile = answerPdfFile!;
        setUploadProgress(prev => ({
          ...prev,
          [answerFile.name]: { status: 'uploading', progress: 0 }
        }));

        const answerArrayBuffer = await answerFile.arrayBuffer();
        const answerBytes = new Uint8Array(answerArrayBuffer);
        let answerBinary = '';
        for (let i = 0; i < answerBytes.byteLength; i++) {
          answerBinary += String.fromCharCode(answerBytes[i]);
        }
        const answerFileBuffer = btoa(answerBinary);
        
        setUploadProgress(prev => ({
          ...prev,
          [answerFile.name]: { status: 'uploading', progress: 30 }
        }));

        const answerFileNameWithoutExt = answerFile.name.replace('.pdf', '');
        
        await uploadPdfMutation.mutateAsync({
          title: answerFileNameWithoutExt,
          pdfType: 'answer',
          hasQuestions: false,
          source: "manual_upload_exam",
          category: uploadCategory || "exam",
          subject: subject || undefined,
          description: description || undefined,
          fileName: answerFile.name,
          fileUrl: "",
          fileKey: `exam-questions/${Date.now()}-${answerFile.name}`,
          fileSize: answerFile.size,
          fileBuffer: answerFileBuffer,
          keepOriginalPdf: true,
          autoExtractInfo,
          relatedExamPdfId: examResult.id, // 關聯到剛才上傳的試卷
        });
        
        setUploadProgress(prev => ({
          ...prev,
          [answerFile.name]: { status: 'success', progress: 100 }
        }));
        successCount++;

        toast.success(`成功上傳試卷和答案，並自動建立關聯`);
      } catch (error) {
        console.error('[ExamQuestions] Pair upload error:', error);
        
        let errorMessage = '未知錯誤';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null && 'message' in error) {
          errorMessage = String((error as any).message);
        }
        
        toast.error(`上傳失敗：${errorMessage}`);
        errorCount++;
      }

      // 重置狀態
      setExamPdfFile(null);
      setAnswerPdfFile(null);
      setUploadProgress({});
      refetchPdfs();
      setIsUploadDialogOpen(false);
      return;
    }

    // 單一上傳模式：批次處理 PDF 檔案
    if (uploadMode === 'single') {
      // 並行上傳（每次 5 個）
      const BATCH_SIZE = 5;
    for (let i = 0; i < selectedFiles.length; i += BATCH_SIZE) {
      const batch = selectedFiles.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (file) => {
        try {
          const isWordFile = file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx');
          if (!file.name.toLowerCase().endsWith('.pdf') && !isWordFile) {
            throw new Error('只支援 PDF 或 Word 格式（.pdf / .doc / .docx）');
          }

          // 更新狀態為上傳中
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: { status: 'uploading', progress: 0 }
          }));

          // 讀取檔案為 Base64
          const arrayBuffer = await file.arrayBuffer();
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: { status: 'uploading', progress: 30 }
          }));

          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const fileBuffer = btoa(binary);
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: { status: 'uploading', progress: 60, message: isWordFile ? 'Word 轉 PDF 中...' : undefined }
          }));

          // 解析檔名（移除副檔名）
          const fileNameWithoutExt = file.name.replace(/\.(pdf|docx?|doc)$/i, '');
          const parts = fileNameWithoutExt.split('_');
          const examCode = parts[0] || '';
          const subjectCode = parts[1] || '';
          
          // 調用 API
          await uploadPdfMutation.mutateAsync({
            title: fileNameWithoutExt,
            pdfType: pdfType, // 使用用戶選擇的 PDF 類型（exam/answer）
            hasQuestions: pdfType === 'exam', // 只有試卷才有題目
            source: "manual_upload_exam",
            category: uploadCategory || "exam", // 使用用戶選擇的分類，預設為 exam
            subject: subject || undefined,
            description: description || undefined,
            examCode: examCode || undefined,
            subjectCode: subjectCode || undefined,
            fileName: file.name,
            fileUrl: "",
            fileKey: `exam-questions/${Date.now()}-${file.name}`,
            fileSize: file.size,
            fileBuffer,
            keepOriginalPdf: true,
            autoExtractInfo, // 啟用自動提取資訊
            relatedExamPdfId: pdfType === 'answer' ? relatedExamPdfId : undefined, // 如果是答案，傳遞關聯的試卷 ID
          });
          
          // 更新狀態為成功
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: { status: 'success', progress: 100 }
          }));
          successCount++;
        } catch (error) {
          console.error(`[ExamQuestions] Upload error for ${file.name}:`, error);
          console.error(`[ExamQuestions] Error details:`, JSON.stringify(error, null, 2));
          
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
      }));
    }

      // 顯示結果
      if (successCount > 0) {
        toast.success(`成功上傳 ${successCount} 個檔案`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} 個檔案上傳失敗`);
      }

      // 重置狀態
      setSelectedFiles([]);
      setUploadProgress({});
      refetchPdfs();
      
      // 關閉對話框
      setIsUploadDialogOpen(false);
    }
  };

  // 處理單個拆解
  const handleExtract = (pdfId: number) => {
    setPendingExtractPdfId(pdfId);
    setExtractingPdfIds(prev => new Set(prev).add(pdfId));
    extractQuestionsMutation.mutate({ pdfId });
  };

  // 處理批次拆解
  const handleBatchExtract = () => {
    if (selectedPdfIds.size === 0) {
      toast.error("請選擇至少一個 PDF");
      return;
    }
    
    const pdfIds = Array.from(selectedPdfIds);
    setExtractingPdfIds(new Set(pdfIds));
    batchExtractQuestionsMutation.mutate({ pdfIds });
  };

  // 處理一鍵批次拆解並儲存（循序一次一個）
  const handleBatchExtractAndSave = async () => {
    if (selectedPdfIds.size === 0) {
      toast.error("請選擇至少一個 PDF");
      return;
    }
    
    const pdfIds = Array.from(selectedPdfIds);
    const total = pdfIds.length;
    setExtractingPdfIds(new Set(pdfIds));
    
    let successCount = 0;
    let failCount = 0;
    let totalQuestions = 0;
    
    for (let i = 0; i < pdfIds.length; i++) {
      const pdfId = pdfIds[i];
      // 找到考題標題
      const pdf = pdfs?.find((p: any) => p.id === pdfId);
      const title = pdf?.title || `PDF ${pdfId}`;
      
      setSeqBatchProgress({ current: i + 1, total, currentTitle: title, isRunning: true });
      toast.loading(`批次拆解中... ${i + 1}/${total}\n正在處理：${title.substring(0, 30)}${title.length > 30 ? '...' : ''}`, { id: 'batch-extract-progress' });
      
      try {
        // 使用同步 API，直接等待完成
        const result = await extractAndSaveSinglePdfMutation.mutateAsync({ pdfId });
        if (result?.success) {
          successCount++;
          totalQuestions += result.questionsCount || 0;
        } else {
          failCount++;
        }
      } catch (err: any) {
        failCount++;
        console.error(`[seqBatch] PDF ${pdfId} 失敗:`, err.message);
      }
      
      // 移除此 PDF 的拆解中標記
      setExtractingPdfIds(prev => { const s = new Set(prev); s.delete(pdfId); return s; });
    }
    
    toast.dismiss('batch-extract-progress');
    toast.success(`✅ 批次拆解完成！成功 ${successCount} 個，失敗 ${failCount} 個，共儲存 ${totalQuestions} 道題目`, { duration: 6000 });
    setSeqBatchProgress(null);
    setSelectedPdfIds(new Set());
    setExtractingPdfIds(new Set());
    refetchPdfs();
  };

  // 對話框拖曳 handlers
  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const pos = dialogPos || { x: 0, y: 0 };
    dragState.current = { startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const dx = ev.clientX - dragState.current.startX;
      const dy = ev.clientY - dragState.current.startY;
      setDialogPos({ x: dragState.current.startPosX + dx, y: dragState.current.startPosY + dy });
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [dialogPos]);

  // 處理刪除
  const handleDelete = (id: number) => {
    if (confirm("確定要刪除這個考題嗎？")) {
      deletePdfMutation.mutate({ id });
    }
  };

  // 處理全選
  const handleSelectAll = () => {
    const allPdfIds = new Set(filteredPdfs.map(pdf => pdf.id));
    setSelectedPdfIds(allPdfIds);
    toast.success(`已選擇 ${allPdfIds.size} 個考題`);
  };

  // 處理批次審核通過
  const handleBatchApprove = () => {
    if (selectedPdfIds.size === 0) {
      toast.error("請選擇至少一個 PDF");
      return;
    }
    
    if (confirm(`確定要審核通過選中的 ${selectedPdfIds.size} 個 PDF 中的所有題目嗎？`)) {
      const pdfIds = Array.from(selectedPdfIds);
      batchApproveMutation.mutate({ pdfIds });
    }
  };

  // 處理批次駁回
  const handleBatchReject = () => {
    if (selectedPdfIds.size === 0) {
      toast.error("請選擇至少一個 PDF");
      return;
    }
    
    if (confirm(`確定要駁回選中的 ${selectedPdfIds.size} 個 PDF 中的所有題目嗎？`)) {
      const pdfIds = Array.from(selectedPdfIds);
      batchRejectMutation.mutate({ pdfIds });
    }
  };

  // 處理批次刪除
  const handleBatchDelete = () => {
    if (selectedPdfIds.size === 0) {
      toast.error("請選擇至少一個 PDF");
      return;
    }
    
    if (confirm(`確定要刪除選中的 ${selectedPdfIds.size} 個考題嗎？`)) {
      const deletePromises = Array.from(selectedPdfIds).map(id =>
        deletePdfMutation.mutateAsync({ id })
      );
      
      Promise.all(deletePromises)
        .then(() => {
          toast.success(`成功刪除 ${selectedPdfIds.size} 個考題`);
          setSelectedPdfIds(new Set());
          refetchPdfs();
        })
        .catch((error) => {
          toast.error(`刪除失敗：${error.message}`);
        });
    }
  };

  // 處理批次設定扣點
  const handleBatchUpdateAccessType = () => {
    if (selectedPdfIds.size === 0) {
      toast.error("請選擇至少一個 PDF");
      return;
    }
    setIsAccessTypeDialogOpen(true);
  };

  const handleSubmitAccessType = () => {
    const pdfIds = Array.from(selectedPdfIds);
    batchUpdateAccessTypeMutation.mutate({
      pdfIds,
      accessType,
      requiredCredits,
    });
  };

  // 處理查看題目
  const handleViewQuestions = (pdfId: number) => {
    // 記錄返回路徑，以便題目編輯頁面知道要返回哪裡
    sessionStorage.setItem('questionEditorReturnPath', '/admin/exam-questions');
    setLocation(`/admin/question-editor/${pdfId}`);
  };

  // 處理編輯 PDF
  const handleEditPdf = (pdf: any) => {
    setEditingPdf(pdf);
    setEditTitle(pdf.title);
    setEditCategory(pdf.category);
    setEditSubject(pdf.subject || "");
    setEditSource(pdf.source || "manual_upload_exam");
    setEditSourceCategory(pdf.sourceCategory || "");
    
    // 嘗試從 description 中解析 JSON 格式的考試資訊
    try {
      if (pdf.description) {
        const parsed = JSON.parse(pdf.description);
        if (parsed.examName || parsed.department || parsed.subject) {
          // 如果是 JSON 格式，不顯示原始 JSON
          setEditDescription("");
        } else {
          setEditDescription(pdf.description);
        }
      } else {
        setEditDescription("");
      }
    } catch {
      setEditDescription(pdf.description || "");
    }
    
    setIsEditDialogOpen(true);
  };

  // 處理保存編輯
  const handleSaveEdit = () => {
    if (!editingPdf) return;
    
    updatePdfMutation.mutate({
      id: editingPdf.id,
      title: editTitle,
      category: editCategory,
      subject: editSubject || undefined,
      source: (editSource as any) || undefined,
      sourceCategory: editSourceCategory || undefined,
      description: editDescription || undefined,
    });
  };

  // 處理編輯付費設定
  const handleEditAccessSettings = (pdf: any) => {
    setEditingAccessPdf(pdf);
    setEditAccessType((pdf as any).accessType || "free");
    setEditPointsRequired((pdf as any).pointsRequired || 1);
    setIsEditAccessDialogOpen(true);
  };

  // 保存付費設定
  const utils = trpc.useUtils();
  const updateAccessSettingsMutation = trpc.knowledgeBase.updateAccessSettings.useMutation({
    onSuccess: async () => {
      toast.success("付費設定已更新");
      setIsEditAccessDialogOpen(false);
      // 使用 invalidate 強制刷新快取
      await utils.knowledgeBase.list.invalidate();
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  // 從智能題庫素材列表（就緒狀態）
  const { data: aiSourcesData, isLoading: isLoadingAiSources } = trpc.aiSources.list.useQuery(
    { status: 'ready', search: importSearchQuery || undefined, pageSize: 100 },
    { enabled: isImportDialogOpen }
  );

  // 查詢已匯入的 aiSource IDs
  const { data: importedSourceIdsData, refetch: refetchImportedIds } = trpc.aiSources.getImportedSourceIds.useQuery(
    undefined,
    { enabled: isImportDialogOpen }
  );
  const importedSourceIds = new Set(importedSourceIdsData?.importedIds || []);

  // 過濾掉已匯入的素材
  const aiSources = (aiSourcesData?.items || []).filter((s: any) => !importedSourceIds.has(s.id));
  const totalReadySources = aiSourcesData?.items?.length || 0;
  const alreadyImportedCount = totalReadySources - aiSources.length;

  // 從智能題庫匯入 mutation
  const importToExamMutation = trpc.aiSources.importToExamQuestions.useMutation({
    onSuccess: (data) => {
      setImportProgress(null);
      setImportJobId(null);
      toast.success(`匯入完成！成功 ${data.successCount} 筆，失敗 ${data.failCount} 筆`);
      if (data.failCount > 0) {
        const failedTitles = data.results.filter((r: any) => !r.success).map((r: any) => r.title).join('、');
        toast.error(`失敗素材：${failedTitles}`);
      }
      // 儲存匯入成功的 pdfIds 供批次拆解用
      const successPdfIds = data.results.filter((r: any) => r.success && r.pdfId).map((r: any) => r.pdfId as number);
      setImportedPdfIds(successPdfIds);
      setIsImportDialogOpen(false);
      setSelectedImportIds(new Set());
      refetchImportedIds();
      refetchPdfs();
      // 匯入成功後詢問是否批次拆解
      if (data.successCount > 0) {
        setShowBatchExtractConfirm(true);
      }
    },
    onError: (error) => {
      setImportProgress(null);
      setImportJobId(null);
      toast.error(`匯入失敗：${error.message}`);
    },
  });

  // 輪詢匯入進度
  const { data: importProgressData } = trpc.aiSources.getImportProgress.useQuery(
    { jobId: importJobId || '' },
    {
      enabled: !!importJobId && importToExamMutation.isPending,
      refetchInterval: 1500,
    }
  );

  // 同步進度到 state
  useEffect(() => {
    if (importProgressData && importProgressData.found && importProgress) {
      setImportProgress({ current: importProgressData.current, total: importProgressData.total });
    }
  }, [importProgressData]);

  const handleSaveAccessSettings = () => {
    if (!editingAccessPdf) return;
    
    updateAccessSettingsMutation.mutate({
      pdfId: editingAccessPdf.id,
      accessType: editAccessType,
      pointsRequired: editAccessType === "paid" ? editPointsRequired : 0,
    });
  };

  return (
    <>
      
      <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">考題管理</h1>
          <p className="text-muted-foreground mt-1">
            管理考古題、模擬試題等考題資源
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Database className="w-4 h-4 mr-2" />
            從智能題庫匯入
          </Button>
          <Button onClick={() => setIsUploadDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            上傳考題
          </Button>
        </div>
      </div>

      {/* 搜索和篩選 */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜尋考題（支援多關鍵字，例如：114 高考 國文）"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="所有分類" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有分類</SelectItem>
            <SelectItem value="law">法律</SelectItem>
            <SelectItem value="medicine">醫學</SelectItem>
            <SelectItem value="engineering">工程</SelectItem>
            <SelectItem value="business">商業</SelectItem>
            <SelectItem value="other">其他</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedExtractStatus} onValueChange={setSelectedExtractStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="拆解狀態" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有狀態</SelectItem>
            <SelectItem value="extracted">✓ 已拆解</SelectItem>
            <SelectItem value="not_extracted">✕ 未拆解</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedAccessType} onValueChange={setSelectedAccessType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="訪問類型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有狀態</SelectItem>
            <SelectItem value="free">🆓 免費</SelectItem>
            <SelectItem value="paid">💰 付費</SelectItem>
            <SelectItem value="class_only">🎓 班內生</SelectItem>
            <SelectItem value="not_set">❓ 尚未設定</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedReviewStatus} onValueChange={setSelectedReviewStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="審核狀態" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有狀態</SelectItem>
            <SelectItem value="pending">⏳ 待審核</SelectItem>
            <SelectItem value="approved">✓ 已通過</SelectItem>
            <SelectItem value="rejected">✕ 已馳回</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedSourceOrigin} onValueChange={(v) => {
          setSelectedSourceOrigin(v);
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="來源" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部來源</SelectItem>
            <SelectItem value="manual">📲 手動上傳</SelectItem>
            <SelectItem value="goldensun_sync">🔄 智能題庫匯入</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 循序批次拆解進度條 */}
      {seqBatchProgress?.isRunning && (
        <Card className="p-3 mb-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-green-800">批次拆解中... {seqBatchProgress.current}/{seqBatchProgress.total}</span>
                <span className="text-xs text-green-600">{Math.round(seqBatchProgress.current / seqBatchProgress.total * 100)}%</span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-1.5">
                <div className="bg-green-600 h-1.5 rounded-full transition-all duration-500" style={{width: `${seqBatchProgress.current / seqBatchProgress.total * 100}%`}} />
              </div>
              <p className="text-xs text-green-700 mt-1 truncate">正在處理：{seqBatchProgress.currentTitle}</p>
            </div>
          </div>
        </Card>
      )}

      {/* 批次操作區域 */}
      {selectedPdfIds.size > 0 && (
        <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                已選擇 {selectedPdfIds.size} 個考題
              </span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleSelectAll}
                className="h-7 px-2 text-xs"
              >
                全選
              </Button>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="default"
                onClick={handleBatchExtractAndSave}
                disabled={seqBatchProgress?.isRunning || batchExtractAndSaveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {seqBatchProgress?.isRunning
                  ? `拆解中 ${seqBatchProgress.current}/${seqBatchProgress.total}...`
                  : "一鍵批次拆解並儲存"}
              </Button>
              <Button 
                size="sm" 
                variant="default"
                onClick={handleBatchApprove}
                disabled={batchApproveMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                {batchApproveMutation.isPending ? "審核中..." : "批次審核通過"}
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={handleBatchReject}
                disabled={batchRejectMutation.isPending}
              >
                <XCircle className="w-4 h-4 mr-1" />
                {batchRejectMutation.isPending ? "駁回中..." : "批次駁回"}
              </Button>
              <Button 
                size="sm" 
                variant="default"
                onClick={handleBatchUpdateAccessType}
                disabled={batchUpdateAccessTypeMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Coins className="w-4 h-4 mr-1" />
                {batchUpdateAccessTypeMutation.isPending ? "設定中..." : "批次設定扣點"}
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  toast.loading('重新解析中，請稍候...', { id: 'batch-reparse-progress' });
                  batchReparseMutation.mutate({ ids: Array.from(selectedPdfIds) });
                }}
                disabled={batchReparseMutation.isPending}
                className="border-orange-400 text-orange-600 hover:bg-orange-50"
              >
                {batchReparseMutation.isPending ? '解析中...' : '重新解析文字'}
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={handleBatchDelete}
                disabled={deletePdfMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                批次刪除
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedPdfIds(new Set())}
              >
                取消選擇
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 考題列表 */}
      <div className="space-y-4">
        {filteredPdfs.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">尚無考題</h3>
            <p className="text-muted-foreground mb-4">
              開始上傳考題 PDF，系統會自動識別並拆解題目
            </p>
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              上傳第一個考題
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredPdfs.map((pdf) => {
              const isExtracting = extractingPdfIds.has(pdf.id);
              // 使用 reviewStats 統計題目數，支援 JSON 導入和 PDF 拆解兩種來源
              const reviewStats = (pdf as any).reviewStats;
              const questionCount = reviewStats 
                ? (reviewStats.pending + reviewStats.approved + reviewStats.rejected)
                : ((pdf as any).extractedQuestionCount || 0);
              
              return (
                <Card key={pdf.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedPdfIds.has(pdf.id)}
                      onCheckedChange={(checked) => {
                        const newSet = new Set(selectedPdfIds);
                        if (checked) {
                          newSet.add(pdf.id);
                        } else {
                          newSet.delete(pdf.id);
                        }
                        setSelectedPdfIds(newSet);
                      }}
                    />
                    <div className="flex-1">
                      <h3 
                        className="font-semibold text-lg text-primary hover:underline cursor-pointer" 
                        onClick={() => handleOpenPdf(pdf)}
                        title="點擊開啟 PDF 預覽"
                      >
                        {pdf.title || "未命名 PDF"}
                      </h3>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        <span>分類：{pdf.category}</span>
                        <span>頁數：{pdf.pageCount || 0}</span>
                        <span>題目數：{questionCount}</span>
                        {(pdf as any).extractedContentLength !== undefined && (pdf as any).extractedContentLength < 500 && (
                          <span className="text-orange-500 font-medium">⚠️ 文字解析不完整（建議重新解析）</span>
                        )}
                        <span>來源：{
                          pdf.source === "manual_upload_exam" ? "手動上傳" :
                          pdf.source === "exam_gov_crawler" ? "考選部" :
                          pdf.source === "school_crawler" ? "指定學校" :
                          pdf.source
                        }</span>
                      </div>
                      {/* 訪問類型和所需點數標籤 */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {/* 智能題庫標籤 */}
                        {(() => {
                          try {
                            const meta = (pdf as any).sourceMetadata ? JSON.parse((pdf as any).sourceMetadata) : null;
                            return meta?.aiSourceId ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
                                🧠 智能題庫
                              </span>
                            ) : null;
                          } catch { return null; }
                        })()}
                        {(pdf as any).accessType === "free" && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                            🆓 免費
                          </span>
                        )}
                        {(pdf as any).accessType === "paid" && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                            💰 付費（需 {(pdf as any).pointsRequired || 0} 點）
                          </span>
                        )}
                        {(pdf as any).accessType === "class_only" && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
                            🏫 班內生專用
                          </span>
                        )}
                        {!(pdf as any).accessType && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300">
                            ❓ 尚未設定
                          </span>
                        )}
                      </div>
                      {/* 審核狀態統計 */}
                      {(pdf as any).reviewStats && (
                        <div className="flex gap-2 mt-2">
                          {(pdf as any).reviewStats.pending > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                              ⏳ 待審核 {(pdf as any).reviewStats.pending}
                            </span>
                          )}
                          {(pdf as any).reviewStats.approved > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                              ✓ 已通過 {(pdf as any).reviewStats.approved}
                            </span>
                          )}
                          {(pdf as any).reviewStats.rejected > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300">
                              ✕ 已駁回 {(pdf as any).reviewStats.rejected}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2 mt-3">
                      {/* 如果有題目，顯示「查看題目」按鈕 */}
                      {questionCount > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewQuestions(pdf.id)}
                        >
                          查看題目 ({questionCount})
                        </Button>
                      )}
                      
                      {/* 如果有 PDF 且不是答案 PDF，顯示「拆解題目」或「重新拆解」按鈕 */}
                      {pdf.fileUrl && pdf.pdfType !== 'answer' && (
                        <Button 
                          size="sm" 
                          variant={questionCount > 0 ? "outline" : "default"}
                          onClick={() => handleExtract(pdf.id)}
                          disabled={isExtracting}
                        >
                          {isExtracting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              拆解中...
                            </>
                          ) : questionCount > 0 ? (
                            "重新拆解"
                          ) : (
                            "拆解題目"
                          )}
                        </Button>
                      )}
                      
                      {/* 如果是答案 PDF，顯示禁用的「答案 PDF」按鈕 */}
                      {pdf.pdfType === 'answer' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          disabled
                          title="答案 PDF 不能直接拆解，請先拆解試卷 PDF"
                        >
                          答案 PDF
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditPdf(pdf)}
                      >
                        編輯
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditAccessSettings(pdf)}
                      >
                        <Coins className="w-4 h-4 mr-1" />
                        設定付費
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleDelete(pdf.id)}
                        disabled={deletePdfMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 上傳對話框 */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>上傳考題 PDF</DialogTitle>
            <DialogDescription>
              支援批次上傳多個 PDF 文件，系統會自動識別並拆解考題。
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpload} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              {/* 上傳模式選擇 */}
              <div className="space-y-2">
                <Label>上傳模式 *</Label>
                <Select value={uploadMode} onValueChange={(value: 'single' | 'pair') => {
                  setUploadMode(value);
                  // 切換模式時重置狀態
                  setSelectedFiles([]);
                  setExamPdfFile(null);
                  setAnswerPdfFile(null);
                  setPdfType('exam');
                  setRelatedExamPdfId(null);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇上傳模式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">📄 單一上傳（分別上傳試卷或答案）</SelectItem>
                    <SelectItem value="pair">📋 配對上傳（同時上傳試卷+答案）</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {uploadMode === 'single' ? '分別上傳試卷或答案，可事後關聯' : '一次上傳試卷和答案，系統自動建立關聯'}
                </p>
              </div>

              {/* 單一上傳模式 */}
              {uploadMode === 'single' && (
                <>
                  {/* 文件選擇 */}
                  <div className="space-y-2">
                    <Label>PDF / Word 檔案 *</Label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      multiple
                      onChange={(e) => {
                        const fileList = e.target.files;
                        if (fileList) {
                          setSelectedFiles(Array.from(fileList));
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      支援 PDF 或 Word（.doc/.docx），Word 會自動轉換為 PDF。支援批次上傳多個檔案
                    </p>
                  </div>



                  {/* PDF 類型選擇 */}
                  <div className="space-y-2">
                    <Label>PDF 類型 *</Label>
                    <Select value={pdfType} onValueChange={(value: 'exam' | 'answer') => setPdfType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇 PDF 類型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exam">📝 試卷（題目）</SelectItem>
                        <SelectItem value="answer">✅ 答案</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {pdfType === 'exam' ? '上傳包含題目的試卷 PDF' : '上傳包含答案的 PDF，需要關聯到對應的試卷'}
                    </p>
                  </div>

                  {/* 當選擇答案類型時，顯示試卷選擇器 */}
                  {pdfType === 'answer' && (
                    <div className="space-y-2">
                      <Label>關聯試卷 *</Label>
                      <Select value={relatedExamPdfId?.toString() || ''} onValueChange={(value) => setRelatedExamPdfId(value ? parseInt(value) : null)}>
                        <SelectTrigger>
                          <SelectValue placeholder="選擇要關聯的試卷" />
                        </SelectTrigger>
                        <SelectContent>
                          {examPdfList.map((pdf) => (
                            <SelectItem key={pdf.id} value={pdf.id.toString()}>
                              {pdf.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        選擇這份答案對應的試卷，系統會在拆解時自動配對答案
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* 配對上傳模式 */}
              {uploadMode === 'pair' && (
                <>
                  {/* 試卷檔案選擇 */}
                  <div className="space-y-2">
                    <Label>試卷 PDF / Word *</Label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setExamPdfFile(file);
                        }
                      }}
                    />
                    {examPdfFile && (
                      <p className="text-xs text-green-600">
                        ✓ 已選擇：{examPdfFile.name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      選擇包含題目的試卷（PDF 或 Word，Word 會自動轉換）
                    </p>
                  </div>

                  {/* 答案檔案選擇 */}
                  <div className="space-y-2">
                    <Label>答案 PDF / Word *</Label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAnswerPdfFile(file);
                        }
                      }}
                    />
                    {answerPdfFile && (
                      <p className="text-xs text-green-600">
                        ✓ 已選擇：{answerPdfFile.name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      選擇包含答案的 PDF，系統會自動關聯到試卷（上限 16MB）
                    </p>
                  </div>
                </>
              )}

              {/* 自動提取資訊 */}
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded">
                <Checkbox
                  id="autoExtractInfo"
                  checked={autoExtractInfo}
                  onCheckedChange={(checked) => setAutoExtractInfo(checked as boolean)}
                />
                <Label htmlFor="autoExtractInfo" className="cursor-pointer text-sm">
                  🤖 自動識別考試資訊（考試名稱、類科、科目）
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                啟用後，系統會自動從 PDF 內容中識別考試名稱、類科和科目，並自動組合標題和分類。
              </p>

              {/* 來源固定為手動上傳，不顯示選擇器 */}
              {/* 分類、科目、描述等欄位已移除，可在事後編輯 */}

              {/* 上傳進度 */}
              {selectedFiles.length > 0 && Object.keys(uploadProgress).length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">
                      上傳進度：{selectedFiles.length} 個檔案
                    </div>
                    {Object.entries(uploadProgress).map(([fileName, progress]) => (
                      <div key={fileName} className="flex items-center gap-2 text-sm">
                        {progress.status === 'uploading' && (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        )}
                        {progress.status === 'success' && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                        {progress.status === 'error' && (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className={
                          progress.status === 'success' ? 'text-green-600' :
                          progress.status === 'error' ? 'text-red-600' :
                          ''
                        }>
                          {fileName}
                        </span>
                        {progress.status === 'error' && progress.message && (
                          <span className="text-xs text-red-500">({progress.message})</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsUploadDialogOpen(false)}
              >
                取消
              </Button>
              <Button 
                type="submit" 
                disabled={
                  uploadPdfMutation.isPending || 
                  (uploadMode === 'single' && selectedFiles.length === 0) ||
                  (uploadMode === 'pair' && (!examPdfFile || !answerPdfFile))
                }
              >
                {uploadPdfMutation.isPending ? "上傳中..." : "上傳"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 題目預覽對話框 */}
      <QuestionPreviewDialog
        open={isPreviewDialogOpen}
        onOpenChange={setIsPreviewDialogOpen}
        previewQuestions={previewData?.previewQuestions || []}
        validationSummary={previewData?.validationSummary || { total: 0, valid: 0, incomplete: 0, needsReview: 0, validPercentage: 0 }}
        pdfId={previewData?.pdfInfo?.id || 0}
        pdfTitle={previewData?.pdfInfo?.title || ""}
        onSaveSuccess={() => {
          refetchPdfs();
          setIsPreviewDialogOpen(false);
        }}
      />

      {/* 編輯對話框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>編輯考題資訊</DialogTitle>
            <DialogDescription>
              修改考題的標題、分類、科目、來源等資訊
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">標題 *</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="例如：112年公務人員高等考試三級考試 - 結構學"
              />
              <p className="text-xs text-muted-foreground">
                建議格式：「考試名稱 - 科目名稱」
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">分類 *</Label>
              <Input
                id="edit-category"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                placeholder="例如：土木工程、法律系、電機工程"
              />
              <p className="text-xs text-muted-foreground">
                建議使用類科名稱（例如：土木工程），系統已自動識別並填入
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-subject">科目（可選）</Label>
              <Input
                id="edit-subject"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                placeholder="例如：結構學、民法總則"
              />
            </div>
            {/* 來源固定為手動上傳，不顯示選擇器 */}
            <div className="space-y-2">
              <Label htmlFor="edit-source-category">來源分類（可選）</Label>
              <Select value={editSourceCategory} onValueChange={setEditSourceCategory}>
                <SelectTrigger id="edit-source-category">
                  <SelectValue placeholder="選擇來源分類" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="考選部">考選部</SelectItem>
                  <SelectItem value="各校研究所">各校研究所</SelectItem>
                  <SelectItem value="高點網站">高點網站</SelectItem>
                  <SelectItem value="暫未分類">暫未分類</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                選擇考題的來源分類
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">描述（可選）</Label>
              <Input
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="簡短描述這份考題..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit} disabled={updatePdfMutation.isPending}>
              {updatePdfMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Google Drive 同步對話框 */}
      <Dialog open={isGoogleDriveDialogOpen} onOpenChange={setIsGoogleDriveDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Google Drive 自動同步</DialogTitle>
            <DialogDescription>
              連接 Google Drive，自動下載並處理 PDF 考題
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 連接狀態 */}
            {!accessToken ? (
              <div className="text-center py-8">
                <Cloud className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">連接 Google Drive</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  點擊下方按鈕連接您的 Google Drive 帳號
                </p>
                <Button onClick={handleConnectGoogleDrive}>
                  <Cloud className="w-4 h-4 mr-2" />
                  連接 Google Drive
                </Button>
              </div>
            ) : (
              <>
                {/* 資料夾選擇 */}
                <div className="space-y-2">
                  <Label>選擇資料夾</Label>
                  <Select value={selectedFolderId} onValueChange={(value) => {
                    setSelectedFolderId(value);
                    const folder = foldersData?.folders.find((f: any) => f.id === value);
                    setSelectedFolderName(folder?.name || "");
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="選擇資料夾" />
                    </SelectTrigger>
                    <SelectContent>
                      {foldersData?.folders.map((folder: any) => (
                        <SelectItem key={folder.id} value={folder.id}>
                          <div className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4" />
                            {folder.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 分類選擇 */}
                {selectedFolderId && (
                  <>
                    <div className="space-y-2">
                      <Label>目標分類</Label>
                      <Select value={uploadCategory} onValueChange={setUploadCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="選擇分類" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.name} value={cat.name}>
                              {cat.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 檔案列表 */}
                    <div>
                      <Label>資料夾中的 PDF 檔案：{filesData?.files.length || 0} 個</Label>
                      {filesData && filesData.files.length > 0 && (
                        <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2 mt-2">
                          {filesData.files.map((file: any) => (
                            <div key={file.id} className="flex items-center gap-2 text-sm">
                              <FileText className="w-4 h-4 text-blue-500" />
                              <span>{file.name}</span>
                              <span className="text-muted-foreground text-xs ml-auto">
                                {(parseInt(file.size) / 1024 / 1024).toFixed(2)} MB
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 同步結果 */}
                    {syncResults.length > 0 && (
                      <div className="space-y-2">
                        <Label>同步結果</Label>
                        <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                          {syncResults.map((result, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              {result.status === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                              )}
                              <span className={result.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                                {result.fileName}
                              </span>
                              {result.error && (
                                <span className="text-xs text-red-500 ml-auto">({result.error})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGoogleDriveDialogOpen(false)}>
              取消
            </Button>
            {accessToken && selectedFolderId && (
              <Button onClick={handleSyncNow} disabled={isSyncing || !filesData?.files.length}>
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    同步中...
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4 mr-2" />
                    立即執行同步
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批次設定扣點 Dialog */}
      <Dialog open={isAccessTypeDialogOpen} onOpenChange={setIsAccessTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批次設定扣點</DialogTitle>
            <DialogDescription>
              將為選中的 {selectedPdfIds.size} 個 PDF 中的所有題目設定訪問類型和所需點數
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>訪問類型</Label>
              <Select value={accessType} onValueChange={(value: "free" | "paid" | "class_only") => setAccessType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">🆓 免費</SelectItem>
                  <SelectItem value="paid">💰 付費</SelectItem>
                  <SelectItem value="class_only">🏫 班內生專用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>所需點數</Label>
              <Input
                type="number"
                min="0"
                value={requiredCredits}
                onChange={(e) => setRequiredCredits(parseInt(e.target.value) || 0)}
                disabled={accessType === "free"}
              />
              {accessType === "free" && (
                <p className="text-xs text-muted-foreground">免費題目不需設定點數</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAccessTypeDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmitAccessType} disabled={batchUpdateAccessTypeMutation.isPending}>
              {batchUpdateAccessTypeMutation.isPending ? "處理中..." : "確定"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編輯付費設定 Dialog */}
      <Dialog open={isEditAccessDialogOpen} onOpenChange={setIsEditAccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>設定付費類型</DialogTitle>
            <DialogDescription>
              為「{editingAccessPdf?.title}」設定付費類型和所需點數
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>付費類型 *</Label>
              <Select value={editAccessType} onValueChange={(value: "free" | "paid" | "class_only") => setEditAccessType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇付費類型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">🆓 免費</SelectItem>
                  <SelectItem value="paid">💰 付費</SelectItem>
                  <SelectItem value="class_only">🏫 班內生專用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editAccessType === "paid" && (
              <div className="space-y-2">
                <Label>所需點數 *</Label>
                <Input
                  type="number"
                  min="1"
                  value={editPointsRequired}
                  onChange={(e) => setEditPointsRequired(parseInt(e.target.value) || 1)}
                  placeholder="輸入所需點數"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditAccessDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveAccessSettings} disabled={updateAccessSettingsMutation.isPending}>
              {updateAccessSettingsMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 從智能題庫匯入對話框 */}
      <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
        if (!importToExamMutation.isPending) {
          setIsImportDialogOpen(open);
          if (!open) { setSelectedImportIds(new Set()); setImportProgress(null); setDialogPos(null); }
        }
      }}>
        <DialogContent className="max-w-3xl" style={{height: '80vh', maxHeight: '80vh', padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden', ...(dialogPos ? { transform: `translate(calc(-50% + ${dialogPos.x}px), calc(-50% + ${dialogPos.y}px))` } : {})}}>
          {/* 無障礙必要的隱藏 DialogTitle */}
          <DialogTitle className="sr-only">從智能題庫匯入 PDF</DialogTitle>
          <div style={{display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '24px'}}>
          {/* 標題區 - 可拖曳 */}
          <div style={{marginBottom: '12px'}}>
            <h2
              style={{fontSize: '18px', fontWeight: 600, lineHeight: 1.4, margin: 0, cursor: 'grab', userSelect: 'none'}}
              onMouseDown={handleDragStart}
            >從智能題庫匯入 PDF</h2>
            <p style={{fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '6px', lineHeight: 1.6, margin: '6px 0 0 0'}}>
              選擇已就緒的智能題庫素材，匯入到考題管理頁進行拆解。小檔先完成，大檔可能需要數分鐘。
            </p>
            {alreadyImportedCount > 0 && (
              <p style={{fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '4px', margin: '4px 0 0 0'}}>
                ℹ️ 已自動隱藏 {alreadyImportedCount} 筆已匯入素材
              </p>
            )}
          </div>

          {/* 搜尋框 */}
          <div style={{position: 'relative', marginBottom: '8px'}}>
            <Search style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--muted-foreground)', pointerEvents: 'none'}} />
            <input
              style={{width: '100%', paddingLeft: '36px', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '14px', background: 'transparent', color: 'inherit', outline: 'none', boxSizing: 'border-box'}}
              placeholder="搜尋素材標題、科目..."
              value={importSearchQuery}
              onChange={(e) => setImportSearchQuery(e.target.value)}
            />
          </div>

          {/* 全選/取消 + 筆數 */}
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px'}}>
            <span style={{fontSize: '13px', color: 'var(--muted-foreground)'}}>
              共 {aiSources.filter((s: any) => showEssayItems ? (s.extractedQuestionsCount > 0 && s.multipleChoiceCount === 0) : (s.multipleChoiceCount > 0 || s.extractedQuestionsCount === 0)).length} 筆可匹入，已選 <strong style={{color: 'var(--foreground)'}}>{selectedImportIds.size}</strong> 筆
            </span>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: showEssayItems ? '#d97706' : 'var(--muted-foreground)', userSelect: 'none'}}>
                <input
                  type="checkbox"
                  checked={showEssayItems}
                  onChange={e => { setShowEssayItems(e.target.checked); setSelectedImportIds(new Set()); }}
                  style={{width: '13px', height: '13px', cursor: 'pointer', accentColor: '#d97706'}}
                />
                <span style={{fontSize: '12px', fontWeight: showEssayItems ? 600 : 400}}>只顯示申論題</span>
              </label>
              <button
                style={{color: 'var(--primary)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0}}
                onClick={() => setSelectedImportIds(new Set(aiSources.filter((s: any) => showEssayItems ? (s.extractedQuestionsCount > 0 && s.multipleChoiceCount === 0) : (s.multipleChoiceCount > 0 || s.extractedQuestionsCount === 0)).map((s: any) => s.id)))}
              >全選</button>
              <button
                style={{color: 'var(--muted-foreground)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0}}
                onClick={() => setSelectedImportIds(new Set())}
              >取消全選</button>
            </div>
          </div>

          {/* 進度列 */}
          {importProgress && (
            <div style={{marginBottom: '8px', padding: '10px 12px', background: 'var(--muted)', borderRadius: '6px', fontSize: '13px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}>
                <span>匯入中... {importProgress.current}/{importProgress.total} 筆</span>
                <span style={{color: 'var(--muted-foreground)'}}>{Math.round(importProgress.current / importProgress.total * 100)}%</span>
              </div>
              <div style={{height: '4px', background: 'var(--border)', borderRadius: '2px'}}>
                <div style={{height: '100%', background: 'var(--primary)', borderRadius: '2px', width: `${Math.round(importProgress.current / importProgress.total * 100)}%`, transition: 'width 0.3s'}} />
              </div>
            </div>
          )}

          {/* 素材列表 */}
          <div style={{flex: 1, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', minHeight: 0}}>
            {isLoadingAiSources ? (
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0'}}>
                <Loader2 style={{width: '24px', height: '24px', color: 'var(--muted-foreground)'}} className="animate-spin" />
                <span style={{marginLeft: '8px', color: 'var(--muted-foreground)'}}>載入中...</span>
              </div>
            ) : aiSources.length === 0 ? (
              <div style={{textAlign: 'center', padding: '48px 0', color: 'var(--muted-foreground)'}}>
                <Database style={{width: '40px', height: '40px', margin: '0 auto 8px', opacity: 0.3}} />
                <p style={{fontSize: '14px'}}>{alreadyImportedCount > 0 ? '所有就緒素材均已匯入' : '沒有就緒的素材'}</p>
                <p style={{fontSize: '12px', marginTop: '4px'}}>{alreadyImportedCount > 0 ? '如需重新匯入，請先刪除考題管理中的對應項目' : '請先在智能題庫管理頁完成文字提取'}</p>
              </div>
            ) : (
              aiSources
                .filter((source: any) => showEssayItems
                  ? (source.extractedQuestionsCount > 0 && source.multipleChoiceCount === 0)  // 只顯示申論題：有拆解且無選擇題
                  : (source.multipleChoiceCount > 0 || source.extractedQuestionsCount === 0)  // 預設：選擇題或尚未拆解
                )
                .map((source: any) => (
                <div
                  key={source.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: selectedImportIds.has(source.id) ? 'color-mix(in srgb, var(--primary) 5%, transparent)' : 'transparent',
                  }}
                  onClick={() => {
                    setSelectedImportIds(prev => {
                      const next = new Set(prev);
                      if (next.has(source.id)) next.delete(source.id);
                      else next.add(source.id);
                      return next;
                    });
                  }}
                >
                  <Checkbox
                    checked={selectedImportIds.has(source.id)}
                    onCheckedChange={() => {}}
                    className="pointer-events-none"
                  />
                  <div style={{flex: 1, minWidth: 0}}>
                    <p style={{fontSize: '14px', fontWeight: 500, wordBreak: 'break-word', margin: 0}}>{source.title}</p>
                    <p style={{fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '2px', margin: '2px 0 0 0'}}>
                      {source.category}{source.year ? ` · ${source.year}年` : ''}{source.examGroup ? ` · ${source.examGroup}` : ''}
                    </p>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0}}>
                    <span style={{fontSize: '12px', color: '#16a34a', background: '#f0fdf4', padding: '2px 8px', borderRadius: '999px'}}>就緒</span>
                    {source.multipleChoiceCount > 0 ? (
                      <span style={{fontSize: '11px', color: '#2563eb', background: '#eff6ff', padding: '1px 6px', borderRadius: '999px'}}>選擇題 {source.multipleChoiceCount} 題</span>
                    ) : source.extractedQuestionsCount > 0 ? (
                      <span style={{fontSize: '11px', color: '#d97706', background: '#fffbeb', padding: '1px 6px', borderRadius: '999px'}}>申論題 {source.extractedQuestionsCount} 題</span>
                    ) : (
                      <span style={{fontSize: '11px', color: '#9ca3af', background: '#f9fafb', padding: '1px 6px', borderRadius: '999px'}}>尚未拆解</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 底部按鈕 - 固定在底部 */}
          <div style={{display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '16px', flexShrink: 0}}>
            <Button variant="outline" onClick={() => { setIsImportDialogOpen(false); setSelectedImportIds(new Set()); setImportProgress(null); }} disabled={importToExamMutation.isPending || importEssayMutation.isPending}>
              取消
            </Button>
            <div style={{display: 'flex', gap: '8px'}}>
              {/* 匯入申論題到申論題管理 */}
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedImportIds.size === 0) { toast.error('請至少選擇一筆素材'); return; }
                  setEssayImportProgress({ current: 0, total: selectedImportIds.size });
                  importEssayMutation.mutate({ sourceIds: Array.from(selectedImportIds) });
                }}
                disabled={importEssayMutation.isPending || importToExamMutation.isPending || selectedImportIds.size === 0}
                style={{borderColor: '#d97706', color: '#d97706'}}
              >
                {importEssayMutation.isPending ? (
                  <><Loader2 style={{width: '16px', height: '16px', marginRight: '8px'}} className="animate-spin" />申論題拆解中...</>
                ) : (
                  <><FileText style={{width: '16px', height: '16px', marginRight: '8px'}} />匯入 {showEssayItems ? `${selectedImportIds.size} 筆` : ''}申論題到申論題管理</>
                )}
              </Button>
              {/* 匯入到考題管理 - 申論題模式下不可按 */}
              <Button
                onClick={() => {
                  if (selectedImportIds.size === 0) { toast.error('請至少選擇一筆素材'); return; }
                  const newJobId = `import-${Date.now()}`;
                  setImportJobId(newJobId);
                  setImportProgress({ current: 0, total: selectedImportIds.size });
                  importToExamMutation.mutate({ sourceIds: Array.from(selectedImportIds), jobId: newJobId });
                }}
                disabled={showEssayItems || importToExamMutation.isPending || importEssayMutation.isPending || selectedImportIds.size === 0}
                title={showEssayItems ? '申論題模式下請使用「匯入申論題到申論題管理」' : ''}
              >
                {importToExamMutation.isPending ? (
                  <><Loader2 style={{width: '16px', height: '16px', marginRight: '8px'}} className="animate-spin" />匯入中（{importProgress?.current ?? 0}/{importProgress?.total ?? selectedImportIds.size}）</>
                ) : (
                  <><Database style={{width: '16px', height: '16px', marginRight: '8px'}} />{showEssayItems ? '匯入到考題管理' : `匯入 ${selectedImportIds.size} 筆到考題管理`}</>
                )}
              </Button>
            </div>
          </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 匯入後批次拆解確認對話框 */}
      <Dialog open={showBatchExtractConfirm} onOpenChange={setShowBatchExtractConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>是否立即批次拆解？</DialogTitle>
            <DialogDescription>
              已成功匯入 {importedPdfIds.length} 筆 PDF。是否立即啟動批次拆解，將題目存入練題系統？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchExtractConfirm(false)}>
              稍後再說
            </Button>
            <Button
              onClick={() => {
                setShowBatchExtractConfirm(false);
                if (importedPdfIds.length > 0) {
                  const pdfIds = importedPdfIds;
                  setExtractingPdfIds(new Set(pdfIds));
                  toast.loading(`批次拆解中... 共 ${pdfIds.length} 個 PDF`, { duration: Infinity, id: 'batch-extract-progress' });
                  batchExtractAndSaveMutation.mutate({ pdfIds });
                }
              }}
            >
              <CheckCircle2 style={{width: '16px', height: '16px', marginRight: '8px'}} />
              立即批次拆解
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 申論題警告對話框 */}
      <Dialog open={isEssayWarningOpen} onOpenChange={setIsEssayWarningOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <span>⚠️</span>
              <span>偵測到申論題內容</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-700 leading-relaxed pt-2">
              {essayWarningMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <strong>注意：</strong>申論題即使拆解成功，也無法加入練習系統。建議僅對選擇題 PDF 進行拆解。
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEssayWarningOpen(false);
                setPendingExtractPdfId(null);
              }}
            >
              取消
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => {
                setIsEssayWarningOpen(false);
                if (pendingExtractPdfId !== null) {
                  setExtractingPdfIds(prev => new Set(prev).add(pendingExtractPdfId!));
                  extractQuestionsMutation.mutate({ pdfId: pendingExtractPdfId, forceExtract: true });
                }
              }}
            >
              仍要繼續拆解
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </div>
    </>
  );
}
