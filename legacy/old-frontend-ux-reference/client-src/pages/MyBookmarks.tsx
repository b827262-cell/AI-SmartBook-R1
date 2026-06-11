import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bookmark, Trash2, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function MyBookmarks() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // 獲取收藏列表
  const { data: bookmarksData, refetch } = trpc.lawLearning.getBookmarks.useQuery();

  // 更新筆記
  const updateNotesMutation = trpc.lawLearning.updateNotes.useMutation({
    onSuccess: () => {
      alert("筆記保存成功！");
      setEditingId(null);
      setEditingNotes("");
      refetch();
    },
    onError: (error) => {
      alert(error.message || "筆記保存失敗！");
    },
  });

  // 刪除收藏
  const unbookmarkMutation = trpc.lawLearning.unbookmarkArticle.useMutation({
    onSuccess: () => {
      alert("已取消收藏！");
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      refetch();
    },
    onError: (error) => {
      alert(error.message || "取消收藏失敗！");
    },
  });

  const bookmarks = bookmarksData?.bookmarks || [];

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bookmark className="w-6 h-6" />
            我的收藏
          </CardTitle>
          <CardDescription>
            查看和管理您收藏的法條，並添加個人學習筆記
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bookmarks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bookmark className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>您還沒有收藏任何法條</p>
              <p className="text-sm mt-2">在六法全書學習頁面搜尋法條並點擊「收藏」按鈕即可收藏</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {bookmarks.map((bookmark) => (
                  <Card key={bookmark.id} className="border-l-4 border-l-primary">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {bookmark.lawName} {bookmark.articleNo}
                          </CardTitle>
                          <CardDescription className="text-xs mt-1">
                            收藏時間：{new Date(bookmark.createdAt).toLocaleString()}
                          </CardDescription>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setDeletingId(bookmark.id);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          刪除
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* 法條內容 */}
                      <div>
                        <h4 className="font-semibold text-sm mb-2">條文內容：</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {bookmark.content}
                        </p>
                      </div>

                      {/* 個人筆記 */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-semibold text-sm">個人筆記：</h4>
                          {editingId === bookmark.id ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                updateNotesMutation.mutate({
                                  id: bookmark.id,
                                  notes: editingNotes,
                                });
                              }}
                              disabled={updateNotesMutation.isPending}
                            >
                              <Save className="w-4 h-4 mr-1" />
                              保存
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingId(bookmark.id);
                                setEditingNotes(bookmark.notes || "");
                              }}
                            >
                              編輯筆記
                            </Button>
                          )}
                        </div>
                        {editingId === bookmark.id ? (
                          <Textarea
                            value={editingNotes}
                            onChange={(e) => setEditingNotes(e.target.value)}
                            placeholder="在此添加您的學習筆記..."
                            className="min-h-[100px]"
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {bookmark.notes || "尚未添加筆記"}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* 刪除確認對話框 */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
            <DialogDescription>
              您確定要刪除這個收藏嗎？此操作無法撤銷。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setDeletingId(null);
              }}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deletingId) {
                  unbookmarkMutation.mutate({ id: deletingId });
                }
              }}
              disabled={unbookmarkMutation.isPending}
            >
              確認刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
