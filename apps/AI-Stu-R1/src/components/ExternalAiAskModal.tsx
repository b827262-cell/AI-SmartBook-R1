import { useMemo, useState } from "react";
import {
  EXTERNAL_AI_PROMPT_TEMPLATES,
  EXTERNAL_AI_PROVIDERS,
  type ExternalAiProviderId,
  type PromptTemplateId,
  getPromptTemplate,
  openExternalAi,
  copyPrompt,
  copyImage
} from "../lib/external-ai";

interface ExternalAiAskModalProps {
  isOpen: boolean;
  bookTitle?: string;
  pageLabel?: string;
  screenshotImage?: string;
  selectedText?: string;
  extraNotes?: string;
  initialTemplate?: PromptTemplateId;
  onClose: () => void;
}

export function ExternalAiAskModal({
  isOpen,
  bookTitle,
  pageLabel,
  screenshotImage,
  selectedText,
  extraNotes,
  initialTemplate = "summary",
  onClose
}: ExternalAiAskModalProps) {
  const [templateId, setTemplateId] = useState<PromptTemplateId>(initialTemplate);
  const [status, setStatus] = useState("");

  const promptText = useMemo(() => {
    const template = getPromptTemplate(templateId);
    return template.buildPrompt({ bookTitle, pageLabel, selectedText, extraNotes });
  }, [templateId, bookTitle, pageLabel, selectedText, extraNotes]);

  if (!isOpen) return null;

  async function onCopyPrompt() {
    const ok = await copyPrompt(promptText);
    setStatus(ok ? "提示詞已複製到剪貼簿" : "複製提示詞失敗，請手動選取文字複製");
  }

  async function onCopyImage() {
    if (!screenshotImage) {
      setStatus("目前未提供截圖資料，請先拍攝頁面或截圖。");
      return;
    }
    const ok = await copyImage(screenshotImage);
    setStatus(ok ? "影像已複製到剪貼簿" : "複製影像失敗，請用「另存圖片」後手動上傳");
  }

  function onOpenProvider(providerId: ExternalAiProviderId) {
    try {
      openExternalAi(providerId);
      setStatus(`已開啟 ${providerId}，請貼上提示詞並上傳截圖。`);
    } catch {
      setStatus("無法開啟外部頁籤，請確認瀏覽器未封鎖彈窗。");
    }
  }

  return (
    <div className="external-ai-backdrop" role="presentation" onClick={onClose}>
      <div
        className="external-ai-modal"
        role="dialog"
        aria-modal="true"
        aria-label="外部 AI 問題"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="external-ai-header">
          <h3>外部 AI 問答（不自動上傳）</h3>
          <button type="button" className="tool-btn" onClick={onClose}>
            關閉
          </button>
        </div>

        <p className="external-ai-intro">
          提示詞與影像不會放入網址，請先複製提示詞與影像，然後到目標 AI 站點貼上。
        </p>

        <div className="external-ai-templates">
          {EXTERNAL_AI_PROMPT_TEMPLATES.map((template) => {
            const active = template.id === templateId;
            return (
              <button
                key={template.id}
                type="button"
                className={`tool-btn ${active ? "is-active" : ""}`}
                onClick={() => setTemplateId(template.id)}
                title={template.description}
              >
                {template.title}
              </button>
            );
          })}
        </div>

        <textarea value={promptText} className="external-ai-prompt" readOnly />

        <div className="external-ai-copy-row">
          <button type="button" className="tool-btn" onClick={onCopyPrompt}>
            複製提示詞
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={onCopyImage}
            disabled={!screenshotImage}
          >
            複製截圖
          </button>
          {status ? <span className="external-ai-status">{status}</span> : null}
        </div>

        <div className="external-ai-providers">
          {EXTERNAL_AI_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              className={`tool-btn ${provider.buttonClass ? `external-ai-btn-${provider.buttonClass}` : ""}`}
              onClick={() => onOpenProvider(provider.id)}
              title={provider.description}
            >
              {provider.buttonText}
            </button>
          ))}
        </div>

        {screenshotImage ? (
          <img
            src={screenshotImage}
            className="external-ai-preview"
            alt="截圖預覽"
            loading="lazy"
          />
        ) : null}
      </div>
    </div>
  );
}
