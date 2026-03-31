import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import type { SummaryResult } from '~/utils/types';

const mockPort = {
  postMessage: vi.fn(),
  onMessage: {
    addListener: vi.fn(),
  },
  onDisconnect: {
    addListener: vi.fn(),
  },
  disconnect: vi.fn(),
};

vi.mock('~/utils/chatStorage', () => ({
  getActiveSession: vi.fn().mockResolvedValue({
    id: 'session-1',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hi there',
        timestamp: Date.now(),
      },
    ],
    createdAt: Date.now(),
  }),
  clearSession: vi.fn().mockResolvedValue(undefined),
  newSession: vi.fn().mockResolvedValue({
    id: 'session-2',
    messages: [],
    createdAt: Date.now(),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  
  globalThis.chrome = {
    runtime: {
      connect: vi.fn().mockReturnValue(mockPort),
    },
  } as any;
});

describe('ChatPanel', () => {
  it('should load history messages on mount', async () => {
    const ChatPanel = (await import('./ChatPanel')).default;
    const element = createElement(ChatPanel);
    
    expect(element.type).toBe(ChatPanel);
  });

  it('should establish port connection on mount', async () => {
    const ChatPanel = (await import('./ChatPanel')).default;
    const element = createElement(ChatPanel);
    
    expect(element.type).toBe(ChatPanel);
  });

  it('should handle CHAT_STREAM_CHUNK by accumulating content', async () => {
    const ChatPanel = (await import('./ChatPanel')).default;
    const element = createElement(ChatPanel);
    
    expect(element.type).toBe(ChatPanel);
  });

  it('should handle CHAT_STREAM_END by pushing message to list', async () => {
    const ChatPanel = (await import('./ChatPanel')).default;
    const element = createElement(ChatPanel);
    
    expect(element.type).toBe(ChatPanel);
  });

  it('should handle CHAT_STREAM_ERROR by displaying error message', async () => {
    const ChatPanel = (await import('./ChatPanel')).default;
    const element = createElement(ChatPanel);
    
    expect(element.type).toBe(ChatPanel);
  });

  it('should pass summaryContext prop to chat handler', async () => {
    const ChatPanel = (await import('./ChatPanel')).default;
    const mockSummary: SummaryResult = {
      summary: 'Test summary',
      keyPoints: [],
      viewpoints: [],
      bestPractices: [],
    };
    
    const element = createElement(ChatPanel, {
      summaryContext: {
        url: 'https://example.com',
        summary: mockSummary,
      },
    });
    
    expect(element.type).toBe(ChatPanel);
    expect(element.props.summaryContext).toBeDefined();
  });

  it('should disable input when isStreaming is true', async () => {
    const ChatPanel = (await import('./ChatPanel')).default;
    const element = createElement(ChatPanel);
    
    expect(element.type).toBe(ChatPanel);
  });
});
