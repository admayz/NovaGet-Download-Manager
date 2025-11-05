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
import { i18nService } from './services/i18n/i18nService';
import { SecurityManager } from './utils/securityConfig';
import { SettingsStore } from './services/settings/SettingsStore';
import { AIService } from './services/ai/AIService';
import { CategoryService } from './services/category/CategoryService';
import { SecurityCheckService } from './services/security/SecurityCheckService';
import { VirusTotalService } from './services/virustotal/VirusTotalService';

// Global error handlers
process.on('uncaughtException', (error) => {
  // Ignore abort errors from download cancellation
  if (error.message?.includes('aborted') || error.message?.includes('canceled')) {
    console.log('[Main] Ignoring expected abort error');
    return;
  }
  console.error('[Main] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  // Ignore abort errors from download cancellation
  if (reason && typeof reason === 'object' && 'message' in reason) {
    const message = (reason as any).message;
    if (message?.includes('aborted') || message?.includes('canceled')) {
      console.log('[Main] Ignoring expected abort rejection');
      return;
    }
  }
  console.error('[Main] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Service instances
let db: DatabaseService | null = null;
let settingsStore: SettingsStore | null = null;
let downloadManager: DownloadManager | null = null;
let windowManager: WindowManager | null = null;
let deepLinkHandler: DeepLinkHandler | null = null;
let trayManager: TrayManager | null = null;
let notificationManager: NotificationManager | null = null;
let lifecycleManager: AppLifecycleManager | null = null;
let schedulerService: SchedulerService | null = null;
let clipboardWatcher: ClipboardWatcher | null = null;
let ipcBridge: IPCBridge | null = null;
let i18n: i18nService | null = null;
let aiService: AIService | null = null;
let categoryService: CategoryService | null = null;
let virusTotalService: VirusTotalService | null = null;
let securityCheckService: SecurityCheckService | null = null;

async function initializeServices() {
  console.log('Initializing services...');

  // Initialize security manager first
  const isDevelopment = process.env.NODE_ENV === 'development';
  SecurityManager.initialize(isDevelopment);
  console.log('Security manager initialized');

  // Initialize settings store (electron-store v8 - CommonJS compatible)
  try {
    settingsStore = new SettingsStore();
    console.log('Settings store initialized successfully');
  } catch (error) {
    console.error('Failed to initialize settings store:', error);
    throw error; // Settings are critical, don't continue without them
  }

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

  // Initialize i18n service
  try {
    i18n = new i18nService();
    // Get saved language from settings store or use default
    const savedLanguage = settingsStore.get('language') || 'tr';
    await i18n.initialize(savedLanguage);
    console.log('i18n service initialized with language:', savedLanguage);
  } catch (error) {
    console.error('Failed to initialize i18n service:', error);
    // Create a fallback i18n instance
    i18n = new i18nService();
    await i18n.initialize('tr');
  }

  // Initialize window manager
  windowManager = new WindowManager();

  // Initialize AI service
  try {
    aiService = new AIService({
      apiUrl: 'https://text.pollinations.ai/openai',
      timeout: 10000,
      maxRetries: 2,
    });
    console.log('AI service initialized');
  } catch (error) {
    console.error('Failed to initialize AI service:', error);
  }

  // Initialize category service
  if (aiService) {
    categoryService = new CategoryService(aiService);
    console.log('Category service initialized');
  }

  // Initialize VirusTotal service
  if (db && settingsStore) {
    try {
      const apiKey = settingsStore.get('virusTotalApiKey') || '';
      const enableVirusScan = settingsStore.get('enableVirusScan') || false;
      
      if (enableVirusScan && apiKey) {
        virusTotalService = new VirusTotalService({
          apiKey,
          timeout: 30000,
          maxRetries: 2,
        });
        console.log('VirusTotal service initialized');
        
        // Initialize security check service
        securityCheckService = new SecurityCheckService(virusTotalService, {
          enabled: true,
          autoScan: settingsStore.get('autoScanDownloads') || false,
          blockMalicious: false, // Don't auto-block, let user decide
          warnThreshold: 1,
        });
        console.log('Security check service initialized');
      } else {
        console.log('VirusTotal service not configured (API key missing or disabled)');
      }
    } catch (error) {
      console.error('Failed to initialize security services:', error);
    }
  }

  // Initialize download manager (only if database is available)
  if (db) {
    downloadManager = new DownloadManager(
      db, 
      5, 
      securityCheckService || undefined, 
      categoryService || undefined
    );
    console.log('Download manager initialized with AI and security services');
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
        const downloadDir = settingsStore?.get('defaultDirectory') || app.getPath('downloads');
        downloadManager?.addDownload({
          url,
          directory: downloadDir,
        });
      } catch (error) {
        console.error('Failed to add download from clipboard:', error);
      }
    });

    // Initialize IPC bridge (i18n and settingsStore are guaranteed to be initialized at this point)
    ipcBridge = new IPCBridge(downloadManager, db, i18n!, settingsStore!, clipboardWatcher);

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
