import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search, ShieldOff, User, Mail, Clock, AlertTriangle,
  ChevronLeft, ChevronRight, Ban
} from "lucide-react";
import { toast } from "sonner";

export default function BannedUsers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [unbanTarget, setUnbanTarget] = useState<{ id: number; name: string; email: string } | null>(null);

  const { data, isLoading, refetch } = trpc.adminConversations.getBannedUsers.useQuery({
    page, pageSize: 20, search: search || undefined,
  });

  const unbanMutation = trpc.adminConversations.unbanUser.useMutation({
    onSuccess: () => {
      toast.success(`已解除封鎖：${unbanTarget?.name}`);
      setUnbanTarget(null);
      refetch();
    },
    onError: () => toast.error("解封失敗，請稍後再試"),
  });

  const handleSearch = () => { setSearch(searchInput); setPage(1); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") handleSearch(); };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 標題 */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Ban className="h-8 w-8 text-destructive" />
          封鎖名單
        </h1>
        <p className="text-muted-foreground mt-1">
          管理所有已被封鎖的學員帳號，可隨時解除封鎖
        </p>
      </div>

      {/* 統計卡 */}
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
          <Ban className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <p className="text-sm text-red-700 font-medium">目前封鎖人數</p>
          <p className="text-2xl font-bold text-red-600">{data?.total ?? "—"}</p>
        </div>
      </div>

      {/* 搜尋列 */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋姓名或 Email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch}>搜尋</Button>
        {search && (
          <Button variant="outline" onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}>
            清除
          </Button>
        )}
      </div>

      {/* 列表 */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>學員姓名</TableHead>
              <TableHead>Gmail</TableHead>
              <TableHead>封鎖原因</TableHead>
              <TableHead className="text-center">封鎖時間</TableHead>
              <TableHead className="text-center">最後登入</TableHead>
              <TableHead className="text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  載入中...
                </TableCell>
              </TableRow>
            ) : data?.users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ShieldOff className="h-10 w-10 opacity-30" />
                    <p className="font-medium">目前沒有封鎖中的學員</p>
                    <p className="text-sm">所有學員帳號均正常使用中</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data?.users.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <Badge variant="destructive" className="text-xs mt-0.5">已封鎖</Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span>{u.email || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-orange-800 line-clamp-2">{u.banReason || "未填寫原因"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      {u.bannedAt ? new Date(u.bannedAt).toLocaleString("zh-TW") : "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleString("zh-TW") : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
                      onClick={() => setUnbanTarget({ id: u.id, name: u.name, email: u.email })}
                    >
                      <ShieldOff className="h-3.5 w-3.5" />
                      解除封鎖
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分頁 */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            第 {data.page} / {data.totalPages} 頁，共 {data.total} 人
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />上一頁
            </Button>
            <Button variant="outline" size="sm" disabled={page === data.totalPages} onClick={() => setPage(page + 1)}>
              下一頁<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 解封確認 Dialog */}
      <AlertDialog open={!!unbanTarget} onOpenChange={() => setUnbanTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-700">
              <ShieldOff className="h-5 w-5" />
              確認解除封鎖？
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>即將解除以下學員的封鎖，解封後該學員可重新登入系統。</span>
              {unbanTarget && (
                <div className="mt-2 p-3 bg-muted rounded-lg text-sm space-y-1">
                  <div className="flex items-center gap-2 font-medium">
                    <User className="h-4 w-4" />{unbanTarget.name}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />{unbanTarget.email || "未提供"}
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              onClick={() => unbanTarget && unbanMutation.mutate({ userId: unbanTarget.id })}
            >
              {unbanMutation.isPending ? "解封中..." : "確認解除封鎖"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
