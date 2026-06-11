import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  RefreshCw, CheckCircle, Clock, XCircle, Lock, AlertTriangle,
  Unlock, ShieldCheck, BookOpen, Users, ChevronLeft, ChevronRight,
} from "lucide-react";

type StatusFilter = "all" | "passed" | "pending" | "locked" | "suspended";

export default function AdminSmartBookVerifications() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [bookIdFilter, setBookIdFilter] = useState<string>("");
  const pageSize = 30;

  const { data, isLoading, refetch } = trpc.smartBookAdmin.listVerifications.useQuery({
    bookId: bookIdFilter ? parseInt(bookIdFilter) : undefined,
    status: statusFilter === "all" ? undefined : statusFilter as any,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  const { data: booksData } = trpc.smartBookAdmin.list.useQuery();

  const unlockMutation = trpc.smartBookAdmin.unlockVerification.useMutation({
    onSuccess: () => {
      toast.success("已成功解鎖學生驗證");
      refetch();
    },
    onError: (err) => {
      toast.error("解鎖失敗：" + err.message);
    },
  });

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("zh-TW", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const getStatusBadge = (record: any) => {
    if (record.isLocked) {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200">
          <Lock className="w-3 h-3 mr-1" />鎖定中
        </Badge>
      );
    }
    if (record.isSuspended) {
      return (
        <Badge className="bg-orange-100 text-orange-700 border-orange-200">
          <AlertTriangle className="w-3 h-3 mr-1" />暫停中
        </Badge>
      );
    }
    if (record.status === "passed") {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />已通過
        </Badge>
      );
    }
    if (record.status === "pending") {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
          <Clock className="w-3 h-3 mr-1" />待驗證
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-100 text-gray-600 border-gray-200">
        <XCircle className="w-3 h-3 mr-1" />失敗
      </Badge>
    );
  };

  const records = data || [];
  const lockedCount = records.filter((r: any) => r.isLocked).length;
  const suspendedCount = records.filter((r: any) => r.isSuspended).length;
  const passedCount = records.filter((r: any) => r.status === "passed").length;

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 標題 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">學生驗證記錄</h1>
          <p className="text-gray-500 mt-1">查看所有學生的智能書本驗證狀態，可手動解鎖被鎖定的學生</p>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <Users className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-gray-900">{records.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">本頁記錄</div>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-4 text-center">
            <ShieldCheck className="w-6 h-6 text-green-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-green-600">{passedCount}</div>
            <div className="text-xs text-gray-500 mt-0.5">已通過</div>
          </div>
          <div className="bg-white rounded-xl border border-orange-200 p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-orange-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-orange-600">{suspendedCount}</div>
            <div className="text-xs text-gray-500 mt-0.5">暫停中</div>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-4 text-center">
            <Lock className="w-6 h-6 text-red-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-red-600">{lockedCount}</div>
            <div className="text-xs text-gray-500 mt-0.5">鎖定中</div>
          </div>
        </div>

        {/* 篩選列 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 whitespace-nowrap">狀態篩選：</span>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setPage(1); }}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="passed">已通過</SelectItem>
                <SelectItem value="pending">待驗證</SelectItem>
                <SelectItem value="locked">鎖定中</SelectItem>
                <SelectItem value="suspended">暫停中</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 whitespace-nowrap">篩選書本：</span>
            <Select value={bookIdFilter || "all"} onValueChange={(v) => { setBookIdFilter(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-48 h-9">
                <SelectValue placeholder="全部書本" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部書本</SelectItem>
                {(booksData?.books || []).map((book: any) => (
                  <SelectItem key={book.id} value={String(book.id)}>{book.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-auto h-9">
            <RefreshCw className="w-4 h-4 mr-1" />重新整理
          </Button>
        </div>

        {/* 記錄表格 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />載入中...
            </div>
          ) : !records.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <BookOpen className="w-10 h-10 mb-3 opacity-40" />
              <p>目前沒有符合條件的驗證記錄</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">學生</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">書本</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">狀態</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">嘗試次數</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">換題次數</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">失敗輪數</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">鎖定/暫停至</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">通過時間</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record: any) => (
                    <tr key={record.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${record.isLocked ? "bg-red-50" : record.isSuspended ? "bg-orange-50" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{record.userName || "未知"}</div>
                        <div className="text-xs text-gray-400">{record.userEmail || `用戶 #${record.userId}`}</div>
                        {record.unlockedByAdmin ? (
                          <div className="text-xs text-blue-500 mt-0.5">
                            <Unlock className="w-3 h-3 inline mr-0.5" />管理員已解鎖
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-700 max-w-[180px] truncate">{record.bookTitle || `書本 #${record.bookId}`}</div>
                        {record.pageReferenced && (
                          <div className="text-xs text-gray-400">第 {record.pageReferenced} 頁</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(record)}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {record.attemptCount}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-medium ${(record.changeCount || 0) >= 2 ? "text-orange-600" : "text-gray-600"}`}>
                          {record.changeCount || 0}/2
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-medium ${(record.failedRoundCount || 0) >= 2 ? "text-red-600" : "text-gray-600"}`}>
                          {record.failedRoundCount || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {record.isLocked ? (
                          <span className="text-red-600 text-xs font-medium">
                            🔒 {formatDate(record.lockedUntil)}
                          </span>
                        ) : record.isSuspended ? (
                          <span className="text-orange-600 text-xs font-medium">
                            ⏸️ {formatDate(record.suspendedUntil)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                        {formatDate(record.passedAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(record.isLocked || record.isSuspended) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-blue-300 text-blue-600 hover:bg-blue-50"
                            onClick={() => unlockMutation.mutate({ verificationId: record.id })}
                            disabled={unlockMutation.isPending}
                          >
                            <Unlock className="w-3 h-3 mr-1" />
                            解鎖
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 分頁 */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">
            顯示 {records.length} 筆記錄
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600">第 {page} 頁</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={records.length < pageSize}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
