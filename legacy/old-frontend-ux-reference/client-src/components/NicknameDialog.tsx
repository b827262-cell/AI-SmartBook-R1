import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface NicknameDialogProps {
  open: boolean;
  onNicknameSet: (nickname: string, gender?: 'male' | 'female') => void;
  isLoading?: boolean;
}

export function NicknameDialog({ open, onNicknameSet, isLoading = false }: NicknameDialogProps) {
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState<'male' | 'female' | null>(null);

  const handleSubmit = () => {
    if (nickname.trim()) {
      onNicknameSet(nickname.trim(), gender ?? undefined);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && nickname.trim()) {
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl">歡迎來到 iBrain 智匯！</DialogTitle>
          <DialogDescription className="text-base pt-2">
            為了提供更貼心的學習體驗，請告訴我們該怎麼稱呼您？
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nickname">您的暱稱</Label>
            <Input
              id="nickname"
              placeholder="請輸入您的暱稱"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyPress={handleKeyPress}
              maxLength={50}
              disabled={isLoading}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              暱稱將用於個人化您的學習體驗，您可以隨時在設定中修改
            </p>
          </div>
          <div className="space-y-2">
            <Label>您是？（選填）</Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  gender === 'male'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-primary'
                }`}
              >
                👦 學弟
              </button>
              <button
                type="button"
                onClick={() => setGender('female')}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  gender === 'female'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-primary'
                }`}
              >
                👧 學妹
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              選擇後，學長/學姊風格的 AI 會用正確的稱呼叫您
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!nickname.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                儲存中...
              </>
            ) : (
              "開始學習之旅"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
