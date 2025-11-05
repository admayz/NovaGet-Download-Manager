import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Type definitions for the exposed API
export interface DownloadOptions {
  url: string;
  filename?: string;
  directory: string;
  segments?: number;
  speedLimit?: number;
  scheduledTime?: Date;
  headers?: Record<string, string>;
}

export interface SegmentProgress {
  segmentId: number;
  start: number;
  end: number;
  downloaded: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
}

export interface DownloadProgress {
  downloadId: string;
  url: string;
  filename: string;
  totalBytes: number;
  downloadedBytes: number;
  speed: number;
  percentage: number;
  remainingTime: number;
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed';
  segments: SegmentProgress[];
  error?: string;
}

export interface DownloadRecord {
  id: string;
  url: string;
  filename: string;
  directory: string;
  total_bytes: number;
  downloaded_bytes: number;
  status: string;
  category?: string;
  tags?: string;
  ai_suggested_name?: string;
  scheduled_time?: number;
  speed_limit?: number;
  created_at: number;
  completed_at?: number;
  error_message?: string;
}

export interface Statistics {
  totalDownloads: number;
  totalBytes: number;
  completedDownloads: number;
  failedDownloads: number;
  averageSpeed: number;
}

export interface IPCResponse<T = any> {
  success: boolean;
  error?: string;
  [key: string]: any;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI = {
  platform: process.platform,

  // Download operations
  download: {
    add: (options: DownloadOptions): Promise<IPCResponse<{ downloadId: string }>> =>
      ipcRenderer.invoke('download:add', options),

    pause: (downloadId: string): Promise<IPCResponse> =>
      ipcRenderer.invoke('download:pause', downloadId),

    resume: (downloadId: string): Promise<IPCResponse> =>
      ipcRenderer.invoke('download:resume', downloadId),

    cancel: (downloadId: string): Promise<IPCResponse> =>
      ipcRenderer.invoke('download:cancel', downloadId),

    retry: (downloadId: string): Promise<IPCResponse> =>
      ipcRenderer.invoke('download:retry', downloadId),

    getAll: (): Promise<IPCResponse<{ downloads: DownloadProgress[] }>> =>
      ipcRenderer.invoke('download:getAll'),

    getProgress: (downloadId: string): Promise<IPCResponse<{ progress: DownloadProgress | null }>> =>
      ipcRenderer.invoke('download:getProgress', downloadId),

    pauseAll: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('download:pauseAll'),

    resumeAll: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('download:resumeAll'),

    clearCompleted: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('download:clearCompleted'),

    setSpeedLimit: (downloadId: string, bytesPerSecond: number): Promise<IPCResponse> =>
      ipcRenderer.invoke('download:setSpeedLimit', downloadId, bytesPerSecond),

    // Event listeners
    onProgress: (callback: (progress: DownloadProgress) => void) => {
      const listener = (_event: IpcRendererEvent, progress: DownloadProgress) => callback(progress);
      ipcRenderer.on('download:progress', listener);
      return () => ipcRenderer.removeListener('download:progress', listener);
    },

    onComplete: (callback: (progress: DownloadProgress) => void) => {
      const listener = (_event: IpcRendererEvent, progress: DownloadProgress) => callback(progress);
      ipcRenderer.on('download:complete', listener);
      return () => ipcRenderer.removeListener('download:complete', listener);
    },

    onError: (callback: (data: { downloadId: string; error: string; progress: DownloadProgress }) => void) => {
      const listener = (_event: IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('download:error', listener);
      return () => ipcRenderer.removeListener('download:error', listener);
    },

    onAdded: (callback: (downloadId: string) => void) => {
      const listener = (_event: IpcRendererEvent, downloadId: string) => callback(downloadId);
      ipcRenderer.on('download:added', listener);
      return () => ipcRenderer.removeListener('download:added', listener);
    },

    onCancelled: (callback: (downloadId: string) => void) => {
      const listener = (_event: IpcRendererEvent, downloadId: string) => callback(downloadId);
      ipcRenderer.on('download:cancelled', listener);
      return () => ipcRenderer.removeListener('download:cancelled', listener);
    },

    onStatusChange: (callback: (data: { downloadId: string; status: string }) => void) => {
      const listener = (_event: IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('download:statusChange', listener);
      return () => ipcRenderer.removeListener('download:statusChange', listener);
    },

    onCompletedCleared: (callback: (downloadIds: string[]) => void) => {
      const listener = (_event: IpcRendererEvent, downloadIds: string[]) => callback(downloadIds);
      ipcRenderer.on('download:completedCleared', listener);
      return () => ipcRenderer.removeListener('download:completedCleared', listener);
    },
  },

  // Deep link operations
  deepLink: {
    onDeepLink: (callback: (data: { action: string; params: Record<string, string>; rawUrl: string }) => void) => {
      const listener = (_event: IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('deep-link', listener);
      return () => ipcRenderer.removeListener('deep-link', listener);
    },

    onDeepLinkDownload: (callback: (data: { url: string; filename?: string }) => void) => {
      const listener = (_event: IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('deep-link-download', listener);
      return () => ipcRenderer.removeListener('deep-link-download', listener);
    },
  },

  // Notification operations
  notification: {
    onClick: (callback: (data: { type: string; downloadId?: string }) => void) => {
      const listener = (_event: IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('notification-click', listener);
      return () => ipcRenderer.removeListener('notification-click', listener);
    },
  },

  // Settings operations
  settings: {
    get: (key: string): Promise<IPCResponse<{ value: any }>> =>
      ipcRenderer.invoke('settings:get', key),

    set: (key: string, value: any): Promise<IPCResponse> =>
      ipcRenderer.invoke('settings:set', key, value),

    getAll: (): Promise<IPCResponse<{ settings: Record<string, any> }>> =>
      ipcRenderer.invoke('settings:getAll'),

    setMaxConcurrent: (max: number): Promise<IPCResponse> =>
      ipcRenderer.invoke('settings:setMaxConcurrent', max),

    setGlobalSpeedLimit: (bytesPerSecond: number): Promise<IPCResponse> =>
      ipcRenderer.invoke('settings:setGlobalSpeedLimit', bytesPerSecond),
  },

  // Statistics operations
  stats: {
    get: (): Promise<IPCResponse<{ stats: Statistics }>> =>
      ipcRenderer.invoke('stats:get'),

    getByCategory: (): Promise<IPCResponse<{ stats: Record<string, { count: number; totalBytes: number }> }>> =>
      ipcRenderer.invoke('stats:getByCategory'),
  },

  // Database operations
  db: {
    getDownload: (downloadId: string): Promise<IPCResponse<{ download: DownloadRecord | null }>> =>
      ipcRenderer.invoke('db:getDownload', downloadId),

    getAllDownloads: (): Promise<IPCResponse<{ downloads: DownloadRecord[] }>> =>
      ipcRenderer.invoke('db:getAllDownloads'),

    getDownloadsByStatus: (status: string): Promise<IPCResponse<{ downloads: DownloadRecord[] }>> =>
      ipcRenderer.invoke('db:getDownloadsByStatus', status),

    getDownloadsByCategory: (category: string): Promise<IPCResponse<{ downloads: DownloadRecord[] }>> =>
      ipcRenderer.invoke('db:getDownloadsByCategory', category),

    deleteDownload: (downloadId: string): Promise<IPCResponse> =>
      ipcRenderer.invoke('db:deleteDownload', downloadId),
  },

  // Clipboard watcher operations
  clipboard: {
    enable: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('clipboard:enable'),

    disable: (): Promise<IPCResponse> =>
      ipcRenderer.invoke('clipboard:disable'),

    setAutoConfirm: (enabled: boolean): Promise<IPCResponse> =>
      ipcRenderer.invoke('clipboard:setAutoConfirm', enabled),

    getStatus: (): Promise<IPCResponse<{ status: { enabled: boolean; running: boolean; autoConfirm: boolean; pollInterval: number } }>> =>
      ipcRenderer.invoke('clipboard:getStatus'),

    testUrl: (url: string): Promise<IPCResponse<{ isValid: boolean }>> =>
      ipcRenderer.invoke('clipboard:testUrl', url),
  },

  // Dialog operations
  dialog: {
    selectDirectory: (): Promise<IPCResponse<{ path?: string; canceled?: boolean }>> =>
      ipcRenderer.invoke('dialog:selectDirectory'),
  },

  // Logger operations
  logger: {
    error: (context: string, data: any): Promise<void> =>
      ipcRenderer.invoke('logger:error', context, data),

    warn: (context: string, data: any): Promise<void> =>
      ipcRenderer.invoke('logger:warn', context, data),

    info: (context: string, data: any): Promise<void> =>
      ipcRenderer.invoke('logger:info', context, data),
  },

  // i18n operations
  i18n: {
    setLanguage: (languageCode: string): Promise<IPCResponse> =>
      ipcRenderer.invoke('i18n:setLanguage', languageCode),

    getLanguage: (): Promise<IPCResponse<{ language: string }>> =>
      ipcRenderer.invoke('i18n:getLanguage'),

    translate: (key: string, params?: Record<string, string>): Promise<IPCResponse<{ translation: string }>> =>
      ipcRenderer.invoke('i18n:translate', key, params),

    getSupportedLanguages: (): Promise<IPCResponse<{ languages: Array<{ code: string; name: string; nativeName: string }> }>> =>
      ipcRenderer.invoke('i18n:getSupportedLanguages'),
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electron', electronAPI);

// Export type for use in renderer
export type ElectronAPI = typeof electronAPI;
