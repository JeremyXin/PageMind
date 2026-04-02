import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from '@webext-core/fake-browser';
import {
  getSessions,
  getActiveSession,
  createSession,
  addMessage,
  clearSession,
  newSession,
  setActiveSession,
  cleanupOldSessions,
  MAX_SESSIONS,
  MAX_MESSAGES_PER_SESSION,
  PRUNE_COUNT,
} from './chatStorage';
import type { ChatSession } from './types';
import { createTestSession, createTestMessage } from '../tests/test-utils';

describe('chatStorage', () => {
  beforeEach(() => {
    // Clear storage before each test
    fakeBrowser.storage.local.clear();
  });

  describe('createSession', () => {
    it('should create a session and persist it', async () => {
      const session = await createSession('https://example.com', 'Test Page');

      expect(session.id).toBeDefined();
      expect(session.pageUrl).toBe('https://example.com');
      expect(session.pageTitle).toBe('Test Page');
      expect(session.messages).toEqual([]);
      expect(session.createdAt).toBeGreaterThan(0);

      // Verify persistence
      const sessions = await getSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe(session.id);
    });

    it('should auto-delete oldest session when MAX_SESSIONS is exceeded', async () => {
      // Create 11 sessions (exceeds MAX_SESSIONS = 10)
      const sessions: ChatSession[] = [];
      for (let i = 0; i < MAX_SESSIONS + 1; i++) {
        const session = await createSession(`https://example${i}.com`, `Page ${i}`);
        sessions.push(session);
        // Small delay to ensure different createdAt timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const storedSessions = await getSessions();
      expect(storedSessions).toHaveLength(MAX_SESSIONS);

      // The oldest session (first one created) should be removed
      const oldestId = sessions[0].id;
      const hasOldest = storedSessions.some(s => s.id === oldestId);
      expect(hasOldest).toBe(false);

      // The newest session should exist
      const newestId = sessions[MAX_SESSIONS].id;
      const hasNewest = storedSessions.some(s => s.id === newestId);
      expect(hasNewest).toBe(true);
    });

    it('should prune to exactly MAX_SESSIONS when creating 51 sessions', async () => {
      // Create 51 sessions (exceeds MAX_SESSIONS = 50)
      const sessions: ChatSession[] = [];
      for (let i = 0; i < 51; i++) {
        const session = await createSession(`https://example${i}.com`, `Page ${i}`);
        sessions.push(session);
        // Small delay to ensure different createdAt timestamps
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      const storedSessions = await getSessions();
      expect(storedSessions).toHaveLength(50);

      // The oldest session (first one created) should be removed
      const oldestId = sessions[0].id;
      const hasOldest = storedSessions.some(s => s.id === oldestId);
      expect(hasOldest).toBe(false);

      // All other 50 sessions should exist
      for (let i = 1; i < 51; i++) {
        const hasSession = storedSessions.some(s => s.id === sessions[i].id);
        expect(hasSession).toBe(true);
      }
    });
  });

  describe('getSessions', () => {
    it('should return sessions sorted by createdAt descending', async () => {
      // Create sessions with delays to ensure different timestamps
      const session1 = await createSession('https://example1.com', 'Page 1');
      await new Promise(resolve => setTimeout(resolve, 50));
      const session2 = await createSession('https://example2.com', 'Page 2');
      await new Promise(resolve => setTimeout(resolve, 50));
      const session3 = await createSession('https://example3.com', 'Page 3');

      const sessions = await getSessions();
      
      expect(sessions).toHaveLength(3);
      // Should be sorted newest first
      expect(sessions[0].id).toBe(session3.id);
      expect(sessions[1].id).toBe(session2.id);
      expect(sessions[2].id).toBe(session1.id);
    });

    it('should return empty array when no sessions exist', async () => {
      const sessions = await getSessions();
      expect(sessions).toEqual([]);
    });
  });

  describe('getActiveSession', () => {
    it('should create and return new session when no active session and no sessions exist', async () => {
      const session = await getActiveSession();
      expect(session).not.toBeNull();
      expect(session?.id).toBeDefined();
      expect(session?.messages).toEqual([]);
      
      const storedActiveId = await fakeBrowser.storage.local.get('activeChatSessionId');
      expect(storedActiveId.activeChatSessionId).toBe(session?.id);
    });

    it('should return the active session when set', async () => {
      const created = await createSession('https://example.com', 'Test');
      await setActiveSession(created.id);

      const active = await getActiveSession();
      expect(active).not.toBeNull();
      expect(active?.id).toBe(created.id);
    });

    it('should create and return new session when no active session exists', async () => {
      const active = await getActiveSession();
      
      expect(active).not.toBeNull();
      expect(active?.id).toBeDefined();
      expect(active?.messages).toEqual([]);
      
      // Should be saved as active
      const stored = await fakeBrowser.storage.local.get('activeChatSessionId');
      expect(stored.activeChatSessionId).toBe(active?.id);
    });
  });

  describe('addMessage', () => {
    it('should add a message and return ChatMessage with id', async () => {
      const session = await createSession('https://example.com', 'Test');
      
      const messageData = createTestMessage({
        role: 'user',
        content: 'Hello, world!',
      });
      
      const addedMessage = await addMessage(session.id, messageData);
      
      expect(addedMessage.id).toBeDefined();
      expect(addedMessage.role).toBe(messageData.role);
      expect(addedMessage.content).toBe(messageData.content);
      expect(addedMessage.timestamp).toBe(messageData.timestamp);

      // Verify persistence
      const sessions = await getSessions();
      const updatedSession = sessions.find(s => s.id === session.id);
      expect(updatedSession?.messages).toHaveLength(1);
      expect(updatedSession?.messages[0].content).toBe('Hello, world!');
    });

    it('should auto-prune oldest messages when MAX_MESSAGES_PER_SESSION is exceeded', async () => {
      const session = await createSession('https://example.com', 'Test');
      
      // Add MAX_MESSAGES_PER_SESSION + 5 messages
      for (let i = 0; i < MAX_MESSAGES_PER_SESSION + 5; i++) {
        await addMessage(session.id, {
          role: 'user',
          content: `Message ${i}`,
          timestamp: Date.now(),
        });
      }

      const sessions = await getSessions();
      const updatedSession = sessions.find(s => s.id === session.id);
      
      // Should have pruned PRUNE_COUNT (10) oldest messages
      expect(updatedSession?.messages).toHaveLength(MAX_MESSAGES_PER_SESSION + 5 - PRUNE_COUNT);
      
      // The oldest messages should be removed (first PRUNE_COUNT messages)
      const firstMessage = updatedSession?.messages[0];
      expect(firstMessage?.content).toBe(`Message ${PRUNE_COUNT}`);
    });

    it('should throw user-friendly error when storage write fails', async () => {
      const session = await createSession('https://example.com', 'Test');
      
      // Mock storage.set to throw an error
      const originalSet = fakeBrowser.storage.local.set;
      fakeBrowser.storage.local.set = vi.fn().mockRejectedValue(new Error('Storage full'));

      await expect(
        addMessage(session.id, {
          role: 'user',
          content: 'Test message',
          timestamp: Date.now(),
        })
      ).rejects.toThrow('Failed to save message. Please try again.');

      // Restore original
      fakeBrowser.storage.local.set = originalSet;
    });
  });

  describe('clearSession', () => {
    it('should clear messages but keep the session', async () => {
      const session = createTestSession({ pageUrl: 'https://example.com', pageTitle: 'Test' });
      await fakeBrowser.storage.local.set({ chatSessions: [session], activeChatSessionId: session.id });
      
      // Add some messages
      await addMessage(session.id, createTestMessage({ role: 'user', content: 'Hello' }));
      await addMessage(session.id, createTestMessage({ role: 'assistant', content: 'Hi!' }));
      await addMessage(session.id, createTestMessage({ role: 'user', content: 'How are you?' }));
      await addMessage(session.id, createTestMessage({ role: 'assistant', content: 'Good!' }));
      await addMessage(session.id, createTestMessage({ role: 'user', content: 'Thanks' }));

      // Verify messages exist
      let sessions = await getSessions();
      let updatedSession = sessions.find(s => s.id === session.id);
      expect(updatedSession?.messages).toHaveLength(5);

      // Clear session
      await clearSession(session.id);

      // Verify messages cleared but session still exists
      sessions = await getSessions();
      updatedSession = sessions.find(s => s.id === session.id);
      expect(updatedSession).toBeDefined();
      expect(updatedSession?.messages).toHaveLength(0);
      expect(updatedSession?.pageUrl).toBe('https://example.com');
      expect(updatedSession?.pageTitle).toBe('Test');
    });
  });

  describe('newSession', () => {
    it('should create a new session and set it as active', async () => {
      const session = await newSession('https://newpage.com', 'New Page');

      expect(session.id).toBeDefined();
      expect(session.pageUrl).toBe('https://newpage.com');
      expect(session.pageTitle).toBe('New Page');

      // Verify it's set as active
      const stored = await fakeBrowser.storage.local.get('activeChatSessionId');
      expect(stored.activeChatSessionId).toBe(session.id);

      // Verify getActiveSession returns it
      const active = await getActiveSession();
      expect(active?.id).toBe(session.id);
    });
  });

  describe('setActiveSession', () => {
    it('should update the active session id', async () => {
      const session1 = await createSession('https://example1.com', 'Page 1');
      const session2 = await createSession('https://example2.com', 'Page 2');

      // Set session1 as active initially
      await setActiveSession(session1.id);
      let active = await getActiveSession();
      expect(active?.id).toBe(session1.id);

      // Switch to session2
      await setActiveSession(session2.id);
      active = await getActiveSession();
      expect(active?.id).toBe(session2.id);
    });
  });

  describe('constants', () => {
    it('should have correct MAX_SESSIONS value', () => {
      expect(MAX_SESSIONS).toBe(50);
    });

    it('should have correct MAX_MESSAGES_PER_SESSION value', () => {
      expect(MAX_MESSAGES_PER_SESSION).toBe(100);
    });

    it('should have correct PRUNE_COUNT value', () => {
      expect(PRUNE_COUNT).toBe(10);
    });
  });

  describe('cleanupOldSessions', () => {
    it('should delete sessions older than maxAgeDays but keep recent sessions', async () => {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      const sessions = [
        createTestSession({ id: 'session-1', createdAt: now - 15 * oneDayMs }),
        createTestSession({ id: 'session-2', createdAt: now - 12 * oneDayMs }),
        createTestSession({ id: 'session-3', createdAt: now - 8 * oneDayMs }),
        createTestSession({ id: 'session-4', createdAt: now - 5 * oneDayMs }),
        createTestSession({ id: 'session-5', createdAt: now - 1 * oneDayMs }),
      ];
      
      await fakeBrowser.storage.local.set({ chatSessions: sessions });
      
      const deletedCount = await cleanupOldSessions(10);
      
      expect(deletedCount).toBe(2);
      
      const remainingSessions = await getSessions();
      expect(remainingSessions).toHaveLength(3);
      expect(remainingSessions.some(s => s.id === 'session-1')).toBe(false);
      expect(remainingSessions.some(s => s.id === 'session-2')).toBe(false);
      expect(remainingSessions.some(s => s.id === 'session-3')).toBe(true);
      expect(remainingSessions.some(s => s.id === 'session-4')).toBe(true);
      expect(remainingSessions.some(s => s.id === 'session-5')).toBe(true);
    });

    it('should preserve active session even if it is older than maxAgeDays', async () => {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      const sessions = [
        createTestSession({ id: 'old-active', createdAt: now - 20 * oneDayMs }),
        createTestSession({ id: 'old-inactive', createdAt: now - 15 * oneDayMs }),
        createTestSession({ id: 'recent', createdAt: now - 2 * oneDayMs }),
      ];
      
      await fakeBrowser.storage.local.set({ 
        chatSessions: sessions,
        activeChatSessionId: 'old-active'
      });
      
      const deletedCount = await cleanupOldSessions(10);
      
      expect(deletedCount).toBe(1);
      
      const remainingSessions = await getSessions();
      expect(remainingSessions).toHaveLength(2);
      expect(remainingSessions.some(s => s.id === 'old-active')).toBe(true);
      expect(remainingSessions.some(s => s.id === 'old-inactive')).toBe(false);
      expect(remainingSessions.some(s => s.id === 'recent')).toBe(true);
    });

    it('should handle empty sessions array without error', async () => {
      await fakeBrowser.storage.local.set({ chatSessions: [] });
      
      const deletedCount = await cleanupOldSessions(10);
      
      expect(deletedCount).toBe(0);
      
      const sessions = await getSessions();
      expect(sessions).toHaveLength(0);
    });

    it('should delete all expired sessions except active when all are expired', async () => {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      const sessions = [
        createTestSession({ id: 'expired-1', createdAt: now - 20 * oneDayMs }),
        createTestSession({ id: 'expired-2', createdAt: now - 18 * oneDayMs }),
        createTestSession({ id: 'expired-active', createdAt: now - 15 * oneDayMs }),
        createTestSession({ id: 'expired-3', createdAt: now - 12 * oneDayMs }),
      ];
      
      await fakeBrowser.storage.local.set({ 
        chatSessions: sessions,
        activeChatSessionId: 'expired-active'
      });
      
      const deletedCount = await cleanupOldSessions(10);
      
      expect(deletedCount).toBe(3);
      
      const remainingSessions = await getSessions();
      expect(remainingSessions).toHaveLength(1);
      expect(remainingSessions[0].id).toBe('expired-active');
    });

    it('should not delete any sessions when all are within maxAgeDays', async () => {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      const sessions = [
        createTestSession({ id: 'recent-1', createdAt: now - 5 * oneDayMs }),
        createTestSession({ id: 'recent-2', createdAt: now - 3 * oneDayMs }),
        createTestSession({ id: 'recent-3', createdAt: now - 1 * oneDayMs }),
      ];
      
      await fakeBrowser.storage.local.set({ chatSessions: sessions });
      
      const deletedCount = await cleanupOldSessions(10);
      
      expect(deletedCount).toBe(0);
      
      const remainingSessions = await getSessions();
      expect(remainingSessions).toHaveLength(3);
    });
  });
});
