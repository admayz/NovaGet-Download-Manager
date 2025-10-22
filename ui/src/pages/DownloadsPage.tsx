import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CategoryTabs from '../components/CategoryTabs';
import DownloadList from '../components/DownloadList';
import SpeedGraph from '../components/SpeedGraph';
import ThemeToggle from '../components/ThemeToggle';

function DownloadsPage() {
  const navigate = useNavigate();
  const [showSpeedGraph, setShowSpeedGraph] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(600);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const availableHeight = window.innerHeight - rect.top - 20;
        setListHeight(availableHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [showSpeedGraph]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Download Manager
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSpeedGraph(!showSpeedGraph)}
              className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
            >
              {showSpeedGraph ? 'Hide' : 'Show'} Speed Graph
            </button>
            <ThemeToggle />
            <button
              onClick={() => navigate('/settings')}
              className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <CategoryTabs />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-4 space-y-4">
        {/* Speed Graph */}
        {showSpeedGraph && (
          <div className="animate-fadeIn">
            <SpeedGraph />
          </div>
        )}

        {/* Download List */}
        <div ref={containerRef} className="h-full">
          <DownloadList height={listHeight} />
        </div>
      </div>
    </div>
  );
}

export default DownloadsPage;
