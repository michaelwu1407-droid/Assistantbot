"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { useShellStore } from "@/lib/store"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { TutorialOverlay } from "@/components/tutorial/tutorial-overlay"
import { Sidebar } from "@/components/core/sidebar"
import { MobileSidebar } from "@/components/layout/mobile-sidebar"

export function Shell({ children, chatbot }: { children: React.ReactNode; chatbot?: React.ReactNode }) {
  const { viewMode, setViewMode } = useShellStore()
  const { theme } = useTheme()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const tutorialTriggered = useRef(false)

  // Determine if we should show the simplified Basic (Chat) view
  // Only show Basic view if user is in BASIC mode AND on the main dashboard page
  const isDashboardRoot = pathname === "/dashboard"
  const isBasicView = viewMode === "BASIC" && isDashboardRoot

  // Auto-Retreat: Collapse to Basic mode after 30s of inactivity
  useEffect(() => {
    if (viewMode !== "ADVANCED") return

    let timeout: NodeJS.Timeout

    const resetTimer = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        // Only auto-retreat if we are truly idle and locally (client-side) determined
        setViewMode("BASIC")
      }, 30000) // 30 seconds
    }

    // Initial start
    resetTimer()

    // Listeners
    window.addEventListener("mousemove", resetTimer)
    window.addEventListener("click", resetTimer)
    window.addEventListener("keydown", resetTimer)
    window.addEventListener("scroll", resetTimer)

    return () => {
      clearTimeout(timeout)
      window.removeEventListener("mousemove", resetTimer)
      window.removeEventListener("click", resetTimer)
      window.removeEventListener("keydown", resetTimer)
      window.removeEventListener("scroll", resetTimer)
    }
  }, [viewMode, setViewMode])

  // Verify tutorial trigger
  useEffect(() => {
    if (searchParams.get("tutorial") === "true" && !tutorialTriggered.current) {
      tutorialTriggered.current = true
      setViewMode("TUTORIAL")
      // Clear the ?tutorial=true from URL so it doesn't re-trigger
      router.replace(pathname, { scroll: false })
    }
  }, [searchParams, setViewMode, router, pathname])

  return (
    <div className="h-screen w-full bg-background relative flex flex-col overflow-hidden">
      {/* Tutorial Overlay always mounted, handles its own visibility */}
      <TutorialOverlay />

      {isBasicView ? (
        <div className="flex-1 flex items-center justify-center p-0 md:p-6 relative">
          {/* Decorative Background for Basic Mode - Only in Premium */}
          {theme === 'premium' && (
            <div className="absolute inset-0 bg-gradient-mesh opacity-20 pointer-events-none" />
          )}

          {/* Mode Toggle Button - Floating */}
          <button
            id="mode-toggle-btn"
            onClick={() => setViewMode("ADVANCED")}
            className="absolute top-4 right-4 z-20 flex items-center gap-2 px-4 py-2 bg-card/80 backdrop-blur-sm border border-border rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-card transition-all shadow-lg hover:shadow-xl"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            Advanced Mode
          </button>

          {/* Main Chat Container - Large & Immersive */}
          <div className="z-10 w-full max-w-5xl h-[100dvh] md:h-[92dvh] shadow-2xl rounded-none md:rounded-2xl overflow-hidden border-0 md:border border-border/50 bg-background/60 backdrop-blur-xl relative flex flex-col">
            {/* ID for Spotlight */}
            <div id="assistant-pane" className="h-full w-full">
              {chatbot}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex h-full overflow-hidden">
          {/* Desktop Sidebar - Hidden on Mobile */}
          <Sidebar className="hidden md:flex shrink-0" />

          {/* Mobile Sidebar - Drawer */}
          <MobileSidebar />

          <ResizablePanelGroup direction="horizontal" className="flex-1 h-full">
            {/* Left Canvas - 75% for Desktop, handled by resizable panels */}
            <ResizablePanel defaultSize={75} minSize={30} id="main-canvas-panel">
              <div id="main-canvas" className="h-full w-full overflow-hidden relative bg-muted/30">
                {children}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="hidden md:flex" />

            {/* Right Chatbot - 25% (M-5 / A-1) */}
            <ResizablePanel
              defaultSize={25}
              minSize={20}
              maxSize={50}
              collapsible={true}
              collapsedSize={0}
              onCollapse={() => {}}
              id="assistant-panel"
              className="hidden md:block transition-all duration-300 ease-in-out pl-2"
            >
              <div id="assistant-pane" className="h-full w-full border-l border-border bg-card">
                {chatbot}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}
    </div>
  )
}
