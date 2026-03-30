import { extractContent } from '@/utils/extractor';
import type { MessageRequest, MessageResponse, ExtractedContent } from '@/utils/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('Content script initialized');

    browser.runtime.onMessage.addListener(
      (
        request: MessageRequest,
        _sender,
        sendResponse: (response: MessageResponse<ExtractedContent>) => void
      ) => {
        if (request.type === 'EXTRACT_CONTENT') {
          try {
            const content = extractContent(document, location.href);

            if (content) {
              sendResponse({ success: true, data: content });
            } else {
              sendResponse({
                success: false,
                error: {
                  code: 'EXTRACTION_FAILED',
                  message: 'Unable to extract article content from this page',
                },
              });
            }
          } catch (error) {
            sendResponse({
              success: false,
              error: {
                code: 'EXTRACTION_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
              },
            });
          }

          return true;
        }
      }
    );
  },
});
