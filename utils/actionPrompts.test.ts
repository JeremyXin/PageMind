import { describe, it, expect } from 'vitest';
import { getActionPrompt } from './actionPrompts';

describe('getActionPrompt', () => {
  const testText = 'This is a sample text for testing';

  it('should return explain prompt for explain action', () => {
    const result = getActionPrompt('explain', testText);
    expect(result).toBe(`Explain the following text in detail:\n\n"${testText}"`);
  });

  it('should return translate prompt for translate action', () => {
    const result = getActionPrompt('translate', testText);
    expect(result).toBe(`Translate the following text to Chinese:\n\n"${testText}"`);
  });

  it('should return rewrite prompt for rewrite action', () => {
    const result = getActionPrompt('rewrite', testText);
    expect(result).toBe(`Rewrite and improve the following text while preserving its meaning:\n\n"${testText}"`);
  });

  it('should handle text with special characters', () => {
    const specialText = 'Text with "quotes" and \n newlines';
    const result = getActionPrompt('explain', specialText);
    expect(result).toBe(`Explain the following text in detail:\n\n"${specialText}"`);
  });

  it('should handle empty text', () => {
    const result = getActionPrompt('translate', '');
    expect(result).toBe('Translate the following text to Chinese:\n\n""');
  });
});
