# NovaGet Browser Extension

Chrome/Edge extension for intercepting downloads and sending them to NovaGet Download Manager.

## Features

- Automatic download interception
- Context menu integration (right-click -> Download with NovaGet)
- Configurable file size and type filters
- Native messaging integration with NovaGet desktop app

## Installation

### Prerequisites

1. NovaGet Desktop App must be installed
2. Native messaging host must be configured (see installation scripts)

### Load Extension in Chrome/Edge

1. Open Chrome/Edge and navigate to `chrome://extensions/` or `edge://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `extension` folder

## Configuration

Click the extension icon in the toolbar to:
- Enable/disable the extension
- Toggle auto-intercept
- Test connection to NovaGet

For advanced settings, click "Settings" to configure:
- Minimum file size for interception
- File types to intercept (applications, videos, audio, etc.)

## Native Messaging

The extension communicates with NovaGet via Chrome's native messaging protocol. The native host must be installed and registered for the extension to work.

See the `native-host` folder for installation instructions.

## Development

### File Structure

```
extension/
├── manifest.json          # Extension manifest (MV3)
├── background.js          # Service worker for download interception
├── popup.html/js          # Extension popup UI
├── options.html/js        # Settings page
├── icons/                 # Extension icons
└── README.md             # This file
```

### Testing

1. Load the extension in developer mode
2. Click the extension icon and test the connection
3. Try downloading a file to test interception
4. Check the browser console for any errors

## Troubleshooting

### Extension not intercepting downloads

- Check if the extension is enabled in the popup
- Verify auto-intercept is turned on
- Check if the file meets the minimum size requirement
- Ensure the file type is selected in settings

### Native host connection failed

- Verify NovaGet desktop app is running
- Check if the native host is properly installed
- Run the installation script again
- Check Chrome's native messaging logs

## License

Same as NovaGet Desktop App
