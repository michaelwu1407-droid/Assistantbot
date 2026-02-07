import { create } from 'zustand';

type ViewMode = 'BASIC' | 'ADVANCED';

interface AppState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  viewMode: 'BASIC', // Default to Chatbot First
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleViewMode: () =>
    set((state) => ({
      viewMode: state.viewMode === 'BASIC' ? 'ADVANCED' : 'BASIC',
    })),
}));
