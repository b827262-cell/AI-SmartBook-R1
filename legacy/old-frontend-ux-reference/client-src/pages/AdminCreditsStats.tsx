import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Users, TrendingUp, Activity, Coins } from "lucide-react";

export default function AdminCreditsStats() {
  // 獲取統計數據
  const statsByTypeQuery = trpc.credits.getStatsByType.useQuery();
  const statsByDateQuery = trpc.credits.getStatsByDate.useQuery({ days: 30 });
  const activityStatsQuery = trpc.credits.getUserActivityStats.useQuery();
  
  // 交易類型顯示名稱
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      image_upload: "上傳圖片",
      ai_analysis: "AI 解析",
      learning_screenshot: "學習截圖",
      classroom_upload: "智能課堂上傳",
      chapter_image_upload: "章節圖片上傳",
    };
    return labels[type] || type;
  };
  
  // 準備圖表數據
  const typeChartData = statsByTypeQuery.data?.stats?.map((stat) => ({
    name: getTypeLabel(stat.type),
    消耗點數: stat.totalAmount,
    使用次數: stat.count,
  })) || [];
  
  const dateChartData = statsByDateQuery.data?.stats?.map((stat) => ({
    日期: new Date(stat.date).toLocaleDateString("zh-TW", { month: "short", day: "numeric" }),
    消耗點數: stat.totalAmount,
    使用次數: stat.count,
  })) || [];
  
  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">點數統計儀表板</h1>
        <p className="text-muted-foreground mt-2">查看點數使用趨勢和用戶活躍度</p>
      </div>
      
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總用戶數</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activityStatsQuery.data?.totalUsers ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              註冊用戶總數
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活躍用戶數</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activityStatsQuery.data?.activeUsers ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              過去 7 天有交易記錄
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總交易數</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activityStatsQuery.data?.totalTransactions ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              所有點數交易記錄
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* 按功能分類圖表 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>點數消耗（按功能分類）</CardTitle>
          <CardDescription>各功能的點數消耗統計</CardDescription>
        </CardHeader>
        <CardContent>
          {statsByTypeQuery.isLoading ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              載入中...
            </div>
          ) : typeChartData.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              暫無數據
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={typeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="消耗點數" fill="#8884d8" />
                <Bar yAxisId="right" dataKey="使用次數" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      
      {/* 按日期分類圖表 */}
      <Card>
        <CardHeader>
          <CardTitle>點數消耗趨勢（過去 30 天）</CardTitle>
          <CardDescription>每日點數消耗和使用次數趨勢</CardDescription>
        </CardHeader>
        <CardContent>
          {statsByDateQuery.isLoading ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              載入中...
            </div>
          ) : dateChartData.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              暫無數據
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={dateChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="日期" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="消耗點數" stroke="#8884d8" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="使用次數" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
