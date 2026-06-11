import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowLeft, Loader2, Target, TrendingUp, CheckCircle2, Circle, PlayCircle, Award, FileQuestion, Clock, BookMarked } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function GuidedLearning() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const params = useParams();
  // 支援兩種路由格式：純數字 id 或 URL 編碼的科目名稱
  const rawId = params.id || "0";
  const isNumeric = /^-?\d+$/.test(rawId);
  const categoryId = isNumeric ? parseInt(rawId) : rawId.split('').reduce((hash: number, char: string) => {
    return ((hash << 5) - hash) + char.charCodeAt(0) | 0;
  }, 0);
  const categoryName = isNumeric ? undefined : decodeURIComponent(rawId);

  const [outline, setOutline] = useState<any>(null);
  const [category, setCategory] = useState<any>(null);
  const [progressMap, setProgressMap] = useState<Record<number, any>>({});
  const [isCached, setIsCached] = useState<boolean>(false);

  // 查詢學習進度
  const { data: progressData } = trpc.knowledgeLearning.getLearningProgress.useQuery(
    { categoryId },
    { enabled: !!categoryId }
  );

  // 生成學習大綱 mutation
  const generateOutlineMutation = trpc.knowledgeLearning.generateLearningOutline.useMutation({
    onSuccess: (data) => {
      setOutline(data.outline);
      setCategory(data.category);
      setIsCached(data.cached || false);
    },
    onError: (error) => {
      alert(`生成大綱失敗：${error.message}`);
    },
  });

  // 扣點 mutation
  const deductCreditsMutation = trpc.credits.deductCredits.useMutation();

  // 重新生成大綱 mutation（僅管理員使用）
  const regenerateOutlineMutation = trpc.knowledgeLearning.regenerateOutline.useMutation({
    onSuccess: (data) => {
      setOutline(data.outline);
      setCategory(data.category);
      setIsCached(false);
      alert("大綱已重新生成！");
    },
    onError: (error) => {
      alert(`重新生成大綱失敗：${error.message}`);
    },
  });

  // 更新進度映射
  useEffect(() => {
    if (progressData) {
      const map: Record<number, any> = {};
      progressData.progress.forEach((p: any) => {
        map[p.chapterIndex] = p;
      });
      setProgressMap(map);
    }
  }, [progressData]);

  // 進入頁面時自動調用 generateLearningOutline（後端會自動判斷是否需要生成）
  useEffect(() => {
    if (categoryId && !outline) {
      generateOutlineMutation.mutate({ categoryId, categoryName });
    }
  }, [categoryId]);

  const handleGenerateOutline = () => {
    generateOutlineMutation.mutate({ categoryId, categoryName });
  };

  const handleRegenerateOutline = async () => {
    if (confirm("確定要重新生成學習大綱嗎？這將刪除舊的大綱，並扣除 1 點。")) {
      try {
        await deductCreditsMutation.mutateAsync({
          amount: 1,
          type: 'regenerate_outline',
          description: '重新生成學習大綱',
        });
        regenerateOutlineMutation.mutate({ categoryId, categoryName });
      } catch (error: any) {
        alert('點數不足，無法重新生成大綱');
      }
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      case "intermediate":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
      case "advanced":
        return "bg-red-500/10 text-red-700 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-500/20";
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "基礎";
      case "intermediate": return "進階";
      case "advanced": return "高級";
      default: return difficulty;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 頁面標題 */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <Link href="/student/knowledge-learning">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回課堂首頁
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">引導學習模式</h1>
              <p className="text-muted-foreground mt-1">
                AI 為你規劃的結構化學習路徑
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 主要內容 */}
      <div className="container py-8">
        {generateOutlineMutation.isPending || regenerateOutlineMutation.isPending ? (
          <Card>
            <CardHeader>
              <CardTitle>正在生成學習大綱...</CardTitle>
              <CardDescription>
                AI 正在根據知識庫內容為你生成一個完整的學習大綱，請稍候...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            </CardContent>
          </Card>
        ) : outline ? (
          <div className="space-y-6">
            {/* 分類資訊和學習統計 */}
            <Card className="bg-gradient-to-br from-primary/5 via-background to-background border-primary/20">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">
                      {category?.displayName || category?.name}
                    </CardTitle>
                    {category?.description && (
                      <CardDescription className="text-base mt-2">
                        {category.description}
                      </CardDescription>
                    )}
                  </div>

                </div>
              </CardHeader>
              {progressData && (
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">完成章節</p>
                        <p className="text-lg font-bold">
                          {progressData.stats.completedChapters} / {outline.length}
                        </p>
                      </div>
                    </div>
                    {progressData.stats.averageScore > 0 && (
                      <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">平均分數</p>
                          <p className="text-lg font-bold">
                            {progressData.stats.averageScore.toFixed(1)} 分
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* 學習大綱 */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold">學習路徑</h2>
              <div className="grid gap-4">
                {outline.map((chapter: any, index: number) => (
                  <Card key={`chapter-${index}`} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <Badge variant="outline" className="text-sm">
                              第 {index + 1} 章
                            </Badge>
                            <Badge className={getDifficultyColor(chapter.difficulty)}>
                              {getDifficultyLabel(chapter.difficulty)}
                            </Badge>
                            {chapter.estimatedMinutes && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {chapter.estimatedMinutes} 分鐘
                              </span>
                            )}
                            {chapter.quizCount && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <FileQuestion className="w-3 h-3" />
                                {chapter.quizCount} 題測驗
                              </span>
                            )}
                            {progressMap[index] && (
                              <Badge
                                className={
                                  progressMap[index].status === "completed"
                                    ? "bg-green-500/10 text-green-700 border-green-500/20"
                                    : progressMap[index].status === "in_progress"
                                    ? "bg-blue-500/10 text-blue-700 border-blue-500/20"
                                    : "bg-gray-500/10 text-gray-700 border-gray-500/20"
                                }
                              >
                                {progressMap[index].status === "completed" && (
                                  <><CheckCircle2 className="w-3 h-3 mr-1" />已完成</>
                                )}
                                {progressMap[index].status === "in_progress" && (
                                  <><PlayCircle className="w-3 h-3 mr-1" />進行中</>
                                )}
                                {progressMap[index].status === "not_started" && (
                                  <><Circle className="w-3 h-3 mr-1" />未開始</>
                                )}
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-xl mb-2">
                            {chapter.title}
                          </CardTitle>
                          <CardDescription className="text-base">
                            {chapter.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* 知識點 */}
                        {chapter.keyPoints && chapter.keyPoints.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <BookMarked className="w-4 h-4 text-primary" />
                              <span className="font-semibold text-sm">重要知識點</span>
                            </div>
                            <ul className="space-y-1 ml-6">
                              {chapter.keyPoints.map((point: string, pointIndex: number) => (
                                <li key={pointIndex} className="text-sm text-muted-foreground list-disc">
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 學習目標 */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="w-4 h-4 text-green-600" />
                            <span className="font-semibold text-sm">學習目標</span>
                          </div>
                          <ul className="space-y-1 ml-6">
                            {chapter.learningGoals.map((goal: string, goalIndex: number) => (
                              <li key={goalIndex} className="text-sm text-muted-foreground list-disc">
                                {goal}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* 功能按鈕 */}
                        <div className="grid grid-cols-2 gap-2">
                          <Link href={`/student/knowledge-learning/chapter/${category?.id ?? categoryId}/${index}/${encodeURIComponent(chapter.title)}`}>
                            <Button className="w-full" variant="outline">
                              <BookOpen className="w-4 h-4 mr-2" />
                              開始學習
                            </Button>
                          </Link>
                          <Link href={`/student/knowledge-learning/quiz/${category?.id ?? categoryId}/${index}/${encodeURIComponent(chapter.title)}`}>
                            <Button className="w-full" variant="outline">
                              <FileQuestion className="w-4 h-4 mr-2" />
                              練習測驗
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>


          </div>
        ) : null}
      </div>
    </div>
  );
}
