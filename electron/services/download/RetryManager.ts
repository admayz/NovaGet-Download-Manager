/**
 * RetryManager handles retry logic with exponential backoff
 * Implements configurable retry strategies for failed operations
 */
export class RetryManager {
  private maxRetries: number;
  private baseDelay: number; // milliseconds
  private maxDelay: number; // milliseconds
  private retryAttempts: Map<string, number> = new Map();

  constructor(maxRetries: number = 3, baseDelay: number = 1000, maxDelay: number = 30000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
  }

  /**
   * Execute a function with retry logic
   */
  async executeWithRetry<T>(
    id: string,
    fn: () => Promise<T>,
    options?: {
      onRetry?: (attempt: number, error: Error) => void;
      shouldRetry?: (error: Error) => boolean;
    }
  ): Promise<T> {
    const currentAttempt = this.retryAttempts.get(id) || 0;
    this.retryAttempts.set(id, currentAttempt);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await fn();
        
        // Success - reset retry count
        this.retryAttempts.delete(id);
        return result;

      } catch (error) {
        lastError = error as Error;

        // Check if we should retry this error
        if (options?.shouldRetry && !options.shouldRetry(lastError)) {
          throw lastError;
        }

        // Check if we've exhausted retries
        if (attempt >= this.maxRetries) {
          this.retryAttempts.delete(id);
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt);

        // Notify about retry
        if (options?.onRetry) {
          options.onRetry(attempt + 1, lastError);
        }

        console.log(`Retry attempt ${attempt + 1}/${this.maxRetries} for ${id} after ${delay}ms`);

        // Wait before retrying
        await this.sleep(delay);

        // Update retry count
        this.retryAttempts.set(id, attempt + 1);
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError || new Error('Unknown error');
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    // Exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt);

    // Add jitter (random 0-25% of delay)
    const jitter = Math.random() * 0.25 * exponentialDelay;

    // Cap at max delay
    const delay = Math.min(exponentialDelay + jitter, this.maxDelay);

    return Math.floor(delay);
  }

  /**
   * Get current retry count for an ID
   */
  getRetryCount(id: string): number {
    return this.retryAttempts.get(id) || 0;
  }

  /**
   * Reset retry count for an ID
   */
  resetRetryCount(id: string): void {
    this.retryAttempts.delete(id);
  }

  /**
   * Check if ID has exhausted retries
   */
  hasExhaustedRetries(id: string): boolean {
    const count = this.retryAttempts.get(id) || 0;
    return count >= this.maxRetries;
  }

  /**
   * Get max retries
   */
  getMaxRetries(): number {
    return this.maxRetries;
  }

  /**
   * Set max retries
   */
  setMaxRetries(max: number): void {
    this.maxRetries = Math.max(0, max);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear all retry counts
   */
  clear(): void {
    this.retryAttempts.clear();
  }
}

/**
 * Error classification for retry decisions
 */
export class RetryableError extends Error {
  constructor(message: string, public readonly retryable: boolean = true) {
    super(message);
    this.name = 'RetryableError';
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  // Network errors are retryable
  if (error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ECONNRESET') ||
      error.message.includes('Network Error')) {
    return true;
  }

  // HTTP 5xx errors are retryable
  if (error.message.includes('status code 5')) {
    return true;
  }

  // HTTP 429 (Too Many Requests) is retryable
  if (error.message.includes('status code 429')) {
    return true;
  }

  // HTTP 408 (Request Timeout) is retryable
  if (error.message.includes('status code 408')) {
    return true;
  }

  // Custom retryable errors
  if (error instanceof RetryableError) {
    return error.retryable;
  }

  // Default: not retryable
  return false;
}
