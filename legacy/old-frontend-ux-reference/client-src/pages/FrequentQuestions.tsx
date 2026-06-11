import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, MessageCircle, Calendar } from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

interface FrequentQuestionsProps {
  defaultCategory?: "exam" | "knowledge" | "learning_material" | "chapter" | "general";
}

export default function FrequentQuestions({ defaultCategory }: FrequentQuestionsProps) {
  const [category, setCategory] = useState<"exam" | "knowledge" | "learning_material" | "chapter" | "general" | undefined>(
    defaultCategory
  );
  const [timeRange, setTimeRange] = useState<"7days" | "30days" | "all">("all");

  const { data, isLoading, refetch } = trpc.frequentQuestions.getTopQuestions.useQuery({
    category,
    timeRange,
    limit: 20,
  });

  const categoryLabels: Record<string, string> = {
    exam: "考試練習",
    knowledge: "知識庫學習",
    learning_material: "智能解題",
    chapter: "章節學習",
    general: "一般問題",
  };

  const timeRangeLabels: Record<string, string> = {
    "7days": "最近 7 天",
    "30days": "最近 30 天",
    all: "全部時間",
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">💡 常見問題</h1>
        <p className="text-muted-foreground">
          這裡是同學們最常問的問題，可以幫助您快速了解重點知識！
        </p>
      </div>

      {/* 篩選器 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">篩選條件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">分類</label>
              <Select
                value={category || "all"}
                onValueChange={(value) => setCategory(value === "all" ? undefined : value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇分類" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分類</SelectItem>
                  <SelectItem value="exam">考試練習</SelectItem>
                  <SelectItem value="knowledge">知識庫學習</SelectItem>
                  <SelectItem value="learning_material">智能解題</SelectItem>
                  <SelectItem value="chapter">章節學習</SelectItem>
                  <SelectItem value="general">一般問題</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">時間範圍</label>
              <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇時間範圍" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">最近 7 天</SelectItem>
                  <SelectItem value="30days">最近 30 天</SelectItem>
                  <SelectItem value="all">全部時間</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={() => refetch()} variant="outline">
                重新載入
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 載入狀態 */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">載入中...</span>
        </div>
      )}

      {/* 問題列表 */}
      {!isLoading && data && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">
                找到 {data.total} 個高頻問題
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {category ? categoryLabels[category] : "全部分類"} · {timeRangeLabels[timeRange]}
            </div>
          </div>

          {data.questions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">目前沒有符合條件的問題</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {data.questions.map((q, index) => (
                <Card key={q.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-lg font-bold">
                            #{index + 1}
                          </Badge>
                          <Badge>{categoryLabels[q.category]}</Badge>
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {q.hitCount} 人問過
                          </Badge>
                        </div>
                        <CardTitle className="text-xl">{q.question}</CardTitle>
                      </div>
                      {q.lastHitAt && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          最後提問：{new Date(q.lastHitAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      <MarkdownRenderer>{q.answer}</MarkdownRenderer>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
