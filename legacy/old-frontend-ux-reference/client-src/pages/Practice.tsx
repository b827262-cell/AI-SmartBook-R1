import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, Brain, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function Practice() {
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [mode, setMode] = useState<"browse" | "recommended">("browse");

  // 獲取科目列表
  const { data: subjects, isLoading: subjectsLoading } = trpc.exam.getSubjects.useQuery();

  // 獲取推薦題目
  const { data: recommendedQuestions, refetch: refetchRecommendations } = 
    trpc.exam.getRecommendations.useQuery(
      { limit: 1 },
      { enabled: mode === "recommended" }
    );

  // 獲取題目列表
  const { data: questions, refetch: refetchQuestions } = trpc.exam.getQuestions.useQuery(
    { subjectId: selectedSubject!, limit: 1, offset: 0 },
    { enabled: mode === "browse" && selectedSubject !== null }
  );

  // 提交答案
  const submitAnswerMutation = trpc.exam.submitAnswer.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setShowResult(true);
      
      if (data.isCorrect) {
      toast.success("答對了！🎉", {
        description: "繼續保持！",
      });
      } else {
        toast.error("答錯了", {
          description: "沒關係，看看解析學習一下吧！",
        });
      }
    },
    onError: (error) => {
      toast.error("提交失敗", {
        description: error.message,
      });
    },
  });

  // 當模式或科目改變時，載入題目
  useEffect(() => {
    if (mode === "recommended" && recommendedQuestions && recommendedQuestions.length > 0) {
      setCurrentQuestion(recommendedQuestions[0]);
      setShowResult(false);
      setSelectedAnswer("");
    } else if (mode === "browse" && questions && questions.length > 0) {
      setCurrentQuestion(questions[0]);
      setShowResult(false);
      setSelectedAnswer("");
    }
  }, [mode, recommendedQuestions, questions]);

  const handleSubmit = () => {
    if (!selectedAnswer) {
      toast.error("請選擇答案", {
        description: "請先選擇一個選項再提交",
      });
      return;
    }

    submitAnswerMutation.mutate({
      questionId: currentQuestion.id,
      userAnswer: selectedAnswer,
    });
  };

  const handleNextQuestion = () => {
    setShowResult(false);
    setSelectedAnswer("");
    setResult(null);
    
    if (mode === "recommended") {
      refetchRecommendations();
    } else {
      refetchQuestions();
    }
  };

  if (subjectsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">考題練習</h1>
        <p className="text-muted-foreground">
          選擇科目開始練習，或使用 AI 推薦功能獲取適合你的題目
        </p>
      </div>

      {/* 模式選擇 */}
      <div className="flex gap-4 mb-6">
        <Button
          variant={mode === "browse" ? "default" : "outline"}
          onClick={() => setMode("browse")}
          className="flex items-center gap-2"
        >
          <BookOpen className="h-4 w-4" />
          瀏覽練習
        </Button>
        <Button
          variant={mode === "recommended" ? "default" : "outline"}
          onClick={() => setMode("recommended")}
          className="flex items-center gap-2"
        >
          <Brain className="h-4 w-4" />
          AI 推薦
        </Button>
      </div>

      {/* 科目選擇（僅瀏覽模式） */}
      {mode === "browse" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>選擇科目</CardTitle>
            <CardDescription>選擇一個科目開始練習</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {subjects?.map((subject) => (
                <Button
                  key={subject.id}
                  variant={selectedSubject === subject.id ? "default" : "outline"}
                  onClick={() => setSelectedSubject(subject.id)}
                  className="h-auto py-4"
                >
                  {subject.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 題目顯示 */}
      {currentQuestion && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{currentQuestion.year} 年</Badge>
                <Badge variant={
                  currentQuestion.difficulty === "easy" ? "default" :
                  currentQuestion.difficulty === "medium" ? "secondary" : "destructive"
                }>
                  {currentQuestion.difficulty === "easy" ? "簡單" :
                   currentQuestion.difficulty === "medium" ? "中等" : "困難"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 題目 */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{currentQuestion.questionText}</h3>
              
              {/* 選項 */}
              {!showResult && (
                <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                  <div className="space-y-3">
                    {["A", "B", "C", "D"].map((option) => {
                      const optionText = currentQuestion[`option${option}`];
                      if (!optionText) return null;
                      
                      return (
                        <div key={option} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent">
                          <RadioGroupItem value={option} id={`option-${option}`} />
                          <Label htmlFor={`option-${option}`} className="flex-1 cursor-pointer">
                            {optionText}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </RadioGroup>
              )}

              {/* 答題結果 */}
              {showResult && result && (
                <div className="space-y-4">
                  {/* 顯示選項和正確答案 */}
                  <div className="space-y-3">
                    {["A", "B", "C", "D"].map((option) => {
                      const optionText = currentQuestion[`option${option}`];
                      if (!optionText) return null;
                      
                      const isUserAnswer = selectedAnswer === option;
                      const isCorrectAnswer = result.correctAnswer === option;
                      
                      return (
                        <div
                          key={option}
                          className={`p-3 border rounded-lg ${
                            isCorrectAnswer ? "bg-green-50 border-green-500" :
                            isUserAnswer && !result.isCorrect ? "bg-red-50 border-red-500" :
                            "bg-background"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isCorrectAnswer && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                            {isUserAnswer && !result.isCorrect && <XCircle className="h-5 w-5 text-red-600" />}
                            <span>{optionText}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 解析 */}
                  {result.explanation && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold mb-2 text-blue-900">📖 解析</h4>
                      <p className="text-blue-800">{result.explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 按鈕 */}
            <div className="flex gap-4">
              {!showResult ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedAnswer || submitAnswerMutation.isPending}
                  className="flex-1"
                >
                  {submitAnswerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      提交中...
                    </>
                  ) : (
                    "提交答案"
                  )}
                </Button>
              ) : (
                <Button onClick={handleNextQuestion} className="flex-1">
                  下一題
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 無題目提示 */}
      {!currentQuestion && (mode === "browse" ? selectedSubject : true) && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {mode === "browse" ? "該科目暫無題目" : "暫無推薦題目，請先完成一些練習"}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
