import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, Trash2, BookOpen } from "lucide-react";


export default function QuizWrongQuestions() {
  const [, setLocation] = useLocation();

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState(false);

  // 獲取類科列表
  const { data: categoriesData } = trpc.knowledgeLearning.listCategories.useQuery();
  const categories = categoriesData?.categories || [];

  // 獲取錯題列表
  const { data: wrongQuestionsData, refetch } = trpc.knowledgeLearning.getQuizWrongQuestions.useQuery(
    { categoryId: selectedCategoryId },
    { refetchOnMount: true }
  );
  const wrongQuestions = wrongQuestionsData?.wrongQuestions || [];

  // 標記已學會
  const markMasteredMutation = trpc.knowledgeLearning.markQuizWrongQuestionMastered.useMutation({
    onSuccess: () => {
      alert("✅ 已標記為已學會");
      refetch();
    },
    onError: (error) => {
      alert(`❌ 標記失敗：${error.message}`);
    },
  });

  // 批量標記已學會
  const markMultipleMutation = trpc.knowledgeLearning.markMultipleQuestionsMastered.useMutation({
    onSuccess: () => {
      alert("✅ 已批量標記為已學會");
      refetch();
    },
    onError: (error) => {
      alert(`❌ 批量標記失敗：${error.message}`);
    },
  });

  // 刪除錯題
  const deleteMutation = trpc.knowledgeLearning.deleteQuizWrongQuestion.useMutation({
    onSuccess: () => {
      alert("✅ 已刪除");
      refetch();
    },
    onError: (error) => {
      alert(`❌ 刪除失敗：${error.message}`);
    },
  });

  const handleMarkMastered = (questionId: number) => {
    markMasteredMutation.mutate({ questionId });
  };

  const handleDelete = (questionId: number) => {
    if (confirm("確定要刪除這道錯題嗎？")) {
      deleteMutation.mutate({ questionId });
    }
  };

  // 開始測驗
  const handleStartQuiz = () => {
    if (wrongQuestions.length === 0) {
      alert("沒有錯題可以測驗");
      return;
    }

    // 隨機抽取最多 10 題
    const shuffled = [...wrongQuestions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(10, wrongQuestions.length));
    
    setQuizQuestions(selected);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setShowResult(false);
    setIsQuizMode(true);
  };

  // 選擇答案
  const handleSelectAnswer = (answerIndex: number) => {
    setUserAnswers({
      ...userAnswers,
      [currentQuestionIndex]: answerIndex,
    });
  };

  // 下一題
  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // 最後一題，顯示結果
      setShowResult(true);
    }
  };

  // 上一題
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // 提交測驗
  const handleSubmitQuiz = () => {
    // 計算結果
    const correctQuestionIds: number[] = [];
    quizQuestions.forEach((wrongQuestion, index) => {
      const userAnswer = userAnswers[index];
      if (userAnswer === wrongQuestion.correctAnswer) {
        correctQuestionIds.push(wrongQuestion.id);
      }
    });

    // 批量標記答對的題目為已學會
    if (correctQuestionIds.length > 0) {
      markMultipleMutation.mutate({ questionIds: correctQuestionIds });
    }

    setShowResult(true);
  };

  // 重新測驗
  const handleRetakeQuiz = () => {
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setShowResult(false);
  };

  // 返回錯題集
  const handleBackToList = () => {
    setIsQuizMode(false);
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setShowResult(false);
  };

  // 清理 HTML 標籤和 Markdown 符號
  const cleanHtmlAndExtractImages = (html: string) => {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/#{1,6}\s*/g, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/^[-*]\s+/gm, "• ")
      .trim();
  };

  // 測驗模式 UI
  if (isQuizMode) {
    if (showResult) {
      // 顯示測驗結果
      const correctCount = quizQuestions.filter((wrongQuestion, index) => {
        return userAnswers[index] === wrongQuestion.correctAnswer;
      }).length;
      const totalCount = quizQuestions.length;
      const correctRate = Math.round((correctCount / totalCount) * 100);

      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
          <div className="max-w-5xl mx-auto">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-2xl text-center">🎉 測驗結果</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-6xl font-bold text-blue-600 mb-2">
                    {correctRate}%
                  </div>
                  <p className="text-gray-600">
                    答對 {correctCount} 題 / 共 {totalCount} 題
                  </p>
                </div>

                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={handleRetakeQuiz}
                    variant="outline"
                    className="gap-2"
                  >
                    🔄 再做一次
                  </Button>
                  <Button
                    onClick={handleBackToList}
                    className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    返回錯題集
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 答題詳情 */}
            <div className="space-y-4">
              {quizQuestions.map((wrongQuestion, index) => {
                const question = wrongQuestion.questionData;
                const userAnswer = userAnswers[index];
                const isCorrect = userAnswer === wrongQuestion.correctAnswer;
                const optionKeys = ["A", "B", "C", "D"];

                return (
                  <Card key={index} className={`border-l-4 ${isCorrect ? "border-l-green-500" : "border-l-red-500"}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base font-medium">
                          {index + 1}. {cleanHtmlAndExtractImages(question.question)}
                        </CardTitle>
                        {isCorrect ? (
                          <span className="text-green-600 font-semibold">✅ 正確</span>
                        ) : (
                          <span className="text-red-600 font-semibold">❌ 錯誤</span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {question.options.map((option: any, optionIndex: number) => {
                          const optionKey = optionKeys[optionIndex];
                          const isCorrectOption = optionIndex === wrongQuestion.correctAnswer;
                          const isUserAnswer = optionIndex === userAnswer;

                          return (
                            <div
                              key={optionIndex}
                              className={`border-2 rounded-lg p-3 ${
                                isCorrectOption
                                  ? "bg-green-50 border-green-500"
                                  : isUserAnswer
                                  ? "bg-red-50 border-red-500"
                                  : "bg-gray-50 border-gray-200"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="font-medium text-sm">{optionKey}.</span>
                                <span className="flex-1 text-sm whitespace-pre-wrap break-words">
                                  {cleanHtmlAndExtractImages(option.text)}
                                </span>
                                {isCorrectOption && (
                                  <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                                    正確答案
                                  </span>
                                )}
                                {isUserAnswer && !isCorrectOption && (
                                  <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded">
                                    你的答案
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {question.explanation && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                          <h4 className="text-sm font-semibold text-blue-900 mb-2">📖 解析</h4>
                          <p className="text-sm text-blue-800 whitespace-pre-wrap">
                            {cleanHtmlAndExtractImages(question.explanation)}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // 答題模式
    const currentQuestion = quizQuestions[currentQuestionIndex];
    const question = currentQuestion.questionData;
    const optionKeys = ["A", "B", "C", "D"];
    const userAnswer = userAnswers[currentQuestionIndex];

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* 進度欄 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                第 {currentQuestionIndex + 1} 題 / 共 {quizQuestions.length} 題
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                離開測驗
              </Button>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* 題目卡片 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">
                {cleanHtmlAndExtractImages(question.question)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {question.options.map((option: any, optionIndex: number) => {
                  const optionKey = optionKeys[optionIndex];
                  const isSelected = userAnswer === optionIndex;

                  return (
                    <button
                      key={optionIndex}
                      onClick={() => handleSelectAnswer(optionIndex)}
                      className={`w-full text-left border-2 rounded-lg p-4 transition-all ${
                        isSelected
                          ? "bg-blue-50 border-blue-500"
                          : "bg-white border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-medium text-base">{optionKey}.</span>
                        <span className="flex-1 text-base whitespace-pre-wrap break-words">
                          {cleanHtmlAndExtractImages(option.text)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 操作按鈕 */}
          <div className="flex gap-4 justify-between">
            <Button
              onClick={handlePrevQuestion}
              disabled={currentQuestionIndex === 0}
              variant="outline"
            >
              ← 上一題
            </Button>
            
            {currentQuestionIndex === quizQuestions.length - 1 ? (
              <Button
                onClick={handleSubmitQuiz}
                disabled={userAnswer === undefined}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                提交測驗
              </Button>
            ) : (
              <Button
                onClick={handleNextQuestion}
                disabled={userAnswer === undefined}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                下一題 →
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 錯題集列表模式
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* 頂部導航 */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/student")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回智能專區
          </Button>
        </div>

        {/* 頁面標題 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">錯題集</h1>
          <p className="text-gray-600">
            複習答錯的題目，標記已學會的題目將從列表中移除
          </p>
        </div>

        {/* 類科篩選和開始測驗 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">篩選條件</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">類科：</label>
              <Select
                value={selectedCategoryId?.toString() || "all"}
                onValueChange={(value) => {
                  setSelectedCategoryId(value === "all" ? undefined : parseInt(value));
                }}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="選擇類科" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部類科</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.displayName || category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">
                共 {wrongQuestions.length} 道錯題
              </span>
              <Button
                onClick={handleStartQuiz}
                disabled={wrongQuestions.length === 0}
                className="ml-auto bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                📝 開始測驗
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 錯題列表 */}
        {wrongQuestions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {selectedCategoryId ? "該類科沒有錯題" : "目前沒有錯題"}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                繼續努力學習吧！
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {wrongQuestions.map((wrongQuestion, index) => {
              const question = wrongQuestion.questionData;
              const optionKeys = ["A", "B", "C", "D"];
              const userAnswerKey = optionKeys[wrongQuestion.userAnswer];

              return (
                <Card key={wrongQuestion.id} className="border-l-4 border-l-red-500">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-gray-500">
                            {wrongQuestion.chapterTitle}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(wrongQuestion.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <CardTitle className="text-base font-medium">
                          {index + 1}. {question.question}
                        </CardTitle>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkMastered(wrongQuestion.id)}
                          disabled={markMasteredMutation.isPending}
                          className="gap-1"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          已學會
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(wrongQuestion.id)}
                          disabled={deleteMutation.isPending}
                          className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          刪除
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* 選項 */}
                    <div className="space-y-2 mb-4">
                      {question.options.map((option: any, optIndex: number) => {
                        const optionKey = optionKeys[optIndex];
                        const isCorrect = optionKey === wrongQuestion.correctAnswer;
                        const isUserAnswer = optionKey === userAnswerKey;

                        return (
                          <div
                            key={optIndex}
                            className={`p-3 rounded-lg border-2 ${
                              isCorrect
                                ? "bg-green-50 border-green-500"
                                : isUserAnswer
                                ? "bg-red-50 border-red-500"
                                : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="font-medium text-sm">
                                {optionKey}.
                              </span>
                              <span className="flex-1 text-sm">{option.text}</span>
                              {isCorrect && (
                                <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                                  正確答案
                                </span>
                              )}
                              {isUserAnswer && !isCorrect && (
                                <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded">
                                  你的答案
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* 解析 */}
                    {question.explanation && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-blue-900 mb-2">
                          📖 解析
                        </h4>
                        <p className="text-sm text-blue-800 whitespace-pre-wrap">
                          {question.explanation}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
