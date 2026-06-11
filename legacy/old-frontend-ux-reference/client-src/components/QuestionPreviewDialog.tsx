/**
 * 題目預覽對話框
 * 顯示拆解的題目列表，讓用戶確認後再儲存
 */

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { AlertCircle, CheckCircle, AlertTriangle, Edit, Save, X, Trash2, ArrowUp, ArrowDown, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ImageUploader } from "./ImageUploader";

interface PreviewQuestion {
  number: string;
  question: string;
  type: "multiple_choice" | "short_answer" | "essay";
  score: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer?: string;
  imageDescription?: string;
  groupStem?: string;
  hasImage: boolean;
  requiresDrawing: boolean;
  imageUrl?: string; // 題目圖片 URL
  questionAnalysis?: string; // 試題評析（高點考古題專用）
  keyPoints?: string; // 考點命中（高點考古題專用）
  explanation?: string; // 答案解析
  examYear?: string;
  examSchool?: string;
  examDepartment?: string;
  validationStatus: "valid" | "incomplete" | "needs_review";
  validationIssues: string[];
  validationWarnings: string[];
  isValid: boolean;
  pdfId: number;
  pdfTitle?: string; // 來源 PDF 標題（批次拆解時使用）
  category: string;
}

interface ValidationSummary {
  total: number;
  valid: number;
  incomplete: number;
  needsReview: number;
  validPercentage: number;
}

interface QuestionPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewQuestions: PreviewQuestion[];
  validationSummary: ValidationSummary;
  pdfId: number;
  pdfTitle: string;
  onSaveSuccess?: () => void;
}

function textOrEmpty(value: unknown): string {
  return value == null ? "" : String(value);
}

function sanitizePreviewQuestion(question: PreviewQuestion): PreviewQuestion {
  return {
    ...question,
    number: textOrEmpty(question.number),
    question: textOrEmpty(question.question),
    score: textOrEmpty(question.score),
    optionA: textOrEmpty(question.optionA),
    optionB: textOrEmpty(question.optionB),
    optionC: textOrEmpty(question.optionC),
    optionD: textOrEmpty(question.optionD),
    correctAnswer: textOrEmpty(question.correctAnswer),
    imageDescription: textOrEmpty(question.imageDescription),
    groupStem: textOrEmpty(question.groupStem),
    questionAnalysis: textOrEmpty(question.questionAnalysis),
    keyPoints: textOrEmpty(question.keyPoints),
    explanation: textOrEmpty(question.explanation),
    examYear: textOrEmpty(question.examYear),
    examSchool: textOrEmpty(question.examSchool),
    examDepartment: textOrEmpty(question.examDepartment),
    validationIssues: question.validationIssues ?? [],
    validationWarnings: question.validationWarnings ?? [],
    hasImage: Boolean(question.hasImage),
    requiresDrawing: Boolean(question.requiresDrawing),
    category: textOrEmpty(question.category),
  };
}

export function QuestionPreviewDialog({
  open,
  onOpenChange,
  previewQuestions,
  validationSummary,
  pdfId,
  pdfTitle,
  onSaveSuccess,
}: QuestionPreviewDialogProps) {
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(
    new Set(previewQuestions.map((_, index) => index))
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedQuestions, setEditedQuestions] = useState<PreviewQuestion[]>(
    previewQuestions.map(sanitizePreviewQuestion)
  );
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState<Partial<PreviewQuestion>>({
    number: "",
    question: "",
    type: "multiple_choice",
    score: "2",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswer: "",
    hasImage: false,
    requiresDrawing: false,
    validationStatus: "valid",
    validationIssues: [],
    validationWarnings: [],
    isValid: true,
    pdfId: pdfId,
    category: "",
  });

  // 當 previewQuestions 變化時，重新初始化 selectedQuestions 和 editedQuestions
  useEffect(() => {
    setSelectedQuestions(new Set(previewQuestions.map((_, index) => index)));
    setEditedQuestions(previewQuestions.map(sanitizePreviewQuestion));
  }, [previewQuestions]);

  const updatePdfMutation = trpc.knowledgeBase.updatePdf.useMutation();

  const saveQuestionsMutation = trpc.knowledgeBase.saveExtractedQuestions.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      onOpenChange(false);
      onSaveSuccess?.();
    },
    onError: (error) => {
      toast.error(`儲存失敗：${error.message}`);
    },
  });

  const handleToggleQuestion = (index: number) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedQuestions(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedQuestions(new Set(previewQuestions.map((_, index) => index)));
  };

  const handleSelectNone = () => {
    setSelectedQuestions(new Set());
  };

  const handleSelectValidOnly = () => {
    const validIndices = previewQuestions
      .map((q, index) => (q.validationStatus === "valid" ? index : -1))
      .filter(i => i !== -1);
    setSelectedQuestions(new Set(validIndices));
  };

  const handleSave = async () => {
    // 先重新編號所有題目
    const renumberedQuestions = renumberQuestions(editedQuestions);
    setEditedQuestions(renumberedQuestions);
    
    // 然後只保存選中的題目
    const questionsToSave = Array.from(selectedQuestions)
      .sort((a, b) => a - b) // 按索引排序
      .map(index => sanitizePreviewQuestion(renumberedQuestions[index]));
    
    if (questionsToSave.length === 0) {
      toast.error("請至少選擇一道題目");
      return;
    }

    try {
      // 先更新 PDF 標題（如果標題不是預設的檔案名）
      if (pdfTitle && !pdfTitle.includes('.pdf')) {
        await updatePdfMutation.mutateAsync({
          id: pdfId,
          title: pdfTitle,
        });
      }

      // 再儲存題目
      saveQuestionsMutation.mutate({
        pdfId,
        questions: questionsToSave,
      });
    } catch (error) {
      toast.error(`更新標題失敗：${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
  };

  const handleSaveEdit = (index: number) => {
    setEditingIndex(null);
    toast.success("題目已更新");
  };

  const handleCancelEdit = (index: number) => {
    // 恢復原始數據
    setEditedQuestions(prev => {
      const newQuestions = [...prev];
      newQuestions[index] = previewQuestions[index];
      return newQuestions;
    });
    setEditingIndex(null);
  };

  const handleQuestionChange = (index: number, field: keyof PreviewQuestion, value: any) => {
    setEditedQuestions(prev => {
      const newQuestions = [...prev];
      newQuestions[index] = { ...newQuestions[index], [field]: value };
      return newQuestions;
    });
  };

  // 刪除題目
  const handleDeleteQuestion = (index: number) => {
    if (window.confirm(`確定要刪除題號 ${editedQuestions[index].number} 嗎？`)) {
      setEditedQuestions(prev => prev.filter((_, i) => i !== index));
      // 更新 selectedQuestions，移除被刪除的題目並調整索引
      setSelectedQuestions(prev => {
        const newSelected = new Set<number>();
        prev.forEach(i => {
          if (i < index) {
            newSelected.add(i);
          } else if (i > index) {
            newSelected.add(i - 1);
          }
        });
        return newSelected;
      });
      toast.success("已刪除題目");
    }
  };

  // 上移題目
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setEditedQuestions(prev => {
      const newQuestions = [...prev];
      [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
      return newQuestions;
    });
    // 更新 selectedQuestions
    setSelectedQuestions(prev => {
      const newSelected = new Set<number>();
      prev.forEach(i => {
        if (i === index) {
          newSelected.add(index - 1);
        } else if (i === index - 1) {
          newSelected.add(index);
        } else {
          newSelected.add(i);
        }
      });
      return newSelected;
    });
    toast.success("已上移題目");
  };

  // 下移題目
  const handleMoveDown = (index: number) => {
    if (index === editedQuestions.length - 1) return;
    setEditedQuestions(prev => {
      const newQuestions = [...prev];
      [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
      return newQuestions;
    });
    // 更新 selectedQuestions
    setSelectedQuestions(prev => {
      const newSelected = new Set<number>();
      prev.forEach(i => {
        if (i === index) {
          newSelected.add(index + 1);
        } else if (i === index + 1) {
          newSelected.add(index);
        } else {
          newSelected.add(i);
        }
      });
      return newSelected;
    });
    toast.success("已下移題目");
  };

  // 新增題目
  const handleAddQuestion = () => {
    if (!newQuestion.question || !newQuestion.optionA || !newQuestion.optionB) {
      toast.error("請至少填寫題目內容和選項 A、B");
      return;
    }
    
    const questionToAdd = {
      ...newQuestion,
      number: String(editedQuestions.length + 1), // 自動編號
    } as PreviewQuestion;
    
    setEditedQuestions(prev => [...prev, questionToAdd]);
    setSelectedQuestions(prev => new Set([...prev, editedQuestions.length]));
    setIsAddingQuestion(false);
    // 重置表單
    setNewQuestion({
      number: "",
      question: "",
      type: "multiple_choice",
      score: "2",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctAnswer: "",
      hasImage: false,
      requiresDrawing: false,
      validationStatus: "valid",
      validationIssues: [],
      validationWarnings: [],
      isValid: true,
      pdfId: pdfId,
      category: "",
    });
    toast.success("已新增題目");
  };

  // 自動重新編號（在保存前調用）
  const renumberQuestions = (questions: PreviewQuestion[]) => {
    return questions.map((q, index) => ({
      ...q,
      number: String(index + 1),
    }));
  };

  const getValidationIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "incomplete":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "needs_review":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getValidationBadge = (status: string) => {
    switch (status) {
      case "valid":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">完整</Badge>;
      case "incomplete":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">不完整</Badge>;
      case "needs_review":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">需審核</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col" style={{maxWidth: 'min(95vw, 1400px)', width: '95vw'}}>
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-lg">題目預覽 - {pdfTitle}</DialogTitle>
          <div className="flex items-center flex-wrap gap-3 text-sm text-muted-foreground">
            <span>共 {validationSummary.total} 題</span>
            <span className="text-green-600">完整：{validationSummary.valid} 題</span>
            <span className="text-yellow-600">需審核：{validationSummary.needsReview} 題</span>
            <span className="text-red-600">不完整：{validationSummary.incomplete} 題</span>
          </div>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2 border-b">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            全選
          </Button>
          <Button variant="outline" size="sm" onClick={handleSelectNone}>
            取消全選
          </Button>
          <Button variant="outline" size="sm" onClick={handleSelectValidOnly}>
            只選完整題目
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsAddingQuestion(true)} className="ml-4">
            <Plus className="w-4 h-4 mr-1" />
            新增題目
          </Button>
          <span className="text-sm text-muted-foreground ml-auto">
            已選擇 {selectedQuestions.size} 題，總計 {editedQuestions.length} 題
          </span>
        </div>

        <div className="flex-1 pr-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 250px)' }}>
          <div className="space-y-4">
            {editedQuestions.map((q, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  selectedQuestions.has(index) ? "border-primary bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedQuestions.has(index)}
                    onCheckedChange={() => handleToggleQuestion(index)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">題號 {q.number}</span>
                        {q.pdfTitle && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{q.pdfTitle}</Badge>}
                        {getValidationBadge(q.validationStatus)}
                        {getValidationIcon(q.validationStatus)}
                        <Badge variant="secondary">{q.type === "multiple_choice" ? "選擇題" : q.type === "short_answer" ? "簡答題" : "申論題"}</Badge>
                        {q.score && <Badge variant="outline">{q.score}</Badge>}
                      </div>
                      <div className="flex items-center gap-1">
                        {editingIndex === index ? (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleSaveEdit(index)}>
                              <Save className="w-4 h-4 mr-1" />
                              儲存
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleCancelEdit(index)}>
                              <X className="w-4 h-4 mr-1" />
                              取消
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleStartEdit(index)}>
                              <Edit className="w-4 h-4 mr-1" />
                              編輯
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleMoveUp(index)}
                              disabled={index === 0}
                              title="上移"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleMoveDown(index)}
                              disabled={index === editedQuestions.length - 1}
                              title="下移"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteQuestion(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="刪除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {editingIndex === index ? (
                      // 編輯模式
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium">題號</label>
                          <Input
                            value={q.number}
                            onChange={(e) => handleQuestionChange(index, "number", e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">題目</label>
                          <Textarea
                            value={q.question}
                            onChange={(e) => handleQuestionChange(index, "question", e.target.value)}
                            className="mt-1"
                            rows={3}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-sm font-medium">題型</label>
                            <Select
                              value={q.type}
                              onValueChange={(value) => handleQuestionChange(index, "type", value)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="multiple_choice">選擇題</SelectItem>
                                <SelectItem value="short_answer">簡答題</SelectItem>
                                <SelectItem value="essay">申論題</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium">分數</label>
                            <Input
                              value={q.score}
                              onChange={(e) => handleQuestionChange(index, "score", e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        {q.type === "multiple_choice" && (
                          <div className="space-y-2">
                            <div>
                              <label className="text-sm font-medium">選項 A</label>
                              <Input
                                value={q.optionA || ""}
                                onChange={(e) => handleQuestionChange(index, "optionA", e.target.value)}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">選項 B</label>
                              <Input
                                value={q.optionB || ""}
                                onChange={(e) => handleQuestionChange(index, "optionB", e.target.value)}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">選項 C</label>
                              <Input
                                value={q.optionC || ""}
                                onChange={(e) => handleQuestionChange(index, "optionC", e.target.value)}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">選項 D</label>
                              <Input
                                value={q.optionD || ""}
                                onChange={(e) => handleQuestionChange(index, "optionD", e.target.value)}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">正確答案</label>
                              <Select
                                value={q.correctAnswer || ""}
                                onValueChange={(value) => handleQuestionChange(index, "correctAnswer", value)}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="選擇正確答案" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="A">A</SelectItem>
                                  <SelectItem value="B">B</SelectItem>
                                  <SelectItem value="C">C</SelectItem>
                                  <SelectItem value="D">D</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                        <div>
                          <label className="text-sm font-medium">題目圖片</label>
                          <div className="mt-1">
                            <ImageUploader
                              currentImageUrl={q.imageUrl}
                              onImageUploaded={(url) => handleQuestionChange(index, "imageUrl", url)}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      // 查看模式
                      <>
                        <div className="text-sm">
                          <strong>題目：</strong>
                          <span className="whitespace-pre-wrap">{q.question || <span className="text-red-500">（題目內容為空）</span>}</span>
                        </div>

                        {q.type === "multiple_choice" && (
                          <div className="text-sm space-y-1">
                            {q.optionA && <div><strong>A.</strong> <span className="whitespace-pre-wrap">{q.optionA}</span></div>}
                            {q.optionB && <div><strong>B.</strong> <span className="whitespace-pre-wrap">{q.optionB}</span></div>}
                            {q.optionC && <div><strong>C.</strong> <span className="whitespace-pre-wrap">{q.optionC}</span></div>}
                            {q.optionD && <div><strong>D.</strong> <span className="whitespace-pre-wrap">{q.optionD}</span></div>}
                            {q.correctAnswer && (
                              <div className="text-green-600">
                                <strong>答案：</strong>{q.correctAnswer}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 試題評析、考點命中、答案解析（非選擇題才顯示） */}
                        {q.type !== "multiple_choice" && (
                          <div className="text-sm space-y-2 mt-3 pt-3 border-t">
                            {q.questionAnalysis ? (
                              <div>
                                <strong className="text-blue-600">試題評析：</strong>
                                <div className="mt-1 text-gray-700 whitespace-pre-wrap">{q.questionAnalysis}</div>
                              </div>
                            ) : (
                              <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-600 inline mr-1" />
                                <span className="text-yellow-700 text-xs">「試題評析」未提取，請手動補充</span>
                              </div>
                            )}
                            {q.keyPoints ? (
                              <div>
                                <strong className="text-purple-600">考點命中：</strong>
                                <div className="mt-1 text-gray-700 whitespace-pre-wrap">{q.keyPoints}</div>
                              </div>
                            ) : (
                              <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-600 inline mr-1" />
                                <span className="text-yellow-700 text-xs">「考點命中」未提取，請手動補充</span>
                              </div>
                            )}
                            {q.explanation ? (
                              <div>
                                <strong className="text-green-600">答案解析：</strong>
                                <div className="mt-1 text-gray-700 whitespace-pre-wrap">{q.explanation}</div>
                              </div>
                            ) : (
                              <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-600 inline mr-1" />
                                <span className="text-yellow-700 text-xs">「答案解析」未提取，請手動補充</span>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {q.validationIssues.length > 0 && (
                      <div className="text-sm text-red-600 space-y-1">
                        <strong>問題：</strong>
                        <ul className="list-disc list-inside">
                          {q.validationIssues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {q.validationWarnings.length > 0 && (
                      <div className="text-sm text-yellow-600 space-y-1">
                        <strong>警告：</strong>
                        <ul className="list-disc list-inside">
                          {q.validationWarnings.map((warning, i) => (
                            <li key={i}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={selectedQuestions.size === 0 || saveQuestionsMutation.isPending}
          >
            {saveQuestionsMutation.isPending ? "儲存中..." : `儲存選中的 ${selectedQuestions.size} 題`}
          </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* 新增題目對話框 */}
      {isAddingQuestion && (
        <Dialog open={isAddingQuestion} onOpenChange={setIsAddingQuestion}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>新增題目</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-sm font-medium">題目內容 *</label>
                <Textarea
                  value={newQuestion.question || ""}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
                  className="mt-1"
                  rows={3}
                  placeholder="請輸入題目內容"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">題型</label>
                  <Select
                    value={newQuestion.type}
                    onValueChange={(value: any) => setNewQuestion(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">選擇題</SelectItem>
                      <SelectItem value="short_answer">簡答題</SelectItem>
                      <SelectItem value="essay">申論題</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">分數</label>
                  <Input
                    value={newQuestion.score || ""}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, score: e.target.value }))}
                    className="mt-1"
                    placeholder="2"
                  />
                </div>
              </div>
              {newQuestion.type === "multiple_choice" && (
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium">選項 A *</label>
                    <Input
                      value={newQuestion.optionA || ""}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, optionA: e.target.value }))}
                      className="mt-1"
                      placeholder="請輸入選項 A"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">選項 B *</label>
                    <Input
                      value={newQuestion.optionB || ""}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, optionB: e.target.value }))}
                      className="mt-1"
                      placeholder="請輸入選項 B"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">選項 C</label>
                    <Input
                      value={newQuestion.optionC || ""}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, optionC: e.target.value }))}
                      className="mt-1"
                      placeholder="請輸入選項 C（可選）"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">選項 D</label>
                    <Input
                      value={newQuestion.optionD || ""}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, optionD: e.target.value }))}
                      className="mt-1"
                      placeholder="請輸入選項 D（可選）"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">正確答案</label>
                    <Input
                      value={newQuestion.correctAnswer || ""}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, correctAnswer: e.target.value }))}
                      className="mt-1"
                      placeholder="例如：A 或 AB"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">答案解析</label>
                <Textarea
                  value={newQuestion.explanation || ""}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, explanation: e.target.value }))}
                  className="mt-1"
                  rows={3}
                  placeholder="請輸入答案解析（可選）"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingQuestion(false)}>
                取消
              </Button>
              <Button onClick={handleAddQuestion}>
                新增
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
