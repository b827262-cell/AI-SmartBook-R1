import { useAuth } from "@/_core/hooks/useAuth";
// import Navbar from "@/components/Navbar"; // 移除，避免重複導航列
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  BookOpen,
  Download,
  Home,
  Loader2,
  MessageSquare,
  MessageCircle,
  Megaphone,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [dateRange, setDateRange] = useState<"week" | "month" | "all">("month");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [questionPage, setQuestionPage] = useState(0);
  const pageSize = 20;

  // 計算日期範圍（使用 useMemo 避免每次渲染都創建新的 Date 物件）
  const { startDate, endDate } = useMemo(() => {
    const endDate = new Date();
    let startDate = new Date();

    if (dateRange === "week") {
      startDate.setDate(endDate.getDate() - 7);
    } else if (dateRange === "month") {
      startDate.setDate(endDate.getDate() - 30);
    } else {
      return { startDate: undefined, endDate: undefined };
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }, [dateRange]);

  // 查詢統計數據
  const adminStatsQuery = trpc.stats.getAdminStats.useQuery({
    startDate,
    endDate,
  });

  const questionsQuery = trpc.stats.getAllQuestions.useQuery({
    limit: pageSize,
    offset: questionPage * pageSize,
    startDate,
    endDate,
    subject: selectedSubject === "all" ? undefined : selectedSubject,
  });

  const keywordsQuery = trpc.stats.getCommonKeywords.useQuery({
    limit: 20,
  });

  const stats = adminStatsQuery.data;
  const questions = questionsQuery.data;
  const keywords = keywordsQuery.data;

  // 圖表顏色
  const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

  // 匯出 CSV
  const exportToCSV = () => {
    if (!questions) return;

    const headers = ["ID", "學生姓名", "科目", "問題內容", "提問時間"];
    const rows = questions.questions.map((q: any) => [
      q.id,
      q.userName || "未知",
      q.subject || "未分類",
      q.content.replace(/\n/g, " ").replace(/,/g, "，"), // 處理換行和逗號
      new Date(q.createdAt).toLocaleString("zh-TW"),
    ]);

    const csvContent =
      headers.join(",") + "\n" + rows.map((row) => row.join(",")).join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `questions_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  // 檢查是否為管理員
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-2">權限不足</h2>
            <p className="text-muted-foreground mb-4">您沒有權限訪問管理員後台</p>
            <Button onClick={() => setLocation("/")}>返回首頁</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 管理後台導航列 */}
      

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

        {adminStatsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">載入統計數據中...</p>
            </div>
          </div>
        ) : adminStatsQuery.isError ? (
          <div className="flex items-center justify-center py-12">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-bold mb-2 text-destructive">載入失敗</h2>
                <p className="text-muted-foreground mb-4">
                  {adminStatsQuery.error?.message || "無法載入統計數據，請稍後再試"}
                </p>
                <Button onClick={() => adminStatsQuery.refetch()}>重試</Button>
              </CardContent>
            </Card>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* 概覽卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">總用戶數</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground mt-1">註冊用戶</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">活躍用戶</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeUsers}</div>
                  <p className="text-xs text-muted-foreground mt-1">最近7天</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">總對話數</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalConversations}</div>
                  <p className="text-xs text-muted-foreground mt-1">累計對話</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">總訊息數</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalMessages}</div>
                  <p className="text-xs text-muted-foreground mt-1">累計訊息</p>
                </CardContent>
              </Card>
            </div>

            {/* Token 使用統計 */}
            {stats.tokenStats && (
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Token 使用統計
                  </CardTitle>
                  <CardDescription>
                    系統總 Token 使用量和節省費用
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">總 Token 使用量</div>
                      <div className="text-4xl font-bold">
                        {stats.tokenStats.totalTokens.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        輸入: {stats.tokenStats.inputTokens.toLocaleString()} | 輸出: {stats.tokenStats.outputTokens.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">使用 Manus AI</div>
                      <div className="text-2xl font-bold text-primary mt-2">
                        查看實際費用
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        <a href="https://manus.im/app/settings/website-usage-billing" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                          前往 Manus 後台查看 →
                        </a>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 每日對話趨勢 */}
            {stats.dailyTrend && stats.dailyTrend.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    每日對話趨勢
                  </CardTitle>
                  <CardDescription>最近30天的對話數量變化</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats.dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        name="對話數"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* 科目分布 */}
            {stats.subjectDistribution && stats.subjectDistribution.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    熱門科目統計
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

            {/* 常見問題關鍵字 */}
            {keywords && keywords.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>常見問題關鍵字</CardTitle>
                  <CardDescription>學生最常提問的關鍵字（前20個）</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((kw: any, index) => (
                      <div
                        key={index}
                        className="px-3 py-1 bg-primary/10 rounded-full text-sm flex items-center gap-2"
                      >
                        <span>{kw.keyword}</span>
                        <span className="text-xs text-muted-foreground">({kw.count})</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 學生問題列表 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>學生問題列表</CardTitle>
                    <CardDescription>所有學生的提問記錄</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="選擇科目" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部科目</SelectItem>
                        {stats.subjectDistribution.map((item) => (
                          <SelectItem key={item.subject} value={item.subject}>
                            {item.subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={exportToCSV}>
                      <Download className="w-4 h-4 mr-2" />
                      匯出 CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {questionsQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : questions && questions.questions.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">ID</TableHead>
                          <TableHead className="w-[120px]">學生</TableHead>
                          <TableHead className="w-[100px]">科目</TableHead>
                          <TableHead>問題內容</TableHead>
                          <TableHead className="w-[180px]">提問時間</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {questions.questions.map((q: any) => (
                          <TableRow key={q.id}>
                            <TableCell>{q.id}</TableCell>
                            <TableCell>{q.userName || "未知"}</TableCell>
                            <TableCell>
                              <span className="px-2 py-1 bg-primary/10 rounded text-xs">
                                {q.subject || "未分類"}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-md truncate">{q.content}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(q.createdAt).toLocaleString("zh-TW")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* 分頁 */}
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        顯示 {questionPage * pageSize + 1} -{" "}
                        {Math.min((questionPage + 1) * pageSize, questions.total)} / 共{" "}
                        {questions.total} 筆
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQuestionPage(Math.max(0, questionPage - 1))}
                          disabled={questionPage === 0}
                        >
                          上一頁
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQuestionPage(questionPage + 1)}
                          disabled={(questionPage + 1) * pageSize >= questions.total}
                        >
                          下一頁
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">沒有問題記錄</div>
                )}
              </CardContent>
            </Card>
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
