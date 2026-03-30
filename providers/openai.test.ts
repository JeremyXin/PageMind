import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIProvider } from './openai';
import type { ExtractedContent } from '../utils/types';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OpenAIProvider', () => {
  const config = { 
    apiKey: 'sk-test', 
    baseUrl: 'https://api.openai.com/v1', 
    model: 'gpt-4o-mini' 
  };
  const provider = new OpenAIProvider(config);
  const content: ExtractedContent = { 
    title: 'Test Article', 
    content: 'Test content', 
    url: 'https://test.com' 
  };

  beforeEach(() => { 
    mockFetch.mockClear();
    vi.clearAllTimers();
  });

  it('should send correct request with auth header', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ 
        choices: [{ 
          message: { 
            content: JSON.stringify({ 
              summary: 'Test summary', 
              keyPoints: ['Point 1'], 
              viewpoints: [], 
              bestPractices: [] 
            }) 
          } 
        }] 
      })
    });
    
    await provider.summarize(content);
    
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({ 
          'Authorization': 'Bearer sk-test' 
        })
      })
    );
  });

  it('should throw INVALID_API_KEY on 401', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });
    await expect(provider.summarize(content)).rejects.toMatchObject({ 
      code: 'INVALID_API_KEY' 
    });
  });

  it('should throw RATE_LIMIT on 429', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 429 });
    await expect(provider.summarize(content)).rejects.toMatchObject({ 
      code: 'RATE_LIMIT' 
    });
  });

  it('should throw SERVER_ERROR on 500', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(provider.summarize(content)).rejects.toMatchObject({ 
      code: 'SERVER_ERROR' 
    });
  });

  it('should handle AbortError as TIMEOUT', async () => {
    mockFetch.mockRejectedValue(new DOMException('The operation was aborted', 'AbortError'));
    
    await expect(provider.summarize(content)).rejects.toMatchObject({ 
      code: 'TIMEOUT',
      message: expect.stringContaining('30秒') 
    });
  });

  it('should throw NETWORK_ERROR on fetch failure', async () => {
    mockFetch.mockRejectedValue(new TypeError('fetch failed'));
    await expect(provider.summarize(content)).rejects.toMatchObject({ 
      code: 'NETWORK_ERROR' 
    });
  });

  it('should throw INVALID_RESPONSE_FORMAT on parse error', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ 
        choices: [{ 
          message: { 
            content: 'invalid json' 
          } 
        }] 
      })
    });
    
    await expect(provider.summarize(content)).rejects.toMatchObject({ 
      code: 'INVALID_RESPONSE_FORMAT' 
    });
  });

  it('should truncate content over 100000 chars', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ 
        choices: [{ 
          message: { 
            content: JSON.stringify({ 
              summary: 'Test', 
              keyPoints: [], 
              viewpoints: [], 
              bestPractices: [] 
            }) 
          } 
        }] 
      })
    });
    
    const longContent = { 
      ...content, 
      content: 'a'.repeat(150000) 
    };
    
    await provider.summarize(longContent);
    
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const userContent = body.messages[1].content;
    expect(userContent.length).toBeLessThanOrEqual(110000);
  });
});
