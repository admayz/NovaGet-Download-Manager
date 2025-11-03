# Notification Service

This directory contains the notification management service for NovaGet.

## NotificationManager

Manages system notifications for download events and errors.

### Features

- **Download Complete Notifications**: Notifies when a download finishes
- **Error Notifications**: Alerts on download failures
- **Network Status Notifications**: Informs about network connectivity issues
- **Clickable Notifications**: Opens the app and navigates to relevant download
- **Customizable**: Can be enabled/disabled via settings
- **Cross-Platform**: Works on Windows, macOS, and Linux

### Notification Types

#### Download Complete
```typescript
notificationManager.showDownloadComplete(filename, downloadId);
```
Shows when a download successfully completes.

#### Download Error
```typescript
notificationManager.showDownloadError(filename, error, downloadId);
```
Shows when a download fails with error details.

#### All Downloads Complete
```typescript
notificationManager.showAllDownloadsComplete(count);
```
Shows when all queued downloads finish.

#### Network Error
```typescript
notificationManager.showNetworkError();
```
Shows when network connection is lost.

#### Network Restored
```typescript
notificationManager.showNetworkRestored();
```
Shows when network connection is restored.

#### Custom Notification
```typescript
notificationManager.showCustomNotification({
  title: 'Custom Title',
  body: 'Custom message',
  silent: false,
  urgency: 'normal'
});
```

### Usage

```typescript
const notificationManager = new NotificationManager(windowManager);
await notificationManager.init();

// Show notification
notificationManager.showDownloadComplete('file.zip', 'download-123');

// Enable/disable notifications
notificationManager.setEnabled(false);

// Check if notifications are supported
if (notificationManager.isSupported()) {
  // Show notifications
}
```

### Notification Click Handling

When a user clicks on a notification:
1. The main window is shown and focused
2. An IPC event is sent to the renderer with notification details
3. The renderer can navigate to the relevant download

### Icon Requirements

The notification manager looks for icons in:
- `{appPath}/assets/notification-icon.png`
- `{appPath}/assets/icon.png`
- `{resourcesPath}/assets/notification-icon.png`

### Permissions

On macOS, the app will request notification permissions on first launch.
