'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import { DownloadProgress } from '@/types/electron';
import { DownloadCard } from './DownloadCard';
import { useDownloadStore } from '@/store/downloadStore';
import { CategoryFilter, FileCategory } from './CategoryFilter';
import { VirtualList } from './VirtualList';
import { ConfirmDialog } from './ConfirmDialog';
import {
  FunnelIcon,
  ArrowsUpDownIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

// Virtual list wrapper for downloads
interface VirtualDownloadListProps {
  downloads: DownloadProgress[];
  selectedIds: Set<string>;
  onSelectDownload: (id: string) => void;
  showSegments: boolean;
  onDownloadClick?: (download: DownloadProgress) => void;
}

const VirtualDownloadList = memo(function VirtualDownloadList({
  downloads,
  selectedIds,
  onSelectDownload,
  showSegments,
  onDownloadClick,
}: VirtualDownloadListProps) {
  return (
    <VirtualList
      items={downloads}
      itemHeight={180} // Approximate height of DownloadCard
      containerHeight={800} // Max height before scrolling
      overscan={2}
      renderItem={(download) => (
        <div className="mb-4">
          <DownloadCard
            download={download}
            showSegments={showSegments}
            isSelected={selectedIds.has(download.downloadId)}
            onSelect={onSelectDownload}
            onClick={
              onDownloadClick
                ? () => onDownloadClick(download)
                : undefined
            }
          />
        </div>
      )}
    />
  );
});

interface DownloadListProps {
  downloads: DownloadProgress[];
  showSegments?: boolean;
  className?: string;
  onDownloadClick?: (download: DownloadProgress) => void;
}

type StatusFilter = 'all' | 'downloading' | 'paused' | 'completed' | 'failed' | 'queued';
type SortBy = 'date' | 'size' | 'speed' | 'name';
type SortOrder = 'asc' | 'desc';

export function DownloadList({
  downloads,
  showSegments = false,
  className = '',
  onDownloadClick,
}: DownloadListProps) {
  const { pauseAll, resumeAll, clearCompleted } = useDownloadStore();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<FileCategory>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'warning',
  });

  // Get category counts from downloads
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    downloads.forEach((d) => {
      // Get category from download record if available
      // This will be populated by the CategoryService
      const category = (d as any).category || 'Diğer';
      counts[category] = (counts[category] || 0) + 1;
    });
    return counts;
  }, [downloads]);

  // Filter downloads
  const filteredDownloads = useMemo(() => {
    let filtered = downloads;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((d) => d.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((d) => {
        const category = (d as any).category || 'Diğer';
        return category === categoryFilter;
      });
    }

    return filtered;
  }, [downloads, statusFilter, categoryFilter]);

  // Sort downloads
  const sortedDownloads = useMemo(() => {
    const sorted = [...filteredDownloads];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          // Assuming downloadId contains timestamp or we'd need createdAt field
          comparison = a.downloadId.localeCompare(b.downloadId);
          break;
        case 'size':
          comparison = a.totalBytes - b.totalBytes;
          break;
        case 'speed':
          comparison = a.speed - b.speed;
          break;
        case 'name':
          comparison = a.filename.localeCompare(b.filename);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredDownloads, sortBy, sortOrder]);

  const handleSelectAll = () => {
    if (selectedIds.size === sortedDownloads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedDownloads.map((d) => d.downloadId)));
    }
  };

  const handleSelectDownload = (downloadId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(downloadId)) {
      newSelected.delete(downloadId);
    } else {
      newSelected.add(downloadId);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkPause = async () => {
    const promises = Array.from(selectedIds).map((id) => {
      const download = downloads.find((d) => d.downloadId === id);
      if (download?.status === 'downloading') {
        return useDownloadStore.getState().pauseDownload(id);
      }
      return Promise.resolve();
    });
    await Promise.all(promises);
    setSelectedIds(new Set());
  };

  const handleBulkResume = async () => {
    const promises = Array.from(selectedIds).map((id) => {
      const download = downloads.find((d) => d.downloadId === id);
      if (download?.status === 'paused') {
        return useDownloadStore.getState().resumeDownload(id);
      }
      return Promise.resolve();
    });
    await Promise.all(promises);
    setSelectedIds(new Set());
  };

  const handleBulkCancel = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'İndirmeleri İptal Et',
      message: `${selectedIds.size} indirmeyi iptal etmek istediğinizden emin misiniz?`,
      variant: 'warning',
      onConfirm: async () => {
        const promises = Array.from(selectedIds).map((id) =>
          useDownloadStore.getState().cancelDownload(id)
        );
        await Promise.all(promises);
        setSelectedIds(new Set());
      },
    });
  };

  const handleBulkDelete = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'İndirmeleri Sil',
      message: `${selectedIds.size} indirmeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      variant: 'danger',
      onConfirm: async () => {
        const promises = Array.from(selectedIds).map((id) =>
          useDownloadStore.getState().cancelDownload(id)
        );
        await Promise.all(promises);
        setSelectedIds(new Set());
      },
    });
  };

  const toggleSort = (newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  return (
    <div className={className}>
      {/* Category Filter */}
      <CategoryFilter
        selectedCategory={categoryFilter}
        onCategoryChange={setCategoryFilter}
        categoryCounts={categoryCounts}
        className="mb-4"
        variant="chips"
      />

      {/* Filters and Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Select All Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={
                sortedDownloads.length > 0 &&
                selectedIds.size === sortedDownloads.length
              }
              onChange={handleSelectAll}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              title="Tumunu Sec"
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">Tumunu Sec
            </label>
          </div>
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">Tum Durumlar</option>
              <option value="downloading">Indiriliyor</option>
              <option value="paused">Duraklatildi</option>
              <option value="completed">Tamamlandi</option>
              <option value="failed">Basarisiz</option>
              <option value="queued">Kuyrukta</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <ArrowsUpDownIcon className="w-5 h-5 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="date">Tarih</option>
              <option value="size">Boyut</option>
              <option value="speed">Hiz</option>
              <option value="name">Isim</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={pauseAll}
              className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md transition-colors text-sm"
              title="Tumunu Duraklat"
            >
              <PauseIcon className="w-4 h-4" />
              Tumunu Duraklat
            </button>
            <button
              onClick={resumeAll}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors text-sm"
              title="Tumunu Devam Ettir"
            >
              <PlayIcon className="w-4 h-4" />
              Tumunu Devam Ettir
            </button>
            <button
              onClick={clearCompleted}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors text-sm"
              title="Temizle Completed"
            >
              <TrashIcon className="w-4 h-4" />
              Temizle
            </button>
          </div>
        </div>

        {/* Selected Actions */}
        {selectedIds.size > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedIds.size} selected
              </span>
              <button
                onClick={handleBulkPause}
                className="text-sm text-yellow-600 hover:text-yellow-700 dark:text-yellow-400"
              >
                Pause Selected
              </button>
              <button
                onClick={handleBulkResume}
                className="text-sm text-green-600 hover:text-green-700 dark:text-green-400"
              >
                Resume Selected
              </button>
              <button
                onClick={handleBulkCancel}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
              >
                Cancel Selected
              </button>
              <button
                onClick={handleBulkDelete}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
              >
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400 ml-auto"
              >
                Temizle Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Download List */}
      {sortedDownloads.length > 0 ? (
        sortedDownloads.length > 50 ? (
          // Use virtual scrolling for large lists (>50 items)
          <VirtualDownloadList
            downloads={sortedDownloads}
            selectedIds={selectedIds}
            onSelectDownload={handleSelectDownload}
            showSegments={showSegments}
            onDownloadClick={onDownloadClick}
          />
        ) : (
          // Regular rendering for small lists
          <div className="space-y-4">
            {sortedDownloads.map((download) => (
              <DownloadCard
                key={download.downloadId}
                download={download}
                showSegments={showSegments}
                isSelected={selectedIds.has(download.downloadId)}
                onSelect={handleSelectDownload}
                onClick={
                  onDownloadClick
                    ? () => onDownloadClick(download)
                    : undefined
                }
              />
            ))}
          </div>
        )
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No downloads found matching your filters
          </p>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Evet"
        cancelText="Hayır"
        variant={confirmDialog.variant}
      />
    </div>
  );
}

