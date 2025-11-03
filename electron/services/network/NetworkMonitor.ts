import { EventEmitter } from 'events';
import axios from 'axios';

export interface NetworkStatus {
  online: boolean;
  lastCheck: number;
}

/**
 * NetworkMonitor detects network connectivity changes
 * Auto-pauses downloads on disconnect and resumes on reconnect
 */
export class NetworkMonitor extends EventEmitter {
  private isOnline: boolean = true;
  private checkInterval: NodeJS.Timeout | null = null;
  private checkIntervalMs: number = 5000; // Check every 5 seconds
  private testUrls: string[] = [
    'https://www.google.com',
    'https://www.cloudflare.com',
    'https://1.1.1.1',
  ];

  constructor() {
    super();
    // Start with assumption that we're online
    this.isOnline = true;
  }

  /**
   * Start monitoring network status
   */
  start(): void {
    if (this.checkInterval) {
      return;
    }

    // Initial check
    this.checkConnection();

    // Periodic checks
    this.checkInterval = setInterval(() => {
      this.checkConnection();
    }, this.checkIntervalMs);

    console.log('Network monitor started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    console.log('Network monitor stopped');
  }

  /**
   * Check network connection
   */
  private async checkConnection(): Promise<void> {
    const wasOnline = this.isOnline;

    try {
      // Try to reach one of the test URLs
      const online = await this.testConnection();
      this.isOnline = online;

      // Emit events on status change
      if (wasOnline && !online) {
        console.log('Network connection lost');
        this.emit('offline');
      } else if (!wasOnline && online) {
        console.log('Network connection restored');
        this.emit('online');
      }
    } catch (error) {
      // If check fails, assume offline
      if (wasOnline) {
        this.isOnline = false;
        console.log('Network connection lost (check failed)');
        this.emit('offline');
      }
    }
  }

  /**
   * Test connection by trying to reach test URLs
   */
  private async testConnection(): Promise<boolean> {
    // Try each test URL
    for (const url of this.testUrls) {
      try {
        await axios.head(url, {
          timeout: 3000,
          validateStatus: () => true, // Accept any status code
        });
        return true; // If any URL responds, we're online
      } catch {
        // Continue to next URL
      }
    }

    return false; // All URLs failed
  }

  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    return {
      online: this.isOnline,
      lastCheck: Date.now(),
    };
  }

  /**
   * Check if currently online
   */
  isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Force a connection check
   */
  async forceCheck(): Promise<boolean> {
    await this.checkConnection();
    return this.isOnline;
  }
}
