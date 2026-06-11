import { useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Streamdown } from "streamdown";
import {
  Search, ChevronDown, ChevronUp, MessageSquare,
  BookOpen, User, Calendar, Eye, EyeOff, Download, X,
  BarChart2, Loader2, RefreshCw, Clock, TrendingUp
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import html2canvas from "html2canvas";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#14b8a6"];

type Tab = "records" | "stats";
type DateRange = "7d" | "30d" | "custom" | "all";

function getDateRange(range: DateRange, customFrom?: string, customTo?: string) {
  const now = Date.now();
  if (range === "7d") return { dateFrom: now - 7 * 86400000, dateTo: now };
  if (range === "30d") return { dateFrom: now - 30 * 86400000, dateTo: now };
  if (range === "custom" && customFrom && customTo) {
    return {
      dateFrom: new Date(customFrom).getTime(),
      dateTo: new Date(customTo + "T23:59:59").getTime(),
    };
  }
  return { dateFrom: undefined, dateTo: undefined };
}

export default function AdminTutorChatRecords() {
  const [activeTab, setActiveTab] = useState<Tab>("records");
  const [page, setPage] = useState(1);
  const [expandedSession, setExpandedSession] = useState<number | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  // 搜尋篩選
  const [accountInput, setAccountInput] = useState("");
  const [bookInput, setBookInput] = useState("");
  const [appliedAccount, setAppliedAccount] = useState("");
  const [appliedBook, setAppliedBook] = useState("");

  // 時間範圍
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // 統計狀態
  const [statsResult, setStatsResult] = useState<{
    categories: { name: string; count: number; examples?: string[] }[];
    total: number;
  } | null>(null);
  const [statsChartType, setStatsChartType] = useState<"pie" | "bar">("bar");
  const statsRef = useRef<HTMLDivElement>(null);

  // 個人統計 Modal
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState("");

  const statsMutation = trpc.tutorAdminRecords.getQuestionStats.useMutation({
    onSuccess: (data) => setStatsResult(data),
  });

  const { data: userStats, isLoading: userStatsLoading } = trpc.tutorAdminRecords.getUserStats.useQuery(
    { userId: selectedUserId! },
    { enabled: selectedUserId !== null }
  );

  // 全量匯出
  const exportQuery = trpc.tutorAdminRecords.exportAll.useQuery(
    {
      search: appliedAccount || undefined,
      bookSearch: appliedBook || undefined,
      ...getDateRange(dateRange, customFrom, customTo),
    },
    { enabled: false }
  );

  const applyFilters = useCallback(() => {
    setPage(1);
    setAppliedAccount(accountInput.trim());
    setAppliedBook(bookInput.trim());
  }, [accountInput, bookInput]);

  const clearFilters = useCallback(() => {
    setAccountInput("");
    setBookInput("");
    setAppliedAccount("");
    setAppliedBook("");
    setDateRange("all");
    setCustomFrom("");
    setCustomTo("");
    setPage(1);
  }, []);

  const { dateFrom, dateTo } = getDateRange(dateRange, customFrom, customTo);

  const { data: records, isLoading } = trpc.tutorAdminRecords.getAll.useQuery({
    page,
    pageSize: 20,
    search: appliedAccount || undefined,
    bookSearch: appliedBook || undefined,
    dateFrom,
    dateTo,
  });

  const { data: sessionDetail } = trpc.tutorAdminRecords.getSessionDetail.useQuery(
    { sessionId: expandedSession! },
    { enabled: expandedSession !== null }
  );

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString("zh-TW", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });

  // CSV 全量匯出
  const handleExportAll = async () => {
    const result = await exportQuery.refetch();
    const data = result.data;
    if (!data || data.length === 0) return;
    const header = ["問答ID", "使用者", "Email", "書本", "問題內容", "時間", "是否隱藏"];
    const rows = data.map(r => [
      r.messageId,
      r.userName ?? "",
      r.userEmail ?? "",
      r.bookTitle ?? "",
      `"${(r.question ?? "").replace(/"/g, '""')}"`,
      formatDate(r.createdAt),
      r.isHidden ? "是" : "否",
    ]);
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `問答記錄_${new Date().toLocaleDateString("zh-TW").replace(/\//g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 統計報告 CSV 匯出
  const handleExportStatsCSV = () => {
    if (!statsResult) return;
    const header = ["類別", "問題數", "例題1", "例題2"];
    const rows = statsResult.categories.map(c => [
      c.name,
      c.count,
      `"${(c.examples?.[0] ?? "").replace(/"/g, '""')}"`,
      `"${(c.examples?.[1] ?? "").replace(/"/g, '""')}"`,
    ]);
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `問題分類統計_${new Date().toLocaleDateString("zh-TW").replace(/\//g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 統計報告 PDF 匯出（截圖）
  const handleExportStatsPDF = async () => {
    if (!statsRef.current) return;
    const canvas = await html2canvas(statsRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = imgData;
    link.download = `問題分類統計_${new Date().toLocaleDateString("zh-TW").replace(/\//g, "-")}.png`;
    link.click();
  };

  const runStats = () => {
    statsMutation.mutate({
      search: appliedAccount || undefined,
      bookSearch: appliedBook || undefined,
      sampleSize: 200,
      dateFrom,
      dateTo,
    });
  };

  const hasActiveFilter = appliedAccount || appliedBook || dateRange !== "all";

  const dateRangeLabel = {
    "7d": "最近 7 天",
    "30d": "最近 30 天",
    "custom": customFrom && customTo ? `${customFrom} ~ ${customTo}` : "自訂區間",
    "all": "",
  }[dateRange];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 標題列 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">AI 助教問答記錄</h1>
          <p className="text-sm text-muted-foreground mt-1">所有學生的 AI 助教對話記錄（包含學生已隱藏的對話）</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportAll} disabled={exportQuery.isFetching}>
            {exportQuery.isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            匯出 CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowHidden(!showHidden)}>
            {showHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showHidden ? "隱藏已刪除" : "顯示已刪除"}
          </Button>
        </div>
      </div>

      {/* 篩選列 */}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">帳號（暱稱 / Email）</label>
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 w-52" placeholder="搜尋暱稱或 Email..." value={accountInput}
              onChange={(e) => setAccountInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyFilters()} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">科目 / 書本名稱</label>
          <div className="relative">
            <BookOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 w-52" placeholder="搜尋書本名稱..." value={bookInput}
              onChange={(e) => setBookInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyFilters()} />
          </div>
        </div>

        {/* 時間範圍 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">時間範圍</label>
          <div className="flex gap-1 border border-border rounded-lg p-0.5">
            {(["all", "7d", "30d", "custom"] as DateRange[]).map((r) => (
              <button key={r}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap ${dateRange === r ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => { setDateRange(r); setPage(1); }}
              >
                {r === "all" ? "全部" : r === "7d" ? "7 天" : r === "30d" ? "30 天" : "自訂"}
              </button>
            ))}
          </div>
        </div>

        {/* 自訂日期 */}
        {dateRange === "custom" && (
          <div className="flex items-end gap-1">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-medium">開始日期</label>
              <Input type="date" className="w-36 text-xs" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }} />
            </div>
            <span className="text-muted-foreground pb-2">~</span>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-medium">結束日期</label>
              <Input type="date" className="w-36 text-xs" value={customTo} onChange={(e) => { setCustomTo(e.target.value); setPage(1); }} />
            </div>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <Button size="sm" className="gap-1.5" onClick={applyFilters}>
            <Search className="w-4 h-4" />搜尋
          </Button>
          {hasActiveFilter && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={clearFilters}>
              <X className="w-4 h-4" />清除
            </Button>
          )}
        </div>
      </div>

      {/* 已套用篩選標籤 */}
      {hasActiveFilter && (
        <div className="flex flex-wrap gap-2 mb-4">
          {appliedAccount && (
            <Badge variant="secondary" className="gap-1">
              帳號：{appliedAccount}
              <button onClick={() => { setAccountInput(""); setAppliedAccount(""); setPage(1); }}><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {appliedBook && (
            <Badge variant="secondary" className="gap-1">
              書本：{appliedBook}
              <button onClick={() => { setBookInput(""); setAppliedBook(""); setPage(1); }}><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {dateRange !== "all" && dateRangeLabel && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="w-3 h-3" />{dateRangeLabel}
              <button onClick={() => { setDateRange("all"); setPage(1); }}><X className="w-3 h-3" /></button>
            </Badge>
          )}
        </div>
      )}

      {/* Tab 切換 */}
      <div className="flex gap-1 border-b border-border mb-6">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "records" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("records")}
        >
          <MessageSquare className="w-4 h-4 inline mr-1.5" />問答記錄
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "stats" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("stats")}
        >
          <BarChart2 className="w-4 h-4 inline mr-1.5" />問題分類統計
        </button>
      </div>

      {/* ── 問答記錄 Tab ── */}
      {activeTab === "records" && (
        <>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">載入中...</div>
          ) : !records || records.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>沒有符合條件的問答記錄</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((row) => (
                <div key={row.messageId}
                  className={`border border-border rounded-lg overflow-hidden ${row.isHidden ? "opacity-60 bg-muted/30" : "bg-card"}`}
                >
                  <div className="px-4 py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {/* 點擊學生名稱開啟個人統計 */}
                        <button
                          className="flex items-center gap-1 text-xs hover:text-primary transition-colors group"
                          onClick={() => {
                            setSelectedUserId(row.userId);
                            setSelectedUserName(row.userName ?? "未知用戶");
                          }}
                        >
                          <User className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                          <span className="font-medium text-foreground group-hover:text-primary underline underline-offset-2 decoration-dashed">
                            {row.userName ?? "未知用戶"}
                          </span>
                          {row.userEmail && (
                            <span className="text-muted-foreground">({row.userEmail})</span>
                          )}
                          <TrendingUp className="w-3 h-3 opacity-0 group-hover:opacity-100 text-primary" />
                        </button>
                        {row.bookTitle && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[160px]">{row.bookTitle}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate(row.createdAt)}</span>
                        </div>
                        {row.isHidden && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">已隱藏</Badge>}
                      </div>
                      <p className="text-sm font-medium line-clamp-2">{row.question}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"
                      onClick={() => setExpandedSession(expandedSession === row.sessionId ? null : row.sessionId)}
                    >
                      {expandedSession === row.sessionId ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>

                  {expandedSession === row.sessionId && (
                    <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3 max-h-[500px] overflow-y-auto">
                      {sessionDetail ? (
                        sessionDetail.messages.map((msg) => (
                          <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-background border border-border"}`}>
                              {msg.role === "assistant" ? <Streamdown>{msg.content}</Streamdown> : <p>{msg.content}</p>}
                              <p className="text-[10px] opacity-60 mt-1">{formatDate(msg.createdAt)}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-2">載入對話中...</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-center gap-3 mt-6">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一頁</Button>
            <span className="text-sm text-muted-foreground">第 {page} 頁</span>
            <Button variant="outline" size="sm" disabled={!records || records.length < 20} onClick={() => setPage(p => p + 1)}>下一頁</Button>
          </div>
        </>
      )}

      {/* ── 問題分類統計 Tab ── */}
      {activeTab === "stats" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              使用 AI 分析最近 200 筆問題，自動歸納主題類別分佈。
              {hasActiveFilter && <span className="text-primary ml-1">（依目前篩選條件）</span>}
            </p>
            <div className="flex gap-2">
              {statsResult && (
                <>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportStatsCSV}>
                    <Download className="w-4 h-4" />匯出 CSV
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportStatsPDF}>
                    <Download className="w-4 h-4" />匯出圖片
                  </Button>
                </>
              )}
              <Button size="sm" className="gap-1.5" onClick={runStats} disabled={statsMutation.isPending}>
                {statsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {statsResult ? "重新分析" : "開始分析"}
              </Button>
            </div>
          </div>

          {statsMutation.isPending && (
            <div className="text-center py-16 text-muted-foreground">
              <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-primary" />
              <p className="font-medium">AI 正在分析問題類別...</p>
              <p className="text-xs mt-1">約需 10-20 秒</p>
            </div>
          )}

          {statsResult && !statsMutation.isPending && (
            <div ref={statsRef} className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-muted-foreground">
                  共分析 <span className="font-semibold text-foreground">{statsResult.total}</span> 筆問題，
                  歸納出 <span className="font-semibold text-foreground">{statsResult.categories.length}</span> 個類別
                  {dateRangeLabel && <span className="ml-1 text-primary">（{dateRangeLabel}）</span>}
                </p>
                <div className="flex gap-1 border border-border rounded-lg p-0.5">
                  <button className={`px-3 py-1 text-xs rounded-md transition-colors ${statsChartType === "bar" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setStatsChartType("bar")}>長條圖</button>
                  <button className={`px-3 py-1 text-xs rounded-md transition-colors ${statsChartType === "pie" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setStatsChartType("pie")}>圓餅圖</button>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                {statsChartType === "bar" ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={statsResult.categories} layout="vertical" margin={{ left: 20, right: 30 }}>
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
                      <Tooltip formatter={(v) => [`${v} 筆`, "問題數"]} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {statsResult.categories.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie data={statsResult.categories} dataKey="count" nameKey="name"
                        cx="50%" cy="50%" outerRadius={120}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {statsResult.categories.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v} 筆`, "問題數"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {statsResult.categories.map((cat, i) => (
                  <div key={i} className="border border-border rounded-xl p-4 bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="font-semibold text-sm">{cat.name}</span>
                      <Badge variant="secondary" className="ml-auto">{cat.count} 筆</Badge>
                    </div>
                    {cat.examples && cat.examples.length > 0 && (
                      <ul className="space-y-1">
                        {cat.examples.slice(0, 2).map((ex, j) => (
                          <li key={j} className="text-xs text-muted-foreground line-clamp-1">· {ex}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!statsResult && !statsMutation.isPending && (
            <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
              <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">點擊「開始分析」讓 AI 自動歸納問題類別</p>
              <p className="text-xs mt-1">可先設定篩選條件和時間範圍，針對特定科目或期間進行分析</p>
            </div>
          )}
        </div>
      )}

      {/* ── 個人學生統計 Modal ── */}
      {selectedUserId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedUserId(null)}>
          <div className="bg-background border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="font-bold text-base">{selectedUserName} 的提問統計</h2>
                {userStats?.userInfo?.email && (
                  <p className="text-xs text-muted-foreground mt-0.5">{userStats.userInfo.email}</p>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedUserId(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-5 space-y-5">
              {userStatsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm">AI 分析中...</p>
                </div>
              ) : userStats ? (
                <>
                  {/* 概覽 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/40 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-primary">{userStats.totalQuestions}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">總提問數</p>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-3 text-center">
                      <p className="text-sm font-semibold">
                        {userStats.recentActiveAt ? formatDate(userStats.recentActiveAt) : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">最近活躍</p>
                    </div>
                  </div>

                  {/* 書本使用 */}
                  {userStats.bookStats.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-muted-foreground" />常用書本
                      </h3>
                      <div className="space-y-2">
                        {userStats.bookStats.slice(0, 5).map((b, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}.</span>
                            <div className="flex-1 bg-muted/40 rounded-full h-5 overflow-hidden">
                              <div
                                className="h-full rounded-full flex items-center px-2"
                                style={{
                                  width: `${Math.max(20, (b.count / (userStats.bookStats[0]?.count || 1)) * 100)}%`,
                                  backgroundColor: COLORS[i % COLORS.length],
                                }}
                              >
                                <span className="text-[10px] text-white font-medium truncate">{b.title}</span>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground w-10 text-right">{b.count} 筆</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 問題類別 */}
                  {userStats.categories.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                        <BarChart2 className="w-4 h-4 text-muted-foreground" />常問類別
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {userStats.categories.map((c, i) => (
                          <Badge key={i} variant="secondary" className="gap-1.5 py-1 px-2.5">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            {c.name}
                            <span className="text-muted-foreground">{c.count}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-muted-foreground py-4 text-sm">無法載入統計資料</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
