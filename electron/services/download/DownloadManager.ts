import { EventEmitter } from 'events';
import { app } from 'electron';
import { Download, DownloadOptions, DownloadProgress } from './Download';
import { DatabaseService } from '../database/DatabaseService';
import { SpeedLimiterManager } from './SpeedLimiter';
import { NetworkMonitor } from '../network/NetworkMonitor';
import { URLValidator } from '../../utils/urlValidator';
import { PathSanitizer } from '../../utils/pathSanitizer';
import { SecurityCheckService, SecurityCheckResponse } from '../security';
import { CategoryService } from '../category/CategoryService';

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
  private securityCheckService?: SecurityCheckService;
  private categoryService?: CategoryService;

  constructor(db: DatabaseService, maxConcurrent: number = 5, securityCheckService?: SecurityCheckService, categoryService?: CategoryService) {
    super();
    this.db = db;
    this.maxConcurrent = maxConcurrent;
    this.speedLimiterManager = new SpeedLimiterManager();
    this.networkMonitor = new NetworkMonitor();
    this.securityCheckService = securityCheckService;
    this.categoryService = categoryService;
    this.setupNetworkMonitoring();
    
    if (this.securityCheckService) {
      this.setupSecurityCheckListeners();
    }
  }

  /**
   * Add a new download to the queue
   * Requirements: 1.1, 15.1, 15.2
   */
  async addDownload(options: DownloadOptions): Promise<string> {
    // Validate URL
    const urlValidation = URLValidator.validate(options.url);
    if (!urlValidation.isValid) {
      throw new Error(`Invalid URL: ${urlValidation.error}`);
    }

    // Use sanitized URL
    options.url = urlValidation.sanitizedUrl!;

    // Pre-download security check
    if (this.securityCheckService) {
      const securityCheck = await this.performSecurityCheck(options.url);
      
      if (!securityCheck.isAllowed) {
        throw new Error(securityCheck.error || 'Security check failed');
      }

      // If there's a warning (threats detected but not blocked), emit event for UI
      if (securityCheck.result && !securityCheck.result.isSafe) {
        this.emit('securityWarning', {
          url: options.url,
          result: securityCheck.result
        });
      }
    }

    // If no directory provided, use default from settings or system Downloads folder
    if (!options.directory || options.directory.trim() === '') {
      console.log('[DownloadManager] No directory provided, checking settings...');
      // Try camelCase key first (from settingsStore)
      let defaultDir = this.db.getSetting('defaultDirectory');
      console.log('[DownloadManager] Default directory from DB (defaultDirectory):', defaultDir);
      
      // Fallback to snake_case for backwards compatibility
      if (!defaultDir) {
        defaultDir = this.db.getSetting('default_download_directory');
        console.log('[DownloadManager] Default directory from DB (default_download_directory):', defaultDir);
      }
      
      if (defaultDir) {
        options.directory = defaultDir;
        console.log('[DownloadManager] Using directory from settings:', defaultDir);
      } else {
        // Use system Downloads folder as fallback
        options.directory = app.getPath('downloads');
        console.log('[DownloadManager] Using system Downloads folder:', options.directory);
      }
    } else {
      console.log('[DownloadManager] Directory provided:', options.directory);
    }

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

    // Categorize file using AI if enabled
    let category: string | undefined;
    let aiSuggestedName: string | undefined;
    
    if (this.categoryService) {
      try {
        const useAI = this.db.getSetting('enableAutoCategorization') === 'true';
        const categoryResult = await this.categoryService.detectCategory(download.filename, useAI);
        category = categoryResult.category;
        
        // Get AI suggested name if enabled
        const useSmartNaming = this.db.getSetting('enableSmartNaming') === 'true';
        if (useSmartNaming) {
          // AI naming will be implemented later
          console.log('[DownloadManager] Smart naming enabled but not yet implemented');
        }
      } catch (error) {
        console.error('[DownloadManager] AI categorization failed:', error);
      }
    }

    // Save to database
    this.db.createDownload({
      url: options.url,
      filename: download.filename,
      directory: options.directory,
      total_bytes: 0,
      downloaded_bytes: 0,
      status: 'queued',
      category,
      ai_suggested_name: aiSuggestedName,
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

    // Only auto-start if there are available slots
    // This allows new downloads to start automatically when added
    // But prevents auto-start when user cancels/pauses (those don't call addDownload)
    const activeCount = this.getActiveDownloads().length;
    if (activeCount < this.maxConcurrent) {
      // Don't await - start download in background
      this.processQueue().catch(error => {
        console.error('Failed to process queue:', error);
      });
    }

    return downloadId;
  }

  /**
   * Pause a download
   */
  async pauseDownload(downloadId: string): Promise<void> {
    const download = this.downloads.get(downloadId);
    if (!download) {
      // If download not in memory, just update database status
      const dbDownload = this.db.getDownload(downloadId);
      if (!dbDownload) {
        throw new Error(`Download ${downloadId} not found`);
      }
      
      this.db.updateDownload(downloadId, {
        status: 'paused',
      });
      
      return;
    }

    await download.pause();

    // Update database
    this.db.updateDownload(downloadId, {
      status: 'paused',
    });

    // Don't automatically start next download when user manually pauses
    // Only process queue when downloads complete or user explicitly resumes
  }

  /**
   * Resume a paused download
   */
  async resumeDownload(downloadId: string): Promise<void> {
    let download = this.downloads.get(downloadId);
    
    // If download not in memory, try to restore from database
    if (!download) {
      const dbDownload = this.db.getDownload(downloadId);
      if (!dbDownload) {
        throw new Error(`Download ${downloadId} not found`);
      }
      
      console.log(`[DownloadManager] Restoring download ${downloadId} from database`);
      console.log(`[DownloadManager] Downloaded: ${dbDownload.downloaded_bytes} / ${dbDownload.total_bytes}`);
      
      // Recreate download from database record
      download = new Download({
        url: dbDownload.url,
        filename: dbDownload.filename,
        directory: dbDownload.directory,
        segments: 4, // Default segment count
        speedLimit: dbDownload.speed_limit || undefined,
      });
      
      // Override the generated ID with the original one
      (download as any).id = downloadId;
      
      // Restore download state
      (download as any).totalBytes = dbDownload.total_bytes;
      (download as any).downloadedBytes = dbDownload.downloaded_bytes;
      (download as any).status = 'paused';
      
      // Restore temp directory path
      const path = require('path');
      (download as any).tempDir = path.join(dbDownload.directory, `.novaget_${downloadId}`);
      
      // Initialize segments with existing temp files
      // This will create segment objects that will check for existing temp files
      await (download as any).initializeSegments();
      
      // Add to downloads map
      this.downloads.set(downloadId, download);
      
      // Setup event listeners
      this.setupDownloadListeners(download);
      
      console.log(`[DownloadManager] Download ${downloadId} restored with ${(download as any).segments.length} segments`);
    }

    // Resume the download
    await download.resume();

    // Update database
    this.db.updateDownload(downloadId, {
      status: 'downloading',
    });

    // Emit status change
    this.emit('download:statusChange', { downloadId, status: 'downloading' });
  }

  /**
   * Cancel a download
   */
  async cancelDownload(downloadId: string): Promise<void> {
    const download = this.downloads.get(downloadId);
    
    // If download exists in memory, cancel it
    if (download) {
      await download.cancel();

      // Remove from queue
      const queueIndex = this.queue.indexOf(downloadId);
      if (queueIndex > -1) {
        this.queue.splice(queueIndex, 1);
      }

      // Remove from map
      this.downloads.delete(downloadId);
    }

    // Delete from database completely
    this.db.deleteDownload(downloadId);

    // Emit event
    this.emit('downloadCancelled', downloadId);

    // Don't automatically start next download when user cancels
    // Only process queue when downloads complete or user explicitly resumes
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
      error_message: null,
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
   * Perform pre-download security check
   * Requirements: 1.1, 15.1, 15.2
   */
  private async performSecurityCheck(url: string): Promise<SecurityCheckResponse> {
    if (!this.securityCheckService) {
      return { isAllowed: true, skipped: true };
    }

    try {
      const result = await this.securityCheckService.checkUrlSecurity({
        url,
        timeout: 30000 // 30 seconds timeout
      });

      return result;
    } catch (error) {
      console.error('Security check error:', error);
      // On error, allow download but log the error
      return {
        isAllowed: true,
        error: (error as Error).message
      };
    }
  }

  /**
   * Setup security check event listeners
   */
  private setupSecurityCheckListeners(): void {
    if (!this.securityCheckService) return;

    this.securityCheckService.on('checkStarted', ({ url }) => {
      this.emit('securityCheckStarted', { url });
    });

    this.securityCheckService.on('checkCompleted', ({ url, result }) => {
      this.emit('securityCheckCompleted', { url, result });
    });

    this.securityCheckService.on('threatBlocked', ({ url, result }) => {
      this.emit('securityThreatBlocked', { url, result });
    });

    this.securityCheckService.on('threatWarning', ({ url, result }) => {
      this.emit('securityThreatWarning', { url, result });
    });

    this.securityCheckService.on('checkTimeout', ({ url, error }) => {
      this.emit('securityCheckTimeout', { url, error });
    });

    this.securityCheckService.on('checkError', ({ url, error }) => {
      this.emit('securityCheckError', { url, error });
    });

    this.securityCheckService.on('notConfigured', ({ url }) => {
      this.emit('securityNotConfigured', { url });
    });
  }

  /**
   * Set security check service
   */
  setSecurityCheckService(service: SecurityCheckService): void {
    this.securityCheckService = service;
    this.setupSecurityCheckListeners();
  }

  /**
   * Get security check service
   */
  getSecurityCheckService(): SecurityCheckService | undefined {
    return this.securityCheckService;
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

    // Download completed (before security check)
    download.on('downloadCompleted', async (data: { downloadId: string; filePath: string; filename: string }) => {
      // Perform post-download security check
      await this.performPostDownloadSecurityCheck(data.downloadId, data.filePath);
    });

    // Download completed (after security check or if skipped)
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

      // Don't automatically start next download on error
      // User should manually retry or start next download
    });

    // Status change
    download.on('statusChange', (status: string) => {
      this.emit('downloadStatusChange', { downloadId, status });
    });
  }

  /**
   * Perform post-download security check
   * Requirements: 1.1, 15.1, 15.2
   */
  private async performPostDownloadSecurityCheck(downloadId: string, filePath: string): Promise<void> {
    const download = this.downloads.get(downloadId);
    if (!download) {
      console.error(`Download ${downloadId} not found for security check`);
      return;
    }

    // If no security service, finalize immediately
    if (!this.securityCheckService) {
      download.finalizeDownload();
      return;
    }

    try {
      this.emit('postDownloadCheckStarted', { downloadId, filePath });

      const result = await this.securityCheckService.checkFileSecurity({
        filePath
      });

      // Set security scan result on download
      if (result.result) {
        download.setSecurityScan({
          scanned: true,
          safe: result.result.isSafe,
          detections: result.result.positives,
          scanDate: Date.now()
        });
      }

      if (!result.isAllowed && result.result) {
        // Virus detected - emit event for UI to handle
        this.emit('virusDetected', {
          downloadId,
          filePath,
          result: result.result
        });

        // Update database with security warning
        this.db.updateDownload(downloadId, {
          status: 'completed',
          error_message: `Security warning: ${result.result.positives}/${result.result.total} threats detected`,
          security_scan_status: 'threat',
          security_scan_detections: result.result.positives,
          security_scan_date: Date.now()
        });

        // Don't delete file automatically - let user decide
        // Finalize download but mark with warning
        download.finalizeDownload();
      } else {
        // File is safe or check was skipped
        this.emit('postDownloadCheckCompleted', {
          downloadId,
          filePath,
          result: result.result
        });

        // Update database with safe status
        if (result.result) {
          this.db.updateDownload(downloadId, {
            security_scan_status: 'safe',
            security_scan_detections: 0,
            security_scan_date: Date.now()
          });
        }

        // Finalize download normally
        download.finalizeDownload();
      }

    } catch (error) {
      console.error('Post-download security check error:', error);
      this.emit('postDownloadCheckError', {
        downloadId,
        filePath,
        error: (error as Error).message
      });

      // On error, finalize download anyway
      download.finalizeDownload();
    }
  }

  /**
   * Move file to quarantine
   * Called when user wants to quarantine a suspicious file
   */
  async quarantineFile(downloadId: string): Promise<string> {
    const download = this.downloads.get(downloadId);
    if (!download) {
      throw new Error(`Download ${downloadId} not found`);
    }

    const fs = require('fs');
    const path = require('path');
    const finalPath = download.getFinalPath();

    if (!fs.existsSync(finalPath)) {
      throw new Error('File not found');
    }

    // Create quarantine directory
    const quarantineDir = path.join(app.getPath('userData'), 'quarantine');
    if (!fs.existsSync(quarantineDir)) {
      fs.mkdirSync(quarantineDir, { recursive: true });
    }

    // Move file to quarantine with timestamp
    const timestamp = Date.now();
    const quarantinePath = path.join(quarantineDir, `${timestamp}_${path.basename(finalPath)}`);
    
    fs.renameSync(finalPath, quarantinePath);

    this.emit('fileQuarantined', { downloadId, originalPath: finalPath, quarantinePath });

    return quarantinePath;
  }

  /**
   * Delete downloaded file
   * Called when user wants to delete a suspicious file
   */
  async deleteDownloadedFile(downloadId: string): Promise<void> {
    const download = this.downloads.get(downloadId);
    if (!download) {
      throw new Error(`Download ${downloadId} not found`);
    }

    const fs = require('fs');
    const finalPath = download.getFinalPath();

    if (fs.existsSync(finalPath)) {
      fs.unlinkSync(finalPath);
      this.emit('fileDeleted', { downloadId, filePath: finalPath });
    }
  }
}
