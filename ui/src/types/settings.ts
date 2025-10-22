export interface Settings {
  // General
  defaultDownloadPath: string;
  maxConcurrentDownloads: number;
  autoStartDownloads: boolean;
  closeToTray: boolean;
  startWithWindows: boolean;
  
  // Network
  globalSpeedLimit: number; // 0 = unlimited, bytes per second
  maxConnectionsPerDownload: number;
  proxyEnabled: boolean;
  proxyHost: string;
  proxyPort: number;
  proxyUsername: string;
  proxyPassword: string;
  customUserAgent: string;
  
  // Security
  enableMalwareScanning: boolean;
  virusTotalApiKey: string;
  useSandboxForExecutables: boolean;
  validateTlsCertificates: boolean;
  
  // UI
  theme: 'light' | 'dark' | 'system';
  showNotifications: boolean;
  notifyOnComplete: boolean;
  notifyOnFailed: boolean;
  notifyOnScheduled: boolean;
  enableClipboardWatcher: boolean;
  
  // Categories
  autoCategorizationEnabled: boolean;
}

export const defaultSettings: Settings = {
  defaultDownloadPath: '',
  maxConcurrentDownloads: 5,
  autoStartDownloads: true,
  closeToTray: true,
  startWithWindows: false,
  
  globalSpeedLimit: 0,
  maxConnectionsPerDownload: 8,
  proxyEnabled: false,
  proxyHost: '',
  proxyPort: 8080,
  proxyUsername: '',
  proxyPassword: '',
  customUserAgent: '',
  
  enableMalwareScanning: false,
  virusTotalApiKey: '',
  useSandboxForExecutables: true,
  validateTlsCertificates: true,
  
  theme: 'system',
  showNotifications: true,
  notifyOnComplete: true,
  notifyOnFailed: true,
  notifyOnScheduled: true,
  enableClipboardWatcher: false,
  
  autoCategorizationEnabled: true,
};
