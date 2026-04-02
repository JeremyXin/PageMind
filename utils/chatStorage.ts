import type { ChatMessage, ChatSession, SearchResult } from './types';

export const MAX_SESSIONS = 50;
export const MAX_MESSAGES_PER_SESSION = 100;
export const PRUNE_COUNT = 10;

const STORAGE_KEYS = {
  CHAT_SESSIONS: 'chatSessions',
  ACTIVE_CHAT_SESSION_ID: 'activeChatSessionId',
} as const;

async function getSessionsFromStorage(): Promise<ChatSession[]> {
  const result = await browser.storage.local.get(STORAGE_KEYS.CHAT_SESSIONS);
  return (result[STORAGE_KEYS.CHAT_SESSIONS] as ChatSession[] | undefined) ?? [];
}

async function saveSessionsToStorage(sessions: ChatSession[]): Promise<void> {
  await browser.storage.local.set({
    [STORAGE_KEYS.CHAT_SESSIONS]: sessions,
  });
}

async function getActiveSessionIdFromStorage(): Promise<string | null> {
  const result = await browser.storage.local.get(STORAGE_KEYS.ACTIVE_CHAT_SESSION_ID);
  return (result[STORAGE_KEYS.ACTIVE_CHAT_SESSION_ID] as string | undefined) ?? null;
}

async function saveActiveSessionIdToStorage(sessionId: string | null): Promise<void> {
  if (sessionId) {
    await browser.storage.local.set({
      [STORAGE_KEYS.ACTIVE_CHAT_SESSION_ID]: sessionId,
    });
  } else {
    await browser.storage.local.remove(STORAGE_KEYS.ACTIVE_CHAT_SESSION_ID);
  }
}

export async function getSessions(): Promise<ChatSession[]> {
  const sessions = await getSessionsFromStorage();
  return sessions.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getActiveSession(): Promise<ChatSession | null> {
  const activeId = await getActiveSessionIdFromStorage();
  
  if (activeId) {
    const sessions = await getSessionsFromStorage();
    const activeSession = sessions.find(s => s.id === activeId);
    if (activeSession) {
      return activeSession;
    }
  }
  
  const fallbackSession = await createSession();
  await saveActiveSessionIdToStorage(fallbackSession.id);
  return fallbackSession;
}

export async function createSession(
  pageUrl?: string,
  pageTitle?: string
): Promise<ChatSession> {
  const sessions = await getSessionsFromStorage();
  
  const newSession: ChatSession = {
    id: crypto.randomUUID(),
    messages: [],
    createdAt: Date.now(),
    pageUrl,
    pageTitle,
  };
  
  sessions.push(newSession);
  
  if (sessions.length > MAX_SESSIONS) {
    sessions.sort((a, b) => a.createdAt - b.createdAt);
    sessions.splice(0, sessions.length - MAX_SESSIONS);
  }
  
  await saveSessionsToStorage(sessions);
  
  return newSession;
}

export async function addMessage(
  sessionId: string,
  message: Omit<ChatMessage, 'id'>
): Promise<ChatMessage> {
  const sessions = await getSessionsFromStorage();
  const session = sessions.find(s => s.id === sessionId);
  
  if (!session) {
    throw new Error('Session not found');
  }
  
  const newMessage: ChatMessage = {
    ...message,
    id: crypto.randomUUID(),
  };
  
  session.messages.push(newMessage);
  
  if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
    session.messages.splice(0, PRUNE_COUNT);
  }
  
  try {
    await saveSessionsToStorage(sessions);
  } catch (error) {
    throw new Error('Failed to save message. Please try again.');
  }
  
  return newMessage;
}

export async function clearSession(sessionId: string): Promise<void> {
  const sessions = await getSessionsFromStorage();
  const session = sessions.find(s => s.id === sessionId);
  
  if (session) {
    session.messages = [];
    await saveSessionsToStorage(sessions);
  }
}

export async function newSession(
  pageUrl?: string,
  pageTitle?: string
): Promise<ChatSession> {
  const session = await createSession(pageUrl, pageTitle);
  await saveActiveSessionIdToStorage(session.id);
  return session;
}

export async function setActiveSession(sessionId: string): Promise<void> {
  await saveActiveSessionIdToStorage(sessionId);
}

export async function searchMessages(query: string): Promise<SearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  const sessions = await getSessionsFromStorage();
  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  for (const session of sessions) {
    for (let i = 0; i < session.messages.length; i++) {
      const message = session.messages[i];
      if (message.content.toLowerCase().includes(lowerQuery)) {
        results.push({
          sessionId: session.id,
          sessionCreatedAt: session.createdAt,
          message,
          matchIndex: i,
        });
      }
    }
  }

  return results.sort((a, b) => b.message.timestamp - a.message.timestamp);
}

export async function cleanupOldSessions(maxAgeDays: number): Promise<number> {
  const sessions = await getSessionsFromStorage();
  const activeSessionId = await getActiveSessionIdFromStorage();
  
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const cutoffTime = Date.now() - maxAgeMs;
  
  const sessionsToKeep = sessions.filter(session => {
    const isActive = session.id === activeSessionId;
    const isRecent = session.createdAt >= cutoffTime;
    return isActive || isRecent;
  });
  
  const deletedCount = sessions.length - sessionsToKeep.length;
  
  await saveSessionsToStorage(sessionsToKeep);
  
  return deletedCount;
}
