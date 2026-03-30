export interface ExtensionSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const STORAGE_KEYS = {
  API_KEY: 'apiKey',
  BASE_URL: 'baseUrl',
  MODEL: 'model',
} as const;

const DEFAULT_SETTINGS: ExtensionSettings = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
};

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await browser.storage.local.get([
    STORAGE_KEYS.API_KEY,
    STORAGE_KEYS.BASE_URL,
    STORAGE_KEYS.MODEL,
  ]);

  return {
    apiKey: result[STORAGE_KEYS.API_KEY] ?? DEFAULT_SETTINGS.apiKey,
    baseUrl: result[STORAGE_KEYS.BASE_URL] ?? DEFAULT_SETTINGS.baseUrl,
    model: result[STORAGE_KEYS.MODEL] ?? DEFAULT_SETTINGS.model,
  };
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  const updates: Record<string, string> = {};

  if (settings.apiKey !== undefined) {
    updates[STORAGE_KEYS.API_KEY] = settings.apiKey;
  }
  if (settings.baseUrl !== undefined) {
    updates[STORAGE_KEYS.BASE_URL] = settings.baseUrl;
  }
  if (settings.model !== undefined) {
    updates[STORAGE_KEYS.MODEL] = settings.model;
  }

  await browser.storage.local.set(updates);
}

export async function getApiKey(): Promise<string | null> {
  const result = await browser.storage.local.get(STORAGE_KEYS.API_KEY);
  const apiKey = result[STORAGE_KEYS.API_KEY];

  return apiKey && apiKey.length > 0 ? apiKey : null;
}
