import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, TrendingDown, Coins, Gift, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";

// 積分明細來源類型標籤
const refTypeLabels: Record<string, { label: string; color: string }> = {
  subtitle_correction: { label: "教材字幕校正", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  auditory_subtitle_correction: { label: "試聽館字幕校正", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  ai_usage: { label: "AI 使用", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  admin_grant: { label: "管理者贈點", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
};

function getRefTypeBadge(refType: string | null) {
  const info = refTypeLabels[refType ?? ""] ?? { label: refType ?? "其他", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.color}`}>{info.label}</span>;
}

// 交易類型顯示名稱（舊系統）
const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    initial_grant: "首次贈送",
    admin_add: "管理者加點",
    purchase: "購買點數",
    daily_reset: "每日重置",
    image_upload: "上傳圖片",
    ai_analysis: "AI 解析",
    learning_screenshot: "學習截圖",
    classroom_upload: "智能課堂上傳",
    chapter_image_upload: "章節圖片上傳",
    regenerate_outline: "重新生成大綱",
    regenerate_quiz: "重新生成考題",
  };
  return labels[type] || type;
};

const PAGE_SIZE = 20;

export default function CreditsHistory() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [logPage, setLogPage] = useState(0);

  // 獲取點數餘額
  const creditsQuery = trpc.credits.getBalance.useQuery();

  // 獲取點數交易記錄（舊系統）
  const transactionsQuery = trpc.credits.getTransactions.useQuery({ limit: 100 });

  // 獲取積分明細（新系統 user_points_log）
  const pointsLogQuery = trpc.points.getMyPointsLog.useQuery({
    limit: PAGE_SIZE,
    offset: logPage * PAGE_SIZE,
  });

  // 也取得積分餘額（user_points）
  const myPointsQuery = trpc.points.getMyPoints.useQuery();

  // 過濾舊交易記錄
  const filteredTransactions = transactionsQuery.data?.transactions?.filter((tx) => {
    if (typeFilter === "all") return true;
    if (typeFilter === "income") return tx.amount > 0;
    if (typeFilter === "expense") return tx.amount < 0;
    return true;
  }) || [];

  const totalLogPages = Math.ceil((pointsLogQuery.data?.total ?? 0) / PAGE_SIZE);

  return (
    <div className="container max-w-4xl py-8">
      {/* 返回按鈕 */}
      <Link href="/">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回首頁
        </Button>
      </Link>

      {/* 點數餘額卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* AI 點數（舊系統） */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Coins className="w-4 h-4 text-primary" />
              AI 使用點數
            </CardTitle>
            <CardDescription className="text-xs">用於 AI 問答、解析等功能</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">總點數</p>
                <p className="text-xl font-bold text-primary">{creditsQuery.data?.balance ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">永久點數</p>
                <p className="text-xl font-bold">{creditsQuery.data?.permanentCredits ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">每日點數</p>
                <p className="text-xl font-bold">{creditsQuery.data?.dailyCredits ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 積分（新系統） */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Gift className="w-4 h-4 text-amber-500" />
              貢獻積分
            </CardTitle>
            <CardDescription className="text-xs">字幕校正審核通過後獲得</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-0.5">累計積分</p>
              <p className="text-3xl font-bold text-amber-500">{myPointsQuery.data?.points ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">感謝您對課程內容的貢獻！</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 分頁標籤 */}
      <Tabs defaultValue="points-log">
        <TabsList className="mb-4">
          <TabsTrigger value="points-log" className="flex items-center gap-1">
            <Gift className="w-3.5 h-3.5" />
            積分明細
            {(pointsLogQuery.data?.total ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{pointsLogQuery.data?.total}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="credits-history" className="flex items-center gap-1">
            <Coins className="w-3.5 h-3.5" />
            AI 點數歷史
          </TabsTrigger>
        </TabsList>

        {/* 積分明細（新系統） */}
        <TabsContent value="points-log">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">積分異動明細</CardTitle>
              <CardDescription>記錄每次積分增減的原因與時間</CardDescription>
            </CardHeader>
            <CardContent>
              {pointsLogQuery.isLoading ? (
                <div className="text-center py-8 text-muted-foreground">載入中...</div>
              ) : (pointsLogQuery.data?.logs?.length ?? 0) === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Gift className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">尚無積分記錄</p>
                  <p className="text-xs mt-1">提交字幕校正並通過審核後，積分將自動累積</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {pointsLogQuery.data!.logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/40 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-full flex-shrink-0 ${log.delta > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                            {log.delta > 0 ? (
                              <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm">{log.reason}</p>
                              {log.refType && getRefTypeBadge(log.refType)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(log.createdAt).toLocaleString("zh-TW")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className={`text-base font-bold ${log.delta > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                            {log.delta > 0 ? '+' : ''}{log.delta}
                          </p>
                          <p className="text-xs text-muted-foreground">餘額 {log.balance}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 分頁控制 */}
                  {totalLogPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        第 {logPage + 1} / {totalLogPages} 頁，共 {pointsLogQuery.data?.total} 筆
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLogPage(p => Math.max(0, p - 1))}
                          disabled={logPage === 0}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLogPage(p => Math.min(totalLogPages - 1, p + 1))}
                          disabled={logPage >= totalLogPages - 1}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI 點數歷史（舊系統） */}
        <TabsContent value="credits-history">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">AI 點數歷史</CardTitle>
                  <CardDescription>查看您的 AI 功能使用記錄</CardDescription>
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="篩選" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="income">收入</SelectItem>
                    <SelectItem value="expense">支出</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {transactionsQuery.isLoading ? (
                <div className="text-center py-8 text-muted-foreground">載入中...</div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">暫無交易記錄</div>
              ) : (
                <div className="space-y-3">
                  {filteredTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${tx.amount > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                          {tx.amount > 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{getTypeLabel(tx.type)}</p>
                          <p className="text-xs text-muted-foreground">{tx.description || "無描述"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(tx.createdAt).toLocaleString("zh-TW")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-base font-bold ${tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </p>
                        <p className="text-xs text-muted-foreground">餘額: {tx.balanceAfter}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
