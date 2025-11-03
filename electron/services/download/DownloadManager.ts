import { EventEmitter } from 'events';
import { Download, DownloadOptions, DownloadProgress } from './Download';
import { DatabaseService } from '../database/DatabaseService';
import { SpeedLimiterManager } from './SpeedLimiter';
import { NetworkMonitor } from '../network/NetworkMonitor';
import { URLValidator } from '../../utils/urlValidator';
import { PathSanitizer } from '../../utils/pathSanitizer';

/**
 * DownloadManager manages the download queue and coordinates multiple downloads
 * Enforces concurrent download limits and handles download lifecycle
 */
export class DownloadManager extends EventEmitter {
  private downloads: Map<string, Download> = new Map();
  private queue: string[] = [];
  private maxConcurrent: number = 5;
  private db: DatabaseService;
  private speedLimiterManager: SpeedLimiterManager;
  private networkMonitor: NetworkMonitor;
  private pausedByNetwork: Set<string> = new Set();

  constructor(db: DatabaseService, maxConcurrent: number = 5) {
    super();
    this.db = db;
    this.maxConcurrent = maxConcurrent;
    this.speedLimiterManager = new SpeedLimiterManager();
    this.networkMonitor = new NetworkMonitor();
    this.setupNetworkMonitoring();
  }

  /**
   * Add a new download to the queue
   */
  async addDownload(options: DownloadOptions): Promise<string> {
    // Validate URL
    const urlValidation = URLValidator.validate(options.url);
    if (!urlValidation.isValid) {
      throw new Error(`Invalid URL: ${urlValidation.error}`);
    }

    // Use sanitized URL
    options.url = urlValidation.sanitizedUrl!;

    // Validate and sanitize directory path
    const dirValidation = PathSanitizer.validateDirectory(options.directory);
    if (!dirValidation.isValid) {
      throw new Error(`Invalid directory: ${dirValidation.error}`);
    }

    // Use sanitized directory
    options.directory = dirValidation.sanitizedPath!;

    // Sanitize filename if provided
    if (options.filename) {
      options.filename = PathSanitizer.sanitizeFilename(options.filename);
    }

    // Create download instance
    const download = new Download(options);
    const downloadId = download.id;

    // Store in map
    this.downloads.set(downloadId, download);

    // Save to database
    this.db.createDownload({
      url: options.url,
      filename: download.filename,
      directory: options.directory,
      total_bytes: 0,
      downloaded_bytes: 0,
      status: 'queued',
      scheduled_time: options.scheduledTime?.getTime(),
      speed_limit: options.speedLimit,
      created_at: Date.now(),
    });

    // Set up event listeners
    this.setupDownloadListeners(download);

    // Add to queue
    this.queue.push(downloadId);

    // Emit event
    this.emit('downloadAdded', downloadId);

    // Try to start download if under concurrent limit
    await this.processQueue();

    return downloadId;
  }

  /**
   * Pause a download
   */
  async pauseDownload(downloadId: string): Promise<void> {
    const download = this.downloads.get(downloadId);
    if (!download) {
      throw new Error(`Download ${downloadId} not found`);
    }

    await download.pause();

    // Update database
    this.db.updateDownload(downloadId, {
      status: 'paused',
    });

    // Try to start next download in queue
    await this.processQueue();
  }

  /**
   * Resume a paused download
   */
  async resumeDownload(downloadId: string): Promise<void> {
    const download = this.downloads.get(downloadId);
    if (!download) {
      throw new Error(`Download ${downloadId} not found`);
    }

    // Add back to queue if not already there
    if (!this.queue.includes(downloadId)) {
      this.queue.push(downloadId);
    }

    // Update database
    this.db.updateDownload(downloadId, {
      status: 'queued',
    });

    // Try to start download
    await this.processQueue();
  }

  /**
   * Cancel a download
   */
  async cancelDownload(downloadId: string): Promise<void> {
    const download = this.downloads.get(downloadId);
    if (!download) {
      throw new Error(`Download ${downloadId} not found`);
    }

    await download.cancel();

    // Remove from queue
    const queueIndex = this.queue.indexOf(downloadId);
    if (queueIndex > -1) {
      this.queue.splice(queueIndex, 1);
    }

    // Update database
    this.db.updateDownload(downloadId, {
      status: 'failed',
    });

    // Remove from map
    this.downloads.delete(downloadId);

    // Emit event
    this.emit('downloadCancelled', downloadId);

    // Try to start next download
    await this.processQueue();
  }

  /**
   * Retry a failed download
   */
  async retryDownload(downloadId: string): Promise<void> {
    const download = this.downloads.get(downloadId);
    if (!download) {
      throw new Error(`Download ${downloadId} not found`);
    }

    // Add back to queue
    if (!this.queue.includes(downloadId)) {
      this.queue.push(downloadId);
    }

    // Update database
    this.db.updateDownload(downloadId, {
      status: 'queued',
      error_message: undefined,
    });

    // Try to start download
    await this.processQueue();
  }

  /**
   * Get progress for a specific download
   */
  getProgress(downloadId: string): DownloadProgress | null {
    const download = this.downloads.get(downloadId);
    if (!download) {
      return null;
    }

    return download.getProgress();
  }

  /**
   * Get progress for all downloads
   */
  getAllDownloads(): DownloadProgress[] {
    return Array.from(this.downloads.values()).map((download) =>
      download.getProgress()
    );
  }

  /**
   * Get active downloads (downloading status)
   */
  getActiveDownloads(): DownloadProgress[] {
    return this.getAllDownloads().filter((d) => d.status === 'downloading');
  }

  /**
   * Get queued downloads
   */
  getQueuedDownloads(): DownloadProgress[] {
    return this.getAllDownloads().filter((d) => d.status === 'queued');
  }

  /**
   * Set maximum concurrent downloads
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, max);
    this.processQueue();
  }

  /**
   * Get maximum concurrent downloads
   */
  getMaxConcurrent(): number {
    return this.maxConcurrent;
  }

  /**
   * Set global speed limit
   */
  setGlobalSpeedLimit(bytesPerSecond: number): void {
    this.speedLimiterManager.setGlobalLimit(bytesPerSecond);
  }

  /**
   * Get global speed limit
   */
  getGlobalSpeedLimit(): number {
    return this.speedLimiterManager.getGlobalLimit();
  }

  /**
   * Set per-download speed limit
   */
  setDownloadSpeedLimit(downloadId: string, bytesPerSecond: number): void {
    const download = this.downloads.get(downloadId);
    if (download) {
      download.setSpeedLimit(bytesPerSecond);
      this.speedLimiterManager.setDownloadLimit(downloadId, bytesPerSecond);

      // Update database
      this.db.updateDownload(downloadId, {
        speed_limit: bytesPerSecond,
      });
    }
  }

  /**
   * Pause all active downloads
   */
  async pauseAll(): Promise<void> {
    const activeDownloads = this.getActiveDownloads();
    await Promise.all(
      activeDownloads.map((d) => this.pauseDownload(d.downloadId))
    );
  }

  /**
   * Resume all paused downloads
   */
  async resumeAll(): Promise<void> {
    const pausedDownloads = this.getAllDownloads().filter(
      (d) => d.status === 'paused'
    );
    await Promise.all(
      pausedDownloads.map((d) => this.resumeDownload(d.downloadId))
    );
  }

  /**
   * Clear completed downloads from memory (keeps in database)
   */
  clearCompleted(): void {
    const completedIds: string[] = [];

    this.downloads.forEach((download, id) => {
      if (download.getProgress().status === 'completed') {
        completedIds.push(id);
      }
    });

    completedIds.forEach((id) => {
      this.downloads.delete(id);
    });

    this.emit('completedCleared', completedIds);
  }

  /**
   * Shutdown manager gracefully
   */
  async shutdown(): Promise<void> {
    // Stop network monitoring
    this.networkMonitor.stop();

    // Pause all active downloads
    await this.pauseAll();

    // Save all download states to database
    this.downloads.forEach((download) => {
      const progress = download.getProgress();
      this.db.updateDownload(progress.downloadId, {
        status: progress.status,
        downloaded_bytes: progress.downloadedBytes,
        total_bytes: progress.totalBytes,
        error_message: progress.error,
      });
    });

    this.emit('shutdown');
  }

  /**
   * Setup network monitoring for auto-pause/resume
   */
  private setupNetworkMonitoring(): void {
    // Start monitoring
    this.networkMonitor.start();

    // Handle offline event
    this.networkMonitor.on('offline', async () => {
      console.log('Network offline - pausing active downloads');
      const activeDownloads = this.getActiveDownloads();

      // Track which downloads we paused
      this.pausedByNetwork.clear();

      for (const download of activeDownloads) {
        try {
          await this.pauseDownload(download.downloadId);
          this.pausedByNetwork.add(download.downloadId);
        } catch (error) {
          console.error(`Failed to pause download ${download.downloadId}:`, error);
        }
      }

      this.emit('networkOffline');
    });

    // Handle online event
    this.networkMonitor.on('online', async () => {
      console.log('Network online - resuming paused downloads');

      // Resume downloads that were paused by network loss
      for (const downloadId of this.pausedByNetwork) {
        try {
          await this.resumeDownload(downloadId);
        } catch (error) {
          console.error(`Failed to resume download ${downloadId}:`, error);
        }
      }

      this.pausedByNetwork.clear();
      this.emit('networkOnline');
    });
  }

  /**
   * Get network status
   */
  getNetworkStatus(): { online: boolean; lastCheck: number } {
    return this.networkMonitor.getStatus();
  }

  /**
   * Check if network is connected
   */
  isNetworkConnected(): boolean {
    return this.networkMonitor.isConnected();
  }

  /**
   * Process the download queue
   * Starts downloads up to the concurrent limit
   */
  private async processQueue(): Promise<void> {
    const activeCount = this.getActiveDownloads().length;
    const availableSlots = this.maxConcurrent - activeCount;

    if (availableSlots <= 0 || this.queue.length === 0) {
      return;
    }

    // Start downloads up to available slots
    const toStart = this.queue.splice(0, availableSlots);

    for (const downloadId of toStart) {
      const download = this.downloads.get(downloadId);
      if (download) {
        try {
          await download.start();
        } catch (error) {
          console.error(`Failed to start download ${downloadId}:`, error);
        }
      }
    }
  }

  /**
   * Set up event listeners for a download
   */
  private setupDownloadListeners(download: Download): void {
    const downloadId = download.id;

    // Progress updates
    download.on('progress', (progress: DownloadProgress) => {
      this.emit('downloadProgress', progress);

      // Update database periodically (throttled)
      this.db.updateDownload(downloadId, {
        downloaded_bytes: progress.downloadedBytes,
        total_bytes: progress.totalBytes,
      });
    });

    // Download completed
    download.on('complete', (progress: DownloadProgress) => {
      // Remove from queue if still there
      const queueIndex = this.queue.indexOf(downloadId);
      if (queueIndex > -1) {
        this.queue.splice(queueIndex, 1);
      }

      // Update database
      this.db.updateDownload(downloadId, {
        status: 'completed',
        downloaded_bytes: progress.downloadedBytes,
        total_bytes: progress.totalBytes,
        completed_at: Date.now(),
      });

      this.emit('downloadComplete', progress);

      // Process next in queue
      this.processQueue();
    });

    // Download error
    download.on('error', (error: Error, progress: DownloadProgress) => {
      // Update database
      this.db.updateDownload(downloadId, {
        status: 'failed',
        error_message: error.message,
      });

      this.emit('downloadError', { downloadId, error, progress });

      // Process next in queue
      this.processQueue();
    });

    // Status change
    download.on('statusChange', (status: string) => {
      this.emit('downloadStatusChange', { downloadId, status });
    });
  }
}
