import axios, { AxiosRequestConfig } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { RetryManager, isRetryableError } from './RetryManager';

export interface SegmentOptions {
  id: number;
  url: string;
  start: number;
  end: number;
  tempDir: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface SegmentProgress {
  segmentId: number;
  start: number;
  end: number;
  downloaded: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
}

/**
 * Segment class handles downloading a specific byte range of a file
 * Supports HTTP Range requests and resume capability
 */
export class Segment extends EventEmitter {
  public readonly id: number;
  public readonly url: string;
  public readonly start: number;
  public readonly end: number;
  public readonly tempFilePath: string;
  
  private downloaded: number = 0;
  private status: 'pending' | 'downloading' | 'completed' | 'failed' = 'pending';
  private headers: Record<string, string>;
  private timeout: number;
  private abortController?: AbortController;
  private writeStream?: fs.WriteStream | null;
  private retryManager: RetryManager;
  private isPausing: boolean = false;

  constructor(options: SegmentOptions) {
    super();
    this.id = options.id;
    this.url = options.url;
    this.start = options.start;
    this.end = options.end;
    this.headers = options.headers || {};
    this.timeout = options.timeout || 30000;
    this.retryManager = new RetryManager(3, 500, 10000); // 3 retries, 500ms base, 10s max
    
    // Create temp file path
    this.tempFilePath = path.join(options.tempDir, `segment_${this.id}.tmp`);
  }

  /**
   * Start downloading the segment
   */
  async download(): Promise<void> {
    if (this.status === 'completed') {
      return;
    }

    // Use retry manager for segment download
    await this.retryManager.executeWithRetry(
      `segment_${this.id}`,
      async () => {
        await this.downloadWithoutRetry();
      },
      {
        onRetry: (attempt, error) => {
          console.log(`Retrying segment ${this.id} (attempt ${attempt}): ${error.message}`);
        },
        shouldRetry: isRetryableError,
      }
    );
  }

  /**
   * Download segment without retry logic (used by retry manager)
   */
  private async downloadWithoutRetry(): Promise<void> {
    this.status = 'downloading';
    this.abortController = new AbortController();

    try {
      // Check if partial download exists
      if (fs.existsSync(this.tempFilePath)) {
        const stats = fs.statSync(this.tempFilePath);
        this.downloaded = stats.size;
        console.log(`[Segment ${this.id}] Found temp file: ${this.downloaded} bytes`);
      }

      // Calculate segment size
      const segmentSize = this.end - this.start + 1;
      
      // If already completed (downloaded bytes equals or exceeds segment size)
      if (this.downloaded >= segmentSize) {
        console.log(`[Segment ${this.id}] Already completed: ${this.downloaded} / ${segmentSize} bytes`);
        this.status = 'completed';
        this.emit('complete', this.getProgress());
        return;
      }

      // Calculate current range
      const currentStart = this.start + this.downloaded;
      console.log(`[Segment ${this.id}] Resuming from byte ${currentStart} to ${this.end}`);

      const config: AxiosRequestConfig = {
        method: 'GET',
        url: this.url,
        headers: {
          ...this.headers,
          'Range': `bytes=${currentStart}-${this.end}`
        },
        responseType: 'stream',
        timeout: this.timeout,
        signal: this.abortController.signal,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400,
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false, // Allow self-signed certificates
        }),
      };

      const response = await axios(config);

      // Create write stream (append mode if resuming)
      // Use highWaterMark to control buffer size and memory usage
      this.writeStream = fs.createWriteStream(this.tempFilePath, {
        flags: this.downloaded > 0 ? 'a' : 'w',
        highWaterMark: 64 * 1024, // 64KB buffer - reduces memory usage
      });

      // Track progress with throttling to reduce event overhead
      let lastProgressEmit = Date.now();
      const progressThrottle = 100; // Emit progress max every 100ms

      response.data.on('data', (chunk: Buffer) => {
        this.downloaded += chunk.length;
        
        // Throttle progress events to reduce overhead
        const now = Date.now();
        if (now - lastProgressEmit >= progressThrottle) {
          this.emit('progress', this.getProgress());
          lastProgressEmit = now;
        }
      });

      // Handle stream completion
      await new Promise<void>((resolve, reject) => {
        response.data.pipe(this.writeStream);
        
        this.writeStream!.on('finish', () => {
          // Check if we're pausing - don't mark as completed
          if (this.isPausing) {
            console.log(`[Segment ${this.id}] Stream finished due to pause, not marking as completed`);
            this.isPausing = false;
            this.status = 'pending';
          } else {
            console.log(`[Segment ${this.id}] Stream finished, marking as completed`);
            this.status = 'completed';
            this.emit('complete', this.getProgress());
          }
          
          // Clean up references to allow garbage collection
          this.writeStream = undefined;
          this.abortController = undefined;
          
          resolve();
        });

        this.writeStream!.on('error', (error: any) => {
          // Check if error is due to abort (cancel/pause)
          if (error.code === 'ERR_CANCELED' || error.code === 'ABORT_ERR' || error.message?.includes('aborted')) {
            // This is expected when pausing/canceling
            this.status = 'pending';
            resolve(); // Resolve instead of reject
            return;
          }
          
          this.status = 'failed';
          this.emit('error', error);
          
          // Clean up on error
          this.cleanup();
          
          reject(error);
        });

        response.data.on('error', (error: any) => {
          // Check if error is due to abort (cancel/pause)
          if (error.code === 'ERR_CANCELED' || error.code === 'ABORT_ERR' || error.message?.includes('aborted')) {
            // This is expected when pausing/canceling
            this.status = 'pending';
            resolve(); // Resolve instead of reject
            return;
          }
          
          this.status = 'failed';
          this.emit('error', error);
          
          // Clean up on error
          this.cleanup();
          
          reject(error);
        });
      });

    } catch (error: any) {
      // Check if error is due to abort (cancel/pause)
      if (error.code === 'ERR_CANCELED' || error.message?.includes('aborted') || error.name === 'CanceledError') {
        // This is expected when pausing/canceling, don't treat as error
        // Don't emit error, don't throw - just silently stop
        this.status = 'pending';
        return;
      }
      
      this.status = 'failed';
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Resume a paused download
   */
  async resume(): Promise<void> {
    if (this.status === 'completed') {
      return;
    }
    
    this.status = 'pending';
    await this.download();
  }

  /**
   * Pause the download
   */
  pause(): void {
    try {
      console.log(`[Segment ${this.id}] Pausing... current status: ${this.status}, downloaded: ${this.downloaded}`);
      
      // Set flag to prevent marking as completed when stream finishes
      this.isPausing = true;
      
      if (this.abortController) {
        this.abortController.abort();
      }
      
      if (this.writeStream && !this.writeStream.destroyed) {
        // Close the stream gracefully
        this.writeStream.end();
        this.writeStream = null;
      }
      
      this.status = 'pending';
      console.log(`[Segment ${this.id}] Paused, status: ${this.status}`);
      this.emit('paused', this.getProgress());
    } catch (error) {
      // Ignore errors during pause - they're expected
      console.log('[Segment] Pause error (expected):', error);
    }
  }

  /**
   * Cancel the download and clean up temp file
   */
  cancel(): void {
    this.pause();
    
    // Note: Don't delete temp file here
    // Let the Download class handle cleanup after all segments are cancelled
    // This prevents EPERM errors from trying to delete files that are still in use
    
    this.downloaded = 0;
    this.status = 'failed';
  }

  /**
   * Get current progress
   */
  getProgress(): SegmentProgress {
    return {
      segmentId: this.id,
      start: this.start,
      end: this.end,
      downloaded: this.downloaded,
      status: this.status
    };
  }

  /**
   * Get the size of this segment
   */
  getSize(): number {
    return this.end - this.start + 1;
  }

  /**
   * Check if segment is completed
   */
  isCompleted(): boolean {
    return this.status === 'completed';
  }

  /**
   * Get percentage completed
   */
  getPercentage(): number {
    const size = this.getSize();
    return size > 0 ? (this.downloaded / size) * 100 : 0;
  }

  /**
   * Clean up resources to prevent memory leaks
   */
  private cleanup(): void {
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = undefined;
    }
    
    if (this.abortController) {
      this.abortController = undefined;
    }
  }
}
