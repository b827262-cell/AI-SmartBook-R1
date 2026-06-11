import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Cpu, Save } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminAiSettings() {
  const { data: aiModelSetting, isLoading, refetch: refetchModel } = trpc.settings.get.useQuery({ key: "ai_model" });

  const [selectedModel, setSelectedModel] = useState<"gemma4" | "manus">("gemma4");

  useEffect(() => {
    if (aiModelSetting) setSelectedModel(aiModelSetting as "gemma4" | "manus");
  }, [aiModelSetting]);

  const setMutation = trpc.settings.set.useMutation({
    onSuccess: () => {
      toast.success("設定已儲存");
      refetchModel();
    },
    onError: (err) => toast.error(`儲存失敗：${err.message}`),
  });

  const handleSaveModel = () => {
    setMutation.mutate({ key: "ai_model", value: selectedModel, description: "AI 回答模型（gemma4 或 manus）" });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary" />
          AI 模型設定
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          控制 AI 助教使用的語言模型
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            回答模型選擇
          </CardTitle>
          <CardDescription>選擇 AI 助教回答學生問題時使用的模型</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">讀取中...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedModel("gemma4")}
                  className={cn(
                    "flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-left",
                    selectedModel === "gemma4"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  )}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="text-lg">G4</span>
                    <span>Gemma4</span>
                    {selectedModel === "gemma4" && (
                      <Badge variant="default" className="text-xs ml-auto">使用中</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">免費、快速</p>
                </button>

                <button
                  onClick={() => setSelectedModel("manus")}
                  className={cn(
                    "flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-left",
                    selectedModel === "manus"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  )}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <Brain className="w-4 h-4 text-primary" />
                    <span>Manus AI</span>
                    {selectedModel === "manus" && (
                      <Badge variant="default" className="text-xs ml-auto">使用中</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">雲端語言模型</p>
                  <p className="text-xs text-muted-foreground">功能完整、支援圖片問答</p>
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <div className="text-sm text-muted-foreground flex-1">
                  目前後台設定：
                  <span className="font-semibold text-foreground ml-1">
                    {aiModelSetting === "gemma4" ? "Gemma4" : aiModelSetting === "manus" ? "Manus AI（雲端）" : "未設定（預設 Gemma4）"}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={handleSaveModel}
                  disabled={setMutation.isPending}
                  className="flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  儲存設定
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
