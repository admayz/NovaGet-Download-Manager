'use client';

import { create } from 'zustand';
import { useEffect, useState, useRef } from 'react';

interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
}

interface TranslationStore {
  language: string;
  supportedLanguages: LanguageConfig[];
  isInitialized: boolean;
  setLanguage: (lang: string) => Promise<void>;
  loadLanguage: () => Promise<void>;
  loadSupportedLanguages: () => Promise<void>;
}

// Create Zustand store for i18n state
const useTranslationStore = create<TranslationStore>((set, get) => ({
  language: 'tr',
  supportedLanguages: [],
  isInitialized: false,

  loadLanguage: async () => {
    if (typeof window === 'undefined' || !window.electron) return;

    try {
      const response = await window.electron.i18n.getLanguage();
      if (response.success && response.language) {
        set({ language: response.language, isInitialized: true });
      }
    } catch (error) {
      console.error('Failed to load language:', error);
    }
  },

  loadSupportedLanguages: async () => {
    if (typeof window === 'undefined' || !window.electron) return;

    try {
      const response = await window.electron.i18n.getSupportedLanguages();
      if (response.success && response.languages) {
        set({ supportedLanguages: response.languages });
      }
    } catch (error) {
      console.error('Failed to load supported languages:', error);
    }
  },

  setLanguage: async (lang: string) => {
    if (typeof window === 'undefined' || !window.electron) return;

    try {
      const response = await window.electron.i18n.setLanguage(lang);
      if (response.success) {
        set({ language: lang });
        // Force re-render by updating the state
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to set language:', error);
    }
  },
}));

/**
 * Hook for using translations in React components
 * Provides translation function and language management
 */
export function useTranslation() {
  const { language, supportedLanguages, isInitialized, setLanguage, loadLanguage, loadSupportedLanguages } =
    useTranslationStore();

  // Cache for translations to avoid repeated IPC calls
  const [translationCache, setTranslationCache] = useState<Map<string, string>>(new Map());
  
  // Track if component is mounted to prevent state updates on unmounted components
  const isMountedRef = useRef(false);

  // Set mounted flag and cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load language and supported languages on mount
  useEffect(() => {
    const initializeTranslations = async () => {
      if (!isInitialized) {
        await loadLanguage();
        await loadSupportedLanguages();
      }
    };
    
    initializeTranslations();
  }, [isInitialized, loadLanguage, loadSupportedLanguages]);

  // Load critical translations on mount - only once
  useEffect(() => {
    // Skip if already loaded
    if (translationCache.size > 0) return;
    
    const loadCriticalTranslations = async () => {
      if (typeof window === 'undefined' || !window.electron || !isInitialized) return;

      // Pre-load only critical translations for initial render
      const criticalKeys = [
        'navigation.dashboard',
        'navigation.downloads',
        'navigation.history',
        'navigation.settings',
        'navigation.appName',
        'dashboard.title',
        'dashboard.subtitle',
        'download.title',
        'settings.title',
        'history.title',
        'common.loading',
      ];

      const translations = await Promise.all(
        criticalKeys.map(async (key) => {
          try {
            const response = await window.electron.i18n.translate(key);
            return { key, translation: response.success ? response.translation : key };
          } catch {
            return { key, translation: key };
          }
        })
      );

      const newCache = new Map<string, string>();
      translations.forEach(({ key, translation }) => {
        newCache.set(key, translation);
      });
      setTranslationCache(newCache);
    };

    loadCriticalTranslations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);

  /**
   * Translate a key to the current language
   * Supports nested keys using dot notation (e.g., "common.add")
   * Supports parameter interpolation using {{variable}} format
   */
  const t = (key: string, params?: Record<string, string>): string => {
    // Check if running in browser with electron API
    if (typeof window === 'undefined' || !window.electron) {
      return key;
    }

    // Create cache key including params
    const cacheKey = params ? `${key}:${JSON.stringify(params)}` : key;

    // Check cache first
    if (translationCache.has(cacheKey)) {
      const translation = translationCache.get(cacheKey)!;
      // Apply parameter interpolation if params provided
      if (params) {
        return translation.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
          return params[paramKey] !== undefined ? params[paramKey] : match;
        });
      }
      return translation;
    }

    // Check cache without params
    if (params && translationCache.has(key)) {
      const translation = translationCache.get(key)!;
      return translation.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? params[paramKey] : match;
      });
    }

    // For synchronous usage, we need to return the key immediately
    // and fetch the translation asynchronously
    window.electron.i18n
      .translate(key, params)
      .then((response) => {
        if (response.success && response.translation && isMountedRef.current) {
          // Only update cache if component is still mounted
          setTranslationCache((prev) => {
            const newCache = new Map(prev);
            newCache.set(cacheKey, response.translation);
            return newCache;
          });
        }
      })
      .catch((error: Error) => {
        console.error(`Failed to translate key "${key}":`, error);
      });

    // Return the key as fallback until translation is loaded
    return key;
  };

  /**
   * Async version of translate function
   * Use this when you need to wait for the translation
   */
  const tAsync = async (key: string, params?: Record<string, string>): Promise<string> => {
    if (typeof window === 'undefined' || !window.electron) {
      return key;
    }

    try {
      const response = await window.electron.i18n.translate(key, params);
      if (response.success && response.translation) {
        return response.translation;
      }
      return key;
    } catch (error) {
      console.error(`Failed to translate key "${key}":`, error);
      return key;
    }
  };

  /**
   * Change the current language
   */
  const changeLanguage = async (languageCode: string) => {
    await setLanguage(languageCode);
  };

  /**
   * Get the current language code
   */
  const getCurrentLanguage = (): string => {
    return language;
  };

  /**
   * Get list of supported languages
   */
  const getSupportedLanguages = (): LanguageConfig[] => {
    return supportedLanguages;
  };

  /**
   * Check if a language is supported
   */
  const isLanguageSupported = (languageCode: string): boolean => {
    return supportedLanguages.some((lang) => lang.code === languageCode);
  };

  return {
    t,
    tAsync,
    language,
    changeLanguage,
    getCurrentLanguage,
    getSupportedLanguages,
    isLanguageSupported,
    isInitialized,
  };
}
