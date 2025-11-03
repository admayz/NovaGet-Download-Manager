import { app, dialog } from 'electron';
import { WindowManager } from './WindowManager';

export class DeepLinkHandler {
  private windowManager: WindowManager;
  private protocol: string = 'novaget';
  private pendingUrl: string | null = null;

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
  }

  setup(): void {
    // Set as default protocol client
    if (process.defaultApp) {
      if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient(this.protocol, process.execPath, [
          path.resolve(process.argv[1]),
        ]);
      }
    } else {
      app.setAsDefaultProtocolClient(this.protocol);
    }

    // Handle deep links on macOS
    app.on('open-url', (event, url) => {
      event.preventDefault();
      this.handleDeepLink(url);
    });

    // Handle deep links on Windows/Linux
    if (process.platform === 'win32' || process.platform === 'linux') {
      // Check if app was opened with a deep link
      const url = process.argv.find((arg) => arg.startsWith(`${this.protocol}://`));
      if (url) {
        this.handleDeepLink(url);
      }
    }

    // Handle second instance (Windows/Linux)
    const gotTheLock = app.requestSingleInstanceLock();

    if (!gotTheLock) {
      app.quit();
    } else {
      app.on('second-instance', (event, commandLine) => {
        // Someone tried to run a second instance, focus our window
        this.windowManager.focusMainWindow();

        // Check for deep link in command line
        const url = commandLine.find((arg) => arg.startsWith(`${this.protocol}://`));
        if (url) {
          this.handleDeepLink(url);
        }
      });
    }
  }

  private handleDeepLink(url: string): void {
    console.log('Deep link received:', url);

    // Parse the URL
    const parsedUrl = this.parseDeepLink(url);
    if (!parsedUrl) {
      console.error('Invalid deep link:', url);
      return;
    }

    // If window is not ready, store the URL for later
    const mainWindow = this.windowManager.getMainWindow();
    if (!mainWindow) {
      this.pendingUrl = url;
      return;
    }

    // Focus the window
    this.windowManager.focusMainWindow();

    // Send the deep link to the renderer process
    mainWindow.webContents.send('deep-link', parsedUrl);
  }

  private parseDeepLink(url: string): DeepLinkData | null {
    try {
      const urlObj = new URL(url);

      if (urlObj.protocol !== `${this.protocol}:`) {
        return null;
      }

      const action = urlObj.hostname;
      const params: Record<string, string> = {};

      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      return {
        action,
        params,
        rawUrl: url,
      };
    } catch (error) {
      console.error('Failed to parse deep link:', error);
      return null;
    }
  }

  processPendingUrl(): void {
    if (this.pendingUrl) {
      this.handleDeepLink(this.pendingUrl);
      this.pendingUrl = null;
    }
  }

  // Example deep link formats:
  // novaget://download?url=https://example.com/file.zip
  // novaget://add?url=https://example.com/file.zip&filename=myfile.zip
  async handleDownloadDeepLink(downloadUrl: string, filename?: string): Promise<void> {
    const mainWindow = this.windowManager.getMainWindow();
    if (!mainWindow) return;

    // Show confirmation dialog
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Download', 'Cancel'],
      defaultId: 0,
      title: 'Add Download',
      message: 'Do you want to download this file?',
      detail: `URL: ${downloadUrl}${filename ? `\nFilename: ${filename}` : ''}`,
    });

    if (result.response === 0) {
      // User clicked "Download"
      mainWindow.webContents.send('deep-link-download', {
        url: downloadUrl,
        filename,
      });
    }
  }
}

export interface DeepLinkData {
  action: string;
  params: Record<string, string>;
  rawUrl: string;
}

// Import path module
import * as path from 'path';
