'use client';

import { useEffect, useState, useMemo } from 'react';
import { useDownloadStore } from '@/store/downloadStore';
import { useTranslation } from '@/hooks/useTranslation';
import { DownloadCard } from '@/components/DownloadCard';
import { AddDownloadDialog } from '@/components/AddDownloadDialog';
import { formatSpeed, formatTime, formatBytes } from '@/lib/formatters';
import { useThrottle } from '@/hooks/useThrottle';
import {
  PlusIcon,
  PauseIcon,
  PlayIcon,
  ArrowDownTrayIcon,
  BoltIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const { t } = useTranslation();
  const {
    downloads,
    loadDownloads,
    pauseAll,
    resumeAll,
    getActiveDownloads,
    getTotalSpeed,
  } = useDownloadStore();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    totalDownloads: 0,
    totalBytes: 0,
    averageSpeed: 0,
  });

  // Load downloads on mount
  useEffect(() => {
    loadDownloads();
    
    // Listen for download completion events to refresh stats
    if (typeof window !== 'undefined' && window.electron) {
      const unsubscribe = window.electron.download.onComplete(() => {
        // Reload stats when a download completes
        window.electron.stats.get().then((response) => {
          if (response.success && response.stats) {
            setStats(response.stats);
          }
        });
      });
      
      return unsubscribe;
    }
  }, [loadDownloads]);

  // Load statistics
  useEffect(() => {
    const loadStats = async () => {
      if (typeof window !== 'undefined' && window.electron) {
        const response = await window.electron.stats.get();
        console.log('[Dashboard] Stats loaded:', response.stats);
        if (response.success && response.stats) {
          setStats(response.stats);
        }
      }
    };
    
    // Load stats immediately
    loadStats();
    
    // Reload stats every 3 seconds for faster updates
    const interval = setInterval(loadStats, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const activeDownloads = getActiveDownloads();
  const totalSpeed = getTotalSpeed();

  // Throttle total speed updates to reduce re-renders
  const throttledTotalSpeed = useThrottle(totalSpeed, 500);

  // Memoize expensive calculations
  const totalRemainingTime = useMemo(() => {
    return activeDownloads.reduce(
      (total, download) => total + download.remainingTime,
      0
    );
  }, [activeDownloads]);

  const handlePauseAll = async () => {
    await pauseAll();
  };

  const handleResumeAll = async () => {
    await resumeAll();
  };

  const hasActiveDownloads = activeDownloads.length > 0;
  const hasPausedDownloads = downloads.some((d) => d.status === 'paused');

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('dashboard.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Statistics Cards - Task 12.3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Downloads */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {t('dashboard.totalDownloads')}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats.totalDownloads}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {t('dashboard.allTime')}
              </p>
            </div>
            <div className="text-4xl">
              <ArrowDownTrayIcon className="w-12 h-12 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Total Data Downloaded */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {t('dashboard.totalDataDownloaded')}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {formatBytes(stats.totalBytes)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {t('dashboard.allTime')}
              </p>
            </div>
            <div className="text-4xl">
              <CheckCircleIcon className="w-12 h-12 text-green-500" />
            </div>
          </div>
        </div>

        {/* Average Speed */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {t('dashboard.averageSpeed')}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {formatSpeed(stats.averageSpeed)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {t('dashboard.historicalAverage')}
              </p>
            </div>
            <div className="text-4xl">
              <BoltIcon className="w-12 h-12 text-yellow-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Section - Task 12.2 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('dashboard.quickActions')}
        </h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setIsAddDialogOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
            {t('download.addDownload')}
          </button>

          <button
            onClick={handlePauseAll}
            disabled={!hasActiveDownloads}
            className="flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg disabled:hover:shadow-md"
            title={hasActiveDownloads ? t('dashboard.pauseAllTooltip') : t('dashboard.noActiveDownloadsTooltip')}
          >
            <PauseIcon className="w-5 h-5" />
            {t('download.pauseAll')}
          </button>

          <button
            onClick={handleResumeAll}
            disabled={!hasPausedDownloads}
            className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg disabled:hover:shadow-md"
            title={hasPausedDownloads ? t('dashboard.resumeAllTooltip') : t('dashboard.noPausedDownloads')}
          >
            <PlayIcon className="w-5 h-5" />
            {t('download.resumeAll')}
          </button>
        </div>
      </div>

      {/* Active Downloads Section - Task 12.1 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('download.activeDownloads')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('dashboard.activeDownloadsCount', { count: activeDownloads.length.toString() })}
            </p>
          </div>

          {/* Quick Stats */}
          {hasActiveDownloads && (
            <div className="flex items-center gap-6 text-sm">
              <div className="text-right">
                <p className="text-gray-600 dark:text-gray-400">{t('download.stats.totalSpeed')}</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatSpeed(throttledTotalSpeed)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-600 dark:text-gray-400">{t('download.stats.remainingTime')}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatTime(totalRemainingTime)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Active Downloads List */}
        {activeDownloads.length > 0 ? (
          <div className="space-y-4">
            {activeDownloads.map((download) => (
              <DownloadCard key={download.downloadId} download={download} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ArrowDownTrayIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {t('download.noActiveDownloads')}
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
              {t('download.noDownloadsMessage')}
            </p>
          </div>
        )}
      </div>

      {/* Add Download Dialog */}
      <AddDownloadDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
      />
    </div>
  );
}
