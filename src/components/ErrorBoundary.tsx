'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global Error Boundary Component
 * Catches React errors and displays user-friendly error messages
 * Logs errors for debugging purposes
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Log to error logging service (if available)
    this.logError(error, errorInfo);
  }

  private logError(error: Error, errorInfo: ErrorInfo): void {
    // Create error log entry
    const errorLog = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🔴 Error Boundary Log');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Full Log:', errorLog);
      console.groupEnd();
    }

    // In production, you could send this to an error tracking service
    // Example: Sentry, LogRocket, etc.
    if (typeof window !== 'undefined' && window.electron && 'logger' in window.electron) {
      // Send error to main process for logging
      const logger = window.electron.logger as any;
      logger?.error('React Error Boundary', errorLog);
    }
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="max-w-md w-full">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-red-200 dark:border-red-800">
              {/* Error Icon */}
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>

              {/* Error Title */}
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-2">
                Bir Hata Oluştu
              </h1>

              {/* Error Message */}
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
                Üzgünüz, beklenmeyen bir hata oluştu. Lütfen uygulamayı yeniden başlatmayı deneyin.
              </p>

              {/* Error Details (Development Only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-700">
                  <p className="text-xs font-mono text-red-600 dark:text-red-400 break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                        Stack Trace
                      </summary>
                      <pre className="text-xs text-gray-600 dark:text-gray-400 mt-2 overflow-auto max-h-40">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  Tekrar Dene
                </button>
                <button
                  onClick={this.handleReload}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Yeniden Yükle
                </button>
              </div>

              {/* Help Text */}
              <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-4">
                Sorun devam ederse, lütfen uygulamayı yeniden başlatın.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
