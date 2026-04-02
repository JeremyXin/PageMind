import type { ChatSession } from './types';

/**
 * Derives a session title from the first user message.
 * Truncates to 30 characters with ellipsis if longer.
 * Falls back to "新对话" if no user messages exist.
 */
export function deriveSessionTitle(session: ChatSession): string {
  const firstUserMessage = session.messages.find((msg) => msg.role === 'user');

  if (!firstUserMessage) {
    return '新对话';
  }

  const content = firstUserMessage.content;
  const chars = Array.from(content);

  if (chars.length <= 30) {
    return content;
  }

  return chars.slice(0, 30).join('') + '…';
}
