import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import RichTextEditor from "@/components/RichTextEditor";
import RichTextDisplay from "@/components/RichTextDisplay";

export default function AdminQuestions() {
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState<number | null>(null);

  // 表單狀態
  const [formData, setFormData] = useState({
    subjectId: 0,
    year: new Date().getFullYear() - 1911, // 民國年
    questionType: "multiple_choice" as "multiple_choice" | "essay",
    difficulty: "medium" as "easy" | "medium" | "hard",
    questionText: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswer: "",
    explanation: "",
  });

  // 獲取科目列表
  const { data: subjects } = trpc.exam.getSubjects.useQuery();

  // 獲取題目列表
  const { data: questions, refetch: refetchQuestions } = trpc.exam.getQuestions.useQuery(
    { subjectId: selectedSubject!, limit: 100, offset: 0 },
    { enabled: selectedSubject !== null }
  );

  // 創建題目
  const createQuestionMutation = trpc.exam.createQuestion.useMutation({
    onSuccess: () => {
      toast.success("題目創建成功");
      setIsCreateDialogOpen(false);
      resetForm();
      refetchQuestions();
    },
    onError: (error) => {
      toast.error("創建失敗", { description: error.message });
    },
  });

  const resetForm = () => {
    setFormData({
      subjectId: 0,
      year: new Date().getFullYear() - 1911,
      questionType: "multiple_choice",
      difficulty: "medium",
      questionText: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctAnswer: "",
      explanation: "",
    });
  };

  const handleSubmit = () => {
    if (!formData.subjectId || !formData.questionText) {
      toast.error("請填寫必填欄位");
      return;
    }

    if (formData.questionType === "multiple_choice") {
      if (!formData.optionA || !formData.optionB || !formData.optionC || !formData.optionD || !formData.correctAnswer) {
        toast.error("選擇題必須填寫所有選項和正確答案");
        return;
      }
    }

    createQuestionMutation.mutate(formData);
  };

  // 篩選題目
  const filteredQuestions = questions?.filter((q) =>
    q.questionText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      
      <div className="container max-w-7xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">試題管理</h1>
        <p className="text-muted-foreground">
          管理考試題目，新增、編輯或刪除題目
        </p>
      </div>

      {/* 操作欄 */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Label>選擇科目</Label>
          <Select
            value={selectedSubject?.toString() || ""}
            onValueChange={(value) => setSelectedSubject(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="選擇科目" />
            </SelectTrigger>
            <SelectContent>
              {subjects?.map((subject) => (
                <SelectItem key={subject.id} value={subject.id.toString()}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <Label>搜尋題目</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="輸入關鍵字搜尋..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex items-end">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新增題目
          </Button>
        </div>
      </div>

      {/* 題目列表 */}
      <Card>
        <CardHeader>
          <CardTitle>題目列表</CardTitle>
          <CardDescription>
            {selectedSubject ? `共 ${filteredQuestions?.length || 0} 題` : "請先選擇科目"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedSubject ? (
            filteredQuestions && filteredQuestions.length > 0 ? (
              <div className="space-y-4">
                {filteredQuestions.map((question) => (
                  <div key={question.id} className="p-4 border rounded-lg hover:bg-accent">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{question.year} 年</Badge>
                          <Badge variant={
                            question.difficulty === "easy" ? "default" :
                            question.difficulty === "medium" ? "secondary" : "destructive"
                          }>
                            {question.difficulty === "easy" ? "簡單" :
                             question.difficulty === "medium" ? "中等" : "困難"}
                          </Badge>
                          <Badge variant="outline">
                            {question.questionType === "multiple_choice" ? "選擇題" : "申論題"}
                          </Badge>
                        </div>
                        <div className="mb-2">
                          <RichTextDisplay content={question.questionText} />
                        </div>
                        {question.questionType === "multiple_choice" && (
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>A. {question.optionA}</div>
                            <div>B. {question.optionB}</div>
                            <div>C. {question.optionC}</div>
                            <div>D. {question.optionD}</div>
                            <div className="text-green-600 font-semibold mt-2">
                              正確答案：{question.correctAnswer}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingQuestion(question)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingQuestionId(question.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {question.explanation && (
                      <div className="text-sm text-muted-foreground mt-2 p-2 bg-blue-50 rounded">
                        <strong>解析：</strong>
                        <RichTextDisplay content={question.explanation} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? "沒有符合的題目" : "該科目暫無題目"}
              </div>
            )
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              請先選擇科目以查看題目
            </div>
          )}
        </CardContent>
      </Card>

      {/* 新增/編輯題目對話框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新增題目</DialogTitle>
            <DialogDescription>填寫題目資訊</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>科目 *</Label>
                <Select
                  value={formData.subjectId.toString()}
                  onValueChange={(value) => setFormData({ ...formData, subjectId: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇科目" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects?.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>年度（民國）*</Label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label>題型 *</Label>
                <Select
                  value={formData.questionType}
                  onValueChange={(value: any) => setFormData({ ...formData, questionType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">選擇題</SelectItem>
                    <SelectItem value="essay">申論題</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>難度 *</Label>
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

            <div>
              <Label>題目內容 *</Label>
              <RichTextEditor
                content={formData.questionText}
                onChange={(content) => setFormData({ ...formData, questionText: content })}
                placeholder="輸入題目內容，支援數學公式、圖片等格式"
              />
            </div>

            {formData.questionType === "multiple_choice" && (
              <>
                <div className="space-y-4">
                  <div>
                    <Label>選項 A *</Label>
                    <RichTextEditor
                      content={formData.optionA}
                      onChange={(content) => setFormData({ ...formData, optionA: content })}
                      placeholder="選項 A 內容"
                      className="min-h-[100px]"
                    />
                  </div>
                  <div>
                    <Label>選項 B *</Label>
                    <RichTextEditor
                      content={formData.optionB}
                      onChange={(content) => setFormData({ ...formData, optionB: content })}
                      placeholder="選項 B 內容"
                      className="min-h-[100px]"
                    />
                  </div>
                  <div>
                    <Label>選項 C *</Label>
                    <RichTextEditor
                      content={formData.optionC}
                      onChange={(content) => setFormData({ ...formData, optionC: content })}
                      placeholder="選項 C 內容"
                      className="min-h-[100px]"
                    />
                  </div>
                  <div>
                    <Label>選項 D *</Label>
                    <RichTextEditor
                      content={formData.optionD}
                      onChange={(content) => setFormData({ ...formData, optionD: content })}
                      placeholder="選項 D 內容"
                      className="min-h-[100px]"
                    />
                  </div>
                </div>

                <div>
                  <Label>正確答案 *</Label>
                  <Select
                    value={formData.correctAnswer}
                    onValueChange={(value) => setFormData({ ...formData, correctAnswer: value })}
                  >
                    <SelectTrigger>
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
              </>
            )}

            <div>
              <Label>解析</Label>
              <RichTextEditor
                content={formData.explanation}
                onChange={(content) => setFormData({ ...formData, explanation: content })}
                placeholder="輸入題目解析，支援數學公式、圖片等格式"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={createQuestionMutation.isPending}>
              {createQuestionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  創建中...
                </>
              ) : (
                "創建"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除確認對話框 */}
      <AlertDialog open={deletingQuestionId !== null} onOpenChange={() => setDeletingQuestionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作無法撤銷，確定要刪除這個題目嗎？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                toast.info("刪除功能尚未實作");
                setDeletingQuestionId(null);
              }}
            >
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </>
  );
}
