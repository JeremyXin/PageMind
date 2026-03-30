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
  | 'GET_SETTINGS'
  | 'SET_SETTINGS'
  | 'SUMMARY_COMPLETE'
  | 'SUMMARY_ERROR';

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
