import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { formatSpeed } from '../utils/formatters';
import { DownloadStatus } from '../types/download';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type TimeRange = '1min' | '5min' | '15min';

interface SpeedDataPoint {
  timestamp: number;
  speed: number;
}

export default function SpeedGraph() {
  const downloads = useSelector((state: RootState) => state.downloads.downloads);
  const [timeRange, setTimeRange] = useState<TimeRange>('1min');
  const [speedData, setSpeedData] = useState<SpeedDataPoint[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getMaxDataPoints = (range: TimeRange): number => {
    switch (range) {
      case '1min':
        return 60; // 1 point per second
      case '5min':
        return 150; // 1 point per 2 seconds
      case '15min':
        return 180; // 1 point per 5 seconds
    }
  };

  const getUpdateInterval = (range: TimeRange): number => {
    switch (range) {
      case '1min':
        return 1000; // 1 second
      case '5min':
        return 2000; // 2 seconds
      case '15min':
        return 5000; // 5 seconds
    }
  };

  useEffect(() => {
    // Clear existing data when time range changes
    setSpeedData([]);

    // Start collecting speed data
    intervalRef.current = setInterval(() => {
      const activeDownloads = downloads.filter(
        (d) => d.status === DownloadStatus.Downloading
      );
      
      const totalSpeed = activeDownloads.reduce(
        (sum, d) => sum + (d.currentSpeed || 0),
        0
      );

      setSpeedData((prev) => {
        const newData = [
          ...prev,
          {
            timestamp: Date.now(),
            speed: totalSpeed,
          },
        ];

        // Keep only the required number of data points
        const maxPoints = getMaxDataPoints(timeRange);
        return newData.slice(-maxPoints);
      });
    }, getUpdateInterval(timeRange));

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timeRange, downloads]);

  const getCurrentSpeed = () => {
    const activeDownloads = downloads.filter(
      (d) => d.status === DownloadStatus.Downloading
    );
    return activeDownloads.reduce((sum, d) => sum + (d.currentSpeed || 0), 0);
  };

  const getAverageSpeed = () => {
    if (speedData.length === 0) return 0;
    const sum = speedData.reduce((acc, point) => acc + point.speed, 0);
    return sum / speedData.length;
  };

  const getPeakSpeed = () => {
    if (speedData.length === 0) return 0;
    return Math.max(...speedData.map((point) => point.speed));
  };

  const chartData = {
    labels: speedData.map((_, index) => {
      // Show time labels based on range
      if (timeRange === '1min' && index % 10 === 0) {
        return `${Math.floor((speedData.length - index) / 10) * 10}s`;
      } else if (timeRange === '5min' && index % 30 === 0) {
        return `${Math.floor((speedData.length - index) / 30)}m`;
      } else if (timeRange === '15min' && index % 36 === 0) {
        return `${Math.floor((speedData.length - index) / 36) * 5}m`;
      }
      return '';
    }),
    datasets: [
      {
        label: 'Download Speed',
        data: speedData.map((point) => point.speed),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return formatSpeed(context.parsed.y);
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
        },
      },
      y: {
        display: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          callback: (value: any) => {
            return formatSpeed(value);
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Download Speed
        </h3>
        <div className="flex gap-2">
          {(['1min', '5min', '15min'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                timeRange === range
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">Current</div>
          <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
            {formatSpeed(getCurrentSpeed())}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">Average</div>
          <div className="text-lg font-semibold text-green-600 dark:text-green-400">
            {formatSpeed(getAverageSpeed())}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">Peak</div>
          <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
            {formatSpeed(getPeakSpeed())}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        {speedData.length > 0 ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <p>No active downloads</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
