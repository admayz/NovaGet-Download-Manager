'use client';

import React from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export interface ErrorDetails {
  title: string;
  message: string;
  downloadId?: string;
  timestamp?: string;
  stack?: string;
  context?: Record<string, any>;
}

interface ErrorDetailsModalProps {
  isOpen: boolean;
  error: ErrorDetails | null;
  onClose: () => void;
  onRetry?: () => void;
}

/**
 * Modal for displaying detailed error information
 * Shows error message, stack trace, and context
 */
export function ErrorDetailsModal({ isOpen, error, onClose, onRetry }: ErrorDetailsModalProps) {
  if (!isOpen || !error) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Hata Detayları
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-140px)] custom-scrollbar">
          {/* Error Title */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Hata
            </h3>
            <p className="text-base font-semibold text-red-600 dark:text-red-400">
              {error.title}
            </p>
          </div>

          {/* Error Message */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Açıklama
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {error.message}
            </p>
          </div>

          {/* Download ID */}
          {error.downloadId && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                İndirme ID
              </h3>
              <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
                {error.downloadId}
              </p>
            </div>
          )}

          {/* Timestamp */}
          {error.timestamp && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Zaman
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {new Date(error.timestamp).toLocaleString('tr-TR')}
              </p>
            </div>
          )}

          {/* Context */}
          {error.context && Object.keys(error.context).length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ek Bilgiler
              </h3>
              <div className="bg-gray-100 dark:bg-gray-900 rounded p-3 text-xs font-mono">
                <pre className="whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                  {JSON.stringify(error.context, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Stack Trace (Development Only) */}
          {process.env.NODE_ENV === 'development' && error.stack && (
            <div className="mb-4">
              <details>
                <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer mb-1">
                  Stack Trace (Geliştirici)
                </summary>
                <div className="bg-gray-100 dark:bg-gray-900 rounded p-3 text-xs font-mono mt-2">
                  <pre className="whitespace-pre-wrap text-gray-600 dark:text-gray-400 overflow-auto">
                    {error.stack}
                  </pre>
                </div>
              </details>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Yardım:</strong> Bu hata devam ederse, lütfen uygulamayı yeniden başlatmayı deneyin.
              Sorun çözülmezse, hata detaylarını kopyalayıp destek ekibiyle paylaşabilirsiniz.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Kapat
          </button>
          {onRetry && (
            <button
              onClick={() => {
                onRetry();
                onClose();
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              Tekrar Dene
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
