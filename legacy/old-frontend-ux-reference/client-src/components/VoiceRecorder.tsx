import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  className?: string;
  compact?: boolean; // 小型模式，符合輸入列風格
}

export function VoiceRecorder({ onTranscript, onError, className, compact = false }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // 語音識別 mutation
  const transcribeMutation = trpc.voice.transcribe.useMutation();

  // 開始錄音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
        
        // 停止所有音頻軌道
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("[VoiceRecorder] Failed to start recording:", error);
      onError?.("無法啟動麥克風，請檢查權限設定");
    }
  };

  // 停止錄音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  // 處理音頻（發送到後端進行語音識別）
  const processAudio = async (audioBlob: Blob) => {
    // 將 Blob 轉換為 Base64
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    
    reader.onloadend = async () => {
      try {
        const base64Audio = reader.result as string;
        const base64Data = base64Audio.split(",")[1]; // 移除 "data:audio/webm;base64," 前綴

        // 調用後端 API 進行語音識別
        const result = await transcribeMutation.mutateAsync({
          audioBase64: base64Data,
          filename: `recording-${Date.now()}.webm`,
        });
        
        if (result.success) {
          console.log("[VoiceRecorder] Transcribed:", result.text);
          onTranscript(result.text);
        } else {
          throw new Error("語音識別失敗");
        }
      } catch (error) {
        console.error("[VoiceRecorder] Failed to process audio:", error);
        onError?.("語音識別失敗，請重試");
      } finally {
        setIsProcessing(false);
        audioChunksRef.current = []; // 清空音頻緩衝
      }
    };
  };

  // 清理資源
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  if (compact) {
    // 小型模式：符合輸入列的 size="sm" 按鈕風格
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {!isRecording && !isProcessing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startRecording}
            className="gap-1 flex-shrink-0"
            title="語音輸入"
          >
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">語音</span>
          </Button>
        )}
        {isRecording && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={stopRecording}
            className="gap-1 flex-shrink-0 animate-pulse"
            title="停止錄音"
          >
            <Square className="w-4 h-4 fill-current" />
            <span className="text-xs">停止</span>
          </Button>
        )}
        {isProcessing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
            className="gap-1 flex-shrink-0"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">識別中</span>
          </Button>
        )}
      </div>
    );
  }

  // 預設大型模式
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {!isRecording && !isProcessing && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={startRecording}
          className="rounded-full w-12 h-12 hover:bg-primary hover:text-primary-foreground transition-colors"
          title="按住說話"
        >
          <Mic className="h-5 w-5" />
        </Button>
      )}

      {isRecording && (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          onClick={stopRecording}
          className="rounded-full w-12 h-12 animate-pulse"
          title="停止錄音"
        >
          <Square className="h-5 w-5 fill-current" />
        </Button>
      )}

      {isProcessing && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled
          className="rounded-full w-12 h-12"
        >
          <Loader2 className="h-5 w-5 animate-spin" />
        </Button>
      )}

      {isRecording && (
        <span className="text-sm text-muted-foreground animate-pulse">
          正在錄音...
        </span>
      )}

      {isProcessing && (
        <span className="text-sm text-muted-foreground">
          正在識別...
        </span>
      )}
    </div>
  );
}
