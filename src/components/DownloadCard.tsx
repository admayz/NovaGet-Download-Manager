'use client';

import { memo, useCallback, useState } from 'react';
import { DownloadProgress } from '@/types/electron';
import { useDownloadStore } from '@/store/downloadStore';
import { useTranslation } from '@/hooks/useTranslation';
import { ProgressBar } from './ProgressBar';
import { CategoryBadge } from './CategoryBadge';
import { FileCategory } from './CategoryFilter';
import { ConfirmDialog } from './ConfirmDialog';
import { formatBytes, formatSpeed, formatTime } from '@/lib/formatters';
import {
  PlayIcon,
  PauseIcon,
  XMarkIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';

interface DownloadCardProps {
  download: DownloadProgress;
  showSegments?: boolean;
  className?: string;
  onClick?: () => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

function DownloadCardComponent({
  download,
  showSegments = false,
  className = '',
  onClick,
  isSelected = false,
  onSelect,
}: DownloadCardProps) {
  const { t } = useTranslation();
  const { pauseDownload, resumeDownload, cancelDownload, retryDownload } =
    useDownloadStore();

  const handlePause = useCallback(() => {
    pauseDownload(download.downloadId);
  }, [pauseDownload, download.downloadId]);

  const handleResume = useCallback(() => {
    resumeDownload(download.downloadId);
  }, [resumeDownload, download.downloadId]);

  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const handleCancel = useCallback(() => {
    setShowCancelDialog(true);
  }, []);

  const confirmCancel = useCallback(() => {
    cancelDownload(download.downloadId);
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
    <>
    <div
      className={`group relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border ${
        isSelected 
          ? 'border-purple-500 ring-2 ring-purple-500' 
          : 'border-gray-200/50 dark:border-gray-700/50'
      } ${onClick ? 'cursor-pointer hover:scale-[1.01]' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Gradient overlay for status */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${
        download.status === 'downloading' ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 animate-gradient' :
        download.status === 'completed' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
        download.status === 'paused' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
        download.status === 'failed' ? 'bg-gradient-to-r from-red-500 to-rose-500' :
        'bg-gradient-to-r from-gray-400 to-gray-500'
      }`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-3 mb-2">
              {/* Custom Checkbox - Left of filename */}
              {onSelect && (
                <label className="relative flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      onSelect(download.downloadId);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 peer-checked:bg-purple-600 peer-checked:border-purple-600 transition-all duration-200 flex items-center justify-center group-hover:border-purple-500 dark:group-hover:border-purple-400">
                    {isSelected && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </label>
              )}
              <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                {download.filename}
              </h3>
              {(download as any).category && (
                <CategoryBadge
                  category={(download as any).category as FileCategory}
                  size="sm"
                />
              )}
              {/* Security Scan Badge */}
              {download.securityScan?.scanned && (
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                    download.securityScan.safe
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }`}
                  title={
                    download.securityScan.safe
                      ? 'Güvenlik taraması: Güvenli'
                      : `Güvenlik taraması: ${download.securityScan.detections} tehdit tespit edildi`
                  }
                >
                  {download.securityScan.safe ? (
                    <ShieldCheckIcon className="w-4 h-4" />
                  ) : (
                    <ShieldExclamationIcon className="w-4 h-4" />
                  )}
                  <span>{download.securityScan.safe ? 'Güvenli' : 'Tehdit'}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {download.url}
            </p>
          </div>
          
          {/* Status Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${
            download.status === 'downloading' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
            download.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
            download.status === 'paused' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
            download.status === 'failed' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
            'bg-gray-100 dark:bg-gray-700/30 text-gray-700 dark:text-gray-300'
          }`}>
            {getStatusIcon()}
            <span className="capitalize">{t(`download.status.${download.status}`)}</span>
          </div>
        </div>

        {/* Progress Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('download.stats.progress')}</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">{download.percentage.toFixed(1)}%</span>
          </div>
          <ProgressBar
            percentage={download.percentage}
            segments={download.segments}
            showSegments={showSegments}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('download.stats.downloaded')}</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{formatBytes(download.downloadedBytes)}</p>
          </div>
          <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('download.stats.totalSize')}</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{formatBytes(download.totalBytes)}</p>
          </div>
          {download.status === 'downloading' && (
            <>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">{t('download.stats.speed')}</p>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{formatSpeed(download.speed)}</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">{t('download.stats.eta')}</p>
                <p className="text-sm font-bold text-purple-700 dark:text-purple-300">{formatTime(download.remainingTime)}</p>
              </div>
            </>
          )}
        </div>

        {/* Error Message */}
        {download.status === 'failed' && download.error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
            <div className="flex items-start gap-2">
              <ExclamationCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{download.error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {download.status === 'downloading' && (
            <button
              onClick={(e) => { e.stopPropagation(); handlePause(); }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
              title={t('common.pause')}
            >
              <PauseIcon className="w-4 h-4" />
              {t('common.pause')}
            </button>
          )}

          {download.status === 'paused' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleResume(); }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
              title={t('common.resume')}
            >
              <PlayIcon className="w-4 h-4" />
              {t('common.resume')}
            </button>
          )}

          {download.status === 'failed' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleRetry(); }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
              title={t('common.retry')}
            >
              <ArrowPathIcon className="w-4 h-4" />
              {t('common.retry')}
            </button>
          )}

          {(download.status === 'downloading' ||
            download.status === 'paused' ||
            download.status === 'queued' ||
            download.status === 'failed') && (
            <button
              onClick={(e) => { e.stopPropagation(); handleCancel(); }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-red-500 hover:dark:bg-red-600 text-gray-700 dark:text-gray-300 hover:text-white rounded-lg transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg"
              title={t('common.cancel')}
            >
              <XMarkIcon className="w-4 h-4" />
              {t('common.cancel')}
            </button>
          )}
        </div>
      </div>
    </div>

    {/* Cancel Confirmation Dialog - Outside card */}
    {showCancelDialog && (
      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={confirmCancel}
        title={t('download.confirmCancel')}
        message={t('download.confirmCancelMessage')}
        confirmText={t('common.yes')}
        cancelText={t('common.no')}
        variant="danger"
      />
    )}
    </>
  );
}

export const DownloadCard = memo(DownloadCardComponent);

