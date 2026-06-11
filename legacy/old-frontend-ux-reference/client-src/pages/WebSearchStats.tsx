/**
 * 網路搜尋用量統計頁面（管理員專用）
 * 顯示每日/每月各引擎（Serper/Tavily/Bing/Google）的使用次數圖表
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, TrendingUp, Globe, BarChart2 } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

// 各引擎對應顏色
const ENGINE_COLORS: Record<string, string> = {
  Serper: "#3b82f6",
  Tavily: "#8b5cf6",
  Bing: "#f59e0b",
  Google: "#10b981",
};

const ENGINE_LIST = ["Serper", "Tavily", "Bing", "Google"];

export default function WebSearchStats() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState<"daily" | "monthly">("daily");
  const [days, setDays] = useState(30);

  // 查詢統計資料
  const statsQuery = trpc.stats.getWebSearchStats.useQuery({ period, days });
  const summaryQuery = trpc.stats.getWebSearchSummary.useQuery();

  // 將原始資料轉換為圖表格式
  const chartData = useMemo(() => {
    const raw: any[] = statsQuery.data?.data || [];
    if (!raw.length) return [];

    // 以日期/月份為 key，聚合各引擎數量
    const map: Record<string, Record<string, number>> = {};
    raw.forEach((row) => {
      const key = period === "daily" ? row.date : row.month;
      if (!map[key]) map[key] = {};
      map[key][row.engine] = Number(row.count);
    });

    return Object.entries(map).map(([label, engines]) => ({
      label,
      ...engines,
      total: Object.values(engines).reduce((a, b) => a + b, 0),
    }));
  }, [statsQuery.data, period]);

  const summary = summaryQuery.data;

  // 權限檢查
  if (!user) {
    return (
      <div className="container mx-auto py-8 text-center">
        <p className="text-muted-foreground">請先登入</p>
        <Button onClick={() => setLocation("/")}>返回首頁</Button>
      </div>
    );
  }
  if (user.role !== "admin") {
    return (
      <div className="container mx-auto py-8 text-center">
        <p className="text-muted-foreground">您沒有權限訪問此頁面</p>
        <Button onClick={() => setLocation("/")}>返回首頁</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto py-8">
        {/* 標題 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="w-8 h-8 text-primary" />
            網路搜尋用量統計
          </h1>
          <p className="text-muted-foreground mt-1">
            各搜尋引擎（Serper / Tavily / Bing / Google）的使用次數統計
          </p>
        </div>

        {/* 總覽卡片 */}
        {summaryQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {/* 今日 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">今日搜尋</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {Number(summary?.total?.today ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">次</p>
              </CardContent>
            </Card>
            {/* 近 7 天 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">近 7 天</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-500">
                  {Number(summary?.total?.last7days ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">次</p>
              </CardContent>
            </Card>
            {/* 近 30 天 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">近 30 天</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-500">
                  {Number(summary?.total?.last30days ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">次</p>
              </CardContent>
            </Card>
            {/* 累計 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">累計總計</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">
                  {Number(summary?.total?.total ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">次</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 各引擎分佈 */}
        {summary?.byEngine && summary.byEngine.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {summary.byEngine.map((row: any) => (
              <Card key={row.engine} style={{ borderTop: `4px solid ${ENGINE_COLORS[row.engine] || "#94a3b8"}` }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium" style={{ color: ENGINE_COLORS[row.engine] || "#94a3b8" }}>
                    {row.engine}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Number(row.total)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    近 30 天：{Number(row.last30days)} 次
                  </p>
                  <p className="text-xs text-muted-foreground">
                    今日：{Number(row.today)} 次
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 圖表控制列 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex gap-2">
            <Button
              variant={period === "daily" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod("daily")}
            >
              每日
            </Button>
            <Button
              variant={period === "monthly" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod("monthly")}
            >
              每月
            </Button>
          </div>
          {period === "daily" && (
            <div className="flex gap-2">
              {[7, 14, 30, 60].map((d) => (
                <Button
                  key={d}
                  variant={days === d ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDays(d)}
                >
                  {d} 天
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* 折線圖：各引擎每日/每月趨勢 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {period === "daily" ? `每日搜尋趨勢（近 ${days} 天）` : "每月搜尋趨勢（近 12 個月）"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="w-12 h-12 mb-3 opacity-30" />
                <p>尚無搜尋記錄</p>
                <p className="text-sm mt-1">當用戶使用網路搜尋功能後，資料將顯示於此</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => period === "daily" ? v.slice(5) : v}
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(value: any, name: string) => [value + " 次", name]}
                  />
                  <Legend />
                  {ENGINE_LIST.map((engine) => (
                    <Line
                      key={engine}
                      type="monotone"
                      dataKey={engine}
                      stroke={ENGINE_COLORS[engine]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 長條圖：各引擎用量比較 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5" />
              各引擎用量比較
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="w-12 h-12 mb-3 opacity-30" />
                <p>尚無搜尋記錄</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => period === "daily" ? v.slice(5) : v}
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(value: any, name: string) => [value + " 次", name]}
                  />
                  <Legend />
                  {ENGINE_LIST.map((engine) => (
                    <Bar
                      key={engine}
                      dataKey={engine}
                      fill={ENGINE_COLORS[engine]}
                      stackId="a"
                      radius={engine === "Google" ? [4, 4, 0, 0] : undefined}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
