import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function BehaviorAlerts() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical" | undefined>(undefined);
  const [alertType, setAlertType] = useState<
    "low_quality_questions" | "repeated_questions" | "unrelated_questions" | "abnormal_frequency" | "suspicious_behavior" | undefined
  >(undefined);
  const [isResolved, setIsResolved] = useState<boolean | undefined>(undefined);
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);

  const utils = trpc.useUtils();

  // 獲取異常警告列表
  const { data: alertsData, isLoading } = trpc.studentLearning.getBehaviorAlerts.useQuery({
    page,
    pageSize,
    severity,
    alertType,
    isResolved,
  });

  // 獲取統計資訊
  const { data: statsData } = trpc.studentLearning.getBehaviorStats.useQuery();

  // 標記為已處理
  const resolveMutation = trpc.studentLearning.resolveAlert.useMutation({
    onSuccess: () => {
      toast.success("警告已標記為已處理");
      setSelectedAlert(null);
      utils.studentLearning.getBehaviorAlerts.invalidate();
      utils.studentLearning.getBehaviorStats.invalidate();
    },
    onError: (error) => {
      toast.error(`操作失敗：${error.message}`);
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case "critical":
        return "嚴重";
      case "high":
        return "高";
      case "medium":
        return "中";
      case "low":
        return "低";
      default:
        return "未知";
    }
  };

  const getAlertTypeText = (alertType: string) => {
    switch (alertType) {
      case "low_quality_questions":
        return "低質量問題";
      case "repeated_questions":
        return "重複問題";
      case "unrelated_questions":
        return "無關問題";
      case "abnormal_frequency":
        return "異常頻率";
      case "suspicious_behavior":
        return "可疑行為";
      default:
        return alertType;
    }
  };

  const handleResolve = (alertId: number) => {
    resolveMutation.mutate({ alertId });
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">異常警告儀表板</h1>
          <p className="text-muted-foreground mt-2">監控學員學習行為，識別異常學習模式</p>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">總警告數</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsData?.alertStats.reduce((sum, stat) => sum + stat.count, 0) || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">平均問題質量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.qualityStats.averageQuality || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">總問題數</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.qualityStats.totalQuestions || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* 警告類型分布 */}
      {statsData && statsData.alertTypeStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              警告類型分布
            </CardTitle>
            <CardDescription>各類型警告的數量統計</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statsData.alertTypeStats.map((stat) => (
                <div key={stat.alertType} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="font-medium">{getAlertTypeText(stat.alertType)}</span>
                  <Badge variant="secondary">{stat.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 警告列表 */}
      <Card>
        <CardHeader>
          <CardTitle>警告列表</CardTitle>
          <CardDescription>點擊警告查看詳情並標記為已處理</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 篩選 */}
          <div className="flex items-center gap-4 mb-4">
            <Select
              value={severity || "all"}
              onValueChange={(value) => setSeverity(value === "all" ? undefined : value as any)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="嚴重程度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部嚴重程度</SelectItem>
                <SelectItem value="critical">嚴重</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={alertType || "all"}
              onValueChange={(value) => setAlertType(value === "all" ? undefined : value as any)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="警告類型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部類型</SelectItem>
                <SelectItem value="low_quality_questions">低質量問題</SelectItem>
                <SelectItem value="repeated_questions">重複問題</SelectItem>
                <SelectItem value="unrelated_questions">無關問題</SelectItem>
                <SelectItem value="abnormal_frequency">異常頻率</SelectItem>
                <SelectItem value="suspicious_behavior">可疑行為</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={isResolved === undefined ? "all" : isResolved ? "resolved" : "unresolved"}
              onValueChange={(value) =>
                setIsResolved(value === "all" ? undefined : value === "resolved")
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="處理狀態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部狀態</SelectItem>
                <SelectItem value="unresolved">未處理</SelectItem>
                <SelectItem value="resolved">已處理</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">載入中...</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>學員</TableHead>
                    <TableHead className="text-center">警告類型</TableHead>
                    <TableHead className="text-center">嚴重程度</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead className="text-center">狀態</TableHead>
                    <TableHead className="text-center">時間</TableHead>
                    <TableHead className="text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertsData?.records.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium">{alert.userName}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{getAlertTypeText(alert.alertType)}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getSeverityColor(alert.severity)}`} />
                          <span className="text-sm">{getSeverityText(alert.severity)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[400px]">
                        <p className="line-clamp-2">{alert.description}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        {alert.isResolved ? (
                          <Badge variant="secondary" className="flex items-center gap-1 w-fit mx-auto">
                            <CheckCircle className="h-3 w-3" />
                            已處理
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit mx-auto">
                            <XCircle className="h-3 w-3" />
                            未處理
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleString("zh-TW")}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          查看詳情
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 分頁 */}
              {alertsData && alertsData.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    共 {alertsData.total} 個警告，第 {alertsData.page} / {alertsData.totalPages} 頁
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      上一頁
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === alertsData.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      下一頁
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 警告詳情對話框 */}
      <Dialog open={selectedAlert !== null} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              警告詳情
            </DialogTitle>
            <DialogDescription>
              {selectedAlert?.userName} 的異常行為警告
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">警告類型</p>
                  <Badge variant="outline" className="mt-1">
                    {getAlertTypeText(selectedAlert.alertType)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">嚴重程度</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${getSeverityColor(selectedAlert.severity)}`} />
                    <span className="text-sm">{getSeverityText(selectedAlert.severity)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">學員</p>
                  <p className="text-sm mt-1">{selectedAlert.userName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">時間</p>
                  <p className="text-sm mt-1">
                    {new Date(selectedAlert.createdAt).toLocaleString("zh-TW")}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">描述</p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{selectedAlert.description}</p>
              </div>

              {selectedAlert.evidence && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">證據</p>
                  <div className="mt-1 p-3 bg-muted/50 rounded-lg">
                    <pre className="text-xs whitespace-pre-wrap">{selectedAlert.evidence}</pre>
                  </div>
                </div>
              )}

              {selectedAlert.sessionId && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">會話 ID</p>
                  <p className="text-xs mt-1 font-mono">{selectedAlert.sessionId}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground">處理狀態</p>
                <div className="mt-1">
                  {selectedAlert.isResolved ? (
                    <div className="space-y-1">
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                        <CheckCircle className="h-3 w-3" />
                        已處理
                      </Badge>
                      {selectedAlert.resolvedAt && (
                        <p className="text-xs text-muted-foreground">
                          處理時間：{new Date(selectedAlert.resolvedAt).toLocaleString("zh-TW")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                      <XCircle className="h-3 w-3" />
                      未處理
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAlert(null)}>
              關閉
            </Button>
            {selectedAlert && !selectedAlert.isResolved && (
              <Button
                onClick={() => handleResolve(selectedAlert.id)}
                disabled={resolveMutation.isPending}
              >
                {resolveMutation.isPending ? "處理中..." : "標記為已處理"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
