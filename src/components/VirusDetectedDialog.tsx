'use client';

import { useState } from 'react';
import { ShieldExclamationIcon, TrashIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '@/hooks/useTranslation';

export interface VirusDetectionResult {
  downloadId: string;
  filename: string;
  filePath: string;
  positives: number;
  total: number;
  scanDate: string;
  permalink: string;
  threats: string[];
}

interface VirusDetectedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  onQuarantine: () => void;
  onKeep: () => void;
  detection: VirusDetectionResult;
}

export default function VirusDetectedDialog({
  isOpen,
  onClose,
  onDelete,
  onQuarantine,
  onKeep,
  detection
}: VirusDetectedDialogProps) {
  const { t } = useTranslation();
  const [showThreats, setShowThreats] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsProcessing(true);
    await onDelete();
    setIsProcessing(false);
  };

  const handleQuarantine = async () => {
    setIsProcessing(true);
    await onQuarantine();
    setIsProcessing(false);
  };

  const handleKeep = async () => {
    setIsProcessing(true);
    await onKeep();
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <ShieldExclamationIcon className="w-12 h-12 text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-red-900 dark:text-red-100 mb-2">
                ⚠️ {t('security.virusDetectedTitle')}
              </h2>
              <p className="text-red-800 dark:text-red-200">
                {t('security.virusDetectedMessage')}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Detection Summary */}
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 dark:text-red-100 mb-3">
              Detection Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-red-700 dark:text-red-300">Threats Detected:</span>
                <p className="font-bold text-red-900 dark:text-red-100 text-lg">
                  {detection.positives} / {detection.total}
                </p>
              </div>
              <div>
                <span className="text-red-700 dark:text-red-300">Scan Date:</span>
                <p className="font-medium text-red-900 dark:text-red-100">
                  {new Date(detection.scanDate).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* File Info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              File Information
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Filename:</span>
                <p className="font-mono text-gray-900 dark:text-white break-all">
                  {detection.filename}
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Location:</span>
                <p className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all">
                  {detection.filePath}
                </p>
              </div>
            </div>
          </div>

          {/* Threat Details */}
          {detection.threats.length > 0 && (
            <div>
              <button
                onClick={() => setShowThreats(!showThreats)}
                className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mb-2"
              >
                {showThreats ? '▼' : '▶'} Show Detected Threats ({detection.threats.length})
              </button>
              
              {showThreats && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <ul className="space-y-1">
                    {detection.threats.map((threat, index) => (
                      <li key={index} className="text-xs font-mono text-gray-700 dark:text-gray-300">
                        • {threat}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* VirusTotal Link */}
          <div className="text-sm">
            <a
              href={detection.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 underline"
            >
              View full analysis on VirusTotal →
            </a>
          </div>

          {/* Action Options */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
              What would you like to do?
            </h3>
            <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
              <div className="flex items-start gap-2">
                <TrashIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Delete:</strong> Permanently remove the file from your system (recommended)
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ArchiveBoxIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Quarantine:</strong> Move the file to a secure quarantine folder for later review
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ShieldExclamationIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Keep:</strong> Keep the file (not recommended unless you&apos;re absolutely sure it&apos;s safe)
                </div>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>⚠️ Security Warning:</strong> This file may harm your computer. We strongly recommend deleting it.
              Only keep it if you trust the source and understand the risks.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 justify-end">
          <button
            onClick={handleDelete}
            disabled={isProcessing}
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <TrashIcon className="w-5 h-5" />
            Delete File
          </button>
          <button
            onClick={handleQuarantine}
            disabled={isProcessing}
            className="px-6 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ArchiveBoxIcon className="w-5 h-5" />
            Quarantine
          </button>
          <button
            onClick={handleKeep}
            disabled={isProcessing}
            className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Keep File
          </button>
        </div>
      </div>
    </div>
  );
}
