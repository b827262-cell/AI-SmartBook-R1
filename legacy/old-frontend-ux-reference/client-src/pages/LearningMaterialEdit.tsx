/**
 * 智能解題編輯頁面（管理者專用）
 * 獨立全頁面：左側基本資訊，右側完整題目列表（支援富文本 + 圖片貼上 + 以圖生圖）
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Eye, Sparkles, Save, ImageIcon, Wand2, Loader2, Upload, Plus, X, Bot, PanelLeftOpen, PanelLeftClose, GitCompare, RefreshCw } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import { Streamdown } from "streamdown";

type Category = string;

type EditableQuestion = {
  index: number;
  type: "choice" | "short_answer" | "drawing";
  questionText: string;
  options: string[] | null;
  correctAnswer: string | null;
  teacherSolution: string | null;
  questionImages: string[]; // 題目圖片 URL
  solutionImages: string[]; // 多張解析圖 URL
  hasImage: boolean;
};

// ─────────────────────────────────────────────
// 多圖上傳元件（支援 Ctrl+V 貼圖、點擊上傳、以圖生圖）
// ─────────────────────────────────────────────
function MultiImageUploader({
  images,
  onImagesChange,
  uploadMutation,
  redrawMutation,
}: {
  images: string[];
  onImagesChange: (urls: string[]) => void;
  uploadMutation: ReturnType<typeof trpc.learningMaterials.uploadImage.useMutation>;
  redrawMutation: ReturnType<typeof trpc.learningMaterials.redrawImage.useMutation>;
}) {
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [redrawingIdx, setRedrawingIdx] = useState<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (idx: number) => {
    setDraggingIdx(idx);
  };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (draggingIdx === null || draggingIdx === dropIdx) {
      setDraggingIdx(null);
      setDragOverIdx(null);
      return;
    }
    const updated = [...images];
    const [moved] = updated.splice(draggingIdx, 1);
    updated.splice(dropIdx, 0, moved);
    onImagesChange(updated);
    setDraggingIdx(null);
    setDragOverIdx(null);
  };
  const handleDragEnd = () => {
    setDraggingIdx(null);
    setDragOverIdx(null);
  };

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        if (!base64) { resolve(null); return; }
        try {
          const result = await uploadMutation.mutateAsync({ base64, mimeType: file.type });
          resolve(result.url || null);
        } catch {
          resolve(null);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [uploadMutation]);

  // Ctrl+V 貼圖（聚焦在容器時）
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (!file) continue;
        const newIdx = images.length;
        setUploadingIdx(newIdx);
        const url = await uploadFile(file);
        setUploadingIdx(null);
        if (url) {
          onImagesChange([...images, url]);
          toast.success("截圖已上傳");
        } else {
          toast.error("上傳失敗");
        }
        break;
      }
    }
  }, [images, uploadFile, onImagesChange]);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const newIdx = images.length + i;
      setUploadingIdx(newIdx);
      const url = await uploadFile(files[i]);
      if (url) newUrls.push(url);
    }
    setUploadingIdx(null);
    if (newUrls.length > 0) {
      onImagesChange([...images, ...newUrls]);
      toast.success(`已上傳 ${newUrls.length} 張圖片`);
    }
  };

  const handleRedraw = async (idx: number) => {
    const url = images[idx];
    if (!url) return;
    setRedrawingIdx(idx);
    try {
      const result = await redrawMutation.mutateAsync({ imageUrl: url });
      if (result.url) {
        const updated = [...images];
        updated[idx] = result.url;
        onImagesChange(updated);
        toast.success("以圖生圖完成！");
      }
    } catch (e: any) {
      toast.error(`以圖生圖失敗：${e.message}`);
    } finally {
      setRedrawingIdx(null);
    }
  };

  const handleRemove = (idx: number) => {
    const updated = images.filter((_, i) => i !== idx);
    onImagesChange(updated);
  };

  return (
    <div
      ref={containerRef}
      className="space-y-2 border-2 border-dashed rounded-lg p-3 focus-within:border-primary transition-colors"
      onPaste={handlePaste}
      tabIndex={0}
    >
      {/* 工具列 */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingIdx !== null}
        >
          {uploadingIdx !== null ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          {uploadingIdx !== null ? "上傳中..." : "📎 貼截圖 / 上傳"}
        </Button>
        <span className="text-xs text-muted-foreground">或 Ctrl+V 貼圖（可多張）</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { handleFileSelect(e.target.files); e.target.value = ""; }}
        />
      </div>

      {/* 圖片預覽列表 */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {images.map((url, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className={`relative group border rounded-lg overflow-hidden bg-muted/20 cursor-grab active:cursor-grabbing transition-all ${
                dragOverIdx === idx && draggingIdx !== idx ? 'ring-2 ring-primary scale-105' : ''
              } ${draggingIdx === idx ? 'opacity-50' : ''}`}
            >
              {url ? (
                <img
                  src={url}
                  alt={`解析圖 ${idx + 1}`}
                  className="w-full max-h-48 object-contain"
                  onError={(e) => {
                    // 圖片載入失敗時顯示佔位符
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className="hidden text-xs text-center py-4 text-muted-foreground">圖片無法顯示</div>
              {/* 操作按鈕 */}
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleRedraw(idx)}
                  disabled={redrawingIdx === idx}
                  title="以圖生圖（重新繪製清晰版）"
                  className="bg-purple-500 text-white rounded px-1.5 py-0.5 text-xs flex items-center gap-0.5 hover:bg-purple-600"
                >
                  {redrawingIdx === idx ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Wand2 className="h-2.5 w-2.5" />}
                  {redrawingIdx === idx ? "生成中" : "重繪"}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="bg-red-500 text-white rounded px-1.5 py-0.5 text-xs hover:bg-red-600"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
              <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                圖 {idx + 1}
              </div>
            </div>
          ))}
          {/* 新增圖片按鈕 */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 min-h-[80px] text-muted-foreground hover:bg-muted/20 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs">新增圖片</span>
          </button>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground text-center py-4 bg-muted/20 rounded">
          尚無解析圖 — 貼上 PDF 截圖，或點「📎 貼截圖 / 上傳」
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 主頁面
// ─────────────────────────────────────────────
export default function LearningMaterialEdit() {
  const params = useParams<{ id: string }>();
  const materialId = parseInt(params.id || "0");
  const [, navigate] = useLocation();

  const [form, setForm] = useState({
    title: "",
    category: "其他" as Category,
    subjectName: "",
    fileUrl: "",
    pointCost: 0,
    accessMode: "public" as "public" | "class_only" | "private",
  });

  // 關聯考古題集狀態
  const [showLinkPanel, setShowLinkPanel] = useState(false);          // 是否顯示新增關聯面板
  const [examSetSearch, setExamSetSearch] = useState('');             // 搜尋文字
  const [examSetSourceFilter, setExamSetSourceFilter] = useState<string>('all'); // 分類篩選
  const [selectedExamSetIds, setSelectedExamSetIds] = useState<Set<number>>(new Set()); // 勾選的 ID

  const [editingQuestions, setEditingQuestions] = useState<EditableQuestion[]>([]);
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);
  const [showPdfPanel, setShowPdfPanel] = useState(false);
  const [isPreGenerating, setIsPreGenerating] = useState(false);
  const [preGenProgress, setPreGenProgress] = useState<{ done: number; total: number } | null>(null);
  const [isPreGeneratingAll, setIsPreGeneratingAll] = useState(false);

  // 快取狀態查詢
  const cacheStatusQuery = trpc.learningMaterials.getCacheStatus.useQuery(
    { materialId, questionIndexes: editingQuestions.map(q => q.index) },
    { enabled: materialId > 0 && editingQuestions.length > 0 }
  );
  const cacheStatus = cacheStatusQuery.data?.status || {};

  // 快取內容查詢（預覽 AI 解題 + 差異比較）
  const questionCachesQuery = trpc.learningMaterials.getQuestionCaches.useQuery(
    { materialId, questionIndexes: editingQuestions.map(q => q.index) },
    { enabled: materialId > 0 && editingQuestions.length > 0 }
  );
  const questionCaches = questionCachesQuery.data?.caches || {};
  // 展開狀態：記錄哪些題目展開了 AI 解題 / 差異比較預覽
  const [expandedSolution, setExpandedSolution] = useState<Set<number>>(new Set());
  const [expandedDiff, setExpandedDiff] = useState<Set<number>>(new Set());

  const { data, isLoading } = trpc.learningMaterials.getById.useQuery(
    { id: materialId },
    { enabled: materialId > 0 }
  );

  // 取得所有考古題集（管理員用）
  const { data: allExamSets } = trpc.examSetAdmin.listAll.useQuery();
  // 取得所有書本（管理員用）
  const { data: allBooks } = trpc.smartBookAdmin.list.useQuery();
  // 取得已關聯的考古題集
  const { data: linkedExamSets, refetch: refetchLinked } = trpc.examSetAdmin.getLinkedExamSets.useQuery(
    { materialId },
    { enabled: materialId > 0 }
  );

  useEffect(() => {
    if (data?.material) {
      const m = data.material as any;
      setForm({
        title: m.title || "",
        category: m.category || "其他",
        subjectName: m.subjectName || "",
        fileUrl: m.fileUrl || "",
        pointCost: m.pointCost ?? 0,
        accessMode: (m.accessMode || "public") as "public" | "class_only" | "private",
      });
      const qs = data.extractedQuestions;
      if (Array.isArray(qs)) {
        setEditingQuestions(
          qs.map((q: any) => ({
            index: q.index,
            type: q.type || "choice",
            questionText: q.questionText || "",
            options: q.options || null,
            correctAnswer: q.correctAnswer || null,
            teacherSolution: q.teacherSolution || null,
            // 題目圖片
            questionImages: Array.isArray(q.questionImages) ? q.questionImages : [],
            // 支援多圖：優先用 solutionImages，否則把 teacherSolutionImage 包成陣列
            solutionImages: Array.isArray(q.solutionImages) && q.solutionImages.length > 0
              ? q.solutionImages
              : (q.teacherSolutionImage ? [q.teacherSolutionImage] : []),
            hasImage: Boolean(q.hasImage),
          }))
        );
      }
    }
  }, [data]);

  // 共用 mutation（避免每個 MultiImageUploader 各自建立）
  const uploadMutation = trpc.learningMaterials.uploadImage.useMutation({
    onError: (e) => toast.error(`上傳失敗：${e.message}`),
  });
  const redrawMutation = trpc.learningMaterials.redrawImage.useMutation({
    onError: (e) => toast.error(`以圖生圖失敗：${e.message}`),
  });

  // 新增關聯考古題集 mutation
  const linkMaterialMutation = trpc.examSetAdmin.linkMaterial.useMutation({
    onSuccess: (d) => {
      toast.success(`已新增 ${d.added} 份關聯考古題集`);
      setShowLinkPanel(false);
      setSelectedExamSetIds(new Set());
      refetchLinked();
    },
    onError: (e) => toast.error(`關聯失敗：${e.message}`),
  });

  // 移除關聯 mutation
  const unlinkMaterialMutation = trpc.examSetAdmin.unlinkMaterial.useMutation({
    onSuccess: () => {
      toast.success('已移除關聯');
      refetchLinked();
    },
    onError: (e) => toast.error(`移除失敗：${e.message}`),
  });

  // 更新考古題集關聯書本 mutation
  const updateSmartBookLinkMutation = trpc.examSetAdmin.updateSmartBookLink.useMutation({
    onSuccess: () => toast.success("考古題集關聯書本已更新"),
    onError: (e) => toast.error(`關聯失敗：${e.message}`),
  });

  const updateMutation = trpc.learningMaterials.update.useMutation({
    onSuccess: () => toast.success("基本資訊已儲存"),
    onError: (e) => toast.error(`儲存失敗：${e.message}`),
  });

  const updateQuestionsMutation = trpc.learningMaterials.updateExtractedQuestions.useMutation({
    onSuccess: (d) => {
      toast.success(`題目已儲存！共 ${d.questionCount} 題`);
      setIsSavingQuestions(false);
    },
    onError: (e) => {
      toast.error(`儲存失敗：${e.message}`);
      setIsSavingQuestions(false);
    },
  });

  const preGenerateDiffSingleMutation = trpc.learningMaterials.preGenerateDiffSingle.useMutation();

  // 逐題生成差異比較（避免部署環境超時）
  const runDiffForAllQuestions = async (forceRegenerate = false): Promise<{ generated: number; skipped: number }> => {
    const teacherQuestions = editingQuestions.filter(q => q.teacherSolution);
    let generated = 0;
    let skipped = 0;
    for (const q of teacherQuestions) {
      try {
        const result = await preGenerateDiffSingleMutation.mutateAsync({
          materialId,
          questionIndex: q.index,
          forceRegenerate,
        });
        generated += result.generated;
        skipped += result.skipped;
      } catch (e: any) {
        console.error(`第 ${q.index} 題差異比較失敗:`, e);
        skipped++;
      }
    }
    return { generated, skipped };
  };

  const preGenerateMutation = trpc.learningMaterials.preGenerateSolutions.useMutation({
    onSuccess: (d) => {
      setIsPreGenerating(false);
      setPreGenProgress(null);
      if (d.success) {
        toast.success(`AI 解題預生成完成！新增 ${d.generated} 題，跳過 ${d.skipped} 題（已有快取）`);
      } else {
        toast.error(d.message || '預生成失敗');
      }
    },
    onError: (e) => {
      setIsPreGenerating(false);
      setPreGenProgress(null);
      toast.error(`預生成失敗：${e.message}`);
    },
  });

  // 一鍵全部生成：AI 解題 → 差異比較
  const handlePreGenerateAll = async () => {
    if (editingQuestions.length === 0) {
      toast.error('此資料尚無題目，請先拆解題目');
      return;
    }
    setIsPreGeneratingAll(true);
    toast.info('步驟 1/2：正在預先生成 AI 解題...');
    try {
      const solResult = await preGenerateMutation.mutateAsync({ materialId });
      toast.success(`AI 解題完成！新增 ${solResult.generated} 題`);
    } catch (e: any) {
      toast.error(`AI 解題失敗：${e.message}`);
      setIsPreGeneratingAll(false);
      return;
    }
    const teacherCount = editingQuestions.filter(q => q.teacherSolution).length;
    if (teacherCount > 0) {
      toast.info(`步驟 2/2：正在預先生成差異比較（${teacherCount} 題有老師解答）...`);
      try {
        const diffResult = await runDiffForAllQuestions(false);
        toast.success(`差異比較完成！新增 ${diffResult.generated} 題，跳過 ${diffResult.skipped} 題`);
      } catch (e: any) {
        toast.error(`差異比較失敗：${e.message}`);
      }
    } else {
      toast.info('此資料無老師解答，跳過差異比較步驟');
    }
    setIsPreGeneratingAll(false);
    cacheStatusQuery.refetch();
  };

  const handlePreGenerate = () => {
    if (editingQuestions.length === 0) {
      toast.error('此資料尚無題目，請先拆解題目');
      return;
    }
    setIsPreGenerating(true);
    setPreGenProgress({ done: 0, total: editingQuestions.length });
    preGenerateMutation.mutate({ materialId });
  };

  // 單題重新生成的載入狀態
  const [regeneratingSolution, setRegeneratingSolution] = useState<Set<number>>(new Set());
  const [regeneratingDiff, setRegeneratingDiff] = useState<Set<number>>(new Set());

  const handleRegenerateSolution = async (questionIndex: number) => {
    setRegeneratingSolution(prev => new Set(prev).add(questionIndex));
    try {
      await preGenerateMutation.mutateAsync({
        materialId,
        questionIndexes: [questionIndex],
        forceRegenerate: true,
      });
      toast.success(`第 ${questionIndex} 題 AI 解題重新生成完成`);
      await questionCachesQuery.refetch();
      await cacheStatusQuery.refetch();
    } catch (e: any) {
      toast.error(`重新生成失敗：${e.message}`);
    } finally {
      setRegeneratingSolution(prev => { const s = new Set(prev); s.delete(questionIndex); return s; });
    }
  };

  const handleRegenerateDiff = async (questionIndex: number) => {
    setRegeneratingDiff(prev => new Set(prev).add(questionIndex));
    try {
      await preGenerateDiffSingleMutation.mutateAsync({
        materialId,
        questionIndex,
        forceRegenerate: true,
      });
      toast.success(`第 ${questionIndex} 題差異比較重新生成完成`);
      await questionCachesQuery.refetch();
      await cacheStatusQuery.refetch();
    } catch (e: any) {
      toast.error(`重新生成失敗：${e.message}`);
    } finally {
      setRegeneratingDiff(prev => { const s = new Set(prev); s.delete(questionIndex); return s; });
    }
  };

  const suggestMutation = trpc.learningMaterials.suggestTitle.useMutation({
    onSuccess: (d) => {
      if (d.suggested) {
        setForm((prev) => ({ ...prev, subjectName: d.suggested }));
        toast.success("已帶入 AI 建議科目");
      }
    },
  });

  const handleSaveInfo = () => {
    updateMutation.mutate({
      id: materialId,
      title: form.title,
      category: form.category,
      subjectName: form.subjectName,
      pointCost: form.pointCost,
      accessMode: form.accessMode,
    });
  };

  const handleSaveQuestions = () => {
    setIsSavingQuestions(true);
    updateQuestionsMutation.mutate({
      id: materialId,
      questions: editingQuestions.map((q) => ({
        index: q.index,
        type: q.type,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        teacherSolution: q.teacherSolution,
        questionImages: q.questionImages,
        teacherSolutionImage: q.solutionImages[0] || null,
        solutionImages: q.solutionImages,
        hasImage: q.questionImages.length > 0 || q.solutionImages.length > 0 || q.hasImage,
      })),
    });
  };

  const updateQuestion = (qi: number, patch: Partial<EditableQuestion>) => {
    setEditingQuestions((prev) => {
      const updated = [...prev];
      updated[qi] = { ...updated[qi], ...patch };
      return updated;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* 頂部導覽列 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/learning-materials")} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Button>
        <div className="h-4 w-px bg-border" />
        <span className="font-semibold text-sm truncate max-w-md">{form.title || "編輯智能解題"}</span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSaveInfo} disabled={updateMutation.isPending} className="gap-1">
            <Save className="h-3.5 w-3.5" />
            {updateMutation.isPending ? "儲存中..." : "儲存基本資訊"}
          </Button>
          {editingQuestions.length > 0 && (
            <Button size="sm" onClick={handleSaveQuestions} disabled={isSavingQuestions} className="gap-1">
              <Save className="h-3.5 w-3.5" />
              {isSavingQuestions ? "儲存中..." : `儲存題目（${editingQuestions.length} 題）`}
            </Button>
          )}
          {editingQuestions.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handlePreGenerate}
              disabled={isPreGenerating}
              className="gap-1 border-amber-400 text-amber-600 hover:bg-amber-50"
            >
              {isPreGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
              {isPreGenerating ? `AI 解題生成中...（${editingQuestions.length} 題）` : '🤖 預先生成 AI 解題'}
            </Button>
          )}
          {editingQuestions.filter(q => q.teacherSolution).length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                setIsPreGeneratingAll(true);
                try {
                  const r = await runDiffForAllQuestions(false);
                  toast.success(`差異比較完成！新增 ${r.generated} 題，跳過 ${r.skipped} 題`);
                  cacheStatusQuery.refetch();
                } catch (e: any) {
                  toast.error(`差異比較失敗：${e.message}`);
                } finally {
                  setIsPreGeneratingAll(false);
                }
              }}
              disabled={preGenerateDiffSingleMutation.isPending || isPreGeneratingAll}
              className="gap-1 border-blue-400 text-blue-600 hover:bg-blue-50"
            >
              {(preGenerateDiffSingleMutation.isPending || isPreGeneratingAll) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitCompare className="h-3.5 w-3.5" />}
              {(preGenerateDiffSingleMutation.isPending || isPreGeneratingAll) ? '差異比較生成中...' : `🔍 預先生成差異比較（${editingQuestions.filter(q => q.teacherSolution).length} 題有老師解答）`}
            </Button>
          )}
          {editingQuestions.length > 0 && (
            <Button
              size="sm"
              onClick={handlePreGenerateAll}
              disabled={isPreGeneratingAll || isPreGenerating || preGenerateDiffSingleMutation.isPending}
              className="gap-1 bg-gradient-to-r from-amber-500 to-blue-500 hover:from-amber-600 hover:to-blue-600 text-white border-0"
            >
              {isPreGeneratingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {isPreGeneratingAll ? '一鍵生成中...' : '✨ 一鍵全部生成'}
            </Button>
          )}
          {form.fileUrl && (
            <Button
              size="sm"
              variant={showPdfPanel ? "default" : "outline"}
              onClick={() => setShowPdfPanel(!showPdfPanel)}
              className="gap-1"
            >
              {showPdfPanel ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeftOpen className="h-3.5 w-3.5" />}
              {showPdfPanel ? '關閉 PDF' : '📄 開啟 PDF'}
            </Button>
          )}
        </div>
      </div>

      {/* 主體 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左側：基本資訊（永遠顯示） */}
        <div className="w-64 flex-shrink-0 border-r overflow-y-auto p-4 space-y-4 bg-muted/20">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">基本資訊</h2>

          {form.fileUrl && (
            <div>
              <label className="text-sm font-medium">PDF 預覽</label>
              <Button variant="outline" size="sm" onClick={() => window.open(form.fileUrl, "_blank")} className="h-8 text-xs gap-1 mt-1 w-full">
                <Eye className="h-3 w-3" />開新分頁預覽
              </Button>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">標題 *</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="請輸入資料標題" className="mt-1" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">科目名稱</label>
              <Button variant="ghost" size="sm" onClick={() => suggestMutation.mutate({ materialId })} disabled={suggestMutation.isPending} className="h-6 text-xs gap-1 px-2">
                <Sparkles className="h-3 w-3" />
                {suggestMutation.isPending ? "分析中..." : "AI 建議"}
              </Button>
            </div>
            <Input value={form.subjectName} onChange={(e) => setForm({ ...form, subjectName: e.target.value })} placeholder="例如：中級會計學" className="mt-1" />
            <p className="text-xs text-muted-foreground mt-1">顯示在學生端卡片上，也可用於搜尋</p>
          </div>

          <div>
            <label className="text-sm font-medium">分類 *</label>
            <Select value={form.category} onValueChange={(v: Category) => setForm({ ...form, category: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
              <Input type="number" min={0} max={9999} value={form.pointCost} onChange={(e) => setForm({ ...form, pointCost: parseInt(e.target.value) || 0 })} className="w-24" />
              <span className="text-xs text-muted-foreground">點（0=免費）</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">開放狀態</label>
            <div className="flex flex-col gap-1.5 mt-1">
              {[
                { value: "public", label: "🌍 公開" },
                { value: "class_only", label: "🏫 限班內生" },
                { value: "private", label: "🔒 不公開" },
              ].map((opt) => (
                <button key={opt.value} type="button" onClick={() => setForm({ ...form, accessMode: opt.value as any })}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${form.accessMode === opt.value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 關聯考古題集 */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">📎 關聯考古題集</label>
              <button
                type="button"
                onClick={() => { setShowLinkPanel(!showLinkPanel); setSelectedExamSetIds(new Set()); setExamSetSearch(''); }}
                className="text-xs text-primary hover:underline"
              >
                {showLinkPanel ? '取消' : '+ 新增關聯'}
              </button>
            </div>

            {/* 新增關聯面板 */}
            {showLinkPanel && (
              <div className="border rounded-lg p-2 bg-muted/20 space-y-2 mb-3">
                {/* 分類篩選 + 搜尋 */}
                <div className="flex gap-1.5">
                  <select
                    value={examSetSourceFilter}
                    onChange={e => setExamSetSourceFilter(e.target.value)}
                    className="text-xs border rounded px-1.5 py-1 bg-background flex-shrink-0 max-w-[90px]"
                  >
                    <option value="all">全部</option>
                    {(allBooks || []).map(b => (
                      <option key={b.id} value={String(b.id)}>{b.title.slice(0, 8)}</option>
                    ))}
                    <option value="none">未關聯書本</option>
                  </select>
                  <input
                    type="text"
                    placeholder="搜尋考古題集..."
                    value={examSetSearch}
                    onChange={e => setExamSetSearch(e.target.value)}
                    className="text-xs border rounded px-2 py-1 flex-1 bg-background"
                  />
                </div>

                {/* 考古題集列表 */}
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {(allExamSets || [])
                    .filter(s => {
                      // 分類篩選
                      if (examSetSourceFilter !== 'all') {
                        if (examSetSourceFilter === 'none') {
                          if (s.smartBookId !== null) return false;
                        } else {
                          if (String(s.smartBookId) !== examSetSourceFilter) return false;
                        }
                      }
                      // 搜尋篩選
                      if (examSetSearch.trim()) {
                        const q = examSetSearch.trim().toLowerCase();
                        return (s.title || '').toLowerCase().includes(q);
                      }
                      return true;
                    })
                    .map(s => {
                      const book = (allBooks || []).find(b => b.id === s.smartBookId);
                      const isLinked = (linkedExamSets || []).some(l => l.id === s.id);
                      const isChecked = selectedExamSetIds.has(s.id);
                      return (
                        <label
                          key={s.id}
                          className={`flex items-start gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted/50 ${
                            isChecked ? 'bg-primary/10' : ''
                          } ${isLinked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked || isLinked}
                            disabled={isLinked}
                            onChange={() => {
                              if (isLinked) return;
                              setSelectedExamSetIds(prev => {
                                const next = new Set(prev);
                                if (next.has(s.id)) next.delete(s.id);
                                else next.add(s.id);
                                return next;
                              });
                            }}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-medium leading-tight truncate">{s.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {book ? book.title.slice(0, 12) : '未關聯書本'}
                              {isLinked && <span className="ml-1 text-green-600">✓已關聯</span>}
                            </div>
                          </div>
                        </label>
                      );
                    })
                  }
                  {(allExamSets || []).length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-3">尚無考古題集</div>
                  )}
                </div>

                {/* 確認新增按鈕 */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={selectedExamSetIds.size === 0 || linkMaterialMutation.isPending}
                    onClick={() => {
                      if (selectedExamSetIds.size === 0) return;
                      linkMaterialMutation.mutate({
                        materialId,
                        examSetIds: Array.from(selectedExamSetIds),
                      });
                    }}
                    className="flex-1 text-xs py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50"
                  >
                    {linkMaterialMutation.isPending ? '新增中...' : `確認新增${selectedExamSetIds.size > 0 ? `（${selectedExamSetIds.size}份）` : ''}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowLinkPanel(false); setSelectedExamSetIds(new Set()); }}
                    className="text-xs px-3 py-1.5 rounded border bg-background"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            {/* 已關聯列表 */}
            {(linkedExamSets || []).length === 0 && !showLinkPanel ? (
              <div className="text-xs text-muted-foreground py-2">尚未關聯任何考題</div>
            ) : (
              <div className="space-y-1">
                {(linkedExamSets || []).map(s => (
                  <div key={s.id} className="flex items-center gap-2 text-xs bg-muted/30 rounded px-2 py-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{s.title}</div>
                      <div className="text-muted-foreground">{s.bookTitle ? s.bookTitle.slice(0, 14) : '未關聯書本'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => unlinkMaterialMutation.mutate({ materialId, examSetId: s.id })}
                      className="text-red-500 hover:text-red-700 flex-shrink-0 text-xs px-1"
                      title="移除關聯"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 中間：PDF（有 fileUrl 且 showPdfPanel 時顯示） */}
        {showPdfPanel && form.fileUrl && (
          <div className="w-[45%] flex-shrink-0 flex flex-col overflow-hidden border-r bg-muted/10">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-background flex-shrink-0">
              <span className="text-xs font-medium text-muted-foreground">📄 PDF 預覽</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => window.open(form.fileUrl, '_blank')}>
                  <Eye className="h-3 w-3 mr-1" />開新分頁
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setShowPdfPanel(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <iframe
              src={`${form.fileUrl}#toolbar=1&navpanes=0`}
              className="flex-1 w-full"
              title="PDF 預覽"
            />
          </div>
        )}

        {/* 右側：題目列表（永遠顯示） */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/10 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">📝 已拆解題目</span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {editingQuestions.length > 0 ? `共 ${editingQuestions.length} 題` : "尚未提取"}
              </span>
            </div>
            {editingQuestions.length > 0 && (
              <Button size="sm" onClick={handleSaveQuestions} disabled={isSavingQuestions} className="h-8 text-xs gap-1">
                <Save className="h-3 w-3" />
                {isSavingQuestions ? "儲存中..." : "儲存題目修改"}
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {editingQuestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <div className="text-5xl">📚</div>
                <p className="text-sm">尚未提取題目，請回列表頁點擊「🔄 補提取題目」</p>
              </div>
            ) : (
              <div className="space-y-8 max-w-4xl mx-auto">
                {editingQuestions.map((q, qi) => (
                  <div key={qi} className="border rounded-xl p-5 bg-background shadow-sm space-y-5">
                    {/* 題目標頭 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">{q.index}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${q.type === "choice" ? "bg-green-100 text-green-700" : q.type === "drawing" ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"}`}>
                        {q.type === "choice" ? "選擇題" : q.type === "drawing" ? "畫圖題" : "簡答題"}
                      </span>
                      {/* 快取狀態標記 */}
                      {cacheStatus[q.index]?.hasSolution && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">🤖 AI解題✓</span>
                      )}
                      {cacheStatus[q.index]?.hasDiff && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">🔍 差異比較✓</span>
                      )}
                      {q.teacherSolution && !cacheStatus[q.index]?.hasDiff && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">有老師解答</span>
                      )}
                    </div>

                    {/* 題目內容（富文本） */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">題目內容</label>
                      <RichTextEditor
                        content={q.questionText}
                        onChange={(html) => updateQuestion(qi, { questionText: html })}
                        placeholder="題目內容，可貼圖（Ctrl+V）..."
                        className="min-h-[90px]"
                      />
                      {/* 題目圖片（多張） */}
                      {(q.questionImages.length > 0 || true) && (
                        <div className="mt-2">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">
                              題目圖片（可貼 PDF 截圖，支援多張）
                            </span>
                          </div>
                          <MultiImageUploader
                            images={q.questionImages}
                            onImagesChange={(urls) => updateQuestion(qi, { questionImages: urls })}
                            uploadMutation={uploadMutation}
                            redrawMutation={redrawMutation}
                          />
                        </div>
                      )}
                    </div>

                    {/* 選項（選擇題，富文本） */}
                    {q.type === "choice" && q.options && (
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">選項</label>
                        <div className="space-y-2">
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-start gap-2">
                              <span className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold mt-1 ${q.correctAnswer === String.fromCharCode(65 + oi) ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>
                                {String.fromCharCode(65 + oi)}
                              </span>
                              <div className="flex-1">
                                <RichTextEditor
                                  content={opt}
                                  onChange={(html) => {
                                    const newOptions = [...(q.options || [])];
                                    newOptions[oi] = html;
                                    updateQuestion(qi, { options: newOptions });
                                  }}
                                  placeholder={`選項 ${String.fromCharCode(65 + oi)}...`}
                                  className="min-h-[44px]"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 正確答案 */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">正確答案</label>
                      {q.type === "choice" ? (
                        <div className="flex gap-2 flex-wrap items-center">
                          {["A", "B", "C", "D", "E"].slice(0, q.options?.length || 4).map((letter) => (
                            <button key={letter} type="button"
                              onClick={() => updateQuestion(qi, { correctAnswer: letter })}
                              className={`w-10 h-10 rounded-lg font-bold text-sm border-2 transition-colors ${q.correctAnswer === letter ? "bg-green-500 text-white border-green-500" : "bg-background border-border hover:bg-green-50 hover:border-green-300"}`}>
                              {letter}
                            </button>
                          ))}
                          {q.correctAnswer && (
                            <span className="text-sm text-green-600 font-medium ml-2">✓ 答案：{q.correctAnswer}</span>
                          )}
                        </div>
                      ) : (
                        <Input value={q.correctAnswer || ""} onChange={(e) => updateQuestion(qi, { correctAnswer: e.target.value })} placeholder="輸入答案..." className="text-sm" />
                      )}
                    </div>

                    {/* 老師解答（富文本） */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">老師解答 / 解析</label>
                      <RichTextEditor
                        content={q.teacherSolution || ""}
                        onChange={(html) => updateQuestion(qi, { teacherSolution: html })}
                        placeholder="老師解答或詳細解析，可貼圖（Ctrl+V）..."
                        className="min-h-[70px] mb-3"
                      />

                      {/* 多張解析圖片區 */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">
                            解析圖片（可貼 PDF 截圖，支援多張；Hover 圖片可「重繪」或「刪除」）
                          </span>
                        </div>
                        <MultiImageUploader
                          images={q.solutionImages}
                          onImagesChange={(urls) => updateQuestion(qi, { solutionImages: urls })}
                          uploadMutation={uploadMutation}
                          redrawMutation={redrawMutation}
                        />
                      </div>
                    </div>

                    {/* AI 解題快取預覽 */}
                    {cacheStatus[q.index]?.hasSolution && (
                      <div className="border border-amber-200 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-amber-50">
                          <button
                            type="button"
                            onClick={() => setExpandedSolution(prev => {
                              const next = new Set(prev);
                              next.has(q.index) ? next.delete(q.index) : next.add(q.index);
                              return next;
                            })}
                            className="flex-1 flex items-center gap-2 text-left"
                          >
                            <span className="text-xs font-semibold text-amber-700">🤖 AI 解題快取內容</span>
                            <span className="text-xs text-amber-500">{expandedSolution.has(q.index) ? '收起 ▲' : '展開預覽 ▼'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRegenerateSolution(q.index)}
                            disabled={regeneratingSolution.has(q.index)}
                            className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 px-2 py-0.5 rounded hover:bg-amber-100 disabled:opacity-50"
                          >
                            {regeneratingSolution.has(q.index)
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <RefreshCw className="h-3 w-3" />
                            }
                            重新生成
                          </button>
                        </div>
                        {expandedSolution.has(q.index) && (
                          <div className="px-3 py-3 bg-amber-50/50 text-xs text-gray-700 leading-relaxed max-h-60 overflow-y-auto prose prose-xs max-w-none">
                            {questionCaches[q.index]?.solution
                              ? <Streamdown>{questionCaches[q.index].solution!.replace(/\*\*/g, '')}</Streamdown>
                              : <span className="text-gray-400">載入中...</span>
                            }
                          </div>
                        )}
                      </div>
                    )}

                    {/* 差異比較快取預覽 */}
                    {cacheStatus[q.index]?.hasDiff && (
                      <div className="border border-blue-200 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-blue-50">
                          <button
                            type="button"
                            onClick={() => setExpandedDiff(prev => {
                              const next = new Set(prev);
                              next.has(q.index) ? next.delete(q.index) : next.add(q.index);
                              return next;
                            })}
                            className="flex-1 flex items-center gap-2 text-left"
                          >
                            <span className="text-xs font-semibold text-blue-700">🔍 差異比較快取內容</span>
                            <span className="text-xs text-blue-400">{expandedDiff.has(q.index) ? '收起 ▲' : '展開預覽 ▼'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRegenerateDiff(q.index)}
                            disabled={regeneratingDiff.has(q.index)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-0.5 rounded hover:bg-blue-100 disabled:opacity-50"
                          >
                            {regeneratingDiff.has(q.index)
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <RefreshCw className="h-3 w-3" />
                            }
                            重新生成
                          </button>
                        </div>
                        {expandedDiff.has(q.index) && (
                          <div className="px-3 py-3 bg-blue-50/50 text-xs text-gray-700 leading-relaxed max-h-60 overflow-y-auto prose prose-xs max-w-none">
                            {questionCaches[q.index]?.diff
                              ? <Streamdown>{questionCaches[q.index].diff!.replace(/\*\*/g, '')}</Streamdown>
                              : <span className="text-gray-400">載入中...</span>
                            }
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

