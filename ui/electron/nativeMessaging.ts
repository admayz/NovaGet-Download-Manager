// Native Messaging Handler for Browser Extension Communication
// Handles stdin/stdout communication with browser extensions

import { BrowserWindow } from 'electron';
import * as readline from 'readline';

interface NativeMessage {
  type: string;
  [key: string]: any;
}

interface DownloadRequest {
  type: 'DOWNLOAD_REQUEST';
  url: string;
  filename?: string;
  fileSize?: number;
  mime?: string;
  referrer?: string;
  cookies?: Array<{ name: string; value: string; domain: string; path: string }>;
  headers?: Record<string, string>;
  timestamp?: number;
}

export class NativeMessagingHost {
  private mainWindow: BrowserWindow | null = null;
  private messageBuffer: Buffer = Buffer.alloc(0);

  constructor(mainWindow: BrowserWindow | null) {
    this.mainWindow = mainWindow;
  }

  /**
   * Initialize native messaging host
   * Listens to stdin for messages from browser extension
   */
  public initialize(): void {
    // Check if running as native messaging host
    if (process.argv.includes('--native-messaging-host')) {
      console.error('[Native Messaging] Starting in native messaging mode');
      this.startNativeMessaging();
    }
  }

  /**
   * Start listening for native messaging protocol messages
   */
  private startNativeMessaging(): void {
    // Set stdin to binary mode
    process.stdin.setEncoding('binary');

    // Read messages from stdin
    const rl = readline.createInterface({
      input: process.stdin,
      terminal: false,
    });

    let messageLength = 0;
    let messageData = '';

    process.stdin.on('data', (chunk: Buffer) => {
      this.messageBuffer = Buffer.concat([this.messageBuffer, chunk]);

      while (this.messageBuffer.length >= 4) {
        // Read message length (first 4 bytes, little-endian)
        if (messageLength === 0) {
          messageLength = this.messageBuffer.readUInt32LE(0);
          this.messageBuffer = this.messageBuffer.slice(4);
        }

        // Check if we have the complete message
        if (this.messageBuffer.length >= messageLength) {
          const messageBytes = this.messageBuffer.slice(0, messageLength);
          this.messageBuffer = this.messageBuffer.slice(messageLength);

          try {
            const message = JSON.parse(messageBytes.toString('utf8'));
            this.handleMessage(message);
          } catch (error) {
            console.error('[Native Messaging] Failed to parse message:', error);
          }

          messageLength = 0;
        } else {
          // Wait for more data
          break;
        }
      }
    });

    process.stdin.on('end', () => {
      console.error('[Native Messaging] stdin closed, exiting');
      process.exit(0);
    });

    // Send ready message
    this.sendMessage({ type: 'READY' });
  }

  /**
   * Handle incoming message from browser extension
   */
  private handleMessage(message: NativeMessage): void {
    console.error('[Native Messaging] Received message:', message.type);

    switch (message.type) {
      case 'DOWNLOAD_REQUEST':
        this.handleDownloadRequest(message as DownloadRequest);
        break;

      case 'SETTINGS_REQUEST':
        this.handleSettingsRequest();
        break;

      default:
        console.error('[Native Messaging] Unknown message type:', message.type);
    }
  }

  /**
   * Handle download request from browser extension
   */
  private async handleDownloadRequest(request: DownloadRequest): Promise<void> {
    try {
      console.error('[Native Messaging] Download request:', request.url);

      // Send to main window via IPC
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('browser-download-request', {
          url: request.url,
          filename: request.filename || '',
          fileSize: request.fileSize || 0,
          mime: request.mime || '',
          referrer: request.referrer || '',
          cookies: request.cookies || [],
          headers: request.headers || {},
        });

        // Send confirmation back to extension
        this.sendMessage({
          type: 'DOWNLOAD_STARTED',
          filename: request.filename || 'Unknown',
        });
      } else {
        // Window not available, send error
        this.sendMessage({
          type: 'DOWNLOAD_FAILED',
          filename: request.filename || 'Unknown',
          error: 'Application window not available',
        });
      }
    } catch (error) {
      console.error('[Native Messaging] Error handling download request:', error);
      this.sendMessage({
        type: 'DOWNLOAD_FAILED',
        filename: request.filename || 'Unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle settings request from browser extension
   */
  private handleSettingsRequest(): void {
    // TODO: Load settings from storage
    const settings = {
      enabled: true,
      interceptDownloads: true,
      minFileSize: 102400, // 100KB
      clipboardWatcher: false,
      autoStart: true,
    };

    this.sendMessage({
      type: 'SETTINGS_RESPONSE',
      settings: settings,
    });
  }

  /**
   * Send message to browser extension via stdout
   */
  public sendMessage(message: NativeMessage): void {
    try {
      const messageJson = JSON.stringify(message);
      const messageBuffer = Buffer.from(messageJson, 'utf8');
      const lengthBuffer = Buffer.alloc(4);
      lengthBuffer.writeUInt32LE(messageBuffer.length, 0);

      // Write length + message to stdout
      process.stdout.write(lengthBuffer);
      process.stdout.write(messageBuffer);

      console.error('[Native Messaging] Sent message:', message.type);
    } catch (error) {
      console.error('[Native Messaging] Failed to send message:', error);
    }
  }

  /**
   * Send download completed notification to extension
   */
  public notifyDownloadCompleted(filename: string): void {
    this.sendMessage({
      type: 'DOWNLOAD_COMPLETED',
      filename: filename,
    });
  }

  /**
   * Send download failed notification to extension
   */
  public notifyDownloadFailed(filename: string, error: string): void {
    this.sendMessage({
      type: 'DOWNLOAD_FAILED',
      filename: filename,
      error: error,
    });
  }
}

// Export singleton instance
let nativeMessagingHost: NativeMessagingHost | null = null;

export function initializeNativeMessaging(mainWindow: BrowserWindow | null): NativeMessagingHost {
  if (!nativeMessagingHost) {
    nativeMessagingHost = new NativeMessagingHost(mainWindow);
    nativeMessagingHost.initialize();
  }
  return nativeMessagingHost;
}

export function getNativeMessagingHost(): NativeMessagingHost | null {
  return nativeMessagingHost;
}
