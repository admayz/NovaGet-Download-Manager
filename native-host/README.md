# NovaGet Native Messaging Host

This is the native messaging host that enables communication between the NovaGet browser extension and the Electron desktop app.

## How It Works

1. Browser extension sends messages via Chrome's native messaging API
2. Native host (this Node.js script) receives messages via stdin
3. Native host forwards messages to the Electron app via:
   - IPC socket (primary method)
   - HTTP API (fallback)
4. Native host sends responses back to the extension via stdout

## Installation

The native host must be registered with the browser for the extension to work. Use the installation scripts in the parent directory:

### Windows
```bash
npm run install:native-host:windows
```

### macOS
```bash
npm run install:native-host:mac
```

### Linux
```bash
npm run install:native-host:linux
```

## Manual Installation

### Windows

1. Update `com.novaget.host.json` with the correct path to `host.js`
2. Update the extension ID in `allowed_origins`
3. Create registry entry:
   ```
   HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\com.novaget.host
   Default = C:\path\to\com.novaget.host.json
   ```

### macOS

1. Update `com.novaget.host.json` with the correct path to `host.js`
2. Update the extension ID in `allowed_origins`
3. Copy manifest to:
   ```
   ~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.novaget.host.json
   ```

### Linux

1. Update `com.novaget.host.json` with the correct path to `host.js`
2. Update the extension ID in `allowed_origins`
3. Copy manifest to:
   ```
   ~/.config/google-chrome/NativeMessagingHosts/com.novaget.host.json
   ```

## Configuration

The host script uses the following configuration:

- **IPC Socket Path**: 
  - Windows: `\\.\pipe\novaget-ipc`
  - Unix: `/tmp/novaget-ipc.sock`
  
- **HTTP Fallback**: `http://localhost:42069/api/downloads`

- **Log File**:
  - Windows: `%APPDATA%\NovaGet\native-host.log`
  - Unix: `~/.novaget/native-host.log`

## Message Protocol

### Ping Message
```json
{
  "type": "ping"
}
```

Response:
```json
{
  "success": true,
  "connected": true,
  "message": "NovaGet is running"
}
```

### Download Message
```json
{
  "type": "download",
  "data": {
    "url": "https://example.com/file.zip",
    "filename": "file.zip",
    "referrer": "https://example.com",
    "mime": "application/zip",
    "fileSize": 1024000
  }
}
```

Response:
```json
{
  "success": true,
  "downloadId": "uuid-here",
  "message": "Download added to NovaGet"
}
```

## Troubleshooting

### Check if host is registered

**Windows:**
```powershell
reg query "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.novaget.host"
```

**macOS/Linux:**
```bash
cat ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.novaget.host.json
# or
cat ~/.config/google-chrome/NativeMessagingHosts/com.novaget.host.json
```

### Check logs

View the native host log file:
- Windows: `%APPDATA%\NovaGet\native-host.log`
- Unix: `~/.novaget/native-host.log`

### Test the host manually

Run the host script directly:
```bash
node host.js
```

Then send a test message (stdin):
```json
{"type":"ping"}
```

The host should respond with a message on stdout.

## Development

To test the host without the browser extension:

```bash
# Send a ping message
echo '{"type":"ping"}' | node host.js

# Send a download message
echo '{"type":"download","data":{"url":"https://example.com/file.zip","filename":"file.zip"}}' | node host.js
```

Note: The native messaging protocol requires messages to be prefixed with a 4-byte length header in production, but the script handles raw JSON for testing.
