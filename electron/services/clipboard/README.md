# Clipboard Watcher Service

## Overview

The ClipboardWatcher service monitors the system clipboard for download URLs and provides user confirmation before adding them to the download queue.

## Features

- **Automatic URL Detection**: Polls clipboard every 2 seconds for valid download URLs
- **Protocol Support**: Supports HTTP, HTTPS, and FTP protocols
- **User Confirmation**: Shows dialog to confirm before adding detected URLs
- **Auto-Confirm Mode**: Optional mode to skip confirmation dialogs
- **Persistent Settings**: Saves enabled/disabled state to database

## Requirements Implemented

- **12.1**: Clipboard polling (2 second interval)
- **12.2**: URL detection regex
- **12.3**: User confirmation dialog
- **12.4**: HTTP/HTTPS/FTP URL validation

## Usage

```typescript
import { ClipboardWatcher } from './services/clipboard';
import { DatabaseService } from './services/database';

// Initialize
const db = new DatabaseService();
const clipboardWatcher = new ClipboardWatcher(db, {
  enabled: true,
  pollInterval: 2000,
  autoConfirm: false
});

// Set callback for detected URLs
clipboardWatcher.setOnUrlDetected((url) => {
  console.log('URL detected:', url);
  // Add to download manager
  downloadManager.addDownload({ url, directory: '/downloads' });
});

// Start watching
clipboardWatcher.start();

// Stop watching
clipboardWatcher.stop();

// Enable/disable
await clipboardWatcher.enable();
await clipboardWatcher.disable();

// Set auto-confirm mode
await clipboardWatcher.setAutoConfirm(true);

// Get status
const status = clipboardWatcher.getStatus();
console.log('Clipboard watcher status:', status);

// Cleanup
clipboardWatcher.destroy();
```

## Configuration

Settings are stored in the database:
- `clipboard_watching_enabled`: 'true' or 'false'
- `clipboard_auto_confirm`: 'true' or 'false'

## URL Validation

The service validates URLs using the following criteria:
1. Must match regex pattern for HTTP/HTTPS/FTP URLs
2. Must not exceed 2048 characters
3. Must have a supported protocol (http, https, ftp)

## Security Considerations

- URL length is limited to prevent abuse
- Only specific protocols are allowed
- User confirmation is required by default
- Invalid URLs are silently ignored

## Testing

```typescript
// Test URL validation
const isValid = clipboardWatcher.testUrl('https://example.com/file.zip');
console.log('URL is valid:', isValid);
```
