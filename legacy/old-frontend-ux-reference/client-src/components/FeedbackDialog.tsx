/**
 * 問題意見回饋對話框
 * 支援問題分類、截圖上傳、自動收集上下文資訊
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { ImageUploader } from "./ImageUploader";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [type, setType] = useState<"bug" | "feature_request" | "ui_ux" | "other">("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");

  const createFeedbackMutation = trpc.feedback.create.useMutation({
    onSuccess: () => {
      toast.success("回饋已提交，感謝您的意見！");
      handleClose();
    },
    onError: (error: any) => {
      toast.error(`提交失敗：${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("請輸入標題");
      return;
    }

    if (!description.trim()) {
      toast.error("請輸入問題描述");
      return;
    }

    // 收集上下文資訊
    const pageUrl = window.location.href;
    const browserInfo = JSON.stringify({
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
    });

    createFeedbackMutation.mutate({
      type,
      title,
      description,
      screenshotUrl: screenshotUrl || undefined,
      pageUrl,
      browserInfo,
    });
  };

  const handleClose = () => {
    setType("bug");
    setTitle("");
    setDescription("");
    setScreenshotUrl("");
    onOpenChange(false);
  };

  const typeLabels = {
    bug: "Bug 回報",
    feature_request: "功能建議",
    ui_ux: "UI/UX 改進",
    other: "其他",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>問題意見回饋</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            感謝您的回饋！我們會盡快處理您的意見。
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 問題類型 */}
          <div>
            <Label htmlFor="type">問題類型</Label>
            <Select value={type} onValueChange={(value: any) => setType(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">🐛 Bug 回報</SelectItem>
                <SelectItem value="feature_request">💡 功能建議</SelectItem>
                <SelectItem value="ui_ux">🎨 UI/UX 改進</SelectItem>
                <SelectItem value="other">📝 其他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 標題 */}
          <div>
            <Label htmlFor="title">標題</Label>
            <Input
              id="title"
              placeholder="簡短描述問題或建議"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* 詳細描述 */}
          <div>
            <Label htmlFor="description">詳細描述</Label>
            <Textarea
              id="description"
              placeholder="請詳細描述問題或建議，包含重現步驟、預期行為等"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 min-h-[120px]"
            />
          </div>

          {/* 截圖上傳 */}
          <div>
            <Label>截圖（選填）</Label>
            <p className="text-sm text-muted-foreground mb-2">
              上傳截圖可以幫助我們更快理解問題
            </p>
            <ImageUploader
              currentImageUrl={screenshotUrl}
              onImageUploaded={setScreenshotUrl}
            />
          </div>

          {/* 自動收集的資訊提示 */}
          <div className="bg-muted p-3 rounded text-sm">
            <p className="font-medium mb-1">自動收集的資訊：</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>當前頁面 URL</li>
              <li>瀏覽器資訊（版本、語言、螢幕解析度）</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createFeedbackMutation.isPending}
          >
            {createFeedbackMutation.isPending ? "提交中..." : "提交回饋"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
