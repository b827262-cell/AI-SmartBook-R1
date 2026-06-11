/**
 * SourceQuestionEditor.tsx
 * 考古題校對編輯器
 * 左右分欄設計：左側顯示 PDF 原始檔，右側顯示 AI 提取的題目列表（可編輯）
 */

import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, ChevronDown, ChevronUp, Edit, Save, X, CheckCircle2, Eye, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PdfViewerWithCrop from "@/components/PdfViewerWithCrop";

interface RealExamQuestion {
  id: number;
  sourceId: number;
  sortOrder: number;
  questionType: "multiple_choice" | "essay";
  question: string;
  options: any;
  correctAnswer: string | null;
  explanation: string | null;
  year: string | null;
  subject: string | null;
  examGroup: string | null;
  difficulty: "easy" | "medium" | "hard";
  isVerified: number;
  createdAt: string;
  updatedAt: string;
}

export default function SourceQuestionEditor() {
  const params = useParams();
  const sourceId = params.sourceId ? parseInt(params.sourceId) : 0;
  const [, setLocation] = useLocation();

  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [editingQuestion, setEditingQuestion] = useState<number | null>(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<number>>(new Set());
  const [editForm, setEditForm] = useState<{
    question: string;
    options: Record<string, string>;
    correctAnswer: string;
    explanation: string;
  }>({ question: "", options: {}, correctAnswer: "", explanation: "" });

  // 預覽對話框
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<RealExamQuestion | null>(null);

  const handleReturn = () => {
    setLocation("/admin/ai-question-bank");
  };

  // 查詢素材資訊
  const { data: sourceInfo, isLoading: isSourceLoading } = trpc.realExamAdmin.getSource.useQuery(
    { id: sourceId },
    { enabled: sourceId > 0 }
  );

  // 取得 PDF 代理資料
  const { data: pdfProxyData } = trpc.realExamAdmin.getPdfProxy.useQuery(
    { sourceId },
    { enabled: sourceId > 0 }
  );

  const pdfDataUrl = useMemo(() => {
    if (!pdfProxyData?.base64) return null;
    return `data:${pdfProxyData.mimeType};base64,${pdfProxyData.base64}`;
  }, [pdfProxyData?.base64, pdfProxyData?.mimeType]);

  // 查詢題目列表
  const { data: questionsData, isLoading: isQuestionsLoading, refetch: refetchQuestions } =
    trpc.realExamAdmin.listExtracted.useQuery(
      { sourceId, limit: 200 },
      { enabled: sourceId > 0 }
    );

  const questions = questionsData?.questions as RealExamQuestion[] | undefined;

  // 更新題目 mutation
  const updateQuestionMutation = trpc.realExamAdmin.updateQuestion.useMutation({
    onSuccess: () => {
      toast.success("題目已儲存");
      setEditingQuestion(null);
      refetchQuestions();
    },
    onError: (error) => {
      toast.error(`儲存失敗：${error.message}`);
    },
  });

  // 刪除題目 mutation
  const deleteQuestionMutation = trpc.realExamAdmin.deleteQuestion.useMutation({
    onSuccess: () => {
      toast.success("題目已刪除");
      refetchQuestions();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  const handleToggleExpand = (questionId: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  const handleStartEdit = (question: RealExamQuestion) => {
    setEditingQuestion(question.id);
    const opts: Record<string, string> = {};
    if (question.options && typeof question.options === 'object' && !Array.isArray(question.options)) {
      Object.entries(question.options).forEach(([k, v]) => { opts[k] = String(v); });
    }
    setEditForm({
      question: question.question,
      options: opts,
      correctAnswer: question.correctAnswer || "",
      explanation: question.explanation || "",
    });
    const newExpanded = new Set(expandedQuestions);
    newExpanded.add(question.id);
    setExpandedQuestions(newExpanded);
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setEditForm({ question: "", options: {}, correctAnswer: "", explanation: "" });
  };

  const handleSaveEdit = () => {
    if (!editingQuestion) return;
    updateQuestionMutation.mutate({
      id: editingQuestion,
      question: editForm.question,
      options: editForm.options,
      correctAnswer: editForm.correctAnswer,
      explanation: editForm.explanation,
    });
  };

  const handleUpdateOption = (key: string, value: string) => {
    setEditForm(prev => ({ ...prev, options: { ...prev.options, [key]: value } }));
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

  const handleBatchDelete = () => {
    if (selectedQuestionIds.size === 0) {
      toast.error("請選擇至少一題");
      return;
    }
    if (confirm(`確定要刪除選中的 ${selectedQuestionIds.size} 題嗎？此操作無法復原。`)) {
      Array.from(selectedQuestionIds).forEach(id => {
        deleteQuestionMutation.mutate({ id });
      });
      setSelectedQuestionIds(new Set());
    }
  };

  const handleMarkVerified = (questionId: number) => {
    updateQuestionMutation.mutate({ id: questionId, isVerified: 1 });
  };

  const getQuestionTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; color: string }> = {
      multiple_choice: { label: "選擇題", color: "bg-blue-100 text-blue-700 border-blue-200" },
      essay: { label: "申論題", color: "bg-purple-100 text-purple-700 border-purple-200" },
    };
    const typeInfo = typeMap[type] || { label: type, color: "bg-gray-100 text-gray-700 border-gray-200" };
    return <Badge variant="outline" className={typeInfo.color}>{typeInfo.label}</Badge>;
  };

  if (isSourceLoading || isQuestionsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sourceInfo) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">找不到素材資料</p>
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
            <h1 className="text-lg font-semibold">{sourceInfo.title}</h1>
            {sourceInfo.year && <Badge variant="outline">{sourceInfo.year}</Badge>}
            {sourceInfo.examGroup && <Badge variant="outline" className="text-xs">{sourceInfo.examGroup}</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {selectedQuestionIds.size > 0 ? (
              <>
                <span className="text-sm font-medium text-blue-600">
                  已選擇 {selectedQuestionIds.size} 題
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBatchDelete}
                  disabled={deleteQuestionMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  批量刪除
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
                <Button size="sm" variant="outline" onClick={handleSelectAll}>
                  全選
                </Button>
                <span className="text-sm text-muted-foreground">
                  共 {questions?.length || 0} 題
                </span>
              </>
            )}
          </div>
        </div>

        {/* 主要內容區域：左右分欄 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左側：PDF 預覽 */}
          <div className="w-1/2 border-r bg-muted/30 flex flex-col overflow-hidden">
            <div className="border-b bg-background px-4 py-2 flex items-center flex-shrink-0">
              <span className="text-sm font-medium">試題 PDF</span>
            </div>
            <div className="flex-1 overflow-hidden">
              {pdfDataUrl ? (
                <PdfViewerWithCrop
                  url={pdfDataUrl}
                  cropMode={false}
                  onCropModeChange={() => {}}
                  showToolbar={false}
                  onCropComplete={() => {}}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                  <p className="text-lg font-medium mb-2">無法載入 PDF 預覽</p>
                  <p className="text-sm">PDF 載入中或不存在</p>
                  {sourceInfo.fileUrl && (
                    <a
                      href={sourceInfo.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 text-sm text-blue-600 underline"
                    >
                      在新視窗開啟 PDF
                    </a>
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
                  questions.map((question: RealExamQuestion, index: number) => (
                    <Card key={question.id} className={`p-5 hover:shadow-md transition-all border rounded-xl ${question.isVerified ? 'border-green-300 bg-green-50/30' : 'border-gray-200'}`}>
                      <div className="flex items-start gap-3">
                        {/* 選擇框 */}
                        <div className="flex-shrink-0 pt-1">
                          <Checkbox
                            checked={selectedQuestionIds.has(question.id)}
                            onCheckedChange={() => handleToggleSelectQuestion(question.id)}
                          />
                        </div>
                        {/* 題號 */}
                        <div className="flex-shrink-0">
                          <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-base shadow-sm">
                            {index + 1}
                          </div>
                        </div>

                        {/* 題目內容 */}
                        <div className="flex-1 space-y-2 min-w-0">
                          {/* 標籤列 */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {getQuestionTypeBadge(question.questionType)}
                            {question.isVerified === 1 && (
                              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 text-xs">
                                ✓ 已校對
                              </Badge>
                            )}
                          </div>

                          {/* 題幹 */}
                          {editingQuestion === question.id ? (
                            <Textarea
                              value={editForm.question}
                              onChange={(e) => setEditForm(prev => ({ ...prev, question: e.target.value }))}
                              placeholder="輸入題目內容..."
                              className="min-h-[120px] text-sm"
                            />
                          ) : (
                            <p className="text-sm leading-relaxed text-gray-900 whitespace-pre-wrap">
                              {question.question}
                            </p>
                          )}

                          {/* 選項 */}
                          {question.questionType === "multiple_choice" && (
                            editingQuestion === question.id ? (
                              <div className="space-y-2 mt-2">
                                {["A", "B", "C", "D"].map((key) => (
                                  <div key={key} className="flex items-center gap-2">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-bold">
                                      {key}
                                    </span>
                                    <Input
                                      value={editForm.options[key] || ""}
                                      onChange={(e) => handleUpdateOption(key, e.target.value)}
                                      placeholder={`選項 ${key}`}
                                      className="text-sm h-8"
                                    />
                                  </div>
                                ))}
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-sm font-medium text-gray-700">正確答案：</span>
                                  <Input
                                    value={editForm.correctAnswer}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, correctAnswer: e.target.value }))}
                                    placeholder="A / B / C / D"
                                    className="w-20 text-sm h-8"
                                  />
                                </div>
                              </div>
                            ) : question.options ? (
                              <div className="space-y-1.5 mt-2">
                                {typeof question.options === 'object' && !Array.isArray(question.options) &&
                                  Object.entries(question.options).map(([key, value]: [string, any]) => {
                                    const isCorrect = question.correctAnswer === key;
                                    return (
                                      <div
                                        key={key}
                                        className={`flex items-start gap-2 p-2 rounded-lg text-sm ${
                                          isCorrect ? 'bg-green-50 border border-green-300' : 'bg-gray-50 border border-gray-200'
                                        }`}
                                      >
                                        <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                                          isCorrect ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'
                                        }`}>
                                          {key}
                                        </span>
                                        <span className="flex-1 leading-relaxed">{String(value)}</span>
                                        {isCorrect && <span className="text-xs font-semibold text-green-700">✓ 正確</span>}
                                      </div>
                                    );
                                  })
                                }
                              </div>
                            ) : null
                          )}

                          {/* 展開後的解析 */}
                          {expandedQuestions.has(question.id) && (
                            <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                              {editingQuestion === question.id ? (
                                <div>
                                  <p className="text-xs font-medium text-gray-600 mb-1">解析：</p>
                                  <Textarea
                                    value={editForm.explanation}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, explanation: e.target.value }))}
                                    placeholder="輸入解析..."
                                    className="min-h-[80px] text-sm"
                                  />
                                </div>
                              ) : question.explanation ? (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                  <p className="text-xs font-semibold text-blue-900 mb-1">📝 解析</p>
                                  <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap">{question.explanation}</p>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400 italic">無解析</p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 操作按鈕 */}
                        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                          {editingQuestion === question.id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSaveEdit}
                                className="hover:bg-green-50 hover:text-green-600 h-8 w-8 p-0"
                                title="儲存"
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
                                onClick={handleCancelEdit}
                                className="hover:bg-red-50 hover:text-red-600 h-8 w-8 p-0"
                                title="取消"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setPreviewQuestion(question); setIsPreviewOpen(true); }}
                                className="hover:bg-purple-50 hover:text-purple-600 h-8 w-8 p-0"
                                title="預覽"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEdit(question)}
                                className="hover:bg-blue-50 hover:text-blue-600 h-8 w-8 p-0"
                                title="編輯"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleExpand(question.id)}
                                className="hover:bg-gray-100 h-8 w-8 p-0"
                                title={expandedQuestions.has(question.id) ? "收起解析" : "查看解析"}
                              >
                                {expandedQuestions.has(question.id) ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                              {question.isVerified === 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkVerified(question.id)}
                                  className="hover:bg-green-50 hover:text-green-600 h-8 w-8 p-0"
                                  title="標記已校對"
                                  disabled={updateQuestionMutation.isPending}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm("確定要刪除這題嗎？")) {
                                    deleteQuestionMutation.mutate({ id: question.id });
                                  }
                                }}
                                className="hover:bg-red-50 hover:text-red-600 h-8 w-8 p-0"
                                title="刪除"
                                disabled={deleteQuestionMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <p>此素材尚未提取題目</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={handleReturn}
                    >
                      返回素材管理進行提取
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 題目預覽對話框 */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">題目預覽</DialogTitle>
          </DialogHeader>
          {previewQuestion && (
            <div className="mt-4 space-y-4">
              <div className="p-5 bg-gray-50 border-2 border-gray-200 rounded-lg">
                <p className="text-base leading-relaxed text-gray-900 font-medium whitespace-pre-wrap">
                  {previewQuestion.question}
                </p>
              </div>
              {previewQuestion.questionType === "multiple_choice" && previewQuestion.options &&
                typeof previewQuestion.options === 'object' && !Array.isArray(previewQuestion.options) && (
                  <div className="space-y-2">
                    {Object.entries(previewQuestion.options).map(([key, value]) => {
                      const isCorrect = previewQuestion.correctAnswer === key;
                      return (
                        <div
                          key={key}
                          className={`flex items-start gap-3 p-3 rounded-lg border-2 ${
                            isCorrect ? 'bg-green-50 border-green-400' : 'bg-white border-gray-200'
                          }`}
                        >
                          <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                            isCorrect ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'
                          }`}>
                            {key}
                          </span>
                          <span className="flex-1 text-sm leading-relaxed">{String(value)}</span>
                          {isCorrect && <CheckCircle2 className="flex-shrink-0 w-5 h-5 text-green-600" />}
                        </div>
                      );
                    })}
                  </div>
                )
              }
              {previewQuestion.correctAnswer && (
                <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <span className="font-bold text-blue-700">正確答案：</span>
                  <span className="text-lg font-bold text-blue-900 ml-2">{previewQuestion.correctAnswer}</span>
                </div>
              )}
              {previewQuestion.explanation && (
                <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                  <p className="font-bold text-yellow-800 mb-2">解析：</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{previewQuestion.explanation}</p>
                </div>
              )}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setIsPreviewOpen(false)}>關閉</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
