export type ExternalAiProviderId = "google" | "chatgpt" | "claude" | "gemini";

export type PromptTemplateId = "summary" | "analysis" | "question" | "exam";

export interface ExternalAiProvider {
  id: ExternalAiProviderId;
  name: string;
  homeUrl: string;
  description: string;
  buttonText: string;
  buttonClass?: string;
}

export interface PromptTemplateContext {
  bookTitle?: string;
  pageLabel?: string;
  selectedText?: string;
  extraNotes?: string;
}

export interface PromptTemplate {
  id: PromptTemplateId;
  title: string;
  description: string;
  buildPrompt: (context: PromptTemplateContext) => string;
}

export const EXTERNAL_AI_PROVIDERS: readonly ExternalAiProvider[] = [
  {
    id: "google",
    name: "Google",
    homeUrl: "https://google.com/ai",
    description: "開啟 Google AI，請將提示詞貼上對話區。",
    buttonText: "Google",
    buttonClass: "google"
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    homeUrl: "https://chatgpt.com/",
    description: "開啟 ChatGPT，將提示詞貼到輸入框。",
    buttonText: "ChatGPT",
    buttonClass: "chatgpt"
  },
  {
    id: "claude",
    name: "Claude",
    homeUrl: "https://claude.ai/new",
    description: "開啟 Claude，將提示詞貼到輸入框並上傳截圖。",
    buttonText: "Claude",
    buttonClass: "claude"
  },
  {
    id: "gemini",
    name: "Gemini",
    homeUrl: "https://gemini.google.com/app",
    description: "開啟 Gemini，貼上提示詞後可直接上傳截圖分析。",
    buttonText: "Gemini",
    buttonClass: "gemini"
  }
] as const;

export const EXTERNAL_AI_PROMPT_TEMPLATES: readonly PromptTemplate[] = [
  {
    id: "summary",
    title: "整理重點",
    description: "先提取頁面重點、概念與關係。",
    buildPrompt: ({ bookTitle, pageLabel, selectedText, extraNotes }) => {
      const source = [bookTitle, pageLabel].filter(Boolean).join("／");
      const baseText = selectedText?.trim();
      const noteText = extraNotes?.trim();
      const chunks = [
        "你是學生導師，請先根據我提供的頁面內容做條列整理。",
        source ? `來源：${source}` : "來源：課本頁面",
        "要求：",
        "1. 列出核心概念",
        "2. 梳理關鍵公式或定義",
        "3. 用簡短語句補充可能誤區與延伸題"
      ];
      if (baseText) chunks.push(`\n已選文字：\n${baseText}`);
      if (noteText) chunks.push(`\n補充：${noteText}`);
      return chunks.join("\n");
    }
  },
  {
    id: "analysis",
    title: "逐步解析",
    description: "用步驟分解題目或段落，適合複習理解。",
    buildPrompt: ({ bookTitle, pageLabel, selectedText, extraNotes }) => {
      const source = [bookTitle, pageLabel].filter(Boolean).join("／");
      const baseText = selectedText?.trim();
      const noteText = extraNotes?.trim();
      const chunks = [
        "你是教學導師，請對指定內容逐步解析。",
        `來源：${source || "課本內容"}`,
        "步驟：",
        "1. 指出已知條件",
        "2. 拆解解題流程",
        "3. 解釋關鍵推導/邏輯",
        "4. 給 1~2 個自我檢核方向"
      ];
      if (baseText) chunks.push(`\n原文：\n${baseText}`);
      if (noteText) chunks.push(`\n補充：${noteText}`);
      return chunks.join("\n");
    }
  },
  {
    id: "question",
    title: "延伸提問",
    description: "依頁面內容產生 3~5 題複習問題。",
    buildPrompt: ({ bookTitle, pageLabel, selectedText }) => {
      const source = [bookTitle, pageLabel].filter(Boolean).join("／");
      const baseText = selectedText?.trim();
      const chunks = [
        "你是測驗設計助教，請根據以下教材內容，設計中等難度的複習題。",
        `來源：${source || "課本頁面"}`,
        "請輸出：",
        "- 選擇題 3 題（含答案）",
        "- 問答題 2 題（含參考解答）",
        "- 每題都要標記考點"
      ];
      if (baseText) chunks.push(`\n教材原文：\n${baseText}`);
      return chunks.join("\n");
    }
  },
  {
    id: "exam",
    title: "出題與解析",
    description: "用頁面重點生成模擬考題與簡潔標準答案。",
    buildPrompt: ({ bookTitle, pageLabel, selectedText, extraNotes }) => {
      const source = [bookTitle, pageLabel].filter(Boolean).join("／");
      const baseText = selectedText?.trim();
      const noteText = extraNotes?.trim();
      const chunks = [
        "你是考試命題設計師，請基於下列內容產生可直接給學生的出題與解析。",
        `來源：${source || "課本頁面"}`,
        "輸出格式：題號、題目、標準答案、重點解析。",
        "題目應包含概念題與應用題。",
        "請保持答案簡潔且便於學生檢核。"
      ];
      if (baseText) chunks.push(`\n參考文字：\n${baseText}`);
      if (noteText) chunks.push(`\n備註：${noteText}`);
      return chunks.join("\n");
    }
  }
] as const;

export function getPromptTemplate(id: PromptTemplateId): PromptTemplate {
  const found = EXTERNAL_AI_PROMPT_TEMPLATES.find((template) => template.id === id);
  if (!found) throw new Error(`Unknown prompt template: ${id}`);
  return found;
}

export function getExternalAiProvider(id: ExternalAiProviderId): ExternalAiProvider {
  const found = EXTERNAL_AI_PROVIDERS.find((provider) => provider.id === id);
  if (!found) throw new Error(`Unknown external AI provider: ${id}`);
  return found;
}

export function openExternalAi(providerId: ExternalAiProviderId): Window | null {
  const provider = getExternalAiProvider(providerId);
  const next = window.open(provider.homeUrl, "_blank", "noopener,noreferrer");
  if (!next) {
    throw new Error("無法開啟外部視窗，請確認瀏覽器未封鎖彈窗。");
  }
  return next;
}

function createPromptCopyFallback(prompt: string): string {
  return `提示詞:\n${prompt}`;
}

export async function copyPrompt(prompt: string): Promise<boolean> {
  const text = prompt.trim();
  if (!text) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }

  try {
    const backup = createPromptCopyFallback(text);
    const textarea = document.createElement("textarea");
    textarea.value = backup;
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function isBlobLikeImage(value: Blob | string | null | undefined): value is Blob {
  return value != null && (value instanceof Blob || (value as unknown) instanceof File);
}

async function blobFromImageSource(image: string | Blob | File): Promise<Blob> {
  if (isBlobLikeImage(image)) return image as Blob;

  if (image.startsWith("data:")) {
    const [, encoded] = image.split(",", 2);
    const mime = image.match(/data:([^;]+);base64,/i)?.[1] ?? "image/png";
    if (!encoded) throw new Error("無法解析影像資料。");
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  const response = await fetch(image);
  if (!response.ok) throw new Error(`影像讀取失敗：${response.status}`);
  return response.blob();
}

export async function copyImage(imageSource: string | Blob | File): Promise<boolean> {
  try {
    if (!navigator.clipboard?.write) {
      return false;
    }
    const imageBlob = await blobFromImageSource(imageSource);
    const item = new ClipboardItem({ [imageBlob.type || "image/png"]: imageBlob });
    await navigator.clipboard.write([item]);
    return true;
  } catch {
    return false;
  }
}
