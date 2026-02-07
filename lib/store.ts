import { create } from 'zustand';

interface AppState {
  viewMode: 'BASIC' | 'ADVANCED';
  setViewMode: (mode: 'BASIC' | 'ADVANCED') => void;
  toggleViewMode: () => void;
  isTutorialActive: boolean;
  setTutorialActive: (active: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  viewMode: 'BASIC',
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleViewMode: () => set((state) => ({ viewMode: state.viewMode === 'BASIC' ? 'ADVANCED' : 'BASIC' })),
  isTutorialActive: false,
  setTutorialActive: (active) => set({ isTutorialActive: active }),
}));
