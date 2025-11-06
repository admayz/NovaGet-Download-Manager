import { createServer, Server, IncomingMessage, ServerResponse } from 'http';
import { DownloadManager } from '../download/DownloadManager';
import { DownloadOptions } from '../download/Download';

/**
 * HTTP server for native messaging communication
 * Allows browser extension to communicate with Electron app
 */
export class NativeMessagingServer {
  private server: Server | null = null;
  private port: number;
  private downloadManager: DownloadManager;

  constructor(downloadManager: DownloadManager, port: number = 42069) {
    this.downloadManager = downloadManager;
    this.port = port;
  }

  /**
   * Start the HTTP server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.warn(`Port ${this.port} is already in use, trying next port...`);
          this.port++;
          this.server?.listen(this.port);
        } else {
          console.error('Native messaging server error:', error);
          reject(error);
        }
      });

      this.server.listen(this.port, () => {
        console.log(`Native messaging server listening on port ${this.port}`);
        resolve();
      });
    });
  }

  /**
   * Stop the HTTP server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Native messaging server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle incoming HTTP requests
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
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
      res.end(JSON.stringify({ status: 'ok', message: 'NovaGet is running' }));
      return;
    }

    // Register extension ID endpoint
    if (req.url === '/api/register-extension' && req.method === 'POST') {
      try {
        const body = await this.readBody(req);
        const data = JSON.parse(body);
        
        if (data.extensionId && data.browser === 'chrome') {
          console.log('📝 Chrome extension ID received:', data.extensionId);
          
          // Update native host manifest
          const fs = require('fs');
          const path = require('path');
          const manifestPath = path.join(__dirname, '../../../native-host/com.novaget.host.json');
          
          if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            manifest.allowed_origins = [`chrome-extension://${data.extensionId}/`];
            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
            console.log('✓ Native host manifest updated automatically');
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Extension ID registered' }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid data' }));
        }
      } catch (error) {
        console.error('Error registering extension ID:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: (error as Error).message }));
      }
      return;
    }

    // Download endpoint
    if (req.url === '/api/downloads' && req.method === 'POST') {
      try {
        const body = await this.readBody(req);
        const data = JSON.parse(body);

        // Handle different message types
        if (data.type === 'add-download') {
          const result = await this.handleAddDownload(data.data);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Unknown message type' }));
        }
      } catch (error) {
        console.error('Error handling download request:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: (error as Error).message 
        }));
      }
      return;
    }

    // 404 for unknown endpoints
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  /**
   * Read request body
   */
  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        resolve(body);
      });
      req.on('error', reject);
    });
  }

  /**
   * Handle add download request
   */
  private async handleAddDownload(data: any): Promise<any> {
    try {
      // Validate data
      if (!data.url) {
        throw new Error('URL is required');
      }

      // Get default download directory from settings
      const { app } = require('electron');
      const downloadDir = data.directory || app.getPath('downloads');

      // Create download options
      const options: DownloadOptions = {
        url: data.url,
        directory: downloadDir,
        filename: data.filename,
        segments: 8, // Default segments
      };

      // Add download
      const downloadId = await this.downloadManager.addDownload(options);

      return {
        success: true,
        downloadId,
        message: 'Download added successfully'
      };
    } catch (error) {
      console.error('Error adding download:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get server port
   */
  getPort(): number {
    return this.port;
  }
}
