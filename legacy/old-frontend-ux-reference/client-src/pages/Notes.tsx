import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { ArrowLeft, Bookmark, Trash2, MessageSquare } from "lucide-react";
import { getLoginUrl } from "@/const";
import { MarkdownWithMath } from "@/components/MarkdownWithMath";
import { useState } from "react";

export default function Notes() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const savedAnswersQuery = trpc.savedAnswers.list.useQuery({}, {
    enabled: !!user,
  });

  const unsaveMutation = trpc.savedAnswers.unsave.useMutation({
    onSuccess: () => {
      toast.success("已移除收藏");
      savedAnswersQuery.refetch();
    },
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Bookmark className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">請先登入才能查看筆記</p>
        <Button onClick={() => window.location.href = getLoginUrl()}>登入</Button>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-6">
      {/* 頂部標題列 */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/chat")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">我的筆記</h1>
        </div>
        <span className="text-sm text-muted-foreground ml-auto">
          共 {savedAnswersQuery.data?.total ?? 0} 則收藏
        </span>
      </div>

      {/* 筆記列表 */}
      {savedAnswersQuery.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : savedAnswersQuery.data?.items && savedAnswersQuery.data.items.length > 0 ? (
        <div className="space-y-4">
          {savedAnswersQuery.data.items.map((item) => (
            <div key={item.id} className="border border-border rounded-xl p-4 bg-card">
              {/* 筆記標頭 */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString('zh-TW', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-primary"
                    onClick={() => setLocation("/chat")}
                  >
                    <MessageSquare className="w-3 h-3" />
                    繼續發問
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                    onClick={() => unsaveMutation.mutate({ id: item.id })}
                    disabled={unsaveMutation.isPending}
                  >
                    <Trash2 className="w-3 h-3" />
                    移除
                  </Button>
                </div>
              </div>

              {/* 筆記內容 */}
              <div
                className="cursor-pointer"
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              >
                {expandedId === item.id ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <MarkdownWithMath>{item.answer}</MarkdownWithMath>
                  </div>
                ) : (
                  <p className="text-sm text-foreground line-clamp-3 leading-relaxed">
                    {item.answer.slice(0, 200)}{item.answer.length > 200 ? '...' : ''}
                  </p>
                )}
                <p className="text-xs text-primary mt-2">
                  {expandedId === item.id ? '▲ 收合' : '▼ 展開全文'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bookmark className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">還沒有收藏的解說</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            在對話中點「☆ 收藏這個解說」即可儲存
          </p>
          <Button onClick={() => setLocation("/chat")}>
            <MessageSquare className="w-4 h-4 mr-2" />
            開始對話
          </Button>
        </div>
      )}
    </div>
  );
}
