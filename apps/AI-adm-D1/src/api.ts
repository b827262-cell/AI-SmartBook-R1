const BASE = "";

export type AiProviderStatus = {
  provider: string;
  hasGoogleApiKey: boolean;
  maskedGoogleApiKey: string | null;
  defaultModel: string;
  defaultEmbeddingModel: string;
  lastTestStatus: "not_tested" | "success" | "failed";
  lastTestedAt: string | null;
};

export async function getAiProviderSettings(): Promise<AiProviderStatus> {
  const r = await fetch(`${BASE}/api/admin/settings/ai-provider`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function saveAiProviderSettings(opts: {
  googleApiKey?: string;
  defaultModel?: string;
  defaultEmbeddingModel?: string;
}): Promise<AiProviderStatus> {
  const r = await fetch(`${BASE}/api/admin/settings/ai-provider`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function clearGoogleApiKey(): Promise<{ hasGoogleApiKey: boolean }> {
  const r = await fetch(`${BASE}/api/admin/settings/ai-provider/google-key`, { method: "DELETE" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function testAiConnection(): Promise<{ ok: boolean; message: string }> {
  const r = await fetch(`${BASE}/api/admin/settings/ai-provider/test`, { method: "POST" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
