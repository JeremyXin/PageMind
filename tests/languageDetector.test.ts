import { describe, it, expect } from 'vitest';
import { detectLanguage } from '../utils/languageDetector';

describe('detectLanguage', () => {
  describe('Chinese (CJK Unified Ideographs)', () => {
    it('should detect simple Chinese text', () => {
      expect(detectLanguage('你好世界')).toBe('zh-CN');
    });

    it('should detect longer Chinese text', () => {
      expect(detectLanguage('这是一段中文测试文本')).toBe('zh-CN');
    });

    it('should detect CJK dominant in mixed text', () => {
      expect(detectLanguage('Hello你好World世界测试文本中文')).toBe('zh-CN');
    });
  });

  describe('Japanese (Hiragana/Katakana)', () => {
    it('should detect Hiragana text', () => {
      expect(detectLanguage('こんにちは世界')).toBe('ja');
    });

    it('should detect pure Katakana text', () => {
      expect(detectLanguage('カタカナテスト')).toBe('ja');
    });

    it('should detect mixed Hiragana and Katakana', () => {
      expect(detectLanguage('こんにちは、テストです')).toBe('ja');
    });

    it('should detect Japanese with CJK characters', () => {
      // Japanese uses some CJK characters but has Hiragana/Katakana
      expect(detectLanguage('日本語テスト')).toBe('ja');
    });
  });

  describe('Korean (Hangul)', () => {
    it('should detect Korean text', () => {
      expect(detectLanguage('안녕하세요')).toBe('ko');
    });

    it('should detect longer Korean text', () => {
      expect(detectLanguage('이것은 한국어 테스트입니다')).toBe('ko');
    });
  });

  describe('Latin/English', () => {
    it('should detect English text', () => {
      expect(detectLanguage('Hello World')).toBe('en');
    });

    it('should detect other Latin-script languages as English', () => {
      // French, Spanish, etc. all map to 'en' as the Latin default
      expect(detectLanguage('Bonjour le monde')).toBe('en');
      expect(detectLanguage('Hola mundo')).toBe('en');
    });

    it('should detect Latin dominant in mixed text', () => {
      expect(detectLanguage('Hello World 你好')).toBe('en');
    });
  });

  describe('Russian (Cyrillic)', () => {
    it('should detect Russian text', () => {
      expect(detectLanguage('Привет мир')).toBe('ru');
    });

    it('should detect longer Russian text', () => {
      expect(detectLanguage('Это тестовый текст на русском языке')).toBe('ru');
    });
  });

  describe('Arabic', () => {
    it('should detect Arabic text', () => {
      expect(detectLanguage('مرحبا بالعالم')).toBe('ar');
    });

    it('should detect longer Arabic text', () => {
      expect(detectLanguage('هذا نص تجريبي باللغة العربية')).toBe('ar');
    });
  });

  describe('Edge cases', () => {
    it('should return en for empty string', () => {
      expect(detectLanguage('')).toBe('en');
    });

    it('should return en for whitespace only', () => {
      expect(detectLanguage('   ')).toBe('en');
    });

    it('should return en for numbers only', () => {
      expect(detectLanguage('12345')).toBe('en');
    });

    it('should return en for emoji only', () => {
      expect(detectLanguage('🎉🎊')).toBe('en');
    });

    it('should return en for special characters only', () => {
      expect(detectLanguage('!@#$%')).toBe('en');
    });

    it('should handle mixed whitespace and text', () => {
      expect(detectLanguage('  你好  ')).toBe('zh-CN');
    });
  });
});
