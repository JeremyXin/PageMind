import { extractContent, isExtractionError } from '@/utils/extractor';
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
            const result = extractContent(document, location.href);

            if (isExtractionError(result)) {
              sendResponse({
                success: false,
                error: result.error,
              });
            } else {
              sendResponse({ success: true, data: result });
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
