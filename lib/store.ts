import { create } from 'zustand'

export type ViewMode = 'BASIC' | 'ADVANCED' | 'TUTORIAL'
export type Persona = 'TRADIE' | 'AGENT'

interface ShellState {
  viewMode: ViewMode
  persona: Persona
  tutorialComplete: boolean
  setViewMode: (mode: ViewMode) => void
  setPersona: (persona: Persona) => void
  setTutorialComplete: () => void
}

// Check localStorage for persisted tutorial state (client-side only)
const getPersistedTutorialComplete = (): boolean => {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem('pj_tutorial_complete') === 'true'
  } catch {
    return false
  }
}

export const useShellStore = create<ShellState>((set) => ({
  viewMode: 'BASIC',
  persona: 'TRADIE',
  tutorialComplete: getPersistedTutorialComplete(),
  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),
  setPersona: (persona: Persona) => set({ persona }),
  setTutorialComplete: () => {
    // Persist to localStorage so it survives page reloads
    try { localStorage.setItem('pj_tutorial_complete', 'true') } catch { }
    set({ tutorialComplete: true })
  },
}))

