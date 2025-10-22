# Download Manager

A modern, feature-rich download manager application built with .NET 9, Electron, React, and TypeScript.

## 🚀 Features

- **Multi-threaded Downloads**: Accelerate downloads with parallel connections
- **Browser Integration**: Firefox/Chrome extension for seamless download capture
- **Smart Categorization**: Automatic file organization by type
- **Download Scheduling**: Schedule downloads for specific times
- **Speed Control**: Global and per-download speed limiting
- **Mirror Support**: Automatic failover to mirror URLs
- **Security Scanning**: VirusTotal integration for malware detection
- **Video Detection**: Automatic detection and download of HLS/DASH streams
- **Resume Support**: Pause and resume downloads anytime
- **Dark Mode**: Beautiful UI with light/dark theme support
- **Real-time Monitoring**: Live speed graphs and progress tracking
- **System Tray**: Minimize to tray with quick actions

## 📁 Project Structure

```
DownloadManager/
├── backend/                          # .NET 9 Backend
│   ├── DownloadManager.Shared/       # Shared models and DTOs
│   ├── DownloadManager.Core/         # Core business logic and data access
│   ├── DownloadManager.Api/          # REST API (ASP.NET Core)
│   ├── DownloadManager.Service/      # Background Windows Service
│   └── DownloadManager.sln           # Solution file
├── ui/                               # Electron + React Frontend
│   ├── electron/                     # Electron main process
│   ├── src/                          # React application
│   └── package.json
└── browser-extension/                # Browser Extension
    ├── native-host/                  # Native messaging host
    ├── manifest.json                 # Extension manifest
    └── background.js                 # Extension background script
```

## 🛠️ Getting Started

### Prerequisites

- **.NET 9 SDK** - [Download](https://dotnet.microsoft.com/download/dotnet/9.0)
- **Node.js 22+** - [Download](https://nodejs.org/)
- **SQLite** (included with .NET)
- **Firefox/Zen Browser** or **Chrome/Edge** (for browser extension)

### 1️⃣ Backend Setup

```bash
cd backend
dotnet restore
dotnet build

# Run database migrations
dotnet ef database update --project DownloadManager.Core

# Start the API server
dotnet run --project DownloadManager.Api
```

The API will be available at `http://localhost:5000`

### 2️⃣ Frontend Setup

```bash
cd ui
npm install

# Development mode
npm run dev          # Terminal 1: Start Vite dev server
npm run elecdev      # Terminal 2: Start Electron app

# Production build
npm run build
npm run elecbuild
```

### 3️⃣ Browser Extension Setup

#### For Firefox/Zen Browser:

1. **Install Native Messaging Host:**
   ```bash
   cd browser-extension/native-host
   # Right-click install-firefox.bat and "Run as administrator"
   ```

2. **Load Extension:**
   - Open `about:debugging` in Firefox/Zen
   - Click "This Firefox" (or "This Zen")
   - Click "Load Temporary Add-on"
   - Select `browser-extension/manifest.json`

#### For Chrome/Edge:

1. **Install Native Messaging Host:**
   ```bash
   cd browser-extension/native-host
   # Right-click install-chrome.bat (or install-edge.bat) and "Run as administrator"
   ```

2. **Load Extension:**
   - Open `chrome://extensions/` (or `edge://extensions/`)
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `browser-extension` folder

3. **Update Extension ID:**
   - Copy your extension ID from the extensions page
   - Edit `browser-extension/native-host/com.downloadmanager.host.json`
   - Replace `EXTENSION_ID_HERE` with your actual extension ID

## 💾 Database

The application uses **SQLite** with Entity Framework Core. The database includes:

- **Downloads** - Full download metadata and state
- **Download Segments** - Multi-threaded download chunks
- **Scheduled Downloads** - Time-based download scheduling
- **Categories** - File organization and auto-categorization
- **Settings** - User preferences and configuration
- **Mirror URLs** - Alternative download sources
- **Quarantined Files** - Security scan results
- **File Scan Cache** - VirusTotal scan history

Migrations are applied automatically on application startup.

## 🎯 Technology Stack

### Backend
- **.NET 9** - Modern, high-performance framework
- **ASP.NET Core** - RESTful API
- **Entity Framework Core** - ORM with SQLite
- **Serilog** - Structured logging
- **FluentValidation** - Input validation
- **System.Reactive** - Reactive extensions for real-time updates

### Frontend
- **Electron** - Cross-platform desktop app
- **React 19** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Redux Toolkit** - State management
- **TailwindCSS** - Utility-first CSS
- **Chart.js** - Real-time speed graphs
- **React Router** - Navigation

### Browser Extension
- **Manifest V3** - Modern extension API
- **Native Messaging** - Communication with desktop app
- **Content Scripts** - Download detection

## 📋 Features Implemented

### ✅ Core Download Engine
- Multi-threaded downloads with configurable connections
- Pause/resume support with state persistence
- Automatic retry with exponential backoff
- Speed limiting (global and per-download)
- Checksum validation (MD5, SHA1, SHA256)
- Download recovery after crashes

### ✅ Advanced Features
- Mirror URL support with automatic failover
- HLS/DASH video stream detection and download
- Cookie and custom header support
- TLS certificate validation
- Proxy support (HTTP/HTTPS/SOCKS5)

### ✅ Security
- VirusTotal integration for malware scanning
- Sandbox mode for executable files
- Quarantine management
- Certificate validation

### ✅ Scheduling
- Time-based download scheduling
- Recurring downloads (daily, weekly, monthly)
- Bandwidth scheduling
- Missed schedule handling

### ✅ User Interface
- Modern, responsive design
- Dark/light theme support
- Real-time speed graphs
- Category-based filtering
- File preview (images, videos)
- System tray integration
- Toast notifications
- Drag-and-drop URL support

### ✅ Browser Integration
- Firefox/Zen Browser extension
- Chrome/Edge extension support
- Native messaging for seamless integration
- Automatic download interception
- Clipboard monitoring

## 📖 Documentation

- [Backend Documentation](backend/README.md)
- [Frontend Documentation](ui/README.md)
- [Browser Extension Documentation](browser-extension/README.md)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International License**.

**You are free to:**
- ✅ Use for personal projects
- ✅ Modify and adapt the code
- ✅ Share with others

**Restrictions:**
- ❌ Commercial use is prohibited
- ❌ Cannot be used in commercial products or services

For commercial licensing inquiries, please contact the project maintainers.

See [LICENSE](LICENSE) file for full details.

## 🙏 Acknowledgments

Built with modern technologies and best practices for a seamless download management experience.
