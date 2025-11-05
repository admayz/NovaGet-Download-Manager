// Type definitions for Electron API exposed to renderer process

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
  securityScan?: {
    scanned: boolean;
    safe: boolean;
    detections?: number;
    scanDate?: number;
  };
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
  security_scan_status?: string; // 'pending' | 'scanned' | 'safe' | 'threat'
  security_scan_detections?: number;
  security_scan_date?: number;
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

export interface ElectronAPI {
  platform: string;

  download: {
    add: (options: DownloadOptions) => Promise<IPCResponse<{ downloadId: string }>>;
    pause: (downloadId: string) => Promise<IPCResponse>;
    resume: (downloadId: string) => Promise<IPCResponse>;
    cancel: (downloadId: string) => Promise<IPCResponse>;
    retry: (downloadId: string) => Promise<IPCResponse>;
    getAll: () => Promise<IPCResponse<{ downloads: DownloadProgress[] }>>;
    getProgress: (downloadId: string) => Promise<IPCResponse<{ progress: DownloadProgress | null }>>;
    pauseAll: () => Promise<IPCResponse>;
    resumeAll: () => Promise<IPCResponse>;
    clearCompleted: () => Promise<IPCResponse>;
    setSpeedLimit: (downloadId: string, bytesPerSecond: number) => Promise<IPCResponse>;

    onProgress: (callback: (progress: DownloadProgress) => void) => () => void;
    onComplete: (callback: (progress: DownloadProgress) => void) => () => void;
    onError: (callback: (data: { downloadId: string; error: string; progress: DownloadProgress }) => void) => () => void;
    onAdded: (callback: (downloadId: string) => void) => () => void;
    onCancelled: (callback: (downloadId: string) => void) => () => void;
    onStatusChange: (callback: (data: { downloadId: string; status: string }) => void) => () => void;
    onCompletedCleared: (callback: (downloadIds: string[]) => void) => () => void;
  };

  settings: {
    get: (key: string) => Promise<IPCResponse<{ value: string | null }>>;
    set: (key: string, value: string) => Promise<IPCResponse>;
    getAll: () => Promise<IPCResponse<{ settings: Record<string, string> }>>;
    setMaxConcurrent: (max: number) => Promise<IPCResponse>;
    setGlobalSpeedLimit: (bytesPerSecond: number) => Promise<IPCResponse>;
  };

  stats: {
    get: () => Promise<IPCResponse<{ stats: Statistics }>>;
    getByCategory: () => Promise<IPCResponse<{ stats: Record<string, { count: number; totalBytes: number }> }>>;
  };

  db: {
    getDownload: (downloadId: string) => Promise<IPCResponse<{ download: DownloadRecord | null }>>;
    getAllDownloads: () => Promise<IPCResponse<{ downloads: DownloadRecord[] }>>;
    getDownloadsByStatus: (status: string) => Promise<IPCResponse<{ downloads: DownloadRecord[] }>>;
    getDownloadsByCategory: (category: string) => Promise<IPCResponse<{ downloads: DownloadRecord[] }>>;
    deleteDownload: (downloadId: string) => Promise<IPCResponse>;
  };

  dialog: {
    selectDirectory: () => Promise<IPCResponse<{ path?: string; canceled?: boolean }>>;
  };

  i18n: {
    setLanguage: (languageCode: string) => Promise<IPCResponse>;
    getLanguage: () => Promise<IPCResponse<{ language: string }>>;
    translate: (key: string, params?: Record<string, string>) => Promise<IPCResponse<{ translation: string }>>;
    getSupportedLanguages: () => Promise<IPCResponse<{ languages: Array<{ code: string; name: string; nativeName: string }> }>>;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
