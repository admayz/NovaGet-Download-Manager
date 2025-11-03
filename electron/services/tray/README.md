# System Tray Service

This directory contains the system tray management service for NovaGet.

## TrayManager

Manages the system tray icon and context menu with real-time download status.

### Features

- **Tray Icon**: Shows NovaGet icon in the system tray
- **Context Menu**: Provides quick actions and status information
- **Status Updates**: Displays active download count and total speed
- **Quick Actions**:
  - Show Window
  - Pause All Downloads
  - Resume All Downloads
  - Quit Application
- **Balloon Notifications** (Windows): Shows balloon notifications for important events

### Usage

```typescript
const trayManager = new TrayManager(windowManager, downloadManager);
trayManager.create();

// Update status
trayManager.updateStatus(activeCount, totalSpeed);

// Show balloon notification (Windows only)
trayManager.showBalloon('Title', 'Content');

// Cleanup
trayManager.destroy();
```

### Context Menu

The tray context menu includes:

1. **NovaGet** (disabled, shows app name)
2. **Status** (disabled, shows download status)
3. **Show Window** - Opens the main window
4. **Pause All Downloads** - Pauses all active downloads
5. **Resume All Downloads** - Resumes all paused downloads
6. **Quit** - Exits the application

### Status Display

The tray tooltip shows:
- "No active downloads" when idle
- "{count} active download(s) - {speed}" when downloading

### Icon Requirements

The tray manager looks for icons in the following locations:
- `{appPath}/assets/tray-icon.png`
- `{appPath}/assets/icon.png`
- `{resourcesPath}/assets/tray-icon.png`

Recommended icon size: 16x16 pixels (will be resized automatically)
