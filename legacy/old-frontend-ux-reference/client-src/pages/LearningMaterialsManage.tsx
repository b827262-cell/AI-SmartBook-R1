/**
 * 智能解題管理頁面（管理者專用）
 * 管理者可以上傳、編輯、刪除智能解題
 */

import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Upload, Edit, Trash2, FileText, BookOpen, GraduationCap, FolderOpen, Zap, CheckCircle2, Layers, Sparkles, Eye, KeyRound, Globe, Users, Lock, ChevronDown, RefreshCw } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Category = string; // 支援自訂分類

export default function LearningMaterialsManage() {
  const [, navigate] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<Set<number>>(new Set());
  const [vectorizingIds, setVectorizingIds] = useState<Set<number>>(new Set());
  const [isBatchVectorizing, setIsBatchVectorizing] = useState(false);
  const [batchVectorizeResult, setBatchVectorizeResult] = useState<{ processed: number; skipped: number; failed: number; totalChunks: number } | null>(null);
  
  // 上傳表單狀態
  const [uploadForm, setUploadForm] = useState({
    files: [] as File[],
    category: "其他" as Category,
    customCategory: "", // 自訂分類輸入
    isPublic: true,
    pointCost: 0,
    accessMode: 'public' as 'public' | 'class_only' | 'private',
  });
  
  // 編輯表單狀態
  const [editForm, setEditForm] = useState({
    id: 0,
    title: "",
    category: "其他" as Category,
    isPublic: true,
    subjectName: "",
    fileUrl: "",
    pointCost: 0,
    accessMode: 'public' as 'public' | 'class_only' | 'private',
  });
  // 題目編輯狀態
  type EditableQuestion = {
    index: number;
    type: 'choice' | 'short_answer' | 'drawing';
    questionText: string;
    options: string[] | null;
    correctAnswer: string | null;
    teacherSolution: string | null;
    hasImage: boolean;
  };
  const [editingQuestions, setEditingQuestions] = useState<EditableQuestion[]>([]);
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  // 批次設定點數
  const [isBatchPointDialogOpen, setIsBatchPointDialogOpen] = useState(false);
  const [batchPointCost, setBatchPointCost] = useState(0);
  const [isBatchAccessModeDialogOpen, setIsBatchAccessModeDialogOpen] = useState(false);
  const [batchAccessMode, setBatchAccessMode] = useState<'public' | 'class_only' | 'private'>('public');
  // 批次更改科目和類別 Dialog
  const [batchSubjectDialog, setBatchSubjectDialog] = useState(false);
  const [batchSubjectValue, setBatchSubjectValue] = useState('');
  const [batchCategoryDialog, setBatchCategoryDialog] = useState(false);
  const [batchCategoryValue, setBatchCategoryValue] = useState<'lecture' | 'exam' | 'course' | 'other'>('other');
  const [reExtractingIds, setReExtractingIds] = useState<Set<number>>(new Set());
  // 排隊解析狀態
  const [batchExtractQueue, setBatchExtractQueue] = useState<number[]>([]);
  const [batchExtractProgress, setBatchExtractProgress] = useState<{ current: number; total: number; currentTitle: string } | null>(null);
  const [batchExtractCancelled, setBatchExtractCancelled] = useState(false);
  const batchExtractCancelledRef = { current: false };

  // 批次預生成 AI 解題狀態
  const [batchPreSolveProgress, setBatchPreSolveProgress] = useState<{ current: number; total: number; currentTitle: string } | null>(null);
  const [skipExistingSolve, setSkipExistingSolve] = useState(true);
  // 批次預生成差異比較狀態
  const [batchPreDiffProgress, setBatchPreDiffProgress] = useState<{ current: number; total: number; currentTitle: string } | null>(null);
  const [skipExistingDiff, setSkipExistingDiff] = useState(true);

  // 搜尋和篩選狀態
  const [searchText, setSearchText] = useState('');
  const [filterAccessMode, setFilterAccessMode] = useState<'all' | 'public' | 'class_only' | 'private'>('all');
  const [filterCost, setFilterCost] = useState<'all' | 'free' | 'paid'>('all');
  // 班內生驗證碼 Dialog
  const [classCodeDialog, setClassCodeDialog] = useState<{ open: boolean; materialId: number; currentCode: string }>({ open: false, materialId: 0, currentCode: '' });
  const [classCodeInput, setClassCodeInput] = useState('');

  // 獲取所有分類
  const { data: categoriesData } = trpc.learningMaterials.getCategories.useQuery();

  // 獲取向量化狀態
  const { data: vectorizeStatusData, refetch: refetchVectorizeStatus } = trpc.learningMaterials.getVectorizeStatus.useQuery();
  const vectorizeStatusMap = new Map(
    vectorizeStatusData?.statusList.map(s => [s.id, s]) || []
  );

  // 獲取智能解題列表
  const { data, isLoading, refetch } = trpc.learningMaterials.list.useQuery({
    category: selectedCategory === "all" ? undefined : selectedCategory,
  });

  // 篩選後的資料（必須在 data hook 後宣告，讓全選和批次操作都能存取）
  const filteredMaterials = (data?.materials || []).filter(m =>
    !searchText.trim() || (
      (m.title || '').toLowerCase().includes(searchText.trim().toLowerCase()) ||
      (m.subjectName || '').toLowerCase().includes(searchText.trim().toLowerCase()) ||
      (m.category || '').toLowerCase().includes(searchText.trim().toLowerCase()) ||
      ((m as any).extractedContent || '').toLowerCase().includes(searchText.trim().toLowerCase())
    )
  );

  // 穩定 materialIds 陣列（避免無限重渲染）
  const joinedMaterialIds = filteredMaterials.map(m => m.id).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const materialIds = useMemo(() => filteredMaterials.map(m => m.id), [joinedMaterialIds]);

  // 批次快取覆蓋率查詢
  const { data: batchCacheStats, refetch: refetchBatchCacheStats } = trpc.learningMaterials.getBatchCacheStatus.useQuery(
    { materialIds },
    { enabled: materialIds.length > 0 }
  );

  // 批次上傳 mutation
  const uploadBatchMutation = trpc.learningMaterials.uploadBatch.useMutation({
    onSuccess: () => {
      toast.success("智能解題上傳成功");
      setIsUploadDialogOpen(false);
      setUploadForm({ files: [], category: "其他", customCategory: "", isPublic: true, pointCost: 0, accessMode: 'public' });
      refetch();
    },
    onError: (error) => {
      const msg = error.message || '';
      if (msg.includes('Word 轉 PDF 失敗') || msg.includes('LibreOffice')) {
        toast.error(
          'Word 轉換失敗！可能原因：檔案加密、損毀或格式不支援。建議先在 Word 中另存為 PDF 再上傳。',
          { duration: 8000 }
        );
      } else {
        toast.error(`上傳失敗：${msg}`);
      }
    },
  });

  // 設定班內生驗證碼 mutation
  const setClassCodeMutation = trpc.learningMaterials.setClassCode.useMutation({
    onSuccess: () => {
      toast.success('驗證碼設定成功');
      setClassCodeDialog({ open: false, materialId: 0, currentCode: '' });
      setClassCodeInput('');
      refetch();
    },
    onError: (err) => toast.error(`設定失敗：${err.message}`),
  });

  // 更新 mutation
  const updateMutation = trpc.learningMaterials.update.useMutation({
    onSuccess: () => {
      toast.success("智能解題更新成功");
      setIsEditDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  // 更新題目 mutation
  const updateExtractedQuestionsMutation = trpc.learningMaterials.updateExtractedQuestions.useMutation({
    onSuccess: (data) => {
      toast.success(`題目已儲存！共 ${data.questionCount} 題`);
      setIsSavingQuestions(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`儲存失敗：${error.message}`);
      setIsSavingQuestions(false);
    },
  });

  const handleSaveQuestions = () => {
    setIsSavingQuestions(true);
    updateExtractedQuestionsMutation.mutate({
      id: editForm.id,
      questions: editingQuestions.map(q => ({
        index: q.index,
        type: q.type,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        teacherSolution: q.teacherSolution,
        hasImage: q.hasImage,
      }))
    });
  };

  // 刪除 mutation
  const deleteMutation = trpc.learningMaterials.delete.useMutation({
    onSuccess: () => {
      toast.success("智能解題刪除成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  // 批次向量化全部 mutation
  const batchVectorizeAllMutation = trpc.learningMaterials.batchVectorizeAll.useMutation({
    onSuccess: (result) => {
      setIsBatchVectorizing(false);
      setBatchVectorizeResult(result);
      toast.success(`批次向量化完成！成功 ${result.processed} 份，共 ${result.totalChunks} 片段，跳過 ${result.skipped} 份，失敗 ${result.failed} 份`);
      refetchVectorizeStatus();
    },
    onError: (error) => {
      setIsBatchVectorizing(false);
      toast.error(`批次向量化失敗：${error.message}`);
    },
  });
  const handleBatchVectorizeAll = () => {
    if (isBatchVectorizing) return;
    setIsBatchVectorizing(true);
    setBatchVectorizeResult(null);
    batchVectorizeAllMutation.mutate({});
  };

  // 向量化 mutation
  const vectorizeMutation = trpc.learningMaterials.vectorizeMaterial.useMutation({
    onSuccess: (result, variables) => {
      toast.success(`「${result.documentTitle}」向量化完成！共 ${result.successCount} 個片段已建立`);
      setVectorizingIds(prev => { const s = new Set(prev); s.delete(variables.id); return s; });
      refetchVectorizeStatus();
    },
    onError: (error, variables) => {
      toast.error(`向量化失敗：${error.message}`);
      setVectorizingIds(prev => { const s = new Set(prev); s.delete(variables.id); return s; });
    },
  });

  // 處理向量化
  const handleVectorize = (id: number) => {
    setVectorizingIds(prev => new Set(prev).add(id));
    vectorizeMutation.mutate({ id });
  };

  // 批次刪除 mutation
  const batchDeleteMutation = trpc.learningMaterials.batchDelete.useMutation({
    onSuccess: () => {
      toast.success("批次刪除成功");
      setSelectedMaterials(new Set());
      refetch();
    },
    onError: (error) => {
      toast.error(`批次刪除失敗：${error.message}`);
    },
  });

  // 預生成 AI 解題 mutation
  const preGenerateSolutionsMutation = trpc.learningMaterials.preGenerateSolutions.useMutation();

  // 預生成差異比較 mutation（逐題版，避免部署環境超時）
  const preGenerateDiffSingleMutation = trpc.learningMaterials.preGenerateDiffSingle.useMutation();

  // 處理批次檔案選擇
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // 檢查檔案類型和大小
    for (const file of files) {
      const isWord = file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx');
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf && !isWord) {
        toast.error(`${file.name} 不是 PDF 或 Word 檔案，已跳過`);
        continue;
      }
      if (file.size > 300 * 1024 * 1024) {
        toast.error(`${file.name} 超過 300MB，已跳過`);
        continue;
      }
    }
    
    const validFiles = files.filter((file) => {
      const isWord = file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx');
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      return (isPdf || isWord) && file.size <= 300 * 1024 * 1024;
    });
    
    setUploadForm({ ...uploadForm, files: validFiles });
  };

  // 處理批次上傳
  const handleUpload = async () => {
    if (uploadForm.files.length === 0) {
      toast.error("請選擇要上傳的檔案");
      return;
    }

    const finalCategory = uploadForm.customCategory.trim() || uploadForm.category;

    // 讀取所有檔案為 Base64
    const filePromises = uploadForm.files.map((file) => {
      return new Promise<{ title: string; category: string; fileData: string; fileName: string }>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          const fileData = base64.split(",")[1]; // 移除 data:...; base64, 前綴
          // 移除副檔名作為標題
          const title = file.name.replace(/\.(pdf|docx?|doc)$/i, '');
          resolve({
            title,
            category: finalCategory,
            fileData,
            fileName: file.name, // 傳遞原始檔名供後端判斷是否為 Word
          });
        };
        reader.readAsDataURL(file);
      });
    });

    const files = await Promise.all(filePromises);

    uploadBatchMutation.mutate({
      files,
      isPublic: uploadForm.accessMode !== 'private',
      pointCost: uploadForm.pointCost,
      accessMode: uploadForm.accessMode,
    });
  };

  // 處理編輯 → 跳轉到獨立編輯頁面
  const handleEdit = (material: any) => {
    navigate(`/admin/learning-materials/${material.id}/edit`);
  };

  // AI 建議科目 mutation
  const suggestTitleMutation = trpc.learningMaterials.suggestTitle.useMutation({
    onSuccess: (data) => {
      if (data.suggested) {
        setEditForm((prev) => ({ ...prev, subjectName: data.suggested }));
        toast.success("已帶入 AI 建議科目，可自行修改");
      } else {
        toast.error("無法產生建議科目");
      }
    },
    onError: (error) => {
      toast.error(`AI 建議失敗：${error.message}`);
    },
  });

  // 處理更新
  const handleUpdate = () => {
    if (!editForm.title) {
      toast.error("請填寫標題");
      return;
    }

    updateMutation.mutate({
      id: editForm.id,
      title: editForm.title,
      category: editForm.category,
      isPublic: editForm.accessMode !== 'private',
      subjectName: editForm.subjectName || null,
      pointCost: editForm.pointCost,
      accessMode: editForm.accessMode,
    });
  };

  // 處理刪除
  const handleDelete = (id: number) => {
    if (confirm("確定要刪除這個智能解題嗎？")) {
      deleteMutation.mutate({ id });
    }
  };

  // 批次設定點數 mutation
  const batchUpdatePointCostMutation = trpc.learningMaterials.batchUpdatePointCost.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      setIsBatchPointDialogOpen(false);
      setBatchPointCost(0);
      refetch();
    },
    onError: (error) => {
      toast.error(`批次設定點數失敗：${error.message}`);
    },
  });

  const handleBatchUpdatePointCost = () => {
    if (selectedMaterials.size === 0) {
      toast.error("請先選擇要設定的資料");
      return;
    }
    batchUpdatePointCostMutation.mutate({ ids: Array.from(selectedMaterials), pointCost: batchPointCost });
  };

  // 批次設定公開狀態 mutation
  const batchUpdateAccessModeMutation = trpc.learningMaterials.batchUpdateAccessMode.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      refetch();
    },
    onError: (error) => {
      toast.error(`批次設定失敗：${error.message}`);
    },
  });

  const handleBatchUpdateAccessMode = (accessMode: 'public' | 'class_only' | 'private') => {
    if (selectedMaterials.size === 0) {
      toast.error("請先選擇要設定的資料");
      return;
    }
    batchUpdateAccessModeMutation.mutate({ ids: Array.from(selectedMaterials), accessMode });
  };

  // 批次更改科目和類別 mutation
  const batchUpdateSubjectAndCategoryMutation = trpc.learningMaterials.batchUpdateSubjectAndCategory.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      refetch();
      setBatchSubjectDialog(false);
      setBatchCategoryDialog(false);
    },
    onError: (error) => {
      toast.error(`批次更改失敗：${error.message}`);
    },
  });

  const handleBatchUpdateSubject = () => {
    if (selectedMaterials.size === 0) { toast.error('請先選擇要更改的資料'); return; }
    if (!batchSubjectValue.trim()) { toast.error('請輸入科目名稱'); return; }
    batchUpdateSubjectAndCategoryMutation.mutate({ ids: Array.from(selectedMaterials), subjectName: batchSubjectValue });
  };

  // 重新提取題目 mutation
  const reExtractMutation = trpc.learningMaterials.reExtractQuestions.useMutation({
    onSuccess: (result, variables) => {
      toast.success(`題目提取完成！共解析出 ${result.questionCount} 題`);
      setReExtractingIds(prev => { const s = new Set(prev); s.delete(variables.id); return s; });
      refetch();
    },
    onError: (error, variables) => {
      toast.error(`提取失敗：${error.message}`);
      setReExtractingIds(prev => { const s = new Set(prev); s.delete(variables.id); return s; });
    },
  });

  const handleReExtract = (id: number) => {
    setReExtractingIds(prev => new Set(prev).add(id));
    reExtractMutation.mutate({ id });
  };

  // 排隊批次解析（一個一個依序執行）
  const handleBatchReExtract = async () => {
    if (selectedMaterials.size === 0) { toast.error('請先選擇要解析的資料'); return; }
    const ids = Array.from(selectedMaterials);
    const titles = new Map(filteredMaterials.map(m => [m.id, m.title]));
    const total = ids.length;
    let cancelled = false;
    setBatchExtractCancelled(false);

    // 將取消標記注入閉包
    const cancelRef = { cancelled: false };

    setBatchExtractProgress({ current: 0, total, currentTitle: '' });
    toast.info(`開始排隊解析 ${total} 個檔案...`);

    for (let i = 0; i < ids.length; i++) {
      if (cancelRef.cancelled) {
        toast.warning(`已取消，共完成 ${i} / ${total} 個`);
        setBatchExtractProgress(null);
        setReExtractingIds(new Set());
        return;
      }
      const id = ids[i];
      const title = titles.get(id) || `ID:${id}`;
      setBatchExtractProgress({ current: i + 1, total, currentTitle: title });
      setReExtractingIds(prev => new Set(prev).add(id));

      try {
        await new Promise<void>((resolve, reject) => {
          reExtractMutation.mutate({ id }, {
            onSuccess: () => resolve(),
            onError: (err) => reject(err),
          });
        });
      } catch (err: any) {
        toast.error(`「${title}」解析失敗：${err?.message || '未知錯誤'}，繼續下一個...`);
      }
      setReExtractingIds(prev => { const s = new Set(prev); s.delete(id); return s; });

      // 對外暴露取消方法
      (handleBatchReExtract as any)._cancelRef = cancelRef;
    }

    setBatchExtractProgress(null);
    refetch();
    toast.success(`批次解析完成！共處理 ${total} 個檔案`);
  };

  const handleBatchUpdateCategory = () => {
    if (selectedMaterials.size === 0) { toast.error('請先選擇要更改的資料'); return; }
    batchUpdateSubjectAndCategoryMutation.mutate({ ids: Array.from(selectedMaterials), category: batchCategoryValue });
  };

  // 批次預生成 AI 解題
  const handleBatchPreSolve = async () => {
    if (selectedMaterials.size === 0) { toast.error('請先選擇要預生成的資料'); return; }
    const ids = Array.from(selectedMaterials);
    const titles = new Map(filteredMaterials.map(m => [m.id, m.title]));
    const total = ids.length;
    const cancelRef = { cancelled: false };
    (handleBatchPreSolve as any)._cancelRef = cancelRef;
    setBatchPreSolveProgress({ current: 0, total, currentTitle: '' });
    toast.info(`開始批次預生成 AI 解題，共 ${total} 份...`);
    let successCount = 0;
    let skipCount = 0;
    for (let i = 0; i < ids.length; i++) {
      if (cancelRef.cancelled) {
        toast.warning(`已取消，共完成 ${i} / ${total} 份`);
        setBatchPreSolveProgress(null);
        return;
      }
      const id = ids[i];
      const title = titles.get(id) || `ID:${id}`;
      setBatchPreSolveProgress({ current: i + 1, total, currentTitle: title });
      try {
        const result = await new Promise<{ generated: number; skipped: number }>((resolve, reject) => {
          preGenerateSolutionsMutation.mutate({ materialId: id, forceRegenerate: !skipExistingSolve }, {
            onSuccess: (r) => resolve({ generated: r.generated, skipped: r.skipped }),
            onError: (err) => reject(err),
          });
        });
        successCount += result.generated;
        skipCount += result.skipped;
      } catch (err: any) {
        toast.error(`「${title}」失敗：${err?.message || '未知錯誤'}，繼續下一個...`);
      }
    }
    setBatchPreSolveProgress(null);
    refetch();
    refetchBatchCacheStats();
    toast.success(`批次預生成 AI 解題完成！新生成 ${successCount} 題，跳過 ${skipCount} 題`);
  };

  // 批次預生成差異比較
  const handleBatchPreDiff = async () => {
    if (selectedMaterials.size === 0) { toast.error('請先選擇要預生成的資料'); return; }
    const ids = Array.from(selectedMaterials);
    const titles = new Map(filteredMaterials.map(m => [m.id, m.title]));
    // 建立 materialId -> questions 的映射
    const materialQuestionsMap = new Map(
      filteredMaterials
        .filter(m => ids.includes(m.id))
        .map(m => {
          const qs = Array.isArray((m as any).extractedQuestions)
            ? (m as any).extractedQuestions as any[]
            : (typeof (m as any).extractedQuestions === 'string'
              ? JSON.parse((m as any).extractedQuestions)
              : []);
          return [m.id, (qs || []).filter((q: any) => q.teacherSolution)];
        })
    );
    // 計算總題數
    const totalQuestions = ids.reduce((sum, id) => sum + (materialQuestionsMap.get(id)?.length || 0), 0);
    const total = ids.length;
    const cancelRef = { cancelled: false };
    (handleBatchPreDiff as any)._cancelRef = cancelRef;
    setBatchPreDiffProgress({ current: 0, total, currentTitle: '' });
    toast.info(`開始批次預生成差異比較，共 ${total} 份（${totalQuestions} 題有老師解答）...`);
    let successCount = 0;
    let skipCount = 0;
    for (let i = 0; i < ids.length; i++) {
      if (cancelRef.cancelled) {
        toast.warning(`已取消，共完成 ${i} / ${total} 份`);
        setBatchPreDiffProgress(null);
        return;
      }
      const id = ids[i];
      const title = titles.get(id) || `ID:${id}`;
      const questions = materialQuestionsMap.get(id) || [];
      setBatchPreDiffProgress({ current: i + 1, total, currentTitle: title });
      // 逐題呼叫，避免超時
      for (const q of questions) {
        if (cancelRef.cancelled) break;
        try {
          const result = await preGenerateDiffSingleMutation.mutateAsync({
            materialId: id,
            questionIndex: q.index,
            forceRegenerate: !skipExistingDiff,
          });
          successCount += result.generated;
          skipCount += result.skipped;
        } catch (err: any) {
          console.error(`「${title}」第 ${q.index} 題差異比較失敗:`, err);
          skipCount++;
        }
      }
      if (questions.length === 0) {
        toast.info(`「${title}」無老師解答，跳過`);
      }
    }
    setBatchPreDiffProgress(null);
    refetch();
    refetchBatchCacheStats();
    toast.success(`批次預生成差異比較完成！新生成 ${successCount} 題，跳過 ${skipCount} 題`);
  };

  // 處理批次刪除
  const handleBatchDelete = () => {
    if (selectedMaterials.size === 0) {
      toast.error("請先選擇要刪除的資料");
      return;
    }

    if (confirm(`確定要刪除選中的 ${selectedMaterials.size} 個智能解題嗎？`)) {
      batchDeleteMutation.mutate({ ids: Array.from(selectedMaterials) });
    }
  };

  // 切換選擇
  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedMaterials);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMaterials(newSelected);
  };

  // 全選/取消全選（只針對篩選後的資料）
  const toggleSelectAll = () => {
    const filteredIds = filteredMaterials.map(m => m.id);
    const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedMaterials.has(id));
    if (allFilteredSelected) {
      // 取消全選：只取消篩選後的資料，保留其他已選的
      const newSelected = new Set(selectedMaterials);
      filteredIds.forEach(id => newSelected.delete(id));
      setSelectedMaterials(newSelected);
    } else {
      // 全選：只選取篩選後的資料
      const newSelected = new Set(selectedMaterials);
      filteredIds.forEach(id => newSelected.add(id));
      setSelectedMaterials(newSelected);
    }
  };

  // 分類圖標
  const getCategoryIcon = (category: Category) => {
    switch (category) {
      case "lecture":
        return <BookOpen className="w-5 h-5" />;
      case "exam":
        return <FileText className="w-5 h-5" />;
      case "course":
        return <GraduationCap className="w-5 h-5" />;
      default:
        return <FolderOpen className="w-5 h-5" />;
    }
  };

  // 分類名稱
  const getCategoryName = (category: Category) => {
    switch (category) {
      case "lecture":
        return "講義";
      case "exam":
        return "考題";
      case "course":
        return "課程";
      default:
        return "其他";
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">智能解題管理</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsUploadDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            上傳資料
          </Button>
          {(() => {
            const unvectorizedCount = vectorizeStatusData
              ? vectorizeStatusData.statusList.filter(s => !s.isVectorized).length
              : null;
            return (
              <Button
                variant="outline"
                onClick={handleBatchVectorizeAll}
                disabled={isBatchVectorizing || unvectorizedCount === 0}
                className={unvectorizedCount && unvectorizedCount > 0 ? 'border-orange-500 text-orange-600 hover:bg-orange-50' : 'border-gray-300 text-gray-400'}
              >
                <Layers className="w-4 h-4 mr-2" />
                {isBatchVectorizing ? (
                  <span className="flex items-center gap-1">
                    <span className="animate-spin">⚡</span> 向量化中...
                  </span>
                ) : unvectorizedCount === 0 ? (
                  '全部已向量化 ✓'
                ) : (
                  `一鍵向量化未處理 (${unvectorizedCount ?? '...'})`
                )}
              </Button>
            );
          })()}
          {selectedMaterials.size > 0 && (
            <div className="flex flex-col gap-2 items-end">
              {/* 第一行：一般批次操作 */}
              <div className="flex gap-2 flex-wrap justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={batchUpdateAccessModeMutation.isPending}>
                    <Globe className="w-4 h-4 mr-2" />
                    {batchUpdateAccessModeMutation.isPending ? '設定中...' : `批次公開狀態 (${selectedMaterials.size})`}
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleBatchUpdateAccessMode('public')}>
                    <Globe className="w-4 h-4 mr-2 text-green-600" />
                    🌍 公開
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBatchUpdateAccessMode('class_only')}>
                    <Users className="w-4 h-4 mr-2 text-blue-600" />
                    🏫 限班內生
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBatchUpdateAccessMode('private')}>
                    <Lock className="w-4 h-4 mr-2 text-gray-600" />
                    🔒 不公開
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" onClick={() => { setBatchSubjectValue(''); setBatchSubjectDialog(true); }}>
                📚 批次更改科目 ({selectedMaterials.size})
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    📂 批次更改類別 ({selectedMaterials.size})
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => batchUpdateSubjectAndCategoryMutation.mutate({ ids: Array.from(selectedMaterials), category: 'lecture' })}>
                    <BookOpen className="w-4 h-4 mr-2 text-blue-600" /> 講義
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => batchUpdateSubjectAndCategoryMutation.mutate({ ids: Array.from(selectedMaterials), category: 'exam' })}>
                    <FileText className="w-4 h-4 mr-2 text-green-600" /> 考題
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => batchUpdateSubjectAndCategoryMutation.mutate({ ids: Array.from(selectedMaterials), category: 'course' })}>
                    <GraduationCap className="w-4 h-4 mr-2 text-purple-600" /> 課程
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => batchUpdateSubjectAndCategoryMutation.mutate({ ids: Array.from(selectedMaterials), category: 'other' })}>
                    <FolderOpen className="w-4 h-4 mr-2 text-gray-600" /> 其他
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" onClick={() => setIsBatchPointDialogOpen(true)}>
                💰 批次設定點數 ({selectedMaterials.size})
              </Button>
              <Button
                variant="outline"
                onClick={batchExtractProgress ? () => { (handleBatchReExtract as any)._cancelRef && ((handleBatchReExtract as any)._cancelRef.cancelled = true); } : handleBatchReExtract}
                disabled={false}
                className={batchExtractProgress ? 'border-red-400 text-red-600 hover:bg-red-50' : 'border-purple-400 text-purple-700 hover:bg-purple-50'}
              >
                {batchExtractProgress ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    取消解析 ({batchExtractProgress.current}/{batchExtractProgress.total})
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    批次排隊解析題目 ({selectedMaterials.size})
                  </>
                )}
              </Button>
              </div>
              {/* 第二行： AI 預生成操作（含 checkbox） */}
              <div className="flex gap-2 flex-wrap justify-end items-center">
                {/* AI 解題按鈕 + checkbox */}
                <label className="flex items-center gap-1 text-xs text-orange-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={skipExistingSolve}
                    onChange={(e) => setSkipExistingSolve(e.target.checked)}
                    className="w-3 h-3 accent-orange-500"
                  />
                  僅未生成
                </label>
                <Button
                  variant="outline"
                  onClick={batchPreSolveProgress
                    ? () => { (handleBatchPreSolve as any)._cancelRef && ((handleBatchPreSolve as any)._cancelRef.cancelled = true); }
                    : handleBatchPreSolve
                  }
                  disabled={false}
                  className={batchPreSolveProgress ? 'border-red-400 text-red-600 hover:bg-red-50' : 'border-orange-400 text-orange-700 hover:bg-orange-50'}
                >
                  {batchPreSolveProgress ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      取消 AI 解題 ({batchPreSolveProgress.current}/{batchPreSolveProgress.total})
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      批次預生成 AI 解題 ({selectedMaterials.size})
                    </>
                  )}
                </Button>
                {/* 差異比較按鈕 + checkbox */}
                <label className="flex items-center gap-1 text-xs text-teal-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={skipExistingDiff}
                    onChange={(e) => setSkipExistingDiff(e.target.checked)}
                    className="w-3 h-3 accent-teal-500"
                  />
                  僅未生成
                </label>
                <Button
                  variant="outline"
                  onClick={batchPreDiffProgress
                    ? () => { (handleBatchPreDiff as any)._cancelRef && ((handleBatchPreDiff as any)._cancelRef.cancelled = true); }
                    : handleBatchPreDiff
                  }
                  disabled={false}
                  className={batchPreDiffProgress ? 'border-red-400 text-red-600 hover:bg-red-50' : 'border-teal-400 text-teal-700 hover:bg-teal-50'}
                >
                  {batchPreDiffProgress ? (
                    <>
                      <Zap className="w-4 h-4 mr-2 animate-spin" />
                      取消差異比較 ({batchPreDiffProgress.current}/{batchPreDiffProgress.total})
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      批次預生成差異比較 ({selectedMaterials.size})
                    </>
                  )}
                </Button>
                <Button variant="destructive" onClick={handleBatchDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  批次刪除 ({selectedMaterials.size})
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 批次解析進度條 */}
      {batchExtractProgress && (
        <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-3">
          <RefreshCw className="w-4 h-4 text-purple-600 animate-spin flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-purple-700">
                AI 解析題目中... {batchExtractProgress.current} / {batchExtractProgress.total}
              </span>
              <span className="text-xs text-purple-500">{Math.round(batchExtractProgress.current / batchExtractProgress.total * 100)}%</span>
            </div>
            <div className="w-full bg-purple-100 rounded-full h-1.5">
              <div
                className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${batchExtractProgress.current / batchExtractProgress.total * 100}%` }}
              />
            </div>
            {batchExtractProgress.currentTitle && (
              <p className="text-xs text-purple-500 mt-1 truncate">目前：{batchExtractProgress.currentTitle}</p>
            )}
          </div>
        </div>
      )}

      {/* 批次預生成 AI 解題進度條 */}
      {batchPreSolveProgress && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-orange-600 animate-spin flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-orange-700">
                預生成 AI 解題中... {batchPreSolveProgress.current} / {batchPreSolveProgress.total}
              </span>
              <span className="text-xs text-orange-500">{Math.round(batchPreSolveProgress.current / batchPreSolveProgress.total * 100)}%</span>
            </div>
            <div className="w-full bg-orange-100 rounded-full h-1.5">
              <div
                className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${batchPreSolveProgress.current / batchPreSolveProgress.total * 100}%` }}
              />
            </div>
            {batchPreSolveProgress.currentTitle && (
              <p className="text-xs text-orange-500 mt-1 truncate">目前：{batchPreSolveProgress.currentTitle}</p>
            )}
          </div>
        </div>
      )}

      {/* 批次預生成差異比較進度條 */}
      {batchPreDiffProgress && (
        <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-lg flex items-center gap-3">
          <Zap className="w-4 h-4 text-teal-600 animate-spin flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-teal-700">
                預生成差異比較中... {batchPreDiffProgress.current} / {batchPreDiffProgress.total}
              </span>
              <span className="text-xs text-teal-500">{Math.round(batchPreDiffProgress.current / batchPreDiffProgress.total * 100)}%</span>
            </div>
            <div className="w-full bg-teal-100 rounded-full h-1.5">
              <div
                className="bg-teal-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${batchPreDiffProgress.current / batchPreDiffProgress.total * 100}%` }}
              />
            </div>
            {batchPreDiffProgress.currentTitle && (
              <p className="text-xs text-teal-500 mt-1 truncate">目前：{batchPreDiffProgress.currentTitle}</p>
            )}
          </div>
        </div>
      )}

      {/* 分類篩選 + 搜尋 */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            onClick={() => setSelectedCategory("all")}
          >
            全部
          </Button>
          {categoriesData?.categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
        <div className="relative">
          <Input
            placeholder="搜尋標題關鍵字..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          {searchText && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchText('')}
            >×</button>
          )}
        </div>
      </div>

      {/* 資料列表 */}
      {(() => {
        return isLoading ? (
          <div className="text-center py-12">載入中...</div>
        ) : filteredMaterials.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchText ? `找不到包含「${searchText}」的資料` : '尚無智能解題，請點擊「上傳資料」開始上傳'}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                checked={filteredMaterials.length > 0 && filteredMaterials.every(m => selectedMaterials.has(m.id))}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">全選（共 {filteredMaterials.length} 筆）</span>
            </div>
          {filteredMaterials.map((material) => {
            return <div
              key={material.id}
              className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <Checkbox
                checked={selectedMaterials.has(material.id)}
                onCheckedChange={() => toggleSelect(material.id)}
              />
              <div className="flex items-center gap-2">
                {getCategoryIcon(material.category)}
                <span className="text-sm text-muted-foreground">{getCategoryName(material.category)}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{material.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {material.subjectName && (
                    <span className="inline-block bg-blue-50 text-blue-700 text-xs px-1.5 py-0.5 rounded mr-1.5 font-medium border border-blue-100">{material.subjectName}</span>
                  )}
                  {(() => {
                    const mode = (material as any).accessMode || (material.isPublic ? 'public' : 'private');
                    if (mode === 'class_only') return <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-700 text-xs px-1.5 py-0.5 rounded border border-amber-200 mr-1">🏫 限班內生</span>;
                    if (mode === 'private') return <span className="inline-flex items-center gap-0.5 bg-gray-50 text-gray-600 text-xs px-1.5 py-0.5 rounded border border-gray-200 mr-1">🔒 不公開</span>;
                    return <span className="inline-flex items-center gap-0.5 bg-green-50 text-green-700 text-xs px-1.5 py-0.5 rounded border border-green-200 mr-1">✅ 公開</span>;
                  })()}
                  {material.pointCost > 0 ? (
                    <span className="inline-flex items-center gap-0.5 bg-orange-50 text-orange-700 text-xs px-1.5 py-0.5 rounded border border-orange-200 mr-1">💰 {material.pointCost} 點</span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 text-xs px-1.5 py-0.5 rounded border border-emerald-200 mr-1">🆓 免費</span>
                  )}
                  {(material as any).purchaseCount > 0 && (
                    <span className="inline-flex items-center gap-0.5 bg-blue-50 text-blue-700 text-xs px-1.5 py-0.5 rounded border border-blue-200 mr-1">👤 {(material as any).purchaseCount} 人購課</span>
                  )}
                  {material.pageCount > 0 && <>{material.pageCount} 頁 • </>}{new Date(material.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2 items-center">
                {/* 快取覆蓋率標籤 */}
                {batchCacheStats?.stats[material.id] && batchCacheStats.stats[material.id].total > 0 && (
                  <>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-xs text-amber-700 font-medium border border-amber-200" title="AI 解題快取覆蓋率">
                      🤖 {batchCacheStats.stats[material.id].solutionCount}/{batchCacheStats.stats[material.id].total}
                    </span>
                    {(batchCacheStats.stats[material.id] as any).diffTotal > 0 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-xs text-blue-700 font-medium border border-blue-200" title="差異比較快取覆蓋率（分母為有老師解答的題數）">
                        🔍 {batchCacheStats.stats[material.id].diffCount}/{(batchCacheStats.stats[material.id] as any).diffTotal}
                      </span>
                    )}
                  </>
                )}
                {/* 向量化狀態標識 */}
                {vectorizeStatusMap.get(material.id)?.isVectorized ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-xs text-green-700 font-medium border border-green-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    已向量化 · {vectorizeStatusMap.get(material.id)?.chunkCount} 片段
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-xs text-orange-600 font-medium border border-orange-200">
                    <Zap className="w-3 h-3" />
                    未向量化
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVectorize(material.id)}
                  disabled={vectorizingIds.has(material.id)}
                  title="向量化此文件（讓 AI 可以搜尋此教材）"
                >
                  <Zap className={`w-4 h-4 ${vectorizingIds.has(material.id) ? 'animate-pulse text-yellow-500' : 'text-blue-500'}`} />
                </Button>
{(material as any).accessMode === 'class_only' && (
                  <Button
                    variant="outline"
                    size="sm"
                    title="設定班內生驗證碼"
                    onClick={() => {
                      setClassCodeDialog({ open: true, materialId: material.id, currentCode: (material as any).classCode || '' });
                      setClassCodeInput((material as any).classCode || '');
                    }}
                  >
                    <KeyRound className="w-4 h-4 text-blue-500" />
                  </Button>
                )}
                {/* 補提取題目按鈕 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReExtract(material.id)}
                  disabled={reExtractingIds.has(material.id)}
                  title={(() => {
                    const q = (material as any).extractedQuestions;
                    const count = Array.isArray(q) ? q.length : (q ? JSON.parse(q).length : 0);
                    return count > 0 ? `重新提取題目（目前已有 ${count} 題）` : '補提取題目（尚未提取）';
                  })()}
                  className={(() => {
                    const q = (material as any).extractedQuestions;
                    const count = Array.isArray(q) ? q.length : (q ? (() => { try { return JSON.parse(q).length; } catch { return 0; } })() : 0);
                    return count > 0 ? '' : 'border-amber-400 text-amber-600 hover:bg-amber-50';
                  })()}
                >
                  {reExtractingIds.has(material.id) ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleEdit(material)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(material.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          })}
        </div>
        );
      })()}

      {/* 上傳對話框 */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>上傳智能解題</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">分類 *</label>
              <Select
                value={uploadForm.category}
                onValueChange={(value: Category) => setUploadForm({ ...uploadForm, category: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoriesData?.categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">自訂分類（可選）</label>
              <Input
                value={uploadForm.customCategory}
                onChange={(e) => setUploadForm({ ...uploadForm, customCategory: e.target.value })}
                placeholder="輸入新的分類名稱，留空則使用上方選擇的分類"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">PDF / Word 檔案 *（支援批次選擇）</label>
              <Input 
                type="file" 
                accept=".pdf,.doc,.docx,application/pdf" 
                multiple 
                onChange={handleFileChange} 
                className="mt-1" 
              />
              <p className="text-xs text-muted-foreground mt-1">支援 .pdf / .doc / .docx，Word 檔案會自動轉換為 PDF</p>
              {uploadForm.files.length > 0 && (
                <div className="text-sm text-muted-foreground mt-2">
                  <p className="mb-1">已選擇 {uploadForm.files.length} 個檔案（共 {(uploadForm.files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(1)} MB）：</p>
                  <div className="max-h-40 overflow-y-auto border rounded p-2 bg-gray-50 space-y-0.5">
                    {uploadForm.files.map((file, index) => (
                      <p key={index} className="text-xs truncate">
                        • {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">付費點數</label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  min={0}
                  max={9999}
                  value={uploadForm.pointCost}
                  onChange={(e) => setUploadForm({ ...uploadForm, pointCost: parseInt(e.target.value) || 0 })}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">點（0 = 免費）</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">學生需消耗此點數才能解鎖查看此資料</p>
            </div>
            <div>
              <label className="text-sm font-medium">開放狀態</label>
              <div className="flex gap-2 mt-1">
                {[{ value: 'public', label: '🌍 公開' }, { value: 'class_only', label: '🏫 限班內生' }, { value: 'private', label: '🔒 不公開' }].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setUploadForm({ ...uploadForm, accessMode: opt.value as any })}
                    className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                      uploadForm.accessMode === opt.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:bg-muted'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpload} disabled={uploadBatchMutation.isPending}>
              {uploadBatchMutation.isPending ? (
                uploadForm.files.some(f => f.name.toLowerCase().endsWith('.doc') || f.name.toLowerCase().endsWith('.docx'))
                  ? 'Word 轉換中，請稍候（10-30 秒）...'
                  : '上傳中...'
              ) : '上傳'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編輯對話框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-3 border-b flex-shrink-0">
            <DialogTitle className="text-lg">編輯智能解題</DialogTitle>
          </DialogHeader>
          <div className="flex flex-1 overflow-hidden">
            {/* 左側：基本資訊 */}
            <div className="w-80 flex-shrink-0 border-r overflow-y-auto p-5 space-y-4">
              {editForm.fileUrl && (
                <div>
                  <label className="text-sm font-medium">PDF 預覽</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(editForm.fileUrl, '_blank')}
                    className="h-7 text-xs gap-1 mt-1 w-full"
                  >
                    <Eye className="h-3 w-3" />
                    開新分頁預覽
                  </Button>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">標題 *</label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="請輸入資料標題"
                  className="mt-1"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">科目名稱</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => suggestTitleMutation.mutate({ materialId: editForm.id })}
                    disabled={suggestTitleMutation.isPending}
                    className="h-7 text-xs gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    {suggestTitleMutation.isPending ? "AI 分析中..." : "AI 建議"}
                  </Button>
                </div>
                <Input
                  value={editForm.subjectName}
                  onChange={(e) => setEditForm({ ...editForm, subjectName: e.target.value })}
                  placeholder="例如：心理學、行政法"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">分類 *</label>
                <Select
                  value={editForm.category}
                  onValueChange={(value: Category) => setEditForm({ ...editForm, category: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lecture">講義</SelectItem>
                    <SelectItem value="exam">考題</SelectItem>
                    <SelectItem value="course">課程</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">付費點數</label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    min={0}
                    max={9999}
                    value={editForm.pointCost}
                    onChange={(e) => setEditForm({ ...editForm, pointCost: parseInt(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">點（0=免費）</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">開放狀態</label>
                <div className="flex flex-col gap-1.5 mt-1">
                  {[{ value: 'public', label: '🌍 公開' }, { value: 'class_only', label: '🏫 限班內生' }, { value: 'private', label: '🔒 不公開' }].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, accessMode: opt.value as any })}
                      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                        editForm.accessMode === opt.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:bg-muted'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t space-y-2">
                <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="w-full">
                  {updateMutation.isPending ? "更新中..." : "儲存基本資訊"}
                </Button>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full">
                  關閉
                </Button>
              </div>
            </div>

            {/* 右側：題目詳細列表 */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">📝 已拆解題目</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {editingQuestions.length > 0 ? `共 ${editingQuestions.length} 題` : '尚未提取'}
                  </span>
                </div>
                {editingQuestions.length > 0 && (
                  <Button
                    size="sm"
                    onClick={handleSaveQuestions}
                    disabled={isSavingQuestions}
                    className="h-8 text-xs"
                  >
                    {isSavingQuestions ? '儲存中...' : '💾 儲存題目修改'}
                  </Button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {editingQuestions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                    <div className="text-4xl">📚</div>
                    <p className="text-sm">尚未提取題目，請先點擊列表中的「🔄 補提取題目」按鈕</p>
                  </div>
                ) : (
                  editingQuestions.map((q, qi) => (
                    <div key={qi} className="border rounded-lg p-4 bg-background space-y-3">
                      {/* 題目標頭 */}
                      <div className="flex items-center gap-2">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">{q.index}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          q.type === 'choice' ? 'bg-green-100 text-green-700' :
                          q.type === 'drawing' ? 'bg-purple-100 text-purple-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {q.type === 'choice' ? '選擇題' : q.type === 'drawing' ? '畫圖題' : '簡答題'}
                        </span>
                        {q.hasImage && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">🖼️ 含圖片</span>}
                      </div>

                      {/* 題目內容 */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">題目內容</label>
                        <textarea
                          value={q.questionText}
                          onChange={(e) => {
                            const updated = [...editingQuestions];
                            updated[qi] = { ...updated[qi], questionText: e.target.value };
                            setEditingQuestions(updated);
                          }}
                          className="w-full mt-1 text-sm border rounded-md p-2 min-h-[80px] resize-y bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="題目內容..."
                        />
                      </div>

                      {/* 選項（選擇題） */}
                      {q.type === 'choice' && q.options && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">選項</label>
                          <div className="mt-1 space-y-1.5">
                            {q.options.map((opt, oi) => (
                              <div key={oi} className="flex items-start gap-2">
                                <span className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-bold mt-0.5 ${
                                  q.correctAnswer === String.fromCharCode(65 + oi)
                                    ? 'bg-green-500 text-white'
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                  {String.fromCharCode(65 + oi)}
                                </span>
                                <textarea
                                  value={opt}
                                  onChange={(e) => {
                                    const updated = [...editingQuestions];
                                    const newOptions = [...(updated[qi].options || [])];
                                    newOptions[oi] = e.target.value;
                                    updated[qi] = { ...updated[qi], options: newOptions };
                                    setEditingQuestions(updated);
                                  }}
                                  className="flex-1 text-sm border rounded p-1.5 min-h-[36px] resize-y bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                  rows={1}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 正確答案 */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-xs font-medium text-muted-foreground">正確答案</label>
                          <div className="flex items-center gap-2 mt-1">
                            {q.type === 'choice' ? (
                              <div className="flex gap-1">
                                {['A','B','C','D','E'].slice(0, q.options?.length || 4).map(letter => (
                                  <button
                                    key={letter}
                                    type="button"
                                    onClick={() => {
                                      const updated = [...editingQuestions];
                                      updated[qi] = { ...updated[qi], correctAnswer: letter };
                                      setEditingQuestions(updated);
                                    }}
                                    className={`w-8 h-8 rounded font-bold text-sm border transition-colors ${
                                      q.correctAnswer === letter
                                        ? 'bg-green-500 text-white border-green-500'
                                        : 'bg-background border-border hover:bg-green-50 hover:border-green-300'
                                    }`}
                                  >
                                    {letter}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <Input
                                value={q.correctAnswer || ''}
                                onChange={(e) => {
                                  const updated = [...editingQuestions];
                                  updated[qi] = { ...updated[qi], correctAnswer: e.target.value };
                                  setEditingQuestions(updated);
                                }}
                                placeholder="輸入答案..."
                                className="text-sm h-8"
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 老師解答 */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">老師解答 / 解析</label>
                        <textarea
                          value={q.teacherSolution || ''}
                          onChange={(e) => {
                            const updated = [...editingQuestions];
                            updated[qi] = { ...updated[qi], teacherSolution: e.target.value };
                            setEditingQuestions(updated);
                          }}
                          className="w-full mt-1 text-sm border rounded-md p-2 min-h-[60px] resize-y bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="老師解答或詳細解析..."
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 批次設定點數 Dialog */}
      <Dialog open={isBatchPointDialogOpen} onOpenChange={setIsBatchPointDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批次設定附費點數</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              將選中的 <span className="font-semibold text-foreground">{selectedMaterials.size}</span> 份資料的附費點數統一設為：
            </p>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                max={9999}
                value={batchPointCost}
                onChange={(e) => setBatchPointCost(Number(e.target.value))}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">點（0 = 免費）</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchPointDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleBatchUpdatePointCost}
              disabled={batchUpdatePointCostMutation.isPending}
            >
              {batchUpdatePointCostMutation.isPending ? "設定中..." : "確認設定"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批次更改科目 Dialog */}
      <Dialog open={batchSubjectDialog} onOpenChange={setBatchSubjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批次更改科目名稱</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              將選中的 <span className="font-semibold text-foreground">{selectedMaterials.size}</span> 份資料的科目名稱統一設為：
            </p>
            <Input
              placeholder="輸入科目名稱（如：資訊類科、行政法、地方自治法…）"
              value={batchSubjectValue}
              onChange={(e) => setBatchSubjectValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBatchUpdateSubject()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchSubjectDialog(false)}>取消</Button>
            <Button
              onClick={handleBatchUpdateSubject}
              disabled={batchUpdateSubjectAndCategoryMutation.isPending || !batchSubjectValue.trim()}
            >
              {batchUpdateSubjectAndCategoryMutation.isPending ? '更改中...' : '確認更改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 班級密碼設定 Dialog */}
      <Dialog open={classCodeDialog.open} onOpenChange={(open) => !open && setClassCodeDialog({ open: false, materialId: 0, currentCode: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-500" />
              設定班級密碼
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">學員需輸入「學員編號」 + 「此密碼」才能存取此班內生專用資料。留空則不需要密碼。</p>
            <div className="space-y-1">
              <label className="text-sm font-medium">班級密碼</label>
              <Input
                placeholder="請輸入密碼（留空則不需要密碼）"
                value={classCodeInput}
                onChange={e => setClassCodeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && setClassCodeMutation.mutate({ id: classCodeDialog.materialId, classCode: classCodeInput.trim() || null })}
              />
            </div>
            {classCodeDialog.currentCode && (
              <p className="text-xs text-muted-foreground">目前密碼：<span className="font-mono font-bold">{classCodeDialog.currentCode}</span></p>
            )}
            <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700">
              💡 設定後，將此密碼告知班內學員。學員點擊資料時需輸入「學員編號」和「班級密碼」才能進入。驗證成功後 <strong>3 天內</strong>有效，換電腦不需重新驗證。
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClassCodeDialog({ open: false, materialId: 0, currentCode: '' })}>取消</Button>
            <Button
              onClick={() => setClassCodeMutation.mutate({ id: classCodeDialog.materialId, classCode: classCodeInput.trim() || null })}
              disabled={setClassCodeMutation.isPending}
            >
              {setClassCodeMutation.isPending ? '設定中...' : '儲存密碼'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
