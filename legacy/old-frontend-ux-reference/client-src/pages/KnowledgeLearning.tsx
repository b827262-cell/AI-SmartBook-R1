import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { BookOpen, ArrowLeft, GraduationCap, Lightbulb, Eye, EyeOff, Loader2, Target, Clock, FileQuestion, CheckCircle, ChevronDown, ChevronUp, Coins, AlertCircle, BookMarked } from "lucide-react";

interface OutlineChapter {
  id: number;
  title: string;
  description: string;
  keyPoints?: string[];
  learningGoals: string[];
  difficulty: string;
  estimatedMinutes?: number;
  quizCount?: number;
}

export function KnowledgeLearning() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const isAdmin = user?.role === 'admin';

  // 管理員可切換「預覽學員視角」
  const [previewAsStudent, setPreviewAsStudent] = useState(false);

  // 大綱預覽對話框狀態
  const [outlineDialogOpen, setOutlineDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [loadingOutline, setLoadingOutline] = useState(false);
  const [outlineData, setOutlineData] = useState<OutlineChapter[] | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());

  // 點數確認對話框
  const [creditsDialogOpen, setCreditsDialogOpen] = useState(false);

  // 學習進度映射（chapterIndex -> status）
  const [chapterProgressMap, setChapterProgressMap] = useState<Record<number, string>>({});

  // 獲取類科列表
  const { data, isLoading } = trpc.knowledgeLearning.listCategories.useQuery(
    { previewAsStudent: isAdmin ? previewAsStudent : false }
  );
  const categories = data?.categories || [];

  // 獲取用戶點數
  const { data: creditsData } = trpc.credits.getBalance.useQuery();
  const userCredits = creditsData?.balance ?? 0;

  // 查詢目前 AI 模型設定（gemma4 = 免費，不扣點）
  const { data: aiModelSetting } = trpc.settings.get.useQuery({ key: 'ai_model' });
  const isFreeModel = !aiModelSetting || aiModelSetting === 'gemma4';

  // 已學主題統計（批量查詢所有類科）
  const categoryIds = categories.map((c: any) => c.id).filter(Boolean);
  const { data: learnedCountData } = trpc.knowledgeLearning.getLearnedTopicsCount.useQuery(
    { categoryIds },
    { enabled: categoryIds.length > 0 }
  );
  const learnedCounts: Record<number, number> = (learnedCountData?.counts as Record<number, number>) ?? {};

  // 學習進度查詢（僅在對話框開啟且有選中分類時）
  const { data: progressData } = trpc.knowledgeLearning.getLearningProgress.useQuery(
    { categoryId: selectedCategory?.id ?? 0 },
    { enabled: outlineDialogOpen && !!selectedCategory?.id }
  );

  // 當進度資料載入後，建立映射
  useEffect(() => {
    if (progressData?.progress) {
      const map: Record<number, string> = {};
      progressData.progress.forEach((p: any) => {
        map[p.chapterIndex] = p.status;
      });
      setChapterProgressMap(map);
    }
  }, [progressData]);

  // 生成大綱 mutation（用於預覽）
  const generateOutlineMutation = trpc.knowledgeLearning.generateLearningOutline.useMutation({
    onSuccess: (data) => {
      setOutlineData(data.outline as OutlineChapter[]);
      setLoadingOutline(false);
    },
    onError: (error) => {
      setLoadingOutline(false);
      alert(`載入大綱失敗：${error.message}`);
    },
  });

  // 點擊「開始引導學習」— 直接進入 KnowledgeLearningChat，跳過章節列表
  const handleStartLearning = (category: any) => {
    setSelectedCategory(category);
    if (isFreeModel) {
      // 免費模型直接進入，不扣點
      navigate(`/student/knowledge-learning/${category.id}`);
    } else {
      setCreditsDialogOpen(true);
    }
  };

  // 切換章節展開/收合
  const toggleChapter = (chapterId: number) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  // 確認進入學習（免費模型直接進入，付費模型才顯示扣點確認）
  const handleConfirmStart = () => {
    setOutlineDialogOpen(false);
    if (isFreeModel) {
      // 免費模型（gemma4）直接進入，不扣點
      if (selectedCategory) {
        navigate(`/student/knowledge-learning/${selectedCategory.id}`);
      }
    } else {
      setCreditsDialogOpen(true);
    }
  };

  // 確認點數後進入學習
  const handleEnterLearning = () => {
    setCreditsDialogOpen(false);
    if (selectedCategory) {
      navigate(`/student/knowledge-learning/${selectedCategory.id}`);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "bg-green-500/10 text-green-700 border-green-500/20";
      case "intermediate": return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
      case "advanced": return "bg-red-500/10 text-red-700 border-red-500/20";
      default: return "bg-gray-500/10 text-gray-700 border-gray-500/20";
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

  // 計算點數消耗說明
  const dailyPointsLimit = selectedCategory?.dailyPointsLimit ?? 50;
  const baseChars = dailyPointsLimit * 500; // 每點 500 字元
  const baseCharsDisplay = baseChars >= 10000 ? `${(baseChars / 10000).toFixed(1)} 萬` : `${baseChars}`;
  const hasEnoughCredits = userCredits >= dailyPointsLimit;

  return (
    <div className="min-h-screen bg-background">
      {/* 頁面標題 */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <Link href="/student">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回智能專區
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">智能課堂</h1>
                <p className="text-muted-foreground mt-1">
                  全方位學科 AI 引導式教學
                </p>
              </div>
            </div>

            {/* 學生：我的學習歷程按鈕 */}
            {!isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/student/learning-history')}
                className="gap-1.5"
              >
                <BookOpen className="w-4 h-4" />
                我的學習歷程
              </Button>
            )}

            {/* 管理員：預覽學員視角切換按鈕 */}
            {isAdmin && (
              <div className="flex flex-col items-end gap-1">
                <Button
                  variant={previewAsStudent ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewAsStudent(prev => !prev)}
                  className={previewAsStudent ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500" : ""}
                >
                  {previewAsStudent ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      退出學員視角
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      預覽學員視角
                    </>
                  )}
                </Button>
                {previewAsStudent && (
                  <span className="text-xs text-amber-600 font-medium">
                    ⚠ 目前顯示學員看到的科目
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 預覽模式提示橫幅 */}
      {isAdmin && previewAsStudent && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="container flex items-center gap-2 text-amber-700 text-sm">
            <Eye className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>學員視角預覽模式</strong>：以下僅顯示學員可見的公開科目（已隱藏的科目不會出現）。
              <button
                onClick={() => setPreviewAsStudent(false)}
                className="ml-2 underline hover:no-underline"
              >
                返回管理員視角
              </button>
            </span>
          </div>
        </div>
      )}

      {/* 理念說明 */}
      <div className="container py-8">
        <Card className="bg-gradient-to-br from-primary/5 via-background to-background border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              <CardTitle>學習理念</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              全方位學習平台，支援多種學科知識庫。透過結構化引導和互動式提問，幫助你深入理解知識應用，建立系統化的學習脈絡。
            </p>
            
            <div className="p-4 bg-card rounded-lg border mt-6">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">📚 引導學習模式</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                AI 會根據知識庫內容，為你規劃完整的學習路徑，從基礎到進階循序漸進，並透過提問引導你思考。如需自由提問，請使用首頁的對話框。
              </p>
            </div>

            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>教學方法：</strong>我們採用「蘇格拉底式教學法」，不直接給答案，而是透過提問引導你思考。同時結合「費曼學習法」，要求你用自己的話解釋概念，確保真正理解而非死記硬背。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 類科列表 */}
      <div className="container pb-8">
        <h2 className="text-2xl font-bold mb-6">
          選擇學習科目
          {isAdmin && !previewAsStudent && (
            <span className="ml-3 text-sm font-normal text-muted-foreground">
              （管理員視角：顯示全部科目，包含隱藏的）
            </span>
          )}
        </h2>
        
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            載入中...
          </div>
        ) : categories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">
                {isAdmin && previewAsStudent ? '學員目前看不到任何科目' : '尚無開放的知識庫內容'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isAdmin && previewAsStudent
                  ? '所有科目均已隱藏或設為不公開，請至功能開關設定調整'
                  : isAdmin
                  ? '請先在知識庫管理中上傳文檔並設定分類，並將分類設為公開'
                  : '目前尚無開放的學習科目，請稍後再試'}
              </p>
              {isAdmin && (
                <div className="flex gap-2 justify-center">
                  <Link href="/admin/knowledge-base">
                    <Button variant="outline">前往知識庫管理</Button>
                  </Link>
                  <Link href="/admin/feature-toggles">
                    <Button variant="outline">功能開關設定</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <Card
                key={`${category.name}-${index}`}
                className={`hover:shadow-lg transition-shadow group ${
                  isAdmin && !previewAsStudent && String(category.isPublic) !== 'true'
                    ? 'opacity-60 border-dashed'
                    : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: (category as any).color || "#3b82f6" }}
                      />
                      <CardTitle className="text-xl">
                        {category.displayName || category.name}
                      </CardTitle>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {/* 管理員視角：顯示隱藏/未公開標籤 */}
                      {isAdmin && !previewAsStudent && String(category.isPublic) !== 'true' && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border">
                          未公開
                        </span>
                      )}

                    </div>
                  </div>
                  {category.description && (
                    <CardDescription className="mt-2">
                      {category.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* 已學主題統計 */}
                    {(learnedCounts[category.id] ?? 0) > 0 && (
                      <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
                        <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                        <span>已學 <strong>{learnedCounts[category.id]}</strong> 個主題</span>
                      </div>
                    )}
                    {/* 點數資訊 */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
                      <Coins className="w-3.5 h-3.5 text-amber-500" />
                      <span>每日學習上限：<strong className="text-foreground">{(category as any).dailyPointsLimit ?? 50} 點</strong></span>
                    </div>
                    {/* 學習模式按鈕 */}
                    <Button
                      variant="default"
                      size="default"
                      className="w-full"
                      onClick={() => handleStartLearning(category)}
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      開始引導學習
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 大綱預覽對話框 */}
      <Dialog open={outlineDialogOpen} onOpenChange={setOutlineDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="w-5 h-5 text-primary" />
              課程大綱預覽
            </DialogTitle>
            <DialogDescription>
              {selectedCategory?.displayName || selectedCategory?.name} — 學習路徑規劃
            </DialogDescription>
          </DialogHeader>

          {loadingOutline || generateOutlineMutation.isPending ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">AI 正在載入課程大綱，請稍候...</p>
            </div>
          ) : outlineData ? (
            <div className="space-y-3">
              {/* 大綱摘要 */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span><strong>{outlineData.length}</strong> 個章節</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>預估 <strong>{outlineData.reduce((sum, c) => sum + (c.estimatedMinutes || 30), 0)}</strong> 分鐘</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileQuestion className="w-4 h-4 text-primary" />
                    <span>共 <strong>{outlineData.reduce((sum, c) => sum + (c.quizCount || 3), 0)}</strong> 題測驗</span>
                  </div>
                </div>
              </div>

              {/* 章節列表 */}
              {outlineData.map((chapter, idx) => (
                <div key={chapter.id} className="border rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => toggleChapter(chapter.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-sm font-medium text-muted-foreground shrink-0">第 {idx + 1} 章</span>
                      <span className="font-semibold truncate">{chapter.title}</span>
                      <Badge className={`shrink-0 text-xs ${getDifficultyColor(chapter.difficulty)}`}>
                        {getDifficultyLabel(chapter.difficulty)}
                      </Badge>
                      {/* 學習進度狀態標籤 */}
                      {chapterProgressMap[idx] === 'completed' && (
                        <span className="shrink-0 inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                          <CheckCircle className="w-3 h-3" />
                          已完成
                        </span>
                      )}
                      {chapterProgressMap[idx] === 'in_progress' && (
                        <span className="shrink-0 inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                          進行中
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 ml-2 shrink-0">
                      {chapter.estimatedMinutes && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {chapter.estimatedMinutes} 分
                        </span>
                      )}
                      {chapter.quizCount && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileQuestion className="w-3 h-3" />
                          {chapter.quizCount} 題
                        </span>
                      )}
                      {expandedChapters.has(chapter.id) ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {expandedChapters.has(chapter.id) && (
                    <div className="px-4 pb-4 border-t bg-muted/20 space-y-3">
                      <p className="text-sm text-muted-foreground pt-3">{chapter.description}</p>

                      {chapter.keyPoints && chapter.keyPoints.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <BookMarked className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-semibold text-primary">重要知識點</span>
                          </div>
                          <ul className="space-y-1 ml-5">
                            {chapter.keyPoints.map((point, i) => (
                              <li key={i} className="text-xs text-muted-foreground list-disc">{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {chapter.learningGoals && chapter.learningGoals.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Target className="w-3.5 h-3.5 text-green-600" />
                            <span className="text-xs font-semibold text-green-700">學習目標</span>
                          </div>
                          <ul className="space-y-1 ml-5">
                            {chapter.learningGoals.map((goal, i) => (
                              <li key={i} className="text-xs text-muted-foreground list-disc">{goal}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p>無法載入大綱，請稍後再試</p>
            </div>
          )}

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setOutlineDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleConfirmStart}
              disabled={loadingOutline || generateOutlineMutation.isPending}
            >
              確認進入學習
              <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 點數確認對話框 */}
      <Dialog open={creditsDialogOpen} onOpenChange={setCreditsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              確認點數消耗
            </DialogTitle>
            <DialogDescription>
              進入「{selectedCategory?.displayName || selectedCategory?.name}」引導學習
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 用戶點數 */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">目前剩餘點數</span>
              <span className="font-bold text-lg">{userCredits} 點</span>
            </div>

            {/* 點數消耗說明 */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm">點數消耗規則</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="text-primary font-medium shrink-0">•</span>
                  <span>每日學習上限：<strong className="text-foreground">{dailyPointsLimit} 點</strong>（約 {baseCharsDisplay} 字元的 AI 回覆）</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-medium shrink-0">•</span>
                  <span>超出後每 500 字元再扣 <strong className="text-foreground">1 點</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-medium shrink-0">•</span>
                  <span>每日點數上限於隔天 00:00 重置</span>
                </div>
              </div>
            </div>

            {/* 點數進度條 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>點數充足度</span>
                <span>{Math.min(100, Math.round((userCredits / dailyPointsLimit) * 100))}%</span>
              </div>
              <Progress
                value={Math.min(100, (userCredits / dailyPointsLimit) * 100)}
                className="h-2"
              />
            </div>

            {/* 點數不足警告 */}
            {!hasEnoughCredits && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>點數不足！目前剩餘 {userCredits} 點，建議至少 {dailyPointsLimit} 點才能完整體驗每日學習。</span>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setCreditsDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleEnterLearning}
              variant={hasEnoughCredits ? "default" : "destructive"}
            >
              {hasEnoughCredits ? "確認進入學習" : "點數不足，仍要進入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
