import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { extractContent, isExtractionError } from './extractor';

describe('extractContent', () => {
  const createCompletedDOM = (html: string, url: string) => {
    const dom = new JSDOM(html, { url });
    Object.defineProperty(dom.window.document, 'readyState', {
      writable: true,
      value: 'complete',
    });
    return dom;
  };

  it('should extract content from valid article DOM', () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Test Article Title</title>
        </head>
        <body>
          <article>
            <h1>Test Article Title</h1>
            <p>This is the first paragraph of the article. It contains meaningful content that should be extracted by Readability.</p>
            <p>This is the second paragraph with more detailed information about the topic. We need enough content to pass the minimum character threshold.</p>
            <p>Third paragraph adds even more context and depth to ensure this is recognized as a proper article.</p>
            <p>Fourth paragraph continues the narrative with substantial information that demonstrates this is real content.</p>
            <p>Fifth paragraph wraps up the article with final thoughts and conclusions about the topic being discussed.</p>
          </article>
        </body>
      </html>
    `;

    const dom = createCompletedDOM(html, 'https://example.com/article');
    const result = extractContent(dom.window.document, 'https://example.com/article');

    expect(isExtractionError(result)).toBe(false);
    if (!isExtractionError(result)) {
      expect(result.title).toBe('Test Article Title');
      expect(result.content).toBeTruthy();
      expect(result.content.length).toBeGreaterThan(100);
      expect(result.url).toBe('https://example.com/article');
      expect(result.lang).toBe('en');
    }
  });

  it('should return UNSUPPORTED_PAGE error for chrome:// URLs', () => {
    const dom = createCompletedDOM('<!DOCTYPE html><html><body></body></html>', 'chrome://settings');
    const result = extractContent(dom.window.document, 'chrome://settings');

    expect(isExtractionError(result)).toBe(true);
    if (isExtractionError(result)) {
      expect(result.error.code).toBe('UNSUPPORTED_PAGE');
      expect(result.error.message).toContain('不支持摘要');
    }
  });

  it('should return UNSUPPORTED_PAGE error for about: URLs', () => {
    const dom = createCompletedDOM('<!DOCTYPE html><html><body></body></html>', 'about:blank');
    const result = extractContent(dom.window.document, 'about:blank');

    expect(isExtractionError(result)).toBe(true);
    if (isExtractionError(result)) {
      expect(result.error.code).toBe('UNSUPPORTED_PAGE');
    }
  });

  it('should return UNSUPPORTED_PAGE error for chrome-extension:// URLs', () => {
    const dom = createCompletedDOM('<!DOCTYPE html><html><body></body></html>', 'chrome-extension://abc123');
    const result = extractContent(dom.window.document, 'chrome-extension://abc123/popup.html');

    expect(isExtractionError(result)).toBe(true);
    if (isExtractionError(result)) {
      expect(result.error.code).toBe('UNSUPPORTED_PAGE');
    }
  });

  it('should return UNSUPPORTED_PAGE error for edge:// URLs', () => {
    const dom = createCompletedDOM('<!DOCTYPE html><html><body></body></html>', 'edge://settings');
    const result = extractContent(dom.window.document, 'edge://settings');

    expect(isExtractionError(result)).toBe(true);
    if (isExtractionError(result)) {
      expect(result.error.code).toBe('UNSUPPORTED_PAGE');
    }
  });

  it('should return PAGE_LOADING error when document is still loading', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'https://example.com' });
    Object.defineProperty(dom.window.document, 'readyState', {
      writable: true,
      value: 'loading',
    });
    const result = extractContent(dom.window.document, 'https://example.com/article');

    expect(isExtractionError(result)).toBe(true);
    if (isExtractionError(result)) {
      expect(result.error.code).toBe('PAGE_LOADING');
      expect(result.error.message).toContain('仍在加载');
    }
  });

  it('should return NO_ARTICLE_CONTENT error for non-article page', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Not an Article</title>
        </head>
        <body>
          <div id="wrapper">
            <nav>Navigation here</nav>
            <div>Some random text</div>
            <footer>Footer content</footer>
          </div>
        </body>
      </html>
    `;

    const dom = createCompletedDOM(html, 'https://example.com/not-article');
    const result = extractContent(dom.window.document, 'https://example.com/not-article');

    expect(isExtractionError(result)).toBe(true);
    if (isExtractionError(result)) {
      expect(['NO_ARTICLE_CONTENT', 'CONTENT_TOO_SHORT']).toContain(result.error.code);
    }
  });

  it('should return CONTENT_TOO_SHORT error for content less than 100 chars', () => {
    const html = `
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <title>Short</title>
        </head>
        <body>
          <article>
            <h1>Title</h1>
            <p>Very short text.</p>
          </article>
        </body>
      </html>
    `;

    const dom = createCompletedDOM(html, 'https://example.com/short');
    const result = extractContent(dom.window.document, 'https://example.com/short');

    expect(isExtractionError(result)).toBe(true);
    if (isExtractionError(result)) {
      expect(result.error.code).toBe('CONTENT_TOO_SHORT');
      expect(result.error.message).toContain('过短');
    }
  });

  it('should handle missing lang attribute gracefully', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>No Lang Article</title>
        </head>
        <body>
          <article>
            <h1>No Lang Article</h1>
            <p>This article has no language attribute but should still be extracted successfully.</p>
            <p>Second paragraph to ensure enough content for extraction and validation purposes.</p>
            <p>Third paragraph continues with more information to meet the character threshold.</p>
            <p>Fourth paragraph adds additional context and depth to the article content.</p>
            <p>Fifth paragraph provides final details to complete the article text properly.</p>
          </article>
        </body>
      </html>
    `;

    const dom = createCompletedDOM(html, 'https://example.com/no-lang');
    const result = extractContent(dom.window.document, 'https://example.com/no-lang');

    expect(isExtractionError(result)).toBe(false);
    if (!isExtractionError(result)) {
      expect(result.lang).toBeUndefined();
    }
  });

  it('should not modify the original document', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Original Document Test</title>
        </head>
        <body>
          <article>
            <h1>Original Content</h1>
            <p>This content should remain unchanged after extraction process runs.</p>
            <p>Second paragraph to ensure we have enough text for Readability extraction.</p>
            <p>Third paragraph adds more content to validate the extraction works properly.</p>
            <p>Fourth paragraph continues the article with substantial information content.</p>
            <p>Fifth paragraph completes the article with sufficient text for validation.</p>
          </article>
        </body>
      </html>
    `;

    const dom = createCompletedDOM(html, 'https://example.com/original');
    const originalBody = dom.window.document.body.innerHTML;

    extractContent(dom.window.document, 'https://example.com/original');

    const afterBody = dom.window.document.body.innerHTML;
    expect(afterBody).toBe(originalBody);
  });
});
