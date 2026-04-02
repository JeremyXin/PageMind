import type { ChatSession, ChatMessage } from '../utils/types';

/**
 * Test factory functions for creating ChatSession and ChatMessage objects
 * Used to reduce boilerplate in tests and ensure consistent test data
 */

/**
 * Default values for ChatSession
 */
const DEFAULT_SESSION: Omit<ChatSession, 'id' | 'createdAt'> = {
  messages: [],
  pageUrl: 'https://example.com',
  pageTitle: 'Test Page',
};

/**
 * Default values for ChatMessage
 */
const DEFAULT_MESSAGE: Omit<ChatMessage, 'id'> = {
  role: 'user',
  content: 'Hello, world!',
  timestamp: Date.now(),
};

/**
 * Creates a test ChatSession with sensible defaults
 * @param overrides - Optional properties to override defaults
 * @returns A ChatSession object
 */
export function createTestSession(
  overrides?: Partial<Omit<ChatSession, 'id' | 'createdAt'>> & {
    id?: string;
    createdAt?: number;
  }
): ChatSession {
  return {
    ...DEFAULT_SESSION,
    id: `session-${Math.random().toString(36).substring(2, 9)}`,
    createdAt: Date.now(),
    ...overrides,
  };
}

/**
 * Creates a test ChatMessage with sensible defaults
 * @param overrides - Optional properties to override defaults
 * @returns A ChatMessage object
 */
export function createTestMessage(
  overrides?: Partial<Omit<ChatMessage, 'id'>> & { id?: string }
): ChatMessage {
  return {
    ...DEFAULT_MESSAGE,
    id: `msg-${Math.random().toString(36).substring(2, 9)}`,
    ...overrides,
  };
}

/**
 * Creates a test ChatSession with N messages
 * @param messageCount - Number of messages to create
 * @param sessionOverrides - Optional properties to override session defaults
 * @returns A ChatSession object with messages
 */
export function createTestSessionWithMessages(
  messageCount: number,
  sessionOverrides?: Parameters<typeof createTestSession>[0]
): ChatSession {
  const session = createTestSession(sessionOverrides);
  const messages: ChatMessage[] = [];

  for (let i = 0; i < messageCount; i++) {
    messages.push(
      createTestMessage({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: session.createdAt + i * 1000,
      })
    );
  }

  return {
    ...session,
    messages,
  };
}
