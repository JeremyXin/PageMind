/**
 * Core type definitions for the webpage summary extension
 */

/**
 * Represents a viewpoint with a perspective and stance
 */
export interface Viewpoint {
  perspective: string;
  stance: string;
}

/**
 * Result of AI summarization containing structured output
 */
export interface SummaryResult {
  summary: string;
  keyPoints: string[];
  viewpoints: Viewpoint[];
  bestPractices: string[];
}

/**
 * Content extracted from a webpage for summarization
 */
export interface ExtractedContent {
  title: string;
  content: string;
  url: string;
  lang?: string;
}

/**
 * Interface for AI provider implementations
 */
export interface AIProvider {
  summarize(content: ExtractedContent): Promise<SummaryResult>;
}

/**
 * Extension settings configuration
 */
export interface ExtensionSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/**
 * Message types for extension communication
 */
export type MessageType =
  | 'EXTRACT_CONTENT'
  | 'SUMMARIZE'
  | 'EXTRACT_AND_SUMMARIZE'
  | 'TEST_CONNECTION'
  | 'GET_SETTINGS'
  | 'SET_SETTINGS'
  | 'SUMMARY_COMPLETE'
  | 'SUMMARY_ERROR'
  | 'CHAT_SEND'
  | 'CHAT_STREAM_CHUNK'
  | 'CHAT_STREAM_END'
  | 'CHAT_STREAM_ERROR'
  | 'CHAT_CLEAR'
  | 'CHAT_NEW_SESSION'
  | 'TOOLBAR_ACTION'
  | 'TOOLBAR_INLINE_ACTION'
  | 'TOOLBAR_INLINE_RESULT'
  | 'TOOLBAR_INLINE_ERROR'
  | 'TOOLBAR_INLINE_CANCEL';

export interface TestConnectionPayload {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface TestConnectionResult {
  success: boolean;
  errorCode?: 'INVALID_API_KEY' | 'WRONG_URL' | 'NETWORK_ERROR' | 'SERVER_ERROR' | 'UNKNOWN';
  message?: string;
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  code: string;
  message: string;
}

/**
 * Message request structure for extension messaging
 */
export interface MessageRequest<T = unknown> {
  type: MessageType;
  payload?: T;
}

/**
 * Message response structure for extension messaging
 */
export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
}

/**
 * Chat message representing a single message in a conversation
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/**
 * Chat session containing multiple messages and metadata
 */
export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: number;
  pageUrl?: string;
  pageTitle?: string;
}

/**
 * Streaming chunk message for chat responses
 */
export interface ChatStreamChunk {
  type: 'CHAT_STREAM_CHUNK';
  content: string;
}

/**
 * End signal for chat streaming
 */
export interface ChatStreamEnd {
  type: 'CHAT_STREAM_END';
}

/**
 * Error message for chat streaming failures
 */
export interface ChatStreamError {
  type: 'CHAT_STREAM_ERROR';
  error: ErrorResponse;
}

/**
 * Payload for sending a chat message
 */
export interface ChatSendPayload {
  message: string;
  sessionId: string;
  pageContext?: {
    url: string;
    summary: SummaryResult;
  };
}

/**
 * Search result for message search functionality
 */
export interface SearchResult {
  sessionId: string;
  sessionCreatedAt: number;
  message: ChatMessage;
  matchIndex: number;
}

/**
 * Context menu action types
 */
export type ContextMenuActionType = 'explain' | 'translate' | 'rewrite';

/**
 * Message for context menu actions
 */
export interface ContextMenuActionMessage {
  type: 'CONTEXT_MENU_ACTION';
  action: ContextMenuActionType;
  selectedText: string;
  tabId: number;
}

/**
 * Payload for toolbar inline action
 */
export interface ToolbarInlineActionPayload {
  action: ContextMenuActionType;
  selectedText: string;
}

/**
 * Message for toolbar inline action result
 */
export interface ToolbarInlineResultMessage {
  type: 'TOOLBAR_INLINE_RESULT';
  content: string;
  action: ContextMenuActionType;
  model: string;
}

/**
 * Message for toolbar inline action error
 */
export interface ToolbarInlineErrorMessage {
  type: 'TOOLBAR_INLINE_ERROR';
  error: string;
}

/**
 * Message for toolbar inline action cancel
 */
export interface ToolbarInlineCancelMessage {
  type: 'TOOLBAR_INLINE_CANCEL';
}
