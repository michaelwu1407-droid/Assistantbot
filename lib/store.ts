import { create } from 'zustand'

export type ViewMode = 'BASIC' | 'ADVANCED' | 'TUTORIAL'
export type Persona = 'TRADIE' | 'AGENT'

interface ShellState {
  viewMode: ViewMode
  persona: Persona
  tutorialComplete: boolean
  workspaceId: string | null
  userId: string | null
  mobileMenuOpen: boolean
  setViewMode: (mode: ViewMode) => void
  setPersona: (persona: Persona) => void
  setTutorialComplete: () => void
  setWorkspaceId: (id: string) => void
  setUserId: (id: string) => void
  setMobileMenuOpen: (open: boolean) => void
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
  workspaceId: null,
  userId: null,
  mobileMenuOpen: false,
  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),
  setPersona: (persona: Persona) => set({ persona }),
  setTutorialComplete: () => {
    // Persist to localStorage so it survives page reloads
    try { localStorage.setItem('pj_tutorial_complete', 'true') } catch { }
    set({ tutorialComplete: true })
  },
  setWorkspaceId: (id: string) => set({ workspaceId: id }),
  setUserId: (id: string) => set({ userId: id }),
  setMobileMenuOpen: (open: boolean) => set({ mobileMenuOpen: open }),
}))

