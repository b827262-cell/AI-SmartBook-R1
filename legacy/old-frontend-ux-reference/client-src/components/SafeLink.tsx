import { useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SafeLinkProps {
  href?: string;
  children: React.ReactNode;
  className?: string;
}

// 信任的域名白名單
const TRUSTED_DOMAINS = [
  'gov.tw',         // 政府網站
  'edu.tw',         // 教育機構
  'wikipedia.org',  // 維基百科
  'youtube.com',    // YouTube
  'youtu.be',       // YouTube 短網址
  'google.com',     // Google
];

// 檢查是否為信任的域名
function isTrustedDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // 檢查是否匹配白名單中的任何域名
    return TRUSTED_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    // 無效的 URL
    return false;
  }
}

export function SafeLink({ href, children, className }: SafeLinkProps) {
  const [showWarning, setShowWarning] = useState(false);

  // 如果沒有 href，直接返回文字
  if (!href) {
    return <span className={className}>{children}</span>;
  }

  // 檢查是否為外部連結
  const isExternal = href.startsWith('http://') || href.startsWith('https://');
  const isTrusted = isExternal && isTrustedDomain(href);

  // 處理點擊事件
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // 如果是外部連結且不在白名單中，顯示警告
    if (isExternal && !isTrusted) {
      e.preventDefault();
      setShowWarning(true);
    }
    // 信任的連結或內部連結直接開啟
  };

  // 確認開啟外部連結
  const handleConfirm = () => {
    window.open(href, '_blank', 'noopener,noreferrer');
    setShowWarning(false);
  };

  return (
    <>
      <a
        href={href}
        onClick={handleClick}
        className={`text-black hover:text-gray-700 underline font-semibold inline-flex items-center gap-1 ${className || ''}`}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
      >
        {children}
        {isExternal && (
          <ExternalLink className="w-3 h-3 inline-block" />
        )}
      </a>

      {/* 外部連結警告對話框 */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ 外部連結警告</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>您即將離開 iBrain 智匯，前往外部網站：</p>
              <div className="p-3 bg-muted rounded-lg break-all text-sm font-mono">
                {href}
              </div>
              <p className="text-destructive font-medium">
                請注意：我們無法保證外部網站的安全性和內容準確性。
              </p>
              <p className="text-sm text-muted-foreground">
                建議您：
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>確認網址是否正確</li>
                <li>不要在不信任的網站輸入個人資訊</li>
                <li>注意釣魚網站和詐騙連結</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              我了解風險，繼續前往
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
