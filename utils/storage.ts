import type { ExtensionSettings } from './types';

export type AgentRole = 'smart-reader' | 'general' | 'analyst' | 'creative' | 'coder';

const STORAGE_KEYS = {
  API_KEY: 'apiKey',
  BASE_URL: 'baseUrl',
  MODEL: 'model',
  TARGET_LANGUAGE: 'targetLanguage',
  AGENT_ROLE: 'activeAgentRole',
} as const;

const DEFAULT_SETTINGS: ExtensionSettings = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  targetLanguage: 'zh-CN',
};

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await browser.storage.local.get([
    STORAGE_KEYS.API_KEY,
    STORAGE_KEYS.BASE_URL,
    STORAGE_KEYS.MODEL,
    STORAGE_KEYS.TARGET_LANGUAGE,
  ]);

  return {
    apiKey: result[STORAGE_KEYS.API_KEY] ?? DEFAULT_SETTINGS.apiKey,
    baseUrl: result[STORAGE_KEYS.BASE_URL] ?? DEFAULT_SETTINGS.baseUrl,
    model: result[STORAGE_KEYS.MODEL] ?? DEFAULT_SETTINGS.model,
    targetLanguage: result[STORAGE_KEYS.TARGET_LANGUAGE] ?? DEFAULT_SETTINGS.targetLanguage,
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
  if (settings.targetLanguage !== undefined) {
    updates[STORAGE_KEYS.TARGET_LANGUAGE] = settings.targetLanguage;
  }

  await browser.storage.local.set(updates);
}

export async function getApiKey(): Promise<string | null> {
  const result = await browser.storage.local.get(STORAGE_KEYS.API_KEY);
  const apiKey = result[STORAGE_KEYS.API_KEY];

  return apiKey && apiKey.length > 0 ? apiKey : null;
}

const VALID_AGENT_ROLES: AgentRole[] = ['smart-reader', 'general', 'analyst', 'creative', 'coder'];

export async function getActiveAgentRole(): Promise<AgentRole> {
  const result = await browser.storage.local.get(STORAGE_KEYS.AGENT_ROLE);
  const role = result[STORAGE_KEYS.AGENT_ROLE];

  if (role && VALID_AGENT_ROLES.includes(role)) {
    return role as AgentRole;
  }

  return 'general';
}

export async function saveActiveAgentRole(role: AgentRole): Promise<void> {
  await browser.storage.local.set({
    [STORAGE_KEYS.AGENT_ROLE]: role,
  });
}
