# DatabaseService

SQLite-based database service for NovaGet download manager.

## Features

- ✅ Complete CRUD operations for downloads
- ✅ Segment progress tracking for resume support
- ✅ Settings management
- ✅ Speed history tracking
- ✅ Statistics and analytics
- ✅ Migration system for schema updates
- ✅ Foreign key constraints
- ✅ Indexed queries for performance

## Usage

```typescript
import { DatabaseService } from './services/database';

// Initialize database
const db = new DatabaseService();

// Create a download
const downloadId = db.createDownload({
  url: 'https://example.com/file.zip',
  filename: 'file.zip',
  directory: '/downloads',
  total_bytes: 1024000,
  downloaded_bytes: 0,
  status: 'queued',
  created_at: Date.now(),
});

// Update download progress
db.updateDownload(downloadId, {
  downloaded_bytes: 512000,
  status: 'downloading',
});

// Save segment progress
db.saveSegmentProgress(downloadId, [
  {
    download_id: downloadId,
    segment_number: 0,
    start_byte: 0,
    end_byte: 256000,
    downloaded_bytes: 256000,
    status: 'completed',
  },
]);

// Get statistics
const stats = db.getStatistics();
console.log(`Total downloads: ${stats.totalDownloads}`);

// Settings
db.setSetting('max_concurrent_downloads', '5');
const maxDownloads = db.getSetting('max_concurrent_downloads');

// Close database
db.close();
```

## Database Schema

### downloads
- `id` (TEXT, PRIMARY KEY): Unique download identifier
- `url` (TEXT): Download URL
- `filename` (TEXT): File name
- `directory` (TEXT): Save directory
- `total_bytes` (INTEGER): Total file size
- `downloaded_bytes` (INTEGER): Downloaded bytes
- `status` (TEXT): queued | downloading | paused | completed | failed
- `category` (TEXT): AI-detected category
- `tags` (TEXT): JSON array of tags
- `ai_suggested_name` (TEXT): AI-suggested filename
- `scheduled_time` (INTEGER): Unix timestamp for scheduled downloads
- `speed_limit` (INTEGER): Speed limit in bytes/second
- `created_at` (INTEGER): Creation timestamp
- `completed_at` (INTEGER): Completion timestamp
- `error_message` (TEXT): Error message if failed

### segments
- `id` (INTEGER, PRIMARY KEY): Auto-increment ID
- `download_id` (TEXT, FOREIGN KEY): Reference to download
- `segment_number` (INTEGER): Segment index
- `start_byte` (INTEGER): Start byte position
- `end_byte` (INTEGER): End byte position
- `downloaded_bytes` (INTEGER): Downloaded bytes for this segment
- `status` (TEXT): pending | downloading | completed | failed
- `temp_file_path` (TEXT): Temporary file path

### settings
- `key` (TEXT, PRIMARY KEY): Setting key
- `value` (TEXT): Setting value
- `updated_at` (INTEGER): Last update timestamp

### speed_history
- `id` (INTEGER, PRIMARY KEY): Auto-increment ID
- `download_id` (TEXT, FOREIGN KEY): Reference to download
- `speed` (INTEGER): Speed in bytes/second
- `timestamp` (INTEGER): Measurement timestamp

## Migration System

The database includes a migration system for schema updates:

```typescript
// migrations.ts
export const MIGRATIONS: Record<number, string> = {
  2: `ALTER TABLE downloads ADD COLUMN new_field TEXT;`,
  3: `CREATE INDEX idx_new_field ON downloads(new_field);`,
};
```

Migrations run automatically on database initialization.

## API Reference

### Download Operations
- `createDownload(record)`: Create new download
- `updateDownload(id, updates)`: Update download
- `getDownload(id)`: Get download by ID
- `getAllDownloads()`: Get all downloads
- `getDownloadsByStatus(status)`: Get downloads by status
- `getDownloadsByCategory(category)`: Get downloads by category
- `deleteDownload(id)`: Delete download

### Segment Operations
- `saveSegmentProgress(downloadId, segments)`: Save all segments
- `getSegmentProgress(downloadId)`: Get all segments
- `updateSegment(downloadId, segmentNumber, updates)`: Update single segment

### Settings Operations
- `getSetting(key)`: Get setting value
- `setSetting(key, value)`: Set setting value
- `getAllSettings()`: Get all settings
- `deleteSetting(key)`: Delete setting

### Speed History Operations
- `addSpeedHistory(downloadId, speed)`: Add speed entry
- `getSpeedHistory(downloadId, limit)`: Get speed history
- `cleanOldSpeedHistory()`: Clean old entries (>24h)

### Statistics Operations
- `getStatistics()`: Get overall statistics
- `getStatisticsByCategory()`: Get stats by category
- `getStatisticsByDateRange(start, end)`: Get stats for date range

### Utility Methods
- `close()`: Close database connection
- `getDatabase()`: Get raw database instance
- `reset()`: Reset database (dev/test only)
