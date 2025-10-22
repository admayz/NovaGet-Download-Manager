import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import { updateSettings, setSettings } from '../store/slices/settingsSlice';
import { settingsService } from '../services/settingsService';
import { formatBytes } from '../utils/formatters';
import ThemeToggle from './ThemeToggle';

type SettingsSection = 'general' | 'network' | 'security' | 'ui';

export default function SettingsPanel() {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings.settings);
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await settingsService.getSettings();
      dispatch(setSettings(loadedSettings));
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await settingsService.updateSettings(settings);
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage('Failed to save settings');
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectFolder = async () => {
    const folder = await settingsService.selectFolder();
    if (folder) {
      dispatch(updateSettings({ defaultDownloadPath: folder }));
    }
  };

  const handleChange = (key: string, value: any) => {
    dispatch(updateSettings({ [key]: value }));
  };

  const sections = [
    { id: 'general' as SettingsSection, name: 'General', icon: '⚙️' },
    { id: 'network' as SettingsSection, name: 'Network', icon: '🌐' },
    { id: 'security' as SettingsSection, name: 'Security', icon: '🔒' },
    { id: 'ui' as SettingsSection, name: 'UI', icon: '🎨' },
  ];

  return (
    <div className="flex h-full bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Settings</h2>
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-xl">{section.icon}</span>
                <span>{section.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8">
          {activeSection === 'general' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">General Settings</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default Download Path
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.defaultDownloadPath}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleSelectFolder}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    Browse
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Concurrent Downloads
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.maxConcurrentDownloads}
                  onChange={(e) => handleChange('maxConcurrentDownloads', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auto-start downloads
                </label>
                <input
                  type="checkbox"
                  checked={settings.autoStartDownloads}
                  onChange={(e) => handleChange('autoStartDownloads', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Close to system tray
                </label>
                <input
                  type="checkbox"
                  checked={settings.closeToTray}
                  onChange={(e) => handleChange('closeToTray', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Start with Windows
                </label>
                <input
                  type="checkbox"
                  checked={settings.startWithWindows}
                  onChange={(e) => handleChange('startWithWindows', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </div>
            </div>
          )}

          {activeSection === 'network' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Network Settings</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Global Speed Limit (0 = unlimited)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={settings.globalSpeedLimit}
                    onChange={(e) => handleChange('globalSpeedLimit', parseInt(e.target.value))}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {settings.globalSpeedLimit > 0 ? formatBytes(settings.globalSpeedLimit) + '/s' : 'Unlimited'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Connections Per Download
                </label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={settings.maxConnectionsPerDownload}
                  onChange={(e) => handleChange('maxConnectionsPerDownload', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Proxy
                </label>
                <input
                  type="checkbox"
                  checked={settings.proxyEnabled}
                  onChange={(e) => handleChange('proxyEnabled', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </div>

              {settings.proxyEnabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Proxy Host
                      </label>
                      <input
                        type="text"
                        value={settings.proxyHost}
                        onChange={(e) => handleChange('proxyHost', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Proxy Port
                      </label>
                      <input
                        type="number"
                        value={settings.proxyPort}
                        onChange={(e) => handleChange('proxyPort', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Username (optional)
                      </label>
                      <input
                        type="text"
                        value={settings.proxyUsername}
                        onChange={(e) => handleChange('proxyUsername', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Password (optional)
                      </label>
                      <input
                        type="password"
                        value={settings.proxyPassword}
                        onChange={(e) => handleChange('proxyPassword', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Custom User-Agent (optional)
                </label>
                <input
                  type="text"
                  value={settings.customUserAgent}
                  onChange={(e) => handleChange('customUserAgent', e.target.value)}
                  placeholder="Leave empty for default"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Security Settings</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable Malware Scanning
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Scan files using VirusTotal API
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableMalwareScanning}
                  onChange={(e) => handleChange('enableMalwareScanning', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </div>

              {settings.enableMalwareScanning && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    VirusTotal API Key
                  </label>
                  <input
                    type="password"
                    value={settings.virusTotalApiKey}
                    onChange={(e) => handleChange('virusTotalApiKey', e.target.value)}
                    placeholder="Enter your VirusTotal API key"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Use Sandbox for Executables
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Download executables to sandbox folder first
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.useSandboxForExecutables}
                  onChange={(e) => handleChange('useSandboxForExecutables', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Validate TLS Certificates
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Recommended for security
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.validateTlsCertificates}
                  onChange={(e) => handleChange('validateTlsCertificates', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </div>
            </div>
          )}

          {activeSection === 'ui' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">UI Settings</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Theme
                </label>
                <ThemeToggle />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Show Notifications
                </label>
                <input
                  type="checkbox"
                  checked={settings.showNotifications}
                  onChange={(e) => handleChange('showNotifications', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </div>

              {settings.showNotifications && (
                <>
                  <div className="flex items-center justify-between pl-6">
                    <label className="text-sm text-gray-600 dark:text-gray-400">
                      Notify on download complete
                    </label>
                    <input
                      type="checkbox"
                      checked={settings.notifyOnComplete}
                      onChange={(e) => handleChange('notifyOnComplete', e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between pl-6">
                    <label className="text-sm text-gray-600 dark:text-gray-400">
                      Notify on download failed
                    </label>
                    <input
                      type="checkbox"
                      checked={settings.notifyOnFailed}
                      onChange={(e) => handleChange('notifyOnFailed', e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between pl-6">
                    <label className="text-sm text-gray-600 dark:text-gray-400">
                      Notify on scheduled download
                    </label>
                    <input
                      type="checkbox"
                      checked={settings.notifyOnScheduled}
                      onChange={(e) => handleChange('notifyOnScheduled', e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable Clipboard Watcher
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Automatically detect URLs in clipboard
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableClipboardWatcher}
                  onChange={(e) => handleChange('enableClipboardWatcher', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Auto-categorization
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Automatically categorize downloads by file type
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoCategorizationEnabled}
                  onChange={(e) => handleChange('autoCategorizationEnabled', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-8 flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
            {saveMessage && (
              <span className={`text-sm ${saveMessage.includes('success') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {saveMessage}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
