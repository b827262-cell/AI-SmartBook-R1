import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit, Search, TrendingUp, Image as ImageIcon, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function QACacheManagement() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"hitCount" | "createdAt" | "updatedAt">("hitCount");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editingCache, setEditingCache] = useState<{
    id: number;
    question: string;
    answer: string;
    category: string;
  } | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState("");
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<Array<{
    question: string;
    answer: string;
    analysis?: string;
    reference?: string;
  }>>([]);
  const [addCacheDialogOpen, setAddCacheDialogOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newCategory, setNewCategory] = useState("exam");
  const [txtPreviewOpen, setTxtPreviewOpen] = useState(false);
  const [txtExtractedQuestions, setTxtExtractedQuestions] = useState<Array<{
    question: string;
    answer: string;
  }>>([]);
  const [txtImportSource, setTxtImportSource] = useState<"past_exam" | "featured" | "teacher">("past_exam");
  const [txtImportYear, setTxtImportYear] = useState("");
  const [txtImportSubject, setTxtImportSubject] = useState("");
  const [viewImageDialogOpen, setViewImageDialogOpen] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [viewConversationDialogOpen, setViewConversationDialogOpen] = useState(false);
  const [viewingConversation, setViewingConversation] = useState<{
    sessionId?: string;
    conversationId?: number;
  } | null>(null);

  const utils = trpc.useUtils();

  // 獲取快取列表
  const { data: cacheList, isLoading } = trpc.qaCacheAdmin.list.useQuery({
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
  });

  // 獲取快取統計
  const { data: cacheStats } = trpc.qaCacheAdmin.getStats.useQuery();

  // 獲取高頻問題排行榜
  const { data: topQuestions } = trpc.qaCacheAdmin.getTopQuestions.useQuery({ limit: 10 });

  // 更新快取
  const updateMutation = trpc.qaCacheAdmin.update.useMutation({
    onSuccess: () => {
      toast.success("快取更新成功");
      setEditingCache(null);
      utils.qaCacheAdmin.list.invalidate();
      utils.qaCacheAdmin.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  // 刪除快取
  const deleteMutation = trpc.qaCacheAdmin.delete.useMutation({
    onSuccess: () => {
      toast.success("快取刪除成功");
      utils.qaCacheAdmin.list.invalidate();
      utils.qaCacheAdmin.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  // 批量導入快取
  const batchImportMutation = trpc.qaCacheAdmin.batchImport.useMutation({
    onSuccess: (result) => {
      toast.success(`已成功導入 ${result?.data?.successCount || 0} 筆資料，失敗 ${result?.data?.failureCount || 0} 筆`);
      setImportDialogOpen(false);
      setImportData("");
      utils.qaCacheAdmin.list.invalidate();
      utils.qaCacheAdmin.getStats.invalidate();
    },
    onError: (error) => {
      toast.error("導入失敗: " + error.message);
    },
  });

  // 從純文字抽取申論題
  const extractFromTextMutation = trpc.qaCacheAdmin.extractFromText.useMutation({
    onSuccess: (result) => {
      // 後端返回的結構是 { data: [...] }，不是 { data: { questions: [...] } }
      if (result?.data && Array.isArray(result.data) && result.data.length > 0) {
        toast.success(`已成功抽取 ${result.data.length} 題申論題`);
        setTxtExtractedQuestions(result.data);
        setTxtPreviewOpen(true);
      } else {
        toast.error("無法抽取申論題，請確認檔案格式正確");
      }
    },
    onError: (error) => {
      toast.error("抽取失敗: " + error.message);
    },
  });

  // 批量匯入純文字抽取的申論題
  const batchImportTxtMutation = trpc.qaCacheAdmin.batchImport.useMutation({
    onSuccess: (result) => {
      toast.success(`已成功匯入 ${result?.data?.successCount || 0} 筆資料，失敗 ${result?.data?.failureCount || 0} 筆`);
      setTxtPreviewOpen(false);
      setTxtExtractedQuestions([]);
      setTxtImportYear("");
      setTxtImportSubject("");
      utils.qaCacheAdmin.list.invalidate();
      utils.qaCacheAdmin.getStats.invalidate();
    },
    onError: (error) => {
      toast.error("匯入失敗: " + error.message);
    },
  });

  // 批量刪除快取
  const batchDeleteMutation = trpc.qaCacheAdmin.batchDelete.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setSelectedIds([]);
      utils.qaCacheAdmin.list.invalidate();
      utils.qaCacheAdmin.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(`批量刪除失敗：${error.message}`);
    },
  });

  // 新增快取
  const createMutation = trpc.qaCacheAdmin.create.useMutation({
    onSuccess: () => {
      toast.success("快取新增成功");
      setAddCacheDialogOpen(false);
      setNewQuestion("");
      setNewAnswer("");
      setNewCategory("exam");
      utils.qaCacheAdmin.list.invalidate();
      utils.qaCacheAdmin.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(`新增失敗：${error.message}`);
    },
  });

  const handleEdit = (cache: { id: number; question: string; answer: string; category: string }) => {
    setEditingCache(cache);
  };

  const handleDelete = (id: number) => {
    if (confirm("確定要刪除這個快取嗎？")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) {
      toast.error("請先選擇要刪除的快取");
      return;
    }
    if (confirm(`確定要刪除選中的 ${selectedIds.length} 個快取嗎？`)) {
      batchDeleteMutation.mutate({ ids: selectedIds });
    }
  };

  const handleSaveEdit = () => {
    if (!editingCache) return;
    updateMutation.mutate({
      id: editingCache.id,
      question: editingCache.question,
      answer: editingCache.answer,
      category: editingCache.category,
    });
  };

  const handleAddCache = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast.error("請填寫題目和答案");
      return;
    }
    createMutation.mutate({
      question: newQuestion.trim(),
      answer: newAnswer.trim(),
      category: newCategory as any,
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === (cacheList?.data?.length || 0)) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cacheList?.data?.map((cache) => cache.id) || []);
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleImport = () => {
    try {
      const lines = importData.trim().split("\n");
      const items: Array<{ question: string; answer: string; category: string }> = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // 支援 CSV 格式：問題,答案,分類
        const parts = line.split(",").map(p => p.trim());
        if (parts.length >= 2) {
          items.push({
            question: parts[0],
            answer: parts[1],
            category: parts[2] || "general",
          });
        }
      }
      
      if (items.length === 0) {
        toast.error("請確認輸入格式正確（每行一筆，以逗號分隔）");
        return;
      }
      
      batchImportMutation.mutate({ items });
    } catch (error) {
      toast.error("解析失敗，請確認輸入格式正確");
    }
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.trim().split("\n");
        const items: Array<{ question: string; answer: string; category: string }> = [];
        
        const startIndex = lines[0].includes("問題") || lines[0].includes("question") ? 1 : 0;
        
        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const parts = line.split(",").map(p => p.trim());
          if (parts.length >= 2) {
            items.push({
              question: parts[0],
              answer: parts[1],
              category: parts[2] || "general",
            });
          }
        }
        
        if (items.length === 0) {
          toast.error("無法解析 CSV 檔案，請確認格式正確");
          return;
        }
        
        toast.info(`正在匯入 ${items.length} 筆資料...`);
        batchImportMutation.mutate({ items });
      } catch (error) {
        toast.error("讀取 CSV 檔案失敗");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      toast.info("正在讀取 PDF 檔案...");
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ""
            )
          );
          
          toast.info("正在拆解 PDF 中的申論題...");
          
          const result = await trpc.qaCacheAdmin.extractFromPdf.mutate({
            pdfBase64: base64,
            category: "申論題",
          });
          
          if (result.success && result.questions) {
            toast.success(`已成功拆解 ${result.questions.length} 題申論題`);
            setExtractedQuestions(result.questions);
            setPdfPreviewOpen(true);
          } else {
            toast.error("拆解 PDF 失敗");
          }
        } catch (error) {
          console.error("PDF extraction error:", error);
          toast.error("拆解 PDF 失敗，請稍後再試");
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("PDF upload error:", error);
      toast.error("讀取 PDF 失敗，請稍後再試");
    }
    
    event.target.value = "";
  };

  const handleTxtUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      toast.info("正在讀取純文字檔案...");
      
      // 嘗試使用 UTF-8 讀取
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          let text = e.target?.result as string;
          
          // 檢查是否有亂碼（UTF-16 用 UTF-8 讀取會產生亂碼）
          if (text && text.includes('\ufffd')) {
            toast.info("偵測到 UTF-16 編碼，正在轉換...");
            
            // 重新使用 UTF-16 讀取
            const utf16Reader = new FileReader();
            utf16Reader.onload = async (e2) => {
              try {
                const utf16Text = e2.target?.result as string;
                
                if (!utf16Text || utf16Text.trim().length < 10) {
                  toast.error("檔案內容過短，請確認檔案格式正確");
                  return;
                }
                
                toast.info("正在抽取申論題...");
                extractFromTextMutation.mutate({ text: utf16Text });
              } catch (error) {
                console.error("UTF-16 text extraction error:", error);
                toast.error("抽取申論題失敗，請稍後再試");
              }
            };
            utf16Reader.readAsText(file, "UTF-16LE");
            return;
          }
          
          if (!text || text.trim().length < 10) {
            toast.error("檔案內容過短，請確認檔案格式正確");
            return;
          }
          
          toast.info("正在抽取申論題...");
          extractFromTextMutation.mutate({ text });
        } catch (error) {
          console.error("Text extraction error:", error);
          toast.error("抽取申論題失敗，請稍後再試");
        }
      };
      reader.readAsText(file, "UTF-8");
    } catch (error) {
      console.error("Text upload error:", error);
      toast.error("讀取純文字檔案失敗，請稍後再試");
    }
    
    event.target.value = "";
  };

  const handleConfirmTxtImport = () => {
    if (txtExtractedQuestions.length === 0) {
      toast.error("沒有可匯入的申論題");
      return;
    }

    const items = txtExtractedQuestions.map(q => ({
      question: q.question,
      answer: q.answer,
      category: "exam",
    }));

    batchImportTxtMutation.mutate({ items });
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">問答快取管理</h1>
          <p className="text-muted-foreground mt-2">管理 AI 問答快取，提升系統效能並節省 Token 成本</p>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">總快取數</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cacheStats?.data?.totalCaches || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">總命中次數</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cacheStats?.data?.totalHits || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">總節省 Token</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cacheStats?.data?.totalTokensSaved?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* 高頻問題排行榜 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            高頻問題排行榜（Top 10）
          </CardTitle>
          <CardDescription>最常被查詢的問題</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topQuestions?.data?.map((question, index) => (
              <div key={question.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{question.question}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>命中 {question.hitCount} 次</span>
                  <span>節省 {question.tokensSaved.toLocaleString()} Token</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 搜尋和篩選 */}
      <Card>
        <CardHeader>
          <CardTitle>快取列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜尋問題..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="排序方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hitCount">命中次數</SelectItem>
                <SelectItem value="createdAt">創建時間</SelectItem>
                <SelectItem value="updatedAt">更新時間</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="排序順序" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">降序</SelectItem>
                <SelectItem value="asc">升序</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setAddCacheDialogOpen(true)}>
              新增快取
            </Button>
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              手動輸入
            </Button>
            <Button variant="outline" onClick={() => {
              const link = document.createElement('a');
              link.href = '/qa-cache-template.csv';
              link.download = 'qa-cache-template.csv';
              link.click();
              toast.success('已下載 CSV 範例檔案');
            }}>
              下載 CSV 範例
            </Button>
            <Button variant="outline" onClick={() => document.getElementById('csv-upload')?.click()}>
              CSV 上傳
            </Button>
            {/* PDF 上傳按鈕已隱藏 */}
            {/* <Button variant="outline" onClick={() => document.getElementById('pdf-upload')?.click()}>
              PDF 上傳
            </Button> */}

            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCsvUpload}
            />
            {/* PDF 上傳 input 已隱藏 */}
            {/* <input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handlePdfUpload}
            /> */}

            {selectedIds.length > 0 && (
              <Button variant="destructive" onClick={handleBatchDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                刪除選中 ({selectedIds.length})
              </Button>
            )}
          </div>

          {/* 快取列表表格 */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">載入中...</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === (cacheList?.data?.length || 0) && (cacheList?.data?.length || 0) > 0}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead>問題</TableHead>
                    <TableHead>答案預覽</TableHead>
                    <TableHead className="text-center">截圖</TableHead>
                    <TableHead className="text-center">對話</TableHead>
                    <TableHead className="text-center">命中次數</TableHead>
                    <TableHead className="text-center">節省 Token</TableHead>
                    <TableHead className="text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cacheList?.data.map((cache) => (
                    <TableRow key={cache.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(cache.id)}
                          onChange={() => toggleSelect(cache.id)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="line-clamp-2">{cache.question}</p>
                      </TableCell>
                      <TableCell className="max-w-[400px]">
                        <div className="max-h-[60px] overflow-hidden">
                          <p className="text-muted-foreground text-sm leading-relaxed">
                            {cache.answer.length > 100 
                              ? cache.answer.substring(0, 100) + "..." 
                              : cache.answer}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {cache.image ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setViewingImage(cache.image);
                              setViewImageDialogOpen(true);
                            }}
                          >
                            <ImageIcon className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {cache.sessionId || cache.conversationId ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setViewingConversation({
                                sessionId: cache.sessionId,
                                conversationId: cache.conversationId,
                              });
                              setViewConversationDialogOpen(true);
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{cache.hitCount}</TableCell>
                      <TableCell className="text-center">{cache.tokensSaved.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(cache)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(cache.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 分頁：永遠顯示 */}
              {cacheList && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    共 <span className="font-medium text-foreground">{cacheList.pagination.total}</span> 筆快取，第 <span className="font-medium text-foreground">{cacheList.pagination.page}</span> / <span className="font-medium text-foreground">{cacheList.pagination.totalPages || 1}</span> 頁
                    （每頁 {pageSize} 筆）
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(1)}
                    >
                      首頁
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      上一頁
                    </Button>
                    {/* 頁碼快速跳轉 */}
                    {Array.from({ length: Math.min(5, cacheList.pagination.totalPages || 1) }, (_, i) => {
                      const totalPgs = cacheList.pagination.totalPages || 1;
                      let startPage = Math.max(1, page - 2);
                      if (startPage + 4 > totalPgs) startPage = Math.max(1, totalPgs - 4);
                      const pg = startPage + i;
                      if (pg > totalPgs) return null;
                      return (
                        <Button
                          key={pg}
                          variant={pg === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pg)}
                          className="w-8 h-8 p-0"
                        >
                          {pg}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === (cacheList.pagination.totalPages || 1)}
                      onClick={() => setPage(page + 1)}
                    >
                      下一頁
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === (cacheList.pagination.totalPages || 1)}
                      onClick={() => setPage(cacheList.pagination.totalPages || 1)}
                    >
                      末頁
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 編輯對話框 */}
      <Dialog open={!!editingCache} onOpenChange={() => setEditingCache(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>編輯快取</DialogTitle>
            <DialogDescription>修改問題或答案內容，系統會自動重新生成 Embedding</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question">問題</Label>
              <Textarea
                id="question"
                value={editingCache?.question || ""}
                onChange={(e) =>
                  setEditingCache(editingCache ? { ...editingCache, question: e.target.value } : null)
                }
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="answer">答案</Label>
              <Textarea
                id="answer"
                value={editingCache?.answer || ""}
                onChange={(e) =>
                  setEditingCache(editingCache ? { ...editingCache, answer: e.target.value } : null)
                }
                rows={8}
                className="max-h-[300px] overflow-y-auto resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">分類</Label>
              <Select
                value={editingCache?.category || "general"}
                onValueChange={(value) =>
                  setEditingCache(editingCache ? { ...editingCache, category: value } : null)
                }
              >
                <SelectTrigger id="edit-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="knowledge">知識點</SelectItem>
                  <SelectItem value="learning_material">學習材料</SelectItem>
                  <SelectItem value="chapter">章節內容</SelectItem>
                  <SelectItem value="general">一般</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCache(null)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "儲存中..." : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量導入對話框 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>批量導入快取</DialogTitle>
            <DialogDescription>
              每行一筆資料，以逗號分隔：問題,答案,分類（分類可略，預設為 general）
              <br />
              範例：什麼是 Python?,Python 是一種高階編程語言,knowledge
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="importData">導入資料</Label>
              <Textarea
                id="importData"
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                rows={15}
                placeholder="什麼是 Python?,Python 是一種高階編程語言,knowledge&#10;如何學習 JavaScript?,可以從基礎語法開始學習,knowledge"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleImport} disabled={batchImportMutation.isPending}>
              {batchImportMutation.isPending ? "導入中..." : "導入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF 拆解預覽對話框 */}
      <Dialog open={pdfPreviewOpen} onOpenChange={setPdfPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>PDF 拆解結果預覽</DialogTitle>
            <DialogDescription>
              已成功拆解 {extractedQuestions.length} 題申論題，請確認後儲存到快取系統
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {extractedQuestions.map((q, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>第 {index + 1} 題</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newQuestions = extractedQuestions.filter((_, i) => i !== index);
                        setExtractedQuestions(newQuestions);
                        if (newQuestions.length === 0) {
                          setPdfPreviewOpen(false);
                          toast.info("已刪除所有題目");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold">問題：</Label>
                    <Textarea
                      value={q.question}
                      onChange={(e) => {
                        const newQuestions = [...extractedQuestions];
                        newQuestions[index].question = e.target.value;
                        setExtractedQuestions(newQuestions);
                      }}
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">答案：</Label>
                    <Textarea
                      value={q.answer}
                      onChange={(e) => {
                        const newQuestions = [...extractedQuestions];
                        newQuestions[index].answer = e.target.value;
                        setExtractedQuestions(newQuestions);
                      }}
                      rows={6}
                      className="mt-1"
                    />
                  </div>
                  {q.analysis && (
                    <div>
                      <Label className="text-sm font-semibold text-muted-foreground">試題評析：</Label>
                      <p className="text-sm text-muted-foreground mt-1">{q.analysis}</p>
                    </div>
                  )}
                  {q.reference && (
                    <div>
                      <Label className="text-sm font-semibold text-muted-foreground">考點命中：</Label>
                      <p className="text-sm text-muted-foreground mt-1">{q.reference}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setPdfPreviewOpen(false)}>
              取消
            </Button>
            <Button
              onClick={async () => {
                try {
                  toast.info(`正在儲存 ${extractedQuestions.length} 題到快取系統...`);
                  const result = await batchImportMutation.mutateAsync({
                    items: extractedQuestions.map(q => ({
                      question: q.question,
                      answer: q.answer,
                      category: "申論題",
                    })),
                  });
                  setPdfPreviewOpen(false);
                  setExtractedQuestions([]);
                } catch (error) {
                  console.error("Save error:", error);
                }
              }}
              disabled={batchImportMutation.isPending || extractedQuestions.length === 0}
            >
              {batchImportMutation.isPending ? "儲存中..." : `儲存 ${extractedQuestions.length} 題到快取`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 純文字匯入預覽對話框 */}
      <Dialog open={txtPreviewOpen} onOpenChange={setTxtPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>純文字抽取結果預覽</DialogTitle>
            <DialogDescription>
              已成功抽取 {txtExtractedQuestions.length} 題申論題，請確認後儲存到快取系統
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {txtExtractedQuestions.map((q, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>第 {index + 1} 題</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newQuestions = txtExtractedQuestions.filter((_, i) => i !== index);
                        setTxtExtractedQuestions(newQuestions);
                        if (newQuestions.length === 0) {
                          setTxtPreviewOpen(false);
                          toast.info("已刪除所有題目");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold">問題：</Label>
                    <Textarea
                      value={q.question}
                      onChange={(e) => {
                        const newQuestions = [...txtExtractedQuestions];
                        newQuestions[index].question = e.target.value;
                        setTxtExtractedQuestions(newQuestions);
                      }}
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">答案：</Label>
                    <Textarea
                      value={q.answer}
                      onChange={(e) => {
                        const newQuestions = [...txtExtractedQuestions];
                        newQuestions[index].answer = e.target.value;
                        setTxtExtractedQuestions(newQuestions);
                      }}
                      rows={6}
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setTxtPreviewOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleConfirmTxtImport}
              disabled={batchImportTxtMutation.isPending || txtExtractedQuestions.length === 0}
            >
              {batchImportTxtMutation.isPending ? "匯入中..." : `匯入 ${txtExtractedQuestions.length} 題到快取`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新增快取對話框 */}
      <Dialog open={addCacheDialogOpen} onOpenChange={setAddCacheDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新增快取</DialogTitle>
            <DialogDescription>
              請分別輸入或貼上題目和答案，儲存後將直接加入快取系統
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="new-question">題目</Label>
              <Textarea
                id="new-question"
                placeholder="請輸入或貼上題目內容..."
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                rows={5}
                className="mt-1"
              />
            </div>            <div>
              <Label htmlFor="new-answer">答案</Label>
              <Textarea
                id="new-answer"
                placeholder="請輸入或貼上答案內容..."
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                rows={8}
                className="max-h-[300px] overflow-y-auto resize-none mt-1"
              />
            </div>
            <div>
              <Label htmlFor="new-category">分類（可選）</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger id="new-category" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="knowledge">知識點</SelectItem>
                  <SelectItem value="learning_material">學習材料</SelectItem>
                  <SelectItem value="chapter">章節內容</SelectItem>
                  <SelectItem value="general">一般</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => {
              setAddCacheDialogOpen(false);
              setNewQuestion("");
              setNewAnswer("");
              setNewCategory("exam");
            }}>
              取消
            </Button>
            <Button
              onClick={handleAddCache}
              disabled={createMutation.isPending || !newQuestion.trim() || !newAnswer.trim()}
            >
              {createMutation.isPending ? "儲存中..." : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看截圖對話框 */}
      <Dialog open={viewImageDialogOpen} onOpenChange={setViewImageDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>查看截圖</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {viewingImage && (
              <img
                src={viewingImage}
                alt="學員截圖"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setViewImageDialogOpen(false)}>
              關閉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看完整對話對話框 */}
      <ViewConversationDialog
        open={viewConversationDialogOpen}
        onOpenChange={setViewConversationDialogOpen}
        sessionId={viewingConversation?.sessionId}
        conversationId={viewingConversation?.conversationId}
      />
    </div>
  );
}

// 查看完整對話的組件
function ViewConversationDialog({
  open,
  onOpenChange,
  sessionId,
  conversationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId?: string;
  conversationId?: number;
}) {
  // 根據 sessionId 或 conversationId 查詢對話記錄
  const { data: conversation, isLoading } = trpc.studentLearning.getConversationBySessionId.useQuery(
    { sessionId: sessionId || "" },
    { enabled: open && !!sessionId }
  );

  const { data: conversationById, isLoading: isLoadingById } = trpc.studentLearning.getConversationById.useQuery(
    { conversationId: conversationId || 0 },
    { enabled: open && !!conversationId && !sessionId }
  );

  const messages = sessionId ? conversation?.messages : conversationById?.messages;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>完整對話記錄</DialogTitle>
          <DialogDescription>
            {sessionId ? `會話 ID: ${sessionId}` : conversationId ? `對話 ID: ${conversationId}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {isLoading || isLoadingById ? (
            <div className="text-center py-8 text-muted-foreground">載入中...</div>
          ) : messages && messages.length > 0 ? (
            messages.map((msg, index) => (
              <Card key={msg.id}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>第 {index + 1} 個問答</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleString("zh-TW")}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {msg.image && (
                    <div className="mb-3">
                      <Label className="text-sm font-semibold">截圖：</Label>
                      <img
                        src={msg.image}
                        alt="學員截圖"
                        className="mt-2 max-w-full max-h-[300px] object-contain rounded-lg border"
                      />
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-semibold">問題：</Label>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{msg.question}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">答案：</Label>
                    <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{msg.answer}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">沒有對話記錄</div>
          )}
        </div>
        <DialogFooter className="mt-6">
          <Button onClick={() => onOpenChange(false)}>
            關閉
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
