import type { Download } from '../types/download';
import { DownloadStatus } from '../types/download';
import { formatBytes, formatSpeed, formatTime } from '../utils/formatters';

interface DownloadItemProps {
  download: Download;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onOpenFolder: (filePath: string) => void;
  onPreview?: (download: Download) => void;
  style?: React.CSSProperties;
}

export default function DownloadItem({
  download,
  onPause,
  onResume,
  onCancel,
  onOpenFolder,
  onPreview,
  style,
}: DownloadItemProps) {
  const getStatusColor = (status: DownloadStatus) => {
    switch (status) {
      case DownloadStatus.Downloading:
        return 'text-blue-600 dark:text-blue-400';
      case DownloadStatus.Completed:
        return 'text-green-600 dark:text-green-400';
      case DownloadStatus.Paused:
        return 'text-yellow-600 dark:text-yellow-400';
      case DownloadStatus.Failed:
        return 'text-red-600 dark:text-red-400';
      case DownloadStatus.Cancelled:
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: DownloadStatus) => {
    switch (status) {
      case DownloadStatus.Downloading:
        return '⬇️';
      case DownloadStatus.Completed:
        return '✅';
      case DownloadStatus.Paused:
        return '⏸️';
      case DownloadStatus.Failed:
        return '❌';
      case DownloadStatus.Cancelled:
        return '🚫';
      default:
        return '⏳';
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Context menu will be handled by the parent component
  };

  return (
    <div
      style={style}
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition-shadow"
      onContextMenu={handleContextMenu}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{getStatusIcon(download.status)}</span>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {download.filename}
            </h3>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">
            {download.url}
          </div>

          {/* Progress Bar */}
          {download.status === DownloadStatus.Downloading || download.status === DownloadStatus.Paused ? (
            <div className="mb-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${download.percentComplete || 0}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
                <span>
                  {formatBytes(download.downloadedSize)} / {formatBytes(download.totalSize)}
                </span>
                <span>{(download.percentComplete || 0).toFixed(1)}%</span>
              </div>
            </div>
          ) : null}

          {/* Speed and ETA */}
          {download.status === DownloadStatus.Downloading && (
            <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
              <span>Speed: {formatSpeed(download.currentSpeed || 0)}</span>
              <span>ETA: {formatTime(download.estimatedTimeRemaining || 0)}</span>
            </div>
          )}

          {/* Status */}
          <div className={`text-xs font-medium mt-2 ${getStatusColor(download.status)}`}>
            {download.status.toUpperCase()}
            {download.errorMessage && (
              <span className="ml-2 text-red-600 dark:text-red-400">
                - {download.errorMessage}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 ml-4">
          {download.status === DownloadStatus.Downloading && (
            <button
              onClick={() => onPause(download.id)}
              className="px-3 py-1 text-xs bg-yellow-500 hover:bg-yellow-600 text-white rounded transition-colors"
              title="Pause"
            >
              ⏸️
            </button>
          )}
          {download.status === DownloadStatus.Paused && (
            <button
              onClick={() => onResume(download.id)}
              className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
              title="Resume"
            >
              ▶️
            </button>
          )}
          {(download.status === DownloadStatus.Downloading ||
            download.status === DownloadStatus.Paused ||
            download.status === DownloadStatus.Pending) && (
            <button
              onClick={() => onCancel(download.id)}
              className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
              title="Cancel"
            >
              ✖️
            </button>
          )}
          {download.status === DownloadStatus.Completed && download.filePath && (
            <>
              {onPreview && (download.mimeType?.startsWith('image/') || download.mimeType?.startsWith('video/')) && (
                <button
                  onClick={() => onPreview(download)}
                  className="px-3 py-1 text-xs bg-purple-500 hover:bg-purple-600 text-white rounded transition-colors"
                  title="Preview"
                >
                  👁️
                </button>
              )}
              <button
                onClick={() => onOpenFolder(download.filePath!)}
                className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                title="Open Folder"
              >
                📁
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
