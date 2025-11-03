/**
 * SpeedLimiter implements token bucket algorithm for rate limiting
 * Supports both global and per-download speed limits
 */
export class SpeedLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // tokens per millisecond
  private lastRefill: number;
  private enabled: boolean;

  /**
   * @param bytesPerSecond - Maximum bytes per second (0 = unlimited)
   */
  constructor(bytesPerSecond: number = 0) {
    this.enabled = bytesPerSecond > 0;
    this.maxTokens = bytesPerSecond;
    this.tokens = bytesPerSecond;
    this.refillRate = bytesPerSecond / 1000; // Convert to per millisecond
    this.lastRefill = Date.now();
  }

  /**
   * Set new speed limit
   * @param bytesPerSecond - New limit (0 = unlimited)
   */
  setLimit(bytesPerSecond: number): void {
    this.enabled = bytesPerSecond > 0;
    this.maxTokens = bytesPerSecond;
    this.refillRate = bytesPerSecond / 1000;
    
    // Reset tokens to new limit
    if (this.enabled) {
      this.tokens = Math.min(this.tokens, this.maxTokens);
    }
  }

  /**
   * Get current speed limit
   */
  getLimit(): number {
    return this.maxTokens;
  }

  /**
   * Check if speed limiting is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable speed limiting
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable speed limiting
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Wait for tokens to be available for the given byte count
   * @param bytes - Number of bytes to consume
   * @returns Promise that resolves when tokens are available
   */
  async consume(bytes: number): Promise<void> {
    if (!this.enabled || bytes <= 0) {
      return;
    }

    // Refill tokens based on time elapsed
    this.refillTokens();

    // If we have enough tokens, consume and return
    if (this.tokens >= bytes) {
      this.tokens -= bytes;
      return;
    }

    // Calculate how long to wait for enough tokens
    const tokensNeeded = bytes - this.tokens;
    const waitTime = tokensNeeded / this.refillRate;

    // Wait for tokens to refill
    await this.sleep(waitTime);

    // Refill again after waiting
    this.refillTokens();

    // Consume tokens
    this.tokens = Math.max(0, this.tokens - bytes);
  }

  /**
   * Try to consume tokens without waiting
   * @param bytes - Number of bytes to consume
   * @returns true if tokens were consumed, false if not enough tokens
   */
  tryConsume(bytes: number): boolean {
    if (!this.enabled || bytes <= 0) {
      return true;
    }

    this.refillTokens();

    if (this.tokens >= bytes) {
      this.tokens -= bytes;
      return true;
    }

    return false;
  }

  /**
   * Get available tokens
   */
  getAvailableTokens(): number {
    if (!this.enabled) {
      return Infinity;
    }

    this.refillTokens();
    return this.tokens;
  }

  /**
   * Reset the limiter
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    
    if (elapsed > 0) {
      const tokensToAdd = elapsed * this.refillRate;
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Global speed limiter manager
 * Manages both global and per-download speed limits
 */
export class SpeedLimiterManager {
  private globalLimiter: SpeedLimiter;
  private downloadLimiters: Map<string, SpeedLimiter>;

  constructor(globalBytesPerSecond: number = 0) {
    this.globalLimiter = new SpeedLimiter(globalBytesPerSecond);
    this.downloadLimiters = new Map();
  }

  /**
   * Set global speed limit
   */
  setGlobalLimit(bytesPerSecond: number): void {
    this.globalLimiter.setLimit(bytesPerSecond);
  }

  /**
   * Get global speed limit
   */
  getGlobalLimit(): number {
    return this.globalLimiter.getLimit();
  }

  /**
   * Set per-download speed limit
   */
  setDownloadLimit(downloadId: string, bytesPerSecond: number): void {
    let limiter = this.downloadLimiters.get(downloadId);
    
    if (!limiter) {
      limiter = new SpeedLimiter(bytesPerSecond);
      this.downloadLimiters.set(downloadId, limiter);
    } else {
      limiter.setLimit(bytesPerSecond);
    }
  }

  /**
   * Get per-download speed limit
   */
  getDownloadLimit(downloadId: string): number {
    const limiter = this.downloadLimiters.get(downloadId);
    return limiter ? limiter.getLimit() : 0;
  }

  /**
   * Remove per-download speed limit
   */
  removeDownloadLimit(downloadId: string): void {
    this.downloadLimiters.delete(downloadId);
  }

  /**
   * Consume tokens from both global and per-download limiters
   * @param downloadId - Download ID
   * @param bytes - Number of bytes to consume
   */
  async consume(downloadId: string, bytes: number): Promise<void> {
    // Apply global limit first
    await this.globalLimiter.consume(bytes);

    // Then apply per-download limit if exists
    const downloadLimiter = this.downloadLimiters.get(downloadId);
    if (downloadLimiter) {
      await downloadLimiter.consume(bytes);
    }
  }

  /**
   * Try to consume tokens without waiting
   */
  tryConsume(downloadId: string, bytes: number): boolean {
    // Check global limit first
    if (!this.globalLimiter.tryConsume(bytes)) {
      return false;
    }

    // Check per-download limit
    const downloadLimiter = this.downloadLimiters.get(downloadId);
    if (downloadLimiter && !downloadLimiter.tryConsume(bytes)) {
      return false;
    }

    return true;
  }

  /**
   * Reset all limiters
   */
  reset(): void {
    this.globalLimiter.reset();
    this.downloadLimiters.forEach(limiter => limiter.reset());
  }

  /**
   * Clear all per-download limiters
   */
  clear(): void {
    this.downloadLimiters.clear();
  }
}
