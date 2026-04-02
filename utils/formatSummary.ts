import { SummaryResult, Viewpoint } from './types';

/**
 * Formats a SummaryResult as plain text with Chinese section markers.
 * 
 * @param result - The SummaryResult to format
 * @returns Formatted plain text string
 */
export function formatSummaryAsText(result: SummaryResult): string {
  const sections: string[] = [];

  // Always include summary section
  sections.push(`【摘要】\n${result.summary}`);

  // Include keyPoints section if not empty
  if (result.keyPoints.length > 0) {
    const keyPointsText = result.keyPoints.map(kp => `• ${kp}`).join('\n');
    sections.push(`【重点】\n${keyPointsText}`);
  }

  // Include viewpoints section if not empty
  if (result.viewpoints.length > 0) {
    const viewpointsText = result.viewpoints
      .map((vp: Viewpoint) => `${vp.perspective}: ${vp.stance}`)
      .join('\n');
    sections.push(`【观点】\n${viewpointsText}`);
  }

  // Include bestPractices section if not empty
  if (result.bestPractices.length > 0) {
    const practicesText = result.bestPractices.map(bp => `✓ ${bp}`).join('\n');
    sections.push(`【最佳实践】\n${practicesText}`);
  }

  return sections.join('\n\n');
}
