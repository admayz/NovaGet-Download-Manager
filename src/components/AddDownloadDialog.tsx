'use client';

import { useState, useEffect } from 'react';
import { useDownloadStore } from '@/store/downloadStore';
import { useToastStore } from '@/store/toastStore';
import { DownloadOptions } from '@/types/electron';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface AddDownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialUrl?: string;
}

export function AddDownloadDialog({
  isOpen,
  onClose,
  initialUrl = '',
}: AddDownloadDialogProps) {
  const { addDownload } = useDownloadStore();
  const { error: showError } = useToastStore();
  const [url, setUrl] = useState(initialUrl);
  const [directory, setDirectory] = useState('');
  const [filename, setFilename] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [segments, setSegments] = useState(4);
  const [speedLimit, setSpeedLimit] = useState(0);
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialUrl) {
        setUrl(initialUrl);
      }
      
      // Load settings when dialog opens
      if (typeof window !== 'undefined' && window.electron) {
        // Load default directory
        window.electron.settings.get('defaultDirectory').then((response) => {
          if (response.success && response.value) {
            setDirectory(response.value);
          }
        });
        
        // Load default segments
        window.electron.settings.get('segmentsPerDownload').then((response) => {
          if (response.success && response.value) {
            const segmentsValue = parseInt(response.value);
            if (!isNaN(segmentsValue) && segmentsValue > 0) {
              setSegments(segmentsValue);
            }
          }
        });
        
        // Load global speed limit
        window.electron.settings.get('globalSpeedLimit').then((response) => {
          if (response.success && response.value) {
            const speedLimitBytes = parseInt(response.value);
            if (!isNaN(speedLimitBytes) && speedLimitBytes > 0) {
              // Convert bytes/s to MB/s for display
              setSpeedLimit(speedLimitBytes / (1024 * 1024));
            }
          }
        });
      }
      
      // Add ESC key listener
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isSubmitting) {
          console.log('[AddDownloadDialog] ESC pressed');
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    } else {
      // Reset form when dialog closes
      setUrl('');
      setFilename('');
      setShowAdvanced(false);
      setSegments(4);
      setSpeedLimit(0);
      setScheduledTime('');
      setIsSubmitting(false);
    }
  }, [isOpen, initialUrl, isSubmitting, onClose]);



  const handleSelectDirectory = async () => {
    if (typeof window !== 'undefined' && window.electron) {
      const response = await window.electron.dialog.selectDirectory();
      
      if (response.success && response.path) {
        setDirectory(response.path);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      showError(
        'URL Gerekli',
        'Lütfen indirmek istediğiniz dosyanın URL adresini girin.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Get directory from settings or use the current value
      let downloadDir = directory;
      console.log('[AddDownloadDialog] Current directory state:', downloadDir);
      
      if (!downloadDir && typeof window !== 'undefined' && window.electron) {
        console.log('[AddDownloadDialog] No directory, fetching from settings...');
        const response = await window.electron.settings.get('defaultDirectory');
        console.log('[AddDownloadDialog] Settings response:', response);
        if (response.success && response.value) {
          downloadDir = response.value;
          console.log('[AddDownloadDialog] Using directory from settings:', downloadDir);
        }
      }

      // If still no directory, let backend handle it
      if (!downloadDir) {
        console.log('[AddDownloadDialog] No directory found, backend will use default');
        downloadDir = '';
      }

      const options: DownloadOptions = {
        url: url.trim(),
        directory: downloadDir,
        ...(filename.trim() && { filename: filename.trim() }),
        ...(segments > 0 && { segments }),
        ...(speedLimit > 0 && { speedLimit: speedLimit * 1024 * 1024 }), // Convert MB/s to bytes/s
        ...(scheduledTime && { scheduledTime: new Date(scheduledTime) }),
      };

      console.log('[AddDownloadDialog] Submitting download with options:', options);
      const success = await addDownload(options);
      
      if (success) {
        // Close dialog on success
        handleClose();
      } else {
        // Keep dialog open on failure, store already showed error toast
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Failed to add download:', error);
      showError(
        'İndirme Eklenemedi',
        error instanceof Error ? error.message : 'İndirme eklenirken bir hata oluştu. Lütfen URL\'yi kontrol edip tekrar deneyin.'
      );
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    console.log('[AddDownloadDialog] Closing dialog');
    if (!isSubmitting) {
      onClose();
    } else {
      console.log('[AddDownloadDialog] Cannot close while submitting');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={(e) => {
        // Close when clicking on backdrop
        if (e.target === e.currentTarget && !isSubmitting) {
          console.log('[AddDownloadDialog] Backdrop clicked');
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Yeni İndirme Ekle
          </h2>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('[AddDownloadDialog] X button clicked');
              if (!isSubmitting) {
                onClose();
              }
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-1"
            disabled={isSubmitting}
            aria-label="Close dialog"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* URL Input */}
          <div>
            <label
              htmlFor="url"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              İndirme URL *
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/file.zip"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Directory Input (Optional) */}
          <div>
            <label
              htmlFor="directory"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Kayıt Konumu (Opsiyonel)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="directory"
                value={directory || 'Varsayılan indirme klasörü kullanılacak'}
                onChange={(e) => setDirectory(e.target.value)}
                placeholder="Varsayılan indirme klasörü kullanılacak"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isSubmitting}
                readOnly
              />
              <button
                type="button"
                onClick={handleSelectDirectory}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                disabled={isSubmitting}
                title="Bu indirme için farklı bir konum seç"
              >
                Değiştir
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Boş bırakırsanız sistem varsayılan indirme klasörü kullanılacak.
            </p>
          </div>

          {/* Filename Input (Optional) */}
          <div>
            <label
              htmlFor="filename"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Dosya Adı (Opsiyonel)
            </label>
            <input
              type="text"
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Boş bırakırsanız orijinal dosya adı kullanılacak"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={isSubmitting}
            />
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm font-medium"
            disabled={isSubmitting}
          >
            {showAdvanced ? '▼' : '▶'} Gelişmiş Seçenekler
          </button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-4 pl-4 border-l-2 border-purple-500">
              {/* Segments */}
              <div>
                <label
                  htmlFor="segments"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Bağlantı Sayısı: {segments}
                </label>
                <input
                  type="range"
                  id="segments"
                  min="1"
                  max="16"
                  value={segments}
                  onChange={(e) => setSegments(parseInt(e.target.value))}
                  className="w-full"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Daha fazla bağlantı = daha hızlı indirme (4-8 önerilir)
                </p>
              </div>

              {/* Speed Limit */}
              <div>
                <label
                  htmlFor="speedLimit"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Hız Limiti (MB/s)
                </label>
                <input
                  type="number"
                  id="speedLimit"
                  min="0"
                  step="0.1"
                  value={speedLimit}
                  onChange={(e) => setSpeedLimit(parseFloat(e.target.value))}
                  placeholder="0 = sınırsız"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>

              {/* Scheduled Time */}
              <div>
                <label
                  htmlFor="scheduledTime"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  İndirmeyi Zamanla
                </label>
                <input
                  type="datetime-local"
                  id="scheduledTime"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Boş bırakırsanız hemen başlayacak
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[AddDownloadDialog] Cancel button clicked');
                if (!isSubmitting) {
                  onClose();
                }
              }}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={isSubmitting}
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-md hover:from-purple-600 hover:to-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Ekleniyor...' : 'İndirmeyi Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
