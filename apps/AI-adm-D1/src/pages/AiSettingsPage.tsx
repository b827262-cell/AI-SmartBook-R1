import React from "react";
import { GoogleAiSettingsCard } from "../components/GoogleAiSettingsCard.js";

export function AiSettingsPage() {
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 24px 0" }}>AI 模型設定</h1>
      <GoogleAiSettingsCard />
    </div>
  );
}
