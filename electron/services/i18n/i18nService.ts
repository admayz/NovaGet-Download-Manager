/**
 * Internationalization (i18n) Service
 * Handles multi-language support with JSON-based translations
 */

import path from 'path';
import fs from 'fs';
import { app } from 'electron';

interface Translation {
  [key: string]: string | Translation;
}

interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
}

export class i18nService {
  private currentLanguage: string = 'tr';
  private translations: Map<string, Translation> = new Map();
  private fallbackLanguage: string = 'en';
  private localesPath: string;
  private initialized: boolean = false;

  // Supported languages
  private readonly supportedLanguages: LanguageConfig[] = [
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
    { code: 'en', name: 'English', nativeName: 'English' },
  ];

  constructor(localesPath?: string) {
    // Default to locales folder in app resources
    // In development, use the project root locales folder
    // In production, use the dist/locales folder
    if (localesPath) {
      this.localesPath = localesPath;
    } else {
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        // In development, locales are in the project root
        // Use __dirname to get the current file's directory, then navigate to project root
        this.localesPath = path.join(__dirname, '../../../locales');
      } else {
        // In production, locales are in dist/locales (same level as dist folder)
        this.localesPath = path.join(__dirname, '../locales');
      }
    }
  }

  /**
   * Initialize the i18n service by loading available language files
   */
  async initialize(defaultLanguage?: string): Promise<void> {
    if (this.initialized) return;

    try {
      // Load fallback language first
      await this.loadLanguage(this.fallbackLanguage);

      // Load default language if specified and different from fallback
      if (defaultLanguage && defaultLanguage !== this.fallbackLanguage) {
        await this.loadLanguage(defaultLanguage);
        this.currentLanguage = defaultLanguage;
      }

      this.initialized = true;
      console.log(`i18n initialized with language: ${this.currentLanguage}`);
    } catch (error) {
      console.error('Failed to initialize i18n service:', error);
      throw error;
    }
  }

  /**
   * Load a language file from the locales directory
   */
  async loadLanguage(languageCode: string): Promise<void> {
    try {
      const translationPath = path.join(this.localesPath, `${languageCode}.json`);

      // Check if file exists
      if (!fs.existsSync(translationPath)) {
        throw new Error(`Translation file not found: ${translationPath}`);
      }

      // Read and parse the translation file
      const data = fs.readFileSync(translationPath, 'utf-8');
      const translations = JSON.parse(data);

      // Store translations in memory
      this.translations.set(languageCode, translations);

      console.log(`Loaded translations for language: ${languageCode}`);
    } catch (error) {
      console.error(`Failed to load language ${languageCode}:`, error);
      throw error;
    }
  }

  /**
   * Set the current language
   */
  setLanguage(languageCode: string): void {
    if (!this.translations.has(languageCode)) {
      console.warn(
        `Language ${languageCode} not loaded. Loading now...`
      );
      // Try to load the language synchronously
      try {
        const translationPath = path.join(this.localesPath, `${languageCode}.json`);
        const data = fs.readFileSync(translationPath, 'utf-8');
        const translations = JSON.parse(data);
        this.translations.set(languageCode, translations);
      } catch (error) {
        console.error(`Failed to load language ${languageCode}:`, error);
        return;
      }
    }

    this.currentLanguage = languageCode;
    console.log(`Language changed to: ${languageCode}`);
  }

  /**
   * Get the current language code
   */
  getLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Get list of supported languages
   */
  getSupportedLanguages(): LanguageConfig[] {
    return this.supportedLanguages;
  }

  /**
   * Translate a key to the current language
   * Supports nested keys using dot notation (e.g., "common.add")
   * Supports parameter interpolation using {{variable}} format
   */
  translate(key: string, params?: Record<string, string>): string {
    const keys = key.split('.');
    let translation: any = this.translations.get(this.currentLanguage);

    // Navigate through nested keys
    for (const k of keys) {
      if (translation && typeof translation === 'object' && k in translation) {
        translation = translation[k];
      } else {
        // Key not found in current language, try fallback
        translation = this.translations.get(this.fallbackLanguage);

        if (translation) {
          for (const fk of keys) {
            if (translation && typeof translation === 'object' && fk in translation) {
              translation = translation[fk];
            } else {
              // Not found in fallback either, return the key itself
              console.warn(`Translation not found for key: ${key}`);
              return key;
            }
          }
        } else {
          console.warn(`Translation not found for key: ${key}`);
          return key;
        }
        break;
      }
    }

    // If translation is found and is a string, interpolate parameters
    if (typeof translation === 'string') {
      return this.interpolate(translation, params);
    }

    // If translation is not a string (e.g., still an object), return the key
    console.warn(`Translation for key "${key}" is not a string`);
    return key;
  }

  /**
   * Interpolate parameters in a translation string
   * Replaces {{variable}} with the corresponding value from params
   */
  private interpolate(text: string, params?: Record<string, string>): string {
    if (!params) return text;

    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  /**
   * Check if a language is supported
   */
  isLanguageSupported(languageCode: string): boolean {
    return this.supportedLanguages.some((lang) => lang.code === languageCode);
  }

  /**
   * Get available languages (languages that have been loaded)
   */
  getAvailableLanguages(): string[] {
    return Array.from(this.translations.keys());
  }

  /**
   * Reload all loaded languages (useful for hot-reloading during development)
   */
  async reloadLanguages(): Promise<void> {
    const loadedLanguages = this.getAvailableLanguages();

    for (const lang of loadedLanguages) {
      await this.loadLanguage(lang);
    }

    console.log('All languages reloaded');
  }

  /**
   * Clear all loaded translations
   */
  clear(): void {
    this.translations.clear();
    this.initialized = false;
  }
}
