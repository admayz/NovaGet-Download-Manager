import { ipcMain, BrowserWindow, dialog } from 'electron';
import { DownloadManager } from '../download/DownloadManager';
import { DatabaseService } from '../database/DatabaseService';
import { DownloadOptions, DownloadProgress } from '../download/Download';
import { ClipboardWatcher } from '../clipboard/ClipboardWatcher';
import { LoggerService } from '../logger/LoggerService';
import { URLValidator } from '../../utils/urlValidator';
import { PathSanitizer } from '../../utils/pathSanitizer';

/**
 * IPCBridge handles communication between main and renderer processes
 * Registers IPC handlers and emits events to renderer
 */
export class IPCBridge {
  private downloadManager: DownloadManager;
  private db: DatabaseService;
  private clipboardWatcher?: ClipboardWatcher;
  private logger: LoggerService;

  constructor(downloadManager: DownloadManager, db: DatabaseService, clipboardWatcher?: ClipboardWatcher) {
    this.downloadManager = downloadManager;
    this.db = db;
    this.clipboardWatcher = clipboardWatcher;
    this.logger = new LoggerService();
    this.registerHandlers();
    this.setupEventForwarding();
  }

  /**
   * Register all IPC handlers
   */
  private registerHandlers(): void {
    // Download operations
    ipcMain.handle('download:add', async (_event, options: DownloadOptions) => {
      try {
        // Validate inputs before processing
        if (!options || typeof options !== 'object') {
          throw new Error('Invalid download options');
        }

        // Validate URL
        if (!options.url || typeof options.url !== 'string') {
          throw new Error('URL is required and must be a string');
        }

        // Validate directory
        if (!options.directory || typeof options.directory !== 'string') {
          throw new Error('Directory is required and must be a string');
        }

        // Additional validation will be done in DownloadManager
        const downloadId = await this.downloadManager.addDownload(options);
        return { success: true, downloadId };
      } catch (error) {
        const errorMessage = (error as Error).message;
        this.logger.error('IPC:download:add', errorMessage, error);
        return { success: false, error: errorMessage };
      }
    });

    ipcMain.handle('download:pause', async (_event, downloadId: string) => {
      try {
        await this.downloadManager.pauseDownload(downloadId);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('download:resume', async (_event, downloadId: string) => {
      try {
        await this.downloadManager.resumeDownload(downloadId);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('download:cancel', async (_event, downloadId: string) => {
      try {
        await this.downloadManager.cancelDownload(downloadId);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('download:retry', async (_event, downloadId: string) => {
      try {
        await this.downloadManager.retryDownload(downloadId);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('download:getAll', async () => {
      try {
        const downloads = this.downloadManager.getAllDownloads();
        return { success: true, downloads };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('download:getProgress', async (_event, downloadId: string) => {
      try {
        const progress = this.downloadManager.getProgress(downloadId);
        return { success: true, progress };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('download:pauseAll', async () => {
      try {
        await this.downloadManager.pauseAll();
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('download:resumeAll', async () => {
      try {
        await this.downloadManager.resumeAll();
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('download:clearCompleted', async () => {
      try {
        this.downloadManager.clearCompleted();
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('download:setSpeedLimit', async (_event, downloadId: string, bytesPerSecond: number) => {
      try {
        this.downloadManager.setDownloadSpeedLimit(downloadId, bytesPerSecond);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // Settings operations
    ipcMain.handle('settings:get', async (_event, key: string) => {
      try {
        const value = this.db.getSetting(key);
        return { success: true, value };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('settings:set', async (_event, key: string, value: string) => {
      try {
        this.db.setSetting(key, value);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('settings:getAll', async () => {
      try {
        const settings = this.db.getAllSettings();
        return { success: true, settings };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('settings:setMaxConcurrent', async (_event, max: number) => {
      try {
        this.downloadManager.setMaxConcurrent(max);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('settings:setGlobalSpeedLimit', async (_event, bytesPerSecond: number) => {
      try {
        this.downloadManager.setGlobalSpeedLimit(bytesPerSecond);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // Statistics operations
    ipcMain.handle('stats:get', async () => {
      try {
        const stats = this.db.getStatistics();
        return { success: true, stats };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('stats:getByCategory', async () => {
      try {
        const stats = this.db.getStatisticsByCategory();
        return { success: true, stats };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // Database operations
    ipcMain.handle('db:getDownload', async (_event, downloadId: string) => {
      try {
        const download = this.db.getDownload(downloadId);
        return { success: true, download };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('db:getAllDownloads', async () => {
      try {
        const downloads = this.db.getAllDownloads();
        return { success: true, downloads };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('db:getDownloadsByStatus', async (_event, status: string) => {
      try {
        const downloads = this.db.getDownloadsByStatus(status as any);
        return { success: true, downloads };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('db:getDownloadsByCategory', async (_event, category: string) => {
      try {
        const downloads = this.db.getDownloadsByCategory(category);
        return { success: true, downloads };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('db:deleteDownload', async (_event, downloadId: string) => {
      try {
        this.db.deleteDownload(downloadId);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // Clipboard watcher operations
    ipcMain.handle('clipboard:enable', async () => {
      try {
        if (!this.clipboardWatcher) {
          return { success: false, error: 'Clipboard watcher not initialized' };
        }
        this.clipboardWatcher.enable();
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('clipboard:disable', async () => {
      try {
        if (!this.clipboardWatcher) {
          return { success: false, error: 'Clipboard watcher not initialized' };
        }
        this.clipboardWatcher.disable();
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('clipboard:setAutoConfirm', async (_event, enabled: boolean) => {
      try {
        if (!this.clipboardWatcher) {
          return { success: false, error: 'Clipboard watcher not initialized' };
        }
        this.clipboardWatcher.setAutoConfirm(enabled);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('clipboard:getStatus', async () => {
      try {
        if (!this.clipboardWatcher) {
          return { success: false, error: 'Clipboard watcher not initialized' };
        }
        const status = this.clipboardWatcher.getStatus();
        return { success: true, status };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('clipboard:testUrl', async (_event, url: string) => {
      try {
        if (!this.clipboardWatcher) {
          return { success: false, error: 'Clipboard watcher not initialized' };
        }
        const isValid = this.clipboardWatcher.testUrl(url);
        return { success: true, isValid };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // Dialog operations
    ipcMain.handle('dialog:selectDirectory', async () => {
      try {
        const result = await dialog.showOpenDialog({
          properties: ['openDirectory', 'createDirectory'],
          title: 'Select Download Directory',
        });

        if (result.canceled || result.filePaths.length === 0) {
          return { success: false, canceled: true };
        }

        return { success: true, path: result.filePaths[0] };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // Logger operations
    ipcMain.handle('logger:error', async (_event, context: string, data: any) => {
      try {
        this.logger.error(context, data.message || 'Error', data);
      } catch (error) {
        console.error('Failed to log error:', error);
      }
    });

    ipcMain.handle('logger:warn', async (_event, context: string, data: any) => {
      try {
        this.logger.warn(context, data.message || 'Warning', data);
      } catch (error) {
        console.error('Failed to log warning:', error);
      }
    });

    ipcMain.handle('logger:info', async (_event, context: string, data: any) => {
      try {
        this.logger.info(context, data.message || 'Info', data);
      } catch (error) {
        console.error('Failed to log info:', error);
      }
    });
  }

  /**
   * Setup event forwarding from DownloadManager to renderer
   */
  private setupEventForwarding(): void {
    // Progress updates
    this.downloadManager.on('downloadProgress', (progress: DownloadProgress) => {
      this.sendToRenderer('download:progress', progress);
    });

    // Download complete
    this.downloadManager.on('downloadComplete', (progress: DownloadProgress) => {
      this.sendToRenderer('download:complete', progress);
    });

    // Download error
    this.downloadManager.on('downloadError', (data: { downloadId: string; error: Error; progress: DownloadProgress }) => {
      this.sendToRenderer('download:error', {
        downloadId: data.downloadId,
        error: data.error.message,
        progress: data.progress
      });
    });

    // Download added
    this.downloadManager.on('downloadAdded', (downloadId: string) => {
      this.sendToRenderer('download:added', downloadId);
    });

    // Download cancelled
    this.downloadManager.on('downloadCancelled', (downloadId: string) => {
      this.sendToRenderer('download:cancelled', downloadId);
    });

    // Status change
    this.downloadManager.on('downloadStatusChange', (data: { downloadId: string; status: string }) => {
      this.sendToRenderer('download:statusChange', data);
    });

    // Completed cleared
    this.downloadManager.on('completedCleared', (downloadIds: string[]) => {
      this.sendToRenderer('download:completedCleared', downloadIds);
    });
  }

  /**
   * Send event to all renderer windows
   */
  private sendToRenderer(channel: string, data: any): void {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, data);
      }
    });
  }

  /**
   * Cleanup IPC handlers
   */
  cleanup(): void {
    // Remove all handlers
    ipcMain.removeHandler('download:add');
    ipcMain.removeHandler('download:pause');
    ipcMain.removeHandler('download:resume');
    ipcMain.removeHandler('download:cancel');
    ipcMain.removeHandler('download:retry');
    ipcMain.removeHandler('download:getAll');
    ipcMain.removeHandler('download:getProgress');
    ipcMain.removeHandler('download:pauseAll');
    ipcMain.removeHandler('download:resumeAll');
    ipcMain.removeHandler('download:clearCompleted');
    ipcMain.removeHandler('download:setSpeedLimit');
    ipcMain.removeHandler('settings:get');
    ipcMain.removeHandler('settings:set');
    ipcMain.removeHandler('settings:getAll');
    ipcMain.removeHandler('settings:setMaxConcurrent');
    ipcMain.removeHandler('settings:setGlobalSpeedLimit');
    ipcMain.removeHandler('stats:get');
    ipcMain.removeHandler('stats:getByCategory');
    ipcMain.removeHandler('db:getDownload');
    ipcMain.removeHandler('db:getAllDownloads');
    ipcMain.removeHandler('db:getDownloadsByStatus');
    ipcMain.removeHandler('db:getDownloadsByCategory');
    ipcMain.removeHandler('db:deleteDownload');
    ipcMain.removeHandler('clipboard:enable');
    ipcMain.removeHandler('clipboard:disable');
    ipcMain.removeHandler('clipboard:setAutoConfirm');
    ipcMain.removeHandler('clipboard:getStatus');
    ipcMain.removeHandler('clipboard:testUrl');
    ipcMain.removeHandler('dialog:selectDirectory');
    ipcMain.removeHandler('logger:error');
    ipcMain.removeHandler('logger:warn');
    ipcMain.removeHandler('logger:info');
  }
}
