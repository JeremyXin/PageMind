import { describe, it, expect } from 'vitest';
import { formatSummaryAsText } from './formatSummary';
import { SummaryResult } from './types';

describe('formatSummaryAsText', () => {
  it('should format full SummaryResult with all sections', () => {
    const result: SummaryResult = {
      summary: 'This is a test summary of the webpage content.',
      keyPoints: ['First key point', 'Second key point', 'Third key point'],
      viewpoints: [
        { perspective: 'Developer', stance: 'This approach improves code maintainability.' },
        { perspective: 'Manager', stance: 'This increases team productivity.' }
      ],
      bestPractices: ['Use TypeScript for type safety', 'Write tests before implementation']
    };

    const output = formatSummaryAsText(result);

    expect(output).toContain('【摘要】');
    expect(output).toContain('This is a test summary of the webpage content.');
    expect(output).toContain('【重点】');
    expect(output).toContain('• First key point');
    expect(output).toContain('• Second key point');
    expect(output).toContain('• Third key point');
    expect(output).toContain('【观点】');
    expect(output).toContain('Developer: This approach improves code maintainability.');
    expect(output).toContain('Manager: This increases team productivity.');
    expect(output).toContain('【最佳实践】');
    expect(output).toContain('✓ Use TypeScript for type safety');
    expect(output).toContain('✓ Write tests before implementation');
  });

  it('should omit viewpoints and bestPractices sections when empty', () => {
    const result: SummaryResult = {
      summary: 'A simple summary.',
      keyPoints: ['Point one', 'Point two'],
      viewpoints: [],
      bestPractices: []
    };

    const output = formatSummaryAsText(result);

    expect(output).toContain('【摘要】');
    expect(output).toContain('A simple summary.');
    expect(output).toContain('【重点】');
    expect(output).toContain('• Point one');
    expect(output).toContain('• Point two');
    expect(output).not.toContain('【观点】');
    expect(output).not.toContain('【最佳实践】');
  });

  it('should handle result with only summary and no keyPoints', () => {
    const result: SummaryResult = {
      summary: 'Just a summary.',
      keyPoints: [],
      viewpoints: [],
      bestPractices: []
    };

    const output = formatSummaryAsText(result);

    expect(output).toContain('【摘要】');
    expect(output).toContain('Just a summary.');
    expect(output).not.toContain('【重点】');
    expect(output).not.toContain('【观点】');
    expect(output).not.toContain('【最佳实践】');
  });

  it('should handle empty keyPoints array', () => {
    const result: SummaryResult = {
      summary: 'Summary here.',
      keyPoints: [],
      viewpoints: [{ perspective: 'Expert', stance: 'Important insight.' }],
      bestPractices: ['Do this']
    };

    const output = formatSummaryAsText(result);

    expect(output).toContain('【摘要】');
    expect(output).toContain('Summary here.');
    expect(output).not.toContain('【重点】');
    expect(output).toContain('【观点】');
    expect(output).toContain('Expert: Important insight.');
    expect(output).toContain('【最佳实践】');
    expect(output).toContain('✓ Do this');
  });
});
