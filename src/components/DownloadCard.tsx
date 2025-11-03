'use client';

import { memo, useCallback } from 'react';
import { DownloadProgress } from '@/types/electron';
import { useDownloadStore } from '@/store/downloadStore';
import { ProgressBar } from './ProgressBar';
import { CategoryBadge } from './CategoryBadge';
import { FileCategory } from './CategoryFilter';
import { formatBytes, formatSpeed, formatTime } from '@/lib/formatters';
import {
  PlayIcon,
  PauseIcon,
  XMarkIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

interface DownloadCardProps {
  download: DownloadProgress;
  showSegments?: boolean;
  className?: string;
  onClick?: () => void;
}

function DownloadCardComponent({
  download,
  showSegments = false,
  className = '',
  onClick,
}: DownloadCardProps) {
  const { pauseDownload, resumeDownload, cancelDownload, retryDownload } =
    useDownloadStore();

  const handlePause = useCallback(() => {
    pauseDownload(download.downloadId);
  }, [pauseDownload, download.downloadId]);

  const handleResume = useCallback(() => {
    resumeDownload(download.downloadId);
  }, [resumeDownload, download.downloadId]);

  const handleCancel = useCallback(() => {
    if (confirm('Are you sure you want to cancel this download?')) {
      cancelDownload(download.downloadId);
    }
  }, [cancelDownload, download.downloadId]);

  const handleRetry = useCallback(() => {
    retryDownload(download.downloadId);
  }, [retryDownload, download.downloadId]);

  const getStatusColor = () => {
    switch (download.status) {
      case 'downloading':
        return 'text-blue-600 dark:text-blue-400';
      case 'paused':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      case 'queued':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (download.status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'failed':
        return <ExclamationCircleIcon className="w-5 h-5" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {download.filename}
            </h3>
            {(download as any).category && (
              <CategoryBadge
                category={(download as any).category as FileCategory}
                size="sm"
              />
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
            {download.url}
          </p>
        </div>
        <div className={`flex items-center gap-1 ml-3 ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="text-sm font-medium capitalize">
            {download.status}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <ProgressBar
        percentage={download.percentage}
        segments={download.segments}
        showSegments={showSegments}
        className="mb-3"
      />

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-3">
        <div className="flex items-center gap-4">
          <span>
            {formatBytes(download.downloadedBytes)} /{' '}
            {formatBytes(download.totalBytes)}
          </span>
          {download.status === 'downloading' && (
            <>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                {formatSpeed(download.speed)}
              </span>
              <span>ETA: {formatTime(download.remainingTime)}</span>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {download.status === 'failed' && download.error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
          {download.error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {download.status === 'downloading' && (
          <button
            onClick={handlePause}
            className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md transition-colors text-sm font-medium"
            title="Pause"
          >
            <PauseIcon className="w-4 h-4" />
            Pause
          </button>
        )}

        {download.status === 'paused' && (
          <button
            onClick={handleResume}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors text-sm font-medium"
            title="Resume"
          >
            <PlayIcon className="w-4 h-4" />
            Resume
          </button>
        )}

        {download.status === 'failed' && (
          <button
            onClick={handleRetry}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors text-sm font-medium"
            title="Retry"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Retry
          </button>
        )}

        {(download.status === 'downloading' ||
          download.status === 'paused' ||
          download.status === 'queued' ||
          download.status === 'failed') && (
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors text-sm font-medium"
            title="Cancel"
          >
            <XMarkIcon className="w-4 h-4" />
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export const DownloadCard = memo(DownloadCardComponent);
