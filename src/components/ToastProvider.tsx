'use client';

import React from 'react';
import { ToastContainer } from './ToastContainer';
import { useToastStore } from '@/store/toastStore';

/**
 * Toast provider component
 * Wraps the app and provides toast notifications
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, removeToast } = useToastStore();

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
}
