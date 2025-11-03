import { app } from 'electron';
import { DatabaseService } from './services/database/DatabaseService';
import { DownloadManager } from './services/download/DownloadManager';
import { IPCBridge } from './services/ipc/IPCBridge';
import { WindowManager } from './services/window/WindowManager';
import { DeepLinkHandler } from './services/window/DeepLinkHandler';
import { TrayManager } from './services/tray/TrayManager';
import { NotificationManager } from './services/notification/NotificationManager';
import { AppLifecycleManager } from './services/lifecycle/AppLifecycleManager';
import { SchedulerService } from './services/scheduler/SchedulerService';
import { ClipboardWatcher } from './services/clipboard/ClipboardWatcher';
import { SecurityManager } from './utils/securityConfig';

// Service instances
let db: DatabaseService | null = null;
let downloadManager: DownloadManager | null = null;
let windowManager: WindowManager | null = null;
let deepLinkHandler: DeepLinkHandler | null = null;
let trayManager: TrayManager | null = null;
let notificationManager: NotificationManager | null = null;
let lifecycleManager: AppLifecycleManager | null = null;
let schedulerService: SchedulerService | null = null;
let clipboardWatcher: ClipboardWatcher | null = null;
let ipcBridge: IPCBridge | null = null;

async function initializeServices() {
  console.log('Initializing services...');

  // Initialize security manager first
  const isDevelopment = process.env.NODE_ENV === 'development';
  SecurityManager.initialize(isDevelopment);
  console.log('Security manager initialized');

  // Initialize database
  try {
    db = new DatabaseService();
    await db.initialize();
    console.log('Database initialized successfully with sql.js');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    console.log('Running without database support');
    db = null;
  }

  // Initialize window manager
  windowManager = new WindowManager();

  // Initialize download manager (only if database is available)
  if (db) {
    downloadManager = new DownloadManager(db);
    console.log('Download manager initialized');
  } else {
    console.log('Skipping download manager initialization (no database)');
  }

  // Initialize notification manager
  notificationManager = new NotificationManager(windowManager);
  await notificationManager.init();

  // Only initialize services that require database if it's available
  if (db && downloadManager) {
    // Initialize tray manager
    trayManager = new TrayManager(windowManager, downloadManager);

    // Initialize lifecycle manager
    lifecycleManager = new AppLifecycleManager(db, downloadManager, windowManager);
    lifecycleManager.setTrayManager(trayManager);
    lifecycleManager.setNotificationManager(notificationManager);
    await lifecycleManager.initialize();

    // Initialize scheduler service
    schedulerService = new SchedulerService(db, downloadManager);
    schedulerService.start();

    // Initialize clipboard watcher
    clipboardWatcher = new ClipboardWatcher(db, {
      enabled: false, // Will be enabled based on user settings
      pollInterval: 2000,
      autoConfirm: false,
    });

    // Setup clipboard watcher callback
    clipboardWatcher.setOnUrlDetected((url) => {
      console.log('Clipboard URL detected:', url);
      try {
        // Get default download directory from settings
        const directory = db?.getSetting('default_download_directory');
        const downloadDir = directory || app.getPath('downloads');
        downloadManager?.addDownload({
          url,
          directory: downloadDir,
        });
      } catch (error) {
        console.error('Failed to add download from clipboard:', error);
      }
    });

    // Initialize IPC bridge
    ipcBridge = new IPCBridge(downloadManager, db, clipboardWatcher);

    // Setup download event handlers for notifications and tray
    setupDownloadEventHandlers();

    console.log('All services initialized with database support');
  } else {
    console.log('Running in UI-only mode (no database/download support)');
  }

  console.log('Services initialized successfully');
}

function setupDownloadEventHandlers() {
  if (!downloadManager || !notificationManager || !trayManager) return;

  // Listen to download complete events
  downloadManager.on('download:complete', (download) => {
    notificationManager?.showDownloadComplete(download.filename, download.downloadId);
    updateTrayStatus();
  });

  // Listen to download error events
  downloadManager.on('download:error', (download, error) => {
    notificationManager?.showDownloadError(download.filename, error, download.downloadId);
    updateTrayStatus();
  });

  // Listen to download progress events
  downloadManager.on('download:progress', () => {
    updateTrayStatus();
  });

  // Listen to download status change events
  downloadManager.on('download:statusChange', () => {
    updateTrayStatus();
  });
}

function updateTrayStatus() {
  if (!downloadManager || !trayManager) return;

  const downloads = downloadManager.getAllDownloads();
  const activeDownloads = downloads.filter((d) => d.status === 'downloading');
  const totalSpeed = activeDownloads.reduce((sum, d) => sum + d.speed, 0);

  trayManager.updateStatus(activeDownloads.length, totalSpeed);
}

async function createApplication() {
  // Initialize all services
  await initializeServices();

  // Create main window
  if (windowManager) {
    windowManager.createMainWindow();
  }

  // Setup deep link handler
  if (windowManager) {
    deepLinkHandler = new DeepLinkHandler(windowManager);
    deepLinkHandler.setup();
  }

  // Create system tray
  if (trayManager && lifecycleManager?.getSettings()?.enableSystemTray) {
    trayManager.create();
  }

  // Restore download state
  if (lifecycleManager) {
    await lifecycleManager.restoreDownloadState();
  }

  // Start clipboard watcher if enabled
  if (clipboardWatcher && db) {
    const clipboardEnabled = db.getSetting('clipboard_watching_enabled');
    if (clipboardEnabled === 'true') {
      clipboardWatcher.start();
      console.log('Clipboard watcher started');
    }
  }

  // Process any pending deep links
  if (deepLinkHandler) {
    deepLinkHandler.processPendingUrl();
  }
}

// App ready event
app.whenReady().then(async () => {
  await createApplication();
});

// Prevent multiple instances (handled by DeepLinkHandler)
// The DeepLinkHandler already sets up single instance lock
