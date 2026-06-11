import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, TrendingDown, Zap, Target } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function TokenStatsPage() {
  const [trendDays, setTrendDays] = useState(30);

  // 獲取 Token 使用總覽
  const { data: overview, isLoading: overviewLoading } = trpc.tokenStats.getOverview.useQuery();

  // 獲取每日 Token 使用趨勢
  const { data: dailyTrend, isLoading: trendLoading } = trpc.tokenStats.getDailyTrend.useQuery({
    days: trendDays,
  });

  // 獲取快取命中率趨勢
  const { data: cacheHitTrend } = trpc.tokenStats.getCacheHitTrend.useQuery({
    days: trendDays,
  });

  // 獲取按功能分類的統計
  const { data: featureStats } = trpc.tokenStats.getByFeature.useQuery();

  // 格式化數字
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`;
    }
    return num.toLocaleString();
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Token 使用統計</h1>
          <p className="text-muted-foreground mt-2">監控 AI Token 使用情況，優化成本效益</p>
        </div>
      </div>

      {/* 統計卡片 */}
      {overviewLoading ? (
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  總 Token 使用量
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(overview?.data.totalTokens || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  輸入: {formatNumber(overview?.data.totalInputTokens || 0)} | 輸出: {formatNumber(overview?.data.totalOutputTokens || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-green-500" />
                  快取節省 Token
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatNumber(overview?.data.tokensSaved || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  節省比例: {overview?.data.savingsRate || 0}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  快取命中次數
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{overview?.data.cacheHits || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  命中率: {overview?.data.cacheHitRate || 0}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  成本效益
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {overview?.data.savingsRate ? `${overview.data.savingsRate.toFixed(1)}%` : "0%"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  快取系統節省成本比例
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 每日 Token 使用趨勢圖表 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>每日 Token 使用趨勢</CardTitle>
                  <CardDescription>查看最近的 Token 使用情況</CardDescription>
                </div>
                <Select value={trendDays.toString()} onValueChange={(value) => setTrendDays(parseInt(value))}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="選擇時間範圍" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">最近 7 天</SelectItem>
                    <SelectItem value="14">最近 14 天</SelectItem>
                    <SelectItem value="30">最近 30 天</SelectItem>
                    <SelectItem value="60">最近 60 天</SelectItem>
                    <SelectItem value="90">最近 90 天</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {trendLoading ? (
                <div className="text-center py-8 text-muted-foreground">載入中...</div>
              ) : dailyTrend?.data.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">暫無數據</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyTrend?.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => formatNumber(value)}
                      labelFormatter={(label) => {
                        const date = new Date(label);
                        return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="totalTokens" stroke="#8884d8" name="總 Token" strokeWidth={2} />
                    <Line type="monotone" dataKey="inputTokens" stroke="#82ca9d" name="輸入 Token" strokeWidth={2} />
                    <Line type="monotone" dataKey="outputTokens" stroke="#ffc658" name="輸出 Token" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* 快取命中率趨勢圖表 */}
          <Card>
            <CardHeader>
              <CardTitle>快取命中率趨勢</CardTitle>
              <CardDescription>查看快取系統的效能表現</CardDescription>
            </CardHeader>
            <CardContent>
              {cacheHitTrend?.data.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">暫無數據</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={cacheHitTrend?.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === "節省 Token") {
                          return formatNumber(value);
                        }
                        return value;
                      }}
                      labelFormatter={(label) => {
                        const date = new Date(label);
                        return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="cacheHits" fill="#8884d8" name="快取命中次數" />
                    <Bar yAxisId="right" dataKey="tokensSaved" fill="#82ca9d" name="節省 Token" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* 按功能分類的統計 */}
          <Card>
            <CardHeader>
              <CardTitle>按功能分類統計</CardTitle>
              <CardDescription>查看不同功能的使用情況</CardDescription>
            </CardHeader>
            <CardContent>
              {featureStats?.data.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">暫無數據</div>
              ) : (
                <div className="space-y-4">
                  {featureStats?.data.map((stat) => (
                    <div key={stat.feature} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                          <span className="text-lg font-bold text-primary">{stat.feature.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium">{stat.feature}</p>
                          <p className="text-sm text-muted-foreground">對話數: {stat.conversationCount}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatNumber(stat.tokenUsage)}</p>
                        <p className="text-sm text-muted-foreground">Token 使用量</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
