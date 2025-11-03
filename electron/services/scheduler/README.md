# SchedulerService

The SchedulerService manages scheduled downloads in NovaGet. It automatically checks for scheduled downloads every 30 seconds and starts them when their scheduled time arrives.

## Features

- **Automatic Scheduling**: Checks for scheduled downloads every 30 seconds
- **Missed Schedule Handling**: Automatically starts downloads that were scheduled while the system was offline
- **Event-Driven**: Emits events for monitoring and integration
- **Simple API**: Easy to schedule, cancel, and query scheduled downloads

## Usage

```typescript
import { SchedulerService } from './services/scheduler';
import { DatabaseService } from './services/database';
import { DownloadManager } from './services/download';

// Initialize dependencies
const db = new DatabaseService();
const downloadManager = new DownloadManager(db);

// Create scheduler service
const scheduler = new SchedulerService(db, downloadManager);

// Start the scheduler
scheduler.start();

// Schedule a download for a specific time
const downloadId = 'some-download-id';
const scheduledTime = new Date('2024-12-25T10:00:00');
scheduler.scheduleDownload(downloadId, scheduledTime);

// Get all scheduled downloads
const scheduled = scheduler.getScheduledDownloads();

// Get missed schedules
const missed = scheduler.getMissedSchedules();

// Cancel a schedule
scheduler.cancelSchedule(downloadId);

// Stop the scheduler when shutting down
scheduler.stop();
```

## Events

The SchedulerService emits the following events:

- `started`: Emitted when the scheduler starts
- `stopped`: Emitted when the scheduler stops
- `scheduledDownloadsChecked`: Emitted after each check cycle
- `downloadStarted`: Emitted when a scheduled download is started
- `downloadStartError`: Emitted when a scheduled download fails to start
- `downloadScheduled`: Emitted when a download is scheduled
- `scheduleCancelled`: Emitted when a schedule is cancelled
- `error`: Emitted when an error occurs during checking

### Event Listeners Example

```typescript
scheduler.on('downloadStarted', (data) => {
  console.log(`Download ${data.downloadId} started at ${data.actualStartTime}`);
});

scheduler.on('downloadStartError', (data) => {
  console.error(`Failed to start download ${data.downloadId}: ${data.error}`);
});

scheduler.on('scheduledDownloadsChecked', (data) => {
  console.log(`Checked ${data.count} scheduled downloads at ${data.timestamp}`);
});
```

## Requirements Fulfilled

This implementation satisfies the following requirements:

- **Requirement 4.1**: Stores scheduled time in SQLite database
- **Requirement 4.2**: Automatically starts downloads when scheduled time arrives
- **Requirement 4.3**: Checks for scheduled downloads every 30 seconds
- **Requirement 4.4**: Handles missed schedules on system startup

## Integration with Main Process

The SchedulerService should be initialized in the Electron main process and started when the application launches:

```typescript
// In electron/index.ts
import { app } from 'electron';
import { DatabaseService } from './services/database';
import { DownloadManager } from './services/download';
import { SchedulerService } from './services/scheduler';

let scheduler: SchedulerService;

app.on('ready', () => {
  const db = new DatabaseService();
  const downloadManager = new DownloadManager(db);
  
  // Initialize and start scheduler
  scheduler = new SchedulerService(db, downloadManager);
  scheduler.start();
});

app.on('quit', () => {
  // Stop scheduler on app quit
  if (scheduler) {
    scheduler.stop();
  }
});
```
