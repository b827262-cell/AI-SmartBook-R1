/**
 * 拆解配置對話框
 * 允許用戶設定頁面範圍等拆解選項
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";

interface ExtractConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: { pageRange?: { start?: number; end?: number }, skipExtracted?: boolean }) => void;
  totalPages?: number;
  pdfTitle?: string;
}

export function ExtractConfigDialog({
  open,
  onOpenChange,
  onConfirm,
  totalPages,
  pdfTitle,
}: ExtractConfigDialogProps) {
  const [useAllPages, setUseAllPages] = useState(true);
  const [skipExtracted, setSkipExtracted] = useState(true);
  const [startPage, setStartPage] = useState<string>("1");
  const [endPage, setEndPage] = useState<string>(totalPages?.toString() || "");

  const handleConfirm = () => {
    if (useAllPages) {
      onConfirm({ skipExtracted });
    } else {
      const start = parseInt(startPage);
      const end = parseInt(endPage);

      if (isNaN(start) || isNaN(end)) {
        alert("請輸入有效的頁碼");
        return;
      }

      if (start < 1 || (totalPages && start > totalPages)) {
        alert(`起始頁必須在 1-${totalPages} 之間`);
        return;
      }

      if (end < 1 || (totalPages && end > totalPages)) {
        alert(`結束頁必須在 1-${totalPages} 之間`);
        return;
      }

      if (start > end) {
        alert("起始頁不能大於結束頁");
        return;
      }

      onConfirm({
        pageRange: { start, end },
        skipExtracted,
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>拆解配置</DialogTitle>
          {pdfTitle && <p className="text-sm text-muted-foreground mt-1">{pdfTitle}</p>}
          {totalPages && <p className="text-sm text-muted-foreground">總頁數：{totalPages} 頁</p>}
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="useAllPages"
              checked={useAllPages}
              onCheckedChange={(checked) => setUseAllPages(checked as boolean)}
            />
            <Label htmlFor="useAllPages" className="cursor-pointer">
              拆解全部頁面
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="skipExtracted"
              checked={skipExtracted}
              onCheckedChange={(checked) => setSkipExtracted(checked as boolean)}
            />
            <Label htmlFor="skipExtracted" className="cursor-pointer">
              跳過已拆解的頁面
            </Label>
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            已拆解過的頁面將被跳過，避免重複處理
          </p>

          {!useAllPages && (
            <div className="space-y-3 pl-6">
              <div>
                <Label htmlFor="startPage">起始頁</Label>
                <Input
                  id="startPage"
                  type="number"
                  min="1"
                  max={totalPages}
                  value={startPage}
                  onChange={(e) => setStartPage(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endPage">結束頁</Label>
                <Input
                  id="endPage"
                  type="number"
                  min="1"
                  max={totalPages}
                  value={endPage}
                  onChange={(e) => setEndPage(e.target.value)}
                  className="mt-1"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                將只拆解第 {startPage} 頁到第 {endPage} 頁的題目
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm}>
            確定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
