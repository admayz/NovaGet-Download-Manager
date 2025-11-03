import { Notification, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { WindowManager } from '../window/WindowManager';

export interface NotificationOptions {
  title: string;
  body: string;
  silent?: boolean;
  urgency?: 'normal' | 'critical' | 'low';
  actions?: Array<{ type: string; text: string }>;
}

export class NotificationManager {
  private windowManager: WindowManager;
  private notificationsEnabled: boolean = true;

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
  }

  async init(): Promise<void> {
    // Request notification permission on macOS
    if (process.platform === 'darwin') {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.warn('Notification permission denied');
      }
    }
  }

  private async requestPermission(): Promise<boolean> {
    if (process.platform === 'darwin') {
      const permission = await Notification.isSupported();
      return permission;
    }
    return true;
  }

  showDownloadComplete(filename: string, downloadId: string): void {
    if (!this.notificationsEnabled) return;

    const notification = new Notification({
      title: 'Download Complete',
      body: `${filename} has been downloaded successfully`,
      icon: this.getNotificationIcon(),
      silent: false,
      urgency: 'normal',
    });

    notification.on('click', () => {
      this.windowManager.showMainWindow();
      // Send event to renderer to show the completed download
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('notification-click', {
          type: 'download-complete',
          downloadId,
        });
      }
    });

    notification.show();
  }

  showDownloadError(filename: string, error: string, downloadId: string): void {
    if (!this.notificationsEnabled) return;

    const notification = new Notification({
      title: 'Download Failed',
      body: `${filename} failed to download: ${error}`,
      icon: this.getNotificationIcon(),
      silent: false,
      urgency: 'critical',
    });

    notification.on('click', () => {
      this.windowManager.showMainWindow();
      // Send event to renderer to show the failed download
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('notification-click', {
          type: 'download-error',
          downloadId,
        });
      }
    });

    notification.show();
  }

  showAllDownloadsComplete(count: number): void {
    if (!this.notificationsEnabled) return;

    const notification = new Notification({
      title: 'All Downloads Complete',
      body: `${count} download${count > 1 ? 's' : ''} completed successfully`,
      icon: this.getNotificationIcon(),
      silent: false,
      urgency: 'normal',
    });

    notification.on('click', () => {
      this.windowManager.showMainWindow();
    });

    notification.show();
  }

  showDownloadPaused(filename: string): void {
    if (!this.notificationsEnabled) return;

    const notification = new Notification({
      title: 'Download Paused',
      body: `${filename} has been paused`,
      icon: this.getNotificationIcon(),
      silent: true,
      urgency: 'low',
    });

    notification.show();
  }

  showDownloadResumed(filename: string): void {
    if (!this.notificationsEnabled) return;

    const notification = new Notification({
      title: 'Download Resumed',
      body: `${filename} has been resumed`,
      icon: this.getNotificationIcon(),
      silent: true,
      urgency: 'low',
    });

    notification.show();
  }

  showNetworkError(): void {
    if (!this.notificationsEnabled) return;

    const notification = new Notification({
      title: 'Network Error',
      body: 'Network connection lost. Downloads have been paused.',
      icon: this.getNotificationIcon(),
      silent: false,
      urgency: 'critical',
    });

    notification.on('click', () => {
      this.windowManager.showMainWindow();
    });

    notification.show();
  }

  showNetworkRestored(): void {
    if (!this.notificationsEnabled) return;

    const notification = new Notification({
      title: 'Network Restored',
      body: 'Network connection restored. Downloads will resume automatically.',
      icon: this.getNotificationIcon(),
      silent: true,
      urgency: 'normal',
    });

    notification.show();
  }

  showCustomNotification(options: NotificationOptions): void {
    if (!this.notificationsEnabled) return;

    const notification = new Notification({
      title: options.title,
      body: options.body,
      icon: this.getNotificationIcon(),
      silent: options.silent ?? false,
      urgency: options.urgency ?? 'normal',
    });

    notification.on('click', () => {
      this.windowManager.showMainWindow();
    });

    notification.show();
  }

  private getNotificationIcon(): string | undefined {
    const iconNames = ['notification-icon.png', 'icon.png'];
    const possiblePaths = [
      path.join(__dirname, '../../assets'),
      path.join(app.getAppPath(), 'assets'),
      path.join(process.resourcesPath, 'assets'),
    ];

    for (const basePath of possiblePaths) {
      for (const iconName of iconNames) {
        const iconPath = path.join(basePath, iconName);
        if (fs.existsSync(iconPath)) {
          return iconPath;
        }
      }
    }

    return undefined;
  }

  setEnabled(enabled: boolean): void {
    this.notificationsEnabled = enabled;
  }

  isEnabled(): boolean {
    return this.notificationsEnabled;
  }

  isSupported(): boolean {
    return Notification.isSupported();
  }
}
