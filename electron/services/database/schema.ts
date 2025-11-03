/**
 * Database schema definitions and migrations
 */

export const SCHEMA_VERSION = 1;

export const INITIAL_SCHEMA = `
-- Downloads table
CREATE TABLE IF NOT EXISTS downloads (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  directory TEXT NOT NULL,
  total_bytes INTEGER NOT NULL DEFAULT 0,
  downloaded_bytes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('queued', 'downloading', 'paused', 'completed', 'failed')),
  category TEXT,
  tags TEXT,
  ai_suggested_name TEXT,
  scheduled_time INTEGER,
  speed_limit INTEGER,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
CREATE INDEX IF NOT EXISTS idx_downloads_created_at ON downloads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_downloads_category ON downloads(category);

-- Segments table
CREATE TABLE IF NOT EXISTS segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  download_id TEXT NOT NULL,
  segment_number INTEGER NOT NULL,
  start_byte INTEGER NOT NULL,
  end_byte INTEGER NOT NULL,
  downloaded_bytes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('pending', 'downloading', 'completed', 'failed')),
  temp_file_path TEXT,
  FOREIGN KEY (download_id) REFERENCES downloads(id) ON DELETE CASCADE,
  UNIQUE(download_id, segment_number)
);

CREATE INDEX IF NOT EXISTS idx_segments_download_id ON segments(download_id);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Speed history table
CREATE TABLE IF NOT EXISTS speed_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  download_id TEXT NOT NULL,
  speed INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (download_id) REFERENCES downloads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_speed_history_download_id ON speed_history(download_id, timestamp DESC);

-- Schema version table
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);
`;

export const MIGRATIONS: Record<number, string> = {
  // Future migrations will be added here
  // Example:
  // 2: `ALTER TABLE downloads ADD COLUMN new_field TEXT;`
};
