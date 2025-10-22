# Download Manager - UI

Electron desktop application with React, TypeScript, Redux Toolkit, and TailwindCSS.

## Tech Stack

- **Electron** (38.4.0) - Desktop application framework
- **React** (19.1.1) - UI library
- **TypeScript** (5.9.3) - Type safety
- **Redux Toolkit** (2.9.1) - State management
- **React Router** (7.9.4) - Navigation
- **TailwindCSS** (4.1.15) - Styling
- **Vite** (7.1.7) - Build tool

## Project Structure

```
ui/
├── electron/
│   ├── main.ts           # Electron main process
│   ├── preload.ts        # Preload script for IPC
│   └── tsconfig.json     # TypeScript config for Electron
├── src/
│   ├── pages/
│   │   ├── DownloadsPage.tsx
│   │   └── SettingsPage.tsx
│   ├── store/
│   │   ├── store.ts
│   │   └── slices/
│   │       └── downloadsSlice.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── dist/                 # Vite build output
├── dist-electron/        # Electron build output
└── release/              # Electron packaged app
```

## Features

### Implemented
- ✅ Electron main process with IPC handlers
- ✅ React application with TypeScript
- ✅ Redux Toolkit state management
- ✅ React Router navigation
- ✅ TailwindCSS styling with dark mode support
- ✅ Basic download list UI
- ✅ Settings page placeholder

### IPC Handlers
The Electron main process exposes these IPC handlers:
- `download:start` - Start a new download
- `download:pause` - Pause a download
- `download:resume` - Resume a download
- `download:cancel` - Cancel a download

### Redux Store
- `downloads` slice - Manages download state
  - `addDownload` - Add new download
  - `updateDownload` - Update download progress
  - `removeDownload` - Remove download
  - `setFilter` - Filter downloads by category

## Development

### Install Dependencies
```bash
npm install
```

### Run Development Server (Vite)
```bash
npm run dev
```
Opens at http://localhost:5173

### Run Electron (Development)
```bash
npm run electron:dev
```
Make sure Vite dev server is running first.

### Build for Production
```bash
npm run build
```

### Package Electron App
```bash
npm run electron:build
```
Creates installer in `release/` folder.

## Scripts

- `dev` - Start Vite dev server
- `build` - Build React app for production
- `lint` - Run ESLint
- `preview` - Preview production build
- `electron:dev` - Run Electron in development mode
- `electron:build` - Build and package Electron app

## Configuration

### Electron Builder
Configuration in `package.json`:
- App ID: `com.downloadmanager.app`
- Product Name: `Download Manager`
- Target: Windows NSIS installer

### Vite
- Base path: `./` (for Electron)
- Output: `dist/`

### TailwindCSS
- Dark mode: `class` based
- Content: `./index.html`, `./src/**/*.{js,ts,jsx,tsx}`

## Environment Variables

- `NODE_ENV=development` - Development mode (loads from localhost:5173)
- `NODE_ENV=production` - Production mode (loads from dist/)

## Next Steps

- Connect to backend API
- Implement real-time progress updates via SSE
- Add drag-and-drop URL support
- Implement system tray integration
- Add toast notifications
- Create download list with virtual scrolling
- Implement category tabs
- Add settings panel
- Create speed graph with Chart.js
