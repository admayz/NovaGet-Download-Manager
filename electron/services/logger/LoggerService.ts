import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: any;
}

/**
 * LoggerService handles application logging
 * Logs to console and optionally to file
 */
export class LoggerService {
  private logDir: string;
  private logFile: string;
  private enableFileLogging: boolean;

  constructor(enableFileLogging: boolean = true) {
    this.enableFileLogging = enableFileLogging;
    this.logDir = path.join(app.getPath('userData'), 'logs');
    this.logFile = path.join(this.logDir, `novaget-${this.getDateString()}.log`);

    if (this.enableFileLogging) {
      this.ensureLogDirectory();
    }
  }

  /**
   * Log an error
   */
  error(context: string, message: string, data?: any): void {
    this.log('error', context, message, data);
  }

  /**
   * Log a warning
   */
  warn(context: string, message: string, data?: any): void {
    this.log('warn', context, message, data);
  }

  /**
   * Log info
   */
  info(context: string, message: string, data?: any): void {
    this.log('info', context, message, data);
  }

  /**
   * Log debug info
   */
  debug(context: string, message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', context, message, data);
    }
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, context: string, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      data,
    };

    // Log to console
    this.logToConsole(entry);

    // Log to file if enabled
    if (this.enableFileLogging) {
      this.logToFile(entry);
    }
  }

  /**
   * Log to console with colors
   */
  private logToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context}]`;
    const message = entry.message;

    switch (entry.level) {
      case 'error':
        console.error(prefix, message, entry.data || '');
        break;
      case 'warn':
        console.warn(prefix, message, entry.data || '');
        break;
      case 'info':
        console.info(prefix, message, entry.data || '');
        break;
      case 'debug':
        console.debug(prefix, message, entry.data || '');
        break;
    }
  }

  /**
   * Log to file
   */
  private logToFile(entry: LogEntry): void {
    try {
      const logLine = this.formatLogEntry(entry);
      fs.appendFileSync(this.logFile, logLine + '\n', 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Format log entry for file
   */
  private formatLogEntry(entry: LogEntry): string {
    const parts = [
      entry.timestamp,
      entry.level.toUpperCase().padEnd(5),
      entry.context.padEnd(20),
      entry.message,
    ];

    if (entry.data) {
      try {
        parts.push(JSON.stringify(entry.data));
      } catch {
        parts.push(String(entry.data));
      }
    }

    return parts.join(' | ');
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Get date string for log file name
   */
  private getDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Clean old log files (keep last 7 days)
   */
  cleanOldLogs(daysToKeep: number = 7): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        return;
      }

      const files = fs.readdirSync(this.logDir);
      const now = Date.now();
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000;

      files.forEach((file) => {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          fs.unlinkSync(filePath);
          this.info('LoggerService', `Deleted old log file: ${file}`);
        }
      });
    } catch (error) {
      console.error('Failed to clean old logs:', error);
    }
  }
}
