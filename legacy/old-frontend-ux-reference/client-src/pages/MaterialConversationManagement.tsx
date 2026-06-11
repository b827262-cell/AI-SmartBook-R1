import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Eye, Trash2, Download, BarChart3, BookmarkPlus, CheckCircle, BookmarkMinus } from "lucide-react";
import { toast } from "sonner";

export default function MaterialConversationManagement() {
  const [filters, setFilters] = useState({
    lectureTeacherId: 0,
    userId: 0,
    startDate: "",
    endDate: "",
    page: 1,
    pageSize: 20,
  });
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false);

  // 批次勾選狀態
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data: conversationsData, refetch } = trpc.materialConversations.list.useQuery(filters);
  const { data: stats } = trpc.materialConversations.getStats.useQuery({
    lectureTeacherId: filters.lectureTeacherId || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  });
  const { data: teachers } = trpc.lectureTeachers.list.useQuery();
  const deleteMutation = trpc.materialConversations.delete.useMutation();
  const addToCacheMutation = trpc.materialConversations.addToCache.useMutation();
  const batchAddToCacheMutation = trpc.materialConversations.batchAddToCache.useMutation();
  const batchRemoveFromCacheMutation = trpc.materialConversations.batchRemoveFromCache.useMutation();

  const conversations = conversationsData?.conversations ?? [];
  const allIds = conversations.map((c: any) => c.id);
  const isAllSelected = allIds.length > 0 && allIds.every((id: number) => selectedIds.has(id));
  const isPartialSelected = allIds.some((id: number) => selectedIds.has(id)) && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        allIds.forEach((id: number) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        allIds.forEach((id: number) => next.add(id));
        return next;
      });
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddToCache = async (conv: any) => {
    if (conv.isAddedToCache) return;
    try {
      await addToCacheMutation.mutateAsync({ id: conv.id, qualityScore: 4 });
      toast.success("已成功加入快取！未來學生提問相似問題時將直接命中快取回答。");
      refetch();
      if (selectedConversation?.id === conv.id) {
        setSelectedConversation({ ...selectedConversation, isAddedToCache: 1 });
      }
    } catch (error: any) {
      if (error.message?.includes('已加入快取')) {
        toast.info("此對話已經在快取中了");
      } else {
        toast.error(error.message || "加入快取失敗");
      }
    }
  };

  const handleBatchAddToCache = async () => {
    if (selectedIds.size === 0) return;
    try {
      const result = await batchAddToCacheMutation.mutateAsync({
        ids: Array.from(selectedIds),
        qualityScore: 4,
      });
      toast.success(`批次加入快取完成！新增 ${result.added} 筆，已略過 ${result.skipped} 筆（已在快取中）`);
      setSelectedIds(new Set());
      refetch();
    } catch (error: any) {
      toast.error(error.message || "批次加入快取失敗");
    }
  };

  const handleBatchRemoveFromCache = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`確定要移除 ${selectedIds.size} 筆的快取標記嗎？（不會刪除 QA 快取資料庫中的內容）`)) return;
    try {
      const result = await batchRemoveFromCacheMutation.mutateAsync({
        ids: Array.from(selectedIds),
      });
      toast.success(`已移除 ${result.removed} 筆的快取標記`);
      setSelectedIds(new Set());
      refetch();
    } catch (error: any) {
      toast.error(error.message || "批次移除快取標記失敗");
    }
  };

  const handleViewDetail = (conversation: any) => {
    setSelectedConversation(conversation);
    setIsDetailDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("確定要刪除此對話紀錄嗎？")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("對話紀錄刪除成功");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "刪除失敗");
    }
  };

  const handleExportCSV = () => {
    if (!conversationsData?.conversations) return;
    const headers = ["ID", "學生ID", "老師ID", "問題", "回答", "來源", "時間"];
    const rows = conversationsData.conversations.map((conv: any) => [
      conv.id,
      conv.userId,
      conv.lectureTeacherId,
      `"${conv.question.replace(/"/g, '""')}"`,
      `"${conv.answer.replace(/"/g, '""')}"`,
      `"${JSON.stringify(conv.sources || []).replace(/"/g, '""')}"`,
      conv.createdAt,
    ]);
    const csv = [headers.join(","), ...rows.map((row: any[]) => row.join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `對話紀錄_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success("CSV 匯出成功");
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">教材學習對話紀錄</h1>
          <p className="text-muted-foreground mt-2">查看和管理所有學生的對話紀錄</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsStatsDialogOpen(true)}>
            <BarChart3 className="mr-2 h-4 w-4" />
            統計分析
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            匯出 CSV
          </Button>
        </div>
      </div>

      {/* 篩選區 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>篩選條件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>選擇老師</Label>
              <select
                className="w-full border rounded-md p-2 mt-1"
                value={filters.lectureTeacherId}
                onChange={(e) => setFilters({ ...filters, lectureTeacherId: Number(e.target.value), page: 1 })}
              >
                <option value={0}>全部老師</option>
                {teachers?.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>學生 ID</Label>
              <Input
                type="number"
                placeholder="輸入學生 ID"
                value={filters.userId || ""}
                onChange={(e) => setFilters({ ...filters, userId: Number(e.target.value) || 0, page: 1 })}
              />
            </div>
            <div>
              <Label>開始日期</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
              />
            </div>
            <div>
              <Label>結束日期</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 對話紀錄列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>對話紀錄列表</CardTitle>
              <CardDescription>
                共 {conversationsData?.total || 0} 筆紀錄
                {selectedIds.size > 0 && (
                  <span className="ml-2 text-blue-600 font-medium">已勾選 {selectedIds.size} 筆</span>
                )}
              </CardDescription>
            </div>
            {/* 批次操作按鈕 */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleBatchAddToCache}
                  disabled={batchAddToCacheMutation.isPending}
                  className="gap-1"
                >
                  <BookmarkPlus className="h-4 w-4" />
                  {batchAddToCacheMutation.isPending ? "加入中..." : `批次加入快取 (${selectedIds.size})`}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBatchRemoveFromCache}
                  disabled={batchRemoveFromCacheMutation.isPending}
                  className="gap-1"
                >
                  <BookmarkMinus className="h-4 w-4" />
                  {batchRemoveFromCacheMutation.isPending ? "移除中..." : `移除快取標記 (${selectedIds.size})`}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds(new Set())}
                >
                  取消選取
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <div className="flex items-center gap-1">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="全選"
                      ref={(el) => {
                        if (el) (el as any).indeterminate = isPartialSelected;
                      }}
                    />
                    <span className="text-xs text-muted-foreground">全選</span>
                  </div>
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead>學生 ID</TableHead>
                <TableHead>老師 ID</TableHead>
                <TableHead>問題</TableHead>
                <TableHead>時間</TableHead>
                <TableHead>快取狀態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversations.map((conv: any) => (
                <TableRow
                  key={conv.id}
                  className={selectedIds.has(conv.id) ? "bg-blue-50" : undefined}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(conv.id)}
                      onCheckedChange={() => toggleSelect(conv.id)}
                      aria-label={`選取第 ${conv.id} 筆`}
                    />
                  </TableCell>
                  <TableCell>{conv.id}</TableCell>
                  <TableCell>{conv.userId}</TableCell>
                  <TableCell>{conv.lectureTeacherId}</TableCell>
                  <TableCell className="max-w-xs truncate">{conv.question}</TableCell>
                  <TableCell>{new Date(conv.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={conv.isAddedToCache ? "default" : "secondary"}>
                      {conv.isAddedToCache ? "已加入" : "未加入"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(conv)}
                        title="查看詳情"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!conv.isAddedToCache && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddToCache(conv)}
                          title="加入快取"
                          disabled={addToCacheMutation.isPending}
                        >
                          <BookmarkPlus className="h-4 w-4 text-blue-500" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(conv.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* 分頁 */}
          {conversationsData && conversationsData.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                第 {conversationsData.page} 頁，共 {conversationsData.totalPages} 頁
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={conversationsData.page === 1}
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                >
                  上一頁
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={conversationsData.page === conversationsData.totalPages}
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                >
                  下一頁
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 對話詳情對話框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>對話詳情</DialogTitle>
          </DialogHeader>
          {selectedConversation && (
            <div className="space-y-4">
              <div>
                <Label className="font-semibold">學生問題：</Label>
                <p className="mt-1 p-3 bg-gray-50 rounded-md">{selectedConversation.question}</p>
              </div>
              <div>
                <Label className="font-semibold">AI 回答：</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md prose max-w-none">
                  {selectedConversation.answer}
                </div>
              </div>
              {selectedConversation.sources && selectedConversation.sources.length > 0 && (
                <div>
                  <Label className="font-semibold">參考來源：</Label>
                  <div className="mt-2 space-y-2">
                    {selectedConversation.sources.map((source: any, index: number) => (
                      <div key={index} className="p-3 border rounded-md">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge>{index + 1}</Badge>
                          <span className="font-medium">{source.materialTitle}</span>
                          <span className="text-sm text-muted-foreground">- {source.chapterTitle}</span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3">{source.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">學生 ID：</Label>
                  <p>{selectedConversation.userId}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">老師 ID：</Label>
                  <p>{selectedConversation.lectureTeacherId}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">時間：</Label>
                  <p>{new Date(selectedConversation.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">快取狀態：</Label>
                  <p>
                    <Badge variant={selectedConversation.isAddedToCache ? "default" : "secondary"}>
                      {selectedConversation.isAddedToCache ? "已加入快取" : "未加入快取"}
                    </Badge>
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex items-center justify-between gap-2">
            {selectedConversation && !selectedConversation.isAddedToCache ? (
              <Button
                variant="default"
                onClick={() => handleAddToCache(selectedConversation)}
                disabled={addToCacheMutation.isPending}
                className="gap-2"
              >
                <BookmarkPlus className="h-4 w-4" />
                {addToCacheMutation.isPending ? "加入中..." : "加入快取"}
              </Button>
            ) : selectedConversation?.isAddedToCache ? (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                <CheckCircle className="h-4 w-4" />
                已加入快取
              </div>
            ) : <div />}
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>關閉</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 統計分析對話框 */}
      <Dialog open={isStatsDialogOpen} onOpenChange={setIsStatsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>統計分析</DialogTitle>
            <DialogDescription>對話紀錄的統計資訊</DialogDescription>
          </DialogHeader>
          {stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">總對話數</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.totalConversations}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">獨立學生數</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.uniqueUsers}</div>
                  </CardContent>
                </Card>
              </div>
              <div>
                <Label className="font-semibold mb-3 block">常見問題 TOP 10：</Label>
                <div className="space-y-2">
                  {stats.frequentQuestions.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                      <div className="flex items-center gap-3 flex-1">
                        <Badge variant="outline">{index + 1}</Badge>
                        <span className="text-sm truncate">{item.question}</span>
                      </div>
                      <Badge>{item.count} 次</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsStatsDialogOpen(false)}>關閉</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
