import type {
  MessageRequest,
  MessageResponse,
  ExtractedContent,
  SummaryResult,
} from '../utils/types';
import { getSettings } from '../utils/storage';

export default defineBackground(() => {
  console.log('Background script initialized');

  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('Error setting side panel behavior:', error));

  setInterval(() => {
    chrome.runtime.getPlatformInfo().catch(() => {});
  }, 20000);

  chrome.runtime.onMessage.addListener(
    (
      message: MessageRequest,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: MessageResponse) => void
    ) => {
      if (message.type === 'SUMMARIZE') {
        handleSummarizeMessage(message as MessageRequest<ExtractedContent>)
          .then(sendResponse)
          .catch((error) => {
            sendResponse({
              success: false,
              error: {
                code: 'PROVIDER_ERROR',
                message: error.message || 'Unknown error occurred',
              },
            });
          });
        return true;
      }

      return false;
    }
  );
});

async function handleSummarizeMessage(
  message: MessageRequest<ExtractedContent>
): Promise<MessageResponse<SummaryResult>> {
  try {
    const settings = await getSettings();

    if (!settings.apiKey) {
      return {
        success: false,
        error: {
          code: 'NO_API_KEY',
          message: 'API key is not configured',
        },
      };
    }

    const mockResult: SummaryResult = {
      summary: 'Mock summary result',
      keyPoints: ['Mock key point 1', 'Mock key point 2'],
      viewpoints: [{ perspective: 'Mock perspective', stance: 'Mock stance' }],
      bestPractices: ['Mock best practice 1'],
    };

    return {
      success: true,
      data: mockResult,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'PROVIDER_ERROR',
        message: (error as Error).message || 'Failed to generate summary',
      },
    };
  }
}
