import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Megaphone, Newspaper, Bell, Sparkles, Trash2, Plus, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/**
 * 管理員公告管理頁面
 * 支援創建、查看和刪除公告
 */
export function AnnouncementManagement() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"edm" | "exam_info" | "reminder" | "recommendation">("edm");
  const [targetAudience, setTargetAudience] = useState<"all" | "specific">("all");

  // 編輯狀態
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState<"edm" | "exam_info" | "reminder" | "recommendation">("edm");
  const [editTargetAudience, setEditTargetAudience] = useState<"all" | "specific">("all");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // 獲取所有公告（管理員專用）
  const { data: announcements, refetch } = trpc.announcement.getAllAnnouncements.useQuery({
    limit: 50,
    offset: 0,
  });

  // 創建公告
  const createAnnouncementMutation = trpc.announcement.createAnnouncement.useMutation({
    onSuccess: () => {
      toast.success("公告創建成功");
      setTitle("");
      setContent("");
      refetch();
    },
    onError: (error) => {
      toast.error(`創建失敗：${error.message}`);
    },
  });

  // 刪除公告
  const deleteAnnouncementMutation = trpc.announcement.deleteAnnouncement.useMutation({
    onSuccess: () => {
      toast.success("公告刪除成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  // 更新公告
  const updateAnnouncementMutation = trpc.announcement.updateAnnouncement.useMutation({
    onSuccess: () => {
      toast.success("公告更新成功");
      setIsEditDialogOpen(false);
      setEditingId(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  const handleCreateAnnouncement = () => {
    if (!title.trim() || !content.trim()) {
      toast.error("標題和內容不能為空");
      return;
    }

    createAnnouncementMutation.mutate({
      type,
      title: title.trim(),
      content: content.trim(),
      targetAudience,
    });
  };

  const handleDeleteAnnouncement = (id: number) => {
    if (confirm("確定要刪除這則公告嗎？")) {
      deleteAnnouncementMutation.mutate({ id });
    }
  };

  const handleEditAnnouncement = (announcement: any) => {
    setEditingId(announcement.id);
    setEditTitle(announcement.title);
    setEditContent(announcement.content);
    setEditType(announcement.type);
    setEditTargetAudience(announcement.targetAudience);
    setIsEditDialogOpen(true);
  };

  const handleUpdateAnnouncement = () => {
    if (!editTitle.trim() || !editContent.trim()) {
      toast.error("標題和內容不能為空");
      return;
    }

    if (editingId === null) return;

    updateAnnouncementMutation.mutate({
      id: editingId,
      type: editType,
      title: editTitle.trim(),
      content: editContent.trim(),
      targetAudience: editTargetAudience,
    });
  };

  const getTypeIcon = (announcementType: string) => {
    switch (announcementType) {
      case "edm":
        return <Megaphone className="w-5 h-5" />;
      case "exam_info":
        return <Newspaper className="w-5 h-5" />;
      case "reminder":
        return <Bell className="w-5 h-5" />;
      case "recommendation":
        return <Sparkles className="w-5 h-5" />;
      default:
        return <Megaphone className="w-5 h-5" />;
    }
  };

  const getTypeName = (announcementType: string) => {
    switch (announcementType) {
      case "edm":
        return "EDM";
      case "exam_info":
        return "考情";
      case "reminder":
        return "提醒";
      case "recommendation":
        return "推薦";
      default:
        return announcementType;
    }
  };

  const getTypeColor = (announcementType: string) => {
    switch (announcementType) {
      case "edm":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "exam_info":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "reminder":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
      case "recommendation":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <>
      
      <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">公告管理</h1>
        <p className="text-muted-foreground">創建和管理系統公告</p>
      </div>

      {/* 創建公告表單 */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          創建新公告
        </h2>

        <div className="space-y-4">
          {/* 公告類型選擇 */}
          <div>
            <label className="block text-sm font-medium mb-2">公告類型</label>
            <Select value={type} onValueChange={(value: any) => setType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="edm">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4" />
                    EDM
                  </div>
                </SelectItem>
                <SelectItem value="exam_info">
                  <div className="flex items-center gap-2">
                    <Newspaper className="w-4 h-4" />
                    考情
                  </div>
                </SelectItem>
                <SelectItem value="reminder">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    提醒
                  </div>
                </SelectItem>
                <SelectItem value="recommendation">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    推薦
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 目標受眾選擇 */}
          <div>
            <label className="block text-sm font-medium mb-2">目標受眾</label>
            <Select value={targetAudience} onValueChange={(value: any) => setTargetAudience(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部學員</SelectItem>
                <SelectItem value="specific">特定學員</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 公告標題 */}
          <div>
            <label className="block text-sm font-medium mb-2">公告標題</label>
            <Input
              placeholder="請輸入公告標題"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* 公告內容 */}
          <div>
            <label className="block text-sm font-medium mb-2">公告內容</label>
            <Textarea
              placeholder="請輸入公告內容"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
            />
          </div>

          {/* 發送按鈕 */}
          <Button
            onClick={handleCreateAnnouncement}
            disabled={createAnnouncementMutation.isPending}
            className="w-full"
          >
            {createAnnouncementMutation.isPending ? "發送中..." : "發送公告"}
          </Button>
        </div>
      </Card>

      {/* 已發送公告列表 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">已發送公告</h2>

        {announcements && announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(announcement.type)}`}>
                        {getTypeIcon(announcement.type)}
                        {getTypeName(announcement.type)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(announcement.createdAt).toLocaleString("zh-TW")}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold mb-2">{announcement.title}</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{announcement.content}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditAnnouncement(announcement)}
                      className="hover:bg-primary/10"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAnnouncement(announcement.id)}
                      disabled={deleteAnnouncementMutation.isPending}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">尚無公告</p>
          </Card>
        )}
      </div>

      {/* 編輯公告對話框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>編輯公告</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 公告類型選擇 */}
            <div>
              <label className="block text-sm font-medium mb-2">公告類型</label>
              <Select value={editType} onValueChange={(value: any) => setEditType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="edm">
                    <div className="flex items-center gap-2">
                      <Megaphone className="w-4 h-4" />
                      EDM
                    </div>
                  </SelectItem>
                  <SelectItem value="exam_info">
                    <div className="flex items-center gap-2">
                      <Newspaper className="w-4 h-4" />
                      考情
                    </div>
                  </SelectItem>
                  <SelectItem value="reminder">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      提醒
                    </div>
                  </SelectItem>
                  <SelectItem value="recommendation">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      推薦
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 目標受眾選擇 */}
            <div>
              <label className="block text-sm font-medium mb-2">目標受眾</label>
              <Select value={editTargetAudience} onValueChange={(value: any) => setEditTargetAudience(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部學員</SelectItem>
                  <SelectItem value="specific">特定學員</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 公告標題 */}
            <div>
              <label className="block text-sm font-medium mb-2">公告標題</label>
              <Input
                placeholder="請輸入公告標題"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>

            {/* 公告內容 */}
            <div>
              <label className="block text-sm font-medium mb-2">公告內容</label>
              <Textarea
                placeholder="請輸入公告內容"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={6}
              />
            </div>

            {/* 更新按鈕 */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                onClick={handleUpdateAnnouncement}
                disabled={updateAnnouncementMutation.isPending}
              >
                {updateAnnouncementMutation.isPending ? "更新中..." : "更新公告"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}
