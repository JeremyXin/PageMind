import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    streamText: vi.fn(),
  };
});

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn().mockReturnValue({
    chat: vi.fn().mockReturnValue('mock-model'),
    tools: {
      webSearchPreview: vi.fn().mockReturnValue({ type: 'web_search_preview' }),
    },
  }),
}));

import { createAgentStream } from './agent';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const mockStreamText = vi.mocked(streamText);
const mockCreateOpenAI = vi.mocked(createOpenAI);

function makeMockFullStream(events: unknown[]) {
  return {
    fullStream: (async function* () {
      for (const e of events) yield e;
    })(),
  };
}

const baseSettings = {
  apiKey: 'test-key',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  targetLanguage: 'zh-CN',
};

const baseOptions = {
  settings: baseSettings,
  agentRole: 'general' as const,
  messages: [{ role: 'user' as const, content: 'Hello' }],
  signal: new AbortController().signal,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockStreamText.mockReturnValue(
    makeMockFullStream([
      { type: 'text-delta', textDelta: 'Hello' },
      { type: 'finish', finishReason: 'stop' },
    ]) as never
  );
});

describe('createAgentStream', () => {
  it('returns an async iterable that yields text-delta events', async () => {
    const stream = await createAgentStream(baseOptions);
    const events = [];
    for await (const event of stream) events.push(event);
    expect(events.some((e) => e.type === 'text-delta')).toBe(true);
    expect(events.some((e) => e.type === 'finish')).toBe(true);
  });

  it('registers webSearchPreview tool for OpenAI provider', async () => {
    await createAgentStream(baseOptions);
    const callArgs = mockStreamText.mock.calls[0][0] as Record<string, unknown>;
    expect(callArgs.tools).toHaveProperty('webSearch');
  });

  it('does NOT register webSearch tool for unsupported provider (DeepSeek)', async () => {
    const opts = {
      ...baseOptions,
      settings: { ...baseSettings, baseUrl: 'https://api.deepseek.com/v1' },
    };
    await createAgentStream(opts);
    const callArgs = mockStreamText.mock.calls[0][0] as Record<string, unknown>;
    expect((callArgs.tools as Record<string, unknown>)?.webSearch).toBeUndefined();
  });

  it('always registers get_page_content tool', async () => {
    await createAgentStream(baseOptions);
    const callArgs = mockStreamText.mock.calls[0][0] as Record<string, unknown>;
    expect(callArgs.tools).toHaveProperty('get_page_content');
  });

  it('uses correct temperature from AGENT_TEMPERATURES', async () => {
    const opts = { ...baseOptions, agentRole: 'coder' as const };
    await createAgentStream(opts);
    const callArgs = mockStreamText.mock.calls[0][0] as Record<string, unknown>;
    expect(callArgs.temperature).toBe(0.2);
  });

  it('passes agentRole system prompt to streamText', async () => {
    await createAgentStream({ ...baseOptions, agentRole: 'analyst' });
    const callArgs = mockStreamText.mock.calls[0][0] as Record<string, unknown>;
    expect(typeof callArgs.system).toBe('string');
    expect((callArgs.system as string).length).toBeGreaterThan(10);
  });

  it('yields error event when stream throws', async () => {
    mockStreamText.mockReturnValue({
      fullStream: (async function* () {
        throw new Error('network failure');
      })(),
    } as never);
    const stream = await createAgentStream(baseOptions);
    const events = [];
    for await (const event of stream) events.push(event);
    expect(events.some((e) => e.type === 'error')).toBe(true);
  });

  it('uses openai.chat() not openai() for Chat Completions API', async () => {
    const mockOpenAI = mockCreateOpenAI.mock.results[0]?.value ?? {
      chat: vi.fn().mockReturnValue('model'),
      tools: { webSearchPreview: vi.fn().mockReturnValue({}) },
    };
    await createAgentStream(baseOptions);
    expect(mockCreateOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ compatibility: 'compatible' })
    );
  });
});
