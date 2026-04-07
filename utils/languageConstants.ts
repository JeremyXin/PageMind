/**
 * Language entry type definition
 */
export interface LanguageEntry {
  code: string;
  label: string;
  nativeName: string;
  englishName: string;
}

/**
 * Array of supported languages with their metadata
 */
export const LANGUAGES: LanguageEntry[] = [
  {
    code: 'zh-CN',
    label: '简体中文',
    nativeName: '简体中文',
    englishName: 'Simplified Chinese',
  },
  {
    code: 'zh-TW',
    label: '繁體中文',
    nativeName: '繁體中文',
    englishName: 'Traditional Chinese',
  },
  {
    code: 'en',
    label: 'English',
    nativeName: 'English',
    englishName: 'English',
  },
  {
    code: 'ja',
    label: '日本語',
    nativeName: '日本語',
    englishName: 'Japanese',
  },
  {
    code: 'ko',
    label: '한국어',
    nativeName: '한국어',
    englishName: 'Korean',
  },
  {
    code: 'fr',
    label: 'Français',
    nativeName: 'Français',
    englishName: 'French',
  },
  {
    code: 'de',
    label: 'Deutsch',
    nativeName: 'Deutsch',
    englishName: 'German',
  },
  {
    code: 'es',
    label: 'Español',
    nativeName: 'Español',
    englishName: 'Spanish',
  },
  {
    code: 'ru',
    label: 'Русский',
    nativeName: 'Русский',
    englishName: 'Russian',
  },
  {
    code: 'pt',
    label: 'Português',
    nativeName: 'Português',
    englishName: 'Portuguese',
  },
  {
    code: 'ar',
    label: 'العربية',
    nativeName: 'العربية',
    englishName: 'Arabic',
  },
  {
    code: 'it',
    label: 'Italiano',
    nativeName: 'Italiano',
    englishName: 'Italian',
  },
];

/**
 * Default target language for translation
 */
export const DEFAULT_TARGET_LANGUAGE = 'zh-CN';

/**
 * Returns the display label for a given language code.
 * Returns the code itself as fallback if not found.
 *
 * @param code - The language code (e.g., 'zh-CN', 'en', 'ja')
 * @returns The label for the language, or the code if not found
 */
export function getLanguageLabel(code: string): string {
  const language = LANGUAGES.find((lang) => lang.code === code);
  return language?.label ?? code;
}

/**
 * Returns the English name for a given language code.
 * Returns the code itself as fallback if not found.
 *
 * @param code - The language code (e.g., 'zh-CN', 'en', 'ja')
 * @returns The English name for the language, or the code if not found
 */
export function getLanguageEnglishName(code: string): string {
  const language = LANGUAGES.find((lang) => lang.code === code);
  return language?.englishName ?? code;
}
