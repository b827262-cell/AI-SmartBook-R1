import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, AlertTriangle, TrendingUp, User, MessageSquare, Image as ImageIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function StudentRecords() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [detailPage, setDetailPage] = useState(1);
  const [viewImageDialogOpen, setViewImageDialogOpen] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [viewConversationDialogOpen, setViewConversationDialogOpen] = useState(false);
  const [viewingConversation, setViewingConversation] = useState<{
    sessionId?: string;
    conversationId?: number;
  } | null>(null);

  // 獲取學員記錄列表
  const { data: recordsData, isLoading } = trpc.studentLearning.getStudentRecords.useQuery({
    page,
    pageSize,
  });

  // 獲取學員詳細記錄
  const { data: studentDetail, isLoading: isLoadingDetail } = trpc.studentLearning.getStudentDetail.useQuery(
    {
      userId: selectedUserId!,
      page: detailPage,
      pageSize: 50,
    },
    { enabled: selectedUserId !== null }
  );

  const handleViewDetail = (userId: number) => {
    setSelectedUserId(userId);
    setDetailPage(1);
  };

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

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">學員學習記錄</h1>
          <p className="text-muted-foreground mt-2">查看所有學員的學習歷程、問題質量評分和異常警告</p>
        </div>
      </div>

      {/* 學員列表 */}
      <Card>
        <CardHeader>
          <CardTitle>學員列表</CardTitle>
          <CardDescription>點擊學員查看詳細學習記錄</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜尋學員姓名..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">載入中...</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>學員姓名</TableHead>
                    <TableHead className="text-center">總問題數</TableHead>
                    <TableHead className="text-center">平均質量評分</TableHead>
                    <TableHead className="text-center">快取命中數</TableHead>
                    <TableHead className="text-center">警告數</TableHead>
                    <TableHead className="text-center">未處理警告</TableHead>
                    <TableHead className="text-center">最後活動時間</TableHead>
                    <TableHead className="text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recordsData?.records.map((record) => (
                    <TableRow key={record.userId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{record.userName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{record.totalQuestions}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={Number(record.averageQuality) >= 7 ? "default" : "secondary"}>
                          {record.averageQuality}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{record.totalCacheHits}</TableCell>
                      <TableCell className="text-center">{record.totalAlerts}</TableCell>
                      <TableCell className="text-center">
                        {record.unresolvedAlerts > 0 ? (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {record.unresolvedAlerts}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {new Date(record.lastActivity).toLocaleString("zh-TW")}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetail(record.userId!)}
                        >
                          查看詳情
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 分頁 */}
              {recordsData && recordsData.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    共 {recordsData.total} 個學員，第 {recordsData.page} / {recordsData.totalPages} 頁
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
                      disabled={page === recordsData.totalPages}
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

      {/* 學員詳細記錄對話框 */}
      <Dialog open={selectedUserId !== null} onOpenChange={() => setSelectedUserId(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>學員詳細記錄</DialogTitle>
            <DialogDescription>
              {studentDetail?.user.name} 的完整學習歷程
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="text-center py-8 text-muted-foreground">載入中...</div>
          ) : studentDetail ? (
            <div className="space-y-6">
              {/* 統計卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">總問題數</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{studentDetail.stats.totalQuestions}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">平均質量評分</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{studentDetail.stats.averageQuality}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">快取命中數</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{studentDetail.stats.totalCacheHits}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">節省 Token</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{studentDetail.stats.tokensSaved.toLocaleString()}</div>
                  </CardContent>
                </Card>
              </div>

              {/* 異常警告 */}
              {studentDetail.alerts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      異常警告
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {studentDetail.alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`w-2 h-2 rounded-full ${getSeverityColor(alert.severity)}`} />
                            <div className="flex-1">
                              <p className="font-medium">{getAlertTypeText(alert.alertType)}</p>
                              <p className="text-sm text-muted-foreground">{alert.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={alert.isResolved ? "secondary" : "destructive"}>
                              {alert.isResolved ? "已處理" : "未處理"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(alert.createdAt).toLocaleString("zh-TW")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 問答記錄 */}
              <Card>
                <CardHeader>
                  <CardTitle>問答記錄</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>問題</TableHead>
                        <TableHead className="text-center">分類</TableHead>
                        <TableHead className="text-center">質量評分</TableHead>
                        <TableHead className="text-center">命中次數</TableHead>
                        <TableHead className="text-center">截圖</TableHead>
                        <TableHead className="text-center">對話</TableHead>
                        <TableHead className="text-center">時間</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentDetail.questions.map((question) => (
                        <TableRow key={question.id}>
                          <TableCell className="max-w-[400px]">
                            <p className="line-clamp-2">{question.question}</p>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{question.category}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={question.qualityScore && question.qualityScore >= 7 ? "default" : "secondary"}>
                              {question.qualityScore || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{question.hitCount}</TableCell>
                          <TableCell className="text-center">
                            {question.image ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setViewingImage(question.image);
                                  setViewImageDialogOpen(true);
                                }}
                              >
                                <ImageIcon className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {question.sessionId || question.conversationId ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setViewingConversation({
                                    sessionId: question.sessionId,
                                    conversationId: question.conversationId,
                                  });
                                  setViewConversationDialogOpen(true);
                                }}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {new Date(question.createdAt).toLocaleString("zh-TW")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* 分頁 */}
                  {studentDetail.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        共 {studentDetail.total} 個問答，第 {studentDetail.page} / {studentDetail.totalPages} 頁
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={detailPage === 1}
                          onClick={() => setDetailPage(detailPage - 1)}
                        >
                          上一頁
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={detailPage === studentDetail.totalPages}
                          onClick={() => setDetailPage(detailPage + 1)}
                        >
                          下一頁
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

          <DialogFooter>
            <Button onClick={() => setSelectedUserId(null)}>
              關閉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看截圖對話框 */}
      <Dialog open={viewImageDialogOpen} onOpenChange={setViewImageDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>查看截圖</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {viewingImage && (
              <img
                src={viewingImage}
                alt="學員截圖"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setViewImageDialogOpen(false)}>
              關閉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看完整對話對話框 */}
      <ViewConversationDialog
        open={viewConversationDialogOpen}
        onOpenChange={setViewConversationDialogOpen}
        sessionId={viewingConversation?.sessionId}
        conversationId={viewingConversation?.conversationId}
      />
    </div>
  );
}

// 查看完整對話的組件（與快取管理頁面共用）
function ViewConversationDialog({
  open,
  onOpenChange,
  sessionId,
  conversationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId?: string;
  conversationId?: number;
}) {
  const { data: conversation, isLoading } = trpc.studentLearning.getConversationBySessionId.useQuery(
    { sessionId: sessionId || "" },
    { enabled: open && !!sessionId }
  );

  const { data: conversationById, isLoading: isLoadingById } = trpc.studentLearning.getConversationById.useQuery(
    { conversationId: conversationId || 0 },
    { enabled: open && !!conversationId && !sessionId }
  );

  const messages = sessionId ? conversation?.messages : conversationById?.messages;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>完整對話記錄</DialogTitle>
          <DialogDescription>
            {sessionId ? `會話 ID: ${sessionId}` : conversationId ? `對話 ID: ${conversationId}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {isLoading || isLoadingById ? (
            <div className="text-center py-8 text-muted-foreground">載入中...</div>
          ) : messages && messages.length > 0 ? (
            messages.map((msg, index) => (
              <Card key={msg.id}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>第 {index + 1} 個問答</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleString("zh-TW")}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {msg.image && (
                    <div className="mb-3">
                      <Label className="text-sm font-semibold">截圖：</Label>
                      <img
                        src={msg.image}
                        alt="學員截圖"
                        className="mt-2 max-w-full max-h-[300px] object-contain rounded-lg border"
                      />
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-semibold">問題：</Label>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{msg.question}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">答案：</Label>
                    <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{msg.answer}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">沒有對話記錄</div>
          )}
        </div>
        <DialogFooter className="mt-6">
          <Button onClick={() => onOpenChange(false)}>
            關閉
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
