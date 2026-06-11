import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, Loader2, Database, TrendingUp, ExternalLink, Trash2 } from "lucide-react";


/**
 * 管理員爬蟲管理頁面
 * 啟動爬蟲、查看爬取結果、統計分析
 */
export function CrawlerManagement() {
  const toast = (options: any) => {
    alert(options.title + "\n" + options.description);
  };
  const [selectedSource, setSelectedSource] = useState<"all" | "ibrain" | "gaodian" | "yuanzhao" | "betamedia">("all");
  const [selectedType, setSelectedType] = useState<"course" | "book" | "article" | "event" | undefined>(undefined);

  // 獲取爬蟲統計
  const { data: stats, refetch: refetchStats } = trpc.crawler.getStats.useQuery();

  // 獲取資源列表
  const { data: resources, refetch: refetchResources } = trpc.crawler.getResources.useQuery({
    source: selectedSource === "all" ? undefined : selectedSource,
    type: selectedType,
    limit: 50,
    offset: 0,
  });

  // 啟動爬蟲
  const startCrawlMutation = trpc.crawler.startCrawl.useMutation({
    onSuccess: (data) => {
      const successCount = data.results.filter((r) => r.success).length;
      const failCount = data.results.filter((r) => !r.success).length;

      toast({
        title: "爬蟲任務完成",
        description: `成功：${successCount} 個，失敗：${failCount} 個`,
      });

      refetchStats();
      refetchResources();
    },
    onError: (error) => {
      toast({
        title: "爬蟲任務失敗",
        description: error.message,

      });
    },
  });

  // 刪除資源
  const deleteResourceMutation = trpc.crawler.deleteResource.useMutation({
    onSuccess: () => {
      toast({
        title: "刪除成功",
        description: "資源已刪除",
      });
      refetchResources();
      refetchStats();
    },
    onError: (error) => {
      toast({
        title: "刪除失敗",
        description: error.message,

      });
    },
  });

  const handleStartCrawl = (source: "all" | "ibrain" | "gaodian" | "yuanzhao" | "betamedia") => {
    startCrawlMutation.mutate({ source });
  };

  const handleDeleteResource = (id: number) => {
    if (confirm("確定要刪除這個資源嗎？")) {
      deleteResourceMutation.mutate({ id });
    }
  };

  const getSourceName = (source: string) => {
    switch (source) {
      case "ibrain":
        return "知識達";
      case "gaodian":
        return "高點";
      case "yuanzhao":
        return "元照";
      case "betamedia":
        return "Beta 多媒體";
      default:
        return source;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case "course":
        return "課程";
      case "book":
        return "書籍";
      case "article":
        return "文章";
      case "event":
        return "活動";
      default:
        return type;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "ibrain":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "gaodian":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "yuanzhao":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      case "betamedia":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        {/* 標題 */}
        <div>
          <h1 className="text-3xl font-bold">爬蟲管理</h1>
          <p className="text-muted-foreground mt-2">管理外部資源爬蟲，自動收集課程和教材資訊</p>
        </div>

        {/* 統計卡片 */}
        {stats && (
          <div className="grid md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">總資源數</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">知識達</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats.bySource.ibrain}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">高點</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.bySource.gaodian}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">元照</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{stats.bySource.yuanzhao}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Beta 多媒體</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{stats.bySource.betamedia}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 爬蟲控制 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              啟動爬蟲
            </CardTitle>
            <CardDescription>選擇要爬取的網站來源</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => handleStartCrawl("all")}
                disabled={startCrawlMutation.isPending}
                className="flex items-center gap-2"
              >
                {startCrawlMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
                全部爬取
              </Button>

              <Button
                onClick={() => handleStartCrawl("ibrain")}
                disabled={startCrawlMutation.isPending}
                variant="outline"
              >
                知識達
              </Button>

              <Button
                onClick={() => handleStartCrawl("gaodian")}
                disabled={startCrawlMutation.isPending}
                variant="outline"
              >
                高點
              </Button>

              <Button
                onClick={() => handleStartCrawl("yuanzhao")}
                disabled={startCrawlMutation.isPending}
                variant="outline"
              >
                元照
              </Button>

              <Button
                onClick={() => handleStartCrawl("betamedia")}
                disabled={startCrawlMutation.isPending}
                variant="outline"
              >
                Beta 多媒體
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 資源列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              爬取結果
            </CardTitle>
            <CardDescription>查看已爬取的外部資源</CardDescription>
          </CardHeader>
          <CardContent>
            {/* 篩選器 */}
            <div className="mb-4 flex gap-4">
              <Tabs value={selectedSource} onValueChange={(value: any) => setSelectedSource(value)}>
                <TabsList>
                  <TabsTrigger value="all">全部</TabsTrigger>
                  <TabsTrigger value="ibrain">知識達</TabsTrigger>
                  <TabsTrigger value="gaodian">高點</TabsTrigger>
                  <TabsTrigger value="yuanzhao">元照</TabsTrigger>
                  <TabsTrigger value="betamedia">Beta</TabsTrigger>
                </TabsList>
              </Tabs>

              <Tabs value={selectedType || "all"} onValueChange={(value: any) => setSelectedType(value === "all" ? undefined : value)}>
                <TabsList>
                  <TabsTrigger value="all">全部類型</TabsTrigger>
                  <TabsTrigger value="course">課程</TabsTrigger>
                  <TabsTrigger value="book">書籍</TabsTrigger>
                  <TabsTrigger value="article">文章</TabsTrigger>
                  <TabsTrigger value="event">活動</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* 資源表格 */}
            {resources && resources.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>來源</TableHead>
                      <TableHead>類型</TableHead>
                      <TableHead>標題</TableHead>
                      <TableHead>分類</TableHead>
                      <TableHead>爬取時間</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resources.map((resource) => (
                      <TableRow key={resource.id}>
                        <TableCell>
                          <Badge className={getSourceColor(resource.source)}>
                            {getSourceName(resource.source)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTypeName(resource.type)}</Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{resource.title}</span>
                            <a
                              href={resource.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </TableCell>
                        <TableCell>{resource.category || "-"}</TableCell>
                        <TableCell>
                          {new Date(resource.crawledAt).toLocaleDateString("zh-TW")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteResource(resource.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                尚無爬取資料，請點擊上方按鈕開始爬取
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
