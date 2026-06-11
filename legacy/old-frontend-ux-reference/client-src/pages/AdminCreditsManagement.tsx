import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Loader2, Coins, Plus, Settings, Gift, CalendarDays, ShoppingCart, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function AdminCreditsManagement() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  // 系統設定 state
  const [initialGrantAmount, setInitialGrantAmount] = useState("100");
  const [dailyGrantAmount, setDailyGrantAmount] = useState("10");
  const [purchaseEnabled, setPurchaseEnabled] = useState(false);
  const [smartBookUnlockCredits, setSmartBookUnlockCredits] = useState("50");
  const [ibrainGrantAmount, setIbrainGrantAmount] = useState("300");
  const [gaodianGrantAmount, setGaodianGrantAmount] = useState("300");
  const [bookBuyerGrantAmount, setBookBuyerGrantAmount] = useState("300");
  const [trialDailyGrantAmount, setTrialDailyGrantAmount] = useState("10");
  const [ibrainApiUrl, setIbrainApiUrl] = useState("");
  const [gaodianApiUrl, setGaodianApiUrl] = useState("");
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // 讀取系統設定
  const settingsQuery = trpc.credits.getSystemSettings.useQuery(undefined, {
    enabled: user?.role === 'admin',
  });

  useEffect(() => {
    if (settingsQuery.data?.settings && !settingsLoaded) {
      const s = settingsQuery.data.settings;
      setInitialGrantAmount(String(s.initialGrantAmount));
      setDailyGrantAmount(String(s.dailyGrantAmount));
      setPurchaseEnabled(s.purchaseEnabled);
      setSmartBookUnlockCredits(String(s.smartBookUnlockCredits ?? 50));
      setIbrainGrantAmount(String(s.ibrainGrantAmount ?? 300));
      setGaodianGrantAmount(String(s.gaodianGrantAmount ?? 300));
      setBookBuyerGrantAmount(String(s.bookBuyerGrantAmount ?? 300));
      setTrialDailyGrantAmount(String(s.trialDailyGrantAmount ?? 10));
      setIbrainApiUrl(s.ibrainApiUrl ?? '');
      setGaodianApiUrl(s.gaodianApiUrl ?? '');
      setSettingsLoaded(true);
    }
  }, [settingsQuery.data, settingsLoaded]);

  const addCreditsMutation = trpc.credits.adminAddCredits.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setUserId("");
      setAmount("");
      setDescription("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateSettingsMutation = trpc.credits.updateSystemSettings.useMutation({
    onSuccess: (data) => {
      toast.success("點數系統設定已更新");
      const s = data.settings;
      setInitialGrantAmount(String(s.initialGrantAmount));
      setDailyGrantAmount(String(s.dailyGrantAmount));
      setPurchaseEnabled(s.purchaseEnabled);
      setSmartBookUnlockCredits(String(s.smartBookUnlockCredits ?? 50));
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  const handleAddCredits = (e: React.FormEvent) => {
    e.preventDefault();
    const userIdNum = parseInt(userId);
    const amountNum = parseInt(amount);
    if (isNaN(userIdNum) || userIdNum <= 0) { toast.error("請輸入有效的用戶 ID"); return; }
    if (isNaN(amountNum) || amountNum <= 0) { toast.error("請輸入有效的點數數量"); return; }
    addCreditsMutation.mutate({ userId: userIdNum, amount: amountNum, description: description || undefined });
  };

  const handleSaveSettings = () => {
    const initialNum = parseInt(initialGrantAmount);
    const dailyNum = parseInt(dailyGrantAmount);
    const smartBookUnlockNum = parseInt(smartBookUnlockCredits);
    const ibrainNum = parseInt(ibrainGrantAmount);
    const gaodianNum = parseInt(gaodianGrantAmount);
    const bookBuyerNum = parseInt(bookBuyerGrantAmount);
    const trialDailyNum = parseInt(trialDailyGrantAmount);
    if (isNaN(initialNum) || initialNum < 0) { toast.error("首次贈點數量必須為非負整數"); return; }
    if (isNaN(dailyNum) || dailyNum < 0) { toast.error("每日贈點數量必須為非負整數"); return; }
    if (isNaN(smartBookUnlockNum) || smartBookUnlockNum < 0) { toast.error("智能書本首次解鎖贈點必須為非負整數"); return; }
    if (isNaN(ibrainNum) || ibrainNum < 0) { toast.error("知識達贈點必須為非負整數"); return; }
    if (isNaN(gaodianNum) || gaodianNum < 0) { toast.error("高點贈點必須為非負整數"); return; }
    if (isNaN(bookBuyerNum) || bookBuyerNum < 0) { toast.error("購書者贈點必須為非負整數"); return; }
    if (isNaN(trialDailyNum) || trialDailyNum < 0) { toast.error("試玩每日贈點必須為非負整數"); return; }
    updateSettingsMutation.mutate({
      initialGrantAmount: initialNum,
      dailyGrantAmount: dailyNum,
      purchaseEnabled,
      smartBookUnlockCredits: smartBookUnlockNum,
      ibrainGrantAmount: ibrainNum,
      gaodianGrantAmount: gaodianNum,
      bookBuyerGrantAmount: bookBuyerNum,
      trialDailyGrantAmount: trialDailyNum,
      ibrainApiUrl,
      gaodianApiUrl,
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-2">權限不足</h2>
            <p className="text-muted-foreground mb-4">您沒有權限訪問管理員後台</p>
            <Button onClick={() => setLocation("/")}>返回首頁</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Coins className="w-8 h-8 text-primary" />
            點數管理
          </h1>
          <p className="text-muted-foreground mt-2">
            管理點數系統設定與手動為用戶增加點數
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左欄：系統設定 */}
          <div className="space-y-6">
            {/* 點數系統設定 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  點數系統設定
                </CardTitle>
                <CardDescription>
                  調整贈點規則，設定後立即生效
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {settingsQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    載入設定中...
                  </div>
                ) : (
                  <>
                    {/* 首次登入贈點 */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm font-semibold">
                        <Gift className="w-4 h-4 text-green-500" />
                        首次登入贈點數量
                      </Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min="0"
                          max="10000"
                          value={initialGrantAmount}
                          onChange={(e) => setInitialGrantAmount(e.target.value)}
                          className="w-32"
                        />
                        <span className="text-sm text-muted-foreground">點（新用戶首次登入自動發放）</span>
                      </div>
                    </div>

                    {/* 每日贈點 */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm font-semibold">
                        <CalendarDays className="w-4 h-4 text-blue-500" />
                        每日贈點數量
                      </Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min="0"
                          max="1000"
                          value={dailyGrantAmount}
                          onChange={(e) => setDailyGrantAmount(e.target.value)}
                          className="w-32"
                        />
                        <span className="text-sm text-muted-foreground">點（每日首次登入發放，用不完歸零）</span>
                      </div>
                    </div>

                    {/* 智能書本首次解鎖贈點 */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm font-semibold">
                        <BookOpen className="w-4 h-4 text-purple-500" />
                        智能書本首次解鎖贈點（全域預設）
                      </Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min="0"
                          max="9999"
                          value={smartBookUnlockCredits}
                          onChange={(e) => setSmartBookUnlockCredits(e.target.value)}
                          className="w-32"
                        />
                        <span className="text-sm text-muted-foreground">點（各書可在書本設定中單獨覆蓋）</span>
                      </div>
                    </div>

                    {/* 身分贈點設定 */}
                    <div className="border-t pt-4 space-y-4">
                      <p className="text-sm font-semibold text-foreground">身分驗證贈點設定</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">知識達學員首次驗證贈點</Label>
                          <div className="flex items-center gap-2">
                            <Input type="number" min="0" max="9999" value={ibrainGrantAmount} onChange={(e) => setIbrainGrantAmount(e.target.value)} className="w-24" />
                            <span className="text-xs text-muted-foreground">點</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">高點學員首次驗證贈點</Label>
                          <div className="flex items-center gap-2">
                            <Input type="number" min="0" max="9999" value={gaodianGrantAmount} onChange={(e) => setGaodianGrantAmount(e.target.value)} className="w-24" />
                            <span className="text-xs text-muted-foreground">點</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">購書者首次驗證贈點</Label>
                          <div className="flex items-center gap-2">
                            <Input type="number" min="0" max="9999" value={bookBuyerGrantAmount} onChange={(e) => setBookBuyerGrantAmount(e.target.value)} className="w-24" />
                            <span className="text-xs text-muted-foreground">點</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">試玩訪客每日贈點</Label>
                          <div className="flex items-center gap-2">
                            <Input type="number" min="0" max="9999" value={trialDailyGrantAmount} onChange={(e) => setTrialDailyGrantAmount(e.target.value)} className="w-24" />
                            <span className="text-xs text-muted-foreground">點/天</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 會員驗證 API 設定 */}
                    <div className="border-t pt-4 space-y-4">
                      <p className="text-sm font-semibold text-foreground">會員驗證 API 設定（預留）</p>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">知識達會員驗證 API 網址</Label>
                        <Input placeholder="https://api.ibrain.com.tw/member/verify" value={ibrainApiUrl} onChange={(e) => setIbrainApiUrl(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">高點會員驗證 API 網址</Label>
                        <Input placeholder="https://api.get.com.tw/member/verify" value={gaodianApiUrl} onChange={(e) => setGaodianApiUrl(e.target.value)} />
                      </div>
                    </div>

                    {/* 購買點數開關 */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm font-semibold">
                        <ShoppingCart className="w-4 h-4 text-orange-500" />
                        開放購買點數
                      </Label>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={purchaseEnabled}
                          onCheckedChange={setPurchaseEnabled}
                        />
                        <span className="text-sm text-muted-foreground">
                          {purchaseEnabled ? "✅ 已開放，用戶可購買點數" : "🔒 已關閉，用戶無法購買點數"}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={handleSaveSettings}
                      disabled={updateSettingsMutation.isPending}
                      className="w-full"
                    >
                      {updateSettingsMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />儲存中...</>
                      ) : (
                        <><Settings className="w-4 h-4 mr-2" />儲存設定</>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 說明卡片 */}
            <Card>
              <CardHeader>
                <CardTitle>點數系統說明</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• <strong>首次登入贈點</strong>：新用戶完成登入後自動發放，僅限一次</p>
                <p>• <strong>每日贈點</strong>：每天首次登入時自動發放，前一天未用完的每日點數會歸零</p>
                <p>• <strong>購買點數</strong>：開關關閉時，前端不顯示購買入口</p>
                <p>• <strong>點數消耗</strong>：上傳圖片問問題、AI 解析等功能各扣 1 點</p>
                <p className="mt-3 text-xs">所有點數變動均有交易記錄可查詢。</p>
              </CardContent>
            </Card>
          </div>

          {/* 右欄：手動加點 */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  手動為用戶增加點數
                </CardTitle>
                <CardDescription>
                  請輸入用戶 ID 和要增加的點數數量
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddCredits} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="userId">用戶 ID</Label>
                    <Input
                      id="userId"
                      type="number"
                      placeholder="請輸入用戶 ID"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">可以在用戶列表中查看用戶 ID</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">點數數量</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="請輸入要增加的點數"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      min="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">備註說明（選填）</Label>
                    <Textarea
                      id="description"
                      placeholder="例如：補償點數、活動贈送等"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={addCreditsMutation.isPending}
                  >
                    {addCreditsMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />處理中...</>
                    ) : (
                      <><Plus className="w-4 h-4 mr-2" />增加點數</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
