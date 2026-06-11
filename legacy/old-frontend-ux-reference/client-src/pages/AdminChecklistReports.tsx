import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MODULE_LABELS: Record<string, string> = {
  ai_tutor: "🤖 AI 助教",
  smart_book: "📚 智能書本",
  both: "🔍 全部功能",
};

const STATUS_CONFIG = {
  pass: { label: "✅ 通過", color: "bg-green-100 text-green-700" },
  fail: { label: "❌ 失敗", color: "bg-red-100 text-red-700" },
  na: { label: "➖ 不適用", color: "bg-gray-100 text-gray-500" },
  untested: { label: "⬜ 未測試", color: "bg-white text-gray-400" },
};

interface ChecklistItem {
  id: string;
  category: string;
  item: string;
  status: "pass" | "fail" | "na" | "untested";
  note?: string;
}

export default function AdminChecklistReports() {

  const [moduleFilter, setModuleFilter] = useState<"ai_tutor" | "smart_book" | "both" | "all">("all");
  const [page, setPage] = useState(0);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const PAGE_SIZE = 20;

  const statsQuery = trpc.checklist.adminStats.useQuery();
  const listQuery = trpc.checklist.adminList.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    module: moduleFilter,
  });

  const deleteMutation = trpc.checklist.adminDelete.useMutation({
    onSuccess: () => {
      listQuery.refetch();
      statsQuery.refetch();
      toast.success("已刪除：回饋記錄已成功刪除");
    },
    onError: (err) => {
      toast.error("刪除失敗：" + err.message);
    },
  });

  const stats = statsQuery.data;
  const { rows = [], total = 0 } = listQuery.data ?? {};
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function formatDate(ts: number) {
    return new Date(ts).toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getPassRate(row: any) {
    const tested = (row.passCount ?? 0) + (row.failCount ?? 0);
    if (tested === 0) return null;
    return Math.round((row.passCount / tested) * 100);
  }

  function parseItems(raw: any): ChecklistItem[] {
    if (!raw) return [];
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { return []; }
    }
    if (Array.isArray(raw)) return raw;
    return [];
  }

  // 匯出 CSV
  function exportCsv() {
    const rows_data = rows;
    if (!rows_data.length) return;

    const headers = ["提交時間", "提交者", "角色", "測試範圍", "通過數", "失敗數", "通過率", "整體評分", "整體意見"];
    const csvRows = rows_data.map(r => [
      formatDate(r.createdAt),
      r.userName ?? "",
      r.userRole ?? "",
      MODULE_LABELS[r.testedModule] ?? r.testedModule,
      r.passCount ?? 0,
      r.failCount ?? 0,
      getPassRate(r) !== null ? `${getPassRate(r)}%` : "N/A",
      r.overallRating ?? "",
      (r.overallComment ?? "").replace(/,/g, "，"),
    ]);

    const csvContent = [headers, ...csvRows]
      .map(row => row.join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `測試回饋記錄_${new Date().toLocaleDateString("zh-TW").replace(/\//g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">📋 測試回饋記錄</h1>
          <p className="text-gray-500 text-sm mt-1">查看所有使用者提交的網站功能測試結果</p>
        </div>
        <Button onClick={exportCsv} variant="outline" disabled={!rows.length}>
          📥 匯出 CSV
        </Button>
      </div>

      {/* 統計卡片 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{stats.totalSubmissions}</div>
            <div className="text-xs text-gray-500 mt-1">總提交數</div>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.recentSubmissions}</div>
            <div className="text-xs text-gray-500 mt-1">近 7 天</div>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalPass}</div>
            <div className="text-xs text-gray-500 mt-1">累計通過項</div>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.totalFail}</div>
            <div className="text-xs text-gray-500 mt-1">累計失敗項</div>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.avgRating ? `${stats.avgRating} ⭐` : "—"}
            </div>
            <div className="text-xs text-gray-500 mt-1">平均評分</div>
          </div>
        </div>
      )}

      {/* 篩選 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { value: "all", label: "全部" },
          { value: "both", label: "🔍 全部功能" },
          { value: "ai_tutor", label: "🤖 AI 助教" },
          { value: "smart_book", label: "📚 智能書本" },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => { setModuleFilter(opt.value as any); setPage(0); }}
            className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
              moduleFilter === opt.value
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
            }`}
          >
            {opt.label}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-500 self-center">共 {total} 筆</span>
      </div>

      {/* 記錄列表 */}
      {listQuery.isLoading ? (
        <div className="text-center py-12 text-gray-400">載入中...</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-gray-400">尚無回饋記錄</div>
      ) : (
        <div className="space-y-3">
          {rows.map((row: any) => {
            const passRate = getPassRate(row);
            return (
              <div key={row.id} className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-medium text-gray-800">{row.userName || "匿名"}</span>
                      <Badge variant="outline" className="text-xs">
                        {row.userRole === "admin" ? "👑 管理員" : "👤 學員"}
                      </Badge>
                      <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                        {MODULE_LABELS[row.testedModule] ?? row.testedModule}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(row.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-green-600">✅ 通過 {row.passCount ?? 0}</span>
                      <span className="text-red-600">❌ 失敗 {row.failCount ?? 0}</span>
                      <span className="text-gray-400">➖ 不適用 {row.naCount ?? 0}</span>
                      {passRate !== null && (
                        <span className={`font-medium ${passRate >= 80 ? "text-green-600" : passRate >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                          通過率 {passRate}%
                        </span>
                      )}
                      {row.overallRating && (
                        <span className="text-yellow-500">{"⭐".repeat(row.overallRating)}</span>
                      )}
                    </div>

                    {row.overallComment && (
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded px-3 py-2">
                        💬 {row.overallComment}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedSubmission(row)}
                    >
                      查看詳情
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500 hover:text-red-700 hover:border-red-300"
                      onClick={() => {
                        if (confirm("確定要刪除這筆回饋記錄？")) {
                          deleteMutation.mutate({ id: row.id });
                        }
                      }}
                    >
                      刪除
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 分頁 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            上一頁
          </Button>
          <span className="self-center text-sm text-gray-500">
            第 {page + 1} / {totalPages} 頁
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            下一頁
          </Button>
        </div>
      )}

      {/* 詳情 Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedSubmission && (
            <>
              <DialogHeader>
                <DialogTitle>
                  📋 {selectedSubmission.userName || "匿名"} 的測試回饋
                </DialogTitle>
                <p className="text-sm text-gray-500">
                  {formatDate(selectedSubmission.createdAt)} ·{" "}
                  {MODULE_LABELS[selectedSubmission.testedModule]}
                </p>
              </DialogHeader>

              {/* 統計 */}
              <div className="flex gap-4 text-sm py-2 border-b">
                <span className="text-green-600">✅ 通過 {selectedSubmission.passCount ?? 0}</span>
                <span className="text-red-600">❌ 失敗 {selectedSubmission.failCount ?? 0}</span>
                <span className="text-gray-400">➖ 不適用 {selectedSubmission.naCount ?? 0}</span>
                {selectedSubmission.overallRating && (
                  <span className="ml-auto text-yellow-500">
                    {"⭐".repeat(selectedSubmission.overallRating)}
                  </span>
                )}
              </div>

              {selectedSubmission.overallComment && (
                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                  💬 {selectedSubmission.overallComment}
                </div>
              )}

              {/* 各項目詳情 */}
              {(() => {
                const items = parseItems(selectedSubmission.checklistItems);
                const categories = Array.from(new Set(items.map((i: ChecklistItem) => i.category)));
                return categories.map(cat => {
                  const catItems = items.filter((i: ChecklistItem) => i.category === cat);
                  return (
                    <div key={cat} className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b">
                        <h3 className="font-semibold text-sm text-gray-700">{cat}</h3>
                      </div>
                      <div className="divide-y">
                        {catItems.map((item: ChecklistItem) => (
                          <div key={item.id} className="px-4 py-2.5 flex items-start gap-3">
                            <span className={`text-xs px-2 py-0.5 rounded shrink-0 mt-0.5 ${STATUS_CONFIG[item.status]?.color ?? ""}`}>
                              {STATUS_CONFIG[item.status]?.label ?? item.status}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm text-gray-700">{item.item}</p>
                              {item.note && (
                                <p className="text-xs text-orange-600 mt-1 bg-orange-50 rounded px-2 py-1">
                                  📝 {item.note}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
