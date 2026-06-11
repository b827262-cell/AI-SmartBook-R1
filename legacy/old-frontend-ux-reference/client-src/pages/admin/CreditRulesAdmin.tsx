/**
 * 管理後台 - 扣點規則設定頁面
 * 管理員可在此調整各項功能的扣點數，設定後立即生效
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Coins, Settings, RefreshCw, MessageCircle, Image, Sparkles, Globe } from "lucide-react";

const RULE_ICONS: Record<string, React.ReactNode> = {
  new_conversation: <MessageCircle className="w-5 h-5 text-blue-500" />,
  image_upload: <Image className="w-5 h-5 text-green-500" />,
  extra_service: <Sparkles className="w-5 h-5 text-purple-500" />,
  web_search: <Globe className="w-5 h-5 text-orange-500" />,
};

const RULE_DESCRIPTIONS: Record<string, string> = {
  new_conversation: "每次開啟新對話時扣點。設為 0 則免費開對話。",
  image_upload: "對話中每傳送一張圖片時扣點。設為 0 則圖片免費。",
  extra_service: "點選「詳細解說」「舉個實例」「來個測驗」按鈕時扣點。設為 0 則延伸服務免費。",
  web_search: "使用網路搜尋功能時扣點。設為 0 則網路搜尋免費。",
};

export default function CreditRulesAdmin() {
  const { data: rules, isLoading, refetch } = trpc.creditRules.getAll.useQuery();
  const updateMutation = trpc.creditRules.update.useMutation({
    onSuccess: () => {
      toast.success("規則已更新，立即生效。");
      refetch();
    },
    onError: (err) => {
      toast.error(`更新失敗：${err.message}`);
    },
  });

  // 本地編輯狀態
  const [edits, setEdits] = useState<Record<number, { pointCost: number; isEnabled: boolean; conversationLimit?: number | null }>>({});

  const getEdit = (rule: any) => edits[rule.id] ?? {
    pointCost: rule.pointCost,
    isEnabled: rule.isEnabled === 1,
    conversationLimit: rule.conversationLimit,
  };

  const handleSave = (rule: any) => {
    const edit = getEdit(rule);
    updateMutation.mutate({
      id: rule.id,
      pointCost: edit.pointCost,
      isEnabled: edit.isEnabled,
      conversationLimit: edit.conversationLimit,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Coins className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">扣點規則設定</h1>
            <p className="text-sm text-muted-foreground">調整各功能的扣點數，設定後立即生效（60秒內更新）</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" /> 重新整理
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">載入中...</div>
        ) : (
          <div className="space-y-4">
            {(rules ?? []).map((rule) => {
              const edit = getEdit(rule);
              const icon = RULE_ICONS[rule.ruleKey] ?? <Settings className="w-5 h-5 text-gray-400" />;
              const desc = RULE_DESCRIPTIONS[rule.ruleKey] ?? rule.description ?? "";
              const isDirty = JSON.stringify(edit) !== JSON.stringify({
                pointCost: rule.pointCost,
                isEnabled: rule.isEnabled === 1,
                conversationLimit: rule.conversationLimit,
              });

              return (
                <Card key={rule.id} className={`border ${edit.isEnabled ? "border-border" : "border-dashed opacity-60"}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {icon}
                        <CardTitle className="text-base">{rule.ruleName}</CardTitle>
                        {!edit.isEnabled && <Badge variant="secondary">已停用</Badge>}
                        {edit.pointCost === 0 && edit.isEnabled && <Badge variant="outline" className="text-green-600 border-green-300">免費</Badge>}
                      </div>
                      <Switch
                        checked={edit.isEnabled}
                        onCheckedChange={(v) => setEdits(prev => ({ ...prev, [rule.id]: { ...getEdit(rule), isEnabled: v } }))}
                      />
                    </div>
                    <CardDescription className="text-xs mt-1">{desc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium whitespace-nowrap">扣點數</label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={edit.pointCost}
                          onChange={(e) => setEdits(prev => ({ ...prev, [rule.id]: { ...getEdit(rule), pointCost: parseInt(e.target.value) || 0 } }))}
                          className="w-20 text-center"
                        />
                        <span className="text-sm text-muted-foreground">點</span>
                      </div>

                      {rule.ruleKey === "new_conversation" && (
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium whitespace-nowrap">每次對話則數上限</label>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={edit.conversationLimit ?? 10}
                            onChange={(e) => setEdits(prev => ({ ...prev, [rule.id]: { ...getEdit(rule), conversationLimit: parseInt(e.target.value) || 10 } }))}
                            className="w-20 text-center"
                          />
                          <span className="text-sm text-muted-foreground">則</span>
                        </div>
                      )}

                      {isDirty && (
                        <Button
                          size="sm"
                          onClick={() => handleSave(rule)}
                          disabled={updateMutation.isPending}
                          className="ml-auto"
                        >
                          {updateMutation.isPending ? "儲存中..." : "儲存"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="mt-8 bg-muted/30">
          <CardContent className="pt-4">
            <h3 className="font-semibold mb-2 text-sm">📋 扣點規則說明</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• 設定後約 60 秒內生效（系統快取更新）</li>
              <li>• 設為 0 點 = 該功能免費使用</li>
              <li>• 停用規則 = 完全不扣點（等同設為 0）</li>
              <li>• 「對話則數上限」只適用於「開新對話」規則</li>
              <li>• 點數不足時，學生無法開啟新對話或上傳圖片</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
