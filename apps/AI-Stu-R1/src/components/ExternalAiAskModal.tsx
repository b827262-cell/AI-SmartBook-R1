import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
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
  /** When true, renders inline panel content (no fixed backdrop). */
  inPanel?: boolean;
}

interface SelectedImageState {
  source: "screenshot" | "upload";
  name: string;
  data: Blob | string;
  previewUrl: string;
}

const IMAGE_COPY_FALLBACK_NOTICE = "此瀏覽器不支援直接複製圖片，請使用「上傳圖片」後到 AI 平台手動選取檔案，或使用系統截圖工具。";

export function ExternalAiAskModal({
  isOpen,
  bookTitle,
  pageLabel,
  screenshotImage,
  selectedText,
  extraNotes,
  initialTemplate = "summary",
  onClose,
  inPanel = false
}: ExternalAiAskModalProps) {
  const [templateId, setTemplateId] = useState<PromptTemplateId>(initialTemplate);
  const [status, setStatus] = useState("");
  const [selectedImage, setSelectedImage] = useState<SelectedImageState | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  function isBlobUrl(url: string) {
    return url.startsWith("blob:");
  }

  function revokeIfBlobUrl(url: string) {
    if (!url || !isBlobUrl(url)) return;
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }

  function replaceImage(nextImage: SelectedImageState | null) {
    setSelectedImage((prev) => {
      if (prev && prev.previewUrl !== nextImage?.previewUrl) {
        revokeIfBlobUrl(prev.previewUrl);
      }
      return nextImage;
    });
  }

  function clearImageState() {
    replaceImage(null);
    setStatus("");
  }

  function applyScreenshotImage(image: string) {
    if (!image) {
      clearImageState();
      return;
    }
    replaceImage({
      source: "screenshot",
      name: "截圖",
      data: image,
      previewUrl: image
    });
  }

  const promptText = useMemo(() => {
    const template = getPromptTemplate(templateId);
    return template.buildPrompt({ bookTitle, pageLabel, selectedText, extraNotes });
  }, [templateId, bookTitle, pageLabel, selectedText, extraNotes]);

  useEffect(() => {
    if (!isOpen) {
      clearImageState();
      return;
    }
    if (screenshotImage) {
      applyScreenshotImage(screenshotImage);
      return;
    }
    clearImageState();
  }, [isOpen, screenshotImage]);

  useEffect(() => {
    return () => {
      if (selectedImage) {
        revokeIfBlobUrl(selectedImage.previewUrl);
      }
    };
  }, [selectedImage]);

  if (!isOpen) return null;

  async function onCopyPrompt() {
    const ok = await copyPrompt(promptText);
    setStatus(ok ? "提示詞已複製到剪貼簿" : "複製提示詞失敗，請手動選取文字複製");
  }

  async function onCopyImage() {
    if (!selectedImage) {
      setStatus("目前未提供可複製影像，請先上傳圖片或使用截圖來源。");
      return;
    }
    const ok = await copyImage(selectedImage.data);
    if (!ok) {
      setStatus(IMAGE_COPY_FALLBACK_NOTICE);
      return;
    }
    setStatus("影像已複製到剪貼簿");
  }

  function onUploadImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("請選擇圖片檔案。");
      event.currentTarget.value = "";
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    replaceImage({
      source: "upload",
      name: file.name,
      data: file,
      previewUrl
    });
    setStatus(`已載入圖片：${file.name}`);
    event.currentTarget.value = "";
  }

  function openUploadPicker() {
    uploadInputRef.current?.click();
  }

  function onOpenProvider(providerId: ExternalAiProviderId) {
    try {
      openExternalAi(providerId);
      setStatus(`已開啟 ${providerId}，請貼上提示詞後手動上傳圖片。`);
    } catch {
      setStatus("無法開啟外部頁籤，請確認瀏覽器未封鎖彈窗。");
    }
  }

  const inner = (
    <div
      className={inPanel ? "external-ai-panel-content" : "external-ai-modal"}
      role="dialog"
      aria-modal={!inPanel}
      aria-label="外部 AI 問題"
      onClick={inPanel ? undefined : (event) => event.stopPropagation()}
    >
      <div className="external-ai-header">
        <h3>外部 AI 問答（不自動上傳）</h3>
        <button type="button" className="tool-btn" onClick={onClose}>
          關閉
        </button>
      </div>

        <p className="external-ai-intro">
          提示詞與影像不會放入網址，請先複製提示詞與影像，然後到目標 AI 站點貼上。<br />
          若未支援複製影像，可先「上傳圖片」後手動在 AI 平台選取檔案。
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
            disabled={!selectedImage}
          >
            複製圖片
          </button>
          <button type="button" className="tool-btn" onClick={openUploadPicker}>
            上傳圖片
          </button>
          <button type="button" className="tool-btn" onClick={clearImageState} disabled={!selectedImage}>
            清除圖片
          </button>
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            className="external-ai-upload-input"
            onChange={onUploadImageChange}
          />
          {status ? <span className="external-ai-status">{status}</span> : null}
        </div>

        <section className="external-ai-image-area" aria-live="polite">
          <div className="external-ai-image-title">
            {selectedImage
              ? `圖片來源：${selectedImage.source === "upload" ? "上傳圖片" : "截圖"} (${selectedImage.name})`
              : "尚未選擇圖片，可使用「上傳圖片」選擇本機檔案。"}
          </div>
          {selectedImage ? (
            <img
              src={selectedImage.previewUrl}
              className="external-ai-preview"
              alt={selectedImage.source === "upload" ? "上傳圖片預覽" : "截圖預覽"}
              loading="lazy"
            />
          ) : null}
        </section>

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
      </div>
  );

  if (inPanel) return inner;
  return (
    <div className="external-ai-backdrop" role="presentation" onClick={onClose}>
      {inner}
    </div>
  );
}
