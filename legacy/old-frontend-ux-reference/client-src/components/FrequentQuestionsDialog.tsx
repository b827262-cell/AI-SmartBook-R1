import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, TrendingUp } from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FrequentQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: "exam" | "knowledge" | "learning_material" | "chapter" | "general";
  title?: string;
}

export function FrequentQuestionsDialog({
  open,
  onOpenChange,
  category,
  title = "常見問題",
}: FrequentQuestionsDialogProps) {
  const { data, isLoading } = trpc.frequentQuestions.getTopQuestions.useQuery(
    {
      category,
      timeRange: "all",
      limit: 10,
    },
    { enabled: open }
  );

  const categoryLabels: Record<string, string> = {
    exam: "考試練習",
    knowledge: "知識庫學習",
    learning_material: "智能解題",
    chapter: "章節學習",
    general: "一般問題",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {title}
            {category && (
              <Badge variant="outline" className="ml-2">
                {categoryLabels[category]}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading && (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">載入中...</span>
            </div>
          )}

          {!isLoading && data && (
            <>
              {data.questions.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">目前沒有常見問題</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.questions.map((q, index) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <Badge variant="outline" className="text-sm font-bold">
                          #{index + 1}
                        </Badge>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {q.hitCount} 人問過
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{q.question}</h3>
                      <div className="prose prose-sm max-w-none text-muted-foreground">
                        <MarkdownRenderer>{q.answer}</MarkdownRenderer>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
