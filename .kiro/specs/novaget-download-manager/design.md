# Design Document

## Overview

NovaGet, Electron.js ve Next.js teknolojilerini birleştiren hibrit bir masaüstü uygulamasıdır. Uygulama, Electron'un main process'inde çalışan Download Engine ile Next.js tabanlı modern bir UI'ı IPC (Inter-Process Communication) üzerinden birleştirir. Tüm veriler lokal SQLite veritabanında saklanır ve Pollinations.ai API'si ile AI destekli özellikler sağlanır.

### Temel Prensipler

- **Lokal-First**: Tüm işlemler kullanıcı cihazında gerçekleşir, sunucu gerektirmez
- **Modüler Mimari**: Her servis bağımsız çalışabilir ve test edilebilir
- **Performans**: Segmentli indirme ile maksimum hız
- **Güvenilirlik**: Hata toleransı ve otomatik yeniden deneme
- **Kullanıcı Deneyimi**: Modern, responsive ve sezgisel arayüz

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Main Process                    │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Download Engine│  │ IPC Bridge   │  │ System Tray     │ │
│  │                │  │              │  │ Manager         │ │
│  │ - Segment Mgr  │◄─┤ - Events     │  │                 │ │
│  │ - Queue Mgr    │  │ - Commands   │  │ - Notifications │ │
│  │ - Scheduler    │  │ - State Sync │  │ - Quick Actions │ │
│  └────────┬───────┘  └──────┬───────┘  └─────────────────┘ │
│           │                  │                               │
│           ▼                  ▼                               │
│  ┌────────────────┐  ┌──────────────┐                      │
│  │ SQLite DB      │  │ File System  │                      │
│  │ - Downloads    │  │ - Segments   │                      │
│  │ - Settings     │  │ - Completed  │                      │
│  │ - History      │  │              │                      │
│  └────────────────┘  └──────────────┘                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ IPC
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Electron Renderer Process                   │
│                    (Next.js Application)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    React UI Layer                       │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │ │
│  │  │Dashboard │  │Downloads │  │Settings  │            │ │
│  │  │Page      │  │Page      │  │Page      │            │ │
│  │  └──────────┘  └──────────┘  └──────────┘            │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   State Management                      │ │
│  │  - Zustand Store                                       │ │
│  │  - Real-time Updates via IPC                          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  ┌──────────────────┐  ┌──────────────────────────────┐   │
│  │ Pollinations.ai  │  │ Browser Extension            │   │
│  │ - Categorization │  │ - Native Messaging Host      │   │
│  │ - Smart Naming   │  │ - Download Interception      │   │
│  │ - Tagging        │  │                              │   │
│  └──────────────────┘  └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Desktop Framework**: Electron 28+
- **UI Framework**: Next.js 15 (App Router) + React 19
- **Styling**: TailwindCSS 4
- **State Management**: Zustand
- **Database**: better-sqlite3
- **HTTP Client**: axios
- **AI Integration**: Pollinations.ai REST API
- **Language**: TypeScript 5+

## Components and Interfaces

### 1. Download Engine (Main Process)

Download Engine, tüm indirme işlemlerini yöneten ana bileşendir.

#### DownloadManager Class

```typescript
interface DownloadOptions {
  url: string;
  filename?: string;
  directory?: string;
  segments?: number; // Default: 4
  speedLimit?: number; // bytes/second
  scheduledTime?: Date;
  headers?: Record<string, string>;
}

interface DownloadProgress {
  downloadId: string;
  totalBytes: number;
  downloadedBytes: number;
  speed: number; // bytes/second
  percentage: number;
  remainingTime: number; // seconds
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed';
  segments: SegmentProgress[];
}

interface SegmentProgress {
  segmentId: number;
  start: number;
  end: number;
  downloaded: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
}

class DownloadManager {
  private queue: DownloadQueue;
  private activeDownloads: Map<string, Download>;
  private db: DatabaseService;
  private maxConcurrent: number = 5;

  async addDownload(options: DownloadOptions): Promise<string>;
  async pauseDownload(downloadId: string): Promise<void>;
  async resumeDownload(downloadId: string): Promise<void>;
  async cancelDownload(downloadId: string): Promise<void>;
  async retryDownload(downloadId: string): Promise<void>;
  getProgress(downloadId: string): DownloadProgress;
  getAllDownloads(): DownloadProgress[];
}
```

#### Download Class

```typescript
class Download {
  private segments: Segment[];
  private speedLimiter: SpeedLimiter;
  private retryCount: number = 0;
  private maxRetries: number = 3;

  async start(): Promise<void>;
  async pause(): Promise<void>;
  async resume(): Promise<void>;
  async cancel(): Promise<void>;
  
  private async initializeSegments(): Promise<void>;
  private async downloadSegment(segment: Segment): Promise<void>;
  private async mergeSegments(): Promise<void>;
  private async verifyChecksum(): Promise<boolean>;
  
  on(event: 'progress' | 'complete' | 'error', callback: Function): void;
}
```

#### Segment Class

```typescript
class Segment {
  id: number;
  start: number;
  end: number;
  downloaded: number;
  tempFilePath: string;
  
  async download(url: string, headers: Record<string, string>): Promise<void>;
  async resume(): Promise<void>;
  getProgress(): number;
}
```

### 2. Database Service

SQLite veritabanı yönetimi için servis.

#### DatabaseService Class

```typescript
interface DownloadRecord {
  id: string;
  url: string;
  filename: string;
  directory: string;
  totalBytes: number;
  downloadedBytes: number;
  status: string;
  category?: string;
  tags?: string[];
  aiSuggestedName?: string;
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

interface SettingsRecord {
  key: string;
  value: string;
}

class DatabaseService {
  private db: Database;
  
  // Download operations
  async createDownload(record: Omit<DownloadRecord, 'id'>): Promise<string>;
  async updateDownload(id: string, updates: Partial<DownloadRecord>): Promise<void>;
  async getDownload(id: string): Promise<DownloadRecord | null>;
  async getAllDownloads(): Promise<DownloadRecord[]>;
  async deleteDownload(id: string): Promise<void>;
  
  // Segment operations
  async saveSegmentProgress(downloadId: string, segments: SegmentProgress[]): Promise<void>;
  async getSegmentProgress(downloadId: string): Promise<SegmentProgress[]>;
  
  // Settings operations
  async getSetting(key: string): Promise<string | null>;
  async setSetting(key: string, value: string): Promise<void>;
  async getAllSettings(): Promise<Record<string, string>>;
  
  // Statistics
  async getStatistics(): Promise<{
    totalDownloads: number;
    totalBytes: number;
    averageSpeed: number;
  }>;
}
```

### 3. AI Service

Pollinations.ai entegrasyonu için servis.

#### AIService Class

```typescript
interface CategoryResult {
  category: string;
  confidence: number;
}

interface NamingResult {
  suggestedName: string;
  reason: string;
}

interface TaggingResult {
  tags: string[];
}

class AIService {
  private apiUrl: string = 'https://text.pollinations.ai';
  private cache: Map<string, any>;
  private rateLimiter: RateLimiter;
  
  async categorizeFile(filename: string, extension: string): Promise<CategoryResult>;
  async suggestFileName(originalName: string): Promise<NamingResult>;
  async generateTags(filename: string): Promise<TaggingResult>;
  
  private async makeRequest(prompt: string): Promise<string>;
  private getCachedResult(key: string): any | null;
  private setCachedResult(key: string, value: any): void;
}
```

### 4. IPC Bridge

Electron main ve renderer process arasındaki iletişim.

#### IPCBridge Class

```typescript
// Main Process
class IPCBridge {
  constructor(private downloadManager: DownloadManager, private db: DatabaseService) {
    this.registerHandlers();
  }
  
  private registerHandlers(): void {
    ipcMain.handle('download:add', async (event, options: DownloadOptions) => {
      return await this.downloadManager.addDownload(options);
    });
    
    ipcMain.handle('download:pause', async (event, id: string) => {
      await this.downloadManager.pauseDownload(id);
    });
    
    ipcMain.handle('download:resume', async (event, id: string) => {
      await this.downloadManager.resumeDownload(id);
    });
    
    ipcMain.handle('download:cancel', async (event, id: string) => {
      await this.downloadManager.cancelDownload(id);
    });
    
    ipcMain.handle('download:getAll', async () => {
      return this.downloadManager.getAllDownloads();
    });
    
    ipcMain.handle('settings:get', async (event, key: string) => {
      return await this.db.getSetting(key);
    });
    
    ipcMain.handle('settings:set', async (event, key: string, value: string) => {
      await this.db.setSetting(key, value);
    });
  }
  
  sendProgressUpdate(downloadId: string, progress: DownloadProgress): void {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('download:progress', { downloadId, progress });
    });
  }
  
  sendDownloadComplete(downloadId: string): void {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('download:complete', downloadId);
    });
  }
}

// Renderer Process (preload.ts)
const electronAPI = {
  download: {
    add: (options: DownloadOptions) => ipcRenderer.invoke('download:add', options),
    pause: (id: string) => ipcRenderer.invoke('download:pause', id),
    resume: (id: string) => ipcRenderer.invoke('download:resume', id),
    cancel: (id: string) => ipcRenderer.invoke('download:cancel', id),
    getAll: () => ipcRenderer.invoke('download:getAll'),
    onProgress: (callback: (data: any) => void) => {
      ipcRenderer.on('download:progress', (event, data) => callback(data));
    },
    onComplete: (callback: (id: string) => void) => {
      ipcRenderer.on('download:complete', (event, id) => callback(id));
    }
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value)
  }
};

contextBridge.exposeInMainWorld('electron', electronAPI);
```

### 5. Browser Extension

Chrome/Edge eklentisi için native messaging host.

#### Extension Architecture

```
Browser Extension (MV3)
├── manifest.json
├── background.js (Service Worker)
├── content.js
└── native-host/
    ├── host.js (Node.js)
    └── com.novaget.host.json
```

#### Native Messaging Protocol

```typescript
interface NativeMessage {
  type: 'download' | 'ping' | 'status';
  data: any;
}

interface DownloadMessage {
  type: 'download';
  data: {
    url: string;
    filename: string;
    referrer?: string;
  };
}

// Native Host (host.js)
class NativeHost {
  private stdin = process.stdin;
  private stdout = process.stdout;
  
  start(): void {
    this.stdin.on('data', (data) => {
      const message = this.parseMessage(data);
      this.handleMessage(message);
    });
  }
  
  private handleMessage(message: NativeMessage): void {
    if (message.type === 'download') {
      // Send to Electron app via IPC or HTTP
      this.sendToElectron(message.data);
    }
  }
  
  private sendResponse(response: any): void {
    const message = JSON.stringify(response);
    const length = Buffer.byteLength(message);
    const header = Buffer.alloc(4);
    header.writeUInt32LE(length, 0);
    this.stdout.write(header);
    this.stdout.write(message);
  }
}
```

### 6. UI Components (Next.js)

#### State Management (Zustand)

```typescript
interface DownloadState {
  downloads: DownloadProgress[];
  settings: Record<string, string>;
  
  addDownload: (options: DownloadOptions) => Promise<void>;
  pauseDownload: (id: string) => Promise<void>;
  resumeDownload: (id: string) => Promise<void>;
  cancelDownload: (id: string) => Promise<void>;
  updateProgress: (id: string, progress: DownloadProgress) => void;
  loadDownloads: () => Promise<void>;
  
  getSetting: (key: string) => Promise<string | null>;
  setSetting: (key: string, value: string) => Promise<void>;
}

const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: [],
  settings: {},
  
  addDownload: async (options) => {
    const id = await window.electron.download.add(options);
    await get().loadDownloads();
  },
  
  pauseDownload: async (id) => {
    await window.electron.download.pause(id);
  },
  
  resumeDownload: async (id) => {
    await window.electron.download.resume(id);
  },
  
  cancelDownload: async (id) => {
    await window.electron.download.cancel(id);
    await get().loadDownloads();
  },
  
  updateProgress: (id, progress) => {
    set((state) => ({
      downloads: state.downloads.map(d => 
        d.downloadId === id ? progress : d
      )
    }));
  },
  
  loadDownloads: async () => {
    const downloads = await window.electron.download.getAll();
    set({ downloads });
  },
  
  getSetting: async (key) => {
    return await window.electron.settings.get(key);
  },
  
  setSetting: async (key, value) => {
    await window.electron.settings.set(key, value);
    set((state) => ({
      settings: { ...state.settings, [key]: value }
    }));
  }
}));
```

#### Key UI Components

```typescript
// DownloadCard Component
interface DownloadCardProps {
  download: DownloadProgress;
}

function DownloadCard({ download }: DownloadCardProps) {
  const { pauseDownload, resumeDownload, cancelDownload } = useDownloadStore();
  
  return (
    <div className="download-card">
      <div className="download-info">
        <h3>{download.filename}</h3>
        <ProgressBar percentage={download.percentage} />
        <div className="download-stats">
          <span>{formatBytes(download.downloadedBytes)} / {formatBytes(download.totalBytes)}</span>
          <span>{formatSpeed(download.speed)}</span>
          <span>{formatTime(download.remainingTime)}</span>
        </div>
      </div>
      <div className="download-actions">
        {download.status === 'downloading' && (
          <button onClick={() => pauseDownload(download.downloadId)}>Pause</button>
        )}
        {download.status === 'paused' && (
          <button onClick={() => resumeDownload(download.downloadId)}>Resume</button>
        )}
        <button onClick={() => cancelDownload(download.downloadId)}>Cancel</button>
      </div>
    </div>
  );
}

// SpeedChart Component
function SpeedChart({ downloadId }: { downloadId: string }) {
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);
  
  useEffect(() => {
    const unsubscribe = window.electron.download.onProgress((data) => {
      if (data.downloadId === downloadId) {
        setSpeedHistory(prev => [...prev.slice(-59), data.progress.speed]);
      }
    });
    
    return unsubscribe;
  }, [downloadId]);
  
  return (
    <LineChart data={speedHistory} />
  );
}

// AddDownloadDialog Component
function AddDownloadDialog() {
  const [url, setUrl] = useState('');
  const [directory, setDirectory] = useState('');
  const { addDownload } = useDownloadStore();
  
  const handleSubmit = async () => {
    await addDownload({ url, directory });
    setUrl('');
  };
  
  return (
    <dialog>
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL" />
      <input value={directory} onChange={(e) => setDirectory(e.target.value)} placeholder="Directory" />
      <button onClick={handleSubmit}>Add Download</button>
    </dialog>
  );
}
```

## Data Models

### Database Schema

```sql
-- Downloads table
CREATE TABLE downloads (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  directory TEXT NOT NULL,
  total_bytes INTEGER NOT NULL DEFAULT 0,
  downloaded_bytes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('queued', 'downloading', 'paused', 'completed', 'failed')),
  category TEXT,
  tags TEXT, -- JSON array
  ai_suggested_name TEXT,
  scheduled_time INTEGER, -- Unix timestamp
  speed_limit INTEGER, -- bytes/second
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  error_message TEXT
);

CREATE INDEX idx_downloads_status ON downloads(status);
CREATE INDEX idx_downloads_created_at ON downloads(created_at DESC);
CREATE INDEX idx_downloads_category ON downloads(category);

-- Segments table
CREATE TABLE segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  download_id TEXT NOT NULL,
  segment_number INTEGER NOT NULL,
  start_byte INTEGER NOT NULL,
  end_byte INTEGER NOT NULL,
  downloaded_bytes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('pending', 'downloading', 'completed', 'failed')),
  temp_file_path TEXT,
  FOREIGN KEY (download_id) REFERENCES downloads(id) ON DELETE CASCADE,
  UNIQUE(download_id, segment_number)
);

CREATE INDEX idx_segments_download_id ON segments(download_id);

-- Settings table
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Speed history table (for charts)
CREATE TABLE speed_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  download_id TEXT NOT NULL,
  speed INTEGER NOT NULL, -- bytes/second
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (download_id) REFERENCES downloads(id) ON DELETE CASCADE
);

CREATE INDEX idx_speed_history_download_id ON speed_history(download_id, timestamp DESC);
```

## Error Handling

### Error Types

```typescript
class DownloadError extends Error {
  constructor(
    message: string,
    public code: string,
    public downloadId: string,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'DownloadError';
  }
}

enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  INVALID_URL = 'INVALID_URL',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DISK_FULL = 'DISK_FULL',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT = 'TIMEOUT',
  CHECKSUM_MISMATCH = 'CHECKSUM_MISMATCH'
}
```

### Error Handling Strategy

1. **Network Errors**: Otomatik retry (max 3 kez), exponential backoff
2. **File System Errors**: Kullanıcıya bildir, alternatif klasör öner
3. **Server Errors**: HTTP status koduna göre retry veya fail
4. **Timeout**: Segment bazında retry
5. **Checksum Mismatch**: Tüm indirmeyi yeniden başlat

### Retry Logic

```typescript
class RetryManager {
  private maxRetries: number = 3;
  private baseDelay: number = 1000; // ms
  
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    errorCode: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (!this.isRetryable(error) || attempt === this.maxRetries) {
          throw error;
        }
        
        const delay = this.baseDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }
  
  private isRetryable(error: Error): boolean {
    if (error instanceof DownloadError) {
      return error.retryable;
    }
    return true;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Testing Strategy

### Unit Tests

- **Download Engine**: Segment oluşturma, birleştirme, hız sınırlama
- **Database Service**: CRUD operasyonları, migration
- **AI Service**: API çağrıları (mocked), cache mekanizması
- **Speed Limiter**: Rate limiting algoritması

### Integration Tests

- **IPC Communication**: Main ve renderer process arası veri akışı
- **Download Flow**: URL ekleme → indirme → tamamlanma
- **Database Persistence**: Uygulama yeniden başlatıldığında state recovery
- **AI Integration**: Pollinations.ai API ile gerçek çağrılar (optional)

### E2E Tests

- **Complete Download Flow**: Kullanıcı URL ekler → indirme tamamlanır → dosya doğrulanır
- **Pause/Resume**: İndirme duraklatılır → devam ettirilir → tamamlanır
- **Browser Extension**: Tarayıcıdan link yakalanır → NovaGet'e gönderilir
- **Settings Persistence**: Ayarlar değiştirilir → uygulama yeniden başlatılır → ayarlar korunur

### Test Tools

- **Unit**: Vitest
- **Integration**: Vitest + Electron test utils
- **E2E**: Playwright
- **Mocking**: MSW (Mock Service Worker) for API calls

## Performance Considerations

### Optimization Strategies

1. **Segment Count**: Dinamik olarak bağlantı hızına göre ayarla (4-16 arası)
2. **Memory Management**: Segment buffer'ları stream olarak işle, tüm dosyayı memory'de tutma
3. **Database**: Batch insert/update, prepared statements kullan
4. **UI Updates**: Progress güncellemelerini throttle et (max 100ms)
5. **AI Caching**: Aynı dosya adı için tekrar API çağrısı yapma

### Resource Limits

- **Max Concurrent Downloads**: 5 (kullanıcı ayarlanabilir)
- **Max Segments per Download**: 16
- **Database Connection Pool**: 5
- **AI Request Rate Limit**: 10 req/min
- **Memory per Download**: ~50MB (segment buffers)

## Security Considerations

1. **URL Validation**: Sadece HTTP/HTTPS/FTP protokollerini kabul et
2. **Path Traversal**: Dosya yollarını sanitize et
3. **Content-Type Validation**: İndirilen dosyanın MIME type'ını kontrol et
4. **Checksum Verification**: MD5/SHA256 hash kontrolü (varsa)
5. **Sandbox**: Electron contextIsolation ve nodeIntegration:false kullan
6. **CSP**: Content Security Policy uygula
7. **API Keys**: Pollinations.ai için rate limiting ve error handling

## Deployment

### Build Process

```bash
# Install dependencies
npm install

# Build Next.js app
npm run build:next

# Build Electron app
npm run build:electron

# Package for distribution
npm run package:win   # Windows
npm run package:mac   # macOS
npm run package:linux # Linux
```

### Distribution

- **Windows**: NSIS installer (.exe)
- **macOS**: DMG image (.dmg)
- **Linux**: AppImage (.appimage) ve DEB package (.deb)

### Auto-Update

Electron-builder auto-updater kullanarak otomatik güncelleme desteği.

```typescript
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();

autoUpdater.on('update-available', () => {
  // Kullanıcıya bildir
});

autoUpdater.on('update-downloaded', () => {
  // Yeniden başlatma seçeneği sun
});
```

### 7. Internationalization (i18n) Service

Çoklu dil desteği için servis.

#### i18nService Class

```typescript
interface Translation {
  [key: string]: string | Translation;
}

interface LanguageConfig {
  code: string;
  name: string;
  translations: Translation;
}

class i18nService {
  private currentLanguage: string = 'tr';
  private translations: Map<string, Translation> = new Map();
  private fallbackLanguage: string = 'en';
  
  async loadLanguage(languageCode: string): Promise<void> {
    const translationPath = path.join(__dirname, 'locales', `${languageCode}.json`);
    const data = await fs.readFile(translationPath, 'utf-8');
    const translations = JSON.parse(data);
    this.translations.set(languageCode, translations);
  }
  
  setLanguage(languageCode: string): void {
    if (this.translations.has(languageCode)) {
      this.currentLanguage = languageCode;
    }
  }
  
  translate(key: string, params?: Record<string, string>): string {
    const keys = key.split('.');
    let translation = this.translations.get(this.currentLanguage);
    
    for (const k of keys) {
      if (translation && typeof translation === 'object') {
        translation = translation[k];
      } else {
        // Fallback to English
        translation = this.translations.get(this.fallbackLanguage);
        for (const fk of keys) {
          if (translation && typeof translation === 'object') {
            translation = translation[fk];
          }
        }
        break;
      }
    }
    
    if (typeof translation === 'string') {
      return this.interpolate(translation, params);
    }
    
    return key; // Return key if translation not found
  }
  
  private interpolate(text: string, params?: Record<string, string>): string {
    if (!params) return text;
    
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] || match;
    });
  }
  
  getAvailableLanguages(): string[] {
    return Array.from(this.translations.keys());
  }
}
```

#### Translation File Structure

```json
// locales/tr.json
{
  "common": {
    "add": "Ekle",
    "cancel": "İptal",
    "pause": "Duraklat",
    "resume": "Devam Et",
    "delete": "Sil",
    "settings": "Ayarlar"
  },
  "download": {
    "title": "İndirmeler",
    "addNew": "Yeni İndirme Ekle",
    "status": {
      "queued": "Kuyrukta",
      "downloading": "İndiriliyor",
      "paused": "Duraklatıldı",
      "completed": "Tamamlandı",
      "failed": "Başarısız"
    },
    "speed": "Hız: {{speed}}",
    "remaining": "Kalan: {{time}}"
  },
  "settings": {
    "title": "Ayarlar",
    "language": "Dil",
    "theme": "Tema",
    "downloadPath": "İndirme Klasörü"
  }
}

// locales/en.json
{
  "common": {
    "add": "Add",
    "cancel": "Cancel",
    "pause": "Pause",
    "resume": "Resume",
    "delete": "Delete",
    "settings": "Settings"
  },
  "download": {
    "title": "Downloads",
    "addNew": "Add New Download",
    "status": {
      "queued": "Queued",
      "downloading": "Downloading",
      "paused": "Paused",
      "completed": "Completed",
      "failed": "Failed"
    },
    "speed": "Speed: {{speed}}",
    "remaining": "Remaining: {{time}}"
  },
  "settings": {
    "title": "Settings",
    "language": "Language",
    "theme": "Theme",
    "downloadPath": "Download Path"
  }
}
```

#### React Hook for i18n

```typescript
// hooks/useTranslation.ts
import { create } from 'zustand';

interface i18nStore {
  language: string;
  setLanguage: (lang: string) => Promise<void>;
  t: (key: string, params?: Record<string, string>) => string;
}

const usei18nStore = create<i18nStore>((set, get) => ({
  language: 'tr',
  
  setLanguage: async (lang: string) => {
    await window.electron.i18n.setLanguage(lang);
    set({ language: lang });
  },
  
  t: (key: string, params?: Record<string, string>) => {
    return window.electron.i18n.translate(key, params);
  }
}));

export function useTranslation() {
  const { language, setLanguage, t } = usei18nStore();
  return { language, setLanguage, t };
}
```

### 8. Modern Browser Extension UI

Extension'ın modern ve kullanıcı dostu bir arayüze sahip olması için yeni tasarım.

#### Extension Popup Component

```typescript
// extension/popup/Popup.tsx
interface ExtensionState {
  connected: boolean;
  autoIntercept: boolean;
  activeDownloads: number;
}

function ExtensionPopup() {
  const [state, setState] = useState<ExtensionState>({
    connected: false,
    autoIntercept: true,
    activeDownloads: 0
  });
  
  useEffect(() => {
    // Check connection to NovaGet
    checkConnection();
    // Load settings
    loadSettings();
  }, []);
  
  const checkConnection = async () => {
    try {
      const response = await chrome.runtime.sendNativeMessage(
        'com.novaget.host',
        { type: 'ping' }
      );
      setState(prev => ({ ...prev, connected: response.success }));
    } catch (error) {
      setState(prev => ({ ...prev, connected: false }));
    }
  };
  
  const toggleAutoIntercept = async () => {
    const newValue = !state.autoIntercept;
    await chrome.storage.local.set({ autoIntercept: newValue });
    setState(prev => ({ ...prev, autoIntercept: newValue }));
  };
  
  return (
    <div className="popup-container">
      <header className="popup-header">
        <img src="logo.svg" alt="NovaGet" />
        <h1>NovaGet</h1>
      </header>
      
      <div className="connection-status">
        <div className={`status-indicator ${state.connected ? 'connected' : 'disconnected'}`}>
          {state.connected ? '● Connected to NovaGet (HTTP)' : '● Disconnected'}
        </div>
      </div>
      
      <div className="settings-section">
        <div className="setting-item">
          <label>Enable Extension</label>
          <Toggle checked={state.autoIntercept} onChange={toggleAutoIntercept} />
        </div>
        
        <div className="setting-item">
          <label>Auto-intercept Downloads</label>
          <Toggle checked={state.autoIntercept} onChange={toggleAutoIntercept} />
        </div>
      </div>
      
      <button className="test-connection-btn" onClick={checkConnection}>
        Test Connection
      </button>
      
      <button className="settings-btn" onClick={() => chrome.runtime.openOptionsPage()}>
        Settings
      </button>
      
      {state.activeDownloads > 0 && (
        <div className="active-downloads">
          {state.activeDownloads} active downloads
        </div>
      )}
    </div>
  );
}
```

#### Extension Styling

```css
/* extension/popup/styles.css */
.popup-container {
  width: 320px;
  padding: 16px;
  font-family: 'Inter', sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.popup-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.popup-header img {
  width: 32px;
  height: 32px;
}

.connection-status {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.status-indicator.connected {
  color: #4ade80;
}

.status-indicator.disconnected {
  color: #f87171;
}

.settings-section {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

button {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 8px;
  transition: background 0.2s;
}

button:hover {
  background: rgba(255, 255, 255, 0.3);
}
```

### 9. Social Media Downloader Service

YouTube, Instagram, TikTok ve diğer platformlardan medya indirme.

#### SocialMediaService Class

```typescript
interface MediaInfo {
  platform: 'youtube' | 'instagram' | 'tiktok' | 'google';
  type: 'video' | 'image';
  url: string;
  title: string;
  thumbnail?: string;
  qualities?: QualityOption[];
}

interface QualityOption {
  quality: string; // '360p', '720p', '1080p', etc.
  format: string; // 'mp4', 'webm', etc.
  size?: number; // bytes
  url: string;
}

class SocialMediaService {
  private ytDlpPath: string;
  
  async detectMedia(url: string): Promise<MediaInfo | null> {
    const platform = this.detectPlatform(url);
    if (!platform) return null;
    
    return await this.extractMediaInfo(url, platform);
  }
  
  private detectPlatform(url: string): string | null {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('google.com')) return 'google';
    return null;
  }
  
  private async extractMediaInfo(url: string, platform: string): Promise<MediaInfo> {
    // Use yt-dlp or similar tool to extract media info
    const result = await this.executeYtDlp([
      '--dump-json',
      '--no-playlist',
      url
    ]);
    
    const info = JSON.parse(result);
    
    return {
      platform: platform as any,
      type: info.ext === 'mp4' ? 'video' : 'image',
      url: url,
      title: info.title,
      thumbnail: info.thumbnail,
      qualities: this.parseQualities(info.formats)
    };
  }
  
  private parseQualities(formats: any[]): QualityOption[] {
    return formats
      .filter(f => f.vcodec !== 'none' && f.acodec !== 'none')
      .map(f => ({
        quality: f.height ? `${f.height}p` : 'unknown',
        format: f.ext,
        size: f.filesize,
        url: f.url
      }))
      .sort((a, b) => {
        const aHeight = parseInt(a.quality);
        const bHeight = parseInt(b.quality);
        return bHeight - aHeight;
      });
  }
  
  private async executeYtDlp(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ytDlpPath, args);
      let output = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`yt-dlp exited with code ${code}`));
        }
      });
    });
  }
}
```

#### Content Script for Media Detection

```typescript
// extension/content/mediaDetector.ts
class MediaDetector {
  private observer: MutationObserver;
  
  start() {
    this.injectDownloadButtons();
    this.observeDOM();
  }
  
  private injectDownloadButtons() {
    const platform = this.detectCurrentPlatform();
    
    if (platform === 'youtube') {
      this.injectYouTubeButton();
    } else if (platform === 'instagram') {
      this.injectInstagramButton();
    } else if (platform === 'tiktok') {
      this.injectTikTokButton();
    }
  }
  
  private injectYouTubeButton() {
    const videoPlayer = document.querySelector('.html5-video-player');
    if (!videoPlayer) return;
    
    const button = this.createDownloadButton();
    button.style.position = 'absolute';
    button.style.bottom = '80px';
    button.style.right = '12px';
    button.style.zIndex = '1000';
    
    button.addEventListener('click', async () => {
      const videoUrl = window.location.href;
      const qualities = await this.fetchQualities(videoUrl);
      this.showQualitySelector(qualities);
    });
    
    videoPlayer.appendChild(button);
  }
  
  private createDownloadButton(): HTMLElement {
    const button = document.createElement('div');
    button.className = 'novaget-download-btn';
    button.innerHTML = `
      <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
      </svg>
    `;
    button.style.cssText = `
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: transform 0.2s;
    `;
    
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
    });
    
    return button;
  }
  
  private async fetchQualities(url: string): Promise<QualityOption[]> {
    const response = await chrome.runtime.sendMessage({
      type: 'getMediaQualities',
      url: url
    });
    return response.qualities;
  }
  
  private showQualitySelector(qualities: QualityOption[]) {
    const modal = document.createElement('div');
    modal.className = 'novaget-quality-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Select Quality</h3>
        <div class="quality-list">
          ${qualities.map(q => `
            <button class="quality-option" data-url="${q.url}">
              ${q.quality} - ${q.format} ${q.size ? `(${this.formatBytes(q.size)})` : ''}
            </button>
          `).join('')}
        </div>
        <button class="close-btn">Cancel</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelectorAll('.quality-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const url = (e.target as HTMLElement).dataset.url;
        this.startDownload(url!);
        modal.remove();
      });
    });
    
    modal.querySelector('.close-btn')?.addEventListener('click', () => {
      modal.remove();
    });
  }
  
  private async startDownload(url: string) {
    await chrome.runtime.sendMessage({
      type: 'startDownload',
      url: url
    });
  }
  
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }
  
  private detectCurrentPlatform(): string | null {
    const hostname = window.location.hostname;
    if (hostname.includes('youtube.com')) return 'youtube';
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('tiktok.com')) return 'tiktok';
    if (hostname.includes('google.com')) return 'google';
    return null;
  }
  
  private observeDOM() {
    this.observer = new MutationObserver(() => {
      this.injectDownloadButtons();
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Initialize
const detector = new MediaDetector();
detector.start();
```

### 10. Speedtest Service

Internet bağlantı hızını test etme servisi.

#### SpeedtestService Class

```typescript
interface SpeedtestResult {
  id: string;
  downloadSpeed: number; // Mbps
  uploadSpeed: number; // Mbps
  ping: number; // ms
  jitter: number; // ms
  timestamp: Date;
  server?: string;
}

class SpeedtestService {
  private testServers: string[] = [
    'https://speed.cloudflare.com/__down',
    'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png'
  ];
  
  async runSpeedtest(): Promise<SpeedtestResult> {
    const ping = await this.measurePing();
    const downloadSpeed = await this.measureDownloadSpeed();
    const uploadSpeed = await this.measureUploadSpeed();
    
    const result: SpeedtestResult = {
      id: uuidv4(),
      downloadSpeed,
      uploadSpeed,
      ping: ping.average,
      jitter: ping.jitter,
      timestamp: new Date()
    };
    
    return result;
  }
  
  private async measurePing(): Promise<{ average: number; jitter: number }> {
    const pings: number[] = [];
    
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      try {
        await fetch(this.testServers[0], { method: 'HEAD', cache: 'no-cache' });
        const end = Date.now();
        pings.push(end - start);
      } catch (error) {
        console.error('Ping measurement failed:', error);
      }
      
      await this.sleep(100);
    }
    
    const average = pings.reduce((a, b) => a + b, 0) / pings.length;
    const jitter = Math.max(...pings) - Math.min(...pings);
    
    return { average, jitter };
  }
  
  private async measureDownloadSpeed(): Promise<number> {
    const testDuration = 10000; // 10 seconds
    const testFileSize = 10 * 1024 * 1024; // 10 MB
    
    const startTime = Date.now();
    let totalBytes = 0;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), testDuration);
    
    try {
      const response = await fetch(this.testServers[0], {
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      const reader = response.body!.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        totalBytes += value.length;
        
        if (Date.now() - startTime >= testDuration) {
          break;
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Download speed measurement failed:', error);
      }
    } finally {
      clearTimeout(timeout);
    }
    
    const duration = (Date.now() - startTime) / 1000; // seconds
    const speedMbps = (totalBytes * 8) / (duration * 1000000); // Convert to Mbps
    
    return Math.round(speedMbps * 100) / 100;
  }
  
  private async measureUploadSpeed(): Promise<number> {
    const testDuration = 10000; // 10 seconds
    const chunkSize = 1024 * 1024; // 1 MB chunks
    
    const startTime = Date.now();
    let totalBytes = 0;
    
    try {
      while (Date.now() - startTime < testDuration) {
        const data = new Uint8Array(chunkSize);
        crypto.getRandomValues(data);
        
        await fetch(this.testServers[0], {
          method: 'POST',
          body: data,
          cache: 'no-cache'
        });
        
        totalBytes += chunkSize;
      }
    } catch (error) {
      console.error('Upload speed measurement failed:', error);
    }
    
    const duration = (Date.now() - startTime) / 1000; // seconds
    const speedMbps = (totalBytes * 8) / (duration * 1000000); // Convert to Mbps
    
    return Math.round(speedMbps * 100) / 100;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### Speedtest UI Component

```typescript
// components/SpeedtestPanel.tsx
function SpeedtestPanel() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<SpeedtestResult | null>(null);
  const [history, setHistory] = useState<SpeedtestResult[]>([]);
  
  useEffect(() => {
    loadHistory();
  }, []);
  
  const loadHistory = async () => {
    const results = await window.electron.speedtest.getHistory();
    setHistory(results);
  };
  
  const runTest = async () => {
    setTesting(true);
    try {
      const result = await window.electron.speedtest.run();
      setResult(result);
      await loadHistory();
    } catch (error) {
      console.error('Speedtest failed:', error);
    } finally {
      setTesting(false);
    }
  };
  
  return (
    <div className="speedtest-panel">
      <h2>Internet Speed Test</h2>
      
      {testing ? (
        <div className="testing-indicator">
          <Spinner />
          <p>Testing your connection...</p>
        </div>
      ) : result ? (
        <div className="speedtest-result">
          <div className="result-card">
            <h3>Download</h3>
            <p className="speed-value">{result.downloadSpeed} Mbps</p>
          </div>
          <div className="result-card">
            <h3>Upload</h3>
            <p className="speed-value">{result.uploadSpeed} Mbps</p>
          </div>
          <div className="result-card">
            <h3>Ping</h3>
            <p className="speed-value">{result.ping} ms</p>
          </div>
          <div className="result-card">
            <h3>Jitter</h3>
            <p className="speed-value">{result.jitter} ms</p>
          </div>
        </div>
      ) : (
        <button onClick={runTest} className="start-test-btn">
          Start Speed Test
        </button>
      )}
      
      {history.length > 0 && (
        <div className="speedtest-history">
          <h3>Test History</h3>
          <SpeedtestChart data={history} />
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Download</th>
                <th>Upload</th>
                <th>Ping</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id}>
                  <td>{new Date(h.timestamp).toLocaleString()}</td>
                  <td>{h.downloadSpeed} Mbps</td>
                  <td>{h.uploadSpeed} Mbps</td>
                  <td>{h.ping} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

#### Database Schema Update

```sql
-- Speedtest results table
CREATE TABLE speedtest_results (
  id TEXT PRIMARY KEY,
  download_speed REAL NOT NULL, -- Mbps
  upload_speed REAL NOT NULL, -- Mbps
  ping REAL NOT NULL, -- ms
  jitter REAL NOT NULL, -- ms
  server TEXT,
  timestamp INTEGER NOT NULL
);

CREATE INDEX idx_speedtest_timestamp ON speedtest_results(timestamp DESC);
```

## Future Enhancements

1. **Cloud Sync**: İndirme geçmişini bulut'a yedekleme (optional)
2. **Torrent Support**: BitTorrent protokolü desteği
3. **Video Streaming**: HLS/DASH stream indirme
4. **Batch Downloads**: Toplu URL ekleme (CSV, TXT)
5. **Advanced Scheduling**: Cron-like zamanlama
6. **Bandwidth Monitoring**: Gerçek zamanlı ağ kullanımı grafiği
7. **Plugin System**: Üçüncü parti eklenti desteği
8. **Mobile App**: React Native ile mobil versiyon
9. **More Languages**: Daha fazla dil desteği (Almanca, Fransızca, İspanyolca, vb.)
10. **More Social Platforms**: Twitter, Facebook, Reddit medya indirme desteği
