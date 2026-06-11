import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Volume2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  getTTSSettings,
  saveTTSSettings,
  TTS_DEFAULT_SETTINGS,
  type TTSUserSettings,
} from "@/hooks/useTTS";

export function TTSSettingsPanel() {
  const [settings, setSettings] = useState<TTSUserSettings>(getTTSSettings);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewEnPlaying, setPreviewEnPlaying] = useState(false);

  // 監聽其他地方的設定變更
  useEffect(() => {
    const handler = (e: Event) => {
      setSettings((e as CustomEvent<TTSUserSettings>).detail);
    };
    window.addEventListener("tts-settings-changed", handler);
    return () => window.removeEventListener("tts-settings-changed", handler);
  }, []);

  const update = (patch: Partial<TTSUserSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveTTSSettings(next);
  };

  const handlePreview = () => {
    if (!("speechSynthesis" in window)) {
      toast.error("您的瀏覽器不支援語音合成");
      return;
    }
    window.speechSynthesis.cancel();
    const voices = window.speechSynthesis.getVoices();
    const yating = voices.find(v => v.name.includes("Yating"))
      || voices.find(v => v.lang.startsWith("zh"))
      || voices[0];
    const u = new SpeechSynthesisUtterance(
      "您好，我是 iBrain 智匯，很高興為您服務！這是 Microsoft Yating 語速一點三倍的試聽效果。"
    );
    u.rate = settings.rate;
    u.pitch = settings.pitch;
    if (yating) u.voice = yating;
    u.onstart = () => setPreviewPlaying(true);
    u.onend = () => setPreviewPlaying(false);
    u.onerror = () => setPreviewPlaying(false);
    window.speechSynthesis.speak(u);
  };

  const handlePreviewEn = () => {
    if (!("speechSynthesis" in window)) {
      toast.error("您的瀏覽器不支援語音合成");
      return;
    }
    window.speechSynthesis.cancel();
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.name.includes("Google US English"))
      || voices.find(v => v.name.includes("Samantha"))
      || voices.find(v => v.lang === "en-US")
      || voices.find(v => v.lang.startsWith("en"));
    const u = new SpeechSynthesisUtterance(
      "She updated her resume before applying for the job."
    );
    u.rate = settings.englishRate ?? 0.85;
    u.pitch = settings.pitch;
    if (enVoice) u.voice = enVoice;
    u.lang = "en-US";
    u.onstart = () => setPreviewEnPlaying(true);
    u.onend = () => setPreviewEnPlaying(false);
    u.onerror = () => setPreviewEnPlaying(false);
    window.speechSynthesis.speak(u);
  };

  const handleReset = () => {
    setSettings({ ...TTS_DEFAULT_SETTINGS });
    saveTTSSettings({ ...TTS_DEFAULT_SETTINGS });
    toast.success("已還原預設設定");
  };

  const rateLabel = (r: number) => {
    if (r <= 0.7) return "很慢";
    if (r <= 0.9) return "慢速";
    if (r <= 1.1) return "正常";
    if (r <= 1.3) return "稍快";
    if (r <= 1.5) return "快速";
    return "很快";
  };

  return (
    <div className="space-y-5">
      {/* 自動朗讀開關 */}
      <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-blue-800">🔊 AI 回覆自動朗讀</p>
          <p className="text-xs text-blue-600 mt-0.5">
            每次 AI 回覆完成後，自動以語音朗讀內容
          </p>
        </div>
        <Switch
          checked={settings.autoSpeak}
          onCheckedChange={(v) => update({ autoSpeak: v })}
        />
      </div>

      {/* 中文語速調整 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">🇨🇳 中文語速</Label>
          <span className="text-xs text-muted-foreground">
            {settings.rate.toFixed(2)}x &nbsp;·&nbsp; {rateLabel(settings.rate)}
          </span>
        </div>
        <Slider
          min={0.5}
          max={2.0}
          step={0.05}
          value={[settings.rate]}
          onValueChange={([v]) => update({ rate: v })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0.5x 很慢</span>
          <span>1.0x 正常</span>
          <span>2.0x 很快</span>
        </div>
      </div>

      {/* 英文語速調整 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">🇺🇸 英文語速</Label>
          <span className="text-xs text-muted-foreground">
            {(settings.englishRate ?? 0.85).toFixed(2)}x &nbsp;·&nbsp; {rateLabel(settings.englishRate ?? 0.85)}
          </span>
        </div>
        <Slider
          min={0.5}
          max={2.0}
          step={0.05}
          value={[settings.englishRate ?? 0.85]}
          onValueChange={([v]) => update({ englishRate: v })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0.5x 很慢</span>
          <span>1.0x 正常</span>
          <span>2.0x 很快</span>
        </div>
        <p className="text-xs text-muted-foreground">建議初學者設 0.7–0.9x，方便聆聽英文例句</p>
      </div>

      {/* 音調調整 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">音調</Label>
          <span className="text-xs text-muted-foreground">
            {settings.pitch.toFixed(2)}
            {settings.pitch < 0.85 ? " · 低沉" : settings.pitch > 1.15 ? " · 高亢" : " · 自然"}
          </span>
        </div>
        <Slider
          min={0.5}
          max={2.0}
          step={0.05}
          value={[settings.pitch]}
          onValueChange={([v]) => update({ pitch: v })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0.5 低沉</span>
          <span>1.0 自然</span>
          <span>2.0 高亢</span>
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreview}
          disabled={previewPlaying}
          className="flex items-center gap-1.5"
        >
          <Volume2 className="w-4 h-4" />
          {previewPlaying ? "播放中..." : "🇨🇳 中文試聽"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreviewEn}
          disabled={previewEnPlaying}
          className="flex items-center gap-1.5"
        >
          <Volume2 className="w-4 h-4" />
          {previewEnPlaying ? "播放中..." : "🇺🇸 英文試聽"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="flex items-center gap-1.5 text-muted-foreground"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          還原預設
        </Button>
      </div>
    </div>
  );
}
