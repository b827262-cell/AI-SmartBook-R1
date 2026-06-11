import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, BookOpen, CheckCircle, Clock, TrendingUp, Award, Trash2, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function LearningProgress() {
  const [, setLocation] = useLocation();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);

  // 獲取類科列表
  const { data: categoriesData } = trpc.knowledgeLearning.listCategories.useQuery();
  const categories = categoriesData?.categories || [];

  // 獲取學習進度（如果有選擇類科）
  const { data: progressData, refetch } = trpc.knowledgeLearning.getLearningProgress.useQuery(
    { categoryId: selectedCategoryId! },
    { enabled: selectedCategoryId !== null }
  );

  const progress = progressData?.progress || [];
  const stats = progressData?.stats || {
    totalChaptersCompleted: 0,
    totalQuizzesTaken: 0,
    averageQuizScore: 0,
    totalStudyTimeMinutes: 0,
  };

  // 批次刪除
  const deleteBatchMutation = trpc.knowledgeLearning.deleteLearningProgressBatch.useMutation({
    onSuccess: (data) => {
      toast.success(`已清除 ${data.deleted} 筆學習紀錄`);
      setSelectedIds(new Set());
      refetch();
    },
    onError: () => {
      toast.error("清除失敗，請稍後再試");
    },
  });

  // 清除整個類科
  const clearCategoryMutation = trpc.knowledgeLearning.clearProgressByCategory.useMutation({
    onSuccess: () => {
      toast.success("已清除所有學習紀錄");
      setSelectedIds(new Set());
      refetch();
    },
    onError: () => {
      toast.error("清除失敗，請稍後再試");
    },
  });

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === progress.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(progress.map(r => r.id)));
    }
  };

  const handleDeleteSelected = () => {
    deleteBatchMutation.mutate({ progressIds: Array.from(selectedIds) });
    setShowDeleteDialog(false);
  };

  const handleClearAll = () => {
    if (selectedCategoryId !== null) {
      clearCategoryMutation.mutate({ categoryId: selectedCategoryId });
    }
    setShowClearAllDialog(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 頂部導航 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/student/knowledge-learning")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回智能專區
            </Button>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h1 className="text-lg font-semibold">學習記錄</h1>
            </div>
          </div>
        </div>
      </div>

      {/* 主要內容 */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 類科選擇 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>選擇類科</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategoryId === category.id ? "default" : "outline"}
                  className="h-auto py-4"
                  onClick={() => {
                    setSelectedCategoryId(category.id);
                    setSelectedIds(new Set());
                  }}
                >
                  <div className="text-center">
                    <div className="font-semibold">{category.displayName || category.name}</div>
                    {category.documentCount > 0 && (
                      <div className="text-xs mt-1 opacity-75">
                        {category.documentCount} 份文檔
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 學習統計 */}
        {selectedCategoryId && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">已完成章節</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.totalChaptersCompleted}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">測驗次數</p>
                      <p className="text-2xl font-bold text-green-600">{stats.totalQuizzesTaken}</p>
                    </div>
                    <Award className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">平均分數</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {stats.averageQuizScore > 0 ? Math.round(stats.averageQuizScore) : 0}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">學習時長</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {Math.round(stats.totalStudyTimeMinutes)} 分鐘
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 章節學習記錄 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>全部學習記錄 (共 {progress.length} 筆)</CardTitle>
                  {progress.length > 0 && (
                    <div className="flex items-center gap-2">
                      {selectedIds.size > 0 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setShowDeleteDialog(true)}
                          disabled={deleteBatchMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          清除已選 ({selectedIds.size})
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setShowClearAllDialog(true)}
                        disabled={clearCategoryMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        清除全部
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {progress.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>尚無學習記錄，開始學習吧！</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* 全選列 */}
                    <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
                      <Checkbox
                        checked={selectedIds.size === progress.length && progress.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                      <span className="text-sm text-gray-600">
                        {selectedIds.size === progress.length && progress.length > 0
                          ? "取消全選"
                          : `全選 (${progress.length} 筆)`}
                      </span>
                    </div>

                    {progress.map((record) => (
                      <div
                        key={record.id}
                        className={`flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                          selectedIds.has(record.id) ? "bg-red-50 border-red-200" : ""
                        }`}
                      >
                        <Checkbox
                          checked={selectedIds.has(record.id)}
                          onCheckedChange={() => toggleSelect(record.id)}
                        />

                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          record.status === "completed" ? "bg-green-100" :
                          record.status === "in_progress" ? "bg-blue-100" :
                          "bg-gray-100"
                        }`}>
                          {record.status === "completed" ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : record.status === "in_progress" ? (
                            <Clock className="h-5 w-5 text-blue-600" />
                          ) : (
                            <BookOpen className="h-5 w-5 text-gray-600" />
                          )}
                        </div>

                        <div className="flex-1">
                          <h3 className="font-semibold">{record.chapterTitle}</h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <span>
                              狀態：
                              {record.status === "completed" ? "已完成" :
                               record.status === "in_progress" ? "學習中" :
                               "未開始"}
                            </span>
                            {record.lastQuizScore !== null && (
                              <span>最近測驗：{record.lastQuizScore} 分</span>
                            )}
                            {record.quizAttempts > 0 && (
                              <span>測驗次數：{record.quizAttempts} 次</span>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/student/knowledge-learning/chapter/${selectedCategoryId}/${record.chapterIndex}/${encodeURIComponent(record.chapterTitle)}`)}
                        >
                          {record.status === "completed" ? "複習" : "繼續學習"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!selectedCategoryId && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>請先選擇一個類科查看學習記錄</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 刪除已選確認 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              確認清除學習紀錄
            </AlertDialogTitle>
            <AlertDialogDescription>
              即將清除 <strong>{selectedIds.size} 筆</strong>學習紀錄，包含對話內容和測驗成績。此操作無法復原，確定要繼續嗎？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              className="bg-red-600 hover:bg-red-700"
            >
              確認清除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 清除全部確認 */}
      <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              確認清除所有學習紀錄
            </AlertDialogTitle>
            <AlertDialogDescription>
              即將清除此類科的 <strong>所有 {progress.length} 筆</strong>學習紀錄，包含所有對話內容和測驗成績。此操作無法復原，確定要繼續嗎？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-red-600 hover:bg-red-700"
            >
              確認清除全部
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
