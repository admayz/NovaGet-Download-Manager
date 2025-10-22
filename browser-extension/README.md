# Download Manager Browser Extension

Browser extension for seamless integration with Download Manager desktop application.

## Features

- **Download Interception**: Automatically intercepts downloads and sends them to the desktop app
- **Clipboard Monitoring**: Detects download URLs copied to clipboard
- **Native Messaging**: Communicates with desktop app via Chrome Native Messaging protocol
- **Multi-browser Support**: Compatible with Chrome, Edge, and Firefox (Manifest v3)

## Installation

### Development Mode

1. Open Chrome/Edge and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `browser-extension` directory

### Firefox

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the `manifest.json` file from the `browser-extension` directory

## Structure

```
browser-extension/
├── manifest.json          # Extension manifest (Manifest v3)
├── background.js          # Background service worker
├── content.js            # Content script for page interaction
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic
├── options.html          # Settings page
├── options.js            # Settings logic
└── icons/                # Extension icons
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Configuration

### Settings

- **Intercept Downloads**: Enable/disable automatic download interception
- **Minimum File Size**: Only intercept downloads larger than specified size (default: 100KB)
- **Clipboard Watcher**: Monitor clipboard for download URLs
- **Auto-start**: Automatically start desktop app when browser launches

### Native Messaging

The extension communicates with the desktop app using Chrome Native Messaging protocol:

- **Host Name**: `com.downloadmanager.host`
- **Protocol**: JSON messages via stdin/stdout
- **Registry**: Windows registry entry required for native host

## Message Protocol

### Extension → Desktop App

```json
{
  "type": "DOWNLOAD_REQUEST",
  "url": "https://example.com/file.zip",
  "filename": "file.zip",
  "fileSize": 1024000,
  "mime": "application/zip",
  "referrer": "https://example.com",
  "cookies": [...],
  "headers": {...}
}
```

### Desktop App → Extension

```json
{
  "type": "DOWNLOAD_STARTED",
  "filename": "file.zip"
}
```

```json
{
  "type": "DOWNLOAD_COMPLETED",
  "filename": "file.zip"
}
```

```json
{
  "type": "DOWNLOAD_FAILED",
  "filename": "file.zip",
  "error": "Network error"
}
```

## Permissions

- `downloads`: Intercept browser downloads
- `nativeMessaging`: Communicate with desktop app
- `clipboardRead`: Monitor clipboard for URLs
- `notifications`: Show download notifications
- `storage`: Store extension settings
- `cookies`: Forward cookies to desktop app
- `<all_urls>`: Access all websites for download interception

## Browser Compatibility

- Chrome 88+
- Edge 88+
- Firefox 109+ (with Manifest v3 support)

## Development

### Testing

1. Load extension in developer mode
2. Ensure desktop app is running
3. Click a download link on any website
4. Verify download is intercepted and sent to desktop app

### Debugging

- Background script: `chrome://extensions/` → "Inspect views: background page"
- Content script: Browser DevTools → Console
- Native messaging: Check desktop app logs

## Known Issues

- Clipboard monitoring requires user interaction due to browser security
- Some websites may block download interception
- Native messaging requires desktop app to be running

## Future Enhancements

- Support for more browsers (Safari, Opera)
- Advanced download filtering rules
- Integration with cloud storage services
- Download queue management from extension
