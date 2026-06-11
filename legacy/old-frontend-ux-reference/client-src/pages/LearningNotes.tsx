import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search, Trash2, Edit2, FileText, Calendar, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

export default function LearningNotes() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNote, setSelectedNote] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  // 查詢學習筆記列表
  const { data, isLoading, refetch } = trpc.learningNotes.list.useQuery(
    { search: searchQuery },
    { enabled: !!user }
  );

  // 更新標題
  const updateTitleMutation = trpc.learningNotes.updateTitle.useMutation({
    onSuccess: () => {
      toast.success("標題已更新");
      setIsEditDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // 刪除筆記
  const deleteMutation = trpc.learningNotes.delete.useMutation({
    onSuccess: () => {
      toast.success("學習筆記已刪除");
      setIsDeleteDialogOpen(false);
      setSelectedNote(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEditClick = (noteId: number, currentTitle: string | null) => {
    setSelectedNote(noteId);
    setEditTitle(currentTitle || "");
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (noteId: number) => {
    setSelectedNote(noteId);
    setIsDeleteDialogOpen(true);
  };

  const handleUpdateTitle = () => {
    if (selectedNote && editTitle.trim()) {
      updateTitleMutation.mutate({
        id: selectedNote,
        title: editTitle.trim(),
      });
    }
  };

  const handleDelete = () => {
    if (selectedNote) {
      deleteMutation.mutate({ id: selectedNote });
    }
  };

  const handleViewDetail = (noteId: number) => {
    setLocation(`/student/learning-notes/${noteId}`);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const conversations = data?.conversations || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto py-12 px-4">
        {/* 標題區域 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">學習筆記</h1>
            <p className="text-muted-foreground">
              查看、搜尋和管理你的 PDF 學習對話記錄
            </p>
          </div>
          <Button variant="ghost" onClick={() => setLocation("/student")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回智能專區
          </Button>
        </div>

        {/* 搜尋框 */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜尋標題、對話內容或筆記..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* 學習筆記列表 */}
        {conversations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchQuery ? "沒有找到符合的學習筆記" : "還沒有學習筆記，開始學習 PDF 資料吧！"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {conversations.map((conv) => {
              // 計算對話數量
              const conversationData = conv.conversationData as any;
              const messageCount = Array.isArray(conversationData) ? conversationData.length : 0;

              return (
                <Card key={conv.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">
                          {conv.title || "未命名對話"}
                        </CardTitle>
                        <CardDescription className="space-y-1">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span>{conv.materialTitle || "未知資料"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {conv.updatedAt
                                ? format(new Date(conv.updatedAt), "yyyy/MM/dd HH:mm", { locale: zhTW })
                                : "未知時間"}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            共 {messageCount} 則對話
                            {conv.pageNumber && ` · 第 ${conv.pageNumber} 頁`}
                          </div>
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(conv.id, conv.title)}
                          title="編輯標題"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(conv.id)}
                          title="刪除"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      onClick={() => handleViewDetail(conv.id)}
                    >
                      查看對話內容
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 編輯標題對話框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯標題</DialogTitle>
            <DialogDescription>
              為這個學習筆記設定一個有意義的標題
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="輸入標題..."
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleUpdateTitle();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleUpdateTitle}
              disabled={!editTitle.trim() || updateTitleMutation.isPending}
            >
              {updateTitleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除確認對話框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
            <DialogDescription>
              確定要刪除這個學習筆記嗎？此操作無法復原。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
