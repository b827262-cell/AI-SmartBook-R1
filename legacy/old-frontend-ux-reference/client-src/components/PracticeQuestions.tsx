import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, CheckCircle2, XCircle, Brain, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface PracticeQuestionsProps {
  conversationId?: number;
  mode: "random" | "recommended" | "pdf";
  pdfId?: number;
}

export function PracticeQuestions({ conversationId, mode, pdfId }: PracticeQuestionsProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [startTime] = useState(Date.now());

  // 根據模式選擇不同的 API
  const randomQuery = trpc.practice.getRandomQuestions.useQuery(
    { count: 5 },
    { enabled: mode === "random" }
  );

  const recommendedQuery = trpc.practice.getRecommended.useQuery(
    { count: 5 },
    { enabled: mode === "recommended" }
  );

  const pdfMutation = trpc.practice.generateFromPdf.useMutation({
    onError: (error) => {
      toast.error(`生成題目失敗：${error.message}`);
    },
  });

  const submitAnswerMutation = trpc.practice.submitAnswer.useMutation({
    onSuccess: () => {
      toast.success(isCorrect ? "答對了！" : "答錯了，再接再厲！");
    },
  });

  // 獲取當前題目
  const getQuestions = () => {
    if (mode === "random") return randomQuery.data || [];
    if (mode === "recommended") return recommendedQuery.data || [];
    if (mode === "pdf" && pdfMutation.data) return pdfMutation.data.questions || [];
    return [];
  };

  const questions = getQuestions();
  const currentQuestion = questions[currentQuestionIndex];

  // 檢查答案
  const handleSubmitAnswer = () => {
    if (!userAnswer.trim()) {
      toast.error("請輸入答案");
      return;
    }

    const correct = userAnswer.trim().toLowerCase() === currentQuestion.correctAnswer.toLowerCase();
    setIsCorrect(correct);
    setIsAnswered(true);

    // 記錄作答
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    submitAnswerMutation.mutate({
      questionId: currentQuestion.id,
      userAnswer: userAnswer.trim(),
      isCorrect: correct,
      conversationId,
      timeSpent,
    });
  };

  // 下一題
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setUserAnswer("");
      setIsAnswered(false);
      setIsCorrect(false);
    } else {
      toast.success("練習完成！");
    }
  };

  // 開始 PDF 出題
  const handleStartPdfPractice = () => {
    if (!pdfId) {
      toast.error("請選擇 PDF");
      return;
    }

    pdfMutation.mutate({
      pdfId,
      questionType: "multiple_choice",
      count: 5,
    });
  };

  // Loading 狀態
  if (mode === "random" && randomQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (mode === "recommended" && recommendedQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // PDF 模式初始狀態
  if (mode === "pdf" && !pdfMutation.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            根據 PDF 內容出題
          </CardTitle>
          <CardDescription>AI 將根據 PDF 內容生成練習題</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleStartPdfPractice}
            disabled={pdfMutation.isPending}
            className="w-full"
          >
            {pdfMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            開始練習
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 沒有題目
  if (questions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>沒有可用的題目</CardTitle>
          <CardDescription>
            {mode === "recommended" ? "請先完成一些練習，系統才能為您推薦題目" : "題目庫中暫無題目"}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {mode === "recommended" && <Sparkles className="w-5 h-5 text-yellow-500" />}
            題目 {currentQuestionIndex + 1} / {questions.length}
          </span>
          {mode === "recommended" && (
            <span className="text-sm font-normal text-muted-foreground">智能推薦</span>
          )}
        </CardTitle>
        <CardDescription>
          {currentQuestion.type === "multiple_choice" && "多選題"}
          {currentQuestion.type === "short_answer" && "簡答題"}
          {currentQuestion.type === "essay" && "申論題"}
          {currentQuestion.difficulty && ` · ${currentQuestion.difficulty === "easy" ? "簡單" : currentQuestion.difficulty === "medium" ? "中等" : "困難"}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 題目 */}
        <div>
          <Label className="text-base font-semibold">{currentQuestion.question}</Label>
        </div>

        {/* 選項（多選題） */}
        {currentQuestion.type === "multiple_choice" && currentQuestion.options && (
          <RadioGroup value={userAnswer} onValueChange={setUserAnswer} disabled={isAnswered}>
            {currentQuestion.options.map((option: string, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {/* 文字輸入（簡答題、申論題） */}
        {(currentQuestion.type === "short_answer" || currentQuestion.type === "essay") && (
          <Textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="請輸入您的答案"
            rows={currentQuestion.type === "essay" ? 8 : 4}
            disabled={isAnswered}
          />
        )}

        {/* 答案和解析 */}
        {isAnswered && (
          <div className={`p-4 rounded-lg ${isCorrect ? "bg-green-50" : "bg-red-50"}`}>
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <Label className="font-semibold">
                {isCorrect ? "答對了！" : "答錯了"}
              </Label>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              <strong>正確答案：</strong>
              {currentQuestion.correctAnswer}
            </p>
            {currentQuestion.explanation && (
              <p className="text-sm text-gray-600">
                <strong>解析：</strong>
                {currentQuestion.explanation}
              </p>
            )}
          </div>
        )}

        {/* 按鈕 */}
        <div className="flex gap-2">
          {!isAnswered ? (
            <Button onClick={handleSubmitAnswer} className="flex-1" disabled={!userAnswer.trim()}>
              提交答案
            </Button>
          ) : (
            <Button onClick={handleNextQuestion} className="flex-1">
              {currentQuestionIndex < questions.length - 1 ? "下一題" : "完成練習"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
