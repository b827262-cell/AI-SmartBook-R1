import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle, XCircle, RefreshCw, List, Shuffle } from "lucide-react";
import { toast } from "sonner";

export default function EssayPractice() {
  const [, setLocation] = useLocation();
  
  const [studentAnswer, setStudentAnswer] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [gradingResult, setGradingResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStandardAnswer, setShowStandardAnswer] = useState(false);
  
  // 篩選條件
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [practiceMode, setPracticeMode] = useState<"random" | "list">("random");

  // 獲取年份列表
  const { data: yearsData } = trpc.essayGrading.getYears.useQuery();
  const years = yearsData?.data || [];

  // 獲取考科列表
  const { data: subjectsData } = trpc.essayGrading.getSubjects.useQuery();
  const subjects = subjectsData?.data || [];

  // 獲取隨機題目（支援篩選）
  const { data: questionData, refetch: fetchQuestion, isLoading: isLoadingQuestion, error: questionError } = trpc.essayGrading.getRandomQuestionV2.useQuery(
    {
      source: selectedSource === "all" ? undefined : selectedSource as any,
      year: selectedYear === "all" ? undefined : selectedYear,
      subject: selectedSubject === "all" ? undefined : selectedSubject,
    },
    {
      enabled: false,
    }
  );

  // 獲取申論題列表（條列模式）
  const { data: listData, refetch: fetchList, isLoading: isLoadingList } = trpc.essayGrading.getEssayList.useQuery(
    {
      source: selectedSource === "all" ? undefined : selectedSource as any,
      year: selectedYear === "all" ? undefined : selectedYear,
      subject: selectedSubject === "all" ? undefined : selectedSubject,
      page: 1,
      pageSize: 20,
    },
    {
      enabled: false,
    }
  );

  // 處理查詢結果（隨機出題後顯示題目，不自動跳轉）
  useEffect(() => {
    if (questionData?.data) {
      setCurrentQuestion(questionData.data);
    }
  }, [questionData]);

  // 處理查詢錯誤
  useEffect(() => {
    if (questionError) {
      toast.error(questionError.message);
    }
  }, [questionError]);

  // 提交作答並批改
  const submitMutation = trpc.essayGrading.submitAndGrade.useMutation({
    onSuccess: (data) => {
      setGradingResult(data.data);
      setIsSubmitting(false);
      toast.success("批改完成！");
    },
    onError: (error) => {
      toast.error(error.message);
      setIsSubmitting(false);
    },
  });

  const handleGetQuestion = () => {
    setShowStandardAnswer(false);
    if (practiceMode === "random") {
      fetchQuestion();
    } else {
      fetchList();
    }
  };

  const handleSelectQuestion = (question: any) => {
    // 跳轉到獨立的作答頁面
    setLocation(`/essay-answer/${question.id}`);
  };

  const handleSubmit = () => {
    if (!studentAnswer.trim()) {
      toast.error("請輸入答案");
      return;
    }

    if (!currentQuestion) {
      toast.error("請先獲取題目");
      return;
    }

    setIsSubmitting(true);
    submitMutation.mutate({
      cacheId: currentQuestion.id,
      question: currentQuestion.question,
      standardAnswer: currentQuestion.answer,
      studentAnswer: studentAnswer.trim(),
    });
  };

  const handleRetry = () => {
    setStudentAnswer("");
    setGradingResult(null);
    setShowStandardAnswer(false);
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A":
        return "bg-green-500";
      case "B":
        return "bg-blue-500";
      case "C":
        return "bg-yellow-500";
      case "D":
        return "bg-orange-500";
      case "E":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getGradeText = (grade: string) => {
    switch (grade) {
      case "A":
        return "優秀";
      case "B":
        return "良好";
      case "C":
        return "中等";
      case "D":
        return "及格";
      case "E":
        return "不及格";
      default:
        return "未知";
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">申論題練習</h1>
        <p className="text-muted-foreground">
          隨機抽取申論題進行練習，AI 會根據標準答案進行多維度評分
        </p>
      </div>

      {/* 篩選和模式選擇 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>練習設定</CardTitle>
          <CardDescription>選擇練習模式和篩選條件</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 模式選擇 */}
          <div>
            <label className="text-sm font-medium mb-2 block">練習模式</label>
            <Tabs value={practiceMode} onValueChange={(v) => setPracticeMode(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="random" className="flex items-center gap-2">
                  <Shuffle className="h-4 w-4" />
                  隨機模式
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  條列模式
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* 篩選條件 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">題目來源</label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇來源" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="past_exam">考古題</SelectItem>
                  <SelectItem value="featured">精選題</SelectItem>
                  <SelectItem value="teacher">名師題</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">年份</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇年份" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {(years || []).map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">考科</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇考科" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {(subjects || []).map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 開始練習按鈕 */}
          <Button onClick={handleGetQuestion} disabled={isLoadingQuestion || isLoadingList} className="w-full">
            {isLoadingQuestion || isLoadingList ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                載入中...
              </>
            ) : practiceMode === "random" ? (
              <>
                <Shuffle className="mr-2 h-4 w-4" />
                隨機抽取題目
              </>
            ) : (
              <>
                <List className="mr-2 h-4 w-4" />
                顯示題目列表
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 條列模式：題目列表 */}
      {practiceMode === "list" && listData?.data && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>題目列表</CardTitle>
            <CardDescription>
              共找到 {listData.pagination?.total || 0} 題，點擊題目開始作答
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(listData.data || []).map((q: any, index: number) => (
                <div
                  key={q.id}
                  className={`p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                    currentQuestion?.id === q.id ? "bg-accent border-primary" : ""
                  }`}
                  onClick={() => handleSelectQuestion(q)}
                >
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-1">
                      {index + 1}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm line-clamp-2">{q.question}</p>
                      <div className="flex gap-2 mt-2">
                        {q.source && (
                          <Badge variant="secondary" className="text-xs">
                            {q.source === "past_exam" ? "考古題" : q.source === "featured" ? "精選題" : "名師題"}
                          </Badge>
                        )}
                        {q.year && (
                          <Badge variant="secondary" className="text-xs">
                            {q.year}年
                          </Badge>
                        )}
                        {q.subject && (
                          <Badge variant="secondary" className="text-xs">
                            {q.subject}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 隨機模式：題目卡片 */}
      {practiceMode === "random" && currentQuestion && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>抽到的題目</CardTitle>
            <CardDescription>
              點擊下方題目進入作答頁面
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="p-6 border-2 rounded-lg cursor-pointer hover:bg-accent hover:border-primary transition-colors"
              onClick={() => handleSelectQuestion(currentQuestion)}
            >
              <div className="prose prose-sm max-w-none mb-4">
                <p className="whitespace-pre-wrap text-lg">{currentQuestion.question}</p>
              </div>
              {(currentQuestion.source || currentQuestion.year || currentQuestion.subject) && (
                <div className="flex gap-2 pt-4 border-t">
                  {currentQuestion.source && (
                    <Badge variant="secondary">
                      {currentQuestion.source === "past_exam" ? "考古題" : currentQuestion.source === "featured" ? "精選題" : "名師題"}
                    </Badge>
                  )}
                  {currentQuestion.year && (
                    <Badge variant="secondary">{currentQuestion.year}年</Badge>
                  )}
                  {currentQuestion.subject && (
                    <Badge variant="secondary">{currentQuestion.subject}</Badge>
                  )}
                </div>
              )}
              <div className="mt-4 text-center">
                <Button className="w-full">
                  開始作答
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}



      {/* 初始狀態提示 */}
      {!currentQuestion && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              請選擇練習模式和篩選條件，然後點擊「開始練習」按鈕
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
