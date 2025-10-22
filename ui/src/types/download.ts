export enum DownloadStatus {
  Pending = 'pending',
  Downloading = 'downloading',
  Paused = 'paused',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled'
}

export interface DownloadProgress {
  downloadId: string;
  totalBytes: number;
  downloadedBytes: number;
  percentComplete: number;
  currentSpeed: number; // bytes per second
  estimatedTimeRemaining: number; // seconds
}

export interface Download {
  id: string;
  url: string;
  filename: string;
  filePath?: string;
  totalSize: number;
  downloadedSize: number;
  status: DownloadStatus;
  category?: string;
  mimeType?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  currentSpeed?: number;
  estimatedTimeRemaining?: number;
  percentComplete?: number;
}

export interface DownloadRequest {
  url: string;
  filename?: string;
  category?: string;
  speedLimit?: number;
  startImmediately?: boolean;
}
