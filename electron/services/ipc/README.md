# IPC Bridge Documentation

The IPC Bridge provides secure communication between the Electron main process and the Next.js renderer process.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Main Process                             │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Download       │  │ Database     │  │ IPC Bridge      │ │
│  │ Manager        │◄─┤ Service      │◄─┤                 │ │
│  └────────────────┘  └──────────────┘  └────────┬────────┘ │
└──────────────────────────────────────────────────┼──────────┘
                                                    │
                                          IPC Communication
                                                    │
┌──────────────────────────────────────────────────┼──────────┐
│                  Renderer Process                 │          │
│  ┌────────────────────────────────────────────────▼────────┐│
│  │              Preload Script (contextBridge)             ││
│  │  - Exposes safe API to window.electron                  ││
│  └────────────────────────────────────────────────┬────────┘│
│                                                    │          │
│  ┌────────────────────────────────────────────────▼────────┐│
│  │              React Components / Zustand Store           ││
│  │  - Uses window.electron API                             ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Usage in Renderer Process

### TypeScript Support

The API is fully typed. Import types from `@/types/electron`:

```typescript
import type { DownloadOptions, DownloadProgress } from '@/types/electron';
```

### Adding a Download

```typescript
const addDownload = async () => {
  const options: DownloadOptions = {
    url: 'https://example.com/file.zip',
    directory: 'C:\\Downloads',
    filename: 'myfile.zip',
    segments: 8,
    speedLimit: 1024 * 1024 * 5, // 5 MB/s
  };

  const response = await window.electron.download.add(options);
  
  if (response.success) {
    console.log('Download added:', response.downloadId);
  } else {
    console.error('Failed to add download:', response.error);
  }
};
```

### Controlling Downloads

```typescript
// Pause a download
await window.electron.download.pause(downloadId);

// Resume a download
await window.electron.download.resume(downloadId);

// Cancel a download
await window.electron.download.cancel(downloadId);

// Retry a failed download
await window.electron.download.retry(downloadId);

// Pause all downloads
await window.electron.download.pauseAll();

// Resume all downloads
await window.electron.download.resumeAll();
```

### Getting Download Information

```typescript
// Get all downloads
const response = await window.electron.download.getAll();
if (response.success) {
  const downloads = response.downloads;
  console.log('Active downloads:', downloads);
}

// Get specific download progress
const progressResponse = await window.electron.download.getProgress(downloadId);
if (progressResponse.success && progressResponse.progress) {
  console.log('Progress:', progressResponse.progress.percentage + '%');
}
```

### Listening to Events

All event listeners return an unsubscribe function:

```typescript
// Listen to progress updates
const unsubscribeProgress = window.electron.download.onProgress((progress) => {
  console.log(`Download ${progress.downloadId}: ${progress.percentage}%`);
  console.log(`Speed: ${progress.speed} bytes/s`);
  console.log(`Remaining: ${progress.remainingTime} seconds`);
});

// Listen to download completion
const unsubscribeComplete = window.electron.download.onComplete((progress) => {
  console.log(`Download completed: ${progress.filename}`);
});

// Listen to errors
const unsubscribeError = window.electron.download.onError((data) => {
  console.error(`Download ${data.downloadId} failed:`, data.error);
});

// Listen to status changes
const unsubscribeStatus = window.electron.download.onStatusChange((data) => {
  console.log(`Download ${data.downloadId} status: ${data.status}`);
});

// Cleanup when component unmounts
useEffect(() => {
  return () => {
    unsubscribeProgress();
    unsubscribeComplete();
    unsubscribeError();
    unsubscribeStatus();
  };
}, []);
```

### Settings Management

```typescript
// Get a setting
const response = await window.electron.settings.get('theme');
if (response.success) {
  console.log('Theme:', response.value);
}

// Set a setting
await window.electron.settings.set('theme', 'dark');

// Get all settings
const allSettings = await window.electron.settings.getAll();
if (allSettings.success) {
  console.log('Settings:', allSettings.settings);
}

// Set max concurrent downloads
await window.electron.settings.setMaxConcurrent(5);

// Set global speed limit (bytes per second)
await window.electron.settings.setGlobalSpeedLimit(1024 * 1024 * 10); // 10 MB/s
```

### Statistics

```typescript
// Get overall statistics
const statsResponse = await window.electron.stats.get();
if (statsResponse.success) {
  const stats = statsResponse.stats;
  console.log('Total downloads:', stats.totalDownloads);
  console.log('Total bytes:', stats.totalBytes);
  console.log('Average speed:', stats.averageSpeed);
}

// Get statistics by category
const categoryStats = await window.electron.stats.getByCategory();
if (categoryStats.success) {
  Object.entries(categoryStats.stats).forEach(([category, data]) => {
    console.log(`${category}: ${data.count} downloads, ${data.totalBytes} bytes`);
  });
}
```

### Database Operations

```typescript
// Get download record from database
const downloadRecord = await window.electron.db.getDownload(downloadId);
if (downloadRecord.success && downloadRecord.download) {
  console.log('Download record:', downloadRecord.download);
}

// Get all downloads from database
const allDownloads = await window.electron.db.getAllDownloads();

// Get downloads by status
const completedDownloads = await window.electron.db.getDownloadsByStatus('completed');

// Get downloads by category
const videoDownloads = await window.electron.db.getDownloadsByCategory('Video');

// Delete download from database
await window.electron.db.deleteDownload(downloadId);
```

## React Hook Example

Here's a custom hook for managing downloads:

```typescript
import { useEffect, useState } from 'react';
import type { DownloadProgress } from '@/types/electron';

export function useDownloads() {
  const [downloads, setDownloads] = useState<DownloadProgress[]>([]);

  useEffect(() => {
    // Load initial downloads
    const loadDownloads = async () => {
      const response = await window.electron.download.getAll();
      if (response.success) {
        setDownloads(response.downloads);
      }
    };
    loadDownloads();

    // Listen to progress updates
    const unsubscribeProgress = window.electron.download.onProgress((progress) => {
      setDownloads((prev) =>
        prev.map((d) => (d.downloadId === progress.downloadId ? progress : d))
      );
    });

    // Listen to new downloads
    const unsubscribeAdded = window.electron.download.onAdded(async (downloadId) => {
      const response = await window.electron.download.getProgress(downloadId);
      if (response.success && response.progress) {
        setDownloads((prev) => [...prev, response.progress!]);
      }
    });

    // Listen to completed downloads
    const unsubscribeComplete = window.electron.download.onComplete((progress) => {
      setDownloads((prev) =>
        prev.map((d) => (d.downloadId === progress.downloadId ? progress : d))
      );
    });

    // Cleanup
    return () => {
      unsubscribeProgress();
      unsubscribeAdded();
      unsubscribeComplete();
    };
  }, []);

  return { downloads };
}
```

## Security

The IPC Bridge follows Electron security best practices:

1. **Context Isolation**: Enabled to prevent renderer from accessing Node.js APIs
2. **Node Integration**: Disabled to prevent direct Node.js access
3. **Preload Script**: Uses `contextBridge` to expose only necessary APIs
4. **Type Safety**: Full TypeScript support for compile-time safety
5. **Error Handling**: All IPC calls return success/error responses

## Available IPC Channels

### Commands (invoke)
- `download:add`
- `download:pause`
- `download:resume`
- `download:cancel`
- `download:retry`
- `download:getAll`
- `download:getProgress`
- `download:pauseAll`
- `download:resumeAll`
- `download:clearCompleted`
- `download:setSpeedLimit`
- `settings:get`
- `settings:set`
- `settings:getAll`
- `settings:setMaxConcurrent`
- `settings:setGlobalSpeedLimit`
- `stats:get`
- `stats:getByCategory`
- `db:getDownload`
- `db:getAllDownloads`
- `db:getDownloadsByStatus`
- `db:getDownloadsByCategory`
- `db:deleteDownload`

### Events (on)
- `download:progress`
- `download:complete`
- `download:error`
- `download:added`
- `download:cancelled`
- `download:statusChange`
- `download:completedCleared`
