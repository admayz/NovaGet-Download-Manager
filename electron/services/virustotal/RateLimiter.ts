/**
 * Rate Limiter for VirusTotal API
 * Free tier: 4 requests per minute
 */

import { RateLimitConfig, RateLimitStatus } from './types';

export class VirusTotalRateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(config: RateLimitConfig = { maxRequests: 4, windowMs: 60000 }) {
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
  }

  /**
   * Wait until a request slot is available
   */
  async acquire(): Promise<void> {
    this.cleanup();

    while (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (Date.now() - oldestRequest);
      
      if (waitTime > 0) {
        await this.sleep(waitTime);
      }
      
      this.cleanup();
    }

    this.requests.push(Date.now());
  }

  /**
   * Remove expired requests from the queue
   */
  private cleanup(): void {
    const now = Date.now();
    this.requests = this.requests.filter(
      (timestamp) => now - timestamp < this.windowMs
    );
  }

  /**
   * Get current rate limit status
   */
  getStatus(): RateLimitStatus {
    this.cleanup();
    
    const remaining = Math.max(0, this.maxRequests - this.requests.length);
    const oldestRequest = this.requests[0];
    const resetTime = oldestRequest ? oldestRequest + this.windowMs : Date.now();
    
    return {
      remaining,
      resetTime,
      isLimited: remaining === 0
    };
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.requests = [];
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
