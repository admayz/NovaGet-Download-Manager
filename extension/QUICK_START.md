# NovaGet Extension - Quick Start Guide

## Installation (5 minutes)

### 1. Install Native Host
```bash
cd /path/to/NovaGet
npm run install:native-host
```

### 2. Load Extension
1. Open Chrome: `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension` folder

### 3. Get Extension ID
- Copy the ID shown under the extension (e.g., `abcd...xyz`)

### 4. Update Configuration
Edit `scripts/install-native-host.js`:
```javascript
const EXTENSION_ID = 'paste-your-extension-id-here';
```

Run installation again:
```bash
npm run install:native-host
```

### 5. Test Connection
1. Click the NovaGet extension icon
2. Click "Test Connection"
3. Should show "Connected to NovaGet" ✓

## Usage

### Automatic Downloads
- Downloads > 1MB are automatically sent to NovaGet
- Configurable in extension settings

### Manual Downloads
- Right-click any link
- Select "Download with NovaGet"

### Settings
- Click extension icon → "Settings"
- Configure file size, types, etc.

## Troubleshooting

### "Not connected to NovaGet"
1. Make sure NovaGet desktop app is running
2. Check extension ID is correct
3. Re-run `npm run install:native-host`

### Downloads not intercepting
1. Check extension is enabled (click icon)
2. Check file size > minimum (default 1MB)
3. Check file type is selected in settings

### Still not working?
Check logs:
- Windows: `%APPDATA%\NovaGet\native-host.log`
- Mac/Linux: `~/.novaget/native-host.log`

## Need Help?
See full documentation: `BROWSER_EXTENSION.md`
