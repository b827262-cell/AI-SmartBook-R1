import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Target, Clock, Award, AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function Stats() {
  const [, setLocation] = useLocation();
  // 獲取用戶答題統計
  const { data: stats, isLoading: statsLoading } = trpc.exam.getMyStats.useQuery();
  
  // 獲取所有科目（用於顯示科目名稱）
  const { data: subjects } = trpc.exam.getSubjects.useQuery();

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // 計算總體統計
  const totalQuestions = stats?.reduce((sum, s) => sum + s.totalQuestions, 0) || 0;
  const totalCorrect = stats?.reduce((sum, s) => sum + s.correctCount, 0) || 0;
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  // 準備科目正確率數據
  const subjectStatsData = stats?.map((stat) => {
    const subject = subjects?.find((s) => s.id === stat.subjectId);
    return {
      name: subject?.name || `科目 ${stat.subjectId}`,
      正確率: stat.accuracyRate,
      答題數: stat.totalQuestions,
    };
  }) || [];

  // 找出弱點科目（正確率 < 70%）
  const weakSubjects = subjectStatsData
    .filter((s) => s.正確率 < 70)
    .sort((a, b) => a.正確率 - b.正確率);

  // 準備圓餅圖數據（答題分布）
  const pieData = stats?.map((stat, index) => {
    const subject = subjects?.find((s) => s.id === stat.subjectId);
    return {
      name: subject?.name || `科目 ${stat.subjectId}`,
      value: stat.totalQuestions,
      color: COLORS[index % COLORS.length],
    };
  }) || [];

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/")}
          title="返回首頁"
        >
          <Home className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold mb-2">學習統計</h1>
          <p className="text-muted-foreground">
            追蹤你的學習進度，了解自己的強項和弱點
          </p>
        </div>
      </div>

      {/* 總體統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總答題數</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuestions}</div>
            <p className="text-xs text-muted-foreground">
              答對 {totalCorrect} 題
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">整體正確率</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallAccuracy}%</div>
            <p className="text-xs text-muted-foreground">
              {overallAccuracy >= 80 ? "表現優秀！" : overallAccuracy >= 60 ? "繼續加油！" : "需要加強"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">練習科目數</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              已涵蓋 {stats?.length || 0} 個科目
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 圖表區域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 科目正確率長條圖 */}
        <Card>
          <CardHeader>
            <CardTitle>各科目正確率</CardTitle>
            <CardDescription>查看你在各科目的表現</CardDescription>
          </CardHeader>
          <CardContent>
            {subjectStatsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectStatsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="正確率" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                尚無練習記錄
              </div>
            )}
          </CardContent>
        </Card>

        {/* 答題分布圓餅圖 */}
        <Card>
          <CardHeader>
            <CardTitle>答題分布</CardTitle>
            <CardDescription>各科目答題數量分布</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                尚無練習記錄
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 弱點分析 */}
      {weakSubjects.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              需要加強的科目
            </CardTitle>
            <CardDescription>
              這些科目的正確率較低，建議多加練習
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weakSubjects.map((subject, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold">{subject.name}</div>
                      <div className="text-sm text-muted-foreground">
                        已練習 {subject.答題數} 題
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={subject.正確率 < 50 ? "destructive" : "secondary"}>
                      正確率 {subject.正確率}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 科目詳細統計表格 */}
      <Card>
        <CardHeader>
          <CardTitle>科目詳細統計</CardTitle>
          <CardDescription>查看各科目的詳細練習數據</CardDescription>
        </CardHeader>
        <CardContent>
          {subjectStatsData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">科目</th>
                    <th className="text-center p-4 font-semibold">答題數</th>
                    <th className="text-center p-4 font-semibold">正確數</th>
                    <th className="text-center p-4 font-semibold">正確率</th>
                    <th className="text-center p-4 font-semibold">評價</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectStatsData.map((subject, index) => {
                    const stat = stats![index];
                    return (
                      <tr key={index} className="border-b hover:bg-accent">
                        <td className="p-4 font-medium">{subject.name}</td>
                        <td className="text-center p-4">{subject.答題數}</td>
                        <td className="text-center p-4">{stat.correctCount}</td>
                        <td className="text-center p-4">
                          <Badge variant={
                            subject.正確率 >= 80 ? "default" :
                            subject.正確率 >= 60 ? "secondary" : "destructive"
                          }>
                            {subject.正確率}%
                          </Badge>
                        </td>
                        <td className="text-center p-4 text-sm text-muted-foreground">
                          {subject.正確率 >= 80 ? "優秀" :
                           subject.正確率 >= 60 ? "良好" :
                           subject.正確率 >= 40 ? "及格" : "需加強"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              尚無練習記錄，開始練習以查看統計數據
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
