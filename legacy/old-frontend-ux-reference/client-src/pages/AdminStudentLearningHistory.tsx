import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, MessageSquare, ChevronLeft, ChevronRight, Search, User, Clock, Tag } from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

export default function AdminStudentLearningHistory() {
  const [page, setPage] = useState(1);
  const [searchUserId, setSearchUserId] = useState("");
  const [selectedSession, setSelectedSession] = useState<{ id: number; userName: string; categoryName: string } | null>(null);

  const { data, isLoading } = trpc.knowledgeLearning.adminGetStudentLearningHistory.useQuery({
    page,
    pageSize: 20,
    userId: searchUserId ? Number(searchUserId) : undefined,
  });

  const { data: messagesData, isLoading: isLoadingMessages } = trpc.knowledgeLearning.adminGetStudentMessages.useQuery(
    { sessionId: selectedSession?.id ?? 0, limit: 100 },
    { enabled: !!selectedSession }
  );

  const { data: topicsData } = trpc.knowledgeLearning.adminGetStudentTopics.useQuery(
    { userId: selectedSession ? (data?.sessions.find(s => s.sessionId === selectedSession.id)?.userId ?? 0) : 0,
      categoryId: selectedSession ? (data?.sessions.find(s => s.sessionId === selectedSession.id)?.categoryId ?? undefined) : undefined },
    { enabled: !!selectedSession }
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("zh-TW", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          學生學習歷程
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">查看所有學生在智能課堂的學習記錄與對話歷史</p>
      </div>

      {/* 搜尋列 */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="輸入學生 ID 篩選..."
            value={searchUserId}
            onChange={e => { setSearchUserId(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        {searchUserId && (
          <Button variant="outline" onClick={() => { setSearchUserId(""); setPage(1); }}>
            清除篩選
          </Button>
        )}
      </div>

      {/* 統計卡片 */}
      {data && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-primary">{data.total}</div>
              <div className="text-sm text-muted-foreground">學習 Sessions 總數</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-primary">
                {data.sessions.reduce((sum, s) => sum + s.messageCount, 0)}
              </div>
              <div className="text-sm text-muted-foreground">本頁對話訊息數</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-primary">
                {data.sessions.reduce((sum, s) => sum + s.learnedTopicsCount, 0)}
              </div>
              <div className="text-sm text-muted-foreground">本頁已學主題數</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 學習記錄列表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">學習記錄列表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">載入中...</div>
          ) : !data?.sessions.length ? (
            <div className="p-8 text-center text-muted-foreground">尚無學習記錄</div>
          ) : (
            <div className="divide-y">
              {data.sessions.map(session => (
                <div
                  key={session.sessionId}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedSession({
                    id: session.sessionId,
                    userName: session.userName || `用戶 ${session.userId}`,
                    categoryName: session.categoryName || `類科 ${session.categoryId}`,
                  })}
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm">{session.userName || `用戶 ${session.userId}`}</span>
                      <span className="text-xs text-muted-foreground">{session.userEmail || ""}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {session.categoryName || `類科 ${session.categoryId}`}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {session.messageCount} 則對話
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {session.learnedTopicsCount} 個已學主題
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(session.updatedAt)}
                    </div>
                    {session.lastMessage && (
                      <div className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                        {session.lastMessage}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    查看詳情
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 分頁 */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-5">
          <Button
            variant="outline" size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            第 {page} / {data.totalPages} 頁（共 {data.total} 筆）
          </span>
          <Button
            variant="outline" size="sm"
            disabled={page >= data.totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* 對話詳情 Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={open => !open && setSelectedSession(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              {selectedSession?.userName} — {selectedSession?.categoryName}
            </DialogTitle>
          </DialogHeader>

          {/* 已學主題 */}
          {topicsData?.topics && topicsData.topics.length > 0 && (
            <div className="px-1 pb-2">
              <div className="text-xs font-medium text-muted-foreground mb-2">已學主題（{topicsData.topics.length} 個）</div>
              <div className="flex flex-wrap gap-1.5">
                {topicsData.topics.map((t, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    ✅ {t.topic}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 對話記錄 */}
          <ScrollArea className="flex-1 pr-2">
            {isLoadingMessages ? (
              <div className="p-4 text-center text-muted-foreground text-sm">載入中...</div>
            ) : !messagesData?.messages.length ? (
              <div className="p-4 text-center text-muted-foreground text-sm">尚無對話記錄</div>
            ) : (
              <div className="space-y-3 py-1">
                {messagesData.messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}>
                      {msg.role === "user" ? (
                        <p>{msg.content}</p>
                      ) : (
                        <MarkdownRenderer content={msg.content} />
                      )}
                      <div className={`text-xs mt-1 ${msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {formatDate(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
