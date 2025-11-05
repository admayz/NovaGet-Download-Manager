import { BrowserWindow, app, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { SecurityManager } from '../../utils/securityConfig';

interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private stateFilePath: string;
  private defaultState: WindowState;

  constructor() {
    this.stateFilePath = path.join(app.getPath('userData'), 'window-state.json');
    
    // Calculate default window size based on screen size (75% of screen)
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    this.defaultState = {
      width: Math.floor(screenWidth * 0.75),
      height: Math.floor(screenHeight * 0.75),
      isMaximized: false,
    };
  }

  createMainWindow(): BrowserWindow {
    const state = this.loadWindowState();

    // Get secure webPreferences from SecurityManager
    const preloadPath = path.join(__dirname, '../../preload.js');
    const secureWebPreferences = SecurityManager.getSecureWebPreferences(preloadPath);

    this.mainWindow = new BrowserWindow({
      width: state.width,
      height: state.height,
      x: state.x,
      y: state.y,
      minWidth: 800,
      minHeight: 600,
      show: false,
      backgroundColor: '#1a1a2e',
      webPreferences: secureWebPreferences,
      icon: this.getAppIcon(),
    });

    // Restore maximized state
    if (state.isMaximized) {
      this.mainWindow.maximize();
    }

    // Load the app
    this.loadApp();

    // Setup window event handlers
    this.setupWindowHandlers();

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    return this.mainWindow;
  }

  private loadApp(): void {
    if (!this.mainWindow) return;

    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../../out/index.html'));
    }
  }

  private setupWindowHandlers(): void {
    if (!this.mainWindow) return;

    // Save window state on close
    this.mainWindow.on('close', () => {
      this.saveWindowState();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      // Open external links in default browser
      if (url.startsWith('http://') || url.startsWith('https://')) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
      return { action: 'allow' };
    });

    // Prevent navigation away from the app
    this.mainWindow.webContents.on('will-navigate', (event, url) => {
      const appUrl = this.mainWindow?.webContents.getURL();
      if (appUrl && !url.startsWith(appUrl)) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });
  }

  private loadWindowState(): WindowState {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const data = fs.readFileSync(this.stateFilePath, 'utf-8');
        const state = JSON.parse(data) as WindowState;
        
        // Validate state
        if (this.isValidState(state)) {
          return state;
        }
      }
    } catch (error) {
      console.error('Failed to load window state:', error);
    }

    return this.defaultState;
  }

  private saveWindowState(): void {
    if (!this.mainWindow) return;

    try {
      const bounds = this.mainWindow.getBounds();
      const state: WindowState = {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        isMaximized: this.mainWindow.isMaximized(),
      };

      fs.writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error('Failed to save window state:', error);
    }
  }

  private isValidState(state: WindowState): boolean {
    return (
      typeof state.width === 'number' &&
      typeof state.height === 'number' &&
      state.width > 0 &&
      state.height > 0 &&
      typeof state.isMaximized === 'boolean'
    );
  }

  private getAppIcon(): string | undefined {
    // Try multiple possible paths for the icon
    const possiblePaths = [
      path.join(__dirname, '../assets/icon.png'),           // From dist/services/window
      path.join(__dirname, '../../assets/icon.png'),        // Alternative path
      path.join(process.cwd(), 'electron/assets/icon.png'), // From project root
      path.join(__dirname, '../../../electron/assets/icon.png'), // From dist
    ];

    for (const iconPath of possiblePaths) {
      if (fs.existsSync(iconPath)) {
        console.log('Icon found at:', iconPath);
        return iconPath;
      }
    }

    console.warn('Icon not found, checked paths:', possiblePaths);
    return undefined;
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  focusMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.focus();
    }
  }

  showMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.show();
      this.focusMainWindow();
    }
  }

  hideMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.hide();
    }
  }

  closeMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.close();
    }
  }
}
