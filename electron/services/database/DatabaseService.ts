/**
 * Database service using sql.js (no native dependencies)
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import {
  DownloadRecord,
  SegmentRecord,
  SettingsRecord,
  SpeedHistoryRecord,
  Statistics,
} from './types';

export class DatabaseService {
  private db: SqlJsDatabase | null = null;
  private dbPath: string;
  private initialized: boolean = false;

  constructor(dbPath?: string) {
    const defaultPath = path.join(app.getPath('userData'), 'novaget.db');
    this.dbPath = dbPath || defaultPath;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const SQL = await initSqlJs();
      
      // Load existing database or create new one
      if (fs.existsSync(this.dbPath)) {
        const buffer = fs.readFileSync(this.dbPath);
        this.db = new SQL.Database(buffer);
      } else {
        this.db = new SQL.Database();
        this.createTables();
      }

      this.initialized = true;
      console.log('Database initialized with sql.js');
    } catch (error) {
      console.error('Failed to initialize sql.js database:', error);
      throw error;
    }
  }

  private createTables(): void {
    if (!this.db) return;

    // Downloads table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS downloads (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        filename TEXT NOT NULL,
        directory TEXT NOT NULL,
        total_bytes INTEGER DEFAULT 0,
        downloaded_bytes INTEGER DEFAULT 0,
        status TEXT NOT NULL,
        category TEXT,
        tags TEXT,
        ai_suggested_name TEXT,
        scheduled_time INTEGER,
        speed_limit INTEGER,
        created_at INTEGER NOT NULL,
        completed_at INTEGER,
        error_message TEXT
      )
    `);

    // Create indexes for better query performance
    this.db.run('CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_downloads_created_at ON downloads(created_at DESC)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_downloads_category ON downloads(category)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_downloads_completed_at ON downloads(completed_at DESC)');

    // Segments table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS segments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        download_id TEXT NOT NULL,
        segment_number INTEGER NOT NULL,
        start_byte INTEGER NOT NULL,
        end_byte INTEGER NOT NULL,
        downloaded_bytes INTEGER DEFAULT 0,
        status TEXT NOT NULL,
        temp_file_path TEXT,
        FOREIGN KEY (download_id) REFERENCES downloads(id) ON DELETE CASCADE,
        UNIQUE(download_id, segment_number)
      )
    `);

    // Create indexes for segments
    this.db.run('CREATE INDEX IF NOT EXISTS idx_segments_download_id ON segments(download_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_segments_status ON segments(status)');

    // Settings table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Speed history table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS speed_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        download_id TEXT NOT NULL,
        speed REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (download_id) REFERENCES downloads(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for speed history
    this.db.run('CREATE INDEX IF NOT EXISTS idx_speed_history_download_id ON speed_history(download_id, timestamp DESC)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_speed_history_timestamp ON speed_history(timestamp)');

    this.save();
  }

  private save(): void {
    if (!this.db) return;

    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.dbPath, buffer);
    } catch (error) {
      console.error('Failed to save database:', error);
    }
  }

  // ==================== Download Operations ====================

  createDownload(record: Omit<DownloadRecord, 'id'>): string {
    if (!this.db) throw new Error('Database not initialized');

    const id = this.generateId();
    this.db.run(
      `INSERT INTO downloads (
        id, url, filename, directory, total_bytes, downloaded_bytes,
        status, category, tags, ai_suggested_name, scheduled_time,
        speed_limit, created_at, completed_at, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        record.url,
        record.filename,
        record.directory,
        record.total_bytes,
        record.downloaded_bytes,
        record.status,
        record.category || null,
        record.tags || null,
        record.ai_suggested_name || null,
        record.scheduled_time || null,
        record.speed_limit || null,
        record.created_at,
        record.completed_at || null,
        record.error_message || null,
      ]
    );

    this.save();
    return id;
  }

  updateDownload(id: string, updates: Partial<DownloadRecord>): void {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    values.push(id);
    this.db.run(`UPDATE downloads SET ${fields.join(', ')} WHERE id = ?`, values);
    this.save();
  }

  getDownload(id: string): DownloadRecord | null {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec('SELECT * FROM downloads WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return null;

    return this.rowToDownloadRecord(result[0].columns, result[0].values[0]);
  }

  getAllDownloads(): DownloadRecord[] {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec('SELECT * FROM downloads ORDER BY created_at DESC');
    if (result.length === 0) return [];

    return result[0].values.map((row) =>
      this.rowToDownloadRecord(result[0].columns, row)
    );
  }

  getDownloadsByStatus(status: DownloadRecord['status']): DownloadRecord[] {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec(
      'SELECT * FROM downloads WHERE status = ? ORDER BY created_at DESC',
      [status]
    );
    if (result.length === 0) return [];

    return result[0].values.map((row) =>
      this.rowToDownloadRecord(result[0].columns, row)
    );
  }

  getDownloadsByCategory(category: string): DownloadRecord[] {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec(
      'SELECT * FROM downloads WHERE category = ? ORDER BY created_at DESC',
      [category]
    );
    if (result.length === 0) return [];

    return result[0].values.map((row) =>
      this.rowToDownloadRecord(result[0].columns, row)
    );
  }

  deleteDownload(id: string): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run('DELETE FROM downloads WHERE id = ?', [id]);
    this.save();
  }

  // ==================== Batch Operations ====================

  /**
   * Batch update multiple downloads - more efficient than individual updates
   */
  batchUpdateDownloads(updates: Array<{ id: string; updates: Partial<DownloadRecord> }>): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run('BEGIN TRANSACTION');
    
    try {
      for (const { id, updates: downloadUpdates } of updates) {
        const fields: string[] = [];
        const values: any[] = [];

        Object.entries(downloadUpdates).forEach(([key, value]) => {
          if (key !== 'id') {
            fields.push(`${key} = ?`);
            values.push(value);
          }
        });

        if (fields.length > 0) {
          values.push(id);
          this.db.run(`UPDATE downloads SET ${fields.join(', ')} WHERE id = ?`, values);
        }
      }

      this.db.run('COMMIT');
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }

    this.save();
  }

  /**
   * Batch insert speed history records
   */
  batchAddSpeedHistory(records: Array<{ downloadId: string; speed: number; timestamp?: number }>): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run('BEGIN TRANSACTION');
    
    try {
      for (const record of records) {
        const timestamp = record.timestamp || Date.now();
        this.db.run(
          'INSERT INTO speed_history (download_id, speed, timestamp) VALUES (?, ?, ?)',
          [record.downloadId, record.speed, timestamp]
        );
      }

      this.db.run('COMMIT');
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }

    this.save();
  }

  /**
   * Batch delete downloads
   */
  batchDeleteDownloads(ids: string[]): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run('BEGIN TRANSACTION');
    
    try {
      for (const id of ids) {
        this.db.run('DELETE FROM downloads WHERE id = ?', [id]);
      }

      this.db.run('COMMIT');
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }

    this.save();
  }

  // ==================== Segment Operations ====================

  saveSegmentProgress(downloadId: string, segments: SegmentRecord[]): void {
    if (!this.db) throw new Error('Database not initialized');

    // Use transaction for batch operations - much faster
    this.db.run('BEGIN TRANSACTION');
    
    try {
      this.db.run('DELETE FROM segments WHERE download_id = ?', [downloadId]);

      // Batch insert segments
      for (const segment of segments) {
        this.db.run(
          `INSERT INTO segments (
            download_id, segment_number, start_byte, end_byte,
            downloaded_bytes, status, temp_file_path
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            segment.download_id,
            segment.segment_number,
            segment.start_byte,
            segment.end_byte,
            segment.downloaded_bytes,
            segment.status,
            segment.temp_file_path || null,
          ]
        );
      }

      this.db.run('COMMIT');
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }

    this.save();
  }

  getSegmentProgress(downloadId: string): SegmentRecord[] {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec(
      'SELECT * FROM segments WHERE download_id = ? ORDER BY segment_number',
      [downloadId]
    );
    if (result.length === 0) return [];

    return result[0].values.map((row) => this.rowToSegmentRecord(result[0].columns, row));
  }

  updateSegment(
    downloadId: string,
    segmentNumber: number,
    updates: Partial<SegmentRecord>
  ): void {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'download_id' && key !== 'segment_number') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    values.push(downloadId, segmentNumber);
    this.db.run(
      `UPDATE segments SET ${fields.join(', ')} WHERE download_id = ? AND segment_number = ?`,
      values
    );
    this.save();
  }

  // ==================== Settings Operations ====================

  getSetting(key: string): string | null {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec('SELECT value FROM settings WHERE key = ?', [key]);
    if (result.length === 0 || result[0].values.length === 0) return null;

    return result[0].values[0][0] as string;
  }

  setSetting(key: string, value: string): void {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    
    // Check if exists
    const existing = this.getSetting(key);
    if (existing !== null) {
      this.db.run('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?', [
        value,
        now,
        key,
      ]);
    } else {
      this.db.run('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)', [
        key,
        value,
        now,
      ]);
    }

    this.save();
  }

  getAllSettings(): Record<string, string> {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec('SELECT key, value FROM settings');
    if (result.length === 0) return {};

    const settings: Record<string, string> = {};
    result[0].values.forEach((row) => {
      settings[row[0] as string] = row[1] as string;
    });

    return settings;
  }

  deleteSetting(key: string): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run('DELETE FROM settings WHERE key = ?', [key]);
    this.save();
  }

  // ==================== Speed History Operations ====================

  addSpeedHistory(downloadId: string, speed: number): void {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    this.db.run('INSERT INTO speed_history (download_id, speed, timestamp) VALUES (?, ?, ?)', [
      downloadId,
      speed,
      now,
    ]);
    this.save();
  }

  getSpeedHistory(downloadId: string, limit: number = 60): SpeedHistoryRecord[] {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec(
      'SELECT * FROM speed_history WHERE download_id = ? ORDER BY timestamp DESC LIMIT ?',
      [downloadId, limit]
    );
    if (result.length === 0) return [];

    return result[0].values.map((row) =>
      this.rowToSpeedHistoryRecord(result[0].columns, row)
    );
  }

  cleanOldSpeedHistory(): void {
    if (!this.db) throw new Error('Database not initialized');

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.db.run('DELETE FROM speed_history WHERE timestamp < ?', [oneDayAgo]);
    this.save();
  }

  // ==================== Statistics Operations ====================

  getStatistics(): Statistics {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec(`
      SELECT 
        COUNT(*) as totalDownloads,
        SUM(total_bytes) as totalBytes,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedDownloads,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedDownloads
      FROM downloads
    `);

    const stats = result.length > 0 ? result[0].values[0] : [0, 0, 0, 0];

    return {
      totalDownloads: (stats[0] as number) || 0,
      totalBytes: (stats[1] as number) || 0,
      completedDownloads: (stats[2] as number) || 0,
      failedDownloads: (stats[3] as number) || 0,
      averageSpeed: 0,
    };
  }

  getStatisticsByCategory(): Record<string, { count: number; totalBytes: number }> {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec(`
      SELECT category, COUNT(*) as count, SUM(total_bytes) as totalBytes
      FROM downloads
      WHERE category IS NOT NULL
      GROUP BY category
    `);

    const stats: Record<string, { count: number; totalBytes: number }> = {};
    if (result.length > 0) {
      result[0].values.forEach((row) => {
        stats[row[0] as string] = {
          count: row[1] as number,
          totalBytes: (row[2] as number) || 0,
        };
      });
    }

    return stats;
  }

  getStatisticsByDateRange(startDate: number, endDate: number): Statistics {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec(
      `SELECT 
        COUNT(*) as totalDownloads,
        SUM(total_bytes) as totalBytes,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedDownloads,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedDownloads
      FROM downloads
      WHERE created_at >= ? AND created_at <= ?`,
      [startDate, endDate]
    );

    const stats = result.length > 0 ? result[0].values[0] : [0, 0, 0, 0];

    return {
      totalDownloads: (stats[0] as number) || 0,
      totalBytes: (stats[1] as number) || 0,
      completedDownloads: (stats[2] as number) || 0,
      failedDownloads: (stats[3] as number) || 0,
      averageSpeed: 0,
    };
  }

  // ==================== Utility Methods ====================

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private rowToDownloadRecord(columns: string[], row: any[]): DownloadRecord {
    const record: any = {};
    columns.forEach((col, i) => {
      record[col] = row[i];
    });
    return record as DownloadRecord;
  }

  private rowToSegmentRecord(columns: string[], row: any[]): SegmentRecord {
    const record: any = {};
    columns.forEach((col, i) => {
      record[col] = row[i];
    });
    return record as SegmentRecord;
  }

  private rowToSpeedHistoryRecord(columns: string[], row: any[]): SpeedHistoryRecord {
    const record: any = {};
    columns.forEach((col, i) => {
      record[col] = row[i];
    });
    return record as SpeedHistoryRecord;
  }

  close(): void {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
    }
  }

  reset(): void {
    if (this.db) {
      this.db.run('DROP TABLE IF EXISTS downloads');
      this.db.run('DROP TABLE IF EXISTS segments');
      this.db.run('DROP TABLE IF EXISTS settings');
      this.db.run('DROP TABLE IF EXISTS speed_history');
      this.createTables();
    }
  }

  /**
   * Optimize database performance
   * Should be called periodically (e.g., on app startup or shutdown)
   */
  optimize(): void {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Analyze tables to update query planner statistics
      this.db.run('ANALYZE');

      // Vacuum to reclaim space and defragment
      // Note: VACUUM cannot be run inside a transaction
      this.db.run('VACUUM');

      console.log('Database optimized successfully');
    } catch (error) {
      console.error('Failed to optimize database:', error);
    }
  }

  /**
   * Get database statistics
   */
  getDatabaseStats(): {
    downloadCount: number;
    segmentCount: number;
    speedHistoryCount: number;
    settingsCount: number;
  } {
    if (!this.db) throw new Error('Database not initialized');

    const downloadCount = this.db.exec('SELECT COUNT(*) FROM downloads')[0]?.values[0][0] as number || 0;
    const segmentCount = this.db.exec('SELECT COUNT(*) FROM segments')[0]?.values[0][0] as number || 0;
    const speedHistoryCount = this.db.exec('SELECT COUNT(*) FROM speed_history')[0]?.values[0][0] as number || 0;
    const settingsCount = this.db.exec('SELECT COUNT(*) FROM settings')[0]?.values[0][0] as number || 0;

    return {
      downloadCount,
      segmentCount,
      speedHistoryCount,
      settingsCount,
    };
  }
}
