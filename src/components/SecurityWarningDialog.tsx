'use client';

import { useState } from 'react';
import { ExclamationTriangleIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '@/hooks/useTranslation';

export interface SecurityThreat {
  positives: number;
  total: number;
  scanDate: string;
  permalink: string;
  threats: string[];
  scanId: string;
}

interface SecurityWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  onCancel: () => void;
  url?: string;
  filename?: string;
  threat: SecurityThreat;
  type: 'pre-download' | 'post-download';
}

export default function SecurityWarningDialog({
  isOpen,
  onClose,
  onContinue,
  onCancel,
  url,
  filename,
  threat,
  type
}: SecurityWarningDialogProps) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen) return null;

  const isPreDownload = type === 'pre-download';
  const title = isPreDownload 
    ? `${t('security.warningTitle')}: ${t('security.suspiciousUrl')}` 
    : `${t('security.warningTitle')}: ${t('security.virusDetectedTitle')}`;
  const message = isPreDownload
    ? t('security.suspiciousUrlMessage')
    : t('security.virusDetectedMessage');

  const continueText = isPreDownload ? t('security.downloadAnyway') : t('security.keepFile');
  const cancelText = isPreDownload ? t('security.cancelDownload') : t('security.deleteFile');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <ShieldExclamationIcon className="w-12 h-12 text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Threat Summary */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-red-900 dark:text-red-100">
                {t('security.threatSummary')}
              </h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-red-800 dark:text-red-200">{t('security.detections')}:</span>
                <span className="font-bold text-red-900 dark:text-red-100">
                  {threat.positives} / {threat.total}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-800 dark:text-red-200">{t('security.scanDate')}:</span>
                <span className="text-red-900 dark:text-red-100">
                  {new Date(threat.scanDate).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* File/URL Info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {isPreDownload ? 'URL' : t('security.filename')}
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 break-all font-mono">
              {isPreDownload ? url : filename}
            </p>
          </div>

          {/* Threat Details */}
          {threat.threats.length > 0 && (
            <div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                {showDetails ? '▼' : '▶'} {showDetails ? t('security.hideDetails') : t('security.showDetails')} ({threat.threats.length} {threat.threats.length === 1 ? 'detection' : 'detections'})
              </button>
              
              {showDetails && (
                <div className="mt-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <ul className="space-y-1 text-sm">
                    {threat.threats.map((threat, index) => (
                      <li key={index} className="text-gray-700 dark:text-gray-300 font-mono text-xs">
                        • {threat}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* VirusTotal Link */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <a
              href={threat.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 underline"
            >
              {t('security.viewFullReport')} →
            </a>
          </div>

          {/* Warning Message */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>⚠️ {t('common.warning')}:</strong> {t('security.warningMessage', { type: isPreDownload ? 'download' : 'file' })}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onContinue}
            className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {continueText}
          </button>
        </div>
      </div>
    </div>
  );
}
