import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Brain, Home, MessageSquare, BarChart3, LogOut, GraduationCap, FileEdit, Coins, ShoppingCart, BookOpen, Menu, Volume2, VolumeX } from "lucide-react";
import { getTTSSettings, saveTTSSettings, useTTS } from "@/hooks/useTTS";
import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { DEDUCT_CREDITS_EVENT } from "@/components/CoinAnimation";

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(() => getTTSSettings().autoSpeak);
  const { stop, isSpeaking } = useTTS();

  // 監聽設定變更（其他頁面修改時同步）
  useEffect(() => {
    const handler = (e: Event) => {
      setAutoSpeak((e as CustomEvent).detail?.autoSpeak ?? false);
    };
    window.addEventListener('tts-settings-changed', handler);
    return () => window.removeEventListener('tts-settings-changed', handler);
  }, []);

  const toggleAutoSpeak = () => {
    const next = !autoSpeak;
    setAutoSpeak(next);
    saveTTSSettings({ autoSpeak: next });
    // 如果正在朗讀且要關閉，立即停止
    if (!next && isSpeaking) {
      stop();
    }
    toast(next ? '🔊 AI 回覆自動朗讀已開啟' : '🔇 AI 回覆自動朗讀已關閉');
  };
  const utils = trpc.useUtils();

  // 數字縮放動畫狀態
  const [numberAnimating, setNumberAnimating] = useState(false);

  // 獲取點數餘額
  const creditsQuery = trpc.credits.getBalance.useQuery(undefined, {
    enabled: !!user,
  });

  // 自動發放首次贈點 + 每日贈點
  const autoGrantMutation = trpc.credits.autoGrant.useMutation({
    onSuccess: (data) => {
      if (data.initialGranted) {
        toast.success(`🎉 首次登入贈送 ${data.initialAmount} 點！`);
      }
      if (data.dailyGranted) {
        toast.success(`☀️ 今日贈送 ${data.dailyAmount} 點！`);
      }
      if (data.initialGranted || data.dailyGranted) {
        creditsQuery.refetch();
      }
    },
  });

  // 讀取購買點數開關
  const purchaseEnabledQuery = trpc.credits.getPurchaseEnabled.useQuery(undefined, {
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  const purchaseEnabled = purchaseEnabledQuery.data?.enabled ?? false;

  // 當用戶登入時，自動觸發贈點
  const autoGrantCalledRef = useRef(false);
  useEffect(() => {
    if (user && !autoGrantCalledRef.current && !autoGrantMutation.isPending) {
      autoGrantCalledRef.current = true;
      autoGrantMutation.mutate();
    }
    if (!user) {
      autoGrantCalledRef.current = false;
    }
  }, [user]);

  // 監聽扣款事件 → 數字縮放動畫 + 樂觀更新點數
  const handleDeductCredits = useCallback((e: Event) => {
    const amount = (e as CustomEvent).detail?.amount ?? 1;

    // 數字縮放動畫
    setNumberAnimating(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setNumberAnimating(true);
        setTimeout(() => setNumberAnimating(false), 600);
      });
    });

    // 立即樂觀更新點數（減少 amount）
    utils.credits.getBalance.setData(undefined, (old) => {
      if (!old) return old;
      return {
        ...old,
        balance: Math.max(0, old.balance - amount),
        permanentCredits: Math.max(0, old.permanentCredits - amount),
      };
    });

    // 1 秒後從後端重新抓取最新點數
    setTimeout(() => {
      utils.credits.getBalance.invalidate();
    }, 1000);
  }, [utils]);

  useEffect(() => {
    window.addEventListener(DEDUCT_CREDITS_EVENT, handleDeductCredits);
    return () => window.removeEventListener(DEDUCT_CREDITS_EVENT, handleDeductCredits);
  }, [handleDeductCredits]);

  // 外部開關
  const featureTogglesQuery = trpc.featureToggles.getAll.useQuery(undefined, {
    staleTime: 0, gcTime: 0, refetchOnMount: 'always',
    refetchOnWindowFocus: true, refetchInterval: false,
  });
  const featureToggles = featureTogglesQuery.data?.toggles;
  const isAdmin = user?.role === "admin";
  const adminTogglesQuery = trpc.featureToggles.getAllAdmin.useQuery(undefined, {
    enabled: isAdmin, staleTime: 0, gcTime: 0,
    refetchOnMount: 'always', refetchOnWindowFocus: true,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      toast.success("已登出");
      window.location.href = "/";
    },
  });

  const togglesLoaded = featureTogglesQuery.isFetched;
  const studentPortalEnabled = (() => {
    if (!togglesLoaded) return false;
    if (isAdmin && adminTogglesQuery.isFetched) {
      const ext = adminTogglesQuery.data?.external?.student_portal === true;
      const int = adminTogglesQuery.data?.internal?.student_portal === true;
      return ext || int;
    }
    return featureToggles?.student_portal === true;
  })();

  const isAdminPage = location === '/admin' || location.startsWith('/admin/');

  const navItems = [
    { path: "/", label: "首頁", icon: Home },
    ...(studentPortalEnabled ? [{ path: "/student", label: "智能專區", icon: BarChart3 }] : []),
  ];

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    const basePath = path.split('?')[0];
    return location.startsWith(basePath);
  };

  return (
    <nav className="border-b border-border bg-background sticky top-0 z-50 shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo（admin 頁面時在左側加入漢堡選單按鈕） */}
        <div className="flex items-center gap-2">
        {isAdminPage && (
          <button
            id="admin-hamburger-btn"
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            title="展開選單"
            aria-label="展開選單"
            onClick={() => window.dispatchEvent(new CustomEvent('open-admin-sidebar'))}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity">
          <Brain className="w-6 h-6 text-primary" />
          <span>iBrain 智匯</span>
        </Link>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.path}
                variant={isActive(item.path) ? "default" : "ghost"}
                size="sm"
                onClick={() => setLocation(item.path)}
                className="gap-1 flex-col sm:flex-row h-auto py-1 px-2 sm:px-3 relative"
                title={item.label}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] sm:text-sm">{item.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Credits Display */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {/* data-coin-btn 供 CoinAnimation 定位用 */}
              <Button
                data-coin-btn
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full hover:bg-primary/20"
                onClick={() => setLocation('/credits-history')}
              >
                <Coins className="w-4 h-4 text-primary" />
                <span
                  className={`text-sm font-semibold ${numberAnimating ? 'coin-number-decrease' : ''}`}
                >
                  {creditsQuery.data?.balance ?? 0}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>點數明細</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-2 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">永久點數</span>
                  <span className="text-sm font-semibold">{creditsQuery.data?.permanentCredits ?? 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">每日點數</span>
                  <span className="text-sm font-semibold">{creditsQuery.data?.dailyCredits ?? 0}</span>
                </div>
                <DropdownMenuSeparator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">總點數</span>
                  <span className="text-sm font-semibold text-primary">{creditsQuery.data?.balance ?? 0}</span>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/credits-history" className="cursor-pointer">
                  查看點數歷史
                </Link>
              </DropdownMenuItem>
              {purchaseEnabled && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/credits-purchase" className="cursor-pointer font-semibold text-primary">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      購買點數
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* 朗讀快捷按鈕 */}
        {user && (
          <button
            onClick={toggleAutoSpeak}
            title={autoSpeak ? '自動朗讀：開啟中（點擊關閉）' : '自動朗讀：關閉（點擊開啟）'}
            className={`p-2 rounded-full transition-all ${
              autoSpeak
                ? 'text-blue-500 bg-blue-50 hover:bg-blue-100'
                : 'text-muted-foreground hover:text-primary hover:bg-accent'
            }`}
          >
            {autoSpeak ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        )}

        {/* User Menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarFallback>
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {user.teachingRole === "teacher" ? "老師" :
                     user.teachingRole === "assistant" ? "助教" :
                     user.role === "admin" ? "管理員" : "學生"}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {user.teachingRole === "teacher" && (
                <>
                  <DropdownMenuItem onClick={() => setLocation("/teacher/questions")}>
                    <FileEdit className="w-4 h-4 mr-2" />
                    我的考題
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/admin/student-questions")}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    學生問題
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {user.teachingRole === "assistant" && (
                <>
                  <DropdownMenuItem onClick={() => setLocation("/admin/student-questions")}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    學生問題
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {user.role === "admin" && (
                <>
                  <DropdownMenuItem onClick={() => setLocation("/admin")}>
                    管理後台
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleAutoSpeak}>
                {autoSpeak
                  ? <><Volume2 className="w-4 h-4 mr-2 text-blue-500" /><span className="text-blue-600 font-medium">自動朗讀：開啟中</span></>
                  : <><VolumeX className="w-4 h-4 mr-2 text-muted-foreground" /><span>自動朗讀：關閉</span></>
                }
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logoutMutation.mutate()}
                className="text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                登出
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Feedback Dialog */}
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </nav>
  );
}
