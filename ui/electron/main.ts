import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { initializeNativeMessaging, getNativeMessagingHost } from './nativeMessaging.js';
import { initializeClipboardWatcher, getClipboardWatcher } from './clipboardWatcher.js';
import { createTray, updateTrayMenu, updateTrayTooltip, destroyTray } from './tray.js';
import {
  showNotification,
  showDownloadCompleteNotification,
  showDownloadFailedNotification,
  showDownloadScheduledNotification,
  showDownloadStartedNotification,
} from './notifications.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: any = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle window close - minimize to tray instead
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create system tray
  tray = createTray(mainWindow);
}

app.whenReady().then(() => {
  createWindow();
  
  // Initialize native messaging for browser extension
  initializeNativeMessaging(mainWindow);
  
  // Initialize clipboard watcher (disabled by default)
  const clipboardWatcher = initializeClipboardWatcher(mainWindow, {
    enabled: false, // User must enable in settings
    checkInterval: 2000,
    showNotifications: true
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

let isQuitting = false;

app.on('before-quit', () => {
  isQuitting = true;
  destroyTray();
});

// IPC Handlers
ipcMain.handle('download:start', async (_event, url: string) => {
  // TODO: Implement download start logic
  console.log('Starting download:', url);
  return { success: true, downloadId: 'temp-id' };
});

ipcMain.handle('download:pause', async (_event, downloadId: string) => {
  // TODO: Implement download pause logic
  console.log('Pausing download:', downloadId);
  return { success: true };
});

ipcMain.handle('download:resume', async (_event, downloadId: string) => {
  // TODO: Implement download resume logic
  console.log('Resuming download:', downloadId);
  return { success: true };
});

ipcMain.handle('download:cancel', async (_event, downloadId: string) => {
  // TODO: Implement download cancel logic
  console.log('Canceling download:', downloadId);
  return { success: true };
});

// Native messaging handlers
ipcMain.handle('native-messaging:send', async (_event, message: any) => {
  const host = getNativeMessagingHost();
  if (host) {
    host.sendMessage(message);
    return { success: true };
  }
  return { success: false, error: 'Native messaging not initialized' };
});

ipcMain.handle('native-messaging:download-completed', async (_event, filename: string) => {
  const host = getNativeMessagingHost();
  if (host) {
    host.notifyDownloadCompleted(filename);
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('native-messaging:download-failed', async (_event, filename: string, error: string) => {
  const host = getNativeMessagingHost();
  if (host) {
    host.notifyDownloadFailed(filename, error);
    return { success: true };
  }
  return { success: false };
});

// Clipboard watcher handlers
ipcMain.handle('clipboard-watcher:start', async () => {
  const watcher = getClipboardWatcher();
  if (watcher) {
    watcher.start();
    return { success: true };
  }
  return { success: false, error: 'Clipboard watcher not initialized' };
});

ipcMain.handle('clipboard-watcher:stop', async () => {
  const watcher = getClipboardWatcher();
  if (watcher) {
    watcher.stop();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('clipboard-watcher:update-options', async (_event, options: any) => {
  const watcher = getClipboardWatcher();
  if (watcher) {
    watcher.updateOptions(options);
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('clipboard-watcher:get-status', async () => {
  const watcher = getClipboardWatcher();
  if (watcher) {
    return { success: true, status: watcher.getStatus() };
  }
  return { success: false };
});

// Tray handlers
ipcMain.handle('tray:update-stats', async (_event, stats: { activeDownloads: number; totalSpeed: number }) => {
  updateTrayMenu(stats);
  updateTrayTooltip(`Download Manager - ${stats.activeDownloads} active downloads`);
  return { success: true };
});

// Dialog handlers
ipcMain.handle('dialog:select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  
  if (result.canceled) {
    return null;
  }
  
  return result.filePaths[0];
});

ipcMain.handle('shell:open-folder', async (_event, filePath: string) => {
  const { shell } = require('electron');
  const folderPath = path.dirname(filePath);
  shell.showItemInFolder(filePath);
  return { success: true };
});

// Notification handlers
ipcMain.handle('notification:show', async (_event, options: { title: string; body: string; icon?: string; silent?: boolean }) => {
  showNotification(options);
  return { success: true };
});

ipcMain.handle('notification:download-complete', async (_event, filename: string) => {
  showDownloadCompleteNotification(filename);
  return { success: true };
});

ipcMain.handle('notification:download-failed', async (_event, filename: string, error: string) => {
  showDownloadFailedNotification(filename, error);
  return { success: true };
});

ipcMain.handle('notification:download-scheduled', async (_event, filename: string, scheduledTime: string) => {
  showDownloadScheduledNotification(filename, scheduledTime);
  return { success: true };
});

ipcMain.handle('notification:download-started', async (_event, filename: string) => {
  showDownloadStartedNotification(filename);
  return { success: true };
});
