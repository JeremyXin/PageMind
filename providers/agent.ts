import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { getAgentSystemPrompt, AGENT_TEMPERATURES } from './prompts';
import { getWebSearchCapability } from '../utils/capabilities';
import { createPageAnalysisTool } from './tools/pageAnalysis';
import type { AgentRole, ExtensionSettings } from '../utils/types';
import type { PageContext } from './tools/pageAnalysis';

export type { PageContext };

export interface AgentStreamOptions {
  settings: ExtensionSettings;
  agentRole: AgentRole;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  pageContext?: PageContext;
  signal: AbortSignal;
}

export type AgentStreamEvent =
  | { type: 'text-delta'; textDelta: string }
  | { type: 'tool-call'; toolCallId: string; toolName: string; args: unknown }
  | { type: 'tool-result'; toolCallId: string; toolName: string; result: unknown }
  | { type: 'finish'; finishReason: string }
  | { type: 'error'; error: unknown };

export async function createAgentStream(
  options: AgentStreamOptions
): Promise<AsyncIterable<AgentStreamEvent>> {
  const { settings, agentRole, messages, pageContext, signal } = options;

  const systemPrompt = getAgentSystemPrompt(agentRole);

  const openai = createOpenAI({
    apiKey: settings.apiKey,
    baseURL: settings.baseUrl,
    compatibility: 'compatible',
  });

  const capability = getWebSearchCapability(settings.baseUrl, settings.model);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, any> = {};

  tools.get_page_content = createPageAnalysisTool(pageContext);

  if (capability.supported && capability.toolType === 'web_search_preview') {
    tools.webSearch = openai.tools.webSearchPreview();
  }

  const result = streamText({
    model: openai.chat(settings.model),
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    temperature: AGENT_TEMPERATURES[agentRole],
    maxSteps: 5,
    tools,
    abortSignal: signal,
  });

  return (async function* (): AsyncGenerator<AgentStreamEvent> {
    try {
      for await (const event of result.fullStream) {
        if (event.type === 'text-delta') {
          yield { type: 'text-delta', textDelta: event.textDelta };
        } else if (event.type === 'tool-call') {
          yield {
            type: 'tool-call',
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            args: event.args,
          };
        } else if (event.type === 'tool-result') {
          yield {
            type: 'tool-result',
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            result: event.result,
          };
        } else if (event.type === 'finish') {
          yield { type: 'finish', finishReason: event.finishReason };
        }
      }
    } catch (error) {
      yield { type: 'error', error };
    }
  })();
}
