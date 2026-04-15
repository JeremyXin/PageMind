import type {
  MessageRequest,
  MessageResponse,
  ExtractedContent,
  SummaryResult,
  TestConnectionPayload,
  TestConnectionResult,
  ChatSendPayload,
  ContextMenuActionType,
} from '../utils/types';
import { getSettings, getActiveAgentRole } from '../utils/storage';
import { OpenAIProvider } from '../providers/openai';
import { ChatProvider } from '../providers/chat';
import { getActiveSession, addMessage } from '../utils/chatStorage';
import { createAgentStream } from '../providers/agent';
import type { PageContext } from '../providers/agent';

let activeChatAbortController: AbortController | null = null;
const activeInlineAbortControllers = new Map<number, AbortController>();

export default defineBackground(() => {
  console.log('Background script initialized');

  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('Error setting side panel behavior:', error));

  setInterval(() => {
    chrome.runtime.getPlatformInfo().catch(() => {});
  }, 20000);

  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== 'chat-stream') return;
    handleChatPort(port);
  });

  chrome.runtime.onMessage.addListener(
    (
      message: MessageRequest,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: MessageResponse) => void
    ) => {
      if (message.type === 'SUMMARIZE') {
        handleSummarizeMessage(message as MessageRequest<ExtractedContent>)
          .then(sendResponse)
          .catch((error) => {
            sendResponse({
              success: false,
              error: {
                code: 'PROVIDER_ERROR',
                message: error.message || 'Unknown error occurred',
              },
            });
          });
        return true;
      }

      if (message.type === 'EXTRACT_AND_SUMMARIZE') {
        handleExtractAndSummarize(sender)
          .then(sendResponse)
          .catch((error) => {
            sendResponse({
              success: false,
              error: { code: 'UNKNOWN', message: error.message || 'Unknown error occurred' },
            });
          });
        return true;
      }

      if (message.type === 'TEST_CONNECTION') {
        handleTestConnectionMessage(message as MessageRequest<TestConnectionPayload>)
          .then(sendResponse)
          .catch((error) => {
            sendResponse({
              success: false,
              data: {
                success: false,
                errorCode: 'UNKNOWN',
                message: error.message || 'Unknown error',
              } satisfies TestConnectionResult,
            });
          });
        return true;
      }

      if (message.type === 'TOOLBAR_INLINE_ACTION') {
        const tabId = sender.tab?.id;
        const payload = message.payload as { action: ContextMenuActionType; selectedText: string; targetLanguage?: string } | undefined;
        if (!tabId || !payload?.selectedText?.trim()) {
          if (tabId) {
            chrome.tabs.sendMessage(tabId, { type: 'TOOLBAR_INLINE_ERROR', error: '无效的请求' });
          }
          sendResponse({ success: false });
          return true;
        }

        const { action, selectedText, targetLanguage: payloadTargetLanguage } = payload;

        (async () => {
          const settings = await getSettings();
          const targetLanguage = payloadTargetLanguage ?? settings.targetLanguage;

          if (!settings.apiKey) {
            chrome.tabs.sendMessage(tabId, { type: 'TOOLBAR_INLINE_ERROR', error: '请先在设置中填写 API Key' });
            return;
          }

          const existingController = activeInlineAbortControllers.get(tabId);
          if (existingController) {
            existingController.abort();
          }
          const abortController = new AbortController();
          activeInlineAbortControllers.set(tabId, abortController);

          try {
            const { getActionPrompt } = await import('../utils/actionPrompts');
            const prompt = getActionPrompt(action as ContextMenuActionType, selectedText, targetLanguage);
            const provider = new ChatProvider({
              apiKey: settings.apiKey,
              baseUrl: settings.baseUrl,
              model: settings.model,
            });

            let fullResult = '';
            for await (const chunk of provider.chat(
              [{ role: 'user', content: prompt }],
              abortController.signal
            )) {
              fullResult += chunk;
            }

            activeInlineAbortControllers.delete(tabId);
            chrome.tabs.sendMessage(tabId, { type: 'TOOLBAR_INLINE_RESULT', content: fullResult, action, model: settings.model, targetLanguage });
          } catch (error) {
            activeInlineAbortControllers.delete(tabId);
            if (!abortController.signal.aborted) {
              const errorMsg = error instanceof Error ? error.message : '处理失败';
              chrome.tabs.sendMessage(tabId, { type: 'TOOLBAR_INLINE_ERROR', error: errorMsg });
            }
          }
        })();

        sendResponse({ success: true });
        return true;
      }

      if (message.type === 'TOOLBAR_INLINE_CANCEL') {
        const tabId = sender.tab?.id;
        if (tabId) {
          const ctrl = activeInlineAbortControllers.get(tabId);
          if (ctrl) {
            ctrl.abort();
            activeInlineAbortControllers.delete(tabId);
          }
        }
        sendResponse({ success: true });
        return true;
      }

      return false;
    }
  );
});

async function handleExtractAndSummarize(
  sender: chrome.runtime.MessageSender
): Promise<MessageResponse<SummaryResult>> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (!tab?.id) {
    return { success: false, error: { code: 'NO_TAB', message: '无法获取当前标签页' } };
  }

  const tabId = tab.id;
  const tabUrl = tab.url ?? '';

  if (tabUrl.startsWith('chrome://') || tabUrl.startsWith('chrome-extension://') || tabUrl.startsWith('about:') || tabUrl === '') {
    return { success: false, error: { code: 'UNSUPPORTED_PAGE', message: '该页面类型不支持摘要' } };
  }

  const extracted = await extractFromTab(tabId);
  if (!extracted.success || !extracted.data) {
    return { success: false, error: extracted.error ?? { code: 'CONTENT_EXTRACTION_FAILED', message: '内容提取失败' } };
  }

  return handleSummarizeMessage({ type: 'SUMMARIZE', payload: extracted.data });
}

async function extractFromTab(tabId: number): Promise<MessageResponse<ExtractedContent>> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_CONTENT' }) as MessageResponse<ExtractedContent>;
    return response;
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-scripts/content.js'],
      });
      await new Promise((r) => setTimeout(r, 300));
      const response = await chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_CONTENT' }) as MessageResponse<ExtractedContent>;
      return response;
    } catch (injectErr) {
      return {
        success: false,
        error: {
          code: 'CONTENT_EXTRACTION_FAILED',
          message: '无法在该页面注入内容脚本，请刷新页面后重试',
        },
      };
    }
  }
}

async function handleTestConnectionMessage(
  message: MessageRequest<TestConnectionPayload>
): Promise<MessageResponse<TestConnectionResult>> {
  const { apiKey, baseUrl, model } = message.payload!;
  const base = baseUrl.replace(/\/$/, '');

  try {
    const modelsRes = await fetch(`${base}/models`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (modelsRes.ok) {
      return { success: true, data: { success: true } };
    }

    if (modelsRes.status === 401) {
      return {
        success: false,
        data: { success: false, errorCode: 'INVALID_API_KEY', message: 'API Key 无效或未授权' },
      };
    }

    if (modelsRes.status === 404) {
      const chatRes = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (chatRes.ok) {
        return { success: true, data: { success: true } };
      }

      if (chatRes.status === 401) {
        return {
          success: false,
          data: { success: false, errorCode: 'INVALID_API_KEY', message: 'API Key 无效或未授权' },
        };
      }

      const errBody = await chatRes.json().catch(() => ({})) as { error?: { message?: string } };
      return {
        success: false,
        data: {
          success: false,
          errorCode: chatRes.status >= 500 ? 'SERVER_ERROR' : 'WRONG_URL',
          message: errBody.error?.message ?? `HTTP ${chatRes.status}`,
        },
      };
    }

    const errBody = await modelsRes.json().catch(() => ({})) as { error?: { message?: string } };
    return {
      success: false,
      data: {
        success: false,
        errorCode: modelsRes.status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN',
        message: errBody.error?.message ?? `HTTP ${modelsRes.status}`,
      },
    };
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    return {
      success: false,
      data: {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: isTimeout ? '连接超时（15秒），请检查网络或 Base URL' : '无法连接到服务器，请检查 Base URL 是否正确',
      },
    };
  }
}

async function handleSummarizeMessage(
  message: MessageRequest<ExtractedContent>
): Promise<MessageResponse<SummaryResult>> {
  try {
    const settings = await getSettings();

    if (!settings.apiKey) {
      return {
        success: false,
        error: {
          code: 'NO_API_KEY',
          message: 'API key is not configured',
        },
      };
    }

    const provider = new OpenAIProvider({
      apiKey: settings.apiKey,
      baseUrl: settings.baseUrl,
      model: settings.model,
    });

    const result = await provider.summarize(message.payload!);

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    if (error.code === 'INVALID_API_KEY' || error.code === 'RATE_LIMITED' || error.code === 'SERVER_ERROR') {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      };
    }
    return {
      success: false,
      error: {
        code: 'PROVIDER_ERROR',
        message: error.message || 'Failed to generate summary',
      },
    };
  }
}

function extractSources(result: unknown): Array<{ title: string; url: string }> {
  if (!result || typeof result !== 'object') return [];
  const r = result as Record<string, unknown>;
  if (Array.isArray(r.sources)) {
    return (r.sources as Array<Record<string, unknown>>)
      .filter((s) => typeof s.url === 'string')
      .map((s) => ({ title: String(s.title ?? s.url), url: String(s.url) }));
  }
  return [];
}

export function handleChatPort(port: chrome.runtime.Port) {
  if (activeChatAbortController) {
    activeChatAbortController.abort();
  }

  activeChatAbortController = new AbortController();
  const currentAbortController = activeChatAbortController;

  port.onMessage.addListener(async (message: any) => {
    if (message.type === 'CHAT_SEND') {
      const payload = message.payload as ChatSendPayload;
      
      try {
        const settings = await getSettings();
        
        if (!settings.apiKey) {
          port.postMessage({
            type: 'CHAT_STREAM_ERROR',
            error: {
              code: 'NO_API_KEY',
              message: '请先在设置中填写 API Key',
            },
          });
          return;
        }

        if (!payload.message || payload.message.trim() === '') {
          return;
        }

        const agentRole = await getActiveAgentRole();

        let pageContext: PageContext | undefined;
        if (payload.pageContext) {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs[0]?.url === payload.pageContext.url) {
            pageContext = {
              url: payload.pageContext.url,
              title: tabs[0]?.title,
              summary: payload.pageContext.summary?.summary,
              keyPoints: payload.pageContext.summary?.keyPoints,
            };
          }
        }

        // Build conversation history before saving the new user message
        const historyMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
        const activeSession = await getActiveSession();
        if (activeSession && activeSession.messages.length > 0) {
          historyMessages.push(
            ...activeSession.messages.slice(-50).map((m) => ({ role: m.role, content: m.content }))
          );
        }
        historyMessages.push({ role: 'user', content: payload.message });

        await addMessage(payload.sessionId, {
          role: 'user',
          content: payload.message,
          timestamp: Date.now(),
        });

        const agentStream = await createAgentStream({
          settings,
          agentRole,
          messages: historyMessages,
          pageContext,
          signal: currentAbortController.signal,
        });

        let fullResponse = '';
        let pendingSources: Array<{ title: string; url: string }> = [];

        for await (const event of agentStream) {
          if (event.type === 'text-delta') {
            fullResponse += event.textDelta;
            port.postMessage({ type: 'CHAT_STREAM_CHUNK', content: event.textDelta });
          } else if (event.type === 'tool-call') {
            port.postMessage({
              type: 'CHAT_TOOL_CALL',
              toolName: event.toolName,
              args: event.args,
            });
          } else if (event.type === 'tool-result') {
            const sources = extractSources(event.result);
            if (sources.length > 0) pendingSources = sources;
            port.postMessage({
              type: 'CHAT_TOOL_RESULT',
              toolName: event.toolName,
              result: event.result,
              sources,
            });
          } else if (event.type === 'error') {
            throw event.error;
          }
        }

        port.postMessage({ type: 'CHAT_STREAM_END' });

        await addMessage(payload.sessionId, {
          role: 'assistant',
          content: fullResponse,
          timestamp: Date.now(),
          agentRole,
          sources: pendingSources.length > 0 ? pendingSources : undefined,
        });
      } catch (err: any) {
        port.postMessage({
          type: 'CHAT_STREAM_ERROR',
          error: {
            code: 'CHAT_ERROR',
            message: err.message || '聊天请求失败',
          },
        });
      }
    }
  });

  port.onDisconnect.addListener(() => {
    currentAbortController.abort();
  });
}
