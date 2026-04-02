import type { ExtractedContent, SummaryResult } from '~/utils/types';

/**
 * Interface for AI provider implementations
 * All providers must implement this interface to be used by the extension
 */
export interface AIProvider {
  /**
   * Summarize the extracted webpage content
   * @param content - The extracted content from the webpage
   * @returns Promise resolving to structured summary result
   */
  summarize(content: ExtractedContent): Promise<SummaryResult>;
}
