import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { GoogleAiSettingsCard } from "../components/GoogleAiSettingsCard";

export function AiSettingsPage() {
  return (
    <div>
      <AdminPageHeader
        title="AI 模型設定"
        subtitle="Google API Key 與預設模型設定，控制 AI 建立 Q&A、AI 萃取知識點、截圖問 AI 等功能。"
      />
      <GoogleAiSettingsCard />
    </div>
  );
}
