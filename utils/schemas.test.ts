import { describe, it, expect } from 'vitest';
import { SummaryResultSchema, ViewpointSchema } from './schemas';
import type { SummaryResult, ExtractedContent, AIProvider, ExtensionSettings, MessageType } from './types';
import { z } from 'zod';

describe('SummaryResultSchema', () => {
  describe('valid data parsing', () => {
    it('should parse valid summary data with all fields', () => {
      const validData = {
        summary: 'This is a test summary of a webpage',
        keyPoints: ['First key point', 'Second key point', 'Third key point'],
        viewpoints: [
          { perspective: 'Author', stance: 'Positive' },
          { perspective: 'Critic', stance: 'Neutral' }
        ],
        bestPractices: ['Practice 1', 'Practice 2']
      };

      const result = SummaryResultSchema.parse(validData);

      expect(result.summary).toBe(validData.summary);
      expect(result.keyPoints).toEqual(validData.keyPoints);
      expect(result.viewpoints).toEqual(validData.viewpoints);
      expect(result.bestPractices).toEqual(validData.bestPractices);
    });

    it('should parse valid summary with empty arrays', () => {
      const validData = {
        summary: 'Simple summary',
        keyPoints: [],
        viewpoints: [],
        bestPractices: []
      };

      const result = SummaryResultSchema.parse(validData);

      expect(result.keyPoints).toEqual([]);
      expect(result.viewpoints).toEqual([]);
      expect(result.bestPractices).toEqual([]);
    });

    it('should parse valid summary with single item arrays', () => {
      const validData = {
        summary: 'Test',
        keyPoints: ['Only one point'],
        viewpoints: [{ perspective: 'User', stance: 'Supportive' }],
        bestPractices: ['One practice']
      };

      const result = SummaryResultSchema.parse(validData);

      expect(result.keyPoints).toHaveLength(1);
      expect(result.viewpoints).toHaveLength(1);
      expect(result.bestPractices).toHaveLength(1);
    });
  });

  describe('invalid data rejection', () => {
    it('should reject when summary is not a string', () => {
      const invalidData = {
        summary: 123,
        keyPoints: ['point'],
        viewpoints: [],
        bestPractices: []
      };

      expect(() => SummaryResultSchema.parse(invalidData)).toThrow(z.ZodError);
    });

    it('should reject when summary is missing', () => {
      const invalidData = {
        keyPoints: ['point'],
        viewpoints: [],
        bestPractices: []
      };

      expect(() => SummaryResultSchema.parse(invalidData)).toThrow(z.ZodError);
    });

    it('should reject when keyPoints is not an array', () => {
      const invalidData = {
        summary: 'Test',
        keyPoints: 'not an array',
        viewpoints: [],
        bestPractices: []
      };

      expect(() => SummaryResultSchema.parse(invalidData)).toThrow(z.ZodError);
    });

    it('should reject when keyPoints contains non-string items', () => {
      const invalidData = {
        summary: 'Test',
        keyPoints: ['valid', 123, 'also valid'],
        viewpoints: [],
        bestPractices: []
      };

      expect(() => SummaryResultSchema.parse(invalidData)).toThrow(z.ZodError);
    });

    it('should reject when viewpoints is not an array', () => {
      const invalidData = {
        summary: 'Test',
        keyPoints: [],
        viewpoints: 'not an array',
        bestPractices: []
      };

      expect(() => SummaryResultSchema.parse(invalidData)).toThrow(z.ZodError);
    });

    it('should reject when viewpoints items are missing required fields', () => {
      const invalidData = {
        summary: 'Test',
        keyPoints: [],
        viewpoints: [{ perspective: 'Author' }], // missing stance
        bestPractices: []
      };

      expect(() => SummaryResultSchema.parse(invalidData)).toThrow(z.ZodError);
    });

    it('should reject when bestPractices is not an array', () => {
      const invalidData = {
        summary: 'Test',
        keyPoints: [],
        viewpoints: [],
        bestPractices: 'not an array'
      };

      expect(() => SummaryResultSchema.parse(invalidData)).toThrow(z.ZodError);
    });

    it('should reject when bestPractices contains non-string items', () => {
      const invalidData = {
        summary: 'Test',
        keyPoints: [],
        viewpoints: [],
        bestPractices: [true, false]
      };

      expect(() => SummaryResultSchema.parse(invalidData)).toThrow(z.ZodError);
    });

    it('should reject empty object', () => {
      expect(() => SummaryResultSchema.parse({})).toThrow(z.ZodError);
    });

    it('should reject null', () => {
      expect(() => SummaryResultSchema.parse(null)).toThrow(z.ZodError);
    });

    it('should reject undefined', () => {
      expect(() => SummaryResultSchema.parse(undefined)).toThrow(z.ZodError);
    });
  });

  describe('type inference', () => {
    it('should have correct TypeScript type inference', () => {
      // This test verifies that z.infer produces the correct type
      type InferredType = z.infer<typeof SummaryResultSchema>;
      
      // Type-level check: this should compile without errors
      const testInference: InferredType = {
        summary: 'Test',
        keyPoints: ['point'],
        viewpoints: [{ perspective: 'Test', stance: 'Neutral' }],
        bestPractices: ['practice']
      };

      expect(testInference.summary).toBe('Test');
    });
  });
});

describe('ViewpointSchema', () => {
  it('should parse valid viewpoint', () => {
    const validViewpoint = {
      perspective: 'Expert',
      stance: 'Critical'
    };

    const result = ViewpointSchema.parse(validViewpoint);

    expect(result.perspective).toBe('Expert');
    expect(result.stance).toBe('Critical');
  });

  it('should reject when perspective is missing', () => {
    expect(() => ViewpointSchema.parse({ stance: 'Positive' })).toThrow(z.ZodError);
  });

  it('should reject when stance is missing', () => {
    expect(() => ViewpointSchema.parse({ perspective: 'User' })).toThrow(z.ZodError);
  });

  it('should reject non-string values', () => {
    expect(() => ViewpointSchema.parse({ perspective: 123, stance: true })).toThrow(z.ZodError);
  });
});

describe('Type definitions', () => {
  it('SummaryResult type should match schema structure', () => {
    const validResult: SummaryResult = {
      summary: 'Test summary',
      keyPoints: ['Point 1', 'Point 2'],
      viewpoints: [
        { perspective: 'Developer', stance: 'Supportive' }
      ],
      bestPractices: ['Best practice 1']
    };

    expect(validResult.summary).toBe('Test summary');
    expect(validResult.keyPoints).toHaveLength(2);
  });

  it('ExtractedContent type should have required fields', () => {
    const content: ExtractedContent = {
      title: 'Test Title',
      content: 'Test content body',
      url: 'https://example.com/article'
    };

    expect(content.title).toBe('Test Title');
    expect(content.content).toBe('Test content body');
    expect(content.url).toBe('https://example.com/article');
    expect(content.lang).toBeUndefined();
  });

  it('ExtractedContent type should accept optional lang field', () => {
    const content: ExtractedContent = {
      title: 'Test',
      content: 'Content',
      url: 'https://example.com',
      lang: 'zh-CN'
    };

    expect(content.lang).toBe('zh-CN');
  });

  it('ExtensionSettings type should have required fields', () => {
    const settings: ExtensionSettings = {
      apiKey: 'sk-test123',
      baseUrl: 'https://api.openai.com',
      model: 'gpt-4'
    };

    expect(settings.apiKey).toBe('sk-test123');
    expect(settings.baseUrl).toBe('https://api.openai.com');
    expect(settings.model).toBe('gpt-4');
  });

  it('MessageType enum should have expected values', () => {
    // Since MessageType is a const object, we can check its values
    const extractContent: MessageType = 'EXTRACT_CONTENT';
    const summarize: MessageType = 'SUMMARIZE';
    const getSettings: MessageType = 'GET_SETTINGS';

    expect(extractContent).toBe('EXTRACT_CONTENT');
    expect(summarize).toBe('SUMMARIZE');
    expect(getSettings).toBe('GET_SETTINGS');
  });

  it('AIProvider interface should be implementable', async () => {
    const mockProvider: AIProvider = {
      async summarize(content: ExtractedContent): Promise<SummaryResult> {
        return {
          summary: `Summary of: ${content.title}`,
          keyPoints: ['Point 1'],
          viewpoints: [],
          bestPractices: []
        };
      }
    };

    const result = await mockProvider.summarize({
      title: 'Test',
      content: 'Content',
      url: 'https://example.com'
    });

    expect(result.summary).toBe('Summary of: Test');
  });
});
