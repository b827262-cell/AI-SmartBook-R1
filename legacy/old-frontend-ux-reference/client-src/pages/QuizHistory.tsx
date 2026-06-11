import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar, Target, TrendingUp, BookOpen, ChevronRight } from "lucide-react";

export default function QuizHistory() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);

  // 獲取所有類科
  const { data: categoriesData } = trpc.knowledgeLearning.getCategories.useQuery();
  const categories = categoriesData?.categories || [];

  // 獲取測驗歷史列表
  const { data: historyData, isLoading } = trpc.knowledgeLearning.getQuizHistory.useQuery({
    categoryId: selectedCategory,
  });
  const history = historyData?.history || [];

  // 獲取測驗歷史統計
  const { data: statsData } = trpc.knowledgeLearning.getQuizHistoryStats.useQuery();
  const stats = statsData?.stats;

  // 獲取單次測驗詳情
  const { data: detailData } = trpc.knowledgeLearning.getQuizHistoryDetail.useQuery(
    { historyId: selectedHistoryId! },
    { enabled: selectedHistoryId !== null }
  );
  const detail = detailData?.detail;

  // 格式化日期
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 獲取分數顏色
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    return "text-red-600";
  };

  // 如果選擇了某次測驗，顯示詳細答題情況
  if (selectedHistoryId && detail) {
    const quizData = detail.quizData as { questions: any[] };
    const optionKeys = ["A", "B", "C", "D"];

    return (
      <div className="container mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => setSelectedHistoryId(null)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回測驗歷史
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{detail.chapterTitle}</CardTitle>
            <CardDescription>
              測驗時間：{formatDate(detail.createdAt)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">分數</div>
                <div className={`text-3xl font-bold ${getScoreColor(detail.score)}`}>
                  {detail.score}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">答對題數</div>
                <div className="text-3xl font-bold text-green-600">
                  {detail.correctCount}/{detail.totalQuestions}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">正確率</div>
                <div className="text-3xl font-bold text-blue-600">
                  {Math.round((detail.correctCount / detail.totalQuestions) * 100)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">答題詳情</h2>
          {quizData.questions.map((question: any, index: number) => {
            const userAnswerKey = optionKeys[question.userAnswer];
            const isCorrect = userAnswerKey === question.correctAnswer;

            return (
              <Card key={index} className={isCorrect ? "border-green-200" : "border-red-200"}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    第 {index + 1} 題
                    {isCorrect ? (
                      <span className="ml-2 text-green-600">✓ 答對</span>
                    ) : (
                      <span className="ml-2 text-red-600">✗ 答錯</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="font-medium mb-2">題目：</div>
                    <div className="text-muted-foreground">{question.question}</div>
                  </div>

                  <div>
                    <div className="font-medium mb-2">選項：</div>
                    <div className="space-y-2">
                      {question.options.map((option: string, optIndex: number) => {
                        const optKey = optionKeys[optIndex];
                        const isUserAnswer = optKey === userAnswerKey;
                        const isCorrectAnswer = optKey === question.correctAnswer;

                        return (
                          <div
                            key={optIndex}
                            className={`p-2 rounded ${
                              isCorrectAnswer
                                ? "bg-green-50 border border-green-200"
                                : isUserAnswer
                                ? "bg-red-50 border border-red-200"
                                : "bg-gray-50"
                            }`}
                          >
                            {optKey}. {option}
                            {isCorrectAnswer && (
                              <span className="ml-2 text-green-600 font-medium">
                                (正確答案)
                              </span>
                            )}
                            {isUserAnswer && !isCorrectAnswer && (
                              <span className="ml-2 text-red-600 font-medium">
                                (您的答案)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {question.explanation && (
                    <div>
                      <div className="font-medium mb-2">解析：</div>
                      <div className="text-muted-foreground bg-blue-50 p-3 rounded">
                        {question.explanation}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // 顯示測驗歷史列表
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setLocation("/student")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回智能專區
          </Button>
          <h1 className="text-3xl font-bold">測驗歷史</h1>
        </div>
      </div>

      {/* 統計卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                總測驗次數
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalTests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                總答題數
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalQuestions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                平均分數
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getScoreColor(stats.averageScore)}`}>
                {stats.averageScore}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                總答對數
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.totalCorrect}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 類科篩選 */}
      <div className="mb-6">
        <Select
          value={selectedCategory?.toString() || "all"}
          onValueChange={(value) => setSelectedCategory(value === "all" ? undefined : Number(value))}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="選擇類科" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部類科</SelectItem>
            {categories.map((cat: any) => (
              <SelectItem key={cat.id} value={cat.id.toString()}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 測驗歷史列表 */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">載入中...</div>
      ) : history.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            尚無測驗記錄
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((record: any) => (
            <Card
              key={record.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedHistoryId(record.id)}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-lg mb-1">{record.chapterTitle}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(record.createdAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">分數</div>
                      <div className={`text-2xl font-bold ${getScoreColor(record.score)}`}>
                        {record.score}
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">答對</div>
                      <div className="text-2xl font-bold text-green-600">
                        {record.correctCount}/{record.totalQuestions}
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
