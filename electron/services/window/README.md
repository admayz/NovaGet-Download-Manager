# Window Management Services

This directory contains services for managing the Electron application window and deep linking.

## WindowManager

Manages the main application window with the following features:

- **Window State Persistence**: Saves and restores window size, position, and maximized state
- **Security**: Implements proper security settings (contextIsolation, sandbox, no nodeIntegration)
- **External Link Handling**: Opens external links in the default browser
- **Navigation Protection**: Prevents navigation away from the app

### Usage

```typescript
const windowManager = new WindowManager();
const mainWindow = windowManager.createMainWindow();

// Show/hide window
windowManager.showMainWindow();
windowManager.hideMainWindow();

// Focus window
windowManager.focusMainWindow();
```

## DeepLinkHandler

Handles deep linking for the application with the `novaget://` protocol.

### Supported Deep Link Formats

- `novaget://download?url=https://example.com/file.zip`
- `novaget://add?url=https://example.com/file.zip&filename=myfile.zip`

### Features

- **Single Instance Lock**: Ensures only one instance of the app runs
- **Cross-Platform Support**: Works on Windows, macOS, and Linux
- **Pending URL Processing**: Handles deep links received before the window is ready
- **User Confirmation**: Shows confirmation dialog for download requests

### Usage

```typescript
const deepLinkHandler = new DeepLinkHandler(windowManager);
deepLinkHandler.setup();

// Process any pending URLs after window is ready
deepLinkHandler.processPendingUrl();
```

## Window State File

Window state is saved to: `{userData}/window-state.json`

Example:
```json
{
  "width": 1200,
  "height": 800,
  "x": 100,
  "y": 100,
  "isMaximized": false
}
```
