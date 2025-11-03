import { create } from 'zustand';
import { DownloadProgress, DownloadOptions } from '@/types/electron';
import { useToastStore } from './toastStore';

interface DownloadState {
  downloads: DownloadProgress[];
  isLoading: boolean;
  error: string | null;

  // Actions
  addDownload: (options: DownloadOptions) => Promise<boolean>;
  pauseDownload: (downloadId: string) => Promise<void>;
  resumeDownload: (downloadId: string) => Promise<void>;
  cancelDownload: (downloadId: string) => Promise<void>;
  retryDownload: (downloadId: string) => Promise<void>;
  pauseAll: () => Promise<void>;
  resumeAll: () => Promise<void>;
  clearCompleted: () => Promise<void>;
  setSpeedLimit: (downloadId: string, bytesPerSecond: number) => Promise<void>;

  // State updates
  updateDownload: (downloadId: string, progress: DownloadProgress) => void;
  removeDownload: (downloadId: string) => void;
  loadDownloads: () => Promise<void>;
  setError: (error: string | null) => void;

  // Filters
  getDownloadsByStatus: (status: string) => DownloadProgress[];
  getActiveDownloads: () => DownloadProgress[];
  getCompletedDownloads: () => DownloadProgress[];
  getTotalSpeed: () => number;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: [],
  isLoading: false,
  error: null,

  addDownload: async (options: DownloadOptions): Promise<boolean> => {
    try {
      set({ isLoading: true, error: null });
      
      if (typeof window !== 'undefined' && window.electron) {
        const response = await window.electron.download.add(options);
        
        if (response.success) {
          await get().loadDownloads();
          useToastStore.getState().success('İndirme Eklendi', 'İndirme kuyruğa eklendi.');
          return true;
        } else {
          const errorMsg = response.error || 'Failed to add download';
          set({ error: errorMsg });
          useToastStore.getState().error('İndirme Eklenemedi', errorMsg);
          return false;
        }
      }
      return false;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to add download';
      set({ error: errorMsg });
      useToastStore.getState().error('İndirme Eklenemedi', errorMsg);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  pauseDownload: async (downloadId: string) => {
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const response = await window.electron.download.pause(downloadId);
        
        if (!response.success) {
          const errorMsg = response.error || 'Failed to pause download';
          set({ error: errorMsg });
          useToastStore.getState().error('Duraklatma Hatası', errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to pause download';
      set({ error: errorMsg });
      useToastStore.getState().error('Duraklatma Hatası', errorMsg);
    }
  },

  resumeDownload: async (downloadId: string) => {
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const response = await window.electron.download.resume(downloadId);
        
        if (!response.success) {
          const errorMsg = response.error || 'Failed to resume download';
          set({ error: errorMsg });
          useToastStore.getState().error('Devam Ettirme Hatası', errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to resume download';
      set({ error: errorMsg });
      useToastStore.getState().error('Devam Ettirme Hatası', errorMsg);
    }
  },

  cancelDownload: async (downloadId: string) => {
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const response = await window.electron.download.cancel(downloadId);
        
        if (response.success) {
          set((state) => ({
            downloads: state.downloads.filter((d) => d.downloadId !== downloadId),
          }));
        } else {
          set({ error: response.error || 'Failed to cancel download' });
        }
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to cancel download' });
    }
  },

  retryDownload: async (downloadId: string) => {
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const response = await window.electron.download.retry(downloadId);
        
        if (!response.success) {
          set({ error: response.error || 'Failed to retry download' });
        }
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to retry download' });
    }
  },

  pauseAll: async () => {
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const response = await window.electron.download.pauseAll();
        
        if (!response.success) {
          set({ error: response.error || 'Failed to pause all downloads' });
        }
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to pause all downloads' });
    }
  },

  resumeAll: async () => {
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const response = await window.electron.download.resumeAll();
        
        if (!response.success) {
          set({ error: response.error || 'Failed to resume all downloads' });
        }
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to resume all downloads' });
    }
  },

  clearCompleted: async () => {
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const response = await window.electron.download.clearCompleted();
        
        if (response.success) {
          set((state) => ({
            downloads: state.downloads.filter((d) => d.status !== 'completed'),
          }));
        } else {
          set({ error: response.error || 'Failed to clear completed downloads' });
        }
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to clear completed downloads' });
    }
  },

  setSpeedLimit: async (downloadId: string, bytesPerSecond: number) => {
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const response = await window.electron.download.setSpeedLimit(downloadId, bytesPerSecond);
        
        if (!response.success) {
          set({ error: response.error || 'Failed to set speed limit' });
        }
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to set speed limit' });
    }
  },

  updateDownload: (downloadId: string, progress: DownloadProgress) => {
    set((state) => {
      const index = state.downloads.findIndex((d) => d.downloadId === downloadId);
      if (index === -1) {
        // Download not found, add it
        return { downloads: [...state.downloads, progress] };
      }
      
      // Throttle updates - only update if there's a meaningful change
      const existing = state.downloads[index];
      const now = Date.now();
      const lastUpdate = (existing as any)._lastUpdate || 0;
      const timeSinceLastUpdate = now - lastUpdate;
      
      // Throttle to max 10 updates per second (100ms)
      if (timeSinceLastUpdate < 100) {
        // Check if it's a status change or completion - these should always update
        if (
          existing.status === progress.status &&
          progress.status !== 'completed' &&
          progress.status !== 'failed'
        ) {
          return state;
        }
      }
      
      // Only update if there's a meaningful change
      if (
        existing.status === progress.status &&
        Math.abs(existing.percentage - progress.percentage) < 0.5 &&
        Math.abs(existing.speed - progress.speed) < 1024 // Less than 1KB/s difference
      ) {
        // No significant change, skip update
        return state;
      }
      
      // Update the download with timestamp
      const newDownloads = [...state.downloads];
      newDownloads[index] = { ...progress, _lastUpdate: now } as any;
      return { downloads: newDownloads };
    });
  },

  removeDownload: (downloadId: string) => {
    set((state) => ({
      downloads: state.downloads.filter((d) => d.downloadId !== downloadId),
    }));
  },

  loadDownloads: async () => {
    try {
      set({ isLoading: true, error: null });
      
      if (typeof window !== 'undefined' && window.electron) {
        const response = await window.electron.download.getAll();
        
        if (response.success && response.downloads) {
          set({ downloads: response.downloads });
        } else {
          set({ error: response.error || 'Failed to load downloads' });
        }
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load downloads' });
    } finally {
      set({ isLoading: false });
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },

  getDownloadsByStatus: (status: string) => {
    return get().downloads.filter((d) => d.status === status);
  },

  getActiveDownloads: () => {
    return get().downloads.filter((d) => d.status === 'downloading' || d.status === 'queued');
  },

  getCompletedDownloads: () => {
    return get().downloads.filter((d) => d.status === 'completed');
  },

  getTotalSpeed: () => {
    return get()
      .downloads.filter((d) => d.status === 'downloading')
      .reduce((total, d) => total + d.speed, 0);
  },
}));
