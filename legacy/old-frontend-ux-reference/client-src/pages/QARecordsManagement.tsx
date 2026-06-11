import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Eye } from "lucide-react";

export default function QARecordsManagement() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [answerSource, setAnswerSource] = useState<string | undefined>(undefined);
  const [isAccurate, setIsAccurate] = useState<boolean | undefined>(undefined);
  
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  // 查詢問答記錄列表
  const { data: recordsData, isLoading, refetch } = trpc.qaRecords.list.useQuery({
    page,
    pageSize,
    answerSource: answerSource as any,
    isAccurate,
  });

  // 查詢統計數據
  const { data: statsData } = trpc.qaRecords.getStats.useQuery();

  // 更新問答記錄
  const updateMutation = trpc.qaRecords.update.useMutation({
    onSuccess: () => {
      refetch();
      setIsVerifyDialogOpen(false);
      setSelectedRecord(null);
      setAdminNotes("");
    },
  });

  const handleViewDetail = (record: any) => {
    setSelectedRecord(record);
    setIsDetailDialogOpen(true);
  };

  const handleVerify = (record: any, accurate: boolean) => {
    setSelectedRecord(record);
    setIsVerifyDialogOpen(true);
    updateMutation.mutate({
      id: record.id,
      isAccurate: accurate,
      adminNotes,
    });
  };

  const getSourceBadge = (source: string) => {
    const badges: Record<string, { label: string; variant: any }> = {
      standard_answer: { label: "標準答案", variant: "default" },
      ai_generated: { label: "AI 生成", variant: "secondary" },
      hybrid: { label: "混合", variant: "outline" },
      cache: { label: "快取", variant: "destructive" },
    };
    const badge = badges[source] || { label: source, variant: "secondary" };
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">問答記錄管理</h1>
        <p className="text-muted-foreground">
          驗證 AI 回答的準確性，確保標準答案正確應用
        </p>
      </div>

      {/* 統計卡片 */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">總記錄數</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">準確率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.stats.accurateRate}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">已驗證</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.stats.accurateCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">總 Token</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.stats.totalTokens.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 篩選器 */}
      <div className="flex gap-4 mb-6">
        <Select value={answerSource || "all"} onValueChange={(v) => setAnswerSource(v === "all" ? undefined : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="答案來源" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有來源</SelectItem>
            <SelectItem value="standard_answer">標準答案</SelectItem>
            <SelectItem value="ai_generated">AI 生成</SelectItem>
            <SelectItem value="hybrid">混合</SelectItem>
            <SelectItem value="cache">快取</SelectItem>
          </SelectContent>
        </Select>

        <Select value={isAccurate === undefined ? "all" : isAccurate ? "true" : "false"} onValueChange={(v) => setIsAccurate(v === "all" ? undefined : v === "true")}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="準確度" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有記錄</SelectItem>
            <SelectItem value="true">準確</SelectItem>
            <SelectItem value="false">不準確</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 問答記錄列表 */}
      <Card>
        <CardHeader>
          <CardTitle>問答記錄</CardTitle>
          <CardDescription>
            共 {recordsData?.total || 0} 筆記錄
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">載入中...</div>
          ) : recordsData && recordsData.records.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>學生</TableHead>
                    <TableHead>問題</TableHead>
                    <TableHead>答案來源</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>時間</TableHead>
                    <TableHead>準確度</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recordsData.records.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.userName || "未知"}</TableCell>
                      <TableCell className="max-w-xs truncate">{record.questionText}</TableCell>
                      <TableCell>{getSourceBadge(record.answerSource)}</TableCell>
                      <TableCell>{record.tokenUsed || 0}</TableCell>
                      <TableCell>{new Date(record.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        {record.isAccurate === null ? (
                          <Badge variant="secondary">未驗證</Badge>
                        ) : record.isAccurate ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            準確
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" />
                            不準確
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetail(record)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            查看
                          </Button>
                          {record.isAccurate === null && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleVerify(record, true)}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                準確
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleVerify(record, false)}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                不準確
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 分頁 */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-muted-foreground">
                  第 {page} 頁，共 {recordsData.totalPages} 頁
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    上一頁
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= recordsData.totalPages}
                  >
                    下一頁
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              尚無問答記錄
            </div>
          )}
        </CardContent>
      </Card>

      {/* 詳細資訊對話框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>問答記錄詳情</DialogTitle>
            <DialogDescription>
              查看完整的問題和 AI 回答
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">學生問題：</h4>
                <p className="text-sm bg-muted p-3 rounded">{selectedRecord.questionText}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">AI 回答：</h4>
                <div className="text-sm bg-muted p-3 rounded">
                  <MarkdownRenderer>{selectedRecord.aiAnswer || ''}</MarkdownRenderer>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">答案來源：</span>
                  {getSourceBadge(selectedRecord.answerSource)}
                </div>
                <div>
                  <span className="font-semibold">Token 使用：</span>
                  {selectedRecord.tokenUsed || 0}
                </div>
                <div>
                  <span className="font-semibold">回應時間：</span>
                  {selectedRecord.responseTime || 0} ms
                </div>
                <div>
                  <span className="font-semibold">提問時間：</span>
                  {new Date(selectedRecord.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsDetailDialogOpen(false)}>關閉</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 驗證對話框 */}
      <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>驗證問答記錄</DialogTitle>
            <DialogDescription>
              標記此問答記錄的準確度並添加備註
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold">管理員備註（選填）：</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="添加備註..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVerifyDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                if (selectedRecord) {
                  updateMutation.mutate({
                    id: selectedRecord.id,
                    isAccurate: true,
                    adminNotes,
                  });
                }
              }}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
