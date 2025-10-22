import { configureStore } from '@reduxjs/toolkit';
import downloadsReducer from './slices/downloadsSlice';
import categoriesReducer from './slices/categorySlice';
import settingsReducer from './slices/settingsSlice';

export const store = configureStore({
  reducer: {
    downloads: downloadsReducer,
    categories: categoriesReducer,
    settings: settingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
