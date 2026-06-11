import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, BarChart3 } from "lucide-react";

export default function TeacherQuestions() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterAccessType, setFilterAccessType] = useState<string>("");

  const utils = trpc.useUtils();

  // 獲取考題列表
  const { data: questions = [], isLoading } = trpc.teacherQuestions.list.useQuery({
    category: filterCategory || undefined,
    accessType: filterAccessType as any || undefined,
  });

  // 獲取統計資訊
  const { data: stats } = trpc.teacherQuestions.getStats.useQuery();

  // 創建考題
  const createMutation = trpc.teacherQuestions.create.useMutation({
    onSuccess: () => {
      utils.teacherQuestions.list.invalidate();
      utils.teacherQuestions.getStats.invalidate();
      setIsCreateDialogOpen(false);
      alert("考題創建成功！");
    },
    onError: (error) => {
      alert(`創建失敗：${error.message}`);
    },
  });

  // 更新考題
  const updateMutation = trpc.teacherQuestions.update.useMutation({
    onSuccess: () => {
      utils.teacherQuestions.list.invalidate();
      setEditingQuestion(null);
      alert("考題更新成功！");
    },
    onError: (error) => {
      alert(`更新失敗：${error.message}`);
    },
  });

  // 刪除考題
  const deleteMutation = trpc.teacherQuestions.delete.useMutation({
    onSuccess: () => {
      utils.teacherQuestions.list.invalidate();
      utils.teacherQuestions.getStats.invalidate();
      alert("考題刪除成功！");
    },
    onError: (error) => {
      alert(`刪除失敗：${error.message}`);
    },
  });

  const handleCreateQuestion = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const optionsText = formData.get("options") as string;
    const options = optionsText ? optionsText.split("\n").filter(o => o.trim()) : undefined;

    createMutation.mutate({
      question: formData.get("question") as string,
      type: formData.get("type") as any,
      options,
      correctAnswer: formData.get("correctAnswer") as string || undefined,
      explanation: formData.get("explanation") as string || undefined,
      category: formData.get("category") as string || undefined,
      difficulty: formData.get("difficulty") as any || undefined,
      accessType: formData.get("accessType") as any,
      pointsRequired: parseInt(formData.get("pointsRequired") as string) || 0,
    });
  };

  const handleUpdateQuestion = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const optionsText = formData.get("options") as string;
    const options = optionsText ? optionsText.split("\n").filter(o => o.trim()) : undefined;

    updateMutation.mutate({
      questionId: editingQuestion.id,
      question: formData.get("question") as string,
      type: formData.get("type") as any,
      options,
      correctAnswer: formData.get("correctAnswer") as string || undefined,
      explanation: formData.get("explanation") as string || undefined,
      category: formData.get("category") as string || undefined,
      difficulty: formData.get("difficulty") as any || undefined,
      accessType: formData.get("accessType") as any,
      pointsRequired: parseInt(formData.get("pointsRequired") as string) || 0,
    });
  };

  const handleDeleteQuestion = (questionId: number) => {
    if (confirm("確定要刪除這個考題嗎？")) {
      deleteMutation.mutate({ questionId });
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">我的考題管理</h1>
        <p className="text-muted-foreground">創建、編輯和管理您的專屬考題</p>
      </div>

      {/* 統計卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">總考題數</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">免費考題</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.free}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">付費考題</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.paid}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">班內生專用</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.classOnly}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 篩選和創建按鈕 */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Input
          placeholder="篩選類科..."
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filterAccessType} onValueChange={setFilterAccessType}>
          <SelectTrigger className="max-w-xs">
            <SelectValue placeholder="篩選訪問類型..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="free">免費</SelectItem>
            <SelectItem value="paid">付費</SelectItem>
            <SelectItem value="class_only">班內生專用</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              創建考題
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>創建新考題</DialogTitle>
              <DialogDescription>填寫考題資訊並設定訪問權限</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateQuestion}>
              <QuestionForm />
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "創建中..." : "創建"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 考題列表 */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">載入中...</p>
        </div>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">還沒有考題</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              創建第一個考題
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((question: any) => (
            <Card key={question.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{question.question}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      {question.category && (
                        <Badge variant="outline">{question.category}</Badge>
                      )}
                      <Badge variant={
                        question.accessType === "free" ? "default" :
                        question.accessType === "paid" ? "secondary" :
                        "destructive"
                      }>
                        {question.accessType === "free" ? "免費" :
                         question.accessType === "paid" ? `付費 (${question.pointsRequired} 點)` :
                         "班內生專用"}
                      </Badge>
                      <Badge variant="outline">
                        {question.difficulty === "easy" ? "簡單" :
                         question.difficulty === "medium" ? "中等" :
                         "困難"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingQuestion(question)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteQuestion(question.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {question.options && (
                <CardContent>
                  <div className="space-y-1">
                    {question.options.map((option: string, index: number) => (
                      <div key={index} className="text-sm">
                        {String.fromCharCode(65 + index)}. {option}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* 編輯對話框 */}
      {editingQuestion && (
        <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>編輯考題</DialogTitle>
              <DialogDescription>修改考題資訊和訪問權限</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateQuestion}>
              <QuestionForm defaultValues={editingQuestion} />
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "更新中..." : "更新"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// 考題表單組件
function QuestionForm({ defaultValues }: { defaultValues?: any }) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="question">考題內容 *</Label>
        <Textarea
          id="question"
          name="question"
          defaultValue={defaultValues?.question}
          required
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">題目類型 *</Label>
          <Select name="type" defaultValue={defaultValues?.type || "multiple_choice"} required>
            <SelectTrigger>
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
          <Label htmlFor="difficulty">難度</Label>
          <Select name="difficulty" defaultValue={defaultValues?.difficulty || "medium"}>
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
        <Label htmlFor="options">選項（每行一個，僅選擇題需要）</Label>
        <Textarea
          id="options"
          name="options"
          defaultValue={defaultValues?.options?.join("\n")}
          rows={4}
          placeholder="選項 A&#10;選項 B&#10;選項 C&#10;選項 D"
        />
      </div>

      <div>
        <Label htmlFor="correctAnswer">正確答案</Label>
        <Input
          id="correctAnswer"
          name="correctAnswer"
          defaultValue={defaultValues?.correctAnswer}
          placeholder="例如：A 或 選項 A"
        />
      </div>

      <div>
        <Label htmlFor="explanation">解析</Label>
        <Textarea
          id="explanation"
          name="explanation"
          defaultValue={defaultValues?.explanation}
          rows={4}
        />
      </div>

      <div>
        <Label htmlFor="category">類科</Label>
        <Input
          id="category"
          name="category"
          defaultValue={defaultValues?.category}
          placeholder="例如：法律、會計、商學"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="accessType">訪問類型 *</Label>
          <Select name="accessType" defaultValue={defaultValues?.accessType || "free"} required>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">免費</SelectItem>
              <SelectItem value="paid">付費</SelectItem>
              <SelectItem value="class_only">班內生專用</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="pointsRequired">所需點數</Label>
          <Input
            id="pointsRequired"
            name="pointsRequired"
            type="number"
            min="0"
            defaultValue={defaultValues?.pointsRequired || 0}
          />
        </div>
      </div>
    </div>
  );
}
