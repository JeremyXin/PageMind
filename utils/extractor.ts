import { Readability } from '@mozilla/readability';
import type { ExtractedContent } from './types';

const MIN_CONTENT_LENGTH = 100;

export function extractContent(doc: Document, url: string): ExtractedContent | null {
  const clonedDoc = doc.cloneNode(true) as Document;
  
  const reader = new Readability(clonedDoc);
  const article = reader.parse();

  if (!article) {
    return null;
  }

  const content = article.textContent.trim();

  if (content.length < MIN_CONTENT_LENGTH) {
    return null;
  }

  const lang = doc.documentElement.getAttribute('lang') || undefined;

  return {
    title: article.title,
    content,
    url,
    lang,
  };
}
