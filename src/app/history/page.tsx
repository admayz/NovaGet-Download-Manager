'use client';

import { useEffect, useState, useMemo } from 'react';
import { DownloadRecord, Statistics } from '@/types/electron';
import { formatBytes, formatSpeed } from '@/lib/formatters';
import { MagnifyingGlassIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

type TimeRange = 'daily' | 'weekly' | 'monthly';

export default function HistoryPage() {
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [categoryStats, setCategoryStats] = useState<Record<string, { count: number; totalBytes: number }>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      if (typeof window !== 'undefined' && window.electron) {
        // Load all downloads
        const downloadsResponse = await window.electron.db.getAllDownloads();
        if (downloadsResponse.success && downloadsResponse.downloads) {
          setDownloads(downloadsResponse.downloads);
        }

        // Load statistics
        const statsResponse = await window.electron.stats.get();
        if (statsResponse.success && statsResponse.stats) {
          setStatistics(statsResponse.stats);
        }

        // Load category statistics
        const categoryResponse = await window.electron.stats.getByCategory();
        if (categoryResponse.success && categoryResponse.stats) {
          setCategoryStats(categoryResponse.stats);
        }
      }
    } catch (error) {
      console.error('Failed to load history data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter completed downloads
  const completedDownloads = useMemo(() => {
    return downloads
      .filter((d) => d.status === 'completed')
      .sort((a, b) => (b.completed_at || 0) - (a.completed_at || 0));
  }, [downloads]);

  // Search functionality
  const filteredDownloads = useMemo(() => {
    if (!searchQuery.trim()) return completedDownloads;
    
    const query = searchQuery.toLowerCase();
    return completedDownloads.filter(
      (d) =>
        d.filename.toLowerCase().includes(query) ||
        d.url.toLowerCase().includes(query) ||
        d.category?.toLowerCase().includes(query)
    );
  }, [completedDownloads, searchQuery]);

  // Time range filtering for statistics
  const filteredByTimeRange = useMemo(() => {
    const now = Date.now();
    let cutoffTime = 0;

    switch (timeRange) {
      case 'daily':
        cutoffTime = now - 24 * 60 * 60 * 1000;
        break;
      case 'weekly':
        cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case 'monthly':
        cutoffTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
    }

    return completedDownloads.filter((d) => (d.completed_at || 0) >= cutoffTime);
  }, [completedDownloads, timeRange]);

  // Calculate time-range specific statistics
  const timeRangeStats = useMemo(() => {
    const totalBytes = filteredByTimeRange.reduce((sum, d) => sum + d.total_bytes, 0);
    const count = filteredByTimeRange.length;
    
    return {
      count,
      totalBytes,
    };
  }, [filteredByTimeRange]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredDownloads.length === 0) {
      alert('No downloads to export');
      return;
    }

    const headers = ['Filename', 'URL', 'Size', 'Category', 'Status', 'Created At', 'Completed At'];
    const rows = filteredDownloads.map((d) => [
      d.filename,
      d.url,
      formatBytes(d.total_bytes),
      d.category || 'N/A',
      d.status,
      new Date(d.created_at).toLocaleString(),
      d.completed_at ? new Date(d.completed_at).toLocaleString() : 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `novaget-history-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const successRate = statistics
    ? statistics.totalDownloads > 0
      ? ((statistics.completedDownloads / statistics.totalDownloads) * 100).toFixed(1)
      : '0'
    : '0';

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">History</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View your download history and statistics
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Downloads</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {statistics?.totalDownloads || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Data</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {formatBytes(statistics?.totalBytes || 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Average Speed</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {formatSpeed(statistics?.averageSpeed || 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {successRate}%
          </p>
        </div>
      </div>

      {/* Time Range Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Statistics Dashboard
          </h2>
          
          {/* Time Range Selector */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTimeRange('daily')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === 'daily'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setTimeRange('weekly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === 'weekly'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setTimeRange('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === 'monthly'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Time Range Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Downloads in Period</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {timeRangeStats.count}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Data in Period</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatBytes(timeRangeStats.totalBytes)}
              </p>
            </div>
          </div>

          {/* Category Breakdown */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Category Breakdown
            </h3>
            {Object.keys(categoryStats).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(categoryStats)
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([category, stats]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                            {category}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {stats.count} files • {formatBytes(stats.totalBytes)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{
                              width: `${
                                statistics?.totalBytes
                                  ? (stats.totalBytes / statistics.totalBytes) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No category data available
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Completed Downloads List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Completed Downloads
            </h2>
            <div className="flex gap-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button
                onClick={handleExportCSV}
                disabled={filteredDownloads.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-lg">Loading history...</p>
            </div>
          ) : filteredDownloads.length > 0 ? (
            <div className="space-y-3">
              {filteredDownloads.map((download) => (
                <div
                  key={download.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                        {download.filename}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                        {download.url}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>{formatBytes(download.total_bytes)}</span>
                        {download.category && (
                          <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs font-medium capitalize">
                            {download.category}
                          </span>
                        )}
                        {download.completed_at && (
                          <span>
                            {new Date(download.completed_at).toLocaleDateString()} •{' '}
                            {new Date(download.completed_at).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <div className="text-6xl mb-4">📜</div>
              <p className="text-lg">
                {searchQuery ? 'No downloads found' : 'No history yet'}
              </p>
              <p className="text-sm mt-2">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Your completed downloads will appear here'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
