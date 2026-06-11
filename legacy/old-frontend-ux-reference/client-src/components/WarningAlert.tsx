import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

/**
 * WarningAlert：學員登入後顯示未讀警告彈窗
 * - 只對已登入的非管理員用戶顯示
 * - 逐一顯示每則警告，確認後標記為已讀
 */
export function WarningAlert() {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [open, setOpen] = useState(false);

  // 只有已登入的一般用戶才查詢警告
  const { data: warnings, isLoading } = trpc.adminConversations.getMyWarnings.useQuery(undefined, {
    enabled: !!user && user.role !== "admin",
    staleTime: 60000, // 1 分鐘快取
  });

  const markReadMutation = trpc.adminConversations.markWarningRead.useMutation();

  useEffect(() => {
    if (!isLoading && warnings && warnings.length > 0) {
      setCurrentIndex(0);
      setOpen(true);
    }
  }, [warnings, isLoading]);

  if (!warnings || warnings.length === 0) return null;

  const currentWarning = warnings[currentIndex];
  if (!currentWarning) return null;

  const handleConfirm = async () => {
    // 標記當前警告為已讀
    await markReadMutation.mutateAsync({ warningId: currentWarning.id });

    if (currentIndex + 1 < warnings.length) {
      // 還有下一則警告
      setCurrentIndex(prev => prev + 1);
    } else {
      // 全部確認完畢
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      {/* 不允許點擊外部關閉 */}
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="h-6 w-6" />
            系統警告通知
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            您有一則來自管理員的警告，請仔細閱讀後確認。
            {warnings.length > 1 && (
              <span className="ml-1 font-medium">（{currentIndex + 1} / {warnings.length}）</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800 mb-1">警告內容：</p>
              <p className="text-sm text-yellow-700 whitespace-pre-wrap">{currentWarning.message}</p>
              <p className="text-xs text-yellow-500 mt-2">
                發送時間：{currentWarning.createdAt ? new Date(currentWarning.createdAt).toLocaleString("zh-TW") : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/30 rounded p-3">
          ⚠ 請注意：若繼續違反使用規範，帳號可能遭到封鎖。請遵守平台使用規則，謝謝您的配合。
        </div>

        <DialogFooter>
          <Button
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
            onClick={handleConfirm}
            disabled={markReadMutation.isPending}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {markReadMutation.isPending ? "確認中..." : "我已閱讀並了解此警告"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
