import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Search, Flag, Trash2, AlertTriangle } from "lucide-react";

type ContentFlag = "normal" | "inappropriate" | "offtopic" | "spam";

const flagLabels: Record<ContentFlag, string> = {
  normal: "正常",
  inappropriate: "不雅內容",
  offtopic: "不相干",
  spam: "垃圾訊息",
};

const flagColors: Record<ContentFlag, string> = {
  normal: "bg-green-100 text-green-800",
  inappropriate: "bg-red-100 text-red-800",
  offtopic: "bg-yellow-100 text-yellow-800",
  spam: "bg-gray-100 text-gray-800",
};

export default function AdminQuestionManagement() {
  const [keyword, setKeyword] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>();
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();
  const [selectedFlag, setSelectedFlag] = useState<ContentFlag | undefined>();
  const [selectedMessages, setSelectedMessages] = useState<number[]>([]);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagNote, setFlagNote] = useState("");
  const [flagType, setFlagType] = useState<ContentFlag>("inappropriate");

  const utils = trpc.useUtils();

  // 獲取問題列表
  const { data: questions, isLoading } = trpc.questions.getList.useQuery({
    keyword,
    userId: selectedUserId,
    subject: selectedSubject,
    contentFlag: selectedFlag,
    limit: 100,
    offset: 0,
  });

  // 獲取問題統計
  const { data: stats } = trpc.questions.getStats.useQuery({});

  // 標記問題
  const flagMutation = trpc.questions.flag.useMutation({
    onSuccess: () => {
      utils.questions.getList.invalidate();
      utils.questions.getStats.invalidate();
      toast.success("標記成功");
      setFlagDialogOpen(false);
      setFlagNote("");
      setSelectedMessages([]);
    },
    onError: (error) => {
      toast.error("標記失敗：" + error.message);
    },
  });

  // 批量標記問題
  const batchFlagMutation = trpc.questions.batchFlag.useMutation({
    onSuccess: () => {
      utils.questions.getList.invalidate();
      utils.questions.getStats.invalidate();
      toast.success("批量標記成功");
      setFlagDialogOpen(false);
      setFlagNote("");
      setSelectedMessages([]);
    },
    onError: (error) => {
      toast.error("批量標記失敗：" + error.message);
    },
  });

  const handleFlag = (messageId: number) => {
    setSelectedMessages([messageId]);
    setFlagDialogOpen(true);
  };

  const handleBatchFlag = () => {
    if (selectedMessages.length === 0) {
      toast.error("請選擇至少一個問題");
      return;
    }
    setFlagDialogOpen(true);
  };

  const confirmFlag = () => {
    if (selectedMessages.length === 1) {
      flagMutation.mutate({
        messageId: selectedMessages[0],
        contentFlag: flagType,
        flagNote,
      });
    } else {
      batchFlagMutation.mutate({
        messageIds: selectedMessages,
        contentFlag: flagType,
        flagNote,
      });
    }
  };

  const toggleSelectMessage = (messageId: number) => {
    setSelectedMessages((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId]
    );
  };

  const selectAll = () => {
    if (questions) {
      setSelectedMessages(questions.map((q) => q.id));
    }
  };

  const deselectAll = () => {
    setSelectedMessages([]);
  };

  // 獲取唯一的學生列表
  const uniqueUsers = questions
    ? Array.from(new Set(questions.map((q) => ({ id: q.userId, name: q.userName }))))
        .filter((user, index, self) => 
          index === self.findIndex((u) => u.id === user.id)
        )
    : [];

  // 獲取唯一的科目列表
  const uniqueSubjects = questions
    ? Array.from(new Set(questions.map((q) => q.subject).filter(Boolean)))
    : [];

  return (
    <>
      
      <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            學生問題管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 篩選和搜尋 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜尋關鍵字..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={selectedUserId?.toString() || "all"}
              onValueChange={(value) =>
                setSelectedUserId(value === "all" ? undefined : Number(value))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="選擇學生" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有學生</SelectItem>
                {uniqueUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name || `用戶 ${user.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedSubject || "all"}
              onValueChange={(value) =>
                setSelectedSubject(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="選擇科目" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有科目</SelectItem>
                {uniqueSubjects.map((subject) => (
                  <SelectItem key={subject} value={subject!}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedFlag || "all"}
              onValueChange={(value) =>
                setSelectedFlag(value === "all" ? undefined : (value as ContentFlag))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="標記狀態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有狀態</SelectItem>
                {Object.entries(flagLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 批量操作 */}
          {selectedMessages.length > 0 && (
            <div className="flex items-center gap-4 mb-4 p-4 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium">
                已選擇 {selectedMessages.length} 個問題
              </span>
              <Button size="sm" onClick={handleBatchFlag}>
                <Flag className="w-4 h-4 mr-2" />
                批量標記
              </Button>
              <Button size="sm" variant="outline" onClick={deselectAll}>
                取消選擇
              </Button>
              <Button size="sm" variant="outline" onClick={selectAll}>
                全選
              </Button>
            </div>
          )}

          {/* 統計資訊 */}
          {stats && stats.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {stats.reduce((sum, s) => sum + Number(s.totalQuestions), 0)}
                  </div>
                  <div className="text-sm text-gray-500">總問題數</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {stats.reduce((sum, s) => sum + Number(s.flaggedQuestions), 0)}
                  </div>
                  <div className="text-sm text-gray-500">已標記問題</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{stats.length}</div>
                  <div className="text-sm text-gray-500">活躍學生數</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 問題列表 */}
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">載入中...</div>
          ) : questions && questions.length > 0 ? (
            <div className="space-y-4">
              {questions.map((question) => (
                <Card key={question.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedMessages.includes(question.id)}
                        onCheckedChange={() => toggleSelectMessage(question.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">
                            {question.userName || `用戶 ${question.userId}`}
                          </Badge>
                          {question.subject && (
                            <Badge variant="secondary">{question.subject}</Badge>
                          )}
                          <Badge className={flagColors[question.contentFlag as ContentFlag]}>
                            {flagLabels[question.contentFlag as ContentFlag]}
                          </Badge>
                          <span className="text-sm text-gray-500 ml-auto">
                            {new Date(question.createdAt).toLocaleString("zh-TW")}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{question.content}</p>
                        {question.flagNote && (
                          <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
                            <strong>標記說明：</strong> {question.flagNote}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFlag(question.id)}
                      >
                        <Flag className="w-4 h-4 mr-2" />
                        標記
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">沒有找到問題</div>
          )}
        </CardContent>
      </Card>

      {/* 標記對話框 */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedMessages.length === 1 ? "標記問題" : `批量標記 ${selectedMessages.length} 個問題`}
            </DialogTitle>
            <DialogDescription>
              選擇標記類型並添加說明（可選）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">標記類型</label>
              <Select
                value={flagType}
                onValueChange={(value) => setFlagType(value as ContentFlag)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(flagLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">標記說明（可選）</label>
              <Textarea
                placeholder="輸入標記說明..."
                value={flagNote}
                onChange={(e) => setFlagNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={confirmFlag}
              disabled={flagMutation.isPending || batchFlagMutation.isPending}
            >
              確認標記
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}
