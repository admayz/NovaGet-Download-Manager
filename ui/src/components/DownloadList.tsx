import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import DownloadItem from './DownloadItem';
import FilePreview from './FilePreview';
import { downloadService } from '../services/downloadService';
import { updateDownloadStatus, removeDownload } from '../store/slices/downloadsSlice';
import { DownloadStatus, type Download } from '../types/download';

interface DownloadListProps {
  height: number;
}

export default function DownloadList({ height }: DownloadListProps) {
  const dispatch = useDispatch();
  const downloads = useSelector((state: RootState) => state.downloads.downloads);
  const selectedCategory = useSelector((state: RootState) => state.downloads.selectedCategory);
  const searchQuery = useSelector((state: RootState) => state.downloads.searchQuery);
  const [previewDownload, setPreviewDownload] = useState<Download | null>(null);

  // Filter downloads based on category and search
  const filteredDownloads = downloads.filter((download) => {
    const matchesCategory = !selectedCategory || download.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      download.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      download.url.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handlePause = async (id: string) => {
    try {
      await downloadService.pauseDownload(id);
      dispatch(updateDownloadStatus({ id, status: DownloadStatus.Paused }));
    } catch (error) {
      console.error('Failed to pause download:', error);
    }
  };

  const handleResume = async (id: string) => {
    try {
      await downloadService.resumeDownload(id);
      dispatch(updateDownloadStatus({ id, status: DownloadStatus.Downloading }));
    } catch (error) {
      console.error('Failed to resume download:', error);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await downloadService.cancelDownload(id);
      dispatch(removeDownload(id));
    } catch (error) {
      console.error('Failed to cancel download:', error);
    }
  };

  const handleOpenFolder = async (filePath: string) => {
    try {
      await downloadService.openFolder(filePath);
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const url = e.dataTransfer.getData('text/plain');
    
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      try {
        await downloadService.createDownload({ url, startImmediately: true });
      } catch (error) {
        console.error('Failed to create download:', error);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };



  const handlePreview = (download: Download) => {
    setPreviewDownload(download);
  };

  if (filteredDownloads.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="text-6xl mb-4">📥</div>
        <p className="text-lg font-medium">No downloads yet</p>
        <p className="text-sm mt-2">Drag and drop URLs here to start downloading</p>
      </div>
    );
  }

  return (
    <>
      <div 
        onDrop={handleDrop} 
        onDragOver={handleDragOver}
        className="overflow-y-auto"
        style={{ height: `${height}px` }}
      >
        {filteredDownloads.map((download) => (
          <div key={download.id} className="px-4 py-2">
            <DownloadItem
              download={download}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
              onOpenFolder={handleOpenFolder}
              onPreview={handlePreview}
            />
          </div>
        ))}
      </div>
      
      {previewDownload && (
        <FilePreview
          download={previewDownload}
          onClose={() => setPreviewDownload(null)}
        />
      )}
    </>
  );
}
