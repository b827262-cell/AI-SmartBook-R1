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
import { Trash2, Edit, Search, FileText, Upload, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function EssayManagement() {
  const [isImporting, setIsImporting] = useState(false);
  const [importStep, setImportStep] = useState<'idle' | 'extracting' | 'saving' | 'done'>('idle');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editingEssay, setEditingEssay] = useState<{
    id: number;
    question: string;
    answer: string;
    source?: "past_exam" | "featured" | "teacher";
    year?: string;
    subject?: string;
    standardAnswer?: string;
  } | null>(null);
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [batchEditSource, setBatchEditSource] = useState<"past_exam" | "featured" | "teacher" | "">("");
  const [batchEditYear, setBatchEditYear] = useState("");
  const [batchEditSubject, setBatchEditSubject] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newEssay, setNewEssay] = useState<{
    question: string;
    answer: string;
    source?: "past_exam" | "featured" | "teacher";
    year?: string;
    subject?: string;
    standardAnswer?: string;
  }>({
    question: "",
    answer: "",
  });
  const [txtPreviewOpen, setTxtPreviewOpen] = useState(false);
  const [txtExtractedQuestions, setTxtExtractedQuestions] = useState<Array<{
    question: string;
    answer: string;
  }>>([]);
  const [txtImportSource, setTxtImportSource] = useState<"past_exam" | "featured" | "teacher">("past_exam");
  const [txtImportYear, setTxtImportYear] = useState("");
  const [txtImportSubject, setTxtImportSubject] = useState("");
  // 點數設定
  const [pointCostDialogOpen, setPointCostDialogOpen] = useState(false);
  const [pointCostTarget, setPointCostTarget] = useState<{ id?: number; isBatch: boolean } | null>(null);
  const [pointCostValue, setPointCostValue] = useState("1");

  const utils = trpc.useUtils();

  // 獲取申論題列表
  const { data: essayList, isLoading } = trpc.essayManagement.list.useQuery({
    page,
    pageSize,
    search,
  });

  // 獲取申論題統計
  const { data: essayStats } = trpc.essayManagement.getStats.useQuery();

  // 更新申論題
  const updateMutation = trpc.essayManagement.update.useMutation({
    onSuccess: () => {
      toast.success("申論題更新成功");
      setEditingEssay(null);
      utils.essayManagement.list.invalidate();
      utils.essayManagement.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  // 刪除申論題
  const deleteMutation = trpc.essayManagement.delete.useMutation({
    onSuccess: () => {
      toast.success("申論題刪除成功");
      utils.essayManagement.list.invalidate();
      utils.essayManagement.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  // 設定單題點數
  const setPointCostMutation = trpc.essayManagement.setPointCost.useMutation({
    onSuccess: () => {
      toast.success("點數設定成功");
      setPointCostDialogOpen(false);
      utils.essayManagement.list.invalidate();
    },
    onError: (e) => toast.error(`設定失敗：${e.message}`),
  });

  // 批次設定點數
  const batchSetPointCostMutation = trpc.essayManagement.batchSetPointCost.useMutation({
    onSuccess: (res) => {
      toast.success(`已成功設定 ${res.count} 題的點數`);
      setPointCostDialogOpen(false);
      setSelectedIds([]);
      utils.essayManagement.list.invalidate();
    },
    onError: (e) => toast.error(`批次設定失敗：${e.message}`),
  });

  const handleOpenPointCost = (item?: any) => {
    if (item) {
      setPointCostTarget({ id: item.id, isBatch: false });
      setPointCostValue(String(item.pointCost ?? 0));
    } else {
      setPointCostTarget({ isBatch: true });
      setPointCostValue("1");
    }
    setPointCostDialogOpen(true);
  };

  const handleConfirmPointCost = () => {
    const cost = parseInt(pointCostValue, 10);
    if (isNaN(cost) || cost < 0) { toast.error("請輸入有效點數（0 以上）"); return; }
    if (pointCostTarget?.isBatch) {
      batchSetPointCostMutation.mutate({ ids: selectedIds, pointCost: cost });
    } else if (pointCostTarget?.id !== undefined) {
      setPointCostMutation.mutate({ id: pointCostTarget.id, pointCost: cost });
    }
  };

  // 批量刪除申論題
  const batchDeleteMutation = trpc.essayManagement.batchDelete.useMutation({
    onSuccess: () => {
      toast.success("批量刪除成功");
      setSelectedIds([]);
      utils.essayManagement.list.invalidate();
      utils.essayManagement.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(`批量刪除失敗：${error.message}`);
    },
  });

  // 純文字抽取（抽取後直接匯入，不顯示預覽）
  const extractFromTextMutation = trpc.essayManagement.extractFromText.useMutation({
    onSuccess: (result) => {
      if (result?.data && Array.isArray(result.data) && result.data.length > 0) {
        setImportStep('saving');
        // 直接匯入，不顯示預覽對話框
        batchImportTxtMutation.mutate({
          items: result.data.map((q: { question: string; answer: string }) => ({
            question: q.question,
            answer: q.answer,
            category: "exam" as const,
            source: txtImportSource,
            year: txtImportYear || undefined,
            subject: txtImportSubject || undefined,
          })),
        });
      } else {
        setIsImporting(false);
        setImportStep('idle');
        toast.error("無法抽取申論題，請確認檔案格式正確");
      }
    },
    onError: (error) => {
      setIsImporting(false);
      setImportStep('idle');
      toast.error(`抽取失敗：${error.message}`);
    },
  });

  // 批量匯入申論題
  const batchImportTxtMutation = trpc.essayManagement.batchImport.useMutation({
    onSuccess: (result) => {
      setImportStep('done');
      toast.success(`成功匯入 ${result.successCount} 題申論題！`);
      setTxtPreviewOpen(false);
      setTxtExtractedQuestions([]);
      utils.essayManagement.list.invalidate();
      utils.essayManagement.getStats.invalidate();
      // 2秒後恢復按鈕狀態
      setTimeout(() => {
        setIsImporting(false);
        setImportStep('idle');
      }, 2000);
    },
    onError: (error) => {
      setIsImporting(false);
      setImportStep('idle');
      toast.error(`匯入失敗：${error.message}`);
    },
  });

  // 批量編輯申論題
  const batchUpdateMutation = trpc.essayManagement.batchUpdate.useMutation({
    onSuccess: () => {
      toast.success("批量編輯成功");
      setBatchEditOpen(false);
      setSelectedIds([]);
      setBatchEditSource("");
      setBatchEditYear("");
      setBatchEditSubject("");
      utils.essayManagement.list.invalidate();
      utils.essayManagement.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(`批量編輯失敗：${error.message}`);
    },
  });

  // 手動新增申論題
  const createMutation = trpc.essayManagement.create.useMutation({
    onSuccess: () => {
      toast.success("申論題新增成功");
      setCreateDialogOpen(false);
      setNewEssay({
        question: "",
        answer: "",
      });
      utils.essayManagement.list.invalidate();
      utils.essayManagement.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(`新增失敗：${error.message}`);
    },
  });

  // 從檔名解析考科名
  const parseSubjectFromFilename = (filename: string): string => {
    // 去掉副檔名
    let name = filename.replace(/\.txt$/i, '');
    // 去掉常見後綴（_申論題、-申論題、_essay 等）
    name = name.replace(/[_-]?(申論題|essay|questions?)$/i, '');
    return name.trim();
  };

  // 從文字內容第一行解析考科名（如「題庫：高考三級-公職社工師」）
  const parseSubjectFromContent = (text: string): string | null => {
    const firstLine = text.split('\n')[0]?.trim();
    if (!firstLine) return null;
    // 格式：「題庫：XXX」
    const match = firstLine.match(/^題庫[：:]+(.+)/);
    if (match) return match[1].trim();
    return null;
  };

  // 處理純文字上傳
  const handleTxtUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      toast.error("請上傳 .txt 檔案");
      return;
    }

    setIsImporting(true);
    setImportStep('extracting');

    try {
      let text = await file.text();
      
      // 檢查是否為亂碼（可能是 UTF-16 編碼）
      if (text.includes('\ufffd') || text.split('').every((char, i) => i % 2 === 0 && char === '\0')) {
        toast.info("偵測到 UTF-16 編碼，正在轉換...");
        const arrayBuffer = await file.arrayBuffer();
        const decoder = new TextDecoder('utf-16le');
        text = decoder.decode(arrayBuffer);
      }

      // 自動從文字內容或檔名解析考科名
      const subjectFromContent = parseSubjectFromContent(text);
      const subjectFromFilename = parseSubjectFromFilename(file.name);
      const autoSubject = subjectFromContent || subjectFromFilename;
      if (autoSubject && !txtImportSubject) {
        setTxtImportSubject(autoSubject);
      }

      extractFromTextMutation.mutate({ text });
    } catch (error) {
      toast.error("讀取檔案失敗");
    }

    // 清空 input
    event.target.value = '';
  };

  // 處理確認純文字匯入（保留供手動觸發使用）
  const handleConfirmTxtImport = () => {
    if (txtExtractedQuestions.length === 0) {
      toast.error("沒有可匯入的題目");
      return;
    }

    batchImportTxtMutation.mutate({
      items: txtExtractedQuestions.map(q => ({
        question: q.question,
        answer: q.answer,
        category: "exam" as const,
        source: txtImportSource,
        year: txtImportYear || undefined,
        subject: txtImportSubject || undefined,
      })),
    });
  };

  // 處理編輯
  const handleEdit = (essay: any) => {
    setEditingEssay({
      id: essay.id,
      question: essay.question,
      answer: essay.answer,
      source: essay.source,
      year: essay.year || "",
      subject: essay.subject || "",
      standardAnswer: essay.standardAnswer || "",
    });
  };

  // 處理更新
  const handleUpdate = () => {
    if (!editingEssay) return;

    updateMutation.mutate({
      id: editingEssay.id,
      question: editingEssay.question,
      answer: editingEssay.answer,
      source: editingEssay.source,
      year: editingEssay.year,
      subject: editingEssay.subject,
      standardAnswer: editingEssay.standardAnswer,
    });
  };

  // 處理刪除
  const handleDelete = (id: number) => {
    if (confirm("確定要刪除這題申論題嗎？")) {
      deleteMutation.mutate({ id });
    }
  };

  // 處理批量刪除
  const handleBatchDelete = () => {
    if (selectedIds.length === 0) {
      toast.error("請先選擇要刪除的題目");
      return;
    }

    if (confirm(`確定要刪除選中的 ${selectedIds.length} 題申論題嗎？`)) {
      batchDeleteMutation.mutate({ ids: selectedIds });
    }
  };

  // 處理批量編輯
  const handleBatchEdit = () => {
    if (selectedIds.length === 0) {
      toast.error("請先選擇要編輯的題目");
      return;
    }
    setBatchEditOpen(true);
  };

  // 確認批量編輯
  const handleConfirmBatchEdit = () => {
    if (!batchEditSource && !batchEditYear && !batchEditSubject) {
      toast.error("請至少修改一個欄位");
      return;
    }

    batchUpdateMutation.mutate({
      ids: selectedIds,
      updates: {
        source: batchEditSource || undefined,
        year: batchEditYear || undefined,
        subject: batchEditSubject || undefined,
      },
    });
  };

  // 處理手動新增
  const handleCreate = () => {
    if (!newEssay.question) {
      toast.error("請填寫題目");
      return;
    }

    createMutation.mutate({
      question: newEssay.question,
      answer: newEssay.answer,
      source: newEssay.source,
      year: newEssay.year,
      subject: newEssay.subject,
      standardAnswer: newEssay.standardAnswer,
    });
  };

  // 處理全選
  const handleSelectAll = () => {
    if (selectedIds.length === essayList?.data.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(essayList?.data.map((item: any) => item.id) || []);
    }
  };

  // 處理單選
  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">申論題管理</h1>
        <p className="text-muted-foreground">管理純文字匯入的申論題，支援編輯、刪除和匯入功能</p>
      </div>

      {/* 統計卡片 */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總題數</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{essayStats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">來源數量</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{essayStats?.sourceCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">年份數量</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{essayStats?.yearCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* 操作列 */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜尋問題..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-[300px]"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="file"
            accept=".txt"
            onChange={handleTxtUpload}
            style={{ display: 'none' }}
            id="txt-upload"
            disabled={isImporting}
          />
          <Button
            variant="outline"
            onClick={() => !isImporting && document.getElementById('txt-upload')?.click()}
            disabled={isImporting}
            className="min-w-[140px]"
          >
            {importStep === 'idle' && (
              <><Upload className="mr-2 h-4 w-4" />純文字匯入</>
            )}
            {importStep === 'extracting' && (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />AI 抽取中...</>
            )}
            {importStep === 'saving' && (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />儲存中...</>
            )}
            {importStep === 'done' && (
              <><CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />匯入完成！</>
            )}
          </Button>

          <Button onClick={() => setCreateDialogOpen(true)}>
            手動新增申論題
          </Button>

          {selectedIds.length > 0 && (
            <>
              <Button variant="outline" onClick={handleBatchEdit}>
                <Edit className="mr-2 h-4 w-4" />
                批量編輯 ({selectedIds.length})
              </Button>
              <Button variant="destructive" onClick={handleBatchDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                刪除選中 ({selectedIds.length})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 申論題列表 */}
      <Card>
        <CardHeader>
          <CardTitle>申論題列表</CardTitle>
          <CardDescription>
            共找到 {essayList?.pagination.total || 0} 題，目前顯示第 {page} 頁
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">載入中...</div>
          ) : essayList?.data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              尚無申論題，請使用純文字匯入功能新增題目
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === essayList?.data.length}
                        onChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>問題</TableHead>
                    <TableHead>來源</TableHead>
                    <TableHead>年份</TableHead>
                    <TableHead>考科</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {essayList?.data.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => handleSelectOne(item.id)}
                        />
                      </TableCell>
                      <TableCell className="max-w-[400px] truncate">
                        {item.question}
                      </TableCell>
                      <TableCell>{
                        item.source === 'past_exam' ? '考古題' :
                        item.source === 'featured' ? '智能題庫' :
                        item.source === 'teacher' ? '名師題' :
                        item.source || '-'
                      }</TableCell>
                      <TableCell>{item.year || "-"}</TableCell>
                      <TableCell>{item.subject || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 分頁 */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-muted-foreground">
                  顯示 {(page - 1) * pageSize + 1} 到 {Math.min(page * pageSize, essayList?.pagination.total || 0)} 筆，共 {essayList?.pagination.total || 0} 筆
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    上一頁
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= (essayList?.pagination.totalPages || 1)}
                  >
                    下一頁
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 編輯對話框 */}
      <Dialog open={!!editingEssay} onOpenChange={() => setEditingEssay(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>編輯申論題</DialogTitle>
            <DialogDescription>修改申論題的內容和屬性</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="question">問題</Label>
              <Textarea
                id="question"
                value={editingEssay?.question || ""}
                onChange={(e) => setEditingEssay(prev => prev ? { ...prev, question: e.target.value } : null)}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="answer">答案</Label>
              <Textarea
                id="answer"
                value={editingEssay?.answer || ""}
                onChange={(e) => setEditingEssay(prev => prev ? { ...prev, answer: e.target.value } : null)}
                rows={8}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="source">題目來源</Label>
                <Select
                  value={editingEssay?.source || ""}
                  onValueChange={(value) => setEditingEssay(prev => prev ? { ...prev, source: value as any } : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇來源" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="past_exam">1.考古題</SelectItem>
                    <SelectItem value="featured">2.精選題</SelectItem>
                    <SelectItem value="teacher">3.名師題</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="year">年份</Label>
                <Input
                  id="year"
                  value={editingEssay?.year || ""}
                  onChange={(e) => setEditingEssay(prev => prev ? { ...prev, year: e.target.value } : null)}
                  placeholder="例如：113"
                />
              </div>

              <div>
                <Label htmlFor="subject">考科</Label>
                <Input
                  id="subject"
                  value={editingEssay?.subject || ""}
                  onChange={(e) => setEditingEssay(prev => prev ? { ...prev, subject: e.target.value } : null)}
                  placeholder="例如：地方政府與政治"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEssay(null)}>
              取消
            </Button>
            <Button onClick={handleUpdate}>
              確認更新
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
              已成功抽取 {txtExtractedQuestions.length} 題申論題，請確認後匯入
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 設定來源、年份、考科 */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label htmlFor="txt-source">來源</Label>
                <Select value={txtImportSource} onValueChange={(v: any) => setTxtImportSource(v)}>
                  <SelectTrigger id="txt-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="past_exam">1.考古題</SelectItem>
                    <SelectItem value="featured">2.精選題</SelectItem>
                    <SelectItem value="teacher">3.名師題</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="txt-year">年份</Label>
                <Input
                  id="txt-year"
                  value={txtImportYear}
                  onChange={(e) => setTxtImportYear(e.target.value)}
                  placeholder="例如：113"
                />
              </div>

              <div>
                <Label htmlFor="txt-subject">考科</Label>
                <Input
                  id="txt-subject"
                  value={txtImportSubject}
                  onChange={(e) => setTxtImportSubject(e.target.value)}
                  placeholder="例如：地方政府與政治"
                />
              </div>
            </div>

            {/* 題目列表 */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {txtExtractedQuestions.map((q, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-sm">第 {index + 1} 題</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">問題：</Label>
                      <p className="text-sm">{q.question}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">答案：</Label>
                      <p className="text-sm whitespace-pre-wrap">{q.answer}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTxtPreviewOpen(false)}>
              取消
            </Button>
            <Button onClick={handleConfirmTxtImport}>
              確認匯入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量編輯對話框 */}
      <Dialog open={batchEditOpen} onOpenChange={setBatchEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量編輯申論題</DialogTitle>
            <DialogDescription>
              已選擇 {selectedIds.length} 題，請選擇要修改的欄位
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="batch-source">題目來源</Label>
              <Select
                value={batchEditSource}
                onValueChange={(value: any) => setBatchEditSource(value)}
              >
                <SelectTrigger id="batch-source">
                  <SelectValue placeholder="不修改" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="past_exam">1.考古題</SelectItem>
                  <SelectItem value="featured">2.精選題</SelectItem>
                  <SelectItem value="teacher">3.名師題</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="batch-year">年份</Label>
              <Input
                id="batch-year"
                value={batchEditYear}
                onChange={(e) => setBatchEditYear(e.target.value)}
                placeholder="不修改則留空"
              />
            </div>

            <div>
              <Label htmlFor="batch-subject">考科</Label>
              <Input
                id="batch-subject"
                value={batchEditSubject}
                onChange={(e) => setBatchEditSubject(e.target.value)}
                placeholder="不修改則留空"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchEditOpen(false)}>
              取消
            </Button>
            <Button onClick={handleConfirmBatchEdit}>
              確認編輯
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 手動新增對話框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>手動新增申論題</DialogTitle>
            <DialogDescription>填寫申論題的內容和屬性</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="new-question">問題 *</Label>
              <Textarea
                id="new-question"
                value={newEssay.question}
                onChange={(e) => setNewEssay(prev => ({ ...prev, question: e.target.value }))}
                rows={4}
                placeholder="請輸入申論題題目"
              />
            </div>

            <div>
              <Label htmlFor="new-answer">答案 *</Label>
              <Textarea
                id="new-answer"
                value={newEssay.answer}
                onChange={(e) => setNewEssay(prev => ({ ...prev, answer: e.target.value }))}
                rows={8}
                placeholder="請輸入答案"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="new-source">題目來源</Label>
                <Select
                  value={newEssay.source || ""}
                  onValueChange={(value: any) => setNewEssay(prev => ({ ...prev, source: value }))}
                >
                  <SelectTrigger id="new-source">
                    <SelectValue placeholder="選擇來源" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="past_exam">1.考古題</SelectItem>
                    <SelectItem value="featured">2.精選題</SelectItem>
                    <SelectItem value="teacher">3.名師題</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="new-year">年份</Label>
                <Input
                  id="new-year"
                  value={newEssay.year || ""}
                  onChange={(e) => setNewEssay(prev => ({ ...prev, year: e.target.value }))}
                  placeholder="例如：113"
                />
              </div>

              <div>
                <Label htmlFor="new-subject">考科</Label>
                <Input
                  id="new-subject"
                  value={newEssay.subject || ""}
                  onChange={(e) => setNewEssay(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="例如：地方政府與政治"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate}>
              確認新增
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
