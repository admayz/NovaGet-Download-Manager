'use client';

import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { useTranslation } from '@/hooks/useTranslation';
import SettingsSection from '@/components/settings/SettingsSection';
import ToggleSwitch from '@/components/settings/ToggleSwitch';
import SliderInput from '@/components/settings/SliderInput';
import { ConfirmDialog } from '@/components/ConfirmDialog';

// Language Selector Component
function LanguageSelector() {
  const { language, getSupportedLanguages, changeLanguage, isInitialized } = useTranslation();
  const supportedLanguages = getSupportedLanguages();

  if (!isInitialized || supportedLanguages.length === 0) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Language
        </label>
        <select
          disabled
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white opacity-50 cursor-not-allowed"
        >
          <option>Loading...</option>
        </select>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Language
      </label>
      <select
        value={language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      >
        {supportedLanguages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName} ({lang.name})
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        The application will reload when you change the language
      </p>
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
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

    // Security settings
    virusTotalApiKey,
    enableVirusScan,
    autoScanDownloads,
    scanBeforeDownload,
    scanAfterDownload,
    setVirusTotalApiKey,
    setEnableVirusScan,
    setAutoScanDownloads,
    setScanBeforeDownload,
    setScanAfterDownload,

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
  const [showResetDialog, setShowResetDialog] = useState(false);

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

  const handleResetToDefaults = () => {
    setShowResetDialog(true);
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('settings.subtitle')}
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
          title={t('settings.general')}
          description={t('settings.subtitle')}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.downloadPath')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={defaultDirectory || t('settings.selectDownloadPath')}
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                onClick={handleBrowseDirectory}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                {t('download.form.selectDirectory')}
              </button>
            </div>
          </div>

          <SliderInput
            label={t('settings.maxConcurrentDownloads')}
            value={maxConcurrentDownloads}
            min={1}
            max={10}
            onChange={setMaxConcurrentDownloads}
          />

          <SliderInput
            label={t('settings.segmentsPerDownload')}
            value={segmentsPerDownload}
            min={1}
            max={16}
            onChange={setSegmentsPerDownload}
          />
        </SettingsSection>

        {/* Speed Settings */}
        <SettingsSection
          title={t('settings.speed')}
          description={t('settings.globalSpeedLimit')}
        >
          <ToggleSwitch
            enabled={enableSpeedLimit}
            onChange={setEnableSpeedLimit}
            label={t('settings.enableSpeedLimit')}
            description={t('settings.disableSpeedLimit')}
          />

          {enableSpeedLimit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.speedLimitValue')}: {formatSpeedLimit(globalSpeedLimit)}
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={(globalSpeedLimit / (1024 * 1024)).toFixed(1)}
                onChange={(e) => setGlobalSpeedLimit(Math.round(parseFloat(e.target.value) * 1024 * 1024))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={t('download.form.speedLimitPlaceholder')}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('settings.disableSpeedLimit')}
              </p>
            </div>
          )}
        </SettingsSection>

        {/* AI Settings */}
        <SettingsSection
          title={t('settings.ai')}
          description={t('settings.aiFeatures')}
        >
          <ToggleSwitch
            enabled={enableAutoCategorization}
            onChange={setEnableAutoCategorization}
            label={t('settings.enableAutoCategorization')}
            description={t('settings.enableAutoCategorization')}
          />

          <ToggleSwitch
            enabled={enableSmartNaming}
            onChange={setEnableSmartNaming}
            label={t('settings.enableSmartNaming')}
            description={t('settings.enableSmartNaming')}
          />

          <ToggleSwitch
            enabled={enableAutoTagging}
            onChange={setEnableAutoTagging}
            label={t('settings.enableAutoTagging')}
            description={t('settings.enableAutoTagging')}
          />
        </SettingsSection>

        {/* Security Settings */}
        <SettingsSection
          title={t('settings.security')}
          description={t('settings.securitySubtitle')}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.virusTotalApiKey')}
            </label>
            <input
              type="password"
              value={virusTotalApiKey}
              onChange={(e) => setVirusTotalApiKey(e.target.value)}
              placeholder={t('settings.virusTotalApiKeyPlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.virusTotalApiKeyHelp')}{' '}
              <a
                href="https://www.virustotal.com/gui/my-apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 underline"
              >
                {t('settings.virusTotalApiKeyHelpLink')}
              </a>
              {' '}{t('settings.virusTotalFreeTier')}
            </p>
          </div>

          <ToggleSwitch
            enabled={enableVirusScan}
            onChange={setEnableVirusScan}
            label={t('settings.enableVirusScan')}
            description={t('settings.enableVirusScanDesc')}
          />

          {enableVirusScan && (
            <>
              <ToggleSwitch
                enabled={autoScanDownloads}
                onChange={setAutoScanDownloads}
                label={t('settings.autoScanDownloads')}
                description={t('settings.autoScanDownloadsDesc')}
              />

              <ToggleSwitch
                enabled={scanBeforeDownload}
                onChange={setScanBeforeDownload}
                label={t('settings.scanBeforeDownload')}
                description={t('settings.scanBeforeDownloadDesc')}
              />

              <ToggleSwitch
                enabled={scanAfterDownload}
                onChange={setScanAfterDownload}
                label={t('settings.scanAfterDownload')}
                description={t('settings.scanAfterDownloadDesc')}
              />

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  {t('settings.securityScanInfo')}
                </h4>
                <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• {t('settings.securityScanInfoItems.preDownload')}</li>
                  <li>• {t('settings.securityScanInfoItems.postDownload')}</li>
                  <li>• {t('settings.securityScanInfoItems.threatWarning')}</li>
                  <li>• {t('settings.securityScanInfoItems.quarantine')}</li>
                  <li>• {t('settings.securityScanInfoItems.rateLimit')}</li>
                </ul>
              </div>
            </>
          )}
        </SettingsSection>

        {/* Appearance Settings */}
        <SettingsSection
          title={t('settings.appearance')}
          description={t('settings.appearance')}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.theme')}
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
                {t('settings.themeLight')}
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t('settings.themeDark')}
              </button>
            </div>
          </div>

          <LanguageSelector />
        </SettingsSection>

        {/* Advanced Settings */}
        <SettingsSection
          title={t('settings.advanced')}
          description={t('settings.advanced')}
        >
          <ToggleSwitch
            enabled={enableClipboardWatch}
            onChange={setEnableClipboardWatch}
            label={t('settings.clipboardWatching')}
            description={t('settings.enableClipboardWatching')}
          />

          <ToggleSwitch
            enabled={enableSystemTray}
            onChange={setEnableSystemTray}
            label={t('settings.systemTray')}
            description={t('settings.minimizeToTray')}
          />

          <ToggleSwitch
            enabled={enableNotifications}
            onChange={setEnableNotifications}
            label={t('settings.notifications')}
            description={t('settings.enableNotifications')}
          />

          <ToggleSwitch
            enabled={notificationSound}
            onChange={setNotificationSound}
            label={t('settings.notifications')}
            description={t('settings.notificationSound')}
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
            {t('settings.resetSettings')}
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={isLoading || !hasUnsavedChanges}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t('common.loading') : hasUnsavedChanges ? t('settings.saveSettings') : t('settings.settingsSaved')}
          </button>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        onConfirm={async () => {
          await resetToDefaults();
        }}
        title={t('settings.resetSettings')}
        message={t('settings.confirmResetSettings')}
        confirmText={t('common.yes')}
        cancelText={t('common.no')}
        variant="warning"
      />
    </div>
  );
}
