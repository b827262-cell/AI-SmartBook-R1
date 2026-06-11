import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// 簡單的 toast 實作
const useToast = () => ({
  toast: (options: any) => {
    alert(options.title + (options.description ? "\n" + options.description : ""));
  },
});
import { Loader2, MessageSquare, CheckCircle, Clock, Archive, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * 學生問題管理頁面（老師/助教專用）
 * 
 * 功能：
 * 1. 查看學生提交的問題列表
 * 2. 篩選問題（狀態、分類、優先級）
 * 3. 查看問題詳情
 * 4. 回覆學生問題
 * 5. 更新問題狀態和優先級
 * 6. 將問題轉換為 FAQ
 */

type QuestionStatus = "pending" | "reviewing" | "answered" | "resolved" | "archived";
type QuestionPriority = "low" | "medium" | "high";

const statusLabels: Record<QuestionStatus, string> = {
  pending: "待處理",
  reviewing: "處理中",
  answered: "已回答",
  resolved: "已解決",
  archived: "已封存",
};

const statusIcons: Record<QuestionStatus, any> = {
  pending: Clock,
  reviewing: MessageSquare,
  answered: CheckCircle,
  resolved: CheckCircle,
  archived: Archive,
};

const priorityLabels: Record<QuestionPriority, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

const priorityColors: Record<QuestionPriority, string> = {
  low: "bg-gray-500",
  medium: "bg-yellow-500",
  high: "bg-red-500",
};

export default function StudentQuestions() {
  const { toast } = useToast();
  const [currentTab, setCurrentTab] = useState<QuestionStatus>("pending");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [convertToFAQDialogOpen, setConvertToFAQDialogOpen] = useState(false);
  const [faqAnswer, setFaqAnswer] = useState("");

  // 獲取問題列表
  const { data: questionsData, isLoading, refetch } = trpc.studentQuestions.listQuestions.useQuery({
    page: 1,
    pageSize: 50,
    status: currentTab,
    category: selectedCategory === "all" ? undefined : selectedCategory,
    priority: selectedPriority === "all" ? undefined : (selectedPriority as QuestionPriority),
  });

  // 回覆問題
  const replyMutation = trpc.studentQuestions.replyToQuestion.useMutation({
    onSuccess: () => {
      toast({ title: "回覆成功", description: "已成功回覆學生問題" });
      setReplyDialogOpen(false);
      setReplyContent("");
      refetch();
    },
    onError: (error) => {
      toast({ title: "回覆失敗", description: error.message, variant: "destructive" });
    },
  });

  // 更新問題狀態
  const updateStatusMutation = trpc.studentQuestions.updateQuestionStatus.useMutation({
    onSuccess: () => {
      toast({ title: "狀態更新成功" });
      refetch();
    },
    onError: (error) => {
      toast({ title: "狀態更新失敗", description: error.message, variant: "destructive" });
    },
  });

  // 更新問題優先級
  const updatePriorityMutation = trpc.studentQuestions.updateQuestionPriority.useMutation({
    onSuccess: () => {
      toast({ title: "優先級更新成功" });
      refetch();
    },
    onError: (error) => {
      toast({ title: "優先級更新失敗", description: error.message, variant: "destructive" });
    },
  });

  // 轉換為 FAQ
  const convertToFAQMutation = trpc.studentQuestions.convertToFAQ.useMutation({
    onSuccess: () => {
      toast({ title: "轉換成功", description: "已成功將問題轉換為 FAQ" });
      setConvertToFAQDialogOpen(false);
      setFaqAnswer("");
      refetch();
    },
    onError: (error) => {
      toast({ title: "轉換失敗", description: error.message, variant: "destructive" });
    },
  });

  const handleReply = () => {
    if (!selectedQuestion || !replyContent.trim()) {
      toast({ title: "請輸入回覆內容", variant: "destructive" });
      return;
    }

    replyMutation.mutate({
      id: selectedQuestion.id,
      reply: replyContent,
    });
  };

  const handleConvertToFAQ = () => {
    if (!selectedQuestion || !faqAnswer.trim()) {
      toast({ title: "請輸入 FAQ 答案", variant: "destructive" });
      return;
    }

    convertToFAQMutation.mutate({
      questionId: selectedQuestion.id,
      answer: faqAnswer,
    });
  };

  const handleUpdateStatus = (questionId: number, status: QuestionStatus) => {
    updateStatusMutation.mutate({ id: questionId, status });
  };

  const handleUpdatePriority = (questionId: number, priority: QuestionPriority) => {
    updatePriorityMutation.mutate({ id: questionId, priority });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const questions = questionsData?.data || [];
  const totalCount = questionsData?.total || 0;

  return (
    <div className="container py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">學生問題管理</h1>
        <p className="text-muted-foreground">
          查看和回覆學生在學習過程中遇到的問題
        </p>
      </div>

      {/* 篩選器 */}
      <div className="flex gap-4 mb-6">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="選擇分類" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有分類</SelectItem>
            <SelectItem value="微積分">微積分</SelectItem>
            <SelectItem value="線性代數">線性代數</SelectItem>
            <SelectItem value="機率統計">機率統計</SelectItem>
            <SelectItem value="民法">民法</SelectItem>
            <SelectItem value="刑法">刑法</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedPriority} onValueChange={setSelectedPriority}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="選擇優先級" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有優先級</SelectItem>
            <SelectItem value="high">高優先級</SelectItem>
            <SelectItem value="medium">中優先級</SelectItem>
            <SelectItem value="low">低優先級</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 問題列表（按狀態分類） */}
      <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as QuestionStatus)}>
        <TabsList className="mb-6">
          <TabsTrigger value="pending">待處理</TabsTrigger>
          <TabsTrigger value="reviewing">處理中</TabsTrigger>
          <TabsTrigger value="answered">已回答</TabsTrigger>
          <TabsTrigger value="resolved">已解決</TabsTrigger>
          <TabsTrigger value="archived">已封存</TabsTrigger>
        </TabsList>

        <TabsContent value={currentTab}>
          {questions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                目前沒有{statusLabels[currentTab]}的問題
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {questions.map((question: any) => {
                const StatusIcon = statusIcons[question.status as QuestionStatus];
                
                return (
                  <Card key={question.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">{question.questionTitle}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {question.questionContent}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge className={priorityColors[question.priority as QuestionPriority]}>
                            {priorityLabels[question.priority as QuestionPriority]}
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <StatusIcon className="w-3 h-3" />
                            {statusLabels[question.status as QuestionStatus]}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {question.category && (
                            <span className="flex items-center gap-1">
                              <Badge variant="secondary">{question.category}</Badge>
                            </span>
                          )}
                          {question.topic && (
                            <span>{question.topic}</span>
                          )}
                          <span>查看次數：{question.viewCount}</span>
                          <span>{new Date(question.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedQuestion(question);
                              setReplyDialogOpen(true);
                            }}
                          >
                            回覆
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedQuestion(question);
                              setFaqAnswer(question.teacherReply || "");
                              setConvertToFAQDialogOpen(true);
                            }}
                          >
                            轉為 FAQ
                          </Button>
                          <Select
                            value={question.status}
                            onValueChange={(value) => handleUpdateStatus(question.id, value as QuestionStatus)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">待處理</SelectItem>
                              <SelectItem value="reviewing">處理中</SelectItem>
                              <SelectItem value="answered">已回答</SelectItem>
                              <SelectItem value="resolved">已解決</SelectItem>
                              <SelectItem value="archived">已封存</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {question.teacherReply && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-2">老師回覆：</p>
                          <p className="text-sm">{question.teacherReply}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 回覆對話框 */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>回覆學生問題</DialogTitle>
            <DialogDescription>
              {selectedQuestion?.questionTitle}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">問題內容：</p>
              <p className="text-sm text-muted-foreground">{selectedQuestion?.questionContent}</p>
            </div>
            {selectedQuestion?.studentAnswer && (
              <div>
                <p className="text-sm font-medium mb-2">學生回答：</p>
                <p className="text-sm text-muted-foreground">{selectedQuestion.studentAnswer}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium mb-2">您的回覆：</p>
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="請輸入回覆內容..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleReply} disabled={replyMutation.isPending}>
              {replyMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              送出回覆
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 轉換為 FAQ 對話框 */}
      <Dialog open={convertToFAQDialogOpen} onOpenChange={setConvertToFAQDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>將問題轉換為 FAQ</DialogTitle>
            <DialogDescription>
              此問題將被加入 FAQ 列表，供所有學生查看
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">問題：</p>
              <p className="text-sm text-muted-foreground">{selectedQuestion?.questionContent}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">答案：</p>
              <Textarea
                value={faqAnswer}
                onChange={(e) => setFaqAnswer(e.target.value)}
                placeholder="請輸入 FAQ 答案..."
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertToFAQDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleConvertToFAQ} disabled={convertToFAQMutation.isPending}>
              {convertToFAQMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              轉換為 FAQ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
