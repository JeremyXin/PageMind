import { describe, it, expect } from 'vitest';
import { createPageAnalysisTool } from './pageAnalysis';

describe('createPageAnalysisTool', () => {
  it('returns available: false when no page context', async () => {
    const tool = createPageAnalysisTool(undefined);
    const result = await tool.execute({}, { messages: [], toolCallId: '' });
    expect(result.available).toBe(false);
  });

  it('returns page content when context provided', async () => {
    const ctx = { url: 'https://example.com', title: 'Test', summary: 'A test page', keyPoints: ['point1'] };
    const tool = createPageAnalysisTool(ctx);
    const result = await tool.execute({}, { messages: [], toolCallId: '' });
    expect(result.available).toBe(true);
    expect(result.url).toBe('https://example.com');
    expect(result.keyPoints).toEqual(['point1']);
  });

  it('has the correct description for LLM', () => {
    const tool = createPageAnalysisTool(undefined);
    expect(tool.description).toContain('网页');
  });

  it('handles empty context fields gracefully', async () => {
    const tool = createPageAnalysisTool({ url: 'https://example.com' });
    const result = await tool.execute({}, { messages: [], toolCallId: '' });
    expect(result.available).toBe(true);
    expect(result.summary).toBe('');
    expect(result.keyPoints).toEqual([]);
  });
});
