'use client';

import { useEffect, useState, useMemo } from 'react';
import { useDownloadStore } from '@/store/downloadStore';
import { useTranslation } from '@/hooks/useTranslation';
import { DownloadList } from '@/components/DownloadList';
import { AddDownloadDialog } from '@/components/AddDownloadDialog';
import { DownloadDetailView } from '@/components/DownloadDetailView';
import { DownloadProgress } from '@/types/electron.d';

type StatusFilter = 'all' | 'downloading' | 'paused' | 'completed' | 'failed' | 'queued';

export default function DownloadsPage() {
  const { t } = useTranslation();
  const { downloads, loadDownloads, isLoading } = useDownloadStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDownload, setSelectedDownload] = useState<DownloadProgress | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

  // Update selected download when downloads array changes
  useEffect(() => {
    if (selectedDownload) {
      const updated = downloads.find(d => d.downloadId === selectedDownload.downloadId);
      if (updated) {
        setSelectedDownload(updated);
      }
    }
  }, [downloads, selectedDownload]);

  // Get unique categories from downloads
  const categories = useMemo(() => {
    const cats = new Set<string>();
    downloads.forEach((d) => {
      // Extract category from metadata or filename extension
      const ext = d.filename.split('.').pop()?.toLowerCase();
      if (ext) {
        cats.add(ext);
      }
    });
    return Array.from(cats).sort();
  }, [downloads]);

  // Filter downloads by status and category
  const filteredDownloads = useMemo(() => {
    let filtered = downloads;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((d) => d.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((d) =>
        d.filename.toLowerCase().endsWith(`.${categoryFilter}`)
      );
    }

    return filtered;
  }, [downloads, statusFilter, categoryFilter]);

  // Get counts for each status
  const statusCounts = useMemo(() => {
    return {
      all: downloads.length,
      downloading: downloads.filter((d) => d.status === 'downloading').length,
      paused: downloads.filter((d) => d.status === 'paused').length,
      completed: downloads.filter((d) => d.status === 'completed').length,
      failed: downloads.filter((d) => d.status === 'failed').length,
      queued: downloads.filter((d) => d.status === 'queued').length,
    };
  }, [downloads]);

  const getStatusButtonClass = (status: StatusFilter) => {
    const isActive = statusFilter === status;
    return `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary-600 text-white'
        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
    }`;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('download.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t('download.title')}
            </p>
          </div>
          <button
            onClick={() => setIsAddDialogOpen(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            + {t('download.addDownload')}
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={getStatusButtonClass('all')}
          >
            {t('category.all')} ({statusCounts.all})
          </button>
          <button
            onClick={() => setStatusFilter('downloading')}
            className={getStatusButtonClass('downloading')}
          >
            {t('download.status.downloading')} ({statusCounts.downloading})
          </button>
          <button
            onClick={() => setStatusFilter('paused')}
            className={getStatusButtonClass('paused')}
          >
            {t('download.status.paused')} ({statusCounts.paused})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={getStatusButtonClass('completed')}
          >
            {t('download.status.completed')} ({statusCounts.completed})
          </button>
          <button
            onClick={() => setStatusFilter('failed')}
            className={getStatusButtonClass('failed')}
          >
            {t('download.status.failed')} ({statusCounts.failed})
          </button>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('filter.filterBy')}:
              </span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">{t('category.all')}</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    .{cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Download List */}
      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      ) : filteredDownloads.length > 0 ? (
        <DownloadList
          downloads={filteredDownloads}
          showSegments={false}
          onDownloadClick={(download) => setSelectedDownload(download)}
        />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📥</div>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            {statusFilter === 'all' && categoryFilter === 'all'
              ? t('download.noDownloads')
              : t('download.noDownloads')}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            {statusFilter === 'all' && categoryFilter === 'all'
              ? t('download.noDownloadsMessage')
              : t('download.noDownloadsMessage')}
          </p>
        </div>
      )}

      {/* Add Download Dialog */}
      <AddDownloadDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
      />

      {/* Download Detail View */}
      {selectedDownload && (
        <DownloadDetailView
          download={selectedDownload}
          onClose={() => setSelectedDownload(null)}
        />
      )}
    </div>
  );
}
