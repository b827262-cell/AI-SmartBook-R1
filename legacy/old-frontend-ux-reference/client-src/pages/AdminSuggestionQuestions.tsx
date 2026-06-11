import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Trash2, RefreshCw, Search, BookOpen, CheckSquare, Square, ChevronLeft, ChevronRight } from "lucide-react";

export default function AdminSuggestionQuestions() {
  const [selectedBookId, setSelectedBookId] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmClear, setConfirmClear] = useState<"book" | "all" | null>(null);
  const PAGE_SIZE = 50;

  const utils = trpc.useUtils();

  const { data: booksData } = trpc.smartBookAdmin.list.useQuery();
  const books = Array.isArray(booksData) ? booksData : [];

  const { data, isLoading, refetch } = trpc.aiClassroomAdmin.getSuggestionCache.useQuery({
    bookId: selectedBookId,
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const bookStats = data?.bookStats ?? [];
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const deleteMutation = trpc.aiClassroomAdmin.deleteSuggestion.useMutation({
    onSuccess: () => {
      toast.success("已刪除問題");
      refetch();
    },
    onError: (err) => toast.error("刪除失敗：" + err.message),
  });

  const deleteBatchMutation = trpc.aiClassroomAdmin.deleteSuggestionBatch.useMutation({
    onSuccess: (res) => {
      toast.success(`已刪除 ${res.deleted} 個問題`);
      setSelectedIds(new Set());
      refetch();
    },
    onError: (err) => toast.error("批次刪除失敗：" + err.message),
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const generateMutation = trpc.aiClassroomAdmin.generateSuggestions.useMutation({
    onSuccess: (res) => {
      toast.success(`已為此書本 AI 生成 ${res.count} 個建議問題`);
      setIsGenerating(false);
      refetch();
    },
    onError: (err) => {
      toast.error("AI 生成失敗：" + err.message);
      setIsGenerating(false);
    },
  });

  const handleGenerate = () => {
    if (!selectedBookId) {
      toast.error("請先選擇書本");
      return;
    }
    setIsGenerating(true);
    generateMutation.mutate({ bookId: selectedBookId });
  };

  const clearCacheMutation = trpc.aiClassroomAdmin.clearSuggestionCache.useMutation({
    onSuccess: () => {
      toast.success(confirmClear === "all" ? "已清除所有書本的建議問題快取" : "已清除此書本的建議問題快取");
      setConfirmClear(null);
      setSelectedIds(new Set());
      refetch();
    },
    onError: (err) => toast.error("清除失敗：" + err.message),
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map(r => r.id)));
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    deleteBatchMutation.mutate({ ids: Array.from(selectedIds) });
  };

  const handleClearConfirm = () => {
    if (confirmClear === "book" && selectedBookId) {
      clearCacheMutation.mutate({ bookId: selectedBookId });
    } else if (confirmClear === "all") {
      clearCacheMutation.mutate({});
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* 標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            建議問題快取管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理首頁「建議問題」的快取資料，可刪除不良問題或清除快取讓系統重新生成
          </p>
        </div>
      </div>

      {/* 書本統計卡片 */}
      {bookStats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {bookStats.map(stat => (
            <button
              key={stat.bookId}
              onClick={() => {
                setSelectedBookId(stat.bookId);
                setPage(1);
                setSelectedIds(new Set());
              }}
              className={`text-left p-3 rounded-xl border transition-colors ${
                selectedBookId === stat.bookId
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <p className="text-xs font-medium truncate">{stat.bookTitle ?? `書本 #${stat.bookId}`}</p>
              <p className="text-lg font-bold text-primary mt-0.5">{stat.cnt}</p>
              <p className="text-xs text-muted-foreground">筆問題</p>
            </button>
          ))}
        </div>
      )}

      {/* 篩選列 */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select
          value={selectedBookId?.toString() ?? "all"}
          onValueChange={(v) => {
            setSelectedBookId(v === "all" ? undefined : Number(v));
            setPage(1);
            setSelectedIds(new Set());
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="選擇書本" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部書本</SelectItem>
            {books.map((b: { id: number; title?: string | null }) => (
              <SelectItem key={b.id} value={b.id.toString()}>
                {b.title ?? `書本 #${b.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-1 flex-1 min-w-[200px]">
          <Input
            placeholder="搜尋問題內容..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="text-sm"
          />
          <Button variant="outline" size="icon" onClick={handleSearch}>
            <Search className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-2 ml-auto">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
              disabled={deleteBatchMutation.isPending}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              刪除 {selectedIds.size} 筆
            </Button>
          )}
          {selectedBookId && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating || generateMutation.isPending}
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'AI 生成中...' : 'AI 重新生成'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmClear("book")}
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                清除此書本快取
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmClear("all")}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            清除全部快取
          </Button>
        </div>
      </div>

      {/* 問題列表 */}
      <div className="border border-border rounded-xl overflow-hidden">
        {/* 表頭 */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
          <button onClick={toggleSelectAll} className="flex-shrink-0">
            {selectedIds.size === rows.length && rows.length > 0
              ? <CheckSquare className="w-4 h-4 text-primary" />
              : <Square className="w-4 h-4" />
            }
          </button>
          <span className="flex-1">問題內容</span>
          <span className="w-28 text-center">書本</span>
          <span className="w-24 text-center">建立時間</span>
          <span className="w-10 text-center">操作</span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">載入中...</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            {search ? "找不到符合的問題" : "目前沒有快取問題"}
          </div>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className={`flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-b-0 text-sm hover:bg-muted/30 transition-colors ${
                selectedIds.has(row.id) ? "bg-primary/5" : ""
              }`}
            >
              <button onClick={() => toggleSelect(row.id)} className="flex-shrink-0">
                {selectedIds.has(row.id)
                  ? <CheckSquare className="w-4 h-4 text-primary" />
                  : <Square className="w-4 h-4 text-muted-foreground" />
                }
              </button>
              <span className="flex-1 leading-relaxed">{row.question}</span>
              <span className="w-28 text-center">
                <Badge variant="outline" className="text-xs truncate max-w-[100px]">
                  {row.bookTitle ?? `#${row.bookId}`}
                </Badge>
              </span>
              <span className="w-24 text-center text-xs text-muted-foreground">
                {new Date(row.createdAt).toLocaleDateString("zh-TW")}
              </span>
              <button
                onClick={() => deleteMutation.mutate({ id: row.id })}
                disabled={deleteMutation.isPending}
                className="w-10 flex justify-center text-muted-foreground hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* 分頁 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>共 {total} 筆，第 {page} / {totalPages} 頁</span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 確認清除對話框 */}
      <AlertDialog open={!!confirmClear} onOpenChange={() => setConfirmClear(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認清除快取</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmClear === "all"
                ? "這將清除所有書本的建議問題快取，下次學生開啟首頁時系統將重新生成新的建議問題。確定要繼續嗎？"
                : "這將清除此書本的建議問題快取，下次學生開啟首頁時系統將重新生成新的建議問題。確定要繼續嗎？"
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              確認清除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
