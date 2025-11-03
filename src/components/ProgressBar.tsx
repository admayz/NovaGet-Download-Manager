'use client';

import { SegmentProgress } from '@/types/electron';
import { formatPercentage } from '@/lib/formatters';

interface ProgressBarProps {
  percentage: number;
  segments?: SegmentProgress[];
  showSegments?: boolean;
  className?: string;
}

export function ProgressBar({
  percentage,
  segments,
  showSegments = false,
  className = '',
}: ProgressBarProps) {
  return (
    <div className={`w-full ${className}`}>
      {/* Main progress bar */}
      <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>

      {/* Percentage text */}
      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 text-right">
        {formatPercentage(percentage)}
      </div>

      {/* Segment visualization */}
      {showSegments && segments && segments.length > 0 && (
        <div className="mt-2">
          <div className="flex gap-0.5 h-1">
            {segments.map((segment) => {
              const segmentPercentage =
                segment.end - segment.start > 0
                  ? (segment.downloaded / (segment.end - segment.start)) * 100
                  : 0;

              return (
                <div
                  key={segment.segmentId}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-sm overflow-hidden relative"
                  title={`Segment ${segment.segmentId + 1}: ${segmentPercentage.toFixed(1)}%`}
                >
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
                    style={{ width: `${segmentPercentage}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
            {segments.length} segments
          </div>
        </div>
      )}
    </div>
  );
}
