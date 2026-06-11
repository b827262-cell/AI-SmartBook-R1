import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, RefreshCw, Loader2, Upload, Clock, TestTube, Pencil, Trash2, Plus, Tag, FolderOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export function CloudKnowledgeBaseConfig() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [activeTab, setActiveTab] = useState("api-config");
  
  // 文檔編輯對話框狀態
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  
  // 分類管理對話框狀態
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDisplayName, setCategoryDisplayName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryColor, setCategoryColor] = useState("#3b82f6");
  const [categoryDailyPoints, setCategoryDailyPoints] = useState(50); // 每日學習點數上限

  // 獲取當前配置
  const { data: configData, refetch } = trpc.cloudKnowledgeBase.getConfig.useQuery();
  const config = configData?.config;

  // 獲取上傳歷史
  const { data: historyData, isLoading: isLoadingHistory } = trpc.cloudKnowledgeBase.getUploadHistory.useQuery({
    limit: 10,
    offset: 0,
  });

  // 獲取文檔列表
  const { data: documentsData, isLoading: isLoadingDocuments, refetch: refetchDocuments } = 
    trpc.cloudKnowledgeBase.listDocuments.useQuery();
  const documents = documentsData?.documents || [];

  // 獲取分類列表
  const { data: categoriesData, isLoading: isLoadingCategories, refetch: refetchCategories } = 
    trpc.cloudKnowledgeBase.listCategories.useQuery();
  const categories = categoriesData?.categories || [];

  // 生成 API 金鑰 mutation
  const generateApiKeyMutation = trpc.cloudKnowledgeBase.generateApiKey.useMutation({
    onSuccess: (data) => {
      toast.success("API 金鑰已生成");
      refetch();
    },
    onError: (error) => {
      toast.error(`生成失敗：${error.message}`);
    },
  });

  const handleGenerateApiKey = async () => {
    if (config) {
      const confirmed = window.confirm("重新生成將使舊金鑰失效，確定要繼續嗎？");
      if (!confirmed) return;
    }

    setIsGenerating(true);
    try {
      await generateApiKeyMutation.mutateAsync();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label}已複製到剪貼簿`);
  };

  // 測試向量搜索 mutation
  const uploadChunksMutation = trpc.cloudKnowledgeBase.uploadChunks.useMutation({
    onSuccess: () => {
      toast.success("測試數據上傳成功！");
      toast.info("請前往 AI 對話頁面，提問：「什麼是民法的無效和撤銷？有什麼差別？」");
      refetch(); // 重新獲取配置和統計
    },
    onError: (error) => {
      toast.error(`上傳失敗：${error.message}`);
    },
  });

  const handleTestVectorSearch = async () => {
    if (!config) {
      toast.error("請先生成 API 金鑰");
      return;
    }

    setIsTesting(true);
    try {
      // 使用 tRPC mutation 上傳測試數據
      await uploadChunksMutation.mutateAsync({
        apiKey: config.apiKey,
        documentId: "test-doc-" + Date.now(),
        documentTitle: "民法總則測試講義",
        embeddingModel: "text-embedding-3-small",
        chunks: [
          {
            text: "民法的無效是指法律行為自始、確定、當然不發生效力。無效的法律行為，任何人都可以主張其無效，不受時間限制。常見的無效原因包括：違反強制規定、違反公序良俗、標的不能等。",
            index: 0,
            metadata: { page: 1, chapter: "第一章 法律行為" }
          },
          {
            text: "民法的撤銷是指法律行為因意思表示有瑕疵，得由當事人撤銷。撤銷權的行使有除斥期間的限制，通常為一年。常見的撤銷原因包括：錯誤、詐欺、脅迫等。撤銷後，法律行為溯及既往失效。",
            index: 1,
            metadata: { page: 2, chapter: "第一章 法律行為" }
          },
          {
            text: "民法第88條規定：「意思表示之內容有錯誤，或表意人若知其事情即不為意思表示者，表意人得將其意思表示撤銷之。但以其錯誤或不知事情，非由表意人自己之過失者為限。」",
            index: 2,
            metadata: { page: 3, chapter: "第一章 法律行為", article: "第88條" }
          }
        ]
      });
    } catch (error: any) {
      // 錯誤已由 mutation 的 onError 處理
    } finally {
      setIsTesting(false);
    }
  };

  // 更新文檔 mutation
  const updateDocumentMutation = trpc.cloudKnowledgeBase.updateDocument.useMutation({
    onSuccess: () => {
      toast.success("文檔更新成功");
      setIsEditDialogOpen(false);
      refetchDocuments();
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  // 刪除文檔 mutation
  const deleteDocumentMutation = trpc.cloudKnowledgeBase.deleteDocument.useMutation({
    onSuccess: () => {
      toast.success("文檔刪除成功");
      refetchDocuments();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  // 創建分類 mutation
  const createCategoryMutation = trpc.cloudKnowledgeBase.createCategory.useMutation({
    onSuccess: () => {
      toast.success("分類創建成功");
      setIsCategoryDialogOpen(false);
      refetchCategories();
      resetCategoryForm();
    },
    onError: (error) => {
      toast.error(`創建失敗：${error.message}`);
    },
  });

  // 更新分類 mutation
  const updateCategoryMutation = trpc.cloudKnowledgeBase.updateCategory.useMutation({
    onSuccess: (data) => {
      console.log('[updateCategoryMutation] onSuccess called, data:', data);
      toast.success("分類更新成功");
      setIsCategoryDialogOpen(false);
      refetchCategories();
      resetCategoryForm();
    },
    onError: (error) => {
      console.log('[updateCategoryMutation] onError called, error:', error);
      toast.error(`更新失敗：${error.message}`);
    },
  });

  // 刪除分類 mutation
  const deleteCategoryMutation = trpc.cloudKnowledgeBase.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success("分類刪除成功");
      refetchCategories();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  // 打開編輯文檔對話框
  const handleEditDocument = (doc: any) => {
    setSelectedDocument(doc);
    setEditTitle(doc.documentTitle || "");
    setEditCategory("");
    setEditTags([]);
    setIsEditDialogOpen(true);
  };

  // 保存文檔編輯
  const handleSaveDocument = () => {
    if (!selectedDocument) return;

    updateDocumentMutation.mutate({
      uploadBatchId: selectedDocument.uploadBatchId,
      documentTitle: editTitle,
      category: editCategory || undefined,
      tags: editTags.length > 0 ? editTags : undefined,
    });
  };

  // 刪除文檔
  const handleDeleteDocument = (uploadBatchId: string) => {
    if (confirm("確定要刪除這個文檔嗎？此操作無法撤銷。")) {
      deleteDocumentMutation.mutate({ uploadBatchId });
    }
  };

  // 添加標籤
  const handleAddTag = () => {
    if (newTag.trim() && !editTags.includes(newTag.trim())) {
      setEditTags([...editTags, newTag.trim()]);
      setNewTag("");
    }
  };

  // 移除標籤
  const handleRemoveTag = (tag: string) => {
    setEditTags(editTags.filter(t => t !== tag));
  };

  // 打開新增分類對話框
  const handleAddCategory = () => {
    setIsEditingCategory(false);
    setSelectedCategory(null);
    resetCategoryForm();
    setIsCategoryDialogOpen(true);
  };

  // 打開編輯分類對話框
  const handleEditCategory = (category: any) => {
    setIsEditingCategory(true);
    setSelectedCategory(category);
    setCategoryName(category.name);
    setCategoryDisplayName(category.displayName);
    setCategoryDescription(category.description || "");
    setCategoryColor(category.color || "#3b82f6");
    setCategoryDailyPoints(category.dailyPointsLimit || 50);
    setIsCategoryDialogOpen(true);
  };

  // 保存分類
  const handleSaveCategory = () => {
    if (!categoryName.trim() || !categoryDisplayName.trim()) {
      toast.error("請填寫分類名稱和顯示名稱");
      return;
    }

    if (isEditingCategory && selectedCategory) {
      updateCategoryMutation.mutate({
        id: selectedCategory.id,
        name: categoryName,
        displayName: categoryDisplayName,
        description: categoryDescription,
        color: categoryColor,
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

  // 刪除分類
  const handleDeleteCategory = (id: number) => {
    if (confirm("確定要刪除這個分類嗎？")) {
      deleteCategoryMutation.mutate({ id });
    }
  };

  // 重置分類表單
  const resetCategoryForm = () => {
    setCategoryName("");
    setCategoryDisplayName("");
    setCategoryDescription("");
    setCategoryColor("#3b82f6");
    setCategoryDailyPoints(50);
  };

  // 獲取 API 端點 URL（REST API 格式，供本地端 GUI 使用）
  const apiEndpoint = `${window.location.origin}/api/gui/knowledge/upload`;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="api-config">API 設定</TabsTrigger>
        <TabsTrigger value="documents">文檔管理</TabsTrigger>
        <TabsTrigger value="categories">分類管理</TabsTrigger>
      </TabsList>

      <TabsContent value="api-config" className="space-y-6">
      {/* API 金鑰設定 */}
      <Card>
        <CardHeader>
          <CardTitle>API 金鑰設定</CardTitle>
          <CardDescription>
            生成 API 金鑰，用於從本地端上傳知識庫數據到雲端
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config ? (
            <>
              {/* API 端點 */}
              <div className="space-y-2">
                <Label>API 端點</Label>
                <div className="flex gap-2">
                  <Input
                    value={apiEndpoint}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopyToClipboard(apiEndpoint, "API 端點")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* API 金鑰 */}
              <div className="space-y-2">
                <Label>API 金鑰</Label>
                <div className="flex gap-2">
                  <Input
                    value={config.apiKey}
                    readOnly
                    type="password"
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopyToClipboard(config.apiKey, "API 金鑰")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 統計資訊 */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">總上傳次數</p>
                  <p className="text-2xl font-bold">{config.totalUploads}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">總 Chunks 數量</p>
                  <p className="text-2xl font-bold">{config.totalChunks}</p>
                </div>
              </div>

              {/* 重新生成按鈕 */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={handleGenerateApiKey}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      重新生成金鑰
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleTestVectorSearch}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      測試中...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      測試向量搜索
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">尚未生成 API 金鑰</p>
              <Button
                onClick={handleGenerateApiKey}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    生成 API 金鑰
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 上傳歷史 */}
      <Card>
        <CardHeader>
          <CardTitle>上傳歷史</CardTitle>
          <CardDescription>
            查看最近的知識庫上傳記錄
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : historyData?.history && historyData.history.length > 0 ? (
            <div className="space-y-3">
              {historyData.history.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      record.status === 'success' ? 'bg-green-100' :
                      record.status === 'partial' ? 'bg-yellow-100' :
                      'bg-red-100'
                    }`}>
                      <Upload className={`h-4 w-4 ${
                        record.status === 'success' ? 'text-green-600' :
                        record.status === 'partial' ? 'text-yellow-600' :
                        'text-red-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">
                        {record.documentTitle || record.documentId || "未命名文檔"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {record.chunksCount} chunks
                        {record.totalSize && ` · ${(record.totalSize / 1024).toFixed(2)} KB`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(record.createdAt).toLocaleString('zh-TW')}
                    </p>
                    {record.status !== 'success' && record.errorMessage && (
                      <p className="text-xs text-red-600 mt-1">{record.errorMessage}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              尚無上傳記錄
            </div>
          )}
        </CardContent>
      </Card>

      {/* 使用說明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用說明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium mb-1">1. 本地端準備數據</p>
            <p className="text-muted-foreground">
              使用工具將文檔分塊（chunks）並生成向量嵌入（embeddings），輸出為 JSON 格式
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">2. 上傳到雲端</p>
            <p className="text-muted-foreground">
              使用上方的 API 端點和金鑰，透過 HTTP POST 請求上傳 JSON 檔案
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">3. AI 對話使用</p>
            <p className="text-muted-foreground">
              系統會自動使用向量搜索找到相關 chunks，作為 AI 回答的上下文（RAG）
            </p>
          </div>
          
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="font-medium mb-2">JSON 格式範例：</p>
            <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
{`{
  "apiKey": "your-api-key-here",
  "documentId": "doc-001",
  "documentTitle": "民法總則講義",
  "documentType": "lecture_notes",
  "embeddingModel": "text-embedding-3-small",
  "chunks": [
    {
      "text": "第一章 緒論...",
      "embedding": [0.1, 0.2, 0.3, ...],
      "index": 0,
      "metadata": {
        "page": 1,
        "chapter": "第一章"
      }
    }
  ]
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="documents">
        <Card>
          <CardHeader>
            <CardTitle>文檔管理</CardTitle>
            <CardDescription>管理已上傳的知識庫文檔</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingDocuments ? (
              <div className="text-center py-8 text-muted-foreground">載入中...</div>
            ) : documents && documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.uploadBatchId}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{doc.documentTitle || "未命名文檔"}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {doc.chunksCount} chunks · {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
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
                        onClick={() => handleDeleteDocument(doc.uploadBatchId)}
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
                      </div>
                      <div className="flex items-center gap-1">
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
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇分類" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
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

      {/* 分類管理對話框 */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
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
            <div>
              <Label htmlFor="category-daily-points">每日學習點數上限</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="category-daily-points"
                  type="number"
                  min={1}
                  max={500}
                  value={categoryDailyPoints}
                  onChange={(e) => setCategoryDailyPoints(Number(e.target.value))}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">點（1點 = 500字元，預設 50 點 ≈ 25,000 字元）</span>
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
    </Tabs>
  );
}
