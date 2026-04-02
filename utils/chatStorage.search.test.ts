import { describe, it, expect, beforeEach, vi } from 'vitest';
import { searchMessages } from './chatStorage';
import type { ChatSession } from './types';

const mockStorage: { chatSessions?: ChatSession[] } = {};

describe('searchMessages', () => {
  beforeEach(() => {
    mockStorage.chatSessions = [];
    vi.stubGlobal('browser', {
      storage: {
        local: {
          get: vi.fn(async (key: string) => {
            return { [key]: mockStorage[key as keyof typeof mockStorage] };
          }),
          set: vi.fn(async (data: Record<string, unknown>) => {
            Object.assign(mockStorage, data);
          }),
          remove: vi.fn(),
        },
      },
    });
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => `test-uuid-${Date.now()}-${Math.random()}`),
    });
  });

  it('should return empty array for empty query', async () => {
    mockStorage.chatSessions = [
      {
        id: 'session-1',
        messages: [
          { id: 'msg-1', role: 'user', content: 'Hello world', timestamp: 1000 },
        ],
        createdAt: 1000,
      },
    ];

    const results = await searchMessages('');
    expect(results).toEqual([]);
  });

  it('should return empty array for whitespace-only query', async () => {
    mockStorage.chatSessions = [
      {
        id: 'session-1',
        messages: [
          { id: 'msg-1', role: 'user', content: 'Hello world', timestamp: 1000 },
        ],
        createdAt: 1000,
      },
    ];

    const results = await searchMessages('   ');
    expect(results).toEqual([]);
  });

  it('should find matches in a single session', async () => {
    mockStorage.chatSessions = [
      {
        id: 'session-1',
        messages: [
          { id: 'msg-1', role: 'user', content: 'Hello world', timestamp: 1000 },
          { id: 'msg-2', role: 'assistant', content: 'This is a test message', timestamp: 2000 },
          { id: 'msg-3', role: 'user', content: 'Another hello here', timestamp: 3000 },
        ],
        createdAt: 1000,
      },
    ];

    const results = await searchMessages('hello');
    expect(results).toHaveLength(2);
    expect(results[0].message.content).toBe('Another hello here');
    expect(results[1].message.content).toBe('Hello world');
    expect(results[0].sessionId).toBe('session-1');
    expect(results[0].matchIndex).toBe(2);
    expect(results[1].matchIndex).toBe(0);
  });

  it('should find matches across multiple sessions', async () => {
    mockStorage.chatSessions = [
      {
        id: 'session-1',
        messages: [
          { id: 'msg-1', role: 'user', content: 'Hello from session 1', timestamp: 1000 },
        ],
        createdAt: 1000,
      },
      {
        id: 'session-2',
        messages: [
          { id: 'msg-2', role: 'user', content: 'Hello from session 2', timestamp: 2000 },
        ],
        createdAt: 2000,
      },
    ];

    const results = await searchMessages('hello');
    expect(results).toHaveLength(2);
    expect(results[0].sessionId).toBe('session-2');
    expect(results[1].sessionId).toBe('session-1');
  });

  it('should be case insensitive', async () => {
    mockStorage.chatSessions = [
      {
        id: 'session-1',
        messages: [
          { id: 'msg-1', role: 'user', content: 'HELLO WORLD', timestamp: 1000 },
          { id: 'msg-2', role: 'assistant', content: 'hello there', timestamp: 2000 },
          { id: 'msg-3', role: 'user', content: 'Hello Everyone', timestamp: 3000 },
        ],
        createdAt: 1000,
      },
    ];

    const resultsLower = await searchMessages('hello');
    expect(resultsLower).toHaveLength(3);

    const resultsUpper = await searchMessages('HELLO');
    expect(resultsUpper).toHaveLength(3);

    const resultsMixed = await searchMessages('HeLLo');
    expect(resultsMixed).toHaveLength(3);
  });

  it('should return empty array when no matches found', async () => {
    mockStorage.chatSessions = [
      {
        id: 'session-1',
        messages: [
          { id: 'msg-1', role: 'user', content: 'Hello world', timestamp: 1000 },
        ],
        createdAt: 1000,
      },
    ];

    const results = await searchMessages('nonexistent');
    expect(results).toEqual([]);
  });

  it('should return results sorted by timestamp descending (newest first)', async () => {
    mockStorage.chatSessions = [
      {
        id: 'session-1',
        messages: [
          { id: 'msg-1', role: 'user', content: 'Old hello', timestamp: 1000 },
          { id: 'msg-2', role: 'assistant', content: 'New hello', timestamp: 5000 },
          { id: 'msg-3', role: 'user', content: 'Middle hello', timestamp: 3000 },
        ],
        createdAt: 1000,
      },
    ];

    const results = await searchMessages('hello');
    expect(results).toHaveLength(3);
    expect(results[0].message.timestamp).toBe(5000);
    expect(results[1].message.timestamp).toBe(3000);
    expect(results[2].message.timestamp).toBe(1000);
  });

  it('should include correct sessionCreatedAt in results', async () => {
    mockStorage.chatSessions = [
      {
        id: 'session-1',
        messages: [
          { id: 'msg-1', role: 'user', content: 'Hello world', timestamp: 1000 },
        ],
        createdAt: 5000,
      },
    ];

    const results = await searchMessages('hello');
    expect(results).toHaveLength(1);
    expect(results[0].sessionCreatedAt).toBe(5000);
  });

  it('should handle empty sessions', async () => {
    mockStorage.chatSessions = [
      {
        id: 'session-1',
        messages: [],
        createdAt: 1000,
      },
      {
        id: 'session-2',
        messages: [
          { id: 'msg-1', role: 'user', content: 'Hello world', timestamp: 1000 },
        ],
        createdAt: 2000,
      },
    ];

    const results = await searchMessages('hello');
    expect(results).toHaveLength(1);
    expect(results[0].sessionId).toBe('session-2');
  });

  it('should handle no sessions at all', async () => {
    mockStorage.chatSessions = [];

    const results = await searchMessages('hello');
    expect(results).toEqual([]);
  });
});
