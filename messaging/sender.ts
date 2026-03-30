import type { MessageRequest, MessageResponse } from '../utils/types';

export async function sendToContentScript<T = unknown>(
  tabId: number,
  message: MessageRequest
): Promise<MessageResponse<T>> {
  return browser.tabs.sendMessage(tabId, message);
}

export async function sendToBackground<T = unknown>(
  message: MessageRequest
): Promise<MessageResponse<T>> {
  return browser.runtime.sendMessage(message);
}
