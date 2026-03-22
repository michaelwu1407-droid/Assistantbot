"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { useShellStore } from "@/lib/store"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { TutorialOverlay } from "@/components/tutorial/tutorial-overlay"
import { Sidebar } from "@/components/core/sidebar"
import { MobileSidebar } from "@/components/layout/mobile-sidebar"
// Switch import removed — using segmented control buttons instead
import { Layers, MessageSquare, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { ImperativePanelHandle } from "react-resizable-panels"
import { completeTutorial } from "@/actions/workspace-actions"
import { DashboardMainChrome } from "@/components/dashboard/dashboard-main-chrome"

const CHAT_STEP_INDEX = 3 // Step 4 in 1-based: "Chat mode" pane

export function Shell({ children, chatbot }: { children: React.ReactNode; chatbot?: React.ReactNode }) {
  const { viewMode, setViewMode, tutorialStepIndex, lastAdvancedPath, setLastAdvancedPath, setAssistantPanelExpanded } = useShellStore()
  const { theme } = useTheme()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const tutorialTriggered = useRef(false)
  const [mounted, setMounted] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true) // md and up; assume desktop for SSR
  const chatbotPanelRef = useRef<ImperativePanelHandle>(null)
  const [chatbotExpanded, setChatbotExpanded] = useState(false)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const didDragRef = useRef(false)
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Keep global flag in sync so dashboard Kanban can use min board width only when RHS chat is open (no forced horizontal scroll when chat is collapsed).
  useEffect(() => {
    setAssistantPanelExpanded(chatbotExpanded)
  }, [chatbotExpanded, setAssistantPanelExpanded])

  // Always start pages at top after route changes in dashboard shell.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" })
  }, [pathname])

  // Track desktop vs mobile (md = 768px) so we can default chat panel by viewport
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    setIsDesktop(mq.matches)
    const fn = () => setIsDesktop(mq.matches)
    mq.addEventListener("change", fn)
    return () => mq.removeEventListener("change", fn)
  }, [])

  // Determine if we should show the simplified Chat view
  // Show Chat view when: BASIC mode, or during tutorial steps 1–2 (welcome + two modes) so step 2 is shown in chat mode
  const isDashboardRoot = pathname === "/crm"
  const isTutorialStep1Or2 = viewMode === "TUTORIAL" && (tutorialStepIndex === 0 || tutorialStepIndex === 1)
  const isBasicView = mounted && isDashboardRoot && (viewMode === "BASIC" || isTutorialStep1Or2)

  // Keep track of the last advanced-page route so Chat -> Advanced returns users where they were.
  useEffect(() => {
    if (!pathname.startsWith("/crm")) return
    if (viewMode !== "ADVANCED") return
    setLastAdvancedPath(pathname)
  }, [pathname, viewMode, setLastAdvancedPath])

  const goToAdvanced = () => {
    const target = lastAdvancedPath && lastAdvancedPath.startsWith("/crm")
      ? lastAdvancedPath
      : "/crm"
    setViewMode("ADVANCED")
    if (pathname !== target) {
      router.push(target)
    }
  }

  const goToBasic = () => {
    if (pathname.startsWith("/crm")) {
      setLastAdvancedPath(pathname)
    }
    setViewMode("BASIC")
    if (pathname !== "/crm") {
      router.push("/crm")
    }
  }

  // Verify tutorial trigger
  useEffect(() => {
    if (searchParams.get("tutorial") === "true" && !tutorialTriggered.current) {
      tutorialTriggered.current = true
      setViewMode("TUTORIAL")
      // Clear the ?tutorial=true from URL so it doesn't re-trigger
      router.replace(pathname, { scroll: false })
    }
  }, [searchParams, setViewMode, router, pathname])

  // Keep steps 1–2 in chat mode: if we're on those steps, ensure viewMode is TUTORIAL (and user should be on /crm via overlay redirect)
  useEffect(() => {
    if ((tutorialStepIndex === 0 || tutorialStepIndex === 1) && viewMode !== "TUTORIAL") {
      setViewMode("TUTORIAL")
    }
  }, [tutorialStepIndex, viewMode, setViewMode])

  // When tutorial reaches the chat step (4), open the side chatbot panel so it can be highlighted
  useEffect(() => {
    if (viewMode !== "TUTORIAL" || tutorialStepIndex !== CHAT_STEP_INDEX) return
    const t = setTimeout(() => {
      chatbotPanelRef.current?.expand()
      setChatbotExpanded(true)
    }, 100)
    return () => clearTimeout(t)
  }, [viewMode, tutorialStepIndex])

  // Default chat panel: open on home (desktop only), closed on other pages; on mobile always closed
  useEffect(() => {
    if (!mounted || isBasicView) return
    const openOnHome = pathname === "/crm" && isDesktop
    if (openOnHome) {
      const t = setTimeout(() => {
        chatbotPanelRef.current?.expand()
        setChatbotExpanded(true)
      }, 50)
      return () => clearTimeout(t)
    } else {
      chatbotPanelRef.current?.collapse()
      setChatbotExpanded(false)
    }
  }, [pathname, isDesktop, mounted, isBasicView])

  const handleTutorialComplete = async () => {
    const workspaceId = useShellStore.getState().workspaceId;
    if (workspaceId) {
      await completeTutorial(workspaceId);
    }
  };

  // Full viewport height — avoid calc(100dvh-57px), which left a ~57px body-colour strip at the bottom (57px belongs to the assistant mode toggle row, not the shell).
  return (
    <div className="h-dvh min-h-0 w-full bg-background relative flex flex-col overflow-hidden">
      {/* Tutorial Overlay always mounted, handles its own visibility */}
      <TutorialOverlay onComplete={handleTutorialComplete} />

      {isBasicView ? (
        <div className="flex-1 flex items-center justify-center p-0 md:p-6 relative min-h-0">
          {/* Background: subtle gradient + glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/80 via-white to-primary/5 dark:from-slate-950/80 dark:via-background dark:to-primary/10 pointer-events-none" />
          <div className="absolute inset-0 ott-glow opacity-30 pointer-events-none" />

          {/* Main Chat Container - seamless glassmorphism (id for tutorial spotlight so whole window + toggle is visible) */}
          <div id="chat-mode-window" className="z-10 w-full max-w-4xl h-full md:h-[82dvh] flex flex-col rounded-none md:rounded-3xl overflow-hidden bg-white/40 dark:bg-zinc-950/40 backdrop-blur-2xl shadow-2xl relative border border-white/20 dark:border-white/5">
            {/* Header inside card: title + mode toggle */}
            <header className="shrink-0 flex items-center justify-between gap-4 px-4 md:px-6 py-4 bg-transparent border-b border-border/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm overflow-hidden bg-primary">
                  <img src="/latest-logo.png?v=20250305" alt="Earlymark" className="h-8 w-8 object-contain" />
                </div>
                <span className="font-semibold text-slate-900 dark:text-foreground">Ask Tracey</span>
              </div>
              <div className="flex items-center bg-neutral-100 dark:bg-slate-800/80 rounded-lg p-1 gap-1">
                <button
                  onClick={() => { }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-white text-neutral-900 shadow-xs transition-all duration-150"
                >
                  <MessageSquare size={14} />
                  Chat
                </button>
                <button
                  onClick={() => goToAdvanced()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-neutral-500 hover:text-neutral-700 transition-all duration-150"
                >
                  <Layers size={14} />
                  Advanced
                </button>
              </div>
            </header>
            <div id="assistant-pane" className="flex-1 min-h-0 flex flex-col">
              {chatbot}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex h-full min-w-0 overflow-hidden">
          {/* Desktop Sidebar - Hidden on Mobile */}
          <Sidebar className="hidden md:flex shrink-0" />

          {/* Mobile Sidebar - Drawer */}
          <MobileSidebar />

          {mounted ? (
            <ResizablePanelGroup id="dashboard-panel-group" direction="horizontal" className="flex-1 h-full min-w-0 w-full">
              {/* Left canvas + assistant must sum to 100% default so the main pane reliably compresses when chat expands */}
              <ResizablePanel defaultSize={72} minSize={30} id="main-canvas-panel" className="flex min-h-0 min-w-0 flex-col">
                <div
                  id="main-canvas"
                  className={cn(
                    "h-full w-full min-w-0 overflow-y-auto relative bg-[var(--main-canvas)]",
                    chatbotExpanded ? "overflow-x-auto" : "overflow-x-hidden max-md:overflow-x-auto"
                  )}
                >
                  <DashboardMainChrome>{children}</DashboardMainChrome>
                </div>
              </ResizablePanel>

              {/* Must be a direct PanelResizeHandle child of PanelGroup — no extra wrapper (avoids blank flex strip). Strip is 8px; pill is wider — center it on the strip so the grip sits on the green line (justify-start skewed it right). */}
              <ResizableHandle
                id="assistant-resize-handle"
                withHandle
                className={cn(
                  "hidden shrink-0 md:flex",
                  /* Single visible strip; wider pill straddles the split equally */
                  "w-2 min-w-[8px] max-w-[8px] justify-center overflow-visible bg-border/50 transition-colors hover:bg-primary/50"
                )}
                onPointerDown={(e) => {
                  didDragRef.current = false
                  pointerDownRef.current = { x: e.clientX, y: e.clientY }
                }}
                onPointerMove={(e) => {
                  if (pointerDownRef.current && (Math.abs(e.clientX - pointerDownRef.current.x) > 5 || Math.abs(e.clientY - pointerDownRef.current.y) > 5)) {
                    didDragRef.current = true
                  }
                }}
                onPointerUp={() => {
                  if (!didDragRef.current && !chatbotExpanded) {
                    chatbotPanelRef.current?.expand()
                    setChatbotExpanded(true)
                  }
                  pointerDownRef.current = null
                }}
                onClick={() => {
                  if (!didDragRef.current && !chatbotExpanded) {
                    chatbotPanelRef.current?.expand()
                    setChatbotExpanded(true)
                  }
                }}
              />

              {/* Right Chatbot - Collapsed by default; when expanded, takes up more screen space */}
              <ResizablePanel
                ref={chatbotPanelRef}
                defaultSize={28}
                minSize={28}
                maxSize={65}
                collapsible={true}
                collapsedSize={0}
                onCollapse={() => setChatbotExpanded(false)}
                onExpand={() => setChatbotExpanded(true)}
                id="assistant-panel"
                className="hidden md:block min-w-0 pl-0"
              >
                {/* Mode Toggle — Segmented control */}
                <div className="flex items-center justify-center px-4 py-3 bg-background border-b border-neutral-200">
                  <div className="flex items-center bg-neutral-100 rounded-lg p-1 gap-1">
                    <button
                      onClick={() => goToBasic()}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150',
                        viewMode !== 'ADVANCED'
                          ? 'bg-white text-neutral-900 shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-700'
                      )}
                    >
                      <MessageSquare size={14} />
                      Chat
                    </button>
                    <button
                      onClick={() => goToAdvanced()}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150',
                        viewMode === 'ADVANCED'
                          ? 'bg-white text-neutral-900 shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-700'
                      )}
                    >
                      <Layers size={14} />
                      Advanced
                    </button>
                  </div>
                </div>
                <div
                  id="assistant-pane"
                  className="h-[calc(100%-57px)] w-full min-w-0 max-w-full overflow-hidden border-l border-border/50 bg-background/50 backdrop-blur-sm"
                  onClick={() => {
                    if (!chatbotExpanded) {
                      chatbotPanelRef.current?.expand()
                      setChatbotExpanded(true)
                    }
                  }}
                >
                  {isDesktop ? chatbot : null}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div
                id="main-canvas"
                className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-auto relative bg-[var(--main-canvas)]"
              >
                <DashboardMainChrome>{children}</DashboardMainChrome>
              </div>
            </div>
          )}

          {/* Mobile: floating nav + chat buttons */}
          <div className="md:hidden fixed bottom-5 right-5 z-[10000] flex flex-col gap-2 items-end">
            {/* Chat FAB - opens a sheet on mobile */}
            {chatbot && (
              <button
                type="button"
                onClick={() => setMobileChatOpen(true)}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg hover:bg-primary/90 hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 animate-bounce-gentle"
                title="Open chat"
                aria-label="Open chat"
              >
                <MessageSquare className="h-5 w-5 text-white" />
              </button>
            )}
          </div>

          {/* Desktop: chat FAB when panel is collapsed */}
          {chatbot && !chatbotExpanded && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                chatbotPanelRef.current?.expand()
                setChatbotExpanded(true)
              }}
              className="hidden md:flex fixed bottom-5 right-5 z-[10000] h-11 w-11 items-center justify-center rounded-full bg-primary shadow-lg hover:bg-primary/90 hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 animate-bounce-gentle"
              title="Open chat"
              aria-label="Open chat"
            >
              <MessageSquare className="h-5 w-5 text-white" />
            </button>
          )}

          {/* Mobile: hamburger menu - fixed bottom-left for navigation on non-dashboard pages */}
          <button
            type="button"
            onClick={() => useShellStore.getState().setMobileMenuOpen(true)}
            className="md:hidden fixed bottom-5 left-5 z-[10000] flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg hover:bg-primary/90 hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            title="Open navigation"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5 text-white" />
          </button>

          {/* Mobile Chat Sheet */}
          <Sheet open={mobileChatOpen} onOpenChange={setMobileChatOpen}>
            <SheetContent side="bottom" className="h-[85dvh] p-0 flex flex-col">
              <SheetHeader className="shrink-0 flex flex-row items-center px-4 py-3 border-b border-border/50">
                <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  AI Assistant
                </SheetTitle>
              </SheetHeader>
              <div id="mobile-assistant-pane" className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {!isDesktop && mobileChatOpen ? chatbot : null}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  )
}
