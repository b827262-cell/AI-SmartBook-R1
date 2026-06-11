import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Download, Trash2, Eye, MoreVertical, ExternalLink, MessageSquare, Globe, Monitor, X, Send, CheckCircle2 } from "lucide-react";

export function FeedbackManagement() {
  const [statusFilter, setStatusFilter] = useState<any>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isEditingReply, setIsEditingReply] = useState(false);

  const { data: feedbackList, refetch } = trpc.feedback.list.useQuery({
    status: statusFilter,
  });

  const { data: stats } = trpc.feedback.stats.useQuery();

  const updateStatusMutation = trpc.feedback.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("狀態已更新");
      refetch();
    },
  });

  const adminReplyMutation = trpc.feedback.adminReply.useMutation({
    onSuccess: () => {
      toast.success("回覆已送出");
      const now = new Date().toISOString().replace("T", " ").substring(0, 19);
      setSelectedFeedback((prev: any) => ({
        ...prev,
        adminReply: replyText,
        repliedAt: now,
      }));
      setIsEditingReply(false);
      refetch();
    },
    onError: (err) => {
      toast.error(`回覆失敗：${err.message}`);
    },
  });

  const batchDeleteMutation = trpc.feedback.batchDelete.useMutation({
    onSuccess: (data: any) => {
      toast.success(`已刪除 ${data.count} 筆回饋`);
      setSelectedIds(new Set());
      refetch();
    },
  });

  const exportMarkdownQuery = trpc.feedback.exportMarkdown.useQuery(
    { ids: Array.from(selectedIds) },
    { enabled: false }
  );

  const handleExportMarkdown = async () => {
    if (selectedIds.size === 0) {
      toast.error("請選擇要匯出的回饋");
      return;
    }
    const result = await exportMarkdownQuery.refetch();
    if (result.data) {
      const blob = new Blob([result.data.markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("已匯出");
    }
  };

  const handleOpenDetail = (f: any) => {
    setSelectedFeedback(f);
    setReplyText(f.adminReply || "");
    setIsEditingReply(false);
  };

  const handleSendReply = () => {
    if (!replyText.trim()) {
      toast.error("請輸入回覆內容");
      return;
    }
    adminReplyMutation.mutate({ id: selectedFeedback.id, reply: replyText.trim() });
  };

  const typeLabels: any = {
    bug: "Bug",
    feature_request: "功能建議",
    ui_ux: "UI/UX",
    other: "其他",
  };

  const statusLabels: any = {
    pending: "待處理",
    in_progress: "處理中",
    completed: "已完成",
    ignored: "已忽略",
  };

  const statusColors: any = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    in_progress: "bg-blue-100 text-blue-800 border-blue-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    ignored: "bg-gray-100 text-gray-600 border-gray-200",
  };

  const typeColors: any = {
    bug: "bg-red-100 text-red-700 border-red-200",
    feature_request: "bg-purple-100 text-purple-700 border-purple-200",
    ui_ux: "bg-indigo-100 text-indigo-700 border-indigo-200",
    other: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <>
      
      <div className="container py-4 md:py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">問題意見回饋管理</h1>

        {/* 統計卡片 */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-4 md:mb-6">
            <Card>
              <CardContent className="pt-4 md:pt-6">
                <div className="text-xs md:text-sm text-muted-foreground">總計</div>
                <div className="text-xl md:text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 md:pt-6">
                <div className="text-xs md:text-sm text-muted-foreground">待處理</div>
                <div className="text-xl md:text-2xl font-bold text-yellow-600">{stats.pending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 md:pt-6">
                <div className="text-xs md:text-sm text-muted-foreground">處理中</div>
                <div className="text-xl md:text-2xl font-bold text-blue-600">{stats.inProgress}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 md:pt-6">
                <div className="text-xs md:text-sm text-muted-foreground">已完成</div>
                <div className="text-xl md:text-2xl font-bold text-green-600">{stats.completed}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 md:pt-6">
                <div className="text-xs md:text-sm text-muted-foreground">已忽略</div>
                <div className="text-xl md:text-2xl font-bold text-gray-600">{stats.ignored}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 篩選器和批次操作 */}
        <Card className="mb-4 md:mb-6">
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:justify-between">
              <Select value={statusFilter || "all"} onValueChange={(v: any) => setStatusFilter(v === "all" ? undefined : v)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="篩選狀態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="pending">待處理</SelectItem>
                  <SelectItem value="in_progress">處理中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="ignored">已忽略</SelectItem>
                </SelectContent>
              </Select>

              {selectedIds.size > 0 && (
                <div className="hidden sm:flex gap-2">
                  <Button variant="outline" onClick={handleExportMarkdown}>
                    <Download className="w-4 h-4 mr-1" />
                    匯出 ({selectedIds.size})
                  </Button>
                  <Button variant="destructive" onClick={() => batchDeleteMutation.mutate({ ids: Array.from(selectedIds) })}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    刪除
                  </Button>
                </div>
              )}

              {selectedIds.size > 0 && (
                <div className="sm:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <MoreVertical className="w-4 h-4 mr-2" />
                        批次操作 ({selectedIds.size})
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={handleExportMarkdown}>
                        <Download className="w-4 h-4 mr-2" />
                        匯出 ({selectedIds.size})
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => batchDeleteMutation.mutate({ ids: Array.from(selectedIds) })}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        刪除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 桌面版表格視圖 */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="p-4 text-left w-10">
                    <Checkbox
                      checked={selectedIds.size === feedbackList?.length && (feedbackList?.length ?? 0) > 0}
                      onCheckedChange={() => {
                        if (selectedIds.size === feedbackList?.length) {
                          setSelectedIds(new Set());
                        } else {
                          setSelectedIds(new Set(feedbackList?.map((f: any) => f.id) || []));
                        }
                      }}
                    />
                  </th>
                  <th className="p-4 text-left">類型</th>
                  <th className="p-4 text-left">標題</th>
                  <th className="p-4 text-left">狀態</th>
                  <th className="p-4 text-left">提交時間</th>
                  <th className="p-4 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {feedbackList?.map((f: any) => (
                  <tr
                    key={f.id}
                    className="border-t hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => handleOpenDetail(f)}
                  >
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(f.id)}
                        onCheckedChange={() => {
                          const newSet = new Set(selectedIds);
                          if (newSet.has(f.id)) newSet.delete(f.id);
                          else newSet.add(f.id);
                          setSelectedIds(newSet);
                        }}
                      />
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${typeColors[f.type]}`}>
                        {typeLabels[f.type]}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{f.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {f.screenshotUrl && (
                          <span className="text-xs text-blue-500 flex items-center gap-1">
                            <Eye className="w-3 h-3" /> 含截圖
                          </span>
                        )}
                        {f.adminReply && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> 已回覆
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <Select value={f.status} onValueChange={(v: any) => updateStatusMutation.mutate({ id: f.id, status: v })}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">待處理</SelectItem>
                          <SelectItem value="in_progress">處理中</SelectItem>
                          <SelectItem value="completed">已完成</SelectItem>
                          <SelectItem value="ignored">已忽略</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(f.createdAt).toLocaleString("zh-TW")}
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDetail(f)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        查看詳情
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {feedbackList?.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">尚無回饋資料</div>
            )}
          </CardContent>
        </Card>

        {/* 手機版卡片視圖 */}
        <div className="md:hidden space-y-3">
          {feedbackList?.map((f: any) => (
            <Card key={f.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleOpenDetail(f)}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(f.id)}
                      onCheckedChange={() => {
                        const newSet = new Set(selectedIds);
                        if (newSet.has(f.id)) newSet.delete(f.id);
                        else newSet.add(f.id);
                        setSelectedIds(newSet);
                      }}
                      className="w-5 h-5"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border shrink-0 ${typeColors[f.type]}`}>
                        {typeLabels[f.type]}
                      </span>
                      <h3 className="font-medium text-sm flex-1 break-words">{f.title}</h3>
                    </div>

                    <div className="mb-2" onClick={(e) => e.stopPropagation()}>
                      <Select value={f.status} onValueChange={(v: any) => updateStatusMutation.mutate({ id: f.id, status: v })}>
                        <SelectTrigger className="w-full h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">待處理</SelectItem>
                          <SelectItem value="in_progress">處理中</SelectItem>
                          <SelectItem value="completed">已完成</SelectItem>
                          <SelectItem value="ignored">已忽略</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {new Date(f.createdAt).toLocaleString("zh-TW")}
                      </div>
                      <div className="flex items-center gap-2">
                        {f.screenshotUrl && (
                          <span className="text-xs text-blue-500 flex items-center gap-1">
                            <Eye className="w-3 h-3" /> 含截圖
                          </span>
                        )}
                        {f.adminReply && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> 已回覆
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {feedbackList?.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                尚無回饋資料
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 詳情彈窗 */}
      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8">
              <MessageSquare className="w-5 h-5 text-blue-500 shrink-0" />
              <span className="break-words">{selectedFeedback?.title}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-5">
              {/* 基本資訊 */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium border ${typeColors[selectedFeedback.type]}`}>
                  {typeLabels[selectedFeedback.type]}
                </span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium border ${statusColors[selectedFeedback.status]}`}>
                  {statusLabels[selectedFeedback.status]}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(selectedFeedback.createdAt).toLocaleString("zh-TW")}
                </span>
              </div>

              {/* 更改狀態 */}
              <div>
                <div className="text-sm font-medium mb-1.5 text-muted-foreground">更改狀態</div>
                <Select
                  value={selectedFeedback.status}
                  onValueChange={(v: any) => {
                    updateStatusMutation.mutate({ id: selectedFeedback.id, status: v });
                    setSelectedFeedback((prev: any) => ({ ...prev, status: v }));
                  }}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">待處理</SelectItem>
                    <SelectItem value="in_progress">處理中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="ignored">已忽略</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 問題描述 */}
              <div>
                <div className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  問題描述
                </div>
                <div className="bg-muted/40 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {selectedFeedback.description}
                </div>
              </div>

              {/* 截圖/圖片 */}
              {selectedFeedback.screenshotUrl && (
                <div>
                  <div className="text-sm font-medium mb-2 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    上傳截圖
                  </div>
                  <div
                    className="relative rounded-lg overflow-hidden border cursor-zoom-in group"
                    onClick={() => setLightboxImage(selectedFeedback.screenshotUrl)}
                  >
                    <img
                      src={selectedFeedback.screenshotUrl}
                      alt="回饋截圖"
                      className="w-full max-h-72 object-contain bg-gray-50"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 bg-black/60 text-white text-xs px-2 py-1 rounded transition-opacity">
                        點擊放大
                      </span>
                    </div>
                  </div>
                  <a
                    href={selectedFeedback.screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 mt-1.5"
                  >
                    <ExternalLink className="w-3 h-3" />
                    在新分頁開啟原圖
                  </a>
                </div>
              )}

              {/* 頁面 URL */}
              {selectedFeedback.pageUrl && (
                <div>
                  <div className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    發生頁面
                  </div>
                  <a
                    href={selectedFeedback.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 break-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    {selectedFeedback.pageUrl}
                  </a>
                </div>
              )}

              {/* 瀏覽器資訊 */}
              {selectedFeedback.browserInfo && (
                <div>
                  <div className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <Monitor className="w-4 h-4 text-muted-foreground" />
                    瀏覽器資訊
                  </div>
                  <div className="bg-muted/40 rounded px-3 py-2 text-xs text-muted-foreground font-mono break-all">
                    {selectedFeedback.browserInfo}
                  </div>
                </div>
              )}

              {/* 管理員回覆區塊 */}
              <div className="border-t pt-4">
                <div className="text-sm font-medium mb-3 flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-blue-500" />
                  管理員回覆
                  {selectedFeedback.adminReply && !isEditingReply && (
                    <span className="ml-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground h-6 px-2"
                        onClick={() => {
                          setReplyText(selectedFeedback.adminReply);
                          setIsEditingReply(true);
                        }}
                      >
                        編輯回覆
                      </Button>
                    </span>
                  )}
                </div>

                {/* 已有回覆且非編輯模式：顯示回覆內容 */}
                {selectedFeedback.adminReply && !isEditingReply ? (
                  <div>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap break-words text-blue-900">
                      {selectedFeedback.adminReply}
                    </div>
                    {selectedFeedback.repliedAt && (
                      <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        回覆時間：{new Date(selectedFeedback.repliedAt).toLocaleString("zh-TW")}
                      </div>
                    )}
                  </div>
                ) : (
                  /* 輸入回覆框 */
                  <div className="space-y-2">
                    <Textarea
                      placeholder="輸入回覆內容，學生將可在意見回饋頁面看到此回覆..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="min-h-[100px] resize-none text-sm"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      {isEditingReply && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditingReply(false);
                            setReplyText(selectedFeedback.adminReply || "");
                          }}
                        >
                          取消
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={handleSendReply}
                        disabled={adminReplyMutation.isPending || !replyText.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {adminReplyMutation.isPending ? (
                          <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            送出中...
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <Send className="w-3.5 h-3.5" />
                            送出回覆
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 圖片燈箱 */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
            onClick={() => setLightboxImage(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxImage}
            alt="截圖放大"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
