'use client';

import { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatSpeed } from '@/lib/formatters';

interface SpeedDataPoint {
  time: number;
  speed: number;
}

interface SpeedChartProps {
  downloadId: string;
  className?: string;
}

export function SpeedChart({ downloadId, className = '' }: SpeedChartProps) {
  const [speedHistory, setSpeedHistory] = useState<SpeedDataPoint[]>([]);
  const maxDataPoints = 60; // Last 60 seconds
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electron) return;

    // Reset start time when component mounts
    startTimeRef.current = Date.now();
    setSpeedHistory([]);

    // Listen for progress updates
    const unsubscribe = window.electron.download.onProgress((progress) => {
      if (progress.downloadId === downloadId) {
        const currentTime = Math.floor((Date.now() - startTimeRef.current) / 1000);

        setSpeedHistory((prev) => {
          const newData = [
            ...prev,
            {
              time: currentTime,
              speed: progress.speed,
            },
          ];

          // Keep only last 60 data points
          return newData.slice(-maxDataPoints);
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [downloadId]);

  // Calculate average and peak speed
  const avgSpeed =
    speedHistory.length > 0
      ? speedHistory.reduce((sum, point) => sum + point.speed, 0) /
        speedHistory.length
      : 0;

  const peakSpeed =
    speedHistory.length > 0
      ? Math.max(...speedHistory.map((point) => point.speed))
      : 0;

  const currentSpeed =
    speedHistory.length > 0
      ? speedHistory[speedHistory.length - 1].speed
      : 0;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Download Speed
        </h3>
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Current: </span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {formatSpeed(currentSpeed)}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Average: </span>
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {formatSpeed(avgSpeed)}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Peak: </span>
            <span className="font-semibold text-green-600 dark:text-green-400">
              {formatSpeed(peakSpeed)}
            </span>
          </div>
        </div>
      </div>

      {speedHistory.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={speedHistory}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#374151"
              opacity={0.2}
            />
            <XAxis
              dataKey="time"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              label={{
                value: 'Time (seconds)',
                position: 'insideBottom',
                offset: -5,
                fill: '#9CA3AF',
              }}
            />
            <YAxis
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              tickFormatter={(value) => formatSpeed(value)}
              label={{
                value: 'Speed',
                angle: -90,
                position: 'insideLeft',
                fill: '#9CA3AF',
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '0.5rem',
                color: '#F9FAFB',
              }}
              labelStyle={{ color: '#9CA3AF' }}
              formatter={(value: number) => [formatSpeed(value), 'Speed']}
              labelFormatter={(label) => `Time: ${label}s`}
            />
            <Line
              type="monotone"
              dataKey="speed"
              stroke="#8B5CF6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#8B5CF6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-gray-500 dark:text-gray-400">
          Waiting for download data...
        </div>
      )}
    </div>
  );
}
