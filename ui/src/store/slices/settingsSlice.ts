import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Settings } from '../../types/settings';
import { defaultSettings } from '../../types/settings';

interface SettingsState {
  settings: Settings;
  isLoading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  settings: defaultSettings,
  isLoading: false,
  error: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSettings: (state, action: PayloadAction<Settings>) => {
      state.settings = action.payload;
    },
    updateSettings: (state, action: PayloadAction<Partial<Settings>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setSettings, updateSettings, setLoading, setError } = settingsSlice.actions;
export default settingsSlice.reducer;
