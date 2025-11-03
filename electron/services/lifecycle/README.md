# Application Lifecycle Service

This directory contains the application lifecycle management service for NovaGet.

## AppLifecycleManager

Manages the application lifecycle including startup, shutdown, and settings persistence.

### Features

- **Settings Management**: Loads and persists application settings
- **Graceful Shutdown**: Ensures downloads are paused and state is saved before exit
- **Download State Persistence**: Saves download progress on shutdown
- **Download State Restoration**: Restores paused downloads on startup
- **Settings Application**: Applies settings to relevant services
- **Event Handling**: Manages app-level events (activate, quit, etc.)

### Settings

The lifecycle manager handles the following settings:

```typescript
interface AppSettings {
  theme: 'light' | 'dark';
  defaultDownloadDirectory: string;
  maxConcurrentDownloads: number;
  segmentsPerDownload: number;
  globalSpeedLimit: number;
  enableClipboardWatching: boolean;
  enableSystemTray: boolean;
  enableNotifications: boolean;
  minimizeToTray: boolean;
  enableAutoCategorization: boolean;
  enableSmartNaming: boolean;
  enableAutoTagging: boolean;
}
```

### Usage

```typescript
const lifecycleManager = new AppLifecycleManager(
  db,
  downloadManager,
  windowManager
);

// Set optional managers
lifecycleManager.setTrayManager(trayManager);
lifecycleManager.setNotificationManager(notificationManager);

// Initialize (loads settings and sets up handlers)
await lifecycleManager.initialize();

// Get current settings
const settings = lifecycleManager.getSettings();

// Update a setting
await lifecycleManager.updateSetting('maxConcurrentDownloads', 10);

// Restore download state on startup
await lifecycleManager.restoreDownloadState();

// Graceful shutdown (called automatically on app quit)
await lifecycleManager.gracefulShutdown();
```

### Graceful Shutdown Process

When the app is closing, the lifecycle manager:

1. **Saves Download State**: Persists current download progress
2. **Pauses Downloads**: Pauses all active downloads
3. **Waits**: Gives downloads time to pause cleanly
4. **Shuts Down Services**: Closes download manager, tray, and database
5. **Quits**: Exits the application

### Download State Persistence

On shutdown:
- All active and paused downloads have their segment progress saved
- Download records are updated with current progress
- Status is set to 'paused' for active downloads

On startup:
- Paused and queued downloads are identified
- Downloads are NOT automatically resumed (user control)
- User can manually resume downloads from the UI

### Settings Persistence

Settings are stored in the SQLite database and loaded on startup.
Changes to settings are immediately applied to relevant services.

### Default Settings

If no settings are found in the database, the following defaults are used:

- Theme: Dark
- Download Directory: System downloads folder
- Max Concurrent Downloads: 5
- Segments Per Download: 4
- Global Speed Limit: 0 (unlimited)
- Clipboard Watching: Disabled
- System Tray: Enabled
- Notifications: Enabled
- Minimize to Tray: Disabled
- Auto Categorization: Enabled
- Smart Naming: Disabled
- Auto Tagging: Disabled
