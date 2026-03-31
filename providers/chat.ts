import type { OpenAIProviderConfig } from './openai';

const CHAT_TIMEOUT_MS = 300_000;

export class ChatProvider {
  constructor(private config: OpenAIProviderConfig) {}

  async *chat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    signal: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), CHAT_TIMEOUT_MS);

    const combinedSignal = this.combineAbortSignals([signal, timeoutController.signal]);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          stream: true,
        }),
        signal: combinedSignal,
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

      if (!response.body) {
        throw { code: 'NO_RESPONSE_BODY', message: '响应体为空' };
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let done = false;

      while (!done) {
        if (signal.aborted) {
          await reader.cancel();
          break;
        }

        const result = await reader.read();
        done = result.done;

        if (result.value) {
          buffer += decoder.decode(result.value, { stream: true });
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) {
              continue;
            }

            const dataStr = line.slice(6).trim();

            if (dataStr === '[DONE]') {
              done = true;
              break;
            }

            try {
              const data = JSON.parse(dataStr);
              
              if (data.choices?.[0]?.finish_reason === 'stop') {
                done = true;
                break;
              }

              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch {
              continue;
            }
          }
        }

        if (signal.aborted) {
          await reader.cancel();
          break;
        }
      }

      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw { code: 'TIMEOUT', message: '请求超时（300秒），请重试' };
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

  private combineAbortSignals(signals: AbortSignal[]): AbortSignal {
    if ('any' in AbortSignal && typeof AbortSignal.any === 'function') {
      return (AbortSignal as any).any(signals);
    }

    const controller = new AbortController();
    
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    return controller.signal;
  }
}
