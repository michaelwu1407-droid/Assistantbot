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

export const useShellStore = create<ShellState>((set) => ({
  viewMode: 'BASIC',
  persona: 'TRADIE',
  tutorialComplete: false,
  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),
  setPersona: (persona: Persona) => set({ persona }),
  setTutorialComplete: () => set({ tutorialComplete: true }),
}))
