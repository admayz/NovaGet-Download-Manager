import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  download: {
    start: (url: string) => ipcRenderer.invoke('download:start', url),
    pause: (downloadId: string) => ipcRenderer.invoke('download:pause', downloadId),
    resume: (downloadId: string) => ipcRenderer.invoke('download:resume', downloadId),
    cancel: (downloadId: string) => ipcRenderer.invoke('download:cancel', downloadId),
  },
  nativeMessaging: {
    send: (message: any) => ipcRenderer.invoke('native-messaging:send', message),
    notifyDownloadCompleted: (filename: string) => 
      ipcRenderer.invoke('native-messaging:download-completed', filename),
    notifyDownloadFailed: (filename: string, error: string) => 
      ipcRenderer.invoke('native-messaging:download-failed', filename, error),
    onBrowserDownloadRequest: (callback: (data: any) => void) => {
      ipcRenderer.on('browser-download-request', (_event, data) => callback(data));
    },
  },
  clipboardWatcher: {
    start: () => ipcRenderer.invoke('clipboard-watcher:start'),
    stop: () => ipcRenderer.invoke('clipboard-watcher:stop'),
    updateOptions: (options: any) => ipcRenderer.invoke('clipboard-watcher:update-options', options),
    getStatus: () => ipcRenderer.invoke('clipboard-watcher:get-status'),
    onDownloadDetected: (callback: (data: any) => void) => {
      ipcRenderer.on('clipboard-download-detected', (_event, data) => callback(data));
    },
    onAddDownloadFromClipboard: (callback: (url: string) => void) => {
      ipcRenderer.on('add-download-from-clipboard', (_event, url) => callback(url));
    },
  },
  tray: {
    updateStats: (stats: { activeDownloads: number; totalSpeed: number }) => 
      ipcRenderer.invoke('tray:update-stats', stats),
    onPauseAll: (callback: () => void) => {
      ipcRenderer.on('tray:pause-all', () => callback());
    },
    onResumeAll: (callback: () => void) => {
      ipcRenderer.on('tray:resume-all', () => callback());
    },
  },
  dialog: {
    selectFolder: () => ipcRenderer.invoke('dialog:select-folder'),
  },
  shell: {
    openFolder: (filePath: string) => ipcRenderer.invoke('shell:open-folder', filePath),
  },
  notification: {
    show: (options: { title: string; body: string; icon?: string; silent?: boolean }) => 
      ipcRenderer.invoke('notification:show', options),
    downloadComplete: (filename: string) => 
      ipcRenderer.invoke('notification:download-complete', filename),
    downloadFailed: (filename: string, error: string) => 
      ipcRenderer.invoke('notification:download-failed', filename, error),
    downloadScheduled: (filename: string, scheduledTime: string) => 
      ipcRenderer.invoke('notification:download-scheduled', filename, scheduledTime),
    downloadStarted: (filename: string) => 
      ipcRenderer.invoke('notification:download-started', filename),
  },
});

// Type definitions for the exposed API
export interface ElectronAPI {
  download: {
    start: (url: string) => Promise<{ success: boolean; downloadId: string }>;
    pause: (downloadId: string) => Promise<{ success: boolean }>;
    resume: (downloadId: string) => Promise<{ success: boolean }>;
    cancel: (downloadId: string) => Promise<{ success: boolean }>;
  };
  nativeMessaging: {
    send: (message: any) => Promise<{ success: boolean; error?: string }>;
    notifyDownloadCompleted: (filename: string) => Promise<{ success: boolean }>;
    notifyDownloadFailed: (filename: string, error: string) => Promise<{ success: boolean }>;
    onBrowserDownloadRequest: (callback: (data: any) => void) => void;
  };
  clipboardWatcher: {
    start: () => Promise<{ success: boolean; error?: string }>;
    stop: () => Promise<{ success: boolean }>;
    updateOptions: (options: any) => Promise<{ success: boolean }>;
    getStatus: () => Promise<{ success: boolean; status?: { enabled: boolean; running: boolean } }>;
    onDownloadDetected: (callback: (data: any) => void) => void;
    onAddDownloadFromClipboard: (callback: (url: string) => void) => void;
  };
  tray: {
    updateStats: (stats: { activeDownloads: number; totalSpeed: number }) => Promise<{ success: boolean }>;
    onPauseAll: (callback: () => void) => void;
    onResumeAll: (callback: () => void) => void;
  };
  dialog: {
    selectFolder: () => Promise<string | null>;
  };
  shell: {
    openFolder: (filePath: string) => Promise<{ success: boolean }>;
  };
  notification: {
    show: (options: { title: string; body: string; icon?: string; silent?: boolean }) => Promise<{ success: boolean }>;
    downloadComplete: (filename: string) => Promise<{ success: boolean }>;
    downloadFailed: (filename: string, error: string) => Promise<{ success: boolean }>;
    downloadScheduled: (filename: string, scheduledTime: string) => Promise<{ success: boolean }>;
    downloadStarted: (filename: string) => Promise<{ success: boolean }>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    electron: {
      selectFolder: () => Promise<string | null>;
      openFolder: (filePath: string) => Promise<void>;
    };
  }
}
