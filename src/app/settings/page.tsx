'use client';

import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import SettingsSection from '@/components/settings/SettingsSection';
import ToggleSwitch from '@/components/settings/ToggleSwitch';
import SliderInput from '@/components/settings/SliderInput';

export default function SettingsPage() {
  const {
    // General settings
    defaultDirectory,
    maxConcurrentDownloads,
    segmentsPerDownload,
    setDefaultDirectory,
    setMaxConcurrentDownloads,
    setSegmentsPerDownload,

    // Speed settings
    enableSpeedLimit,
    globalSpeedLimit,
    setEnableSpeedLimit,
    setGlobalSpeedLimit,

    // AI settings
    enableAutoCategorization,
    enableSmartNaming,
    enableAutoTagging,
    setEnableAutoCategorization,
    setEnableSmartNaming,
    setEnableAutoTagging,

    // Appearance settings
    theme,
    setTheme,

    // Advanced settings
    enableClipboardWatch,
    enableSystemTray,
    enableNotifications,
    notificationSound,
    setEnableClipboardWatch,
    setEnableSystemTray,
    setEnableNotifications,
    setNotificationSound,

    // Actions
    loadSettings,
    saveAllSettings,
    resetToDefaults,
    hasUnsavedChanges,
    isLoading,
    error,
  } = useSettingsStore();

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    loadSettings();
  }, [loadSettings]);

  const handleBrowseDirectory = async () => {
    if (typeof window !== 'undefined' && window.electron) {
      const result = await window.electron.dialog.selectDirectory();
      if (result.success && result.path && !result.canceled) {
        setDefaultDirectory(result.path);
      }
    }
  };

  const handleSaveChanges = async () => {
    await saveAllSettings();
  };

  const handleResetToDefaults = async () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      await resetToDefaults();
    }
  };

  const formatSpeedLimit = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return 'Unlimited';
    const mbps = bytesPerSecond / (1024 * 1024);
    return `${mbps.toFixed(1)} MB/s`;
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Configure NovaGet to your preferences
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* General Settings */}
        <SettingsSection
          title="General Settings"
          description="Configure basic download behavior"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Download Directory
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={defaultDirectory || 'Not set'}
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                onClick={handleBrowseDirectory}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                Browse
              </button>
            </div>
          </div>

          <SliderInput
            label="Max Concurrent Downloads"
            value={maxConcurrentDownloads}
            min={1}
            max={10}
            onChange={setMaxConcurrentDownloads}
          />

          <SliderInput
            label="Segments per Download"
            value={segmentsPerDownload}
            min={1}
            max={16}
            onChange={setSegmentsPerDownload}
          />
        </SettingsSection>

        {/* Speed Settings */}
        <SettingsSection
          title="Speed Settings"
          description="Control download speed limits"
        >
          <ToggleSwitch
            enabled={enableSpeedLimit}
            onChange={setEnableSpeedLimit}
            label="Enable Speed Limiting"
            description="Limit download speed globally"
          />

          {enableSpeedLimit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Global Speed Limit: {formatSpeedLimit(globalSpeedLimit)}
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={(globalSpeedLimit / (1024 * 1024)).toFixed(1)}
                onChange={(e) => setGlobalSpeedLimit(Math.round(parseFloat(e.target.value) * 1024 * 1024))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter speed limit in MB/s (0 for unlimited)"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enter 0 for unlimited speed
              </p>
            </div>
          )}
        </SettingsSection>

        {/* AI Settings */}
        <SettingsSection
          title="AI Features"
          description="Configure AI-powered features using Pollinations.ai"
        >
          <ToggleSwitch
            enabled={enableAutoCategorization}
            onChange={setEnableAutoCategorization}
            label="Auto Categorization"
            description="Automatically categorize downloads by file type"
          />

          <ToggleSwitch
            enabled={enableSmartNaming}
            onChange={setEnableSmartNaming}
            label="Smart Naming"
            description="Suggest better file names using AI"
          />

          <ToggleSwitch
            enabled={enableAutoTagging}
            onChange={setEnableAutoTagging}
            label="Auto Tagging"
            description="Automatically generate tags for downloads"
          />
        </SettingsSection>

        {/* Appearance Settings */}
        <SettingsSection
          title="Appearance"
          description="Customize the look and feel"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Theme
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === 'light'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Dark
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Language
            </label>
            <select
              disabled
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white opacity-50 cursor-not-allowed"
            >
              <option>English (Coming Soon)</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Multi-language support coming in a future update
            </p>
          </div>
        </SettingsSection>

        {/* Advanced Settings */}
        <SettingsSection
          title="Advanced"
          description="Configure advanced features and behavior"
        >
          <ToggleSwitch
            enabled={enableClipboardWatch}
            onChange={setEnableClipboardWatch}
            label="Clipboard Watching"
            description="Automatically detect download URLs in clipboard"
          />

          <ToggleSwitch
            enabled={enableSystemTray}
            onChange={setEnableSystemTray}
            label="System Tray"
            description="Minimize to system tray instead of closing"
          />

          <ToggleSwitch
            enabled={enableNotifications}
            onChange={setEnableNotifications}
            label="Notifications"
            description="Show desktop notifications for download events"
          />

          <ToggleSwitch
            enabled={notificationSound}
            onChange={setNotificationSound}
            label="Notification Sound"
            description="Play sound with notifications"
            disabled={!enableNotifications}
          />
        </SettingsSection>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            onClick={handleResetToDefaults}
            disabled={isLoading}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={isLoading || !hasUnsavedChanges}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      </div>
    </div>
  );
}
