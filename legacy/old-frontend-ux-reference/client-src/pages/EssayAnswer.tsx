import { useState, useEffect } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

export default function EssayAnswer() {
  const [, params] = useRoute("/essay-answer/:id");
  const [, setLocation] = useLocation();
  const cacheId = params?.id ? parseInt(params.id) : null;

  const [studentAnswer, setStudentAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gradingResult, setGradingResult] = useState<any>(null);

  // 獲取題目詳情
  const { data: essay, isLoading } = trpc.essayGrading.getQuestionById.useQuery(
    { id: cacheId! },
    { enabled: !!cacheId }
  );

  const submitMutation = trpc.essayGrading.submitAndGrade.useMutation({
    onSuccess: (result) => {
      setGradingResult(result);
      setIsSubmitting(false);
      toast.success("批改完成！");
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast.error(error.message || "批改失敗");
    },
  });

  const handleSubmit = () => {
    if (!studentAnswer.trim()) {
      toast.error("請填寫答案");
      return;
    }

    if (!essay) {
      toast.error("題目資料載入失敗");
      return;
    }

    setIsSubmitting(true);
    submitMutation.mutate({
      cacheId: cacheId!,
      question: essay.data.question,
      standardAnswer: essay.data.standardAnswer || "",
      studentAnswer: studentAnswer.trim(),
    });
  };

  const handleRetry = () => {
    setStudentAnswer("");
    setGradingResult(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">載入題目中...</p>
        </div>
      </div>
    );
  }

  if (!essay) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600 mb-4">題目不存在或已被刪除</p>
            <Button
              onClick={() => setLocation("/essay-practice")}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回題目列表
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部導航 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/essay-practice")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回列表
            </Button>
            <h1 className="text-xl font-semibold">申論題作答</h1>
          </div>
        </div>
      </div>

      {/* 主要內容 */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {!gradingResult ? (
          /* 作答區 */
          <div className="space-y-6">
            {/* 題目卡片 */}
            <Card>
              <CardHeader>
                <CardTitle>題目</CardTitle>
                {essay.data.source && (
                  <div className="flex gap-2 text-sm text-gray-600">
                    <span>來源：{essay.data.source === "past_exam" ? "考古題" : essay.data.source === "featured" ? "精選題" : "名師題"}</span>
                    {essay.data.year && <span>| 年份：{essay.data.year}</span>}
                    {essay.data.subject && <span>| 考科：{essay.data.subject}</span>}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed whitespace-pre-wrap">
                  {essay.data.question}
                </p>
              </CardContent>
            </Card>

            {/* 作答區 */}
            <Card>
              <CardHeader>
                <CardTitle>您的答案</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={studentAnswer}
                  onChange={(e) => setStudentAnswer(e.target.value)}
                  placeholder="請在此輸入您的答案..."
                  className="min-h-[300px] text-base leading-relaxed"
                />
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !studentAnswer.trim()}
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        批改中...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        提交批改
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* 批改結果 */
          <div className="space-y-6">
            {/* 作弊警告 */}
            {gradingResult.data.isCheating && (
              <Card className="border-2 border-red-500 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-700 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    作弊警告
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-red-700">
                    檢測到您的答案與標準答案高度相似（相似度：{gradingResult.data.similarity}%），疑似直接抄襲標準答案。
                    請用自己的話語重新作答，才能真正學習和提升。
                  </p>
                </CardContent>
              </Card>
            )}
            
            {/* 分數卡片 */}
            <Card className="border-2 border-blue-500">
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-center text-2xl">
                  總分：{gradingResult.data.totalScore} 分
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">內容完整度</p>
                    <p className="text-xl font-semibold text-blue-600">
                      {gradingResult.data.contentScore}/40
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">正確性</p>
                    <p className="text-xl font-semibold text-blue-600">
                      {gradingResult.data.correctnessScore}/30
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">邏輯性</p>
                    <p className="text-xl font-semibold text-blue-600">
                      {gradingResult.data.logicScore}/15
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">表達能力</p>
                    <p className="text-xl font-semibold text-blue-600">
                      {gradingResult.data.expressionScore}/15
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 批改意見 */}
            <Card>
              <CardHeader>
                <CardTitle>批改意見</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 逐段批改意見 */}
                {gradingResult.data.paragraphFeedback && gradingResult.data.paragraphFeedback.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">逐段分析</h3>
                    {gradingResult.data.paragraphFeedback.map((feedback: any, index: number) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded-r">
                        <div className="mb-2">
                          <span className="font-semibold text-gray-700">段落 {index + 1}:</span>
                          <p className="text-gray-600 italic mt-1">"{feedback.paragraph}"</p>
                        </div>
                        <div className="space-y-2 text-sm">
                          {feedback.strengths && (
                            <div>
                              <span className="font-semibold text-green-700">✓ 優點：</span>
                              <span className="text-gray-700">{feedback.strengths}</span>
                            </div>
                          )}
                          {feedback.weaknesses && (
                            <div>
                              <span className="font-semibold text-orange-700">⚠ 不足：</span>
                              <span className="text-gray-700">{feedback.weaknesses}</span>
                            </div>
                          )}
                          {feedback.suggestions && (
                            <div>
                              <span className="font-semibold text-blue-700">→ 建議：</span>
                              <span className="text-gray-700">{feedback.suggestions}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 總體評語 */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">總體評語</h3>
                  <div className="prose max-w-none text-gray-700">
                    <MarkdownRenderer>{gradingResult.data.detailedFeedback}</MarkdownRenderer>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 您的答案 */}
            <Card>
              <CardHeader>
                <CardTitle>您的答案</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap leading-relaxed">
                  {studentAnswer}
                </p>
              </CardContent>
            </Card>

            {/* 標準答案 */}
            {essay.data.standardAnswer && (
              <Card>
                <Collapsible>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle>標準答案參考</CardTitle>
                        <span className="text-sm text-gray-500">點擊查看</span>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      <MarkdownRenderer className="text-gray-700">{essay.data.standardAnswer}</MarkdownRenderer>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )}

            {/* 操作按鈕 */}
            <div className="flex gap-4 justify-center">
              <Button
                variant="outline"
                onClick={handleRetry}
                size="lg"
              >
                重新作答
              </Button>
              <Button
                onClick={() => setLocation("/essay-practice")}
                size="lg"
              >
                返回列表
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
