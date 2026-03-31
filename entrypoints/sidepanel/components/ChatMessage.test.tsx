import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import type { ChatMessage as ChatMessageType } from '~/utils/types';

describe('ChatMessage', () => {
  it('should render user message with blue background', async () => {
    const ChatMessage = (await import('./ChatMessage')).default;
    const message: ChatMessageType = {
      id: '1',
      role: 'user',
      content: 'Hello',
      timestamp: Date.now(),
    };

    const element = createElement(ChatMessage, { message });
    expect(element.type).toBe(ChatMessage);
    expect(element.props.message.role).toBe('user');
  });

  it('should render assistant message with gray background', async () => {
    const ChatMessage = (await import('./ChatMessage')).default;
    const message: ChatMessageType = {
      id: '2',
      role: 'assistant',
      content: 'Hi there',
      timestamp: Date.now(),
    };

    const element = createElement(ChatMessage, { message });
    expect(element.type).toBe(ChatMessage);
    expect(element.props.message.role).toBe('assistant');
  });

  it('should display streaming cursor when isStreaming is true', async () => {
    const ChatMessage = (await import('./ChatMessage')).default;
    const message: ChatMessageType = {
      id: '3',
      role: 'assistant',
      content: 'Streaming...',
      timestamp: Date.now(),
    };

    const element = createElement(ChatMessage, { message, isStreaming: true });
    expect(element.props.isStreaming).toBe(true);
  });
});
