/**
 * Buffer pool for reusing buffers and reducing memory allocation overhead
 * Useful for download operations that create many temporary buffers
 */

export class BufferPool {
  private static instance: BufferPool;
  private pool: Buffer[] = [];
  private maxPoolSize: number;
  private bufferSize: number;
  private allocated: number = 0;
  private reused: number = 0;

  private constructor(bufferSize: number = 64 * 1024, maxPoolSize: number = 50) {
    this.bufferSize = bufferSize;
    this.maxPoolSize = maxPoolSize;
  }

  static getInstance(bufferSize?: number, maxPoolSize?: number): BufferPool {
    if (!BufferPool.instance) {
      BufferPool.instance = new BufferPool(bufferSize, maxPoolSize);
    }
    return BufferPool.instance;
  }

  /**
   * Get a buffer from the pool or allocate a new one
   */
  acquire(): Buffer {
    if (this.pool.length > 0) {
      this.reused++;
      return this.pool.pop()!;
    }

    this.allocated++;
    return Buffer.allocUnsafe(this.bufferSize);
  }

  /**
   * Return a buffer to the pool for reuse
   */
  release(buffer: Buffer): void {
    if (this.pool.length < this.maxPoolSize && buffer.length === this.bufferSize) {
      // Clear the buffer before returning to pool
      buffer.fill(0);
      this.pool.push(buffer);
    }
  }

  /**
   * Clear the entire pool
   */
  clear(): void {
    this.pool = [];
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    poolSize: number;
    maxPoolSize: number;
    bufferSize: number;
    allocated: number;
    reused: number;
    reuseRate: number;
  } {
    const total = this.allocated + this.reused;
    return {
      poolSize: this.pool.length,
      maxPoolSize: this.maxPoolSize,
      bufferSize: this.bufferSize,
      allocated: this.allocated,
      reused: this.reused,
      reuseRate: total > 0 ? Math.round((this.reused / total) * 100) : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.allocated = 0;
    this.reused = 0;
  }
}

// Export singleton instance
export const bufferPool = BufferPool.getInstance();
