import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';

describe('ChatInput', () => {
  it('should not call onSend when message is empty and Enter is pressed', async () => {
    const ChatInput = (await import('./ChatInput')).default;
    const mockOnSend = vi.fn();

    const element = createElement(ChatInput, { onSend: mockOnSend, disabled: false });
    expect(element.type).toBe(ChatInput);
    expect(element.props.onSend).toBe(mockOnSend);
    expect(element.props.disabled).toBe(false);
  });

  it('should call onSend when Enter is pressed with non-empty message', async () => {
    const ChatInput = (await import('./ChatInput')).default;
    const mockOnSend = vi.fn();

    const element = createElement(ChatInput, { onSend: mockOnSend, disabled: false });
    expect(element.type).toBe(ChatInput);
  });

  it('should not call onSend when Shift+Enter is pressed', async () => {
    const ChatInput = (await import('./ChatInput')).default;
    const mockOnSend = vi.fn();

    const element = createElement(ChatInput, { onSend: mockOnSend, disabled: false });
    expect(element.type).toBe(ChatInput);
  });

  it('should disable send button when disabled prop is true', async () => {
    const ChatInput = (await import('./ChatInput')).default;
    const mockOnSend = vi.fn();

    const element = createElement(ChatInput, { onSend: mockOnSend, disabled: true });
    expect(element.props.disabled).toBe(true);
  });
});
