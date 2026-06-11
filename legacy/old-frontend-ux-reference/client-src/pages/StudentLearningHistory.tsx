import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, MessageSquare, CheckCircle2, Clock, ChevronRight, ArrowLeft } from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useLocation } from "wouter";

export default function StudentLearningHistory() {
  const [, navigate] = useLocation();
  const [selectedSession, setSelectedSession] = useState<{ id: number; categoryName: string } | null>(null);

  const { data, isLoading } = trpc.knowledgeLearning.getMyLearningHistory.useQuery();

  const { data: messagesData, isLoading: isLoadingMessages } = trpc.knowledgeLearning.getMyMessages.useQuery(
    { sessionId: selectedSession?.id ?? 0, limit: 100 },
    { enabled: !!selectedSession }
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("zh-TW", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const totalTopics = data?.sessions.reduce((sum, s) => sum + s.learnedTopics.length, 0) ?? 0;
  const totalMessages = data?.sessions.reduce((sum, s) => sum + s.messageCount, 0) ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 頁首 */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1 as any)} className="gap-1">
          <ArrowLeft className="w-4 h-4" />
          返回
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            我的學習歷程
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">查看你在智能課堂的學習記錄</p>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-3xl font-bold text-primary">{data?.sessions.length ?? 0}</div>
            <div className="text-sm text-muted-foreground mt-1">學習類科</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-3xl font-bold text-green-600">{totalTopics}</div>
            <div className="text-sm text-muted-foreground mt-1">已學主題</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{totalMessages}</div>
            <div className="text-sm text-muted-foreground mt-1">對話輪次</div>
          </CardContent>
        </Card>
      </div>

      {/* 類科學習卡片列表 */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">載入中...</div>
      ) : !data?.sessions.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">尚未開始任何類科的學習</p>
            <Button className="mt-4" onClick={() => navigate("/student/knowledge-learning")}>
              前往智能課堂
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.sessions.map(session => (
            <Card
              key={session.sessionId}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedSession({ id: session.sessionId, categoryName: session.categoryName || `類科 ${session.categoryId}` })}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-base">{session.categoryName || `類科 ${session.categoryId}`}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(session.updatedAt)}
                      </div>
                    </div>

                    {/* 統計數字 */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {session.messageCount} 則對話
                      </span>
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {session.learnedTopics.length} 個已學主題
                      </span>
                    </div>

                    {/* 已學主題標籤 */}
                    {session.learnedTopics.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {session.learnedTopics.slice(0, 6).map((topic, i) => (
                          <Badge key={i} variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                            ✅ {topic}
                          </Badge>
                        ))}
                        {session.learnedTopics.length > 6 && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            +{session.learnedTopics.length - 6} 個
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 對話記錄 Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={open => !open && setSelectedSession(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              {selectedSession?.categoryName} — 對話記錄
            </DialogTitle>
          </DialogHeader>

          {/* 已學主題 */}
          {selectedSession && (() => {
            const session = data?.sessions.find(s => s.sessionId === selectedSession.id);
            if (!session?.learnedTopics.length) return null;
            return (
              <div className="px-1 pb-2">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  已學主題（{session.learnedTopics.length} 個）
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {session.learnedTopics.map((t, i) => (
                    <Badge key={i} variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                      ✅ {t}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* 對話訊息 */}
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

          {/* 繼續學習按鈕 */}
          <div className="pt-2 border-t">
            <Button
              className="w-full"
              onClick={() => {
                const session = data?.sessions.find(s => s.sessionId === selectedSession?.id);
                if (session) navigate(`/student/knowledge-learning/${session.categoryId}`);
                setSelectedSession(null);
              }}
            >
              繼續學習這個類科
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
