import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Ticket, ChevronLeft, ChevronRight, User, BookOpen, Coins } from "lucide-react";

export default function AdminVoucherRecords() {
  const [selectedBookId, setSelectedBookId] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data: booksData } = trpc.smartBookAdmin.list.useQuery();
  const books = Array.isArray(booksData) ? booksData : [];

  const { data, isLoading } = trpc.bookVoucher.getAllRecords.useQuery({
    bookId: selectedBookId,
    page,
    pageSize: PAGE_SIZE,
  });

  const records = data?.records ?? [];
  const totalPages = Math.ceil((data?.total ?? records.length) / PAGE_SIZE);

  const formatDate = (ts: number | null | undefined) => {
    if (!ts) return "-";
    return new Date(ts).toLocaleString("zh-TW", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* 標題 */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Ticket className="w-5 h-5 text-primary" />
          購書憑證兌換記錄
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          查看所有學生的購書憑證兌換記錄，包含兌換書本、贈點數量和時間
        </p>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-border rounded-xl p-4 bg-card">
          <div className="text-sm text-muted-foreground">總兌換次數</div>
          <div className="text-2xl font-bold text-primary mt-1">{records.length}</div>
          <div className="text-xs text-muted-foreground">筆記錄</div>
        </div>
        <div className="border border-border rounded-xl p-4 bg-card">
          <div className="text-sm text-muted-foreground">不重複學生數</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {new Set(records.map((r: any) => r.userId)).size}
          </div>
          <div className="text-xs text-muted-foreground">位學生</div>
        </div>
        <div className="border border-border rounded-xl p-4 bg-card">
          <div className="text-sm text-muted-foreground">總贈點數</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {records.reduce((sum: number, r: any) => sum + (r.creditsGranted ?? 0), 0)}
          </div>
          <div className="text-xs text-muted-foreground">點</div>
        </div>
      </div>

      {/* 篩選 */}
      <div className="flex items-center gap-3">
        <Select
          value={selectedBookId?.toString() ?? "all"}
          onValueChange={(v) => {
            setSelectedBookId(v === "all" ? undefined : Number(v));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-52">
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
        <span className="text-sm text-muted-foreground">
          共 {records.length} 筆記錄
        </span>
      </div>

      {/* 記錄列表 */}
      <div className="border border-border rounded-xl overflow-hidden">
        {/* 表頭 */}
        <div className="grid grid-cols-[1fr_1.5fr_1.5fr_1fr_1.2fr] gap-3 px-4 py-2.5 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
          <div className="flex items-center gap-1"><User className="w-3 h-3" />學生</div>
          <div className="flex items-center gap-1"><BookOpen className="w-3 h-3" />書本</div>
          <div className="flex items-center gap-1"><Ticket className="w-3 h-3" />憑證編號</div>
          <div className="flex items-center gap-1"><Coins className="w-3 h-3" />贈點</div>
          <div>兌換時間</div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">載入中...</div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            目前沒有兌換記錄
          </div>
        ) : (
          records.map((r: any, idx: number) => (
            <div
              key={r.id}
              className={`grid grid-cols-[1fr_1.5fr_1.5fr_1fr_1.2fr] gap-3 px-4 py-3 text-sm border-b border-border last:border-0 ${idx % 2 === 0 ? "" : "bg-muted/20"}`}
            >
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">{r.userNickname || r.userName || `用戶 #${r.userId}`}</span>
                <span className="text-xs text-muted-foreground">ID: {r.userId}</span>
              </div>
              <div className="truncate text-muted-foreground">
                {r.bookTitle ?? `書本 #${r.bookId}`}
              </div>
              <div>
                <Badge variant="outline" className="font-mono text-xs">
                  {r.voucherCode}
                </Badge>
              </div>
              <div>
                {r.creditsGranted > 0 ? (
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    +{r.creditsGranted} 點
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">-</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDate(r.createdAt)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 分頁 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            第 {page} / {totalPages} 頁
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
