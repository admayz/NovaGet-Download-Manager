'use client';

import { useState, useEffect } from 'react';
import { ShieldCheckIcon, ShieldExclamationIcon, ClockIcon } from '@heroicons/react/24/outline';

export interface SecurityLogEntry {
  id: string;
  timestamp: number;
  type: 'url-scan' | 'file-scan' | 'threat-blocked' | 'threat-warning' | 'quarantine' | 'delete';
  url?: string;
  filename?: string;
  result: 'safe' | 'warning' | 'threat';
  positives?: number;
  total?: number;
  action?: string;
}

interface SecurityLogViewerProps {
  logs: SecurityLogEntry[];
  maxEntries?: number;
}

export default function SecurityLogViewer({ logs, maxEntries = 50 }: SecurityLogViewerProps) {
  const [filter, setFilter] = useState<'all' | 'safe' | 'warning' | 'threat'>('all');
  const [displayLogs, setDisplayLogs] = useState<SecurityLogEntry[]>([]);

  useEffect(() => {
    let filtered = logs;
    
    if (filter !== 'all') {
      filtered = logs.filter(log => log.result === filter);
    }

    // Sort by timestamp descending and limit
    filtered = filtered
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, maxEntries);

    setDisplayLogs(filtered);
  }, [logs, filter, maxEntries]);

  const getTypeLabel = (type: SecurityLogEntry['type']): string => {
    const labels: Record<SecurityLogEntry['type'], string> = {
      'url-scan': 'URL Scan',
      'file-scan': 'File Scan',
      'threat-blocked': 'Threat Blocked',
      'threat-warning': 'Threat Warning',
      'quarantine': 'Quarantined',
      'delete': 'Deleted'
    };
    return labels[type];
  };

  const getResultColor = (result: SecurityLogEntry['result']): string => {
    const colors: Record<SecurityLogEntry['result'], string> = {
      'safe': 'text-green-600 dark:text-green-400',
      'warning': 'text-yellow-600 dark:text-yellow-400',
      'threat': 'text-red-600 dark:text-red-400'
    };
    return colors[result];
  };

  const getResultIcon = (result: SecurityLogEntry['result']) => {
    if (result === 'safe') {
      return <ShieldCheckIcon className="w-5 h-5 text-green-600 dark:text-green-400" />;
    }
    return <ShieldExclamationIcon className="w-5 h-5 text-red-600 dark:text-red-400" />;
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than 1 minute
    if (diff < 60000) {
      return 'Just now';
    }
    
    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    
    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    
    // Show full date
    return date.toLocaleString();
  };

  const stats = {
    total: logs.length,
    safe: logs.filter(l => l.result === 'safe').length,
    warning: logs.filter(l => l.result === 'warning').length,
    threat: logs.filter(l => l.result === 'threat').length
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Security Scan History
        </h3>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total Scans</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.safe}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Safe</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.warning}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Warnings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.threat}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Threats</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('safe')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'safe'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Safe
          </button>
          <button
            onClick={() => setFilter('warning')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'warning'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Warnings
          </button>
          <button
            onClick={() => setFilter('threat')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'threat'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Threats
          </button>
        </div>
      </div>

      {/* Log Entries */}
      <div className="max-h-96 overflow-y-auto">
        {displayLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <ShieldCheckIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No security logs found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {displayLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getResultIcon(log.result)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {getTypeLabel(log.type)}
                      </span>
                      <span className={`text-xs font-semibold ${getResultColor(log.result)}`}>
                        {log.result.toUpperCase()}
                      </span>
                      {log.positives !== undefined && log.total !== undefined && (
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          ({log.positives}/{log.total})
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {log.filename || log.url}
                    </p>
                    {log.action && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Action: {log.action}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <ClockIcon className="w-3 h-3" />
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
