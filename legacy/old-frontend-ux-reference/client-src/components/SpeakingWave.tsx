/**
 * SpeakingWave - 朗讀中音波動畫元件
 * 顯示三條高度不同的跳動音波，表示目前正在朗讀
 */
export function SpeakingWave({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-end gap-[2px] h-4 ${className}`}
      aria-label="朗讀中"
      title="朗讀中"
    >
      <span
        className="w-[3px] rounded-full bg-blue-500"
        style={{
          height: "8px",
          animation: "speakWave 0.8s ease-in-out infinite",
          animationDelay: "0s",
        }}
      />
      <span
        className="w-[3px] rounded-full bg-blue-500"
        style={{
          height: "12px",
          animation: "speakWave 0.8s ease-in-out infinite",
          animationDelay: "0.15s",
        }}
      />
      <span
        className="w-[3px] rounded-full bg-blue-500"
        style={{
          height: "8px",
          animation: "speakWave 0.8s ease-in-out infinite",
          animationDelay: "0.3s",
        }}
      />
      <style>{`
        @keyframes speakWave {
          0%, 100% { transform: scaleY(0.4); opacity: 0.6; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </span>
  );
}
