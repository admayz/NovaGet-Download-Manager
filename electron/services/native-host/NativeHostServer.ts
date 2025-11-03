import * as net from 'net';
import * as http from 'http';
import * as path from 'path';
import { DownloadManager } from '../download/DownloadManager';

/**
 * NativeHostServer provides communication endpoints for the browser extension's native host
 * Supports both IPC socket and HTTP fallback
 */
export class NativeHostServer {
  private downloadManager: DownloadManager;
  private socketServer?: net.Server;
  private httpServer?: http.Server;
  private socketPath: string;
  private httpPort: number;

  constructor(downloadManager: DownloadManager) {
    this.downloadManager = downloadManager;
    
    // Platform-specific socket path
    this.socketPath = process.platform === 'win32'
      ? '\\\\.\\pipe\\novaget-ipc'
      : '/tmp/novaget-ipc.sock';
    
    this.httpPort = 42069;
  }

  /**
   * Start both IPC socket and HTTP servers
   */
  async start(): Promise<void> {
    await this.startSocketServer();
    await this.startHttpServer();
    console.log('Native host server started');
  }

  /**
   * Start IPC socket server
   */
  private async startSocketServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Clean up existing socket file on Unix
      if (process.platform !== 'win32') {
        const fs = require('fs');
        if (fs.existsSync(this.socketPath)) {
          fs.unlinkSync(this.socketPath);
        }
      }

      this.socketServer = net.createServer((socket) => {
        let data = '';

        socket.on('data', (chunk) => {
          data += chunk.toString();

          // Check if we have a complete message (ends with newline)
          if (data.includes('\n')) {
            const messages = data.split('\n');
            data = messages.pop() || ''; // Keep incomplete message

            messages.forEach((messageText) => {
              if (messageText.trim()) {
                this.handleSocketMessage(messageText, socket);
              }
            });
          }
        });

        socket.on('error', (error) => {
          console.error('Socket client error:', error);
        });
      });

      this.socketServer.on('error', (error) => {
        console.error('Socket server error:', error);
        reject(error);
      });

      this.socketServer.listen(this.socketPath, () => {
        console.log(`IPC socket server listening on ${this.socketPath}`);
        resolve();
      });
    });
  }

  /**
   * Start HTTP fallback server
   */
  private async startHttpServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer((req, res) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // Handle preflight
        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        // Health check endpoint
        if (req.url === '/api/health' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', service: 'NovaGet' }));
          return;
        }

        // Download endpoint
        if (req.url === '/api/downloads' && req.method === 'POST') {
          let body = '';

          req.on('data', (chunk) => {
            body += chunk.toString();
          });

          req.on('end', () => {
            this.handleHttpMessage(body, res);
          });

          return;
        }

        // Not found
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      });

      this.httpServer.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.warn(`Port ${this.httpPort} is in use, trying next port...`);
          this.httpPort++;
          this.httpServer?.listen(this.httpPort);
        } else {
          console.error('HTTP server error:', error);
          reject(error);
        }
      });

      this.httpServer.listen(this.httpPort, () => {
        console.log(`HTTP fallback server listening on port ${this.httpPort}`);
        resolve();
      });
    });
  }

  /**
   * Handle message from socket client
   */
  private async handleSocketMessage(messageText: string, socket: net.Socket): Promise<void> {
    try {
      const message = JSON.parse(messageText);
      const response = await this.processMessage(message);
      
      socket.write(JSON.stringify(response) + '\n');
      socket.end();
    } catch (error) {
      const errorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      socket.write(JSON.stringify(errorResponse) + '\n');
      socket.end();
    }
  }

  /**
   * Handle message from HTTP client
   */
  private async handleHttpMessage(body: string, res: http.ServerResponse): Promise<void> {
    try {
      const message = JSON.parse(body);
      const response = await this.processMessage(message);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    } catch (error) {
      const errorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(errorResponse));
    }
  }

  /**
   * Process message from native host
   */
  private async processMessage(message: any): Promise<any> {
    switch (message.type) {
      case 'add-download':
        return await this.handleAddDownload(message.data);
      
      case 'ping':
        return { success: true, message: 'pong' };
      
      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle add download request
   */
  private async handleAddDownload(data: any): Promise<any> {
    try {
      // Get default download directory from settings or use system default
      const defaultDirectory = process.env.USERPROFILE 
        ? path.join(process.env.USERPROFILE, 'Downloads')
        : path.join(process.env.HOME || '~', 'Downloads');

      const downloadId = await this.downloadManager.addDownload({
        url: data.url,
        filename: data.filename || undefined,
        directory: defaultDirectory,
        headers: data.referrer ? { Referer: data.referrer } : undefined
      });

      return {
        success: true,
        downloadId,
        message: 'Download added successfully'
      };
    } catch (error) {
      throw new Error(`Failed to add download: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stop both servers
   */
  async stop(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.socketServer) {
      promises.push(
        new Promise((resolve) => {
          this.socketServer!.close(() => {
            console.log('IPC socket server stopped');
            resolve();
          });
        })
      );
    }

    if (this.httpServer) {
      promises.push(
        new Promise((resolve) => {
          this.httpServer!.close(() => {
            console.log('HTTP fallback server stopped');
            resolve();
          });
        })
      );
    }

    await Promise.all(promises);

    // Clean up socket file on Unix
    if (process.platform !== 'win32') {
      const fs = require('fs');
      if (fs.existsSync(this.socketPath)) {
        fs.unlinkSync(this.socketPath);
      }
    }
  }

  /**
   * Get server info
   */
  getInfo(): { socketPath: string; httpPort: number } {
    return {
      socketPath: this.socketPath,
      httpPort: this.httpPort
    };
  }
}
