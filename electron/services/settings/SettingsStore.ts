/**
 * Settings Store using electron-store
 * Provides persistent key-value storage for application settings
 */

import Store from 'electron-store';

export interface AppSettings {
  // General settings
  defaultDirectory: string;
  maxConcurrentDownloads: number;
  segmentsPerDownload: number;

  // Speed settings
  enableSpeedLimit: boolean;
  globalSpeedLimit: number;

  // AI settings
  enableAutoCategorization: boolean;
  enableSmartNaming: boolean;
  enableAutoTagging: boolean;

  // Security settings
  virusTotalApiKey: string;
  enableVirusScan: boolean;
  autoScanDownloads: boolean;
  scanBeforeDownload: boolean;
  scanAfterDownload: boolean;

  // Appearance settings
  theme: 'light' | 'dark';
  language: string;

  // Advanced settings
  enableClipboardWatch: boolean;
  enableSystemTray: boolean;
  enableNotifications: boolean;
  notificationSound: boolean;
}

// Get default download directory
import { app } from 'electron';

const DEFAULT_SETTINGS: AppSettings = {
  defaultDirectory: app.getPath('downloads'),
  maxConcurrentDownloads: 5,
  segmentsPerDownload: 4,
  enableSpeedLimit: false,
  globalSpeedLimit: 0,
  enableAutoCategorization: true,
  enableSmartNaming: true,
  enableAutoTagging: true,
  virusTotalApiKey: '',
  enableVirusScan: false,
  autoScanDownloads: true,
  scanBeforeDownload: true,
  scanAfterDownload: true,
  theme: 'light',
  language: 'tr',
  enableClipboardWatch: true,
  enableSystemTray: true,
  enableNotifications: true,
  notificationSound: true,
};

export class SettingsStore {
  private store: Store<AppSettings>;

  constructor() {
    this.store = new Store<AppSettings>({
      name: 'settings',
      defaults: DEFAULT_SETTINGS,
      clearInvalidConfig: true,
    });

    console.log('[SettingsStore] Initialized with electron-store v8');
    console.log('[SettingsStore] Store path:', this.store.path);
  }

  /**
   * Get a setting value
   */
  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.store.get(key);
  }

  /**
   * Set a setting value
   */
  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    console.log(`[SettingsStore] Setting ${String(key)} =`, value);
    this.store.set(key, value);
  }

  /**
   * Get all settings
   */
  getAll(): AppSettings {
    const settings = this.store.store;
    console.log('[SettingsStore] Getting all settings, keys:', Object.keys(settings).length);
    return settings;
  }

  /**
   * Set multiple settings at once
   */
  setAll(settings: Partial<AppSettings>): void {
    console.log('[SettingsStore] Setting multiple settings:', Object.keys(settings).length);
    Object.entries(settings).forEach(([key, value]) => {
      this.store.set(key as keyof AppSettings, value as any);
    });
  }

  /**
   * Reset all settings to defaults
   */
  reset(): void {
    console.log('[SettingsStore] Resetting all settings to defaults');
    this.store.clear();
  }

  /**
   * Check if a setting exists
   */
  has(key: keyof AppSettings): boolean {
    return this.store.has(key);
  }

  /**
   * Delete a setting
   */
  delete(key: keyof AppSettings): void {
    this.store.delete(key);
  }

  /**
   * Get the store file path
   */
  getPath(): string {
    return this.store.path;
  }

  /**
   * Get store size
   */
  getSize(): number {
    return this.store.size;
  }
}
