import type { ExtractedContent, SummaryResult } from '../utils/types';
import { SummaryResultSchema } from '../utils/schemas';
import { SUMMARIZATION_SYSTEM_PROMPT } from './prompts';
import type { AIProvider } from './ai-provider';

const API_TIMEOUT_MS = 30000;

export interface OpenAIProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export class OpenAIProvider implements AIProvider {
  constructor(private config: OpenAIProviderConfig) {}

  async summarize(content: ExtractedContent): Promise<SummaryResult> {
    const truncatedContent = content.content.slice(0, 100000);
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: SUMMARIZATION_SYSTEM_PROMPT },
            { role: 'user', content: `Title: ${content.title}\n\n${truncatedContent}` }
          ],
          response_format: { type: 'json_object' },
        }),
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw { code: 'INVALID_API_KEY', message: 'API Key 无效或未授权' };
        }
        if (response.status === 429) {
          throw { code: 'RATE_LIMIT', message: '请求过于频繁，请稍后重试' };
        }
        if (response.status >= 500) {
          throw { code: 'SERVER_ERROR', message: 'API 服务器错误，请稍后重试' };
        }
        throw { code: 'API_ERROR', message: `API 请求失败 (HTTP ${response.status})` };
      }

      const data = await response.json();
      const content_text = data.choices[0].message.content;
      
      try {
        const parsed = SummaryResultSchema.parse(JSON.parse(content_text));
        return parsed;
      } catch (parseError) {
        throw { code: 'INVALID_RESPONSE_FORMAT', message: 'AI 返回格式异常，请重试' };
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw { code: 'TIMEOUT', message: '请求超时（30秒），请重试' };
      }

      if (typeof error === 'object' && error !== null && 'code' in error) {
        throw error;
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw { code: 'NETWORK_ERROR', message: '网络连接失败，请检查网络或 Base URL 配置' };
      }

      throw { code: 'UNKNOWN_ERROR', message: error instanceof Error ? error.message : '未知错误' };
    }
  }
}
