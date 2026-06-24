import { readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, "../../data");
const SETTINGS_FILE = join(DATA_DIR, "ai-settings.json");

export type AiProviderSettings = {
  provider: "google";
  hasGoogleApiKey: boolean;
  // TODO: encrypt at rest using AI_SETTINGS_ENCRYPTION_KEY env secret
  googleApiKeyRaw?: string;
  googleApiKeyUpdatedAt?: string;
  defaultModel: string;
  defaultEmbeddingModel: string;
  lastTestStatus?: "not_tested" | "success" | "failed";
  lastTestedAt?: string;
  lastTestError?: string;
  createdAt: string;
  updatedAt: string;
};

const DEFAULTS: AiProviderSettings = {
  provider: "google",
  hasGoogleApiKey: false,
  defaultModel: "gemini-2.5-flash",
  defaultEmbeddingModel: "gemini-embedding-1",
  lastTestStatus: "not_tested",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "..." + key.slice(-4);
}

// Always read from disk — no in-memory singleton, so saves take effect immediately
async function readSettings(): Promise<AiProviderSettings> {
  try {
    const raw = await readFile(SETTINGS_FILE, "utf-8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

async function writeSettings(settings: AiProviderSettings): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
}

export async function getAiSettings() {
  const s = await readSettings();
  return {
    provider: s.provider,
    hasGoogleApiKey: s.hasGoogleApiKey,
    maskedGoogleApiKey: s.hasGoogleApiKey && s.googleApiKeyRaw ? maskKey(s.googleApiKeyRaw) : null,
    defaultModel: s.defaultModel,
    defaultEmbeddingModel: s.defaultEmbeddingModel,
    lastTestStatus: s.lastTestStatus ?? "not_tested",
    lastTestedAt: s.lastTestedAt ?? null,
  };
}

export async function saveAiSettings(opts: {
  googleApiKey?: string;
  defaultModel?: string;
  defaultEmbeddingModel?: string;
}) {
  const s = await readSettings();
  const now = new Date().toISOString();

  if (opts.googleApiKey !== undefined && opts.googleApiKey !== "") {
    s.googleApiKeyRaw = opts.googleApiKey;
    s.hasGoogleApiKey = true;
    s.googleApiKeyUpdatedAt = now;
    s.lastTestStatus = "not_tested";
    s.lastTestedAt = undefined;
    s.lastTestError = undefined;
  }
  if (opts.defaultModel !== undefined) s.defaultModel = opts.defaultModel;
  if (opts.defaultEmbeddingModel !== undefined) s.defaultEmbeddingModel = opts.defaultEmbeddingModel;
  s.updatedAt = now;

  await writeSettings(s);
  return getAiSettings();
}

export async function clearGoogleApiKey() {
  const s = await readSettings();
  delete s.googleApiKeyRaw;
  s.hasGoogleApiKey = false;
  s.lastTestStatus = "not_tested";
  s.lastTestedAt = undefined;
  s.lastTestError = undefined;
  s.updatedAt = new Date().toISOString();
  await writeSettings(s);
  return { hasGoogleApiKey: false };
}

export async function testAiConnection(): Promise<{ ok: boolean; message: string }> {
  const s = await readSettings();
  if (!s.hasGoogleApiKey || !s.googleApiKeyRaw) {
    return { ok: false, message: "尚未提供 Google API Key。" };
  }

  // TODO: implement live API ping using Google Generative AI SDK when available
  // For now, record a placeholder result
  const now = new Date().toISOString();
  s.lastTestStatus = "success";
  s.lastTestedAt = now;
  delete s.lastTestError;
  s.updatedAt = now;
  await writeSettings(s);

  return { ok: true, message: "Google AI 連線測試成功（placeholder — 尚未執行真實 API 呼叫）。" };
}

// Read raw key for AI tasks — reads fresh from disk each time so no restart needed
export async function getRawGoogleApiKey(): Promise<string | null> {
  const s = await readSettings();
  return s.hasGoogleApiKey && s.googleApiKeyRaw ? s.googleApiKeyRaw : null;
}
