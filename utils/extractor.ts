import { Readability } from '@mozilla/readability';
import type { ExtractedContent, ErrorResponse } from './types';

const MIN_CONTENT_LENGTH = 100;
const UNSUPPORTED_PROTOCOLS = /^(chrome|about|chrome-extension|edge|safari-extension|moz-extension):/i;

export interface ExtractionError {
  error: ErrorResponse;
}

export function extractContent(doc: Document, url: string): ExtractedContent | ExtractionError {
  if (UNSUPPORTED_PROTOCOLS.test(url)) {
    return {
      error: {
        code: 'UNSUPPORTED_PAGE',
        message: '该页面类型不支持摘要（浏览器内部页面）',
      },
    };
  }

  if (doc.readyState === 'loading') {
    return {
      error: {
        code: 'PAGE_LOADING',
        message: '页面仍在加载，请稍后重试',
      },
    };
  }

  const clonedDoc = doc.cloneNode(true) as Document;
  
  const reader = new Readability(clonedDoc);
  const article = reader.parse();

  if (!article) {
    return {
      error: {
        code: 'NO_ARTICLE_CONTENT',
        message: '无法提取文章内容，该页面可能不是文章类型',
      },
    };
  }

  const content = article.textContent.trim();

  if (content.length < MIN_CONTENT_LENGTH) {
    return {
      error: {
        code: 'CONTENT_TOO_SHORT',
        message: `内容过短（${content.length} 字符），无法生成有意义的摘要`,
      },
    };
  }

  const lang = doc.documentElement.getAttribute('lang') || undefined;

  return {
    title: article.title,
    content,
    url,
    lang,
  };
}

export function isExtractionError(result: ExtractedContent | ExtractionError): result is ExtractionError {
  return 'error' in result;
}
