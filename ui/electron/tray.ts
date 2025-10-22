import { app, Tray, Menu, BrowserWindow, nativeImage } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;

export function createTray(window: BrowserWindow) {
  mainWindow = window;

  // Create tray icon - using a simple placeholder for now
  const icon = nativeImage.createEmpty();
  
  // Try to load icon if it exists, otherwise use empty icon
  try {
    const iconPath = path.join(__dirname, '../public/tray-icon.png');
    const loadedIcon = nativeImage.createFromPath(iconPath);
    if (!loadedIcon.isEmpty()) {
      tray = new Tray(loadedIcon.resize({ width: 16, height: 16 }));
    } else {
      tray = new Tray(icon);
    }
  } catch (error) {
    tray = new Tray(icon);
  }
  
  updateTrayMenu();
  
  tray.setToolTip('Download Manager');
  
  // Show window on tray icon click
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    }
  });

  return tray;
}

export function updateTrayMenu(downloadStats?: {
  activeDownloads: number;
  totalSpeed: number;
}) {
  if (!tray || !mainWindow) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Download Manager',
      enabled: false,
    },
    { type: 'separator' },
    ...(downloadStats
      ? [
          {
            label: `Active Downloads: ${downloadStats.activeDownloads}`,
            enabled: false,
          },
          {
            label: `Speed: ${formatSpeed(downloadStats.totalSpeed)}`,
            enabled: false,
          },
          { type: 'separator' as const },
        ]
      : []),
    {
      label: 'Show',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        }
      },
    },
    {
      label: 'Pause All',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('tray:pause-all');
        }
      },
    },
    {
      label: 'Resume All',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('tray:resume-all');
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

export function updateTrayTooltip(text: string) {
  if (tray) {
    tray.setToolTip(text);
  }
}

export function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
  return `${(bytesPerSecond / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
