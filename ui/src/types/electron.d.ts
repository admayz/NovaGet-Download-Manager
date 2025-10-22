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
    electronAPI?: ElectronAPI;
  }
}

export {};
