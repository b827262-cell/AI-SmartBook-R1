/**
 * IdentitySelectionModal
 * 首次登入時顯示的身分選擇彈窗
 * 當 user.identityType === 'unset' 時自動彈出
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { BookOpen, GraduationCap, ShoppingCart, Sparkles, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

interface IdentitySelectionModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'select' | 'ibrain' | 'gaodian' | 'book_buyer' | 'trial';

export function IdentitySelectionModal({ open, onClose }: IdentitySelectionModalProps) {
  const [step, setStep] = useState<Step>('select');
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const utils = trpc.useUtils();

  const setIdentityMutation = trpc.auth.setIdentity.useMutation({
    onSuccess: (data) => {
      utils.auth.me.invalidate();
      const labels: Record<string, string> = {
        ibrain: '知識達學員',
        gaodian: '高點學員',
        book_buyer: '購書者',
        trial: '試玩訪客',
      };
      toast.success(`🎉 歡迎！身分設定完成`, {
        description: `您已成功設定為「${labels[data.identityType]}」，點數已自動發放！`,
        duration: 5000,
      });
      onClose();
    },
    onError: (error) => {
      toast.error(`設定失敗：${error.message}`);
    },
  });

  const handleSubmitIbrain = () => {
    if (!account.trim()) { toast.error("請輸入帳號（身分證號）"); return; }
    if (!password.trim()) { toast.error("請輸入密碼"); return; }
    setIdentityMutation.mutate({ identityType: 'ibrain', memberAccount: account.trim(), memberPassword: password });
  };

  const handleSubmitGaodian = () => {
    if (!account.trim()) { toast.error("請輸入會員帳號（E-mail）"); return; }
    if (!password.trim()) { toast.error("請輸入會員密碼"); return; }
    setIdentityMutation.mutate({ identityType: 'gaodian', memberAccount: account.trim(), memberPassword: password });
  };

  const handleSubmitBookBuyer = () => {
    if (!voucherCode.trim()) { toast.error("請輸入購書憑證編號"); return; }
    setIdentityMutation.mutate({ identityType: 'book_buyer', voucherCode: voucherCode.trim() });
  };

  const handleTrial = () => {
    setIdentityMutation.mutate({ identityType: 'trial' });
  };

  const resetForm = () => {
    setAccount("");
    setPassword("");
    setVoucherCode("");
  };

  const goBack = () => {
    resetForm();
    setStep('select');
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md w-full rounded-2xl p-0 overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* 頂部標題 */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 px-6 pt-6 pb-5 text-white">
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-white/20 rounded-full p-2">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-lg font-bold text-white m-0">
              {step === 'select' ? '歡迎！請選擇您的身分' : 
               step === 'ibrain' ? '知識達學員登入' :
               step === 'gaodian' ? '高點學員登入' :
               step === 'book_buyer' ? '輸入購書憑證' : '試玩體驗'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-indigo-100 text-xs m-0">
            {step === 'select' ? '選擇您的身分以獲得對應的點數與功能' : '請填寫以下資訊完成驗證'}
          </DialogDescription>
        </div>

        <div className="px-6 py-5">
          {/* 身分選擇畫面 */}
          {step === 'select' && (
            <div className="space-y-3">
              {/* 知識達學員 */}
              <button
                onClick={() => { resetForm(); setStep('ibrain'); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-all text-left"
              >
                <div className="bg-blue-500 rounded-full p-2.5 shrink-0">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">我是知識達學員</p>
                  <p className="text-xs text-gray-500 mt-0.5">使用帳號（身分證號）＋密碼登入，贈 300 點</p>
                </div>
              </button>

              {/* 高點學員 */}
              <button
                onClick={() => { resetForm(); setStep('gaodian'); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 transition-all text-left"
              >
                <div className="bg-amber-500 rounded-full p-2.5 shrink-0">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">我是高點學員</p>
                  <p className="text-xs text-gray-500 mt-0.5">使用會員帳號（E-mail）＋密碼登入，贈 300 點</p>
                </div>
              </button>

              {/* 購書者 */}
              <button
                onClick={() => { resetForm(); setStep('book_buyer'); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-400 transition-all text-left"
              >
                <div className="bg-green-500 rounded-full p-2.5 shrink-0">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">我是購書者</p>
                  <p className="text-xs text-gray-500 mt-0.5">輸入購書憑證編號（發票統一編號），贈 300 點</p>
                </div>
              </button>

              {/* 試玩訪客 */}
              <button
                onClick={handleTrial}
                disabled={setIdentityMutation.isPending}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-400 transition-all text-left disabled:opacity-50"
              >
                <div className="bg-purple-500 rounded-full p-2.5 shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">我想先試玩看看</p>
                  <p className="text-xs text-gray-500 mt-0.5">每天贈 10 點，隔天重置，無需驗證</p>
                </div>
              </button>
            </div>
          )}

          {/* 知識達學員登入 */}
          {step === 'ibrain' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">帳號</Label>
                <Input
                  placeholder="身分證號（公司會員請輸入統一編號）"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">密碼</Label>
                <Input
                  type="password"
                  placeholder="注意字母大小寫有別"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitIbrain(); }}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={goBack} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-1" />返回
                </Button>
                <Button
                  onClick={handleSubmitIbrain}
                  disabled={setIdentityMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {setIdentityMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1" />確定送出</>}
                </Button>
              </div>
            </div>
          )}

          {/* 高點學員登入 */}
          {step === 'gaodian' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">會員帳號</Label>
                <Input
                  type="email"
                  placeholder="請輸入 E-mail"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">會員密碼</Label>
                <Input
                  type="password"
                  placeholder="英文字母區分大小寫"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitGaodian(); }}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={goBack} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-1" />返回
                </Button>
                <Button
                  onClick={handleSubmitGaodian}
                  disabled={setIdentityMutation.isPending}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {setIdentityMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1" />確定送出</>}
                </Button>
              </div>
            </div>
          )}

          {/* 購書者憑證 */}
          {step === 'book_buyer' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">購書憑證編號</Label>
                <Input
                  placeholder="請輸入購書憑證（發票統一編號）"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitBookBuyer(); }}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={goBack} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-1" />返回
                </Button>
                <Button
                  onClick={handleSubmitBookBuyer}
                  disabled={setIdentityMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {setIdentityMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1" />確定送出</>}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
