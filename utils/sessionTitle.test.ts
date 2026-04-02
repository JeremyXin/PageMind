import { describe, it, expect } from 'vitest';
import { deriveSessionTitle } from './sessionTitle';
import { createTestSession, createTestMessage } from '../tests/test-utils';

describe('deriveSessionTitle', () => {
  it('should truncate long user message (>30 chars) with ellipsis', () => {
    const session = createTestSession({
      messages: [
        createTestMessage({
          role: 'user',
          content: 'This is a very long message that exceeds thirty characters',
        }),
      ],
    });

    const result = deriveSessionTitle(session);
    expect(result).toBe('This is a very long message th…');
    expect(Array.from(result).length).toBe(31); // 30 chars + ellipsis
  });

  it('should return "新对话" for empty messages array', () => {
    const session = createTestSession({
      messages: [],
    });

    const result = deriveSessionTitle(session);
    expect(result).toBe('新对话');
  });

  it('should return "新对话" when only assistant messages exist', () => {
    const session = createTestSession({
      messages: [
        createTestMessage({
          role: 'assistant',
          content: 'Hello, I am an assistant message',
        }),
        createTestMessage({
          role: 'assistant',
          content: 'Another assistant message',
        }),
      ],
    });

    const result = deriveSessionTitle(session);
    expect(result).toBe('新对话');
  });

  it('should correctly truncate emoji without breaking them', () => {
    // Use a longer emoji string to ensure truncation happens
    // Each emoji is 1-2 grapheme clusters, we need >30 total
    const emojiString = '🎉'.repeat(35);
    const session = createTestSession({
      messages: [
        createTestMessage({
          role: 'user',
          content: emojiString,
        }),
      ],
    });

    const result = deriveSessionTitle(session);
    // Should not have broken emoji (mojibake)
    expect(result).not.toContain('�');
    // Should be truncated with ellipsis
    expect(result.endsWith('…')).toBe(true);
    // Check grapheme cluster count (not string.length which counts UTF-16)
    expect(Array.from(result).length).toBe(31); // 30 graphemes + ellipsis
  });

  it('should not add ellipsis for exactly 30 characters', () => {
    const exactly30Chars = 'a'.repeat(30);
    const session = createTestSession({
      messages: [
        createTestMessage({
          role: 'user',
          content: exactly30Chars,
        }),
      ],
    });

    const result = deriveSessionTitle(session);
    expect(result).toBe(exactly30Chars);
    expect(result).not.toContain('…');
    expect(result.length).toBe(30);
  });

  it('should not add ellipsis for less than 30 characters', () => {
    const shortMessage = 'Hello world';
    const session = createTestSession({
      messages: [
        createTestMessage({
          role: 'user',
          content: shortMessage,
        }),
      ],
    });

    const result = deriveSessionTitle(session);
    expect(result).toBe(shortMessage);
    expect(result).not.toContain('…');
    expect(result.length).toBe(shortMessage.length);
  });

  it('should use first user message when mixed roles exist', () => {
    const session = createTestSession({
      messages: [
        createTestMessage({
          role: 'assistant',
          content: 'Assistant greeting',
        }),
        createTestMessage({
          role: 'user',
          content: 'First user question here',
        }),
        createTestMessage({
          role: 'assistant',
          content: 'Assistant response',
        }),
      ],
    });

    const result = deriveSessionTitle(session);
    expect(result).toBe('First user question here');
  });
});
