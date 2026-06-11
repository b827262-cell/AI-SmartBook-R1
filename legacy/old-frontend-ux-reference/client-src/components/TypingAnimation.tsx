/**
 * TypingAnimation 組件
 * 顯示 AI 正在思考的打字動畫效果
 */

export function TypingAnimation() {
  return (
    <div className="flex items-center gap-1">
      <div 
        className="w-2 h-2 bg-primary rounded-full animate-pulse" 
        style={{ 
          animationDuration: '1.4s',
          animationDelay: '0s'
        }} 
      />
      <div 
        className="w-2 h-2 bg-primary rounded-full animate-pulse" 
        style={{ 
          animationDuration: '1.4s',
          animationDelay: '0.2s'
        }} 
      />
      <div 
        className="w-2 h-2 bg-primary rounded-full animate-pulse" 
        style={{ 
          animationDuration: '1.4s',
          animationDelay: '0.4s'
        }} 
      />
    </div>
  );
}
