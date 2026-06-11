import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, FileText, Calendar } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { cleanMarkdown } from "@/lib/markdownCleaner";

export default function LearningNoteDetail() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const noteId = params.id ? parseInt(params.id) : 0;

  // 查詢學習筆記詳情
  const { data, isLoading } = trpc.learningNotes.getById.useQuery(
    { id: noteId },
    { enabled: !!user && noteId > 0 }
  );

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user || !data?.conversation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">學習筆記不存在</p>
            <Button className="mt-4" onClick={() => setLocation("/student/learning-notes")}>
              返回列表
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const conversation = data.conversation;
  const conversationData = conversation.conversationData as any;
  const messages = Array.isArray(conversationData) ? conversationData : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto py-12 px-4 max-w-4xl">
        {/* 標題區域 */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => setLocation("/student/learning-notes")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回列表
          </Button>
          <h1 className="text-3xl font-bold mb-2">
            {conversation.title || "未命名對話"}
          </h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>{conversation.materialTitle || "未知資料"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {conversation.updatedAt
                  ? format(new Date(conversation.updatedAt), "yyyy/MM/dd HH:mm", { locale: zhTW })
                  : "未知時間"}
              </span>
            </div>
            {conversation.pageNumber && (
              <span>第 {conversation.pageNumber} 頁</span>
            )}
          </div>
        </div>

        {/* 對話內容 */}
        <div className="space-y-4">
          {messages.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">沒有對話記錄</p>
              </CardContent>
            </Card>
          ) : (
            messages.map((message: any, index: number) => (
              <Card key={index} className={message.role === "user" ? "bg-primary/5" : ""}>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    {message.role === "user" ? "你" : "AI 學習助教"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* 文字內容（使用 Streamdown 渲染 Markdown） */}
                  {message.content && (
                    <div className="prose prose-sm max-w-none mb-4">
                      <MarkdownRenderer>{cleanMarkdown(cleanMarkdown(message.content))}</MarkdownRenderer>
                    </div>
                  )}
                  
                  {/* 圖片內容（嵌入在對話中） */}
                  {message.image && (
                    <div className="mt-4">
                      <img
                        src={message.image}
                        alt="對話截圖"
                        className="max-w-full rounded-lg border"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* 筆記區域 */}
        {conversation.notes && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>學習筆記</CardTitle>
              <CardDescription>你的個人筆記</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap">{conversation.notes}</div>
            </CardContent>
          </Card>
        )}

        {/* 操作按鈕（移除「繼續學習此資料」按鈕） */}
        <div className="mt-8">
          <Button
            variant="outline"
            onClick={() => setLocation("/student/learning-notes")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回列表
          </Button>
        </div>
      </div>
    </div>
  );
}
