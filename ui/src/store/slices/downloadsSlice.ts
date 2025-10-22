import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Download, DownloadProgress } from '../../types/download';
import { DownloadStatus } from '../../types/download';

interface DownloadsState {
  downloads: Download[];
  selectedCategory: string | null;
  searchQuery: string;
}

const initialState: DownloadsState = {
  downloads: [],
  selectedCategory: null,
  searchQuery: '',
};

const downloadsSlice = createSlice({
  name: 'downloads',
  initialState,
  reducers: {
    addDownload: (state, action: PayloadAction<Download>) => {
      state.downloads.unshift(action.payload);
    },
    updateDownload: (state, action: PayloadAction<Partial<Download> & { id: string }>) => {
      const index = state.downloads.findIndex(d => d.id === action.payload.id);
      if (index !== -1) {
        state.downloads[index] = { ...state.downloads[index], ...action.payload };
      }
    },
    updateDownloadProgress: (state, action: PayloadAction<DownloadProgress>) => {
      const index = state.downloads.findIndex(d => d.id === action.payload.downloadId);
      if (index !== -1) {
        state.downloads[index].downloadedSize = action.payload.downloadedBytes;
        state.downloads[index].currentSpeed = action.payload.currentSpeed;
        state.downloads[index].estimatedTimeRemaining = action.payload.estimatedTimeRemaining;
        state.downloads[index].percentComplete = action.payload.percentComplete;
      }
    },
    removeDownload: (state, action: PayloadAction<string>) => {
      state.downloads = state.downloads.filter(d => d.id !== action.payload);
    },
    setDownloads: (state, action: PayloadAction<Download[]>) => {
      state.downloads = action.payload;
    },
    setSelectedCategory: (state, action: PayloadAction<string | null>) => {
      state.selectedCategory = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    updateDownloadStatus: (state, action: PayloadAction<{ id: string; status: DownloadStatus }>) => {
      const index = state.downloads.findIndex(d => d.id === action.payload.id);
      if (index !== -1) {
        state.downloads[index].status = action.payload.status;
      }
    },
  },
});

export const {
  addDownload,
  updateDownload,
  updateDownloadProgress,
  removeDownload,
  setDownloads,
  setSelectedCategory,
  setSearchQuery,
  updateDownloadStatus,
} = downloadsSlice.actions;

export default downloadsSlice.reducer;
