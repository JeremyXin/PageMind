import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { extractContent } from './extractor';

describe('extractContent', () => {
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

    const dom = new JSDOM(html);
    const result = extractContent(dom.window.document, 'https://example.com/article');

    expect(result).not.toBeNull();
    expect(result?.title).toBe('Test Article Title');
    expect(result?.content).toBeTruthy();
    expect(result?.content.length).toBeGreaterThan(100);
    expect(result?.url).toBe('https://example.com/article');
    expect(result?.lang).toBe('en');
  });

  it('should return null for non-article page (Readability fails)', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Not an Article</title>
        </head>
        <body>
          <div>Just a tiny bit of text</div>
        </body>
      </html>
    `;

    const dom = new JSDOM(html);
    const result = extractContent(dom.window.document, 'https://example.com/not-article');

    expect(result).toBeNull();
  });

  it('should return null for too-short content (<100 characters)', () => {
    // Create a minimal article that Readability might parse but content is too short
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

    const dom = new JSDOM(html);
    const result = extractContent(dom.window.document, 'https://example.com/short');

    expect(result).toBeNull();
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

    const dom = new JSDOM(html);
    const result = extractContent(dom.window.document, 'https://example.com/no-lang');

    expect(result).not.toBeNull();
    expect(result?.lang).toBeUndefined();
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

    const dom = new JSDOM(html);
    const originalBody = dom.window.document.body.innerHTML;

    extractContent(dom.window.document, 'https://example.com/original');

    const afterBody = dom.window.document.body.innerHTML;
    expect(afterBody).toBe(originalBody);
  });
});
