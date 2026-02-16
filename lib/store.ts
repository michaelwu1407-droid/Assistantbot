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

// Check localStorage for persisted state (client-side only)
const getPersistedValue = (key: string, defaultValue: any): any => {
  if (typeof window === 'undefined') return defaultValue
  try {
    const value = localStorage.getItem(key)
    return value !== null ? value : defaultValue
  } catch {
    return defaultValue
  }
}

export const useShellStore = create<ShellState>((set) => ({
  viewMode: getPersistedValue('pj_view_mode', 'BASIC') as ViewMode,
  persona: getPersistedValue('pj_persona', 'TRADIE') as Persona,
  tutorialComplete: getPersistedValue('pj_tutorial_complete', 'false') === 'true',
  workspaceId: null,
  userId: null,
  mobileMenuOpen: false,
  setViewMode: (mode: ViewMode) => {
    try { localStorage.setItem('pj_view_mode', mode) } catch { }
    set({ viewMode: mode })
  },
  setPersona: (persona: Persona) => {
    try { localStorage.setItem('pj_persona', persona) } catch { }
    set({ persona })
  },
  setTutorialComplete: () => {
    try { localStorage.setItem('pj_tutorial_complete', 'true') } catch { }
    set({ tutorialComplete: true })
  },
  setWorkspaceId: (id: string) => set({ workspaceId: id }),
  setUserId: (id: string) => set({ userId: id }),
  setMobileMenuOpen: (open: boolean) => set({ mobileMenuOpen: open }),
}))

