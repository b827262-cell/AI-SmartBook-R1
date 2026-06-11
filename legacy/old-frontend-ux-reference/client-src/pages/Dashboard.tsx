import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BarChart3, BookOpen, Clock, Home, Loader2, MessageSquare, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [dateRange, setDateRange] = useState<"week" | "month" | "all">("month");

  // 計算日期範圍
  const getDateRange = () => {
    const endDate = new Date();
    let startDate = new Date();

    if (dateRange === "week") {
      startDate.setDate(endDate.getDate() - 7);
    } else if (dateRange === "month") {
      startDate.setDate(endDate.getDate() - 30);
    } else {
      // all - 不設定開始日期
      return { startDate: undefined, endDate: undefined };
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  };

  const { startDate, endDate } = getDateRange();

  // 查詢統計數據
  const statsQuery = trpc.stats.getUserStats.useQuery({
    startDate,
    endDate,
  });

  const stats = statsQuery.data;

  // 圖表顏色
  const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 頂部導航 */}
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
              <Home className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">學習統計</h1>
          </div>
          <Button onClick={() => setLocation("/chat")}>
            <MessageSquare className="w-4 h-4 mr-2" />
            開始學習
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* 日期範圍選擇器 */}
        <div className="flex justify-end mb-6 gap-2">
          <Button
            variant={dateRange === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setDateRange("week")}
          >
            最近一週
          </Button>
          <Button
            variant={dateRange === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setDateRange("month")}
          >
            最近一月
          </Button>
          <Button
            variant={dateRange === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setDateRange("all")}
          >
            全部
          </Button>
        </div>

        {statsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* 概覽卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">總對話數</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.conversationCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">累計對話次數</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">總提問數</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.messageCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">累計提問次數</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">學習時間</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.floor(stats.studyMinutes / 60)}h {stats.studyMinutes % 60}m
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">累計學習時長</p>
                </CardContent>
              </Card>
            </div>

            {/* 學習趨勢圖 */}
            {stats.weeklyTrend && stats.weeklyTrend.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    每週學習趨勢
                  </CardTitle>
                  <CardDescription>最近4週的對話數量和學習時間</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.weeklyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="對話數" />
                      <Bar yAxisId="right" dataKey="minutes" fill="#8b5cf6" name="學習時間(分)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* 科目分布圓餅圖 */}
            {stats.subjectDistribution && stats.subjectDistribution.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    科目分布
                  </CardTitle>
                  <CardDescription>各科目的對話數量分布</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.subjectDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ subject, percent }) =>
                            `${subject} (${(percent * 100).toFixed(0)}%)`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {stats.subjectDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* 科目列表 */}
                    <div className="flex-1 w-full">
                      <div className="space-y-2">
                        {stats.subjectDistribution.map((item, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <span className="text-sm">{item.subject}</span>
                            </div>
                            <span className="text-sm font-medium">{item.count} 次</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 空狀態 */}
            {stats.conversationCount === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">還沒有學習記錄</h3>
                  <p className="text-sm text-muted-foreground mb-4">開始你的第一次對話吧！</p>
                  <Button onClick={() => setLocation("/chat")}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    開始學習
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">無法載入統計數據</p>
          </div>
        )}
      </div>
    </div>
  );
}
