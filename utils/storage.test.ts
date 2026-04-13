import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from '@webext-core/fake-browser';
import { getSettings, saveSettings, getApiKey, getActiveAgentRole, saveActiveAgentRole } from './storage';

describe('storage', () => {
  beforeEach(() => {
    // Clear storage before each test
    fakeBrowser.storage.local.clear();
  });

  describe('getSettings', () => {
    it('should return default values when storage is empty', async () => {
      const settings = await getSettings();

      expect(settings.baseUrl).toBe('https://api.openai.com/v1');
      expect(settings.model).toBe('gpt-4o-mini');
      expect(settings.apiKey).toBe('');
      expect(settings.targetLanguage).toBe('zh-CN');
    });

    it('should return saved values from storage', async () => {
      await fakeBrowser.storage.local.set({
        apiKey: 'sk-test-key-123',
        baseUrl: 'https://custom.api.com/v1',
        model: 'gpt-4',
        targetLanguage: 'ja',
      });

      const settings = await getSettings();

      expect(settings.apiKey).toBe('sk-test-key-123');
      expect(settings.baseUrl).toBe('https://custom.api.com/v1');
      expect(settings.model).toBe('gpt-4');
      expect(settings.targetLanguage).toBe('ja');
    });

    it('should apply defaults for missing fields', async () => {
      await fakeBrowser.storage.local.set({
        apiKey: 'sk-test-key-123',
      });

      const settings = await getSettings();

      expect(settings.apiKey).toBe('sk-test-key-123');
      expect(settings.baseUrl).toBe('https://api.openai.com/v1');
      expect(settings.model).toBe('gpt-4o-mini');
      expect(settings.targetLanguage).toBe('zh-CN');
    });

    it('should return default targetLanguage when none stored', async () => {
      await fakeBrowser.storage.local.set({
        apiKey: 'sk-test-key-123',
        baseUrl: 'https://custom.api.com/v1',
        model: 'gpt-4',
      });

      const settings = await getSettings();

      expect(settings.targetLanguage).toBe('zh-CN');
    });

    it('should persist and retrieve targetLanguage correctly', async () => {
      await saveSettings({ targetLanguage: 'ja' });
      const settings = await getSettings();

      expect(settings.targetLanguage).toBe('ja');
      expect(settings.apiKey).toBe('');
      expect(settings.baseUrl).toBe('https://api.openai.com/v1');
      expect(settings.model).toBe('gpt-4o-mini');
    });
  });

  describe('saveSettings', () => {
    it('should save settings to storage', async () => {
      await saveSettings({
        apiKey: 'sk-test-key-123',
        baseUrl: 'https://custom.api.com/v1',
        model: 'gpt-4',
        targetLanguage: 'ja',
      });

      const stored = await fakeBrowser.storage.local.get(['apiKey', 'baseUrl', 'model', 'targetLanguage']);

      expect(stored.apiKey).toBe('sk-test-key-123');
      expect(stored.baseUrl).toBe('https://custom.api.com/v1');
      expect(stored.model).toBe('gpt-4');
      expect(stored.targetLanguage).toBe('ja');
    });

    it('should merge with existing settings when saving partial', async () => {
      await fakeBrowser.storage.local.set({
        apiKey: 'sk-old-key',
        baseUrl: 'https://old.api.com/v1',
        model: 'gpt-3.5-turbo',
        targetLanguage: 'en',
      });

      await saveSettings({
        apiKey: 'sk-new-key',
      });

      const stored = await fakeBrowser.storage.local.get(['apiKey', 'baseUrl', 'model', 'targetLanguage']);

      expect(stored.apiKey).toBe('sk-new-key');
      expect(stored.baseUrl).toBe('https://old.api.com/v1');
      expect(stored.model).toBe('gpt-3.5-turbo');
      expect(stored.targetLanguage).toBe('en');
    });

    it('should handle partial updates correctly', async () => {
      await saveSettings({
        apiKey: 'sk-test-key-123',
        baseUrl: 'https://custom.api.com/v1',
      });

      const settings = await getSettings();

      expect(settings.apiKey).toBe('sk-test-key-123');
      expect(settings.baseUrl).toBe('https://custom.api.com/v1');
      expect(settings.model).toBe('gpt-4o-mini'); // default preserved
      expect(settings.targetLanguage).toBe('zh-CN'); // default preserved
    });
  });

  describe('getApiKey', () => {
    it('should return null when no API key is saved', async () => {
      const apiKey = await getApiKey();

      expect(apiKey).toBeNull();
    });

    it('should return the saved API key', async () => {
      await fakeBrowser.storage.local.set({
        apiKey: 'sk-test-key-123',
      });

      const apiKey = await getApiKey();

      expect(apiKey).toBe('sk-test-key-123');
    });

    it('should return null for empty string API key', async () => {
      await fakeBrowser.storage.local.set({
        apiKey: '',
      });

      const apiKey = await getApiKey();

      expect(apiKey).toBeNull();
    });
  });

  describe('getActiveAgentRole', () => {
    it('should return "general" by default when storage is empty', async () => {
      const role = await getActiveAgentRole();

      expect(role).toBe('general');
    });

    it('should return saved agent role from storage', async () => {
      await fakeBrowser.storage.local.set({
        activeAgentRole: 'analyst',
      });

      const role = await getActiveAgentRole();

      expect(role).toBe('analyst');
    });

    it('should return "general" for invalid role values', async () => {
      await fakeBrowser.storage.local.set({
        activeAgentRole: 'invalid-role',
      });

      const role = await getActiveAgentRole();

      expect(role).toBe('general');
    });

    it('should handle all valid agent roles', async () => {
      const validRoles = ['smart-reader', 'general', 'analyst', 'creative', 'coder'] as const;

      for (const testRole of validRoles) {
        await fakeBrowser.storage.local.set({
          activeAgentRole: testRole,
        });

        const role = await getActiveAgentRole();
        expect(role).toBe(testRole);
      }
    });
  });

  describe('saveActiveAgentRole', () => {
    it('should save agent role to storage', async () => {
      await saveActiveAgentRole('analyst');

      const stored = await fakeBrowser.storage.local.get('activeAgentRole');

      expect(stored.activeAgentRole).toBe('analyst');
    });

    it('should overwrite existing agent role', async () => {
      await fakeBrowser.storage.local.set({
        activeAgentRole: 'general',
      });

      await saveActiveAgentRole('creative');

      const stored = await fakeBrowser.storage.local.get('activeAgentRole');

      expect(stored.activeAgentRole).toBe('creative');
    });

    it('should handle all valid agent roles', async () => {
      const validRoles = ['smart-reader', 'general', 'analyst', 'creative', 'coder'] as const;

      for (const testRole of validRoles) {
        await saveActiveAgentRole(testRole);

        const stored = await fakeBrowser.storage.local.get('activeAgentRole');
        expect(stored.activeAgentRole).toBe(testRole);
      }
    });
  });
});
