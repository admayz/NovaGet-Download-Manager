'use client';

import { useEffect, useState } from 'react';
import { DownloadProgress, DownloadRecord } from '@/types/electron.d';
import { ProgressBar } from './ProgressBar';
import { SpeedChart } from './SpeedChart';
import { formatBytes, formatSpeed, formatTime } from '@/lib/formatters';
import {
  XMarkIcon,
  ClockIcon,
  FolderIcon,
  LinkIcon,
  TagIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface DownloadDetailViewProps {
  download: DownloadProgress;
  onClose: () => void;
}

export function DownloadDetailView({
  download,
  onClose,
}: DownloadDetailViewProps) {
  const [downloadRecord, setDownloadRecord] = useState<DownloadRecord | null>(
    null
  );
  const [isLoadingRecord, setIsLoadingRecord] = useState(true);

  useEffect(() => {
    const loadDownloadRecord = async () => {
      if (typeof window !== 'undefined' && window.electron) {
        try {
          const response = await window.electron.db.getDownload(
            download.downloadId
          );
          if (response.success && response.download) {
            setDownloadRecord(response.download);
          }
        } catch (error) {
          console.error('Failed to load download record:', error);
        } finally {
          setIsLoadingRecord(false);
        }
      }
    };

    loadDownloadRecord();
  }, [download.downloadId]);

  const getStatusColor = () => {
    switch (download.status) {
      case 'downloading':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 'paused':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'completed':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'failed':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'queued':
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
              {download.filename}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}
              >
                {download.status.charAt(0).toUpperCase() +
                  download.status.slice(1)}
              </span>
              {downloadRecord?.category && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                  {downloadRecord.category}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Progress Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Progress
            </h3>
            <ProgressBar
              percentage={download.percentage}
              segments={download.segments}
              showSegments={true}
              className="mb-3"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Downloaded</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {formatBytes(download.downloadedBytes)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Total Size</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {formatBytes(download.totalBytes)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Speed</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {download.status === 'downloading'
                    ? formatSpeed(download.speed)
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">ETA</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {download.status === 'downloading'
                    ? formatTime(download.remainingTime)
                    : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Segment Progress */}
          {download.segments && download.segments.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Segment Progress
              </h3>
              <div className="space-y-2">
                {download.segments.map((segment) => (
                  <div
                    key={segment.segmentId}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex-shrink-0 w-20 text-sm text-gray-600 dark:text-gray-400">
                      Segment {segment.segmentId + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>
                          {formatBytes(segment.downloaded)} /{' '}
                          {formatBytes(segment.end - segment.start)}
                        </span>
                        <span>
                          {(
                            (segment.downloaded / (segment.end - segment.start)) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            segment.status === 'completed'
                              ? 'bg-green-500'
                              : segment.status === 'downloading'
                              ? 'bg-blue-500'
                              : segment.status === 'failed'
                              ? 'bg-red-500'
                              : 'bg-gray-400'
                          }`}
                          style={{
                            width: `${
                              (segment.downloaded / (segment.end - segment.start)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-24 text-xs text-right">
                      <span
                        className={`px-2 py-1 rounded ${
                          segment.status === 'completed'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : segment.status === 'downloading'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : segment.status === 'failed'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            : 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {segment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Speed Chart */}
          {download.status === 'downloading' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Speed Chart
              </h3>
              <SpeedChart downloadId={download.downloadId} />
            </div>
          )}

          {/* Download Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <LinkIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500 dark:text-gray-400">URL</p>
                  <p className="text-sm text-gray-900 dark:text-white break-all">
                    {download.url}
                  </p>
                </div>
              </div>

              {downloadRecord && (
                <>
                  <div className="flex items-start gap-3">
                    <FolderIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Directory
                      </p>
                      <p className="text-sm text-gray-900 dark:text-white break-all">
                        {downloadRecord.directory}
                      </p>
                    </div>
                  </div>

                  {downloadRecord.created_at && (
                    <div className="flex items-start gap-3">
                      <ClockIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Created
                        </p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {new Date(downloadRecord.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {downloadRecord.completed_at && (
                    <div className="flex items-start gap-3">
                      <ClockIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Completed
                        </p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {new Date(downloadRecord.completed_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* AI Suggestions */}
          {downloadRecord && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-purple-500" />
                AI Suggestions
              </h3>
              <div className="space-y-3">
                {downloadRecord.ai_suggested_name && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Suggested Name
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {downloadRecord.ai_suggested_name}
                    </p>
                  </div>
                )}

                {downloadRecord.category && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Category
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {downloadRecord.category}
                    </p>
                  </div>
                )}

                {downloadRecord.tags && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {JSON.parse(downloadRecord.tags).map(
                        (tag: string, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300"
                          >
                            <TagIcon className="w-3 h-3" />
                            {tag}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

                {!downloadRecord.ai_suggested_name &&
                  !downloadRecord.category &&
                  !downloadRecord.tags && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      No AI suggestions available yet
                    </p>
                  )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {download.error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
                Error
              </h3>
              <p className="text-sm text-red-700 dark:text-red-400">
                {download.error}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
