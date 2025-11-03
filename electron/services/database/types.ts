/**
 * Database type definitions
 */

export interface DownloadRecord {
  id: string;
  url: string;
  filename: string;
  directory: string;
  total_bytes: number;
  downloaded_bytes: number;
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed';
  category?: string;
  tags?: string; // JSON array stored as string
  ai_suggested_name?: string;
  scheduled_time?: number;
  speed_limit?: number;
  created_at: number;
  completed_at?: number;
  error_message?: string;
}

export interface SegmentRecord {
  id?: number;
  download_id: string;
  segment_number: number;
  start_byte: number;
  end_byte: number;
  downloaded_bytes: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  temp_file_path?: string;
}

export interface SettingsRecord {
  key: string;
  value: string;
  updated_at: number;
}

export interface SpeedHistoryRecord {
  id?: number;
  download_id: string;
  speed: number;
  timestamp: number;
}

export interface Statistics {
  totalDownloads: number;
  totalBytes: number;
  averageSpeed: number;
  completedDownloads: number;
  failedDownloads: number;
}
