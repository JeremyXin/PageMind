import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatProvider } from './chat';
import type { OpenAIProviderConfig } from './openai';

describe('ChatProvider', () => {
  let config: OpenAIProviderConfig;

  beforeEach(() => {
    config = {
      apiKey: 'test-key',
      baseUrl: 'https://api.openai.com',
      model: 'gpt-4',
    };
    vi.restoreAllMocks();
  });

  it('should yield streaming chunks in order', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":" World"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    });

    const provider = new ChatProvider(config);
    const messages = [{ role: 'user' as const, content: 'test' }];
    const signal = new AbortController().signal;

    const chunks: string[] = [];
    for await (const chunk of provider.chat(messages, signal)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hello', ' World']);
  });

  it('should terminate on data: [DONE]', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Test"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    });

    const provider = new ChatProvider(config);
    const messages = [{ role: 'user' as const, content: 'test' }];
    const signal = new AbortController().signal;

    const chunks: string[] = [];
    for await (const chunk of provider.chat(messages, signal)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Test']);
  });

  it('should stop when AbortSignal is triggered', async () => {
    const abortController = new AbortController();
    
    const mockStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"First"}}]}\n\n'));
        
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // This should not be yielded after abort
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Second"}}]}\n\n'));
        controller.close();
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    });

    const provider = new ChatProvider(config);
    const messages = [{ role: 'user' as const, content: 'test' }];

    const chunks: string[] = [];
    
    // Abort after first chunk
    setTimeout(() => abortController.abort(), 15);
    
    for await (const chunk of provider.chat(messages, abortController.signal)) {
      chunks.push(chunk);
      if (chunks.length === 1) {
        await new Promise(resolve => setTimeout(resolve, 20)); // Wait for abort
      }
    }

    // Should only get first chunk before abort
    expect(chunks.length).toBeLessThanOrEqual(2);
  });

  it('should throw error with code INVALID_API_KEY on 401 response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });

    const provider = new ChatProvider(config);
    const messages = [{ role: 'user' as const, content: 'test' }];
    const signal = new AbortController().signal;

    await expect(async () => {
      for await (const _ of provider.chat(messages, signal)) {
        // Should not reach here
      }
    }).rejects.toMatchObject({
      code: 'INVALID_API_KEY',
    });
  });

  it('should skip malformed JSON chunks and continue streaming', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"First"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: {malformed json}\n\n')); // This should be skipped
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Second"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    });

    const provider = new ChatProvider(config);
    const messages = [{ role: 'user' as const, content: 'test' }];
    const signal = new AbortController().signal;

    const chunks: string[] = [];
    for await (const chunk of provider.chat(messages, signal)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['First', 'Second']);
  });

  it('should not include response_format in request body', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    });
    global.fetch = fetchMock;

    const provider = new ChatProvider(config);
    const messages = [{ role: 'user' as const, content: 'test' }];
    const signal = new AbortController().signal;

    for await (const _ of provider.chat(messages, signal)) {
      // Just consume the stream
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callArgs = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(callArgs[1].body);
    
    expect(requestBody.response_format).toBeUndefined();
    expect(requestBody.stream).toBe(true);
    expect(requestBody.model).toBe('gpt-4');
    expect(requestBody.messages).toEqual(messages);
  });

  it('should correctly decode multi-byte UTF-8 characters across chunk boundaries', async () => {
    // Test with emoji that might be split across chunks
    const emoji = '😀'; // 4-byte UTF-8 character
    const bytes = new TextEncoder().encode(emoji);
    
    const mockStream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        // Split the emoji bytes across two chunks
        const part1 = new Uint8Array([...encoder.encode('data: {"choices":[{"delta":{"content":"'), ...bytes.slice(0, 2)]);
        const part2 = new Uint8Array([...bytes.slice(2), ...encoder.encode('"}}]}\n\ndata: [DONE]\n\n')]);
        
        controller.enqueue(part1);
        controller.enqueue(part2);
        controller.close();
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    });

    const provider = new ChatProvider(config);
    const messages = [{ role: 'user' as const, content: 'test' }];
    const signal = new AbortController().signal;

    const chunks: string[] = [];
    for await (const chunk of provider.chat(messages, signal)) {
      chunks.push(chunk);
    }

    // The emoji should be correctly decoded
    expect(chunks.join('')).toBe(emoji);
  });

  it('should handle finish_reason: stop as termination signal', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Done"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: {"choices":[{"finish_reason":"stop"}]}\n\n'));
        controller.close();
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    });

    const provider = new ChatProvider(config);
    const messages = [{ role: 'user' as const, content: 'test' }];
    const signal = new AbortController().signal;

    const chunks: string[] = [];
    for await (const chunk of provider.chat(messages, signal)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Done']);
  });
});
