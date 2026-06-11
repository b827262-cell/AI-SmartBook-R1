import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Upload,
  Image as ImageIcon,
  AlertCircle,
  Filter,
  Home,
  RotateCw,
} from "lucide-react";
import { useLocation } from "wouter";
import RichTextEditor from "@/components/RichTextEditor";

export function QuestionBankManagement() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: undefined as "pending" | "approved" | "rejected" | undefined,
    needsImageUpload: undefined as boolean | undefined,
    category: undefined as string | undefined,
  });
  const [editingQuestion, setEditingQuestion] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [importProgress, setImportProgress] = useState<{
    total: number;
    current: number;
    results: Array<{ fileName: string; success: boolean; questionCount: number; error?: string }>;
  } | null>(null);

  // 查詢
  const questionsQuery = trpc.questionBankManagement.list.useQuery({
    ...filters,
    page,
    pageSize: 20,
  });

  const utils = trpc.useUtils();

  // 突變
  const createMutation = trpc.questionBankManagement.create.useMutation({
    onSuccess: () => {
      toast.success("考題創建成功");
      setIsCreating(false);
      questionsQuery.refetch();
    },
    onError: (error) => {
      toast.error("創建失敗：" + error.message);
    },
  });

  const updateMutation = trpc.questionBankManagement.update.useMutation({
    onSuccess: () => {
      toast.success("考題更新成功");
      setEditingQuestion(null);
      questionsQuery.refetch();
    },
    onError: (error) => {
      toast.error("更新失敗：" + error.message);
    },
  });

  const deleteMutation = trpc.questionBankManagement.delete.useMutation({
    onSuccess: () => {
      toast.success("考題刪除成功");
      questionsQuery.refetch();
    },
    onError: (error) => {
      toast.error("刪除失敗：" + error.message);
    },
  });

  const approveMutation = trpc.questionBankManagement.approve.useMutation({
    onSuccess: () => {
      toast.success("審核通過");
      questionsQuery.refetch();
    },
    onError: (error) => {
      toast.error("審核失敗：" + error.message);
    },
  });

  const rejectMutation = trpc.questionBankManagement.reject.useMutation({
    onSuccess: () => {
      toast.success("已駁回");
      questionsQuery.refetch();
    },
    onError: (error) => {
      toast.error("駁回失敗：" + error.message);
    },
  });

  const batchApproveMutation = trpc.questionBankManagement.batchApprove.useMutation({
    onSuccess: (data) => {
      toast.success(`已審核通過 ${data.count} 道題目`);
      setSelectedQuestions([]);
      questionsQuery.refetch();
    },
    onError: (error) => {
      toast.error("批次審核失敗：" + error.message);
    },
  });

  const batchRejectMutation = trpc.questionBankManagement.batchReject.useMutation({
    onSuccess: (data) => {
      toast.success(`已駁回 ${data.count} 道題目`);
      setSelectedQuestions([]);
      questionsQuery.refetch();
    },
    onError: (error) => {
      toast.error("批次駁回失敗：" + error.message);
    },
  });

  const batchDeleteMutation = trpc.questionBankManagement.batchDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`已刪除 ${data.count} 道題目`);
      setSelectedQuestions([]);
      questionsQuery.refetch();
    },
    onError: (error) => {
      toast.error("批次刪除失敗：" + error.message);
    },
  });

  const questions = questionsQuery.data?.questions || [];
  const totalPages = questionsQuery.data?.totalPages || 1;

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            title="返回首頁"
          >
            <Home className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">考題管理</h1>
            <p className="text-muted-foreground mt-1">管理和編輯考題庫</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsImportDialogOpen(true)} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            批次匯入 JSON
          </Button>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新增考題
          </Button>
        </div>
      </div>

      {/* 篩選器 */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">篩選條件</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">審核狀態</label>
            <Select
              value={filters.status || "all"}
              onValueChange={(value) =>
                setFilters({ ...filters, status: value === "all" ? undefined : value as any })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="選擇" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="pending">待審核</SelectItem>
                <SelectItem value="approved">已審核</SelectItem>
                <SelectItem value="rejected">已拒絕</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">圖片狀態</label>
            <Select
              value={
                filters.needsImageUpload === undefined
                  ? "all"
                  : filters.needsImageUpload
                  ? "needs"
                  : "no-needs"
              }
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  needsImageUpload: value === "all" ? undefined : value === "needs",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="選擇" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="needs">需要上傳圖片</SelectItem>
                <SelectItem value="no-needs">不需要圖片</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">類科</label>
            <Input
              placeholder="輸入類科..."
              value={filters.category || ""}
              onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
            />
          </div>
        </div>
      </Card>

      {/* 批次操作按鈕 */}
      {selectedQuestions.length > 0 && (
        <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              已選擇 {selectedQuestions.length} 道題目
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (confirm(`確定要審核通過 ${selectedQuestions.length} 道題目嗎？`)) {
                    batchApproveMutation.mutate({ ids: selectedQuestions });
                  }
                }}
                disabled={batchApproveMutation.isPending}
              >
                <Check className="w-4 h-4 mr-1" />
                批次審核通過
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (confirm(`確定要駁回 ${selectedQuestions.length} 道題目嗎？`)) {
                    batchRejectMutation.mutate({ ids: selectedQuestions });
                  }
                }}
                disabled={batchRejectMutation.isPending}
              >
                <X className="w-4 h-4 mr-1" />
                批次駁回
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (confirm(`確定要刪除 ${selectedQuestions.length} 道題目嗎？此操作無法復原！`)) {
                    batchDeleteMutation.mutate({ ids: selectedQuestions });
                  }
                }}
                disabled={batchDeleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                批次刪除
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedQuestions([])}
              >
                取消選擇
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 考題列表 */}
      {questionsQuery.isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">載入中...</p>
        </div>
      ) : questions.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">尚無考題</h3>
          <p className="text-muted-foreground mb-4">開始創建第一個考題吧！</p>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新增考題
          </Button>
        </Card>
      ) : (
        <>
          {/* 全選 checkbox */}
          <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              checked={selectedQuestions.length === questions.length && questions.length > 0}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedQuestions(questions.map(q => q.id));
                } else {
                  setSelectedQuestions([]);
                }
              }}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium">
              全選 ({questions.length} 道題目)
            </span>
          </div>

          <div className="space-y-4">
            {questions.map((question) => (
              <Card key={question.id} className="p-4">
                <div className="flex items-start gap-4">
                  {/* 批次選擇 checkbox */}
                  <div className="flex items-center pt-1">
                    <input
                      type="checkbox"
                      checked={selectedQuestions.includes(question.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedQuestions([...selectedQuestions, question.id]);
                        } else {
                          setSelectedQuestions(selectedQuestions.filter(id => id !== question.id));
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {/* 審核狀態 */}
                      {question.status === "pending" && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          待審核
                        </Badge>
                      )}
                      {question.status === "approved" && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Check className="w-3 h-3 mr-1" />
                          已審核
                        </Badge>
                      )}
                      {question.status === "rejected" && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <X className="w-3 h-3 mr-1" />
                          已拒絕
                        </Badge>
                      )}

                      {/* 圖片狀態 */}
                      {question.needsImageUpload === 1 && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          <Upload className="w-3 h-3 mr-1" />
                          需要上傳圖片
                        </Badge>
                      )}
                      {question.hasImages === 1 && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <ImageIcon className="w-3 h-3 mr-1" />
                          已有圖片
                        </Badge>
                      )}

                      {/* 類科 */}
                      {question.category && (
                        <Badge variant="secondary">{question.category}</Badge>
                      )}

                      {/* 難度 */}
                      <Badge
                        variant="outline"
                        className={
                          question.difficulty === "easy"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : question.difficulty === "hard"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }
                      >
                        {question.difficulty === "easy"
                          ? "簡單"
                          : question.difficulty === "hard"
                          ? "困難"
                          : "中等"}
                      </Badge>
                    </div>

                    <h3 className="font-semibold mb-2">{question.question}</h3>

                    {question.options && Array.isArray(question.options) && question.options.length > 0 ? (
                      <div className="text-sm text-muted-foreground mb-2">
                        選項：{question.options.filter((o): o is string => typeof o === 'string').join(" / ")}
                      </div>
                    ) : null}

                    <div className="text-sm text-muted-foreground">
                      正確答案：{question.correctAnswer}
                    </div>

                    {question.pdfId && (
                      <div className="text-xs text-muted-foreground mt-2">
                        來源：PDF #{question.pdfId}
                        {question.pdfPageNumber && ` (第 ${question.pdfPageNumber} 頁)`}
                        {question.questionNumberInPdf && ` - 題號 ${question.questionNumberInPdf}`}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingQuestion(question.id)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("確定要刪除此考題嗎？")) {
                            deleteMutation.mutate({ id: question.id });
                          }
                        }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    </div>

                    {/* 審核按鈕（僅待審核狀態顯示） */}
                    {question.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 border-green-300 hover:bg-green-50"
                          onClick={() => {
                            if (confirm("確定要審核通過此題目嗎？")) {
                              approveMutation.mutate({ id: question.id });
                            }
                          }}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                          onClick={() => {
                            if (confirm("確定要駁回此題目嗎？")) {
                              rejectMutation.mutate({ id: question.id });
                            }
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* 分頁 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                上一頁
              </Button>
              <span className="text-sm text-muted-foreground">
                第 {page} / {totalPages} 頁
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                下一頁
              </Button>
            </div>
          )}
        </>
      )}

      {/* 創建/編輯對話框 */}
      {(isCreating || editingQuestion) && (
        <QuestionEditor
          questionId={editingQuestion}
          onClose={() => {
            setIsCreating(false);
            setEditingQuestion(null);
          }}
          onSave={() => {
            questionsQuery.refetch();
          }}
        />
      )}

      {/* 批次匯入 JSON 對話框 */}
      <BatchImportDialog
        open={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onSuccess={() => {
          questionsQuery.refetch();
        }}
      />
    </div>
  );
}

// 考題編輯器組件
function QuestionEditor({
  questionId,
  onClose,
  onSave,
}: {
  questionId: number | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    question: "",
    type: "multiple_choice" as "multiple_choice" | "short_answer" | "essay",
    options: ["", "", "", ""],
    correctAnswer: "",
    explanation: "",
    category: "",
    difficulty: "medium" as "easy" | "medium" | "hard",
    needsImageUpload: false,
  });

  const [uploadedImages, setUploadedImages] = useState<Array<{
    id?: number;
    url: string;
    rotation: number;
    file?: File;
  }>>([]);
  const [isUploading, setIsUploading] = useState(false);

  // 如果是編輯模式，載入現有資料
  const questionQuery = trpc.questionBankManagement.getById.useQuery(
    { id: questionId! },
    { enabled: !!questionId }
  );

  // 當考題資料載入完成時，載入所有欄位
  useEffect(() => {
    if (questionQuery.data) {
      const data = questionQuery.data;
      setFormData({
        question: data.question || "",
        type: data.type || "multiple_choice",
        options: Array.isArray(data.options) ? data.options : ["", "", "", ""],
        correctAnswer: data.correctAnswer || "",
        explanation: data.explanation || "",
        category: data.category || "",
        difficulty: data.difficulty || "medium",
        needsImageUpload: !!data.needsImageUpload,
      });
      
      // 載入圖片
      if (data.images && data.images.length > 0) {
        setUploadedImages(
          data.images.map((img: any) => ({
            id: img.id,
            url: img.imageUrl,
            rotation: img.rotation || 0,
          }))
        );
      }
    }
  }, [questionQuery.data]);

  const uploadImageMutation = trpc.questionBankManagement.uploadImage.useMutation({
    onSuccess: (result) => {
      toast.success("圖片上傳成功");
    },
    onError: (error) => {
      toast.error("上傳失敗：" + error.message);
    },
  });

  const deleteImageMutation = trpc.questionBankManagement.deleteImage.useMutation({
    onSuccess: () => {
      toast.success("圖片刪除成功");
    },
    onError: (error) => {
      toast.error("刪除失敗：" + error.message);
    },
  });

  const rotateImageMutation = trpc.questionBankManagement.rotateImage.useMutation({
    onSuccess: () => {
      toast.success("圖片已旋轉");
    },
    onError: (error) => {
      toast.error("旋轉失敗：" + error.message);
    },
  });

  const createMutation = trpc.questionBankManagement.create.useMutation({
    onSuccess: () => {
      toast.success("考題創建成功");
      onSave();
      onClose();
    },
    onError: (error) => {
      toast.error("創建失敗：" + error.message);
    },
  });

  const updateMutation = trpc.questionBankManagement.update.useMutation({
    onSuccess: () => {
      toast.success("考題更新成功");
      onSave();
      onClose();
    },
    onError: (error) => {
      toast.error("更新失敗：" + error.message);
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 如果是編輯模式且已有 questionId，直接上傳
    if (questionId) {
      setIsUploading(true);
      for (const file of Array.from(files)) {
        try {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            const result = await uploadImageMutation.mutateAsync({
              questionBankId: questionId,
              imageData: base64,
              fileName: file.name,
              mimeType: file.type,
              displayOrder: uploadedImages.length,
            });
            setUploadedImages((prev) => [
              ...prev,
              { id: result.id, url: result.url, rotation: 0 },
            ]);
          };
          reader.readAsDataURL(file);
        } catch (error) {
          console.error("上傳失敗", error);
        }
      }
      setIsUploading(false);
    } else {
      // 創建模式，先暫存在前端
      for (const file of Array.from(files)) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const url = event.target?.result as string;
          setUploadedImages((prev) => [...prev, { url, rotation: 0, file }]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleRotateImage = async (index: number) => {
    const image = uploadedImages[index];
    const newRotation = (image.rotation + 90) % 360;

    if (image.id) {
      // 已上傳的圖片，調用 API
      await rotateImageMutation.mutateAsync({
        imageId: image.id,
        rotation: newRotation,
      });
    }

    // 更新前端狀態
    setUploadedImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, rotation: newRotation } : img))
    );
  };

  const handleDeleteImage = async (index: number) => {
    const image = uploadedImages[index];

    if (image.id) {
      // 已上傳的圖片，調用 API
      await deleteImageMutation.mutateAsync({ imageId: image.id });
    }

    // 更新前端狀態
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.question.trim()) {
      toast.error("請輸入題目");
      return;
    }
    // 答案欄位不再必填，允許空答案

    const data = {
      ...formData,
      options: formData.type === "multiple_choice" ? formData.options.filter((o) => o.trim()) : undefined,
    };

    try {
      if (questionId) {
        await updateMutation.mutateAsync({ id: questionId, ...data });
      } else {
        // 創建考題
        const result = await createMutation.mutateAsync(data);
        const newQuestionId = result.id;

        // 上傳暫存的圖片
        if (uploadedImages.length > 0) {
          setIsUploading(true);
          for (let i = 0; i < uploadedImages.length; i++) {
            const image = uploadedImages[i];
            if (image.file) {
              const reader = new FileReader();
              reader.onload = async (event) => {
                const base64 = event.target?.result as string;
                await uploadImageMutation.mutateAsync({
                  questionBankId: newQuestionId,
                  imageData: base64,
                  fileName: image.file!.name,
                  mimeType: image.file!.type,
                  displayOrder: i,
                });
              };
              reader.readAsDataURL(image.file);
            }
          }
          setIsUploading(false);
        }
      }
    } catch (error) {
      console.error("提交失敗", error);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{questionId ? "編輯考題" : "新增考題"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 題目類型 */}
          <div>
            <label className="text-sm font-medium mb-2 block">題目類型</label>
            <Select
              value={formData.type}
              onValueChange={(value: any) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="選擇" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">選擇題</SelectItem>
                <SelectItem value="short_answer">簡答題</SelectItem>
                <SelectItem value="essay">申論題</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 題目內容 */}
          <div>
            <label className="text-sm font-medium mb-2 block">題目內容</label>
            <RichTextEditor
              content={formData.question}
              onChange={(content) => setFormData({ ...formData, question: content })}
              placeholder="輸入題目，支援圖片、數學公式等格式"
            />
          </div>

          {/* 選項（僅選擇題） */}
          {formData.type === "multiple_choice" && (
            <div>
              <label className="text-sm font-medium mb-2 block">選項</label>
              {formData.options.map((option, index) => (
                <div key={index} className="mb-3">
                  <label className="text-xs text-muted-foreground mb-1 block">
                    選項 {String.fromCharCode(65 + index)}
                  </label>
                  <RichTextEditor
                    content={option}
                    onChange={(content) => {
                      const newOptions = [...formData.options];
                      newOptions[index] = content;
                      setFormData({ ...formData, options: newOptions });
                    }}
                    placeholder={`選項 ${String.fromCharCode(65 + index)} 內容`}
                    className="min-h-[80px]"
                  />
                </div>
              ))}
            </div>
          )}

          {/* 正確答案 */}
          <div>
            <label className="text-sm font-medium mb-2 block">正確答案（選填）</label>
            <Input
              placeholder="輸入正確答案（如果有）..."
              value={formData.correctAnswer}
              onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
            />
          </div>

          {/* 解析 */}
          <div>
            <label className="text-sm font-medium mb-2 block">解析（選填）</label>
            <RichTextEditor
              content={formData.explanation || ""}
              onChange={(content) => setFormData({ ...formData, explanation: content })}
              placeholder="輸入解析，支援圖片、數學公式等格式"
              className="min-h-[120px]"
            />
          </div>

          {/* 類科和難度 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">類科</label>
              <Input
                placeholder="例如：數學、英文"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">難度</label>
              <Select
                value={formData.difficulty}
                onValueChange={(value: any) => setFormData({ ...formData, difficulty: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">簡單</SelectItem>
                  <SelectItem value="medium">中等</SelectItem>
                  <SelectItem value="hard">困難</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 需要上傳圖片 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="needsImageUpload"
              checked={formData.needsImageUpload}
              onChange={(e) => setFormData({ ...formData, needsImageUpload: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="needsImageUpload" className="text-sm">
              此題需要上傳圖片
            </label>
          </div>

          {/* 圖片上傳 */}
          <div>
            <label className="text-sm font-medium mb-2 block">考題圖片</label>
            <div className="space-y-4">
              {/* 已上傳的圖片 */}
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative border rounded-lg overflow-hidden">
                      <img
                        src={image.url}
                        alt={`考題圖片 ${index + 1}`}
                        className="w-full h-auto"
                        style={{
                          transform: `rotate(${image.rotation}deg)`,
                        }}
                      />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRotateImage(index)}
                          className="h-8 w-8 p-0"
                        >
                          <RotateCw className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteImage(index)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 上傳按鈕 */}
              <div>
                <input
                  type="file"
                  id="imageUpload"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("imageUpload")?.click()}
                  disabled={isUploading}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? "上傳中..." : "上傳圖片"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? "儲存中..." : "儲存"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 批次匯入 JSON 對話框
function BatchImportDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<{
    total: number;
    current: number;
    results: Array<{ fileName: string; success: boolean; questionCount: number; error?: string }>;
  } | null>(null);

  const importMutation = trpc.questionBankManagement.batchImportJson.useMutation({
    onSuccess: (data) => {
      toast.success(`匯入完成！成功 ${data.totalSuccess} 個檔案，失敗 ${data.totalFailed} 個`);
      setIsImporting(false);
      setProgress({
        total: data.totalFiles,
        current: data.totalFiles,
        results: data.results,
      });
      onSuccess();
    },
    onError: (error) => {
      toast.error("匯入失敗：" + error.message);
      setIsImporting(false);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const jsonFiles = selectedFiles.filter(f => f.name.endsWith('.json'));
    
    if (jsonFiles.length !== selectedFiles.length) {
      toast.error("請只選擇 JSON 檔案");
    }
    
    setFiles(jsonFiles);
    setProgress(null);
  };

  const handleImport = async () => {
    if (files.length === 0) {
      toast.error("請選擇檔案");
      return;
    }

    setIsImporting(true);
    setProgress({ total: files.length, current: 0, results: [] });

    try {
      // 讀取所有檔案內容
      const jsonFiles = await Promise.all(
        files.map(async (file) => {
          const content = await file.text();
          return {
            fileName: file.name,
            content,
          };
        })
      );

      // 呼叫 API
      importMutation.mutate({ jsonFiles });
    } catch (error: any) {
      toast.error("讀取檔案失敗：" + error.message);
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    if (!isImporting) {
      setFiles([]);
      setProgress(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>批次匯入 JSON 檔案</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 檔案選擇 */}
          <div>
            <label className="text-sm font-medium mb-2 block">選擇 JSON 檔案</label>
            <input
              type="file"
              accept=".json"
              multiple
              onChange={handleFileSelect}
              disabled={isImporting}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-2">
              可以選擇多個 JSON 檔案一次匯入
            </p>
          </div>

          {/* 檔案清單 */}
          {files.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                已選擇 {files.length} 個檔案
              </label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                {files.map((file, index) => (
                  <div key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {file.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 進度顯示 */}
          {progress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>處理進度</span>
                <span className="font-medium">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>

              {/* 結果清單 */}
              {progress.results.length > 0 && (
                <div className="mt-4 max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
                  {progress.results.map((result, index) => (
                    <div
                      key={index}
                      className={`text-sm p-2 rounded-md ${
                        result.success
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        <span className="font-medium">{result.fileName}</span>
                      </div>
                      {result.success ? (
                        <p className="text-xs mt-1 ml-6">
                          成功匯入 {result.questionCount} 道題目
                        </p>
                      ) : (
                        <p className="text-xs mt-1 ml-6">{result.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            {progress && progress.current === progress.total ? '關閉' : '取消'}
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || files.length === 0}
          >
            {isImporting ? '匯入中...' : '開始匯入'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
