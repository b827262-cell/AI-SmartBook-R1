import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Edit2, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";
import { toast } from "sonner";
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

/**
 * Banner 管理頁面（管理員專用）
 * 功能：新增、編輯、刪除、啟用/停用 Banner
 */
export default function BannerManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState<number | null>(null);
  const [selectedBannerIds, setSelectedBannerIds] = useState<Set<number>>(new Set());
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  // 表單狀態
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [targetAudience, setTargetAudience] = useState<"all" | "student" | "admin">("all");

  // 查詢
  const utils = trpc.useUtils();
  const { data: banners, isLoading } = trpc.banner.getAllBanners.useQuery();

  // 突變
  const createMutation = trpc.banner.createBanner.useMutation({
    onSuccess: () => {
      toast.success("Banner 創建成功");
      utils.banner.getAllBanners.invalidate();
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error("創建失敗：" + error.message);
    },
  });

  const updateMutation = trpc.banner.updateBanner.useMutation({
    onSuccess: () => {
      toast.success("Banner 更新成功");
      utils.banner.getAllBanners.invalidate();
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error("更新失敗：" + error.message);
    },
  });

  const deleteMutation = trpc.banner.deleteBanner.useMutation({
    onSuccess: () => {
      toast.success("Banner 刪除成功");
      utils.banner.getAllBanners.invalidate();
      setDeleteDialogOpen(false);
      setBannerToDelete(null);
    },
    onError: (error) => {
      toast.error("刪除失敗：" + error.message);
    },
  });

  const toggleStatusMutation = trpc.banner.toggleBannerStatus.useMutation({
    onSuccess: () => {
      toast.success("Banner 狀態已更新");
      utils.banner.getAllBanners.invalidate();
    },
    onError: (error) => {
      toast.error("狀態更新失敗：" + error.message);
    },
  });

  const batchDeleteMutation = trpc.banner.batchDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`成功刪除 ${data.count} 個 Banner`);
      setSelectedBannerIds(new Set());
      setBatchDeleteDialogOpen(false);
      utils.banner.getAllBanners.invalidate();
    },
    onError: (error) => {
      toast.error("批次刪除失敗：" + error.message);
    },
  });

  // 打開新增對話框
  const handleOpenCreateDialog = () => {
    setEditingBanner(null);
    setTitle("");
    setDescription("");
    setLinkUrl("");
    setDisplayOrder(0);
    setTargetAudience("all");
    setDialogOpen(true);
  };

  // 打開編輯對話框
  const handleOpenEditDialog = (banner: any) => {
    setEditingBanner(banner);
    setTitle(banner.title);
    setDescription(banner.description || "");
    setLinkUrl(banner.linkUrl || "");
    setDisplayOrder(banner.displayOrder);
    setTargetAudience(banner.targetAudience);
    setDialogOpen(true);
  };

  // 關閉對話框
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingBanner(null);
    setTitle("");
    setDescription("");
    setLinkUrl("");
    setDisplayOrder(0);
    setTargetAudience("all");
  };

  // 提交表單
  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("請輸入標題");
      return;
    }

    if (editingBanner) {
      // 更新
      updateMutation.mutate({
        id: editingBanner.id,
        title,
        description: description || undefined,
        linkUrl: linkUrl || undefined,
        displayOrder,
        targetAudience,
      });
    } else {
      // 創建（文字 Banner 不需要圖片，使用佔位符）
      createMutation.mutate({
        title,
        description: description || undefined,
        imageUrl: "placeholder", // 文字 Banner 不需要實際圖片
        imageKey: "placeholder",
        linkUrl: linkUrl || undefined,
        displayOrder,
        targetAudience,
      });
    }
  };

  // 刪除 Banner
  const handleDelete = (id: number) => {
    setBannerToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (bannerToDelete) {
      deleteMutation.mutate({ id: bannerToDelete });
    }
  };

  // 切換啟用狀態
  const handleToggleStatus = (id: number) => {
    toggleStatusMutation.mutate({ id });
  };

  // 批次選擇相關函數
  const handleToggleSelect = (id: number) => {
    const newSelected = new Set(selectedBannerIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedBannerIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedBannerIds.size === banners?.length) {
      setSelectedBannerIds(new Set());
    } else {
      setSelectedBannerIds(new Set(banners?.map(b => b.id) || []));
    }
  };

  const handleBatchDelete = () => {
    if (selectedBannerIds.size === 0) {
      toast.error("請至少選擇一個 Banner");
      return;
    }
    setBatchDeleteDialogOpen(true);
  };

  const confirmBatchDelete = () => {
    batchDeleteMutation.mutate({ ids: Array.from(selectedBannerIds) });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      
      <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Banner 管理</h1>
          <p className="text-muted-foreground mt-1">管理網站頂部的文字輪播廣告</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedBannerIds.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                已選擇 {selectedBannerIds.size} 個
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchDelete}
                disabled={batchDeleteMutation.isPending}
              >
                {batchDeleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                批次刪除
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
          >
            {selectedBannerIds.size === banners?.length ? "取消全選" : "全選"}
          </Button>
          <Button onClick={handleOpenCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            新增 Banner
          </Button>
        </div>
      </div>

      {/* Banner 列表 */}
      <div className="grid gap-4">
        {banners && banners.length > 0 ? (
          banners.map((banner) => (
            <Card key={banner.id} className="p-4">
              <div className="flex items-start gap-4">
                {/* 勾選框 */}
                <input
                  type="checkbox"
                  checked={selectedBannerIds.has(banner.id)}
                  onChange={() => handleToggleSelect(banner.id)}
                  className="mt-1 w-4 h-4 cursor-pointer"
                />
                {/* 內容 */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{banner.title}</h3>
                    {banner.isActive === 1 ? (
                      <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded">
                        啟用中
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-500/10 text-gray-600 px-2 py-0.5 rounded">
                        已停用
                      </span>
                    )}
                    <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded">
                      {targetAudienceLabels[banner.targetAudience]}
                    </span>
                  </div>
                  {banner.description && (
                    <p className="text-sm text-muted-foreground mb-2">{banner.description}</p>
                  )}
                  {banner.linkUrl && (
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <ExternalLink className="w-3 h-3" />
                      <a
                        href={banner.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {banner.linkUrl}
                      </a>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    排序：{banner.displayOrder} | 創建時間：
                    {new Date(banner.createdAt).toLocaleString("zh-TW")}
                  </p>
                </div>

                {/* 操作按鈕 */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleToggleStatus(banner.id)}
                    title={banner.isActive === 1 ? "停用" : "啟用"}
                  >
                    {banner.isActive === 1 ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleOpenEditDialog(banner)}
                    title="編輯"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(banner.id)}
                    title="刪除"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">尚無 Banner，點擊「新增 Banner」開始創建</p>
          </Card>
        )}
      </div>

      {/* 新增/編輯對話框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingBanner ? "編輯 Banner" : "新增 Banner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">標題 *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="輸入 Banner 標題"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">描述（可選）</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="輸入 Banner 描述"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">連結網址（可選）</label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">排序</label>
                <Input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">目標受眾</label>
                <Select value={targetAudience} onValueChange={(v: any) => setTargetAudience(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有用戶</SelectItem>
                    <SelectItem value="student">學生</SelectItem>
                    <SelectItem value="admin">管理員</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  處理中...
                </>
              ) : (
                "確定"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除確認對話框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除此 Banner 嗎？</AlertDialogTitle>
            <AlertDialogDescription>此操作無法復原。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  刪除中...
                </>
              ) : (
                "刪除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批次刪除確認對話框 */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除選中的 {selectedBannerIds.size} 個 Banner 嗎？</AlertDialogTitle>
            <AlertDialogDescription>此操作無法復原。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBatchDelete}
              disabled={batchDeleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {batchDeleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  刪除中...
                </>
              ) : (
                "批次刪除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </>
  );
}

const targetAudienceLabels: Record<string, string> = {
  all: "所有用戶",
  student: "學生",
  admin: "管理員",
};
