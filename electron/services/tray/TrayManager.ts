import { Tray, Menu, nativeImage, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { WindowManager } from '../window/WindowManager';
import { DownloadManager } from '../download/DownloadManager';

export class TrayManager {
  private tray: Tray | null = null;
  private windowManager: WindowManager;
  private downloadManager: DownloadManager;
  private activeDownloadsCount: number = 0;
  private totalSpeed: number = 0;

  constructor(windowManager: WindowManager, downloadManager: DownloadManager) {
    this.windowManager = windowManager;
    this.downloadManager = downloadManager;
  }

  create(): void {
    const iconPath = this.getTrayIcon();
    if (!iconPath) {
      console.error('Tray icon not found');
      return;
    }

    const icon = nativeImage.createFromPath(iconPath);
    this.tray = new Tray(icon.resize({ width: 16, height: 16 }));

    this.tray.setToolTip('NovaGet - Download Manager');
    this.updateContextMenu();

    // Handle tray click
    this.tray.on('click', () => {
      this.windowManager.showMainWindow();
    });

    // Handle double click
    this.tray.on('double-click', () => {
      this.windowManager.showMainWindow();
    });
  }

  private getTrayIcon(): string | null {
    const iconNames = ['tray-icon.png', 'icon.png', 'tray.png'];
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

    return null;
  }

  updateContextMenu(): void {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'NovaGet',
        type: 'normal',
        enabled: false,
      },
      {
        type: 'separator',
      },
      {
        label: this.getStatusLabel(),
        type: 'normal',
        enabled: false,
      },
      {
        type: 'separator',
      },
      {
        label: 'Show Window',
        type: 'normal',
        click: () => {
          this.windowManager.showMainWindow();
        },
      },
      {
        type: 'separator',
      },
      {
        label: 'Pause All Downloads',
        type: 'normal',
        enabled: this.activeDownloadsCount > 0,
        click: async () => {
          await this.downloadManager.pauseAll();
          this.updateContextMenu();
        },
      },
      {
        label: 'Resume All Downloads',
        type: 'normal',
        click: async () => {
          await this.downloadManager.resumeAll();
          this.updateContextMenu();
        },
      },
      {
        type: 'separator',
      },
      {
        label: 'Quit',
        type: 'normal',
        click: () => {
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  private getStatusLabel(): string {
    if (this.activeDownloadsCount === 0) {
      return 'No active downloads';
    }

    const speedText = this.formatSpeed(this.totalSpeed);
    return `${this.activeDownloadsCount} active download${this.activeDownloadsCount > 1 ? 's' : ''} - ${speedText}`;
  }

  private formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond < 1024) {
      return `${bytesPerSecond.toFixed(0)} B/s`;
    } else if (bytesPerSecond < 1024 * 1024) {
      return `${(bytesPerSecond / 1024).toFixed(2)} KB/s`;
    } else if (bytesPerSecond < 1024 * 1024 * 1024) {
      return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`;
    } else {
      return `${(bytesPerSecond / (1024 * 1024 * 1024)).toFixed(2)} GB/s`;
    }
  }

  updateStatus(activeCount: number, totalSpeed: number): void {
    this.activeDownloadsCount = activeCount;
    this.totalSpeed = totalSpeed;

    if (this.tray) {
      this.tray.setToolTip(this.getStatusLabel());
      this.updateContextMenu();
    }
  }

  showBalloon(title: string, content: string): void {
    if (this.tray && process.platform === 'win32') {
      this.tray.displayBalloon({
        title,
        content,
        icon: this.getTrayIcon() || undefined,
      });
    }
  }

  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  isCreated(): boolean {
    return this.tray !== null;
  }
}
