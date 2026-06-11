import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import { Link } from "wouter";

export function LowCreditsAlert() {
  const [dismissed, setDismissed] = useState(false);
  const { data: balanceData } = trpc.credits.getBalance.useQuery();
  
  // 檢查是否已經在本次會話中關閉過提醒
  useEffect(() => {
    const dismissedInSession = sessionStorage.getItem('lowCreditsAlertDismissed');
    if (dismissedInSession === 'true') {
      setDismissed(true);
    }
  }, []);
  
  // 點數低於 5 點時顯示提醒
  const shouldShowAlert = balanceData && balanceData.balance < 5 && !dismissed;
  
  if (!shouldShowAlert) {
    return null;
  }
  
  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('lowCreditsAlertDismissed', 'true');
  };
  
  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top-5">
      <Alert variant="destructive" className="bg-yellow-50 border-yellow-400 text-yellow-900">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="flex items-center justify-between">
          <span>點數即將用完</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 hover:bg-yellow-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertTitle>
        <AlertDescription className="text-yellow-800">
          <p className="mb-3">
            您的點數餘額只剩 <span className="font-bold">{balanceData.balance} 點</span>，
            即將無法使用 AI 功能。
          </p>
          <div className="flex gap-2">
            <Link href="/credits-history">
              <Button size="sm" variant="outline" className="bg-white hover:bg-yellow-100 border-yellow-400">
                查看使用記錄
              </Button>
            </Link>
            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white" disabled>
              購買點數（即將推出）
            </Button>
          </div>
          <p className="text-xs mt-2 text-yellow-700">
            💡 提示：每日凌晨 12:00 會自動重置 10 點每日點數
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
