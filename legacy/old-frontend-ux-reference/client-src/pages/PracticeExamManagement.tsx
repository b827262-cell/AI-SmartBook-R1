/**
 * 管理後台 - 考卷管理頁面
 * 功能：創建、編輯、刪除考卷，管理考卷題目關聯
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, FileText } from "lucide-react";
import { QuestionSelector } from "@/components/QuestionSelector";

type ViewMode = "list" | "edit" | "manageQuestions";

export default function PracticeExamManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedExamTitle, setSelectedExamTitle] = useState<string>("");
  const [selectedExamSubject, setSelectedExamSubject] = useState<string | undefined>(undefined);
  const [isQuestionSelectorOpen, setIsQuestionSelectorOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // 表單狀態
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    subject: "",
    year: new Date().getFullYear(),
    timeLimit: 60,
    totalScore: 100,
    difficulty: "medium" as "easy" | "medium" | "hard",
    status: "draft" as "draft" | "published" | "archived",
    accessType: "free" as "free" | "paid" | "class_only",
    requiredCredits: 0,
  });

  // 查詢考卷列表
  const { data: exams, refetch: refetchExams } = trpc.practiceExams.list.useQuery({});

  // 創建考卷
  const createExam = trpc.practiceExams.create.useMutation({
    onSuccess: () => {
      toast.success("考卷創建成功！");
      setIsCreateDialogOpen(false);
      refetchExams();
      resetForm();
    },
    onError: (error) => {
      toast.error(`創建失敗：${error.message}`);
    },
  });

  // 更新考卷
  const updateExam = trpc.practiceExams.update.useMutation({
    onSuccess: () => {
      toast.success("考卷更新成功！");
      refetchExams();
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  // 刪除考卷
  const deleteExam = trpc.practiceExams.delete.useMutation({
    onSuccess: () => {
      toast.success("考卷刪除成功！");
      refetchExams();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "",
      subject: "",
      year: new Date().getFullYear(),
      timeLimit: 60,
      totalScore: 100,
      difficulty: "medium",
      status: "draft",
      accessType: "free",
      requiredCredits: 0,
    });
  };

  const handleCreate = () => {
    if (!formData.title.trim()) {
      toast.error("請輸入考卷標題");
      return;
    }
    createExam.mutate(formData);
  };

  const handleDelete = (id: number, title: string) => {
    if (confirm(`確定要刪除考卷「${title}」嗎？`)) {
      deleteExam.mutate({ id });
    }
  };

  const handleStatusChange = (id: number, status: "draft" | "published" | "archived") => {
    updateExam.mutate({ id, status });
  };

  return (
    <div className="min-h-screen bg-background">
      
      
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">考卷管理</h1>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                新增考卷
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>新增考卷</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">考卷標題 *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="例如：114高考三級 - 國文"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">考卷描述</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="考卷的詳細說明..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">分類</label>
                    <Input
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="例如：高考三級/普考"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">科目</label>
                    <Input
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="例如：國文"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">年度</label>
                    <Input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">時間限制（分鐘）</label>
                    <Input
                      type="number"
                      value={formData.timeLimit}
                      onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">總分</label>
                    <Input
                      type="number"
                      value={formData.totalScore}
                      onChange={(e) => setFormData({ ...formData, totalScore: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">難度</label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value: "easy" | "medium" | "hard") =>
                        setFormData({ ...formData, difficulty: value })
                      }
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

                  <div>
                    <label className="block text-sm font-medium mb-2">狀態</label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: "draft" | "published" | "archived") =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">草稿</SelectItem>
                        <SelectItem value="published">已發布</SelectItem>
                        <SelectItem value="archived">已封存</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">訪問類型</label>
                    <Select
                      value={formData.accessType}
                      onValueChange={(value: "free" | "paid" | "class_only") =>
                        setFormData({ ...formData, accessType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">🆓 免費</SelectItem>
                        <SelectItem value="paid">💰 付費</SelectItem>
                        <SelectItem value="class_only">🎓 班內生專用</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">所需點數</label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.requiredCredits}
                      onChange={(e) => setFormData({ ...formData, requiredCredits: parseInt(e.target.value) || 0 })}
                      disabled={formData.accessType !== "paid"}
                      placeholder="付費考卷需要設定點數"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreate} disabled={createExam.isPending}>
                    {createExam.isPending ? "創建中..." : "創建考卷"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 考卷列表 */}
        <div className="bg-card rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left">標題</th>
                  <th className="px-4 py-3 text-left">分類</th>
                  <th className="px-4 py-3 text-left">科目</th>
                  <th className="px-4 py-3 text-center">年度</th>
                  <th className="px-4 py-3 text-center">題數</th>
                  <th className="px-4 py-3 text-center">狀態</th>
                  <th className="px-4 py-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {exams?.map((exam) => (
                  <tr key={exam.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">{exam.title}</td>
                    <td className="px-4 py-3">{exam.category || "-"}</td>
                    <td className="px-4 py-3">{exam.subject || "-"}</td>
                    <td className="px-4 py-3 text-center">{exam.year || "-"}</td>
                    <td className="px-4 py-3 text-center">{exam.totalQuestions}</td>
                    <td className="px-4 py-3 text-center">
                      <Select
                        value={exam.status}
                        onValueChange={(value: "draft" | "published" | "archived") =>
                          handleStatusChange(exam.id, value)
                        }
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">草稿</SelectItem>
                          <SelectItem value="published">已發布</SelectItem>
                          <SelectItem value="archived">已封存</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedExamId(exam.id);
                            setSelectedExamTitle(exam.title);
                            setSelectedExamSubject(exam.subject || undefined);
                            setIsQuestionSelectorOpen(true);
                          }}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(exam.id, exam.title)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!exams || exams.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                尚無考卷，請點擊「新增考卷」創建第一個考卷
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 題目選擇器 */}
      {selectedExamId && (
        <QuestionSelector
          examId={selectedExamId}
          examTitle={selectedExamTitle}
          examSubject={selectedExamSubject}
          isOpen={isQuestionSelectorOpen}
          onClose={() => setIsQuestionSelectorOpen(false)}
          onSuccess={() => {
            refetchExams();
            setIsQuestionSelectorOpen(false);
          }}
        />
      )}
    </div>
  );
}
