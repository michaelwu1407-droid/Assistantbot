import { create } from 'zustand'

export type ViewMode = 'BASIC' | 'ADVANCED' | 'TUTORIAL'
export type Persona = 'TRADIE' | 'AGENT'
export type UserRole = 'OWNER' | 'MANAGER' | 'TEAM_MEMBER'

interface ShellState {
  viewMode: ViewMode
  lastAdvancedPath: string | null
  persona: Persona
  tutorialComplete: boolean
  tutorialStepIndex: number
  workspaceId: string | null
  userId: string | null
  userRole: UserRole
  /** Display name for dashboard top bar (from ShellInitializer) */
  headerDisplayName: string
  /** Workspace industry — New Job vs New Listing label */
  workspaceIndustryType: 'TRADES' | 'REAL_ESTATE' | null
  mobileMenuOpen: boolean
  sidebarMinimized: boolean
  /** RHS chat / assistant panel is expanded (not collapsed to zero width) — dashboard Kanban uses this to allow horizontal scroll only when the panel is open. */
  assistantPanelExpanded: boolean
  _hydrated: boolean
  setViewMode: (mode: ViewMode) => void
  setAssistantPanelExpanded: (open: boolean) => void
  setLastAdvancedPath: (path: string) => void
  setPersona: (persona: Persona) => void
  setTutorialComplete: () => void
  resetTutorial: () => void
  setTutorialStepIndex: (index: number) => void
  setWorkspaceId: (id: string) => void
  setUserId: (id: string) => void
  setUserRole: (role: UserRole) => void
  setHeaderDisplayName: (name: string) => void
  setWorkspaceIndustryType: (t: 'TRADES' | 'REAL_ESTATE' | null) => void
  setMobileMenuOpen: (open: boolean) => void
  setSidebarMinimized: (minimized: boolean) => void
  toggleSidebarMinimized: () => void
  _hydrate: () => void
}

export const useShellStore = create<ShellState>((set, get) => ({
  viewMode: 'BASIC' as ViewMode,
  lastAdvancedPath: null,
  persona: 'TRADIE' as Persona,
  tutorialComplete: false,
  tutorialStepIndex: -1,
  workspaceId: null,
  userId: null,
  userRole: 'OWNER' as UserRole,
  headerDisplayName: '',
  workspaceIndustryType: null,
  mobileMenuOpen: false,
  sidebarMinimized: false,
  assistantPanelExpanded: false,
  _hydrated: false,
  setAssistantPanelExpanded: (open: boolean) => {
    try { localStorage.setItem('pj_assistant_panel_expanded', open ? 'true' : 'false') } catch { }
    set({ assistantPanelExpanded: open })
  },
  setViewMode: (mode: ViewMode) => {
    try { localStorage.setItem('pj_view_mode', mode) } catch { }
    set({ viewMode: mode })
  },
  setLastAdvancedPath: (path: string) => {
    try { localStorage.setItem('pj_last_advanced_path', path) } catch { }
    set({ lastAdvancedPath: path })
  },
  setPersona: (persona: Persona) => {
    try { localStorage.setItem('pj_persona', persona) } catch { }
    set({ persona })
  },
  setTutorialComplete: () => {
    try { localStorage.setItem('pj_tutorial_complete', 'true') } catch { }
    set({ tutorialComplete: true })
  },
  resetTutorial: () => {
    try { localStorage.removeItem('pj_tutorial_complete') } catch { }
    set({ tutorialComplete: false, tutorialStepIndex: 0, viewMode: 'TUTORIAL' })
  },
  setTutorialStepIndex: (index: number) => set({ tutorialStepIndex: index }),
  setWorkspaceId: (id: string) => set({ workspaceId: id }),
  setUserId: (id: string) => set({ userId: id }),
  setUserRole: (role: UserRole) => set({ userRole: role }),
  setHeaderDisplayName: (name: string) => set({ headerDisplayName: name }),
  setWorkspaceIndustryType: (t) => set({ workspaceIndustryType: t }),
  setMobileMenuOpen: (open: boolean) => set({ mobileMenuOpen: open }),
  setSidebarMinimized: (minimized: boolean) => {
    try { localStorage.setItem('pj_sidebar_minimized', minimized ? 'true' : 'false') } catch { }
    set({ sidebarMinimized: minimized })
  },
  toggleSidebarMinimized: () => {
    const next = !get().sidebarMinimized
    try { localStorage.setItem('pj_sidebar_minimized', next ? 'true' : 'false') } catch { }
    set({ sidebarMinimized: next })
  },
  _hydrate: () => {
    if (get()._hydrated) return
    try {
      const vm = localStorage.getItem('pj_view_mode')
      const p = localStorage.getItem('pj_persona')
      const lap = localStorage.getItem('pj_last_advanced_path')
      const tc = localStorage.getItem('pj_tutorial_complete')
      const sm = localStorage.getItem('pj_sidebar_minimized')
      const ape = localStorage.getItem('pj_assistant_panel_expanded')
      set({
        viewMode: (vm as ViewMode) || 'BASIC',
        lastAdvancedPath: lap || null,
        persona: (p as Persona) || 'TRADIE',
        tutorialComplete: tc === 'true',
        sidebarMinimized: sm === 'true',
        assistantPanelExpanded: ape === 'true',
        _hydrated: true,
      })
    } catch {
      set({ _hydrated: true })
    }
  },
}))

// Auto-hydrate on client side
if (typeof window !== 'undefined') {
  useShellStore.getState()._hydrate()
}

