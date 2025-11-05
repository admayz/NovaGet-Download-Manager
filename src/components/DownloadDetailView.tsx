'use client';

import { useEffect, useState } from 'react';
import { DownloadProgress, DownloadRecord } from '@/types/electron.d';
import { ProgressBar } from './ProgressBar';
import { SpeedChart } from './SpeedChart';
import { formatBytes, formatSpeed, formatTime } from '@/lib/formatters';
import { useTranslation } from '@/hooks/useTranslation';
import { useDownloadStore } from '@/store/downloadStore';
import { ConfirmDialog } from './ConfirmDialog';
import {
  XMarkIcon,
  ClockIcon,
  FolderIcon,
  LinkIcon,
  TagIcon,
  SparklesIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';

interface DownloadDetailViewProps {
  download: DownloadProgress;
  onClose: () => void;
}

export function DownloadDetailView({
  download,
  onClose,
}: DownloadDetailViewProps) {
  const { t } = useTranslation();
  const { pauseDownload, resumeDownload, cancelDownload } = useDownloadStore();
  const [downloadRecord, setDownloadRecord] = useState<DownloadRecord | null>(
    null
  );
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Translation helper with fallback
  const translate = (key: string, fallback: string) => {
    const translation = t(key);
    return translation === key ? fallback : translation;
  };

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
        }
      }
    };

    loadDownloadRecord();
  }, [download.downloadId]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-gray-200/50 dark:border-gray-700/50 animate-in slide-in-from-bottom-4 duration-300">
        {/* Header with Gradient */}
        <div className="relative bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-white truncate mb-2">
                {download.filename}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm bg-white/20 text-white border border-white/30 shadow-lg`}
                >
                  {translate(`download.status.${download.status}`, download.status.charAt(0).toUpperCase() + download.status.slice(1))}
                </span>
                {downloadRecord?.category && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm bg-white/20 text-white border border-white/30 shadow-lg">
                    📁 {downloadRecord.category}
                  </span>
                )}
                <span className="px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm bg-white/20 text-white border border-white/30 shadow-lg">
                  {download.segments?.length || 0} {translate('download.detail.segments', 'segment')}
                </span>
                {/* Security Scan Badge */}
                {download.securityScan?.scanned && (
                  <span
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm border shadow-lg ${
                      download.securityScan.safe
                        ? 'bg-green-500/20 text-white border-green-400/30'
                        : 'bg-red-500/20 text-white border-red-400/30'
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
                    <span>{download.securityScan.safe ? 'Güvenli' : 'Tehdit Tespit Edildi'}</span>
                  </span>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {download.status === 'downloading' && (
                <button
                  onClick={() => pauseDownload(download.downloadId)}
                  className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all duration-200 hover:scale-110 backdrop-blur-sm border border-white/20 shadow-lg"
                  title={translate('common.pause', 'Duraklat')}
                >
                  <PauseIcon className="w-5 h-5" />
                </button>
              )}
              
              {download.status === 'paused' && (
                <button
                  onClick={() => resumeDownload(download.downloadId)}
                  className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all duration-200 hover:scale-110 backdrop-blur-sm border border-white/20 shadow-lg"
                  title={translate('common.resume', 'Devam Et')}
                >
                  <PlayIcon className="w-5 h-5" />
                </button>
              )}
              
              {(download.status === 'downloading' || download.status === 'paused' || download.status === 'queued') && (
                <button
                  onClick={() => setShowCancelDialog(true)}
                  className="p-2.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white transition-all duration-200 hover:scale-110 backdrop-blur-sm border border-red-400/30 shadow-lg"
                  title={translate('common.cancel', 'İptal')}
                >
                  <StopIcon className="w-5 h-5" />
                </button>
              )}
              
              <button
                onClick={onClose}
                className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all duration-200 hover:rotate-90 backdrop-blur-sm border border-white/20 shadow-lg"
                title={translate('common.close', 'Kapat')}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/10 pointer-events-none" />
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)] custom-scrollbar">
          {/* Progress Section with Cards */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                {translate('download.detail.progress', 'İlerleme')}
              </h3>
              <span className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                {download.percentage.toFixed(1)}%
              </span>
            </div>
            
            <ProgressBar
              percentage={download.percentage}
              segments={download.segments}
              showSegments={true}
              className="mb-6"
            />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200/50 dark:border-blue-700/50">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">{translate('download.detail.downloaded', 'İndirilen')}</p>
                <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                  {formatBytes(download.downloadedBytes)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200/50 dark:border-purple-700/50">
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">{translate('download.detail.totalSize', 'Toplam Boyut')}</p>
                <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
                  {formatBytes(download.totalBytes)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200/50 dark:border-green-700/50">
                <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">{translate('download.detail.speed', 'Hız')}</p>
                <p className="text-xl font-bold text-green-900 dark:text-green-100">
                  {download.status === 'downloading'
                    ? formatSpeed(download.speed)
                    : '-'}
                </p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4 border border-orange-200/50 dark:border-orange-700/50">
                <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">{translate('download.detail.eta', 'Kalan Süre')}</p>
                <p className="text-xl font-bold text-orange-900 dark:text-orange-100">
                  {download.status === 'downloading'
                    ? formatTime(download.remainingTime)
                    : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Segment Progress - Minimal */}
          {download.segments && download.segments.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                {translate('download.detail.segmentProgress', 'Segment İlerlemesi')}
              </h3>
              <div className="space-y-2">
                {download.segments.map((segment) => {
                  const segmentPercent = ((segment.downloaded / (segment.end - segment.start)) * 100);
                  return (
                    <div
                      key={segment.segmentId}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      {/* Segment Number */}
                      <div className="flex-shrink-0 w-7 h-7 rounded-md bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-xs font-bold">
                        {segment.segmentId + 1}
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {formatBytes(segment.downloaded)} / {formatBytes(segment.end - segment.start)}
                          </span>
                          <span className="text-xs font-semibold text-gray-900 dark:text-white">
                            {segmentPercent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              segment.status === 'completed'
                                ? 'bg-green-500'
                                : segment.status === 'downloading'
                                ? 'bg-blue-500'
                                : segment.status === 'failed'
                                ? 'bg-red-500'
                                : 'bg-gray-400'
                            }`}
                            style={{ width: `${segmentPercent}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Status Badge */}
                      <div className="flex-shrink-0">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            segment.status === 'completed'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : segment.status === 'downloading'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              : segment.status === 'failed'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {segment.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Speed Chart */}
          {download.status === 'downloading' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary-500" />
                {translate('download.detail.speedChart', 'H�z Grafi�i')}
              </h3>
              <SpeedChart downloadId={download.downloadId} />
            </div>
          )}

          {/* Download Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary-500" />
              {translate('download.detail.information', 'Bilgiler')}
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <LinkIcon className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{translate('download.detail.url', 'URL')}</p>
                  <p className="text-sm text-gray-900 dark:text-white break-all">
                    {download.url}
                  </p>
                </div>
              </div>

              {downloadRecord && (
                <>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <FolderIcon className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {translate('download.detail.directory', 'Klas�r')}
                      </p>
                      <p className="text-sm text-gray-900 dark:text-white break-all">
                        {downloadRecord.directory}
                      </p>
                    </div>
                  </div>

                  {downloadRecord.created_at && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                      <ClockIcon className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          {translate('download.detail.created', 'Olu�turulma')}
                        </p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {new Date(downloadRecord.created_at).toLocaleString('tr-TR')}
                        </p>
                      </div>
                    </div>
                  )}

                  {downloadRecord.completed_at && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                      <ClockIcon className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          {translate('download.detail.completed', 'Tamamlanma')}
                        </p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {new Date(downloadRecord.completed_at).toLocaleString('tr-TR')}
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
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 shadow-lg border border-purple-200/50 dark:border-purple-700/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-purple-500" />
                {translate('download.detail.aiSuggestions', 'Yapay Zeka �nerileri')}
              </h3>
              <div className="space-y-3">
                {downloadRecord.ai_suggested_name && (
                  <div className="p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg border border-purple-200/30 dark:border-purple-700/30">
                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-2">
                      {translate('download.detail.suggestedName', '�nerilen �sim')}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {downloadRecord.ai_suggested_name}
                    </p>
                  </div>
                )}

                {downloadRecord.category && (
                  <div className="p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg border border-purple-200/30 dark:border-purple-700/30">
                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-2">
                      {translate('download.detail.category', 'Kategori')}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {downloadRecord.category}
                    </p>
                  </div>
                )}

                {downloadRecord.tags && (
                  <div className="p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg border border-purple-200/30 dark:border-purple-700/30">
                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-3">
                      {translate('download.detail.tags', 'Etiketler')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {JSON.parse(downloadRecord.tags).map(
                        (tag: string) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/40 rounded-full text-xs font-semibold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700"
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
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic text-center py-4">
                      {translate('download.detail.noAiSuggestions', 'Hen�z yapay zeka �nerisi yok')}
                    </p>
                  )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {download.error && (
            <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-2 border-red-300 dark:border-red-700 rounded-xl shadow-lg">
              <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {translate('download.detail.error', 'Hata')}
              </h3>
              <p className="text-sm text-red-800 dark:text-red-300 bg-white/50 dark:bg-black/20 p-3 rounded-lg">
                {download.error}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={() => {
          cancelDownload(download.downloadId);
          onClose();
        }}
        title={translate('download.confirmCancel', 'İndirmeyi İptal Et')}
        message={translate('download.confirmCancelMessage', 'Bu indirmeyi iptal etmek istediğinizden emin misiniz? İndirilen veriler silinecektir.')}
        confirmText={translate('common.yes', 'Evet')}
        cancelText={translate('common.no', 'Hayır')}
        variant="danger"
      />
    </div>
  );
}


