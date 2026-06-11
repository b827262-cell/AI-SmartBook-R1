import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "./ui/button";

/**
 * 文字輪播 Banner 組件
 * 顯示在對話頁面上方，約 5 則訊息輪播
 * 點擊可導向外部網站
 */
export function TextBannerCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // 獲取啟用的 Banner
  const { data: banners, isLoading } = trpc.banner.getActiveBanners.useQuery({
    targetAudience: "student",
  });

  // 自動輪播（每 5 秒切換一次，除非鼠標懸停）
  useEffect(() => {
    if (!banners || banners.length === 0 || isHovered) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners, isHovered]);

  // 手動切換到上一個
  const handlePrev = () => {
    if (!banners || banners.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  // 手動切換到下一個
  const handleNext = () => {
    if (!banners || banners.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  // 點擊 Banner 導向外部網站
  const handleBannerClick = (linkUrl?: string | null) => {
    if (linkUrl) {
      window.open(linkUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (isLoading || !banners || banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <div
      className="relative bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border px-4 py-3"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="max-w-5xl mx-auto flex items-center gap-3">
        {/* 左箭頭 */}
        {banners.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Banner 內容 */}
        <div
          className={`flex-1 flex items-center gap-2 ${
            currentBanner.linkUrl ? "cursor-pointer hover:opacity-80" : ""
          } transition-opacity`}
          onClick={() => handleBannerClick(currentBanner.linkUrl)}
        >
          {/* 標題 */}
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="font-medium text-sm text-foreground">
                {currentBanner.title}
              </span>
              {currentBanner.linkUrl && (
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
            {/* 描述（可選） */}
            {currentBanner.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {currentBanner.description}
              </p>
            )}
          </div>

          {/* 指示器 */}
          {banners.length > 1 && (
            <div className="flex gap-1">
              {banners.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    index === currentIndex
                      ? "bg-primary"
                      : "bg-muted-foreground/30"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* 右箭頭 */}
        {banners.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={handleNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
