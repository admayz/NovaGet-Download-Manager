import { useState, useEffect } from 'react';
import { formatBytes, formatDate } from '../utils/formatters';
import type { Download } from '../types/download';

type FilePreviewProps = {
  download: Download;
  onClose: () => void;
};

export default function FilePreview({ download, onClose }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'video' | 'none'>('none');

  useEffect(() => {
    if (!download.filePath || !download.mimeType) {
      setPreviewType('none');
      return;
    }

    if (download.mimeType.startsWith('image/')) {
      setPreviewType('image');
      setPreviewUrl(`file://${download.filePath}`);
    } else if (download.mimeType.startsWith('video/')) {
      setPreviewType('video');
      setPreviewUrl(`file://${download.filePath}`);
    } else {
      setPreviewType('none');
    }
  }, [download]);

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return '📄';
    
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
    if (mimeType.includes('text')) return '📝';
    if (mimeType.includes('application')) return '💿';
    
    return '📄';
  };

  const handleOpenFolder = async () => {
    if (download.filePath && window.electronAPI) {
      await window.electronAPI.shell.openFolder(download.filePath);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {download.filename}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
          >
            ✖️
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {previewType === 'image' && previewUrl && (
            <div className="flex justify-center">
              <img
                src={previewUrl}
                alt={download.filename}
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
                onError={() => setPreviewType('none')}
              />
            </div>
          )}

          {previewType === 'video' && previewUrl && (
            <div className="flex justify-center">
              <video
                src={previewUrl}
                controls
                className="max-w-full max-h-[60vh] rounded-lg"
                onError={() => setPreviewType('none')}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {previewType === 'none' && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <div className="text-6xl mb-4">{getFileIcon(download.mimeType)}</div>
              <p className="text-lg">Preview not available for this file type</p>
            </div>
          )}

          <div className="mt-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              File Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">File Name:</span>
                <p className="text-gray-900 dark:text-white font-medium mt-1 break-all">
                  {download.filename}
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">File Size:</span>
                <p className="text-gray-900 dark:text-white font-medium mt-1">
                  {formatBytes(download.totalSize)}
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">File Type:</span>
                <p className="text-gray-900 dark:text-white font-medium mt-1">
                  {download.mimeType || 'Unknown'}
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Category:</span>
                <p className="text-gray-900 dark:text-white font-medium mt-1">
                  {download.category || 'Uncategorized'}
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Downloaded:</span>
                <p className="text-gray-900 dark:text-white font-medium mt-1">
                  {download.completedAt ? formatDate(download.completedAt) : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Location:</span>
                <p className="text-gray-900 dark:text-white font-medium mt-1 break-all">
                  {download.filePath || 'N/A'}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600 dark:text-gray-400">URL:</span>
                <p className="text-gray-900 dark:text-white font-medium mt-1 break-all">
                  {download.url}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          {download.filePath && (
            <button
              onClick={handleOpenFolder}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Open Folder
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
