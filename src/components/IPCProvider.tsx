'use client';

import { useEffect } from 'react';
import { useIPCListeners } from '@/hooks/useIPCListeners';
import { useSettingsStore } from '@/store/settingsStore';

export function IPCProvider({ children }: { children: React.ReactNode }) {
  const { loadSettings } = useSettingsStore();

  // Set up IPC listeners
  useIPCListeners();

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return <>{children}</>;
}
