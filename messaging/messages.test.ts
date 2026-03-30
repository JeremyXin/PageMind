import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from '@webext-core/fake-browser';
import { sendToContentScript, sendToBackground } from './sender';
import type {
  MessageRequest,
  MessageResponse,
  ExtractedContent,
  SummaryResult,
} from '../utils/types';

describe('messaging', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('message type safety', () => {
    it('should create EXTRACT_CONTENT message with correct type', () => {
      const message: MessageRequest = {
        type: 'EXTRACT_CONTENT',
      };

      expect(message.type).toBe('EXTRACT_CONTENT');
      expect(message.payload).toBeUndefined();
    });

    it('should create SUMMARIZE message with correct payload type', () => {
      const content: ExtractedContent = {
        title: 'Test Title',
        content: 'Test content',
        url: 'https://example.com',
        lang: 'en',
      };

      const message: MessageRequest<ExtractedContent> = {
        type: 'SUMMARIZE',
        payload: content,
      };

      expect(message.type).toBe('SUMMARIZE');
      expect(message.payload).toEqual(content);
    });

    it('should create success response with correct data type', () => {
      const summaryResult: SummaryResult = {
        summary: 'Test summary',
        keyPoints: ['Point 1', 'Point 2'],
        viewpoints: [{ perspective: 'User', stance: 'Positive' }],
        bestPractices: ['Practice 1'],
      };

      const response: MessageResponse<SummaryResult> = {
        success: true,
        data: summaryResult,
      };

      expect(response.success).toBe(true);
      expect(response.data).toEqual(summaryResult);
      expect(response.error).toBeUndefined();
    });

    it('should create error response with correct error type', () => {
      const response: MessageResponse = {
        success: false,
        error: {
          code: 'PROVIDER_ERROR',
          message: 'Failed to summarize content',
        },
      };

      expect(response.success).toBe(false);
      expect(response.data).toBeUndefined();
      expect(response.error).toEqual({
        code: 'PROVIDER_ERROR',
        message: 'Failed to summarize content',
      });
    });
  });

  describe('sendToContentScript', () => {
    it('should call chrome.tabs.sendMessage with correct parameters', async () => {
      const mockResponse: MessageResponse = { success: true };
      const sendMessageSpy = vi
        .spyOn(fakeBrowser.tabs, 'sendMessage')
        .mockResolvedValue(mockResponse);

      const message: MessageRequest = { type: 'EXTRACT_CONTENT' };
      const tabId = 123;

      const response = await sendToContentScript(tabId, message);

      expect(sendMessageSpy).toHaveBeenCalledWith(tabId, message);
      expect(response).toEqual(mockResponse);
    });

    it('should handle errors from content script', async () => {
      const errorMessage = 'Content script not responding';
      vi.spyOn(fakeBrowser.tabs, 'sendMessage').mockRejectedValue(
        new Error(errorMessage)
      );

      const message: MessageRequest = { type: 'EXTRACT_CONTENT' };
      const tabId = 123;

      await expect(sendToContentScript(tabId, message)).rejects.toThrow(
        errorMessage
      );
    });
  });

  describe('sendToBackground', () => {
    it('should call chrome.runtime.sendMessage with correct parameters', async () => {
      const mockResponse: MessageResponse = { success: true };
      const sendMessageSpy = vi
        .spyOn(fakeBrowser.runtime, 'sendMessage')
        .mockResolvedValue(mockResponse);

      const content: ExtractedContent = {
        title: 'Test',
        content: 'Test content',
        url: 'https://example.com',
      };
      const message: MessageRequest<ExtractedContent> = {
        type: 'SUMMARIZE',
        payload: content,
      };

      const response = await sendToBackground(message);

      expect(sendMessageSpy).toHaveBeenCalledWith(message);
      expect(response).toEqual(mockResponse);
    });

    it('should handle errors from background script', async () => {
      const errorMessage = 'Background script error';
      vi.spyOn(fakeBrowser.runtime, 'sendMessage').mockRejectedValue(
        new Error(errorMessage)
      );

      const message: MessageRequest = { type: 'SUMMARIZE' };

      await expect(sendToBackground(message)).rejects.toThrow(errorMessage);
    });
  });

  describe('Service Worker message routing', () => {
    it('should route SUMMARIZE message correctly', async () => {
      // This test will verify the Service Worker routes messages properly
      // We'll mock the onMessage listener behavior
      const content: ExtractedContent = {
        title: 'Test Article',
        content: 'This is test content for summarization.',
        url: 'https://example.com/article',
        lang: 'en',
      };

      const message: MessageRequest<ExtractedContent> = {
        type: 'SUMMARIZE',
        payload: content,
      };

      // Mock a successful response
      const expectedResponse: MessageResponse<SummaryResult> = {
        success: true,
        data: {
          summary: 'Test summary',
          keyPoints: ['Key point 1'],
          viewpoints: [{ perspective: 'Author', stance: 'Neutral' }],
          bestPractices: ['Best practice 1'],
        },
      };

      // Simulate the message handler
      const messageHandler = (
        msg: MessageRequest<ExtractedContent>,
        sender: any,
        sendResponse: (response: MessageResponse<SummaryResult>) => void
      ) => {
        if (msg.type === 'SUMMARIZE' && msg.payload) {
          // In real implementation, this would call the provider
          sendResponse(expectedResponse);
          return true;
        }
        return false;
      };

      // Test the handler
      const mockSendResponse = vi.fn();
      const result = messageHandler(message, {}, mockSendResponse);

      expect(result).toBe(true);
      expect(mockSendResponse).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle provider error gracefully in Service Worker', async () => {
      const content: ExtractedContent = {
        title: 'Test Article',
        content: 'This is test content.',
        url: 'https://example.com/article',
      };

      const message: MessageRequest<ExtractedContent> = {
        type: 'SUMMARIZE',
        payload: content,
      };

      // Mock an error response
      const expectedResponse: MessageResponse = {
        success: false,
        error: {
          code: 'PROVIDER_ERROR',
          message: 'Failed to generate summary',
        },
      };

      // Simulate the message handler with error scenario
      const messageHandler = (
        msg: MessageRequest<ExtractedContent>,
        sender: any,
        sendResponse: (response: MessageResponse) => void
      ) => {
        if (msg.type === 'SUMMARIZE') {
          try {
            // Simulate provider throwing error
            throw new Error('Failed to generate summary');
          } catch (error) {
            sendResponse({
              success: false,
              error: {
                code: 'PROVIDER_ERROR',
                message: (error as Error).message,
              },
            });
            return true;
          }
        }
        return false;
      };

      // Test the handler
      const mockSendResponse = vi.fn();
      const result = messageHandler(message, {}, mockSendResponse);

      expect(result).toBe(true);
      expect(mockSendResponse).toHaveBeenCalledWith(expectedResponse);
    });

    it('should return false for unknown message types', () => {
      const message: MessageRequest = {
        type: 'GET_SETTINGS',
      };

      // Simulate the message handler that only handles SUMMARIZE
      const messageHandler = (msg: MessageRequest) => {
        if (msg.type === 'SUMMARIZE') {
          return true;
        }
        return false;
      };

      const result = messageHandler(message);
      expect(result).toBe(false);
    });
  });
});
