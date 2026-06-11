import { useCallback, useEffect, useRef, useState } from "react";

// ===== localStorage 設定 key =====
export const TTS_SETTINGS_KEY = "tts_user_settings";

export interface TTSUserSettings {
  rate: number;         // 中文語速 0.5 ~ 2.0，預設 1.3
  englishRate: number;  // 英文語速 0.5 ~ 2.0，預設 0.85（慢速，方便初學者聆聽）
  pitch: number;        // 0.5 ~ 2.0，預設 1.0
  autoSpeak: boolean;   // 自動朗讀 AI 回覆，預設 false
}

export const TTS_DEFAULT_SETTINGS: TTSUserSettings = {
  rate: 1.3,
  englishRate: 0.85,
  pitch: 1.0,
  autoSpeak: false,
};

export function getTTSSettings(): TTSUserSettings {
  try {
    const raw = localStorage.getItem(TTS_SETTINGS_KEY);
    if (!raw) return { ...TTS_DEFAULT_SETTINGS };
    return { ...TTS_DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...TTS_DEFAULT_SETTINGS };
  }
}

export function saveTTSSettings(settings: Partial<TTSUserSettings>) {
  const current = getTTSSettings();
  const next = { ...current, ...settings };
  localStorage.setItem(TTS_SETTINGS_KEY, JSON.stringify(next));
  // 通知其他 hook 實例更新
  window.dispatchEvent(new CustomEvent("tts-settings-changed", { detail: next }));
}

// ===== 語音解鎖狀態（全域，只需解鎖一次） =====
let _speechUnlocked = false;

/**
 * 解鎖 speechSynthesis：在用戶互動事件中呼叫，播放一個靜音語音
 * 讓後續的自動朗讀不被瀏覽器安全政策封鎖
 */
export function unlockSpeech() {
  if (_speechUnlocked || !("speechSynthesis" in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    u.rate = 10;
    u.onend = () => { _speechUnlocked = true; };
    u.onerror = () => { _speechUnlocked = true; }; // 即使失敗也標記已嘗試
    window.speechSynthesis.speak(u);
  } catch {
    _speechUnlocked = true;
  }
}

// ===== 語言偵測（整段） =====
/**
 * 偵測文字是否以英文為主（英文字元佔比超過 60%）
 * 用於整段語言判斷
 */
export function detectLanguage(text: string): "en" | "zh" {
  if (!text || text.trim().length === 0) return "zh";
  const cleaned = text.replace(/[\s\d\p{P}]/gu, "");
  if (cleaned.length === 0) return "zh";
  const englishChars = (cleaned.match(/[a-zA-Z]/g) || []).length;
  const ratio = englishChars / cleaned.length;
  return ratio >= 0.6 ? "en" : "zh";
}

// ===== 中英混讀：將文字切成語言段落 =====
export interface LangSegment {
  text: string;
  lang: "en" | "zh";
}

/**
 * 將文字依語言切段，供中英混讀使用。
 *
 * 規則：
 * - 連續的英文單字（含數字、空格、標點）歸為一段 "en"
 * - 其餘中文、符號等歸為一段 "zh"
 * - 相鄰同語言段落會合併
 * - 英文段落長度 < 2 個字元（如單一字母 "a"）時，合併回前後中文段，避免頻繁切換
 *
 * 範例：
 *   "CV 通常用於學術，cover letter 也很重要"
 *   → [{ text: "CV", lang: "en" }, { text: " 通常用於學術，", lang: "zh" },
 *      { text: "cover letter", lang: "en" }, { text: " 也很重要", lang: "zh" }]
 */
export function splitByLanguage(text: string): LangSegment[] {
  if (!text) return [];

  // 用正則將文字切成「英文詞組」和「非英文詞組」交替的 token
  // 英文詞組：連續的英文字母、數字、空格、連字號、撇號（例如 "cover letter", "don't", "GPT-4"）
  const tokens = text.split(/([a-zA-Z][a-zA-Z0-9\s\-'.]*[a-zA-Z0-9]|[a-zA-Z])/g);

  const raw: LangSegment[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t) continue;
    // 奇數 index 是英文捕獲群組
    const isEn = i % 2 === 1;
    raw.push({ text: t, lang: isEn ? "en" : "zh" });
  }

  // 合併相鄰同語言段落
  const merged: LangSegment[] = [];
  for (const seg of raw) {
    if (!seg.text.trim() && merged.length > 0) {
      // 純空白：附加到前一段
      merged[merged.length - 1].text += seg.text;
      continue;
    }
    if (merged.length > 0 && merged[merged.length - 1].lang === seg.lang) {
      merged[merged.length - 1].text += seg.text;
    } else {
      merged.push({ ...seg });
    }
  }

  // 過濾空段落
  const filtered = merged.filter(s => s.text.trim().length > 0);

  // 短英文段（< 3 個字母）合併回相鄰中文段，避免頻繁語音切換
  const result: LangSegment[] = [];
  for (let i = 0; i < filtered.length; i++) {
    const seg = filtered[i];
    const englishLetters = (seg.text.match(/[a-zA-Z]/g) || []).length;
    if (seg.lang === "en" && englishLetters < 3) {
      // 合併到前一段（若存在），否則合併到後一段
      if (result.length > 0) {
        result[result.length - 1].text += seg.text;
      } else if (i + 1 < filtered.length) {
        filtered[i + 1].text = seg.text + filtered[i + 1].text;
      } else {
        result.push(seg);
      }
    } else {
      result.push({ ...seg });
    }
  }

  return result.filter(s => s.text.trim().length > 0);
}

// ===== 數字預處理：將逗號分隔數字轉為中文讀法 =====
/**
 * 將大數字（如 300,000）轉換為中文讀法（三十萬）
 * 避免 YATING 將逗號分隔數字唸錯（如「三百 零零零」）
 */
function numberToChinese(n: number): string {
  if (n === 0) return "零";
  const units = ["", "萬", "億", "兆"];
  const subUnits = ["", "十", "百", "千"];
  const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  
  let result = "";
  let unitIndex = 0;
  let num = n;
  
  while (num > 0) {
    const group = num % 10000;
    if (group !== 0) {
      let groupStr = "";
      let hasZero = false;
      const g = group;
      const thousands = Math.floor(g / 1000);
      const hundreds = Math.floor((g % 1000) / 100);
      const tens = Math.floor((g % 100) / 10);
      const ones = g % 10;
      
      if (thousands > 0) { groupStr += digits[thousands] + "千"; hasZero = false; }
      if (hundreds > 0) { if (hasZero) groupStr += "零"; groupStr += digits[hundreds] + "百"; hasZero = false; }
      else if (groupStr) hasZero = true;
      if (tens > 0) {
        if (hasZero) groupStr += "零";
        groupStr += (tens === 1 && groupStr === "" ? "" : digits[tens]) + "十";
        hasZero = false;
      } else if (groupStr) hasZero = true;
      if (ones > 0) { if (hasZero) groupStr += "零"; groupStr += digits[ones]; }
      
      result = groupStr + units[unitIndex] + result;
    }
    num = Math.floor(num / 10000);
    unitIndex++;
  }
  
  // 修正：一十 → 十
  return result.replace(/^一十/, "十");
}

/**
 * 預處理文字：將逗號分隔的數字（如 300,000）轉為中文讀法
 * 同時處理純數字（如 300000）超過 9999 的情況
 */
export function preprocessNumbersForTTS(text: string): string {
  // 先處理帶逗號的數字：1,000 / 10,000 / 300,000 / 1,000,000
  return text.replace(/(\d{1,3}(?:,\d{3})+)/g, (match) => {
    const num = parseInt(match.replace(/,/g, ""), 10);
    if (isNaN(num)) return match;
    return numberToChinese(num);
  });
}

// ===== 法條數字中文化 =====
const ONES = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const TENS = ["", "十", "二十", "三十", "四十", "五十", "六十", "七十", "八十", "九十"];
const HUNDREDS = ["", "一百", "二百", "三百", "四百", "五百", "六百", "七百", "八百", "九百"];

function intToChinese(n: number): string {
  if (n === 0) return "零";
  if (n < 10) return ONES[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return (t === 1 ? "十" : TENS[t]) + (o > 0 ? ONES[o] : "");
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    const tenPart = rest === 0 ? "" : (rest < 10 ? "零" + ONES[rest] : intToChinese(rest));
    return HUNDREDS[h] + tenPart;
  }
  // 1000+：千位
  const q = Math.floor(n / 1000);
  const rest = n % 1000;
  const restStr = rest === 0 ? "" : (rest < 100 ? "零" + intToChinese(rest) : intToChinese(rest));
  return ONES[q] + "千" + restStr;
}

/**
 * 將法條文字中的阿拉伯數字轉為中文
 * 例：「第123條第2項」→「第一百二十三條第二項」
 */
export function convertLawNumbersToChinese(text: string): string {
  return text
    .replace(/第\s*(\d+)\s*條/g, (_, n) => `第${intToChinese(parseInt(n, 10))}條`)
    .replace(/第\s*(\d+)\s*項/g, (_, n) => `第${intToChinese(parseInt(n, 10))}項`)
    .replace(/第\s*(\d+)\s*款/g, (_, n) => `第${intToChinese(parseInt(n, 10))}款`)
    .replace(/第\s*(\d+)\s*目/g, (_, n) => `第${intToChinese(parseInt(n, 10))}目`)
    .replace(/第\s*(\d+)\s*章/g, (_, n) => `第${intToChinese(parseInt(n, 10))}章`)
    .replace(/第\s*(\d+)\s*節/g, (_, n) => `第${intToChinese(parseInt(n, 10))}節`);
}

// ===== 助教角色語音設定（固定音調，語速由用戶設定覆蓋） =====
const TUTOR_VOICE_SETTINGS: Record<string, { voiceKeywords: string[]; pitch: number }> = {
  "親切學姐": { voiceKeywords: ["Yating", "Google 國語", "zh-TW"], pitch: 1.0 },
  "親切學長": { voiceKeywords: ["Zhiwei", "Google 國語", "zh-TW"], pitch: 0.95 },
  "嚴格學姐": { voiceKeywords: ["Yating", "zh-TW"], pitch: 1.0 },
  "嚴格學長": { voiceKeywords: ["Zhiwei", "zh-TW"], pitch: 0.9 },
  "幽默學姐": { voiceKeywords: ["Yating", "Google 國語", "zh-TW"], pitch: 1.0 },
  "幽默學長": { voiceKeywords: ["Zhiwei", "Google 國語", "zh-TW"], pitch: 1.0 },
};

// 預設（無角色時）→ 優先 Yating 女聲
const DEFAULT_VOICE_KEYWORDS = ["Yating", "Google 國語", "zh-TW", "zh"];

// 英文聲音優先順序：Google US English > Google UK English > en-US > en
const ENGLISH_VOICE_KEYWORDS = ["Google US English", "Google UK English Female", "en-US", "en-GB", "en"];

function findBestVoice(voices: SpeechSynthesisVoice[], keywords: string[]): SpeechSynthesisVoice | null {
  for (const keyword of keywords) {
    const found = voices.find(v => v.name.includes(keyword) || v.lang === keyword || v.lang.startsWith(keyword));
    if (found) return found;
  }
  return voices[0] || null;
}

export function useTTS(tutorName?: string) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [userSettings, setUserSettings] = useState<TTSUserSettings>(getTTSSettings);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  // 用於中英混讀：追蹤目前正在播放的段落佇列
  const segmentQueueRef = useRef<LangSegment[]>([]);
  const currentSegmentRef = useRef<number>(0);
  const isCancelledRef = useRef<boolean>(false);

  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) setVoices(v);
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;

    // 監聽設定變更事件（其他元件呼叫 saveTTSSettings 時同步更新）
    const onSettingsChanged = (e: Event) => {
      setUserSettings((e as CustomEvent<TTSUserSettings>).detail);
    };
    window.addEventListener("tts-settings-changed", onSettingsChanged);

    // 監聽用戶第一次互動，自動解鎖語音
    const onFirstInteraction = () => {
      unlockSpeech();
      document.removeEventListener("click", onFirstInteraction);
      document.removeEventListener("keydown", onFirstInteraction);
      document.removeEventListener("touchstart", onFirstInteraction);
    };
    document.addEventListener("click", onFirstInteraction);
    document.addEventListener("keydown", onFirstInteraction);
    document.addEventListener("touchstart", onFirstInteraction);

    return () => {
      window.speechSynthesis.cancel();
      window.removeEventListener("tts-settings-changed", onSettingsChanged);
      document.removeEventListener("click", onFirstInteraction);
      document.removeEventListener("keydown", onFirstInteraction);
      document.removeEventListener("touchstart", onFirstInteraction);
    };
  }, []);

  /**
   * 播放單一段落（內部使用）
   * 播放完畢後自動播放下一段（中英混讀核心）
   */
  const _playSegment = useCallback((
    seg: LangSegment,
    settings: TTSUserSettings,
    onDone: () => void,
  ) => {
    const utterance = new SpeechSynthesisUtterance(seg.text);
    utterance.rate = settings.rate;

    // 不論中英文，一律使用中文語音（YATING），避免中英交替切換語音
    {
      const tutorConfig = tutorName ? TUTOR_VOICE_SETTINGS[tutorName] : null;
      const voiceKeywords = tutorConfig ? tutorConfig.voiceKeywords : DEFAULT_VOICE_KEYWORDS;
      const voice = findBestVoice(voices, voiceKeywords);
      if (voice) utterance.voice = voice;
      utterance.lang = "zh-TW";
      utterance.pitch = tutorConfig ? tutorConfig.pitch : settings.pitch;
    }

    utterance.onend = () => { onDone(); };
    utterance.onerror = (e) => {
      if (e.error !== "interrupted") onDone();
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [voices, tutorName]);

  /**
   * 主要朗讀函式：支援中英混讀
   * - 將文字切成語言段落
   * - 依序播放每個段落，自動切換語音
   */
  const speak = useCallback((text: string, index?: number) => {
    if (!("speechSynthesis" in window) || !text.trim()) return;
    window.speechSynthesis.cancel();

    const settings = getTTSSettings();
    isCancelledRef.current = false;

    // 預處理：將逗號分隔數字轉為中文（如 300,000 → 三十萬）
    const processedText = preprocessNumbersForTTS(text);

    // 切段
    const segments = splitByLanguage(processedText);
    if (segments.length === 0) return;

    segmentQueueRef.current = segments;
    currentSegmentRef.current = 0;

    setIsSpeaking(true);
    setSpeakingIndex(index ?? null);

    // 遞迴播放下一段
    const playNext = () => {
      if (isCancelledRef.current) {
        setIsSpeaking(false);
        setSpeakingIndex(null);
        return;
      }
      const idx = currentSegmentRef.current;
      if (idx >= segmentQueueRef.current.length) {
        // 全部播完
        setIsSpeaking(false);
        setSpeakingIndex(null);
        return;
      }
      currentSegmentRef.current = idx + 1;
      _playSegment(segmentQueueRef.current[idx], settings, playNext);
    };

    playNext();
  }, [voices, tutorName, _playSegment]);

  /**
   * speakCustom：與 speak 相同，但允許傳入自訂文字（不做截斷）
   * 保留此別名供現有呼叫端使用
   */
  const speakCustom = useCallback((text: string) => {
    speak(text);
  }, [speak]);

  /**
   * speakEnglish：原本強制用英文語音，現改為使用中文語音（YATING）統一發音
   * 避免中英交替切換語音造成不自然的聆聽體驗
   */
  const speakEnglish = useCallback((text: string, index?: number) => {
    // 直接呼叫 speak，使用統一的中文語音
    speak(text, index);
  }, [speak]);

  const stop = useCallback(() => {
    isCancelledRef.current = true;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeakingIndex(null);
  }, []);

  return {
    speak,
    speakCustom,
    speakEnglish,
    stop,
    isSpeaking,
    speakingIndex,
    voicesLoaded: voices.length > 0,
    autoSpeak: userSettings.autoSpeak,
    userSettings,
  };
}
