import { create } from 'zustand'

export type ViewMode = 'BASIC' | 'ADVANCED' | 'TUTORIAL'
export type Persona = 'TRADIE' | 'AGENT'

interface ShellState {
  viewMode: ViewMode
  persona: Persona
  setViewMode: (mode: ViewMode) => void
  setPersona: (persona: Persona) => void
}

export const useShellStore = create<ShellState>((set) => ({
  viewMode: 'BASIC',
  persona: 'TRADIE', // Default to Tradie for now, real app would set this on login
  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),
  setPersona: (persona: Persona) => set({ persona }),
}))
