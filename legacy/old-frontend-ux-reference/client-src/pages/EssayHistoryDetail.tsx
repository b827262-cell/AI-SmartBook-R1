import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { ArrowLeft, Calendar, Eye, EyeOff } from "lucide-react";
import { MarkdownContent } from "../components/MarkdownContent";

export default function EssayHistoryDetail() {
  const [, params] = useRoute("/essay-history/:id");
  const [, setLocation] = useLocation();
  const submissionId = Number(params?.id);

  const [showStandardAnswer, setShowStandardAnswer] = useState(false);

  // 查詢批改詳情
  const { data, isLoading } = trpc.essayGrading.getGradingDetail.useQuery({
    submissionId,
  });

  // 格式化日期
  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 等級顏色
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A":
        return "text-green-600 bg-green-100";
      case "B":
        return "text-blue-600 bg-blue-100";
      case "C":
        return "text-yellow-600 bg-yellow-100";
      case "D":
        return "text-orange-600 bg-orange-100";
      case "E":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.data) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">找不到該作答記錄</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setLocation("/essay-history")}
          >
            返回列表
          </Button>
        </Card>
      </div>
    );
  }

  const detail = data.data;

  return (
    <div className="container mx-auto py-8">
      {/* 返回按鈕 */}
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => setLocation("/essay-history")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        返回列表
      </Button>

      {/* 題目 */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">題目</h2>
        <p className="text-lg">{detail.question}</p>
        <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>作答時間：{formatDate(detail.submittedAt)}</span>
        </div>
      </Card>

      {/* 學生答案 */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">您的答案</h2>
        <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
          {detail.studentAnswer}
        </div>
      </Card>

      {/* 批改結果 */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">批改結果</h2>

        {/* 總分和等級 */}
        <div className="flex items-center gap-4 mb-6">
          <div>
            <span className="text-sm text-muted-foreground">總分</span>
            <p className="text-4xl font-bold text-primary">{detail.totalScore}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">等級</span>
            <p
              className={`text-2xl font-bold px-4 py-2 rounded-lg ${getGradeColor(
                detail.grade
              )}`}
            >
              {detail.grade} - {
                detail.grade === "A" ? "優秀" :
                detail.grade === "B" ? "良好" :
                detail.grade === "C" ? "及格" :
                detail.grade === "D" ? "待加強" : "不及格"
              }
            </p>
          </div>
        </div>

        {/* 各維度得分 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">內容完整度</p>
            <p className="text-2xl font-bold">{detail.contentScore} / 40</p>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">正確性</p>
            <p className="text-2xl font-bold">{detail.correctnessScore} / 30</p>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">邏輯性</p>
            <p className="text-2xl font-bold">{detail.logicScore} / 15</p>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">表達能力</p>
            <p className="text-2xl font-bold">{detail.expressionScore} / 15</p>
          </div>
        </div>

        {/* 關鍵要點 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <h3 className="font-semibold mb-2 text-green-600">✓ 已答到的關鍵要點</h3>
            {detail.keyPointsCovered && detail.keyPointsCovered.length > 0 ? (
              <ul className="list-disc list-inside space-y-1">
                {detail.keyPointsCovered.map((point: string, index: number) => (
                  <li key={index} className="text-sm">
                    {point}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">無</p>
            )}
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-red-600">✗ 未答到的關鍵要點</h3>
            {detail.keyPointsMissed && detail.keyPointsMissed.length > 0 ? (
              <ul className="list-disc list-inside space-y-1">
                {detail.keyPointsMissed.map((point: string, index: number) => (
                  <li key={index} className="text-sm">
                    {point}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">無</p>
            )}
          </div>
        </div>

        {/* 逐段批改意見 */}
        {detail.paragraphFeedback && detail.paragraphFeedback.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-4">逐段分析</h3>
            <div className="space-y-4">
              {detail.paragraphFeedback.map((feedback: any, index: number) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded-r">
                  <div className="mb-2">
                    <span className="font-semibold text-gray-700">段落 {index + 1}:</span>
                    <p className="text-sm text-gray-600 italic mt-1">"{feedback.paragraph}"</p>
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
          </div>
        )}
        
        {/* 總體評語 */}
        <div>
          <h3 className="font-semibold mb-2">總體評語</h3>
          <div className="bg-muted p-4 rounded-lg">
            <MarkdownContent className="text-sm">{detail.detailedFeedback}</MarkdownContent>
          </div>
        </div>
      </Card>

      {/* 標準答案 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">標準答案參考</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStandardAnswer(!showStandardAnswer)}
          >
            {showStandardAnswer ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                隱藏
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                查看標準答案
              </>
            )}
          </Button>
        </div>
        {showStandardAnswer && (
          <div className="bg-muted p-4 rounded-lg">
            <MarkdownContent>{detail.standardAnswer}</MarkdownContent>
          </div>
        )}
      </Card>

      {/* 操作按鈕 */}
      <div className="flex gap-4 mt-6">
        <Button variant="outline" onClick={() => setLocation("/essay-history")}>
          返回列表
        </Button>
        <Button onClick={() => setLocation("/essay-practice")}>
          繼續練習
        </Button>
      </div>
    </div>
  );
}
