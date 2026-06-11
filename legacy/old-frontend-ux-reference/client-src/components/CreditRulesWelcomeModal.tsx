/**
 * CreditRulesWelcomeModal
 * 首次登入時顯示的扣點規則說明彈窗
 * 當 user.isFirstLogin === 1 時自動彈出，用戶確認後呼叫後端標記為已閱讀
 */
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  MessageCircle,
  Image,
  Sparkles,
  Globe,
  Gift,
  CheckCircle2,
  Coins,
  Info,
} from "lucide-react";

interface CreditRulesWelcomeModalProps {
  open: boolean;
  onClose: () => void;
}

const RULES = [
  {
    icon: <MessageCircle className="w-5 h-5 text-blue-500" />,
    label: "開啟新對話",
    cost: "1 點",
    desc: "每次開啟新對話扣 1 點，包含 5 個問題額度",
    color: "bg-blue-50 border-blue-200",
    badge: "bg-blue-100 text-blue-700",
  },
  {
    icon: <Image className="w-5 h-5 text-green-500" />,
    label: "上傳圖片",
    cost: "1 點",
    desc: "每張圖片（含截圖、拍照）扣 1 點",
    color: "bg-green-50 border-green-200",
    badge: "bg-green-100 text-green-700",
  },
  {
    icon: <Sparkles className="w-5 h-5 text-purple-500" />,
    label: "延伸服務",
    cost: "免費",
    desc: "「詳細解說」「舉個實例」「來個測驗」完全免費",
    color: "bg-purple-50 border-purple-200",
    badge: "bg-green-100 text-green-700",
    free: true,
  },
  {
    icon: <Globe className="w-5 h-5 text-orange-500" />,
    label: "網路搜尋",
    cost: "1 點",
    desc: "使用網路搜尋功能時扣 1 點",
    color: "bg-orange-50 border-orange-200",
    badge: "bg-orange-100 text-orange-700",
  },
];

export function CreditRulesWelcomeModal({ open, onClose }: CreditRulesWelcomeModalProps) {
  const [confirmed, setConfirmed] = useState(false);
  const utils = trpc.useUtils();

  const markRulesSeen = trpc.auth.markRulesSeen.useMutation({
    onSuccess: () => {
      // 更新本地 user 快取，讓 isFirstLogin 變為 0
      utils.auth.me.invalidate();
    },
    onError: () => {
      // 即使後端失敗，也讓用戶繼續使用
      console.warn("[CreditRulesModal] markRulesSeen failed, continuing anyway");
    },
  });

  const handleConfirm = async () => {
    setConfirmed(true);
    await markRulesSeen.mutateAsync();
    toast.success("🎉 歡迎使用 AI 課輔助教系統！", {
      description: "點數已準備好，開始你的學習之旅吧！",
      duration: 4000,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && confirmed) onClose(); }}>
      <DialogContent
        className="max-w-lg w-full rounded-2xl p-0 overflow-hidden flex flex-col"
        style={{ maxHeight: '90dvh' }}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* 頂部漸層標題區（固定，不滾動） */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-500 px-5 pt-6 pb-5 text-white flex-shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 rounded-full p-2">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-lg font-bold text-white m-0">
              歡迎！了解點數使用規則
            </DialogTitle>
          </div>
          <DialogDescription className="text-indigo-100 text-xs leading-relaxed m-0">
            本系統採用點數制，以下是各功能的扣點說明。請閱讀後按下確認，即可開始使用。
          </DialogDescription>
        </div>

        {/* 規則列表（可滾動區域） */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2.5">
          {RULES.map((rule) => (
            <div
              key={rule.label}
              className={`flex items-start gap-3 rounded-xl border p-3 ${rule.color}`}
            >
              <div className="mt-0.5 shrink-0">{rule.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-sm text-gray-800">{rule.label}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${rule.badge}`}>
                    {rule.cost}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{rule.desc}</p>
              </div>
            </div>
          ))}

          {/* 提示說明 */}
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
            <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 leading-relaxed">
              <strong>每日自動補點：</strong>系統每天會自動補充每日點數，讓你持續學習不中斷。
              點數不足時，可等待每日補點或聯繫管理員。
            </p>
          </div>

          {/* 贈點提示 */}
          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3">
            <Gift className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-xs text-emerald-700 leading-relaxed">
              <strong>首次登入贈點：</strong>系統已自動為你的帳號補充初始點數，馬上就可以開始提問！
            </p>
          </div>
        </div>

        {/* 底部按鈕（固定，不滾動） */}
        <div className="px-5 py-4 flex-shrink-0 border-t bg-white">
          <Button
            className="w-full h-11 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-md"
            onClick={handleConfirm}
            disabled={markRulesSeen.isPending}
          >
            {markRulesSeen.isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                確認中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                我了解了，開始使用！
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
