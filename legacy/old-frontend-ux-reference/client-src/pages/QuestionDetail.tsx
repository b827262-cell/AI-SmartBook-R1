import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, XCircle, Lightbulb, Coins, Lock } from "lucide-react";

export default function QuestionDetail() {
  const { user } = useAuth();
  const [, params] = useRoute("/question/:id");
  const [, setLocation] = useLocation();
  const questionId = params?.id ? parseInt(params.id) : null;

  const [userAnswer, setUserAnswer] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  // 使用 questionBank.viewQuestion API（自動扣點）
  const questionQuery = trpc.questionBank.viewQuestion.useQuery(
    { questionId: questionId! },
    { 
      enabled: !!questionId,
      onSuccess: (data) => {
        setHasAccess(true);
        // 扣點成功，更新用戶資訊
        if (data.creditsDeducted > 0) {
          toast.success(`已扣除 ${data.creditsDeducted} 點`, {
            description: `剩餘點數：${data.remainingCredits}`,
          });
        }
      },
      onError: (error) => {
        setHasAccess(false);
        toast.error("無法查看考題", {
          description: error.message,
        });
      },
    }
  );



  if (!questionId) {
    return (
      <div className="container mx-auto py-12 text-center">
        <p className="text-muted-foreground">無效的考題 ID</p>
        <Button onClick={() => setLocation("/")} className="mt-4">
          返回首頁
        </Button>
      </div>
    );
  }

  if (questionQuery.isLoading) {
    return (
      <div className="container mx-auto py-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-4">載入中...</p>
      </div>
    );
  }

  if (!questionQuery.data) {
    return (
      <div className="container mx-auto py-12 text-center">
        <p className="text-muted-foreground">考題不存在</p>
        <Button onClick={() => setLocation("/")} className="mt-4">
          返回首頁
        </Button>
      </div>
    );
  }

  const question = questionQuery.data?.question;
  const images = question?.images || [];

  const handleSubmit = () => {
    if (!userAnswer.trim()) {
      toast.error("請輸入答案");
      return;
    }

    // 檢查答案是否正確
    const correct = question.correctAnswer 
      ? userAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
      : false; // 如果沒有正確答案，預設為錯誤
    setIsCorrect(correct);
    setIsSubmitted(true);


  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* 返回按鈕 */}
      <Button
        variant="ghost"
        onClick={() => window.history.back()}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        返回
      </Button>

      <Card className="p-6">
        {/* 考題資訊 */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {question.category && (
            <Badge variant="secondary">{question.category}</Badge>
          )}
          <Badge
            variant="outline"
            className={
              question.difficulty === "easy"
                ? "bg-green-50 text-green-700 border-green-200"
                : question.difficulty === "hard"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }
          >
            {question.difficulty === "easy"
              ? "簡單"
              : question.difficulty === "hard"
              ? "困難"
              : "中等"}
          </Badge>
          <Badge variant="outline">
            {question.type === "multiple_choice"
              ? "選擇題"
              : question.type === "short_answer"
              ? "簡答題"
              : "申論題"}
          </Badge>
        </div>

        {/* 題目內容 */}
        <h2 className="text-2xl font-bold mb-6">{question.question}</h2>

        {/* 圖片 */}
        {images.length > 0 && (
          <div className="mb-6 space-y-4">
            {images.map((image) => (
              <div key={image.id} className="border rounded-lg overflow-hidden">
                <img
                  src={image.imageUrl}
                  alt={`考題圖片 ${image.displayOrder + 1}`}
                  className="w-full h-auto"
                  style={{
                    transform: `rotate(${image.rotation || 0}deg)`,
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* 選項（選擇題） */}
        {question.type === "multiple_choice" &&
          question.options &&
          Array.isArray(question.options) ? (
            <div className="mb-6">
              <RadioGroup value={userAnswer} onValueChange={setUserAnswer} disabled={isSubmitted}>
                {question.options
                  .filter((o): o is string => typeof o === "string")
                  .map((option, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <RadioGroupItem value={option} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
              </RadioGroup>
            </div>
          ) : null}

        {/* 答案輸入（簡答題、申論題） */}
        {(question.type === "short_answer" || question.type === "essay") && (
          <div className="mb-6">
            <Textarea
              placeholder="請輸入你的答案..."
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              rows={question.type === "essay" ? 10 : 4}
              disabled={isSubmitted}
            />
          </div>
        )}

        {/* 提交按鈕 */}
        {!isSubmitted && (
          <Button onClick={handleSubmit} className="w-full" size="lg">
            提交答案
          </Button>
        )}

        {/* 結果顯示 */}
        {isSubmitted && (
          <div className="mt-6 space-y-4">
            {/* 正確/錯誤提示 */}
            <div
              className={`p-4 rounded-lg flex items-start gap-3 ${
                isCorrect
                  ? "bg-green-50 text-green-900 border border-green-200"
                  : "bg-red-50 text-red-900 border border-red-200"
              }`}
            >
              {isCorrect ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold mb-1">
                  {isCorrect ? "答對了！" : "答錯了"}
                </h3>
                <p className="text-sm">
                  {isCorrect
                    ? "恭喜你答對了這題！"
                    : `正確答案是：${question.correctAnswer}`}
                </p>
              </div>
            </div>

            {/* 解析 */}
            {question.explanation && (
              <div className="p-4 rounded-lg bg-blue-50 text-blue-900 border border-blue-200">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">解析</h3>
                    <p className="text-sm whitespace-pre-wrap">{question.explanation}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 返回對話按鈕 */}
            <Button
              onClick={() => window.history.back()}
              className="w-full"
              variant="outline"
            >
              返回對話
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
