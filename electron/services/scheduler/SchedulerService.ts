import { EventEmitter } from 'events';
import { DatabaseService } from '../database/DatabaseService';
import { DownloadManager } from '../download/DownloadManager';
import { DownloadRecord } from '../database/types';

/**
 * SchedulerService manages scheduled downloads
 * Checks for scheduled downloads every 30 seconds and starts them when their time comes
 * Handles missed schedules when the system was offline
 */
export class SchedulerService extends EventEmitter {
  private db: DatabaseService;
  private downloadManager: DownloadManager;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 30 * 1000; // 30 seconds
  private isRunning: boolean = false;

  constructor(db: DatabaseService, downloadManager: DownloadManager) {
    super();
    this.db = db;
    this.downloadManager = downloadManager;
  }

  /**
   * Start the scheduler service
   * Begins checking for scheduled downloads at regular intervals
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Check immediately for missed schedules
    this.checkScheduledDownloads();

    // Set up interval for regular checks
    this.checkInterval = setInterval(() => {
      this.checkScheduledDownloads();
    }, this.CHECK_INTERVAL_MS);

    this.emit('started');
  }

  /**
   * Stop the scheduler service
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.emit('stopped');
  }

  /**
   * Check for scheduled downloads that need to be started
   * Handles both current scheduled downloads and missed schedules
   */
  private checkScheduledDownloads(): void {
    try {
      const now = Date.now();

      // Get all downloads with scheduled times
      const allDownloads = this.db.getAllDownloads();
      const scheduledDownloads = allDownloads.filter(
        (download) =>
          download.scheduled_time &&
          download.scheduled_time <= now &&
          (download.status === 'queued' || download.status === 'paused')
      );

      if (scheduledDownloads.length === 0) {
        return;
      }

      // Start each scheduled download
      scheduledDownloads.forEach((download) => {
        this.startScheduledDownload(download);
      });

      this.emit('scheduledDownloadsChecked', {
        count: scheduledDownloads.length,
        timestamp: now,
      });
    } catch (error) {
      this.emit('error', error);
      console.error('Error checking scheduled downloads:', error);
    }
  }

  /**
   * Start a scheduled download
   */
  private async startScheduledDownload(download: DownloadRecord): Promise<void> {
    try {
      // Check if download is already in the download manager
      const existingProgress = this.downloadManager.getProgress(download.id);

      if (existingProgress) {
        // Download already exists, just resume it
        await this.downloadManager.resumeDownload(download.id);
      } else {
        // Download not in manager, need to recreate it
        await this.downloadManager.addDownload({
          url: download.url,
          filename: download.filename,
          directory: download.directory,
          speedLimit: download.speed_limit || undefined,
          headers: {},
        });
      }

      // Clear the scheduled time since it's now started
      this.db.updateDownload(download.id, {
        scheduled_time: undefined,
      });

      this.emit('downloadStarted', {
        downloadId: download.id,
        scheduledTime: download.scheduled_time,
        actualStartTime: Date.now(),
      });
    } catch (error) {
      this.emit('downloadStartError', {
        downloadId: download.id,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`Failed to start scheduled download ${download.id}:`, error);
    }
  }

  /**
   * Schedule a download for a specific time
   */
  scheduleDownload(downloadId: string, scheduledTime: Date): void {
    const timestamp = scheduledTime.getTime();
    const now = Date.now();

    if (timestamp <= now) {
      throw new Error('Scheduled time must be in the future');
    }

    // Update the download record with scheduled time
    this.db.updateDownload(downloadId, {
      scheduled_time: timestamp,
      status: 'queued',
    });

    this.emit('downloadScheduled', {
      downloadId,
      scheduledTime: timestamp,
    });
  }

  /**
   * Cancel a scheduled download
   */
  cancelSchedule(downloadId: string): void {
    // Remove the scheduled time from the download
    this.db.updateDownload(downloadId, {
      scheduled_time: undefined,
    });

    this.emit('scheduleCancelled', {
      downloadId,
    });
  }

  /**
   * Get all scheduled downloads
   */
  getScheduledDownloads(): DownloadRecord[] {
    const allDownloads = this.db.getAllDownloads();
    return allDownloads.filter(
      (download) =>
        download.scheduled_time &&
        download.scheduled_time > Date.now() &&
        (download.status === 'queued' || download.status === 'paused')
    );
  }

  /**
   * Get missed scheduled downloads (scheduled time has passed but not started)
   */
  getMissedSchedules(): DownloadRecord[] {
    const now = Date.now();
    const allDownloads = this.db.getAllDownloads();
    return allDownloads.filter(
      (download) =>
        download.scheduled_time &&
        download.scheduled_time <= now &&
        (download.status === 'queued' || download.status === 'paused')
    );
  }

  /**
   * Check if the service is running
   */
  isServiceRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get the check interval in milliseconds
   */
  getCheckInterval(): number {
    return this.CHECK_INTERVAL_MS;
  }
}
