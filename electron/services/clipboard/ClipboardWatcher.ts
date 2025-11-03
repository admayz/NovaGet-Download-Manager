/**
 * ClipboardWatcher service for monitoring clipboard and detecting download URLs
 * Implements Requirements: 12.1, 12.2, 12.3, 12.4
 */

import { clipboard, dialog, BrowserWindow } from 'electron';
import { DatabaseService } from '../database/DatabaseService';
import { URLValidator } from '../../utils/urlValidator';

export interface ClipboardWatcherOptions {
  enabled?: boolean;
  pollInterval?: number; // milliseconds
  autoConfirm?: boolean; // Skip confirmation dialog
}

export class ClipboardWatcher {
  private enabled: boolean = false;
  private pollInterval: number = 2000; // 2 seconds (Requirement 12.1)
  private autoConfirm: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastClipboardContent: string = '';
  private db: DatabaseService;
  private onUrlDetected?: (url: string) => void;

  // URL detection regex for HTTP/HTTPS/FTP protocols (Requirement 12.4)
  private readonly URL_REGEX = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;

  constructor(db: DatabaseService, options: ClipboardWatcherOptions = {}) {
    this.db = db;
    this.enabled = options.enabled ?? false;
    this.pollInterval = options.pollInterval ?? 2000;
    this.autoConfirm = options.autoConfirm ?? false;

    // Load settings from database
    this.loadSettings();
  }

  /**
   * Load clipboard watcher settings from database
   */
  private loadSettings(): void {
    try {
      const enabledSetting = this.db.getSetting('clipboard_watching_enabled');
      const autoConfirmSetting = this.db.getSetting('clipboard_auto_confirm');

      if (enabledSetting !== null) {
        this.enabled = enabledSetting === 'true';
      }

      if (autoConfirmSetting !== null) {
        this.autoConfirm = autoConfirmSetting === 'true';
      }
    } catch (error) {
      console.error('Failed to load clipboard watcher settings:', error);
    }
  }

  /**
   * Start watching clipboard
   * Requirement 12.1: Clipboard polling (2 second interval)
   */
  start(): void {
    if (this.intervalId) {
      console.warn('ClipboardWatcher is already running');
      return;
    }

    if (!this.enabled) {
      console.log('ClipboardWatcher is disabled');
      return;
    }

    console.log(`Starting ClipboardWatcher with ${this.pollInterval}ms interval`);
    
    // Initialize with current clipboard content to avoid false detection on start
    this.lastClipboardContent = clipboard.readText();

    // Start polling
    this.intervalId = setInterval(() => {
      this.checkClipboard();
    }, this.pollInterval);
  }

  /**
   * Stop watching clipboard
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('ClipboardWatcher stopped');
    }
  }

  /**
   * Check clipboard for URLs
   * Requirement 12.2: URL detection regex
   */
  private checkClipboard(): void {
    try {
      const currentContent = clipboard.readText();

      // Skip if content hasn't changed
      if (currentContent === this.lastClipboardContent) {
        return;
      }

      this.lastClipboardContent = currentContent;

      // Trim whitespace
      const trimmedContent = currentContent.trim();

      // Check if content is a valid URL
      if (this.isValidDownloadUrl(trimmedContent)) {
        console.log('Valid download URL detected in clipboard:', trimmedContent);
        this.handleDetectedUrl(trimmedContent);
      }
    } catch (error) {
      console.error('Error checking clipboard:', error);
    }
  }

  /**
   * Validate if the string is a valid download URL
   * Requirement 12.4: HTTP/HTTPS/FTP URL validation
   */
  private isValidDownloadUrl(text: string): boolean {
    // Use URLValidator for comprehensive validation
    // First do a quick check
    if (!URLValidator.isLikelyDownloadURL(text)) {
      return false;
    }

    // Then do full validation
    const validation = URLValidator.validate(text);
    return validation.isValid;
  }

  /**
   * Handle detected URL
   * Requirement 12.3: User confirmation dialog
   */
  private async handleDetectedUrl(url: string): Promise<void> {
    try {
      // If auto-confirm is enabled, skip dialog
      if (this.autoConfirm) {
        this.triggerUrlDetected(url);
        return;
      }

      // Show confirmation dialog
      const confirmed = await this.showConfirmationDialog(url);

      if (confirmed) {
        this.triggerUrlDetected(url);
      }
    } catch (error) {
      console.error('Error handling detected URL:', error);
    }
  }

  /**
   * Show user confirmation dialog
   * Requirement 12.3: User confirmation dialog
   */
  private async showConfirmationDialog(url: string): Promise<boolean> {
    const mainWindow = BrowserWindow.getAllWindows()[0];

    if (!mainWindow) {
      console.warn('No main window available for confirmation dialog');
      return false;
    }

    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: 'Download URL Detected',
      message: 'A download URL was detected in your clipboard. Would you like to add it to NovaGet?',
      detail: url,
      buttons: ['Add Download', 'Cancel'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });

    return result.response === 0;
  }

  /**
   * Trigger URL detected callback
   */
  private triggerUrlDetected(url: string): void {
    if (this.onUrlDetected) {
      this.onUrlDetected(url);
    }
  }

  /**
   * Set callback for when URL is detected and confirmed
   */
  setOnUrlDetected(callback: (url: string) => void): void {
    this.onUrlDetected = callback;
  }

  /**
   * Enable clipboard watching
   */
  enable(): void {
    this.enabled = true;
    this.db.setSetting('clipboard_watching_enabled', 'true');
    
    if (!this.intervalId) {
      this.start();
    }
  }

  /**
   * Disable clipboard watching
   */
  disable(): void {
    this.enabled = false;
    this.db.setSetting('clipboard_watching_enabled', 'false');
    this.stop();
  }

  /**
   * Set auto-confirm mode
   */
  setAutoConfirm(enabled: boolean): void {
    this.autoConfirm = enabled;
    this.db.setSetting('clipboard_auto_confirm', enabled ? 'true' : 'false');
  }

  /**
   * Get current status
   */
  getStatus(): {
    enabled: boolean;
    running: boolean;
    autoConfirm: boolean;
    pollInterval: number;
  } {
    return {
      enabled: this.enabled,
      running: this.intervalId !== null,
      autoConfirm: this.autoConfirm,
      pollInterval: this.pollInterval,
    };
  }

  /**
   * Test URL validation (for debugging)
   */
  testUrl(url: string): boolean {
    return this.isValidDownloadUrl(url);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stop();
    this.onUrlDetected = undefined;
  }
}
