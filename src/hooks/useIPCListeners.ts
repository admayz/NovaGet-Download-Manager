import { useEffect, useRef } from 'react';
import { useDownloadStore } from '@/store/downloadStore';
import { useToastStore } from '@/store/toastStore';

export function useIPCListeners() {
  const { updateDownload, removeDownload, loadDownloads } = useDownloadStore();
  const { success, error: showError } = useToastStore();
  
  // Throttle progress updates to prevent excessive re-renders
  const progressThrottleRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electron) {
      return;
    }

    // Listen for progress updates (throttled)
    const unsubscribeProgress = window.electron.download.onProgress((progress) => {
      const now = Date.now();
      const lastUpdate = progressThrottleRef.current.get(progress.downloadId) || 0;
      
      // Only update every 100ms per download
      if (now - lastUpdate > 100) {
        updateDownload(progress.downloadId, progress);
        progressThrottleRef.current.set(progress.downloadId, now);
      }
    });

    // Listen for download completion
    const unsubscribeComplete = window.electron.download.onComplete((progress) => {
      updateDownload(progress.downloadId, progress);
      success('İndirme Tamamlandı', `${progress.filename} başarıyla indirildi.`);
    });

    // Listen for download errors
    const unsubscribeError = window.electron.download.onError((data) => {
      updateDownload(data.downloadId, data.progress);
      showError(
        'İndirme Hatası',
        `${data.progress.filename}: ${data.error}`,
        7000
      );
    });

    // Listen for download added
    const unsubscribeAdded = window.electron.download.onAdded((downloadId) => {
      loadDownloads();
    });

    // Listen for download cancelled
    const unsubscribeCancelled = window.electron.download.onCancelled((downloadId) => {
      removeDownload(downloadId);
    });

    // Listen for status changes
    const unsubscribeStatusChange = window.electron.download.onStatusChange((data) => {
      loadDownloads();
    });

    // Listen for completed downloads cleared
    const unsubscribeCompletedCleared = window.electron.download.onCompletedCleared((downloadIds) => {
      downloadIds.forEach((id) => removeDownload(id));
    });

    // Load initial downloads
    loadDownloads();

    // Cleanup listeners on unmount
    return () => {
      unsubscribeProgress();
      unsubscribeComplete();
      unsubscribeError();
      unsubscribeAdded();
      unsubscribeCancelled();
      unsubscribeStatusChange();
      unsubscribeCompletedCleared();
    };
  }, [updateDownload, removeDownload, loadDownloads]);
}
