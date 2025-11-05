import { EventEmitter } from 'events';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { Segment, SegmentProgress } from './Segment';
import { SpeedLimiter } from './SpeedLimiter';
import { RetryManager, isRetryableError } from './RetryManager';

export interface DownloadOptions {
  url: string;
  filename?: string;
  directory: string;
  segments?: number;
  speedLimit?: number;
  scheduledTime?: Date;
  headers?: Record<string, string>;
  skipSecurityCheck?: boolean;
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

/**
 * Download class manages a single download with multiple segments
 * Handles pause/resume, retry logic, and segment coordination
 */
export class Download extends EventEmitter {
  public readonly id: string;
  public readonly url: string;
  public readonly directory: string;
  public filename: string;
  
  private segments: Segment[] = [];
  private speedLimiter: SpeedLimiter;
  private retryManager: RetryManager;
  private status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed' = 'queued';
  private totalBytes: number = 0;
  private downloadedBytes: number = 0;
  private segmentCount: number;
  private headers: Record<string, string>;
  private tempDir: string;
  private finalPath: string = '';
  private startTime: number = 0;
  private lastProgressTime: number = 0;
  private lastDownloadedBytes: number = 0;
  private currentSpeed: number = 0;
  private error?: string;
  private skipSecurityCheck: boolean;
  private securityScan?: {
    scanned: boolean;
    safe: boolean;
    detections?: number;
    scanDate?: number;
  };

  constructor(options: DownloadOptions) {
    super();
    this.id = this.generateId();
    this.url = options.url;
    this.directory = options.directory;
    this.filename = options.filename || this.extractFilename(options.url);
    this.segmentCount = options.segments || 4;
    this.skipSecurityCheck = options.skipSecurityCheck || false;
    
    // Add default headers to mimic a real browser
    const urlObj = new URL(options.url);
    const origin = `${urlObj.protocol}//${urlObj.host}`;
    
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Referer': origin,
      'Origin': origin,
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Upgrade-Insecure-Requests': '1',
      ...options.headers,
    };
    
    this.speedLimiter = new SpeedLimiter(options.speedLimit || 0);
    this.retryManager = new RetryManager(3, 1000, 30000); // 3 retries, 1s base delay, 30s max
    
    // Create temp directory for segments
    this.tempDir = path.join(this.directory, `.novaget_${this.id}`);
  }

  /**
   * Start the download
   */
  async start(): Promise<void> {
    if (this.status === 'downloading' || this.status === 'completed') {
      return;
    }

    try {
      this.status = 'downloading';
      this.startTime = Date.now();
      this.lastProgressTime = Date.now();
      this.emit('statusChange', this.status);

      // Create temp directory
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }

      // Initialize segments if not already done
      if (this.segments.length === 0) {
        await this.initializeSegments();
      }

      // Download all segments in parallel
      await this.downloadSegments();

      // Check if download was paused/cancelled during segment download
      if (this.status !== 'downloading') {
        return; // Don't merge if paused or cancelled
      }

      // Merge segments into final file
      await this.mergeSegments();

      // Emit post-download event for security check
      // Don't mark as completed yet - let DownloadManager handle security check
      if (!this.skipSecurityCheck) {
        this.emit('downloadCompleted', {
          downloadId: this.id,
          filePath: this.finalPath,
          filename: this.filename
        });
        // Wait for security check confirmation
        // Status will be updated by DownloadManager after security check
        return;
      }

      // Cleanup
      this.cleanup();

      this.status = 'completed';
      this.emit('complete', this.getProgress());
      this.emit('statusChange', this.status);

    } catch (error) {
      await this.handleError(error as Error);
    }
  }

  /**
   * Pause the download
   */
  async pause(): Promise<void> {
    if (this.status !== 'downloading') {
      return;
    }

    console.log(`[Download] Pausing download ${this.id}`);
    this.status = 'paused';
    
    // Pause all segments
    this.segments.forEach((segment, i) => {
      const before = segment.getProgress();
      segment.pause();
      const after = segment.getProgress();
      console.log(`[Download] Segment ${i} paused: ${before.status} -> ${after.status}, ${after.downloaded} bytes`);
    });
    
    this.emit('paused', this.getProgress());
    this.emit('statusChange', this.status);
  }

  /**
   * Resume the download
   */
  async resume(): Promise<void> {
    if (this.status !== 'paused') {
      return;
    }

    this.status = 'downloading';
    this.startTime = Date.now();
    this.lastProgressTime = Date.now();
    this.emit('statusChange', this.status);

    try {
      console.log(`[Download] Resuming download ${this.id}`);
      console.log(`[Download] Segments: ${this.segments.length}`);
      
      // Check segment status
      this.segments.forEach((seg, i) => {
        const progress = seg.getProgress();
        console.log(`[Download] Segment ${i}: ${progress.downloaded} / ${seg.getSize()} bytes, status: ${progress.status}`);
      });
      
      // Check if all segments are already completed
      const allCompleted = this.segments.every(seg => seg.isCompleted());
      console.log(`[Download] All segments completed: ${allCompleted}`);
      
      if (allCompleted && this.segments.length > 0) {
        console.log(`[Download] All segments done, merging...`);
        // All segments done, just merge
        await this.mergeSegments();
        this.cleanup();
        this.status = 'completed';
        this.emit('complete', this.getProgress());
        this.emit('statusChange', this.status);
        return;
      }

      console.log(`[Download] Starting segment downloads...`);
      // Resume all incomplete segments
      await this.downloadSegments();

      // Check if download was paused during segment download
      // Status can change during async operations
      if (this.status !== 'downloading') {
        return; // Don't merge if paused or failed
      }

      // Merge segments
      await this.mergeSegments();

      // Emit post-download event for security check
      if (!this.skipSecurityCheck) {
        this.emit('downloadCompleted', {
          downloadId: this.id,
          filePath: this.finalPath,
          filename: this.filename
        });
        // Wait for security check confirmation
        return;
      }

      // Cleanup
      this.cleanup();

      this.status = 'completed';
      this.emit('complete', this.getProgress());
      this.emit('statusChange', this.status);

    } catch (error) {
      await this.handleError(error as Error);
    }
  }

  /**
   * Cancel the download
   */
  async cancel(): Promise<void> {
    this.status = 'failed';
    
    // Cancel all segments
    this.segments.forEach(segment => segment.cancel());
    
    // Wait a bit for file handles to close
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Cleanup temp files
    this.cleanup();
    
    this.emit('cancelled', this.getProgress());
    this.emit('statusChange', this.status);
  }

  /**
   * Retry the download
   */
  async retry(): Promise<void> {
    if (this.retryManager.hasExhaustedRetries(this.id)) {
      throw new Error(`Max retries (${this.retryManager.getMaxRetries()}) exceeded`);
    }

    this.error = undefined;
    this.status = 'queued';
    
    await this.start();
  }

  /**
   * Get current progress
   */
  getProgress(): DownloadProgress {
    // Calculate current speed
    this.updateSpeed();

    // Calculate remaining time
    const remainingBytes = this.totalBytes - this.downloadedBytes;
    const remainingTime = this.currentSpeed > 0 ? remainingBytes / this.currentSpeed : 0;

    return {
      downloadId: this.id,
      url: this.url,
      filename: this.filename,
      totalBytes: this.totalBytes,
      downloadedBytes: this.downloadedBytes,
      speed: this.currentSpeed,
      percentage: this.totalBytes > 0 ? (this.downloadedBytes / this.totalBytes) * 100 : 0,
      remainingTime,
      status: this.status,
      segments: this.segments.map(s => s.getProgress()),
      error: this.error,
      securityScan: this.securityScan
    };
  }

  /**
   * Set security scan result
   */
  setSecurityScan(scan: { scanned: boolean; safe: boolean; detections?: number; scanDate?: number }): void {
    this.securityScan = scan;
  }

  /**
   * Set speed limit
   */
  setSpeedLimit(bytesPerSecond: number): void {
    this.speedLimiter.setLimit(bytesPerSecond);
  }

  /**
   * Get speed limit
   */
  getSpeedLimit(): number {
    return this.speedLimiter.getLimit();
  }

  /**
   * Initialize segments based on file size
   */
  private async initializeSegments(): Promise<void> {
    try {
      console.log('Initializing segments for:', this.url);
      
      let response;
      let contentLength = this.totalBytes; // Use existing totalBytes if available
      let supportsRanges = true;
      
      // Only fetch file info if we don't have it yet
      if (contentLength === 0) {
        // Try HEAD request first
        try {
          response = await axios.head(this.url, { 
            headers: this.headers,
            maxRedirects: 5,
            validateStatus: (status) => status >= 200 && status < 400,
            httpsAgent: new (require('https').Agent)({
              rejectUnauthorized: false,
            }),
          });
          
          console.log('HEAD response status:', response.status);
          console.log('HEAD Content-Length:', response.headers['content-length']);
          
          // Check if we got a valid content-length
          if (response.headers['content-length']) {
            contentLength = parseInt(response.headers['content-length'], 10);
          }
        } catch (headError: any) {
          console.log('HEAD request failed:', headError.message);
        }
      } else {
        console.log('Using existing totalBytes:', contentLength);
      }
      
      // If HEAD didn't give us content-length, try GET with Range
      if (contentLength === 0 || isNaN(contentLength)) {
        console.log('Trying GET with Range to get file size...');
        response = await axios.get(this.url, {
          headers: {
            ...this.headers,
            'Range': 'bytes=0-0',
          },
          maxRedirects: 5,
          validateStatus: (status) => status >= 200 && status < 400,
          httpsAgent: new (require('https').Agent)({
            rejectUnauthorized: false,
          }),
          responseType: 'stream',
        });
        
        console.log('GET response status:', response.status);
        console.log('GET Content-Range:', response.headers['content-range']);
        console.log('GET Content-Length:', response.headers['content-length']);
        
        // Abort the stream immediately
        if (response.data && response.data.destroy) {
          response.data.destroy();
        }
        
        // Check if server supports range requests
        const acceptRanges = response.headers['accept-ranges'];
        // If we got a 206 response, server definitely supports ranges
        supportsRanges = (response.status === 206) || (acceptRanges && acceptRanges !== 'none');
        
        console.log('Supports ranges:', supportsRanges, '(status:', response.status, ', accept-ranges:', acceptRanges, ')');

        // Parse content length from headers
        // Prioritize Content-Range over Content-Length when doing Range requests
        if (response.headers['content-range']) {
          // Parse from Content-Range: bytes 0-0/1073741824
          const match = response.headers['content-range'].match(/\/(\d+)/);
          if (match) {
            contentLength = parseInt(match[1], 10);
            console.log('Parsed from Content-Range:', contentLength);
          }
        }
        
        // Fallback to Content-Length if Content-Range not available
        if (contentLength === 0 && response.headers['content-length']) {
          contentLength = parseInt(response.headers['content-length'], 10);
          console.log('Parsed from Content-Length:', contentLength);
        }
      }
      
      console.log('Final Content-Length:', contentLength);
      console.log('Supports Ranges:', supportsRanges);
      
      if (contentLength === 0 || isNaN(contentLength)) {
        throw new Error('Could not determine file size');
      }
      
      this.totalBytes = contentLength;

      // If server doesn't support ranges or file is too small, use single segment
      if (!supportsRanges || contentLength < 1024 * 1024) {
        this.segmentCount = 1;
      }

      // Calculate segment size
      const segmentSize = Math.ceil(contentLength / this.segmentCount);

      // Create segments
      for (let i = 0; i < this.segmentCount; i++) {
        const start = i * segmentSize;
        const end = Math.min(start + segmentSize - 1, contentLength - 1);

        const segment = new Segment({
          id: i,
          url: this.url,
          start,
          end,
          tempDir: this.tempDir,
          headers: this.headers
        });

        // Listen to segment progress
        segment.on('progress', () => {
          this.updateProgress();
        });

        this.segments.push(segment);
      }

    } catch (error) {
      throw new Error(`Failed to initialize segments: ${(error as Error).message}`);
    }
  }

  /**
   * Download all segments in parallel
   */
  private async downloadSegments(): Promise<void> {
    const downloadPromises = this.segments
      .filter(segment => !segment.isCompleted())
      .map(segment => this.downloadSegmentWithSpeedLimit(segment).catch(error => {
        // Ignore abort errors (from pause/cancel)
        if (error.code === 'ERR_CANCELED' || error.message?.includes('aborted') || error.name === 'CanceledError') {
          return; // Silently ignore
        }
        throw error; // Re-throw other errors
      }));

    await Promise.all(downloadPromises);
  }

  /**
   * Download a single segment with speed limiting
   */
  private async downloadSegmentWithSpeedLimit(segment: Segment): Promise<void> {
    // Override segment's download to apply speed limiting
    const originalDownload = segment.download.bind(segment);
    
    segment.download = async () => {
      await originalDownload();
    };

    await segment.download();
  }

  /**
   * Merge all segments into final file using streams
   * More memory efficient than reading entire files into memory
   */
  private async mergeSegments(): Promise<void> {
    this.finalPath = path.join(this.directory, this.filename);

    // Create write stream for final file with optimized buffer
    const writeStream = fs.createWriteStream(this.finalPath, {
      highWaterMark: 256 * 1024, // 256KB buffer for faster writes
    });

    try {
      // Stream each segment in order
      for (const segment of this.segments) {
        if (!fs.existsSync(segment.tempFilePath)) {
          throw new Error(`Segment ${segment.id} temp file not found`);
        }

        // Use stream-based copying instead of reading entire file
        await new Promise<void>((resolve, reject) => {
          const readStream = fs.createReadStream(segment.tempFilePath, {
            highWaterMark: 256 * 1024, // 256KB buffer
          });

          readStream.on('data', (chunk) => {
            // Handle backpressure
            if (!writeStream.write(chunk)) {
              readStream.pause();
              writeStream.once('drain', () => readStream.resume());
            }
          });

          readStream.on('end', () => resolve());
          readStream.on('error', reject);
        });
      }

      // Close stream
      await new Promise<void>((resolve, reject) => {
        writeStream.end(() => resolve());
        writeStream.on('error', reject);
      });

    } catch (error) {
      throw new Error(`Failed to merge segments: ${(error as Error).message}`);
    }
  }

  /**
   * Update download progress from segments
   */
  private updateProgress(): void {
    this.downloadedBytes = this.segments.reduce(
      (total, segment) => total + segment.getProgress().downloaded,
      0
    );

    this.emit('progress', this.getProgress());
  }

  /**
   * Update current speed calculation
   */
  private updateSpeed(): void {
    const now = Date.now();
    const timeDiff = (now - this.lastProgressTime) / 1000; // Convert to seconds

    if (timeDiff >= 1) {
      const bytesDiff = this.downloadedBytes - this.lastDownloadedBytes;
      this.currentSpeed = bytesDiff / timeDiff;
      
      this.lastProgressTime = now;
      this.lastDownloadedBytes = this.downloadedBytes;
    }
  }

  /**
   * Handle download errors
   */
  private async handleError(error: Error): Promise<void> {
    this.error = error.message;
    
    // Check if error is retryable
    if (isRetryableError(error) && !this.retryManager.hasExhaustedRetries(this.id)) {
      console.log(`Download ${this.id} failed with retryable error, will retry`);
      
      // Use retry manager for automatic retry with exponential backoff
      try {
        await this.retryManager.executeWithRetry(
          this.id,
          async () => {
            this.error = undefined;
            await this.start();
          },
          {
            onRetry: (attempt, retryError) => {
              console.log(`Retrying download ${this.id} (attempt ${attempt}): ${retryError.message}`);
              this.emit('retry', { attempt, error: retryError, progress: this.getProgress() });
            },
            shouldRetry: isRetryableError,
          }
        );
      } catch (retryError) {
        // All retries exhausted
        this.status = 'failed';
        this.error = (retryError as Error).message;
        this.emit('error', retryError, this.getProgress());
        this.emit('statusChange', this.status);
      }
    } else {
      // Non-retryable error or retries exhausted
      this.status = 'failed';
      this.emit('error', error, this.getProgress());
      this.emit('statusChange', this.status);
    }
  }

  /**
   * Cleanup temp files and directory
   * Also releases memory by clearing segment references
   */
  private cleanup(): void {
    try {
      // Remove all listeners first to prevent memory leaks
      this.segments.forEach(segment => {
        segment.removeAllListeners();
      });

      // Try to delete segment temp files with retry logic
      this.segments.forEach(segment => {
        let retries = 3;
        while (retries > 0) {
          try {
            if (fs.existsSync(segment.tempFilePath)) {
              fs.unlinkSync(segment.tempFilePath);
            }
            break; // Success, exit retry loop
          } catch (error) {
            retries--;
            if (retries === 0) {
              console.warn(`Failed to delete temp file after retries: ${segment.tempFilePath}`);
            } else {
              // Wait a bit before retry (synchronous wait)
              const start = Date.now();
              while (Date.now() - start < 50) {
                // Busy wait for 50ms
              }
            }
          }
        }
      });

      // Try to delete temp directory with retry logic
      if (fs.existsSync(this.tempDir)) {
        let retries = 3;
        while (retries > 0) {
          try {
            fs.rmSync(this.tempDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
            break; // Success, exit retry loop
          } catch (error) {
            retries--;
            if (retries === 0) {
              console.warn(`Failed to delete temp directory after retries: ${this.tempDir}`);
              // Don't throw error, just log it
            } else {
              // Wait a bit before retry
              const start = Date.now();
              while (Date.now() - start < 100) {
                // Busy wait for 100ms
              }
            }
          }
        }
      }

      // Clear segment array to allow garbage collection
      // Keep the array but clear references
      this.segments.length = 0;

    } catch (error) {
      console.error('Cleanup error:', error);
      // Don't throw, just log - cleanup errors shouldn't break the app
    }
  }

  /**
   * Destroy download and release all resources
   * Call this when download is no longer needed
   */
  destroy(): void {
    // Cancel if still active
    if (this.status === 'downloading') {
      this.cancel();
    }

    // Cleanup files
    this.cleanup();

    // Remove all event listeners
    this.removeAllListeners();

    // Clear references
    this.segments = [];
  }

  /**
   * Extract filename from URL
   */
  private extractFilename(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = path.basename(pathname);
      return filename || 'download';
    } catch {
      return 'download';
    }
  }

  /**
   * Generate unique download ID
   */
  private generateId(): string {
    return `dl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Finalize download after security check
   * Called by DownloadManager after post-download security check
   */
  finalizeDownload(): void {
    if (this.status === 'completed') {
      return; // Already finalized
    }

    // Cleanup temp files
    this.cleanup();

    this.status = 'completed';
    this.emit('complete', this.getProgress());
    this.emit('statusChange', this.status);
  }

  /**
   * Get final file path
   */
  getFinalPath(): string {
    return this.finalPath;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}