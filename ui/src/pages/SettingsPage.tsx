import { useNavigate } from 'react-router-dom';
import SettingsPanel from '../components/SettingsPanel';

function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
        </div>
      </header>

      {/* Settings Panel */}
      <div className="flex-1 overflow-hidden">
        <SettingsPanel />
      </div>
    </div>
  );
}

export default SettingsPage;
