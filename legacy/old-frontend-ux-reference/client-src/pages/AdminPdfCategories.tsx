import { useAuth } from "@/_core/hooks/useAuth";
// import Navbar from "@/components/Navbar"; // 移除，避免重複導航列
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Home, Loader2, Plus, Edit, Trash2, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface CategoryFormData {
  name: string;
  displayName: string;
  description: string;
  color: string;
  displayOrder: number;
  isActive: "true" | "false";
  isPublic: "true" | "false";
}

export default function AdminPdfCategories() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    displayName: "",
    description: "",
    color: "#6b7280",
    displayOrder: 999,
    isActive: "true",
    isPublic: "false",
  });

  // 查詢所有類科
  const categoriesQuery = trpc.knowledgeBase.getAllCategories.useQuery();

  // 創建類科
  const createCategoryMutation = trpc.knowledgeBase.createCategory.useMutation({
    onSuccess: () => {
      toast.success("類科已成功創建");
      setIsCreateDialogOpen(false);
      resetForm();
      utils.knowledgeBase.getAllCategories.invalidate();
    },
    onError: (error) => {
      toast.error(`創建失敗：${error.message}`);
    },
  });

  // 更新類科
  const updateCategoryMutation = trpc.knowledgeBase.updateCategory.useMutation({
    onSuccess: () => {
      toast.success("類科已成功更新");
      setIsEditDialogOpen(false);
      setSelectedCategory(null);
      resetForm();
      utils.knowledgeBase.getAllCategories.invalidate();
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  // 刪除類科
  const deleteCategoryMutation = trpc.knowledgeBase.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success("類科已成功刪除");
      setIsDeleteDialogOpen(false);
      setSelectedCategory(null);
      utils.knowledgeBase.getAllCategories.invalidate();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      displayName: "",
      description: "",
      color: "#6b7280",
      displayOrder: 999,
      isActive: "true",
      isPublic: "false",
    });
  };

  const handleCreate = () => {
    const dataToCreate = {
      ...formData,
      // 若顯示名稱為空，自動使用英文名稱
      displayName: formData.displayName.trim() || formData.name,
    };
    createCategoryMutation.mutate(dataToCreate);
  };

  const handleEdit = (category: any) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      displayName: category.displayName,
      description: category.description || "",
      color: category.color || "#6b7280",
      displayOrder: category.displayOrder,
      isActive: category.isActive,
      isPublic: category.isPublic || "false",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedCategory) return;
    updateCategoryMutation.mutate({
      id: selectedCategory.id,
      ...formData,
      // 若顯示名稱為空，自動使用英文名稱
      displayName: formData.displayName.trim() || formData.name,
    });
  };

  const handleDelete = (category: any) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedCategory) return;
    deleteCategoryMutation.mutate({ id: selectedCategory.id });
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardHeader>
            <CardTitle>權限不足</CardTitle>
            <CardDescription>您沒有權限訪問此頁面</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")}>
              <Home className="w-4 h-4 mr-2" />
              返回首頁
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 導航欄 */}
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation("/admin/knowledge-base")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回知識庫管理
            </Button>
            <h1 className="text-2xl font-bold text-gray-800">PDF 類科管理</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              新增類科
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>類科列表</CardTitle>
            <CardDescription>管理 PDF 知識庫的類科分類</CardDescription>
          </CardHeader>
          <CardContent>
            {categoriesQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : categoriesQuery.data && categoriesQuery.data.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>排序</TableHead>
                    <TableHead>名稱</TableHead>
                    <TableHead>顯示名稱</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>顏色</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead>學員可見</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoriesQuery.data.map((category: any) => (
                    <TableRow key={category.id}>
                      <TableCell>{category.displayOrder}</TableCell>
                      <TableCell className="font-mono text-sm">{category.name}</TableCell>
                      <TableCell>{category.displayName}</TableCell>
                      <TableCell className="max-w-xs truncate">{category.description}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm text-gray-500">{category.color}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            category.isActive === "true"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {category.isActive === "true" ? "啟用" : "停用"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={category.isPublic === "true"}
                            onCheckedChange={(checked) => {
                              updateCategoryMutation.mutate({
                                id: category.id,
                                name: category.name,
                                displayName: category.displayName || category.name,
                                description: category.description || "",
                                color: category.color || "#6b7280",
                                displayOrder: category.displayOrder,
                                isActive: category.isActive,
                                isPublic: checked ? "true" : "false",
                              });
                            }}
                          />
                          <span className={`text-xs ${category.isPublic === "true" ? "text-blue-600 font-medium" : "text-gray-400"}`}>
                            {category.isPublic === "true" ? "公開" : "隱藏"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(category)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(category)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>尚無類科資料</p>
                <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  新增第一個類科
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 創建類科對話框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增類科</DialogTitle>
            <DialogDescription>創建一個新的 PDF 類科分類</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">名稱（英文）</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：law"
              />
            </div>
            <div>
              <Label htmlFor="displayName">顯示名稱（中文）</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="例如：法律"
              />
            </div>
            <div>
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="例如：法律相關教材"
              />
            </div>
            <div>
              <Label htmlFor="color">顏色</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#6b7280"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="displayOrder">排序順序</Label>
              <Input
                id="displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive === "true"}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked ? "true" : "false" })
                }
              />
              <Label htmlFor="isActive">啟用</Label>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Switch
                  id="isPublic"
                  checked={formData.isPublic === "true"}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isPublic: checked ? "true" : "false" })
                  }
                />
                <Label htmlFor="isPublic">公開（學員可見）</Label>
              </div>
              <p className="text-xs text-muted-foreground ml-10">啟用後學員才能在智能課堂看到此科目，預設為隱藏</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={createCategoryMutation.isPending}>
              {createCategoryMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              創建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編輯類科對話框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯類科</DialogTitle>
            <DialogDescription>修改類科資訊</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">名稱（英文）</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：law"
              />
            </div>
            <div>
              <Label htmlFor="edit-displayName">顯示名稱（中文）</Label>
              <Input
                id="edit-displayName"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="例如：法律"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">描述</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="例如：法律相關教材"
              />
            </div>
            <div>
              <Label htmlFor="edit-color">顏色</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="edit-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#6b7280"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-displayOrder">排序順序</Label>
              <Input
                id="edit-displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive === "true"}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked ? "true" : "false" })
                }
              />
              <Label htmlFor="edit-isActive">啟用</Label>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Switch
                  id="edit-isPublic"
                  checked={formData.isPublic === "true"}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isPublic: checked ? "true" : "false" })
                  }
                />
                <Label htmlFor="edit-isPublic">公開（學員可見）</Label>
              </div>
              <p className="text-xs text-muted-foreground ml-10">啟用後學員才能在智能課堂看到此科目</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdate} disabled={updateCategoryMutation.isPending}>
              {updateCategoryMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              更新
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
              確定要刪除類科「{selectedCategory?.displayName}」嗎？此操作無法復原。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteCategoryMutation.isPending}
            >
              {deleteCategoryMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
