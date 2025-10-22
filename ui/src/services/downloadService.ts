import type { Download, DownloadRequest, DownloadProgress } from '../types/download';

const API_BASE_URL = 'http://localhost:5000/api';

export const downloadService = {
  async getDownloads(): Promise<Download[]> {
    const response = await fetch(`${API_BASE_URL}/downloads`);
    if (!response.ok) {
      throw new Error('Failed to fetch downloads');
    }
    return response.json();
  },

  async createDownload(request: DownloadRequest): Promise<Download> {
    const response = await fetch(`${API_BASE_URL}/downloads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error('Failed to create download');
    }
    return response.json();
  },

  async pauseDownload(downloadId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/downloads/${downloadId}/pause`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to pause download');
    }
  },

  async resumeDownload(downloadId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/downloads/${downloadId}/resume`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to resume download');
    }
  },

  async cancelDownload(downloadId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/downloads/${downloadId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to cancel download');
    }
  },

  async getDownloadDetails(downloadId: string): Promise<Download> {
    const response = await fetch(`${API_BASE_URL}/downloads/${downloadId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch download details');
    }
    return response.json();
  },

  // Server-Sent Events for real-time progress
  subscribeToProgress(downloadId: string, onProgress: (progress: DownloadProgress) => void): EventSource {
    const eventSource = new EventSource(`${API_BASE_URL}/downloads/${downloadId}/progress`);
    
    eventSource.onmessage = (event) => {
      const progress: DownloadProgress = JSON.parse(event.data);
      onProgress(progress);
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      eventSource.close();
    };

    return eventSource;
  },

  async openFolder(filePath: string): Promise<void> {
    // This will be handled by Electron IPC
    if (window.electronAPI) {
      await window.electronAPI.shell.openFolder(filePath);
    }
  },
};
