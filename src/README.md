# NovaGet UI Foundation

This document describes the Next.js UI foundation implemented for NovaGet.

## Structure

### App Router (Task 10.1)

The application uses Next.js 15 App Router with the following pages:

- **Dashboard (`/`)**: Overview with statistics and quick actions
- **Downloads (`/downloads`)**: Manage all downloads with filtering
- **History (`/history`)**: View download history and statistics
- **Settings (`/settings`)**: Configure application preferences

### Components

- **Navigation**: Sidebar navigation with active route highlighting
- **ThemeProvider**: Context provider for theme management
- **ThemeToggle**: Button to switch between light/dark modes
- **IPCProvider**: Sets up IPC event listeners for Electron communication

### Theme System (Task 10.2)

Implemented a comprehensive TailwindCSS theme system with:

- **Color Palette**: Purple/violet primary and navy/indigo secondary colors
- **Dark Mode**: Full dark mode support with `class` strategy
- **Custom Styles**: Pre-built component classes (buttons, cards, badges, etc.)
- **Theme Toggle**: User can switch between light/dark modes
- **CSS Variables**: Flexible theming with CSS custom properties

### State Management (Task 10.3)

Implemented Zustand stores for state management:

#### Download Store (`downloadStore.ts`)
- Manages download state and operations
- Actions: add, pause, resume, cancel, retry downloads
- Bulk operations: pause all, resume all, clear completed
- Filters: by status, active downloads, completed downloads
- Real-time updates via IPC events

#### Settings Store (`settingsStore.ts`)
- Manages application settings
- Persisted to localStorage
- Syncs with Electron main process
- Categories:
  - General: directory, concurrent downloads, segments
  - Speed: global speed limiting
  - AI: categorization, naming, tagging
  - Appearance: theme selection
  - Advanced: clipboard watch, system tray, notifications

#### IPC Integration
- **useIPCListeners**: Custom hook that sets up event listeners
- Listens for: progress, complete, error, added, cancelled, status changes
- Automatically updates store state based on events
- Loads initial data on mount

## Usage

### Using the Download Store

```typescript
import { useDownloadStore } from '@/store';

function MyComponent() {
  const { downloads, addDownload, pauseDownload } = useDownloadStore();
  
  // Add a download
  await addDownload({
    url: 'https://example.com/file.zip',
    directory: 'C:/Downloads',
  });
  
  // Pause a download
  await pauseDownload(downloadId);
}
```

### Using the Settings Store

```typescript
import { useSettingsStore } from '@/store';

function MyComponent() {
  const { theme, setTheme, maxConcurrentDownloads } = useSettingsStore();
  
  // Change theme
  setTheme('dark');
  
  // Update max concurrent downloads
  await setMaxConcurrentDownloads(10);
}
```

### Using the Theme

```typescript
import { useTheme } from '@/components/ThemeProvider';

function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  // Toggle theme
  setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
}
```

## File Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Dashboard page
│   ├── globals.css         # Global styles and theme
│   ├── downloads/
│   │   └── page.tsx        # Downloads page
│   ├── history/
│   │   └── page.tsx        # History page
│   └── settings/
│       └── page.tsx        # Settings page
├── components/
│   ├── Navigation.tsx      # Sidebar navigation
│   ├── ThemeProvider.tsx   # Theme context provider
│   ├── ThemeToggle.tsx     # Theme toggle button
│   └── IPCProvider.tsx     # IPC event listener setup
├── store/
│   ├── downloadStore.ts    # Download state management
│   ├── settingsStore.ts    # Settings state management
│   └── index.ts            # Store exports
├── hooks/
│   └── useIPCListeners.ts  # IPC event listeners hook
└── types/
    └── electron.d.ts       # Electron API types
```

## Next Steps

The UI foundation is now complete. The next tasks involve:

1. Implementing core UI components (DownloadCard, ProgressBar, etc.)
2. Building out the dashboard with real data
3. Creating the downloads management interface
4. Implementing the history view
5. Connecting settings to the Electron backend
