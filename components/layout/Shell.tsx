"use client"

import Image from "next/image"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useShellStore } from "@/lib/store"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { TutorialOverlay } from "@/components/tutorial/tutorial-overlay"
import { Sidebar } from "@/components/core/sidebar"
import { MobileSidebar } from "@/components/layout/mobile-sidebar"
// Switch import removed — using segmented control buttons instead
import { Layers, MessageSquare, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { ImperativePanelGroupHandle, ImperativePanelHandle } from "react-resizable-panels"
import { DashboardMainChrome } from "@/components/dashboard/dashboard-main-chrome"

const CHAT_STEP_INDEX = 3 // Step 4 in 1-based: "Chat mode" pane
const ASSISTANT_COLLAPSE_THRESHOLD = 10
const ASSISTANT_MAX_SIZE = 65
const ASSISTANT_MIN_SIZE = 27

function AssistantPanelGlyph({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 28 18"
      aria-hidden="true"
      className="h-4 w-4 text-muted-foreground"
      fill="currentColor"
    >
      {expanded ? (
        <>
          <polygon points="2,9 11,2 11,16" />
          <polygon points="26,9 17,2 17,16" />
        </>
      ) : (
        <>
          <polygon points="11,9 2,2 2,16" />
          <polygon points="17,9 26,2 26,16" />
        </>
      )}
    </svg>
  )
}

export function Shell({ children, chatbot }: { children: React.ReactNode; chatbot?: React.ReactNode }) {
  const {
    viewMode,
    setViewMode,
    tutorialStepIndex,
    lastAdvancedPath,
    setLastAdvancedPath,
    assistantPanelExpanded: chatbotExpanded,
    setAssistantPanelExpanded: setChatbotExpanded,
  } = useShellStore()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const tutorialTriggered = useRef(false)
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return true
    return window.matchMedia("(min-width: 768px)").matches
  })
  const shellFrameRef = useRef<HTMLDivElement>(null)
  const panelGroupRef = useRef<ImperativePanelGroupHandle>(null)
  const chatbotPanelRef = useRef<ImperativePanelHandle>(null)
  const assistantPanelSizeRef = useRef(28)
  const assistantResizeFrameRef = useRef<number | null>(null)
  const pendingAssistantSizeRef = useRef<number | null>(null)
  const [assistantHandleDragging, setAssistantHandleDragging] = useState(false)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const recentAssistantDragRef = useRef(false)
  const recentAssistantDragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const assistantPillDragRef = useRef<{
    pointerId: number
    startX: number
    startAssistantSize: number
    currentAssistantSize: number
    dragged: boolean
  } | null>(null)

  // Always start pages at top after route changes in dashboard shell.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" })
  }, [pathname])

  // Track desktop vs mobile (md = 768px) so we can default chat panel by viewport
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const fn = () => setIsDesktop(mq.matches)
    mq.addEventListener("change", fn)
    return () => mq.removeEventListener("change", fn)
  }, [])

  // Determine if we should show the simplified Chat view
  // Show Chat view when: BASIC mode, or during tutorial steps 1–2 (welcome + two modes) so step 2 is shown in chat mode
  const CRM_PIPELINE_HOME = "/crm/dashboard"
  const isDashboardRoot = pathname === CRM_PIPELINE_HOME
  const isTutorialStep1Or2 = viewMode === "TUTORIAL" && (tutorialStepIndex === 0 || tutorialStepIndex === 1)
  const isBasicView = isDashboardRoot && (viewMode === "BASIC" || isTutorialStep1Or2)

  // Keep track of the last advanced-page route so Chat -> Advanced returns users where they were.
  useEffect(() => {
    if (!pathname.startsWith("/crm")) return
    if (viewMode !== "ADVANCED") return
    setLastAdvancedPath(pathname)
  }, [pathname, viewMode, setLastAdvancedPath])

  const goToAdvanced = () => {
    const target = lastAdvancedPath && lastAdvancedPath.startsWith("/crm")
      ? lastAdvancedPath
      : CRM_PIPELINE_HOME
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
    if (pathname !== CRM_PIPELINE_HOME) {
      router.push(CRM_PIPELINE_HOME)
    }
  }

  const toggleAssistantPanel = () => {
    if (chatbotExpanded) {
      chatbotPanelRef.current?.collapse()
      setChatbotExpanded(false)
      syncAssistantEdgeOffset(assistantPanelSizeRef.current, false)
      return
    }

    chatbotPanelRef.current?.expand()
    setChatbotExpanded(true)
    syncAssistantEdgeOffset(Math.max(assistantPanelSizeRef.current, ASSISTANT_MIN_SIZE), true)
  }

  const syncAssistantEdgeOffset = (assistantSize: number, expanded: boolean) => {
    assistantPanelSizeRef.current = assistantSize
    if (!shellFrameRef.current) return

    shellFrameRef.current.style.setProperty(
      "--assistant-edge-offset",
      expanded ? `calc(${assistantSize}% - 0.75rem)` : "0.375rem"
    )
  }

  const applyAssistantPanelSize = (nextAssistantSize: number) => {
    const clampedSize = Math.max(0, Math.min(ASSISTANT_MAX_SIZE, nextAssistantSize))
    if (clampedSize <= ASSISTANT_COLLAPSE_THRESHOLD) {
      if (assistantResizeFrameRef.current !== null) {
        cancelAnimationFrame(assistantResizeFrameRef.current)
        assistantResizeFrameRef.current = null
      }
      pendingAssistantSizeRef.current = null
      chatbotPanelRef.current?.collapse()
      setChatbotExpanded(false)
      syncAssistantEdgeOffset(assistantPanelSizeRef.current, false)
      return
    }

    syncAssistantEdgeOffset(clampedSize, true)
    if (!chatbotExpanded) {
      setChatbotExpanded(true)
    }

    pendingAssistantSizeRef.current = clampedSize
    if (assistantResizeFrameRef.current !== null) return

    assistantResizeFrameRef.current = window.requestAnimationFrame(() => {
      const pendingSize = pendingAssistantSizeRef.current
      assistantResizeFrameRef.current = null
      if (pendingSize == null) return
      pendingAssistantSizeRef.current = null
      panelGroupRef.current?.setLayout([100 - pendingSize, pendingSize])
    })
  }

  const handlePanelLayout = (layout: number[]) => {
    const assistantSize = layout[1]
    if (typeof assistantSize !== "number") return
    syncAssistantEdgeOffset(assistantSize, assistantSize > 0 && !(chatbotPanelRef.current?.isCollapsed()))
    if (!assistantHandleDragging) return
    if (assistantSize > ASSISTANT_COLLAPSE_THRESHOLD) return
    if (chatbotPanelRef.current?.isCollapsed()) return

    chatbotPanelRef.current?.collapse()
    setChatbotExpanded(false)
    syncAssistantEdgeOffset(assistantSize, false)
  }

  useEffect(() => {
    return () => {
      if (recentAssistantDragTimeoutRef.current) {
        clearTimeout(recentAssistantDragTimeoutRef.current)
      }
      if (assistantResizeFrameRef.current !== null) {
        cancelAnimationFrame(assistantResizeFrameRef.current)
      }
    }
  }, [])

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
  }, [viewMode, tutorialStepIndex, setChatbotExpanded])

  // In advanced mode, the assistant panel should respect the user's last saved state.
  // First boot defaults closed because the persisted store initializes to false.
  useEffect(() => {
    if (isBasicView) return
    const t = setTimeout(() => {
      if (!isDesktop) {
        chatbotPanelRef.current?.collapse()
        syncAssistantEdgeOffset(assistantPanelSizeRef.current, false)
        return
      }

      if (chatbotExpanded) {
        chatbotPanelRef.current?.expand()
        syncAssistantEdgeOffset(Math.max(assistantPanelSizeRef.current, ASSISTANT_MIN_SIZE), true)
      } else {
        chatbotPanelRef.current?.collapse()
        syncAssistantEdgeOffset(assistantPanelSizeRef.current, false)
      }
    }, 50)

    return () => clearTimeout(t)
  }, [chatbotExpanded, isDesktop, isBasicView, pathname])

  const handleTutorialComplete = async () => {
    const workspaceId = useShellStore.getState().workspaceId;
    if (workspaceId) {
      await fetch("/api/workspace/complete-tutorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      })
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
                  <Image src="/latest-logo.png" alt="Earlymark" width={32} height={32} className="h-8 w-8 object-contain" />
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

          <div ref={shellFrameRef} className="relative flex-1 h-full min-w-0 w-full">
          <ResizablePanelGroup
            ref={panelGroupRef}
            id="dashboard-panel-group"
            direction="horizontal"
            className="flex-1 h-full min-w-0 w-full"
            onLayout={(layout) => {
              handlePanelLayout(layout)
            }}
          >
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
                withHandle={false}
                className={cn(
                  "hidden shrink-0 md:flex",
                  "w-px min-w-px max-w-px justify-center overflow-visible bg-border/40 transition-colors hover:bg-primary/40"
                )}
                onDragging={(isDragging) => {
                  setAssistantHandleDragging(isDragging)
                  if (isDragging) {
                    recentAssistantDragRef.current = true
                    if (recentAssistantDragTimeoutRef.current) {
                      clearTimeout(recentAssistantDragTimeoutRef.current)
                      recentAssistantDragTimeoutRef.current = null
                    }
                  } else {
                    recentAssistantDragTimeoutRef.current = setTimeout(() => {
                      recentAssistantDragRef.current = false
                      recentAssistantDragTimeoutRef.current = null
                    }, 120)
                  }
                }}
              />

              {/* Right Chatbot - Collapsed by default; when expanded, takes up more screen space */}
              <ResizablePanel
                ref={chatbotPanelRef}
                defaultSize={28}
                minSize={27}
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

            <div
              className="pointer-events-none absolute inset-y-0 hidden md:flex items-center"
              style={{
                right: chatbotExpanded ? "var(--assistant-edge-offset, calc(28% - 0.75rem))" : "0.375rem",
              }}
            >
              <button
                type="button"
                aria-label={chatbotExpanded ? "Collapse assistant panel" : "Expand assistant panel"}
                className="pointer-events-auto z-20 flex h-10 w-6 items-center justify-center rounded-md border border-border bg-background shadow-sm transition-colors hover:bg-accent hover:border-primary/40"
                onPointerDown={(event) => {
                  event.stopPropagation()
                  assistantPillDragRef.current = {
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startAssistantSize: chatbotExpanded ? assistantPanelSizeRef.current : 0,
                    currentAssistantSize: chatbotExpanded ? assistantPanelSizeRef.current : 0,
                    dragged: false,
                  }
                  event.currentTarget.setPointerCapture(event.pointerId)
                }}
                onPointerMove={(event) => {
                  const drag = assistantPillDragRef.current
                  if (!drag || drag.pointerId !== event.pointerId) return
                  const groupElement = shellFrameRef.current
                  if (!groupElement) return

                  const deltaX = event.clientX - drag.startX
                  if (Math.abs(deltaX) > 4) {
                    drag.dragged = true
                  }

                  const groupWidth = groupElement.getBoundingClientRect().width
                  if (groupWidth <= 0) return

                  const nextAssistantSize = drag.startAssistantSize - (deltaX / groupWidth) * 100
                  drag.currentAssistantSize = nextAssistantSize
                  applyAssistantPanelSize(nextAssistantSize)
                }}
                onPointerUp={(event) => {
                  const drag = assistantPillDragRef.current
                  if (!drag || drag.pointerId !== event.pointerId) return
                  event.stopPropagation()
                  event.currentTarget.releasePointerCapture(event.pointerId)
                  const wasDragged = drag.dragged
                  assistantPillDragRef.current = null

                  if (!wasDragged) {
                    toggleAssistantPanel()
                    return
                  }

                  if (drag.currentAssistantSize <= ASSISTANT_COLLAPSE_THRESHOLD || chatbotPanelRef.current?.isCollapsed()) {
                    chatbotPanelRef.current?.collapse()
                    setChatbotExpanded(false)
                    syncAssistantEdgeOffset(drag.currentAssistantSize, false)
                  } else if (drag.currentAssistantSize < ASSISTANT_MIN_SIZE) {
                    applyAssistantPanelSize(ASSISTANT_MIN_SIZE)
                  }
                }}
                onPointerCancel={(event) => {
                  const drag = assistantPillDragRef.current
                  if (!drag || drag.pointerId !== event.pointerId) return
                  event.stopPropagation()
                  assistantPillDragRef.current = null
                }}
                onClick={(event) => {
                  event.stopPropagation()
                }}
              >
                <AssistantPanelGlyph expanded={chatbotExpanded} />
              </button>
            </div>
          </div>

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
