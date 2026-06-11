import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, Plus, FolderOpen, Tag, Globe, Lock, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function VectorIndexManagement() {
  // 文檔管理狀態
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<number | undefined>(undefined);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  
  // 批次操作狀態
  const [selectedDocuments, setSelectedDocuments] = useState<Set<number>>(new Set());
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false);
  const [isBatchCategoryDialogOpen, setIsBatchCategoryDialogOpen] = useState(false);
  const [batchCategoryId, setBatchCategoryId] = useState<string>("");

  // 大綱編輯狀態
  const [isOutlineDialogOpen, setIsOutlineDialogOpen] = useState(false);
  const [outlineEditCategoryId, setOutlineEditCategoryId] = useState<number | null>(null);
  const [outlineEditCategoryName, setOutlineEditCategoryName] = useState("");
  const [editingOutline, setEditingOutline] = useState<any[]>([]);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());

  // 分類管理狀態
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDisplayName, setCategoryDisplayName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryColor, setCategoryColor] = useState("#3b82f6");
  const [categoryIsPublic, setCategoryIsPublic] = useState<'true' | 'false'>('false');
  const [categoryDailyPoints, setCategoryDailyPoints] = useState(50); // 每日學習點數上限

  // 查詢數據
  const { data: documentsData, isLoading: isLoadingDocuments, refetch: refetchDocuments } = 
    trpc.cloudKnowledgeBase.listDocuments.useQuery();
  const documents = documentsData?.documents || [];
  
  const { data: categoriesData, isLoading: isLoadingCategories, refetch: refetchCategories } = 
    trpc.cloudKnowledgeBase.listCategories.useQuery();
  const categories = categoriesData?.categories || [];

  // 取得大綱供編輯（僅在對話框開啟時查詢）
  const { data: outlineForEditData, isLoading: isLoadingOutline } = trpc.knowledgeLearning.getOutlineForEdit.useQuery(
    { categoryId: outlineEditCategoryId! },
    { enabled: isOutlineDialogOpen && outlineEditCategoryId !== null }
  );

  // 當大綱資料載入後，填入編輯狀態
  useEffect(() => {
    if (outlineForEditData) {
      setEditingOutline(outlineForEditData.outline || []);
    }
  }, [outlineForEditData]);

  // 更新大綱 mutation
  const updateOutlineMutation = trpc.knowledgeLearning.updateOutline.useMutation({
    onSuccess: () => {
      toast.success("大綱已更新");
      setIsOutlineDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  // 重新生成大綱 mutation（帶 Toast 通知）
  const regenerateOutlineMutation = trpc.knowledgeLearning.regenerateOutline.useMutation({
    onSuccess: () => {
      toast.success("大綱已重新生成！");
    },
    onError: (error) => {
      toast.error(`重新生成失敗：${error.message}`);
    },
  });

  const handleOpenOutlineEditor = (category: any) => {
    setOutlineEditCategoryId(category.id);
    setOutlineEditCategoryName(category.displayName || category.name);
    setEditingOutline([]);
    setExpandedChapters(new Set());
    setIsOutlineDialogOpen(true);
  };

  const handleOutlineChapterChange = (index: number, field: string, value: any) => {
    setEditingOutline(prev => prev.map((ch, i) => i === index ? { ...ch, [field]: value } : ch));
  };

  const handleOutlineKeyPointChange = (chIdx: number, kpIdx: number, value: string) => {
    setEditingOutline(prev => prev.map((ch, i) => {
      if (i !== chIdx) return ch;
      const newKPs = [...(ch.keyPoints || [])];
      newKPs[kpIdx] = value;
      return { ...ch, keyPoints: newKPs };
    }));
  };

  const handleSaveOutline = () => {
    if (!outlineEditCategoryId) return;
    updateOutlineMutation.mutate({ categoryId: outlineEditCategoryId, outline: editingOutline });
  };

  // Mutations
  const updateDocumentMutation = trpc.cloudKnowledgeBase.updateDocument.useMutation({
    onSuccess: () => {
      toast.success("文檔已更新");
      setIsEditDialogOpen(false);
      refetchDocuments();
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  const deleteDocumentMutation = trpc.cloudKnowledgeBase.deleteDocument.useMutation({
    onSuccess: () => {
      toast.success("文檔已刪除");
      refetchDocuments();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  const batchUpdateDocumentCategoryMutation = trpc.cloudKnowledgeBase.batchUpdateDocumentCategory.useMutation({
    onSuccess: (data) => {
      toast.success(`已更改 ${data.updatedCount} 個文檔的分類`);
      setSelectedDocuments(new Set());
      setIsBatchCategoryDialogOpen(false);
      setBatchCategoryId("");
      refetchDocuments();
    },
    onError: (error) => {
      toast.error(`批次更改分類失敗：${error.message}`);
    },
  });

  const batchDeleteDocumentsMutation = trpc.cloudKnowledgeBase.batchDeleteDocuments.useMutation({
    onSuccess: (data) => {
      toast.success(`已刪除 ${data.deletedCount} 個文檔`);
      setSelectedDocuments(new Set());
      setIsBatchDeleteDialogOpen(false);
      refetchDocuments();
    },
    onError: (error) => {
      toast.error(`批次刪除失敗：${error.message}`);
    },
  });

  const createCategoryMutation = trpc.cloudKnowledgeBase.createCategory.useMutation({
    onSuccess: () => {
      toast.success("分類已創建");
      setIsCategoryDialogOpen(false);
      refetchCategories();
    },
    onError: (error) => {
      toast.error(`創建失敗：${error.message}`);
    },
  });

  const updateCategoryMutation = trpc.cloudKnowledgeBase.updateCategory.useMutation({
    onSuccess: () => {
      toast.success("分類已更新");
      setIsCategoryDialogOpen(false);
      refetchCategories();
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  const deleteCategoryMutation = trpc.cloudKnowledgeBase.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success("分類已刪除");
      refetchCategories();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  // 文檔管理處理函數
  const handleEditDocument = (doc: any) => {
    setEditingDocument(doc);
    setEditTitle(doc.documentTitle || "");
    setEditCategoryId(doc.categoryId);
    setEditTags(doc.tags ? JSON.parse(doc.tags) : []);
    setIsEditDialogOpen(true);
  };

  const handleSaveDocument = () => {
    if (!editingDocument) return;
    updateDocumentMutation.mutate({
      id: editingDocument.id,
      documentTitle: editTitle,
      categoryId: editCategoryId,
    });
  };

  const handleDeleteDocument = (id: number) => {
    if (confirm("確定要刪除此文檔嗎？")) {
      deleteDocumentMutation.mutate({ id });
    }
  };

  // 批次刪除相關函數
  const handleToggleDocument = (id: number) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedDocuments(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedDocuments.size === documents.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(documents.map((doc: any) => doc.id)));
    }
  };

  const handleBatchDelete = () => {
    if (selectedDocuments.size === 0) {
      toast.error("請選擇要刪除的文檔");
      return;
    }
    setIsBatchDeleteDialogOpen(true);
  };

  const confirmBatchDelete = () => {
    batchDeleteDocumentsMutation.mutate({ ids: Array.from(selectedDocuments) });
  };

  const handleBatchChangeCategory = () => {
    if (selectedDocuments.size === 0) {
      toast.error("請選擇要更改分類的文檔");
      return;
    }
    setBatchCategoryId("");
    setIsBatchCategoryDialogOpen(true);
  };

  const confirmBatchChangeCategory = () => {
    // "0" 表示未分類，傳 null；其他傳實際 ID
    const categoryIdNum = (!batchCategoryId || batchCategoryId === "0") ? null : parseInt(batchCategoryId);
    batchUpdateDocumentCategoryMutation.mutate({
      ids: Array.from(selectedDocuments),
      categoryId: categoryIdNum,
    });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !editTags.includes(newTag.trim())) {
      setEditTags([...editTags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setEditTags(editTags.filter((t) => t !== tag));
  };

  // 分類管理處理函數
  const handleAddCategory = () => {
    setIsEditingCategory(false);
    setEditingCategoryId(null);
    setCategoryName("");
    setCategoryDisplayName("");
    setCategoryDescription("");
    setCategoryColor("#3b82f6");
    setCategoryIsPublic('false');
    setCategoryDailyPoints(50);
    setIsCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: any) => {
    setIsEditingCategory(true);
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
    setCategoryDisplayName(category.displayName);
    setCategoryDescription(category.description || "");
    setCategoryColor(category.color || "#3b82f6");
    setCategoryIsPublic((category.isPublic === 'true' || category.isPublic === true) ? 'true' : 'false');
    setCategoryDailyPoints(category.dailyPointsLimit || 50);
    setIsCategoryDialogOpen(true);
  };

  const handleSaveCategory = () => {
    if (!categoryName.trim() || !categoryDisplayName.trim()) {
      toast.error("請填寫分類名稱和顯示名稱");
      return;
    }

    if (isEditingCategory && editingCategoryId) {
      updateCategoryMutation.mutate({
        id: editingCategoryId,
        name: categoryName,
        displayName: categoryDisplayName,
        description: categoryDescription,
        color: categoryColor,
        isPublic: categoryIsPublic,
        dailyPointsLimit: categoryDailyPoints,
      });
    } else {
      createCategoryMutation.mutate({
        name: categoryName,
        displayName: categoryDisplayName,
        description: categoryDescription,
        color: categoryColor,
      });
    }
  };

  const handleDeleteCategory = (id: number) => {
    if (confirm("確定要刪除此分類嗎？")) {
      deleteCategoryMutation.mutate({ id });
    }
  };

  return (
    <Tabs defaultValue="documents" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="documents">
          <FolderOpen className="w-4 h-4 mr-2" />
          文檔管理
        </TabsTrigger>
        <TabsTrigger value="categories">
          <Tag className="w-4 h-4 mr-2" />
          分類管理
        </TabsTrigger>
      </TabsList>

      <TabsContent value="documents">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>文檔管理</CardTitle>
                <CardDescription>管理已上傳的知識庫文檔</CardDescription>
              </div>
              {documents && documents.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleAll}
                  >
                    {selectedDocuments.size === documents.length ? "取消全選" : "全選"}
                  </Button>
                  {selectedDocuments.size > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBatchChangeCategory}
                        className="border-blue-300 text-blue-600 hover:bg-blue-50"
                      >
                        <Tag className="w-4 h-4 mr-1" />
                        改分類 ({selectedDocuments.size})
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBatchDelete}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        刪除選中 ({selectedDocuments.size})
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingDocuments ? (
              <div className="text-center py-8 text-muted-foreground">載入中...</div>
            ) : documents && documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.uploadBatchId}
                    className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedDocuments.has(doc.id)}
                      onCheckedChange={() => handleToggleDocument(doc.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{doc.documentTitle || "未命名文檔"}</h3>
                        {doc.category && (
                          <Badge variant="secondary">{doc.category}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {doc.chunksCount} chunks · {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                      {doc.tags && JSON.parse(doc.tags).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {JSON.parse(doc.tags).map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditDocument(doc)}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        編輯
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        刪除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">尚無文檔</div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="categories">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>分類管理</CardTitle>
                <CardDescription>管理知識庫分類</CardDescription>
              </div>
              <Button onClick={handleAddCategory}>
                <Plus className="w-4 h-4 mr-2" />
                新增分類
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingCategories ? (
              <div className="text-center py-8 text-muted-foreground">載入中...</div>
            ) : categories && categories.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color || "#3b82f6" }}
                        />
                        <h3 className="font-medium">{category.displayName}</h3>
                        {/* isPublic 狀態標籤 */}
                        {category.isPublic === 'true' ? (
                          <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                            <Globe className="w-3 h-3" />
                            公開
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                            <Lock className="w-3 h-3" />
                            隱藏
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {/* 快速切換公開/隱藏 */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title={category.isPublic === 'true' ? '點擊隱藏' : '點擊公開'}
                          onClick={() => updateCategoryMutation.mutate({
                            id: category.id,
                            isPublic: category.isPublic === 'true' ? 'false' : 'true',
                          })}
                          className={category.isPublic === 'true' ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}
                        >
                          {category.isPublic === 'true' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="編輯大綱"
                          onClick={() => handleOpenOutlineEditor(category)}
                        >
                          <BookOpen className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    {category.description && (
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">尚無分類</div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* 編輯文檔對話框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>編輯文檔</DialogTitle>
            <DialogDescription>修改文檔名稱、設定分類和標籤</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">文檔名稱</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="輸入文檔名稱"
              />
            </div>
            <div>
              <Label htmlFor="edit-category">分類</Label>
              <Select 
                value={editCategoryId?.toString() || ""} 
                onValueChange={(value) => setEditCategoryId(value ? Number(value) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇分類" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>標籤</Label>
              <div className="flex items-center gap-2 mb-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="輸入標籤"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button onClick={handleAddTag} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {editTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                    {tag}
                    <span className="ml-1">×</span>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveDocument} disabled={updateDocumentMutation.isPending}>
              {updateDocumentMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批次刪除確認對話框 */}
      <Dialog open={isBatchDeleteDialogOpen} onOpenChange={setIsBatchDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認批次刪除</DialogTitle>
            <DialogDescription>
              您即將刪除 {selectedDocuments.size} 個文檔，此操作無法復原。確定要繼續嗎？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmBatchDelete}
              disabled={batchDeleteDocumentsMutation.isPending}
            >
              {batchDeleteDocumentsMutation.isPending ? "刪除中..." : "確定刪除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批次更改分類對話框 */}
      <Dialog open={isBatchCategoryDialogOpen} onOpenChange={setIsBatchCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批次更改分類</DialogTitle>
            <DialogDescription>
              將選中的 {selectedDocuments.size} 個文檔更改為指定分類
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="mb-2 block">選擇目標分類</Label>
            <Select value={batchCategoryId} onValueChange={setBatchCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="請選擇分類" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">未分類</SelectItem>
                {categories.map((cat: any) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.displayName || cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchCategoryDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={confirmBatchChangeCategory}
              disabled={batchUpdateDocumentCategoryMutation.isPending || batchCategoryId === ""}
            >
              {batchUpdateDocumentCategoryMutation.isPending ? "更改中..." : "確定更改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 分類管理對話框 */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditingCategory ? "編輯分類" : "新增分類"}</DialogTitle>
            <DialogDescription>設定分類的名稱、顯示名稱和顏色</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category-name">分類名稱（英文）</Label>
              <Input
                id="category-name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="例如：management"
              />
            </div>
            <div>
              <Label htmlFor="category-display-name">顯示名稱（中文）</Label>
              <Input
                id="category-display-name"
                value={categoryDisplayName}
                onChange={(e) => setCategoryDisplayName(e.target.value)}
                placeholder="例如：管理學"
              />
            </div>
            <div>
              <Label htmlFor="category-description">描述</Label>
              <Input
                id="category-description"
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                placeholder="選填"
              />
            </div>
            <div>
              <Label htmlFor="category-color">顏色</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="category-color"
                  type="color"
                  value={categoryColor}
                  onChange={(e) => setCategoryColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  value={categoryColor}
                  onChange={(e) => setCategoryColor(e.target.value)}
                  placeholder="#3b82f6"
                />
              </div>
            </div>
            {isEditingCategory && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="text-sm font-medium">對學生公開</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">開啟後，學生可在智能學堂看到此分類</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={categoryIsPublic === 'true'}
                  onClick={() => setCategoryIsPublic(categoryIsPublic === 'true' ? 'false' : 'true')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    categoryIsPublic === 'true' ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      categoryIsPublic === 'true' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}
            <div>
              <Label htmlFor="category-daily-points">每日學習點數上限</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  id="category-daily-points"
                  type="number"
                  min={1}
                  max={500}
                  value={categoryDailyPoints}
                  onChange={(e) => setCategoryDailyPoints(Number(e.target.value))}
                  className="w-24 border rounded px-2 py-1 text-sm"
                />
                <span className="text-sm text-muted-foreground">點（1點 = 500字元，預設 50 點）</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">建議：基礎科目 20-30 點，中等科目 40-60 點，複雜科目 60-100 點</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleSaveCategory} 
              disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
            >
              {(createCategoryMutation.isPending || updateCategoryMutation.isPending) ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* 大綱編輯對話框 */}
      <Dialog open={isOutlineDialogOpen} onOpenChange={setIsOutlineDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>編輯大綱 — {outlineEditCategoryName}</DialogTitle>
            <DialogDescription>手動修改 AI 生成的章節標題、知識點和測驗題數</DialogDescription>
          </DialogHeader>

          {isLoadingOutline ? (
            <div className="text-center py-8 text-muted-foreground">載入大綱中...</div>
          ) : editingOutline.length === 0 ? (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground py-4">尚未生成大綱，請先重新生成大綱後再編輯</p>
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (outlineEditCategoryId) {
                      regenerateOutlineMutation.mutate({ categoryId: outlineEditCategoryId });
                    }
                  }}
                  disabled={regenerateOutlineMutation.isPending}
                >
                  {regenerateOutlineMutation.isPending ? "生成中..." : "重新生成大綱"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {editingOutline.map((chapter, idx) => (
                <div key={idx} className="border rounded-lg overflow-hidden">
                  {/* 章節標題列 */}
                  <div
                    className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer"
                    onClick={() => setExpandedChapters(prev => {
                      const next = new Set(prev);
                      if (next.has(idx)) next.delete(idx); else next.add(idx);
                      return next;
                    })}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">第 {idx + 1} 章</span>
                      <Input
                        value={chapter.title ?? ''}
                        onChange={(e) => { e.stopPropagation(); handleOutlineChapterChange(idx, 'title', e.target.value); }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-7 text-sm font-medium w-64"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={chapter.difficulty ?? 'beginner'}
                        onChange={(e) => { e.stopPropagation(); handleOutlineChapterChange(idx, 'difficulty', e.target.value); }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs border rounded px-1 py-0.5"
                      >
                        <option value="beginner">基礎</option>
                        <option value="intermediate">進階</option>
                        <option value="advanced">高級</option>
                      </select>
                      <input
                        type="number"
                        min={1} max={200}
                        value={chapter.estimatedMinutes ?? 30}
                        onChange={(e) => { e.stopPropagation(); handleOutlineChapterChange(idx, 'estimatedMinutes', Number(e.target.value)); }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-14 text-xs border rounded px-1 py-0.5"
                        title="預估分鐘"
                      />
                      <span className="text-xs text-muted-foreground">分鐘</span>
                      <input
                        type="number"
                        min={1} max={20}
                        value={chapter.quizCount ?? 3}
                        onChange={(e) => { e.stopPropagation(); handleOutlineChapterChange(idx, 'quizCount', Number(e.target.value)); }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-12 text-xs border rounded px-1 py-0.5"
                        title="測驗題數"
                      />
                      <span className="text-xs text-muted-foreground">題</span>
                      {expandedChapters.has(idx) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* 展開內容 */}
                  {expandedChapters.has(idx) && (
                    <div className="p-3 space-y-3">
                      <div>
                        <Label className="text-xs">章節描述</Label>
                        <Textarea
                          value={chapter.description ?? ''}
                          onChange={(e) => handleOutlineChapterChange(idx, 'description', e.target.value)}
                          className="text-sm mt-1"
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">重要知識點（每行一點）</Label>
                        <div className="space-y-1 mt-1">
                          {(chapter.keyPoints || []).map((kp: string, kpIdx: number) => (
                            <div key={kpIdx} className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground w-4">{kpIdx + 1}.</span>
                              <Input
                                value={kp ?? ''}
                                onChange={(e) => handleOutlineKeyPointChange(idx, kpIdx, e.target.value)}
                                className="h-7 text-xs flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive"
                                onClick={() => {
                                  const newKPs = [...(chapter.keyPoints || [])];
                                  newKPs.splice(kpIdx, 1);
                                  handleOutlineChapterChange(idx, 'keyPoints', newKPs);
                                }}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => handleOutlineChapterChange(idx, 'keyPoints', [...(chapter.keyPoints || []), ''])}
                          >
                            + 新增知識點
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsOutlineDialogOpen(false)}>取消</Button>
            <Button
              onClick={handleSaveOutline}
              disabled={updateOutlineMutation.isPending || editingOutline.length === 0}
            >
              {updateOutlineMutation.isPending ? "儲存中..." : "儲存大綱"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Tabs>
  );
}
