import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Edit2, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

/**
 * 外部搜尋按鈕管理頁面（管理員專用）
 */
export default function ExternalSearchAdmin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingButton, setEditingButton] = useState<{
    id?: number;
    name: string;
    icon: string;
    urlTemplate: string;
    order: number;
    isActive: "true" | "false";
  } | null>(null);
  const [buttonToDelete, setButtonToDelete] = useState<number | null>(null);

  // 查詢所有按鈕
  const { data: buttons, isLoading, refetch } = trpc.externalSearch.getAllButtons.useQuery();

  // 創建按鈕
  const createButtonMutation = trpc.externalSearch.createButton.useMutation({
    onSuccess: () => {
      toast.success("按鈕創建成功");
      refetch();
      setEditDialogOpen(false);
      setEditingButton(null);
    },
    onError: (error) => {
      toast.error(`創建失敗：${error.message}`);
    },
  });

  // 更新按鈕
  const updateButtonMutation = trpc.externalSearch.updateButton.useMutation({
    onSuccess: () => {
      toast.success("按鈕更新成功");
      refetch();
      setEditDialogOpen(false);
      setEditingButton(null);
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  // 刪除按鈕
  const deleteButtonMutation = trpc.externalSearch.deleteButton.useMutation({
    onSuccess: () => {
      toast.success("按鈕刪除成功");
      refetch();
      setDeleteDialogOpen(false);
      setButtonToDelete(null);
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  // 處理新增按鈕
  const handleAddButton = () => {
    setEditingButton({
      name: "",
      icon: "📚",
      urlTemplate: "",
      order: (buttons?.length || 0) + 1,
      isActive: "true",
    });
    setEditDialogOpen(true);
  };

  // 處理編輯按鈕
  const handleEditButton = (button: typeof buttons[0]) => {
    setEditingButton({
      id: button.id,
      name: button.name,
      icon: button.icon,
      urlTemplate: button.urlTemplate,
      order: button.order,
      isActive: button.isActive,
    });
    setEditDialogOpen(true);
  };

  // 處理保存按鈕
  const handleSaveButton = () => {
    if (!editingButton) return;

    if (!editingButton.name.trim() || !editingButton.urlTemplate.trim()) {
      toast.error("請填寫完整資訊");
      return;
    }

    if (!editingButton.urlTemplate.includes("{query}")) {
      toast.error("URL 模板必須包含 {query} 佔位符");
      return;
    }

    if (editingButton.id) {
      // 更新
      updateButtonMutation.mutate({
        id: editingButton.id,
        name: editingButton.name,
        icon: editingButton.icon,
        urlTemplate: editingButton.urlTemplate,
        order: editingButton.order,
        isActive: editingButton.isActive,
      });
    } else {
      // 創建
      createButtonMutation.mutate({
        name: editingButton.name,
        icon: editingButton.icon,
        urlTemplate: editingButton.urlTemplate,
        order: editingButton.order,
        isActive: editingButton.isActive,
      });
    }
  };

  // 處理刪除按鈕
  const handleDeleteButton = (id: number) => {
    setButtonToDelete(id);
    setDeleteDialogOpen(true);
  };

  // 確認刪除
  const confirmDelete = () => {
    if (buttonToDelete) {
      deleteButtonMutation.mutate({ id: buttonToDelete });
    }
  };

  // 權限檢查
  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-muted-foreground">請先登入</p>
          <Button onClick={() => setLocation("/")}>返回首頁</Button>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-muted-foreground">您沒有權限訪問此頁面</p>
          <Button onClick={() => setLocation("/")}>返回首頁</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">外部搜尋按鈕管理</h1>
          <p className="text-muted-foreground mt-2">管理對話頁面的外部資源搜尋按鈕</p>
        </div>
        <Button onClick={handleAddButton}>
          <Plus className="w-4 h-4 mr-2" />
          新增按鈕
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : buttons && buttons.length > 0 ? (
        <div className="grid gap-4">
          {buttons.map((button) => (
            <div
              key={button.id}
              className="border rounded-lg p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <GripVertical className="w-5 h-5 text-muted-foreground cursor-move" />
                <div className="text-2xl">{button.icon}</div>
                <div>
                  <div className="font-medium">{button.name}</div>
                  <div className="text-sm text-muted-foreground truncate max-w-md">
                    {button.urlTemplate}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    排序: {button.order} | 狀態: {button.isActive === "true" ? "啟用" : "停用"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleEditButton(button)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDeleteButton(button.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">尚未創建任何按鈕</p>
          <Button onClick={handleAddButton}>
            <Plus className="w-4 h-4 mr-2" />
            新增第一個按鈕
          </Button>
        </div>
      )}

      {/* 編輯/新增對話框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingButton?.id ? "編輯按鈕" : "新增按鈕"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">按鈕名稱</label>
              <Input
                placeholder="例如：月旦知識庫"
                value={editingButton?.name || ""}
                onChange={(e) =>
                  setEditingButton(editingButton ? { ...editingButton, name: e.target.value } : null)
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">圖標（emoji）</label>
              <Input
                placeholder="例如：📚"
                value={editingButton?.icon || ""}
                onChange={(e) =>
                  setEditingButton(editingButton ? { ...editingButton, icon: e.target.value } : null)
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">URL 模板</label>
              <Input
                placeholder="例如：https://example.com/search?q={query}"
                value={editingButton?.urlTemplate || ""}
                onChange={(e) =>
                  setEditingButton(editingButton ? { ...editingButton, urlTemplate: e.target.value } : null)
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                使用 {"{query}"} 作為搜尋關鍵字的佔位符
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">排序</label>
              <Input
                type="number"
                placeholder="數字越小越靠前"
                value={editingButton?.order || 0}
                onChange={(e) =>
                  setEditingButton(
                    editingButton ? { ...editingButton, order: parseInt(e.target.value) || 0 } : null
                  )
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">狀態</label>
              <select
                className="w-full border rounded-md p-2"
                value={editingButton?.isActive || "true"}
                onChange={(e) =>
                  setEditingButton(
                    editingButton ? { ...editingButton, isActive: e.target.value as "true" | "false" } : null
                  )
                }
              >
                <option value="true">啟用</option>
                <option value="false">停用</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSaveButton}
              disabled={createButtonMutation.isPending || updateButtonMutation.isPending}
            >
              {(createButtonMutation.isPending || updateButtonMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除確認對話框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除此按鈕嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteButtonMutation.isPending}>
              {deleteButtonMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
