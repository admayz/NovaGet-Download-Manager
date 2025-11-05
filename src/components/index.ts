// Core UI Components
export { DownloadCard } from './DownloadCard';
export { ProgressBar } from './ProgressBar';
export { AddDownloadDialog } from './AddDownloadDialog';
export { ConfirmDialog } from './ConfirmDialog';
export { SpeedChart } from './SpeedChart';
export { DownloadList } from './DownloadList';
export { DownloadDetailView } from './DownloadDetailView';

// Category Components
export { CategoryFilter, getCategoryIcon, getCategoryColors } from './CategoryFilter';
export type { FileCategory } from './CategoryFilter';
export { CategoryBadge } from './CategoryBadge';

// Other Components
export { default as Navigation } from './Navigation';
export { ThemeProvider } from './ThemeProvider';
export { default as ThemeToggle } from './ThemeToggle';
export { IPCProvider } from './IPCProvider';
export { PageTransition } from './PageTransition';

// Error Handling Components
export { ErrorBoundary } from './ErrorBoundary';
export { Toast } from './Toast';
export type { ToastType, ToastProps } from './Toast';
export { ToastContainer } from './ToastContainer';
export { ToastProvider } from './ToastProvider';
export { ErrorDetailsModal } from './ErrorDetailsModal';
export type { ErrorDetails } from './ErrorDetailsModal';
