import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Edit, Trash2, Home, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
// import Navbar from "@/components/Navbar"; // 移除，避免重複導航列

export default function AdminCategories() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // 對話框狀態
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // 表單狀態
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [subjectForm, setSubjectForm] = useState({ name: "", description: "", categoryId: 0 });

  // 查詢
  const categoriesQuery = trpc.exam.getCategories.useQuery();
  const subjectsQuery = trpc.exam.getSubjects.useQuery();

  // Mutations
  const createCategory = trpc.exam.createCategory.useMutation({
    onSuccess: () => {
      toast.success("類科創建成功");
      utils.exam.getCategories.invalidate();
      setCategoryDialogOpen(false);
      setCategoryForm({ name: "", description: "" });
    },
    onError: (error) => {
      toast.error(`創建失敗：${error.message}`);
    },
  });

  const updateCategory = trpc.exam.updateCategory.useMutation({
    onSuccess: () => {
      toast.success("類科更新成功");
      utils.exam.getCategories.invalidate();
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      setCategoryForm({ name: "", description: "" });
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  const deleteCategory = trpc.exam.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success("類科刪除成功");
      utils.exam.getCategories.invalidate();
      utils.exam.getSubjects.invalidate();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  const createSubject = trpc.exam.createSubject.useMutation({
    onSuccess: () => {
      toast.success("科目創建成功");
      utils.exam.getSubjects.invalidate();
      setSubjectDialogOpen(false);
      setSubjectForm({ name: "", description: "", categoryId: 0 });
    },
    onError: (error) => {
      toast.error(`創建失敗：${error.message}`);
    },
  });

  const updateSubject = trpc.exam.updateSubject.useMutation({
    onSuccess: () => {
      toast.success("科目更新成功");
      utils.exam.getSubjects.invalidate();
      setSubjectDialogOpen(false);
      setEditingSubject(null);
      setSubjectForm({ name: "", description: "", categoryId: 0 });
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  const deleteSubject = trpc.exam.deleteSubject.useMutation({
    onSuccess: () => {
      toast.success("科目刪除成功");
      utils.exam.getSubjects.invalidate();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  // 處理函數
  const handleCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: "", description: "" });
    setCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setCategoryForm({ name: category.name, description: category.description || "" });
    setCategoryDialogOpen(true);
  };

  const handleDeleteCategory = (id: number) => {
    if (confirm("確定要刪除此類科嗎？這將同時刪除該類科下的所有科目和題目。")) {
      deleteCategory.mutate({ id });
    }
  };

  const handleSaveCategory = () => {
    if (!categoryForm.name.trim()) {
      toast.error("請輸入類科名稱");
      return;
    }

    if (editingCategory) {
      updateCategory.mutate({
        id: editingCategory.id,
        ...categoryForm,
      });
    } else {
      createCategory.mutate(categoryForm);
    }
  };

  const handleCreateSubject = (categoryId: number) => {
    setEditingSubject(null);
    setSubjectForm({ name: "", description: "", categoryId });
    setSubjectDialogOpen(true);
  };

  const handleEditSubject = (subject: any) => {
    setEditingSubject(subject);
    setSubjectForm({
      name: subject.name,
      description: subject.description || "",
      categoryId: subject.categoryId,
    });
    setSubjectDialogOpen(true);
  };

  const handleDeleteSubject = (id: number) => {
    if (confirm("確定要刪除此科目嗎？這將同時刪除該科目下的所有題目。")) {
      deleteSubject.mutate({ id });
    }
  };

  const handleSaveSubject = () => {
    if (!subjectForm.name.trim()) {
      toast.error("請輸入科目名稱");
      return;
    }

    if (editingSubject) {
      updateSubject.mutate({
        id: editingSubject.id,
        ...subjectForm,
      });
    } else {
      createSubject.mutate(subjectForm);
    }
  };

  // 檢查權限
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-2">權限不足</h2>
            <p className="text-muted-foreground mb-4">您沒有權限訪問此頁面</p>
            <Button onClick={() => setLocation("/")}>返回首頁</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getSubjectsByCategory = (categoryId: number) => {
    return subjectsQuery.data?.filter((s) => s.categoryId === categoryId) || [];
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 管理後台導航列 */}
      

      <div className="container mx-auto px-4 py-8">
        {categoriesQuery.isLoading || subjectsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-6">
            {categoriesQuery.data?.map((category) => (
              <Card key={category.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{category.name}</CardTitle>
                      {category.description && (
                        <CardDescription>{category.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateSubject(category.id)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        新增科目
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCategory(category)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getSubjectsByCategory(category.id).map((subject) => (
                      <div
                        key={subject.id}
                        className="border rounded-lg p-4 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium">{subject.name}</div>
                          {subject.description && (
                            <div className="text-sm text-muted-foreground">
                              {subject.description}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSubject(subject)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSubject(subject.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {getSubjectsByCategory(category.id).length === 0 && (
                      <div className="col-span-full text-center text-muted-foreground py-8">
                        尚無科目，點擊「新增科目」開始添加
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {categoriesQuery.data?.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">尚無類科</p>
                  <Button onClick={handleCreateCategory}>
                    <Plus className="w-4 h-4 mr-2" />
                    新增第一個類科
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* 類科對話框 */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "編輯類科" : "新增類科"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "修改類科資訊" : "創建新的考試類科"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category-name">類科名稱</Label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="例如：高考三級"
              />
            </div>
            <div>
              <Label htmlFor="category-description">描述（選填）</Label>
              <Textarea
                id="category-description"
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, description: e.target.value })
                }
                placeholder="類科說明"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSaveCategory}
              disabled={createCategory.isPending || updateCategory.isPending}
            >
              {createCategory.isPending || updateCategory.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 科目對話框 */}
      <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubject ? "編輯科目" : "新增科目"}</DialogTitle>
            <DialogDescription>
              {editingSubject ? "修改科目資訊" : "創建新的考試科目"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject-name">科目名稱</Label>
              <Input
                id="subject-name"
                value={subjectForm.name}
                onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                placeholder="例如：民法"
              />
            </div>
            <div>
              <Label htmlFor="subject-description">描述（選填）</Label>
              <Textarea
                id="subject-description"
                value={subjectForm.description}
                onChange={(e) =>
                  setSubjectForm({ ...subjectForm, description: e.target.value })
                }
                placeholder="科目說明"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubjectDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSaveSubject}
              disabled={createSubject.isPending || updateSubject.isPending}
            >
              {createSubject.isPending || updateSubject.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
