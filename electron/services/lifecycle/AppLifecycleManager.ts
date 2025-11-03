import { app } from 'electron';
import { DatabaseService } from '../database/DatabaseService';
import { DownloadManager } from '../download/DownloadManager';
import { WindowManager } from '../window/WindowManager';
import { TrayManager } from '../tray/TrayManager';
import { NotificationManager } from '../notification/NotificationManager';

export interface AppSettings {
  theme: 'light' | 'dark';
  defaultDownloadDirectory: string;
  maxConcurrentDownloads: number;
  segmentsPerDownload: number;
  globalSpeedLimit: number;
  enableClipboardWatching: boolean;
  enableSystemTray: boolean;
  enableNotifications: boolean;
  minimizeToTray: boolean;
  enableAutoCategorization: boolean;
  enableSmartNaming: boolean;
  enableAutoTagging: boolean;
}

export class AppLifecycleManager {
  private db: DatabaseService;
  private downloadManager: DownloadManager;
  private windowManager: WindowManager;
  private trayManager: TrayManager | null = null;
  private notificationManager: NotificationManager | null = null;
  private isShuttingDown: boolean = false;
  private settings: AppSettings | null = null;

  constructor(
    db: DatabaseService,
    downloadManager: DownloadManager,
    windowManager: WindowManager
  ) {
    this.db = db;
    this.downloadManager = downloadManager;
    this.windowManager = windowManager;
  }

  async initialize(): Promise<void> {
    console.log('Initializing app lifecycle manager...');

    // Load settings from database
    await this.loadSettings();

    // Apply settings
    await this.applySettings();

    // Setup app event handlers
    this.setupAppHandlers();

    console.log('App lifecycle manager initialized');
  }

  private async loadSettings(): Promise<void> {
    try {
      const settingsData = await this.db.getAllSettings();

      this.settings = {
        theme: (settingsData.theme as 'light' | 'dark') || 'dark',
        defaultDownloadDirectory:
          settingsData.defaultDownloadDirectory || app.getPath('downloads'),
        maxConcurrentDownloads: parseInt(settingsData.maxConcurrentDownloads || '5'),
        segmentsPerDownload: parseInt(settingsData.segmentsPerDownload || '4'),
        globalSpeedLimit: parseInt(settingsData.globalSpeedLimit || '0'),
        enableClipboardWatching: settingsData.enableClipboardWatching === 'true',
        enableSystemTray: settingsData.enableSystemTray !== 'false', // Default true
        enableNotifications: settingsData.enableNotifications !== 'false', // Default true
        minimizeToTray: settingsData.minimizeToTray === 'true',
        enableAutoCategorization: settingsData.enableAutoCategorization !== 'false',
        enableSmartNaming: settingsData.enableSmartNaming === 'true',
        enableAutoTagging: settingsData.enableAutoTagging === 'true',
      };

      console.log('Settings loaded:', this.settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Use default settings
      this.settings = this.getDefaultSettings();
    }
  }

  private getDefaultSettings(): AppSettings {
    return {
      theme: 'dark',
      defaultDownloadDirectory: app.getPath('downloads'),
      maxConcurrentDownloads: 5,
      segmentsPerDownload: 4,
      globalSpeedLimit: 0,
      enableClipboardWatching: false,
      enableSystemTray: true,
      enableNotifications: true,
      minimizeToTray: false,
      enableAutoCategorization: true,
      enableSmartNaming: false,
      enableAutoTagging: false,
    };
  }

  private async applySettings(): Promise<void> {
    if (!this.settings) return;

    // Apply download manager settings
    this.downloadManager.setMaxConcurrent(this.settings.maxConcurrentDownloads);
    if (this.settings.globalSpeedLimit > 0) {
      this.downloadManager.setGlobalSpeedLimit(this.settings.globalSpeedLimit);
    }

    console.log('Settings applied');
  }

  private setupAppHandlers(): void {
    // Handle app activation (macOS)
    app.on('activate', () => {
      this.windowManager.showMainWindow();
    });

    // Handle before quit
    app.on('before-quit', async (event) => {
      if (!this.isShuttingDown) {
        event.preventDefault();
        await this.gracefulShutdown();
      }
    });

    // Handle window all closed
    app.on('window-all-closed', () => {
      // On macOS, keep app running when all windows are closed
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }

  async gracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) return;

    console.log('Starting graceful shutdown...');
    this.isShuttingDown = true;

    try {
      // Save download state
      await this.saveDownloadState();

      // Pause all active downloads
      console.log('Pausing all downloads...');
      await this.downloadManager.pauseAll();

      // Wait a bit for downloads to pause
      await this.sleep(500);

      // Cleanup download manager
      console.log('Shutting down download manager...');
      await this.downloadManager.shutdown();

      // Cleanup tray
      if (this.trayManager) {
        console.log('Destroying tray...');
        this.trayManager.destroy();
      }

      // Close database
      console.log('Closing database...');
      this.db.close();

      console.log('Graceful shutdown complete');

      // Now actually quit
      app.quit();
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      // Force quit even if there's an error
      app.quit();
    }
  }

  private async saveDownloadState(): Promise<void> {
    try {
      console.log('Saving download state...');

      const downloads = this.downloadManager.getAllDownloads();

      for (const download of downloads) {
        if (download.status === 'downloading' || download.status === 'paused') {
          // Convert SegmentProgress to SegmentRecord
          const segmentRecords = download.segments.map((seg) => ({
            download_id: download.downloadId,
            segment_number: seg.segmentId,
            start_byte: seg.start,
            end_byte: seg.end,
            downloaded_bytes: seg.downloaded,
            status: seg.status,
            temp_file_path: undefined,
          }));

          // Save segment progress
          await this.db.saveSegmentProgress(download.downloadId, segmentRecords);

          // Update download record
          await this.db.updateDownload(download.downloadId, {
            downloaded_bytes: download.downloadedBytes,
            status: 'paused',
          });
        }
      }

      console.log('Download state saved');
    } catch (error) {
      console.error('Failed to save download state:', error);
    }
  }

  async restoreDownloadState(): Promise<void> {
    try {
      console.log('Restoring download state...');

      // Get all paused and queued downloads
      const pausedDownloads = await this.db.getDownloadsByStatus('paused');
      const queuedDownloads = await this.db.getDownloadsByStatus('queued');

      const downloadsToRestore = [...pausedDownloads, ...queuedDownloads];

      console.log(`Found ${downloadsToRestore.length} downloads to restore`);

      // Note: We don't auto-resume downloads on startup
      // User needs to manually resume them
      // This is safer and gives user control

      console.log('Download state restored');
    } catch (error) {
      console.error('Failed to restore download state:', error);
    }
  }

  setTrayManager(trayManager: TrayManager): void {
    this.trayManager = trayManager;
  }

  setNotificationManager(notificationManager: NotificationManager): void {
    this.notificationManager = notificationManager;
  }

  getSettings(): AppSettings | null {
    return this.settings;
  }

  async updateSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<void> {
    if (!this.settings) return;

    this.settings[key] = value;

    // Save to database
    await this.db.setSetting(key, String(value));

    // Apply setting if needed
    await this.applySpecificSetting(key, value);
  }

  private async applySpecificSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<void> {
    switch (key) {
      case 'maxConcurrentDownloads':
        this.downloadManager.setMaxConcurrent(value as number);
        break;
      case 'globalSpeedLimit':
        this.downloadManager.setGlobalSpeedLimit(value as number);
        break;
      case 'enableNotifications':
        if (this.notificationManager) {
          this.notificationManager.setEnabled(value as boolean);
        }
        break;
      // Add more cases as needed
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  isShutdown(): boolean {
    return this.isShuttingDown;
  }
}
