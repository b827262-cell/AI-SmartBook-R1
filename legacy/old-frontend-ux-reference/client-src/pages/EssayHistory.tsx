import { useState, useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Calendar, ArrowLeft, BookOpen, CheckCircle, XCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function EssayHistory() {
  const [, setLocation] = useLocation();
  const [offset, setOffset] = useState(0);
  const limit = 10;
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);

  // 圖表 ref
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  // 查詢申論題作答歷史（新系統）
  const { data, isLoading, refetch } = trpc.aiStudent.getEssayHistory.useQuery({
    limit,
    offset,
  });

  // 刪除作答紀錄
  const deleteAttemptsMutation = trpc.aiStudent.deleteAttempts.useMutation({
    onSuccess: () => {
      setSelectedAttempt(null);
      refetch();
    },
  });

  // 格式化日期
  const formatDate = (date: string | Date | null) => {
    if (!date) return "—";
    const d = new Date(date);
    return d.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 分數顏色
  const getScoreColor = (score: number, total: number = 10) => {
    const ratio = score / total;
    if (ratio >= 0.8) return "text-green-600 bg-green-100";
    if (ratio >= 0.6) return "text-blue-600 bg-blue-100";
    if (ratio >= 0.4) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  // 分數等級
  const getGradeLabel = (score: number, total: number = 10) => {
    const ratio = score / total;
    if (ratio >= 0.8) return "優秀";
    if (ratio >= 0.6) return "良好";
    if (ratio >= 0.4) return "及格";
    return "待加強";
  };

  // 繪製分數趨勢圖表
  useEffect(() => {
    if (!data || !data.attempts || data.attempts.length === 0 || !chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const recentData = [...data.attempts].reverse().slice(-10);
    const labels = recentData.map((_, i) => `第 ${i + 1} 次`);
    const scores = recentData.map((item) => {
      const ans = Array.isArray(item.answers) ? item.answers as any[] : [];
      return ans[0]?.score ?? item.score ?? 0;
    });

    const ctx = chartRef.current.getContext("2d");
    if (ctx) {
      chartInstance.current = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: "分數",
            data: scores,
            borderColor: "rgb(249, 115, 22)",
            backgroundColor: "rgba(249, 115, 22, 0.1)",
            tension: 0.4,
            fill: true,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => `分數: ${context.parsed.y} / 10`,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 10,
              ticks: { stepSize: 2 },
            },
          },
        },
      });
    }
    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [data]);

  // 詳情視圖
  if (selectedAttempt) {
    const ans = Array.isArray(selectedAttempt.answers) ? selectedAttempt.answers as any[] : [];
    const essayAns = ans[0];
    return (
      <div className="container mx-auto py-8 max-w-3xl">
        <Button variant="ghost" className="mb-4" onClick={() => setSelectedAttempt(null)}>
          <ArrowLeft className="w-4 h-4 mr-2" />返回列表
        </Button>
        <Card className="p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">批改詳情</h2>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(essayAns?.score ?? 0)}`}>
                {essayAns?.score ?? 0} / 10 分 · {getGradeLabel(essayAns?.score ?? 0)}
              </span>
            </div>
          </div>
          <div className="text-sm text-muted-foreground mb-4">
            <Calendar className="w-4 h-4 inline mr-1" />
            作答時間：{formatDate(selectedAttempt.submittedAt || selectedAttempt.startedAt)}
          </div>
          {selectedAttempt.examTitle && (
            <div className="text-sm text-muted-foreground mb-4">
              <BookOpen className="w-4 h-4 inline mr-1" />
              題目來源：{selectedAttempt.examTitle}
            </div>
          )}
        </Card>

        {essayAns && (
          <>
            <Card className="p-6 mb-4">
              <h3 className="font-semibold text-lg mb-3">題目</h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{essayAns.questionText}</p>
            </Card>
            <Card className="p-6 mb-4">
              <h3 className="font-semibold text-lg mb-3">您的作答</h3>
              {essayAns.userAnswer ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{essayAns.userAnswer}</p>
              ) : (
                <p className="text-sm text-muted-foreground">（手寫圖片作答）</p>
              )}
            </Card>
            <Card className="p-6 mb-4">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                {(essayAns.score ?? 0) >= 6
                  ? <CheckCircle className="w-5 h-5 text-green-500" />
                  : <XCircle className="w-5 h-5 text-red-500" />}
                AI 批改意見
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{essayAns.feedback}</p>
            </Card>
            {essayAns.modelAnswer && (
              <Card className="p-6 mb-4 border-orange-200 bg-orange-50/50">
                <h3 className="font-semibold text-lg mb-3 text-orange-700">參考答案</h3>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-orange-900">{essayAns.modelAnswer}</p>
              </Card>
            )}
          </>
        )}
        <div className="flex justify-end mt-4">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteAttemptsMutation.mutate({ attemptIds: [selectedAttempt.id] })}
            disabled={deleteAttemptsMutation.isPending}
          >
            {deleteAttemptsMutation.isPending ? "刪除中..." : "刪除此紀錄"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/student")}>
          <ArrowLeft className="w-4 h-4 mr-1" />返回
        </Button>
        <div>
          <h1 className="text-3xl font-bold">我的作答紀錄</h1>
          <p className="text-muted-foreground text-sm">查看您的申論題作答歷史和批改結果</p>
        </div>
      </div>

      {/* 分數趨勢圖表 */}
      {data && data.attempts.length > 0 && (
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">分數趨勢</h2>
          <div style={{ height: "200px" }}>
            <canvas ref={chartRef}></canvas>
          </div>
        </Card>
      )}

      {/* 作答記錄列表 */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">載入中...</div>
      ) : data && data.attempts.length > 0 ? (
        <div className="space-y-3">
          {data.attempts.map((attempt: any) => {
            const ans = Array.isArray(attempt.answers) ? attempt.answers as any[] : [];
            const essayAns = ans[0];
            const score = essayAns?.score ?? attempt.score ?? 0;
            return (
              <Card key={attempt.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedAttempt(attempt)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-2 mb-2">
                      {essayAns?.questionText || attempt.examTitle || "申論題"}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(attempt.submittedAt || attempt.startedAt)}
                      </span>
                      {attempt.examCategory && (
                        <span className="px-2 py-0.5 bg-muted rounded-full">{attempt.examCategory}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(score)}`}>
                      {score} / 10
                    </span>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedAttempt(attempt); }}>
                      查看詳情
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}

          {/* 分頁 */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>
              上一頁
            </Button>
            <span className="text-sm text-muted-foreground">
              第 {Math.floor(offset / limit) + 1} 頁
            </span>
            <Button variant="outline" size="sm" disabled={data.attempts.length < limit} onClick={() => setOffset(offset + limit)}>
              下一頁
            </Button>
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">尚無作答紀錄</p>
          <p className="text-sm text-muted-foreground mb-4">前往「申論批改」開始練習，批改結果將記錄在此</p>
          <Button onClick={() => setLocation("/essay-practice")}>開始練習</Button>
        </Card>
      )}
    </div>
  );
}
