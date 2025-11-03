#!/usr/bin/env node

/**
 * NovaGet Native Messaging Host
 * 
 * This script acts as a bridge between the browser extension and the NovaGet Electron app.
 * It receives messages from the browser via stdin and communicates with the Electron app
 * via IPC or HTTP.
 */

const fs = require('fs');
const path = require('path');
const net = require('net');

// Configuration
const CONFIG = {
  // IPC socket path for communication with Electron app
  ipcSocketPath: process.platform === 'win32' 
    ? '\\\\.\\pipe\\novaget-ipc'
    : '/tmp/novaget-ipc.sock',
  
  // Fallback HTTP endpoint if socket is not available
  httpEndpoint: 'http://localhost:42069/api/downloads',
  
  // Log file path
  logFile: process.platform === 'win32'
    ? path.join(process.env.APPDATA, 'NovaGet', 'native-host.log')
    : path.join(process.env.HOME, '.novaget', 'native-host.log')
};

// Ensure log directory exists
const logDir = path.dirname(CONFIG.logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Logger utility
 */
class Logger {
  static log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };
    
    try {
      fs.appendFileSync(
        CONFIG.logFile,
        JSON.stringify(logEntry) + '\n'
      );
    } catch (error) {
      // Silently fail if logging fails
    }
  }

  static info(message, data) {
    this.log('INFO', message, data);
  }

  static error(message, data) {
    this.log('ERROR', message, data);
  }

  static debug(message, data) {
    this.log('DEBUG', message, data);
  }
}

/**
 * Native Messaging Protocol Handler
 */
class NativeMessagingHost {
  constructor() {
    this.messageBuffer = Buffer.alloc(0);
  }

  /**
   * Start listening for messages from the browser
   */
  start() {
    Logger.info('Native messaging host started');

    process.stdin.on('readable', () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) {
        this.messageBuffer = Buffer.concat([this.messageBuffer, chunk]);
        this.processMessages();
      }
    });

    process.stdin.on('end', () => {
      Logger.info('Native messaging host ended');
      process.exit(0);
    });

    process.on('uncaughtException', (error) => {
      Logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });
  }

  /**
   * Process incoming messages from the buffer
   */
  processMessages() {
    while (this.messageBuffer.length >= 4) {
      // Read message length (first 4 bytes, little-endian)
      const messageLength = this.messageBuffer.readUInt32LE(0);

      // Check if we have the complete message
      if (this.messageBuffer.length < 4 + messageLength) {
        break;
      }

      // Extract the message
      const messageBytes = this.messageBuffer.slice(4, 4 + messageLength);
      const messageText = messageBytes.toString('utf8');

      // Remove processed message from buffer
      this.messageBuffer = this.messageBuffer.slice(4 + messageLength);

      // Parse and handle the message
      try {
        const message = JSON.parse(messageText);
        this.handleMessage(message);
      } catch (error) {
        Logger.error('Failed to parse message', { error: error.message, messageText });
        this.sendResponse({
          success: false,
          error: 'Invalid message format'
        });
      }
    }
  }

  /**
   * Handle a message from the browser
   */
  async handleMessage(message) {
    Logger.info('Received message', { type: message.type });

    try {
      switch (message.type) {
        case 'ping':
          await this.handlePing();
          break;

        case 'download':
          await this.handleDownload(message.data);
          break;

        default:
          this.sendResponse({
            success: false,
            error: `Unknown message type: ${message.type}`
          });
      }
    } catch (error) {
      Logger.error('Error handling message', { 
        type: message.type, 
        error: error.message,
        stack: error.stack
      });
      
      this.sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle ping message (connection test)
   */
  async handlePing() {
    Logger.debug('Handling ping');
    
    // Try to connect to Electron app to verify it's running
    const isConnected = await this.testConnection();
    
    this.sendResponse({
      success: true,
      connected: isConnected,
      message: isConnected ? 'NovaGet is running' : 'NovaGet is not running'
    });
  }

  /**
   * Handle download message
   */
  async handleDownload(downloadData) {
    Logger.info('Handling download', { url: downloadData.url });

    // Validate download data
    if (!downloadData.url) {
      throw new Error('Download URL is required');
    }

    // Send to Electron app
    const result = await this.sendToElectronApp({
      type: 'add-download',
      data: {
        url: downloadData.url,
        filename: downloadData.filename,
        referrer: downloadData.referrer,
        mime: downloadData.mime,
        fileSize: downloadData.fileSize,
        source: 'browser-extension'
      }
    });

    this.sendResponse({
      success: true,
      downloadId: result.downloadId,
      message: 'Download added to NovaGet'
    });
  }

  /**
   * Test connection to Electron app
   */
  async testConnection() {
    try {
      // Try IPC socket first
      if (await this.testSocketConnection()) {
        return true;
      }

      // Fallback to HTTP
      if (await this.testHttpConnection()) {
        return true;
      }

      return false;
    } catch (error) {
      Logger.error('Connection test failed', { error: error.message });
      return false;
    }
  }

  /**
   * Test IPC socket connection
   */
  testSocketConnection() {
    return new Promise((resolve) => {
      const client = net.createConnection(CONFIG.ipcSocketPath);
      
      client.on('connect', () => {
        client.end();
        resolve(true);
      });

      client.on('error', () => {
        resolve(false);
      });

      setTimeout(() => {
        client.destroy();
        resolve(false);
      }, 1000);
    });
  }

  /**
   * Test HTTP connection
   */
  async testHttpConnection() {
    try {
      const http = require('http');
      
      return new Promise((resolve) => {
        const req = http.get(CONFIG.httpEndpoint.replace('/api/downloads', '/api/health'), (res) => {
          resolve(res.statusCode === 200);
        });

        req.on('error', () => {
          resolve(false);
        });

        req.setTimeout(1000, () => {
          req.destroy();
          resolve(false);
        });
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Send message to Electron app
   */
  async sendToElectronApp(message) {
    // Try IPC socket first
    try {
      return await this.sendViaSocket(message);
    } catch (socketError) {
      Logger.debug('Socket communication failed, trying HTTP', { error: socketError.message });
      
      // Fallback to HTTP
      try {
        return await this.sendViaHttp(message);
      } catch (httpError) {
        Logger.error('All communication methods failed', {
          socketError: socketError.message,
          httpError: httpError.message
        });
        throw new Error('Could not connect to NovaGet. Please ensure the app is running.');
      }
    }
  }

  /**
   * Send message via IPC socket
   */
  sendViaSocket(message) {
    return new Promise((resolve, reject) => {
      const client = net.createConnection(CONFIG.ipcSocketPath);
      let responseData = '';

      client.on('connect', () => {
        client.write(JSON.stringify(message) + '\n');
      });

      client.on('data', (data) => {
        responseData += data.toString();
      });

      client.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          resolve(response);
        } catch (error) {
          reject(new Error('Invalid response from NovaGet'));
        }
      });

      client.on('error', (error) => {
        reject(error);
      });

      setTimeout(() => {
        client.destroy();
        reject(new Error('Socket connection timeout'));
      }, 5000);
    });
  }

  /**
   * Send message via HTTP
   */
  async sendViaHttp(message) {
    const http = require('http');
    const url = require('url');

    return new Promise((resolve, reject) => {
      const parsedUrl = url.parse(CONFIG.httpEndpoint);
      const postData = JSON.stringify(message.data);

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(responseData);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid response from NovaGet'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('HTTP request timeout'));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Send response back to the browser
   */
  sendResponse(response) {
    try {
      const message = JSON.stringify(response);
      const messageBytes = Buffer.from(message, 'utf8');
      const lengthBytes = Buffer.alloc(4);
      lengthBytes.writeUInt32LE(messageBytes.length, 0);

      process.stdout.write(lengthBytes);
      process.stdout.write(messageBytes);

      Logger.debug('Sent response', { response });
    } catch (error) {
      Logger.error('Failed to send response', { error: error.message });
    }
  }
}

// Start the native messaging host
const host = new NativeMessagingHost();
host.start();
