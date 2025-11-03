import { create } from 'zustand';
import { ToastType } from '@/components/Toast';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  
  // Actions
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
  
  // Convenience methods
  success: (title: string, message?: string, duration?: number) => string;
  error: (title: string, message?: string, duration?: number) => string;
  warning: (title: string, message?: string, duration?: number) => string;
  info: (title: string, message?: string, duration?: number) => string;
}

/**
 * Toast store for managing toast notifications
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      id,
      ...toast,
      duration: toast.duration ?? 5000,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },

  clearAll: () => {
    set({ toasts: [] });
  },

  success: (title, message, duration): string => {
    const store = useToastStore.getState();
    return store.addToast({
      type: 'success',
      title,
      message,
      duration,
    });
  },

  error: (title, message, duration): string => {
    const store = useToastStore.getState();
    return store.addToast({
      type: 'error',
      title,
      message,
      duration: duration ?? 7000, // Errors stay longer
    });
  },

  warning: (title, message, duration): string => {
    const store = useToastStore.getState();
    return store.addToast({
      type: 'warning',
      title,
      message,
      duration,
    });
  },

  info: (title, message, duration): string => {
    const store = useToastStore.getState();
    return store.addToast({
      type: 'info',
      title,
      message,
      duration,
    });
  },
}));
