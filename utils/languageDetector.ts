/**
 * Detects the language of a given text based on Unicode character ranges.
 * Returns the dominant script's language code.
 *
 * Detection priority (by Unicode ranges):
 * - Hiragana (\u3040-\u309F) or Katakana (\u30A0-\u30FF) → 'ja' (Japanese)
 * - CJK Unified Ideographs (\u4E00-\u9FFF) → 'zh-CN' (Chinese)
 * - Hangul (\uAC00-\uD7AF, \u1100-\u11FF) → 'ko' (Korean)
 * - Cyrillic (\u0400-\u04FF) → 'ru' (Russian)
 * - Arabic (\u0600-\u06FF) → 'ar' (Arabic)
 * - Latin (\u0041-\u007A, \u00C0-\u024F) → 'en' (English/Latin default)
 *
 * Edge cases: empty string, whitespace-only, numbers-only, emoji-only → 'en'
 */
export function detectLanguage(text: string): string {
  if (!text || text.length === 0) {
    return 'en';
  }

  const counts: Record<string, number> = {
    cjk: 0,
    hiragana: 0,
    katakana: 0,
    hangul: 0,
    cyrillic: 0,
    arabic: 0,
    latin: 0,
  };

  for (const char of text) {
    const code = char.charCodeAt(0);

    if (code >= 0x3040 && code <= 0x309f) {
      counts.hiragana++;
    } else if (code >= 0x30a0 && code <= 0x30ff) {
      counts.katakana++;
    } else if (code >= 0x4e00 && code <= 0x9fff) {
      counts.cjk++;
    } else if ((code >= 0xac00 && code <= 0xd7af) || (code >= 0x1100 && code <= 0x11ff)) {
      counts.hangul++;
    } else if (code >= 0x0400 && code <= 0x04ff) {
      counts.cyrillic++;
    } else if (code >= 0x0600 && code <= 0x06ff) {
      counts.arabic++;
    } else if ((code >= 0x0041 && code <= 0x007a) || (code >= 0x00c0 && code <= 0x024f)) {
      counts.latin++;
    }
  }

  const japaneseCount = counts.hiragana + counts.katakana;

  if (japaneseCount > 0) {
    return 'ja';
  }

  let maxCount = 0;
  let dominantScript = 'latin';

  for (const [script, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantScript = script;
    }
  }

  switch (dominantScript) {
    case 'cjk':
      return 'zh-CN';
    case 'hangul':
      return 'ko';
    case 'cyrillic':
      return 'ru';
    case 'arabic':
      return 'ar';
    case 'latin':
    default:
      return 'en';
  }
}
