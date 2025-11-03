'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import { DownloadProgress } from '@/types/electron';
import { DownloadCard } from './DownloadCard';
import { useDownloadStore } from '@/store/downloadStore';
import { CategoryFilter, FileCategory } from './CategoryFilter';
import { VirtualList } from './VirtualList';
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
        <div
          className={`relative mb-4 ${
            selectedIds.has(download.downloadId)
              ? 'ring-2 ring-purple-500 rounded-lg'
              : ''
          }`}
        >
          <input
            type="checkbox"
            checked={selectedIds.has(download.downloadId)}
            onChange={() => onSelectDownload(download.downloadId)}
            className="absolute top-4 left-4 z-10 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
          />
          <div className="pl-10">
            <DownloadCard
              download={download}
              showSegments={showSegments}
              onClick={
                onDownloadClick
                  ? () => onDownloadClick(download)
                  : undefined
              }
            />
          </div>
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
    if (
      !confirm(
        `Are you sure you want to cancel ${selectedIds.size} download(s)?`
      )
    ) {
      return;
    }

    const promises = Array.from(selectedIds).map((id) =>
      useDownloadStore.getState().cancelDownload(id)
    );
    await Promise.all(promises);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ${selectedIds.size} download(s)? This will remove them from the list.`
      )
    ) {
      return;
    }

    const promises = Array.from(selectedIds).map((id) =>
      useDownloadStore.getState().cancelDownload(id)
    );
    await Promise.all(promises);
    setSelectedIds(new Set());
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
              title="Select All"
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Select All
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
              <option value="all">All Status</option>
              <option value="downloading">Downloading</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="queued">Queued</option>
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
              <option value="date">Date</option>
              <option value="size">Size</option>
              <option value="speed">Speed</option>
              <option value="name">Name</option>
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
              title="Pause All"
            >
              <PauseIcon className="w-4 h-4" />
              Pause All
            </button>
            <button
              onClick={resumeAll}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors text-sm"
              title="Resume All"
            >
              <PlayIcon className="w-4 h-4" />
              Resume All
            </button>
            <button
              onClick={clearCompleted}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors text-sm"
              title="Clear Completed"
            >
              <TrashIcon className="w-4 h-4" />
              Clear
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
                Clear Selection
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
              <div
                key={download.downloadId}
                className={`relative ${
                  selectedIds.has(download.downloadId)
                    ? 'ring-2 ring-purple-500 rounded-lg'
                    : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(download.downloadId)}
                  onChange={() => handleSelectDownload(download.downloadId)}
                  className="absolute top-4 left-4 z-10 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <div className="pl-10">
                  <DownloadCard
                    download={download}
                    showSegments={showSegments}
                    onClick={
                      onDownloadClick
                        ? () => onDownloadClick(download)
                        : undefined
                    }
                  />
                </div>
              </div>
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
    </div>
  );
}
