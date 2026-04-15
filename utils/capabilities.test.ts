import { describe, it, expect } from 'vitest';
import { getWebSearchCapability, SUPPORTED_PROVIDERS } from './capabilities';

describe('capabilities', () => {
  describe('SUPPORTED_PROVIDERS', () => {
    it('should export SUPPORTED_PROVIDERS with expected providers', () => {
      expect(SUPPORTED_PROVIDERS).toHaveProperty('api.openai.com', 'web_search_preview');
      expect(SUPPORTED_PROVIDERS).toHaveProperty('api.x.ai', 'web_search');
      expect(SUPPORTED_PROVIDERS).toHaveProperty('dashscope.aliyuncs.com', 'web_search');
      expect(SUPPORTED_PROVIDERS).toHaveProperty('api.perplexity.ai', 'web_search');
    });
  });

  describe('getWebSearchCapability', () => {
    describe('OpenAI (api.openai.com)', () => {
      it('should support gpt-4o with web_search_preview', () => {
        const result = getWebSearchCapability('https://api.openai.com/v1', 'gpt-4o');
        expect(result.supported).toBe(true);
        expect(result.toolType).toBe('web_search_preview');
      });

      it('should support gpt-5.0 with web_search_preview', () => {
        const result = getWebSearchCapability('https://api.openai.com/v1', 'gpt-5.0');
        expect(result.supported).toBe(true);
        expect(result.toolType).toBe('web_search_preview');
      });

      it('should NOT support gpt-3.5-turbo', () => {
        const result = getWebSearchCapability('https://api.openai.com/v1', 'gpt-3.5-turbo');
        expect(result.supported).toBe(false);
        expect(result.toolType).toBeNull();
      });

      it('should support o1 models', () => {
        const result = getWebSearchCapability('https://api.openai.com/v1', 'o1-preview');
        expect(result.supported).toBe(true);
        expect(result.toolType).toBe('web_search_preview');
      });

      it('should support chatgpt-4o models', () => {
        const result = getWebSearchCapability('https://api.openai.com/v1', 'chatgpt-4o-latest');
        expect(result.supported).toBe(true);
        expect(result.toolType).toBe('web_search_preview');
      });
    });

    describe('xAI (api.x.ai)', () => {
      it('should support any model with web_search', () => {
        const result = getWebSearchCapability('https://api.x.ai/v1', 'grok-2');
        expect(result.supported).toBe(true);
        expect(result.toolType).toBe('web_search');
      });
    });

    describe('Qwen (dashscope)', () => {
      it('should support dashscope.aliyuncs.com with web_search', () => {
        const result = getWebSearchCapability('https://dashscope.aliyuncs.com/v1', 'qwen-max');
        expect(result.supported).toBe(true);
        expect(result.toolType).toBe('web_search');
      });

      it('should support dashscope-intl.aliyuncs.com with web_search', () => {
        const result = getWebSearchCapability('https://dashscope-intl.aliyuncs.com/v1', 'qwen-plus');
        expect(result.supported).toBe(true);
        expect(result.toolType).toBe('web_search');
      });

      it('should support dashscope-us.aliyuncs.com with web_search', () => {
        const result = getWebSearchCapability('https://dashscope-us.aliyuncs.com/v1', 'qwen-turbo');
        expect(result.supported).toBe(true);
        expect(result.toolType).toBe('web_search');
      });
    });

    describe('Perplexity (api.perplexity.ai)', () => {
      it('should support sonar-pro with web_search', () => {
        const result = getWebSearchCapability('https://api.perplexity.ai', 'sonar-pro');
        expect(result.supported).toBe(true);
        expect(result.toolType).toBe('web_search');
      });

      it('should support sonar-reasoning with web_search', () => {
        const result = getWebSearchCapability('https://api.perplexity.ai', 'sonar-reasoning');
        expect(result.supported).toBe(true);
        expect(result.toolType).toBe('web_search');
      });

      it('should NOT support non-sonar models', () => {
        const result = getWebSearchCapability('https://api.perplexity.ai', 'pplx-7b-chat');
        expect(result.supported).toBe(false);
        expect(result.toolType).toBeNull();
      });
    });

    describe('Unsupported providers', () => {
      it('should NOT support DeepSeek (api.deepseek.com)', () => {
        const result = getWebSearchCapability('https://api.deepseek.com/v1', 'deepseek-chat');
        expect(result.supported).toBe(false);
        expect(result.toolType).toBeNull();
      });

      it('should NOT support localhost:11434 (Ollama)', () => {
        const result = getWebSearchCapability('http://localhost:11434/v1', 'llama2');
        expect(result.supported).toBe(false);
        expect(result.toolType).toBeNull();
      });

      it('should NOT support unknown providers', () => {
        const result = getWebSearchCapability('https://unknown-provider.com/v1', 'some-model');
        expect(result.supported).toBe(false);
        expect(result.toolType).toBeNull();
      });
    });

    describe('Case insensitivity', () => {
      it('should handle uppercase URLs', () => {
        const result = getWebSearchCapability('https://API.OPENAI.COM/v1', 'GPT-4O');
        expect(result.supported).toBe(true);
      });

      it('should handle mixed case model names for Perplexity', () => {
        const result = getWebSearchCapability('https://api.perplexity.ai', 'SONAR-PRO');
        expect(result.supported).toBe(true);
      });
    });
  });
});
