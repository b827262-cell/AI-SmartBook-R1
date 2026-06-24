# AI-SmartBook-R2 PDF Screenshot Ask AI — External AI Buttons Addendum

Date: 2026-06-23

## 1. Purpose

This addendum supplements:

```text
docs/r2/AI-SmartBook-R2-pdf-screenshot-ask-ai-feature-task-20260623.md
```

It provides safe frontend code guidance for the `截圖問 AI` modal external AI buttons.

The buttons should help the user open common AI tools after manually copying the prompt/image.

Important privacy rule:

```text
Do not auto-upload screenshot images.
Do not auto-send prompt text to third-party AI services.
Only open the selected AI website in a new tab after an explicit user click.
```

---

## 2. Suggested Provider Config

Create a small config file, for example:

```text
apps/AI-Stu-R1/src/utils/aiAskProviders.ts
```

Suggested code:

```ts
export type AiAskProvider = {
  id: string;
  label: string;
  url: string;
  className?: string;
  enabled: boolean;
  note?: string;
};

export const AI_ASK_PROVIDERS: AiAskProvider[] = [
  {
    id: "google",
    label: "Google 搜尋",
    url: "https://www.google.com/search?q=",
    className: "ai-provider-google",
    enabled: true,
    note: "開啟 Google 搜尋，請自行貼上 Prompt"
  },
  {
    id: "chatgpt",
    label: "ChatGPT",
    url: "https://chatgpt.com/",
    className: "ai-provider-chatgpt",
    enabled: true,
    note: "開啟 ChatGPT，請自行貼上圖片與 Prompt"
  },
  {
    id: "claude",
    label: "Claude",
    url: "https://claude.ai/",
    className: "ai-provider-claude",
    enabled: true,
    note: "開啟 Claude，請自行貼上圖片與 Prompt"
  },
  {
    id: "perplexity",
    label: "Perplexity",
    url: "https://www.perplexity.ai/",
    className: "ai-provider-perplexity",
    enabled: true,
    note: "開啟 Perplexity，請自行貼上 Prompt"
  },
  {
    id: "grok",
    label: "Grok",
    url: "https://grok.com/",
    className: "ai-provider-grok",
    enabled: true,
    note: "開啟 Grok，請自行貼上圖片與 Prompt"
  },
  {
    id: "gemini",
    label: "Gemini",
    url: "https://gemini.google.com/",
    className: "ai-provider-gemini",
    enabled: true,
    note: "開啟 Gemini，請自行貼上圖片與 Prompt"
  },
  {
    id: "copilot",
    label: "Copilot",
    url: "https://copilot.microsoft.com/",
    className: "ai-provider-copilot",
    enabled: true,
    note: "開啟 Copilot，請自行貼上圖片與 Prompt"
  },
  {
    id: "meta",
    label: "Meta AI",
    url: "https://www.meta.ai/",
    className: "ai-provider-meta",
    enabled: true,
    note: "開啟 Meta AI，請自行貼上圖片與 Prompt"
  }
];
```

---

## 3. Safe Open Helper

Create helper:

```text
apps/AI-Stu-R1/src/utils/openExternalAi.ts
```

Suggested code:

```ts
import type { AiAskProvider } from "./aiAskProviders";

export function openExternalAiProvider(provider: AiAskProvider) {
  if (!provider.enabled) return;

  const popup = window.open(provider.url, "_blank", "noopener,noreferrer");

  if (!popup) {
    window.alert("瀏覽器封鎖了新分頁，請允許彈出視窗後再試一次。");
  }
}
```

Security notes:

```text
1. Use noopener,noreferrer.
2. Do not append screenshot or prompt into URL.
3. Do not use query string to transmit selected OCR/PDF text.
4. Do not auto-submit anything.
```

---

## 4. Clipboard Helpers

Create helper:

```text
apps/AI-Stu-R1/src/utils/clipboard.ts
```

Suggested code:

```ts
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function copyPngBlobToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (!("ClipboardItem" in window)) return false;

    const item = new ClipboardItem({
      "image/png": blob
    });

    await navigator.clipboard.write([item]);
    return true;
  } catch {
    return false;
  }
}
```

Fallback message:

```text
此瀏覽器不支援直接複製圖片，請改用系統截圖工具或右鍵另存圖片。
```

---

## 5. Modal Button Rendering Example

In the modal component, for example:

```text
apps/AI-Stu-R1/src/components/PdfScreenshotAskAiModal.tsx
```

Suggested JSX:

```tsx
import { AI_ASK_PROVIDERS } from "../utils/aiAskProviders";
import { openExternalAiProvider } from "../utils/openExternalAi";
import { copyTextToClipboard, copyPngBlobToClipboard } from "../utils/clipboard";

function AiProviderButtons() {
  return (
    <div className="screenshot-ai-provider-list">
      {AI_ASK_PROVIDERS.filter((provider) => provider.enabled).map((provider) => (
        <button
          key={provider.id}
          type="button"
          className={`screenshot-ai-provider-btn ${provider.className ?? ""}`}
          title={provider.note}
          onClick={() => openExternalAiProvider(provider)}
        >
          {provider.label}
        </button>
      ))}
    </div>
  );
}
```

Copy buttons example:

```tsx
<button
  type="button"
  className="screenshot-ai-copy-btn"
  onClick={async () => {
    const ok = await copyTextToClipboard(activePromptText);
    setNotice(ok ? "已複製 Prompt" : "複製 Prompt 失敗，請手動選取文字複製");
  }}
>
  複製 Prompt
</button>

<button
  type="button"
  className="screenshot-ai-copy-btn"
  onClick={async () => {
    if (!capturedImageBlob) {
      setNotice("尚未產生截圖圖片");
      return;
    }

    const ok = await copyPngBlobToClipboard(capturedImageBlob);
    setNotice(ok ? "已複製圖片" : "此瀏覽器不支援直接複製圖片，請改用系統截圖工具或右鍵另存圖片");
  }}
>
  複製圖片
</button>
```

---

## 6. Suggested CSS Classes

Add to student CSS:

```css
.screenshot-ai-provider-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.screenshot-ai-provider-btn,
.screenshot-ai-copy-btn {
  border: 0;
  border-radius: 999px;
  padding: 10px 16px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.screenshot-ai-provider-btn:hover,
.screenshot-ai-copy-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
}

.ai-provider-google { background: #ea4335; }
.ai-provider-chatgpt { background: #10a37f; }
.ai-provider-claude { background: #d97757; }
.ai-provider-perplexity { background: #111827; }
.ai-provider-grok { background: #000000; }
.ai-provider-gemini { background: #4285f4; }
.ai-provider-copilot { background: #0078d4; }
.ai-provider-meta { background: #0866ff; }
.screenshot-ai-copy-btn { background: #7c3aed; }
```

---

## 7. User Instruction Text

Recommended instruction text inside modal:

```text
先按「複製 Prompt」，再按「複製圖片」。接著選擇下方 AI 工具開新分頁，手動貼上 Prompt 與圖片後送出。
```

Short tip:

```text
小技巧：建議使用瀏覽器分割畫面，左邊開 iBrain，右邊開 AI 工具，截圖後直接複製貼上，不用切換視窗。
```

---

## 8. Validation

Run:

```text
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 typecheck
PNPM_HOME=/tmp/pnpm pnpm --filter AI-Stu-R1 build
```

Manual checks:

```text
1. AI buttons render correctly.
2. Clicking each enabled AI button opens a new tab.
3. No prompt or screenshot is transmitted in URL.
4. Copy Prompt works.
5. Copy Image works or shows fallback.
6. Reader remains usable after modal close.
```

---

## 9. Report Requirement

The implementation report for the PDF screenshot Ask AI branch should mention:

```text
1. external provider config file path
2. safe open helper path
3. clipboard helper path
4. whether image clipboard is supported in tested browser
5. confirmation that no auto-upload occurs
```
