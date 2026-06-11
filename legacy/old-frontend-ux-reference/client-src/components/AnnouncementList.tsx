import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone, Newspaper, Bell, Sparkles, Eye } from "lucide-react";

/**
 * 學員端公告欄組件
 * 顯示公告列表、未讀標記、查看詳情
 */
export function AnnouncementList() {
  const [selectedType, setSelectedType] = useState<"all" | "edm" | "exam_info" | "reminder" | "recommendation">("all");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 獲取公告列表
  const { data: announcements, refetch } = trpc.announcement.getAnnouncements.useQuery({
    type: selectedType === "all" ? undefined : selectedType,
    limit: 50,
    offset: 0,
  });

  // 獲取未讀數量
  const { data: unreadData } = trpc.announcement.getUnreadCount.useQuery();

  // 標記為已讀
  const markAsReadMutation = trpc.announcement.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleViewAnnouncement = (announcement: any) => {
    setSelectedAnnouncement(announcement);
    setIsDetailOpen(true);

    // 如果未讀，標記為已讀
    if (!announcement.isRead) {
      markAsReadMutation.mutate({ announcementId: announcement.id });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
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

  const getTypeName = (type: string) => {
    switch (type) {
      case "edm":
        return "EDM";
      case "exam_info":
        return "考情";
      case "reminder":
        return "提醒";
      case "recommendation":
        return "推薦";
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
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

  const filteredAnnouncements = selectedType === "all"
    ? announcements
    : announcements?.filter((a) => a.type === selectedType);

  return (
    <div className="space-y-6">
      {/* 標題和未讀數量 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">公告欄</h2>
        {unreadData && unreadData.unreadCount > 0 && (
          <Badge variant="destructive" className="text-sm">
            {unreadData.unreadCount} 則未讀
          </Badge>
        )}
      </div>

      {/* 分類標籤 */}
      <Tabs value={selectedType} onValueChange={(value: any) => setSelectedType(value)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="edm">
            <Megaphone className="w-4 h-4 mr-1" />
            EDM
          </TabsTrigger>
          <TabsTrigger value="exam_info">
            <Newspaper className="w-4 h-4 mr-1" />
            考情
          </TabsTrigger>
          <TabsTrigger value="reminder">
            <Bell className="w-4 h-4 mr-1" />
            提醒
          </TabsTrigger>
          <TabsTrigger value="recommendation">
            <Sparkles className="w-4 h-4 mr-1" />
            推薦
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedType} className="mt-6">
          {/* 公告列表 */}
          {filteredAnnouncements && filteredAnnouncements.length > 0 ? (
            <div className="space-y-4">
              {filteredAnnouncements.map((announcement) => (
                <Card
                  key={announcement.id}
                  className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                    !announcement.isRead ? "border-l-4 border-l-primary" : ""
                  }`}
                  onClick={() => handleViewAnnouncement(announcement)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(announcement.type)}`}>
                          {getTypeIcon(announcement.type)}
                          {getTypeName(announcement.type)}
                        </span>
                        {!announcement.isRead && (
                          <Badge variant="destructive" className="text-xs">
                            未讀
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(announcement.createdAt).toLocaleString("zh-TW")}
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold mb-2">{announcement.title}</h3>
                      <p className="text-muted-foreground line-clamp-2">{announcement.content}</p>
                    </div>

                    <Button variant="ghost" size="icon">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">目前沒有公告</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 公告詳情對話框 */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedAnnouncement && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(selectedAnnouncement.type)}`}>
                    {getTypeIcon(selectedAnnouncement.type)}
                    {getTypeName(selectedAnnouncement.type)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(selectedAnnouncement.createdAt).toLocaleString("zh-TW")}
                  </span>
                </div>
                <DialogTitle className="text-2xl">{selectedAnnouncement.title}</DialogTitle>
              </DialogHeader>

              <div className="mt-4">
                <p className="text-muted-foreground whitespace-pre-wrap">{selectedAnnouncement.content}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
