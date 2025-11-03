import { create } from 'zustand';

export interface AppSettings {
  // General settings
  defaultDirectory: string;
  maxConcurrentDownloads: number;
  segmentsPerDownload: number;

  // Speed settings
  enableSpeedLimit: boolean;
  globalSpeedLimit: number; // bytes per second

  // AI settings
  enableAutoCategorization: boolean;
  enableSmartNaming: boolean;
  enableAutoTagging: boolean;

  // Appearance settings
  theme: 'light' | 'dark';
  language: string;

  // Advanced settings
  enableClipboardWatch: boolean;
  enableSystemTray: boolean;
  enableNotifications: boolean;
  notificationSound: boolean;
}

interface SettingsState extends AppSettings {
  isLoading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  saveSetting: (key: keyof AppSettings, value: any) => Promise<void>;
  saveAllSettings: () => Promise<void>;
  resetToDefaults: () => Promise<void>;
  setHasUnsavedChanges: (value: boolean) => void;

  // Individual setters
  setDefaultDirectory: (directory: string) => void;
  setMaxConcurrentDownloads: (max: number) => void;
  setSegmentsPerDownload: (segments: number) => void;
  setEnableSpeedLimit: (enabled: boolean) => void;
  setGlobalSpeedLimit: (limit: number) => void;
  setEnableAutoCategorization: (enabled: boolean) => void;
  setEnableSmartNaming: (enabled: boolean) => void;
  setEnableAutoTagging: (enabled: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (language: string) => void;
  setEnableClipboardWatch: (enabled: boolean) => void;
  setEnableSystemTray: (enabled: boolean) => void;
  setEnableNotifications: (enabled: boolean) => void;
  setNotificationSound: (enabled: boolean) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultDirectory: '',
  maxConcurrentDownloads: 5,
  segmentsPerDownload: 4,
  enableSpeedLimit: false,
  globalSpeedLimit: 0,
  enableAutoCategorization: true,
  enableSmartNaming: true,
  enableAutoTagging: true,
  theme: 'light',
  language: 'en',
  enableClipboardWatch: true,
  enableSystemTray: true,
  enableNotifications: true,
  notificationSound: true,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isLoading: false,
  error: null,
  hasUnsavedChanges: false,

  loadSettings: async () => {
    try {
      set({ isLoading: true, error: null });

      if (typeof window !== 'undefined' && window.electron) {
        const response = await window.electron.settings.getAll();

        if (response.success && response.settings) {
          const settings = response.settings;

          set({
            defaultDirectory: settings.defaultDirectory || DEFAULT_SETTINGS.defaultDirectory,
            maxConcurrentDownloads: parseInt(settings.maxConcurrentDownloads) || DEFAULT_SETTINGS.maxConcurrentDownloads,
            segmentsPerDownload: parseInt(settings.segmentsPerDownload) || DEFAULT_SETTINGS.segmentsPerDownload,
            enableSpeedLimit: settings.enableSpeedLimit === 'true',
            globalSpeedLimit: parseInt(settings.globalSpeedLimit) || DEFAULT_SETTINGS.globalSpeedLimit,
            enableAutoCategorization: settings.enableAutoCategorization !== 'false',
            enableSmartNaming: settings.enableSmartNaming !== 'false',
            enableAutoTagging: settings.enableAutoTagging !== 'false',
            theme: (settings.theme as 'light' | 'dark') || DEFAULT_SETTINGS.theme,
            language: settings.language || DEFAULT_SETTINGS.language,
            enableClipboardWatch: settings.enableClipboardWatch !== 'false',
            enableSystemTray: settings.enableSystemTray !== 'false',
            enableNotifications: settings.enableNotifications !== 'false',
            notificationSound: settings.notificationSound !== 'false',
            hasUnsavedChanges: false,
          });
        } else {
          set({ error: response.error || 'Failed to load settings' });
        }
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load settings' });
    } finally {
      set({ isLoading: false });
    }
  },

  saveSetting: async (key: keyof AppSettings, value: any) => {
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const stringValue = typeof value === 'boolean' ? value.toString() : String(value);
        const response = await window.electron.settings.set(key, stringValue);

        if (response.success) {
          set({ hasUnsavedChanges: false });

          // Apply special settings immediately
          if (key === 'maxConcurrentDownloads') {
            await window.electron.settings.setMaxConcurrent(Number(value));
          } else if (key === 'globalSpeedLimit' && get().enableSpeedLimit) {
            await window.electron.settings.setGlobalSpeedLimit(Number(value));
          }
        } else {
          set({ error: response.error || 'Failed to save setting' });
        }
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to save setting' });
    }
  },

  saveAllSettings: async () => {
    try {
      set({ isLoading: true, error: null });

      const state = get();
      const settings: Record<string, string> = {
        defaultDirectory: state.defaultDirectory,
        maxConcurrentDownloads: state.maxConcurrentDownloads.toString(),
        segmentsPerDownload: state.segmentsPerDownload.toString(),
        enableSpeedLimit: state.enableSpeedLimit.toString(),
        globalSpeedLimit: state.globalSpeedLimit.toString(),
        enableAutoCategorization: state.enableAutoCategorization.toString(),
        enableSmartNaming: state.enableSmartNaming.toString(),
        enableAutoTagging: state.enableAutoTagging.toString(),
        theme: state.theme,
        language: state.language,
        enableClipboardWatch: state.enableClipboardWatch.toString(),
        enableSystemTray: state.enableSystemTray.toString(),
        enableNotifications: state.enableNotifications.toString(),
        notificationSound: state.notificationSound.toString(),
      };

      if (typeof window !== 'undefined' && window.electron) {
        for (const [key, value] of Object.entries(settings)) {
          const response = await window.electron.settings.set(key, value);
          if (!response.success) {
            throw new Error(`Failed to save ${key}: ${response.error}`);
          }
        }

        // Apply special settings
        await window.electron.settings.setMaxConcurrent(state.maxConcurrentDownloads);
        if (state.enableSpeedLimit) {
          await window.electron.settings.setGlobalSpeedLimit(state.globalSpeedLimit);
        }

        set({ hasUnsavedChanges: false });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to save settings' });
    } finally {
      set({ isLoading: false });
    }
  },

  resetToDefaults: async () => {
    set({ ...DEFAULT_SETTINGS, hasUnsavedChanges: true });
  },

  setHasUnsavedChanges: (value: boolean) => {
    set({ hasUnsavedChanges: value });
  },

  setDefaultDirectory: (directory: string) => {
    set({ defaultDirectory: directory, hasUnsavedChanges: true });
  },

  setMaxConcurrentDownloads: (max: number) => {
    set({ maxConcurrentDownloads: max, hasUnsavedChanges: true });
  },

  setSegmentsPerDownload: (segments: number) => {
    set({ segmentsPerDownload: segments, hasUnsavedChanges: true });
  },

  setEnableSpeedLimit: (enabled: boolean) => {
    set({ enableSpeedLimit: enabled, hasUnsavedChanges: true });
  },

  setGlobalSpeedLimit: (limit: number) => {
    set({ globalSpeedLimit: limit, hasUnsavedChanges: true });
  },

  setEnableAutoCategorization: (enabled: boolean) => {
    set({ enableAutoCategorization: enabled, hasUnsavedChanges: true });
  },

  setEnableSmartNaming: (enabled: boolean) => {
    set({ enableSmartNaming: enabled, hasUnsavedChanges: true });
  },

  setEnableAutoTagging: (enabled: boolean) => {
    set({ enableAutoTagging: enabled, hasUnsavedChanges: true });
  },

  setTheme: (theme: 'light' | 'dark') => {
    set({ theme, hasUnsavedChanges: true });
    // Apply theme immediately to document
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  },

  setLanguage: (language: string) => {
    set({ language, hasUnsavedChanges: true });
  },

  setEnableClipboardWatch: (enabled: boolean) => {
    set({ enableClipboardWatch: enabled, hasUnsavedChanges: true });
  },

  setEnableSystemTray: (enabled: boolean) => {
    set({ enableSystemTray: enabled, hasUnsavedChanges: true });
  },

  setEnableNotifications: (enabled: boolean) => {
    set({ enableNotifications: enabled, hasUnsavedChanges: true });
  },

  setNotificationSound: (enabled: boolean) => {
    set({ notificationSound: enabled, hasUnsavedChanges: true });
  },
}));
