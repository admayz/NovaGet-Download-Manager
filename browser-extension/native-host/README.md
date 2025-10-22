# Native Messaging Host Setup

This directory contains the native messaging host configuration for browser extension communication.

## Overview

Native Messaging allows the browser extension to communicate with the Download Manager desktop application using a bidirectional message channel. Messages are exchanged via stdin/stdout using a specific protocol.

## Installation

### Automatic Installation

Run the PowerShell script as Administrator:

```powershell
.\install-host.ps1 -ExtensionId "YOUR_EXTENSION_ID"
```

Replace `YOUR_EXTENSION_ID` with the actual Chrome extension ID (found in `chrome://extensions/`).

### Manual Installation

1. **Create the manifest file** at `C:\Program Files\DownloadManager\com.downloadmanager.host.json`:

```json
{
  "name": "com.downloadmanager.host",
  "description": "Download Manager Native Messaging Host",
  "path": "C:\\Program Files\\DownloadManager\\DownloadManager.exe",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://YOUR_EXTENSION_ID/"
  ]
}
```

2. **Register for Chrome**:

Create registry key:
```
HKEY_LOCAL_MACHINE\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.downloadmanager.host
```

Set default value to manifest path:
```
C:\Program Files\DownloadManager\com.downloadmanager.host.json
```

3. **Register for Edge**:

Create registry key:
```
HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Edge\NativeMessagingHosts\com.downloadmanager.host
```

Set default value to manifest path:
```
C:\Program Files\DownloadManager\com.downloadmanager.host.json
```

4. **Register for Firefox** (per-user):

Create registry key:
```
HKEY_CURRENT_USER\SOFTWARE\Mozilla\NativeMessagingHosts\com.downloadmanager.host
```

Set default value to manifest path:
```
C:\Program Files\DownloadManager\com.downloadmanager.host.json
```

## Running the Application

The Electron application must be started with the `--native-messaging-host` flag to enable native messaging mode:

```bash
DownloadManager.exe --native-messaging-host
```

In this mode, the application:
- Reads messages from stdin
- Writes responses to stdout
- Uses stderr for logging
- Exits when stdin is closed

## Message Protocol

### Message Format

Messages are sent using the Chrome Native Messaging protocol:

1. **Message Length** (4 bytes, little-endian): Length of the JSON message
2. **Message Data** (N bytes): UTF-8 encoded JSON

### Extension → Application

**Download Request:**
```json
{
  "type": "DOWNLOAD_REQUEST",
  "url": "https://example.com/file.zip",
  "filename": "file.zip",
  "fileSize": 1024000,
  "mime": "application/zip",
  "referrer": "https://example.com",
  "cookies": [
    {
      "name": "session",
      "value": "abc123",
      "domain": ".example.com",
      "path": "/"
    }
  ],
  "headers": {
    "User-Agent": "Mozilla/5.0..."
  }
}
```

**Settings Request:**
```json
{
  "type": "SETTINGS_REQUEST"
}
```

### Application → Extension

**Ready:**
```json
{
  "type": "READY"
}
```

**Download Started:**
```json
{
  "type": "DOWNLOAD_STARTED",
  "filename": "file.zip"
}
```

**Download Completed:**
```json
{
  "type": "DOWNLOAD_COMPLETED",
  "filename": "file.zip"
}
```

**Download Failed:**
```json
{
  "type": "DOWNLOAD_FAILED",
  "filename": "file.zip",
  "error": "Network error"
}
```

**Settings Response:**
```json
{
  "type": "SETTINGS_RESPONSE",
  "settings": {
    "enabled": true,
    "interceptDownloads": true,
    "minFileSize": 102400,
    "clipboardWatcher": false,
    "autoStart": true
  }
}
```

## Troubleshooting

### Extension Can't Connect

1. Verify registry entries exist
2. Check manifest file path is correct
3. Ensure application executable exists at specified path
4. Check extension ID in manifest matches installed extension
5. Restart browser after installation

### Messages Not Received

1. Check application is running with `--native-messaging-host` flag
2. Verify stdin/stdout are not being used by other code
3. Check stderr logs for errors
4. Ensure message format is correct (length prefix + JSON)

### Debugging

Enable verbose logging in the application:

```typescript
console.error('[Native Messaging] Debug message');
```

All stderr output will be visible in the browser's extension console:
- Chrome: `chrome://extensions/` → Extension details → Inspect views: background page
- Edge: `edge://extensions/` → Extension details → Inspect views: background page

## Security Considerations

- Only allow specific extension IDs in the manifest
- Validate all incoming messages
- Sanitize file paths and URLs
- Don't expose sensitive system information
- Use HTTPS for all download URLs
- Validate cookies and headers before use

## Uninstallation

Run the uninstall script as Administrator:

```powershell
.\uninstall-host.ps1
```

Or manually delete the registry keys listed above.
