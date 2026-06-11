/**
 * CoinAnimation - 全域金幣飛走動畫元件
 * 使用 ReactDOM.createPortal 渲染到 document.body，
 * 確保跨頁面跳轉時動畫不受影響。
 * 監聽 window 上的 "ibrain:deductCredits" 事件觸發動畫。
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

export const DEDUCT_CREDITS_EVENT = "ibrain:deductCredits";

export function emitDeductCredits(amount: number = 1) {
  window.dispatchEvent(new CustomEvent(DEDUCT_CREDITS_EVENT, { detail: { amount } }));
}

interface FlyingCoin {
  id: number;
  x: number;        // viewport x（金幣起始位置）
  y: number;        // viewport y
  dx: number;       // 飛行 x 偏移
  dy: number;       // 飛行 y 偏移（向上）
}

let globalCoinId = 0;

export function CoinAnimation() {
  const [coins, setCoins] = useState<FlyingCoin[]>([]);

  const handleEvent = useCallback((e: Event) => {
    const amount = (e as CustomEvent).detail?.amount ?? 1;

    // 嘗試從 DOM 找到點數按鈕位置
    const btn = document.querySelector("[data-coin-btn]");
    const rect = btn?.getBoundingClientRect();
    const baseX = rect ? rect.left + rect.width / 2 : window.innerWidth - 80;
    const baseY = rect ? rect.top + rect.height / 2 : 32;

    // 多枚金幣散射飛出，方向各不相同
    const angles = amount === 1
      ? [0]
      : amount === 3
        ? [-30, 0, 30]   // 三枚：左、中、右
        : Array.from({ length: amount }, (_, i) => -45 + (90 / (amount - 1)) * i);

    const newCoins: FlyingCoin[] = angles.map((angleDeg, i) => {
      const rad = (angleDeg - 90) * (Math.PI / 180); // -90 讓預設向上
      const dist = 70 + Math.random() * 30;
      return {
        id: ++globalCoinId,
        x: baseX,
        y: baseY,
        dx: Math.cos(rad) * dist,
        dy: Math.sin(rad) * dist,
      };
    });

    setCoins(prev => [...prev, ...newCoins]);

    // 動畫結束後移除
    setTimeout(() => {
      setCoins(prev => prev.filter(c => !newCoins.some(n => n.id === c.id)));
    }, 1000);
  }, []);

  useEffect(() => {
    window.addEventListener(DEDUCT_CREDITS_EVENT, handleEvent);
    return () => window.removeEventListener(DEDUCT_CREDITS_EVENT, handleEvent);
  }, [handleEvent]);

  if (coins.length === 0) return null;

  return createPortal(
    <>
      {coins.map(coin => (
        <span
          key={coin.id}
          style={{
            position: "fixed",
            left: coin.x,
            top: coin.y,
            fontSize: "1.5rem",
            lineHeight: 1,
            pointerEvents: "none",
            zIndex: 99999,
            transform: "translate(-50%, -50%)",
            animation: "coinFlyAway 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",
            // 每枚金幣稍微不同的飛行方向
            "--coin-dx": `${coin.dx}px`,
            "--coin-dy": `${coin.dy}px`,
          } as React.CSSProperties}
        >
          🪙
        </span>
      ))}
    </>,
    document.body
  );
}
