import type { Settings } from '../types/settings';

const API_BASE_URL = 'http://localhost:5000/api';

export const settingsService = {
  async getSettings(): Promise<Settings> {
    const response = await fetch(`${API_BASE_URL}/settings`);
    if (!response.ok) {
      throw new Error('Failed to fetch settings');
    }
    return response.json();
  },

  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      throw new Error('Failed to update settings');
    }
    return response.json();
  },

  async selectFolder(): Promise<string | null> {
    // This will be handled by Electron IPC
    if (window.electronAPI) {
      return await window.electronAPI.dialog.selectFolder();
    }
    return null;
  },
};
