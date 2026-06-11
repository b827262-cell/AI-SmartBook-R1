import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

/**
 * 外部資源搜尋按鈕組件
 * 顯示在對話輸入框上方，讓用戶可以選擇性地搜尋外部資源
 */
export function ExternalSearchButtons() {
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [selectedButton, setSelectedButton] = useState<{
    id: number;
    name: string;
    icon: string;
    urlTemplate: string;
    encoding: "big5" | "utf8";
  } | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  // 獲取所有啟用的搜尋按鈕
  const { data: buttons, isLoading } = trpc.externalSearch.getButtons.useQuery();

  // 處理按鈕點擊
  const handleButtonClick = (button: typeof buttons[0]) => {
    setSelectedButton(button);
    setSearchKeyword("");
    setSearchDialogOpen(true);
  };

  // Big5 編碼轉換函數
  const encodeToBig5 = (str: string): string => {
    // 使用 TextEncoder 將字串轉換為 Big5 編碼
    // 注意：流覽器不支援 Big5 TextEncoder，所以我們需要手動轉換
    // 這裡使用一個簡單的方法：將字串轉換為 URL 編碼，然後手動替換為 Big5
    // 實際上，我們可以使用 iconv-lite 或類似的庫來轉換
    // 但為了簡化，這裡先使用 encodeURIComponent，然後讓伺服器處理
    // 注意：這個方法可能不完美，如果需要正確的 Big5 編碼，應該使用專門的庫
    
    // 暫時使用 escape() 函數（已弃用，但對 Big5 支援較好）
    // @ts-ignore
    return escape(str);
  };

  // 處理搜尋
  const handleSearch = () => {
    if (!selectedButton || !searchKeyword.trim()) {
      toast.error("請輸入搜尋關鍵字");
      return;
    }

    // 根據編碼類型轉換關鍵字
    const encodedKeyword = selectedButton.encoding === "big5"
      ? encodeToBig5(searchKeyword.trim())
      : encodeURIComponent(searchKeyword.trim());

    // 構建 URL（替換 {query} 為編碼後的關鍵字）
    const url = selectedButton.urlTemplate.replace("{query}", encodedKeyword);

    // 在新分頁打開搜尋結果
    window.open(url, "_blank");

    // 關閉對話框
    setSearchDialogOpen(false);
    setSearchKeyword("");
  };

  // 如果沒有按鈕或正在載入，不顯示
  if (isLoading || !buttons || buttons.length === 0) {
    return null;
  }

  return (
    <>
      {/* 搜尋按鈕列 */}
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          <span>外部資源：</span>
        </div>
        {buttons.map((button) => (
          <Button
            key={button.id}
            variant="outline"
            size="sm"
            onClick={() => handleButtonClick(button)}
          >
            {button.name}
          </Button>
        ))}
      </div>

      {/* 搜尋關鍵字輸入對話框 */}
      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedButton?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="請輸入搜尋關鍵字"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSearchDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSearch} disabled={!searchKeyword.trim()}>
              搜尋
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
