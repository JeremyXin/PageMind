import { tool } from 'ai';
import { z } from 'zod';

export interface PageContext {
  url?: string;
  title?: string;
  summary?: string;
  keyPoints?: string[];
}

/**
 * Creates a page analysis tool for Vercel AI SDK.
 * The tool returns pre-extracted page context — no new DOM queries.
 * Always registered (not dependent on provider capabilities).
 */
export function createPageAnalysisTool(pageContext: PageContext | undefined) {
  return tool({
    description: '获取用户当前浏览的网页内容摘要和关键信息。当用户询问关于当前页面的问题时使用此工具。',
    parameters: z.object({}),
    execute: async () => {
      if (!pageContext || !pageContext.url) {
        return { available: false, message: '当前没有可分析的网页内容' };
      }
      return {
        available: true,
        url: pageContext.url,
        title: pageContext.title ?? '',
        summary: pageContext.summary ?? '',
        keyPoints: pageContext.keyPoints ?? [],
      };
    },
  });
}
