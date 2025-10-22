// Clipboard Watcher for Download Manager
// Monitors clipboard for download URLs and notifies the user

import { clipboard, BrowserWindow, Notification } from 'electron';

interface ClipboardWatcherOptions {
  enabled: boolean;
  checkInterval: number; // milliseconds
  minFileSize: number; // bytes
  showNotifications: boolean;
}

export class ClipboardWatcher {
  private mainWindow: BrowserWindow | null = null;
  private lastClipboardContent: string = '';
  private intervalId: NodeJS.Timeout | null = null;
  private options: ClipboardWatcherOptions;

  // File extensions that indicate a download
  private readonly downloadExtensions = [
    '.exe', '.msi', '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2',
    '.iso', '.dmg', '.pkg', '.deb', '.rpm', '.apk', '.ipa',
    '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm',
    '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp',
    '.bin', '.dat', '.img', '.torrent'
  ];

  constructor(mainWindow: BrowserWindow | null, options?: Partial<ClipboardWatcherOptions>) {
    this.mainWindow = mainWindow;
    this.options = {
      enabled: false,
      checkInterval: 2000, // Check every 2 seconds
      minFileSize: 0,
      showNotifications: true,
      ...options
    };
  }

  /**
   * Start monitoring clipboard
   */
  public start(): void {
    if (this.intervalId) {
      console.log('[Clipboard Watcher] Already running');
      return;
    }

    if (!this.options.enabled) {
      console.log('[Clipboard Watcher] Disabled in settings');
      return;
    }

    console.log('[Clipboard Watcher] Starting...');
    this.lastClipboardContent = clipboard.readText();

    this.intervalId = setInterval(() => {
      this.checkClipboard();
    }, this.options.checkInterval);
  }

  /**
   * Stop monitoring clipboard
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[Clipboard Watcher] Stopped');
    }
  }

  /**
   * Update watcher options
   */
  public updateOptions(options: Partial<ClipboardWatcherOptions>): void {
    const wasEnabled = this.options.enabled;
    this.options = { ...this.options, ...options };

    // Restart if enabled state changed
    if (wasEnabled !== this.options.enabled) {
      if (this.options.enabled) {
        this.start();
      } else {
        this.stop();
      }
    }
  }

  /**
   * Check clipboard for download URLs
   */
  private checkClipboard(): void {
    try {
      const currentContent = clipboard.readText();

      // Check if content has changed
      if (currentContent && currentContent !== this.lastClipboardContent) {
        this.lastClipboardContent = currentContent;

        // Check if it's a URL
        if (this.isUrl(currentContent)) {
          // Check if it's a download URL
          if (this.isDownloadUrl(currentContent)) {
            console.log('[Clipboard Watcher] Download URL detected:', currentContent);
            this.handleDownloadUrl(currentContent);
          }
        }
      }
    } catch (error) {
      console.error('[Clipboard Watcher] Error checking clipboard:', error);
    }
  }

  /**
   * Check if string is a valid URL
   */
  private isUrl(text: string): boolean {
    try {
      const url = new URL(text);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Check if URL is a download URL
   */
  private isDownloadUrl(url: string): boolean {
    const urlLower = url.toLowerCase();

    // Check for download file extensions
    for (const ext of this.downloadExtensions) {
      if (urlLower.includes(ext)) {
        return true;
      }
    }

    // Check for common download URL patterns
    const downloadPatterns = [
      '/download/',
      '/downloads/',
      '/files/',
      '/attachments/',
      'download=',
      'attachment=',
      '.php?file=',
      '.aspx?file='
    ];

    for (const pattern of downloadPatterns) {
      if (urlLower.includes(pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Handle detected download URL
   */
  private handleDownloadUrl(url: string): void {
    // Send to main window
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('clipboard-download-detected', {
        url: url,
        timestamp: Date.now()
      });
    }

    // Show notification
    if (this.options.showNotifications && Notification.isSupported()) {
      const notification = new Notification({
        title: 'Download URL Detected',
        body: `Found download URL in clipboard:\n${this.truncateUrl(url)}`,
        icon: undefined, // TODO: Add app icon path
        actions: [
          { type: 'button', text: 'Add Download' }
        ]
      });

      notification.on('click', () => {
        // Focus main window and add download
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.focus();
          this.mainWindow.webContents.send('add-download-from-clipboard', url);
        }
      });

      notification.show();
    }
  }

  /**
   * Truncate URL for display
   */
  private truncateUrl(url: string, maxLength: number = 60): string {
    if (url.length <= maxLength) {
      return url;
    }
    return url.substring(0, maxLength) + '...';
  }

  /**
   * Get current watcher status
   */
  public getStatus(): { enabled: boolean; running: boolean } {
    return {
      enabled: this.options.enabled,
      running: this.intervalId !== null
    };
  }
}

// Export singleton instance
let clipboardWatcher: ClipboardWatcher | null = null;

export function initializeClipboardWatcher(
  mainWindow: BrowserWindow | null,
  options?: Partial<ClipboardWatcherOptions>
): ClipboardWatcher {
  if (!clipboardWatcher) {
    clipboardWatcher = new ClipboardWatcher(mainWindow, options);
  }
  return clipboardWatcher;
}

export function getClipboardWatcher(): ClipboardWatcher | null {
  return clipboardWatcher;
}
