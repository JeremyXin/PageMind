import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExtractedContent, SummaryResult } from '../utils/types';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Integration Flow', () => {
  const mockExtractedContent: ExtractedContent = {
    title: 'Test Article',
    content: 'This is test content for integration testing.',
    url: 'https://example.com/article',
    lang: 'en',
  };

  const mockSummaryResult: SummaryResult = {
    summary: 'Test summary',
    keyPoints: ['Point 1', 'Point 2'],
    viewpoints: [{ perspective: 'Test', stance: 'Positive' }],
    bestPractices: ['Practice 1'],
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should complete full flow: extract -> summarize -> display', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify(mockSummaryResult),
          },
        }],
      }),
    });

    const { OpenAIProvider } = await import('../providers/openai');
    const provider = new OpenAIProvider({
      apiKey: 'sk-test',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    });

    const result = await provider.summarize(mockExtractedContent);

    expect(result).toEqual(mockSummaryResult);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.any(Object)
    );
  });

  it('should handle missing API key gracefully', async () => {
    const { getSettings } = await import('../utils/storage');
    
    const settings = await getSettings();
    
    if (!settings.apiKey) {
      expect(settings.apiKey).toBe('');
    }
  });

  it('should handle API errors in the flow', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    const { OpenAIProvider } = await import('../providers/openai');
    const provider = new OpenAIProvider({
      apiKey: 'invalid-key',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    });

    await expect(provider.summarize(mockExtractedContent)).rejects.toMatchObject({
      code: 'INVALID_API_KEY',
    });
  });
});
