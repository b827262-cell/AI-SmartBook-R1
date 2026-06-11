/**
 * 題目編輯器頁面
 * 左右分欄設計：左側顯示 PDF 原始檔，右側顯示結構化題目列表
 */

import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor from "@/components/RichTextEditor";
import { RichTextRenderer } from "@/components/RichTextRenderer";
import { LatexPreviewPanel } from "@/components/LatexPreviewPanel";
import { Loader2, ArrowLeft, ChevronDown, ChevronUp, Edit, Save, X, Check, Ban, CheckCircle2, XCircle, Scissors, Eye } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PdfViewerWithCrop from "@/components/PdfViewerWithCrop";
import ImageCropDialog from "@/components/ImageCropDialog";

interface Question {
  id: number;
  pdfId: number | null;
  pdfPageNumber: number | null;
  questionNumberInPdf: string | null;
  question: string;
  type: "multiple_choice" | "short_answer" | "essay";
  options: any;
  correctAnswer: string | null;
  explanation: string | null;
  category: string | null;
  difficulty: "easy" | "medium" | "hard";
  status: "pending" | "approved" | "rejected";
  validationStatus: "valid" | "incomplete" | "needs_review";
  validationIssues: any;
  validationWarnings: any;
  hasImages: number;
  needsImageUpload: number;
  imageDescription: string | null;
  isGroupQuestion: number;
  groupStem: string | null;
  accessType: "free" | "paid" | "class_only";
  requiredCredits: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function QuestionEditor() {
  const params = useParams();
  const pdfId = params.pdfId ? parseInt(params.pdfId) : 0;
  const [location, setLocation] = useLocation();
  
  // 判斷來源頁面：從 URL 或 sessionStorage 獲取
  const getReturnPath = () => {
    const storedPath = sessionStorage.getItem('questionEditorReturnPath');
    if (storedPath) {
      return storedPath;
    }
    // 預設返回考題管理
    return '/admin/exam-questions';
  };
  
  const handleReturn = () => {
    const returnPath = getReturnPath();
    sessionStorage.removeItem('questionEditorReturnPath');
    setLocation(returnPath);
  };
  
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [editingQuestion, setEditingQuestion] = useState<number | null>(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<number>>(new Set());
  const [isCropMode, setIsCropMode] = useState(false);
  const [targetField, setTargetField] = useState<'question' | 'explanation' | 'optionA' | 'optionB' | 'optionC' | 'optionD' | null>(null);
  const [insertImageUrls, setInsertImageUrls] = useState<{
    question?: string | null;
    explanation?: string | null;
    optionA?: string | null;
    optionB?: string | null;
    optionC?: string | null;
    optionD?: string | null;
  }>({});
  
  // 剪貼簿貼上圖片裁切功能
  const [pastedImageUrl, setPastedImageUrl] = useState<string | null>(null);
  const [showImageCropDialog, setShowImageCropDialog] = useState(false);
  const [currentFocusedField, setCurrentFocusedField] = useState<'question' | 'explanation' | 'optionA' | 'optionB' | 'optionC' | 'optionD' | null>(null);
  
  // 圖片上傳 mutation
  const uploadImageMutation = trpc.storage.uploadImage.useMutation();
  const [editForm, setEditForm] = useState<{
    question: string;
    type: "multiple_choice" | "short_answer" | "essay";
    options: any;
    correctAnswer: string;
    explanation: string;
    questionAnalysis: string;
    keyPoints: string;
  }>({ question: "", type: "multiple_choice", options: {}, correctAnswer: "", explanation: "", questionAnalysis: "", keyPoints: "" });
  
  // 預覽對話框
  const [isOptionPreviewOpen, setIsOptionPreviewOpen] = useState(false);
  const [previewOptionContent, setPreviewOptionContent] = useState<string>("");
  const [previewOptionLabel, setPreviewOptionLabel] = useState<string>("");
  
  // 整道題目預覽對話框
  const [isQuestionPreviewOpen, setIsQuestionPreviewOpen] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  // 監聽剪貼簿貼上事件
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // 只在編輯對話框開啟且有焦點欄位時處理
      if (!editingQuestion || !currentFocusedField) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            const url = URL.createObjectURL(blob);
            setPastedImageUrl(url);
            setShowImageCropDialog(true);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [editingQuestion, currentFocusedField]);

  // 查詢 PDF 資訊
  const { data: pdfInfo, isLoading: isPdfLoading } = trpc.knowledgeBase.getById.useQuery(
    { id: pdfId },
    { enabled: pdfId > 0 }
  );

  // 獲取 PDF 代理數據（解決 CORS 問題）
  const { data: pdfProxyData } = trpc.questionBank.getPdfProxy.useQuery(
    { pdfId },
    { enabled: pdfId > 0 }
  );

  // 將 Base64 轉換為 Data URL（使用 useMemo 優化性能）
  const pdfDataUrl = useMemo(() => {
    if (!pdfProxyData?.base64) return null;
    return `data:${pdfProxyData.mimeType};base64,${pdfProxyData.base64}`;
  }, [pdfProxyData?.base64, pdfProxyData?.mimeType]);

  // 查詢題目列表
  const { data: questions, isLoading: isQuestionsLoading, refetch: refetchQuestions } = 
    trpc.questionBank.listQuestions.useQuery(
      { pdfId },
      { enabled: pdfId > 0 }
    );

  const handleToggleExpand = (questionId: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  // 更新題目 mutation
  const updateQuestionMutation = trpc.questionBank.updateQuestion.useMutation({
    onSuccess: () => {
      toast.success("題目已儲存");
      setEditingQuestion(null);
      refetchQuestions();
    },
    onError: (error) => {
      toast.error(`儲存失敗：${error.message}`);
    },
  });

  // 審核通過 mutation
  const approveMutation = (trpc.questionBank as any).approveQuestion.useMutation({
    onSuccess: () => {
      toast.success("已審核通過");
      refetchQuestions();
    },
    onError: (error: any) => {
      toast.error(`審核失敗：${error.message}`);
    },
  });

  // 駁回 mutation
  const rejectMutation = (trpc.questionBank as any).rejectQuestion.useMutation({
    onSuccess: () => {
      toast.success("已駁回");
      refetchQuestions();
    },
    onError: (error: any) => {
      toast.error(`駁回失敗：${error.message}`);
    },
  });

  // 批量審核通過 mutation
  const batchApproveMutation = trpc.questionBankManagement.batchApprove.useMutation({
    onSuccess: (data) => {
      if (data.examCreated) {
        toast.success(
          `批量審核通過成功：${data.count} 題\n\n✅ 已自動創建考卷：${data.examTitle}\n請前往「考試練題」頁面查看！`,
          { duration: 6000 }
        );
      } else {
        toast.success(`批量審核通過成功：${data.count} 題`);
      }
      setSelectedQuestionIds(new Set());
      refetchQuestions();
    },
    onError: (error: any) => {
      toast.error(`批量審核失敗：${error.message}`);
    },
  });

  // 批量駁回 mutation
  const batchRejectMutation = trpc.questionBankManagement.batchReject.useMutation({
    onSuccess: (data) => {
      toast.success(`批量駁回成功：${data.count} 題`);
      setSelectedQuestionIds(new Set());
      refetchQuestions();
    },
    onError: (error: any) => {
      toast.error(`批量駁回失敗：${error.message}`);
    },
  });

  const handleStartEdit = (question: Question) => {
    setEditingQuestion(question.id);
    setEditForm({
      question: question.question,
      type: (question.type as any) || "multiple_choice",
      options: question.options || {},
      correctAnswer: question.correctAnswer || "",
      explanation: question.explanation || "",
      questionAnalysis: question.questionAnalysis || "",
      keyPoints: question.keyPoints || "",
    });
    // 自動展開以顯示所有編輯欄位
    const newExpanded = new Set(expandedQuestions);
    newExpanded.add(question.id);
    setExpandedQuestions(newExpanded);
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setEditForm({ question: "", type: "multiple_choice", options: {}, correctAnswer: "", explanation: "", questionAnalysis: "", keyPoints: "" });
  };

  const handleSaveEdit = () => {
    if (!editingQuestion) return;
    
    updateQuestionMutation.mutate({
      id: editingQuestion,
      question: editForm.question,
      type: editForm.type,
      options: editForm.options,
      correctAnswer: editForm.correctAnswer,
      explanation: editForm.explanation,
      questionAnalysis: editForm.questionAnalysis,
      keyPoints: editForm.keyPoints,
    });
  };

  const handleSaveAndPreview = () => {
    if (!editingQuestion) return;
    
    updateQuestionMutation.mutate({
      id: editingQuestion,
      question: editForm.question,
      type: editForm.type,
      options: editForm.options,
      correctAnswer: editForm.correctAnswer,
      explanation: editForm.explanation,
      questionAnalysis: editForm.questionAnalysis,
      keyPoints: editForm.keyPoints,
    }, {
      onSuccess: () => {
        // 保存成功後自動開啟預覽
        const savedQuestion = questions?.find(q => q.id === editingQuestion);
        if (savedQuestion) {
          setPreviewQuestion(savedQuestion);
          setIsQuestionPreviewOpen(true);
        }
        setEditingQuestion(null);
      }
    });
  };

  const handleUpdateOption = (key: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      options: {
        ...prev.options,
        [key]: value,
      },
    }));
  };

  const handleToggleSelectQuestion = (questionId: number) => {
    const newSelected = new Set(selectedQuestionIds);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestionIds(newSelected);
  };

  const handleSelectAll = () => {
    if (questions && selectedQuestionIds.size < questions.length) {
      setSelectedQuestionIds(new Set(questions.map(q => q.id)));
    } else {
      setSelectedQuestionIds(new Set());
    }
  };

  const handleBatchApprove = () => {
    if (selectedQuestionIds.size === 0) {
      toast.error("請選擇至少一題");
      return;
    }
    if (confirm(`確定要審核通過選中的 ${selectedQuestionIds.size} 題嗎？`)) {
      batchApproveMutation.mutate({ ids: Array.from(selectedQuestionIds) });
    }
  };

  const handleBatchReject = () => {
    if (selectedQuestionIds.size === 0) {
      toast.error("請選擇至少一題");
      return;
    }
    if (confirm(`確定要駁回選中的 ${selectedQuestionIds.size} 題嗎？`)) {
      batchRejectMutation.mutate({ ids: Array.from(selectedQuestionIds), reviewNote: "批量駁回" });
    }
  };

  const getQuestionTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; color: string }> = {
      multiple_choice: { label: "單選題", color: "bg-blue-100 text-blue-700 border-blue-200" },
      short_answer: { label: "簡答題", color: "bg-green-100 text-green-700 border-green-200" },
      essay: { label: "申論題", color: "bg-purple-100 text-purple-700 border-purple-200" },
    };
    const typeInfo = typeMap[type] || { label: type, color: "bg-gray-100 text-gray-700 border-gray-200" };
    return (
      <Badge variant="outline" className={typeInfo.color}>
        {typeInfo.label}
      </Badge>
    );
  };

  const getValidationBadge = (status: string) => {
    switch (status) {
      case "valid":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">完整</Badge>;
      case "incomplete":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">不完整</Badge>;
      case "needs_review":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">需查看</Badge>;
      default:
        return null;
    }
  };

  const getReviewStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">✓ 已通過</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">✕ 已駁回</Badge>;
      case "pending":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">⏳ 待審核</Badge>;
      default:
        return null;
    }
  };

  if (isPdfLoading || isQuestionsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pdfInfo) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">找不到 PDF 資料</p>
        <Button onClick={handleReturn}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
      </div>
    );
  }

  return (
    <>
      
      <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      {/* 頂部工具列 */}
      <div className="border-b bg-background px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleReturn}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div className="h-6 w-px bg-border" />
          <h1 className="text-lg font-semibold">{pdfInfo.title}</h1>
          <Badge variant="outline">{pdfInfo.category}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {selectedQuestionIds.size > 0 ? (
            <>
              <span className="text-sm font-medium text-blue-600">
                已選擇 {selectedQuestionIds.size} 題
              </span>
              <Button
                size="sm"
                variant="default"
                onClick={handleBatchApprove}
                disabled={batchApproveMutation.isPending}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                批量通過
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBatchReject}
                disabled={batchRejectMutation.isPending}
              >
                <XCircle className="w-4 h-4 mr-1" />
                批量駁回
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedQuestionIds(new Set())}
              >
                取消選擇
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSelectAll}
              >
                全選
              </Button>
              <span className="text-sm text-muted-foreground">
                AI 產出的題目 共 {questions?.length || 0} 題
              </span>
            </>
          )}
        </div>
      </div>

      {/* 主要內容區域：左右分欄 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左側：PDF 預覽 */}
        <div className="w-1/2 border-r bg-muted/30 flex flex-col overflow-hidden">
          <div className="border-b bg-background px-4 py-2 flex items-center justify-between flex-shrink-0">
            <span className="text-sm font-medium">試題 PDF</span>
            {isCropMode && (
              <Badge variant="secondary" className="text-xs">
                截圖模式：請在 PDF 上框選區域
              </Badge>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            {pdfDataUrl ? (
              <PdfViewerWithCrop
                url={pdfDataUrl}
                cropMode={isCropMode}
                onCropModeChange={setIsCropMode}
                showToolbar={false}
                onCropComplete={async (croppedImageBlob) => {
                  try {
                    // 將 Blob 轉換為 base64
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                      const base64Data = reader.result as string;
                      const base64Content = base64Data.split(',')[1];
                      
                      // 上傳到 S3
                      const result = await uploadImageMutation.mutateAsync({
                        filename: `cropped-${Date.now()}.png`,
                        contentType: 'image/png',
                        base64Data: base64Content,
                      });
                      
                      if (result.success && result.url) {
                        // 設定要插入的圖片 URL
                        if (targetField) {
                          setInsertImageUrls(prev => ({
                            ...prev,
                            [targetField]: result.url
                          }));
                          toast.success('截圖已插入到欄位');
                        }
                        setIsCropMode(false);
                        setTargetField(null);
                      } else {
                        toast.error('上傳失敗，請重試');
                      }
                    };
                    reader.readAsDataURL(croppedImageBlob);
                  } catch (error) {
                    console.error('Upload error:', error);
                    toast.error('上傳失敗，請重試');
                  }
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                <p className="text-lg font-medium mb-2">無法載入 PDF 預覽</p>
                {pdfInfo && (
                  <div className="text-xs text-left space-y-1 bg-muted p-3 rounded max-w-md">
                    <p><strong>PDF ID:</strong> {pdfId}</p>
                    <p><strong>Title:</strong> {pdfInfo.title || 'N/A'}</p>
                    <p><strong>Status:</strong> {pdfInfo.status || 'N/A'}</p>
                    <p><strong>File URL:</strong> {pdfInfo.fileUrl ? '存在' : '不存在'}</p>
                    {pdfInfo.fileUrl && (
                      <p className="break-all"><strong>URL:</strong> {pdfInfo.fileUrl.substring(0, 100)}...</p>
                    )}
                  </div>
                )}
                {!pdfInfo && (
                  <p className="text-sm">無法獲取 PDF 資訊</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 右側：題目列表 */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-3">
              {questions && questions.length > 0 ? (
                questions.map((question: Question) => (
                  <Card key={question.id} className="p-6 hover:shadow-lg transition-all border border-gray-200 rounded-xl">
                    {/* 題目卡片頭部 */}
                    <div className="flex items-start gap-4">
                      {/* 選擇框 */}
                      <div className="flex-shrink-0 pt-1">
                        <Checkbox
                          checked={selectedQuestionIds.has(question.id)}
                          onCheckedChange={() => handleToggleSelectQuestion(question.id)}
                        />
                      </div>
                      {/* 題號 */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                          {question.questionNumberInPdf || question.id}
                        </div>
                      </div>
                      
                      {/* 題目內容 */}
                      <div className="flex-1 space-y-3">
                        {/* 題型和狀態標籤 */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {editingQuestion === question.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-600">題型：</span>
                              <Select
                                value={editForm.type}
                                onValueChange={(val) => setEditForm(prev => ({ ...prev, type: val as any, options: val === 'multiple_choice' ? (prev.options && Object.keys(prev.options).length > 0 ? prev.options : {}) : {} }))}
                              >
                                <SelectTrigger className="h-7 w-28 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="multiple_choice">選擇題</SelectItem>
                                  <SelectItem value="short_answer">簡答題</SelectItem>
                                  <SelectItem value="essay">申論題</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            getQuestionTypeBadge(question.type)
                          )}
                          {getValidationBadge(question.validationStatus)}
                          {getReviewStatusBadge(question.status)}
                        </div>
                        
                        {/* 題幹 */}
                        {editingQuestion === question.id ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-2">
                                             {/* 從 PDF 截圖按鈕已隱藏，用戶使用外部工具裁切 */}  </div>
                            <RichTextEditor
                              content={editForm.question}
                              onChange={(html) => setEditForm(prev => ({ ...prev, question: html }))}
                              placeholder="輸入題目內容..."
                              className="min-h-[150px]"
                              insertImageUrl={insertImageUrls.question}
                              onImageInserted={() => {
                                setInsertImageUrls(prev => ({ ...prev, question: null }));
                              }}
                              onFocus={() => setCurrentFocusedField('question')}
                            />
                            <LatexPreviewPanel
                              content={editForm.question}
                              title="題目預覽"
                            />
                          </div>
                        ) : (
                          <div className="text-base leading-relaxed text-gray-900 font-medium">
                            <RichTextRenderer content={question.question} />
                          </div>
                        )}
                        
                        {/* 選項（單選/複選題默認顯示，或編輯時選了選擇題） */}
                        {(question.type === "multiple_choice" || (editingQuestion === question.id && editForm.type === "multiple_choice")) && (
                          editingQuestion === question.id ? (
                            <div className="space-y-3 mt-3">
                              {["A", "B", "C", "D"].map((key) => (
                                <div key={key} className="flex items-start gap-3">
                                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-xs font-bold mt-2">
                                    {key}
                                  </span>
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-medium text-gray-700">選項 {key}:</span>
                                      {/* 截圖按鈕已隱藏，用戶使用外部工具裁切 */}
                                    </div>
                                    <RichTextEditor
                                      content={editForm.options[key] || ""}
                                      onChange={(html) => handleUpdateOption(key, html)}
                                      placeholder={`選項 ${key}`}
                                      className="min-h-[80px]"
                                      insertImageUrl={insertImageUrls[`option${key}` as keyof typeof insertImageUrls]}
                                      onImageInserted={() => {
                                        setInsertImageUrls(prev => ({ ...prev, [`option${key}`]: null }));
                                      }}
                                      onFocus={() => setCurrentFocusedField(`option${key}` as 'optionA' | 'optionB' | 'optionC' | 'optionD')}
                                    />
                                  </div>
                                </div>
                              ))}
                              <div className="flex items-center gap-3 mt-3">
                                <span className="text-sm font-medium text-gray-700">正確答案：</span>
                                <Input
                                  value={editForm.correctAnswer}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, correctAnswer: e.target.value }))}
                                  placeholder="輸入正確答案（例：A）"
                                  className="w-24"
                                />
                              </div>
                            </div>
                          ) : question.options ? (
                          <div className="space-y-2 mt-3">
                            {Array.isArray(question.options) ? (
                              question.options.map((option: any, idx: number) => {
                                const optionLabel = option?.label || String.fromCharCode(65 + idx);
                                const isCorrect = question.correctAnswer === optionLabel;
                                const optionContent = option?.content || option || "";
                                return (
                                  <div 
                                    key={idx} 
                                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                                      isCorrect 
                                        ? 'bg-green-50 border-green-300' 
                                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                    }`}
                                  >
                                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                      isCorrect 
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-gray-300 text-gray-700'
                                    }`}>
                                      {optionLabel}
                                    </span>
                                     <div className="text-sm leading-relaxed flex-1">
                                       <RichTextRenderer content={optionContent} />
                                     </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="flex-shrink-0 h-6 w-6 p-0"
                                      onClick={() => {
                                        setPreviewOptionLabel(optionLabel);
                                        setPreviewOptionContent(optionContent);
                                        setIsOptionPreviewOpen(true);
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    {isCorrect && (
                                      <span className="flex-shrink-0 text-xs font-semibold text-green-700">✓ 正確</span>
                                    )}
                                  </div>
                                );
                              })
                            ) : typeof question.options === 'object' ? (
                              Object.entries(question.options).map(([key, value]: [string, any]) => {
                                const isCorrect = question.correctAnswer === key;
                                const optionContent = value || "";
                                return (
                                  <div 
                                    key={key} 
                                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                                      isCorrect 
                                        ? 'bg-green-50 border-green-300' 
                                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                    }`}
                                  >
                                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                      isCorrect 
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-gray-300 text-gray-700'
                                    }`}>
                                      {key}
                                    </span>
                                    <div className="text-sm leading-relaxed flex-1">
                                      <RichTextRenderer content={optionContent} />
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="flex-shrink-0 h-6 w-6 p-0"
                                      onClick={() => {
                                        setPreviewOptionLabel(key);
                                        setPreviewOptionContent(optionContent);
                                        setIsOptionPreviewOpen(true);
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    {isCorrect && (
                                      <span className="flex-shrink-0 text-xs font-semibold text-green-700">✓ 正確</span>
                                    )}
                                  </div>
                                );
                              })
                            ) : null}
                          </div>
                          ) : null
                        )}
                        
                        {/* 展開後的內容（解析） */}
                        {expandedQuestions.has(question.id) && (
                          <div className="mt-4 space-y-3 pt-4 border-t border-gray-200">
                            {/* 解析 */}
                            {editingQuestion === question.id ? (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-sm font-medium text-gray-700">解析：</p>
                                  {/* 從 PDF 截圖按鈕已隱藏，用戶使用外部工具裁切 */}
                                </div>
                                <RichTextEditor
                                  content={editForm.explanation}
                                  onChange={(html) => setEditForm(prev => ({ ...prev, explanation: html }))}
                                  insertImageUrl={insertImageUrls.explanation}
                                  onImageInserted={() => {
                                    setInsertImageUrls(prev => ({ ...prev, explanation: null }));
                                  }}
                                  placeholder="輸入題目解析..."
                                  className="min-h-[120px]"
                                  onFocus={() => setCurrentFocusedField('explanation')}
                                />
                                <LatexPreviewPanel
                                  content={editForm.explanation}
                                  title="解析預覽"
                                />
                              </div>
                            ) : question.explanation && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm font-semibold text-blue-900 mb-2">📝 解析</p>
                                <div className="text-sm text-blue-800 leading-relaxed">
                                  <RichTextRenderer content={question.explanation} />
                                </div>
                              </div>
                            )}
                            
                            {/* 試題評析 */}
                            {editingQuestion === question.id ? (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-sm font-medium text-gray-700">試題評析：</p>
                                  {!editForm.questionAnalysis && (
                                    <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                                      ⚠️ 未提取，請手動補充
                                    </span>
                                  )}
                                </div>
                                <Textarea
                                  value={editForm.questionAnalysis}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, questionAnalysis: e.target.value }))}
                                  placeholder="輸入試題評析..."
                                  className={`min-h-[100px] ${!editForm.questionAnalysis ? 'border-yellow-300 bg-yellow-50/50' : ''}`}
                                />
                              </div>
                            ) : question.questionAnalysis && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <p className="text-sm font-semibold text-amber-900 mb-2">💡 試題評析</p>
                                <div className="text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">{question.questionAnalysis}</div>
                              </div>
                            )}
                            
                            {/* 考點命中 */}
                            {editingQuestion === question.id ? (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-sm font-medium text-gray-700">考點命中：</p>
                                  {!editForm.keyPoints && (
                                    <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                                      ⚠️ 未提取，請手動補充
                                    </span>
                                  )}
                                </div>
                                <Textarea
                                  value={editForm.keyPoints}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, keyPoints: e.target.value }))}
                                  placeholder="輸入考點命中資訊..."
                                  className={`min-h-[100px] ${!editForm.keyPoints ? 'border-yellow-300 bg-yellow-50/50' : ''}`}
                                />
                              </div>
                            ) : question.keyPoints && (
                              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                                <p className="text-sm font-semibold text-teal-900 mb-2">🎯 考點命中</p>
                                <div className="text-sm text-teal-800 leading-relaxed whitespace-pre-wrap">{question.keyPoints}</div>
                              </div>
                            )}
                            
                            {/* 簡答題/申論題的答案 */}
                            {(question.type === "short_answer" || question.type === "essay") && (
                              editingQuestion === question.id ? (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium text-gray-700">參考答案：</p>
                                    {!editForm.correctAnswer && (
                                      <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                                        ⚠️ 未提取，請手動補充
                                      </span>
                                    )}
                                  </div>
                                  <Textarea
                                    value={editForm.correctAnswer}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, correctAnswer: e.target.value }))}
                                    placeholder="輸入參考答案..."
                                    className={`min-h-[150px] ${!editForm.correctAnswer ? 'border-yellow-300 bg-yellow-50/50' : ''}`}
                                  />
                                </div>
                              ) : question.correctAnswer && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                  <p className="text-sm font-semibold text-green-900 mb-2">✓ 參考答案</p>
                                  <div className="text-sm text-green-800 leading-relaxed whitespace-pre-wrap">{question.correctAnswer}</div>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* 操作按鈕 */}
                      <div className="flex flex-col items-center gap-2">
                        {editingQuestion === question.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleSaveEdit}
                              className="hover:bg-green-50 hover:text-green-600"
                              title="儲存修改"
                              disabled={updateQuestionMutation.isPending}
                            >
                              {updateQuestionMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleSaveAndPreview}
                              className="hover:bg-blue-50 hover:text-blue-600"
                              title="儲存並預覽"
                              disabled={updateQuestionMutation.isPending}
                            >
                              {updateQuestionMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEdit}
                              className="hover:bg-red-50 hover:text-red-600"
                              title="取消編輯"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setPreviewQuestion(question);
                                setIsQuestionPreviewOpen(true);
                              }}
                              className="hover:bg-purple-50 hover:text-purple-600"
                              title="預覽題目"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEdit(question)}
                              className="hover:bg-blue-50 hover:text-blue-600"
                              title="編輯題目"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleExpand(question.id)}
                              className="hover:bg-gray-100"
                              title={expandedQuestions.has(question.id) ? "收起解析" : "查看解析"}
                            >
                              {expandedQuestions.has(question.id) ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                            {/* 審核按鈕 */}
                            {question.status !== "approved" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => approveMutation.mutate({ id: question.id })}
                                className="hover:bg-green-50 hover:text-green-600"
                                title="審核通過"
                                disabled={approveMutation.isPending}
                              >
                                {approveMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                            {question.status !== "rejected" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => rejectMutation.mutate({ id: question.id })}
                                className="hover:bg-red-50 hover:text-red-600"
                                title="駁回"
                                disabled={rejectMutation.isPending}
                              >
                                {rejectMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Ban className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <p>此 PDF 尚未拆解題目</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setLocation("/admin/knowledge-base")}
                  >
                    返回進行拆解
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* 剪貼簿貼上圖片裁切對話框 */}
      {pastedImageUrl && (
        <ImageCropDialog
          open={showImageCropDialog}
          onOpenChange={setShowImageCropDialog}
          imageUrl={pastedImageUrl}
          onConfirm={async (croppedImageBlob) => {
            try {
              // 將 Blob 轉換為 base64
              const reader = new FileReader();
              reader.onloadend = async () => {
                const base64Data = reader.result as string;
                const base64Content = base64Data.split(',')[1];
                
                // 上傳到 S3
                const result = await uploadImageMutation.mutateAsync({
                  filename: `pasted-${Date.now()}.png`,
                  contentType: 'image/png',
                  base64Data: base64Content,
                });
                
                // 插入到當前焦點欄位
                if (currentFocusedField && result.url) {
                  setInsertImageUrls(prev => ({
                    ...prev,
                    [currentFocusedField]: result.url,
                  }));
                  toast.success('圖片已插入');
                }
                
                // 清理狀態
                setPastedImageUrl(null);
                setShowImageCropDialog(false);
              };
              reader.readAsDataURL(croppedImageBlob);
            } catch (error) {
              console.error('上傳圖片失敗:', error);
              toast.error('上傳圖片失敗');
            }
          }}
        />
      )}

      {/* 選項預覽對話框 */}
      <Dialog open={isOptionPreviewOpen} onOpenChange={setIsOptionPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>選項 {previewOptionLabel} 預覽</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="p-6 bg-white border rounded-lg">
              <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                  {previewOptionLabel}
                </span>
                <div className="flex-1 text-base leading-relaxed">
                  <RichTextRenderer content={previewOptionContent} />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setIsOptionPreviewOpen(false)}>
              關閉
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 整道題目預覽對話框 */}
      <Dialog open={isQuestionPreviewOpen} onOpenChange={setIsQuestionPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">題目預覽</DialogTitle>
            <DialogDescription>
              完整預覽題目呈現給學生的樣子
            </DialogDescription>
          </DialogHeader>
          {previewQuestion && (
            <div className="mt-4 space-y-6">
              {/* 題幹 */}
              <div className="p-6 bg-gray-50 border-2 border-gray-200 rounded-lg">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-lg">
                    {previewQuestion.questionNumberInPdf || previewQuestion.id}
                  </div>
                  <div className="flex-1">
                    <div className="text-base leading-relaxed text-gray-900 font-medium">
                      <RichTextRenderer content={previewQuestion.question} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 選項 */}
              {previewQuestion.type === "multiple_choice" && previewQuestion.options && (
                <div className="space-y-3">
                  {Array.isArray(previewQuestion.options) ? (
                    previewQuestion.options.map((option: any, idx: number) => {
                      const optionLabel = option.label || String.fromCharCode(65 + idx);
                      const isCorrect = previewQuestion.correctAnswer === optionLabel;
                      return (
                        <div 
                          key={idx} 
                          className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                            isCorrect 
                              ? 'bg-green-50 border-green-400 shadow-sm' 
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            isCorrect 
                              ? 'bg-green-500 text-white' 
                              : 'bg-gray-300 text-gray-700'
                          }`}>
                            {optionLabel}
                          </span>
                          <div className="flex-1 text-base leading-relaxed">
                            <RichTextRenderer content={option.content || option} />
                          </div>
                          {isCorrect && (
                            <CheckCircle2 className="flex-shrink-0 w-5 h-5 text-green-600" />
                          )}
                        </div>
                      );
                    })
                  ) : (
                    Object.entries(previewQuestion.options).map(([key, value]) => {
                      const isCorrect = previewQuestion.correctAnswer === key;
                      return (
                        <div 
                          key={key} 
                          className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                            isCorrect 
                              ? 'bg-green-50 border-green-400 shadow-sm' 
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            isCorrect 
                              ? 'bg-green-500 text-white' 
                              : 'bg-gray-300 text-gray-700'
                          }`}>
                            {key}
                          </span>
                          <div className="flex-1 text-base leading-relaxed">
                            <RichTextRenderer content={value as string} />
                          </div>
                          {isCorrect && (
                            <CheckCircle2 className="flex-shrink-0 w-5 h-5 text-green-600" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* 答案 */}
              {previewQuestion.correctAnswer && (
                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-700">正確答案：</span>
                    <span className="text-lg font-bold text-blue-900">{previewQuestion.correctAnswer}</span>
                  </div>
                </div>
              )}

              {/* 解析 */}
              {previewQuestion.explanation && (
                <div className="p-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                  <div className="font-bold text-yellow-800 mb-3 text-lg">題目解析：</div>
                  <div className="text-base leading-relaxed">
                    <RichTextRenderer content={previewQuestion.explanation} />
                  </div>
                </div>
              )}

              {/* 試題評析 */}
              {previewQuestion.questionAnalysis && (
                <div className="p-6 bg-purple-50 border-2 border-purple-200 rounded-lg">
                  <div className="font-bold text-purple-800 mb-3 text-lg">試題評析：</div>
                  <div className="text-base leading-relaxed whitespace-pre-wrap text-gray-800">{previewQuestion.questionAnalysis}</div>
                </div>
              )}

              {/* 考點命中 */}
              {previewQuestion.keyPoints && (
                <div className="p-6 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
                  <div className="font-bold text-indigo-800 mb-3 text-lg">考點命中：</div>
                  <div className="text-base leading-relaxed whitespace-pre-wrap text-gray-800">{previewQuestion.keyPoints}</div>
                </div>
              )}
            </div>
          )}
          <div className="mt-6 flex justify-end">
            <Button onClick={() => setIsQuestionPreviewOpen(false)}>
              關閉
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
