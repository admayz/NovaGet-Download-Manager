/**
 * Rate Limiter
 * Token bucket algorithm for API rate limiting
 * Requirements: 6.3, 7.4, 8.4
 */

export interface RateLimiterConfig {
  maxRequests: number; // Maximum requests per window
  windowMs: number; // Time window in milliseconds
}

export class RateLimiter {
  private maxRequests: number;
  private windowMs: number;
  private requests: number[];
  private queue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
  }>;
  private processing: boolean;

  constructor(config: RateLimiterConfig) {
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
    this.requests = [];
    this.queue = [];
    this.processing = false;
  }

  /**
   * Wait for rate limit clearance before proceeding
   */
  async acquire(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process the request queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      // Clean up old requests outside the time window
      this.cleanupOldRequests();

      // Check if we can process the next request
      if (this.requests.length < this.maxRequests) {
        const item = this.queue.shift();
        if (item) {
          this.requests.push(Date.now());
          item.resolve();
        }
      } else {
        // Wait until the oldest request expires
        const oldestRequest = this.requests[0];
        const waitTime = this.windowMs - (Date.now() - oldestRequest);
        
        if (waitTime > 0) {
          await this.sleep(waitTime);
        }
      }
    }

    this.processing = false;
  }

  /**
   * Remove requests that are outside the time window
   */
  private cleanupOldRequests(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    
    this.requests = this.requests.filter(timestamp => timestamp > cutoff);
  }

  /**
   * Get current rate limit status
   */
  getStatus(): {
    remaining: number;
    total: number;
    resetAt: Date | null;
  } {
    this.cleanupOldRequests();
    
    const remaining = Math.max(0, this.maxRequests - this.requests.length);
    const resetAt = this.requests.length > 0
      ? new Date(this.requests[0] + this.windowMs)
      : null;

    return {
      remaining,
      total: this.maxRequests,
      resetAt
    };
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.requests = [];
    
    // Reject all queued requests
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        item.reject(new Error('Rate limiter reset'));
      }
    }
    
    this.processing = false;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
