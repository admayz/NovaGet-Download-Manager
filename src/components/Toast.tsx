'use client';

import React, { useEffect } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

/**
 * Toast notification component
 * Displays temporary notifications with auto-dismiss
 */
export function Toast({ id, type, title, message, duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />;
      case 'error':
        return <XCircleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />;
      case 'info':
        return <InformationCircleIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'border-green-300 dark:border-green-700 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20';
      case 'error':
        return 'border-red-300 dark:border-red-700 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20';
      case 'warning':
        return 'border-yellow-300 dark:border-yellow-700 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/20';
      case 'info':
        return 'border-blue-300 dark:border-blue-700 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20';
    }
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-sm ${getStyles()} animate-slide-in-right transform transition-all duration-300 hover:scale-105`}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
        {message && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 break-words leading-relaxed">{message}</p>
        )}
      </div>

      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all duration-200 hover:rotate-90"
        aria-label="Close notification"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    </div>
  );
}
