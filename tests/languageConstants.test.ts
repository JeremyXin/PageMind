import { describe, it, expect } from 'vitest';
import {
  LANGUAGES,
  getLanguageLabel,
  getLanguageEnglishName,
  DEFAULT_TARGET_LANGUAGE,
} from '../utils/languageConstants';

describe('languageConstants', () => {
  describe('LANGUAGES array', () => {
    it('should have exactly 12 entries', () => {
      expect(LANGUAGES).toHaveLength(12);
    });

    it('should have all required fields for each entry', () => {
      LANGUAGES.forEach((lang) => {
        expect(lang).toHaveProperty('code');
        expect(lang).toHaveProperty('label');
        expect(lang).toHaveProperty('nativeName');
        expect(lang).toHaveProperty('englishName');
        expect(typeof lang.code).toBe('string');
        expect(typeof lang.label).toBe('string');
        expect(typeof lang.nativeName).toBe('string');
        expect(typeof lang.englishName).toBe('string');
      });
    });

    it('should include all expected language codes', () => {
      const codes = LANGUAGES.map((l) => l.code);
      expect(codes).toContain('zh-CN');
      expect(codes).toContain('zh-TW');
      expect(codes).toContain('en');
      expect(codes).toContain('ja');
      expect(codes).toContain('ko');
      expect(codes).toContain('fr');
      expect(codes).toContain('de');
      expect(codes).toContain('es');
      expect(codes).toContain('ru');
      expect(codes).toContain('pt');
      expect(codes).toContain('ar');
      expect(codes).toContain('it');
    });
  });

  describe('getLanguageLabel', () => {
    it('should return the label for a known language code', () => {
      expect(getLanguageLabel('ja')).toBe('日本語');
      expect(getLanguageLabel('zh-CN')).toBe('简体中文');
      expect(getLanguageLabel('en')).toBe('English');
    });

    it('should return the code itself as fallback for unknown codes', () => {
      expect(getLanguageLabel('unknown')).toBe('unknown');
      expect(getLanguageLabel('xx-XX')).toBe('xx-XX');
    });
  });

  describe('getLanguageEnglishName', () => {
    it('should return the englishName for a known language code', () => {
      expect(getLanguageEnglishName('zh-CN')).toBe('Simplified Chinese');
      expect(getLanguageEnglishName('en')).toBe('English');
      expect(getLanguageEnglishName('ja')).toBe('Japanese');
    });

    it('should return the code itself as fallback for unknown codes', () => {
      expect(getLanguageEnglishName('unknown')).toBe('unknown');
      expect(getLanguageEnglishName('xx-XX')).toBe('xx-XX');
    });
  });

  describe('DEFAULT_TARGET_LANGUAGE', () => {
    it('should equal zh-CN', () => {
      expect(DEFAULT_TARGET_LANGUAGE).toBe('zh-CN');
    });
  });
});
