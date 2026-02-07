import { create } from 'zustand';

type ViewMode = 'BASIC' | 'ADVANCED';

interface AppState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  
  // Tutorial State
  isTutorialActive: boolean;
  setTutorialActive: (active: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  viewMode: 'BASIC', // Default to Chatbot First
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleViewMode: () =>
    set((state) => ({
      viewMode: state.viewMode === 'BASIC' ? 'ADVANCED' : 'BASIC',
    })),
    
  isTutorialActive: false,
  setTutorialActive: (active) => set({ isTutorialActive: active }),
}));
