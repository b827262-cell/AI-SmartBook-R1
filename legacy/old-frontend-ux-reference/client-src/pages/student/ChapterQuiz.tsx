import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, CheckCircle, XCircle, Award, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ChapterQuiz() {
  const params = useParams();
  const [, setLocation] = useLocation();
  
  const categoryId = parseInt(params.categoryId || "0");
  const chapterIndex = parseInt(params.chapterIndex || "0");
  const chapterTitle = decodeURIComponent(params.chapterTitle || "");
  
  const [quiz, setQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<any>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // 生成練習題
  const generateQuizMutation = trpc.knowledgeLearning.generateQuiz.useMutation({
    onSuccess: (data) => {
      // 防護：確保每道題的 options 是陣列（防止 MySQL JSON 欄位返回字串）
      const safeQuiz = (Array.isArray(data.quiz) ? data.quiz : []).map((q: any) => ({
        ...q,
        options: Array.isArray(q.options)
          ? q.options
          : typeof q.options === 'string'
            ? (() => { try { return JSON.parse(q.options); } catch { return []; } })()
            : [],
      }));
      setQuiz(safeQuiz);
    },
    onError: (error) => {
      alert(`生成練習題失敗：${error.message}`);
    },
  });
  
  // 提交答案
  const submitAnswersMutation = trpc.knowledgeLearning.submitQuizAnswers.useMutation({
    onSuccess: (data) => {
      // 防護：確保 result.questions 的 options 是陣列
      const safeResult = {
        ...data,
        questions: (Array.isArray(data.questions) ? data.questions : []).map((q: any) => ({
          ...q,
          options: Array.isArray(q.options)
            ? q.options
            : typeof q.options === 'string'
              ? (() => { try { return JSON.parse(q.options); } catch { return []; } })()
              : [],
        })),
      };
      setResult(safeResult);
      setIsSubmitted(true);
    },
    onError: (error) => {
      alert(`提交失敗：${error.message}`);
    },
  });
  
  // 重新生成題目
  const regenerateQuizMutation = trpc.knowledgeLearning.regenerateQuiz.useMutation({
    onSuccess: () => {
      // 清除緩存後，重新生成題目
      setQuiz(null);
      setAnswers({});
      setResult(null);
      setIsSubmitted(false);
      generateQuizMutation.mutate({
        categoryId,
        chapterIndex,
        chapterTitle,
      });
    },
    onError: (error) => {
      alert(`重新生成失敗：${error.message}`);
    },
  });
  
  // 初始化：生成練習題
  useEffect(() => {
    if (categoryId && chapterIndex >= 0 && chapterTitle) {
      generateQuizMutation.mutate({
        categoryId,
        chapterIndex,
        chapterTitle,
      });
    }
  }, [categoryId, chapterIndex, chapterTitle]);
  
  // 選擇答案
  const handleAnswerChange = (questionIndex: number, optionIndex: number) => {
    if (isSubmitted) return;
    setAnswers({
      ...answers,
      [questionIndex]: optionIndex,
    });
  };
  
  // 提交答案
  const handleSubmit = () => {
    if (!quiz || Object.keys(answers).length !== quiz.length) {
      alert("請完成所有題目！");
      return;
    }
    
    // 將 answers 對象轉換為數字陣列（選項索引）
    const userAnswers = quiz.map((_: any, index: number) => {
      return answers[index]; // 直接返回選項索引（0, 1, 2, 3）
    });
    
    submitAnswersMutation.mutate({
      categoryId,
      chapterIndex,
      chapterTitle,
      answers: userAnswers,
    });
  };
  
  // 返回學習大綱
  const handleBackToOutline = () => {
    setLocation(`/student/knowledge-learning/guided/${categoryId}`);
  };
  
  // 重新生成題目
  const handleRegenerateQuiz = async () => {
    if (confirm("確定要重新生成題目嗎？當前答案將會清除，並扣除 1 點。")) {
      // 先扣點
      try {
        await trpc.credits.deductCredits.mutateAsync({
          amount: 1,
          type: 'regenerate_quiz',
          description: '重新生成考題',
        });
        regenerateQuizMutation.mutate({
          categoryId,
          chapterIndex,
        });
      } catch (error: any) {
        alert('點數不足，無法重新生成題目');
      }
    }
  };
  
  if (generateQuizMutation.isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="p-8">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="text-lg font-medium">AI 正在生成練習題...</p>
          </div>
        </Card>
      </div>
    );
  }
  
  if (!quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="p-8">
          <p className="text-lg">無法載入練習題</p>
          <Button onClick={handleBackToOutline} className="mt-4">
            返回學習大綱
          </Button>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 頂部導航 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToOutline}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回學習大綱
            </Button>
            <h1 className="text-lg font-semibold">{chapterTitle} - 練習測驗</h1>
            {!isSubmitted && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerateQuiz}
                disabled={regenerateQuizMutation.isPending}
              >
                {regenerateQuizMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    重新生成題目（扣 1 點）
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* 測驗內容 */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {!isSubmitted ? (
          <Card className="p-6 bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">練習測驗</CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                共 {quiz.length} 題，請選擇最合適的答案
              </p>
            </CardHeader>
            <CardContent className="space-y-8 mt-4">
              {quiz.map((question: any, qIndex: number) => (
                <div key={qIndex} className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Badge className="mt-1">{qIndex + 1}</Badge>
                    <p className="text-lg font-medium flex-1">{question.question}</p>
                  </div>
                  
                  <RadioGroup
                    value={answers[qIndex]?.toString()}
                    onValueChange={(value) => handleAnswerChange(qIndex, parseInt(value))}
                  >
                    {question.options.map((option: any, oIndex: number) => (
                      <div key={oIndex} className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value={oIndex.toString()} id={`q${qIndex}-o${oIndex}`} />
                        <Label htmlFor={`q${qIndex}-o${oIndex}`} className="flex-1 cursor-pointer">
                          {option.key}. {option.text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
              
              <div className="flex justify-center pt-6">
                <Button
                  onClick={handleSubmit}
                  disabled={Object.keys(answers).length !== quiz.length || submitAnswersMutation.isPending}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {submitAnswersMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      提交中...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      提交答案
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* 分數卡片 */}
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
              <div className="flex items-center justify-center gap-4">
                <Award className="h-12 w-12 text-blue-600" />
                <div className="text-center">
                  <p className="text-sm text-gray-600">你的分數</p>
                  <p className="text-4xl font-bold text-blue-600">{result.score} 分</p>
                  <p className="text-sm text-gray-600 mt-1">
                    答對 {result.correctCount} / {quiz.length} 題
                  </p>
                  {result.passed && (
                    <Badge className="mt-2 bg-green-600">✓ 通過測驗</Badge>
                  )}
                </div>
              </div>
            </Card>
            
            {/* 題目解析 */}
            <Card className="p-6 bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">題目解析</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8 mt-4">
                {result.questions.map((question: any, qIndex: number) => {
                  const isCorrect = answers[qIndex] === question.correctAnswer;
                  return (
                    <div key={qIndex} className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Badge className="mt-1">{qIndex + 1}</Badge>
                        <div className="flex-1">
                          <p className="text-lg font-medium">{question.question}</p>
                          
                          <div className="mt-4 space-y-2">
                            {question.options.map((option: any, oIndex: number) => {
                              const isUserAnswer = answers[qIndex] === oIndex;
                              const isCorrectAnswer = question.correctAnswer === oIndex;
                              
                              return (
                                <div
                                  key={oIndex}
                                  className={`p-3 rounded-lg border-2 ${
                                    isCorrectAnswer
                                      ? "bg-green-50 border-green-500"
                                      : isUserAnswer
                                      ? "bg-red-50 border-red-500"
                                      : "bg-gray-50 border-gray-200"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {isCorrectAnswer && (
                                      <CheckCircle className="h-5 w-5 text-green-600" />
                                    )}
                                    {isUserAnswer && !isCorrectAnswer && (
                                      <XCircle className="h-5 w-5 text-red-600" />
                                    )}
                                    <span>{option.key}. {option.text}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm font-semibold text-blue-900">💡 解析：</p>
                            <p className="text-sm text-blue-800 mt-1">{question.explanation}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            
            <div className="flex justify-center gap-4">
              <Button onClick={handleBackToOutline} size="lg" variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回學習大綱
              </Button>
              <Button
                onClick={() => setLocation("/student/quiz-wrong-questions")}
                size="lg"
                variant="default"
                className="bg-red-600 hover:bg-red-700"
              >
                📖 查看錯題集
              </Button>
              <Button
                onClick={() => setLocation("/student/quiz-history")}
                size="lg"
                variant="default"
                className="bg-blue-600 hover:bg-blue-700"
              >
                📊 查看測驗歷史
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
