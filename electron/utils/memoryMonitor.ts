/**
 * Memory monitoring utility for tracking and managing memory usage
 */

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB: number;
  rssMB: number;
  heapUsagePercent: number;
}

export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private monitoringInterval?: NodeJS.Timeout;
  private thresholdMB: number = 500; // Default threshold
  private callbacks: Array<(stats: MemoryStats) => void> = [];

  private constructor() {}

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  /**
   * Get current memory usage statistics
   */
  getMemoryStats(): MemoryStats {
    const usage = process.memoryUsage();
    
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
      externalMB: Math.round(usage.external / 1024 / 1024),
      rssMB: Math.round(usage.rss / 1024 / 1024),
      heapUsagePercent: Math.round((usage.heapUsed / usage.heapTotal) * 100),
    };
  }

  /**
   * Start monitoring memory usage
   */
  startMonitoring(intervalMs: number = 30000, thresholdMB: number = 500): void {
    this.thresholdMB = thresholdMB;

    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = setInterval(() => {
      const stats = this.getMemoryStats();

      // Log if exceeding threshold
      if (stats.heapUsedMB > this.thresholdMB) {
        console.warn(
          `Memory usage high: ${stats.heapUsedMB}MB / ${stats.heapTotalMB}MB (${stats.heapUsagePercent}%)`
        );
      }

      // Notify callbacks
      this.callbacks.forEach((callback) => callback(stats));

      // Suggest garbage collection if usage is high
      if (stats.heapUsagePercent > 80 && global.gc) {
        console.log('Running garbage collection...');
        global.gc();
      }
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Register callback for memory stats
   */
  onMemoryStats(callback: (stats: MemoryStats) => void): () => void {
    this.callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Force garbage collection if available
   */
  forceGC(): void {
    if (global.gc) {
      console.log('Forcing garbage collection...');
      global.gc();
      
      const stats = this.getMemoryStats();
      console.log(`Memory after GC: ${stats.heapUsedMB}MB / ${stats.heapTotalMB}MB`);
    } else {
      console.warn('Garbage collection not available. Run with --expose-gc flag.');
    }
  }

  /**
   * Log current memory usage
   */
  logMemoryUsage(): void {
    const stats = this.getMemoryStats();
    console.log('Memory Usage:');
    console.log(`  Heap Used: ${stats.heapUsedMB}MB`);
    console.log(`  Heap Total: ${stats.heapTotalMB}MB`);
    console.log(`  External: ${stats.externalMB}MB`);
    console.log(`  RSS: ${stats.rssMB}MB`);
    console.log(`  Heap Usage: ${stats.heapUsagePercent}%`);
  }

  /**
   * Check if memory usage is within acceptable limits
   */
  isMemoryHealthy(): boolean {
    const stats = this.getMemoryStats();
    return stats.heapUsedMB < this.thresholdMB && stats.heapUsagePercent < 80;
  }
}

// Export singleton instance
export const memoryMonitor = MemoryMonitor.getInstance();
