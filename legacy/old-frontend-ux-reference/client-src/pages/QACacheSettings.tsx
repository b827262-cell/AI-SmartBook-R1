import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Loader2, Save, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function QACacheSettings() {
  const [threshold, setThreshold] = useState(0.85);
  const [isSaving, setIsSaving] = useState(false);

  // 獲取當前設定
  const { data: settings, isLoading, refetch } = trpc.qaCacheAdmin.getSettings.useQuery();

  // 更新設定 mutation
  const updateSettingsMutation = trpc.qaCacheAdmin.updateSettings.useMutation({
    onSuccess: () => {
      toast({
        title: "設定已保存",
        description: "快取相似度閾值已成功更新",
      });
      refetch();
      setIsSaving(false);
    },
    onError: (error) => {
      toast({
        title: "保存失敗",
        description: error.message,
        variant: "destructive",
      });
      setIsSaving(false);
    },
  });

  // 載入設定
  useEffect(() => {
    if (settings?.data) {
      setThreshold(settings.data.similarityThreshold);
    }
  }, [settings]);

  // 保存設定
  const handleSave = () => {
    setIsSaving(true);
    updateSettingsMutation.mutate({
      similarityThreshold: threshold,
    });
  };

  // 獲取閾值說明
  const getThresholdDescription = (value: number) => {
    if (value >= 0.9) {
      return "非常嚴格：只有幾乎完全相同的問題才會命中快取（命中率低，準確度高）";
    } else if (value >= 0.85) {
      return "嚴格（推薦）：相似問題會命中快取，平衡命中率和準確度";
    } else if (value >= 0.8) {
      return "中等：較寬鬆的匹配，命中率較高但可能返回不太相關的答案";
    } else {
      return "寬鬆：非常寬鬆的匹配，命中率高但準確度較低";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">快取系統設定</h1>
        <p className="text-muted-foreground mt-2">
          調整問答快取系統的相似度閾值，以優化快取命中率和準確度
        </p>
      </div>

      <div className="grid gap-6">
        {/* 相似度閾值設定 */}
        <Card>
          <CardHeader>
            <CardTitle>相似度閾值</CardTitle>
            <CardDescription>
              設定問題匹配的最低相似度要求（範圍：0.7-0.95）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 閾值滑桿 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">當前閾值</span>
                <span className="text-2xl font-bold text-primary">
                  {threshold.toFixed(2)}
                </span>
              </div>

              <Slider
                value={[threshold]}
                onValueChange={(value) => setThreshold(value[0])}
                min={0.7}
                max={0.95}
                step={0.01}
                className="w-full"
              />

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.70（寬鬆）</span>
                <span>0.85（推薦）</span>
                <span>0.95（嚴格）</span>
              </div>
            </div>

            {/* 閾值說明 */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {getThresholdDescription(threshold)}
              </AlertDescription>
            </Alert>

            {/* 影響說明 */}
            <div className="space-y-2 text-sm">
              <h4 className="font-medium">閾值影響：</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  <strong>閾值越高</strong>：快取命中率越低，但返回的答案更準確
                </li>
                <li>
                  <strong>閾值越低</strong>：快取命中率越高，但可能返回不太相關的答案
                </li>
                <li>
                  <strong>推薦值 0.85</strong>：平衡命中率和準確度，適合大多數場景
                </li>
              </ul>
            </div>

            {/* 保存按鈕 */}
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={isSaving || threshold === settings?.data?.similarityThreshold}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    保存設定
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 快取統計預覽 */}
        <Card>
          <CardHeader>
            <CardTitle>快取統計</CardTitle>
            <CardDescription>
              查看當前快取系統的運作狀況
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>
                調整閾值後，建議觀察快取命中率的變化。您可以在{" "}
                <a href="/admin/token-stats" className="text-primary hover:underline">
                  Token 統計頁面
                </a>{" "}
                查看詳細的快取效能數據。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
