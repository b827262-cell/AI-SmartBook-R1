interface ScreenshotPreviewModalProps {
  imageDataUrl: string | null;
  onClose: () => void;
}

export function ScreenshotPreviewModal({ imageDataUrl, onClose }: ScreenshotPreviewModalProps) {
  if (!imageDataUrl) return null;

  return (
    <div
      className="screenshot-preview-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="screenshot-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label="截圖預覽"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="screenshot-preview-header">
          <h3 className="screenshot-preview-title">截圖問 AI</h3>
          <button type="button" className="tool-btn" onClick={onClose}>
            關閉
          </button>
        </div>

        <img
          src={imageDataUrl}
          alt="PDF 截圖"
          className="screenshot-preview-image"
        />

        {/* Agent 2: AI provider buttons (Google / ChatGPT / Claude / Gemini) go here */}
        <div className="screenshot-preview-actions" />
      </div>
    </div>
  );
}
